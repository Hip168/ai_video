"""Trộn âm thanh tập (đề mục 9): giọng + nhạc (ducking) + bus SFX, chuẩn hoá -16 LUFS hai lượt (đo rồi áp gain)."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import soundfile as sf

from aivideo import sfx
from aivideo.audio import OUT_SR, TARGET_I, TARGET_TP, _ffmpeg, measure_lufs

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = ROOT / "assets" / "audio" / "manifest.json"
DEFAULT_FILES = ROOT / "assets" / "audio" / "files"

LUFS_TOL = 1.0
FADE_IN_S, FADE_OUT_S = 1.0, 2.0
SC_PAD = 2  # giây đệm trước sidechaincompress
MAX_MUSIC_S = 7200  # chặn nhạc đầu vào dài quá (-stream_loop -1 + đọc cả file)
LIMIT = 0.84  # ≈ -1,5 dBFS


class MusicError(RuntimeError):
    pass


# ---- manifest -----------------------------------------------------------------

def load_manifest(path=DEFAULT_MANIFEST) -> dict:
    p = Path(path)
    try:
        doc = json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise MusicError(f"thiếu manifest nhạc: {p}") from None
    except json.JSONDecodeError as e:
        raise MusicError(f"manifest nhạc hỏng ({p}): {e}") from None
    if not isinstance(doc, dict) or not isinstance(doc.get("tracks"), list):
        raise MusicError(f"manifest nhạc sai cấu trúc, cần {{\"tracks\": [...]}}: {p}")
    return doc


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_track(track_id: str, manifest_path=DEFAULT_MANIFEST, files_dir=DEFAULT_FILES) -> Path:
    doc = load_manifest(manifest_path)
    entry = next((t for t in doc["tracks"] if isinstance(t, dict) and t.get("id") == track_id), None)
    if entry is None:
        raise MusicError(f"nhạc {track_id!r} không có trong manifest {manifest_path}")
    path = Path(files_dir) / entry.get("file", "")
    if not entry.get("file") or not path.is_file():
        raise MusicError(f"thiếu file nhạc {path} (bài {track_id!r})")
    actual = _sha256(path)
    if actual != entry.get("sha256"):
        raise MusicError(f"file nhạc {path} lệch sha256: manifest {entry.get('sha256')}, thực tế {actual}")
    return path


# ---- đo -----------------------------------------------------------------------

def true_peak(path) -> float:
    err = _ffmpeg(["-i", str(path), "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"])
    tail = err[err.rindex("True peak"):]
    return float(re.search(r"Peak:\s+(-?[\d.]+|-inf)\s+dBFS", tail).group(1))


def verify_mix(path, duration_frames: int, fps: int = 30, *, label=None) -> dict:
    info = sf.info(str(path))
    frames = info.frames / info.samplerate * fps
    lufs, tp = measure_lufs(path), true_peak(path)
    errs = []
    if abs(lufs - TARGET_I) > LUFS_TOL:
        errs.append(f"loudness {lufs} LUFS lệch quá ±{LUFS_TOL} khỏi {TARGET_I}")
    if tp > TARGET_TP:
        errs.append(f"true peak {tp} dBTP vượt {TARGET_TP}")
    if abs(frames - duration_frames) > 1:
        errs.append(f"độ dài {frames:.2f} frame lệch timeline {duration_frames}")
    if errs:
        raise RuntimeError(f"mix không đạt ({label or path}): " + "; ".join(errs))
    return {"lufs": lufs, "true_peak": tp, "frames": round(frames)}


# ---- trộn ---------------------------------------------------------------------

def _graph(n: int, has_music: bool, music_gain_db: float, target: str) -> str:
    """target: "pre" (bản trộn), "voice" (stem giọng), "music" (stem nhạc đã duck).
    Mỗi lần chạy FFmpeg chỉ có MỘT đầu ra, để không có chuyện đồ thị đóng khi đầu ra kia chưa xả hết."""
    dur = n / OUT_SR
    mono = f"aresample={OUT_SR},aformat=sample_fmts=fltp:channel_layouts=mono"
    bus_i = 2 if has_music else 1
    voice = f"[0:a]{mono},apad=whole_len={n},atrim=end_sample={n},asetpts=N/SR/TB"
    if target == "voice":
        return voice + "[out]"
    music = (f"[1:a]{mono},highpass=f=120,lowpass=f=8000,volume={music_gain_db}dB,"
             f"atrim=end_sample={n},asetpts=N/SR/TB,"
             f"afade=t=in:d={FADE_IN_S},afade=t=out:st={max(dur - FADE_OUT_S, 0):.6f}:d={FADE_OUT_S}[m]")
    duck = (f"[m]apad=pad_dur={SC_PAD}[mp];[vm]apad=pad_dur={SC_PAD}[vp];"
            "[mp][vp]sidechaincompress=threshold=0.02:ratio=10:attack=10:release=300:makeup=1,")
    # sidechaincompress kết thúc khi MỘT trong hai đầu vào hết, và đuôi chưa xả bị rơi chập chờn (nhạc tắt đột ngột,
    # mix.wav không tất định). Đệm cả hai đầu vào dài hơn n rồi cắt đúng n sau bộ nén thì đuôi luôn được xử lý đủ.
    duck += f"atrim=end_sample={n},asetpts=N/SR/TB"
    if target == "music":
        return f"{voice}[vm];{music};{duck},atrim=end_sample={n}[out]"
    bus = f"[{bus_i}:a]{mono},apad=whole_len={n},atrim=end_sample={n},asetpts=N/SR/TB[b]"
    tail = (f"amix=inputs={{c}}:normalize=0:duration=longest,"
            f"alimiter=limit={LIMIT}:level=disabled,atrim=end_sample={n}[out]")
    if not has_music:
        return f"{voice}[v];{bus};[v][b]" + tail.format(c=2)
    return f"{voice},asplit=2[v][vm];{music};{duck}[d];{bus};[v][d][b]" + tail.format(c=3)


def _check_music(path) -> None:
    p = Path(path)
    if not p.is_file():
        raise MusicError(f"thiếu file nhạc {p}")
    try:
        info = sf.info(str(p))
    except Exception as e:  # noqa: BLE001
        raise MusicError(f"không đọc được file nhạc {p}: {e}") from None
    if info.frames <= 0:
        raise MusicError(f"file nhạc {p} không có mẫu âm thanh")
    if info.frames / info.samplerate > MAX_MUSIC_S:
        raise MusicError(f"file nhạc {p} dài quá {MAX_MUSIC_S} giây")


def mix_episode(timeline_path, narration_path, out_path, *, music_path=None, music_gain_db=-24.0,
                stem_voice_path=None, stem_music_path=None) -> dict:
    tl = json.loads(Path(timeline_path).read_text(encoding="utf-8"))
    for key in ("durationInFrames", "fps", "sfx"):
        if key not in tl:
            raise ValueError(f"timeline thiếu khoá {key!r}: {timeline_path}")
    frames, fps = tl["durationInFrames"], tl["fps"]
    n = round(frames * OUT_SR / fps)
    if music_path is not None:
        _check_music(music_path)
    if stem_music_path is not None and music_path is None:
        raise ValueError("stem nhạc cần có nhạc")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    has_music = music_path is not None
    with tempfile.TemporaryDirectory(dir=out_path.parent) as d:
        bus_p, pre_p, fin_p = (str(Path(d) / x) for x in ("bus.wav", "pre.wav", "fin.wav"))
        sf.write(bus_p, sfx.render_bus(tl["sfx"], frames, fps, OUT_SR), OUT_SR, subtype="FLOAT")

        def run(target: str, dst: str) -> None:
            args = ["-i", str(narration_path)]
            if has_music:
                args += ["-stream_loop", "-1", "-i", str(music_path)]
            args += ["-i", bus_p, "-filter_complex", _graph(n, has_music, music_gain_db, target),
                     "-map", "[out]", "-c:a", "pcm_f32le", dst]
            _ffmpeg(args)

        run("pre", pre_p)
        staged = []
        for target, p in (("voice", stem_voice_path), ("music", stem_music_path)):
            if p:
                tmp = str(Path(d) / f"stem_{target}.wav")
                run(target, tmp)
                got = sf.info(tmp).frames
                if got != n:
                    raise RuntimeError(f"stem {target} có {got} mẫu, cần {n}")
                staged.append((tmp, Path(p)))

        # Lượt 1: đo bằng đúng thước của verify_mix (ebur128), loudnorm in_i lệch với nó ở nội dung thưa
        lufs_pre, tp_pre = measure_lufs(pre_p), true_peak(pre_p)
        # Lượt 2 tuyến tính: loudnorm tự chuyển sang chế độ động (làm lệch mức giữa các SFX) hoặc sai gain
        # khi LRA đo được vượt LRA đích, nên áp thẳng một gain cố định từ số đo lượt 1, không vượt TP.
        gain_db = min(TARGET_I - lufs_pre, TARGET_TP - tp_pre)
        af = f"volume={gain_db:.4f}dB,aresample={OUT_SR},atrim=end_sample={n}"
        _ffmpeg(["-i", pre_p, "-af", af, "-c:a", "pcm_s16le", fin_p])
        result = verify_mix(fin_p, frames, fps, label=out_path)
        for tmp, dst in staged:
            dst.parent.mkdir(parents=True, exist_ok=True)
            os.replace(tmp, dst)
        os.replace(fin_p, out_path)
    return result


# ---- CLI ----------------------------------------------------------------------

def run_episode(slug: str, root=ROOT, stems: bool = False, short: int | None = None) -> dict:
    """`short`: trộn Short số `short` từ `<out>/shorts/<n>/` (timeline và narration đã cắt bởi `aivideo.shorts cut`)."""
    root = Path(root)
    script_p = root / "episodes" / slug / "script.json"
    out_dir = root / "out" / "episodes" / slug
    if short is not None:
        out_dir = out_dir / "shorts" / str(short)
    for p in (script_p, out_dir / "narration.wav", out_dir / "timeline.json"):
        if not p.is_file():
            raise RuntimeError(f"thiếu file: {p}")
    meta = json.loads(script_p.read_text(encoding="utf-8")).get("meta", {})
    music = meta.get("music")
    music_path, gain = None, -24.0
    if music:
        music_path = resolve_track(music["track"], root / "assets" / "audio" / "manifest.json",
                                   root / "assets" / "audio" / "files")
        gain = float(music.get("gainDb", gain))
    return mix_episode(
        out_dir / "timeline.json", out_dir / "narration.wav", out_dir / "mix.wav",
        music_path=music_path, music_gain_db=gain,
        stem_voice_path=out_dir / "mix.voice.wav" if stems else None,
        stem_music_path=out_dir / "mix.music.wav" if stems and music_path else None)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.mix")
    ap.add_argument("slug")
    ap.add_argument("--root", default=str(ROOT))
    ap.add_argument("--stems", action="store_true")
    ap.add_argument("--short", type=int)
    a = ap.parse_args(argv)
    try:
        r = run_episode(a.slug, a.root, a.stems, a.short)
    except (ValueError, RuntimeError, OSError, KeyError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1
    print(f"mix: {r['lufs']} LUFS, true peak {r['true_peak']} dBTP, {r['frames']} frame")
    return 0


if __name__ == "__main__":
    sys.exit(main())
