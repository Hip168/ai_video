"""Tổng hợp giọng: synth() chọn engine korva | vieneu | fake."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

import numpy as np

ENGINES = ("korva", "vieneu", "fake")

# Giọng thử khi `compare`. korva: tên lấy từ TTS().list_voices() (10 giọng, đã kiểm).
# vieneu: 10 giọng "featured" (dấu sao) đầu list_preset_voices(), do tác giả VieNeu chọn.
VOICES: dict[str, list[str]] = {
    "korva": ["bao_kim", "gia_bao", "hoang_nam", "huu_dat", "khanh_vy",
              "ngoc_huyen", "phuong_linh", "quang_huy", "quynh_nhu", "thanh_phong"],
    "vieneu": ["Adam bựa", "Trúc Ly", "Thiện Minh", "Mai Anh", "Hải Đăng", "Thùy Dung",
               "Thiền Tâm Đức", "Ngọc Huyền", "Quang Sơn", "Ngọc Trân"],
    "fake": ["a", "b"],
}

FAKE_SR = 24000
_FAKE_PAD_S = 0.3
_FAKE_SEC_PER_CHAR = 0.06

_cache: dict[str, object] = {}


def _fake(text: str, voice: str, speed: float) -> tuple[np.ndarray, int]:
    body_n = max(1, int(round(len(text) * _FAKE_SEC_PER_CHAR / speed * FAKE_SR)))
    freq = 180.0 + (sum(map(ord, voice)) % 200)
    t = np.arange(body_n, dtype=np.float64) / FAKE_SR
    body = (0.3 * np.sin(2 * np.pi * freq * t)).astype(np.float32)
    pad = np.zeros(int(_FAKE_PAD_S * FAKE_SR), dtype=np.float32)
    return np.concatenate([pad, body, pad]), FAKE_SR


def _korva(text: str, voice: str, speed: float) -> tuple[np.ndarray, int]:
    try:
        import korvatts
    except ImportError as e:
        raise RuntimeError("Thiếu korvatts: uv pip install -e '.[korva]'") from e
    tts = _cache.get("korva")
    if tts is None:
        tts = _cache["korva"] = korvatts.TTS()
    wav, _dur = tts.synthesize(text, voice=voice, lang="vi", total_steps=32, speed=speed)
    return np.asarray(wav, dtype=np.float32).reshape(-1), int(tts.sample_rate)


def _patch_vieneu_fetch() -> None:
    """onnxruntime từ chối đường dẫn symlink của cache Hugging Face
    ("External data path escapes model directory"). VieNeu 3.8.3 lấy file qua
    `OnnxV3LiteEngine._fetch` nên thay hàm đó: tải như cũ, rồi liên kết cứng
    (hoặc chép) file thật vào một thư mục thường và trả thư mục này."""
    from huggingface_hub import hf_hub_download
    from vieneu._v3_turbo_engine.onnx_runtime_lite import OnnxV3LiteEngine

    root = Path(os.environ.get("AIVIDEO_MODELS", Path.home() / ".cache" / "aivideo"))

    def _fetch(repo, files, subfolder):
        dst = root / repo.replace("/", "--") / (subfolder or "_")
        dst.mkdir(parents=True, exist_ok=True)
        for fn in files:
            try:
                got = Path(hf_hub_download(repo, fn, repo_type="model", subfolder=subfolder or None))
            except Exception:
                if fn.endswith(".json"):
                    continue
                raise
            target = dst / fn
            if target.exists():
                continue
            try:
                os.link(got.resolve(), target)
            except OSError:
                shutil.copy2(got.resolve(), target)
        return dst

    OnnxV3LiteEngine._fetch = staticmethod(_fetch)


def _vieneu(text: str, voice: str, speed: float) -> tuple[np.ndarray, int]:
    try:
        import vieneu
    except ImportError as e:
        raise RuntimeError("Thiếu vieneu: uv pip install -e '.[vieneu]'") from e
    if abs(speed - 1.0) > 1e-9:
        raise ValueError("engine vieneu không hỗ trợ speed khác 1.0")
    tts = _cache.get("vieneu")
    if tts is None:
        _patch_vieneu_fetch()
        tts = _cache["vieneu"] = vieneu.Vieneu()
    wav = tts.infer(text, voice=voice)
    return np.asarray(wav, dtype=np.float32).reshape(-1), int(tts.sample_rate)


def synth(engine: str, text: str, voice: str, speed: float = 1.0) -> tuple[np.ndarray, int]:
    """Trả (float32 mono, sample_rate)."""
    if engine not in ENGINES:
        raise ValueError(f"engine không hợp lệ: {engine!r}; chọn một trong {ENGINES}")
    if not text or not text.strip():
        raise ValueError("text rỗng")
    if speed <= 0:
        raise ValueError("speed phải > 0")
    fn = {"fake": _fake, "korva": _korva, "vieneu": _vieneu}[engine]
    return fn(text, voice, speed)
