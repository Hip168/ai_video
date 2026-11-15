"""Sửa quy trình kiểm (việc tồn DEV, 2026-11-15): gate3 băm lại qc.json, prepare-factcheck lấy `spoken`."""

from __future__ import annotations

import json

from aivideo import gates

from gates_support import ROLE_FACT, SLUG, claim, make_episode, write_json
from test_gates_gate3 import Env as Gate3Env


# ---- (c) gate3 băm lại handoff/qc.json ------------------------------------------------

def test_gate3_chan_khi_handoff_qc_json_bi_sua_sau_khi_ghi_so(tmp_path, monkeypatch):
    env = Gate3Env(tmp_path, monkeypatch)
    assert env.gate3(video=env.video)["pass"] is True
    p = env.ep / "handoff" / "qc.json"
    doc = json.loads(p.read_text(encoding="utf-8"))
    doc["evidence"]["frames"] = list(reversed(doc["evidence"]["frames"]))  # vẫn hợp lệ, chỉ khác byte
    write_json(p, doc)
    r = env.gate3(video=env.video)
    assert r["pass"] is False
    c = env.checks(r)["qc-dong-phan-quyet"]
    assert c["ok"] is False and "qc.json" in c["detail"]


def test_gate3_chan_khi_thieu_handoff_qc_json(tmp_path, monkeypatch):
    env = Gate3Env(tmp_path, monkeypatch)
    (env.ep / "handoff" / "qc.json").unlink()
    r = env.gate3(video=env.video)
    assert env.checks(r)["qc-dong-phan-quyet"]["ok"] is False


# ---- (d) prepare-factcheck --with-lines lấy `spoken` -------------------------------------

def test_prepare_with_lines_lay_spoken_khi_beat_co_spoken(tmp_path):
    eps, _ = make_episode(
        tmp_path, fact=False,
        texts={"b001": "Có 42 người xem.", "b002": "Có 7 người về."},
        spoken={"b001": "Có bốn mươi hai người xem."},
        beat_claims={"b001": ["c001"], "b002": ["c002"]},
        claims=[claim("c001", "Có 42 người xem."), claim("c002", "Có 7 người về.")],
    )
    res = gates.prepare_factcheck(SLUG, eps, ROLE_FACT, tmp_parent=tmp_path / "ngoai", with_lines=True)
    items = {it["id"]: it for it in json.loads(open(res["items"], encoding="utf-8").read())}
    assert items["c001"]["lines"] == ["Có bốn mươi hai người xem."]
    assert items["c002"]["lines"] == ["Có 7 người về."]  # không có spoken: dùng text
