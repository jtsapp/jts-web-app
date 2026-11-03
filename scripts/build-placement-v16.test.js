import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { applyPatches, injectPrelude, injectKkFont, extractMedia, cloudfrontMap, rewriteUrls, PATCHES } = require('./build-placement-v16.js')

const SRC = path.join(__dirname, '..', 'data', 'jtsplacement-v16.html')

describe('build-placement-v16', () => {
  it('каждый патч находит в исходнике ровно одно место', () => {
    const html = fs.readFileSync(SRC, 'utf8')
    for (const [from] of PATCHES) expect(html.split(from).length - 1).toBe(1)
    expect(() => applyPatches(html)).not.toThrow()
  })

  it('отзыв о говорении: тест хранит его с уровнем и показывает в итоге через крючок хоста', () => {
    const out = applyPatches(fs.readFileSync(SRC, 'utf8'))
    expect(out).toContain("subscores:raw.subscores||null,feedback:raw.feedback||null}")
    expect(out).toMatch(/\$\{evidence\(p,r\)\}\$\{[^}]*JTSHostSpeakingFeedback[^}]*\}\$\{goalsHTML\(g\)\}/)
  })

  // Жалоба с прода 03.11.2026: «прошёл тест, а он просит пройти заново». Экран итога был единственным местом, где
  // итог уходил приложению, а после пропуска говорения тест к нему сам не вёл.
  it('три раздела пройдены — тест сам сообщает хосту, симулятор автора не считается', () => {
    const out = applyPatches(fs.readFileSync(SRC, 'utf8'))
    expect(out).toContain("function jtsHostReportCore(){if(SELFTEST_ACTIVE||!allCoreDone()||app.completedNotified)return;")
    expect(out).toContain('window.JTSHostCoreDone')
    expect(out).toContain("app.completedByUser=true;app.active='S';app.screen='speaking';jtsHostReportCore()}}")
  })

  it('пропуск говорения после трёх разделов сразу открывает итог, а до них — нет', () => {
    const out = applyPatches(fs.readFileSync(SRC, 'utf8'))
    expect(out).toContain("app.flags.push('speaking_connection_error');if(app.screen==='speaking'&&allCoreDone())app.screen='result';save();render()")
  })

  it('собранная страница содержит правки сохранения итога', () => {
    const built = fs.readFileSync(path.join(__dirname, '..', 'public', 'placement', 'v16', 'index.html'), 'utf8')
    expect(built).toContain('function jtsHostReportCore(')
    expect(built).toContain("if(app.screen==='speaking'&&allCoreDone())app.screen='result';save();render()")
  })

  // Скин макета (21.10.2026): патчи вставляют куски шаблонов автора — опечатка в кавычках или ${} сломала бы весь тест
  // у ученика белым экраном, поэтому скрипты страницы после патчей обязаны хотя бы компилироваться.
  it('скрипты страницы после патчей скина компилируются', () => {
    const vm = require('node:vm')
    const out = applyPatches(fs.readFileSync(SRC, 'utf8'))
    const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(scripts.length).toBeGreaterThan(0)
    for (const code of scripts) expect(() => new vm.Script(code)).not.toThrow()
  })

  it('скин: панель «Твои цели» рядом с анкетой, кнопки вопроса под карточкой, «назад» в шапке', () => {
    const out = applyPatches(fs.readFileSync(SRC, 'utf8'))
    expect(out.indexOf('function jtsGoalsPanel(')).toBeLessThan(out.indexOf('function renderGoals('))
    expect(out).toContain('</div>${jtsGoalsPanel()}</section>')
    expect(out).toContain('</article><div class="question-buttons">')
    expect(out).toContain('data-jts-back')
    expect(out).toContain('window.JTSHostExit')
  })

  it('skin.css подключается после стилей автора, но до правила казахского шрифта', () => {
    const out = injectKkFont('<head><style>.welcome{}</style></head>')
    expect(out.indexOf('href="skin.css"')).toBeGreaterThan(out.indexOf('.welcome{}'))
    expect(out.indexOf('href="skin.css"')).toBeLessThan(out.indexOf('jts-host-kk-font'))
  })

  it('патч, который не нашёлся, роняет сборку, а не уезжает молча', () => {
    expect(() => applyPatches('nothing here', [['let a=1;', 'let a=2;', 'x']])).toThrow(/найдено 0/)
    expect(() => applyPatches('a;a;', [['a;', 'b;', 'x']])).toThrow(/найдено 2/)
  })

  it('прелюдия встаёт перед первым скриптом страницы', () => {
    const out = injectPrelude('<head><style></style><script>let x</script></head>')
    expect(out.indexOf('JTS_HOST')).toBeLessThan(out.indexOf('let x'))
  })

  it('казахский — на Inter: правило по lang="kk" и сам шрифт в <head>, после стилей автора', () => {
    const out = injectKkFont('<head><style>body{font-family:"JTS Manrope"}</style></head><body></body>')
    expect(out).toContain('html[lang="kk"] *{font-family:"Inter"')
    expect(out).toMatch(/font-family:"Inter"[^}]*!important\}/)
    expect(out).toContain('fonts.googleapis.com/css2?family=Inter')
    expect(out.indexOf('jts-host-kk-font')).toBeGreaterThan(out.indexOf('JTS Manrope'))
    expect(out.indexOf('jts-host-kk-font')).toBeLessThan(out.indexOf('</head>'))
  })

  it('крупный base64 уходит файлом, мелкий остаётся внутри', () => {
    const big = Buffer.alloc(4096, 7).toString('base64')
    const small = Buffer.from('<svg/>').toString('base64')
    const { html, files } = extractMedia(`a="data:image/png;base64,${big}" b="data:image/svg+xml;base64,${small}"`)
    expect(files).toHaveLength(1)
    expect(files[0].name).toMatch(/^[0-9a-f]{16}\.png$/)
    expect(html).toContain(`media/${files[0].name}`)
    expect(html).toContain(small)
  })

  it('записи CloudFront переезжают в audio/ по имени файла', () => {
    const url = 'https://d8j0ntlcm91z4.cloudfront.net/user_x/hf_1.mp3'
    const map = cloudfrontMap(`{"audio_url":"${url}"},{"audio_url":"${url}"}`)
    expect([...map.values()]).toEqual(['audio/hf_1.mp3'])
    expect(rewriteUrls(`"${url}"`, map)).toBe('"audio/hf_1.mp3"')
  })
})
