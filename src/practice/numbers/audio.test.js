// Записи «Чисел» (public/practice/numbers/audio): у каждой фразы, которую игра
// может произнести, — своя запись, и в папке нет сирот. Красный тест здесь —
// правка прототипа без перезаписи: node scripts/make-numbers-audio.js. Без
// записи фраза всё равно прозвучит (синтез тем же голосом), но уже с задержкой
// и в зависимости от лимита Soniox.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import audio from '../../../scripts/make-numbers-audio.js'

const DIR = path.join(process.cwd(), 'public/practice/numbers/audio')
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'))

describe('записи «Чисел»', () => {
  it('у каждой фразы игры есть запись, и файл на диске', async () => {
    const items = await audio.plan()
    const missing = items.filter((it) => index[it.text] !== it.file || !fs.existsSync(path.join(DIR, it.file + '.mp3')))
    expect(missing.map((it) => it.text)).toEqual([])
  })

  it('в списке нет чужих фраз, в папке — файлов-сирот', async () => {
    const items = await audio.plan()
    const texts = new Set(items.map((it) => it.text))
    const files = new Set(items.map((it) => it.file + '.mp3'))
    expect(Object.keys(index).filter((t) => !texts.has(t))).toEqual([])
    expect(fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3') && !files.has(f))).toEqual([])
  })

  it('каждая запись — mp3, а не тело ошибки провайдера', () => {
    const bad = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3') && !audio.looksLikeMp3(fs.readFileSync(path.join(DIR, f))))
    expect(bad).toEqual([])
  })
})
