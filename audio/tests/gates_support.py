"""Hạ tầng test đề mục 11 (đội sản xuất): dựng tập thử trong thư mục tạm.

Giao diện: `.team/features/11-doi-san-xuat-giao-dien.md`. Không dùng giờ thật,
mạng hay agent thật.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

from aivideo import gates

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "episodes" / "_template" / "script.json"
ROLES_DIR = ROOT / "episodes" / "roles"
QUAL_DIR = ROOT / "qualification"
SLUG = "tap-thu"
PLAIN = "Đây là một câu đọc đơn giản."


def claim(cid, text, *, status="DAT", sources=None, question="Có đúng không?"):
    if sources is None:
        sources = [{"url": "https://example.org/a", "credibility": "primary"}]
    return {
        "id": cid,
        "claim": text,
        "question": question,
        "status": status,
        "sources": sources,
    }


def make_script(texts=None, beat_claims=None, spoken=None):
    """Kịch bản mẫu, mọi beat là câu thường không số, không tên riêng."""
    doc = json.loads(TEMPLATE.read_text(encoding="utf-8"))
    doc["meta"]["title"] = "Tập thử nghiệm"
    for sc in doc["scenes"]:
        for b in sc["beats"]:
            b["text"] = PLAIN
            b["spoken"] = None
            b["claims"] = []
    for sc in doc["scenes"]:
        for b in sc["beats"]:
            if texts and b["id"] in texts:
                b["text"] = texts[b["id"]]
            if beat_claims and b["id"] in beat_claims:
                b["claims"] = list(beat_claims[b["id"]])
            if spoken and b["id"] in spoken:
                b["spoken"] = spoken[b["id"]]
    return doc


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def make_episode(tmp_path, *, texts=None, beat_claims=None, spoken=None,
                 claims=None, slug=SLUG):
    """Trả (episodes_dir, đường dẫn thư mục tập)."""
    eps = tmp_path / "repo" / "episodes"
    ep = eps / slug
    write_json(ep / "script.json", make_script(texts, beat_claims, spoken))
    write_json(ep / "claims.json", claims if claims is not None else [])
    return eps, ep


def read_script(ep: Path):
    return json.loads((ep / "script.json").read_text(encoding="utf-8"))


def edit_script(ep: Path, fn) -> None:
    doc = read_script(ep)
    fn(doc)
    write_json(ep / "script.json", doc)


def first_beat(doc):
    return doc["scenes"][0]["beats"][0]


def problems_text(res) -> str:
    return json.dumps(res["problems"], ensure_ascii=False)


def run_cli(capsys, argv):
    """Chạy gates.main; trả (mã thoát, JSON in ra hoặc None, stderr)."""
    code = gates.main(argv)
    cap = capsys.readouterr()
    out = json.loads(cap.out) if cap.out.strip() else None
    return code, out, cap.err


def write_findings(path: Path, findings) -> Path:
    write_json(path, {"findings": findings})
    return path


def finding(severity, quote, file="a.txt", rule="r", owner="scriptwriter"):
    return {
        "severity": severity,
        "rule": rule,
        "file": file,
        "quote": quote,
        "failing_case": "sai",
        "owner": owner,
    }


def deepcopy(x):
    return copy.deepcopy(x)
