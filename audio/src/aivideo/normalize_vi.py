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


def _leftover(m: re.Match) -> str:
    s = m.string
    w = _small(m.group(0))
    if m.start() > 0 and s[m.start() - 1].isalnum():
        w = " " + w
    if m.end() < len(s) and s[m.end()].isalnum():
        w += " "
    return w


def normalize_vi(text: str) -> str:
    """Đổi mọi chữ số thành chữ; kết quả không còn ký tự 0-9."""
    # giờ 12:30
    text = re.sub(r"(?<![\d:])(\d{1,2}):(\d{2})(?![\d:])",
                  lambda m: f"{audio.number_to_words(int(m.group(1)))} giờ{_minutes(m.group(2))}", text)
    # phân số 1/2
    text = re.sub(r"(?<![\w/])(\d+)/(\d+)(?![\w/])",
                  lambda m: f"{_number_words(m.group(1))} phần {_number_words(m.group(2))}", text)
    # khoảng: số - số, số – số
    text = re.sub(r"(?<=\d)\s*[–—]\s*(?=\d)", " đến ", text)
    text = re.sub(r"(?<=[\d%])-(?=\d)", " đến ", text)
    # số âm
    text = re.sub(r"(?:(?<=^)|(?<=[\s(]))-(?=\d)", "âm ", text)
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


def speak(text: str, lexicon: dict[str, str]) -> str:
    return audio.normalize_text(normalize_vi(text), lexicon)
