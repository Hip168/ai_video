"""SFX sinh bằng numpy (đề mục 9). Không tải gì, không commit media."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
NAMES = ("pop", "tick", "whoosh", "ding", "buzz")
_PEAK = 0.9


def _t(dur: float, sr: int) -> np.ndarray:
    return np.arange(int(round(dur * sr))) / sr


def _pop(sr: int) -> np.ndarray:
    t = _t(0.12, sr)
    f = 700 * np.exp(-t * 18) + 180          # tần số rơi nhanh
    phase = 2 * np.pi * np.cumsum(f) / sr
    return np.sin(phase) * np.exp(-t * 35)


def _tick(sr: int) -> np.ndarray:
    t = _t(0.05, sr)
    rng = np.random.default_rng(1)
    return (rng.standard_normal(t.size) * 0.5 + np.sin(2 * np.pi * 2400 * t)) * np.exp(-t * 120)


def _whoosh(sr: int) -> np.ndarray:
    dur = 0.7
    t = _t(dur, sr)
    rng = np.random.default_rng(2)
    noise = rng.standard_normal(t.size)
    # lọc thông thấp một cực có tần số cắt quét lên rồi xuống
    fc = 400 + 5000 * np.sin(np.pi * t / dur) ** 2
    a = np.exp(-2 * np.pi * fc / sr)
    y = np.empty_like(noise)
    prev = 0.0
    for i in range(noise.size):
        prev = (1 - a[i]) * noise[i] + a[i] * prev
        y[i] = prev
    y = y / np.sqrt((1 - a) / (1 + a))  # cân biên độ theo tần số cắt
    env = (0.35 + 0.65 * np.sin(np.pi * t / dur) ** 2) * np.minimum(1.0, (dur - t) / 0.03)
    return y * env  # còn tiếng ngay đầu để mốc thời gian rõ


def _ding(sr: int) -> np.ndarray:
    t = _t(0.9, sr)
    y = np.sin(2 * np.pi * 1318.5 * t) + 0.4 * np.sin(2 * np.pi * 2637 * t) + 0.2 * np.sin(2 * np.pi * 3951 * t)
    return y * np.exp(-t * 5)


def _buzz(sr: int) -> np.ndarray:
    t = _t(0.35, sr)
    saw = 2 * ((110 * t) % 1.0) - 1
    sq = np.sign(np.sin(2 * np.pi * 110 * t))
    return (0.6 * saw + 0.4 * sq) * np.minimum(1.0, (0.35 - t) / 0.03)


_MAKERS = {"pop": _pop, "tick": _tick, "whoosh": _whoosh, "ding": _ding, "buzz": _buzz}


def generate(name: str, sr: int = SR) -> np.ndarray:
    if name not in _MAKERS:
        raise ValueError(f"SFX không có: {name!r}; hợp lệ: {', '.join(NAMES)}")
    y = np.asarray(_MAKERS[name](sr), dtype=np.float64)
    # ngắn dần ở 2 mẫu cuối để kết thúc về 0
    y[-1] = 0.0
    y = y * (_PEAK / np.max(np.abs(y)))
    y[-1] = 0.0
    return y.astype(np.float32)


def render_bus(events: list[dict], duration_frames: int, fps: int = 30, sr: int = SR) -> np.ndarray:
    total = int(round(duration_frames * sr / fps))
    bus = np.zeros(total, dtype=np.float32)
    for e in events:
        frame, gain = e["frame"], e["gainDb"]
        if not (0 <= frame < duration_frames):
            raise ValueError(f"sfx frame {frame} ngoài [0, {duration_frames})")
        if gain > 0:
            raise ValueError(f"sfx gainDb {gain} phải ≤ 0")
        s = generate(e["name"], sr) * np.float32(10 ** (gain / 20))
        start = int(round(frame * sr / fps))
        seg = s[: total - start]
        bus[start:start + seg.size] += seg
    return bus


def write_wav(name: str, path, sr: int = SR) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), generate(name, sr), sr, subtype="PCM_16")
