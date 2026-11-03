"""Đề mục 11 [11-3]: gate3 (cổng đăng): hash kịch bản, qc, publish.json, kênh."""

from __future__ import annotations

import json
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


class Env:
    def __init__(self, tmp_path, *, cong2=True, stages=("lint", "ky-thuat", "qc")):
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
                r = gates.ledger_run(
                    self.ep, stage, [sys.executable, "-c", "print(1)"]
                )
                assert r["verdict"] == "DAT"
        self.qc_findings = write_findings(self.ep / "qc.json", [])
        if "qc" in stages:
            r = gates.ledger_add_findings(
                self.ep, stage="qc", role="qc", pair="editor/qc",
                findings=self.qc_findings, root=self.ep, artifact=self.video,
            )
            assert r["verdict"] == "DAT"

    def gate3(self, **kw):
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
def env(tmp_path):
    return Env(tmp_path)


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


def test_gate3_chan_khi_chua_qua_cong2(tmp_path):
    e = Env(tmp_path, cong2=False)
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
def test_gate3_chan_khi_thieu_muc_so_tap_cua_khau(tmp_path, stage):
    keep = tuple(x for x in ("lint", "ky-thuat", "qc") if x != stage)
    e = Env(tmp_path, stages=keep)
    r = e.gate3()
    assert r["pass"] is False
    assert stage in _only_failing(e, r)


def test_gate3_chan_khi_lint_do(tmp_path):
    e = Env(tmp_path)
    gates.ledger_run(e.ep, "lint", [sys.executable, "-c", "import sys; sys.exit(1)"])
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


def test_gate3_chan_khi_qc_chan(tmp_path):
    e = Env(tmp_path)
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
    code, data, _ = run_cli(
        capsys,
        ["gate3", SLUG, "--episodes-dir", str(env.eps), "--kenh", str(env.kenh)],
    )
    assert code == 1
    assert data["pass"] is False
