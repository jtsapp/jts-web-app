"""Ассерты для контекста распознавания: словарь терминов и его бюджет.

pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_stt_context.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.

Главное, что тут закреплено:
  * личное (имя, слова на повторении) не вытесняется общим словарём;
  * контекст не перерастает лимит Soniox — превышение это не усечение, а
    ошибка invalid_request, то есть сессия вообще без распознавания;
  * повторы и мусор не съедают бюджет;
  * SONIOX_STT_CONTEXT=off действительно выключает подсказки.
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from agent import (  # noqa: E402
    STT_CONTEXT_CHAR_BUDGET,
    STT_DUE_VOCAB_LIMIT,
    STT_STATIC_TERMS,
    STT_TERM_MAX_CHARS,
    LearnerProfile,
    _dedupe_terms,
    _soniox_stt_context,
    _stt_context_general,
)

# --- словарь из файла -------------------------------------------------------
# Файл читается на старте воркера; пустой список означает, что stt-terms.txt не
# уехал в образ — ровно та поломка, которую тихо не заметишь.
assert STT_STATIC_TERMS, "stt-terms.txt не прочитан"
assert "present perfect" in STT_STATIC_TERMS
assert "Спарк" in STT_STATIC_TERMS
# Комментарии и пустые строки в термины не попадают.
assert not [t for t in STT_STATIC_TERMS if t.startswith("#") or not t.strip()]
# Словарь не должен в одиночку съедать бюджет: остальное место нужно ученику.
assert sum(len(t) + 1 for t in STT_STATIC_TERMS) < STT_CONTEXT_CHAR_BUDGET // 2

# --- нормализация и бюджет --------------------------------------------------
assert _dedupe_terms(["  present   perfect  "], 100) == ["present perfect"]
# Регистр не создаёт второй записи: Soniox не различает их по весу.
assert _dedupe_terms(["IELTS", "ielts", "Ielts"], 100) == ["IELTS"]
assert _dedupe_terms(["", "   ", "ok"], 100) == ["ok"]
# Целое предложение — не термин: оно только отбирает место.
assert _dedupe_terms(["x" * (STT_TERM_MAX_CHARS + 1), "ok"], 100) == ["ok"]

# Переполнение пропускает длинный термин, но берёт следующий короткий — иначе
# один случайный длинный обрубал бы весь хвост списка.
assert _dedupe_terms(["aaaa", "bbbb", "cc"], 8) == ["aaaa", "cc"]

budget_terms = _dedupe_terms([f"term{i}" for i in range(5000)], STT_CONTEXT_CHAR_BUDGET)
assert sum(len(t) + 1 for t in budget_terms) <= STT_CONTEXT_CHAR_BUDGET

# --- general ----------------------------------------------------------------
p = LearnerProfile(level="A2", user_name="Айгерім", profession="дизайнер", topics=["travel"])
general = dict(_stt_context_general(p))
assert general["speaker"] == "Айгерім"
assert general["level"] == "A2"
assert general["topic"] == "travel"
assert general["occupation"] == "дизайнер"
assert "Kazakh" in general["languages"]
# Пустые поля профиля не превращаются в пустые пары.
assert "speaker" not in dict(_stt_context_general(LearnerProfile()))
# По документации Soniox пар должно быть мало — до десятка.
assert len(_stt_context_general(p)) <= 10

# englishOnly убирает русский и казахский из подсказок STT — контекст не должен
# звать их обратно.
assert dict(_stt_context_general(LearnerProfile(english_only=True)))["languages"] == "English"

# --- приоритет: личное важнее общего ----------------------------------------
# Накопленный словарь заведомо больше бюджета. Имя и слова на повторении обязаны
# уцелеть, потому что взять их больше неоткуда.
flood = LearnerProfile(
    user_name="Ерасыл",
    due_vocab=["procrastinate"],
    vocab=[f"word{i}" for i in range(4000)],
)
ctx = _soniox_stt_context(flood)
assert ctx is not None
terms = ctx.terms or []
assert terms[0] == "Ерасыл"
assert "procrastinate" in terms
assert "present perfect" in terms, "общий словарь вытеснен накопленным"
assert sum(len(t) + 1 for t in terms) <= STT_CONTEXT_CHAR_BUDGET

# Слов на повторении может накопиться много — берём только начало списка.
many_due = LearnerProfile(due_vocab=[f"due{i}" for i in range(STT_DUE_VOCAB_LIMIT + 50)])
due_terms = (_soniox_stt_context(many_due).terms or [])
assert f"due{STT_DUE_VOCAB_LIMIT + 10}" not in due_terms

# --- рубильник --------------------------------------------------------------
os.environ["SONIOX_STT_CONTEXT"] = "off"
assert _soniox_stt_context(p) is None
os.environ.pop("SONIOX_STT_CONTEXT")
assert _soniox_stt_context(p) is not None

print("stt context ok")
