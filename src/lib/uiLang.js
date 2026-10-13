// Язык интерфейса — атрибутом на <html>, чтобы CSS мог переключать то, что
// зависит от языка целиком, а не по экранам: казахский интерфейс идёт на Inter
// (src/kk-font.css). Отдельно от I18nProvider (src/i18n.jsx): layout.jsx
// серверный, и строку загрузочного скрипта он должен импортировать из простого
// модуля, как THEME_BOOT из lib/theme.js.
//
// Не `lang` и не `data-lang`: `lang` на <html> переписывает движок «Сказок»
// своим языком и не возвращает (после сказки html остался бы «kk» у
// русского интерфейса), а `[data-lang]` уже значат пункты меню языка и кнопки
// SpeakSpin.
export const UI_LANG_ATTR = 'data-ui-lang'

// Тот же ключ, что у I18nProvider.
const LANG_KEY = 'lang'

// Выполняется в <head> до гидратации: без него казахский интерфейс на каждой
// загрузке сначала рисовался бы Manrope и перескакивал на Inter после первого
// эффекта React.
export const UI_LANG_BOOT = `(function(){try{
var l=localStorage.getItem('${LANG_KEY}');
if(l)document.documentElement.setAttribute('${UI_LANG_ATTR}',l);
}catch(e){}})()`

export function applyUiLang(lang, doc = typeof document === 'undefined' ? null : document) {
  const root = doc?.documentElement
  if (!root) return
  if (lang) root.setAttribute(UI_LANG_ATTR, lang)
  else root.removeAttribute(UI_LANG_ATTR)
}
