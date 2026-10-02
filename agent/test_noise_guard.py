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

# Своя канарейка замка и сторожа главнее общей: замок обкатывается на одном
# тьюторе, а finalize рации остаётся у всех из общего списка.
_env(NOISE_GUARD_TUTORS="bro,gentle,hype,jarvis,aizere", SPEAKER_LOCK_TUTORS="jarvis",
     TURN_WATCHDOG_TUTORS="hype")
assert G.speaker_lock_enabled("jarvis") is True
assert G.speaker_lock_enabled("bro") is False
assert G.soniox_finalize_enabled("bro") is True
assert G.turn_watchdog_sec("hype") == 1.2
assert G.turn_watchdog_sec("jarvis") == 0.0
_env(NOISE_GUARD_TUTORS=None, SPEAKER_LOCK_TUTORS=None, TURN_WATCHDOG_TUTORS=None)
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
assert G.speaker_lock_same() == 0.6 and G.speaker_lock_outlier() == 1.6
_env(SPEAKER_LOCK_SAME="0.7", SPEAKER_LOCK_OUTLIER="0")
assert G.speaker_lock_same() == 0.7 and G.speaker_lock_outlier() == 0.0
_env(SPEAKER_LOCK_SAME="2", SPEAKER_LOCK_OUTLIER="x")
assert G.speaker_lock_same() == 0.6 and G.speaker_lock_outlier() == 1.6
_env(SPEAKER_LOCK_SAME=None, SPEAKER_LOCK_OUTLIER=None)
assert G.speaker_lock_memory() is False and G.speaker_lock_debug() is False
assert G.speaker_lock_prior_bg() == 0.5
_env(SPEAKER_LOCK_MEMORY="on", SPEAKER_LOCK_DEBUG="on", SPEAKER_LOCK_PRIOR_BG="0.4")
assert G.speaker_lock_memory() is True and G.speaker_lock_debug() is True
assert G.speaker_lock_prior_bg() == 0.4
_env(SPEAKER_LOCK_MEMORY=None, SPEAKER_LOCK_DEBUG=None, SPEAKER_LOCK_PRIOR_BG=None)
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


END = {"text": "<end>", "is_final": True}


def _texts(tokens):
    return [t["text"] for t in tokens]


def _feed(lock, *parts):
    """Аудио кусками по 10 мс, как приходят кадры из комнаты."""
    for seconds, amp in parts:
        buf = _pcm(seconds, amp)
        for i in range(0, len(buf), 320):
            lock.push_pcm(buf[i : i + 320], SR)


lock = G.SpeakerLock()
# 0–1 с громко (ученик у микрофона), 1–2 с тихо (телевизор).
_feed(lock, (1.0, 9000), (1.0, 1500))
assert len(lock._windows) == 20

# Пока фраза идёт, финальные куски придержаны и уходят плагину черновыми. До
# конца первой фразы основного ещё нет — черновик показывает всё.
out, dropped = lock.process(
    [
        _tok(" I", 100, 300, "1"),
        _tok(" like", 300, 600, "1"),
        _tok(" it", 600, 800, "1"),
        _tok(" breaking", 1100, 1400, "2"),
        _tok(" news", 1400, 1700, "2"),
        _tok(" tonight", 1700, 1900, "2"),
    ]
)
assert _texts(out) == [" I", " like", " it", " breaking", " news", " tonight"], out
assert all(t["is_final"] is False for t in out)
assert dropped == ""
# Конец фразы: решение разом, финальные куски — перед самим <end>.
out, dropped = lock.process([END])
assert _texts(out) == [" I", " like", " it", "<end>"], out
assert out[0]["is_final"] is True and out[1]["is_final"] is True
assert dropped == "breaking news tonight", dropped
assert lock.primary == "1"
assert (lock.kept_words, lock.dropped_words) == (3, 3)

# Говорящий один — сравнивать не с кем, основного нет и ничего не выкидываем
# (тихая комната; или фраза одного фона, закрытая Soniox до ученика).
solo = G.SpeakerLock()
_feed(solo, (1.0, 1500))
out, dropped = solo.process(
    [_tok(" good", 100, 300, "1"), _tok(" evening", 300, 600, "1"), _tok(" and", 600, 900, "1"), END]
)
assert solo.primary is None and dropped == ""
assert _texts(out) == [" good", " evening", " and", "<end>"]
assert lock._held == []

# Слова без говорящего (разметка выключена) и служебные — всегда проходят.
out, _ = lock.process([{"text": " hi", "is_final": True}, {"text": "<fin>", "is_final": True}])
assert _texts(out) == [" hi", "<fin>"], out

# Новости ДО ученика в той же фразе: фон успел стать основным, но к концу
# фразы громче ученик — и фон вырезается целиком, а не проходит, как в v1.
switches = []
tv_first = G.SpeakerLock(on_switch=lambda old, new, a, b: switches.append((old, new)))
_feed(tv_first, (1.0, 1500), (1.0, 9000))
out, _ = tv_first.process(
    [_tok(" good", 100, 300, "1"), _tok(" evening", 300, 600, "1"), _tok(" news", 600, 900, "1")]
)
assert _texts(out) == [" good", " evening", " news"]  # пока фон один — черновик его показывает
out, dropped = tv_first.process(
    [_tok(" I", 1100, 1300, "2"), _tok(" fully", 1300, 1600, "2"), _tok(" agree", 1600, 1900, "2"), END]
)
assert _texts(out) == [" I", " fully", " agree", "<end>"], out
assert dropped == "good evening news", dropped
# Уровни считаются на конце фразы её же словами — ученик сразу основной.
assert switches == [(None, "2")], switches

# Разметка прыгает внутри слова — слово решается целиком по большинству
# кусков: не «esterdched», а «Yesterday».
word = G.SpeakerLock(keep=0)
_feed(word, (1.0, 9000), (1.0, 1500))
word.process([_tok(" I", 100, 200, "1")])
out, dropped = word.process(
    [
        _tok(" Yes", 200, 300, "1"),
        _tok("ter", 300, 400, "2"),
        _tok("day", 400, 500, "1"),
        _tok(",", 500, 520, "1"),
        _tok(" we", 520, 700, "1"),
        _tok(" rain", 1100, 1300, "2"),
        _tok("ing", 1300, 1400, "1"),
        _tok(" heavy", 1400, 1600, "2"),
        _tok(" now", 1600, 1800, "2"),
        END,
    ]
)
assert "".join(_texts(out)) == " I Yesterday, we<end>", out
assert dropped == "raining heavy now", dropped

# Чуть громче — не повод: без запаса микрофон метался бы на каждом слове.
lock3 = G.SpeakerLock()
_feed(lock3, (1.0, 7000), (1.0, 6000), (1.0, 7500))
lock3.process(
    [_tok(" a", 100, 300, "1"), _tok(" b", 300, 600, "1"), _tok(" c", 600, 900, "1"),
     _tok(" x", 1100, 1300, "2"), _tok(" y", 1300, 1600, "2"), _tok(" z", 1600, 1900, "2"), END]
)
assert lock3.primary == "1"
lock3.process([_tok(" p", 2100, 2300, "2"), _tok(" q", 2300, 2600, "2"), _tok(" r", 2600, 2900, "2"), END])
assert lock3.primary == "1"

# Тот самый сбой живого звонка с громкими новостями: ученик основной, потом
# фраза, где разметка отдала ученику тихие куски (окончания, ошибки), и фраза
# одного фона. В v2 среднее ученика проседало, и фон забирал микрофон.
stable = G.SpeakerLock()
_feed(stable, (2.0, 9000), (1.0, 900), (2.0, 2500))
learner_words = [_tok(f" w{i}", 100 + i * 300, 350 + i * 300, "1") for i in range(6)]
stable.process(learner_words + [END])
assert stable.primary is None  # говорящий пока один
# Тихие куски «ученика» (на самом деле шум) — его медиану не сдвигают.
stable.process([_tok(" uh", 2100, 2300, "1"), _tok(" mm", 2400, 2600, "1"), END])
# Фраза одного фона — фон громче этих кусков, но не уровня ученика.
out, dropped = stable.process(
    [_tok(" tonight", 3100, 3500, "2"), _tok(" heavy", 3600, 4000, "2"), _tok(" rain", 4100, 4500, "2"),
     _tok(" expected", 4500, 4900, "2"), END]
)
assert stable.primary == "1", stable.primary
assert dropped == "tonight heavy rain expected", dropped

# Soniox расщепил ученика надвое: второй «говорящий» почти так же громок, как
# основной, — его слова свои. Фон заметно тише — режется.
split = G.SpeakerLock(keep=0, outlier=0)
_feed(split, (1.0, 9000), (1.0, 6500), (1.0, 2500))
out, dropped = split.process(
    [_tok(" I", 100, 300, "2"), _tok(" want", 300, 600, "2"), _tok(" to", 600, 900, "2"),
     _tok(" my", 1100, 1400, "3"), _tok(" English", 1400, 1700, "3"), _tok(" now", 1700, 1900, "3"),
     _tok(" heavy", 2100, 2400, "1"), _tok(" rain", 2400, 2700, "1"), _tok(" again", 2700, 2900, "1"), END]
)
assert "".join(_texts(out)) == " I want to my English now<end>", out
assert dropped == "heavy rain again", dropped

# Обратная ошибка: слова ученика записаны на говорящего-фон. Для фона они
# слишком громкие (≥ OUTLIER его медиан) — остаются; его собственные — нет.
mis = G.SpeakerLock(keep=0, same=0)
_feed(mis, (1.0, 9000), (2.0, 1200), (1.0, 5000))
out, dropped = mis.process(
    [_tok(" I", 100, 300, "2"), _tok(" think", 300, 600, "2"), _tok(" so", 600, 900, "2"),
     _tok(" tonight", 1100, 1500, "1"), _tok(" heavy", 1500, 2000, "1"), _tok(" rain", 2000, 2500, "1"),
     _tok(" expected", 2500, 2900, "1"),
     _tok(" than", 3100, 3400, "1"), _tok(" class", 3400, 3900, "1"), END]
)
assert "".join(_texts(out)) == " I think so than class<end>", out
assert dropped == "tonight heavy rain expected", dropped

# Память между потоками: в рации поток новый на каждый ход, и замок в нём
# начинает с нуля. Уровень ученика из прошлого потока делает фоном говорящего,
# который намного тише, даже если он в новом потоке пока один.
remembered = []
first = G.SpeakerLock(on_primary_words=remembered.extend)
_feed(first, (1.0, 9000), (1.0, 1500))
first.process(
    [_tok(" I", 100, 300, "1"), _tok(" like", 300, 600, "1"), _tok(" it", 600, 900, "1"),
     _tok(" rain", 1100, 1400, "2"), _tok(" is", 1400, 1700, "2"), _tok(" here", 1700, 1900, "2"), END]
)
# Наружу уходят слова основного — по ним STT держит уровень ученика по звонку.
assert len(remembered) == 3 and all(abs(x - 9000 / 2 ** 0.5) < 50 for x in remembered), remembered
lines = []
second = G.SpeakerLock(prior=lambda: G.quantile(remembered, 0.75), prior_bg=0.35, on_segment=lines.append)
_feed(second, (1.0, 1500), (1.0, 8000))
out, dropped = second.process(
    [_tok(" good", 100, 400, "1"), _tok(" evening", 400, 700, "1"), _tok(" news", 700, 900, "1"), END]
)
assert second.primary is None  # говорящий в потоке пока один
assert dropped == "good evening news", dropped
# Ученик в новом потоке — не тише памяти: его слова проходят.
out, dropped = second.process([_tok(" hello", 1100, 1500, "2"), _tok(" there", 1500, 1900, "2"), END])
assert _texts(out) == [" hello", " there", "<end>"], out
# Отладочная строка: уровни, память и каждое слово с решением.
assert "память=6364" in lines[0] and "good:1:" in lines[0] and lines[0].rstrip().endswith("x"), lines[0]
# Без памяти одинокий фон проходит, как раньше.
nomem = G.SpeakerLock()
_feed(nomem, (1.0, 1500))
out, dropped = nomem.process(
    [_tok(" good", 100, 400, "1"), _tok(" evening", 400, 700, "1"), _tok(" news", 700, 900, "1"), END]
)
assert dropped == ""

# «Свой» говорящий меряется и от памяти об ученике. Живой звонок 02.10.2026
# («Свободно», новости −6 дБ): разметка отдала ученику тихие слова фона, его
# уровень в потоке просел, и фон оказался «своим» (0.67 от основного) — фраза
# новостей ушла тьютору целиком. От уровня по звонку это ~0.55 — фон.
def _sagged(prior):
    lock = G.SpeakerLock(keep=0, outlier=0, prior=prior)
    # Ученик ~3535 (просел), фон ~2263 (0.64 от него), «расщеплённый» ученик ~3300.
    _feed(lock, (1.2, 5000), (0.9, 3200), (0.9, 4667))
    return lock.process(
        [_tok(" I", 100, 300, "2"), _tok(" think", 300, 600, "2"), _tok(" online", 600, 900, "2"),
         _tok(" lessons", 900, 1150, "2"),
         _tok(" good", 1250, 1500, "1"), _tok(" evening", 1500, 1800, "1"), _tok(" group", 1800, 2050, "1"),
         _tok(" are", 2150, 2400, "3"), _tok(" more", 2400, 2700, "3"), _tok(" comfortable", 2700, 3000, "3"),
         END]
    )
out, dropped = _sagged(prior=lambda: 5000.0)
assert dropped == "good evening group", dropped
assert "".join(_texts(out)) == " I think online lessons are more comfortable<end>", out
# Без памяти — как раньше: тот же говорящий проходит «своим».
out, dropped = _sagged(prior=None)
assert dropped == "", dropped

# Черновые куски громкость не двигают: основного по ним не выбрать.
lock4 = G.SpeakerLock()
_feed(lock4, (1.0, 3000))
out, _ = lock4.process([_tok(" draft", 100, 400, "2", final=False)])
assert _texts(out) == [" draft"] and lock4.primary is None

# Слово, которое разметка отдала фону, но громкое как речь ученика, остаётся:
# это ученик, сказавший его поверх фона.
lock6 = G.SpeakerLock()
_feed(lock6, (1.0, 6000), (1.0, 5000), (1.0, 2000))
ME = [_tok(" I", 100, 300, "1"), _tok(" think", 300, 600, "1"), _tok(" so", 600, 900, "1")]
out, dropped = lock6.process(
    ME + [_tok(" than", 1100, 1900, "2"), _tok(" rain", 2100, 2500, "2"), _tok(" falls", 2500, 2900, "2"), END]
)
assert _texts(out) == [" I", " think", " so", " than", "<end>"], out
assert dropped == "rain falls", dropped
# keep=0 и outlier=0 выключают поправки — остаётся чистая разметка.
lock7 = G.SpeakerLock(keep=0, outlier=0)
_feed(lock7, (1.0, 6000), (1.0, 5000), (1.0, 2000))
out, _ = lock7.process(
    ME + [_tok(" than", 1100, 1900, "2"), _tok(" rain", 2100, 2500, "2"), _tok(" falls", 2500, 2900, "2"), END]
)
assert _texts(out) == [" I", " think", " so", "<end>"], out

# Слово, для которого аудио ещё не пришло, громкость не портит.
lock5 = G.SpeakerLock()
lock5.process([_tok(" early", 5000, 5300, "1")])
assert lock5.primary is None

# Новый сокет — номера говорящих, время и придержанная фраза с нуля.
tv_first.process([_tok(" x", 100, 200, "1")])
tv_first.reset()
assert tv_first.primary is None and tv_first._windows == [] and tv_first._held == []


# --- прогрев: «призрак» первой фразы ------------------------------------------------
# Зонд KZ TEST 02.10.2026 (синтез без фона, «Свободно»): первые ~2.5 с речи в
# звонке приходят громче в 2.5–3.5 раза, Soniox разрезал ученика на паузе —
# «1» только первая фраза (громкая), дальше всё «2». Основным стал «1», и живой
# ученик был фоном до конца звонка.
def _ghost_call(**kw):
    ghosts = []
    lock = G.SpeakerLock(on_ghost=lambda old, new: ghosts.append((old, new)), **kw)
    _feed(lock, (1.6, 13000), (0.7, 0), (1.4, 4200), (9.1, 0), (3.6, 5000))

    def phrase(start, end, n, spk):
        step = (end - start) // n
        return [_tok(f" {spk}w{i}", start + i * step, start + (i + 1) * step - 20, spk) for i in range(n)] + [END]

    out1, d1 = lock.process(phrase(0, 1600, 8, "1"))      # «I usually go to the gym after work.»
    out2, d2 = lock.process(phrase(2300, 3700, 6, "2"))   # «But yesterday I was too tired.»
    out3, d3 = lock.process(phrase(12800, 16400, 11, "2"))  # «My favorite food is plov, …»
    return lock, ghosts, (d1, d2, d3)


# Без окна прогрева — сбой как в звонке: третья фраза ученика — «фон».
lock, ghosts, (d1, d2, d3) = _ghost_call(warmup_ms=0)
assert lock.primary == "1" and ghosts == []
assert len(d3.split()) == 11, d3

# С окном: «призрак» уступает, как только живой наговорил больше него. Фраза,
# на которой ещё не наговорил (6 слов против 8), — цена правила.
lock, ghosts, (d1, d2, d3) = _ghost_call()
assert d1 == "" and len(d2.split()) == 6, (d1, d2)
assert ghosts == [("1", "2")] and lock.primary == "2", (ghosts, lock.primary)
assert d3 == "", d3

# Окно одно на звонок: второму сокету (рация, переподключение) прогрев не
# достаётся — там «призраков» нет, правило не включается.
lock, ghosts, (d1, d2, d3) = _ghost_call(claim_warmup=lambda: False)
assert lock.primary == "1" and ghosts == [] and len(d3.split()) == 11, (ghosts, d3)

# Фон переговорил ученика, чья первая фраза пришлась на прогрев, — проходит,
# пока ученик молчит. Заговорил — свежие слова снимают с него «призрака», и
# обычная смена (громче в ratio раз) возвращает ему микрофон; фон снова режется.
back = G.SpeakerLock(on_ghost=lambda old, new: None)
_feed(back, (1.6, 13000), (1.9, 0), (1.5, 2000), (1.0, 0), (2.0, 2000), (2.0, 0), (1.5, 9000), (1.0, 0), (1.5, 2000))
back.process([_tok(f" i{i}", i * 200, i * 200 + 180, "1") for i in range(8)] + [END])
_, d = back.process([_tok(f" n{i}", 3500 + i * 350, 3500 + i * 350 + 300, "2") for i in range(4)] + [END])
assert back.primary is None or back.primary == "1"
_, d = back.process([_tok(f" t{i}", 6000 + i * 400, 6000 + i * 400 + 350, "2") for i in range(5)] + [END])
assert back.primary == "2" and d == "", (back.primary, d)  # цена: 9 слов фона против 8 ученика
_, d = back.process([_tok(f" l{i}", 10000 + i * 300, 10000 + i * 300 + 250, "1") for i in range(5)] + [END])
assert back.primary == "1" and d == "", (back.primary, d)
_, d = back.process([_tok(f" z{i}", 12500 + i * 300, 12500 + i * 300 + 250, "2") for i in range(4)] + [END])
assert d == "z0 z1 z2 z3", d

# Сессия отдаёт окно прогрева один раз на звонок.
eng_w = G.GuardedSonioxSTT(api_key="test", params=soniox.STTOptions())
assert eng_w._claim_warmup() is True and eng_w._claim_warmup() is False
_env(SPEAKER_LOCK_WARMUP_MS=None)
assert G.speaker_lock_warmup_ms() == 3000.0
_env(SPEAKER_LOCK_WARMUP_MS="0")
assert G.speaker_lock_warmup_ms() == 0.0
_env(SPEAKER_LOCK_WARMUP_MS=None)

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
        {"tokens": [_tok(" breaking", 1100, 1300, "2"), _tok(" news", 1300, 1600, "2"),
                    _tok(" tonight", 1600, 1900, "2")]},
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
assert plain[0].text == "I like breaking news tonight apples", plain[0].text
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


# --- рация: «закончить сейчас» (finalize) ---------------------------------------------
_env(SONIOX_FINALIZE=None)
assert G.soniox_finalize_enabled() is True
for off in ("off", "0", "false"):
    _env(SONIOX_FINALIZE=off)
    assert G.soniox_finalize_enabled() is False, off
    assert G.soniox_finalize_enabled("jarvis") is False, off
_env(SONIOX_FINALIZE="on")
assert G.soniox_finalize_enabled() is True
_env(SONIOX_FINALIZE=None)
# Канарейка: с тьютором finalize слушается NOISE_GUARD_TUTORS.
_env(NOISE_GUARD_TUTORS="jarvis")
assert G.soniox_finalize_enabled("jarvis") is True
assert G.soniox_finalize_enabled("bro") is False
_env(NOISE_GUARD_TUTORS=None)
assert G.soniox_finalize_enabled("bro") is True


class _FinalizeWS:
    """Сокет Soniox, который отвечает ТОЛЬКО на finalize: слова фразы и <fin>.
    Пока команды нет — молчит, как молчал бы Soniox, ожидая конца фразы."""

    def __init__(self, words=True):
        self.words = words
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
        words = [_tok("I", 100, 300, None), _tok(" agree", 300, 700, None)] if self.words else []
        msg = {"tokens": words + [{"text": "<fin>", "is_final": True}]}
        for t in msg["tokens"]:
            t.pop("speaker", None)
        yield aiohttp.WSMessage(aiohttp.WSMsgType.TEXT, json.dumps(msg), None)
        await asyncio.sleep(3600)


async def _finalize_case(finalize: bool, words: bool = True, silence_sec: float = 2.0):
    ws = _FinalizeWS(words)
    real_connect = soniox_stt.SpeechStream._connect_ws

    async def fake_connect(self):
        self.audio_queue = asyncio.Queue()
        return ws

    soniox_stt.SpeechStream._connect_ws = fake_connect
    try:
        engine = G.GuardedSonioxSTT(
            api_key="test", params=soniox.STTOptions(), lock=False, finalize=finalize
        )
        stream = engine.stream()
        audio = _pcm(1.0, 6000)
        for i in range(0, len(audio), 320):
            stream.push_frame(rtc.AudioFrame(audio[i : i + 320], SR, 1, 160))
        sent = engine.finalize_now()
        # Как commit_user_turn при отцепленном входе: тишина пачкой по 0.2 с.
        zero = rtc.AudioFrame(b"\x00\x00" * 3200, SR, 1, 3200)
        for _ in range(int(round(silence_sec / 0.2))):
            stream.push_frame(zero)
        finals = []

        async def _collect():
            async for ev in stream:
                if ev.type == lk_stt.SpeechEventType.FINAL_TRANSCRIPT:
                    finals.append(ev.alternatives[0].text)
                    # Пустой FINAL — ответ на finalize, после него ждать нечего.
                    if ev.alternatives[0].text == "":
                        return

        t0 = asyncio.get_running_loop().time()
        try:
            await asyncio.wait_for(_collect(), timeout=1.5)
        except asyncio.TimeoutError:
            pass
        took = asyncio.get_running_loop().time() - t0
        await stream.aclose()
        return engine, ws, sent, finals, took
    finally:
        soniox_stt.SpeechStream._connect_ws = real_connect


engine, ws, sent, finals, took = asyncio.run(_finalize_case(True))
# Без замка обёртка не включает разметку и не фильтрует — только finalize.
assert engine._params.enable_speaker_diarization is False
assert engine.capabilities.diarization is False
assert sent == 1, sent
# Команда ушла ПОСЛЕ всей речи и ровно полсекунды тишины: без тишины за
# хвостом Soniox съедал последнее слово (живой звонок 01.10.2026).
speech = len(_pcm(1.0, 6000))
# Тишина приходит кусками по 0.2 с — команда уходит после первого куска, на
# котором набралось FINALIZE_AFTER_SILENCE_SEC.
chunks = -(-int(G.FINALIZE_AFTER_SILENCE_SEC * 10) // 2)  # ceil(0.5 / 0.2) = 3
assert ws.bytes_at_finalize == speech + chunks * 3200 * 2, (ws.bytes_at_finalize, speech)
# Сначала сама фраза, следом пустой FINAL — он только снимает ожидание commit.
assert finals == ["I agree", ""], finals
assert took < 1.0, took

# Фраза уже ушла раньше (Soniox закрыл её на паузе): на finalize он отвечает
# пустым <fin>, и без пустого FINAL commit ждал бы новый финал до 2 с.
engine, ws, sent, finals, took = asyncio.run(_finalize_case(True, words=False))
assert finals == [""], finals
assert took < 1.0, took

# Тишины нет (commit не досылает её, когда финал пришёл только что) — команды нет,
# и взвод не переживает до тишины следующего хода.
engine, ws, sent, finals, took = asyncio.run(_finalize_case(True, silence_sec=0))
assert sent == 1
assert not any(json.loads(t).get("type") == "finalize" for t in ws.texts)

# Рубильник: finalize выключен — команды нет, и Soniox молчит до своего конца фразы.
engine, ws, sent, finals, took = asyncio.run(_finalize_case(False))
assert sent == 0
assert not any(json.loads(t).get("type") == "finalize" for t in ws.texts)
assert finals == []

# --- замок решает по настоящему тьютору ------------------------------------------------
import agent as A  # noqa: E402

_env(SONIOX_API_KEY="test", NOISE_GUARD_TUTORS="jarvis", SPEAKER_LOCK=None)
# Speaking Buddy: сессия собирается на профиле Декстера, а звонок — Джарвиса.
stt_buddy = A._cascade_stt_soniox(A.LearnerProfile(tutor="bro"), guard_tutor="jarvis")
assert isinstance(stt_buddy, G.GuardedSonioxSTT) and stt_buddy._lock_on is True
# Боевой Декстер под канарейку не попадает.
stt_bro = A._cascade_stt_soniox(A.LearnerProfile(tutor="bro"))
assert isinstance(stt_bro, G.GuardedSonioxSTT) and stt_bro._lock_on is False
# Канарейка сужает и finalize: боевой Декстер его не получает.
assert stt_bro._finalize is False
assert stt_buddy._finalize is True
_env(NOISE_GUARD_TUTORS=None, SONIOX_API_KEY=None)

print("noise guard: ok")
