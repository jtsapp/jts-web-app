"""Ассерты для noise_guard. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_noise_guard.py
Падает с AssertionError на первом расхождении, печатает «ok», когда всё сошлось.

Сквозной кусок прогоняет НАСТОЯЩИЙ плагин Soniox (1.6.7) с подменённым
сокетом: главное свойство фильтра — реплика «ученик + фон» не уходит целиком
тому, кто заговорил первым, — живёт на стыке нашего кода и разбора плагина, и
проверять его надо вместе.
"""
import asyncio
import json
import os

import aiohttp
import numpy as np
from livekit import rtc
from livekit.agents import stt as lk_stt
from livekit.plugins import soniox
from livekit.plugins.soniox import stt as soniox_stt

import noise_guard as G


def _env(**vals):
    for k, v in vals.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


# --- рубильники ----------------------------------------------------------------
_env(SPEAKER_LOCK=None, NOISE_GUARD_TUTORS=None, TURN_WATCHDOG_SEC=None, SPEAKER_LOCK_RATIO=None)
# Включено по умолчанию: выкатка образа включает замок всем, откат — секретом.
assert G.speaker_lock_enabled("bro") is True
assert G.speaker_lock_enabled("") is True
for off in ("off", "OFF", " 0 ", "false", "no"):
    _env(SPEAKER_LOCK=off)
    assert G.speaker_lock_enabled("bro") is False, off
_env(SPEAKER_LOCK=None)

# Канарейка по персонам сужает оба слоя.
_env(NOISE_GUARD_TUTORS=" BRO , hype ")
assert G.speaker_lock_enabled("bro") is True
assert G.speaker_lock_enabled("gentle") is False
assert G.turn_watchdog_sec("hype") == G.TURN_WATCHDOG_DEFAULT_SEC
assert G.turn_watchdog_sec("gentle") == 0.0
_env(NOISE_GUARD_TUTORS=None)

assert G.turn_watchdog_sec("bro") == 1.2
_env(TURN_WATCHDOG_SEC="2.5")
assert G.turn_watchdog_sec("bro") == 2.5
for off in ("0", "-1", "abc", "nan"):
    _env(TURN_WATCHDOG_SEC=off)
    assert G.turn_watchdog_sec("bro") == 0.0, off
_env(TURN_WATCHDOG_SEC=None)

assert G.speaker_lock_ratio() == 1.3
_env(SPEAKER_LOCK_RATIO="1.6")
assert G.speaker_lock_ratio() == 1.6
# Меньше единицы — тихий фон отбирал бы микрофон: не принимаем.
for bad in ("0.8", "x"):
    _env(SPEAKER_LOCK_RATIO=bad)
    assert G.speaker_lock_ratio() == 1.3, bad
_env(SPEAKER_LOCK_RATIO=None)

assert G.speaker_lock_keep() == 0.75
_env(SPEAKER_LOCK_KEEP="0")
assert G.speaker_lock_keep() == 0.0
for bad in ("1.5", "-0.1", "x"):
    _env(SPEAKER_LOCK_KEEP=bad)
    assert G.speaker_lock_keep() == 0.75, bad
_env(SPEAKER_LOCK_KEEP=None)


# --- SpeakerLock: громкость и решения ---------------------------------------------
SR = 16000


def _pcm(seconds: float, amp: float) -> bytes:
    """Синус нужной громкости: RMS = amp / √2."""
    t = np.arange(int(SR * seconds)) / SR
    return (amp * np.sin(2 * np.pi * 220 * t)).astype(np.int16).tobytes()


def _tok(text, start, end, speaker, final=True):
    return {"text": text, "start_ms": start, "end_ms": end, "speaker": speaker, "is_final": final}


lock = G.SpeakerLock()
# 0–1 с громко (ученик у микрофона), 1–2 с тихо (телевизор), кусками по 10 мс,
# как приходят кадры из комнаты.
loud, quiet = _pcm(1.0, 9000), _pcm(1.0, 1500)
for buf in (loud, quiet):
    for i in range(0, len(buf), 320):
        lock.push_pcm(buf[i : i + 320], SR)
assert len(lock._windows) == 20

kept, dropped = lock.filter_tokens(
    [
        _tok(" I", 100, 300, "1"),
        _tok(" like", 300, 600, "1"),
        _tok(" breaking", 1100, 1400, "2"),
        _tok(" news", 1400, 1800, "2"),
        {"text": "<end>", "is_final": True},
    ]
)
assert [t["text"] for t in kept] == [" I", " like", "<end>"], kept
assert dropped == "breaking news", dropped
assert lock.primary == "1"
assert (lock.kept_words, lock.dropped_words) == (2, 2)

# Слова без говорящего (разметка выключена) и служебные — всегда проходят.
kept, _ = lock.filter_tokens([{"text": " hi", "is_final": True}, {"text": "<fin>", "is_final": True}])
assert len(kept) == 2

# Громче основного в 1.3 раза и больше — забирает микрофон.
switches = []
lock2 = G.SpeakerLock(on_switch=lambda old, new, a, b: switches.append((old, new)))
lock2.push_pcm(_pcm(1.0, 1500), SR)  # тихий первый
lock2.push_pcm(_pcm(1.0, 9000), SR)  # громкий второй
kept, dropped = lock2.filter_tokens([_tok(" tv", 100, 900, "1"), _tok(" me", 1100, 1900, "2")])
assert [t["text"] for t in kept] == [" tv", " me"], kept  # первый был основным, пока не появился второй
assert lock2.primary == "2" and switches == [(None, "1"), ("1", "2")], switches
kept, dropped = lock2.filter_tokens([_tok(" tv", 200, 800, "1")])
assert kept == [] and dropped == "tv"

# Чуть громче — не повод: без запаса микрофон метался бы на каждом слове.
lock3 = G.SpeakerLock()
lock3.push_pcm(_pcm(1.0, 6000), SR)
lock3.push_pcm(_pcm(1.0, 7000), SR)
lock3.filter_tokens([_tok(" a", 100, 900, "1"), _tok(" b", 1100, 1900, "2")])
assert lock3.primary == "1"

# Черновые слова громкость не двигают и до первого финального не режутся.
lock4 = G.SpeakerLock()
lock4.push_pcm(_pcm(0.5, 6000), SR)
lock4.push_pcm(_pcm(0.5, 1500), SR)
kept, _ = lock4.filter_tokens([_tok(" draft", 100, 400, "2", final=False)])
assert len(kept) == 1 and lock4.primary is None
# Черновое слово не основного говорящего — выкидывается, но в лог не идёт.
lock4.filter_tokens([_tok(" ok", 100, 400, "1")])
kept, dropped = lock4.filter_tokens([_tok(" x", 600, 900, "2", final=False)])
assert kept == [] and dropped == ""

# Слово, которое разметка отдала фону, но громкое как речь ученика, остаётся:
# это ученик, сказавший его поверх фона (замер: «than», «past», «space»).
lock6 = G.SpeakerLock()
lock6.push_pcm(_pcm(1.0, 6000), SR)  # ученик
lock6.push_pcm(_pcm(1.0, 5000), SR)  # ученик поверх фона: смесь не тише
lock6.push_pcm(_pcm(1.0, 2000), SR)  # фон в паузе ученика
kept, dropped = lock6.filter_tokens(
    [_tok(" I", 100, 900, "1"), _tok(" than", 1100, 1900, "2"), _tok(" rain", 2100, 2900, "2")]
)
assert [t["text"] for t in kept] == [" I", " than"], kept
assert dropped == "rain", dropped
# keep=0 выключает поправку — остаётся чистая разметка.
lock7 = G.SpeakerLock(keep=0)
lock7.push_pcm(_pcm(1.0, 6000), SR)
lock7.push_pcm(_pcm(1.0, 5000), SR)
kept, _ = lock7.filter_tokens([_tok(" I", 100, 900, "1"), _tok(" than", 1100, 1900, "2")])
assert [t["text"] for t in kept] == [" I"], kept

# Слово, для которого аудио ещё не пришло, громкость не портит.
lock5 = G.SpeakerLock()
lock5.filter_tokens([_tok(" early", 5000, 5300, "1")])
assert lock5.primary is None

# Новый сокет — номера говорящих и время с нуля.
lock.reset()
assert lock.primary is None and lock._windows == [] and lock.kept_words == 0


# --- сквозной: настоящий плагин Soniox + наш сокет ----------------------------------
class _FakeWS:
    """Сокет, который отвечает заранее записанными сообщениями — но только
    после того, как всё аудио ушло (иначе громкости ещё не из чего считать)."""

    def __init__(self, messages, audio_ready):
        self._messages = messages
        self._audio_ready = audio_ready
        self.sent = 0
        self.closed = False

    async def send_bytes(self, data):
        self.sent += len(data)

    async def send_str(self, data):
        pass

    async def close(self):
        self.closed = True

    def __aiter__(self):
        return self._gen()

    async def _gen(self):
        await self._audio_ready.wait()
        for m in self._messages:
            yield aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps(m), None)
        await asyncio.sleep(3600)


async def _run_plugin(guarded: bool):
    audio_ready = asyncio.Event()
    messages = [
        # Ученик (громко), фон (тихо) и снова ученик — ОДНА реплика без <end>
        # посередине: так и выглядит непрерывный фон.
        {"tokens": [_tok("I", 100, 300, "1"), _tok(" like", 300, 600, "1")]},
        {"tokens": [_tok(" breaking", 1100, 1400, "2"), _tok(" news", 1400, 1800, "2")]},
        {"tokens": [_tok(" apples", 2100, 2700, "1"), {"text": "<end>", "is_final": True}]},
    ]
    real_connect = soniox_stt.SpeechStream._connect_ws

    async def fake_connect(self):
        self.audio_queue = asyncio.Queue()
        return _FakeWS(messages, audio_ready)

    soniox_stt.SpeechStream._connect_ws = fake_connect
    try:
        params = soniox.STTOptions(enable_speaker_diarization=True)
        if guarded:
            engine = G.GuardedSonioxSTT(api_key="test", params=params)
        else:
            engine = soniox.STT(api_key="test", params=params)
        stream = engine.stream()
        # 0–1 громко, 1–2 тихо, 2–3 громко.
        audio = _pcm(1.0, 9000) + _pcm(1.0, 1500) + _pcm(1.0, 9000)
        for i in range(0, len(audio), 320):
            frame = rtc.AudioFrame(audio[i : i + 320], SR, 1, 160)
            stream.push_frame(frame)
        # Дать задаче подготовки аудио переложить кадры в очередь сокета.
        for _ in range(50):
            await asyncio.sleep(0.01)
        audio_ready.set()
        finals = []

        async def _collect():
            async for ev in stream:
                if ev.type == lk_stt.SpeechEventType.FINAL_TRANSCRIPT:
                    finals.append(ev.alternatives[0])
                    return

        await asyncio.wait_for(_collect(), timeout=5)
        await stream.aclose()
        return finals
    finally:
        soniox_stt.SpeechStream._connect_ws = real_connect


# Без замка плагин склеивает всё в одну реплику — вместе с фоном.
plain = asyncio.run(_run_plugin(guarded=False))
assert plain[0].text == "I like breaking news apples", plain[0].text
# С замком фон вырезан до склейки.
guarded = asyncio.run(_run_plugin(guarded=True))
assert guarded[0].text == "I like apples", guarded[0].text
assert guarded[0].speaker_id == "1"

# Обёртка сама включает разметку говорящих: без неё фильтровать нечего.
eng = G.GuardedSonioxSTT(api_key="test", params=soniox.STTOptions())
assert eng.capabilities.diarization is True
assert eng._params.enable_speaker_diarization is True


# --- сторож конца хода --------------------------------------------------------------
class _Clock:
    def __init__(self):
        self.t = 100.0

    def __call__(self):
        return self.t


clock = _Clock()
w = G.TurnWatchdog(1.2, now=clock)
assert w.should_commit() is False
w.on_user_state("speaking")
# Речь «идёт», а слов ещё не было — это чистый фон, не трогаем.
clock.t += 5
assert w.should_commit() is False
w.on_transcript("I think")
clock.t += 1.0
assert w.should_commit() is False  # пауза короче порога
w.on_transcript("I think that")
clock.t += 1.2
assert w.should_commit() is True
w.committed()
assert w.should_commit() is False
# Пустая подпись — не слово.
w.on_transcript("   ")
clock.t += 5
assert w.should_commit() is False

# Ход закрылся штатно — копить нечего.
w.on_transcript("hello")
w.on_user_state("listening")
w.on_user_state("speaking")
clock.t += 5
assert w.should_commit() is False

# Тьютор задумался — ход уже отдан.
w.on_transcript("hello")
w.on_agent_state("thinking")
clock.t += 5
assert w.should_commit() is False

# Выключенный сторож молчит при любых событиях.
off = G.TurnWatchdog(0, now=clock)
off.on_user_state("speaking")
off.on_transcript("words")
clock.t += 10
assert off.should_commit() is False

# В режиме рации сторож выключают снаружи.
w2 = G.TurnWatchdog(1.2, now=clock)
w2.enabled = False
w2.on_user_state("speaking")
w2.on_transcript("words")
clock.t += 10
assert w2.should_commit() is False


class _Ev:
    def __init__(self, **kw):
        self.__dict__.update(kw)


class _FakeSession:
    def __init__(self):
        self.handlers = {}
        self.commits = []

    def on(self, name):
        def deco(fn):
            self.handlers[name] = fn
            return fn

        return deco

    def emit(self, name, **kw):
        self.handlers[name](_Ev(**kw))

    def commit_user_turn(self, **kw):
        self.commits.append(kw)
        fut = asyncio.get_running_loop().create_future()
        fut.set_result("")
        return fut


async def _attach_case():
    clock = _Clock()
    session = _FakeSession()
    w = G.TurnWatchdog(1.2, now=clock)
    task = G.attach_turn_watchdog(session, w, tick=0.01)
    session.emit("user_state_changed", new_state="speaking")
    session.emit("user_input_transcribed", transcript="I like music", is_final=False)
    await asyncio.sleep(0.05)
    assert session.commits == []
    clock.t += 1.3
    await asyncio.sleep(0.05)
    assert len(session.commits) == 1, session.commits
    # Короткое ожидание финала: слова уже полторы секунды как кончились.
    assert session.commits[0] == {"transcript_timeout": 0.5}
    # Повторно тот же ход не закрывается.
    clock.t += 5
    await asyncio.sleep(0.05)
    assert len(session.commits) == 1
    # Закрытие сессии гасит опрос.
    session.emit("close")
    await asyncio.sleep(0.02)
    assert task.cancelled() or task.done()


asyncio.run(_attach_case())

print("noise guard: ok")
