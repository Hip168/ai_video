"""[5-3] Tập mẫu, danh mục tập, README: file có thật trong repo."""

from __future__ import annotations

import json
import unicodedata

from ep_support import ROOT, SLUG_RE

EP = ROOT / "episodes"
TPL = EP / "_template"


def _script() -> dict:
    return json.loads((TPL / "script.json").read_text(encoding="utf-8"))


def test_episodes_readme_co_noi_dung():
    text = (EP / "README.md").read_text(encoding="utf-8")
    assert len(text.strip()) > 100
    assert "episode" in text.lower() or "tập" in text.lower()


def test_template_co_du_cac_file_theo_hop_dong():
    for name in ("script.json", "lexicon.json", "sources.md", "claims.json",
                 "outline.md"):
        assert (TPL / name).is_file(), name


def test_template_script_meta_day_du_giong_toc_do_theme():
    meta = _script()["meta"]
    assert isinstance(meta["title"], str) and meta["title"].strip()
    assert isinstance(meta["voice"], str) and meta["voice"]
    assert isinstance(meta["speed"], (int, float)) and meta["speed"] > 0
    assert isinstance(meta["theme"], str) and meta["theme"]


def test_template_nhip_hop_le_id_duy_nhat_text_nfc_toi_da_100():
    ids, script = [], _script()
    for sc in script["scenes"]:
        for b in sc["beats"]:
            ids.append(b["id"])
            t = b["text"]
            assert t.strip() and len(t) <= 100
            assert unicodedata.normalize("NFC", t) == t
            assert isinstance(b["pause_ms"], int) and b["pause_ms"] >= 0
    assert len(ids) == 130 and len(set(ids)) == 130


def test_template_moi_canh_tro_toi_chuong_co_khai_bao_va_id_canh_duy_nhat():
    script = _script()
    chapter_ids = [c["id"] for c in script["chapters"]]
    assert len(set(chapter_ids)) == len(chapter_ids)
    scene_ids = [s["id"] for s in script["scenes"]]
    assert len(set(scene_ids)) == len(scene_ids)
    assert all(s["chapter"] in chapter_ids for s in script["scenes"])
    assert all(isinstance(s["props"], dict) for s in script["scenes"])


def test_template_co_it_nhat_mot_canh_cam_mot_sfx_canh_va_mot_sfx_nhip():
    scenes = _script()["scenes"]
    assert any(not s["beats"] and s.get("holdMs", 0) > 0 for s in scenes)
    assert any(s.get("sfx") for s in scenes)
    assert any(b.get("sfx") for s in scenes for b in s["beats"])


def test_template_co_it_nhat_mot_nhip_dung_spoken_ghi_de():
    beats = [b for s in _script()["scenes"] for b in s["beats"]]
    assert any(b.get("spoken") for b in beats)


def test_template_claims_json_la_mang_rong():
    claims = json.loads((TPL / "claims.json").read_text(encoding="utf-8"))
    assert claims == []


def test_index_json_la_danh_muc_voi_slug_title_theme_scenetypes():
    doc = json.loads((EP / "index.json").read_text(encoding="utf-8"))
    assert isinstance(doc, list)
    entries = doc  # được rỗng
    for e in entries:
        assert isinstance(e["title"], str) and e["title"]
        assert isinstance(e["theme"], str) and e["theme"]
        assert isinstance(e["sceneTypes"], list)
        assert all(isinstance(t, str) and t for t in e["sceneTypes"])
        assert isinstance(e["slug"], str) and e["slug"]
    slugs = [e["slug"] for e in entries]
    assert len(set(slugs)) == len(slugs)
    assert all(SLUG_RE.fullmatch(s) for s in slugs)
    assert "_template" not in slugs
