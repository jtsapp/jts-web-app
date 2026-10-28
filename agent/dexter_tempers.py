"""Декстер в двух нравах (29.10.2026): ядро пакета Speaking Buddy под нрав.

Ядро v3.5 само описывает Декстера «всегда злым» и со ступенями мата по возрасту
(§0, §4, §8, §11). Одна персона это не перебьёт: замеры 16.09.2026 показали, что
персона, спорящая с остальным промптом, сползает к нему. Поэтому под каждый нрав
ядро собирается подменами «точная строка → замена».

Каждая подмена обязана найтись в ядре РОВНО один раз, иначе patch_core падает:
клиент пришлёт новое ядро — сборка остановится, а не уйдёт к ученику с
наполовину старым смыслом.

Спека: docs/superpowers/specs/2026-10-29-dexter-two-tempers-design.md
"""
import re

# ("text", старое, новое) — точная подстрока. ("para", начало, новое) — абзац
# целиком по его началу: абзац ядра — одна строка, переписывать его по кускам
# значило бы копировать сюда сотни символов ради одной правки смысла.
Patch = tuple[str, str, str]


def patch_core(core: str, patches: list[Patch]) -> str:
    for kind, key, new in patches:
        if kind == "para":
            lines = [ln for ln in core.split("\n") if ln.startswith(key)]
            if len(lines) != 1:
                raise ValueError(f"core patch: paragraph {key[:60]!r} found {len(lines)} times")
            old = lines[0]
        elif kind == "text":
            old = key
        else:
            raise ValueError(f"core patch: unknown kind {kind!r}")
        count = core.count(old)
        if count != 1:
            raise ValueError(f"core patch: {key[:60]!r} found {count} times")
        core = core.replace(old, new)
    # Убранный абзац оставляет пустую строку лишней — сводим, как это делает
    # загрузчик файлов пакета (_load_methodology_file).
    return re.sub(r"\n{3,}", "\n\n", core)
