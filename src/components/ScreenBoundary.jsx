import { Component, Suspense, useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { allowStaleBuildReload, clearStaleBuildMark } from '../lib/lazyModule.js'
import { ScreenChunkError, lazyScreen } from '../lib/lazyScreen.js'
import { shellNavOf } from '../lib/screenShell.js'

const ScreenSkeleton = lazyScreen(() => import('./ScreenSkeleton.jsx'))

/** Вошедшему заглушка понадобится на первом же переходе, а загружать её в этот момент уже поздно. */
export function preloadScreenSkeleton() {
  ScreenSkeleton.preload().catch(() => {})
}

// Чанк из кэша браузера приезжает за десятки миллисекунд, и заглушка только мигнула бы. Новый экран всё равно проявляется
// анимацией .scr-in, поэтому такая пауза незаметна.
const PLACEHOLDER_DELAY_MS = 200

function Spinner({ label }) {
  return (
    <div className="scr-load scr-load--page" role="status" aria-busy="true" aria-label={label}>
      <div className="spinner" />
    </div>
  )
}

function ScreenPlaceholder({ view, shell }) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), PLACEHOLDER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  const label = t('screen.loading')
  const active = shell?.token ? shellNavOf(view) : undefined
  if (active === undefined) return <Spinner label={label} />
  return (
    <Suspense fallback={<Spinner label={label} />}>
      <ScreenSkeleton {...shell} active={active} label={label} />
    </Suspense>
  )
}

// Экран встал — следующий отказ снова заслуживает перезагрузки. Снимает отметку только это: стоит рядом с экраном внутри
// Suspense и монтируется вместе с ним. Удачная загрузка соседнего чанка (Луна, окна поверх экрана) ничего не доказывает:
// экран, который не грузится, снова получил бы право на перезагрузку, и вкладка ушла бы в цикл.
function ScreenLoaded() {
  useEffect(() => {
    clearStaleBuildMark()
  }, [])
  return null
}

function ScreenLoadFailed() {
  const { t } = useI18n()
  return (
    <div className="scr-load scr-load--page" role="alert">
      <p className="scr-load__text">{t('screen.loadFailed')}</p>
      <button type="button" className="le-btn" onClick={() => window.location.reload()}>
        {t('lesson.crashedReload')}
      </button>
    </div>
  )
}

/**
 * Экран, который грузится по требованию: заглушка на время загрузки и восстановление, если чанк не приехал.
 *
 * Обычный случай отказа — вкладка открыта до выката: чанков её сборки на сервере уже нет. Тогда помогает только
 * перезагрузка: упавший чанк загрузчик Turbopack помнит отказом, и повторный import() отказал бы снова. Перезагрузка одна
 * (allowStaleBuildReload), чтобы упавшая раздача статики не зациклила вкладку, а без сети она показала бы вместо
 * приложения ошибку браузера. В обоих случаях ученик видит просьбу обновить страницу.
 *
 * Обёртка стоит внутри .scr-in с ключом экрана, поэтому переход на другой экран сбрасывает отказ сам. Ошибки самих экранов
 * не ловит: у них прежнее поведение.
 */
export default class ScreenBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, gaveUp: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!(error instanceof ScreenChunkError)) return
    console.error('[lazy]', error)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) this.setState({ gaveUp: true })
    else if (allowStaleBuildReload()) window.location.reload()
    else this.setState({ gaveUp: true })
  }

  render() {
    const { error, gaveUp } = this.state
    const { view, shell, children } = this.props
    if (error && !(error instanceof ScreenChunkError)) throw error
    if (gaveUp) return <ScreenLoadFailed />
    // Пока идёт перезагрузка — та же заглушка: другой экран тут показывать незачем.
    if (error) return <ScreenPlaceholder view={view} />
    return (
      <Suspense fallback={<ScreenPlaceholder view={view} shell={shell} />}>
        {children}
        <ScreenLoaded />
      </Suspense>
    )
  }
}

/**
 * Необязательная часть поверх экрана (помощник, всплывающие окна). Пока чанк едет, на её месте ничего нет. Не приехал — тоже
 * ничего: из-за окна подбора учителя не должен падать экран, а обновит страницу следующий заход в раздел.
 */
export class OptionalPart extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (error instanceof ScreenChunkError) console.error('[lazy]', error)
  }

  render() {
    const { error } = this.state
    if (error && !(error instanceof ScreenChunkError)) throw error
    if (error) return null
    return <Suspense fallback={null}>{this.props.children}</Suspense>
  }
}
