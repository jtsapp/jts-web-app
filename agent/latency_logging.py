"""Свёртка LiveKit metrics_collected → строки LATENCY для `lk agent logs`.

Без зависимостей livekit/httpx — чтобы тест и summarizer могли импортировать
хелперы без venv агента.
"""
from __future__ import annotations

from typing import Any


def latency_pick(m: Any, *names: str) -> float:
    """First present numeric attr on a LiveKit metrics object (0 if none)."""
    for name in names:
        v = getattr(m, name, None)
        if v is None:
            continue
        try:
            return float(v) or 0.0
        except (TypeError, ValueError):
            continue
    return 0.0


def latency_ingest(bucket: dict[str, float], m: Any) -> str | None:
    """Fold one metrics event into the current turn bucket.

    Returns which stage was updated (`eou` / `stt` / `llm` / `tts`), or None
    if the type is unknown. Field names follow livekit-agents 1.6 Metrics.
    """
    name = type(m).__name__
    if name == "EOUMetrics":
        bucket["eou_delay"] = latency_pick(m, "end_of_utterance_delay")
        bucket["transcription_delay"] = latency_pick(m, "transcription_delay")
        return "eou"
    if name == "STTMetrics":
        bucket["stt_duration"] = latency_pick(m, "duration")
        bucket["stt_audio_duration"] = latency_pick(m, "audio_duration")
        return "stt"
    if name == "LLMMetrics":
        bucket["llm_ttft"] = latency_pick(m, "ttft")
        bucket["llm_duration"] = latency_pick(m, "duration")
        return "llm"
    if name == "TTSMetrics":
        bucket["tts_ttfb"] = latency_pick(m, "ttfb")
        bucket["tts_duration"] = latency_pick(m, "duration")
        return "tts"
    return None


def latency_perceived(bucket: dict[str, float]) -> float:
    """Rough time from end-of-user-speech to first TTS audio.

    eou_delay (VAD/turn-detector wait) + llm_ttft (first brain token, includes
    the hop agent→stand) + tts_ttfb (first audio byte). Not wall-clock exact —
    stages overlap a little — but it is the number we compare across builds.
    """
    return (
        bucket.get("eou_delay", 0.0)
        + bucket.get("llm_ttft", 0.0)
        + bucket.get("tts_ttfb", 0.0)
    )


def latency_turn_line(turn_n: int, bucket: dict[str, float]) -> str:
    """One greppable summary line for a finished (or flushed) turn."""
    parts = [
        f"LATENCY turn={turn_n}",
        f"perceived={latency_perceived(bucket):.3f}s",
    ]
    for key in (
        "eou_delay",
        "transcription_delay",
        "stt_duration",
        "llm_ttft",
        "llm_duration",
        "tts_ttfb",
        "tts_duration",
    ):
        if key in bucket:
            parts.append(f"{key}={bucket[key]:.3f}s")
    return " ".join(parts)
