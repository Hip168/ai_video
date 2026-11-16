"""Cổng cứng của đội sản xuất: sổ fact, chốt kịch bản, phán quyết, đăng, sổ tập.

Hợp đồng: `.team/features/11-doi-san-xuat-giao-dien.md`. Thiết kế: `.team/doi-san-xuat.md`.
Cổng do script tính, không do agent tuyên bố. Mọi lệnh in một object JSON ra stdout.
"""
from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from decimal import Decimal
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

from aivideo.normalize_vi import _NUM, _THOUSANDS

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TEMPLATE_SLUG = "_template"
CREDIBILITY = ("primary", "secondary", "anecdotal")
STATUS = ("DAT", "SAI", "CHUA_KIEM")
SEVERITIES = ("CRITICAL", "MAJOR", "MINOR")
FINDING_FIELDS = ("severity", "rule", "file", "quote", "failing_case", "owner")
MAX_ROUNDS = 3
MAX_QUOTE = 300
MIN_FRAMES = 20
COUNTED = ("CRITICAL", "MAJOR")
RESERVED_STAGES = ("cong2", "cong3", "lint", "ky-thuat", "phat-am", "fact", "fact-prepare")
MAX_CROSS_RETURNS = 2
RUN_STAGES = ("lint", "ky-thuat", "phat-am")
HANDOFF_SECTIONS = ("Đã chốt", "Đã bỏ", "Rủi ro", "File", "Còn lại")
FORBIDDEN_IN_BLIND_PROMPT = ("script.json", "kịch bản", "episodes/")
PRIVACY = ("unlisted", "public")

GENERIC_ACRONYMS = frozenset((
    "CPU", "GPU", "RAM", "ROM", "SSD", "HDD", "USB", "OS", "API", "URL", "IP", "TCP", "UDP",
    "DNS", "HTTP", "HTTPS", "HTML", "CSS", "SQL", "AI", "ID", "PC", "LED", "LCD", "GB", "MB",
    "KB", "TB", "GHz", "MHz", "kHz", "UTF", "ASCII", "BIOS", "LAN", "WAN", "VPN", "GUI", "CLI",
    "IDE", "GiB", "MiB", "KiB", "TiB", "Wi-Fi", "WiFi"))

NUMBER_RE = re.compile(r"(?:(?<![\w.,])[-\u2212](?=\d))?\d+(?:[.,:/\-–—]\d+)*")
WORD_RE = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*")
_SENT_END = ".!?…:;"
_SKIP_BACK = " \t\r\n\"'“”‘’«»(–—-"


class GateError(Exception):
    """Lỗi thao tác (in `lỗi: ...`, mã 1)."""


# ---- tiện ích ------------------------------------------------------------------

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(Path(path).read_bytes())


def canon(obj) -> str:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _nonempty(v) -> bool:
    return isinstance(v, str) and bool(v.strip())


def _check_slug(slug: str) -> None:
    if slug != TEMPLATE_SLUG and not SLUG_RE.match(slug or ""):
        raise GateError(f"slug không hợp lệ: {slug!r}")


def _ep_dir(slug: str, episodes_dir) -> Path:
    _check_slug(slug)
    return Path(episodes_dir) / slug


def _read_json(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write_json_atomic(path: Path, obj) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _host(url: str) -> str:
    h = (urlparse(url).hostname or "").lower().rstrip(".")
    return h[4:] if h.startswith("www.") else h


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


_SLD = frozenset(("co", "com", "org", "net", "gov", "edu", "ac"))


def root_domain(url: str) -> str:
    """Tên miền gốc xấp xỉ eTLD+1: 2 nhãn cuối, hoặc 3 khi dạng co.uk, com.vn."""
    host = _host(url)
    if not host or _is_ip(host):
        return ""  # địa chỉ IP không phải miền gốc: không tính là nguồn độc lập
    labels = host.split(".")
    if len(labels) >= 3 and labels[-2] in _SLD and len(labels[-1]) == 2:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def _is_http(url) -> bool:
    return isinstance(url, str) and urlparse(url).scheme in ("http", "https") and bool(_host(url))


# ---- bắt số và tên trên text gốc ---------------------------------------------

def number_value(token: str) -> Decimal | None:
    """Giá trị số theo đúng quy tắc nghìn/thập phân của normalize_vi, hoặc None nếu không
    phải một số đơn (IP, ngày, giờ, khoảng, số 0 đứng đầu đọc từng chữ số)."""
    neg = token[:1] in "-\u2212"
    if neg:
        token = token[1:]
    if re.fullmatch(r"0\d+", token) or not re.fullmatch(_NUM, token):
        return None
    sign = -1 if neg else 1
    if re.fullmatch(_THOUSANDS, token):
        whole, _, frac = token.replace(".", "").partition(",")
    else:
        whole, _, frac = token.replace(",", ".").partition(".")
    return sign * Decimal(f"{whole}.{frac}" if frac else whole)


def _runs(token: str) -> list[str]:
    return [str(int(r)) for r in re.findall(r"\d+", token)]


def _sentence_start(text: str, pos: int) -> bool:
    i = pos - 1
    while i >= 0 and text[i] in _SKIP_BACK:
        i -= 1
    return i < 0 or text[i] in _SENT_END


def _is_name(word: str, text: str, pos: int) -> bool:
    if word in GENERIC_ACRONYMS:
        return False
    if len(word) < 2:
        return False
    if word.isupper():
        return True
    segs = re.split(r"['’\-]", word)
    for seg in segs:
        if len(seg) > 1 and any(c.isupper() for c in seg[1:]) and any(c.islower() for c in seg):
            return True
    return word[0].isupper() and not _sentence_start(text, pos)


def extract_from_text(text: str) -> list[tuple[str, str]]:
    """[(kind, match)] theo thứ tự xuất hiện trong chuỗi."""
    text = nfc(text)
    found: list[tuple[int, str, str]] = []
    for m in NUMBER_RE.finditer(text):
        found.append((m.start(), "number", m.group(0)))
    for m in WORD_RE.finditer(text):
        if _is_name(m.group(0), text, m.start()):
            found.append((m.start(), "name", m.group(0)))
    found.sort()
    return [(k, s) for _, k, s in found]


def _iter_beats(doc):
    for sc in doc.get("scenes", []) or []:
        for b in sc.get("beats", []) or []:
            yield sc, b


def extract_items(doc) -> list[dict]:
    items = []
    for sc, b in _iter_beats(doc):
        for field in ("text", "spoken"):
            val = b.get(field)
            if not isinstance(val, str):
                continue
            if field == "spoken":
                kinds = [(k, s) for k, s in extract_from_text(val) if k == "number"]
            else:
                kinds = extract_from_text(val)
            for kind, match in kinds:
                items.append({"scene": sc.get("id"), "beat": b.get("id"), "field": field,
                              "kind": kind, "match": match})
    return items


# ---- hash phần lời -----------------------------------------------------------

def script_text_hash(doc) -> str:
    beats = []
    for sc, b in _iter_beats(doc):
        beats.append({"id": b.get("id"),
                      "text": nfc(b.get("text") or ""),
                      "spoken": nfc(b["spoken"]) if isinstance(b.get("spoken"), str) else None,
                      "claims": list(b.get("claims") or [])})
    meta = doc.get("meta") or {}
    body = {"title": nfc(meta.get("title") or ""),
            "chapters": [{"id": c.get("id"), "title": nfc(c.get("title") or "")}
                         for c in doc.get("chapters", []) or []],
            "beats": beats}
    return sha256_bytes(canon(body).encode("utf-8"))


# ---- sổ fact: gate1 ----------------------------------------------------------

def check_claims(claims) -> list[dict]:
    """Trả danh sách vấn đề [{"claim","problem"}]; rỗng nghĩa là đạt Cổng 1."""
    probs: list[dict] = []
    if not isinstance(claims, list):
        return [{"claim": None, "problem": "claims.json phải là mảng"}]
    seen: set = set()
    for i, c in enumerate(claims):
        cid = c.get("id") if isinstance(c, dict) else None
        label = cid if isinstance(cid, str) else f"#{i}"
        if not isinstance(c, dict):
            probs.append({"claim": label, "problem": "phần tử phải là object"})
            continue
        bad = [k for k in ("id", "claim", "question") if not _nonempty(c.get(k))]
        if bad:
            probs.append({"claim": label, "problem": f"thiếu hoặc rỗng: {', '.join(bad)}"})
        if cid in seen:
            probs.append({"claim": label, "problem": "id trùng"})
        seen.add(cid)
        status = c.get("status")
        if status not in STATUS:
            probs.append({"claim": label, "problem": f"status sai: {status!r}"})
            continue
        srcs = c.get("sources")
        src_ok = isinstance(srcs, list) and all(
            isinstance(e, dict) and _is_http(e.get("url")) and e.get("credibility") in CREDIBILITY
            for e in srcs)
        if not src_ok:
            probs.append({"claim": label, "problem": "sources phải là mảng {url http(s), credibility}"})
            srcs = []
        if status == "CHUA_KIEM":
            probs.append({"claim": label, "problem": "CHUA_KIEM: chưa kiểm xong"})
        elif status == "SAI":
            probs.append({"claim": label, "problem": "SAI: người kiểm xác định sai"})
        else:
            good = [e for e in srcs if e["credibility"] in ("primary", "secondary")]
            if not good:
                probs.append({"claim": label, "problem": "DAT nhưng không có nguồn primary hoặc secondary"})
            elif re.search(r"\d", c.get("claim") or ""):
                has_primary = any(e["credibility"] == "primary" for e in good)
                if not has_primary and len({d for d in (root_domain(e["url"]) for e in good) if d}) < 2:
                    probs.append({"claim": label, "problem":
                                  "claim về số cần một nguồn primary hoặc hai nguồn khác tên miền gốc"})
    return probs


def _load_claims(ep: Path):
    p = ep / "claims.json"
    if not p.is_file():
        return None, [{"claim": None, "problem": f"thiếu {p}"}]
    try:
        return _read_json(p), []
    except (OSError, ValueError) as e:
        return None, [{"claim": None, "problem": f"claims.json không đọc được: {e}"}]


def unresolved_problems(ep: Path) -> list[dict]:
    """Lô `fact` mới nhất của một claim mà còn phát hiện nặng chưa giải quyết thì chặn,
    cho tới khi có lô fact mới hơn (sau prepare mới) bao claim đó."""
    try:
        ents = Ledger(ep).entries()
    except GateError as e:
        return [{"claim": None, "problem": str(e)}]
    prep = {e.get("note"): set(e.get("claimHashes") or {}) for e in ents if e["stage"] == "fact-prepare"}
    current = None  # id claim đang có trong claims.json; claim đã xoá thì không xét
    try:
        cl = _read_json(ep / "claims.json")
        current = {c.get("id") for c in cl if isinstance(c, dict)}
    except (OSError, ValueError, TypeError):
        pass
    latest: dict = {}
    for e in ents:
        if e["stage"] == "fact":
            for cid in prep.get(e.get("note"), ()):
                if current is None or cid in current:
                    latest[cid] = e
    seen, out = set(), []
    for cid, e in latest.items():
        if e.get("unresolvedSevere") and e["seq"] not in seen:
            seen.add(e["seq"])
            rules = ", ".join(f"{u['rule']} ({u['reason']})" for u in e["unresolvedSevere"])
            out.append({"claim": None, "problem":
                        f"lô {e.get('note')} còn phát hiện nặng chưa giải quyết: {rules}; "
                        "gọi lại fact-checker với lô prepare mới hoặc hỏi người dùng"})
    return out


def gate1(slug: str, episodes_dir="../episodes") -> dict:
    ep = _ep_dir(slug, episodes_dir)
    claims, probs = _load_claims(ep)
    if claims is not None:
        probs = check_claims(claims) + unresolved_problems(ep)
    return {"gate": "gate1", "pass": not probs, "problems": probs}


# ---- gate2 -------------------------------------------------------------------

def _claim_keys(claim_texts: list[str]):
    values, exact, run_lists = set(), set(), []
    for t in claim_texts:
        runs: list[str] = []
        for m in NUMBER_RE.finditer(nfc(t)):
            tok = m.group(0)
            v = number_value(tok)
            if v is not None:
                values.add(v)
            exact.add(tok)
            runs.extend(_runs(tok))
        run_lists.append(runs)
    return values, exact, run_lists


def _in_order(needle: list[str], hay: list[str]) -> bool:
    it = iter(hay)
    return all(any(x == y for y in it) for x in needle)


def _number_covered(token: str, keys) -> bool:
    values, exact, run_lists = keys
    v = number_value(token)
    if v is not None:
        return v in values
    if token in exact:
        return True
    if re.search(r"[:/\-\u2013\u2014]", token):
        need = _runs(token)
        return any(_in_order(need, hay) for hay in run_lists)
    return False


def _fact_problem(ep: Path) -> str | None:
    """claims.json phải đúng bản do apply-factcheck vừa áp (mục sổ `fact` mới nhất)."""
    cp = ep / "claims.json"
    if not cp.is_file():
        return "thiếu claims.json"
    try:
        facts = [e for e in Ledger(ep).entries() if e["stage"] == "fact"]
    except GateError as e:
        return str(e)
    if not facts:
        return "chưa có mục fact trong sổ: claims.json chưa qua apply-factcheck"
    if facts[-1].get("claimsHash") != sha256_file(cp):
        return "claims.json đã đổi sau lần apply-factcheck cuối"
    return None


def gate2(slug: str, episodes_dir="../episodes", write_ledger: bool = True) -> dict:
    from aivideo.episode import validate_script  # nạp muộn: kéo numpy, soundfile

    ep = _ep_dir(slug, episodes_dir)
    problems: list[dict] = []
    sp = ep / "script.json"
    if not sp.is_file():
        return {"gate": "gate2", "pass": False,
                "problems": [{"problem": f"thiếu {sp}"}], "scriptHash": None, "claimsHash": None}
    try:
        doc = _read_json(sp)
    except (OSError, ValueError) as e:
        return {"gate": "gate2", "pass": False, "problems": [{"problem": f"script.json hỏng: {e}"}],
                "scriptHash": None, "claimsHash": None}
    for e in validate_script(doc):
        problems.append({"problem": f"script: {e}"})
    claims, cprobs = _load_claims(ep)
    problems.extend(cprobs)
    by_id: dict = {}
    if claims is not None:
        problems.extend({"problem": f"claims: {p['problem']}", "claim": p["claim"]}
                        for p in check_claims(claims))
        by_id = {c["id"]: c for c in claims if isinstance(c, dict) and isinstance(c.get("id"), str)}
    if not isinstance(doc, dict) or problems and any(p["problem"].startswith("script:")
                                                      for p in problems):
        return {"gate": "gate2", "pass": False, "problems": problems,
                "scriptHash": None, "claimsHash": None}

    for up in unresolved_problems(ep):
        problems.append({"problem": up["problem"]})
    fact_problem = _fact_problem(ep)
    if fact_problem:
        problems.append({"problem": fact_problem})

    beats = {(sc.get("id"), b.get("id")): b for sc, b in _iter_beats(doc)}
    for it in extract_items(doc):
        b = beats[(it["scene"], it["beat"])]
        ids = b.get("claims") or []
        where = {"beat": it["beat"], "kind": it["kind"], "match": it["match"]}
        if not ids:
            problems.append({**where, "problem": "không có claim"})
            continue
        texts, missing = [], []
        for cid in ids:
            c = by_id.get(cid)
            if c is None:
                missing.append(cid)
            elif c.get("status") != "DAT":
                problems.append({**where, "claim": cid,
                                 "problem": f"claim {cid} chưa DAT ({c.get('status')})"})
            else:
                texts.append(c.get("claim") or "")
        for cid in missing:
            problems.append({**where, "claim": cid, "problem": f"claim {cid} không có trong claims.json"})
        if it["kind"] == "number":
            covered = _number_covered(it["match"], _claim_keys(texts))
        else:
            low = nfc(it["match"]).casefold()
            covered = any(low in nfc(t).casefold() for t in texts)
        if not covered and texts:
            problems.append({**where, "problem": "không claim nào của beat chứa số/tên này"})
    h = script_text_hash(doc)
    ch = sha256_file(ep / "claims.json") if (ep / "claims.json").is_file() else None
    ok = not problems
    if ok and write_ledger:
        Ledger(ep).add(stage="cong2", role="sep-tong", verdict="DAT", output_hash=h,
                       claims_hash=ch, script_hash=h)
    return {"gate": "gate2", "pass": ok, "problems": problems, "scriptHash": h, "claimsHash": ch}


# ---- verdict -----------------------------------------------------------------

def evaluate_findings(raw, root=".") -> dict:
    """`raw`: đường dẫn file JSON phát hiện hoặc chuỗi JSON. Trả dict phán quyết."""
    empty = {"kept": [], "dropped": [], "counts": {s: 0 for s in SEVERITIES},
             "complete": False, "findingsHash": None}

    def bad(reason):
        return {**empty, "verdict": "CHUA_DUYET", "reason": reason}

    try:
        if isinstance(raw, Path) or (isinstance(raw, str) and not raw.lstrip().startswith("{")):
            p = Path(raw)
            if not p.is_file():
                return bad(f"thiếu file phát hiện: {p}")
            data = p.read_bytes()
            text = data.decode("utf-8")
        else:
            text = raw
            data = raw.encode("utf-8")
        doc = json.loads(text)
    except (OSError, ValueError) as e:
        return bad(f"không đọc được JSON: {e}")
    if not isinstance(doc, dict) or not isinstance(doc.get("findings"), list):
        return bad('JSON phải là {"findings":[...]}')
    for i, f in enumerate(doc["findings"]):
        if not isinstance(f, dict):
            return bad(f"phát hiện #{i} không phải object")
        for k in FINDING_FIELDS:
            if not _nonempty(f.get(k)):
                return bad(f"phát hiện #{i} thiếu hoặc rỗng: {k}")
        if f["severity"] not in SEVERITIES:
            return bad(f"phát hiện #{i} severity sai: {f['severity']!r}")
    root_p = Path(root).resolve()
    kept, dropped = [], []
    cache: dict = {}
    for f in doc["findings"]:
        target = (root_p / f["file"]).resolve()
        reason = None
        if root_p != target and root_p not in target.parents:
            reason = "file nằm ngoài thư mục gốc"
        elif not target.is_file():
            reason = "file không tồn tại"
        else:
            if target not in cache:
                try:
                    cache[target] = nfc(target.read_text(encoding="utf-8"))
                except (OSError, UnicodeDecodeError):
                    cache[target] = None
            body = cache[target]
            if body is None:
                reason = "không đọc được file"
            elif len(f["quote"]) > MAX_QUOTE:
                reason = f"quote dài quá {MAX_QUOTE} ký tự"
            elif nfc(f["quote"]) not in body and not _in_json_strings(target, body, f["quote"]):
                reason = "quote không có trong file"
        (dropped if reason else kept).append({"finding": f, "reason": reason} if reason else f)
    counts = {s: sum(1 for f in kept if f["severity"] == s) for s in SEVERITIES}
    verdict = "CHAN" if counts["CRITICAL"] else "SUA" if counts["MAJOR"] else "DAT"
    return {"verdict": verdict, "kept": kept, "dropped": dropped, "counts": counts,
            "complete": not dropped, "findingsHash": sha256_bytes(data)}


def _json_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, list):
        for x in node:
            yield from _json_strings(x)
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from _json_strings(k)
            yield from _json_strings(v)


def _in_json_strings(target: Path, body: str, quote: str) -> bool:
    """File .json lưu chuỗi đã escape: quote nguyên văn có thể chỉ khớp giá trị đã giải mã."""
    if target.suffix.lower() != ".json":
        return False
    try:
        doc = json.loads(body)
    except ValueError:
        return False
    q = nfc(quote)
    return any(q in nfc(v) for v in _json_strings(doc))


# ---- sổ tập ------------------------------------------------------------------

def finding_key(f: dict) -> str:
    return hashlib.sha1(f"{f['rule']}|{f['file']}|{nfc(f['quote'])}".encode()).hexdigest()[:12]


_ENTRY_FIELDS = ("seq", "ts", "stage", "role", "pair", "round", "inputHash", "outputHash",
                 "verdict", "scriptHash", "claimsHash", "artifactHash", "findingsHash",
                 "findingKeys", "returnTo", "escalate", "note", "cmd", "claimHashes", "fileHashes", "unresolvedSevere", "prevHash")


def entry_hash(entry: dict) -> str:
    return sha256_bytes(canon({k: v for k, v in entry.items() if k != "entryHash"}).encode("utf-8"))


class Ledger:
    def __init__(self, ep_dir):
        self.dir = Path(ep_dir)
        self.path = self.dir / "ledger.json"

    def load(self) -> dict:
        if not self.path.is_file():
            return {"slug": self.dir.name, "entries": []}
        try:
            doc = _read_json(self.path)
        except (OSError, ValueError) as e:
            raise GateError(f"ledger.json hỏng: {e}") from e
        problem = self.chain_problem(doc)
        if problem:
            raise GateError(f"ledger.json: chuỗi hash vỡ ({problem})")
        return doc

    @staticmethod
    def chain_problem(doc) -> str | None:
        if not isinstance(doc, dict) or not isinstance(doc.get("entries"), list):
            return "sai dạng"
        prev = ""
        for i, e in enumerate(doc["entries"]):
            if not isinstance(e, dict) or e.get("seq") != i + 1:
                return f"mục {i + 1} sai số thứ tự"
            if e.get("prevHash") != prev:
                return f"mục {i + 1} sai prevHash"
            if e.get("entryHash") != entry_hash(e):
                return f"mục {i + 1} bị sửa"
            prev = e["entryHash"]
        return None

    def valid(self) -> bool:
        try:
            self.load()
            return True
        except GateError:
            return False

    def entries(self) -> list[dict]:
        return self.load()["entries"]

    def last(self, stage: str) -> dict | None:
        hit = [e for e in self.entries() if e["stage"] == stage]
        return hit[-1] if hit else None

    @staticmethod
    def _since_dat(entries: list[dict], pair: str) -> list[dict]:
        run: list[dict] = []
        for e in entries:
            if e.get("pair") != pair or not e.get("findingsHash"):
                continue
            if e["verdict"] == "DAT":
                run = []
            else:
                run.append(e)
        return run

    def rounds(self) -> dict:
        ents = self.entries()
        pairs = {e["pair"] for e in ents if e.get("pair") and e.get("findingsHash")}
        return {p: len(self._since_dat(ents, p)) for p in sorted(pairs)}

    def add(self, *, stage: str, role: str, pair: str | None = None, verdict: str | None = None,
            input_hash=None, output_hash=None, script_hash=None, claims_hash=None,
            artifact_hash=None, findings_hash=None, finding_keys=None, return_to=None,
            note=None, cmd=None, claim_hashes=None, file_hashes=None,
            unresolved_severe=None) -> dict:
        """Ghi một mục. Trả {"state":"OK"|"CAN_NGUOI_DUNG", ...}; CAN_NGUOI_DUNG kèm
        `recorded` cho biết mục có được ghi không."""
        doc = self.load()
        ents = doc["entries"]
        checker = findings_hash is not None
        run: list[dict] = []
        if checker:
            if not pair:
                raise GateError("mục người kiểm cần --pair")
            run = self._since_dat(ents, pair)
            if len(run) >= MAX_ROUNDS:
                return {"state": "CAN_NGUOI_DUNG", "recorded": False,
                        "reason": f"cặp {pair} đã đủ {MAX_ROUNDS} vòng chưa đạt"}
        if return_to:
            if sum(1 for e in ents if e.get("returnTo")) >= MAX_CROSS_RETURNS:
                return {"state": "CAN_NGUOI_DUNG", "recorded": False,
                        "reason": f"đã trả xuyên khâu {MAX_CROSS_RETURNS} lần trong tập này"}
        keys = list(finding_keys or [])
        repeated = []
        if checker:
            for k in keys:
                if 1 + sum(1 for e in run if k in (e.get("findingKeys") or [])) >= 2:
                    repeated.append(k)
        entry = {"seq": len(ents) + 1, "ts": _now(), "stage": stage, "role": role, "pair": pair,
                 "round": (len(run) + 1) if checker else None, "inputHash": input_hash,
                 "outputHash": output_hash, "verdict": verdict, "scriptHash": script_hash,
                 "claimsHash": claims_hash, "artifactHash": artifact_hash,
                 "findingsHash": findings_hash, "findingKeys": keys or None,
                 "returnTo": return_to, "escalate": bool(repeated), "note": note, "cmd": cmd,
                 "claimHashes": claim_hashes, "fileHashes": file_hashes,
                 "unresolvedSevere": unresolved_severe,
                 "prevHash": ents[-1]["entryHash"] if ents else ""}
        entry["entryHash"] = entry_hash(entry)
        ents.append(entry)
        _write_json_atomic(self.path, doc)
        out = {"state": "OK", "recorded": True, "seq": entry["seq"], "round": entry["round"],
               "verdict": verdict}
        if repeated:
            out.update(state="CAN_NGUOI_DUNG", reason="lỗi cũ còn sống ở vòng sau", repeated=repeated)
        return out


def _script_hash_of(ep: Path) -> str | None:
    p = ep / "script.json"
    try:
        return script_text_hash(_read_json(p)) if p.is_file() else None
    except (OSError, ValueError):
        return None


def reject_reserved(stage: str) -> None:
    if stage in RESERVED_STAGES:
        raise GateError(f"khâu {stage!r} dành riêng cho gate2, gate3, ledger run; "
                        "ledger add không được ghi")


def ledger_add_findings(ep: Path, *, stage, role, pair, findings, root, input_hash=None,
                        output_hash=None, artifact=None, return_to=None, note=None) -> dict:
    reject_reserved(stage)
    res = evaluate_findings(Path(findings), root)
    if res["verdict"] == "CHUA_DUYET" and res.get("findingsHash") is None:
        findings_hash = sha256_bytes(f"khong-co-json:{findings}".encode())
    else:
        findings_hash = res["findingsHash"]
    keys = [finding_key(f) for f in res["kept"]]
    shash = _script_hash_of(ep)
    ahash = sha256_file(Path(artifact)) if artifact else None
    out = Ledger(ep).add(stage=stage, role=role, pair=pair, verdict=res["verdict"],
                         input_hash=input_hash, output_hash=output_hash, script_hash=shash,
                         artifact_hash=ahash, findings_hash=findings_hash, finding_keys=keys,
                         return_to=return_to, note=note)
    out["verdict"] = res["verdict"]
    out["complete"] = res["complete"]
    if out["recorded"] and stage == "qc" and res["findingsHash"] and shash:
        line = (f"PHAN_QUYET: {res['verdict']} findings_sha256={res['findingsHash']} "
                f"script_sha256={shash}\n")
        hd = ep / "handoff"
        hd.mkdir(parents=True, exist_ok=True)
        (hd / "qc.verdict").write_text(line, encoding="utf-8")
        target = hd / "qc.json"
        if target.resolve() != Path(findings).resolve():
            shutil.copyfile(findings, target)
    return out


LINT_CMD = ["npm", "run", "lint:episode", "--", "{slug}", "--json"]  # chạy trong <repo>/video
KY_THUAT_CMD = [sys.executable, "-m", "aivideo.assemble", "verify", "{slug}"]  # đề mục 10
PHAT_AM_CMD = [sys.executable, "-m", "aivideo.phatam", "check", "{slug}"]  # đề mục 18


def expected_command(stage: str, slug: str) -> list[str]:
    """Lệnh cố định của stage (đọc hằng lúc gọi, để test monkeypatch được)."""
    base = {"lint": LINT_CMD, "ky-thuat": KY_THUAT_CMD, "phat-am": PHAT_AM_CMD}[stage]
    return [x.replace("{slug}", slug) for x in base]


def ledger_run(ep: Path, stage: str) -> dict:
    if stage not in RUN_STAGES:
        raise GateError(f"--stage phải thuộc {RUN_STAGES}")
    cmd = expected_command(stage, ep.name)
    root = ep.resolve().parent.parent
    cwd = root / "video" if stage == "lint" else None
    env = {**os.environ, "AIVIDEO_ROOT": str(root)} if stage != "lint" else None
    try:
        r = subprocess.run(cmd, capture_output=True, text=False, check=False, cwd=cwd, env=env)
    except OSError as e:
        raise GateError(f"không chạy được lệnh {cmd[0]}: {e}") from e
    verdict = "DAT" if r.returncode == 0 else "CHAN"
    out = Ledger(ep).add(stage=stage, role="sep-tong", verdict=verdict,
                         output_hash=sha256_bytes(r.stdout), script_hash=_script_hash_of(ep),
                         cmd=cmd, note=f"mã thoát {r.returncode}")
    out["verdict"] = verdict
    out["exitCode"] = r.returncode
    return out


def ledger_show(ep: Path) -> dict:
    led = Ledger(ep)
    if not led.valid():
        try:
            led.load()
        except GateError as e:
            return {"ok": False, "reason": str(e)}
    ents = led.entries()
    return {"ok": True, "entries": len(ents), "last": ents[-1] if ents else None,
            "scriptHash": _script_hash_of(ep), "rounds": led.rounds()}


def ledger_handoff(ep: Path, khau: str) -> Path:
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", khau):
        raise GateError(f"tên khâu không hợp lệ: {khau!r}")
    p = ep / "handoff" / f"{khau}.md"
    if p.exists():
        raise GateError(f"đã có {p}")
    p.parent.mkdir(parents=True, exist_ok=True)
    body = f"# Trao tay: {khau}\n\n" + "".join(f"## {s}\n\n-\n\n" for s in HANDOFF_SECTIONS)
    p.write_text(body, encoding="utf-8")
    return p


# ---- gate3 -------------------------------------------------------------------

def _speaks_english(ep: Path) -> bool:
    """Lời đọc có đọc từ tiếng Anh nào không (theo `phatam scan`); đọc lỗi thì coi là có."""
    from aivideo import phatam

    try:
        script = _read_json(ep / "script.json")
        lex = phatam.load_lexicon(ep, ep.resolve().parent.parent / "content" / "lexicon.json")
        occ = phatam.find_occurrences(script, lex)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, GateError):
        return True
    return any(o["kind"] != "nghia-viet" for o in occ)


def _kenh_info(kenh: Path):
    """(channelId | None, firstVideoApproved)."""
    if not kenh.is_file():
        return None, False
    try:
        d = _read_json(kenh)
    except (OSError, ValueError):
        return None, False
    if not isinstance(d, dict):
        return None, False
    cid = d.get("channelId")
    return (cid.strip() if _nonempty(cid) else None), d.get("firstVideoApproved") is True


def _check_publish(ep: Path, kenh: Path) -> tuple[bool, str]:
    p = ep / "publish.json"
    if not p.is_file():
        return False, f"thiếu {p}"
    try:
        pub = _read_json(p)
    except (OSError, ValueError) as e:
        return False, f"publish.json hỏng: {e}"
    if not isinstance(pub, dict):
        return False, "publish.json phải là object"
    errs = []
    for k in ("title", "description", "chapters", "thumbnail", "privacy", "channelId"):
        if not _nonempty(pub.get(k)):
            errs.append(f"thiếu {k}")
    tags = pub.get("tags")
    if not (isinstance(tags, list) and tags and all(_nonempty(t) for t in tags)):
        errs.append("tags phải là mảng chuỗi không rỗng")
    if _nonempty(pub.get("title")) and len(pub["title"]) > 100:
        errs.append("title quá 100 ký tự")
    if _nonempty(pub.get("description")) and not re.search(r"\bAI\b", pub["description"]):
        errs.append("description thiếu dòng báo giọng đọc do AI tạo")
    if _nonempty(pub.get("chapters")) and not pub["chapters"].lstrip().startswith("00:00"):
        errs.append("chapters phải bắt đầu bằng 00:00")
    th = pub.get("thumbnail")
    if _nonempty(th):
        tp = (ep / th).resolve()
        if ep.resolve() not in tp.parents or not tp.is_file():
            errs.append("thumbnail không tồn tại trong thư mục tập")
    if pub.get("privacy") not in PRIVACY:
        errs.append(f"privacy phải thuộc {PRIVACY}")
    if pub.get("containsSyntheticMedia") is not False:
        errs.append("containsSyntheticMedia phải là false (D21)")
    name, first_ok = _kenh_info(kenh)
    if name is None:
        errs.append(f"{kenh} thiếu hoặc không có channelId")
    elif _nonempty(pub.get("channelId")) and pub["channelId"].strip() != name:
        errs.append(f"channelId {pub['channelId']!r} khác kênh trong kenh.json {name!r}")
    if name is not None and not first_ok and pub.get("privacy") != "unlisted":
        errs.append("video đầu chưa được duyệt: privacy phải là unlisted")
    return (not errs), ("; ".join(errs) if errs else "đủ trường, đúng kênh")


def _git(ep: Path, *args: str):
    return subprocess.run(["git", "-C", str(ep), *args], capture_output=True, text=True, check=False)


def _check_ledger_git(ep: Path) -> tuple[str, bool, str]:
    name = "so-git"
    if not (ep / "ledger.json").is_file():
        return name, False, "chưa có ledger.json"
    r = _git(ep, "rev-parse", "--show-toplevel")
    if r.returncode != 0:
        return name, False, "không nằm trong kho git, không có neo cho sổ"
    st = _git(ep, "status", "--porcelain", "--", "ledger.json")
    if st.returncode != 0 or st.stdout.strip():
        return name, False, "ledger.json có thay đổi chưa commit (hoặc chưa được theo dõi)"
    lg = _git(ep, "log", "--follow", "--format=%H", "--", "ledger.json")
    commits = [c for c in lg.stdout.split() if c][::-1]
    if not commits:
        return name, False, "ledger.json chưa có commit nào"
    prev = None
    for c in commits:
        sh = _git(ep, "show", f"{c}:./ledger.json")
        if sh.returncode != 0:
            return name, False, f"commit {c[:8]} xoá ledger.json"
        try:
            ents = json.loads(sh.stdout)["entries"]
        except (ValueError, KeyError, TypeError):
            return name, False, f"commit {c[:8]}: ledger.json sai dạng"
        if prev is not None and ents[:len(prev)] != prev:
            return name, False, f"commit {c[:8]} sửa hoặc xoá mục cũ của sổ"
        prev = ents
    return name, True, f"{len(commits)} commit, chỉ thêm"


def _check_qc_evidence(ep: Path, slug: str, video, out_dir: Path, qe) -> tuple[str, bool, str]:
    name = "qc-bang-chung"
    p = ep / "handoff" / "qc.json"
    if not p.is_file():
        return name, False, "thiếu handoff/qc.json"
    try:
        ev = json.loads(p.read_text(encoding="utf-8")).get("evidence")
    except (OSError, ValueError, AttributeError):
        return name, False, "handoff/qc.json hỏng"
    if not isinstance(ev, dict):
        return name, False, "thiếu evidence"
    vh = ev.get("videoSha256")
    if not (isinstance(vh, str) and re.fullmatch(r"[0-9a-f]{64}", vh)):
        return name, False, "evidence.videoSha256 sai dạng"
    ref = sha256_file(Path(video)) if video and Path(video).is_file() else (qe or {}).get("artifactHash")
    if vh != ref:
        return name, False, "videoSha256 khác MP4"
    frames = ev.get("frames")
    if not (isinstance(frames, list) and all(isinstance(t, (int, float)) and not isinstance(t, bool)
                                              and t >= 0 for t in frames)):
        return name, False, "evidence.frames phải là mảng mốc giây >= 0"
    if len(set(frames)) < MIN_FRAMES:
        return name, False, f"cần ít nhất {MIN_FRAMES} khung khác nhau, có {len(set(frames))}"
    loud = ev.get("loudness")
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)  # noqa: E731
    if not (isinstance(loud, dict) and num(loud.get("lufs")) and num(loud.get("truePeak"))):
        return name, False, "evidence.loudness phải là {lufs, truePeak} (số)"
    tp = out_dir / slug / "timeline.json"
    try:
        tl = json.loads(tp.read_text(encoding="utf-8"))
        starts = [c["startFrame"] / tl.get("fps", 30) for c in tl["chapters"]]
        end = tl["durationInFrames"] / tl.get("fps", 30)
    except (OSError, ValueError, KeyError, TypeError):
        return name, False, f"không đọc được chương từ {tp}"
    bounds = starts + [end]
    for i in range(len(starts)):
        if not any(bounds[i] <= t < bounds[i + 1] for t in frames):
            return name, False, f"chương {i + 1} không có khung nào"
    return name, True, f"{len(set(frames))} khung, {len(starts)} chương"


def gate3(slug: str, episodes_dir="../episodes", kenh_path=None, video=None, out_dir=None) -> dict:
    ep = _ep_dir(slug, episodes_dir)
    kenh = Path(kenh_path) if kenh_path else Path(episodes_dir).resolve().parent / ".team" / "kenh.json"
    checks: list[dict] = []

    def add(name, ok, detail=""):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    led = Ledger(ep)
    try:
        ents = led.entries()
        add("chuoi-so", True, f"{len(ents)} mục")
    except GateError as e:
        add("chuoi-so", False, str(e))
        ents = []
    cur = _script_hash_of(ep)
    cur_claims = sha256_file(ep / "claims.json") if (ep / "claims.json").is_file() else None

    def last(stage):
        hit = [e for e in ents if e["stage"] == stage]
        return hit[-1] if hit else None

    c2 = last("cong2")
    if cur is None:
        add("hash-kich-ban", False, "không đọc được script.json")
    elif not c2 or c2.get("verdict") != "DAT":
        add("hash-kich-ban", False, "chưa qua Cổng 2")
    elif c2.get("outputHash") != cur:
        add("hash-kich-ban", False, "kịch bản đã đổi sau Cổng 2")
    elif c2.get("claimsHash") != cur_claims:
        add("hash-kich-ban", False, "claims.json đã đổi sau Cổng 2")
    else:
        add("hash-kich-ban", True, cur)
    # tự chạy lại kiểm của Cổng 2 trên dữ liệu hiện tại, không tin mục cong2
    if not (ep / "claims.json").is_file():
        add("cong2-lai", False, "thiếu claims.json")
    else:
        try:
            g2 = gate2(slug, episodes_dir, write_ledger=False)
            add("cong2-lai", g2["pass"],
                "đạt" if g2["pass"] else f"{len(g2['problems'])} vấn đề, vd {g2['problems'][0]}")
        except GateError as e:
            add("cong2-lai", False, str(e))
    for stage in ("lint", "ky-thuat", "phat-am", "qc"):
        e = last(stage)
        if stage == "phat-am" and not _speaks_english(ep):
            add(stage, True, "lời đọc không có từ tiếng Anh")
        elif not e:
            add(stage, False, "chưa có mục trong sổ tập")
        elif e.get("verdict") != "DAT":
            add(stage, False, f"phán quyết {e.get('verdict')}")
        elif e.get("scriptHash") != cur:
            add(stage, False, "chạy trên bản kịch bản cũ")
        elif stage in RUN_STAGES and e.get("cmd") != expected_command(stage, slug):
            add(stage, False, "lệnh đã chạy khác lệnh cố định của stage")
        else:
            add(stage, True, f"seq {e['seq']}")
    # dòng phán quyết qc
    vp = ep / "handoff" / "qc.verdict"
    line_re = re.compile(r"^PHAN_QUYET: DAT findings_sha256=([0-9a-f]{64}) script_sha256=([0-9a-f]{64})$")
    if not vp.is_file():
        add("qc-dong-phan-quyet", False, "thiếu handoff/qc.verdict")
    else:
        lines = [x for x in vp.read_text(encoding="utf-8").splitlines() if x.strip()]
        m = line_re.match(lines[0]) if len(lines) == 1 else None
        qe = last("qc")
        if not m:
            add("qc-dong-phan-quyet", False, "dòng phán quyết sai định dạng hoặc không phải DAT")
        elif m.group(2) != cur:
            add("qc-dong-phan-quyet", False, "script_sha256 không khớp kịch bản hiện tại")
        elif qe and qe.get("findingsHash") != m.group(1):
            add("qc-dong-phan-quyet", False, "findings_sha256 không khớp sổ tập")
        elif not (ep / "handoff" / "qc.json").is_file() \
                or sha256_file(ep / "handoff" / "qc.json") != m.group(1):
            add("qc-dong-phan-quyet", False, "handoff/qc.json khác findings_sha256 (sửa sau khi ghi sổ)")
        else:
            add("qc-dong-phan-quyet", True)
    add(*_check_ledger_git(ep))
    add(*_check_qc_evidence(ep, slug, video, Path(out_dir) if out_dir else
                            Path(episodes_dir).resolve().parent / "out" / "episodes", last("qc")))
    if video:
        qe = last("qc")
        vf = Path(video)
        if not vf.is_file():
            add("qc-video", False, f"thiếu {vf}")
        elif not qe or qe.get("artifactHash") != sha256_file(vf):
            add("qc-video", False, "video khác bản qc đã duyệt")
        else:
            add("qc-video", True)
    ok, detail = _check_publish(ep, kenh)
    add("publish", ok, detail)
    passed = all(c["ok"] for c in checks)
    if passed:
        Ledger(ep).add(stage="cong3", role="sep-tong", verdict="DAT", output_hash=cur,
                       script_hash=cur, claims_hash=cur_claims)
    return {"gate": "gate3", "pass": passed, "checks": checks}


# ---- fact-checker mù ---------------------------------------------------------

def build_factcheck_prompt(role_text: str, batch_dir) -> str:
    batch = Path(batch_dir)
    prompt = (f"{role_text.rstrip()}\n\n---\n\n"
              f"Thư mục lô của bạn: {batch}\n"
              f"Đọc {batch / 'items.json'}: mỗi phần tử có id, claim, question, sourceUrls.\n"
              "Kiểm từng claim từ nguồn, rồi trả đúng một object JSON "
              '{"findings":[{"severity","rule","file","quote","failing_case","owner"}]}. '
              'rule dạng "claim:<id>", file là "items.json", quote là trích nguyên văn claim.\n')
    low = prompt.casefold()
    for bad in FORBIDDEN_IN_BLIND_PROMPT:
        if bad.casefold() in low:
            raise GateError(f"prompt fact-checker chứa chuỗi cấm: {bad!r}")
    return prompt


def _inside(child: Path, parent: Path) -> bool:
    c, p = child.resolve(), parent.resolve()
    return c == p or p in c.parents


def _batch_file_hashes(batch) -> dict:
    return {p.name: sha256_file(p) for p in sorted(Path(batch).iterdir()) if p.is_file()}


def claim_hash(c: dict) -> str:
    """Hash của claim, không tính `status` (apply-factcheck đổi status)."""
    return sha256_bytes(canon({k: v for k, v in c.items() if k != "status"}).encode("utf-8"))


def prepare_factcheck(slug: str, episodes_dir, role_file, tmp_parent=None,
                      with_lines: bool = False) -> dict:
    """Lô cho fact-checker. `with_lines` (lượt 2): thêm vào mỗi claim các câu lời đọc trỏ tới
    claim đó (chỉ chữ của beat, không kèm file kịch bản), để hỏi "câu này nói đúng claim không"."""
    ep = _ep_dir(slug, episodes_dir)
    claims, probs = _load_claims(ep)
    if claims is None:
        raise GateError(probs[0]["problem"])
    if not isinstance(claims, list):
        raise GateError("claims.json phải là mảng")
    items = []
    for c in claims:
        if not isinstance(c, dict) or not all(_nonempty(c.get(k)) for k in ("id", "claim", "question")):
            raise GateError("claims.json có phần tử thiếu id, claim hoặc question")
        items.append({"id": c["id"], "claim": c["claim"], "question": c["question"],
                      "sourceUrls": [e["url"] for e in c.get("sources") or []
                                     if isinstance(e, dict) and isinstance(e.get("url"), str)]})
    if with_lines:
        sp = ep / "script.json"
        if not sp.is_file():
            raise GateError(f"thiếu {sp}")
        lines: dict[str, list[str]] = {}
        for _, b in _iter_beats(_read_json(sp)):
            for cid in b.get("claims") or []:
                # câu người xem nghe được: `spoken` (nếu có) thay `text` khi dựng giọng
                said = b["spoken"] if isinstance(b.get("spoken"), str) and b["spoken"].strip() else b.get("text")
                lines.setdefault(cid, []).append(said or "")
        for it in items:
            it["lines"] = lines.get(it["id"], [])
    role_text = Path(role_file).read_text(encoding="utf-8")
    parent = Path(tmp_parent) if tmp_parent else Path(tempfile.gettempdir())
    repo = Path(episodes_dir).resolve().parent
    if _inside(parent, repo):
        raise GateError("thư mục tạm của lô phải nằm ngoài repo")
    parent.mkdir(parents=True, exist_ok=True)
    # kiểm prompt trước khi tạo gì
    placeholder = build_factcheck_prompt(role_text, parent / "lo-xxxxxxxx")
    del placeholder
    batch = Path(tempfile.mkdtemp(prefix="lo-", dir=parent))
    if _inside(batch, repo):
        raise GateError("thư mục tạm của lô phải nằm ngoài repo")
    _write_json_atomic(batch / "items.json", items)
    (batch / "prompt.txt").write_text(build_factcheck_prompt(role_text, batch), encoding="utf-8")
    Ledger(ep).add(stage="fact-prepare", role="sep-tong", note=batch.name,
                   file_hashes=_batch_file_hashes(batch),
                   claim_hashes={c["id"]: claim_hash(c) for c in claims},
                   claims_hash=sha256_file(ep / "claims.json"))
    return {"batchDir": str(batch), "items": str(batch / "items.json"),
            "prompt": str(batch / "prompt.txt")}


def apply_factcheck(slug: str, episodes_dir, findings, batch) -> dict:
    ep = _ep_dir(slug, episodes_dir)
    res = evaluate_findings(Path(findings), batch)
    if res["verdict"] == "CHUA_DUYET":
        raise GateError(f"phát hiện chưa duyệt: {res.get('reason')}")
    items = _read_json(Path(batch) / "items.json")
    claims, probs = _load_claims(ep)
    if claims is None:
        raise GateError(probs[0]["problem"])
    led = Ledger(ep)
    prep = [e for e in led.entries() if e["stage"] == "fact-prepare" and e.get("note") == Path(batch).name]
    if not prep:
        raise GateError("sổ tập không có mục fact-prepare cho lô này: lô không do prepare-factcheck tạo")
    recorded = prep[-1].get("fileHashes") or {}
    if "items.json" not in recorded:
        raise GateError("mục fact-prepare không ghi hash của items.json")
    bad = [n for n, h in recorded.items()
           if not (Path(batch) / n).is_file() or sha256_file(Path(batch) / n) != h]
    if bad:
        raise GateError(f"file của lô khác lúc prepare-factcheck: {', '.join(bad)}; tạo lô mới")
    if any(e["stage"] == "fact" and e.get("note") == Path(batch).name for e in led.entries()):
        raise GateError("lô này đã được apply; muốn kiểm lại phải prepare-factcheck lô mới")
    saved = prep[-1].get("claimHashes") or {}
    if not isinstance(items, list) or sorted(str(it.get("id")) for it in items) != sorted(saved):
        raise GateError("tập id trong items.json khác tập claim lúc prepare-factcheck; tạo lô mới")
    now = {c.get("id"): claim_hash(c) for c in claims if isinstance(c, dict)}
    changed = [cid for cid in saved if now.get(cid) != saved[cid]]
    if changed:
        raise GateError(f"claim đã đổi sau prepare-factcheck: {', '.join(changed)}; tạo lô mới")
    status = {it["id"]: "DAT" for it in items}
    unmapped = []
    for f in res["kept"]:
        m = re.fullmatch(r"claim:\s*(.+?)\s*", f["rule"])
        if not m or m.group(1) not in status:
            unmapped.append(f)
            continue
        cid = m.group(1)
        if f["severity"] == "CRITICAL":
            status[cid] = "SAI"
        elif f["severity"] == "MAJOR" and status[cid] != "SAI":
            status[cid] = "CHUA_KIEM"
    for c in claims:
        if c.get("id") in status:
            c["status"] = status[c["id"]]
        else:  # claim thêm sau prepare, chưa qua lô nào
            c["status"] = "CHUA_KIEM"
    _write_json_atomic(ep / "claims.json", claims)
    severe = [{"severity": d["finding"]["severity"], "rule": d["finding"]["rule"],
               "reason": d["reason"]} for d in res["dropped"]
              if d["finding"]["severity"] in COUNTED]
    severe += [{"severity": f["severity"], "rule": f["rule"],
                "reason": "rule không ánh xạ được tới claim trong lô"}
               for f in unmapped if f["severity"] in COUNTED]
    led.add(stage="fact", role="sep-tong", verdict=res["verdict"], note=Path(batch).name,
            claims_hash=sha256_file(ep / "claims.json"), output_hash=res["findingsHash"],
            unresolved_severe=severe or None)
    return {"verdict": res["verdict"], "updated": status, "unmapped": unmapped,
            "complete": res["complete"], "unresolvedSevere": severe}


# ---- CLI ---------------------------------------------------------------------

def _emit(obj) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    try:
        return _main(argv)
    except (GateError, ValueError, RuntimeError, OSError, KeyError, TypeError, AttributeError) as e:
        print(f"lỗi: {e}", file=sys.stderr)
        return 1


def _main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="aivideo.gates")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def with_eps(p):
        p.add_argument("--episodes-dir", default="../episodes")
        return p

    p = sub.add_parser("extract-claims")
    p.add_argument("script")
    p.add_argument("-o", "--output")
    p = with_eps(sub.add_parser("gate1"))
    p.add_argument("slug")
    p = with_eps(sub.add_parser("gate2"))
    p.add_argument("slug")
    p.add_argument("--no-ledger", action="store_true")
    p = with_eps(sub.add_parser("gate3"))
    p.add_argument("slug")
    p.add_argument("--kenh")
    p.add_argument("--video")
    p.add_argument("--out-dir")
    p = sub.add_parser("verdict")
    p.add_argument("findings")
    p.add_argument("--root", default=".")
    p = with_eps(sub.add_parser("prepare-factcheck"))
    p.add_argument("slug")
    p.add_argument("--role", required=True)
    p.add_argument("--tmp-parent")
    p.add_argument("--with-lines", action="store_true")
    p = with_eps(sub.add_parser("apply-factcheck"))
    p.add_argument("slug")
    p.add_argument("--findings", required=True)
    p.add_argument("--batch", required=True)

    lp = sub.add_parser("ledger")
    lsub = lp.add_subparsers(dest="lcmd", required=True)
    p = with_eps(lsub.add_parser("add"))
    p.add_argument("slug")
    p.add_argument("--stage", required=True)
    p.add_argument("--role", required=True)
    p.add_argument("--pair")
    p.add_argument("--findings")
    p.add_argument("--root", default=".")
    p.add_argument("--input-hash")
    p.add_argument("--output-hash")
    p.add_argument("--artifact")
    p.add_argument("--return-to")
    p.add_argument("--note")
    p = with_eps(lsub.add_parser("run"))
    p.add_argument("slug")
    p.add_argument("--stage", required=True)
    p = with_eps(lsub.add_parser("show"))
    p.add_argument("slug")
    p = with_eps(lsub.add_parser("handoff"))
    p.add_argument("slug")
    p.add_argument("khau")

    a = ap.parse_args(argv)

    if a.cmd == "extract-claims":
        items = extract_items(_read_json(Path(a.script)))
        if a.output:
            _write_json_atomic(Path(a.output), items)
        _emit(items)
        return 0
    if a.cmd == "gate1":
        r = gate1(a.slug, a.episodes_dir)
        _emit(r)
        return 0 if r["pass"] else 1
    if a.cmd == "gate2":
        r = gate2(a.slug, a.episodes_dir, write_ledger=not a.no_ledger)
        _emit(r)
        return 0 if r["pass"] else 1
    if a.cmd == "gate3":
        if not a.video:
            print("cảnh báo: không có --video, gate3 không so MP4 thật với bằng chứng qc",
                  file=sys.stderr)
        r = gate3(a.slug, a.episodes_dir, a.kenh, a.video, a.out_dir)
        _emit(r)
        return 0 if r["pass"] else 1
    if a.cmd == "verdict":
        r = evaluate_findings(Path(a.findings), a.root)
        _emit(r)
        return 0 if r["verdict"] == "DAT" else 1
    if a.cmd == "prepare-factcheck":
        _emit(prepare_factcheck(a.slug, a.episodes_dir, a.role, a.tmp_parent, a.with_lines))
        return 0
    if a.cmd == "apply-factcheck":
        r = apply_factcheck(a.slug, a.episodes_dir, a.findings, a.batch)
        _emit(r)
        if r["unresolvedSevere"]:
            for u in r["unresolvedSevere"]:
                print(f"chưa giải quyết: {u['severity']} {u['rule']}: {u['reason']}", file=sys.stderr)
            print("gọi lại fact-checker (prepare-factcheck lô mới) hoặc hỏi người dùng",
                  file=sys.stderr)
            return 3
        return 0
    # ledger
    ep = _ep_dir(a.slug, a.episodes_dir)
    if a.lcmd == "add":
        reject_reserved(a.stage)
        if a.findings:
            r = ledger_add_findings(ep, stage=a.stage, role=a.role, pair=a.pair, findings=a.findings,
                                    root=a.root, input_hash=a.input_hash, output_hash=a.output_hash,
                                    artifact=a.artifact, return_to=a.return_to, note=a.note)
        else:
            r = Ledger(ep).add(stage=a.stage, role=a.role, pair=a.pair, input_hash=a.input_hash,
                               output_hash=a.output_hash, script_hash=_script_hash_of(ep),
                               artifact_hash=sha256_file(Path(a.artifact)) if a.artifact else None,
                               return_to=a.return_to, note=a.note)
        _emit(r)
        return 3 if r["state"] == "CAN_NGUOI_DUNG" else 0
    if a.lcmd == "run":
        r = ledger_run(ep, a.stage)
        _emit(r)
        return 0 if r["verdict"] == "DAT" else 1
    if a.lcmd == "show":
        r = ledger_show(ep)
        _emit(r)
        return 0 if r["ok"] else 1
    if a.lcmd == "handoff":
        path = ledger_handoff(ep, a.khau)
        _emit({"created": str(path)})
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
