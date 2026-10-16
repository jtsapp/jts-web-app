"""Каждый локальный модуль, который импортирует agent.py, должен попасть в образ.

Dockerfile копирует файлы поимённо, а тесты гоняются из папки agent/, где лежит
всё, — поэтому забытая строка COPY проходит все тесты и всплывает только после
`lk agent deploy`: воркер падает на импорте и уходит в CrashLoop, а агент общий
для дева и прода (16.10.2026 так упал assistant_call.py, раньше — noise_guard.py).
Запуск напрямую (pytest в проекте нет):
    agent/venv/Scripts/python.exe agent/test_dockerfile.py
"""
import ast
import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = Path(__file__).resolve().parent
local = {p.stem for p in HERE.glob("*.py") if not p.name.startswith("test_")}

copied = set()
for line in (HERE / "Dockerfile").read_text(encoding="utf-8").splitlines():
    parts = line.split()
    if len(parts) >= 3 and parts[0] == "COPY" and parts[1].endswith(".py"):
        copied.add(Path(parts[1]).stem)


def imports_of(module: str) -> set[str]:
    tree = ast.parse((HERE / f"{module}.py").read_text(encoding="utf-8"))
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found |= {a.name.split(".")[0] for a in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.add(node.module.split(".")[0])
    return found & local


# Обходим граф импортов от точки входа: модуль, который тянет модуль, тоже нужен.
need, todo = set(), ["agent"]
while todo:
    m = todo.pop()
    if m in need:
        continue
    need.add(m)
    todo.extend(imports_of(m) - need)

missing = sorted(need - copied)
assert not missing, f"Dockerfile не копирует: {', '.join(m + '.py' for m in missing)}"
print("dockerfile ok:", ", ".join(sorted(need)))
