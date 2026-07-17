// Разрезает public/practice/fairytales.html на модули движка для src/practice/fairytale/.
const fs = require('fs')
const path = require('path')

const ROOT = '/Users/mirasnurlanov/Desktop/jtsapp-workspace/jts-web-app'
const SRC = path.join(ROOT, 'public/practice/fairytales.html')
const OUT = path.join(ROOT, 'src/practice/fairytale')

const lines = fs.readFileSync(SRC, 'utf8').split('\n')
// границы (1-индексация): <style> 8..631, шелл-стиль 633..796, <body> 798,
// разметка 799..931, <script> 932, JS 933..8535, </script> 8536
const slice = (a, b) => lines.slice(a - 1, b).join('\n')

const cssBase = slice(9, 630)
const cssShell = slice(634, 795)
const markup = slice(799, 931)
const js = slice(933, 8535)

// здравые проверки, что границы не поехали
if (!/^:root\{/.test(cssBase.trim())) throw new Error('cssBase boundary')
if (!/JUST TO STUDY/.test(cssShell)) throw new Error('cssShell boundary')
if (!/^<div id="app">/.test(markup.trim()) || !/<\/div>\s*$/.test(markup)) throw new Error('markup boundary')
if (!/^"use strict";/.test(js.trim()) || !/vwInit\(\)/.test(js)) throw new Error('js boundary')

fs.mkdirSync(OUT, { recursive: true })

const banner = (what) => `// АВТО-ИЗВЛЕЧЕНО из public/practice/fairytales.html (${what}).
// Источник правды — движок «Fairytale's World»; при обновлении HTML перегенерировать
// скриптом extract-fairytale.js (см. описание в src/practice/fairytale/README.md).
`

fs.writeFileSync(
  path.join(OUT, 'styles.js'),
  banner('два <style>-блока из <head>') +
    `export const CSS_BASE = ${JSON.stringify(cssBase)}\n\nexport const CSS_SHELL = ${JSON.stringify(cssShell)}\n`
)

fs.writeFileSync(
  path.join(OUT, 'markup.js'),
  banner('содержимое <body>: #app со всеми экранами') +
    `export const MARKUP = ${JSON.stringify(markup)}\n`
)

fs.writeFileSync(
  path.join(OUT, 'engine.js'),
  banner('скрипт движка, ~7600 строк') +
    `/* eslint-disable */\n// Весь движок обёрнут в фабрику: DOM из markup.js должен быть смонтирован до вызова.\n// Возвращает управляющее API для taleWorld.js (deep-link на сказку, выход в приложение).\nexport function createTaleWorld() {\n` +
    js +
    `\nreturn { TALES, chooseTale, resumeTale, startOverTale, leaveTale, loadFor, show, buildLibrary, buildLibLang, refreshContinue }\n}\n`
)

console.log('OK',
  'cssBase', cssBase.length,
  'cssShell', cssShell.length,
  'markup', markup.length,
  'js', js.length)
