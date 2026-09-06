import { useI18n } from '../../../i18n.jsx'
import { REFLECT_MIN_WORDS } from '../../../practice/reading/check.js'

// Свободный ответ. Проверка ЛОКАЛЬНАЯ и по ключевым идеям (см. check.js) —
// в сеть не ходим намеренно: раздел читается офлайн, а задача здесь не оценить
// язык, а убедиться, что человек ответил именно на вопрос текста. Разбор
// грамматики — в «Письме», там для этого есть модель.
export default function ReflectionTask({ ex, st, onText, res, showModel }) {
  const { t } = useI18n()
  const d = res ? res.detail : null

  return (
    <>
      <p className="rd-q__text" lang="en">{ex.q}</p>
      <textarea
        className="rd-reflect"
        rows={4}
        lang="en"
        aria-label={ex.q}
        value={st.reflect}
        disabled={!!res}
        onChange={(e) => onText(e.target.value)}
      />
      {d && (
        <div className={`rd-fb ${res.score === res.total ? 'is-ok' : 'is-note'}`} aria-live="polite">
          {d.short && <>✍️ {t('reading.reflect.short', { n: REFLECT_MIN_WORDS })} </>}
          {t('reading.reflect.found', { n: d.foundCount, t: d.keysTotal })}
          {d.found.length > 0 && <>: <b>{d.found.join(', ')}</b></>}
          {d.missing.length > 0 && res.score < res.total && (
            <><br />💡 {t('reading.reflect.missing')} <i>{d.missing.join(', ')}</i></>
          )}
        </div>
      )}
      {showModel && (
        <div className="rd-expl rd-expl--model">
          <b>💬 {t('reading.modelAnswer')}:</b> <span lang="en">{ex.model}</span>
        </div>
      )}
    </>
  )
}
