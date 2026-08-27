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
// Открытые уровни воркбуков A0–B2 — единица для квоты PRACTICE_WORKBOOKS.
export const WORKBOOKS_KEY = 'jts_workbooks_done'

export const GRAMMAR_PROGRESS_EVENT = 'grammar-progress'
export const LISTENING_PROGRESS_EVENT = 'listening-progress'
export const SHADOWING_PROGRESS_EVENT = 'shadowing-progress'
export const SITUATIONS_PROGRESS_EVENT = 'situations-progress'
export const WORKBOOKS_PROGRESS_EVENT = 'workbooks-progress'
