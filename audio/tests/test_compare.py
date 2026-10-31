"""[1-4] Lệnh `compare` và [1-7] bản giọng thật. Chỉ chạy trên Mac.

PHẦN KHÔNG TỰ ĐỘNG ĐƯỢC (CẦN NGƯỜI DÙNG):
- [1-4] Nghe các file `out/compare/<engine>_<giọng>.wav` rồi chọn engine +
  giọng. Test chỉ kiểm file có đủ, cùng mức loudness.
- [1-7] Nghe bản `narration.wav` thật, duyệt cách đọc `router`, `packet`,
  `DNS`, `Wi-Fi`, `IP`. Test chỉ kiểm độ dài và timeline.
"""

from __future__ import annotations

import json
import subprocess
import sys

import pytest
import soundfile as sf

from conftest import FPS, ROOT, ffmpeg_loudness

AUDIO_DIR = ROOT / "audio"
COMPARE_DIR = ROOT / "out" / "compare"
PUBLIC = ROOT / "video" / "public"


@pytest.mark.real
def test_real_compare_ra_file_cho_ca_hai_engine_chenh_loudness_duoi_0_5_lu():
    subprocess.run(
        [
            sys.executable,
            "-m",
            "aivideo.audio",
            "compare",
            "--text-file",
            "../content/compare.txt",
        ],
        cwd=AUDIO_DIR,
        check=True,
    )
    files = sorted(COMPARE_DIR.glob("*.wav"))
    korva = [f for f in files if f.name.startswith("korva_")]
    vieneu = [f for f in files if f.name.startswith("vieneu_")]
    assert korva, "thiếu file KorvaTTS trong out/compare/"
    assert vieneu, "thiếu file VieNeu trong out/compare/"
    levels = []
    for path in korva + vieneu:
        assert sf.info(str(path)).frames > 0
        levels.append(ffmpeg_loudness(path)[0])
    assert max(levels) - min(levels) <= 0.5, levels


@pytest.mark.real
def test_real_ban_giong_that_dai_60_den_90_giay_va_timeline_hop_le():
    from aivideo.audio import validate_timeline

    assert (PUBLIC / "timeline.json").is_file(), (
        "chưa có bản dựng thật: chạy `build --engine <korva|vieneu>` trước"
    )
    timeline = json.loads((PUBLIC / "timeline.json").read_text("utf-8"))
    assert validate_timeline(timeline) == []
    assert 1800 <= timeline["durationInFrames"] <= 2700
    info = sf.info(str(PUBLIC / "audio" / "narration.wav"))
    seconds = info.frames / info.samplerate
    assert 60 <= seconds <= 90, seconds
    assert abs(seconds * FPS + 0.5 * FPS - timeline["durationInFrames"]) <= 1
    beats = [b for s in timeline["scenes"] for b in s["beats"]]
    assert len(beats) == 19
