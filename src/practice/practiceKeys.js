// Единый источник ключей localStorage и имён DOM-событий для разделов практики.
// Держим отдельно, чтобы и модули прогресса, и клиентский синк ссылались на одни
// и те же строки (иначе рассинхрон ключей молча ломает гидратацию).

export const VOCAB_KEY = 'jts_vocab2'
export const GRAMMAR_KEY = 'jts_grammar_done'
export const LISTENING_KEY = 'jts_listening_done'
export const SHADOWING_KEY = 'jts_shadowing_done'
// Открытые уровни статического «Speaking Practice A1–C1» — единица прохождения
// для квоты PRACTICE_SITUATIONS (см. practiceContract.js).
export const SITUATIONS_KEY = 'jts_situations_done'
// Комиксы — не «пройдено», а закладка: { <comicId>: номер страницы }. Читалка
// открывает комикс с неё, карточка каталога показывает «стр. 12 / 214».
export const COMICS_POS_KEY = 'jts_comics_pos'
// Открытые уровни воркбуков A0–B2 — единица для квоты PRACTICE_WORKBOOKS.
export const WORKBOOKS_KEY = 'jts_workbooks_done'
// Прогресс «Письма»: не множество id, а объект {tasks, seen} — семантика replace,
// как у vocab (см. practiceContract.js). Ключ назван *_done для единообразия.
export const WRITING_KEY = 'jts_writing_done'
// Прогресс воркбука: объект {prog, miss, sc} — пройденные экраны, промахи и
// самопроверка. Живёт РЯДОМ с WORKBOOKS_KEY, а не вместо него: на множестве
// открытых уровней висит квота PRACTICE_WORKBOOKS, и менять её единицу учёта
// нельзя. Семантика replace, как у vocab.
export const WORKBOOK_KEY = 'jts_workbook_state'

export const GRAMMAR_PROGRESS_EVENT = 'grammar-progress'
export const LISTENING_PROGRESS_EVENT = 'listening-progress'
export const SHADOWING_PROGRESS_EVENT = 'shadowing-progress'
export const SITUATIONS_PROGRESS_EVENT = 'situations-progress'
export const WORKBOOKS_PROGRESS_EVENT = 'workbooks-progress'
export const WRITING_PROGRESS_EVENT = 'writing-progress'
export const WORKBOOK_PROGRESS_EVENT = 'workbook-progress'
