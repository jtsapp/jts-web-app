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

print("test_dexter_tempers: ok")
