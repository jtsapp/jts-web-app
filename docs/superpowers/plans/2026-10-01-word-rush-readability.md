# Word Rush: читаемость слов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Слова ряда читаются с момента его появления: плашки вариантов в шапке + крупнее таблички на воротах.

**Architecture:** Плашки — HTML в шапке `RunnerGame.jsx` из уже существующего `hud.options`/`hud.lane`, вместе со словом-вопросом в одном контейнере `.ar-run-ask`. Таблички — новая раскладка текста в `runnerScene.js` (`layoutSign`: одна строка крупно, фраза — двумя строками), канва выше.

**Tech Stack:** React 19, three 0.186, глобальный `src/arcade.css`, `src/i18n.jsx`.

Спека: `docs/superpowers/specs/2026-10-01-word-rush-readability-design.md`.

## Global Constraints

- Ширина таблички не больше дорожки (`LANE_W - 0.2`): иначе соседние налезут.
- `overflow-wrap: break-word`, не `anywhere` (сторож `src/textCollapse.test.js`).
- Ключи i18n одинаковы в ru/en/kk (сторож `src/i18n.arcade.test.js`).
- e2e — только `--workers=1` (SwiftShader на процессоре).
- Служебные атрибуты `.ar-run-stage` не меняются.

---

### Task 1: Плашки вариантов в шапке

**Files:**
- Modify: `src/screens/arcade/runner/RunnerGame.jsx` (блок `hud.prompt`)
- Modify: `src/arcade.css` (`.ar-run-prompt` → внутри `.ar-run-ask`, новые `.ar-run-options`)
- Modify: `src/i18n.jsx` (`arcade.run.lane.left|center|right` в ru/en/kk)

**Interfaces:**
- Consumes: `hud.options: string[3] | null`, `hud.lane: 0|1|2`, `status`.

- [ ] **Step 1: Разметка** — заменить блок `{hud.prompt && status !== 'paused' && (…)}` на:

```jsx
          {/* На паузе слово и варианты прячутся: иначе над ответом можно думать сколько угодно. */}
          {hud.prompt && status !== 'paused' && (
            <div className="ar-run-ask">
              <div className="ar-run-prompt" aria-live="polite">
                <small>{t('arcade.run.translate')}</small>
                <b lang={lang === 'kk' ? 'kk' : 'ru'}>{hud.prompt}</b>
              </div>
              {/* Варианты ряда — крупно и сразу: на воротах вдали три таблички
                  стоят в ~20 px друг от друга, и прочесть их можно было только
                  впритык. Порядок — по дорожкам, дорожка бегуна подсвечена. */}
              {hud.options && (
                <ul className="ar-run-options">
                  {hud.options.map((word, i) => (
                    <li
                      key={i}
                      lang="en"
                      className={i === hud.lane ? 'is-here' : ''}
                      aria-label={t(`arcade.run.lane.${LANE_KEYS[i]}`, { word })}
                    >
                      {word}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
```

и рядом с константами файла:

```js
const LANE_KEYS = ['left', 'center', 'right']
```

- [ ] **Step 2: Строки** — после `'arcade.run.translate'` в каждом языке:

```js
    // ru
    'arcade.run.lane.left': 'Слева: {word}',
    'arcade.run.lane.center': 'По центру: {word}',
    'arcade.run.lane.right': 'Справа: {word}',
    // en
    'arcade.run.lane.left': 'Left: {word}',
    'arcade.run.lane.center': 'Centre: {word}',
    'arcade.run.lane.right': 'Right: {word}',
    // kk
    'arcade.run.lane.left': 'Сол жақта: {word}',
    'arcade.run.lane.center': 'Ортада: {word}',
    'arcade.run.lane.right': 'Оң жақта: {word}',
```

- [ ] **Step 3: Стили** — `.ar-run-prompt { position: absolute; top…; transform… }` заменить на контейнер:

```css
/* Вопрос и варианты — одним блоком по центру сверху. */
.ar-run-ask {
  position: absolute; top: 14px; left: 50%;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: min(600px, calc(100% - 200px));
  transform: translateX(-50%);
  pointer-events: none;
}
.ar-run-prompt {
  max-width: 100%;
  padding: 8px 22px 12px;
  border: 1px solid rgba(183, 139, 255, 0.45);
  border-radius: 18px;
  background: rgba(22, 9, 58, 0.78);
  text-align: center;
}
.ar-run-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; margin: 0; padding: 0; list-style: none; }
.ar-run-options li {
  display: grid; place-items: center; min-height: 44px; padding: 6px 10px;
  border: 1px solid rgba(183, 139, 255, 0.35); border-radius: 14px;
  background: rgba(22, 9, 58, 0.78);
  font-size: 18px; font-weight: 800; line-height: 1.2; text-align: center; overflow-wrap: break-word;
  transition: background 0.15s, border-color 0.15s;
}
.ar-run-options li.is-here { border-color: #fff; background: rgba(144, 71, 255, 0.9); }
```

и в `@media (max-width: 560px)` правило `.ar-run-prompt { top: 58px; … }` заменить на:

```css
  .ar-run-ask { top: 58px; width: calc(100% - 24px); }
  .ar-run-prompt { padding: 6px 16px 10px; }
  .ar-run-options li { min-height: 40px; padding: 5px 6px; font-size: 15px; }
```

- [ ] **Step 4: Проверка** — `npx vitest run --exclude '.claude/**' src/i18n.arcade.test.js src/textCollapse.test.js`, `npx eslint src/screens/arcade/runner` → зелёное.

- [ ] **Step 5: Commit** — `feat(arcade): Word Rush — варианты ряда плашками в шапке`.

### Task 2: Крупнее таблички на воротах

**Files:**
- Modify: `src/screens/arcade/runner/runnerScene.js` (`drawSign`, `makeGate`)

- [ ] **Step 1: Раскладка текста** — заменить `drawSign` на:

```js
const SIGN_W = 512
const SIGN_H = 220
const signFont = (px) => `800 ${px}px Manrope, system-ui, sans-serif`

// Кегль таблички: одной строкой, пока буквы крупные; фраза, не влезшая
// крупно, — двумя строками по пробелу ближе к середине; иначе одна строка
// мельче. Ширину таблички растить нельзя — соседние налезут друг на друга.
function layoutSign(ctx, text, maxW) {
  const fits = (lines, px) => {
    ctx.font = signFont(px)
    return lines.every((l) => ctx.measureText(l).width <= maxW)
  }
  for (let px = 128; px >= 76; px -= 4) if (fits([text], px)) return { lines: [text], px }
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index)
  if (spaces.length) {
    const mid = text.length / 2
    const cut = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))
    const lines = [text.slice(0, cut), text.slice(cut + 1)]
    for (let px = 96; px >= 40; px -= 4) if (fits(lines, px)) return { lines, px }
  }
  for (let px = 72; px > 28; px -= 4) if (fits([text], px)) return { lines: [text], px }
  return { lines: [text], px: 28 }
}

function drawSign(canvas, text, tone) {
  const ctx = canvas.getContext('2d')
  const { width: w, height: h } = canvas
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(8, 8, w - 16, h - 16, 34)
  else ctx.rect(8, 8, w - 16, h - 16)
  ctx.fillStyle = 'rgba(20, 8, 52, 0.94)'
  ctx.fill()
  ctx.lineWidth = 9
  ctx.strokeStyle = tone
  ctx.stroke()
  const { lines, px } = layoutSign(ctx, text, w - 56)
  ctx.font = signFont(px)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const step = px * 1.05
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + 4 + (i - (lines.length - 1) / 2) * step))
}
```

- [ ] **Step 2: Табличка выше** — в `makeGate`: канва `SIGN_W × SIGN_H`, плоскость `new THREE.PlaneGeometry(LANE_W - 0.2, (LANE_W - 0.2) * (SIGN_H / SIGN_W))`, `sign.position.y = GATE_H + 0.25 + ((LANE_W - 0.2) * (SIGN_H / SIGN_W)) / 2`.

- [ ] **Step 3: Проверка** — `npx eslint src/screens/arcade/runner`; живой прогон (desktop 1280, mobile 375): плашки с появления ряда, подсветка за бегуном, таблички крупнее, фраза C1 — двумя строками; `tests/arcade-runner.spec.js --workers=1` на одном проекте; `preview_stop` сразу после.

- [ ] **Step 4: Commit** — `feat(arcade): Word Rush — таблички на воротах крупнее, фразы в две строки`.
