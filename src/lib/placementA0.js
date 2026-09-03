// Варианты для A0-моста пробного урока — на сервере.
//
// Мост показывает те же два задания движка, что и тест, но вместо ввода даёт
// выбрать слово. Раньше варианты собирал клиент прямо из `item.answer`, и это
// работало ровно до тех пор, пока ответы лежали в публичном банке. Их оттуда
// убрали (bankSplit.js), и клиенту стало неоткуда взять верный вариант: на
// экране появлялись четыре кнопки, из которых одна пустая, и ни одной верной.
//
// Что здесь отдаётся наружу и почему это приемлемо. Ответ не называется — в
// ответе четыре слова в перемешанном порядке, как и на экране. Подсказка всё
// же есть: отвлекающие берутся из фиксированного набора ниже, и если верное
// слово в него не входит, его видно исключением. Это осознанный размен: мост —
// обучающий шаг пробного урока, а оценка идёт через /api/placement/grade, где
// ключей по-прежнему нет. Полный ключ ко всему банку в обмен на подсказку в
// двух заданиях — плохая сделка, поэтому её и не заключаем.

import { seededShuffle } from '../practice/placement/engine.generated.js'
import { rngFor } from '../practice/placement/bankSplit.js'
import { loadFullBank } from './placementScore.js'

/** Отвлекающие: служебные слова уровня A0, из которых собран сам мост. */
export const A0_DISTRACTORS = Object.freeze([
  'is', 'are', 'am', 'do', 'does', 'can', 'have', 'work', 'works', 'went',
])

const norm = (s) => String(s || '').trim().toLowerCase()

/** Сколько вариантов на задании: верный плюс три отвлекающих. */
export const A0_OPTION_COUNT = 4

/**
 * Варианты для перечисленных заданий моста: { id: [четыре слова] }.
 *
 * Задания без ключа или не из моста молча пропускаются — экран пробного урока
 * ветвится по наличию `a0options` и без них покажет обычное поле ввода.
 * Порядок детерминирован сидом от id: обновление страницы не должно
 * перетасовывать кнопки под рукой у ученика.
 */
export function buildA0Options(ids, source = loadFullBank()) {
  const keys = source.keys || {}
  const byId = new Map((source.bank?.items || []).map((it) => [it.id, it]))
  const out = {}

  for (const id of ids || []) {
    const item = byId.get(id)
    if (!item || item.block !== 'a0_bridge') continue

    const answers = keys[id]?.answer || []
    const correct = answers[0]
    if (!correct) continue

    const wrong = A0_DISTRACTORS
      .filter((w) => !answers.some((a) => norm(a) === norm(w)))
      .slice(0, A0_OPTION_COUNT - 1)

    out[id] = seededShuffle([correct, ...wrong], rngFor(id))
  }
  return out
}
