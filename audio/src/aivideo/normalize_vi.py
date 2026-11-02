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
    "kg": "ki-lô-gam", "°C": "độ xê",
}

_NUM = r"\d+(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?"
_UNIT_KEYS = "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True))


def int_to_words(n: int) -> str:
    """Số nguyên >= 0 thành chữ, hỗ trợ tới 999 tỷ."""
    if n >= 1_000_000_000:
        ty, rest = divmod(n, 1_000_000_000)
        head = int_to_words(ty) + " tỷ"
        if rest == 0:
            return head
        tail = audio.number_to_words(rest)
        if rest < 1000:
            tail = "không trăm " + (tail if rest >= 10 else "linh " + tail)
        return f"{head} {tail}"
    return audio.number_to_words(n)


def _number_words(tok: str) -> str:
    """Một số theo kiểu Việt: '.' nhóm nghìn, ',' thập phân (hoặc '.' + 1-2 hay 4+ chữ số)."""
    if re.fullmatch(r"\d+(?:\.\d{3})+(?:,\d+)?", tok):
        whole, _, frac = tok.replace(".", "").partition(",")
    else:
        whole, _, frac = tok.replace(",", ".").partition(".")
    out = int_to_words(int(whole))
    if frac:
        if len(frac) <= 2:
            tail = ("không " + _DIGITS[int(frac[1])] if frac[0] == "0" and len(frac) == 2
                    else audio.number_to_words(int(frac)))
        else:
            tail = " ".join(_DIGITS[int(c)] for c in frac)
        out += " phẩy " + tail
    return out


def normalize_vi(text: str) -> str:
    # khoảng: số - số, số – số
    text = re.sub(r"(?<=\d)\s*[–—]\s*(?=\d)", " đến ", text)
    text = re.sub(r"(?<=[\d%])-(?=\d)", " đến ", text)
    # kích thước 1920x1080
    text = re.sub(r"(?<=\d)\s?[x×]\s?(?=\d)", " nhân ", text)
    # phần trăm
    text = re.sub(rf"({_NUM})\s?%", lambda m: _number_words(m.group(1)) + " phần trăm", text)
    # đơn vị
    text = re.sub(rf"(?<![\w.,])({_NUM})\s?({_UNIT_KEYS})(?!\w)",
                  lambda m: f"{_number_words(m.group(1))} {UNITS[m.group(2)]}", text)
    # số còn lại (nghìn, thập phân, số trần)
    text = re.sub(rf"(?<![\w.,])({_NUM})(?![\w])", lambda m: _number_words(m.group(1)), text)
    # chữ số dính chữ (vd 'v2') còn lại: normalize_text xử lý tiếp
    return text


def speak(text: str, lexicon: dict[str, str]) -> str:
    return audio.normalize_text(normalize_vi(text), lexicon)
