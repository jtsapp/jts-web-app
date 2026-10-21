import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import AuthLayout, { AuthHeading } from './AuthLayout.jsx'
import { PrimaryButton } from './fields.jsx'

const AUTO_MS = 1200

/**
 * «Регистрация пройдена» (макет): Декстер, честное «что дальше» и кнопка.
 * Дальше — анкета теста уровня (5 вопросов о цели) и сам тест: их открывает
 * «Главная» нового ученика, куда и ведёт onContinue.
 *
 * `auto` — тот же экран после обычного входа: там жать нечего, и он сам уходит
 * дальше. Пауза не косметическая: куда вести, решает screenAfterLogin по
 * профилю, а тот дочитывается в фоне уже после ответа на вход.
 */
export default function DoneStep({ title, sub, onContinue, auto = false }) {
  const { t } = useI18n()
  // App передаёт новую стрелку на каждый рендер, а рендеров по ходу дочитки
  // профиля много — таймер на неё перезапускался бы и уход откладывался.
  const next = useRef(onContinue)
  useEffect(() => {
    next.current = onContinue
  })

  useEffect(() => {
    if (!auto) return undefined
    const id = setTimeout(() => next.current?.(), AUTO_MS)
    return () => clearTimeout(id)
  }, [auto])

  return (
    <AuthLayout
      className="rg--done"
      onSubmit={onContinue}
      actions={auto ? null : <PrimaryButton>{t('rg.continue')}</PrimaryButton>}
    >
      <div className="rg-done__avatar">
        <img src="/assets/reg/v2/dexter.webp" alt="" width="120" height="120" />
      </div>
      <AuthHeading title={title} sub={sub} />
    </AuthLayout>
  )
}
