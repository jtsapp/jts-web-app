"""Подмены ядра Speaking Buddy под нрав Декстера (agent/dexter_tempers.py).
Запуск: agent/venv/Scripts/python.exe agent/test_dexter_tempers.py
Падает на первом расхождении, молчит (печатает ok), когда всё сошлось."""
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from dexter_tempers import patch_core  # noqa: E402

core = "A one.\n\nB two.\n\nC three.\n"
assert patch_core(core, [("text", "two", "2")]) == "A one.\n\nB 2.\n\nC three.\n"
assert patch_core(core, [("para", "B ", "B new.")]) == "A one.\n\nB new.\n\nC three.\n"
# Убранный абзац не оставляет тройного перевода строки.
assert patch_core(core, [("para", "B ", "")]) == "A one.\n\nC three.\n"
# Подмены применяются по порядку: вторая видит результат первой.
assert patch_core(core, [("text", "two", "2"), ("text", "B 2.", "B!")]) == "A one.\n\nB!\n\nC three.\n"
# Не нашлась, нашлась дважды, неизвестный вид — ошибка, а не тихий пропуск.
for bad in ([("text", "zzz", "")], [("text", "e", "")], [("para", "Q", "")], [("x", "A", "")]):
    try:
        patch_core(core, bad)
    except ValueError:
        continue
    raise AssertionError(f"должно было упасть: {bad}")

# Настоящее ядро: каждая подмена нашлась ровно один раз (иначе patch_core упадёт).
import os  # noqa: E402

os.environ["VOICE_STACK"] = "cascade"
from agent import BUDDY_CORE  # noqa: E402
from dexter_tempers import CALM_CORE_PATCHES  # noqa: E402

calm = patch_core(BUDDY_CORE, CALM_CORE_PATCHES)
for gone in ("always angry", "word ratings", "swears in every ordinary turn", "Frequency:", "full roast",
             "stays angry", "angrily"):
    assert gone not in calm, gone
assert "**Hard limits in every rating.**" in calm, "жёсткие границы остаются"
assert "**Distress.** Distress includes:" in calm, "беда остаётся"

from dexter_tempers import HOOLIGAN_CORE_PATCHES  # noqa: E402

hool = patch_core(BUDDY_CORE, HOOLIGAN_CORE_PATCHES)
for gone in ("under 18 or unknown — same Dexter", "never the person", "mocks intelligence only",
             "stop-insults opt-out", "adult roast rating", "adult rating"):
    assert gone not in hool, gone
assert "**Dexter's hooligan rating.**" in hool and "- **hooligan — full attack.**" in hool
# Слова-ярлыки про инвалидность остаются под запретом, ненависть по признаку —
# тоже; «ёб твою мать» — только междометием, не про настоящую мать (30.10).
for kept in ("“дебил”", "“даун”", "“retard”", "“пидор”", "“чурка”",
             "no insults about ethnicity, nationality, religion, gender, sexual orientation",
             "aimed at the learner's real mother", "suicide, self-harm"):
    assert kept in hool, kept
# Внешность — только взрослому (блок ступени), обычные отмазки — можно.
assert "only where Dexter's word-rating block says the learner is an adult" in hool
assert "Plain tiredness, lack of sleep, a busy day" in hool
assert "**Distress.** Distress includes:" in hool

print("test_dexter_tempers: ok")
