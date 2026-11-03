"""Đo người kiểm: bộ cài lỗi đã biết, chấm độ bắt lỗi và số báo sai.

Hợp đồng: `.team/features/11-doi-san-xuat-giao-dien.md`. Không gọi agent nào; sếp tổng chạy
người kiểm thật (đề mục 12) rồi đưa JSON phát hiện vào `score`.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import shutil
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from aivideo import gates

REPO = Path(__file__).resolve().parents[3]
DEFAULT_OUT = REPO / "qualification"
COUNTED = ("CRITICAL", "MAJOR")

WIKI = "https://en.wikipedia.org/wiki/"

# (id, câu đúng, câu hỏi, trang nguồn, lỗi cài hoặc None)
# Lỗi cài: (chuỗi sai thay vào, loại, ghi chú). `marker` là chuỗi sai nằm trong câu cài lỗi.
FACTS = [
    ("q01", "Tim Berners-Lee đề xuất World Wide Web năm 1989 khi làm việc tại CERN.",
     "Ai đề xuất World Wide Web, năm nào, ở đâu?", "World_Wide_Web",
     ("1989", "1999", "year", "năm sai")),
    ("q02", "Python được Guido van Rossum phát hành lần đầu năm 1991.",
     "Ai tạo ra Python và phát hành lần đầu năm nào?", "Python_(programming_language)",
     ("1991", "2001", "year", "năm sai")),
    ("q03", "Linus Torvalds công bố nhân Linux lần đầu năm 1991.",
     "Ai công bố nhân Linux và năm nào?", "Linux",
     ("Linus Torvalds", "Richard Stallman", "person", "người sai")),
    ("q04", "iPhone đời đầu của Apple được bán ra năm 2007.",
     "iPhone đời đầu được bán ra năm nào?", "IPhone_(1st_generation)",
     ("2007", "2010", "year", "năm sai")),
    ("q05", "Địa chỉ IPv4 dài 32 bit, tức khoảng 4,3 tỷ địa chỉ.",
     "Địa chỉ IPv4 dài bao nhiêu bit?", "IPv4",
     ("32 bit", "64 bit", "number", "số bit sai")),
    ("q06", "Bảng mã ASCII dùng 7 bit nên biểu diễn được 128 ký tự.",
     "ASCII dùng bao nhiêu bit, biểu diễn bao nhiêu ký tự?", "ASCII",
     ("128 ký tự", "256 ký tự", "number", "số ký tự sai")),
    ("q07", "UTF-8 mã hoá mỗi ký tự bằng từ 1 đến 4 byte.",
     "UTF-8 dùng tối đa bao nhiêu byte cho một ký tự?", "UTF-8",
     ("4 byte", "8 byte", "number", "số byte sai")),
    ("q08", "Bộ vi xử lý Intel 4004 ra mắt năm 1971.",
     "Intel 4004 ra mắt năm nào?", "Intel_4004",
     ("1971", "1981", "year", "năm sai")),
    ("q09", "Máy tính ENIAC được công bố cho công chúng năm 1946.",
     "ENIAC được công bố năm nào?", "ENIAC",
     ("1946", "1966", "year", "năm sai")),
    ("q10", "Git do Linus Torvalds tạo ra năm 2005.",
     "Ai tạo ra Git và năm nào?", "Git",
     ("2005", "2010", "year", "năm sai")),
    ("q11", "Mã trạng thái HTTP 404 nghĩa là không tìm thấy trang.",
     "Mã HTTP 404 nghĩa là gì?", "List_of_HTTP_status_codes", None),
    ("q12", "Một byte gồm 8 bit.",
     "Một byte gồm bao nhiêu bit?", "Byte", None),
]


def _claim(cid, text, question, page):
    return {"id": cid, "claim": text, "question": question, "sources": [{"url": WIKI + page, "credibility": "secondary"}],
            "status": "CHUA_KIEM"}


def build_fact():
    clean, seeded, errors = [], [], []
    for cid, text, question, page, seed in FACTS:
        clean.append(_claim(cid, text, question, page))
        if seed is None:
            seeded.append(_claim(cid, text, question, page))
            continue
        good, bad, kind, note = seed
        assert good in text, (cid, good)
        wrong = text.replace(good, bad, 1)
        seeded.append(_claim(cid, wrong, question, page))
        errors.append({"id": cid, "severity": "CRITICAL", "file": "items.json", "marker": bad,
                       "kind": kind, "note": f"{note}: đúng là {good!r}"})
    return clean, seeded, errors


# ---- gói qc: kịch bản chốt + sản phẩm dạng chữ ---------------------------------

QC_BEATS = [
    ("sc01", "mo-dau", "cold-open", [
        ("b001", "Python ra đời năm 1991 do Guido van Rossum tạo ra.", 0, 120)]),
    ("sc02", "mo-dau", "term-card", [
        ("b002", "Nó nổi tiếng nhờ cú pháp ngắn gọn dễ đọc.", 150, 120)]),
    ("sc03", "chuong-1", "chapter-title", []),
    ("sc04", "chuong-1", "big-number", [
        ("b003", "Địa chỉ IPv4 dài 32 bit, tức khoảng 4,3 tỷ địa chỉ.", 330, 180)]),
]
QC_SCENE_FRAMES = {"sc01": (0, 150), "sc02": (150, 150), "sc03": (300, 30), "sc04": (330, 270)}


def _srt_time(frame: int) -> str:
    ms = round(frame * 1000 / 30)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_qc_clean() -> dict[str, str]:
    script = {"meta": {"title": "Gói đo qc", "theme": "mau-a", "voice": "hoang_nam", "speed": 1.0},
              "chapters": [{"id": "mo-dau", "title": "Mở đầu"}, {"id": "chuong-1", "title": "Chương một"}],
              "scenes": []}
    tl_scenes, srt, n = [], [], 0
    for sid, ch, typ, beats in QC_BEATS:
        script["scenes"].append({
            "id": sid, "chapter": ch, "type": typ, "props": {}, "holdMs": 0 if beats else 1000,
            "sfx": None,
            "beats": [{"id": bid, "text": t, "spoken": None, "cue": None, "pause_ms": 0, "sfx": None,
                       "claims": []} for bid, t, _, _ in beats]})
        start, dur = QC_SCENE_FRAMES[sid]
        tl_beats = []
        for bid, t, bs, bd in beats:
            tl_beats.append({"id": bid, "startFrame": bs, "durationFrames": bd, "text": t})
            n += 1
            srt.append(f"{n}\n{_srt_time(bs)} --> {_srt_time(bs + bd)}\n{t}\n")
        tl_scenes.append({"id": sid, "chapter": ch, "type": typ, "props": {}, "startFrame": start,
                          "durationFrames": dur, "beats": tl_beats})
    timeline = {"version": 2, "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 600,
                "theme": "mau-a", "audio": {"src": "narration.wav"},
                "chapters": [{"id": "mo-dau", "title": "Mở đầu", "startFrame": 0},
                             {"id": "chuong-1", "title": "Chương một", "startFrame": 300}],
                "sfx": [], "scenes": tl_scenes}
    dump = lambda o: json.dumps(o, ensure_ascii=False, indent=2) + "\n"  # noqa: E731
    return {"script.json": dump(script), "timeline.json": dump(timeline),
            "video.srt": "\n".join(srt), "chapters.txt": "00:00 Mở đầu\n00:10 Chương một\n"}


def build_qc_seeded(clean: dict[str, str]):
    s = copy.deepcopy(clean)
    errors = []

    def sub(fname, old, new, eid, severity, marker, kind, note):
        assert s[fname].count(old) == 1, (fname, old)
        s[fname] = s[fname].replace(old, new)
        errors.append({"id": eid, "severity": severity, "file": fname, "marker": marker,
                       "kind": kind, "note": note})

    sub("video.srt", "năm 1991", "năm 1919", "e01", "CRITICAL", "1919", "number",
        "phụ đề sai số so với kịch bản chốt (đúng 1991)")
    sub("video.srt", "Guido van Rossum", "Guido van Rosum", "e02", "CRITICAL", "Rosum", "name",
        "phụ đề sai tên người so với kịch bản chốt")
    sub("timeline.json", '"startFrame": 330,\n      "durationFrames": 270',
        '"startFrame": 345,\n      "durationFrames": 270', "e03", "CRITICAL", '"startFrame": 345',
        "timeline", "hở giữa cảnh sc03 và sc04 (luật 4 của hợp đồng timeline)")
    sub("timeline.json", '"durationInFrames": 600', '"durationInFrames": 660', "e04", "CRITICAL",
        '"durationInFrames": 660', "timeline", "tổng frame lệch cảnh cuối (luật 4)")
    sub("chapters.txt", "00:00 Mở đầu", "00:03 Mở đầu", "e05", "CRITICAL", "00:03 Mở đầu",
        "chapters", "dòng đầu mục lục không phải 00:00 nên YouTube bỏ chương")
    sub("chapters.txt", "00:10 Chương một", "00:15 Chương một", "e06", "MAJOR", "00:15 Chương một",
        "chapters", "chương một chỉ còn 5 giây, dưới mức 10 giây của YouTube")
    return s, errors


def build(out: Path = DEFAULT_OUT) -> None:
    out = Path(out)
    clean, seeded, errs = build_fact()
    _write(out / "fact" / "clean.json", clean)
    _write(out / "fact" / "seeded.json", seeded)
    _write(out / "fact" / "seeded-errors.json", errs)
    qc_clean = build_qc_clean()
    qc_seeded, qc_errs = build_qc_seeded(qc_clean)
    for name, files in (("clean", qc_clean), ("seeded", qc_seeded)):
        d = out / "qc" / name
        d.mkdir(parents=True, exist_ok=True)
        for fname, body in files.items():
            (d / fname).write_text(body, encoding="utf-8")
    _write(out / "qc" / "seeded-errors.json", qc_errs)


def _write(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---- chuẩn bị đầu vào mù ------------------------------------------------------

def prepare(kind: str, which: str, role_file=None, tmp_parent=None, qual_dir: Path = DEFAULT_OUT) -> dict:
    if which not in ("clean", "seeded"):
        raise gates.GateError("--which phải là clean hoặc seeded")
    parent = Path(tmp_parent) if tmp_parent else Path(tempfile.gettempdir())
    parent.mkdir(parents=True, exist_ok=True)
    if kind == "fact":
        if not role_file:
            raise gates.GateError("--role bắt buộc với fact")
        work = Path(tempfile.mkdtemp(prefix="dung-", dir=parent))
        ep = work / "episodes" / "do-fact"
        ep.mkdir(parents=True)
        shutil.copy(Path(qual_dir) / "fact" / f"{which}.json", ep / "claims.json")
        return gates.prepare_factcheck("do-fact", work / "episodes", role_file, tmp_parent=parent)
    if kind == "qc":
        dest = Path(tempfile.mkdtemp(prefix="goi-", dir=parent))
        src = Path(qual_dir) / "qc" / which
        for f in src.iterdir():
            shutil.copy(f, dest / f.name)
        return {"packageDir": str(dest), "files": sorted(p.name for p in dest.iterdir())}
    raise gates.GateError("--kind phải là fact hoặc qc")


# ---- chấm ---------------------------------------------------------------------

def _caught(err: dict, f: dict) -> bool:
    if Path(f["file"]).name != err["file"]:
        return False
    return err["marker"] in f["quote"] or f["rule"].endswith(":" + err["id"])


def _counted(path, root) -> list[dict]:
    if path is None:
        return []
    res = gates.evaluate_findings(Path(path), root)
    if res["verdict"] == "CHUA_DUYET":
        raise gates.GateError(f"{path}: chưa duyệt ({res.get('reason')})")
    return [f for f in res["kept"] if f["severity"] in COUNTED]


def score(kind, errors, found, clean_found=None, root=".", clean_root=None,
          threshold=0.9, max_false=1, role_file=None) -> dict:
    errs = json.loads(Path(errors).read_text(encoding="utf-8"))
    seeded = _counted(found, root)
    clean = _counted(clean_found, clean_root or root)
    caught, matched = [], set()
    for e in errs:  # mỗi phát hiện chỉ tính bắt tối đa một lỗi cài
        hit = next((i for i, f in enumerate(seeded) if i not in matched and _caught(e, f)), None)
        if hit is not None:
            caught.append(e["id"])
            matched.add(hit)
    false_keys = {(Path(f["file"]).name, f["quote"]) for f in seeded
                  if not any(_caught(e, f) for e in errs)}
    false_keys |= {("sach", Path(f["file"]).name, f["quote"]) for f in clean}
    n, k = len(errs), len(caught)
    rate = (k / n) if n else 1.0
    missed = [e["id"] for e in errs if e["id"] not in caught]
    crit_missed = [e["id"] for e in errs if e["severity"] == "CRITICAL" and e["id"] not in caught]
    if kind == "fact":
        pass_rate, pass_false = rate >= threshold, len(false_keys) <= max_false
        ok = pass_rate and pass_false
    else:
        pass_rate, pass_false = not crit_missed, True
        ok = pass_rate
    phash = ""
    if role_file:
        phash = hashlib.sha256(Path(role_file).read_bytes()).hexdigest()[:12]
    day = datetime.now(UTC).strftime("%Y-%m-%d")
    role = "fact-checker" if kind == "fact" else "qc"
    row = (f"| {day} | {role} | {phash or '-'} | {n} | {k} | {rate:.0%} | {len(false_keys)} | "
           f"{'ĐẠT' if ok else 'CHƯA ĐẠT'} |")
    return {"kind": kind, "errors": n, "caught": k, "rate": round(rate, 4), "missed": missed,
            "falseAlarms": len(false_keys), "passRate": pass_rate, "passFalse": pass_false,
            "pass": ok, "row": row}


# ---- CLI ----------------------------------------------------------------------

def main(argv=None) -> int:
    try:
        return _main(argv)
    except (gates.GateError, ValueError, OSError, KeyError, TypeError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


def _main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.qualify")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--out", default=str(DEFAULT_OUT))
    p = sub.add_parser("prepare")
    p.add_argument("--kind", required=True, choices=("fact", "qc"))
    p.add_argument("--which", required=True, choices=("clean", "seeded"))
    p.add_argument("--role")
    p.add_argument("--tmp-parent")
    p.add_argument("--qual-dir", default=str(DEFAULT_OUT))
    s = sub.add_parser("score")
    s.add_argument("--kind", required=True, choices=("fact", "qc"))
    s.add_argument("--errors", required=True)
    s.add_argument("--found", required=True)
    s.add_argument("--clean-found")
    s.add_argument("--root", default=".")
    s.add_argument("--clean-root")
    s.add_argument("--threshold", type=float, default=0.9)
    s.add_argument("--max-false", type=int, default=1)
    s.add_argument("--role-file")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        build(Path(a.out))
        print(json.dumps({"out": a.out}, ensure_ascii=False))
        return 0
    if a.cmd == "prepare":
        print(json.dumps(prepare(a.kind, a.which, a.role, a.tmp_parent, Path(a.qual_dir)),
                         ensure_ascii=False, indent=2))
        return 0
    r = score(a.kind, a.errors, a.found, a.clean_found, a.root, a.clean_root, a.threshold,
              a.max_false, a.role_file)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    return 0 if r["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
