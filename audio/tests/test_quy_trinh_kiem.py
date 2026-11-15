"""Sửa quy trình kiểm (việc tồn DEV, 2026-11-15): (c) gate3 băm lại qc.json, (d) prepare-factcheck lấy
`spoken`, (e) phatam pick đọc giọng thật của tập, (h) PLAYBOOK chạy được ở zsh lẫn bash, nhạc thiếu báo sớm."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
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


# ---- (e) phatam pick đọc giọng thật của tập ----------------------------------------------

def test_episode_build_ghi_voice_json_giong_da_dung(tmp_path, monkeypatch):
    from aivideo import episode
    from ep_support import Tree, small_script
    tree = Tree(tmp_path)
    tree.write_script(small_script())
    monkeypatch.chdir(tree.base / "audio")
    assert episode.main(["build", tree.slug, "--engine", "fake", "--voice", "giong-thu", "--speed", "1.0"]) == 0
    v = json.loads((tree.out_dir / "voice.json").read_text(encoding="utf-8"))
    assert v == {"engine": "fake", "voice": "giong-thu", "speed": 1.0}


def _pick_spy(monkeypatch):
    from aivideo import phatam
    seen = []

    def synth(line, voice, speed, dst, engine=phatam.ENGINE):
        seen.append((engine, voice, speed))
        open(dst, "w").close()

    monkeypatch.setattr(phatam, "synth_clip", synth)
    monkeypatch.setattr(phatam, "_hear", lambda jobs, ipas: [
        {"pEn": 0.0, "pVi": 0.0, "per": None, "phones": None, "heardVi": "", "heardEn": [], "pass": False} for _ in jobs])
    return phatam, seen


def test_pick_slug_tong_hop_bang_engine_giong_toc_do_cua_tap(tmp_path, monkeypatch):
    phatam, seen = _pick_spy(monkeypatch)
    write_json(tmp_path / "out" / "episodes" / "tap-thu" / "voice.json",
               {"engine": "vieneu", "voice": "Thiện Minh", "speed": 1.0})
    phatam.main(["--root", str(tmp_path), "pick", "pound", "--candidates", "pao", "--slug", "tap-thu"])
    assert seen and set(seen) == {("vieneu", "Thiện Minh", 1.0)}


def test_pick_slug_chua_dung_giong_thi_loi_ma_1(tmp_path, monkeypatch, capsys):
    phatam, seen = _pick_spy(monkeypatch)
    assert phatam.main(["--root", str(tmp_path), "pick", "pound", "--slug", "tap-thu"]) == 1
    assert "voice.json" in capsys.readouterr().err
    assert seen == []


# ---- (h) PLAYBOOK: lệnh cổng chạy được ở cả zsh lẫn bash ---------------------------------

PLAYBOOK = Path(__file__).resolve().parents[2] / "episodes" / "PLAYBOOK.md"


def test_playbook_khong_con_bien_g_khong_tach_tu_trong_zsh():
    assert "$G" not in PLAYBOOK.read_text(encoding="utf-8")


@pytest.mark.parametrize("sh", ["bash", "zsh"])
def test_playbook_dinh_nghia_g_chay_dung_trong_shell(sh, tmp_path):
    exe = shutil.which(sh)
    if exe is None:
        pytest.skip(f"máy không có {sh}")
    defs = [ln for ln in PLAYBOOK.read_text(encoding="utf-8").splitlines() if re.match(r"G(\(\)|=)", ln)]
    assert len(defs) == 1
    py = tmp_path / ".venv" / "bin" / "python"
    py.parent.mkdir(parents=True)
    py.write_text('#!/bin/sh\nprintf "%s|" "$@"\n', encoding="utf-8")
    py.chmod(0o755)
    r = subprocess.run([exe, "-c", f"{defs[0]}\nG verdict 'a b.json' --root x"], cwd=tmp_path,
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    assert r.stdout == "-m|aivideo.gates|verdict|a b.json|--root|x|"
