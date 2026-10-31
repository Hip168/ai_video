"""Hạ tầng dùng chung cho test đề mục 1 (âm thanh).

Bố cục thư mục tạm khớp giao diện công khai trong
`.team/features/1-am-thanh-giao-dien.md`: lệnh CLI chạy với thư mục làm
việc là `audio/`, đọc `../content/`, ghi `../video/public/` và `../out/`.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import pytest

from aivideo import audio, engines

# Giữ hàm gốc đúng một lần ở đây; spy luôn bọc hàm này, không bọc spy cũ.
REAL_SYNTH = engines.synth

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PATH = ROOT / ".team" / "contract" / "timeline.sample.json"
SCRIPT_TABLE_PATH = ROOT / ".team" / "features" / "kich-ban-mau.md"
FPS = 30


def load_sample() -> dict:
    return json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def sample() -> dict:
    """Bản sao mới của file mẫu hợp đồng, đọc thẳng từ `.team/contract/`."""
    return load_sample()


@dataclass
class SynthSpy:
    """Ghi lại mọi lần gọi `aivideo.engines.synth` (gọi hàm thật)."""

    calls: list[dict] = field(default_factory=list)

    @property
    def texts(self) -> list[str]:
        return [c["text"] for c in self.calls]

    def clear(self) -> None:
        self.calls.clear()


@pytest.fixture
def spy(monkeypatch: pytest.MonkeyPatch) -> SynthSpy:
    recorder = SynthSpy()

    def wrapper(engine, text, voice, speed=1.0):
        recorder.calls.append(
            {"engine": engine, "text": text, "voice": voice, "speed": speed}
        )
        return REAL_SYNTH(engine, text, voice, speed)

    monkeypatch.setattr(engines, "synth", wrapper)
    return recorder


@dataclass
class Project:
    """Cây thư mục tạm: audio/ (cwd), content/, video/public/, out/.

    `out/` và `video/public/` KHÔNG tạo sẵn: chúng bị gitignore nên
    `build` phải tự tạo trên bản checkout mới.
    """

    base: Path
    spy: SynthSpy

    @property
    def calls(self) -> list[str]:
        return self.spy.texts

    @property
    def audio_dir(self) -> Path:
        return self.base / "audio"

    @property
    def script_path(self) -> Path:
        return self.base / "content" / "script.json"

    @property
    def lexicon_path(self) -> Path:
        return self.base / "content" / "lexicon.json"

    @property
    def public_dir(self) -> Path:
        return self.base / "video" / "public"

    @property
    def out_dir(self) -> Path:
        return self.base / "out"

    @property
    def timeline_path(self) -> Path:
        return self.public_dir / "timeline.json"

    @property
    def wav_path(self) -> Path:
        return self.public_dir / "audio" / "narration.wav"

    @property
    def srt_path(self) -> Path:
        return self.out_dir / "video.srt"

    @property
    def cache_dir(self) -> Path:
        return self.out_dir / "cache"

    def timeline(self) -> dict:
        return json.loads(self.timeline_path.read_text(encoding="utf-8"))

    def write_script(self, segments: list[dict], voice: str = "test") -> None:
        doc = {"title": "Thử", "voice": voice, "segments": segments}
        self.script_path.write_text(
            json.dumps(doc, ensure_ascii=False), encoding="utf-8"
        )

    def build(self, engine="fake", voice="test", speed=1.0) -> dict:
        return audio.build(
            engine,
            voice,
            speed,
            script_path=self.script_path,
            lexicon_path=self.lexicon_path,
            public_dir=self.public_dir,
            out_dir=self.out_dir,
        )

    def cli(self, monkeypatch: pytest.MonkeyPatch, argv: list[str]) -> int:
        """Gọi `main(argv)` với cwd = audio/ (để đường dẫn mặc định đúng)."""
        monkeypatch.chdir(self.audio_dir)
        return audio.main(argv)


def make_project(
    base: Path, spy: SynthSpy, segments: list[dict], lexicon=None
) -> Project:
    (base / "audio").mkdir(parents=True)
    (base / "content").mkdir()
    project = Project(base, spy)
    project.write_script(segments)
    project.lexicon_path.write_text(
        json.dumps(lexicon or {}, ensure_ascii=False), encoding="utf-8"
    )
    return project


def seg(sid: str, scene: str, text: str, pause_ms: int = 300, **extra) -> dict:
    return {
        "id": sid,
        "scene": scene,
        "text": text,
        "pause_ms": pause_ms,
        **extra,
    }


# Kịch bản thử: văn bản độ dài cách xa nhau, không có số / từ trong bảng
# phát âm, nên lời đọc trùng chữ phụ đề.
PLAIN_SEGMENTS = [
    seg("a1", "phone", "Xin chào các bạn thân mến", cue="send"),
    seg("a2", "phone", "Một hai ba bốn năm sáu bảy tám chín mười mười một"),
    seg("a3", "dns", "Ngắn thôi", pause_ms=500, cue="dns-need"),
    seg(
        "a4",
        "dns",
        "Câu này dài hơn câu trước khá nhiều, như thế đấy nhé, thật sự đấy",
    ),
    seg("a5", "packets", "Cảnh cuối cùng của kịch bản thử", pause_ms=200),
]


@pytest.fixture
def project(tmp_path: Path, spy: SynthSpy) -> Project:
    return make_project(tmp_path, spy, PLAIN_SEGMENTS)


def ffmpeg_loudness(path: Path) -> tuple[float, float]:
    """Trả về (LUFS tích hợp, true peak dBTP) đo bằng ffmpeg ebur128."""
    out = subprocess.run(
        [
            "ffmpeg",
            "-nostats",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "ebur128=peak=true",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    summary = out[out.rindex("Summary:") :]
    lufs = re.search(r"\bI:\s+(-?\d+(?:\.\d+)?) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?\d+(?:\.\d+)?) dBFS", summary)
    assert lufs and peak, summary
    return float(lufs.group(1)), float(peak.group(1))


SRT_TIME = r"(\d{2}):(\d{2}):(\d{2}),(\d{3})"
SRT_TIMING_RE = re.compile(rf"^{SRT_TIME} --> {SRT_TIME}$")


def parse_srt(text: str) -> list[dict]:
    """Phân tích SRT chặt: mỗi khối = số thứ tự, dòng mốc, ≥ 1 dòng chữ."""
    cues = []
    for block in text.strip().split("\n\n"):
        lines = block.split("\n")
        assert len(lines) >= 3, f"khối SRT thiếu dòng: {block!r}"
        match = SRT_TIMING_RE.match(lines[1])
        assert match, f"sai định dạng mốc SRT: {lines[1]!r}"
        g = [int(x) for x in match.groups()]
        start = ((g[0] * 60 + g[1]) * 60 + g[2]) * 1000 + g[3]
        end = ((g[4] * 60 + g[5]) * 60 + g[6]) * 1000 + g[7]
        cues.append(
            {
                "index": int(lines[0]),
                "start_ms": start,
                "end_ms": end,
                "text": " ".join(lines[2:]),
            }
        )
    return cues
