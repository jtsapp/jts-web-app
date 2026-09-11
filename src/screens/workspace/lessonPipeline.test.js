// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { applyLessonHoists } from './lessonPipeline.js'
import { lessonCardIds } from '../../lib/lessonCardId.js'

/**
 * СОГЛАСИЕ КОНВЕЙЕРОВ — вторая половина согласия адресов.
 *
 * Адрес карточки урока считается не по тому, что лежит в базе, а по дереву
 * ПОСЛЕ конвейера подъёмов. Конвейер существует двумя рукописными копиями —
 * шесть пар файлов, TypeScript в админке и JavaScript здесь, — и разойдись хоть
 * одна стадия, адрес, который админка положила в выдачу, перестанет находиться
 * в кабинете. Ученик увидит «этого задания больше нет» на существующей
 * карточке, и никто не узнает, почему.
 *
 * `lessonCardId.test.js` пиннит ХЭШ-ФУНКЦИЮ, этот файл — ВХОД этой функции.
 * Вместе они закрывают путь целиком: content_json → конвейер → адрес.
 *
 * ТОТ ЖЕ НАБОР ФИКСТУР И ТЕ ЖЕ ОЖИДАЕМЫЕ АДРЕСА лежат в web-admin,
 * lesson-pipeline.spec.ts. Красный тест здесь или там значит, что копии
 * конвейера разъехались — правь обе, а не одну.
 *
 * Фикстуры подобраны так, чтобы запустить каждую стадию и попасть в места, где
 * копии уже расходились: ведущий `<style>` (разный способ разбора html),
 * картинка по ключу из не-vocab блока, vocab без колоды, пустой объект дорожки.
 */
const BASE = 'https://files.example/course/a2/lessons/L01.html'

export const ФИКСТУРЫ = {
  'простой урок': { steps: [{ id: 's1', title: 'Warm-up', blocks: [
    { type: 'info', html: '<p>Hold on to your two answers.</p>' },
    { type: 'practice', title: 'Warm-up', questions: [
      { id: 's1-c0', type: 'choice', prompt: 'Sky?', options: ['blue', 'green'], answer: 'blue' },
    ] },
  ] }] },

  // Ведущий <style>: разбор документом уносит его в <head> и в тело не
  // возвращает, разбор фрагментом — оставляет. Копии расходились ровно здесь.
  'стиль в начале html': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<style>.lead{color:red}</style><p>Read the story.</p>' },
  ] }] },

  'относительная картинка': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<p>Look <img src="images/x.png" alt="x"> here</p>' },
  ] }] },

  'картинка по ключу из vocab': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<p>A <img data-img="balloon" alt="balloon"> B</p>' },
    { type: 'vocab', cards: [{ word: 'balloon', imageUrl: 'img/balloon.png', translationRu: 'шар' }] },
  ] }] },

  // Колода не у vocab-блока: одна копия собирала ключи со всех блоков, другая
  // только с vocab.
  'картинка по ключу из НЕ-vocab блока': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<p>A <img data-img="kite" alt="kite"> B</p>' },
    { type: 'practice', title: 'P', cards: [{ word: 'kite', imageUrl: 'img/kite.png' }], questions: [] },
  ] }] },

  // Недоразобранный урок: vocab без колоды роняло разбор у одной из сторон.
  'vocab без cards': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'vocab', title: 'Слова' },
  ] }] },

  'audio без src': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<p>Listen</p>', audio: {} },
  ] }] },

  'audio с относительным src': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'info', html: '<p>Listen</p>', audio: { src: 'audio/a.mp3' } },
  ] }] },

  'select в info': { steps: [{ id: 'talk', title: 'Meaning', blocks: [
    { type: 'info', title: 'Meaning', html: '<p>Choose.</p><div class="row"><span class="num">1</span> She dominated the talk. <select data-answer="most"><option value="">—</option><option value="rude">She was rude.</option><option value="most">She talked most.</option></select></div>' },
  ] }] },

  'хвостовой шаг Audio': { steps: [
    { id: 's1', title: 'Reading', blocks: [{ type: 'info', html: '<p>Read the text.</p>' }] },
    { id: 's2', title: 'Audio', blocks: [{ type: 'info', html: '<p>Track 3</p>', audio: { src: 'audio/t3.mp3' } }] },
  ] },

  'подзаголовок шага': { steps: [{ id: 's1', title: 'Warm-up', subtitle: 'Warm-up', blocks: [
    { type: 'info', html: '<p>Lead text here.</p>' },
  ] }] },

  'словарная колода': { steps: [{ id: 's1', title: 'A', blocks: [
    { type: 'vocab', cards: [{ word: 'season', pos: 'n', definition: 'a part of the year', translationRu: 'время года', imageUrl: 'img/s.png' }] },
  ] }] },

  'чеклист и говорение': { steps: [{ id: 's2', title: 'You can now', blocks: [
    { type: 'checklist', items: ['I can name the seasons'] },
    { type: 'speaking', taskDescription: 'Tell your teacher', hasRecorder: true },
  ] }] },
}

/**
 * Ожидаемое: на что распадается каждая фикстура после конвейера — шаг, тип
 * блока и его адрес. ТЕ ЖЕ значения обязаны получаться в админке.
 */
export const ОЖИДАЕМОЕ = {
  "простой урок": ["s1/practice:cbd0839e9"],  // единственный info ушёл лидом шага, осталась практика
  "стиль в начале html": [],  // стиль в тело не вернулся, блок ушёл лидом шага
  "относительная картинка": [],  // ушёл лидом шага
  "картинка по ключу из vocab": ["s1/vocab:cae0defc3"],  // info ушёл лидом, колода осталась
  "картинка по ключу из НЕ-vocab блока": ["s1/practice:c9a78229c"],  // info ушёл лидом
  "vocab без cards": ["s1/vocab:c797af8aa"],  // разбор не упал
  "audio без src": [],  // ушёл лидом шага
  "audio с относительным src": [],  // ушёл лидом шага
  "select в info": ["talk/info:cda9178b3", "talk/practice:ca6b5ff31"],  // select поднялся в отдельную практику
  "хвостовой шаг Audio": [],  // хвостовой шаг склеился с первым, тот ушёл лидом
  "подзаголовок шага": ["s1/info:ccbd9aa9e"],  // подзаголовок совпал с заголовком — блок остался карточкой
  "словарная колода": ["s1/vocab:c5f48bb2b"],
  "чеклист и говорение": ["s2/checklist:c2e34941a", "s2/speaking:ce8320861"],
}

/** Шаг, тип блока и адрес — так видно не только хэш, но и что стало со структурой. */
export function разбор(content) {
  const lesson = applyLessonHoists(structuredClone(content), BASE)
  const ids = lessonCardIds(lesson)
  return (lesson?.steps ?? []).flatMap((s) => (s.blocks ?? []).map((b) => `${s.id}/${b.type}:${ids.get(b)}`))
}

describe('Согласие копий: конвейер подъёмов', () => {
  for (const имя of Object.keys(ФИКСТУРЫ)) {
    it(`${имя} — те же карточки и адреса, что в админке`, () => {
      expect(разбор(ФИКСТУРЫ[имя])).toEqual(ОЖИДАЕМОЕ[имя])
    })
  }
})

describe('Конвейер сам по себе', () => {
  it('битый блок не роняет разбор урока', () => {
    // Один плохой элемент не должен стоить ученику всего урока.
    const урок = { steps: [{ id: 's1', blocks: [null, { type: 'info', html: '<p>Жив</p>' }] }] }
    expect(() => applyLessonHoists(урок, BASE)).not.toThrow()
  })

  it('урок без шагов проходит насквозь', () => {
    expect(applyLessonHoists({ steps: [] }, BASE).steps).toEqual([])
  })
})
