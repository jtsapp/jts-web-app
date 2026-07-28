// Единый источник ключей localStorage и имён DOM-событий для разделов практики.
// Держим отдельно, чтобы и модули прогресса, и клиентский синк ссылались на одни
// и те же строки (иначе рассинхрон ключей молча ломает гидратацию).

export const VOCAB_KEY = 'jts_vocab2'
export const GRAMMAR_KEY = 'jts_grammar_done'
export const LISTENING_KEY = 'jts_listening_done'

export const GRAMMAR_PROGRESS_EVENT = 'grammar-progress'
export const LISTENING_PROGRESS_EVENT = 'listening-progress'
