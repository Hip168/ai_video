"""Đề mục 17: đăng TikTok bằng cookie. Playwright được thay bằng đồ giả: không mạng, không trình duyệt."""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from pathlib import Path

import pytest

from aivideo import tiktok
from aivideo.gates import Ledger

SLUG = "tap-thu"
SECRET = "GIATRI_BI_MAT_9f3a7c"


def _root(tmp_path: Path, parts=(1, 2, 3)) -> Path:
    (tmp_path / "episodes" / SLUG).mkdir(parents=True)
    d = tmp_path / "out" / "episodes" / SLUG / "tiktok"
    d.mkdir(parents=True)
    items = []
    for k in parts:
        (d / f"phan-{k}.mp4").write_bytes(f"video {k}".encode())
        (d / f"phan-{k}.txt").write_text(f"Tiêu đề (Phần {k}/3)\n\nmóc {k}\n", encoding="utf-8")
        items.append({"part": k, "mp4": f"phan-{k}.mp4", "caption": f"phan-{k}.txt"})
    (d / "manifest.json").write_text(json.dumps({"slug": SLUG, "parts": items}), encoding="utf-8")
    return tmp_path


def _cookies(tmp_path: Path, mode=0o600) -> Path:
    p = tmp_path / "cookies.txt"
    p.write_text("# Netscape HTTP Cookie File\n"
                 f".tiktok.com\tTRUE\t/\tTRUE\t2000000000\tsessionid\t{SECRET}\n"
                 ".tiktok.com\tTRUE\t/\tFALSE\t0\ttt_csrf\tcsrf_khac_123\n"
                 ".eviltiktok.com\tTRUE\t/\tFALSE\t0\tsessionid\tkhac_mien\n"
                 ".google.com\tTRUE\t/\tFALSE\t0\tSID\tgoogle_val\n", encoding="utf-8")
    os.chmod(p, mode)
    return p


@pytest.fixture
def fake_browser(monkeypatch):
    calls = []

    @contextmanager
    def fake_open(cookies, headless=False):
        calls.append(("open", [c["name"] for c in cookies]))
        yield object()

    def fake_upload(page, video, caption, visibility, shots):
        calls.append(("upload", video.name, caption, visibility))
        if video.name in calls_fail:
            raise RuntimeError(f"nút Đăng không bấm được, cookie {SECRET}")

    calls_fail: set = set()
    monkeypatch.setattr(tiktok, "_open_browser", fake_open)
    monkeypatch.setattr(tiktok, "_upload", fake_upload)
    return calls, calls_fail


# ---------- manifest, dải phần ----------

def test_manifest_doc_theo_thu_tu(tmp_path):
    root = _root(tmp_path, parts=(2, 1))
    got = tiktok.load_manifest(root / "out" / "episodes" / SLUG / "tiktok", SLUG)
    assert [e["part"] for e in got] == [1, 2]
    assert got[0]["mp4"].name == "phan-1.mp4" and got[0]["caption"].name == "phan-1.txt"


@pytest.mark.parametrize("doc", [
    {"slug": "khac", "parts": []},
    {"slug": SLUG, "parts": [{"part": 1, "mp4": "../x.mp4", "caption": "phan-1.txt"}]},
    {"slug": SLUG, "parts": [{"part": "1", "mp4": "phan-1.mp4", "caption": "phan-1.txt"}]},
    {"slug": SLUG, "parts": [{"part": 1, "mp4": "phan-1.mp4", "caption": "phan-1.txt"}] * 2},
    {"slug": SLUG, "parts": []},
])
def test_manifest_sai_bi_tu_choi(tmp_path, doc):
    d = _root(tmp_path) / "out" / "episodes" / SLUG / "tiktok"
    (d / "manifest.json").write_text(json.dumps(doc), encoding="utf-8")
    with pytest.raises(tiktok.TikTokError):
        tiktok.load_manifest(d, SLUG)


def test_manifest_thieu_file(tmp_path):
    d = _root(tmp_path) / "out" / "episodes" / SLUG / "tiktok"
    (d / "phan-2.mp4").unlink()
    with pytest.raises(tiktok.TikTokError, match="phan-2.mp4"):
        tiktok.load_manifest(d, SLUG)


@pytest.mark.parametrize("s,want", [("1-3", (1, 3)), ("2", (2, 2)), ("2-2", (2, 2))])
def test_parse_parts(s, want):
    assert tiktok.parse_parts(s) == want


@pytest.mark.parametrize("s", ["0-1", "3-1", "a-b", ""])
def test_parse_parts_sai(s):
    with pytest.raises(tiktok.TikTokError):
        tiktok.parse_parts(s)


def test_dai_phan_vuot_manifest(tmp_path, fake_browser):
    root = _root(tmp_path, parts=(1, 2))
    with pytest.raises(tiktok.TikTokError, match="3"):
        tiktok.post(SLUG, root=root, parts="1-3", cookie_path=_cookies(tmp_path))
    assert fake_browser[0] == []


# ---------- đăng, sổ, chạy lại ----------

def test_dang_dung_thu_tu_va_ghi_so(tmp_path, fake_browser):
    calls, _ = fake_browser
    root = _root(tmp_path)
    r = tiktok.post(SLUG, root=root, parts="2-3", cookie_path=_cookies(tmp_path))
    assert r == [{"part": 2, "state": "posted"}, {"part": 3, "state": "posted"}]
    ups = [c for c in calls if c[0] == "upload"]
    assert [c[1] for c in ups] == ["phan-2.mp4", "phan-3.mp4"]
    assert ups[0][2] == "Tiêu đề (Phần 2/3)\n\nmóc 2" and ups[0][3] == "everyone"
    ents = Ledger(root / "episodes" / SLUG).entries()
    assert [e["stage"] for e in ents] == ["tiktok-2", "tiktok-3"]
    assert all(e["role"] == "publisher" and e["artifactHash"] for e in ents)


def test_chay_lai_bo_qua_phan_da_dang(tmp_path, fake_browser):
    calls, _ = fake_browser
    root = _root(tmp_path)
    ck = _cookies(tmp_path)
    tiktok.post(SLUG, root=root, parts="1", cookie_path=ck)
    calls.clear()
    r = tiktok.post(SLUG, root=root, cookie_path=ck)
    assert r == [{"part": 1, "state": "skipped"}, {"part": 2, "state": "posted"},
                 {"part": 3, "state": "posted"}]
    assert [c[1] for c in calls if c[0] == "upload"] == ["phan-2.mp4", "phan-3.mp4"]
    calls.clear()
    assert all(x["state"] == "skipped" for x in tiktok.post(SLUG, root=root, cookie_path=ck))
    assert calls == []  # không mở trình duyệt khi không còn gì để đăng
    assert len(Ledger(root / "episodes" / SLUG).entries()) == 3


def test_loi_dung_ngay_va_khong_ghi_so_phan_loi(tmp_path, fake_browser):
    calls, fail = fake_browser
    fail.add("phan-2.mp4")
    root = _root(tmp_path)
    with pytest.raises(tiktok.TikTokError, match="phần 2") as ei:
        tiktok.post(SLUG, root=root, cookie_path=_cookies(tmp_path))
    assert SECRET not in str(ei.value)
    assert [c[1] for c in calls if c[0] == "upload"] == ["phan-1.mp4", "phan-2.mp4"]
    assert [e["stage"] for e in Ledger(root / "episodes" / SLUG).entries()] == ["tiktok-1"]
    shots = str(ei.value).split("ảnh chụp: ")[1].rstrip(")")
    assert Path(shots).is_dir() and shots.startswith("/tmp/")
    Path(shots).rmdir()


def test_thanh_cong_xoa_thu_muc_anh(tmp_path, fake_browser, monkeypatch):
    made = []
    real = tiktok.tempfile.mkdtemp

    def spy(**kw):
        made.append(real(**kw))
        return made[-1]

    monkeypatch.setattr(tiktok.tempfile, "mkdtemp", spy)
    tiktok.post(SLUG, root=_root(tmp_path), cookie_path=_cookies(tmp_path))
    assert made and made[0].startswith("/tmp/") and not Path(made[0]).exists()


def test_dry_run_khong_mo_trinh_duyet_khong_ghi_so(tmp_path, fake_browser):
    calls, _ = fake_browser
    root = _root(tmp_path)
    r = tiktok.post(SLUG, root=root, dry_run=True, visibility="only_you",
                    cookie_path=tmp_path / "khong-co.txt")
    assert [x["state"] for x in r] == ["planned"] * 3
    assert r[0]["caption"] == "Tiêu đề (Phần 1/3)" and r[0]["visibility"] == "only_you"
    assert calls == []
    assert not (root / "episodes" / SLUG / "ledger.json").exists()


def test_cli_dry_run(tmp_path, fake_browser, capsys):
    root = _root(tmp_path)
    assert tiktok.main(["post", SLUG, "--root", str(root), "--parts", "1-2", "--dry-run"]) == 0
    out = json.loads(capsys.readouterr().out)
    assert [x["part"] for x in out] == [1, 2]


# ---------- cookie ----------

def test_cookie_quyen_khac_600_bi_tu_choi(tmp_path, fake_browser):
    ck = _cookies(tmp_path, mode=0o644)
    with pytest.raises(tiktok.TikTokError, match="chmod 600"):
        tiktok.post(SLUG, root=_root(tmp_path), cookie_path=ck)
    assert fake_browser[0] == []


def test_cookie_thieu_file(tmp_path):
    with pytest.raises(tiktok.TikTokError, match="chmod 600"):
        tiktok.check_cookie_file(tmp_path / "khong-co.txt")


def test_chi_nap_cookie_tiktok(tmp_path):
    got = tiktok.load_cookies(_cookies(tmp_path))
    assert sorted((c["domain"], c["name"]) for c in got) == [
        (".tiktok.com", "sessionid"), (".tiktok.com", "tt_csrf")]


def test_cookie_thieu_sessionid(tmp_path):
    p = tmp_path / "cookies.txt"
    p.write_text("# Netscape HTTP Cookie File\n.tiktok.com\tTRUE\t/\tFALSE\t0\ttt_csrf\tx\n",
                 encoding="utf-8")
    os.chmod(p, 0o600)
    with pytest.raises(tiktok.TikTokError, match="sessionid"):
        tiktok.load_cookies(p)


def test_cookie_hong_khong_lo_noi_dung(tmp_path):
    p = tmp_path / "cookies.txt"
    p.write_text(f"# Netscape HTTP Cookie File\ndong hong {SECRET}\n", encoding="utf-8")
    os.chmod(p, 0o600)
    with pytest.raises(tiktok.TikTokError) as ei:
        tiktok.load_cookies(p)
    assert SECRET not in str(ei.value)


def test_cli_loi_khong_in_gia_tri_cookie(tmp_path, fake_browser, monkeypatch, capsys):
    calls, fail = fake_browser
    fail.add("phan-1.mp4")
    ck = _cookies(tmp_path)
    monkeypatch.setattr(tiktok, "COOKIE_PATH", ck)
    root = _root(tmp_path)
    assert tiktok.main(["post", SLUG, "--root", str(root)]) == 1
    cap = capsys.readouterr()
    assert SECRET not in cap.out + cap.err and "csrf_khac_123" not in cap.out + cap.err
    assert "phần 1" in cap.err
    for c in calls:
        assert SECRET not in repr(c)
    shots = cap.err.split("ảnh chụp: ")[1].split(")")[0]
    Path(shots).rmdir()


def test_check_bao_ten_hoac_het_han(tmp_path, monkeypatch, capsys):
    ck = _cookies(tmp_path)
    monkeypatch.setattr(tiktok, "COOKIE_PATH", ck)

    class Page:
        url = ""

        def goto(self, url, **kw):
            pass

        def wait_for_timeout(self, ms):
            pass

    page = Page()

    @contextmanager
    def fake_open(cookies, headless=False):
        yield page

    monkeypatch.setattr(tiktok, "_open_browser", fake_open)
    page.url = "https://www.tiktok.com/@chuyen.bit?lang=vi"
    assert tiktok.main(["check"]) == 0
    assert capsys.readouterr().out.strip() == "đăng nhập: @chuyen.bit"
    page.url = "https://www.tiktok.com/login?redirect_url=x"
    assert tiktok.main(["check"]) == 1
    out = capsys.readouterr().out
    assert out.strip() == "cookie hết hạn" and SECRET not in out


def test_profile_dry_run(tmp_path, fake_browser, capsys):
    png = tmp_path / "a.png"
    png.write_bytes(b"\x89PNG")
    assert tiktok.main(["profile", "--name", "Chuyện Của Những Con Bit", "--avatar", str(png),
                        "--dry-run"]) == 0
    steps = json.loads(capsys.readouterr().out)["steps"]
    assert any("Chuyện Của Những Con Bit" in s for s in steps)
    assert fake_browser[0] == []
