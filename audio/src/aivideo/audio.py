"""Chuẩn hóa, ghép âm thanh, xuất timeline + SRT, kiểm timeline, CLI."""
from __future__ import annotations

import unicodedata

SCENE_IDS = ("phone", "dns", "packets", "wifi", "hops", "server", "receiver")
FPS, WIDTH, HEIGHT = 30, 1920, 1080


def _is_frame(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= 0


def validate_timeline(doc) -> list[str]:
    """Trả danh sách lỗi theo hợp đồng timeline v1; rỗng là hợp lệ."""
    errs: list[str] = []
    if not isinstance(doc, dict):
        return ["timeline phải là object"]
    for key, want in (("version", 1), ("fps", FPS), ("width", WIDTH), ("height", HEIGHT)):
        if doc.get(key) != want or isinstance(doc.get(key), bool):
            errs.append(f"luật 1: {key} phải bằng {want}, có {doc.get(key)!r}")
    total = doc.get("durationInFrames")
    if not _is_frame(total):
        errs.append("luật 2: durationInFrames phải là số nguyên >= 0")
        total = None
    audio = doc.get("audio")
    if not isinstance(audio, dict) or not isinstance(audio.get("src"), str) or not audio["src"]:
        errs.append("audio.src phải là chuỗi không rỗng")
    scenes = doc.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errs.append("scenes phải là danh sách không rỗng")
        return errs

    seen_scenes: set = set()
    seen_beats: set = set()
    expected_start = 0
    for si, sc in enumerate(scenes):
        if not isinstance(sc, dict):
            errs.append(f"scenes[{si}] phải là object")
            continue
        sid = sc.get("id")
        if sid not in SCENE_IDS:
            errs.append(f"luật 3: scenes[{si}].id {sid!r} không thuộc tập cho phép")
        elif sid in seen_scenes:
            errs.append(f"luật 3: cảnh {sid!r} xuất hiện nhiều hơn một lần")
        seen_scenes.add(sid)
        s0, sd = sc.get("startFrame"), sc.get("durationFrames")
        if not (_is_frame(s0) and _is_frame(sd)):
            errs.append(f"luật 2: scenes[{si}] startFrame/durationFrames phải là số nguyên >= 0")
            continue
        if s0 != expected_start:
            errs.append(f"luật 4: cảnh {sid!r} bắt đầu {s0}, phải là {expected_start} (hở hoặc chồng)")
        expected_start = s0 + sd
        beats = sc.get("beats")
        if not isinstance(beats, list) or not beats:
            errs.append(f"luật 6: cảnh {sid!r} phải có ít nhất một beat")
            continue
        prev_end = s0
        for bi, b in enumerate(beats):
            if not isinstance(b, dict):
                errs.append(f"cảnh {sid!r} beats[{bi}] phải là object")
                continue
            bid = b.get("id")
            if not isinstance(bid, str) or not bid:
                errs.append(f"luật 6: cảnh {sid!r} beats[{bi}].id phải là chuỗi không rỗng")
            elif bid in seen_beats:
                errs.append(f"luật 6: beat id {bid!r} bị trùng")
            seen_beats.add(bid)
            b0, bd = b.get("startFrame"), b.get("durationFrames")
            if not (_is_frame(b0) and _is_frame(bd)):
                errs.append(f"luật 2: beat {bid!r} startFrame/durationFrames phải là số nguyên >= 0")
            else:
                if b0 < prev_end:
                    errs.append(f"luật 5: beat {bid!r} bắt đầu {b0} < {prev_end} (chồng hoặc không tăng dần)")
                if b0 + bd > s0 + sd:
                    errs.append(f"luật 5: beat {bid!r} vượt ra ngoài cảnh {sid!r}")
                prev_end = max(prev_end, b0 + bd)
            text = b.get("text")
            if not isinstance(text, str) or not text.strip():
                errs.append(f"luật 7: beat {bid!r} text rỗng")
            else:
                if len(text) > 100:
                    errs.append(f"luật 7: beat {bid!r} text dài {len(text)} > 100 ký tự")
                if unicodedata.normalize("NFC", text) != text:
                    errs.append(f"luật 7: beat {bid!r} text không phải NFC")
            if "cue" in b and not isinstance(b["cue"], str):
                errs.append(f"luật 8: beat {bid!r} cue phải là chuỗi")
    if total is not None and expected_start != total:
        errs.append(f"luật 4: cảnh cuối kết thúc tại {expected_start}, durationInFrames là {total}")
    return errs
