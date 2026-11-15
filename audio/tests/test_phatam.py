"""Đề mục 18: nghe phát âm tiếng Anh (`aivideo.phatam`). Máy nghe và TTS được giả lập."""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import pytest
from aivideo import gates, phatam

from gates_support import SLUG, make_episode, write_json


def _heard(p_en, start=0.5, end=1.0, word="x"):
    return {"pEn": p_en, "pVi": p_en, "start": start, "end": end,
            "heardEn": [{"word": word, "p": 0.5}], "langEn": 0.5, "heardVi": "câu"}


@pytest.fixture
def no_phoneme(monkeypatch):
    monkeypatch.setattr(phatam, "phonemes", lambda items: None)
    monkeypatch.setattr(phatam, "target_ipa", lambda term: None)


# ---- quét từ ---------------------------------------------------------------------------

@pytest.mark.parametrize("w", ["false", "true", "float", "decimal", "Python", "IEEE",
                               "Patriot", "Scud", "JavaScript", "math.isclose", "Werner"])
def test_tu_tieng_anh_bi_nhan_ra(w):
    assert phatam.is_foreign(w)


@pytest.mark.parametrize("w", ["người", "nghiêng", "khuỷu", "quốc", "giữa", "thuyền", "chữ",
                               "Máy", "đáp", "tức", "không", "Mô-đun", "bit", "xoong", "hoặc",
                               "CPU", "DNS", "Wi-Fi", "a", "x"])
def test_tu_viet_va_viet_tat_pho_thong_khong_bi_nhan(w):
    assert not phatam.is_foreign(w)


def _script(*beats):
    return {"scenes": [{"beats": [dict(b) for b in beats]}]}


def test_tim_tu_qua_lexicon_khi_khong_co_spoken():
    occ = phatam.find_occurrences(_script({"id": "b1", "text": "Máy đáp: false, tức là không."}),
                                  {"false": "phôn"})
    assert [(o["beat"], o["term"], o["spoken"], o["kind"]) for o in occ] == [
        ("b1", "false", "phôn", "phien-am")]
    a, z = occ[0]["span"]
    assert occ[0]["line"][a:z] == "phôn"


def test_tim_cach_doc_trong_spoken_khac_lexicon():
    b = {"id": "b3", "text": "Máy đáp: false, tức là không.", "spoken": "Máy đáp: phôn-xơ, tức là không."}
    occ = phatam.find_occurrences(_script(b), {"false": "phôn"})
    assert [(o["spoken"], o["kind"]) for o in occ] == [("phôn-xơ", "phien-am")]


def test_thay_bang_nghia_viet_thi_khong_cham():
    b = {"id": "b3", "text": "Máy đáp: false, tức là không.", "spoken": "Máy đáp: sai, tức là không."}
    occ = phatam.find_occurrences(_script(b), {})
    assert [(o["spoken"], o["kind"], o["span"]) for o in occ] == [("sai", "nghia-viet", None)]


def test_giu_nguyen_tieng_anh_va_dem_moi_lan():
    occ = phatam.find_occurrences(_script({"id": "b1", "text": "Dùng decimal, chỉ decimal thôi."}), {})
    assert [(o["term"], o["kind"]) for o in occ] == [("decimal", "giu-tieng-anh")] * 2
    assert occ[0]["span"] != occ[1]["span"]


def test_hai_tu_lien_nhau_ghep_dung_vi_tri():
    b = {"id": "b13", "text": "Cụm từ binary digit nghĩa là chữ số.",
         "spoken": "Cụm từ bai-nơ-ri đi-jít nghĩa là chữ số."}
    occ = phatam.find_occurrences(_script(b), {})
    assert [(o["term"], o["spoken"]) for o in occ] == [("binary", "bai-nơ-ri"), ("digit", "đi-jít")]


def test_khong_tim_duoc_cach_doc_thi_ghi_khong_xac_dinh():
    b = {"id": "b1", "text": "Từ false.", "spoken": "Một câu khác hẳn về nội dung, flóts."}
    occ = phatam.find_occurrences(_script(b), {})
    assert occ[0]["kind"] == "khong-xac-dinh" and occ[0]["span"] is None


@pytest.mark.parametrize("text,spoken", [
    ("Theo GPS.gov, nhiều máy gặp sự cố.", "Theo trang chính thức của hệ thống, nhiều thiết bị đã thật sự gặp sự cố."),
    ("Biến BH tràn.", "Con số đó là một biến đo độ lệch ngang của tên lửa."),
    ("Sinh ra Operand Error.", "Giá trị lúc ấy quá lớn. Phép đổi sinh ra lỗi toán hạng."),
    ("Ông Jacques-Louis Lions nộp báo cáo.", "Hội đồng điều tra nộp báo cáo ngày mười chín."),
    ("glibc trên Linux.", "Thư viện nền của Linux cho chương trình ba mươi hai bit."),
])
def test_spoken_luoc_bo_tu_thi_ghi_khong_doc(text, spoken):
    occ = phatam.find_occurrences(_script({"id": "b1", "text": text, "spoken": spoken}), {})
    lost = [o for o in occ if o["term"] != "Linux"]
    assert lost and all(o["kind"] == "khong-doc" and o["span"] is None for o in lost)


# ---- chấm điểm ----------------------------------------------------------------------------

def test_nguong_pen():
    assert phatam.score(_heard(phatam.P_EN_MIN), None, None)["pass"] is True
    assert phatam.score(_heard(phatam.P_EN_MIN - 0.001), None, None)["pass"] is False
    assert phatam.score(_heard(0.5), None, None)["per"] is None


def test_am_vi_chi_de_tham_khao_khong_chan():
    r = phatam.score(_heard(0.5), "fˈɔls", {"phones": "m i t"})
    assert r["pass"] is True and r["per"] == 1.0 and r["phones"] == "m i t"
    assert phatam.score(_heard(0.01), "fˈɔls", {"phones": "f ɔ l s"})["pass"] is False


def test_khoang_cach_am_vi():
    assert phatam.phone_distance("fˈɔls", "f ɔ l s") == 0
    assert phatam.phone_distance("fˈɔls", "aɪ d a p f ɔ s t") == 0.25
    assert phatam.phone_distance("fˈɔls", "s aɪ") == 0.75


def test_phien_am_tu_sinh():
    assert {"phon", "phon-xơ"} <= set(phatam.respell("fˈɔls"))
    assert "pai-thơn" in phatam.respell("pˈaɪθən")
    assert phatam.respell("") == []


# ---- pick ----------------------------------------------------------------------------------

@pytest.fixture
def fake_audio(monkeypatch):
    """synth_clip ghi câu vào file; listen trả pEn theo câu trong file."""
    def synth(line, voice, speed, dst, engine=phatam.ENGINE):
        Path(dst).write_text(line, encoding="utf-8")

    def listen_by(table):
        def listen(items):
            out = []
            for it in items:
                line = Path(it["wav"]).read_text(encoding="utf-8")
                cand = line[len(it["prefix"]):len(line) - len(it["suffix"]) or None]
                out.append(_heard(table.get(cand, 0.0), word=cand))
            return out
        monkeypatch.setattr(phatam, "listen", listen)

    monkeypatch.setattr(phatam, "synth_clip", synth)
    return listen_by


def test_pick_chon_ung_vien_cao_nhat_va_dat(fake_audio, no_phoneme, capsys):
    fake_audio({"false": 0.5, "fôls": 0.56, "phôn-xơ": 0.03})
    code = phatam.main(["pick", "false", "--candidates", "phôn-xơ,fôls", "--meaning", "sai",
                        "--context", "Máy đáp: {}, tức là không."])
    out = capsys.readouterr().out
    assert code == 0
    assert "CHỌN: 'fôls'" in out


def test_pick_nghia_viet_khong_bao_gio_thang(fake_audio, no_phoneme):
    fake_audio({"sai": 0.99})
    res = phatam.pick("false", [], "Máy đáp: {}.", "sai")
    assert res["winner"] is None
    assert res["rows"][-1]["candidate"] == "sai"


def test_pick_khong_ai_dat_thi_khuyen_dung_nghia_viet(fake_audio, no_phoneme, capsys):
    fake_audio({"phôn": 0.001})
    code = phatam.main(["pick", "false", "--candidates", "phôn", "--meaning", "sai"])
    out = capsys.readouterr().out
    assert code == 1
    assert "KHÔNG ĐẠT" in out and "'sai'" in out


def test_pick_context_phai_co_dung_mot_cho(fake_audio, no_phoneme, capsys):
    assert phatam.main(["pick", "false", "--context", "không có chỗ"]) == 1
    assert "lỗi" in capsys.readouterr().err


def test_pick_cho_ung_vien_tu_sinh_khi_co_ipa(fake_audio, monkeypatch):
    monkeypatch.setattr(phatam, "phonemes", lambda items: None)
    monkeypatch.setattr(phatam, "target_ipa", lambda term: "fˈɔls")
    fake_audio({})
    res = phatam.pick("false", [], phatam.DEFAULT_CONTEXT, None)
    kinds = {r["candidate"]: r["kind"] for r in res["rows"]}
    assert kinds["phon"] == "tu-sinh" and kinds["false"] == "tieng-anh-goc"


# ---- scan / check tập ------------------------------------------------------------------------

def _repo(tmp_path, beats, lexicon=None):
    root = tmp_path / "repo"
    ep = root / "episodes" / "tap"
    write_json(ep / "script.json", {"meta": {}, "scenes": [{"id": "s1", "beats": beats}]})
    if lexicon:
        write_json(ep / "lexicon.json", lexicon)
    out = root / "out" / "episodes" / "tap"
    out.mkdir(parents=True)
    with wave.open(str(out / "narration.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\0\0" * 16000 * 3)
    tl = {"scenes": [{"id": "s1", "beats": [{"id": b["id"], "startFrame": 30 * i, "durationFrames": 30}
                                            for i, b in enumerate(beats)]}]}
    write_json(out / "timeline.json", tl)
    return root


def test_scan_liet_ke_tu(tmp_path, capsys):
    root = _repo(tmp_path, [{"id": "b1", "text": "Máy đáp: false."}], {"false": "phôn"})
    assert phatam.main(["--root", str(root), "scan", "tap"]) == 0
    out = capsys.readouterr().out
    assert "false" in out and "phôn" in out and "b1" in out


def test_check_dat_va_truot(tmp_path, monkeypatch, capsys, no_phoneme):
    root = _repo(tmp_path, [{"id": "b1", "text": "Máy đáp: false."},
                            {"id": "b2", "text": "Dùng decimal nhé."}], {"false": "phôn"})
    seen = []

    def listen(items):
        seen.extend(items)
        return [_heard(0.5 if it["term"] == "decimal" else 0.01) for it in items]

    monkeypatch.setattr(phatam, "listen", listen)
    assert phatam.main(["--root", str(root), "check", "tap"]) == 1
    assert "TRƯỢT" in capsys.readouterr().out
    assert [(i["prefix"], i["term"], i["suffix"]) for i in seen] == [
        ("Máy đáp: ", "false", "."), ("Dùng ", "decimal", " nhé.")]
    monkeypatch.setattr(phatam, "listen", lambda items: [_heard(0.5) for _ in items])
    assert phatam.main(["--root", str(root), "check", "tap"]) == 0


def test_check_cau_ep_doc_viet_moi_tu_tieng_anh_cua_nhip_bang_chu_goc(tmp_path, monkeypatch, no_phoneme):
    root = _repo(tmp_path, [{"id": "b1", "text": "Mô-đun decimal của Python."}],
                 {"decimal": "đê-xi-mồ", "Python": "pai-thơn"})
    seen = []
    monkeypatch.setattr(phatam, "listen", lambda items: seen.extend(items) or [_heard(0.5) for _ in items])
    assert phatam.main(["--root", str(root), "check", "tap"]) == 0
    assert [(i["prefix"], i["term"], i["suffix"]) for i in seen] == [
        ("Mô-đun ", "decimal", " của Python."), ("Mô-đun decimal của ", "Python", ".")]


def test_check_khong_co_tu_tieng_anh_thi_dat_khong_goi_may_nghe(tmp_path, monkeypatch, capsys):
    root = _repo(tmp_path, [{"id": "b1", "text": "Một câu thuần Việt."}])
    monkeypatch.setattr(phatam, "listen", lambda items: pytest.fail("không được gọi"))
    assert phatam.main(["--root", str(root), "check", "tap"]) == 0


def test_check_cach_doc_khong_xac_dinh_thi_truot(tmp_path, monkeypatch, capsys, no_phoneme):
    root = _repo(tmp_path, [{"id": "b1", "text": "Từ false.", "spoken": "Một câu khác hẳn về nội dung, flóts."}])
    monkeypatch.setattr(phatam, "listen", lambda items: [_heard(0.9) for _ in items])
    assert phatam.main(["--root", str(root), "check", "tap"]) == 1


def test_check_tu_khong_duoc_doc_thi_bo_qua(tmp_path, monkeypatch, capsys, no_phoneme):
    root = _repo(tmp_path, [{"id": "b1", "text": "Cục FAA ra chỉ thị.", "spoken": "Cục hàng không liên bang Mỹ ra chỉ thị."},
                            {"id": "b2", "text": "Dùng decimal nhé."}])
    seen = []
    monkeypatch.setattr(phatam, "listen", lambda items: seen.extend(items) or [_heard(0.5) for _ in items])
    assert phatam.main(["--root", str(root), "check", "tap"]) == 0
    assert [i["term"] for i in seen] == ["decimal"]


def test_check_thieu_giong_thi_loi(tmp_path, capsys):
    root = _repo(tmp_path, [{"id": "b1", "text": "Từ false."}])
    (root / "out" / "episodes" / "tap" / "narration.wav").unlink()
    assert phatam.main(["--root", str(root), "check", "tap"]) == 1
    assert "lỗi" in capsys.readouterr().err


def test_may_nghe_thieu_python_thi_loi_ro(tmp_path, monkeypatch):
    monkeypatch.setenv("AIVIDEO_STT_PYTHON", str(tmp_path / "khong-co"))
    with pytest.raises(RuntimeError, match="không có python"):
        phatam.listen([{"wav": "a", "prefix": "", "term": "x", "suffix": ""}])


# ---- Cổng 3 ----------------------------------------------------------------------------------

def test_lenh_co_dinh_cua_phat_am():
    assert gates.expected_command("phat-am", SLUG)[1:] == ["-m", "aivideo.phatam", "check", SLUG]
    assert "phat-am" in gates.RESERVED_STAGES


def test_gate3_doi_phat_am_khi_loi_co_tieng_anh(tmp_path, monkeypatch):
    eps, ep = make_episode(tmp_path, texts={"b001": "Máy đáp: false, tức là không."})
    checks = {c["name"]: c for c in gates.gate3(SLUG, eps, kenh_path=tmp_path / "k.json")["checks"]}
    assert checks["phat-am"]["ok"] is False
    monkeypatch.setattr(gates, "PHAT_AM_CMD", [sys.executable, "-c", "print(1)"])
    assert gates.ledger_run(ep, "phat-am")["verdict"] == "DAT"
    checks = {c["name"]: c for c in gates.gate3(SLUG, eps, kenh_path=tmp_path / "k.json")["checks"]}
    assert checks["phat-am"]["ok"] is True


def test_gate3_phat_am_chan_khi_check_truot(tmp_path, monkeypatch):
    eps, ep = make_episode(tmp_path, texts={"b001": "Máy đáp: false, tức là không."})
    monkeypatch.setattr(gates, "PHAT_AM_CMD", [sys.executable, "-c", "import sys; sys.exit(1)"])
    assert gates.ledger_run(ep, "phat-am")["verdict"] == "CHAN"
    checks = {c["name"]: c for c in gates.gate3(SLUG, eps, kenh_path=tmp_path / "k.json")["checks"]}
    assert checks["phat-am"]["ok"] is False


def test_gate3_khong_doi_phat_am_khi_loi_thuan_viet(tmp_path):
    eps, ep = make_episode(tmp_path)
    checks = {c["name"]: c for c in gates.gate3(SLUG, eps, kenh_path=tmp_path / "k.json")["checks"]}
    assert checks["phat-am"]["ok"] is True


# ---- máy nghe thật (chỉ trên Mac) --------------------------------------------------------------

@pytest.mark.real
def test_that_false_goc_dat_phon_xo_truot():
    res = phatam.pick("false", ["phôn-xơ", "phôn"], "Máy đáp: {}, tức là không.", "sai")
    by = {r["candidate"]: r for r in res["rows"]}
    assert by["false"]["pass"] is True
    assert by["phôn-xơ"]["pass"] is False and by["phôn"]["pass"] is False
