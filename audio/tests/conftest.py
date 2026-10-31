"""Hạ tầng dùng chung cho test đề mục 1 (âm thanh).

Bố cục thư mục tạm khớp giao diện công khai trong
`.team/features/1-am-thanh.md`: lệnh chạy với thư mục làm việc là `audio/`,
đọc `../content/`, ghi `../video/public/` và `../out/`.
"""

from __future__ import annotations

import copy
import json
import re
import runpy
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PATH = ROOT / ".team" / "contract" / "timeline.sample.json"
SCRIPT_TABLE_PATH = ROOT / ".team" / "features" / "kich-ban-mau.md"
FPS = 30


def load_sample() -> dict:
    return json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))


@pytest.fixture
def sample() -> dict:
    """Bản sao mới của file mẫu hợp đồng, đọc thẳng từ `.team/contract/`."""
    return copy.deepcopy(load_sample())


@dataclass
class Project:
    """Cây thư mục tạm: audio/ (cwd), content/, video/public/, out/."""

    base: Path
    calls: list[str] = field(default_factory=list)

    @property
    def audio(self) -> Path:
        return self.base / "audio"

    @property
    def timeline_path(self) -> Path:
        return self.base / "video" / "public" / "timeline.json"

    @property
    def wav_path(self) -> Path:
        return self.base / "video" / "public" / "audio" / "narration.wav"

    @property
    def srt_path(self) -> Path:
        return self.base / "out" / "video.srt"

    @property
    def cache_dir(self) -> Path:
        return self.base / "out" / "cache"

    @property
    def script_path(self) -> Path:
        return self.base / "content" / "script.json"

    def timeline(self) -> dict:
        return json.loads(self.timeline_path.read_text(encoding="utf-8"))

    def write_script(self, segments: list[dict], voice: str = "test") -> None:
        doc = {"title": "Thử", "voice": voice, "segments": segments}
        self.script_path.write_text(
            json.dumps(doc, ensure_ascii=False), encoding="utf-8"
        )


def make_project(base: Path, segments: list[dict], lexicon=None) -> Project:
    """Tạo cây thư mục. `out/` và `video/public/audio/` KHÔNG tạo sẵn:
    chúng bị gitignore nên `build` phải tự tạo trên bản checkout mới.
    """
    (base / "audio").mkdir()
    (base / "content").mkdir()
    (base / "video" / "public").mkdir(parents=True)
    project = Project(base)
    project.write_script(segments)
    (base / "content" / "lexicon.json").write_text(
        json.dumps(lexicon or {}, ensure_ascii=False), encoding="utf-8"
    )
    return project


def run_cli(
    project: Project,
    monkeypatch: pytest.MonkeyPatch,
    argv: list[str],
) -> int:
    """Chạy `python -m aivideo.audio <argv>` trong tiến trình, cwd = audio/.

    Bọc `aivideo.engines.synth` để ghi lại văn bản được gửi vào engine
    (mỗi lần gọi một phần tử trong `project.calls`) mà vẫn gọi hàm thật.
    Trả về mã thoát.
    """
    import aivideo.engines as engines

    real_synth = engines.synth

    def spy(*args, **kwargs):
        text = args[1] if len(args) > 1 else kwargs["text"]
        project.calls.append(text)
        return real_synth(*args, **kwargs)

    monkeypatch.setattr(engines, "synth", spy)
    monkeypatch.chdir(project.audio)
    monkeypatch.setattr(sys, "argv", ["aivideo.audio", *argv])
    monkeypatch.delitem(sys.modules, "aivideo.audio", raising=False)
    try:
        runpy.run_module("aivideo.audio", run_name="__main__")
    except SystemExit as exc:
        return exc.code if isinstance(exc.code, int) else int(bool(exc.code))
    return 0


def run_build(
    project: Project,
    monkeypatch: pytest.MonkeyPatch,
    voice: str = "test",
) -> None:
    code = run_cli(
        project,
        monkeypatch,
        ["build", "--engine", "fake", "--voice", voice],
    )
    assert code == 0


def seg(sid: str, scene: str, text: str, pause_ms: int = 300, **extra) -> dict:
    return {
        "id": sid,
        "scene": scene,
        "text": text,
        "pause_ms": pause_ms,
        **extra,
    }


# Kịch bản thử: văn bản khác độ dài, không có số / từ trong bảng phát âm,
# nên lời đọc trùng chữ phụ đề.
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
