'use client'

// Заглушка до Task 8: тест раздела.
export default function ListenRun({ t, onExit }) {
  return (
    <div className="jl-notice">
      <button type="button" className="jl-btn" onClick={onExit}>
        {t('listen.quit')}
      </button>
    </div>
  )
}
