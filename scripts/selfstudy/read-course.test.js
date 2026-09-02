import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { readSelfStudyCourse } = require('./read-course.js')

// Мини-курс в формате нового self-study файла: урок объявлен IIFE, задания
// ссылаются на общие константы, движок на старте лезет в DOM. Всё это должно
// пережить чтение — именно ради этого файл выполняется в vm с заглушкой.
function fixture({ audioTag = false } = {}) {
  const bank = audioTag
    ? ''
    : `const BLOBS = {"h1": "data:audio/mpeg;base64,QUJD"};\nconst BANKS = {"1": {"c1": "h1"}};\nvar BANK = {}; for(var n in BANKS){ BANK[n] = {}; for(var k in BANKS[n]) BANK[n][k] = BLOBS[BANKS[n][k]]; }\n`
  const tag = audioTag ? '<script type="text/plain" id="a_c1">QUJD</script>' : ''
  return `<!DOCTYPE html><html><head><title>Just To Study · A0 · English course</title></head><body>
${tag}
<script>
${bank}
const INS = { word: {en: "Choose the word.", ru: "Выберите слово."} };
var PER_ITEM = {cards:"card", mcq:"mcq"};
var LESSONS = {};
LESSONS[1] = (function(){
  const LESSON_NO = 1;
  const GROUPS = [
    {t:"cards", stage:"vocab", items:[{w:"like", ru:"нравится", kk:"ұнайды"}]},
    {t:"mcq", stage:"prac", ins:INS.word, items:[{opts:["like","tea"], a:0}]}
  ];
  return {no: LESSON_NO, title: "Coffee", groups: GROUPS${audioTag ? '' : ', bank: BANK[LESSON_NO]'}};
})();
LESSONS[101] = (function(){
  const GROUPS = [{t:"mcq", stage:"prac", ins:INS.word, items:[{opts:["a","b"], a:1}]}];
  return {no: 101, title: "Unit test 1", groups: GROUPS};
})();
const MENU = {"units": [{"n": 1, "t": {"en": "Unit one"}, "from": 1, "to": 1, "test": 101}],
              "lessons": [{"n": 1, "title": "Coffee", "blurb": "первый урок"}]};
/* движок: без заглушки DOM чтение падало бы прямо здесь */
var stage = document.querySelector("#stage");
stage.innerHTML = "<b>" + document.getElementById("nope") + "</b>";
document.addEventListener("click", function(){});
</script></body></html>`
}

function withFile(html, fn) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-course-')), 'course.html')
  fs.writeFileSync(file, html)
  try {
    return fn(file)
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true })
  }
}

describe('selfstudy/read-course', () => {
  it('читает уровень, уроки и задания через vm', () => {
    const course = withFile(fixture(), readSelfStudyCourse)
    expect(course.level).toBe('a0')
    expect(course.lessons).toHaveLength(1)
    expect(course.lessons[0]).toMatchObject({ no: 1, unit: 1, title: 'Coffee', blurb: 'первый урок' })
    // Задание собрано вместе с константой, на которую ссылается (INS.word).
    expect(course.lessons[0].groups[1].ins.ru).toBe('Выберите слово.')
    expect(course.perItem).toMatchObject({ mcq: 'mcq' })
  })

  // Тест юнита объявлен таким же уроком, только его номер стоит в MENU как
  // test: без разделения он попал бы в тропу обычным уроком.
  it('отделяет тесты юнитов от уроков', () => {
    const course = withFile(fixture(), readSelfStudyCourse)
    expect(course.tests.map((t) => t.key)).toEqual(['101'])
    expect(course.tests[0].unit).toBe(1)
  })

  it('собирает аудио из BLOBS/BANKS ключом «урок:клип»', () => {
    const course = withFile(fixture(), readSelfStudyCourse)
    expect(course.audio['1:c1']).toBe('QUJD')
  })

  it('собирает аудио из тегов text/plain (A1)', () => {
    const course = withFile(fixture({ audioTag: true }), readSelfStudyCourse)
    expect(course.audio.c1).toBe('QUJD')
  })

  it('файл без LESSONS падает, а не отдаёт пустой курс', () => {
    const html = '<html><head><title>Just To Study · A0 · English course</title></head><body><script>var x = 1;</script></body></html>'
    expect(() => withFile(html, readSelfStudyCourse)).toThrow(/LESSONS/)
  })

  it('файл без уровня в заголовке падает', () => {
    const html = '<html><head><title>Course</title></head><body><script>var LESSONS = {};</script></body></html>'
    expect(() => withFile(html, readSelfStudyCourse)).toThrow(/уровень/)
  })
})
