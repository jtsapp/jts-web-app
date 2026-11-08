// Документ для методиста: эталонный набор «Луна — учитель английского» (scripts/assistant-eval/teacher-set.js) одной
// таблицей на тему — вопрос, обязательное, желательное, критерий и пустая колонка для отметки методиста.
//
//   node scripts/assistant-eval/review-doc.js   # пишет docs/assistant-eval/luna-teacher-set.md
//
// Источник правды — teacher-set.js: правки методиста переносятся туда, документ пересобирается (sets.test.js
// краснеет, если документ отстал от набора).

import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEACHER_SET, TOPICS } from './teacher-set.js'

const LANG = { ru: 'ru', kk: 'kk', en: 'en' }
const cell = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ')

/** Текст документа — чистая функция, её же сверяет тест. */
export function reviewDoc(set = TEACHER_SET) {
  const out = [
    '# Эталонный набор «Луна — учитель английского» (ТЗ v2.0, 8.3а)',
    '',
    'Сгенерировано из `scripts/assistant-eval/teacher-set.js` (`node scripts/assistant-eval/review-doc.js`) — правки вносить туда.',
    '',
    `Вопросов: ${set.length}. Ключевые пункты и критерии написала разработка: ответов преподавателей школы у нас нет, поэтому каждая строка — **на проверку методисту**. В колонке «Методист» — ✅ верно, ✏️ поправить (что именно), ❌ убрать.`,
    '',
    'Как читается строка: «Обязательно» — без этого ответ Луны неверный; «Желательно» — плюс, без него ответ не провален; «Зачёт» — что проверяет судья (Sonnet 5.5). Шаблон подачи (правило → форма → примеры → частая ошибка → проверочный вопрос; перевод с альтернативами; проверка текста «было → стало → почему») судья оценивает отдельно и в «верно» не включает.',
    '',
    'Прогон: `node scripts/assistant-eval/run.js --set teacher --n 3` (см. шапку `run.js`).',
  ]
  for (const [topic, title] of Object.entries(TOPICS)) {
    const qs = set.filter((q) => q.topic === topic)
    if (!qs.length) continue
    out.push('', `## ${title} (${qs.length})`, '', '| id | Язык | Уровень | Вопрос | Обязательно | Желательно | Зачёт | Методист |', '|---|---|---|---|---|---|---|---|')
    for (const q of qs) {
      out.push(`| ${q.id} | ${LANG[q.lang]} | ${q.level} | ${cell(q.q)} | ${q.keys.map(cell).join('<br>')} | ${(q.plus || []).map(cell).join('<br>')} | ${cell(q.pass)} | |`)
    }
  }
  return out.join('\n') + '\n'
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/assistant-eval/luna-teacher-set.md')
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, reviewDoc())
  console.log(`записано: ${file}`)
}
