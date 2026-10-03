"""Защита голосового тьютора от фона: замок на ученика и сторож конца хода.

Жалоба 01.10.2026: в шумном месте тьютор отвечает на чужие слова, сам
замолкает на полуслове и не понимает, что ученик договорил. Krisp BVC к этому
моменту уже стоял на всех звонках (`Krisp BVC: on` в логах) — но близкий голос
(телевизор рядом, сосед за столом) и музыка с пением его частично проходят, а
Soniox послушно пишет их в реплику ученика.

Здесь два независимых слоя, оба выключаются секретом воркера:

* SpeakerLock — Soniox размечает говорящих (enable_speaker_diarization), а мы
  выкидываем слова всех, кроме основного. Основной — самый громкий: ученик
  сидит у микрофона, фон дальше, и BVC его вдобавок приглушает. Выкидываем на
  уровне СЛОВ, до того как плагин склеит их в реплику: штатный
  MultiSpeakerAdapter из livekit-agents решает по реплике целиком, а плагин
  Soniox 1.6.7 отдаёт реплике говорящего ПЕРВОГО слова (_TokenAccumulator).
  При непрерывном фоне конец фразы у Soniox не наступает, и реплика «телевизор
  + ученик» целиком ушла бы телевизору — вместе со словами ученика.

* TurnWatchdog — детектор голоса держит ход открытым, пока слышит хоть что-то
  похожее на речь, и музыка с пением держит его бесконечно. Сторож закрывает ход
  сам, если «речь» идёт, а слов ученика (уже после фильтра) нет дольше порога.

Плюс «закончить сейчас» для рации (GuardedSonioxSTT.finalize_now): живой
звонок 01.10.2026 показал 1.4–2.6 с тишины после отпускания кнопки — агент ждал,
пока Soniox сам закроет фразу (max_endpoint_delay до 2 с), а команду finalize
плагин 1.6.7 не шлёт вовсе.

И два слоя по жалобе тестера 03.10.2026 (Айзере, «Свободно»), оба выключены по
умолчанию и включаются секретом:

* EchoFilter — эхо тьютора. Его голос из колонок возвращается в микрофон,
  Soniox пишет его как слова ученика, одного слова хватает на перебивание
  (min_words=1), и обрывок уходит ходом ученика. Живой зонд с эхом −20 дБ:
  «Кешіріңіз, анық естімедім» 12 раз за 40 с — правило «меньше трёх слов —
  переспроси» замыкало петлю. Выкидываем слова, которые тьютор говорит прямо
  сейчас (или договорил меньше ECHO_TAIL_SEC назад), — до того, как их увидят
  перебивание и ход.

* finalize по концу речи (finalize_on_silence) — в «Свободно» ход закрывает VAD,
  но фреймворк ждёт финальный транскрипт, а казахскую фразу Soniox закрывает
  сам только через ~2.6 с (английскую — за 0.3–0.5 с). Шлём ему finalize, как
  рация, только сигналом служит конец речи по VAD.
"""

from __future__ import annotations

import asyncio
import bisect
import json
import logging
import math
import os
import re
import time
import weakref
from collections import deque
from statistics import median
from typing import Any, Callable

import numpy as np

try:  # pragma: no cover - плагина нет только в урезанных окружениях
    import aiohttp
    from livekit import rtc
    from livekit.agents import stt as lk_stt
    from livekit.agents.language import LanguageCode
    from livekit.plugins import soniox
    # SpeechStream пакет наружу не отдаёт — только модуль stt.
    from livekit.plugins.soniox import stt as soniox_stt
except Exception:  # pragma: no cover
    aiohttp = None
    rtc = None
    lk_stt = None
    LanguageCode = str
    soniox = None
    soniox_stt = None

logger = logging.getLogger("jts-agent")


# ── Рубильники ───────────────────────────────────────────────────────────────
# Всё через env, как остальные ручки агента: агент катится вручную, и включить
# или откатить слой надо секретом воркера, без пересборки образа.
#
# SPEAKER_LOCK=on|off — фильтр говорящих.
# TURN_WATCHDOG_SEC=<сек> — сторож конца хода; 0 или пусто — выключен.
# NOISE_GUARD_TUTORS=bro,hype — сузить все слои до персон (канарейка).
# SPEAKER_LOCK_TUTORS / TURN_WATCHDOG_TUTORS — своя канарейка у замка и у
#   сторожа; если задана, она главнее общей. Нужна, чтобы обкатывать замок на
#   одном тьюторе, не отбирая finalize рации у остальных. Список — ТОЛЬКО
#   файлом (`lk agent update-secrets --secrets-file`): в --secrets запятая
#   делит пары KEY=VALUE.
# SPEAKER_LOCK_RATIO — во сколько раз новый говорящий должен быть громче
#   основного, чтобы забрать у него микрофон.
# SPEAKER_LOCK_KEEP — доля громкости ученика, начиная с которой слово
#   «чужого» говорящего всё-таки оставляем; 0 — только разметка Soniox.
# SPEAKER_LOCK_SAME — доля уровня ученика, с которой говорящий считается своим
#   (ученик, расщеплённый разметкой надвое); 0 — выключить.
# SPEAKER_LOCK_OUTLIER — во сколько раз слово громче медианы своего говорящего,
#   чтобы считать его словом ученика, записанным на фон; 0 — выключить.
# SPEAKER_LOCK_MEMORY=on — помнить уровень ученика между потоками
#   распознавания (в рации поток новый на каждый ход). Выключено по умолчанию.
# SPEAKER_LOCK_PRIOR_BG — с памятью: говорящий тише этой доли уровня ученика —
#   фон, даже если в новом потоке он пока один.
# SPEAKER_LOCK_WARMUP_MS — окно прогрева от первого слова звонка, мс: основной
#   только из слов этого окна уступает живому говорящему; 0 — выключить.
# SPEAKER_LOCK_DEBUG=on — на конце каждой фразы строка в лог: уровни и каждое
#   слово с говорящим, громкостью и решением. Только для канарейки: это текст
#   речи ученика в логах.
# ECHO_GUARD=on — фильтр эха тьютора. Выключен по умолчанию.
# ECHO_GUARD_TUTORS — его канарейка (иначе — общая NOISE_GUARD_TUTORS).
# ECHO_TAIL_SEC — сколько после конца речи тьютора его слова ещё считаются эхом.
# SONIOX_VAD_FINALIZE=on — «Свободно»: finalize Soniox по концу речи VAD.
#   Выключен по умолчанию.
# SONIOX_VAD_FINALIZE_TUTORS — его канарейка (иначе — NOISE_GUARD_TUTORS).
# SONIOX_VAD_FINALIZE_SEC — сколько звука дослать после конца речи VAD, прежде
#   чем слать finalize.
SPEAKER_LOCK_DEFAULT = "on"
TURN_WATCHDOG_DEFAULT_SEC = 1.2
SPEAKER_LOCK_RATIO_DEFAULT = 1.3
# Слово «чужого» говорящего не выкидываем, если оно почти так же громкое, как
# речь ученика: при громком фоне разметка Soniox приписывает фону слова
# ученика, сказанные ПОВЕРХ фона, а громкость смеси не ниже голоса ученика.
# Замер 01.10.2026 (90 прогонов, фон −6/−12 дБ без BVC): поправка вернула 2
# слова ученика из 12 потерянных («lessons», «can») ценой ничьей по фону.
# Безударные «than», «past» тихие сами по себе — их громкостью не вернуть.
SPEAKER_LOCK_KEEP_DEFAULT = 0.75
# Говорящий с уровнем не ниже этой доли от уровня основного — тоже «свой».
# Soniox расщепляет ОДНОГО ученика на двух говорящих (запись 01.10.2026:
# «I want to improve» — говорящий 2, «my English… London next summer» —
# говорящий 3; уровни 5889 и 3585, новости — 2162), и без этого замок резал
# слова самого ученика: 57/73 на громком фоне тем же мужским голосом.
SPEAKER_LOCK_SAME_DEFAULT = 0.6
# И обратная ошибка разметки: слова ученика, записанные на говорящего-фон.
# Для «своего» говорящего они слишком громкие — в записи 01.10.2026 у фона
# медиана 964, его собственные слова не громче 1.5 медианы, а «Than lessons
# in a classroom» ученика — 1662–3044. Слово не ниже OUTLIER своих медиан и
# не ниже OUTLIER_FLOOR уровня ученика оставляем. 1.6 подобран по 24 записям:
# вернул 3 слова ученика ценой 3 слов фона.
SPEAKER_LOCK_OUTLIER_DEFAULT = 1.6
SPEAKER_LOCK_OUTLIER_FLOOR = 0.5
# Живой звонок 01.10.2026 (v3, новости −6 дБ): в рации поток распознавания
# новый на каждый ход, Soniox в нём заново нумерует говорящих, и замок каждый
# раз начинал с нуля — фраза одного фона в начале хода проходила. Память
# переносит в новый поток уровень ученика; говорящий тише PRIOR_BG этого
# уровня — фон. Порог консервативный: уровень ученика между потоками гулял
# 5907 → 2422, и тихий ученик не должен оказаться «фоном».
#
# v4: память — уровень ученика по ВСЕМУ звонку (верхняя квартиль его слов из
# всех потоков), а не по последнему потоку. Живой лог 01.10.2026: уровень по
# одному потоку гулял (у одиночного потока ученика 3100 при ~4300 по звонку),
# и фраза новостей (1781) против него была 0.57 — порог не разделял.
# По звонку: новости ~0.41, самый тихий поток ученика ~0.72. Проигрыш того
# же живого лога: 0.45 и 0.55 — ученик 59/59, фон 5/21; 0.65 — ученик 50/59.
# Берём середину безопасного диапазона.
SPEAKER_LOCK_PRIOR_BG_DEFAULT = 0.5
# Прогрев тракта: первые ~2.5 с речи в звонке приходят громче в 2.5–3.5 раза
# (Krisp/усиление ещё не встали). Зонд KZ TEST 02.10.2026 (синтез Daniel без
# фона, «Свободно»): «I usually go to the gym after work» — 14222…4158 при
# 6206…1433 той же записи офлайн, к 2.5 с — уже ×1.1. Soniox на паузе разрезал
# ученика надвое: говорящий 1 — только эта фраза, дальше всё — говорящий 2.
# Основным стал «1» с завышенным уровнем 9190, живой ученик (~3000–4000) не
# дотягивал до SAME и был фоном до конца звонка: тьютор слышал «is», «to» —
# 36–40 слов из ~50 выкинуто в 4 звонках из 6. Отсюда правило: основной, у
# которого ВСЕ слова пришлись на прогрев, уступает микрофон живому говорящему
# (см. SpeakerLock._yield_ghost). Окно — от первого слова звонка. Проигрыш
# живых логов кодом правила при окне 2–4 с одинаков: зонды с разрезом 36/42
# (было 10, 8, 6 из 42; теряется одна фраза), без разреза 42/42; четыре
# замера с новостями −6/−12 дБ — ученик и фон без изменений.
SPEAKER_LOCK_WARMUP_MS_DEFAULT = 3000.0
# Хвост эха. Последнее слово тьютора возвращается в агента через сеть ученика
# и обратно: ~0.15 с до браузера, буфер воспроизведения, ~0.15 с назад — эхо
# начала слова приходит не позже ~0.4–0.5 с после конца речи. Ученик, который
# повторяет за тьютором, начинает не раньше: та же дорога плюс реакция. Хвост
# длиннее съедал бы «повтори за мной», короче — пропускал бы эхо.
ECHO_TAIL_SEC_DEFAULT = 0.6
# Сколько звука дослать после конца речи по VAD перед finalize. VAD отдаёт конец
# речи после VAD_SILENCE_SEC (0.3 с) тишины; вместе — около секунды тишины за
# последним словом.
#
# Первая выкатка стояла на 0.2 (полсекунды вместе, как у рации) — и живой зонд
# 03.10.2026 резал ход на паузе между предложениями (0.4–0.6 с у ученика):
# «Тоқта,» | «мен түсінбедім», «ойнадым. It's» | «was very fun». Обрывок короче
# трёх слов промпт велит переспрашивать — и тьютор отвечал «Кешіріңіз, анық
# естімедім» на нормальную речь. Секунда паузы закрывает фразу всё равно
# заметно раньше, чем казахскую фразу закрывает сам Soniox (~2.6 с).
VAD_FINALIZE_DELAY_SEC_DEFAULT = 0.7
# Звук после конца речи громче этой доли речи ученика — он заговорил снова, и
# команда не уходит. VAD замечает новую речь с опозданием (нужна её минимальная
# длительность плюс инференс), и без этой проверки finalize попадал в начало
# следующего слова: Soniox закрывал его обрубком.
VAD_FINALIZE_RESUME_FRACTION = 0.25

_OFF = ("off", "0", "false", "no")
_ON = ("on", "1", "true", "yes")


def _tutor_allowed(tutor: str, own_env: str = "") -> bool:
    raw = (os.getenv(own_env) if own_env else "") or os.getenv("NOISE_GUARD_TUTORS") or ""
    only = [x.strip().lower() for x in raw.split(",") if x.strip()]
    return not only or (tutor or "").strip().lower() in only


def speaker_lock_enabled(tutor: str) -> bool:
    """Включать ли фильтр говорящих в сессии этого тьютора."""
    raw = (os.getenv("SPEAKER_LOCK") or SPEAKER_LOCK_DEFAULT).strip().lower()
    if raw in _OFF:
        return False
    return _tutor_allowed(tutor, "SPEAKER_LOCK_TUTORS")


def soniox_finalize_enabled(tutor: str | None = None) -> bool:
    """SONIOX_FINALIZE=off — откат «закончить сейчас» для рации секретом.
    С тьютором подчиняется и канарейке NOISE_GUARD_TUTORS: первый вариант
    (мгновенный finalize) съедал последнее слово, и новый включается сперва
    одному тьютору."""
    if (os.getenv("SONIOX_FINALIZE") or "").strip().lower() in _OFF:
        return False
    return tutor is None or _tutor_allowed(tutor)


def speaker_lock_ratio() -> float:
    raw = (os.getenv("SPEAKER_LOCK_RATIO") or "").strip()
    if not raw:
        return SPEAKER_LOCK_RATIO_DEFAULT
    try:
        value = float(raw)
    except ValueError:
        logger.warning("SPEAKER_LOCK_RATIO=%r не число — беру %s", raw, SPEAKER_LOCK_RATIO_DEFAULT)
        return SPEAKER_LOCK_RATIO_DEFAULT
    # Меньше единицы — тихий фон отбирал бы микрофон у ученика.
    if value < 1.0:
        logger.warning("SPEAKER_LOCK_RATIO=%r меньше 1 — беру %s", raw, SPEAKER_LOCK_RATIO_DEFAULT)
        return SPEAKER_LOCK_RATIO_DEFAULT
    return value


def speaker_lock_keep() -> float:
    raw = (os.getenv("SPEAKER_LOCK_KEEP") or "").strip()
    if not raw:
        return SPEAKER_LOCK_KEEP_DEFAULT
    try:
        value = float(raw)
    except ValueError:
        logger.warning("SPEAKER_LOCK_KEEP=%r не число — беру %s", raw, SPEAKER_LOCK_KEEP_DEFAULT)
        return SPEAKER_LOCK_KEEP_DEFAULT
    if not 0 <= value <= 1:
        logger.warning("SPEAKER_LOCK_KEEP=%r вне [0, 1] — беру %s", raw, SPEAKER_LOCK_KEEP_DEFAULT)
        return SPEAKER_LOCK_KEEP_DEFAULT
    return value


def _env_fraction(name: str, default: float, lo: float, hi: float) -> float:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning("%s=%r не число — беру %s", name, raw, default)
        return default
    if not lo <= value <= hi:
        logger.warning("%s=%r вне [%s, %s] — беру %s", name, raw, lo, hi, default)
        return default
    return value


def speaker_lock_memory() -> bool:
    return (os.getenv("SPEAKER_LOCK_MEMORY") or "").strip().lower() in ("on", "1", "true", "yes")


def speaker_lock_debug() -> bool:
    return (os.getenv("SPEAKER_LOCK_DEBUG") or "").strip().lower() in ("on", "1", "true", "yes")


def speaker_lock_prior_bg() -> float:
    return _env_fraction("SPEAKER_LOCK_PRIOR_BG", SPEAKER_LOCK_PRIOR_BG_DEFAULT, 0.0, 1.0)


def speaker_lock_same() -> float:
    return _env_fraction("SPEAKER_LOCK_SAME", SPEAKER_LOCK_SAME_DEFAULT, 0.0, 1.0)


def speaker_lock_outlier() -> float:
    return _env_fraction("SPEAKER_LOCK_OUTLIER", SPEAKER_LOCK_OUTLIER_DEFAULT, 0.0, 10.0)


def speaker_lock_warmup_ms() -> float:
    return _env_fraction("SPEAKER_LOCK_WARMUP_MS", SPEAKER_LOCK_WARMUP_MS_DEFAULT, 0.0, 10000.0)


def turn_watchdog_sec(tutor: str) -> float:
    """Порог сторожа в секундах; 0 — сторож выключен."""
    raw = (os.getenv("TURN_WATCHDOG_SEC") or "").strip()
    value = TURN_WATCHDOG_DEFAULT_SEC
    if raw:
        try:
            value = float(raw)
        except ValueError:
            logger.warning("TURN_WATCHDOG_SEC=%r не число — сторож выключен", raw)
            return 0.0
    if value <= 0 or math.isnan(value):
        return 0.0
    return value if _tutor_allowed(tutor, "TURN_WATCHDOG_TUTORS") else 0.0


def echo_guard_enabled(tutor: str) -> bool:
    """Включать ли фильтр эха. Выключен по умолчанию: выкатка образа не меняет
    ни одного звонка, а «до/после» меряется на одной версии кода секретом."""
    if (os.getenv("ECHO_GUARD") or "").strip().lower() not in _ON:
        return False
    return _tutor_allowed(tutor, "ECHO_GUARD_TUTORS")


def echo_guard_debug() -> bool:
    """ECHO_GUARD_DEBUG=on — строка в лог на каждую фразу в окне тьютора: слова,
    время от конца его речи, громкость, совпадение и решение. Слова ученика в
    логах — только на время замера."""
    return (os.getenv("ECHO_GUARD_DEBUG") or "").strip().lower() in _ON


def echo_tail_sec() -> float:
    return _env_fraction("ECHO_TAIL_SEC", ECHO_TAIL_SEC_DEFAULT, 0.0, 3.0)


def vad_finalize_enabled(tutor: str) -> bool:
    """Слать ли Soniox finalize по концу речи VAD в «Свободно». Выключен по
    умолчанию — по той же причине, что и фильтр эха."""
    if (os.getenv("SONIOX_VAD_FINALIZE") or "").strip().lower() not in _ON:
        return False
    return _tutor_allowed(tutor, "SONIOX_VAD_FINALIZE_TUTORS")


def vad_finalize_delay_sec() -> float:
    return _env_fraction("SONIOX_VAD_FINALIZE_SEC", VAD_FINALIZE_DELAY_SEC_DEFAULT, 0.0, 3.0)


# ── Замок на ученика ─────────────────────────────────────────────────────────


def quantile(values: Any, q: float) -> float:
    """Квантиль с линейной интерполяцией (как numpy по умолчанию)."""
    return float(np.quantile(np.fromiter(values, dtype=np.float64), q))


def _is_end_token(token: dict[str, Any]) -> bool:
    # Служебные токены Soniox: конец фразы и ответ на finalize. Говорящего у
    # них нет, и выкидывать их нельзя — по <end> плагин закрывает реплику.
    return token.get("text") in ("<end>", "<fin>")


def _words(tokens: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Токены Soniox → слова. Soniox режет слово на куски («Y|ester|day»), новое
    слово начинается с пробела; знаки препинания без пробела прилипают к
    предыдущему слову."""
    words: list[list[dict[str, Any]]] = []
    for t in tokens:
        text = str(t.get("text", ""))
        if not words or text.startswith(" "):
            words.append([t])
        else:
            words[-1].append(t)
    return words


class SpeakerLock:
    """Решает по каждому СЛОВУ фразы Soniox, оставить его или выкинуть.

    v2 (01.10.2026). Первая версия решала по кускам слов и на лету, и живой
    звонок с Krisp BVC показал две беды: разметка говорящих прыгает ВНУТРИ слова
    на стыке ученика и фона — выходило «esterdched» вместо «Yesterday I
    watched»; а новости, звучавшие до первого слова ученика, проходили: фон был
    единственным говорящим и успевал стать основным. Поэтому теперь:

    * решение по целому слову — по большинству его кусков;
    * финальные слова фразы придерживаются до её конца (<end>/<fin>) и
      решаются разом, когда уже известно, кто громче. Задержки это не
      добавляет: плагин и так отдаёт FINAL только на конце фразы. Пока фраза
      идёт, придержанные слова уходят плагину черновыми — подпись и порог
      перебивания их видят.

    Громкость считаем сами по аудио, которое ушло в Soniox: у слова есть
    start_ms/end_ms от начала сокета, и мы берём медиану RMS по окнам 100 мс,
    попавшим в его отрезок.

    Основной говорящий — самый громкий по УРОВНЮ: медиане громкости его
    последних HISTORY слов (v3). В v2 уровень был скользящим средним по кускам
    слов, и живой звонок с громкими новостями (−6 дБ) показал, что основной
    скачет: «1 → 2 (4033 против 1812)», через фразу «2 → 1 (1880 против
    1203)» — тихие окончания и куски, которые разметка ошибочно отдала ученику,
    тянули его среднее вниз, и телевизор забирал микрофон. Замок за звонок
    выкинул 3 слова из ~40 слов фона. Медиана таким выбросам не поддаётся.
    Уровни обновляются на конце фразы её же словами и сразу решают эту фразу;
    сменить основного может только тот, у кого не меньше MIN_SWITCH_WORDS слов
    и уровень в `ratio` раз выше — иначе микрофон метался бы между учеником и
    телевизором.

    Основного НЕ назначаем, пока не с кем сравнить: нужны двое говорящих по
    MIN_SWITCH_WORDS слов. Офлайн-замер v3 (фон тем же мужским голосом, −6 дБ)
    показал, почему: Soniox закрывает фразу на паузе в новостях ещё до ученика,
    фон оказывался единственным говорящим, становился основным — и устойчивый
    уровень уже не отдавал микрофон ученику (слова ученика 57/73). Пока
    говорящий один, замок ничего не выкидывает: в тихой комнате он не мешает
    вовсе.
    """

    WINDOW_SEC = 0.1
    # Час аудио на сокет — с запасом больше дневного лимита звонка.
    MAX_WINDOWS = 36000
    # Сколько последних слов говорящего держим для его уровня.
    HISTORY = 60
    # Меньше слов — уровню новичка не верим, микрофон у основного не забираем.
    MIN_SWITCH_WORDS = 3
    # Уровень — верхняя квартиль громкости слов, а не медиана (v4). Живой лог
    # 01.10.2026: безударные слова ученика тихие («than» 217, «because» 388), и
    # медиана проседала до 2331 — новости (~1450) проходили как «свой»
    # говорящий (0.63 при пороге 0.6). По квартили: ученик ~4500, новости
    # ~1900, отношение ~0.42.
    LEVEL_QUANTILE = 0.75
    # Первого основного выбираем среди почти одинаково громких (не тише этой
    # доли самого громкого) — того, кто говорит больше. Шумодав в начале
    # звонка ещё не «прогрет»: в живом звонке новости в первом ходе пришли
    # громче ученика (6942 против 5197), и v3 сделал основным телевизор.
    CANDIDATE_FRACTION = 0.6

    def __init__(
        self,
        *,
        ratio: float = SPEAKER_LOCK_RATIO_DEFAULT,
        keep: float = SPEAKER_LOCK_KEEP_DEFAULT,
        same: float = SPEAKER_LOCK_SAME_DEFAULT,
        outlier: float = SPEAKER_LOCK_OUTLIER_DEFAULT,
        prior: Callable[[], float | None] | None = None,
        prior_bg: float = SPEAKER_LOCK_PRIOR_BG_DEFAULT,
        warmup_ms: float = SPEAKER_LOCK_WARMUP_MS_DEFAULT,
        claim_warmup: Callable[[], bool] | None = None,
        on_primary_words: Callable[[list[float]], None] | None = None,
        on_segment: Callable[[str], None] | None = None,
        on_switch: Callable[[str | None, str, float, float], None] | None = None,
        on_ghost: Callable[[str, str], None] | None = None,
    ) -> None:
        self._ratio = ratio
        self._keep = keep
        self._same = same
        self._outlier = outlier
        # Прогрев (SPEAKER_LOCK_WARMUP_MS_DEFAULT) — один на звонок: окно
        # получает сокет, первым увидевший слово. claim_warmup() — «окно моё?»
        # (GuardedSonioxSTT отдаёт его один раз); без него — всегда моё.
        self._warmup_ms = warmup_ms
        self._claim_warmup = claim_warmup
        self._on_ghost = on_ghost
        # Память об ученике по звонку: prior() — его уровень или None;
        # on_primary_words(громкости) — слова основного этой фразы наружу.
        self._prior = prior
        self._prior_bg = prior_bg
        self._on_primary_words = on_primary_words
        self._on_segment = on_segment
        self._on_switch = on_switch
        self.reset()

    def reset(self) -> None:
        """Новый сокет Soniox: время слов снова с нуля, номера говорящих тоже."""
        self._windows: list[float] = []
        self._base = 0  # индекс первого окна в _windows (после обрезки)
        self._acc_sq = 0.0
        self._acc_n = 0
        self._window_len = 0
        self._history: dict[str, deque] = {}
        self.primary: str | None = None
        # Финальные куски текущей фразы — ждут её конца.
        self._held: list[dict[str, Any]] = []
        self.kept_words = 0
        self.dropped_words = 0
        # Окно прогрева в этом сокете: конец окна в его же времени (start_ms)
        # или None — окна нет (выключено или досталось другому сокету).
        self._warm_decided = False
        self._warm_until: float | None = None
        # Слов говорящего ПОСЛЕ прогрева: у «призрака» их ноль.
        self._fresh: dict[str, int] = {}

    def _is_fresh(self, start: Any) -> bool:
        """Слово после окна прогрева (или окна у этого сокета нет)."""
        if start is None:
            return True
        start = float(start)
        if not self._warm_decided:
            self._warm_decided = True
            mine = self._claim_warmup() if self._claim_warmup else True
            if mine and self._warmup_ms > 0:
                self._warm_until = start + self._warmup_ms
        return self._warm_until is None or start >= self._warm_until

    # -- аудио --------------------------------------------------------------
    def push_pcm(self, pcm: bytes, sample_rate: int) -> None:
        """Аудио ровно в том порядке, в каком оно уходит в Soniox (s16le, моно)."""
        if not pcm or sample_rate <= 0:
            return
        if not self._window_len:
            self._window_len = max(1, int(sample_rate * self.WINDOW_SEC))
        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float64)
        pos = 0
        while pos < len(samples):
            take = min(len(samples) - pos, self._window_len - self._acc_n)
            chunk = samples[pos : pos + take]
            self._acc_sq += float(np.dot(chunk, chunk))
            self._acc_n += take
            pos += take
            if self._acc_n >= self._window_len:
                self._windows.append(math.sqrt(self._acc_sq / self._acc_n))
                self._acc_sq = 0.0
                self._acc_n = 0
        if len(self._windows) > self.MAX_WINDOWS:
            cut = len(self._windows) - self.MAX_WINDOWS
            del self._windows[:cut]
            self._base += cut

    def _span_loudness(self, start: Any, end: Any) -> float | None:
        if start is None or end is None:
            return None
        i0 = int(float(start) / 1000 / self.WINDOW_SEC) - self._base
        i1 = int(math.ceil(float(end) / 1000 / self.WINDOW_SEC)) - self._base
        i0 = max(i0, 0)
        i1 = min(i1, len(self._windows))
        if i1 <= i0:
            return None
        return float(median(self._windows[i0:i1]))

    # -- слова --------------------------------------------------------------
    def level(self, speaker: str) -> float | None:
        """Уровень говорящего — верхняя квартиль громкости его последних слов."""
        hist = self._history.get(speaker)
        return quantile(hist, self.LEVEL_QUANTILE) if hist else None

    def _word_info(self, word: list[dict[str, Any]]) -> tuple[str | None, float | None]:
        """(говорящий слова по большинству его кусков, громкость слова)."""
        votes: dict[str, int] = {}
        for t in word:
            if t.get("speaker") is None:
                continue
            spk = str(t["speaker"])
            votes[spk] = votes.get(spk, 0) + max(1, len(str(t.get("text", "")).strip()))
        speaker = max(votes, key=votes.get) if votes else None
        return speaker, self._span_loudness(word[0].get("start_ms"), word[-1].get("end_ms"))

    def _learn(
        self,
        infos: list[tuple[str | None, float | None]],
        fresh: list[bool] | None = None,
    ) -> None:
        """Слова законченной фразы → уровни говорящих → основной.

        `fresh` — слово после окна прогрева (см. _is_fresh); не передано — все
        слова свежие, прогрева нет."""
        if fresh is None:
            fresh = [True] * len(infos)
        for (speaker, loud), is_fresh in zip(infos, fresh):
            if speaker is None or loud is None:
                continue
            self._history.setdefault(speaker, deque(maxlen=self.HISTORY)).append(loud)
            if is_fresh:
                self._fresh[speaker] = self._fresh.get(speaker, 0) + 1
        levels = {spk: self.level(spk) for spk in self._history}
        levels = {spk: lvl for spk, lvl in levels.items() if lvl is not None}
        if not levels:
            return
        if self.primary is None or self.primary not in levels:
            eligible = [spk for spk in levels if len(self._history[spk]) >= self.MIN_SWITCH_WORDS]
            if len(eligible) < 2:
                return
            top = max(levels[spk] for spk in eligible)
            candidates = [spk for spk in eligible if levels[spk] >= top * self.CANDIDATE_FRACTION]
            best = max(candidates, key=lambda spk: (len(self._history[spk]), levels[spk]))
            self.primary = best
            if self._on_switch:
                self._on_switch(None, best, levels[best], 0.0)
        else:
            # «Призрак» прогрева не отбирает микрофон у живого основного своим
            # завышенным уровнем: иначе каждая фраза гоняла бы его туда и
            # обратно. Пока прогрев у всех, смена — как раньше.
            live_primary = not self._ghost(self.primary)
            contenders = [
                spk for spk in levels
                if spk == self.primary or not (live_primary and self._ghost(spk))
            ]
            best = max(contenders, key=levels.get)
            current = levels[self.primary]
            if (
                best != self.primary
                and len(self._history[best]) >= self.MIN_SWITCH_WORDS
                and levels[best] > current * self._ratio
            ):
                old = self.primary
                self.primary = best
                if self._on_switch:
                    self._on_switch(old, best, levels[best], current)
        # До отчёта в память: слова этой фразы должны уйти от живого основного.
        self._yield_ghost(levels)
        self._report(infos)

    def _ghost(self, speaker: str) -> bool:
        """Все слова говорящего пришлись на прогрев этого сокета."""
        return self._warm_until is not None and not self._fresh.get(speaker)

    def _yield_ghost(self, levels: dict[str, float]) -> None:
        """Основной, звучавший только на прогреве, уступает живому говорящему.

        Его уровень завышен прогревом и уже не обновится — он молчит, а
        расщеплённый Soniox ученик под другим номером до SAME не дотягивает
        (см. SPEAKER_LOCK_WARMUP_MS_DEFAULT).

        Живой — не меньше MIN_SWITCH_WORDS слов после прогрева И больше слов,
        чем у «призрака». По громкости их не развести: расщеплённый ученик
        против «призрака» 0.32–0.41, фраза новостей против ученика, чья первая
        фраза пришлась на прогрев, — 0.28 (тест «stable»). Зато ученик под
        новым номером к третьей фразе наговорил больше своей первой фразы
        (17 слов против 8), а фраза новостей — меньше. Цена для зонда — одна
        фраза («But yesterday I was too tired»), а не весь звонок.
        Если фон всё-таки переговорит молчащего ученика, он проходит, пока
        ученик не заговорит снова: свежие слова снимают с ученика «призрака»,
        и обычное правило смены возвращает ему микрофон."""
        if self.primary is None or not self._ghost(self.primary):
            return
        # Офлайн-стенд (24 записи, прогрева и Krisp там нет — правило там может
        # только мешать): owen −6 дБ фон 51 → 53 из 80, ученик и остальные
        # конфигурации без изменений. Счёт только свежих слов живого дал 56,
        # оба условия сразу — тоже 56.
        ghost_words = len(self._history.get(self.primary, ()))
        alive = [
            spk for spk in levels
            if spk != self.primary
            and self._fresh.get(spk, 0) >= self.MIN_SWITCH_WORDS
            and len(self._history[spk]) > ghost_words
        ]
        if not alive:
            return
        old = self.primary
        self.primary = max(alive, key=lambda spk: (len(self._history[spk]), levels[spk]))
        if self._on_ghost:
            self._on_ghost(old, self.primary)

    def _report(self, infos: list[tuple[str | None, float | None]]) -> None:
        if self._on_primary_words and self.primary is not None:
            words = [loud for spk, loud in infos if spk == self.primary and loud is not None]
            if words:
                self._on_primary_words(words)

    def _prior_level(self) -> float | None:
        return self._prior() if self._prior else None

    def _keep_word(self, speaker: str | None, loud: float | None) -> bool:
        """Оставить ли слово целиком."""
        if speaker is None or speaker == self.primary:
            return True
        if self.primary is None:
            # Основного в этом потоке ещё нет. С памятью об ученике говорящий
            # намного тише его уровня — фон, даже если он тут пока один (фраза
            # новостей в начале хода рацией). Без памяти пропускаем всё: лучше
            # лишнее слово, чем глухой тьютор.
            prior = self._prior_level()
            speaker_level = self.level(speaker)
            if prior and self._prior_bg > 0 and speaker_level is not None:
                if speaker_level < prior * self._prior_bg and not (
                    loud is not None and loud >= prior * self._keep
                ):
                    return False
            return True
        primary_level = self.level(self.primary)
        if not primary_level:
            return True
        # Говорящий почти так же громок, как основной, — это тот же ученик,
        # которого Soniox расщепил надвое (или второй человек у самого
        # микрофона: его слова тьютору тоже адресованы).
        #
        # Меряем от большего из уровня основного в потоке и памяти об ученике
        # по звонку. Живой звонок 02.10.2026 (агент Q4HY9mRmVzYm, «Свободно»,
        # новости −6 дБ): разметка отдала ученику тихие слова фона («and
        # drivers are advised»), его уровень в потоке просел 3474 → 3012, фон
        # дорос до 2012 — 0.67, «свой», и фраза новостей целиком (8 слов) ушла
        # тьютору. От памяти (3672) это 0.55 — фон. Проигрыш живых логов:
        # фон 10 → 7, слова ученика не тронуты; без памяти всё как было.
        speaker_level = self.level(speaker)
        same_ref = max(primary_level, self._prior_level() or 0.0)
        if self._same > 0 and speaker_level is not None and speaker_level >= same_ref * self._same:
            return True
        # Слово, слишком громкое для своего говорящего, — скорее всего ученик,
        # которого разметка записала на фон. Сравниваем с МЕДИАНОЙ говорящего:
        # несколько таких слов поднимают его квартиль, а медиану — нет.
        hist = self._history.get(speaker)
        speaker_median = float(median(hist)) if hist else None
        if (
            self._outlier > 0
            and loud is not None
            and speaker_median
            and loud >= speaker_median * self._outlier
            and loud >= primary_level * SPEAKER_LOCK_OUTLIER_FLOOR
        ):
            return True
        # Слово «чужого» говорящего, но громкое как речь ученика, — это ученик,
        # сказавший его поверх фона (громкость смеси не ниже его голоса).
        return bool(self._keep > 0 and loud is not None and loud >= primary_level * self._keep)

    def _decide(
        self, words: list[list[dict[str, Any]]], infos: list[tuple[str | None, float | None]]
    ) -> tuple[list[dict[str, Any]], list[str]]:
        kept: list[dict[str, Any]] = []
        dropped: list[str] = []
        for word, (speaker, loud) in zip(words, infos):
            if self._keep_word(speaker, loud):
                kept.extend(word)
            else:
                dropped.append("".join(str(t.get("text", "")) for t in word).strip())
        return kept, dropped

    def _describe(
        self, words: list[list[dict[str, Any]]], infos: list[tuple[str | None, float | None]]
    ) -> str:
        """Строка отладки: уровни говорящих, память и каждое слово фразы."""
        levels = " ".join(
            f"{spk}={round(self.level(spk) or 0)}/{len(h)}" for spk, h in sorted(self._history.items())
        )
        prior = self._prior_level()
        parts = []
        for word, (spk, loud) in list(zip(words, infos))[:40]:
            text = "".join(str(t.get("text", "")) for t in word).strip()
            mark = "+" if self._keep_word(spk, loud) else "x"
            parts.append(f"{text}:{spk}:{round(loud) if loud is not None else '-'}{mark}")
        return (
            f"основной={self.primary} уровни[{levels}] память={round(prior) if prior else '-'} | "
            + " ".join(parts)
        )

    def process(self, tokens: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
        """Токены одного ответа Soniox → токены для плагина.

        Финальные куски придерживаются; на конце фразы уходят отфильтрованные
        пословно и разом, перед самим <end>/<fin>. Пока фраза идёт, плагину
        уходит черновой вид: придержанные куски плюс черновые, отфильтрованные
        по текущему основному и помеченные is_final=False (накопитель черновых
        у плагина новый на каждый ответ, так что повтор безопасен).
        Возвращает (токены, текст выкинутых слов фразы) — второе для лога."""
        out: list[dict[str, Any]] = []
        drafts: list[dict[str, Any]] = []
        dropped_all: list[str] = []
        for token in tokens:
            if _is_end_token(token):
                words = _words(self._held)
                infos = [self._word_info(w) for w in words]
                fresh = [self._is_fresh(w[0].get("start_ms")) for w in words]
                # Сперва уровни — этой же фразой: фон, начавший её раньше
                # ученика, решается уже против уровня ученика.
                self._learn(infos, fresh)
                kept, dropped = self._decide(words, infos)
                if self._on_segment and words:
                    self._on_segment(self._describe(words, infos))
                self.kept_words += len(_words(kept))
                self.dropped_words += len(dropped)
                dropped_all.extend(dropped)
                out.extend(kept)
                out.append(token)
                self._held = []
                continue
            if token.get("is_final"):
                self._held.append(token)
            else:
                drafts.append(token)
        words = _words(self._held + drafts)
        view, _ = self._decide(words, [self._word_info(w) for w in words])
        out.extend({**t, "is_final": False} for t in view)
        return out, " ".join(w for w in dropped_all if w)


# ── Эхо тьютора ──────────────────────────────────────────────────────────────


def norm_word(text: str) -> str:
    """Слово для сравнения: без регистра, знаков и пробелов, ё → е."""
    return "".join(ch for ch in str(text).lower() if ch.isalnum()).replace("ё", "е")


def similar_word(heard: str, said: str) -> bool:
    """Похоже ли услышанное слово (уже norm_word) на слово тьютора.

    Точное совпадение — или обрывок: Soniox успел только начало слова эха
    («есті» от «естімедім»), не короче четырёх букв.

    «Похоже на 80%» здесь нельзя. Живой зонд 03.10.2026: ученик перебил тьютора
    «Тоқта, мен түсінбедім» («я не понял»), а тьютор в это время говорил
    «түсіндім» («понял») — по сходству это одно слово, и фильтр съел смысл
    реплики. В казахском отрицание и лицо — суффиксы: соседние формы различаются
    парой букв и значат противоположное. Эхо чистого синтеза Soniox пишет
    точно, так что строгость почти ничего не пропускает."""
    if heard == said:
        return True
    return len(heard) >= 4 and said.startswith(heard)


class EchoReference:
    """Что тьютор говорит и когда — эталон для фильтра эха.

    Текст приходит из tts_node раньше звука: синтез идёт впереди воспроизведения.
    Поэтому слово считается эхом, только если оно звучит, пока тьютор говорит
    (состояние сессии «speaking»), или в хвосте после конца речи.

    Окно — по состоянию сессии, а не по времени каждого слова: время слов у
    синтеза без таймингов угадывается и уезжало на секунды (см. субтитры
    Айзере), а начало и конец речи сессия знает точно.

    И только то, что тьютор УЖЕ успел сказать: текст реплики целиком приходит
    раньше звука. Живой зонд 03.10.2026 (Декстер): ученик перебил его в начале
    реплики «Стоп, я не понял», а «не понял» стояло дальше в ещё не сказанном
    тексте — фильтр выкинул смысл перебивания. Сказанное оцениваем по темпу:
    от начала звука реплики — не больше CHARS_PER_SEC символов в секунду плюс
    запас MARGIN_CHARS."""

    # Сколько последних реплик тьютора держим: эхо древней фразы не ловим.
    KEEP_REPLIES = 3
    # Состояние «speaking» встаёт чуть позже первого кадра звука.
    LEAD_SEC = 0.2
    MAX_WINDOWS = 8
    # Темп синтеза — с запасом сверху: у Айзере 12–18 символов в секунду (замер
    # 03.10.2026); быстрее не бывает, а недооценка темпа пропускала бы эхо.
    CHARS_PER_SEC = 18.0
    # Запас на ошибку оценки темпа и на эхо, приходящее с опозданием.
    MARGIN_CHARS = 30.0

    def __init__(self, tail_sec: float = ECHO_TAIL_SEC_DEFAULT, now: Callable[[], float] = time.monotonic) -> None:
        self._tail = tail_sec
        self._now = now
        # Реплика: слова со смещением в символах от её начала и момент, когда
        # зазвучал её звук (None — ещё не звучала).
        self._replies: deque[dict[str, Any]] = deque(maxlen=self.KEEP_REPLIES)
        self._partial = ""
        self._partial_at = 0
        self._windows: deque[list[float | None]] = deque(maxlen=self.MAX_WINDOWS)
        # Громкость слов эха и слов ученика за звонок (см. EchoFilter).
        self.echo_levels: deque = deque(maxlen=60)
        self.learner_levels: deque = deque(maxlen=60)
        # Ученик уже сказал хоть одну фразу, пока тьютор молчал.
        self.learner_spoke = False

    def _speaking(self) -> bool:
        return bool(self._windows) and self._windows[-1][1] is None

    # -- текст ----------------------------------------------------------------
    def begin_reply(self) -> None:
        self.end_reply()
        # Реплика, начатая посреди речи (продолжение после тула), звучит сразу.
        self._replies.append(
            {"words": [], "t_audio": self._now() if self._speaking() else None}
        )
        self._partial, self._partial_at = "", 0

    def add_text(self, text: str) -> None:
        """Кусок реплики как пришёл от модели: слово может разорваться между
        кусками, поэтому незаконченное держим до пробела."""
        if not self._replies:
            self.begin_reply()
        buf = self._partial + str(text)
        items = [(self._partial_at + m.start(), m.group()) for m in re.finditer(r"\S+", buf)]
        base = self._partial_at
        if buf and not buf[-1].isspace() and items:
            self._partial_at, self._partial = items.pop()
        else:
            self._partial, self._partial_at = "", base + len(buf)
        self._replies[-1]["words"].extend(
            (at, w) for at, w in ((at, norm_word(p)) for at, p in items) if w
        )

    def end_reply(self) -> None:
        if self._partial and self._replies:
            word = norm_word(self._partial)
            if word:
                self._replies[-1]["words"].append((self._partial_at, word))
        self._partial, self._partial_at = "", 0

    def words(self) -> list[str]:
        out = [w for reply in self._replies for _, w in reply["words"]]
        tail = norm_word(self._partial)
        return out + [tail] if tail else out

    def _said_by(self, t: float):
        """Слова тьютора, которые к моменту t уже могли прозвучать."""
        last = len(self._replies) - 1
        for i, reply in enumerate(self._replies):
            if reply["t_audio"] is None:
                continue
            limit = (t - reply["t_audio"]) * self.CHARS_PER_SEC + self.MARGIN_CHARS
            words = reply["words"]
            if i == last and self._partial:
                words = words + [(self._partial_at, norm_word(self._partial))]
            for at, word in words:
                if at > limit:
                    break
                if word:
                    yield word

    # -- время ----------------------------------------------------------------
    def on_agent_state(self, state: str) -> None:
        now = self._now()
        if state == "speaking":
            if not self._speaking():
                self._windows.append([now, None])
            # Зазвучала последняя начатая реплика.
            if self._replies and self._replies[-1]["t_audio"] is None:
                self._replies[-1]["t_audio"] = now
        elif self._speaking():
            self._windows[-1][1] = now

    def where(self, t: float) -> str:
        """Для отладки: «in» — тьютор говорил, «+0.42» — столько после конца
        его речи (ближайшего окна), «-» — окон нет."""
        best = None
        for start, end in self._windows:
            if end is None or start - self.LEAD_SEC <= t <= end:
                if t >= start - self.LEAD_SEC:
                    return "in"
            elif t > end and (best is None or t - end < best):
                best = t - end
        return f"+{best:.2f}" if best is not None else "-"

    def in_window(self, t: float) -> bool:
        """Звук в момент t мог быть эхом: тьютор говорил (или договорил меньше
        хвоста назад)."""
        return self._in_window(t)

    def _in_window(self, t: float) -> bool:
        for start, end in self._windows:
            if t >= start - self.LEAD_SEC and (end is None or t <= end + self._tail):
                return True
        return False

    def is_echo(self, word: str, t: float | None = None, *, partial: bool = False) -> bool:
        """Слово ученика — эхо тьютора? `t` — момент, когда звук слова пришёл в
        агента (None — сейчас). `partial` — недосказанное слово черновика: его
        сравниваем по началу с любым словом тьютора, иначе первые куски эха
        («ан» от «анық») успевали перебить тьютора."""
        heard = norm_word(word)
        if not heard:
            return False
        t = self._now() if t is None else t
        if not self._in_window(t):
            return False
        for said in self._said_by(t):
            if similar_word(heard, said) or (partial and said.startswith(heard)):
                return True
        return False


class LoudnessTrack:
    """Громкость звука, ушедшего в Soniox, по окнам 100 мс — и громкость слова
    по его start_ms/end_ms (медиана окон). Та же арифметика, что у SpeakerLock,
    но отдельно: замок включён не у всех, а эхо-фильтру громкость нужна всегда."""

    WINDOW_SEC = 0.1
    # Час звука — с запасом больше дневного лимита звонка.
    MAX_WINDOWS = 36000

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._windows: list[float] = []
        self._base = 0
        self._acc_sq = 0.0
        self._acc_n = 0
        self._window_len = 0

    def push_pcm(self, pcm: bytes, sample_rate: int) -> None:
        if not pcm or sample_rate <= 0:
            return
        if not self._window_len:
            self._window_len = max(1, int(sample_rate * self.WINDOW_SEC))
        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float64)
        pos = 0
        while pos < len(samples):
            take = min(len(samples) - pos, self._window_len - self._acc_n)
            chunk = samples[pos : pos + take]
            self._acc_sq += float(np.dot(chunk, chunk))
            self._acc_n += take
            pos += take
            if self._acc_n >= self._window_len:
                self._windows.append(math.sqrt(self._acc_sq / self._acc_n))
                self._acc_sq = 0.0
                self._acc_n = 0
        if len(self._windows) > self.MAX_WINDOWS:
            cut = len(self._windows) - self.MAX_WINDOWS
            del self._windows[:cut]
            self._base += cut

    def span(self, start: Any, end: Any) -> float | None:
        if start is None or end is None:
            return None
        i0 = max(int(float(start) / 1000 / self.WINDOW_SEC) - self._base, 0)
        i1 = min(int(math.ceil(float(end) / 1000 / self.WINDOW_SEC)) - self._base, len(self._windows))
        if i1 <= i0:
            return None
        return float(median(self._windows[i0:i1]))


class AudioClock:
    """Время слова Soniox (мс от начала сокета) → момент, когда этот звук пришёл
    в агента (time.monotonic). Звук идёт в сокет по мере прихода, поэтому
    запоминаем время каждого кадра: пачку тишины рация досылает разом, и
    простое «начало + мс» там соврало бы."""

    # Кадров по 20 мс — ~4 минуты; эхо старше никому не нужно.
    MAX_FRAMES = 12000

    def __init__(self, now: Callable[[], float] = time.monotonic) -> None:
        self._now = now
        self.reset()

    def reset(self) -> None:
        self._starts: list[float] = []
        self._monos: list[float] = []
        self._ms = 0.0

    def push(self, duration_sec: float) -> None:
        self._starts.append(self._ms)
        self._monos.append(self._now())
        self._ms += duration_sec * 1000
        if len(self._starts) > 2 * self.MAX_FRAMES:
            del self._starts[: self.MAX_FRAMES]
            del self._monos[: self.MAX_FRAMES]

    def at(self, ms: Any) -> float | None:
        if ms is None or not self._starts:
            return None
        ms = float(ms)
        i = bisect.bisect_right(self._starts, ms) - 1
        if i < 0:
            return None
        return self._monos[i] + (ms - self._starts[i]) / 1000


class EchoFilter:
    """Выкидывает из фразы Soniox слова эха тьютора — по образцу SpeakerLock.

    Финальные куски придерживаются до конца фразы и решаются целыми словами;
    пока фраза идёт, плагину уходит черновой вид уже без эха. Это важно:
    перебивание считает слова ЧЕРНОВИКА (min_words), и одно слово эха в нём
    останавливало тьютора на полуслове. Задержки придержка не добавляет —
    плагин и так отдаёт FINAL только на конце фразы."""

    # Громкость. Текст отделяет эхо от ученика не всегда: эхо Декстера Soniox
    # пишет с другим окончанием («путешествия» → «путешествие», «Целым» → «в
    # целом», «блять» → «блядь») и даже латиницей («гоу» → «go»), и такие слова
    # уходили ходом ученика (живые зонды 03.10.2026). А ученик, перебивший
    # тьютора теми же словами, что тот говорит («Стоп, я не понял»), по тексту
    # неотличим от эха. Физически эхо из колонок тише голоса ученика у
    # микрофона. Поэтому за звонок учим два уровня: эха — по словам, совпавшим
    # с речью тьютора, и ученика — по словам, когда тьютор молчит. Пока тьютор
    # говорит, слово решает громкость: тише границы — эхо, громче — ученик.
    #
    # Сколько слов нужно, чтобы уровню верить.
    MIN_LEVEL_WORDS = 5
    LEVEL_WORDS = 60
    # Уровня ученика ещё нет — эхо всё, что не громче эха вдвое (+6 дБ).
    QUIET_RATIO = 2.0
    # Ученик громче эха меньше чем в 2.5 раза — по громкости их не развести,
    # решает только текст.
    SEPARATION = 2.5
    # Совпавшее с речью тьютора слово отдаём ученику, только если оно не тише
    # этой доли его уровня — или, пока уровня ученика нет, вчетверо громче эха.
    MATCH_LEARNER_SHARE = 0.7
    MATCH_RATIO = 4.0
    # Уровень эха не учим на словах громче этой доли уровня ученика.
    LEARN_SHARE = 0.7

    def __init__(
        self,
        ref: EchoReference,
        clock: Callable[[Any], float | None],
        loudness: Callable[[Any, Any], float | None] | None = None,
        debug: Callable[[str], None] | None = None,
    ) -> None:
        self._ref = ref
        self._clock = clock
        self._loudness = loudness
        self._debug = debug
        # Уровни — по всему звонку: живут на эталоне, он один на звонок, а
        # поток распознавания бывает новым (переподключение сокета).
        self._echo_levels: deque = ref.echo_levels
        self._learner_levels: deque = ref.learner_levels
        self.reset()
        self.kept_words = 0
        self.dropped_words = 0

    def reset(self) -> None:
        self._held: list[dict[str, Any]] = []

    def levels(self) -> tuple[float | None, float | None]:
        """(уровень эха, уровень ученика) или None, пока слов мало."""
        echo = median(self._echo_levels) if len(self._echo_levels) >= self.MIN_LEVEL_WORDS else None
        learner = (
            median(self._learner_levels)
            if len(self._learner_levels) >= self.MIN_LEVEL_WORDS
            else None
        )
        return echo, learner

    def boundary(self) -> float | None:
        """Громкость, ниже которой слово в окне тьютора — эхо (None — решает текст)."""
        echo, learner = self.levels()
        if echo is None or echo <= 0:
            return None
        if learner is None:
            return echo * self.QUIET_RATIO
        if learner < echo * self.SEPARATION:
            return None
        return math.sqrt(echo * learner)

    def _match_override(self) -> float:
        """Громкость, с которой слово, совпавшее с речью тьютора, всё-таки
        считается словом ученика («Стоп, я не понял» поверх «…я не понял…»)."""
        echo, learner = self.levels()
        limit = self.boundary() or 0.0
        if learner is None:
            return max(limit, (echo or 0.0) * self.MATCH_RATIO)
        return max(limit, learner * self.MATCH_LEARNER_SHARE)

    def _decide(
        self, words: list[list[dict[str, Any]]], partial_last: bool = False, final: bool = False
    ) -> tuple[list[dict[str, Any]], list[str], int]:
        texts = ["".join(str(t.get("text", "")) for t in word).strip() for word in words]
        now = self._ref._now()
        infos: list[tuple[bool, bool, float | None] | None] = []
        for i, (word, text) in enumerate(zip(words, texts)):
            if not norm_word(text):
                infos.append(None)
                continue
            t = self._clock(word[0].get("start_ms"))
            in_window = self._ref.in_window(now if t is None else t)
            match = in_window and self._ref.is_echo(
                text, t, partial=partial_last and i == len(words) - 1
            )
            loud = (
                self._loudness(word[0].get("start_ms"), word[-1].get("end_ms"))
                if self._loudness
                else None
            )
            infos.append((in_window, match, loud))
        lettered = [i for i, text in enumerate(texts) if norm_word(text)]
        if final and any(info and not info[0] for info in infos):
            self._ref.learner_spoke = True
        if final:
            # Учим уровни на законченной фразе — до решения по ней же: первая
            # фраза эха (приветствие) решается уже по своему уровню.
            #
            # Уровень эха — только с кусков, похожих на эхо: два совпавших слова
            # подряд или длинное совпавшее слово, и не громче LEARN_SHARE уровня
            # ученика. Живой зонд без эха: ученик перебивал «Тоқта, мен
            # түсінбедім», одиночное «мен» совпадало с речью тьютора и учило
            # «уровень эха» голосом ученика — после этого его же «Тоқта»
            # выкидывалось как тихое эхо.
            limit = self.boundary()
            _, learner = self.levels()
            for j, i in enumerate(lettered):
                in_window, match, loud = infos[i]
                if loud is None:
                    continue
                if not in_window:
                    self._learner_levels.append(loud)
                    continue
                if not match or (limit is not None and loud >= limit):
                    continue
                if learner is not None and loud >= learner * self.LEARN_SHARE:
                    continue
                run = any(
                    0 <= k < len(lettered) and infos[lettered[k]][1] for k in (j - 1, j + 1)
                )
                if run or len(norm_word(texts[i])) >= 5:
                    self._echo_levels.append(loud)
        limit = self.boundary()
        override = self._match_override()
        echo = [False] * len(words)
        by_text = [False] * len(words)
        for i, info in enumerate(infos):
            if info is None:
                continue
            in_window, match, loud = info
            if not in_window:
                continue
            if not self._ref.learner_spoke:
                # Пока ученик ни разу не говорил сам, всё в окне тьютора — эхо.
                # Живые зонды: эхо приветствия Декстера («Чё каво?» → «Только
                # вот», «Хм», «О», «Рация») уходило ходом ученика — уровней в
                # начале звонка ещё нет, а сленг текстом не узнать. Перебивать
                # приветствие ученику незачем; его «привет» поверх него не
                # потеря.
                echo[i] = True
            elif limit is not None and loud is not None:
                # Несимметрично. Слово, совпавшее с речью тьютора, — эхо, пока
                # оно не громкое как ученик: ударные слова эха громче
                # соседних, и по одной границе «мына», «мен» уходили ученику
                # (офлайн-стенд). Несовпавшее — эхо, только если тихое.
                echo[i] = loud < override if match else loud < limit
            else:
                echo[i] = match
                by_text[i] = True
        # Только для решений по тексту: короткие слова рядом со словами ученика
        # — его слова, даже если тьютор тоже их говорил. Офлайн-стенд и живые
        # зонды: «Тоқта, мен түсінбедім», «Стоп, я не понял» — «мен», «я не»
        # уходили в эхо. Эхо идёт сплошными кусками фразы тьютора с длинными
        # словами; цепочка одних коротких между словами ученика — не эхо.
        raw = list(echo)
        j = 0
        while j < len(lettered):
            i = lettered[j]
            if not (raw[i] and by_text[i] and len(norm_word(texts[i])) <= 3):
                j += 1
                continue
            k = j
            while k < len(lettered) and raw[lettered[k]] and by_text[lettered[k]] and len(
                norm_word(texts[lettered[k]])
            ) <= 3:
                k += 1
            sides = [lettered[n] for n in (j - 1, k) if 0 <= n < len(lettered)]
            if any(not raw[n] for n in sides) and not any(raw[n] for n in sides):
                for n in range(j, k):
                    echo[lettered[n]] = False
            j = k
        places = []
        if final and self._debug:
            for word, info in zip(words, infos):
                t = self._clock(word[0].get("start_ms"))
                places.append(self._ref.where(now if t is None else t) if info else "")
        # Пишем фразы в окне и в трёх секундах после него: там и прячутся
        # утечки хвоста.
        near = [p for p in places if p == "in" or (p.startswith("+") and float(p[1:]) < 3.0)]
        if final and self._debug and near:
            parts = []
            for text, info, is_echo, place in list(zip(texts, infos, echo, places))[:40]:
                if info is None:
                    continue
                parts.append(
                    f"{text}:{place}:"
                    f"{round(info[2]) if info[2] is not None else '-'}:"
                    f"{'m' if info[1] else '.'}{'x' if is_echo else '+'}"
                )
            self._debug(
                f"граница={round(limit) if limit else '-'} совпад={round(override)} | "
                + " ".join(parts)
            )
        kept: list[dict[str, Any]] = []
        dropped: list[str] = []
        kept_words = 0
        drop_prev = False
        for word, text, is_echo in zip(words, texts, echo):
            if not norm_word(text):
                # Знак без букв («—», «?») уходит вместе со своим словом: один
                # он выглядел бы для перебивания отдельным словом.
                drop = drop_prev
            else:
                drop = is_echo
                if not drop:
                    kept_words += 1
            if drop:
                dropped.append(text)
            else:
                kept.extend(word)
            drop_prev = drop
        # Выкинули начало фразы — первое оставленное слово без пробела впереди:
        # плагин склеивает текст как есть.
        if kept and str(kept[0].get("text", "")).startswith(" "):
            kept[0] = {**kept[0], "text": str(kept[0]["text"]).lstrip()}
        return kept, dropped, kept_words

    def process(self, tokens: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
        """Токены одного ответа Soniox → токены для плагина (и текст выкинутого
        эха — для лога: это слова самого тьютора, не ученика)."""
        out: list[dict[str, Any]] = []
        drafts: list[dict[str, Any]] = []
        dropped_all: list[str] = []
        for token in tokens:
            if _is_end_token(token):
                kept, dropped, kept_words = self._decide(_words(self._held), final=True)
                self.kept_words += kept_words
                self.dropped_words += sum(1 for w in dropped if norm_word(w))
                dropped_all.extend(dropped)
                out.extend(kept)
                out.append(token)
                self._held = []
                continue
            if token.get("is_final"):
                self._held.append(token)
            else:
                drafts.append(token)
        words = _words(self._held + drafts)
        if words:
            # Недосказанным бывает только слово черновика на самом конце.
            view, _, _ = self._decide(words, partial_last=bool(drafts))
            out.extend({**t, "is_final": False} for t in view)
        return out, " ".join(w for w in dropped_all if w)


# Ручное закрытие фразы в протоколе Soniox: сервер дорасшифровывает всё, что
# успел получить, и присылает токен <fin> — плагин считает его концом фразы и
# сразу отдаёт FINAL. Без него конец фразы решает сам Soniox, и это до
# max_endpoint_delay_ms (2 с по умолчанию) после последнего слова.
FINALIZE_MESSAGE = json.dumps({"type": "finalize"})
# Когда слать finalize. НЕ сразу по отпусканию: живой звонок 01.10.2026
# (агент aZ5pJhsWSuto) показал, что мгновенный finalize съедает последнее слово —
# «too.» вместо «too tired.», «class.» вместо «classroom» в 3 ходах из 4: Soniox
# закрывает фразу, не дослушав хвост, если после него нет тишины. Тишину
# commit_user_turn досылает сам (2 с нулей пачкой, тем же каналом, что и звук),
# поэтому отпускание только взводит команду, а уходит она, когда за последним
# словом в поток прошло FINALIZE_AFTER_SILENCE_SEC чистых нулей. Нули пачкой
# идут мгновенно — к задержке это не добавляет.
FINALIZE_AFTER_SILENCE_SEC = 0.5
# Сколько ждать этой тишины. commit досылает её сразу; если её нет (финал
# пришёл меньше чем за 0.5 с до отпускания — тогда commit не ждёт и не досылает),
# взвод гаснет и не сработает на тишине уже следующего хода.
FINALIZE_ARM_SEC = 3.0


if aiohttp is not None and soniox is not None:

    class _FinalizeMark:
        """Метка «закрыть фразу» от VAD в канале кадров. Своя, а не
        _FlushSentinel: тот шлёт flush() из commit_user_turn рации, и рубильник
        у него свой (SONIOX_FINALIZE)."""

    class _FilteringWS:
        """Обёртка сокета Soniox: плагин читает из неё ответы, в которых уже
        нет слов фона (если замок включён), а после ответа на finalize зовётся
        on_fin. Отправка и закрытие уходят в настоящий сокет как есть."""

        def __init__(
            self,
            ws: Any,
            lock: SpeakerLock | None,
            log_drop: Callable[[str], None],
            on_fin: Callable[[], None],
            echo: EchoFilter | None = None,
            log_echo: Callable[[str], None] | None = None,
        ) -> None:
            self._ws = ws
            self._lock = lock
            self._log_drop = log_drop
            self._on_fin = on_fin
            self._echo = echo
            self._log_echo = log_echo

        def __getattr__(self, name: str) -> Any:
            return getattr(self._ws, name)

        def __aiter__(self):
            return self._iter()

        async def _iter(self):
            async for msg in self._ws:
                fin = False
                if msg.type == aiohttp.WSMsgType.TEXT:
                    msg, fin = self._filter(msg)
                yield msg
                # Сюда возвращаемся, когда плагин уже разобрал сообщение (и,
                # если фраза была, отдал её FINAL-ом) и ждёт следующее.
                if fin:
                    self._on_fin()

        def _filter(self, msg: Any) -> tuple[Any, bool]:
            try:
                content = json.loads(msg.data)
            except (TypeError, ValueError):
                return msg, False
            tokens = content.get("tokens")
            if not tokens:
                return msg, False
            fin = any(t.get("text") == "<fin>" for t in tokens)
            if self._lock is None and self._echo is None:
                return msg, fin
            out = tokens
            if self._lock is not None:
                out, dropped = self._lock.process(out)
                if dropped:
                    self._log_drop(dropped)
            # Эхо — после замка. Порядок им не мешает: оба придерживают
            # финальные куски до конца фразы и отдают плагину черновой вид.
            if self._echo is not None:
                out, echoed = self._echo.process(out)
                if echoed and self._log_echo:
                    self._log_echo(echoed)
            content["tokens"] = out
            return msg._replace(data=json.dumps(content, ensure_ascii=False)), fin

    class _GuardedSpeechStream(soniox_stt.SpeechStream):
        def __init__(self, stt: "GuardedSonioxSTT", conn_options: Any) -> None:
            super().__init__(stt=stt, conn_options=conn_options)
            self._guard: GuardedSonioxSTT = stt
            self._lock = (
                SpeakerLock(
                    ratio=stt._ratio,
                    keep=stt._keep,
                    same=stt._same,
                    outlier=stt._outlier,
                    prior=stt._prior_level if stt._memory else None,
                    prior_bg=stt._prior_bg,
                    warmup_ms=stt._warmup_ms,
                    claim_warmup=stt._claim_warmup,
                    on_primary_words=stt._learner_words.extend,
                    on_segment=self._log_segment if stt._debug else None,
                    on_switch=self._log_switch,
                    on_ghost=self._log_ghost,
                )
                if stt._lock_on
                else None
            )
            self._drop_buf: list[str] = []
            self._fin_deadline = 0.0
            self._fin_zero = 0.0
            # Эхо: часы сокета (время слов → момент прихода звука) и фильтр.
            self._clock = AudioClock()
            self._loud = LoudnessTrack()
            self._echo = (
                EchoFilter(
                    stt.echo,
                    self._clock.at,
                    self._loud.span,
                    debug=(lambda line: logger.info("ECHO seg: %s", line[:900]))
                    if stt._echo_debug
                    else None,
                )
                if stt.echo is not None
                else None
            )
            self._echo_buf: list[str] = []
            # finalize по концу речи VAD: сколько звука ещё дослать до команды
            # (None — не взведён), громкость последних кадров (уровень речи
            # ученика перед паузой) и порог «заговорил снова».
            self._vad_fin_left: float | None = None
            self._vad_rms: deque | None = deque(maxlen=200) if stt.vad_finalize else None
            self._vad_resume: float | None = None

        def arm_finalize(self) -> None:
            self._fin_deadline = time.monotonic() + FINALIZE_ARM_SEC
            self._fin_zero = 0.0

        def arm_vad_finalize(self, after_sec: float) -> None:
            """Ученик замолчал (VAD). Команда уйдёт, когда за концом речи в
            сокет пройдёт ещё `after_sec` звука. Считаем звук, а не нули, как
            у рации: микрофон в «Свободно» открыт, и после речи идёт тихий шум
            комнаты, а не цифровой ноль."""
            self._vad_fin_left = max(0.0, after_sec)
            # Уровень речи — по громким кадрам перед паузой (последние ~2 с).
            level = max(self._vad_rms) if self._vad_rms else 0.0
            self._vad_resume = level * VAD_FINALIZE_RESUME_FRACTION if level > 0 else None
            if self._vad_fin_left <= 1e-6:
                self._send_finalize_mark()

        def cancel_vad_finalize(self) -> None:
            self._vad_fin_left = None

        def _send_finalize_mark(self) -> None:
            self._vad_fin_left = None
            try:
                # Тем же каналом, что и кадры: команда встаёт в очередь сокета
                # строго после всего звука, ушедшего до неё.
                self._input_ch.send_nowait(_FinalizeMark())
            except Exception:
                # Поток уже закрыт — закрывать нечего.
                pass

        def push_frame(self, frame: Any) -> None:
            super().push_frame(frame)
            if self._vad_rms is not None:
                samples = np.frombuffer(frame.data.tobytes(), dtype=np.int16).astype(np.float64)
                rms = float(np.sqrt(np.mean(samples * samples))) if len(samples) else 0.0
                self._vad_rms.append(rms)
                if (
                    self._vad_fin_left is not None
                    and self._vad_resume is not None
                    and rms > self._vad_resume
                ):
                    # Ученик заговорил снова раньше, чем это заметил VAD.
                    self._vad_fin_left = None
            if self._vad_fin_left is not None:
                self._vad_fin_left -= frame.duration
                if self._vad_fin_left <= 1e-6:
                    self._send_finalize_mark()
            if not self._fin_deadline:
                return
            if time.monotonic() > self._fin_deadline:
                self._fin_deadline = 0.0
                return
            if np.frombuffer(frame.data.tobytes(), dtype=np.int16).any():
                # Хвост речи ещё идёт (кадры, отправленные до отпускания).
                self._fin_zero = 0.0
                return
            self._fin_zero += frame.duration
            if self._fin_zero >= FINALIZE_AFTER_SILENCE_SEC:
                self._fin_deadline = 0.0
                try:
                    self.flush()
                except RuntimeError:
                    # Поток уже закрыт — закрывать нечего.
                    pass

        def _log_segment(self, line: str) -> None:
            logger.info("LOCK seg: %s", line[:900])

        def _log_switch(self, old: str | None, new: str, loud: float, old_loud: float) -> None:
            if old is None:
                logger.info("Speaker lock: основной говорящий %s (громкость %.0f)", new, loud)
            else:
                logger.info(
                    "Speaker lock: основной говорящий %s → %s (громкость %.0f против %.0f)",
                    old, new, loud, old_loud,
                )

        def _log_ghost(self, old: str, new: str) -> None:
            logger.info(
                "Speaker lock: основной говорящий %s звучал только на прогреве — микрофон у %s",
                old, new,
            )

        def _log_drop(self, text: str) -> None:
            # Фон бубнит без перерыва — копим и печатаем кусками, а не по
            # строке на каждое слово.
            self._drop_buf.append(text)
            joined = " ".join(self._drop_buf)
            if len(joined) >= 60:
                logger.info("STT drop: фон «%s»", joined[:120])
                self._drop_buf = []

        def _log_echo(self, text: str) -> None:
            # Это слова самого тьютора, не ученика, — печатать можно.
            self._echo_buf.append(text)
            joined = " ".join(self._echo_buf)
            if len(joined) >= 40:
                logger.info("STT echo: эхо тьютора «%s»", joined[:120])
                self._echo_buf = []

        async def _connect_ws(self) -> Any:
            ws = await super()._connect_ws()
            if self._lock is not None:
                # Новый сокет — новое время слов и новые номера говорящих.
                self._lock.reset()
            # Время слов у нового сокета снова с нуля.
            self._clock.reset()
            self._loud.reset()
            if self._echo is not None:
                self._echo.reset()
            # Взвод finalize по тишине относился к звуку старого сокета: на
            # новом он закрыл бы фразу не там, где ученик замолчал.
            self._vad_fin_left = None
            self._drop_buf = []
            self._echo_buf = []
            return _FilteringWS(
                ws, self._lock, self._log_drop, self._on_fin, self._echo, self._log_echo
            )

        def _on_fin(self) -> None:
            # Ответ на finalize. Если фраза к этому моменту уже была отдана
            # (Soniox сам закрыл её на паузе до отпускания кнопки), плагин на
            # пустой <fin> не отдаёт ничего — а commit_user_turn в это время
            # ждёт НОВЫЙ FINAL до 2 с и сдаётся по таймауту. Пустой FINAL
            # снимает это ожидание: audio_recognition взводит событие «финал
            # пришёл» до проверки на пустоту, а пустой текст в реплику не идёт.
            self._event_ch.send_nowait(
                lk_stt.SpeechEvent(
                    type=lk_stt.SpeechEventType.FINAL_TRANSCRIPT,
                    alternatives=[lk_stt.SpeechData(language=LanguageCode(""), text="")],
                )
            )

        async def _prepare_audio_task(self) -> None:
            # Копия родителя (soniox 1.6.7) плюс две вещи. Счёт громкости: считать
            # её надо ровно по тому аудио, которое ушло в сокет, иначе время слов и
            # окна громкости разъедутся. И flush → finalize: родитель метку конца
            # сегмента молча выбрасывает. Метка идёт тем же каналом, что и кадры,
            # поэтому finalize встаёт в очередь сокета строго ПОСЛЕ последнего
            # кадра речи — хвост фразы не отрежется.
            if not self._ws:
                return
            async for data in self._input_ch:
                if isinstance(data, rtc.AudioFrame):
                    pcm_data = data.data.tobytes()
                    if self._lock is not None:
                        self._lock.push_pcm(pcm_data, data.sample_rate)
                    # Часы эха — по тому же звуку и в том же порядке, что ушёл в
                    # сокет: время слов Soniox считается от него.
                    self._clock.push(data.duration)
                    if self._echo is not None:
                        self._loud.push_pcm(pcm_data, data.sample_rate)
                    self.audio_queue.put_nowait(pcm_data)
                elif isinstance(data, _FinalizeMark):
                    self.audio_queue.put_nowait(FINALIZE_MESSAGE)
                elif isinstance(data, self._FlushSentinel) and self._guard._finalize:
                    self.audio_queue.put_nowait(FINALIZE_MESSAGE)

        async def aclose(self) -> None:
            if self._lock is not None and (self._lock.kept_words or self._lock.dropped_words):
                logger.info(
                    "Speaker lock: слов ученика %d, выкинуто фона %d",
                    self._lock.kept_words, self._lock.dropped_words,
                )
            if self._echo is not None and (self._echo.kept_words or self._echo.dropped_words):
                echo_level, learner_level = self._echo.levels()
                logger.info(
                    "Echo guard: слов ученика %d, выкинуто эха %d; уровень эха %s, ученика %s",
                    self._echo.kept_words, self._echo.dropped_words,
                    round(echo_level) if echo_level else "-",
                    round(learner_level) if learner_level else "-",
                )
            await super().aclose()

    class GuardedSonioxSTT(soniox.STT):
        """soniox.STT с замком на основного говорящего (lock) и ручным
        закрытием фразы (finalize_now). Разметку говорящих включает сам, когда
        замок включён: без неё фильтровать нечего."""

        def __init__(
            self,
            *,
            lock: bool = True,
            ratio: float = SPEAKER_LOCK_RATIO_DEFAULT,
            keep: float = SPEAKER_LOCK_KEEP_DEFAULT,
            same: float = SPEAKER_LOCK_SAME_DEFAULT,
            outlier: float = SPEAKER_LOCK_OUTLIER_DEFAULT,
            memory: bool = False,
            prior_bg: float = SPEAKER_LOCK_PRIOR_BG_DEFAULT,
            warmup_ms: float = SPEAKER_LOCK_WARMUP_MS_DEFAULT,
            debug: bool = False,
            finalize: bool = True,
            echo: bool = False,
            echo_tail_sec: float = ECHO_TAIL_SEC_DEFAULT,
            echo_debug: bool = False,
            vad_finalize: bool = False,
            vad_finalize_sec: float = VAD_FINALIZE_DELAY_SEC_DEFAULT,
            **kwargs: Any,
        ) -> None:
            params = kwargs.get("params") or soniox.STTOptions()
            if lock:
                params.enable_speaker_diarization = True
            kwargs["params"] = params
            super().__init__(**kwargs)
            self._lock_on = lock
            self._ratio = ratio
            self._keep = keep
            self._same = same
            self._outlier = outlier
            self._memory = memory
            self._prior_bg = prior_bg
            self._debug = debug
            # Громкость слов ученика по всему звонку (см. MEMORY): в рации поток
            # распознавания новый на каждый ход, а ученик тот же.
            self._learner_words: deque = deque(maxlen=300)
            # Прогрев тракта — раз на звонок: окно получает первый сокет со
            # словом. В рации поток новый на каждый ход, но второй ход уже
            # «тёплый»; переподключение сокета посреди звонка — тоже.
            self._warmup_ms = warmup_ms
            self._warm_claimed = False
            self._finalize = finalize
            # Эталон эха — один на звонок: его кормят tts_node (текст) и
            # события сессии (когда тьютор говорит), а читают потоки.
            self.echo: EchoReference | None = EchoReference(echo_tail_sec) if echo else None
            self._echo_debug = echo_debug
            self.vad_finalize = vad_finalize
            self._vad_finalize_sec = vad_finalize_sec
            # Живые потоки сессии: finalize_now зовут из RPC рации, а поток
            # распознавания создаёт и держит сам фреймворк.
            self._streams: weakref.WeakSet = weakref.WeakSet()

        def stream(self, *, language: Any = None, conn_options: Any = None) -> Any:
            from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

            s = _GuardedSpeechStream(
                stt=self, conn_options=conn_options or DEFAULT_API_CONNECT_OPTIONS
            )
            self._streams.add(s)
            return s

        def _prior_level(self) -> float | None:
            if len(self._learner_words) < 5:
                return None
            return quantile(self._learner_words, SpeakerLock.LEVEL_QUANTILE)

        def _claim_warmup(self) -> bool:
            if self._warm_claimed:
                return False
            self._warm_claimed = True
            return True

        def finalize_now(self) -> int:
            """Рация: кнопку отпустили — ученик договорил. Взводит finalize у
            живых потоков; сама команда уходит после тишины за последним словом
            (см. FINALIZE_AFTER_SILENCE_SEC). Возвращает число взведённых."""
            if not self._finalize:
                return 0
            armed = 0
            for s in list(self._streams):
                s.arm_finalize()
                armed += 1
            return armed

        def finalize_on_silence(self) -> int:
            """«Свободно»: VAD решил, что ученик договорил. Без команды
            казахскую фразу Soniox закрывает сам через ~2.6 с, и всё это время
            фреймворк ждёт финальный транскрипт (eou_delay = transcription_delay
            в живом зонде 03.10.2026). Возвращает число взведённых потоков."""
            if not self.vad_finalize:
                return 0
            armed = 0
            for s in list(self._streams):
                s.arm_vad_finalize(self._vad_finalize_sec)
                armed += 1
            return armed

        def cancel_silence_finalize(self) -> None:
            """Ученик заговорил снова раньше, чем ушла команда."""
            for s in list(self._streams):
                s.cancel_vad_finalize()

else:  # pragma: no cover
    GuardedSonioxSTT = None  # type: ignore[assignment,misc]


# ── Сторож конца хода ────────────────────────────────────────────────────────


class TurnWatchdog:
    """Чистая логика сторожа: события на вход, «пора закрывать» на выход.

    Закрываем, когда одновременно:
      * детектор голоса считает, что ученик ещё говорит;
      * в этом ходе у ученика уже были слова;
      * нового слова нет дольше `quiet_sec`.
    Если слов в ходе не было вовсе — это чистый фон, ход не трогаем: тьютор
    просто продолжает слушать. В тихой комнате сторож не срабатывает никогда:
    детектор закрывает ход через 0.3 с тишины, раньше порога.
    """

    def __init__(self, quiet_sec: float, now: Callable[[], float] = time.monotonic) -> None:
        self.quiet_sec = quiet_sec
        self._now = now
        self.enabled = quiet_sec > 0
        self._speaking = False
        self._has_words = False
        self._last_word = 0.0

    def on_user_state(self, state: str) -> None:
        self._speaking = state == "speaking"
        if not self._speaking:
            # Ход закрылся штатно (или ученик ушёл) — копить больше нечего.
            self._has_words = False

    def on_transcript(self, text: str) -> None:
        if text and text.strip():
            self._has_words = True
            self._last_word = self._now()

    def on_agent_state(self, state: str) -> None:
        # Тьютор задумался или заговорил — ход уже отдан, слова этого хода
        # повторно закрывать нельзя.
        if state in ("thinking", "speaking"):
            self._has_words = False

    def should_commit(self) -> bool:
        if not (self.enabled and self._speaking and self._has_words):
            return False
        return self._now() - self._last_word >= self.quiet_sec

    def committed(self) -> None:
        self._has_words = False


def attach_turn_watchdog(session: Any, watchdog: TurnWatchdog, *, tick: float = 0.2) -> asyncio.Task:
    """Подписать сторожа на события сессии и запустить опрос.

    Опрос, а не таймер на каждое слово: событий «слово» много, а решение
    нужно одно, и проверка дешёвая."""

    @session.on("user_state_changed")
    def _on_user(ev: Any) -> None:
        watchdog.on_user_state(str(getattr(ev, "new_state", "")))

    @session.on("user_input_transcribed")
    def _on_words(ev: Any) -> None:
        watchdog.on_transcript(str(getattr(ev, "transcript", "") or ""))

    @session.on("agent_state_changed")
    def _on_agent(ev: Any) -> None:
        watchdog.on_agent_state(str(getattr(ev, "new_state", "")))

    async def _loop() -> None:
        while True:
            await asyncio.sleep(tick)
            if not watchdog.should_commit():
                continue
            watchdog.committed()
            held = watchdog._now() - watchdog._last_word
            logger.info(
                "TURN forced: слов ученика нет %.1f с, а детектор держит ход — закрываю",
                held,
            )
            try:
                fut = session.commit_user_turn(transcript_timeout=0.5)
            except Exception as e:  # сессия закрывается, активность сменилась
                logger.warning("TURN forced: commit_user_turn не прошёл (%s)", e)
                continue
            if fut is not None and hasattr(fut, "add_done_callback"):
                fut.add_done_callback(lambda f: f.cancelled() or f.exception())

    task = asyncio.create_task(_loop(), name="noise_guard.turn_watchdog")

    # Сессия закрылась — опрашивать больше некого. Без этого задача жила бы до
    # конца процесса воркера и звала commit_user_turn у мёртвой сессии.
    @session.on("close")
    def _on_close(ev: Any) -> None:
        task.cancel()

    return task


def attach_echo_and_vad_finalize(session: Any, stt: Any, *, is_auto: Callable[[], bool]) -> None:
    """Подписать фильтр эха и finalize по концу речи на события сессии.

    Эталону эха нужно знать, когда тьютор говорит (agent_state_changed).
    finalize по концу речи слушает user_state_changed: speaking → listening —
    это и есть конец речи по VAD. Только в «Свободно» (is_auto): в рации конец
    хода задаёт кнопка, и finalize шлёт её RPC."""
    echo = getattr(stt, "echo", None)
    if echo is not None:

        @session.on("agent_state_changed")
        def _on_agent(ev: Any) -> None:
            state = str(getattr(ev, "new_state", ""))
            # В рации эху неоткуда взяться: микрофон открыт, только пока ученик
            # держит кнопку, а нажатие сразу обрывает тьютора. Окно эха там
            # только мешало бы: ученик, нажавший кнопку и сразу повторивший
            # слово тьютора, терял бы его в хвосте.
            if state == "speaking" and not is_auto():
                return
            echo.on_agent_state(state)

    if getattr(stt, "vad_finalize", False):

        @session.on("user_state_changed")
        def _on_user(ev: Any) -> None:
            new = str(getattr(ev, "new_state", ""))
            if new == "speaking":
                stt.cancel_silence_finalize()
            elif new == "listening" and str(getattr(ev, "old_state", "")) == "speaking" and is_auto():
                stt.finalize_on_silence()
