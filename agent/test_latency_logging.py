"""Ассерты для свёртки LATENCY-ходов. Запуск:
    python agent/test_latency_logging.py
"""
from latency_logging import (
    latency_ingest,
    latency_perceived,
    latency_pick,
    latency_turn_line,
)


class _M:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class EOUMetrics(_M):
    pass


class STTMetrics(_M):
    pass


class LLMMetrics(_M):
    pass


class TTSMetrics(_M):
    pass


class UnknownMetrics(_M):
    pass


assert latency_pick(_M(ttft=0.87), "ttft") == 0.87
assert latency_pick(_M(), "ttft") == 0.0
assert latency_pick(_M(ttft=None, duration=1.2), "ttft", "duration") == 1.2

b: dict = {}
assert latency_ingest(b, EOUMetrics(end_of_utterance_delay=0.4, transcription_delay=0.1)) == "eou"
assert b["eou_delay"] == 0.4
assert latency_ingest(b, STTMetrics(duration=0.55, audio_duration=1.2)) == "stt"
assert latency_ingest(b, LLMMetrics(ttft=0.9, duration=2.1)) == "llm"
assert latency_ingest(b, TTSMetrics(ttfb=0.35, duration=3.0)) == "tts"
assert latency_ingest(b, UnknownMetrics(x=1)) is None

# perceived = eou + llm_ttft + tts_ttfb (без duration — это длина речи, не ожидание)
assert abs(latency_perceived(b) - (0.4 + 0.9 + 0.35)) < 1e-9

line = latency_turn_line(3, b)
assert line.startswith("LATENCY turn=3 perceived=1.650s")
assert "eou_delay=0.400s" in line
assert "llm_ttft=0.900s" in line
assert "tts_ttfb=0.350s" in line
assert "stt_duration=0.550s" in line

print("latency logging: ok")
