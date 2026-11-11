// Тема приложения для раздела в Shadow DOM.
//
// Тень не видит атрибута data-theme на <html>, а глобальный тёмный слой (theme-dark.generated.css) в неё не проходит:
// без этого раздел оставался светлым при тёмном сайте (Tenses и Punctuation World, 10.11.2026). Поэтому тема едет
// атрибутом хоста — его ловят правила :host([data-theme="dark"]) стилей раздела, — и меняется вместе с кнопкой темы:
// ThemeToggle переключает атрибут на <html> без перезагрузки, и раздел, открытый в этот момент, должен перекраситься.
import { appTheme } from '../lib/lessonFrameTheme.js'

export function watchAppTheme(host, root = document.documentElement) {
  const apply = () => host.setAttribute('data-theme', appTheme(root))
  apply()
  const observer = new MutationObserver(apply)
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
