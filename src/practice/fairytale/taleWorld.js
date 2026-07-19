// Нативная интеграция «Fairytale's World» в приложение: полноэкранный оверлей
// поверх Практики вместо открытия standalone-HTML в новой вкладке.
//
// Движок (engine.js) — синглтон: создаётся при первом открытии и живёт до конца
// сессии страницы (у него нет teardown-API, но весь звук/циклы он гасит сам в
// leaveTale/btnAnother). Открытие/закрытие — показ и скрытие host-контейнера.
//
// Стили движка глобальные (html,body / .btn / .screen), поэтому они вставляются
// <style>-тегами только на время открытого оверлея и снимаются при выходе —
// так они не подкрашивают остальное приложение. Пока оверлей открыт, движок
// перекрывает всё непрозрачным полноэкранным #app, так что конфликтов не видно.
import { createTaleWorld } from './engine.js'
import { MARKUP } from './markup.js'
import { CSS_BASE, CSS_SHELL } from './styles.js'

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap'

let world = null
let host = null
let styleEls = []
let onExitCb = null

function ensureFont() {
  if (document.querySelector('link[data-taleworld-font]')) return
  const pre = document.createElement('link')
  pre.rel = 'preconnect'
  pre.href = 'https://fonts.gstatic.com'
  pre.crossOrigin = 'anonymous'
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FONT_HREF
  link.setAttribute('data-taleworld-font', '')
  document.head.append(pre, link)
}

function injectStyles() {
  if (styleEls.length) return
  styleEls = [CSS_BASE, CSS_SHELL].map((css) => {
    const el = document.createElement('style')
    el.setAttribute('data-taleworld', '')
    el.textContent = css
    document.head.appendChild(el)
    return el
  })
}

function removeStyles() {
  styleEls.forEach((el) => el.remove())
  styleEls = []
}

// Выход движка «в библиотеку» = выход из оверлея обратно в Практику: свою
// HTML-библиотеку движка не показываем, её роль играет реестр карточек на
// странице Практики.
function closeOverlay() {
  if (host) host.style.display = 'none'
  removeStyles()
  const cb = onExitCb
  onExitCb = null
  if (cb) cb()
}

function ensureWorld() {
  if (world) return world
  host = document.createElement('div')
  host.id = 'taleworld'
  // собственный stacking context поверх любых слоёв приложения; фон — как у
  // body в standalone-версии (--midnight), иначе в незакрытых сценой зонах
  // просвечивала бы Практика
  host.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:#060a17;'
  host.innerHTML = MARKUP
  document.body.appendChild(host)
  world = createTaleWorld()
  // Попапы словаря движок вешает на document.body — переносим внутрь host,
  // чтобы они прятались вместе с оверлеем.
  ;['vocabPop', 'dictionary'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) host.appendChild(el)
  })
  // Все пути движка «назад в библиотеку» закрывают оверлей. Слушатели добавлены
  // после инициализации движка, поэтому его собственные обработчики (сохранение
  // прогресса, остановка звука) успевают отработать первыми.
  ;['selectBack', 'btnLeave', 'btnAnother'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', closeOverlay)
  })
  return world
}

// Открыть мир на конкретной сказке: с сохранённым прогрессом — сразу в мир,
// иначе — на выбор персонажа. Неизвестный id откроет библиотеку движка.
export function openTaleWorld(taleId, { onExit } = {}) {
  onExitCb = onExit || null
  ensureFont()
  injectStyles()
  const w = ensureWorld()
  host.style.display = ''
  const pack = (w.TALES || []).find((p) => p.id === taleId)
  if (!pack) {
    w.buildLibrary()
    w.buildLibLang()
    w.refreshContinue()
    w.show('library')
    return
  }
  if (w.loadFor(taleId)) w.resumeTale(pack)
  else w.chooseTale(pack)
}

// Есть ли сохранённый прогресс по сказке (для бейджа «продолжить» на карточке).
export function taleHasProgress(taleId) {
  try {
    return !!localStorage.getItem('sqlib_' + taleId)
  } catch {
    return false
  }
}
