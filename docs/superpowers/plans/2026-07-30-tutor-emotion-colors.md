# Эмоции тьютора цветом рамки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Голосовой тьютор выражает эмоцию свечением по внутренним границам карточки разговора; сила эмоции = насколько близко свечение подходит к орбу.

**Architecture:** Мозг (Anthropic Haiku через `/api/voice/brain`) метит реплику инлайн-тегом `[mood:имя:1-3]`. Питон снимает тег в `TutorAgent.llm_node` — этот хук стоит выше и TTS, и субтитров, поэтому тег не попадёт ни в голос, ни в текст на экране. Эмоция уезжает в браузер через `publish_data(topic="mood")` тем же механизмом, что уже работает для топика `lesson`. Клиент вешает класс на `.t-voice__card`, CSS рисует `box-shadow: inset`.

**Tech Stack:** Python 3.11 + livekit-agents 1.6.7 (агент), Next.js 15 + React (JavaScript, не TypeScript), `@livekit/components-react`, обычный CSS в `src/tutor.css`.

## Global Constraints

- **Только JavaScript, не TypeScript.** Весь клиентский код — `.js`/`.jsx`. Не добавлять TS-файлы (`jsconfig.json`).
- **Стили только в трёх глобальных CSS-файлах.** Новое — в `src/tutor.css`, классами в существующем стиле. Никаких CSS-модулей и styled-components.
- **Комментарии на русском и объясняют «почему», не «что».**
- **Тест-раннера в проекте нет.** Проверка = `npm run build` + `npm run lint` + ассерты питоном напрямую + ручной прогон через `?screen=tutor-voice-chat`.
- **Персона Декстера сжата намеренно** (см. комментарий над `PERSONA_OVERRIDE["bro"]` в `agent/agent.py`). Инструкция про mood-тег идёт ОТДЕЛЬНЫМ блоком промпта, а не внутрь текста персоны — раздувание персоны её вырождает.
- **Имя эмоции из сети никогда не подставляется в CSS.** Клиент держит свой словарь `имя → класс` и незнакомое имя игнорирует.
- **Ключ `AZURE_SPEECH_KEY` и прочие секреты не коммитить.** `.env.local` вне git.
- **Разрешённые имена эмоций (единый список, копировать дословно):** `anger`, `disgust`, `joy`, `sadness`, `gloat`.
- **Шкала силы:** целое `1`, `2` или `3`. Ничего другого не принимается.

---

## File Structure

| Файл | Ответственность | Действие |
| --- | --- | --- |
| `agent/agent.py` | таблица `TUTOR_MOODS`, генерация блока промпта, `parse_mood_tag`, `_MoodStripper`, override `llm_node`, публикация в топик `mood` | Modify |
| `agent/test_mood_tag.py` | ассерты на `parse_mood_tag` и `_MoodStripper` (прогоняется питоном напрямую, pytest в проекте нет) | Create |
| `src/screens/TutorVoiceChatPage.jsx` | подписка на топик `mood`, состояние, класс на карточке | Modify |
| `src/tutor.css` | палитра, повадки, шкала силы, reduced-motion | Modify |

Питоновский парсер выносится в чистые функции без сети и без livekit — только так его можно прогнать ассертами, не поднимая агент.

---

### Task 1: Парсер mood-тега (чистые функции)

Самостоятельная единица: чистая логика + свои ассерты, ничего не знает ни про livekit, ни про сеть. Ревьюер может принять или отвергнуть её независимо от всего остального.

**Files:**
- Modify: `agent/agent.py` (добавить рядом с `PERSONA_OVERRIDE`, до `class TutorAgent` на строке 1011)
- Test: `agent/test_mood_tag.py` (создать)

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `TUTOR_MOODS: dict[str, frozenset[str]]` — какие эмоции разрешены какому тьютору.
  - `parse_mood_tag(text: str) -> tuple[str, int, str]` — возвращает `(mood, intensity, остаток)`. При отсутствии тега — `("", 0, text)` без изменений текста.
  - `class _MoodStripper` с методами `feed(text: str) -> str`, `flush() -> str` и полями `.mood: str`, `.intensity: int`.
  - `build_mood_block(tutor: str) -> str` — блок инструкции для промпта; `""` если тьютору эмоции не положены.

- [ ] **Step 1: Написать падающий тест**

Создать `agent/test_mood_tag.py`:

```python
"""Ассерты для mood-парсера. pytest в проекте нет — файл запускается напрямую:
    agent/venv/Scripts/python.exe agent/test_mood_tag.py
Падает с AssertionError на первом расхождении, молчит когда всё сошлось.
"""
from agent import _MoodStripper, build_mood_block, parse_mood_tag, TUTOR_MOODS

# --- parse_mood_tag ---------------------------------------------------------
assert parse_mood_tag("[mood:anger:3]Ты чё тупишь") == ("anger", 3, "Ты чё тупишь")
assert parse_mood_tag("  [mood:joy:1] Хорооош") == ("joy", 1, "Хорооош")
assert parse_mood_tag("[MOOD:Gloat:2]ага") == ("gloat", 2, "ага")

# Тега нет — текст обязан вернуться нетронутым.
assert parse_mood_tag("Ты чё тупишь") == ("", 0, "Ты чё тупишь")

# Битый тег не должен ничего съесть.
assert parse_mood_tag("[mood:anger]нет силы") == ("", 0, "[mood:anger]нет силы")
assert parse_mood_tag("[mood:anger:9]сила вне шкалы") == ("", 0, "[mood:anger:9]сила вне шкалы")
assert parse_mood_tag("[mood::2]нет имени") == ("", 0, "[mood::2]нет имени")

# Тег НЕ в начале — не цепляем, иначе парсер сожрёт кусок реальной речи.
assert parse_mood_tag("Слушай [mood:joy:2] сюда") == ("", 0, "Слушай [mood:joy:2] сюда")

# --- _MoodStripper: тег приходит целиком ------------------------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mood:anger:3]Ты чё тупишь, братан") == "Ты чё тупишь, братан"
assert (s.mood, s.intensity) == ("anger", 3)
assert s.flush() == ""

# --- _MoodStripper: тег разорван между чанками стрима -----------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("[mo") == ""
assert s.feed("od:gl") == ""
assert s.feed("oat:2]ну и ну") == "ну и ну"
assert (s.mood, s.intensity) == ("gloat", 2)

# --- _MoodStripper: тега нет, реплика короче лимита -------------------------
# flush() обязателен: без него короткая реплика без тега пропала бы целиком.
s = _MoodStripper(TUTOR_MOODS["bro"])
assert s.feed("Хорош") == ""
assert s.flush() == "Хорош"
assert s.mood == ""

# --- _MoodStripper: тега нет, реплика длиннее лимита ------------------------
s = _MoodStripper(TUTOR_MOODS["bro"])
long_text = "Слушай сюда внимательно и повтори за мной целым предложением прямо сейчас"
out = s.feed(long_text)
assert out == long_text, out
assert s.feed(" и ещё раз") == " и ещё раз"  # после лимита проходит насквозь
assert s.mood == ""

# --- _MoodStripper: эмоция не разрешена этому тьютору -----------------------
# Тег всё равно ВЫРЕЗАН (иначе его озвучат), но эмоция не выставлена.
s = _MoodStripper(TUTOR_MOODS["gentle"])
assert s.feed("[mood:gloat:3]Ты молодец") == "Ты молодец"
assert s.mood == ""

# --- build_mood_block -------------------------------------------------------
bro_block = build_mood_block("bro")
assert "anger" in bro_block and "gloat" in bro_block
gentle_block = build_mood_block("gentle")
assert "joy" in gentle_block and "sadness" in gentle_block
assert "gloat" not in gentle_block and "anger" not in gentle_block
assert build_mood_block("professor") == ""

print("mood-парсер: все ассерты прошли")
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd agent && ./venv/Scripts/python.exe test_mood_tag.py
```

Ожидается: `ImportError: cannot import name '_MoodStripper' from 'agent'`

- [ ] **Step 3: Написать реализацию**

В `agent/agent.py` вставить ПЕРЕД `class TutorAgent(Agent):` (строка 1011):

```python
# ── Эмоции тьютора: тег в реплике → цвет рамки у ученика ─────────────────────
# Эмоцию метит САМ мозг тегом в начале реплики, а не питон по словам. Причина:
# у Декстера мат стоит в КАЖДОЙ реплике по промпту, то есть мат — это фон его
# речи, а не сигнал. Отличить «бля какой же ты тупой» (злость) от «ну и ну, я
# так и знал» (злорадство) списками слов надёжно нельзя. Отдельный tool-call
# тоже не годится: модели забывают звать инструменты, а тег едет в том же
# ответе бесплатно.
MOOD_NAMES = ("anger", "disgust", "joy", "sadness", "gloat")

# Кому какие эмоции положены. Злорадство и отвращение противоречат характерам
# Луны («чуткая, спокойная») и Спарка («энергичный»), а радость и грусть идут
# всем. Инструкция для промпта генерится ИЗ этой таблицы, поэтому тьютор просто
# не узнаёт про эмоции, которых ему не выдали.
TUTOR_MOODS: dict[str, frozenset[str]] = {
    "bro": frozenset(MOOD_NAMES),            # Декстер — весь набор
    "gentle": frozenset({"joy", "sadness"}),  # Луна
    "hype": frozenset({"joy", "sadness"}),    # Спарк
}

MOOD_TAG_RE = re.compile(r"^\s*\[mood:([a-z]+):([1-3])\]\s*", re.IGNORECASE)
# Сколько символов головы реплики ждать, прежде чем решить, что тега нет.
# Держит два риска сразу: (1) чанки стрима рвут тег в произвольном месте,
# поэтому решать по первому чанку нельзя; (2) без верхней границы парсер копил
# бы всю реплику и мог сожрать реальную речь.
MOOD_SCAN_LIMIT = 40


def parse_mood_tag(text: str) -> tuple[str, int, str]:
    """Снять `[mood:имя:сила]` с ГОЛОВЫ текста.

    Возвращает `(имя, сила, остаток)`. Тега нет или он битый → `("", 0, text)`
    и текст не тронут: парсер никогда не должен есть реальную речь.
    """
    m = MOOD_TAG_RE.match(text)
    if not m:
        return "", 0, text
    return m.group(1).lower(), int(m.group(2)), text[m.end():]


class _MoodStripper:
    """Снимает mood-тег с потока реплики, накапливая голову до решения.

    Живёт одну реплику. `feed()` отдаёт текст, который можно пускать дальше в
    TTS; пока тег может быть ещё не дочитан, отдаёт пустую строку и копит.
    `flush()` в конце реплики ОБЯЗАТЕЛЕН — без него короткий ответ без тега
    (меньше MOOD_SCAN_LIMIT символов) не был бы озвучен вообще.
    """

    def __init__(self, allowed: frozenset[str]):
        self._allowed = allowed
        self._buf = ""
        self._done = False  # тег снят либо ясно, что его нет
        self.mood = ""
        self.intensity = 0

    def feed(self, text: str) -> str:
        if self._done:
            return text
        self._buf += text
        mood, intensity, rest = parse_mood_tag(self._buf)
        if mood:
            self._done = True
            self._buf = ""
            # Тег вырезаем ВСЕГДА, даже если эмоция не положена этому тьютору:
            # иначе модель, придумавшая лишнее имя, заставит TTS его произнести.
            if mood in self._allowed:
                self.mood, self.intensity = mood, intensity
            return rest
        if len(self._buf) >= MOOD_SCAN_LIMIT:
            self._done = True
            out, self._buf = self._buf, ""
            return out
        return ""

    def flush(self) -> str:
        """Реплика кончилась, не добрав до лимита — отдать накопленное."""
        if self._done:
            return ""
        self._done = True
        out, self._buf = self._buf, ""
        return out


def build_mood_block(tutor: str) -> str:
    """Блок промпта про mood-тег. Пусто, если тьютору эмоции не выданы.

    Отдельным блоком, а не внутрь PERSONA_OVERRIDE: персона Декстера сжата
    намеренно (см. комментарий над ней), и любая добавка её размывает.
    """
    allowed = TUTOR_MOODS.get((tutor or "").strip().lower())
    if not allowed:
        return ""
    names = ", ".join(sorted(allowed))
    return (
        "\n==== MOOD TAG (silent) ====\n"
        f"Начинай реплику с тега [mood:<имя>:<сила>], где имя — одно из: {names}; "
        "сила — 1 (слабо), 2 (заметно) или 3 (сильно).\n"
        "Тег определяется СМЫСЛОМ сказанного, не лексикой: ругательства сами по "
        "себе ничего не значат, они могут сопровождать любую эмоцию.\n"
        "Настроение ровное — тег не ставь вообще.\n"
        "Тег служебный: он вырезается до озвучки, ученик его не слышит и не "
        "видит. Никогда не упоминай его вслух и не ставь в середину реплики.\n"
    )
```

Проверить, что `import re` уже есть в шапке `agent/agent.py` (он есть — используется в других местах). Если вдруг нет, добавить.

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd agent && ./venv/Scripts/python.exe test_mood_tag.py
```

Ожидается: `mood-парсер: все ассерты прошли`

- [ ] **Step 5: Коммит**

```bash
git add agent/agent.py agent/test_mood_tag.py && git commit -m "feat(voice): парсер mood-тега тьютора"
```

---

### Task 2: Публикация эмоции из агента

**Files:**
- Modify: `agent/agent.py` — `TutorAgent.__init__` (строка 1021), новый метод `_publish_mood`, override `llm_node`, вызов конструктора (строка 3177), вклейка блока в промпт (строка 1976)

**Interfaces:**
- Consumes: `TUTOR_MOODS`, `_MoodStripper`, `build_mood_block` из Task 1.
- Produces: сообщение на топик `mood` вида `{"mood": "anger", "intensity": 3}`. Это контракт для Task 3.

- [ ] **Step 1: Пробросить tutor в TutorAgent**

В `agent/agent.py` в `TutorAgent.__init__` (строка 1021) добавить параметр и поле:

```python
    def __init__(
        self,
        instructions: str,
        device_id: str,
        api_url: str,
        room: Any = None,
        scenario_id: str = "",
        tutor: str = "",
    ):
        super().__init__(instructions=instructions)
        self._device_id = device_id
        self._api_url = api_url.rstrip("/")
        # Which structured scenario this call is running (for report_task_complete).
        self._scenario_id = scenario_id
        # Персона этой сессии — от неё зависит, какие эмоции разрешены (TUTOR_MOODS).
        self._tutor = (tutor or "").strip().lower()
```

Остальное тело `__init__` не трогать.

- [ ] **Step 2: Добавить публикацию и override llm_node**

В `agent/agent.py` внутрь `class TutorAgent`, сразу после метода `_do_post` (он кончается на строке ~1075, перед первым `@function_tool()`), вставить:

```python
    async def _publish_mood(self, mood: str, intensity: int) -> None:
        """Отправить эмоцию в браузер (топик "mood"). Best-effort.

        Падение публикации не должно ронять реплику: цвет — украшение, голос —
        продукт. Поэтому исключение только логируется.
        """
        if self._room is None:
            return
        try:
            await self._room.local_participant.publish_data(
                json.dumps({"mood": mood, "intensity": intensity}),
                reliable=True,
                topic="mood",
            )
        except Exception:
            logger.exception("publish mood failed")

    async def llm_node(self, chat_ctx, tools, model_settings):
        """Снять mood-тег с потока ответа до того, как он уйдёт в TTS.

        Именно llm_node, а не tts_node: этот хук стоит выше И озвучки, И
        субтитров, поэтому тег вырезается один раз и не всплывает ни в голосе,
        ни в тексте на экране.
        """
        allowed = TUTOR_MOODS.get(self._tutor)
        if not allowed:
            # Тьютору эмоции не выданы — не трогаем поток вообще.
            async for chunk in Agent.default.llm_node(self, chat_ctx, tools, model_settings):
                yield chunk
            return

        stripper = _MoodStripper(allowed)
        published = False
        async for chunk in Agent.default.llm_node(self, chat_ctx, tools, model_settings):
            if isinstance(chunk, str):
                out = stripper.feed(chunk)
                if out:
                    yield out
            else:
                delta = getattr(chunk, "delta", None)
                content = getattr(delta, "content", None) if delta is not None else None
                if content:
                    delta.content = stripper.feed(content)
                    # Чанк опустел (текст ушёл в буфер) и не несёт вызова
                    # инструмента — придержать его, иначе вниз уйдёт пустышка.
                    if not delta.content and not delta.tool_calls:
                        chunk = None
                if chunk is not None:
                    yield chunk
            # Эмоцию публикуем СРАЗУ, как только тег разобран, а не в конце
            # реплики: иначе цвет догонял бы голос с задержкой во всю фразу.
            if stripper.mood and not published:
                published = True
                task = asyncio.create_task(
                    self._publish_mood(stripper.mood, stripper.intensity)
                )
                self._bg_tasks.add(task)
                task.add_done_callback(self._bg_tasks.discard)

        # Короткая реплика без тега целиком лежит в буфере — отдать её.
        tail = stripper.flush()
        if tail:
            yield tail
```

- [ ] **Step 3: Вклеить блок в промпт**

В `agent/agent.py` в `build_instructions` (строка ~1976) после строки с `persona_g` добавить `build_mood_block`:

```python
        + (f"{persona_g}\n" if persona_g else "")
        + build_mood_block(p.tutor)
        + f"{lang_g}\n"
```

Только в `build_instructions`. В `build_placement_instructions` блок НЕ добавляется: у теста уровня в промпте стоит прямой запрет «no markers» и жёсткий счётчик реплик — тег там противоречил бы собственным правилам режима. `build_debate_instructions` тоже пропускаем: режим сделан нарочито лёгким.

- [ ] **Step 4: Передать tutor в конструктор**

В `agent/agent.py` строка ~3177:

```python
    agent = TutorAgent(
        instructions=instructions,
        device_id=profile.device_id,
        api_url=api_url,
        room=ctx.room,
        scenario_id=scenario_data["id"] if is_scenario else "",
        tutor=profile.tutor,
    )
```

- [ ] **Step 5: Проверить, что модуль грузится и ассерты живы**

```bash
cd agent && ./venv/Scripts/python.exe -c "import agent; print('agent.py импортируется')" && ./venv/Scripts/python.exe test_mood_tag.py
```

Ожидается: `agent.py импортируется`, затем `mood-парсер: все ассерты прошли`

- [ ] **Step 6: Коммит**

```bash
git add agent/agent.py && git commit -m "feat(voice): агент публикует эмоцию тьютора в топик mood"
```

---

### Task 3: Приём эмоции в браузере

**Files:**
- Modify: `src/screens/TutorVoiceChatPage.jsx` — рядом с `useDataChannel('lesson', …)` (строка 259) и на карточке (строка 365)

**Interfaces:**
- Consumes: сообщение топика `mood` вида `{"mood": "anger", "intensity": 3}` из Task 2.
- Produces: классы на `.t-voice__card` — `is-mood-<имя>` и `is-mood-<сила>`. Это контракт для Task 4.

- [ ] **Step 1: Добавить словарь и подписку**

В `src/screens/TutorVoiceChatPage.jsx` после функции `fmtClock` (строка 244) добавить:

```javascript
// Эмоции тьютора, приходящие от агента (топик "mood"). Словарь ЗАКРЫТЫЙ и имя
// из сети в CSS не подставляется: иначе вывод модели стал бы вектором
// CSS-инъекции. Незнакомое имя молча игнорируется.
const MOOD_CLASS = {
  anger: 'is-mood-anger',
  disgust: 'is-mood-disgust',
  joy: 'is-mood-joy',
  sadness: 'is-mood-sadness',
  gloat: 'is-mood-gloat',
}
```

- [ ] **Step 2: Подписаться на топик**

В `src/screens/TutorVoiceChatPage.jsx` сразу после блока `useDataChannel('lesson', …)` (кончается на строке 266) добавить:

```javascript
  // Эмоция тьютора. Держится до следующего тега — пока ученик отвечает,
  // настроение остаётся тем же, и рамка не мигает между репликами.
  const [mood, setMood] = useState(null)
  useDataChannel('mood', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload))
      const cls = MOOD_CLASS[data?.mood]
      const level = Number(data?.intensity)
      if (cls && level >= 1 && level <= 3) setMood({ cls, level })
    } catch {
      /* ignore malformed payloads */
    }
  })
```

- [ ] **Step 3: Повесить классы на карточку**

В `src/screens/TutorVoiceChatPage.jsx` заменить строку 365:

```javascript
    <div className="t-voice__card">
```

на:

```javascript
    <div
      className={
        't-voice__card' + (mood ? ` ${mood.cls} is-mood-${mood.level}` : '')
      }
    >
```

Карточку вердикта (строка ~336, `t-voice__card t-verdict`) НЕ трогать: свечение живёт только в живом разговоре.

- [ ] **Step 4: Проверить сборку и линт**

```bash
npm run build && npm run lint
```

Ожидается: сборка без ошибок, линт без предупреждений в изменённом файле.

- [ ] **Step 5: Коммит**

```bash
git add src/screens/TutorVoiceChatPage.jsx && git commit -m "feat(tutor): приём эмоции тьютора в экране разговора"
```

---

### Task 4: Стили — палитра, повадки, шкала силы

**Files:**
- Modify: `src/tutor.css` — после блока `.t-voice__card` (кончается на строке ~858) и reduced-motion блок орба (строка ~1012)

**Interfaces:**
- Consumes: классы `is-mood-<имя>` и `is-mood-<1|2|3>` из Task 3.
- Produces: ничего для следующих задач.

- [ ] **Step 1: Добавить палитру и шкалу**

В `src/tutor.css` сразу после закрывающей скобки правила `.t-voice__card` вставить:

```css
/* ── Эмоции тьютора: свечение по внутренним границам карточки ──────────────
   box-shadow ставится на САМУ карточку, а не на ::after. Фон и тень элемента
   красятся ПОД всеми его детьми, поэтому свечение не замажет орб; у ::after
   порядок обратный и пришлось бы городить z-index всем детям.

   Цвета взяты глубже, чем нужный итог: на белом фоне при альфе 0.16-0.40 цвет
   вымывается в пастель, и системные яркие оттенки (жёлтый особенно) просто
   исчезают. Плюс они подобраны в одной хроме с брендовым #9047ff — иначе
   жёлтый читается как warning-плашка, а зелёный как «успех». */
.t-voice__card {
  --mood-rgb: 0 0 0;
  --mood-alpha: 0;
  --mood-blur: 0px;
  transition: box-shadow 600ms ease;
}
.t-voice__card.is-mood-anger {
  --mood-rgb: 224 27 60;
} /* глубокий кармин с синим подтоном */
.t-voice__card.is-mood-disgust {
  --mood-rgb: 109 155 31;
} /* болотно-оливковый, не «зелёный успеха» */
.t-voice__card.is-mood-joy {
  --mood-rgb: 255 196 0;
} /* золото — выживает на белом */
.t-voice__card.is-mood-sadness {
  --mood-rgb: 31 75 184;
} /* глубокий индиго, не «инфо-синий» */
.t-voice__card.is-mood-gloat {
  --mood-rgb: 255 106 0;
} /* жжёный апельсин — разводит с жёлтым */

/* Сила = насколько близко свечение подходит к орбу. От края карточки до края
   орба по вертикали ~150px (min-height 520 минус орб 220, пополам). Максимум
   альфы 0.40, а не выше: на белом глубокий кармин начинает спорить с орбом за
   внимание, а орб здесь главный. */
.t-voice__card.is-mood-1 {
  --mood-blur: 56px;
  --mood-alpha: 0.16;
}
.t-voice__card.is-mood-2 {
  --mood-blur: 104px;
  --mood-alpha: 0.26;
}
.t-voice__card.is-mood-3 {
  --mood-blur: 168px;
  --mood-alpha: 0.4;
}
```

- [ ] **Step 2: Добавить повадки**

Дальше в `src/tutor.css`, следом за предыдущим блоком:

```css
/* Повадка эмоции — не украшение, а второй канал информации. Пять эмоций,
   различимых только оттенком, боком зрения сливаются (ученик смотрит на орб и
   слушает), а красный с зелёным — самая частая пара путаницы при дальтонизме.
   Поэтому у каждой эмоции своя геометрия: она читается и без различения цвета.

   Повадка СТАРШЕ шкалы силы: у отвращения зазор до орба не закрывается ни на
   какой силе, у грусти верх остаётся пустым — это их смысл, а не недоработка. */

/* Злость жмёт со всех сторон: тугая кромка + частый мелкий пульс.

   У всех трёх анимаций ниже НЕТ кадров 0%/100% — и это намеренно: когда кадр
   не объявлен, браузер берёт значение из вычисленного стиля самого элемента
   (implicit keyframes, CSS Animations Level 1). Так базовое правило остаётся
   единственным местом, где записана геометрия эмоции, и правка не может
   разъехаться с копией внутри keyframes. */
.t-voice__card.is-mood-anger {
  box-shadow: inset 0 0 var(--mood-blur) rgb(var(--mood-rgb) / var(--mood-alpha));
  animation: t-mood-press 1.6s ease-in-out infinite;
}
@keyframes t-mood-press {
  50% {
    box-shadow: inset 0 0 calc(var(--mood-blur) * 0.78)
      rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 1.25));
  }
}

/* Отвращение отшатывается: свечение жмётся к внешнему краю и держит зазор до
   орба. Отрицательный spread поджимает тень к границе. */
.t-voice__card.is-mood-disgust {
  box-shadow: inset 0 0 calc(var(--mood-blur) * 0.6) calc(var(--mood-blur) * -0.28)
    rgb(var(--mood-rgb) / var(--mood-alpha));
}

/* Радость: широко, ровно, мягко, медленный вдох-выдох. */
.t-voice__card.is-mood-joy {
  box-shadow: inset 0 0 var(--mood-blur) rgb(var(--mood-rgb) / var(--mood-alpha));
  animation: t-mood-breathe 4.2s ease-in-out infinite;
}
@keyframes t-mood-breathe {
  50% {
    box-shadow: inset 0 0 calc(var(--mood-blur) * 1.15)
      rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 0.8));
  }
}

/* Грусть оседает книзу: снизу до гало орба, сверху почти пусто. Пульса нет. */
.t-voice__card.is-mood-sadness {
  box-shadow:
    inset 0 calc(var(--mood-blur) * -0.5) var(--mood-blur)
      calc(var(--mood-blur) * -0.2) rgb(var(--mood-rgb) / var(--mood-alpha)),
    inset 0 calc(var(--mood-blur) * 0.3) calc(var(--mood-blur) * 0.5)
      calc(var(--mood-blur) * -0.35)
      rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 0.35));
}

/* Злорадство ухмыляется вбок: справа сильно, слева заметно слабее. Сторона
   выбрана по направлению чтения, а не «на выбор реализации». */
.t-voice__card.is-mood-gloat {
  box-shadow:
    inset calc(var(--mood-blur) * -0.45) 0 var(--mood-blur)
      calc(var(--mood-blur) * -0.15) rgb(var(--mood-rgb) / var(--mood-alpha)),
    inset calc(var(--mood-blur) * 0.3) 0 calc(var(--mood-blur) * 0.6)
      calc(var(--mood-blur) * -0.3)
      rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 0.4));
  animation: t-mood-drift 5.5s ease-in-out infinite;
}
@keyframes t-mood-drift {
  50% {
    box-shadow:
      inset calc(var(--mood-blur) * -0.55) 0 calc(var(--mood-blur) * 1.1)
        calc(var(--mood-blur) * -0.1)
        rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 1.15)),
      inset calc(var(--mood-blur) * 0.2) 0 calc(var(--mood-blur) * 0.6)
        calc(var(--mood-blur) * -0.34)
        rgb(var(--mood-rgb) / calc(var(--mood-alpha) * 0.3));
  }
}
```

- [ ] **Step 3: Расширить reduced-motion**

В `src/tutor.css` найти существующий блок (строка ~1012):

```css
@media (prefers-reduced-motion: reduce) {
  .t-voice__orb,
  .t-voice__orb.is-live {
    animation: none;
  }
}
```

и заменить на:

```css
@media (prefers-reduced-motion: reduce) {
  .t-voice__orb,
  .t-voice__orb.is-live {
    animation: none;
  }
  /* Пульс и дрейф эмоции гаснут, оттенок и охват остаются: информация в этом
     режиме не теряется, уходит только движение. */
  .t-voice__card.is-mood-anger,
  .t-voice__card.is-mood-joy,
  .t-voice__card.is-mood-gloat {
    animation: none;
  }
  .t-voice__card {
    transition: none;
  }
}
```

- [ ] **Step 4: Проверить сборку и линт**

```bash
npm run build && npm run lint
```

Ожидается: сборка без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add src/tutor.css && git commit -m "feat(tutor): цвет и повадка эмоции на рамке разговора"
```

---

### Task 5: Живая проверка

**Files:** правок нет — только прогон.

**Interfaces:**
- Consumes: всё из Task 1–4.
- Produces: ничего.

- [ ] **Step 1: Проверить, что в .env.local нет BOM**

Windows-редакторы дописывают BOM при сохранении, и тогда python-dotenv теряет ПЕРВУЮ переменную (`LIVEKIT_URL`) — воркер падает с `ws_url is required`. Это уже ловилось дважды за сессию.

```bash
python3 -c "p='.env.local'; d=open(p,'rb').read(); open(p,'wb').write(d[3:]) if d.startswith(b'\xef\xbb\xbf') else None; print('BOM снят' if d.startswith(b'\xef\xbb\xbf') else 'BOM нет')"
```

- [ ] **Step 2: Поднять агент и сайт**

Агент (в фоне):

```bash
cd agent && ./venv/Scripts/python.exe agent.py dev
```

Дождаться в логе `registered worker`. Сайт — `npm run dev`.

- [ ] **Step 3: Прогнать разговор с Декстером**

Открыть `http://localhost:3000/?screen=tutor-voice-chat`, выбрать Декстера, разрешить микрофон.

Проверить по шагам:
1. Ответить односложно («yes») — Декстер должен разозлиться, рамка краснеет и жмёт с пульсом.
2. Ответить целым верным предложением — рамка уходит в золото, дышит медленно.
3. Слушать голос: тег `[mood:...]` НЕ должен звучать.
4. Смотреть на субтитры: тега там тоже быть не должно.
5. Молчать — цвет держится, не гаснет и не мигает.

- [ ] **Step 4: Проверить reduced-motion**

В DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Пульс и дрейф стоят, цвет и охват на месте.

- [ ] **Step 5: Коммит (если что-то правилось по итогам прогона)**

Если прогон прошёл чисто — коммитить нечего, задача закрыта.

---

## Self-Review

**Покрытие спеки:**

| Требование спеки | Задача |
| --- | --- |
| Таблица `TUTOR_MOODS`, набор на тьютора | Task 1 |
| Инструкция генерится из таблицы | Task 1 (`build_mood_block`) |
| Про мат в инструкции не упоминается | Task 1 (текст блока) |
| `parse_mood_tag` чистой функцией + ассерты | Task 1 |
| Лимит 40 символов, защита от поедания речи | Task 1 (`MOOD_SCAN_LIMIT`) |
| Разрыв тега между чанками | Task 1 (`_MoodStripper`, свой ассерт) |
| Override `llm_node` | Task 2 |
| `publish_data(topic="mood")` | Task 2 |
| Клиент: подписка, состояние | Task 3 |
| Имя из сети не идёт в CSS | Task 3 (`MOOD_CLASS`, закрытый словарь) |
| Свечения нет на карточке вердикта | Task 3 (Step 3, явная оговорка) |
| `box-shadow` на карточке, не на `::after` | Task 4 |
| Палитра из 5 цветов | Task 4 |
| Повадки | Task 4 |
| Повадка старше шкалы | Task 4 (комментарий + геометрия) |
| Шкала силы 56/104/168px, альфа 0.16/0.26/0.40 | Task 4 |
| `transition: box-shadow 600ms` | Task 4 |
| `prefers-reduced-motion` | Task 4 (Step 3) + Task 5 (Step 4) |
| Деградация: тега нет / битый / имя чужое / канал упал | Task 1 (ассерты) + Task 2 (`_publish_mood` в try) + Task 3 (валидация) |
| Эмоция держится до следующего тега | Task 3 (состояние не сбрасывается) |
| `npm run build` / `npm run lint` | Task 3, Task 4 |
| Живой прогон | Task 5 |

Пробелов не найдено.

**Плейсхолдеры:** не найдено. Каждый шаг с кодом содержит код целиком.

**Согласованность имён:** `TUTOR_MOODS`, `parse_mood_tag`, `_MoodStripper.feed/flush/mood/intensity`, `build_mood_block`, `_publish_mood`, топик `"mood"`, поля `{mood, intensity}`, классы `is-mood-<имя>` / `is-mood-<1|2|3>`, переменные `--mood-rgb` / `--mood-alpha` / `--mood-blur` — совпадают между Task 1 → 2 → 3 → 4. Имена эмоций (`anger`, `disgust`, `joy`, `sadness`, `gloat`) одинаковы в питоне, в JS-словаре и в CSS-классах.

**Найдено и исправлено при ревью:** в Task 2 ветка `isinstance(chunk, str)` содержала бессмысленное `chunk.__class__(out) if not isinstance(chunk, str) else out` внутри условия, которое уже гарантирует `str`. Заменено на `yield out`.

**Проверено отдельно:** `FlushSentinel` (третий возможный тип чанка) проходит по ветке `else`, где `getattr(chunk, "delta", None)` вернёт `None` — чанк уходит вниз нетронутым. Это верное поведение: сентинел не текст и обрабатывать его не нужно.

**Проверено отдельно (CSS):** новое правило `.t-voice__card` идёт ПОСЛЕ исходного и задаёт только `transition` и кастомные свойства — исходное правило не задаёт ни `box-shadow`, ни `transition`, поэтому взаимного гашения селекторов нет. Анимации читают `--mood-blur`, который выставляет класс силы; без него значение `0px` и свечения просто нет — безопасный дефолт.

**Известное ограничение (осознанное):** mood-тег добавляется только в `build_instructions` — нормальный режим тьютора и сценарии. Режим теста уровня (`build_placement_instructions`) пропущен намеренно: в его промпте стоит прямой запрет «no markers». Режим дебатов пропущен как нарочито лёгкий. В этих режимах рамка остаётся нейтральной.
