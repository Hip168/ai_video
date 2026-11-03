"""Đề mục 11 [11-3]: gate3 (cổng đăng): hash kịch bản, qc, publish.json, kênh."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys

import pytest
from aivideo import gates

from gates_support import (
    SLUG,
    claim,
    edit_script,
    finding,
    first_beat,
    make_episode,
    run_cli,
    write_findings,
    write_json,
)

OK_CMD = [sys.executable, "-c", "print(1)"]
FAIL_CMD = [sys.executable, "-c", "import sys; sys.exit(1)"]
KENH = {
    "channelId": "UC_kenh_thu_123",
    "handle": "@kenhthu",
    "verifiedPhone": True,
    "firstVideoApproved": True,
}
PUBLISH = {
    "title": "Tập thử nghiệm",
    "description": "Mô tả tập.\nGiọng đọc do AI tạo.",
    "tags": ["máy tính", "lập trình"],
    "chapters": "00:00 Mở đầu\n00:30 Chương một",
    "thumbnail": "thumbnail.png",
    "privacy": "public",
    "channelId": "UC_kenh_thu_123",
    "containsSyntheticMedia": False,
}


TIMELINE = {
    "version": 2, "fps": 30, "durationInFrames": 1500,
    "chapters": [
        {"id": f"c{i}", "title": f"Chương {i}", "startFrame": 300 * i}
        for i in range(5)
    ],
}
FRAMES = list(range(0, 50, 2))  # 25 mốc, mỗi chương 10 giây có >= 1 mốc
LOUDNESS = {"lufs": -16.0, "truePeak": -1.5}


def git(cwd, *args):
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t",
         "-c", "commit.gpgsign=false", *args],
        cwd=cwd, check=True, capture_output=True, text=True,
    ).stdout


class Env:
    def __init__(
        self, tmp_path, monkeypatch, *, cong2=True, stages=("lint", "ky-thuat", "qc"),
        use_git=True,
    ):
        self.mp = monkeypatch
        self.repo = tmp_path / "repo"
        # lint chạy trong <repo>/video; lệnh thật được thay bằng lệnh giả
        # bằng cách monkeypatch hằng trong cùng tiến trình.
        (tmp_path / "repo" / "video").mkdir(parents=True)
        self.set_cmds(OK_CMD, OK_CMD)
        self.eps, self.ep = make_episode(
            tmp_path,
            texts={"b001": "Có 42 người xem."},
            beat_claims={"b001": ["c001"]},
            claims=[claim("c001", "Có 42 người xem.")],
        )
        self.kenh = tmp_path / "repo" / ".team" / "kenh.json"
        write_json(self.kenh, KENH)
        write_json(self.ep / "publish.json", PUBLISH)
        (self.ep / "thumbnail.png").write_bytes(b"png")
        self.video = tmp_path / "video.mp4"
        self.video.write_bytes(b"mp4-bytes")
        if cong2:
            assert gates.gate2(SLUG, self.eps)["pass"]
        for stage in ("lint", "ky-thuat"):
            if stage in stages:
                r = gates.ledger_run(self.ep, stage)
                assert r["verdict"] == "DAT"
        write_json(
            self.repo / "out" / "episodes" / SLUG / "timeline.json", TIMELINE
        )
        self.qc_findings = write_findings(self.ep / "qc.json", [])
        if "qc" in stages:
            self.add_qc()
        self.git = use_git
        if use_git:
            git(self.repo, "init", "-q")
            self.commit()

    def evidence(self, **changes):
        ev = {
            "videoSha256": hashlib.sha256(self.video.read_bytes()).hexdigest(),
            "frames": list(FRAMES),
            "loudness": dict(LOUDNESS),
        }
        ev.update(changes)
        for k, v in list(ev.items()):
            if v is None:
                del ev[k]
        return ev

    def add_qc(self, evidence="default", findings=()):
        doc = {"findings": list(findings)}
        if evidence == "default":
            evidence = self.evidence()
        if evidence is not None:
            doc["evidence"] = evidence
        write_json(self.ep / "qc.json", doc)
        r = gates.ledger_add_findings(
            self.ep, stage="qc", role="qc", pair="editor/qc",
            findings=self.ep / "qc.json", root=self.ep, artifact=self.video,
        )
        assert r["verdict"] == "DAT"
        return r

    def commit(self):
        rel = f"episodes/{SLUG}/ledger.json"
        git(self.repo, "add", rel)
        git(self.repo, "commit", "-q", "--allow-empty", "-m", "so tap")

    def set_cmds(self, lint, ky_thuat):
        self.mp.setattr(gates, "LINT_CMD", list(lint))
        self.mp.setattr(gates, "KY_THUAT_CMD", list(ky_thuat))

    def gate3(self, *, commit=True, **kw):
        if commit and self.git:
            self.commit()
        kw.setdefault("kenh_path", self.kenh)
        return gates.gate3(SLUG, self.eps, **kw)

    def checks(self, res):
        return {c["name"]: c for c in res["checks"]}

    def publish(self, **changes):
        doc = dict(PUBLISH)
        doc.update(changes)
        for k, v in list(doc.items()):
            if v is None:
                del doc[k]
        write_json(self.ep / "publish.json", doc)


@pytest.fixture
def env(tmp_path, monkeypatch):
    return Env(tmp_path, monkeypatch)


def _only_failing(env, res):
    return sorted(n for n, c in env.checks(res).items() if not c["ok"])


def test_gate3_du_dieu_kien_thi_dat_va_ghi_cong3(env):
    r = env.gate3(video=env.video)
    assert r["gate"] == "gate3"
    assert r["pass"] is True, r
    names = set(env.checks(r))
    assert {
        "chuoi-so", "hash-kich-ban", "lint", "ky-thuat", "qc",
        "qc-dong-phan-quyet", "qc-video", "publish",
    } <= names
    assert gates.Ledger(env.ep).last("cong3")["verdict"] == "DAT"


def test_gate3_chan_khong_ghi_cong3(env):
    env.publish(privacy="khac")
    assert env.gate3()["pass"] is False
    assert gates.Ledger(env.ep).last("cong3") is None


def test_gate3_chan_khi_sua_mot_ky_tu_kich_ban_sau_cong2(env):
    edit_script(
        env.ep,
        lambda d: first_beat(d).__setitem__("text", "Có 42 người xem!"),
    )
    r = env.gate3()
    assert r["pass"] is False
    assert "hash-kich-ban" in _only_failing(env, r)


def test_gate3_chan_khi_sua_mot_ky_tu_ma_gate2_van_dat(env):
    # sửa chữ nhưng giữ nguyên số: gate2 mới vẫn đạt, nhưng gate3 chặn
    edit_script(
        env.ep,
        lambda d: first_beat(d).__setitem__("text", "Có 42 người xem."[:-1] + ".."),
    )
    assert gates.gate2(SLUG, env.eps, write_ledger=False)["pass"] is True
    assert env.gate3()["pass"] is False


def test_gate3_doi_phan_canh_khong_lam_chan(env):
    def mutate(d):
        d["scenes"][0]["props"] = {"k": "v"}
        first_beat(d)["pause_ms"] = 123

    edit_script(env.ep, mutate)
    assert env.gate3()["pass"] is True


def test_gate3_chan_khi_claims_doi_sau_cong2(env):
    write_json(env.ep / "claims.json", [claim("c001", "Có 42 người xem!")])
    r = env.gate3()
    assert r["pass"] is False
    assert "hash-kich-ban" in _only_failing(env, r)


def test_gate3_chan_khi_chua_qua_cong2(tmp_path, monkeypatch):
    e = Env(tmp_path, monkeypatch, cong2=False)
    r = e.gate3()
    assert r["pass"] is False
    assert "hash-kich-ban" in _only_failing(e, r)


def test_gate3_chan_khi_thieu_dong_phan_quyet_qc(env):
    (env.ep / "handoff" / "qc.verdict").unlink()
    r = env.gate3()
    assert r["pass"] is False
    assert "qc-dong-phan-quyet" in _only_failing(env, r)


@pytest.mark.parametrize(
    "line",
    [
        "",
        "DAT\n",
        "PHAN_QUYET: CHAN findings_sha256={f} script_sha256={s}\n",
        "PHAN_QUYET: DAT findings_sha256=abc script_sha256={s}\n",
        "PHAN_QUYET: DAT findings_sha256={f} script_sha256={f}\n",
        "PHAN_QUYET: DAT findings_sha256={s} script_sha256={s}\n",
        "PHAN_QUYET: DAT findings_sha256={f} script_sha256={s}\nthêm dòng\n",
        "phan_quyet: dat findings_sha256={f} script_sha256={s}\n",
    ],
)
def test_gate3_chan_dong_phan_quyet_sai_dinh_dang_hoac_sai_hash(env, line):
    ent = gates.Ledger(env.ep).last("qc")
    f = ent["findingsHash"]
    s = ent["scriptHash"]
    (env.ep / "handoff" / "qc.verdict").write_text(
        line.format(f=f, s=s), encoding="utf-8"
    )
    r = env.gate3()
    assert r["pass"] is False
    assert "qc-dong-phan-quyet" in _only_failing(env, r)


@pytest.mark.parametrize("stage", ["lint", "ky-thuat", "qc"])
def test_gate3_chan_khi_thieu_muc_so_tap_cua_khau(tmp_path, monkeypatch, stage):
    keep = tuple(x for x in ("lint", "ky-thuat", "qc") if x != stage)
    e = Env(tmp_path, monkeypatch, stages=keep)
    r = e.gate3()
    assert r["pass"] is False
    assert stage in _only_failing(e, r)


def test_gate3_chan_khi_lint_do(tmp_path, monkeypatch):
    e = Env(tmp_path, monkeypatch)
    e.set_cmds(FAIL_CMD, OK_CMD)
    gates.ledger_run(e.ep, "lint")
    r = e.gate3()
    assert r["pass"] is False
    assert "lint" in _only_failing(e, r)


def test_gate3_lint_chay_tren_kich_ban_cu_thi_chan(env):
    # mở rộng: sửa kịch bản + chạy lại cổng 2 nhưng không chạy lại lint
    edit_script(
        env.ep, lambda d: first_beat(d).__setitem__("text", "Có 42 người xem nữa.")
    )
    assert gates.gate2(SLUG, env.eps)["pass"]
    r = env.gate3()
    assert r["pass"] is False
    failing = _only_failing(env, r)
    assert {"lint", "ky-thuat", "qc"} <= set(failing)


def test_gate3_chan_khi_qc_chan(tmp_path, monkeypatch):
    e = Env(tmp_path, monkeypatch)
    f = write_findings(
        e.ep / "qc2.json",
        [finding("CRITICAL", "Có 42", file="script.json", rule="so-sai")],
    )
    r = gates.ledger_add_findings(
        e.ep, stage="qc", role="qc", pair="editor/qc", findings=f, root=e.ep,
        artifact=e.video,
    )
    assert r["verdict"] == "CHAN"
    res = e.gate3()
    assert res["pass"] is False
    assert "qc" in _only_failing(e, res)


def test_gate3_chan_khi_video_khac_ban_qc_da_xem(env, tmp_path):
    other = tmp_path / "khac.mp4"
    other.write_bytes(b"khac")
    r = env.gate3(video=other)
    assert r["pass"] is False
    assert "qc-video" in _only_failing(env, r)


def test_gate3_chan_khi_thieu_file_video(env, tmp_path):
    r = env.gate3(video=tmp_path / "khong-co.mp4")
    assert r["pass"] is False
    assert "qc-video" in _only_failing(env, r)


def test_gate3_chan_khi_chuoi_so_tap_vo(env):
    doc = json.loads((env.ep / "ledger.json").read_text(encoding="utf-8"))
    doc["entries"][0]["role"] = "gia-mao"
    (env.ep / "ledger.json").write_text(json.dumps(doc), encoding="utf-8")
    r = env.gate3()
    assert r["pass"] is False
    assert "chuoi-so" in _only_failing(env, r)


# ---- publish.json -------------------------------------------------------------

def test_gate3_publish_thieu_file(env):
    (env.ep / "publish.json").unlink()
    r = env.gate3()
    assert r["pass"] is False
    assert _only_failing(env, r) == ["publish"]


def test_gate3_publish_hong_json(env):
    (env.ep / "publish.json").write_text("{không", encoding="utf-8")
    assert env.gate3()["pass"] is False


@pytest.mark.parametrize(
    "field",
    [
        "title", "description", "tags", "chapters", "thumbnail", "privacy",
        "channelId", "containsSyntheticMedia",
    ],
)
def test_gate3_publish_thieu_truong_bi_chan(env, field):
    env.publish(**{field: None})
    r = env.gate3()
    assert r["pass"] is False
    assert _only_failing(env, r) == ["publish"]


@pytest.mark.parametrize(
    "changes",
    [
        {"title": ""},
        {"title": "x" * 101},
        {"tags": []},
        {"tags": ["ok", ""]},
        {"tags": "không là mảng"},
        {"description": "Không nhắc tới giọng đọc nhân tạo."},
        {"chapters": "00:10 Mở đầu"},
        {"thumbnail": "khong-co.png"},
        {"thumbnail": "../ngoai.png"},
        {"privacy": "private"},
        {"containsSyntheticMedia": True},
        {"containsSyntheticMedia": "false"},
    ],
)
def test_gate3_publish_gia_tri_sai_bi_chan(env, changes):
    (env.ep.parent / "ngoai.png").write_bytes(b"x")
    env.publish(**changes)
    r = env.gate3()
    assert r["pass"] is False
    assert _only_failing(env, r) == ["publish"]


def test_gate3_publish_tieu_de_dung_100_ky_tu_van_dat(env):
    env.publish(title="x" * 100)
    assert env.gate3()["pass"] is True


def test_gate3_chan_publish_sai_kenh(env):
    env.publish(channelId="UC_kenh_khac")
    r = env.gate3()
    assert r["pass"] is False
    assert _only_failing(env, r) == ["publish"]


def test_gate3_chan_khi_thieu_kenh_json(env):
    env.kenh.unlink()
    r = env.gate3()
    assert r["pass"] is False
    assert _only_failing(env, r) == ["publish"]


def test_gate3_chan_khi_kenh_json_khong_co_channel_id(env):
    write_json(env.kenh, {"handle": "@kenhthu", "firstVideoApproved": True})
    assert env.gate3()["pass"] is False


def test_gate3_video_dau_chua_duyet_chi_cho_unlisted(env):
    write_json(env.kenh, {**KENH, "firstVideoApproved": False})
    env.publish(privacy="public")
    assert env.gate3()["pass"] is False
    env.publish(privacy="unlisted")
    assert env.gate3()["pass"] is True


def test_gate3_kenh_mac_dinh_la_team_kenh_json_canh_episodes(env):
    env.commit()
    r = gates.gate3(SLUG, env.eps)
    assert r["pass"] is True


def test_gate3_cli_ma_thoat(env, capsys):
    code, data, _ = run_cli(
        capsys,
        ["gate3", SLUG, "--episodes-dir", str(env.eps), "--kenh", str(env.kenh)],
    )
    assert code == 0
    assert data["pass"] is True
    env.publish(privacy="lung-tung")
    env.commit()
    code, data, _ = run_cli(
        capsys,
        ["gate3", SLUG, "--episodes-dir", str(env.eps), "--kenh", str(env.kenh)],
    )
    assert code == 1
    assert data["pass"] is False


# ---- lệnh trong sổ phải là lệnh cố định ----------------------------------------

@pytest.mark.parametrize("stage", ["lint", "ky-thuat"])
def test_gate3_chan_khi_muc_so_tap_co_lenh_true_gia_mao(env, stage):
    # ghi tay một mục DAT với cmd ["true"] thay vì lệnh cố định
    cur = gates.Ledger(env.ep).last(stage)["scriptHash"]
    gates.Ledger(env.ep).add(
        stage=stage, role="sep-tong", verdict="DAT", script_hash=cur,
        output_hash="0" * 64, cmd=["true"],
    )
    r = env.gate3()
    assert r["pass"] is False
    assert stage in _only_failing(env, r)


@pytest.mark.parametrize("stage", ["lint", "ky-thuat"])
def test_gate3_chan_khi_muc_so_tap_khong_ghi_lenh(env, stage):
    cur = gates.Ledger(env.ep).last(stage)["scriptHash"]
    gates.Ledger(env.ep).add(
        stage=stage, role="sep-tong", verdict="DAT", script_hash=cur,
        output_hash="0" * 64,
    )
    r = env.gate3()
    assert r["pass"] is False
    assert stage in _only_failing(env, r)


def test_gate3_chan_khi_lenh_trong_so_khac_hang_cua_ma(env):
    # sổ ghi bằng lệnh giả của test; bỏ monkeypatch thì lệnh thật khác lệnh
    # đã ghi nên cả lint và ky-thuat đều bị chặn.
    assert env.gate3()["pass"] is True
    env.mp.undo()
    r = env.gate3()
    assert r["pass"] is False
    assert {"lint", "ky-thuat"} <= set(_only_failing(env, r))


# ---- Cổng 2 trong sổ không được tin: gate3 tự chạy lại --------------------------

def _forge_cong2(env):
    import hashlib

    from gates_support import read_script

    cur = gates.script_text_hash(read_script(env.ep))
    claims_file = env.ep / "claims.json"
    ch = (
        hashlib.sha256(claims_file.read_bytes()).hexdigest()
        if claims_file.is_file() else None
    )
    gates.Ledger(env.ep).add(
        stage="cong2", role="sep-tong", verdict="DAT", output_hash=cur,
        script_hash=cur, claims_hash=ch,
    )
    return cur


def test_gate3_chan_khi_thieu_claims_json_du_so_tap_co_cong2_gia(env):
    (env.ep / "claims.json").unlink()
    _forge_cong2(env)
    r = env.gate3()
    assert r["pass"] is False


def test_gate3_chan_khi_loi_doc_co_so_ma_khong_con_claim_du_cong2_gia(env):
    write_json(env.ep / "claims.json", [])
    _forge_cong2(env)
    r = env.gate3()
    assert r["pass"] is False
    assert gates.Ledger(env.ep).last("cong3") is None


def test_gate3_chan_khi_claim_chua_kiem_du_cong2_gia(env):
    write_json(
        env.ep / "claims.json",
        [claim("c001", "Có 42 người xem.", status="CHUA_KIEM")],
    )
    _forge_cong2(env)
    assert env.gate3()["pass"] is False


def test_gate3_cong2_lai_la_mot_muc_kiem_rieng(env):
    r = env.gate3()
    assert env.checks(r)["cong2-lai"]["ok"] is True


def test_gate3_cong2_lai_do_khi_claims_json_thieu(env):
    (env.ep / "claims.json").unlink()
    _forge_cong2(env)
    r = env.gate3()
    assert "cong2-lai" in _only_failing(env, r)


# ---- neo sổ bằng git: mục so-git -------------------------------------------

def test_gate3_so_git_dat_khi_so_da_commit_va_chi_them(env):
    gates.Ledger(env.ep).add(stage="viet", role="scriptwriter")
    env.commit()
    gates.Ledger(env.ep).add(stage="viet2", role="scriptwriter")
    r = env.gate3()
    assert env.checks(r)["so-git"]["ok"] is True
    assert r["pass"] is True


def test_gate3_so_git_chan_khi_khong_phai_kho_git(tmp_path, monkeypatch):
    e = Env(tmp_path, monkeypatch, use_git=False)
    r = e.gate3()
    assert r["pass"] is False
    assert _only_failing(e, r) == ["so-git"]


def test_gate3_so_git_chan_khi_so_co_thay_doi_chua_commit(env):
    gates.Ledger(env.ep).add(stage="viet", role="scriptwriter")
    r = env.gate3(commit=False)
    assert r["pass"] is False
    assert _only_failing(env, r) == ["so-git"]


def test_gate3_so_git_chan_khi_so_chua_duoc_theo_doi(tmp_path, monkeypatch):
    e = Env(tmp_path, monkeypatch, use_git=False)
    git(e.repo, "init", "-q")
    e.git = True
    r = e.gate3(commit=False)
    assert r["pass"] is False
    assert _only_failing(e, r) == ["so-git"]


def _rewrite_consistently(ep, fn):
    doc = json.loads((ep / "ledger.json").read_text(encoding="utf-8"))
    fn(doc["entries"])
    prev = ""
    for i, e in enumerate(doc["entries"], start=1):
        e["seq"] = i
        e["prevHash"] = prev
        e["entryHash"] = gates.entry_hash(e)
        prev = e["entryHash"]
    (ep / "ledger.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")


def test_gate3_so_git_chan_khi_lich_su_sua_mot_muc_cu_du_chuoi_hash_van_dung(env):
    # kẻ sửa sổ tính lại cả chuỗi nên chuoi-so vẫn ok; chỉ git bắt được
    _rewrite_consistently(
        env.ep, lambda ents: ents[0].__setitem__("note", "đã bị sửa")
    )
    r = env.gate3()
    assert env.checks(r)["chuoi-so"]["ok"] is True
    assert r["pass"] is False
    assert "so-git" in _only_failing(env, r)


def test_gate3_so_git_chan_khi_lich_su_xoa_mot_muc_cu(env):
    _rewrite_consistently(env.ep, lambda ents: ents.pop(1))
    r = env.gate3()
    assert env.checks(r)["chuoi-so"]["ok"] is True
    assert "so-git" in _only_failing(env, r)


def test_gate3_so_git_chan_khi_co_commit_xoa_file_roi_khoi_phuc(env):
    rel = f"episodes/{SLUG}/ledger.json"
    keep = (env.ep / "ledger.json").read_bytes()
    git(env.repo, "rm", "-q", rel)
    git(env.repo, "commit", "-q", "-m", "xoá sổ")
    (env.ep / "ledger.json").write_bytes(keep)
    r = env.gate3()
    assert r["pass"] is False
    assert "so-git" in _only_failing(env, r)


# ---- bằng chứng qc: mục qc-bang-chung ------------------------------------------

def test_gate3_qc_bang_chung_dat_voi_du_khung_hash_va_loudness(env):
    r = env.gate3(video=env.video)
    assert env.checks(r)["qc-bang-chung"]["ok"] is True


def test_gate3_qc_bang_chung_dat_khi_khong_truyen_video_dung_hash_trong_so(env):
    r = env.gate3()
    assert env.checks(r)["qc-bang-chung"]["ok"] is True


def test_gate3_qc_bang_chung_chan_khi_qc_khong_nop_evidence(env):
    env.add_qc(evidence=None)
    r = env.gate3(video=env.video)
    assert r["pass"] is False
    assert "qc-bang-chung" in _only_failing(env, r)


@pytest.mark.parametrize(
    "changes",
    [
        {"videoSha256": "0" * 64},
        {"videoSha256": "abc"},
        {"videoSha256": None},
        {"frames": FRAMES[:19]},
        # 19 mốc khác nhau, vẫn phủ cả 5 chương: chỉ thiếu số lượng
        {"frames": [x * 2.5 for x in range(19)]},
        # 25 phần tử nhưng chỉ 19 mốc khác nhau (trùng lặp không được tính)
        {"frames": [x * 2.5 for x in range(19)] + [0, 0, 2.5, 2.5, 5, 5]},
        {"frames": [0, 2] * 15},
        {"frames": None},
        {"frames": [-1, *FRAMES[1:]]},
        {"frames": "nhiều"},
        {"loudness": None},
        {"loudness": ""},
        {"loudness": {}},
        {"loudness": -16.0},
        {"loudness": "-16 LUFS"},
        {"loudness": {"lufs": -16.0}},
        {"loudness": {"truePeak": -1.5}},
        {"loudness": {"lufs": "to", "truePeak": -1.5}},
    ],
)
def test_gate3_qc_bang_chung_chan_khi_evidence_thieu_hoac_sai(env, changes):
    env.add_qc(evidence=env.evidence(**changes))
    r = env.gate3(video=env.video)
    assert r["pass"] is False
    assert "qc-bang-chung" in _only_failing(env, r)


def test_gate3_qc_bang_chung_dung_hai_muoi_khung_khac_nhau_van_dat(env):
    env.add_qc(evidence=env.evidence(frames=[x * 2.5 for x in range(20)]))
    r = env.gate3(video=env.video)
    assert env.checks(r)["qc-bang-chung"]["ok"] is True


def test_gate3_qc_bang_chung_chan_khi_mot_chuong_khong_co_khung(env):
    # đủ 20 khung khác nhau nhưng toàn bộ nằm trong 4 chương đầu (0-40 giây)
    frames = [x * 1.9 for x in range(21)]
    assert max(frames) < 40
    env.add_qc(evidence=env.evidence(frames=frames))
    r = env.gate3(video=env.video)
    assert r["pass"] is False
    assert "qc-bang-chung" in _only_failing(env, r)


def test_gate3_qc_bang_chung_khung_o_chuong_cuoi_dem_vao_chuong_cuoi(env):
    # 20 khung, chương cuối (40-50 giây) chỉ có một khung ở đúng 49
    frames = [x * 2.0 for x in range(19)] + [49]
    env.add_qc(evidence=env.evidence(frames=frames))
    r = env.gate3(video=env.video)
    assert env.checks(r)["qc-bang-chung"]["ok"] is True


def test_gate3_qc_bang_chung_chan_khi_thieu_timeline(env):
    (env.repo / "out" / "episodes" / SLUG / "timeline.json").unlink()
    r = env.gate3(video=env.video)
    assert r["pass"] is False
    assert "qc-bang-chung" in _only_failing(env, r)


def test_gate3_qc_bang_chung_hash_trong_evidence_khac_video_truyen_vao(env, tmp_path):
    other = tmp_path / "khac.mp4"
    other.write_bytes(b"bytes-khac")
    r = env.gate3(video=other)
    assert r["pass"] is False
    failing = _only_failing(env, r)
    assert "qc-bang-chung" in failing
    assert "qc-video" in failing


def test_gate3_qc_bang_chung_out_dir_tuy_chinh(env, tmp_path):
    moved = tmp_path / "ra-khac"
    write_json(moved / SLUG / "timeline.json", TIMELINE)
    (env.repo / "out" / "episodes" / SLUG / "timeline.json").unlink()
    r = env.gate3(video=env.video, out_dir=moved)
    assert env.checks(r)["qc-bang-chung"]["ok"] is True


def test_gate3_qc_json_la_ban_sao_nguyen_van_cua_findings_da_nop(env):
    sent = json.loads((env.ep / "qc.json").read_text(encoding="utf-8"))
    kept = json.loads(
        (env.ep / "handoff" / "qc.json").read_text(encoding="utf-8")
    )
    assert kept == sent
    assert kept["evidence"]["videoSha256"] == hashlib.sha256(
        env.video.read_bytes()
    ).hexdigest()


def test_gate3_nop_thang_handoff_qc_json_van_dat(env):
    doc = json.loads((env.ep / "qc.json").read_text(encoding="utf-8"))
    write_json(env.ep / "handoff" / "qc.json", doc)
    r = gates.ledger_add_findings(
        env.ep, stage="qc", role="qc", pair="editor/qc",
        findings=env.ep / "handoff" / "qc.json", root=env.ep,
        artifact=env.video,
    )
    assert r["verdict"] == "DAT"
    res = env.gate3(video=env.video)
    assert env.checks(res)["qc-bang-chung"]["ok"] is True
