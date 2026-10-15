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
