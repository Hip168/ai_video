"""Hạ tầng dùng chung cho test đề mục 5 (dựng tập).

Chứa: bộ kiểm độc lập các luật 1-10, 12 của hợp đồng v2 (để chứng minh mỗi
mẫu sai thật sự vi phạm luật nó nhắm tới), danh mục mẫu sai, và cây thư mục
tạm cho `aivideo.episode`. Nguồn: `.team/features/0b-hop-dong-timeline-v2.md`.
"""

from __future__ import annotations

import copy
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAMPLE2_PATH = ROOT / ".team" / "contract" / "timeline2.sample.json"
FPS = 30
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def load_sample2() -> dict:
    return json.loads(SAMPLE2_PATH.read_text(encoding="utf-8"))


def _is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def broken_rules(doc: dict) -> set[int]:
    """Số hiệu các luật 1-10, 12 mà `doc` vi phạm (luật 11 cần file wav)."""
    bad: set[int] = set()
    if (
        doc.get("version") != 2
        or doc.get("fps") != 30
        or doc.get("width") != 1920
        or doc.get("height") != 1080
    ):
        bad.add(1)
    scenes = doc.get("scenes") or []
    chapters = doc.get("chapters") or []
    total = doc.get("durationInFrames")

    def frames_ok(item: dict) -> bool:
        s, d = item.get("startFrame"), item.get("durationFrames")
        return _is_int(s) and s >= 0 and _is_int(d) and d >= 1

    seen_scene: set = set()
    seen_beat: set = set()
    for sc in scenes:
        if not frames_ok(sc):
            bad.add(2)
        sid = sc.get("id")
        typ = sc.get("type")
        if (
            not isinstance(sid, str)
            or not sid.strip()
            or sid in seen_scene
            or not isinstance(typ, str)
            or not typ
            or (typ.startswith("custom:") and len(typ) == len("custom:"))
            or not isinstance(sc.get("props"), dict)
        ):
            bad.add(3)
        seen_scene.add(sid)
        beats = sc.get("beats")
        if not isinstance(beats, list):
            bad.add(6)
            beats = []
        prev_end = None
        for b in beats:
            if not frames_ok(b):
                bad.add(2)
                continue
            s, e = b["startFrame"], b["startFrame"] + b["durationFrames"]
            if (
                (prev_end is not None and s < prev_end)
                or not _is_int(sc.get("startFrame"))
                or not _is_int(sc.get("durationFrames"))
                or s < sc["startFrame"]
                or e > sc["startFrame"] + sc["durationFrames"]
            ):
                bad.add(5)
            prev_end = e
            if "cue" in b and (not isinstance(b["cue"], str) or not b["cue"]):
                bad.add(8)
            if b.get("id") in seen_beat or not isinstance(b.get("id"), str):
                bad.add(6)
            seen_beat.add(b.get("id"))
            t = b.get("text")
            if (
                not isinstance(t, str)
                or not t.strip()
                or len(t) > 100
                or unicodedata.normalize("NFC", t) != t
            ):
                bad.add(7)
    # Luật 4: liền nhau, cảnh cuối kết thúc đúng durationInFrames.
    if "durationInFrames" in doc and not _is_int(total):
        bad.add(2)
    cursor = 0
    for sc in scenes:
        if not (_is_int(sc.get("startFrame")) and _is_int(sc.get("durationFrames"))):
            continue
        if sc["startFrame"] != cursor:
            bad.add(4)
        cursor = sc["startFrame"] + sc["durationFrames"]
    if not scenes or cursor != total:
        bad.add(4)
    # Luật 9: chương.
    ids = [c.get("id") for c in chapters]
    if (
        not chapters
        or len(set(ids)) != len(ids)
        or any(not isinstance(i, str) or not i.strip() for i in ids)
    ):
        bad.add(9)
    last = -1
    for c in chapters:
        if not isinstance(c.get("title"), str) or not c["title"].strip():
            bad.add(9)
        s = c.get("startFrame")
        if not _is_int(s) or s <= last:
            bad.add(9)
        else:
            last = s
    if chapters and chapters[0].get("startFrame") != 0:
        bad.add(9)
    first_of: dict = {}
    for sc in scenes:
        ch = sc.get("chapter")
        if ch not in ids:
            bad.add(9)
        first_of.setdefault(ch, sc.get("startFrame"))
    for c in chapters:
        if c.get("id") in first_of and first_of[c["id"]] != c.get("startFrame"):
            bad.add(9)
    # Luật 13: chapters không rỗng, khoá sfx bắt buộc (được rỗng).
    if not chapters or not isinstance(doc.get("sfx"), list):
        bad.add(13)
    # Luật 10: sfx.
    prev = -1
    for fx in doc.get("sfx") or []:
        f = fx.get("frame")
        g = fx.get("gainDb")
        if (
            not _is_int(f)
            or f < 0
            or not _is_int(total)
            or f >= total
            or f < prev
            or not isinstance(fx.get("name"), str)
            or not fx["name"].strip()
            or not _is_num(g)
            or g > 0
        ):
            bad.add(10)
        if _is_int(f):
            prev = f
    # Luật 12.
    aud = doc.get("audio")
    src = aud.get("src") if isinstance(aud, dict) else None
    if (
        not isinstance(doc.get("theme"), str)
        or not doc["theme"].strip()
        or not isinstance(src, str)
        or not src.strip()
        or src.startswith("/")
        or "://" in src
        or ".." in Path(src).parts
    ):
        bad.add(12)
    return bad


def _mut(fn):
    def apply(doc: dict) -> dict:
        d = copy.deepcopy(doc)
        fn(d)
        return d

    return apply


def _set(path_fn, value):
    def go(d):
        parent, key = path_fn(d)
        parent[key] = value

    return _mut(go)


# (luật, tên ca, hàm biến mẫu hợp lệ thành mẫu sai)
MUTANTS: list[tuple[int, str, object]] = [
    (1, "version_1", _set(lambda d: (d, "version"), 1)),
    (1, "fps_24", _set(lambda d: (d, "fps"), 24)),
    (1, "width_1280", _set(lambda d: (d, "width"), 1280)),
    (1, "height_1920", _set(lambda d: (d, "height"), 1920)),
    (2, "start_frame_so_thuc", _set(lambda d: (d["scenes"][0]["beats"][0], "startFrame"), 10.5)),
    (2, "duration_bang_0", _set(lambda d: (d["scenes"][0]["beats"][0], "durationFrames"), 0)),
    (2, "start_am", _set(lambda d: (d["scenes"][2]["beats"][0], "startFrame"), -1)),
    (3, "scene_id_trung", _set(lambda d: (d["scenes"][1], "id"), "sc01")),
    (3, "scene_id_rong", _set(lambda d: (d["scenes"][1], "id"), "")),
    (3, "props_la_mang", _set(lambda d: (d["scenes"][0], "props"), [])),
    (3, "custom_khong_ten", _set(lambda d: (d["scenes"][2], "type"), "custom:")),
    (4, "co_khoang_ho_giua_canh", _set(lambda d: (d["scenes"][2], "startFrame"), 400)),
    (4, "canh_chong_nhau", _set(lambda d: (d["scenes"][2], "startFrame"), 380)),
    (4, "canh_dau_khong_tu_0", _set(lambda d: (d["scenes"][0], "startFrame"), 5)),
    (4, "canh_cuoi_khong_het_duration", _set(lambda d: (d, "durationInFrames"), 610)),
    (5, "beat_nguoc_thu_tu", _set(lambda d: (d["scenes"][0]["beats"][1], "startFrame"), 100)),
    (5, "beat_chong_nhau", _set(lambda d: (d["scenes"][0]["beats"][0], "durationFrames"), 160)),
    (5, "beat_vuot_cuoi_canh", _set(lambda d: (d["scenes"][0]["beats"][1], "durationFrames"), 200)),
    (5, "beat_truoc_dau_canh", _set(lambda d: (d["scenes"][2]["beats"][0], "startFrame"), 380)),
    (6, "beat_id_trung_giua_canh", _set(lambda d: (d["scenes"][2]["beats"][0], "id"), "b001")),
    (7, "text_rong", _set(lambda d: (d["scenes"][0]["beats"][0], "text"), "")),
    (7, "text_toan_khoang_trang", _set(lambda d: (d["scenes"][0]["beats"][0], "text"), "   ")),
    (7, "text_101_ky_tu", _set(lambda d: (d["scenes"][0]["beats"][0], "text"), "a" * 101)),
    (7, "text_nfd_khong_nfc", _set(lambda d: (d["scenes"][0]["beats"][0], "text"), unicodedata.normalize("NFD", "Mọi thứ"))),
    (8, "cue_la_so", _set(lambda d: (d["scenes"][0]["beats"][0], "cue"), 5)),
    (8, "cue_chuoi_rong", _set(lambda d: (d["scenes"][0]["beats"][0], "cue"), "")),
    (9, "chuong_id_trung", _set(lambda d: (d["chapters"][1], "id"), "mo-dau")),
    (9, "chuong_title_rong", _set(lambda d: (d["chapters"][1], "title"), " ")),
    (9, "chuong_start_khong_tang", _set(lambda d: (d["chapters"][1], "startFrame"), 0)),
    (9, "chuong_dau_khong_tu_0", _set(lambda d: (d["chapters"][0], "startFrame"), 30)),
    (9, "canh_tro_toi_chuong_la", _set(lambda d: (d["scenes"][1], "chapter"), "khong-co")),
    (9, "chuong_start_lech_canh_dau", _set(lambda d: (d["chapters"][1], "startFrame"), 330)),
    (10, "sfx_frame_bang_duration", _set(lambda d: (d["sfx"][1], "frame"), 600)),
    (10, "sfx_frame_am", _set(lambda d: (d["sfx"][0], "frame"), -1)),
    (10, "sfx_name_rong", _set(lambda d: (d["sfx"][0], "name"), "")),
    (10, "sfx_gain_duong", _set(lambda d: (d["sfx"][0], "gainDb"), 3)),
    (10, "sfx_gain_la_chuoi", _set(lambda d: (d["sfx"][0], "gainDb"), "-18")),
    (10, "sfx_frame_giam", _mut(lambda d: d["sfx"].reverse())),
    (2, "duration_in_frames_so_thuc", _set(lambda d: (d, "durationInFrames"), 600.0)),
    (3, "scene_id_chi_khoang_trang", _set(lambda d: (d["scenes"][1], "id"), "  ")),
    (3, "scene_id_sai_kieu", _set(lambda d: (d["scenes"][1], "id"), 5)),
    (3, "type_rong", _set(lambda d: (d["scenes"][0], "type"), "")),
    (6, "beat_id_sai_kieu", _set(lambda d: (d["scenes"][0]["beats"][0], "id"), 7)),
    (9, "chuong_id_khoang_trang", _set(lambda d: (d["chapters"][1], "id"), " ")),
    (10, "sfx_name_khoang_trang", _set(lambda d: (d["sfx"][0], "name"), "  ")),
    (12, "theme_khoang_trang", _set(lambda d: (d, "theme"), "   ")),
    (12, "audio_src_khoang_trang", _set(lambda d: (d["audio"], "src"), "  ")),
    (12, "audio_src_url", _set(lambda d: (d["audio"], "src"), "https://x.vn/narration.wav")),
    (12, "audio_src_giua_co_cham_cham", _set(lambda d: (d["audio"], "src"), "a/../b.wav")),
    (13, "chapters_rong", _set(lambda d: (d, "chapters"), [])),
    (13, "thieu_khoa_sfx", _mut(lambda d: d.pop("sfx"))),
    (13, "sfx_la_null", _set(lambda d: (d, "sfx"), None)),
    (12, "theme_rong", _set(lambda d: (d, "theme"), "")),
    (12, "audio_src_tuyet_doi", _set(lambda d: (d["audio"], "src"), "/tmp/narration.wav")),
    (12, "audio_src_rong", _set(lambda d: (d["audio"], "src"), "")),
    (12, "audio_src_thoat_thu_muc", _set(lambda d: (d["audio"], "src"), "../narration.wav")),
]


def make_mutant(case: tuple) -> dict:
    return case[2](load_sample2())


# ---------------------------------------------------------------- dựng tập
BEAT_TEXTS = [
    "Mọi thứ bạn đang xem đều bắt đầu từ một tín hiệu rất nhỏ.",
    "Tín hiệu đó chỉ có hai trạng thái là có điện hoặc không có điện.",
    "Từ hai trạng thái ấy, người ta xây nên cả một thế giới số.",
    "Công tắc đầu tiên đã mở ra con đường dẫn tới bộ vi xử lý.",
    "Mỗi bộ vi xử lý chứa hàng tỷ công tắc nhỏ xíu như vậy.",
    "Chúng bật tắt cực nhanh để thực hiện các phép tính của bạn.",
]


def small_script(**meta_extra) -> dict:
    """Tập 6 nhịp: 2 chương, 1 cảnh câm 3 giây, sfx cảnh và sfx nhịp."""
    meta = {"title": "Tập thử", "voice": "giong-thu", "speed": 1.25,
            "theme": "mau-a"}
    meta.update(meta_extra)

    def beat(i: int, **kw) -> dict:
        b = {"id": f"b{i:03d}", "text": BEAT_TEXTS[i - 1], "spoken": None,
             "cue": None, "pause_ms": 300, "sfx": None, "claims": []}
        b.update(kw)
        return b

    return {
        "meta": meta,
        "chapters": [{"id": "mo-dau", "title": "Mở đầu"},
                     {"id": "chuong-1", "title": "Chương một"}],
        "scenes": [
            {"id": "sc01", "chapter": "mo-dau", "type": "cold-open",
             "props": {}, "holdMs": 0, "sfx": "whoosh",
             "beats": [beat(1, cue="hook"), beat(2), beat(3)]},
            {"id": "sc02", "chapter": "chuong-1", "type": "chapter-title",
             "props": {"title": "Chương một"}, "holdMs": 3000, "sfx": None,
             "beats": []},
            {"id": "sc03", "chapter": "chuong-1", "type": "custom:mo-phong",
             "props": {}, "holdMs": 0, "sfx": None,
             "beats": [beat(4), beat(5, sfx="pop"), beat(6)]},
        ],
    }


class Tree:
    """Cây tạm: audio/ (cwd), content/, episodes/<slug>/, out/."""

    def __init__(self, base: Path, slug: str = "tap-thu"):
        self.base, self.slug = base, slug
        (base / "audio").mkdir(parents=True)
        (base / "content").mkdir()
        (base / "content" / "lexicon.json").write_text("{}", encoding="utf-8")
        self.ep_dir.mkdir(parents=True)
        (self.ep_dir / "lexicon.json").write_text("{}", encoding="utf-8")

    @property
    def ep_dir(self) -> Path:
        return self.base / "episodes" / self.slug

    @property
    def out_dir(self) -> Path:
        return self.base / "out" / "episodes" / self.slug

    def write_script(self, doc: dict) -> None:
        (self.ep_dir / "script.json").write_text(
            json.dumps(doc, ensure_ascii=False), encoding="utf-8"
        )

    def timeline(self) -> dict:
        return json.loads(
            (self.out_dir / "timeline.json").read_text(encoding="utf-8")
        )


def parse_srt(path: Path) -> list[tuple[int, int, str]]:
    """Trả [(bắt đầu ms, kết thúc ms, nội dung)], kiểm số thứ tự từ 1."""
    blocks = path.read_text(encoding="utf-8").strip().split("\n\n")
    cues = []
    for i, blk in enumerate(blocks, start=1):
        lines = blk.split("\n")
        assert lines[0] == str(i), f"cue {i}: số thứ tự sai {lines[0]!r}"
        m = re.fullmatch(
            r"(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)",
            lines[1],
        )
        assert m, f"cue {i}: dòng thời gian sai {lines[1]!r}"
        g = [int(x) for x in m.groups()]
        cues.append((
            ((g[0] * 60 + g[1]) * 60 + g[2]) * 1000 + g[3],
            ((g[4] * 60 + g[5]) * 60 + g[6]) * 1000 + g[7],
            "\n".join(lines[2:]),
        ))
    return cues


def _b_text_100(d):
    d["scenes"][0]["beats"][0]["text"] = "a" * 100


def _b_sfx_frame_cuoi(d):
    d["sfx"][1]["frame"] = d["durationInFrames"] - 1


def _b_gain_0(d):
    d["sfx"][0]["gainDb"] = 0


def _b_gain_float(d):
    d["sfx"][0]["gainDb"] = -0.5


def _b_beat_sat_mep(d):
    # beat chiếm trọn cảnh, không có khoảng hở
    d["scenes"][0]["beats"][1]["startFrame"] = 120
    d["scenes"][0]["beats"][1]["durationFrames"] = 180


def _b_sfx_cung_frame(d):
    d["sfx"][1]["frame"] = 0


def _b_audio_src_thu_muc_con(d):
    d["audio"]["src"] = "audio/narration.wav"


def _b_custom_ten_gach_noi(d):
    d["scenes"][2]["type"] = "custom:mo-phong-2"


def _b_sfx_rong(d):
    d["sfx"] = []


# (tên ca, hàm biến mẫu thành ca BIÊN HỢP LỆ): validator phải trả []
VALID_BOUNDARIES = [
    ("text_dung_100_ky_tu", _b_text_100),
    ("sfx_o_frame_cuoi_cung", _b_sfx_frame_cuoi),
    ("gain_bang_0", _b_gain_0),
    ("gain_so_thuc_am", _b_gain_float),
    ("beat_sat_mep_canh", _b_beat_sat_mep),
    ("hai_sfx_cung_frame", _b_sfx_cung_frame),
    ("audio_src_thu_muc_con", _b_audio_src_thu_muc_con),
    ("custom_co_gach_noi", _b_custom_ten_gach_noi),
    ("sfx_rong", _b_sfx_rong),
]


def make_boundary(case: tuple) -> dict:
    d = copy.deepcopy(load_sample2())
    case[1](d)
    return d
