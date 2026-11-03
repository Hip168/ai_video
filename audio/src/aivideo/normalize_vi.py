"""Chuẩn hoá lời đọc tiếng Việt: số thập phân, nghìn, %, đơn vị, năm, khoảng."""
from __future__ import annotations

import re

from aivideo import audio

_DIGITS = audio._DIGITS

# Đơn vị đứng ngay sau số; phân biệt hoa thường.
UNITS: dict[str, str] = {
    "Hz": "héc", "kHz": "ki-lô-héc", "MHz": "mê-ga-héc", "GHz": "gi-ga-héc",
    "KB": "ki-lô-bai", "MB": "mê-ga-bai", "GB": "gi-ga-bai", "TB": "tê-ra-bai",
    "Kbps": "ki-lô-bít trên giây", "Mbps": "mê-ga-bít trên giây", "Gbps": "gi-ga-bít trên giây",
    "ns": "na-nô giây", "µs": "micro giây", "ms": "mili giây", "s": "giây",
    "km/h": "ki-lô-mét trên giờ", "km": "ki-lô-mét", "cm": "xen-ti-mét", "mm": "mi-li-mét",
    "kg": "ki-lô-gam", "°C": "độ xê", "đ": "đồng", "₫": "đồng",
}

_THOUSANDS = r"[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?"
_NUM = _THOUSANDS + r"|\d+(?:[.,]\d+)?"
_UNIT_KEYS = "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True))


def int_to_words(n: int) -> str:
    """Số nguyên >= 0 thành chữ, hỗ trợ tới 999 tỷ."""
    if n >= 1_000_000_000:
        ty, rest = divmod(n, 1_000_000_000)
        head = int_to_words(ty) + " tỷ"
        if rest == 0:
            return head
        tail = audio.number_to_words(rest)
        if rest < 10:
            tail = "không trăm linh " + tail
        elif rest < 100:
            tail = "không trăm " + tail
        return f"{head} {tail}"
    return audio.number_to_words(n)


def _digit_by_digit(d: str) -> str:
    return " ".join(_DIGITS[int(c)] for c in d)


def _small(d: str) -> str:
    """Chuỗi chữ số dính chữ: tối đa 2 chữ số đọc như số, từ 3 trở lên đọc từng chữ số."""
    return audio.number_to_words(int(d)) if len(d) <= 2 else _digit_by_digit(d)


def _number_words(tok: str) -> str:
    """Một số theo kiểu Việt: '.' nhóm nghìn (phần nguyên khác 0), ',' hoặc '.' thập phân."""
    if re.fullmatch(r"0\d+", tok):
        return _digit_by_digit(tok)
    if re.fullmatch(_THOUSANDS, tok):
        whole, _, frac = tok.replace(".", "").partition(",")
    else:
        whole, _, frac = tok.replace(",", ".").partition(".")
    out = int_to_words(int(whole))
    if frac:
        if len(frac) <= 2:
            tail = ("không " + _DIGITS[int(frac[1])] if frac[0] == "0" and len(frac) == 2
                    else audio.number_to_words(int(frac)))
        else:
            tail = _digit_by_digit(frac)
        out += " phẩy " + tail
    return out


def _minutes(m: str) -> str:
    n = int(m)
    if n == 0:
        return ""
    return " " + ("không " + _DIGITS[n] if n < 10 else audio.number_to_words(n))


def _mm(m: str) -> str:
    n = int(m)
    return ("không " + _DIGITS[n]) if m[0] == "0" and n else audio.number_to_words(n)


def _leftover(m: re.Match) -> str:
    s = m.string
    w = _small(m.group(0))
    if m.start() > 0 and s[m.start() - 1].isalnum():
        w = " " + w
    if m.end() < len(s) and s[m.end()].isalnum():
        w += " "
    return w


_DOTTED = r"\d+(?:\.\d+)+"


def _is_ip(groups: list[str]) -> bool:
    if not (len(groups) == 4 and all(1 <= len(g) <= 3 and int(g) <= 255 for g in groups)):
        return False
    rest = groups[1:]
    return not (all(len(g) == 3 for g in rest) and "000" in rest)


def _dotted(m: re.Match) -> str:
    """Chuỗi số nối '.' theo thứ tự: IP, số nghìn, phiên bản, (thập phân: để nguyên)."""
    tok, port = m.group(1), m.group(2)
    groups = tok.split(".")
    before = m.string[m.start() - 1] if m.start() > 0 else ""
    if _is_ip(groups):  # mỗi nhóm đọc theo giá trị: 000 -> không, 010 -> mười
        out = " chấm ".join(audio.number_to_words(int(g)) for g in groups)
    elif re.fullmatch(_THOUSANDS, tok):
        if not port:
            return m.group(0)  # số nghìn: để các bước sau (khoảng, đơn vị, số trần) xử lý
        out = _number_words(tok)
    elif len(groups) >= 3 or before.isalpha():
        out = " chấm ".join(_number_words(g) for g in groups)
    else:
        return m.group(0)  # hai nhóm, không chữ phía trước: thập phân, xử lý ở bước sau
    if port:
        out += " cổng " + _number_words(port)
    if m.group(3):
        out += " "
    if before.isalnum():
        out = " " + out
    return out


def _iso_date(m: re.Match) -> str:
    y, mo, d = (int(g) for g in m.groups())
    return f"ngày {audio.number_to_words(d)} tháng {audio.number_to_words(mo)} năm {audio.number_to_words(y)}"


def normalize_vi(text: str) -> str:
    """Đổi mọi chữ số thành chữ; kết quả không còn ký tự 0-9."""
    # ngày ISO 2024-01-15
    text = re.sub(r"(?<![\w.,/-])(\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])(?![\w.,/-])",
                  lambda m: _iso_date(re.match(r"(\d+)-(\d+)-(\d+)", m.group(0))), text)
    # IP, phiên bản: từ 3 nhóm nối bằng '.', tuỳ chọn ':cổng'
    text = re.sub(rf"(?<![\d.,])({_DOTTED})(?::(\d+))?(?![\w]|[.,]\d)(-?)", _dotted, text)
    # giờ:phút:giây 12:30:45
    text = re.sub(r"(?<![\w.:])([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)(?![\d:])",
                  lambda m: (f"{audio.number_to_words(int(m.group(1)))} giờ {_mm(m.group(2))} phút "
                             f"{_mm(m.group(3))} giây"), text)
    # giờ 12:30
    text = re.sub(r"(?<![\w.:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])",
                  lambda m: f"{audio.number_to_words(int(m.group(1)))} giờ{_minutes(m.group(2))}", text)
    # phân số 1/2
    text = re.sub(r"(?<![\w/])(\d+)/(\d+)(?![\w/])",
                  lambda m: f"{_number_words(m.group(1))} phần {_number_words(m.group(2))}", text)
    # khoảng: hai bên là số trần đứng riêng
    text = re.sub(rf"(?<![\w.,/:-])({_NUM}%?)\s*[–—-]\s*({_NUM})(?:(?![\w.,/:-])|(?=(?:{_UNIT_KEYS})(?!\w)))",
                  lambda m: f"{m.group(1)} đến {m.group(2)}", text)
    # số âm
    text = re.sub(r"(?:(?<=^)|(?<=[\s(]))-(?=\d)", "âm ", text)
    # '-' còn lại sát chữ số đọc như khoảng trắng (x86-64)
    text = re.sub(r"(?<=\d)-|-(?=\d)", " ", text)
    # kích thước 1920x1080
    text = re.sub(r"(?<=\d)\s?[x×]\s?(?=\d)", " nhân ", text)
    # phần trăm
    text = re.sub(rf"(?<![\w.,])({_NUM})\s?%", lambda m: _number_words(m.group(1)) + " phần trăm", text)
    # đơn vị
    text = re.sub(rf"(?<![\w.,])({_NUM})\s?({_UNIT_KEYS})(?!\w)",
                  lambda m: f"{_number_words(m.group(1))} {UNITS[m.group(2)]}", text)
    # số còn lại (nghìn, thập phân, số trần)
    text = re.sub(rf"(?<![\w.,])({_NUM})(?![\w])", lambda m: _number_words(m.group(1)), text)
    # chữ số dính chữ hoặc sót (v2, 4K, 1080p...)
    return re.sub(r"\d+", _leftover, text)


def apply_lexicon(text: str, lexicon: dict[str, str]) -> str:
    """Thay từ theo bảng phát âm (nguyên từ, không phân biệt hoa thường), một lượt."""
    if not lexicon:
        return text
    keys = sorted(lexicon, key=len, reverse=True)
    lowered = {k.lower(): v for k, v in lexicon.items()}
    pattern = r"(?<!\w)(" + "|".join(re.escape(k) for k in keys) + r")(?!\w)"
    return re.sub(pattern, lambda m: lowered[m.group(1).lower()], text, flags=re.IGNORECASE)


def speak(text: str, lexicon: dict[str, str]) -> str:
    """Bảng phát âm trên chữ gốc, rồi `normalize_vi`."""
    return audio.normalize_text(normalize_vi(apply_lexicon(text, lexicon)), {})
