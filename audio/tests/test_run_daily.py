"""Đề mục 13 [13-2]: scripts/run-daily.sh với claude, cổng, upload, thông báo giả.

Script thật được chép vào một gốc repo tạm (có git riêng) để mọi thao tác ghi
của script nằm gọn trong thư mục tạm. Không gọi mạng, không gọi claude thật.
"""

from __future__ import annotations

import json
import os
import plistlib
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

from gates_support import ROOT

SCRIPT = ROOT / "scripts" / "run-daily.sh"
PLIST = ROOT / "scripts" / "com.aivideo.daily.plist.example"
SLUG = "tap-thu-nghiem"

pytestmark = pytest.mark.skipif(
    shutil.which("zsh") is None, reason="run-daily.sh chạy bằng zsh"
)


def _fake(path: Path, name: str, body: str = "") -> Path:
    """Lệnh giả: ghi tên, số đối số, cwd và từng đối số; rồi chạy `body`."""
    path.write_text(
        "#!/bin/sh\n"
        f'echo {name} >> "$FAKE_DIR/calls.txt"\n'
        f'echo $# > "$FAKE_DIR/{name}.argc"\n'
        f'pwd -P > "$FAKE_DIR/{name}.cwd"\n'
        f'printf "%s\\n" "$@" > "$FAKE_DIR/{name}.args"\n'
        f'cat >/dev/null 2>&1 </dev/null\n'
        f"{body}\n",
        encoding="utf-8",
    )
    path.chmod(0o755)
    return path


class Rig:
    def __init__(self, tmp_path: Path, repo: str = "repo"):
        self.root = tmp_path / repo
        self.fake = tmp_path / "fake"
        self.logs = tmp_path / "logs"
        (self.root / "scripts").mkdir(parents=True)
        self.fake.mkdir()
        shutil.copy(SCRIPT, self.root / "scripts" / "run-daily.sh")
        (self.root / "scripts" / "run-daily.sh").chmod(0o755)
        venv_bin = self.root / "audio" / ".venv" / "bin"
        venv_bin.mkdir(parents=True)
        py = venv_bin / "python"
        py.write_text(f'#!/bin/sh\nexec "{sys.executable}" "$@"\n')
        py.chmod(0o755)
        env = {
            **os.environ,
            "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.org",
            "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.org",
        }
        for cmd in (["init", "-q", "-b", "main"], ):
            subprocess.run(["git", "-C", str(self.root), *cmd], check=True,
                           env=env, capture_output=True)
        # Khung dựng thử (script, venv giả) không tính là thay đổi của repo.
        (self.root / ".git" / "info" / "exclude").write_text(
            "/scripts/\n/audio/\n", encoding="utf-8")
        (self.root / "khac.txt").write_text("v1\n")
        for cmd in (["add", "khac.txt"], ["commit", "-q", "-m", "đầu"]):
            subprocess.run(["git", "-C", str(self.root), *cmd], check=True,
                           env=env, capture_output=True)
        self.git = self.fake / "git"
        self.git.write_text(
            "#!/bin/sh\n"
            'printf "%s\\n" "$*" >> "$FAKE_DIR/git.log"\n'
            'if [ "$1" = commit ] && [ -f "$FAKE_DIR/git.failcommit" ]; then\n'
            "  exit 1\nfi\n"
            'if [ -f "$FAKE_DIR/git.fail.$1" ]; then exit 1; fi\n'
            'exec git "$@"\n')
        self.git.chmod(0o755)
        self.pushcmd = _fake(self.fake / "pushcmd", "pushcmd",
                             'exit $(cat "$FAKE_DIR/pushcmd.code")')
        (self.fake / "pushcmd.code").write_text("0")
        self.claude = _fake(
            self.fake / "claude", "claude",
            'if [ -f "$FAKE_DIR/claude.wait" ]; then touch "$FAKE_DIR/started";'
            ' i=0; while [ -f "$FAKE_DIR/claude.wait" ] && [ $i -lt 300 ];'
            ' do sleep 0.1; i=$((i+1)); done; fi\n'
            'cat "$FAKE_DIR/claude.out"\n'
            'exit $(cat "$FAKE_DIR/claude.code")',
        )
        self.gates = _fake(self.fake / "gates", "gates",
                           'echo MARK-GATES-OUT\nexit $(cat "$FAKE_DIR/gates.code")')
        self.upload = _fake(self.fake / "upload", "upload",
                            'echo MARK-UPLOAD-OUT\nexit $(cat "$FAKE_DIR/upload.code")')
        self.notify = _fake(self.fake / "notify", "notify",
                            'printf "%s\\n" "$1" >> "$FAKE_DIR/notify.txt"')
        self.set_claude(result=f"Xong.\nSLUG: {SLUG}")
        (self.fake / "gates.code").write_text("0")
        (self.fake / "upload.code").write_text("0")
        self.env = {
            **env,
            "FAKE_DIR": str(self.fake),
            "AIVIDEO_CAFFEINATED": "1",
            "AIVIDEO_CLAUDE": str(self.claude),
            "AIVIDEO_GATES": str(self.gates),
            "AIVIDEO_UPLOAD": str(self.upload),
            "AIVIDEO_NOTIFY": str(self.notify),
            "AIVIDEO_GIT": str(self.git),
            "AIVIDEO_PUSH": str(self.pushcmd),
            "FAKE_ROOT": str(self.root),
            "FAKE_SLUG": SLUG,
            "AIVIDEO_LOG_DIR": str(self.logs),
        }

    def set_claude(self, *, result=None, raw=None, code=0, is_error=False):
        out = raw if raw is not None else json.dumps(
            {"type": "result", "is_error": is_error, "result": result},
            ensure_ascii=False)
        (self.fake / "claude.out").write_text(out, encoding="utf-8")
        (self.fake / "claude.code").write_text(str(code))

    def run(self, **kw):
        return subprocess.run(
            [str(self.root / "scripts" / "run-daily.sh")], env=self.env,
            capture_output=True, text=True, timeout=60, **kw)

    def popen(self):
        return subprocess.Popen(
            [str(self.root / "scripts" / "run-daily.sh")], env=self.env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    @property
    def calls(self):
        p = self.fake / "calls.txt"
        return [c for c in p.read_text().split() if c != "notify"] if p.exists() else []

    @property
    def notices(self):
        p = self.fake / "notify.txt"
        return p.read_text().splitlines() if p.exists() else []

    def args(self, name):
        return (self.fake / f"{name}.args").read_text(
            encoding="utf-8").splitlines()

    def cwd(self, name):
        return Path((self.fake / f"{name}.cwd").read_text().strip())

    def commits(self):
        out = subprocess.run(
            ["git", "-C", str(self.root), "log", "--format=%s"],
            capture_output=True, text=True, check=True, env=self.env).stdout
        return out.splitlines()

    def git_lines(self):
        p = self.fake / "git.log"
        return p.read_text(encoding="utf-8").splitlines() if p.exists() else []

    def dirty(self, *paths):
        return subprocess.run(
            ["git", "-C", str(self.root), "status", "--porcelain", "--",
             *paths],
            capture_output=True, text=True, check=True, env=self.env).stdout

    @property
    def log(self):
        files = sorted(self.logs.glob("*.log"))
        return "\n".join(f.read_text(encoding="utf-8") for f in files)


@pytest.fixture
def rig(tmp_path):
    return Rig(tmp_path)


def _da_dung(rig, res):
    assert res.returncode == 1, res.stderr
    assert "DỪNG, không đăng" in rig.log
    assert len(rig.notices) == 1
    assert "upload" not in rig.calls
    assert "pushcmd" not in rig.calls


# --- chạy thành công -----------------------------------------------------


def test_chay_tron_ma_0_goi_claude_roi_cong_roi_upload(rig):
    res = rig.run()
    assert res.returncode == 0, res.stderr
    assert rig.calls == ["claude", "gates", "upload", "pushcmd"]
    assert f"XONG: đã đăng {SLUG}" in rig.log
    assert rig.notices == []


def test_result_chi_mot_dong_slug_van_chay_tron(rig):
    rig.set_claude(result=f"SLUG: {SLUG}")
    res = rig.run()
    assert res.returncode == 0, rig.log
    assert rig.calls == ["claude", "gates", "upload", "pushcmd"]
    assert rig.args("upload") == [SLUG]


def test_goi_claude_voi_dung_co_va_prompt_theo_playbook(rig):
    rig.run()
    a = rig.args("claude")
    assert a[0] == "-p"
    prompt = a[1]
    for tok in ("PLAYBOOK.md", "queue.json", "CAN_NGUOI_DUNG", "SLUG:"):
        assert tok in prompt
    rest = a[2:]
    assert rest == [
        "--permission-mode", "dontAsk", "--permission-prompts", "none",
        "--output-format", "json",
    ]


def test_claude_chay_trong_goc_repo(rig):
    rig.run()
    assert rig.cwd("claude") == rig.root.resolve()


def test_cong_3_duoc_goi_voi_slug_va_duong_dan_mp4_trong_audio(rig):
    rig.run()
    assert rig.args("gates") == [
        "gate3", SLUG, "--video",
        str(rig.root / "out" / "episodes" / SLUG / f"{SLUG}.mp4"),
    ]
    assert rig.cwd("gates") == (rig.root / "audio").resolve()


def test_upload_duoc_goi_dung_mot_doi_so_slug_trong_audio(rig):
    rig.run()
    assert rig.args("upload") == [SLUG]
    assert rig.cwd("upload") == (rig.root / "audio").resolve()


def test_log_co_dong_gio_va_dau_ra_cua_cong_va_upload(rig):
    rig.run()
    files = list(rig.logs.glob("*.log"))
    assert len(files) == 1
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}\.log", files[0].name)
    text = files[0].read_text(encoding="utf-8")
    assert re.search(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ", text, re.M)
    assert "MARK-GATES-OUT" in text
    assert "MARK-UPLOAD-OUT" in text


def test_json_cua_claude_duoc_giu_trong_thu_muc_log(rig):
    rig.run()
    files = list(rig.logs.glob("*-claude.json"))
    assert len(files) == 1
    assert json.loads(files[0].read_text(encoding="utf-8"))["result"].endswith(
        f"SLUG: {SLUG}")


def test_hai_luot_noi_tiep_deu_chay_duoc_khoa_tu_nha(rig):
    assert rig.run().returncode == 0
    assert rig.run().returncode == 0
    assert rig.calls.count("upload") == 2


# --- dừng, không đăng ----------------------------------------------------


def test_claude_thoat_ma_khac_0_thi_dung_khong_goi_cong_hay_upload(rig):
    rig.set_claude(result=f"SLUG: {SLUG}", code=3)
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]
    assert "mã 3" in rig.log


def test_stdout_claude_khong_phai_json_thi_dung(rig):
    rig.set_claude(raw="đây không phải json")
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


def test_claude_bao_is_error_thi_dung_du_co_dong_slug(rig):
    rig.set_claude(result=f"Xong.\nSLUG: {SLUG}", is_error=True)
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


def test_can_nguoi_dung_thi_dung_du_dong_cuoi_la_slug(rig):
    rig.set_claude(result=f"CAN_NGUOI_DUNG: cần chọn nhạc\nSLUG: {SLUG}")
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


def test_can_nguoi_dung_giua_cau_cung_dung(rig):
    rig.set_claude(result=f"Việc ... CAN_NGUOI_DUNG ở giữa câu.\nSLUG: {SLUG}")
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


@pytest.mark.parametrize("result", [
    "Xong rồi, không có dòng slug",
    "",
    "SLUG: Tap Sai",
    "SLUG: tap_thu",
    "SLUG: -tap",
    "SLUG: tap-",
    "SLUG: tap--thu",
    "SLUG: tap-thu extra",
    "  SLUG: tap-thu",
    "SLUG: tap-thu\nXong rồi.",
    "slug: tap-thu",
])
def test_dong_cuoi_khong_khop_slug_thi_dung(rig, result):
    rig.set_claude(result=result)
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


def test_result_null_thi_dung(rig):
    rig.set_claude(raw=json.dumps({"is_error": False, "result": None}))
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude"]


def test_cong_3_khong_dat_thi_khong_upload_va_thong_bao(rig):
    (rig.fake / "gates.code").write_text("1")
    res = rig.run()
    _da_dung(rig, res)
    assert rig.calls == ["claude", "gates"]


def test_upload_thoat_khac_0_thi_dung_va_thong_bao(rig):
    (rig.fake / "upload.code").write_text("1")
    res = rig.run()
    assert res.returncode == 1
    assert rig.calls == ["claude", "gates", "upload"]
    assert "DỪNG, không đăng" in rig.log
    assert len(rig.notices) == 1
    assert "XONG" not in rig.log


def test_upload_ma_3_thi_dung_voi_loi_can_nguoi_dung_va_khong_day(rig):
    (rig.fake / "upload.code").write_text("3")
    res = rig.run()
    assert res.returncode == 1
    assert "DỪNG, không đăng" in rig.log
    assert "CAN_NGUOI_DUNG" in rig.log
    assert len(rig.notices) == 1
    assert "CAN_NGUOI_DUNG" in rig.notices[0]
    assert "pushcmd" not in rig.calls
    assert "XONG" not in rig.log


def test_thong_bao_nhan_dung_mot_tham_so_la_cau_bao(rig):
    rig.set_claude(result="CAN_NGUOI_DUNG: x")
    rig.run()
    assert (rig.fake / "notify.argc").read_text().strip() == "1"
    assert rig.notices[0].strip() != ""


# --- chạy chồng ----------------------------------------------------------


def test_chay_chong_luot_sau_thoat_ngay_khong_goi_claude(rig):
    (rig.fake / "claude.wait").write_text("")
    first = rig.popen()
    try:
        for _ in range(100):
            if (rig.fake / "started").exists():
                break
            time.sleep(0.1)
        assert (rig.fake / "started").exists(), "lượt đầu chưa chạy tới claude"
        second = rig.run()
        assert second.returncode == 1
        assert rig.calls == ["claude"]
        assert "lượt khác đang chạy, thoát" in rig.log
        assert rig.notices == []
    finally:
        (rig.fake / "claude.wait").unlink(missing_ok=True)
        out, err = first.communicate(timeout=60)
    assert first.returncode == 0, err
    assert rig.calls == ["claude", "gates", "upload", "pushcmd"]


# --- mẫu LaunchAgent -----------------------------------------------------


def _plist():
    return plistlib.loads(PLIST.read_bytes())


def test_plist_mau_co_label_va_goi_run_daily():
    d = _plist()
    assert d["Label"] == "com.aivideo.daily"
    assert d["ProgramArguments"][-1].endswith("scripts/run-daily.sh") or any(
        a.endswith("scripts/run-daily.sh") for a in d["ProgramArguments"])


def test_plist_mau_hen_gio_bang_start_calendar_interval():
    sci = _plist()["StartCalendarInterval"]
    entries = sci if isinstance(sci, list) else [sci]
    assert entries
    for e in entries:
        assert isinstance(e["Hour"], int) and 0 <= e["Hour"] <= 23
        assert isinstance(e["Minute"], int) and 0 <= e["Minute"] <= 59


def test_plist_mau_khong_chua_bi_mat():
    text = PLIST.read_text(encoding="utf-8").lower()
    for bad in ("client_secret", "access_token", "refresh_token", "sk-ant"):
        assert bad not in text


def test_run_daily_la_file_thuc_thi_dung_zsh():
    assert os.access(SCRIPT, os.X_OK)
    assert SCRIPT.read_text(encoding="utf-8").splitlines()[0] == "#!/bin/zsh"


# --- commit và đẩy lên remote (D25) --------------------------------------


def _viet_tap(rig, name="script.json"):
    d = rig.root / "episodes" / SLUG
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text("{}\n", encoding="utf-8")


def _gates_ghi_trang_thai(rig):
    """Cổng giả ghi lại trạng thái git của thư mục tập lúc nó được gọi."""
    _fake(rig.gates, "gates",
          'git -C "$FAKE_ROOT" status --porcelain -- "episodes/$FAKE_SLUG"'
          ' > "$FAKE_DIR/gates.status"\n'
          'git -C "$FAKE_ROOT" log --format=%s > "$FAKE_DIR/gates.commits"\n'
          'exit 0')


def test_tap_chua_commit_duoc_commit_truoc_khi_chay_cong_3(rig):
    _viet_tap(rig)
    _gates_ghi_trang_thai(rig)
    assert rig.run().returncode == 0
    assert (rig.fake / "gates.status").read_text() == ""
    assert f"[tap] {SLUG}: nội dung tập trước Cổng 3" in (
        rig.fake / "gates.commits").read_text()


def test_chi_commit_thu_muc_tap_tap_khac_dang_sua_khong_bi_dung(rig):
    _viet_tap(rig)
    khac = rig.root / "episodes" / "tap-khac"
    khac.mkdir()
    (khac / "ghi-chu.txt").write_text("chưa theo dõi\n")
    assert rig.run().returncode == 0
    assert rig.dirty(f"episodes/{SLUG}") == ""
    assert "?? episodes/tap-khac/" in rig.dirty("episodes")
    shown = subprocess.run(
        ["git", "-C", str(rig.root), "show", "--name-only", "--format=",
         "HEAD"], capture_output=True, text=True, check=True).stdout.split()
    assert shown
    assert all(f.startswith(f"episodes/{SLUG}/") for f in shown)


def test_tap_khong_co_thay_doi_thi_khong_tao_commit(rig):
    before = rig.commits()
    assert rig.run().returncode == 0
    assert rig.commits() == before
    assert not any(ln.startswith("commit") for ln in rig.git_lines())


def test_lenh_git_dung_doi_so_theo_giao_dien(rig):
    _viet_tap(rig)
    rig.run()
    lines = rig.git_lines()
    assert f"status --porcelain -- episodes/{SLUG}" in lines
    assert f"add -- episodes/{SLUG}" in lines
    msg = f"[tap] {SLUG}: nội dung tập trước Cổng 3"
    assert f"commit -q -m {msg} -- episodes/{SLUG}" in lines


def _viet_du_ba_nhom(rig):
    _viet_tap(rig)
    v = rig.root / "video" / "src" / "episodes" / SLUG
    v.mkdir(parents=True)
    (v / "data.ts").write_text("export {}\n", encoding="utf-8")
    (rig.root / "episodes" / "index.json").write_text("[]\n")


GROUPS = [f"episodes/{SLUG}", f"video/src/episodes/{SLUG}",
          "episodes/index.json"]


def test_commit_du_ba_nhom_duong_dan_dung_thu_tu(rig):
    _viet_du_ba_nhom(rig)
    assert rig.run().returncode == 0
    lines = rig.git_lines()
    for g in GROUPS:
        assert f"status --porcelain -- {g}" in lines
    st = [lines.index(f"status --porcelain -- {g}") for g in GROUPS]
    assert st == sorted(st)
    assert f"add -- {' '.join(GROUPS)}" in lines
    msg = f"[tap] {SLUG}: nội dung tập trước Cổng 3"
    assert f"commit -q -m {msg} -- {' '.join(GROUPS)}" in lines
    assert rig.dirty(*GROUPS) == ""
    shown = set(subprocess.run(
        ["git", "-C", str(rig.root), "show", "--name-only", "--format=",
         "HEAD"], capture_output=True, text=True, check=True).stdout.split())
    assert shown == {f"episodes/{SLUG}/script.json",
                     f"video/src/episodes/{SLUG}/data.ts",
                     "episodes/index.json"}
    assert rig.commits()[0] == f"[tap] {SLUG}: nội dung tập trước Cổng 3"


def test_chi_nhom_co_thay_doi_moi_duoc_add_va_commit(rig):
    (rig.root / "episodes").mkdir()
    (rig.root / "episodes" / "index.json").write_text("[]\n")
    assert rig.run().returncode == 0
    lines = rig.git_lines()
    assert "add -- episodes/index.json" in lines
    msg = f"[tap] {SLUG}: nội dung tập trước Cổng 3"
    assert f"commit -q -m {msg} -- episodes/index.json" in lines
    assert not any(f"add -- {GROUPS[0]}" in ln for ln in lines)
    # cả ba nhóm đều được hỏi trạng thái dù chỉ một nhóm có thay đổi
    for g in GROUPS:
        assert f"status --porcelain -- {g}" in lines


def test_nhom_video_src_episodes_cung_duoc_commit_khi_chi_no_thay_doi(rig):
    v = rig.root / "video" / "src" / "episodes" / SLUG
    v.mkdir(parents=True)
    (v / "data.ts").write_text("export {}\n", encoding="utf-8")
    assert rig.run().returncode == 0
    assert rig.dirty("video/src/episodes") == ""
    assert f"add -- video/src/episodes/{SLUG}" in rig.git_lines()


def test_sau_khi_dang_cung_commit_dung_ba_nhom(rig):
    _viet_du_ba_nhom(rig)
    _fake(rig.upload, "upload",
          'echo ghi > "$FAKE_ROOT/episodes/$FAKE_SLUG/ledger.json"\n'
          'echo ghi > "$FAKE_ROOT/video/src/episodes/$FAKE_SLUG/x.ts"\n'
          'echo "[1]" > "$FAKE_ROOT/episodes/index.json"\nexit 0')
    assert rig.run().returncode == 0
    msg = f"[tap] {SLUG}: sổ tập sau khi đăng"
    assert f"commit -q -m {msg} -- {' '.join(GROUPS)}" in rig.git_lines()
    assert rig.dirty(*GROUPS) == ""


def test_so_tap_do_upload_ghi_duoc_commit_lai_sau_khi_dang(rig):
    _viet_tap(rig)
    _fake(rig.upload, "upload",
          'echo ghi > "$FAKE_ROOT/episodes/$FAKE_SLUG/ledger.json"\nexit 0')
    assert rig.run().returncode == 0
    assert rig.dirty("episodes") == ""
    assert rig.commits()[0] == f"[tap] {SLUG}: sổ tập sau khi đăng"
    assert f"[tap] {SLUG}: nội dung tập trước Cổng 3" in rig.commits()


def test_upload_loi_van_commit_so_truoc_khi_dung(rig):
    _viet_tap(rig)
    _fake(rig.upload, "upload",
          'echo ghi > "$FAKE_ROOT/episodes/$FAKE_SLUG/ledger.json"\nexit 1')
    res = rig.run()
    assert res.returncode == 1
    assert rig.dirty("episodes") == ""
    assert rig.commits()[0] == f"[tap] {SLUG}: sổ tập sau khi đăng"
    assert "pushcmd" not in rig.calls
    assert len(rig.notices) == 1


def test_commit_truoc_cong_loi_thi_dung_khong_goi_cong_hay_upload(rig):
    _viet_tap(rig)
    (rig.fake / "git.failcommit").write_text("")
    res = rig.run()
    assert res.returncode == 1
    assert "DỪNG, không đăng" in rig.log
    assert len(rig.notices) == 1
    assert rig.calls == ["claude"]


def test_dang_xong_thi_chay_lenh_day_mot_lan_khong_them_doi_so(rig):
    assert rig.run().returncode == 0
    assert rig.calls == ["claude", "gates", "upload", "pushcmd"]
    assert (rig.fake / "pushcmd.argc").read_text().strip() == "0"
    assert rig.cwd("pushcmd") == rig.root.resolve()


def test_lenh_day_loi_chi_ghi_log_ma_thoat_van_0_khong_thong_bao(rig):
    (rig.fake / "pushcmd.code").write_text("1")
    res = rig.run()
    assert res.returncode == 0
    assert "push lỗi (video đã đăng)" in rig.log
    assert f"XONG: đã đăng {SLUG}" in rig.log
    assert rig.notices == []


def test_cong_khong_dat_thi_khong_chay_lenh_day(rig):
    (rig.fake / "gates.code").write_text("1")
    rig.run()
    assert "pushcmd" not in rig.calls


def test_claude_loi_thi_khong_commit_khong_day(rig):
    _viet_tap(rig)
    rig.set_claude(result="x", code=2)
    before = rig.commits()
    rig.run()
    assert rig.commits() == before
    assert "pushcmd" not in rig.calls
    # chỉ có hai lệnh kiểm đầu lượt; không add, commit
    assert not any(ln.split()[0] in ("add", "commit")
                   for ln in rig.git_lines())


# --- mẫu LaunchAgent: PATH (D25) -----------------------------------------


def test_plist_mau_dat_path_co_claude_uv_node_viet_tuyet_doi():
    env = _plist()["EnvironmentVariables"]
    parts = env["PATH"].split(":")
    assert parts and all(p.startswith("/") for p in parts)
    assert "/opt/homebrew/bin" in parts
    assert any(p.endswith("/.local/bin") for p in parts)


def test_plist_mau_oauth_token_chi_la_chu_giu_cho():
    tok = _plist()["EnvironmentVariables"]["CLAUDE_CODE_OAUTH_TOKEN"]
    assert isinstance(tok, str) and tok.strip()
    assert not tok.startswith("sk-")


# --- kiểm đầu lượt: chỉ chạy trên main, cây sạch (D25) -------------------


def _git(rig, *args):
    return subprocess.run(
        ["git", "-C", str(rig.root), *args], capture_output=True, text=True,
        check=True, env=rig.env).stdout


def _dung_som(rig, res, *needles):
    """Dừng ở kiểm đầu lượt: mã 1, thông báo, chưa gọi claude hay lệnh nào."""
    assert res.returncode == 1, rig.log
    assert "DỪNG, không đăng: CAN_NGUOI_DUNG" in rig.log
    assert len(rig.notices) == 1
    assert "CAN_NGUOI_DUNG" in rig.notices[0]
    assert rig.calls == []
    assert not any(ln.split()[0] in ("add", "commit")
                   for ln in rig.git_lines())
    for n in needles:
        assert n in rig.log


def test_dang_o_main_va_cay_sach_thi_chay_binh_thuong(rig):
    assert _git(rig, "rev-parse", "--abbrev-ref", "HEAD").strip() == "main"
    assert rig.run().returncode == 0
    assert rig.calls[0] == "claude"


def test_hoi_nhanh_va_trang_thai_cay_voi_dung_doi_so(rig):
    rig.run()
    lines = rig.git_lines()
    assert lines[0] == "rev-parse --abbrev-ref HEAD"
    assert lines[1] == (
        "status --porcelain -- . :(exclude)episodes "
        ":(exclude)video/src/episodes")


def test_khong_o_main_thi_dung_truoc_khi_goi_claude(rig):
    _git(rig, "checkout", "-q", "-b", "tinh-nang")
    res = rig.run()
    _dung_som(rig, res, "tinh-nang")
    assert "không phải main" in rig.log
    assert "tinh-nang" in rig.notices[0] or "main" in rig.notices[0]


def test_dau_tach_roi_khoi_nhanh_thi_dung(rig):
    _git(rig, "checkout", "-q", "--detach")
    res = rig.run()
    _dung_som(rig, res)


def test_nhanh_ten_giong_main_thi_dung(rig):
    _git(rig, "checkout", "-q", "-b", "main2")
    res = rig.run()
    _dung_som(rig, res, "main2")


def test_khong_doc_duoc_nhanh_thi_dung_voi_loi_rieng(rig):
    (rig.fake / "git.fail.rev-parse").write_text("")
    res = rig.run()
    _dung_som(rig, res, "không đọc được nhánh git")


def test_file_da_theo_doi_bi_sua_ngoai_episodes_thi_dung_va_ghi_danh_sach(
        rig):
    (rig.root / "khac.txt").write_text("v2 đang sửa dở\n")
    res = rig.run()
    _dung_som(rig, res, "cây làm việc có thay đổi chưa commit ngoài episodes/",
              "khac.txt")


def test_file_chua_theo_doi_ngoai_episodes_cung_chan(rig):
    (rig.root / "moi.txt").write_text("chưa theo dõi\n")
    res = rig.run()
    _dung_som(rig, res, "moi.txt")


def test_thay_doi_trong_thu_muc_con_ngoai_episodes_cung_chan(rig):
    d = rig.root / "video" / "src" / "khac"
    d.mkdir(parents=True)
    (d / "a.ts").write_text("x\n")
    res = rig.run()
    _dung_som(rig, res, "?? video/")


def test_thay_doi_duoi_episodes_va_video_src_episodes_khong_chan(rig):
    (rig.root / "episodes" / "tap-khac").mkdir(parents=True)
    (rig.root / "episodes" / "tap-khac" / "a.json").write_text("{}\n")
    d = rig.root / "video" / "src" / "episodes" / "tap-khac"
    d.mkdir(parents=True)
    (d / "b.ts").write_text("x\n")
    res = rig.run()
    assert res.returncode == 0, rig.log
    assert rig.calls == ["claude", "gates", "upload", "pushcmd"]


def test_khong_doc_duoc_trang_thai_cay_thi_dung(rig):
    (rig.fake / "git.fail.status").write_text("")
    res = rig.run()
    _dung_som(rig, res)


def test_dung_o_kiem_dau_luot_thi_khong_dong_vao_file_log_claude(rig):
    _git(rig, "checkout", "-q", "-b", "tinh-nang")
    rig.run()
    assert list(rig.logs.glob("*-claude.json")) == []


# --- tự chạy lại dưới caffeinate (khi AIVIDEO_CAFFEINATED rỗng) ---------


def _caffeinate_rig(rig):
    """Thư mục PATH riêng chứa `caffeinate` giả: ghi đối số và biến, rồi chạy
    đúng lệnh đi sau (như caffeinate thật)."""
    binp = rig.fake.parent / "bin"
    binp.mkdir()
    cf = binp / "caffeinate"
    cf.write_text(
        "#!/bin/sh\n"
        'echo caffeinate >> "$FAKE_DIR/calls.txt"\n'
        'printf "%s\\n" "$@" > "$FAKE_DIR/caffeinate.args"\n'
        'printf "%s" "${AIVIDEO_CAFFEINATED-unset}" '
        '> "$FAKE_DIR/caffeinate.env"\n'
        'shift 2\n'  # bỏ cờ `-i -s` như caffeinate thật
        'exec "$@"\n', encoding="utf-8")
    cf.chmod(0o755)
    rig.env.pop("AIVIDEO_CAFFEINATED", None)
    rig.env["PATH"] = f"{binp}:{os.environ['PATH']}"
    return cf


def test_khong_dat_aivideo_caffeinated_thi_tu_chay_lai_duoi_caffeinate(rig):
    _caffeinate_rig(rig)
    res = rig.run()
    assert res.returncode == 0, rig.log
    a = rig.args("caffeinate")
    assert a[:2] == ["-i", "-s"]
    assert len(a) == 3
    assert Path(a[2]).resolve() == (
        rig.root / "scripts" / "run-daily.sh").resolve()


def test_caffeinate_goi_dung_mot_lan_va_luot_chay_that_chi_mot_lan(rig):
    _caffeinate_rig(rig)
    assert rig.run().returncode == 0
    allcalls = (rig.fake / "calls.txt").read_text().split()
    assert allcalls.count("caffeinate") == 1
    assert allcalls.count("claude") == 1
    assert [c for c in allcalls if c != "notify"] == [
        "caffeinate", "claude", "gates", "upload", "pushcmd"]


def test_script_dat_aivideo_caffeinated_truoc_khi_exec_caffeinate(rig):
    _caffeinate_rig(rig)
    rig.run()
    assert (rig.fake / "caffeinate.env").read_text() not in ("", "unset")


def test_da_dat_aivideo_caffeinated_thi_khong_goi_caffeinate(rig):
    _caffeinate_rig(rig)
    rig.env["AIVIDEO_CAFFEINATED"] = "1"
    assert rig.run().returncode == 0
    assert not (rig.fake / "caffeinate.args").exists()
    assert "caffeinate" not in (rig.fake / "calls.txt").read_text().split()


def test_duoi_caffeinate_van_dung_khi_khong_o_main(rig):
    _caffeinate_rig(rig)
    _git(rig, "checkout", "-q", "-b", "tinh-nang")
    res = rig.run()
    assert res.returncode == 1
    assert rig.calls == ["caffeinate"]
    assert "không phải main" in rig.log


# --- mẫu LaunchAgent: log và ghi chú (D25 bổ sung) -----------------------


def test_plist_mau_ghi_log_launchd_ve_library_logs_aivideo():
    d = _plist()
    assert d["StandardOutPath"] == (
        "/Users/TEN_MAY/Library/Logs/aivideo/launchd.out.log")
    assert d["StandardErrorPath"] == (
        "/Users/TEN_MAY/Library/Logs/aivideo/launchd.err.log")


def test_plist_mau_ghi_chu_phien_ban_claude_code_va_tao_thu_muc_log():
    text = PLIST.read_text(encoding="utf-8")
    assert "v2.1.259" in text
    assert "permission-prompts" in text
    assert "mkdir -p ~/Library/Logs/aivideo" in text
    assert "token" in text.lower() and "log" in text.lower()


def test_plist_mau_la_xml_hop_le():
    """Cú pháp XML chặt (vd không có `--` trong chú thích), không chỉ plutil."""
    import xml.etree.ElementTree as ET

    ET.parse(PLIST)


# --- lệnh mặc định (không đặt biến AIVIDEO_*): đường dẫn có khoảng trắng ---


def test_lenh_mac_dinh_dung_dung_khi_duong_dan_repo_co_khoang_trang(tmp_path):
    rig = Rig(tmp_path, repo="repo co khoang trang")
    py = rig.root / "audio" / ".venv" / "bin" / "python"
    py.write_text(
        "#!/bin/sh\n"
        'if [ "$1" = -m ]; then\n'
        '  printf "%s\\n" "$*" >> "$FAKE_DIR/py.log"\n'
        '  pwd -P >> "$FAKE_DIR/py.cwd"\n'
        "  exit 0\nfi\n"
        f'exec "{sys.executable}" "$@"\n')
    binp = tmp_path / "bin"
    binp.mkdir()
    (binp / "claude").symlink_to(rig.claude)
    for k in ("AIVIDEO_CLAUDE", "AIVIDEO_GATES", "AIVIDEO_UPLOAD"):
        del rig.env[k]
    rig.env["PATH"] = f"{binp}:{os.environ['PATH']}"
    res = rig.run()
    assert res.returncode == 0, rig.log
    lines = (rig.fake / "py.log").read_text(encoding="utf-8").splitlines()
    mp4 = rig.root / "out" / "episodes" / SLUG / f"{SLUG}.mp4"
    assert lines == [
        f"-m aivideo.gates gate3 {SLUG} --video {mp4}",
        f"-m aivideo.upload {SLUG}",
    ]
    cwds = (rig.fake / "py.cwd").read_text().split("\n")[:2]
    assert [Path(c) for c in cwds] == [(rig.root / "audio").resolve()] * 2
    assert rig.calls[0] == "claude"
