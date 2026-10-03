"""Ассерты для фильтра эха и finalize по концу речи (noise_guard). pytest в
проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_echo_guard.py
Падает с AssertionError на первом расхождении, печатает «ok», когда всё сошлось.

Жалоба тестера 03.10.2026 (Айзере, «Свободно»): тьютор обрывает себя и без
конца повторяет «Кешіріңіз, анық естімедім — қайталай аласыз ба?». Живой зонд
воспроизвёл это эхом её голоса в микрофоне: Soniox пишет её слова как слова
ученика, их хватает на перебивание, обрывок уходит ходом ученика, и правило
«меньше трёх слов — переспроси» замыкает петлю. Тот же зонд показал задержку:
казахскую фразу Soniox закрывает сам через ~2.6 с, английскую — за 0.3–0.5 с.
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

SR = 16000


def _env(**vals):
    for k, v in vals.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def _tok(text, start=None, end=None, final=True):
    t = {"text": text, "is_final": final}
    if start is not None:
        t["start_ms"] = start
        t["end_ms"] = end if end is not None else start + 200
    return t


END = {"text": "<end>", "is_final": True}


class _Clock:
    def __init__(self, t=100.0):
        self.t = t

    def __call__(self):
        return self.t


# --- рубильники ------------------------------------------------------------------
_env(ECHO_GUARD=None, ECHO_GUARD_TUTORS=None, NOISE_GUARD_TUTORS=None, ECHO_TAIL_SEC=None,
     SONIOX_VAD_FINALIZE=None, SONIOX_VAD_FINALIZE_TUTORS=None, SONIOX_VAD_FINALIZE_SEC=None)
# Выключены по умолчанию: выкатка образа не меняет ни одного звонка, пока секрет
# не включён, — и «до/после» меряется на одной версии кода.
assert G.echo_guard_enabled("aizere") is False
assert G.vad_finalize_enabled("aizere") is False
for on in ("on", "ON", " 1 ", "true", "yes"):
    _env(ECHO_GUARD=on, SONIOX_VAD_FINALIZE=on)
    assert G.echo_guard_enabled("aizere") is True, on
    assert G.vad_finalize_enabled("aizere") is True, on
# Своя канарейка у каждого слоя.
_env(ECHO_GUARD="on", ECHO_GUARD_TUTORS="aizere", SONIOX_VAD_FINALIZE="on",
     SONIOX_VAD_FINALIZE_TUTORS=" Aizere , jarvis ")
assert G.echo_guard_enabled("aizere") is True
assert G.echo_guard_enabled("bro") is False
assert G.vad_finalize_enabled("jarvis") is True
assert G.vad_finalize_enabled("bro") is False
_env(ECHO_GUARD=None, ECHO_GUARD_TUTORS=None, SONIOX_VAD_FINALIZE=None,
     SONIOX_VAD_FINALIZE_TUTORS=None)

assert G.echo_tail_sec() == G.ECHO_TAIL_SEC_DEFAULT == 0.6
_env(ECHO_TAIL_SEC="1.5")
assert G.echo_tail_sec() == 1.5
for bad in ("abc", "-1", "9"):
    _env(ECHO_TAIL_SEC=bad)
    assert G.echo_tail_sec() == 0.6, bad
_env(ECHO_TAIL_SEC=None)
# Около секунды тишины вместе с окном VAD: на 0.2 живой зонд резал ход на паузе
# между предложениями.
assert G.vad_finalize_delay_sec() == G.VAD_FINALIZE_DELAY_SEC_DEFAULT == 0.7
_env(SONIOX_VAD_FINALIZE_SEC="0.2")
assert G.vad_finalize_delay_sec() == 0.2
_env(SONIOX_VAD_FINALIZE_SEC="x")
assert G.vad_finalize_delay_sec() == 0.7
_env(SONIOX_VAD_FINALIZE_SEC=None)

# --- сходство слов -------------------------------------------------------------------
assert G.norm_word(" Кешіріңіз,") == "кешіріңіз"
assert G.norm_word("—") == ""
assert G.norm_word("Ёлка!") == "елка"
assert G.similar_word("кешіріңіз", "кешіріңіз")
# Обрывок слова эха: Soniox успел только начало («есті—»).
assert G.similar_word("есті", "естімедім")
# «Похоже на 80%» больше нет: в казахском отрицание — суффикс, и «түсінбедім»
# («не понял») по сходству совпадал с «түсіндім» («понял») — живой зонд
# 03.10.2026, фильтр съел смысл перебивания.
assert not G.similar_word("түсінбедім", "түсіндім")
assert not G.similar_word("жаттыгу", "жаттығу")
# Обрывок короче четырёх букв — не эхо (в финале; черновик решает отдельно).
assert not G.similar_word("ан", "анық")
# Короткие — только точно: иначе «is» совпало бы с «it's», «in» — с «inside».
assert G.similar_word("is", "is")
assert not G.similar_word("is", "it")
assert not G.similar_word("in", "inside")
assert not G.similar_word("football", "food")
assert not G.similar_word("тоқта", "тамақты")

# --- эталон: что тьютор говорит и когда -------------------------------------------
clk = _Clock(10.0)
ref = G.EchoReference(tail_sec=0.6, now=clk)
# Текст приходит кусками модели — слово может разорваться между кусками.
ref.begin_reply()
for chunk in ("Кешіріңіз, ан", "ық естімедім — қай", "талай аласыз ба?"):
    ref.add_text(chunk)
ref.end_reply()
assert ref.words() == ["кешіріңіз", "анық", "естімедім", "қайталай", "аласыз", "ба"], ref.words()
# Тьютор ещё не говорит — эха быть не может (текст синтезируется заранее).
assert ref.is_echo("Кешіріңіз", 10.0) is False
clk.t = 11.0
ref.on_agent_state("speaking")
assert ref.is_echo("Кешіріңіз", 11.5) is True
assert ref.is_echo("есті", 11.6) is True
assert ref.is_echo("тоқта", 11.6) is False
# Чуть раньше старта (состояние «speaking» ставится с запозданием) — ещё эхо.
assert ref.is_echo("анық", 10.9) is True
assert ref.is_echo("анық", 10.5) is False
clk.t = 14.0
ref.on_agent_state("listening")
# Хвост: эхо последних слов доезжает после конца речи.
assert ref.is_echo("ба", 14.5) is True
# После хвоста — это ученик, даже если повторил слово тьютора («повтори за мной»).
assert ref.is_echo("қайталай", 14.7) is False
# Без времени слова — берём «сейчас».
clk.t = 14.3
assert ref.is_echo("аласыз") is True
clk.t = 20.0
assert ref.is_echo("аласыз") is False
# Помним только последние реплики: эхо древней фразы не ловим.
for i in range(G.EchoReference.KEEP_REPLIES):
    ref.begin_reply()
    ref.add_text(f"new{i} words")
    ref.end_reply()
ref.on_agent_state("speaking")
assert ref.is_echo("кешіріңіз", 20.1) is False
assert ref.is_echo("words", 20.1) is True

# Только уже сказанное: ученик перебил тьютора в начале реплики, а те же слова
# стоят дальше в ещё не сказанном тексте (живой зонд 03.10.2026, Декстер: «Стоп,
# я не понял» — «не понял» уходило в эхо).
clk = _Clock(30.0)
ref = G.EchoReference(tail_sec=0.6, now=clk)
ref.begin_reply()
ref.add_text("Ну бля, Нурлан, ты серьёзно? It was very fun — так никто не говорит, "
             "ты меня вообще не понял, давай заново.")
ref.end_reply()
ref.on_agent_state("speaking")  # звук реплики пошёл в 30.0
# Через секунду сказано ~18 символов (+ запас) — «понял» (≈90-й символ) ещё впереди.
assert ref.is_echo("понял", 31.0) is False
assert ref.is_echo("Нурлан", 31.0) is True
# Через четыре секунды тьютор до него уже дошёл — теперь это эхо.
assert ref.is_echo("понял", 34.0) is True

# --- часы: время слова Soniox → момент прихода этого звука -------------------------
clk = _Clock(50.0)
ac = G.AudioClock(now=clk)
assert ac.at(0) is None
for i in range(10):  # десять кадров по 20 мс, приходят в реальном времени
    clk.t = 50.0 + i * 0.02
    ac.push(0.02)
assert abs(ac.at(0) - 50.0) < 1e-9
assert abs(ac.at(55) - (50.04 + 0.015)) < 1e-9
assert ac.at(None) is None
# Пачка тишины (рация досылает её разом) — у всех кадров одно время прихода.
clk.t = 60.0
ac.push(1.0)
assert abs(ac.at(700) - 60.5) < 1e-9
ac.reset()
assert ac.at(0) is None

# --- фильтр по словам фразы -------------------------------------------------------
clk = _Clock(5.0)
ref = G.EchoReference(tail_sec=0.6, now=clk)
ref.begin_reply()
ref.add_text("Кешіріңіз, анық естімедім — қайталай аласыз ба?")
ref.end_reply()
ref.on_agent_state("speaking")
# Время слова: мс сокета = секунды от 5.0 (часы-заглушка).
flt = G.EchoFilter(ref, clock=lambda ms: None if ms is None else 5.0 + ms / 1000)
# Черновик: эхо уходит плагину уже без своих слов, слова ученика остаются.
out, dropped = flt.process([_tok("Кеш", 100, 250, False), _tok("іріңіз,", 250, 500, False),
                            _tok(" тоқта", 600, 900, False)])
# Выкинули начало — у первого оставленного слова пробел срезан: плагин клеит
# текст как есть, и реплика начиналась бы с пробела.
assert [t["text"] for t in out] == ["тоқта"], out
assert all(t["is_final"] is False for t in out)
assert dropped == ""
# Финальные куски придерживаются до конца фразы и решаются целыми словами.
out, _ = flt.process([_tok("Кеш", 100, 250), _tok("іріңіз,", 250, 500), _tok(" ан", 600, 700, False)])
assert [t["text"] for t in out] == [], out
out, dropped = flt.process([_tok(" анық", 600, 800), _tok(" —", 800, 850), _tok(" тоқта", 900, 1200), END])
assert [t["text"] for t in out] == ["тоқта", "<end>"], out
assert out[0]["is_final"] is True
# Знак препинания без букв уходит вместе со своим словом.
assert dropped == "Кешіріңіз, анық —", dropped
assert flt.dropped_words == 2 and flt.kept_words == 1, (flt.dropped_words, flt.kept_words)
# Фраза целиком из эха: плагину уходит только конец фразы — реплики нет.
out, dropped = flt.process([_tok("Кешіріңіз.", 1500, 1900), END])
assert [t["text"] for t in out] == ["<end>"], out
assert dropped == "Кешіріңіз."
# Короткое слово тьютора рядом со словами ученика — слово ученика
# (офлайн-стенд: «Тоқта, мен түсінбедім» поверх эха «Мен Айзеремін»).
ref.begin_reply()
ref.add_text("Сәлем! Мен Айзеремін.")
ref.end_reply()
out, dropped = flt.process([_tok("Тоқта,", 2100, 2500), _tok(" мен", 2500, 2700),
                            _tok(" түсінбедім.", 2700, 3300), END])
assert [t["text"] for t in out] == ["Тоқта,", " мен", " түсінбедім.", "<end>"], out
assert dropped == "", dropped
# А рядом со словом эха короткое — тоже эхо.
out, dropped = flt.process([_tok("Мен", 1950, 2100), _tok(" Айзеремін.", 2100, 2700), END])
assert [t["text"] for t in out] == ["<end>"], out
assert dropped == "Мен Айзеремін.", dropped
# А длинное слово тьютора между словами ученика — всё равно эхо: эхо и
# ученик перемешиваются, и длинное совпадение случайным не бывает.
out, dropped = flt.process([_tok("Тоқта,", 3500, 3900), _tok(" Айзеремін", 3900, 4400),
                            _tok(" түсінбедім.", 4400, 5000), END])
assert dropped == "Айзеремін", dropped
# Перебивание «түсінбедім» поверх «Түсіндім» тьютора — слово ученика.
ref.begin_reply()
ref.add_text("Түсіндім, Нұрлан, сіз университетте оқисыз.")
ref.end_reply()
out, dropped = flt.process([_tok("Мен", 5200, 5400), _tok(" түсінбедім.", 5400, 6000), END])
assert [t["text"] for t in out] == ["Мен", " түсінбедім.", "<end>"], out
assert dropped == "", dropped
# Тьютор замолчал, хвост прошёл — те же слова уже ученика.
clk.t = 10.0
ref.on_agent_state("listening")
out, dropped = flt.process([_tok("Қайталай", 6000, 6300), END])
assert [t["text"] for t in out] == ["Қайталай", "<end>"], out
flt.reset()

# --- сквозной: настоящий плагин Soniox + наш сокет -------------------------------
class _FakeWS:
    """Сокет, который отдаёт заранее записанные сообщения после того, как ушло
    всё аудио (иначе часам не из чего сопоставить время слов)."""

    def __init__(self, messages, audio_ready):
        self._messages = messages
        self._audio_ready = audio_ready
        self.texts = []
        self.closed = False

    async def send_bytes(self, data):
        pass

    async def send_str(self, data):
        self.texts.append(data)

    async def close(self):
        self.closed = True

    def __aiter__(self):
        return self._gen()

    async def _gen(self):
        await self._audio_ready.wait()
        for m in self._messages:
            yield aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps(m), None)
        await asyncio.sleep(3600)


def _pcm(sec, amp):
    n = int(SR * sec)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 220 * t) * amp).astype(np.int16).tobytes()


async def _run_echo(messages, *, echo: bool, speaking: bool = True):
    audio_ready = asyncio.Event()
    real_connect = soniox_stt.SpeechStream._connect_ws

    async def fake_connect(self):
        self.audio_queue = asyncio.Queue()
        return _FakeWS(messages, audio_ready)

    soniox_stt.SpeechStream._connect_ws = fake_connect
    try:
        engine = G.GuardedSonioxSTT(
            api_key="test", params=soniox.STTOptions(), lock=False, echo=echo, echo_tail_sec=0.6
        )
        if echo:
            engine.echo.begin_reply()
            engine.echo.add_text("Кешіріңіз, анық естімедім — қайталай аласыз ба?")
            engine.echo.end_reply()
            if speaking:
                engine.echo.on_agent_state("speaking")
        stream = engine.stream()
        audio = _pcm(2.0, 3000)
        for i in range(0, len(audio), 640):
            stream.push_frame(rtc.AudioFrame(audio[i : i + 640], SR, 1, 320))
        for _ in range(30):
            await asyncio.sleep(0.01)
        audio_ready.set()
        interims, finals = [], []

        async def _collect():
            async for ev in stream:
                if ev.type == lk_stt.SpeechEventType.INTERIM_TRANSCRIPT:
                    interims.append(ev.alternatives[0].text)
                elif ev.type == lk_stt.SpeechEventType.FINAL_TRANSCRIPT:
                    finals.append(ev.alternatives[0].text)

        try:
            await asyncio.wait_for(_collect(), timeout=1.0)
        except asyncio.TimeoutError:
            pass
        await stream.aclose()
        return engine, interims, finals
    finally:
        soniox_stt.SpeechStream._connect_ws = real_connect


ECHO_MSGS = [
    # Черновик эха — ровно то, что раньше перебивало тьютора (min_words=1).
    {"tokens": [_tok("Кеш", 100, 300, False), _tok("іріңіз", 300, 600, False)]},
    {"tokens": [_tok("Кеш", 100, 300), _tok("іріңіз,", 300, 600), _tok(" анық", 700, 1000), END]},
]
# Без фильтра эхо становится репликой ученика.
_, interims, finals = asyncio.run(_run_echo(ECHO_MSGS, echo=False))
assert finals == ["Кешіріңіз, анық"], finals
assert any("Кешіріңіз" in t for t in interims), interims
# С фильтром — ни черновика со словами (перебивать нечем), ни реплики.
engine, interims, finals = asyncio.run(_run_echo(ECHO_MSGS, echo=True))
assert not any(t.strip() for t in interims), interims
assert not any(t.strip() for t in finals), finals
# Ученик поверх эха: его слова проходят, эхо — нет.
MIXED = [{"tokens": [_tok("Кешіріңіз,", 100, 600), _tok(" тоқта", 700, 1000), _tok(" ақылы", 1000, 1300), END]}]
_, interims, finals = asyncio.run(_run_echo(MIXED, echo=True))
assert finals == ["тоқта ақылы"], finals
# Тьютор молчит давно — фильтр ничего не трогает.
_, interims, finals = asyncio.run(_run_echo(ECHO_MSGS, echo=True, speaking=False))
assert finals == ["Кешіріңіз, анық"], finals


# --- finalize по концу речи VAD («Свободно») -------------------------------------
class _FinalizeWS:
    """Сокет Soniox, который отвечает только на finalize (как Soniox, который
    ждёт сам конца казахской фразы)."""

    def __init__(self):
        self.bytes_sent = 0
        self.bytes_at_finalize = None
        self.texts = []
        self._finalized = asyncio.Event()
        self.closed = False

    async def send_bytes(self, data):
        self.bytes_sent += len(data)

    async def send_str(self, data):
        self.texts.append(data)
        if json.loads(data).get("type") == "finalize":
            self.bytes_at_finalize = self.bytes_sent
            self._finalized.set()

    async def close(self):
        self.closed = True

    def __aiter__(self):
        return self._gen()

    async def _gen(self):
        await self._finalized.wait()
        msg = {"tokens": [_tok("Мен", 100, 300), _tok(" студентпін", 300, 900),
                          {"text": "<fin>", "is_final": True}]}
        yield aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps(msg), None)
        await asyncio.sleep(3600)


async def _vad_case(*, enabled=True, cancel=False, ptt_finalize=False, noise_sec=0.6, resume=False):
    ws = _FinalizeWS()
    real_connect = soniox_stt.SpeechStream._connect_ws

    async def fake_connect(self):
        self.audio_queue = asyncio.Queue()
        return ws

    soniox_stt.SpeechStream._connect_ws = fake_connect
    try:
        engine = G.GuardedSonioxSTT(
            api_key="test", params=soniox.STTOptions(), lock=False,
            finalize=ptt_finalize, vad_finalize=enabled, vad_finalize_sec=0.2,
        )
        stream = engine.stream()
        speech = _pcm(1.0, 6000)
        for i in range(0, len(speech), 640):
            stream.push_frame(rtc.AudioFrame(speech[i : i + 640], SR, 1, 320))
        # VAD: ученик замолчал. Микрофон в «Свободно» открыт — дальше идёт не
        # цифровой ноль, а тихий шум комнаты.
        armed = engine.finalize_on_silence()
        if cancel:
            # Ученик заговорил снова раньше, чем ушла команда.
            engine.cancel_silence_finalize()
        noise = _pcm(0.02, 40)
        if resume:
            # 0.1 с паузы — и ученик снова говорит, а VAD этого ещё не заметил.
            for _ in range(5):
                stream.push_frame(rtc.AudioFrame(noise, SR, 1, 320))
            loud = _pcm(0.02, 5000)
            for _ in range(10):
                stream.push_frame(rtc.AudioFrame(loud, SR, 1, 320))
        for _ in range(int(round(noise_sec / 0.02))):
            stream.push_frame(rtc.AudioFrame(noise, SR, 1, 320))
        finals = []

        async def _collect():
            async for ev in stream:
                if ev.type == lk_stt.SpeechEventType.FINAL_TRANSCRIPT:
                    finals.append(ev.alternatives[0].text)
                    if ev.alternatives[0].text == "":
                        return

        try:
            await asyncio.wait_for(_collect(), timeout=1.0)
        except asyncio.TimeoutError:
            pass
        await stream.aclose()
        return engine, ws, armed, finals, len(speech)
    finally:
        soniox_stt.SpeechStream._connect_ws = real_connect


engine, ws, armed, finals, speech_bytes = asyncio.run(_vad_case())
assert armed == 1, armed
# Команда ушла после всей речи и ровно 0.2 с шума за ней (VAD уже отсчитал
# свои 0.3 с тишины — вместе полсекунды, как у рации).
assert ws.bytes_at_finalize == speech_bytes + 10 * 640, (ws.bytes_at_finalize, speech_bytes)
assert finals == ["Мен студентпін", ""], finals
# Ученик продолжил — взвод снят, команды нет.
engine, ws, armed, finals, _ = asyncio.run(_vad_case(cancel=True))
assert not any(json.loads(t).get("type") == "finalize" for t in ws.texts), ws.texts
assert finals == []
# Ученик заговорил снова раньше, чем VAD это заметил, — команда не уходит
# (иначе Soniox закрыл бы начало его слова обрубком: «It's» вместо «It was»).
engine, ws, armed, finals, _ = asyncio.run(_vad_case(resume=True))
assert armed == 1
assert not any(json.loads(t).get("type") == "finalize" for t in ws.texts), ws.texts
assert finals == []
# Рубильник выключен — ничего не взводится, Soniox ждёт сам.
engine, ws, armed, finals, _ = asyncio.run(_vad_case(enabled=False))
assert armed == 0
assert not any(json.loads(t).get("type") == "finalize" for t in ws.texts)
# finalize по концу речи не зависит от finalize рации.
engine, ws, armed, finals, _ = asyncio.run(_vad_case(ptt_finalize=False))
assert finals == ["Мен студентпін", ""], finals


# --- подписка на события сессии --------------------------------------------------
class _Ev:
    def __init__(self, new_state, old_state=""):
        self.new_state = new_state
        self.old_state = old_state


class _FakeSession:
    def __init__(self):
        self.handlers = {}

    def on(self, name):
        def deco(fn):
            self.handlers.setdefault(name, []).append(fn)
            return fn
        return deco

    def emit(self, name, ev):
        for fn in self.handlers.get(name, []):
            fn(ev)


class _FakeSTT:
    def __init__(self):
        self.echo = G.EchoReference(tail_sec=0.6)
        self.vad_finalize = True
        self.calls = []

    def finalize_on_silence(self):
        self.calls.append("arm")
        return 1

    def cancel_silence_finalize(self):
        self.calls.append("cancel")


mode = {"auto": True}
sess, fstt = _FakeSession(), _FakeSTT()
G.attach_echo_and_vad_finalize(sess, fstt, is_auto=lambda: mode["auto"])
sess.emit("user_state_changed", _Ev("speaking", "listening"))
sess.emit("user_state_changed", _Ev("listening", "speaking"))
assert fstt.calls == ["cancel", "arm"], fstt.calls
# Рация: конец хода задаёт кнопка, VAD finalize не шлёт.
mode["auto"] = False
sess.emit("user_state_changed", _Ev("listening", "speaking"))
assert fstt.calls == ["cancel", "arm"], fstt.calls
# «away» — ученик ушёл, а не договорил.
mode["auto"] = True
sess.emit("user_state_changed", _Ev("away", "listening"))
assert fstt.calls == ["cancel", "arm"], fstt.calls
# Состояние тьютора доезжает до эталона эха.
sess.emit("agent_state_changed", _Ev("speaking", "thinking"))
assert fstt.echo._windows and fstt.echo._windows[-1][1] is None
sess.emit("agent_state_changed", _Ev("listening", "speaking"))
assert fstt.echo._windows[-1][1] is not None
# Рация: тьютор говорит, но окно эха не открывается — микрофон закрыт.
mode["auto"] = False
n_windows = len(fstt.echo._windows)
sess.emit("agent_state_changed", _Ev("speaking", "thinking"))
assert len(fstt.echo._windows) == n_windows
assert fstt.echo.is_echo("сәлем") is False
mode["auto"] = True
# Обёртка без фильтров — подписок нет вовсе.
sess2 = _FakeSession()


class _Bare:
    echo = None
    vad_finalize = False


G.attach_echo_and_vad_finalize(sess2, _Bare(), is_auto=lambda: True)
assert sess2.handlers == {}, sess2.handlers

# --- проводка в агенте -----------------------------------------------------------
import agent as A  # noqa: E402

_env(SONIOX_API_KEY="test", ECHO_GUARD="on", ECHO_GUARD_TUTORS="aizere",
     SONIOX_VAD_FINALIZE="on", SONIOX_VAD_FINALIZE_TUTORS="aizere")
stt_a = A._cascade_stt_soniox(A.LearnerProfile(tutor="aizere"))
assert isinstance(stt_a, G.GuardedSonioxSTT)
assert stt_a.echo is not None and stt_a.vad_finalize is True
stt_b = A._cascade_stt_soniox(A.LearnerProfile(tutor="bro"))
assert stt_b.echo is None and stt_b.vad_finalize is False
_env(SONIOX_API_KEY=None, ECHO_GUARD=None, ECHO_GUARD_TUTORS=None, SONIOX_VAD_FINALIZE=None,
     SONIOX_VAD_FINALIZE_TUTORS=None)


# Текст реплики по пути в синтез доезжает до эталона — кусками, как от модели.
async def _tap_case():
    ref = G.EchoReference(tail_sec=0.6)

    async def _src():
        for c in ("Сәлем! Мен Ай", "земін. ", "How are you?"):
            yield c

    out = [c async for c in A._tap_echo(_src(), ref)]
    return out, ref


out, ref = asyncio.run(_tap_case())
assert "".join(out) == "Сәлем! Мен Айземін. How are you?"
assert ref.words() == ["сәлем", "мен", "айземін", "how", "are", "you"], ref.words()


async def _tap_none():
    async def _src():
        yield "a b"

    return [c async for c in A._tap_echo(_src(), None)]


assert asyncio.run(_tap_none()) == ["a b"]

print("echo guard + vad finalize: ok")
