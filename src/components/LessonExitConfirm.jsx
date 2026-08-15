import AssetImage from './AssetImage.jsx'
import { useI18n } from '../i18n.jsx'

// Подтверждение выхода из незаконченного урока (Figma, «Выход из урока» →
// 4065:31108). Один и тот же диалог у урока «Обучения» (KingdomInteriorPage) и
// у онлайн-урока (LessonWorkspacePage) — раньше жил только в первом, и второй
// закрывался молча, теряя прогресс без вопроса.
export default function LessonExitConfirm({ onStay, onLeave }) {
  const { t } = useI18n()

  return (
    <div className="lx-over" onClick={onStay}>
      <div className="lx-card" onClick={(e) => e.stopPropagation()}>
        {/* Крестик в макете стоит по центру НАД карточкой и рисуется толстым
            штрихом — глиф «×» рядом с ним выглядел засечкой. */}
        <button className="lx-close" aria-label={t('common.close')} onClick={onStay}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <path d="M6 6 24 24M24 6 6 24" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </button>
        {/* Арт рисуется в круг 112px, а исходный PNG был 1664px и 2.6 МБ — на 4G
            он не успевал приехать, и вместо портрета висел серый кружок. Тот же
            кадр, пережатый под показ, весит 42 КБ. */}
        <AssetImage className="lx-art" src="/assets/lesson/exit.webp" alt="" hideOnError />
        <h2 className="lx-title">{t('lesson.exitAsk')}</h2>
        <div className="lx-sub">{t('lesson.exitAskSub')}</div>
        <div className="lx-acts">
          <button className="le-btn lx-continue" onClick={onStay}>
            {t('lesson.exitStay')}
          </button>
          <button className="lx-leave" onClick={onLeave}>
            {t('lesson.exitLeave')}
          </button>
        </div>
      </div>
    </div>
  )
}
