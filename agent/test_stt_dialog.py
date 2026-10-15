"""Контекст разговора для Soniox и пометка сомнительных слов для мозга
(noise_guard + TutorAgent.llm_node). pytest в проекте нет — файл запускается
напрямую:
    VOICE_STACK=cascade agent/venv/Scripts/python.exe agent/test_stt_dialog.py
Падает с AssertionError на первом расхождении, печатает «ok», когда всё сошлось.

Жалоба владельца 13.10.2026: «главной проблемой остаётся слух — тьютор не
понимает, о чём речь». Распознавание не знало, что тьютор только что спросил, а
мозг не знал, в каких словах распознавание сомневалось.
"""
import asyncio
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import aiohttp  # noqa: E402
from livekit import rtc  # noqa: E402
from livekit.agents import llm  # noqa: E402
from livekit.plugins import soniox  # noqa: E402
from livekit.plugins.soniox import stt as soniox_stt  # noqa: E402

import agent as A  # noqa: E402
import noise_guard as G  # noqa: E402

SR = 16000


def _env(**vals):
    for k, v in vals.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


def _tok(text, conf=0.95, final=True):
    return {"text": text, "is_final": final, "confidence": conf}


END = {"text": "<end>", "is_final": True}

# --- рубильники ------------------------------------------------------------------
_env(SONIOX_DIALOG_CONTEXT=None, SONIOX_DIALOG_CONTEXT_TUTORS=None, ASR_UNCERTAIN=None,
     ASR_UNCERTAIN_TUTORS=None, ASR_UNCERTAIN_CONF=None, NOISE_GUARD_TUTORS=None)
# Выключены по умолчанию: выкатка образа не меняет ни одного звонка, пока секрет
# не включён, — и «до/после» меряется на одной версии кода.
assert not G.dialog_context_enabled("bro")
assert not G.asr_uncertain_enabled("bro")
_env(SONIOX_DIALOG_CONTEXT="on", ASR_UNCERTAIN="on")
assert G.dialog_context_enabled("bro") and G.asr_uncertain_enabled("bro")
# Своя канарейка главнее общей.
_env(NOISE_GUARD_TUTORS="bro,aizere", SONIOX_DIALOG_CONTEXT_TUTORS="aizere")
assert not G.dialog_context_enabled("bro") and G.dialog_context_enabled("aizere")
assert G.asr_uncertain_enabled("bro") and not G.asr_uncertain_enabled("hype")
_env(ASR_UNCERTAIN_CONF="0.4")
assert G.asr_uncertain_conf() == 0.4
_env(ASR_UNCERTAIN_CONF="мусор")
assert G.asr_uncertain_conf() == G.ASR_UNCERTAIN_CONF_DEFAULT
_env(SONIOX_DIALOG_CONTEXT=None, SONIOX_DIALOG_CONTEXT_TUTORS=None, ASR_UNCERTAIN=None,
     ASR_UNCERTAIN_CONF=None, NOISE_GUARD_TUTORS=None)

# --- хвост реплики тьютора --------------------------------------------------------
assert G.reply_tail("  What did you   have\nfor breakfast? ") == "What did you have for breakfast?"
# Длинная реплика: вопрос в конце, обрезаем по началу предложения.
long_reply = "Great job! " + "You used the past simple correctly in that sentence. " * 6 + "What did you have for breakfast?"
tail = G.reply_tail(long_reply, 120)
assert tail.endswith("What did you have for breakfast?"), tail
assert len(tail) <= 120 and tail[0].isupper(), tail
# Одно длинное предложение — режем по слову, а не посреди слова.
words = " ".join(["word"] * 80) + " end?"
tail = G.reply_tail(words, 50)
assert tail.startswith("word") and tail.endswith("end?") and len(tail) <= 50, tail
assert G.reply_tail("") == "" and G.reply_tail(None) == ""

# --- контекст сессии плюс реплика -------------------------------------------------
base = soniox.ContextObject(
    general=[soniox.ContextGeneralItem(key="domain", value="online English lessons")],
    terms=["present perfect", "Dana"],
)
ctx = G.dialog_context(base, "Nice! What did you have for breakfast?")
assert ctx is not base
assert [g.key for g in ctx.general] == ["domain", "tutor_just_said"], ctx.general
assert ctx.general[-1].value == "Nice! What did you have for breakfast?"
assert "What did you have for breakfast?" in ctx.text
assert ctx.terms == ["present perfect", "Dana"]
# Базовый контекст не меняется: его берёт и следующая реплика.
assert len(base.general) == 1 and base.text is None
# Контекста у сессии могло не быть вовсе (SONIOX_STT_CONTEXT=off).
ctx = G.dialog_context(None, "Tea or coffee?")
assert ctx.general[0].key == "tutor_just_said" and ctx.terms is None
# Длинная реплика: в general — короткий хвост с вопросом (пары там короткие), в
# text — хвост подлиннее.
ctx = G.dialog_context(base, long_reply)
assert ctx.general[-1].value.endswith("What did you have for breakfast?"), ctx.general[-1].value
assert len(ctx.general[-1].value) <= G.DIALOG_GENERAL_MAX_CHARS
assert len(ctx.general[-1].value) < len(ctx.text)
assert "past simple" in ctx.text and len(ctx.text) <= G.DIALOG_CONTEXT_MAX_CHARS + 60
# Пустая реплика контекст не трогает.
assert G.dialog_context(base, "   ") is base
# Влезает в лимит Soniox с большим запасом даже на самом длинном хвосте.
big = soniox.ContextObject(terms=[f"term{i}" for i in range(600)])
assert len(json.dumps(G.dialog_context(big, "x " * 2000).__dict__, default=lambda o: o.__dict__)) < 10000


# --- уверенность по словам --------------------------------------------------------
wc = G.WordConfidence(0.6)
wc.feed([_tok("Yes", 0.99), _tok("terday"), _tok(" I", 0.98), _tok(" by", 0.31),
         _tok(" a", 0.9), _tok(" new", 0.95), _tok(" pho", 0.92), _tok("ne.", 0.45), END])
# Слово собирается из кусков, уверенность — худший кусок.
got = wc.uncertain("Yesterday I by a new phone.")
assert got == ["by", "phone"], got
# Чтение ничего не стирает: мозг на один ход бывает вызван дважды
# (предварительная генерация); в сводку реплика идёт один раз.
assert wc.uncertain("Yesterday I by a new phone.") == ["by", "phone"]
assert wc.flagged == 2, wc.flagged
# Слов реплики в распознанном нет — помечать нечего.
assert wc.uncertain("Completely different words here.") == []
# Черновики и токены без уверенности не учитываются.
wc = G.WordConfidence(0.6)
wc.feed([_tok(" maybe", 0.1, final=False), {"text": " what", "is_final": True}])
assert wc.uncertain("what maybe") == []
# После конца фразы кусок без пробела — новое слово, а не хвост старого.
wc = G.WordConfidence(0.6)
wc.feed([_tok("Hi", 0.9), END, _tok("Tea", 0.2)])
assert wc.uncertain("Hi Tea") == ["Tea"]
# Уверенность берётся у ТОГО вхождения слова, которое и есть реплика: прошлый
# сомнительный «tea» не помечает нынешний уверенный (ревью 13.10.2026).
wc = G.WordConfidence(0.6)
wc.feed([_tok("Tea", 0.2), END, _tok("I", 0.95), _tok(" want", 0.95), _tok(" tea.", 0.95), END])
assert wc.uncertain("I want tea.") == [], wc.uncertain("I want tea.")
# …и наоборот: прошлое уверенное не прячет нынешнее сомнительное.
wc = G.WordConfidence(0.6)
wc.feed([_tok("Tea", 0.95), END, _tok("I", 0.95), _tok(" want", 0.95), _tok(" tea.", 0.3), END])
assert wc.uncertain("I want tea.") == ["tea"]
# Реплика из одного слова, которое уже звучало: берётся последнее вхождение, а
# не первое (у SequenceMatcher на равных побеждает самое раннее).
wc = G.WordConfidence(0.6)
wc.feed([_tok("Yes", 0.2), END, _tok("Okay", 0.95), END, _tok("Yes", 0.95), END])
assert wc.uncertain("Yes") == [], wc.uncertain("Yes")
wc = G.WordConfidence(0.6)
wc.feed([_tok("Yes", 0.95), END, _tok("Okay", 0.95), END, _tok("Yes", 0.2), END])
assert wc.uncertain("Yes") == ["Yes"]
# Ученик договаривает, пока мозг собирается отвечать, — новые слова реплике не
# мешают.
wc = G.WordConfidence(0.6)
wc.feed([_tok("Tea", 0.2), END, _tok("maybe", 0.1)])
assert wc.uncertain("Tea") == ["Tea"]
# Не больше ASR_UNCERTAIN_MAX_WORDS.
wc = G.WordConfidence(0.6)
wc.feed([_tok(f" w{i}", 0.1) for i in range(10)])
got = wc.uncertain(" ".join(f"w{i}" for i in range(10)))
assert got == [f"w{i}" for i in range(G.ASR_UNCERTAIN_MAX_WORDS)], got


# --- уверенность и «открытая фраза» — по тому, что прошло фильтры -----------------
def _msg(tokens):
    return aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps({"tokens": tokens}), None)


wc = G.WordConfidence(0.6)
ws = G._FilteringWS(None, None, lambda s: None, lambda: None, confidence=wc)
ws._filter(_msg([_tok("Tea", 0.3), _tok(" please", 0.95), END]))
assert wc.uncertain("Tea please") == ["Tea"]
assert not ws.open_phrase
# Черновик в последнем ответе — фраза открыта.
ws._filter(_msg([_tok(" and", 0.9, final=False)]))
assert ws.open_phrase
# Финальные слова без конца фразы — тоже открыта (плагин копит их до <end>).
ws._filter(_msg([_tok(" and", 0.9), _tok(" milk", 0.9)]))
assert ws.open_phrase
ws._filter(_msg([END]))
assert not ws.open_phrase
# Пустой ответ — черновика больше нет.
ws._filter(_msg([_tok(" so", 0.9, final=False)]))
ws._filter(aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps({"tokens": []}), None))
assert not ws.open_phrase


# --- обёртка: контекст разговора и переподключение --------------------------------
FIN = {"text": "<fin>", "is_final": True}


class _FinWS:
    """Сокет Soniox: на finalize отвечает <fin> (или молчит) — после чего
    сокет можно закрыть. `after_fin` — что ещё в том же ответе."""

    def __init__(self, answer=True, after_fin=()):
        self.texts = []
        self.closed = False
        self._answer = answer
        self._after = list(after_fin)
        self._out = asyncio.Queue()

    async def send_bytes(self, data):
        pass

    async def send_str(self, data):
        self.texts.append(data)
        if self._answer and data and json.loads(data).get("type") == "finalize":
            await self._out.put([FIN, *self._after])

    async def close(self):
        self.closed = True
        await self._out.put(None)

    def push(self, tokens):
        self._out.put_nowait(tokens)

    @property
    def finalized(self):
        return any(t and json.loads(t).get("type") == "finalize" for t in self.texts)

    def __aiter__(self):
        return self._gen()

    async def _gen(self):
        while True:
            tokens = await self._out.get()
            if tokens is None:
                return
            yield aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps({"tokens": tokens}), None)


async def _settle(n=30):
    for _ in range(n):
        await asyncio.sleep(0.01)


async def _dialog_case(steps, *, auto=True, dialog=True, answer=True, after_fin=(),
                       min_sec=0.0, fin_sec=None, lock=False, memory=False):
    """steps(engine, stream) — сценарий; возвращает (engine, контексты подключений, сокеты)."""
    contexts, sockets = [], []
    real_connect = soniox_stt.SpeechStream._connect_ws

    async def fake_connect(self):
        self.audio_queue = asyncio.Queue()
        contexts.append(self._stt._params.context)
        ws = _FinWS(answer=answer, after_fin=after_fin)
        sockets.append(ws)
        return ws

    soniox_stt.SpeechStream._connect_ws = fake_connect
    real = (G.DIALOG_REFRESH_MIN_SEC, G.DIALOG_REFRESH_FIN_SEC, G.DIALOG_REFRESH_QUIET_SEC,
            G.DIALOG_REFRESH_RETRY_SEC)
    G.DIALOG_REFRESH_MIN_SEC = min_sec
    G.DIALOG_REFRESH_QUIET_SEC = 0.05
    G.DIALOG_REFRESH_RETRY_SEC = 0.1
    if fin_sec is not None:
        G.DIALOG_REFRESH_FIN_SEC = fin_sec
    try:
        base = soniox.ContextObject(terms=["Dana"])
        engine = G.GuardedSonioxSTT(
            api_key="test", params=soniox.STTOptions(context=base), lock=lock, memory=memory,
            dialog=dialog, uncertain_conf=0.6,
        )
        engine._is_auto = lambda: auto
        stream = engine.stream()
        stream.push_frame(rtc.AudioFrame(b"\0" * 640, SR, 1, 320))
        await _settle()
        await steps(engine, stream)
        await _settle()
        await stream.aclose()
        await engine.aclose()
        return engine, stream, contexts, sockets
    finally:
        soniox_stt.SpeechStream._connect_ws = real_connect
        (G.DIALOG_REFRESH_MIN_SEC, G.DIALOG_REFRESH_FIN_SEC, G.DIALOG_REFRESH_QUIET_SEC,
         G.DIALOG_REFRESH_RETRY_SEC) = real


async def _speaking_then_reply(engine, stream):
    engine.on_user_state("listening")
    engine.on_agent_state("speaking")
    engine.set_tutor_reply("What did you have for breakfast?")


# «Свободно», тьютор говорит, ученик молчит: сначала finalize, по <fin> —
# переподключение с репликой в контексте.
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_speaking_then_reply))
assert len(contexts) == 2, contexts
assert contexts[0].text is None and "breakfast" in contexts[1].text
assert sockets[0].finalized and sockets[0].closed, sockets[0].texts
assert engine.ctx_version == 1 and engine.dialog_updates == 1 and engine.dialog_reconnects == 1


# Реплика готова раньше, чем тьютор заговорил, — ждёт его речи.
async def _reply_then_speaking(engine, stream):
    engine.set_tutor_reply("What did you have for breakfast?")
    await _settle()
    assert engine.ctx_version == 0 and not stream._refresh_waiting
    engine.on_agent_state("speaking")


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_reply_then_speaking))
assert len(contexts) == 2 and "breakfast" in contexts[1].text
assert engine.dialog_reconnects == 1


# Несказанная реплика (отменённая предварительная генерация) в контекст не идёт:
# новый ответ мозга её сбрасывает.
async def _cancelled_reply(engine, stream):
    engine.set_tutor_reply("Do you mean pizza?")
    engine.begin_reply()
    engine.on_agent_state("speaking")


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_cancelled_reply))
assert engine.ctx_version == 0 and len(contexts) == 1 and not sockets[0].finalized


# Ученик успел заговорить, пока Soniox закрывал фразу (черновик после <fin>), —
# переподключение отменяется: его фраза открыта на этом сокете.
engine, stream, contexts, sockets = asyncio.run(_dialog_case(
    _speaking_then_reply, after_fin=[_tok(" well", 0.9, final=False)]))
assert sockets[0].finalized and len(contexts) == 1 and engine.dialog_reconnects == 0
assert not stream._refresh_waiting


# <fin> не пришёл — не рвём сокет вслепую.
async def _no_fin(engine, stream):
    await _speaking_then_reply(engine, stream)
    await asyncio.sleep(0.2)


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_no_fin, answer=False, fin_sec=0.1))
assert sockets[0].finalized and len(contexts) == 1 and engine.dialog_reconnects == 0
assert not stream._refresh_waiting


# Ученик говорит — даже finalize не шлём.
async def _user_speaking(engine, stream):
    engine.on_user_state("speaking")
    engine.on_agent_state("speaking")
    engine.set_tutor_reply("What did you have for breakfast?")


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_user_speaking))
assert not sockets[0].finalized and len(contexts) == 1


# …а когда замолчал — обновляем.
async def _user_stops(engine, stream):
    await _user_speaking(engine, stream)
    await _settle(5)
    engine.on_user_state("listening")


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_user_stops))
assert sockets[0].finalized and len(contexts) == 2 and "breakfast" in contexts[1].text


# Фраза ученика у Soniox открыта (пауза посреди фразы, детектор голоса его уже
# отпустил) — finalize не шлём: он оборвал бы фразу. Закрылась — обновляем.
async def _open_before(engine, stream):
    sockets_ref[0].push([_tok("Well", 0.9), _tok(" I", 0.9, final=False)])
    await _settle(5)
    assert stream.open_phrase
    await _speaking_then_reply(engine, stream)
    await _settle(10)
    assert not sockets_ref[0].finalized
    sockets_ref[0].push([_tok(" I", 0.9), _tok(" think", 0.9), END])
    await asyncio.sleep(0.4)


sockets_ref = []
real_init = _FinWS.__init__


def _remember(self, *a, **kw):
    real_init(self, *a, **kw)
    sockets_ref.append(self)


_FinWS.__init__ = _remember
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_open_before))
_FinWS.__init__ = real_init
assert sockets[0].finalized and len(contexts) == 2 and "breakfast" in contexts[1].text


# Свой finalize не единственный (VAD-finalize ещё без ответа): переподключение —
# только после ответа на последний.
async def _two_finalizes(engine, stream):
    stream._input_ch.send_nowait(G._FinalizeMark())
    await _settle(5)
    await _speaking_then_reply(engine, stream)
    await _settle(10)
    sockets_ref[0].push([FIN])
    await asyncio.sleep(0.2)
    assert stream._ctx_version == 0, "переподключился на чужой <fin>"
    sockets_ref[0].push([FIN])
    await asyncio.sleep(0.3)


sockets_ref = []
_FinWS.__init__ = _remember
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_two_finalizes, answer=False))
_FinWS.__init__ = real_init
assert len(contexts) == 2 and engine.dialog_reconnects == 1


# Слова звука, ушедшего после метки, приходят уже после <fin> — в тишину после
# него ученик заговорил: не рвём.
async def _draft_after_fin(engine, stream):
    await _speaking_then_reply(engine, stream)
    await _settle(10)
    sockets_ref[0].push([FIN])
    await asyncio.sleep(0.01)
    sockets_ref[0].push([_tok(" so", 0.9, final=False)])
    await asyncio.sleep(0.3)


sockets_ref = []
_FinWS.__init__ = _remember
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_draft_after_fin, answer=False))
_FinWS.__init__ = real_init
assert sockets[0].finalized and len(contexts) == 1 and engine.dialog_reconnects == 0


# Сокет моложе DIALOG_REFRESH_MIN_SEC — повтор по таймеру, а не потеря вопроса.
async def _young_socket(engine, stream):
    await _speaking_then_reply(engine, stream)
    # Короткая реплика уже отзвучала, когда сокет «дорос», — вопрос всё равно
    # должен доехать.
    engine.on_agent_state("listening")
    await _settle(5)
    assert not sockets_seen(stream)
    await asyncio.sleep(1.0)


def sockets_seen(stream):
    return stream._refresh_waiting or stream._ctx_version > 0


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_young_socket, min_sec=1.0))
assert len(contexts) == 2 and "breakfast" in contexts[1].text, contexts
assert engine.dialog_reconnects == 1


# Рация: живой сокет не трогаем (поток и так новый на ход), новый — с репликой.
async def _ptt(engine, stream):
    await _speaking_then_reply(engine, stream)
    await _settle()
    fresh = engine.stream()
    fresh.push_frame(rtc.AudioFrame(b"\0" * 640, SR, 1, 320))
    await _settle()
    await fresh.aclose()


engine, stream, contexts, sockets = asyncio.run(_dialog_case(_ptt, auto=False))
assert len(contexts) == 2 and contexts[0].text is None and "breakfast" in contexts[1].text
assert not sockets[0].finalized and engine.dialog_reconnects == 0

# Выключено — контекст сессии прежний, ни finalize, ни переподключений.
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_speaking_then_reply, dialog=False))
assert engine.ctx_version == 0 and len(contexts) == 1 and not sockets[0].finalized

# Замок на ученика при контексте разговора помнит уровень ученика между сокетами
# даже без SPEAKER_LOCK_MEMORY: иначе каждое переподключение заново выбирало бы
# основного, и им мог стать фон (ревью 13.10.2026).
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_speaking_then_reply, lock=True))
assert stream._lock is not None and stream._lock._prior is not None
engine, stream, contexts, sockets = asyncio.run(_dialog_case(_speaking_then_reply, lock=True, dialog=False))
assert stream._lock._prior is None
# Без порога учёта уверенности нет вовсе.
assert G.GuardedSonioxSTT(api_key="test", params=soniox.STTOptions(), lock=False).confidence is None


# --- мозг: пометка к реплике ученика ----------------------------------------------
assert A.asr_note(["by", "phone"]) == (
    '[asr_uncertain: "by", "phone" — speech recognition may have misheard these words]'
)

seen: list[llm.ChatContext] = []


async def fake_llm_node(self, chat_ctx, tools, model_settings):
    seen.append(chat_ctx)
    yield llm.ChatChunk(id="x", delta=llm.ChoiceDelta(role="assistant", content="Did you buy a new phone?"))


A.Agent.default.llm_node = fake_llm_node


class _FakeGuard:
    def __init__(self, conf):
        self.confidence = conf
        self.calls = []

    def begin_reply(self):
        self.calls.append("begin")

    def set_tutor_reply(self, text):
        self.calls.append(text)


def _ctx():
    c = llm.ChatContext()
    c.add_message(role="system", content="SYS")
    c.add_message(role="assistant", content="What did you do yesterday?")
    c.add_message(role="user", content="Yesterday I by a new phone.")
    return c


async def _run(agent, ctx):
    seen.clear()
    out = []
    async for c in agent.llm_node(ctx, [], None):
        out.append(c if isinstance(c, str) else (c.delta.content or ""))
    return "".join(out)


async def main():
    wc = G.WordConfidence(0.6)
    wc.feed([_tok("Yesterday"), _tok(" I"), _tok(" by", 0.3), _tok(" a"), _tok(" new"), _tok(" phone."), END])
    agent = A.TutorAgent(instructions="x", device_id="d", api_url="https://e.invalid", tutor="bro")
    guard = _FakeGuard(wc)
    agent._stt_guard = guard
    ctx = _ctx()
    spoken = await _run(agent, ctx)
    assert spoken == "Did you buy a new phone?"
    sent = seen[0].items[-1].text_content
    assert sent == 'Yesterday I by a new phone.\n[asr_uncertain: "by" — speech recognition may have misheard these words]', sent
    # Настоящая история без пометки: она про один ход.
    assert ctx.items[-1].text_content == "Yesterday I by a new phone."
    # Ответ начался со сброса несказанной реплики и кончился новой.
    assert guard.calls == ["begin", "Did you buy a new phone?"], guard.calls

    # Последней стоит не реплика ученика (ответ тула, приветствие) — не помечаем.
    c = llm.ChatContext()
    c.add_message(role="system", content="SYS")
    await _run(agent, c)
    assert seen[0].items[-1].text_content == "SYS"

    # Всё уверенно — история та же.
    agent._stt_guard = _FakeGuard(G.WordConfidence(0.6))
    agent._stt_guard.confidence.feed([_tok("Yesterday"), _tok(" I"), _tok(" by"), _tok(" a"), _tok(" new"), _tok(" phone."), END])
    await _run(agent, _ctx())
    assert seen[0].items[-1].text_content == "Yesterday I by a new phone."

    # Без обёртки (Azure, выключено) — ничего не меняется и ничего не падает.
    plain = A.TutorAgent(instructions="x", device_id="d", api_url="https://e.invalid", tutor="bro")
    assert await _run(plain, _ctx()) == "Did you buy a new phone?"
    assert seen[0].items[-1].text_content == "Yesterday I by a new phone."


asyncio.run(main())
print("ok")
