"""[1-1] `validate_timeline` theo `.team/features/0-hop-dong-timeline.md`."""

from __future__ import annotations

import copy
import json
import unicodedata

import pytest

from conftest import SAMPLE_PATH


def validate(doc):
    from aivideo.audio import validate_timeline

    return validate_timeline(doc)


def test_file_mau_hop_dong_doc_thang_tu_contract_la_hop_le():
    doc = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    assert validate(doc) == []


def test_ket_qua_hop_le_la_list_rong_khong_phai_none(sample):
    result = validate(sample)
    assert isinstance(result, list)
    assert result == []


def test_beat_co_khoang_ho_giua_hai_nhip_van_hop_le(sample):
    beats = sample["scenes"][0]["beats"]
    gap = beats[1]["startFrame"] - (
        beats[0]["startFrame"] + beats[0]["durationFrames"]
    )
    assert gap > 0  # file mẫu thật sự có khoảng hở (luật 5)
    assert validate(sample) == []


def test_beat_khong_co_cue_van_hop_le(sample):
    beat = sample["scenes"][0]["beats"][1]
    assert "cue" not in beat
    assert validate(sample) == []


def test_cue_khong_bat_buoc_xoa_cue_o_beat_co_cue_van_hop_le(sample):
    del sample["scenes"][0]["beats"][0]["cue"]
    assert validate(sample) == []


def _set(path, value):
    def mutate(doc):
        node = doc
        for key in path[:-1]:
            node = node[key]
        node[path[-1]] = value

    return mutate


def _scene_gap(doc):
    doc["scenes"][1]["startFrame"] += 5
    doc["scenes"][1]["durationFrames"] -= 5


def _scene_overlap(doc):
    doc["scenes"][1]["startFrame"] -= 5
    doc["scenes"][1]["durationFrames"] += 5


def _first_scene_not_zero(doc):
    doc["scenes"][0]["startFrame"] = 3
    doc["scenes"][0]["durationFrames"] -= 3


def _last_scene_short(doc):
    doc["scenes"][-1]["durationFrames"] -= 1


def _last_scene_long(doc):
    doc["durationInFrames"] -= 1


def _duplicate_scene(doc):
    doc["scenes"][1]["id"] = doc["scenes"][0]["id"]


def _beat_overlap(doc):
    beats = doc["scenes"][0]["beats"]
    beats[1]["startFrame"] = beats[0]["startFrame"] + 10


def _beats_out_of_order(doc):
    beats = doc["scenes"][0]["beats"]
    beats[0], beats[1] = beats[1], beats[0]


def _beat_before_scene(doc):
    scene = doc["scenes"][1]
    scene["beats"][0]["startFrame"] = scene["startFrame"] - 1


def _beat_after_scene(doc):
    scene = doc["scenes"][0]
    beat = scene["beats"][-1]
    beat["durationFrames"] = scene["durationFrames"]


def _duplicate_beat_id(doc):
    doc["scenes"][1]["beats"][0]["id"] = "s01"


def _scene_without_beats(doc):
    doc["scenes"][0]["beats"] = []


def _nfd_text(doc):
    # Chuỗi ngắn: chỉ sai NFC, không vướng giới hạn 100 ký tự.
    text = unicodedata.normalize("NFD", "Việt Nam")
    assert len(text) < 100
    assert text != unicodedata.normalize("NFC", text)
    doc["scenes"][0]["beats"][0]["text"] = text


# 7 loại hỏng của tiêu chí [1-1], mỗi loại vài biến thể.
BROKEN = {
    "luat1_version_sai": [_set(["version"], 2)],
    "luat1_fps_sai": [_set(["fps"], 25)],
    "luat1_kich_thuoc_sai": [_set(["width"], 1280), _set(["height"], 720)],
    "luat2_frame_am": [
        _set(["scenes", 0, "beats", 0, "durationFrames"], -1),
        _set(["scenes", 1, "durationFrames"], -1),
    ],
    "luat2_frame_khong_nguyen": [
        _set(["scenes", 0, "beats", 0, "durationFrames"], 10.5),
    ],
    "luat3_id_canh_la": [_set(["scenes", 0, "id"], "khong-co-canh-nay")],
    "luat3_canh_trung": [_duplicate_scene],
    "luat4_canh_ho_hoac_chong": [
        _scene_gap,
        _scene_overlap,
        _first_scene_not_zero,
        _last_scene_short,
        _last_scene_long,
    ],
    "luat5_beat_chong_hoac_ra_ngoai_canh": [
        _beat_overlap,
        _beats_out_of_order,
        _beat_before_scene,
        _beat_after_scene,
    ],
    "luat6_id_beat_trung_hoac_canh_khong_beat": [
        _duplicate_beat_id,
        _scene_without_beats,
    ],
    "luat8_cue_khong_phai_chuoi": [
        _set(["scenes", 0, "beats", 0, "cue"], 5),
        _set(["scenes", 0, "beats", 0, "cue"], ["send"]),
    ],
    "audio_src_thieu_hoac_sai": [
        _set(["audio"], {}),
        _set(["audio", "src"], ""),
        _set(["audio", "src"], 7),
    ],
    "luat7_text_rong_dai_hoac_khong_nfc": [
        _set(["scenes", 0, "beats", 0, "text"], ""),
        _set(["scenes", 0, "beats", 0, "text"], "a" * 101),
        _nfd_text,
    ],
}


def _cases():
    for name, mutations in BROKEN.items():
        for i, mutate in enumerate(mutations):
            yield pytest.param(mutate, id=f"{name}-{i}")


@pytest.mark.parametrize("mutate", list(_cases()))
def test_timeline_hong_bi_bao_loi(sample, mutate):
    assert validate(copy.deepcopy(sample)) == []  # gốc sạch, lỗi do mutate
    mutate(sample)
    errors = validate(sample)
    assert isinstance(errors, list)
    assert len(errors) >= 1
    assert all(isinstance(e, str) and e.strip() for e in errors)


def test_text_dung_100_ky_tu_van_hop_le(sample):
    sample["scenes"][0]["beats"][0]["text"] = "a" * 100
    assert validate(sample) == []


@pytest.mark.parametrize("bad", [None, [], "timeline", 5, [{"version": 1}]])
def test_doc_khong_phai_dict_tra_loi_khong_nem(bad):
    errors = validate(bad)
    assert isinstance(errors, list)
    assert len(errors) >= 1


def _drop_top(key):
    def mutate(doc):
        del doc[key]

    return mutate


def _drop_scene_key(key):
    def mutate(doc):
        del doc["scenes"][0][key]

    return mutate


def _drop_beat_key(key):
    def mutate(doc):
        del doc["scenes"][0]["beats"][0][key]

    return mutate


MISSING = {
    "version": _drop_top("version"),
    "fps": _drop_top("fps"),
    "width": _drop_top("width"),
    "height": _drop_top("height"),
    "durationInFrames": _drop_top("durationInFrames"),
    "audio": _drop_top("audio"),
    "scenes": _drop_top("scenes"),
    "scene.id": _drop_scene_key("id"),
    "scene.startFrame": _drop_scene_key("startFrame"),
    "scene.durationFrames": _drop_scene_key("durationFrames"),
    "scene.beats": _drop_scene_key("beats"),
    "beat.id": _drop_beat_key("id"),
    "beat.startFrame": _drop_beat_key("startFrame"),
    "beat.durationFrames": _drop_beat_key("durationFrames"),
    "beat.text": _drop_beat_key("text"),
}


@pytest.mark.parametrize("mutate", list(MISSING.values()), ids=list(MISSING))
def test_thieu_khoa_tra_loi_khong_nem_ngoai_le(sample, mutate):
    mutate(sample)
    errors = validate(sample)
    assert isinstance(errors, list)
    assert len(errors) >= 1
