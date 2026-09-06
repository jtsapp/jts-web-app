'use client'

// Типографика читалки — порт S.{fs,lh,width,dys} и applySettings() из
// data/jtsreading.html (~:518, 580). Настройки НЕ синкаются на сервер и лежат
// отдельным ключом: это свойство устройства (телефон в транспорте против
// монитора), а не прогресс аккаунта. Тумблер тёмной темы из прототипа не
// портирован — тема в приложении общая, у раздела своей быть не должно.

const KEY = 'jts_reading_view'

export const FONT_SIZES = [16, 20, 24, 30]
export const LINE_HEIGHTS = [1.5, 1.8, 2]
export const WIDTHS = ['narrow', 'normal']

export const DEFAULT_VIEW = { fs: 20, lh: 1.8, width: 'normal', dys: false }

export function readView() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object') {
      return {
        fs: FONT_SIZES.includes(val.fs) ? val.fs : DEFAULT_VIEW.fs,
        lh: LINE_HEIGHTS.includes(val.lh) ? val.lh : DEFAULT_VIEW.lh,
        width: WIDTHS.includes(val.width) ? val.width : DEFAULT_VIEW.width,
        dys: !!val.dys,
      }
    }
  } catch {
    /* приватный режим / битый JSON — дефолты макета */
  }
  return { ...DEFAULT_VIEW }
}

export function writeView(view) {
  try {
    localStorage.setItem(KEY, JSON.stringify(view))
  } catch {
    /* нет квоты — настройка живёт до перезагрузки */
  }
}

/** Шаг по кнопкам A−/A+ на панели читалки. */
export function stepFont(fs, dir) {
  const i = FONT_SIZES.indexOf(fs)
  return FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))]
}

/**
 * CSS-переменные для корня раздела. Дислексия-режим прототипа — это не шрифт,
 * а разрядка букв и слов плюс отказ от курсива (см. правило .rd--dys в
 * reading.css): OpenDyslexic мы не возим, а разрядка даёт основную часть
 * эффекта и ничего не весит.
 */
export function viewVars(view) {
  return {
    '--rd-fs': view.fs + 'px',
    '--rd-lh': String(view.lh),
    '--rd-measure': view.width === 'narrow' ? '48ch' : '68ch',
    '--rd-track': view.dys ? '.06em' : '0',
    '--rd-wspace': view.dys ? '.14em' : '0',
  }
}
