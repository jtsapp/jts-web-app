import { useEffect, useRef, useState } from 'react'
import { CalculateIcon, DockIcon, FullIcon } from '../icons.jsx'
import { CloseIcon, InfoIcon, OpenInNewIcon } from '../../ielts/icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Публичный калькулятор Desmos, как в прототипе (PLAN §2.1): без ключа API. Юридическая проверка встраивания в
// коммерческий продукт — открытый вопрос владельцу (PLAN §7); платный API — запасной путь.
export const DESMOS_URL = 'https://www.desmos.com/calculator'
// Фрейм не сообщил о загрузке за это время — вероятно, заблокирован: показываем ссылку на вкладку
const LOAD_TIMEOUT_MS = 8000

/**
 * Калькулятор справа (Figma SAT 26). Один фрейм на весь прогон: при переходе между вопросами и на вопросах R&W он
 * прячется, а не размонтируется — иначе Desmos перезагружался бы и терял графики («остаётся открытым на следующих
 * вопросах модуля и помнит графики»). Развернуть — большое окно поверх вопроса, свернуть — обратно справа.
 * В R&W калькулятора нет вовсе (как в реальном тесте) — кнопку не рисует шапка.
 */
// Нет в Figma: развёрнутое окно и запасной путь «не загрузился» — адаптация прототипа core.js (JTS.desmos)
export default function DesmosDock({ open, visible, expanded, onClose, onExpand, note = true }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(open)
  const [state, setState] = useState('loading')
  const timer = useRef(null)

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    timer.current = setTimeout(() => setState((s) => (s === 'loading' ? 'blocked' : s)), LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer.current)
  }, [mounted])

  if (!mounted) return null
  const shown = open && visible
  return (
    <aside className={`st-desmos ${expanded ? 'is-expanded' : ''}`} hidden={!shown} aria-label="Desmos">
      <div className="st-desmos__head">
        <span className="st-desmos__icon"><CalculateIcon size={18} /></span>
        <b>Desmos</b>
        <span className="st-spacer" />
        <button type="button" className="ih-round st-desmos__btn" onClick={() => onExpand(!expanded)}
          aria-label={t(expanded ? 'sat.desmos.dock' : 'sat.desmos.expand')} title={t(expanded ? 'sat.desmos.dock' : 'sat.desmos.expand')}>
          {expanded ? <DockIcon size={18} /> : <FullIcon size={18} />}
        </button>
        <a className="ih-round st-desmos__btn" href={DESMOS_URL} target="_blank" rel="noopener noreferrer"
          aria-label={t('sat.desmos.tab')} title={t('sat.desmos.tab')}>
          <OpenInNewIcon size={18} />
        </a>
        <button type="button" className="ih-round st-desmos__btn" onClick={onClose} aria-label={t('sat.run.close')} title={t('sat.run.close')}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="st-desmos__calc">
        {state === 'blocked' ? (
          <div className="st-desmos__blocked">
            <p>{t('sat.desmos.blocked')}</p>
            <a className="ih-btn ih-btn--outline" href={DESMOS_URL} target="_blank" rel="noopener noreferrer">{t('sat.desmos.tab')}</a>
          </div>
        ) : null}
        <iframe
          src={DESMOS_URL}
          title="Desmos Graphing Calculator"
          allow="fullscreen"
          hidden={state === 'blocked'}
          onLoad={() => setState('ready')}
        />
      </div>
      {/* подпись про «следующие вопросы модуля» — для экрана вопроса; на странице юнита её нет */}
      {!expanded && note && (
        <p className="st-desmos__note"><InfoIcon size={20} />{t('sat.desmos.note')}</p>
      )}
    </aside>
  )
}
