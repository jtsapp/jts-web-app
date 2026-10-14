"""Ассерты для живого Декстера (bro) на сборке Speaking Buddy. pytest в проекте
нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_dexter_live.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

14.10.2026 решение владельца: тестовый Декстер (KZ TEST, ключ jarvis) заменяет
живого — у bro сборка пакета Speaking Buddy и мозг Haiku 5.5. Прежняя персона
остаётся откатом секретом DEXTER_PROMPT=legacy. В тот же день KZ TEST отдан
новой Луне.
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.environ["VOICE_STACK"] = "cascade"
for name in ("KZ_TEST_PROMPT", "DEXTER_PROMPT", "BRAIN_MODEL_BUDDY", "BRAIN_MODEL_BUDDY_BRO", "BRAIN_MODEL_BRO"):
    os.environ.pop(name, None)

from agent import (  # noqa: E402
    LearnerProfile,
    _brain_model_for,
    build_buddy_greeting,
    build_buddy_instructions,
    buddy_guard_tutor,
    buddy_persona_for,
    buddy_test_on,
    buddy_voice_profile,
    session_brain_model,
)


def profile(**kw) -> LearnerProfile:
    base = dict(
        tutor="bro", level="A2", lang="ru", explanation_lang="ru",
        user_name="Айгерим", interests=["music"], facts=["works as a nurse"],
        topics=["weekend plans"], mistakes=["she go -> she goes"],
        due_reviews=["I go yesterday -> I went yesterday"], due_vocab=["schedule"],
        passed_units=["cafe"], next_unit="hotel", age_group="adult",
    )
    base.update(kw)
    return LearnerProfile(**base)


dexter = profile()
kz_test = profile(tutor="jarvis")

# ── Кто включается ───────────────────────────────────────────────────────────
assert buddy_test_on(dexter)
assert buddy_persona_for(dexter) == "dexter"
# Тумблера 18+ в пакете нет: оба нрава — один Декстер v3.
for temper in ("", "calm", "harsh"):
    assert buddy_test_on(profile(temper=temper)), temper
# Сценарий и проверка уровня — свои сборки, как и раньше.
assert not buddy_test_on(profile(mode="scenario", scenario_id="ordering-coffee"))
assert not buddy_test_on(profile(mode="placement"))

# ── Сборка — пакет с персоной Декстера, сессия — его же ──────────────────────
# До 14.10.2026 здесь была побайтная сверка с KZ TEST, где Декстер обкатывался;
# теперь KZ TEST — новая Луна (test_luna_stand.py), а сборку Декстера целиком
# проверяет test_buddy_prompt.py.
for lvl in ("A0", "A2", "B1", "C1"):
    text = build_buddy_instructions(profile(level=lvl), buddy_persona_for(dexter))
    assert "# DEXTER" in text.partition("==== PERSONA")[2], lvl
    assert "# LUNA" not in text, lvl
assert "SESSION_START" in build_buddy_greeting(dexter)
# Сессия (голос, распознавание, детектор) — живого Декстера.
assert buddy_voice_profile(dexter).tutor == "bro"
assert buddy_guard_tutor(dexter) == "bro", "замок и фильтр эха — по своим спискам секретов"
assert buddy_voice_profile(kz_test).tutor == "gentle", "KZ TEST — уже Луна"

# ── Мозг — тот же Haiku 5.5 ──────────────────────────────────────────────────
assert session_brain_model(dexter) == "claude-haiku-5-5"
os.environ["BRAIN_MODEL_BRO"] = "claude-haiku-4-5"
assert session_brain_model(dexter) == "claude-haiku-5-5", "BRAIN_MODEL_BRO — мозг прежней персоны"
os.environ.pop("BRAIN_MODEL_BRO")
os.environ["BRAIN_MODEL_BUDDY_BRO"] = "gpt-6-sol"
assert session_brain_model(dexter) == "gpt-6-sol", "откат мозга секретом, без деплоя"
assert session_brain_model(kz_test) == "claude-haiku-5-5", "секрет Декстера не трогает KZ TEST"
os.environ.pop("BRAIN_MODEL_BUDDY_BRO")

# ── Откат на прежнюю персону — секретом, каждому свой ────────────────────────
os.environ["DEXTER_PROMPT"] = "legacy"
assert not buddy_test_on(dexter)
assert session_brain_model(dexter) == _brain_model_for("bro"), "с прежней персоной — прежний мозг"
assert buddy_voice_profile(dexter) is dexter
assert buddy_test_on(kz_test), "KZ TEST остаётся на пакете"
os.environ.pop("DEXTER_PROMPT")
os.environ["KZ_TEST_PROMPT"] = "legacy"
assert buddy_test_on(dexter), "откат стенда живого Декстера не трогает"
os.environ.pop("KZ_TEST_PROMPT")

# ── Haiku 5.5 через brain-us — секретом, по тьютору ─────────────────────────
from agent import _anthropic_via_shim, _brain_supports_prefill  # noqa: E402

os.environ.pop("ANTHROPIC_VIA_SHIM", None)
assert not _anthropic_via_shim("bro"), "без секрета — напрямую, как раньше"
for raw, bro, jarvis in (
    ("bro", True, False),
    ("bro,jarvis", True, True),
    (" BRO , jarvis ", True, True),
    ("on", True, True),
    ("off", False, False),
    ("﻿bro", True, False),
):
    os.environ["ANTHROPIC_VIA_SHIM"] = raw
    assert _anthropic_via_shim("bro") is bro and _anthropic_via_shim("jarvis") is jarvis, raw
os.environ.pop("ANTHROPIC_VIA_SHIM")
# Через шим модель та же — значит, и префилла нет (шим сам закрывает хвост «.»).
assert not _brain_supports_prefill(session_brain_model(dexter))

print("test_dexter_live: ok")
