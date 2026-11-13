"""Tai nghe của `aivideo.phatam`, chạy trong venv riêng (không import aivideo).

    <python> -I phatam_worker.py asr      < items.json > ket-qua.json
    <python> -I phatam_worker.py phoneme  < items.json > ket-qua.json

asr (faster-whisper large-v3-turbo, chạy offline): item {wav, prefix, term, suffix}.
  Ép Whisper đọc đúng câu `prefix + term + suffix` (teacher forcing) và lấy xác suất
  các token của `term` theo tiếng Anh (pEn) và tiếng Việt (pVi), cùng thời điểm từ.
  Rồi cắt đúng vùng từ, nghe tự do bằng tiếng Anh (heardEn) và đoán ngôn ngữ (langEn);
  nghe tự do cả câu bằng tiếng Việt (heardVi).
phoneme (facebook/wav2vec2-lv-60-espeak-cv-ft): item {wav, start, end} -> {phones}.
wav: mono PCM 16 bit 16 kHz.
"""
from __future__ import annotations

import json
import sys
import wave

import numpy as np

SR = 16000
ASR_MODEL = "mobiuslabsgmbh/faster-whisper-large-v3-turbo"
PHONEME_MODEL = "facebook/wav2vec2-lv-60-espeak-cv-ft"
CUT_PAD_S = 0.05
SILENCE_S = 0.25
PHONEME_PAD_S = 0.1


def _load(path: str) -> np.ndarray:
    with wave.open(path) as w:
        if w.getframerate() != SR or w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise ValueError(f"{path}: cần mono PCM 16 bit {SR} Hz")
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def _ids(tk, text: str, lead_space: bool) -> list[int]:
    text = text.strip()
    if not text:
        return []
    return tk.encode((" " if lead_space else "") + text)


def _forced(m, tk, enc, num_frames, prefix, term, suffix):
    pre = _ids(tk, prefix, True)
    mid = _ids(tk, term, True)
    post = _ids(tk, suffix, suffix[:1].isspace())
    seq = pre + mid + post
    r = m.model.align(enc, tk.sot_sequence, [seq], num_frames)[0]
    probs = np.asarray(r.text_token_probs[:len(seq)], dtype=np.float64)
    p = float(np.exp(np.mean(np.log(np.maximum(probs[len(pre):len(pre) + len(mid)], 1e-12)))))
    text_idx = np.array([a for a, _ in r.alignments])
    time_idx = np.array([b for _, b in r.alignments])
    jumps = np.pad(np.diff(text_idx), (1, 0), constant_values=1).astype(bool)
    times = time_idx[jumps] / m.tokens_per_second
    a, b = len(pre), len(pre) + len(mid)
    start = float(times[a]) if a < len(times) else 0.0
    end = float(times[b]) if b < len(times) else num_frames / 100.0
    return p, start, max(end, start + 0.05)


def asr(items: list[dict]) -> list[dict]:
    from faster_whisper import WhisperModel
    from faster_whisper.audio import pad_or_trim
    from faster_whisper.tokenizer import Tokenizer

    m = WhisperModel(ASR_MODEL, device="cpu", compute_type="int8", local_files_only=True)
    tks = {lang: Tokenizer(m.hf_tokenizer, m.model.is_multilingual, task="transcribe", language=lang)
           for lang in ("en", "vi")}
    out = []
    for it in items:
        a = _load(it["wav"])
        feats = m.feature_extractor(a)
        num_frames = min(feats.shape[-1], 3000)
        enc = m.encode(pad_or_trim(feats))
        p_en, start, end = _forced(m, tks["en"], enc, num_frames, it["prefix"], it["term"], it["suffix"])
        p_vi, _, _ = _forced(m, tks["vi"], enc, num_frames, it["prefix"], it["term"], it["suffix"])
        lo, hi = max(0, int((start - CUT_PAD_S) * SR)), int((end + CUT_PAD_S) * SR)
        sil = np.zeros(int(SILENCE_S * SR), dtype=np.float32)
        cut = np.concatenate([sil, a[lo:hi], sil])
        segs, _ = m.transcribe(cut, language="en", word_timestamps=True, beam_size=5, temperature=0,
                               condition_on_previous_text=False, vad_filter=False)
        heard_en = [{"word": w.word.strip(), "p": round(float(w.probability), 3)}
                    for s in segs for w in (s.words or [])]
        _lang, _prob, probs = m.detect_language(audio=cut)
        lang_en = dict(probs).get("en", 0.0)
        segs, _ = m.transcribe(a, language="vi", beam_size=1, temperature=0,
                               condition_on_previous_text=False, vad_filter=False)
        heard_vi = " ".join(s.text.strip() for s in segs).strip()
        out.append({"pEn": round(p_en, 4), "pVi": round(p_vi, 4), "start": round(start, 3),
                    "end": round(end, 3), "heardEn": heard_en, "langEn": round(float(lang_en), 3),
                    "heardVi": heard_vi})
    return out


def phoneme(items: list[dict]) -> list[dict]:
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

    proc = Wav2Vec2Processor.from_pretrained(PHONEME_MODEL, local_files_only=True)
    model = Wav2Vec2ForCTC.from_pretrained(PHONEME_MODEL, local_files_only=True).eval()
    out = []
    for it in items:
        a = _load(it["wav"])
        lo = max(0, int((it["start"] - PHONEME_PAD_S) * SR))
        hi = int((it["end"] + PHONEME_PAD_S) * SR)
        x = proc(a[lo:hi], sampling_rate=SR, return_tensors="pt").input_values
        with torch.no_grad():
            ids = model(x).logits.argmax(-1)
        out.append({"phones": proc.batch_decode(ids)[0]})
    return out


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode not in ("asr", "phoneme"):
        print("dùng: phatam_worker.py asr|phoneme < items.json", file=sys.stderr)
        return 2
    items = json.load(sys.stdin)
    res = asr(items) if mode == "asr" else phoneme(items)
    json.dump(res, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
