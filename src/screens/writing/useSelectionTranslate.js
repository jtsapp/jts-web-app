// ЗАГЛУШКА (заменяется в волне 2 реализации): тултип перевода выделения.
// Контракт: useSelectionTranslate({ levelData|null, token, enabled }) — вешает
// mouseup/touchend на document, показывает ru+kk (глоссарий уровня →
// localStorage-кэш → POST /api/writing/translate → пословный разбор),
// игнорирует выделение внутри .wr-editor.
export default function useSelectionTranslate() {}
