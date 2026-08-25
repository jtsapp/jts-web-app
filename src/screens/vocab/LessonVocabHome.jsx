import { useI18n } from '../../i18n.jsx'

function isSavedDeck(lesson) {
  return lesson?.code === 'SAVED' || lesson?.lessonId == null
}

export default function LessonVocabHome({ lessons, loading, error, onOpen, onBack }) {
  const { t } = useI18n()
  return (
    <section className="v-screen v-show">
      <div className="v-scroll v-pad">
        <button type="button" className="v-btn v-ghost v-lessons-back" onClick={onBack}>
          {t('vocab.lesson.backToSetup')}
        </button>
        <h1 className="v-setup-title">{t('vocab.lesson.title')}</h1>
        <p className="v-setup-lead">{t('vocab.lesson.lead')}</p>

        {loading && <div className="v-lv-state">{t('vocab.lesson.loading')}</div>}
        {error && <div className="v-lv-state">{t('vocab.lesson.error')}</div>}
        {!loading && !error && lessons.length === 0 && (
          <div className="v-lv-state">{t('vocab.lesson.empty')}</div>
        )}

        <ul className="v-lv-list">
          {lessons.map((lesson) => {
            const saved = isSavedDeck(lesson)
            return (
            <li key={lesson.lessonId ?? lesson.code ?? 'saved'}>
              <button
                type="button"
                className="v-lv-card"
                disabled={lesson.locked}
                onClick={() => onOpen(lesson)}
              >
                <span className="v-lv-code">{saved ? t('vocab.lesson.savedCode') : (lesson.code || t('vocab.lesson.lesson'))}</span>
                <span className="v-lv-meta">
                  <b>{saved ? t('vocab.lesson.savedTitle') : lesson.title}</b>
                  <span>
                    {saved
                      ? t('vocab.lesson.savedMeta')
                      : [lesson.levelLabel, lesson.unitName].filter(Boolean).join(' · ')}
                    {' · '}
                    {t('vocab.lesson.wordCount', { n: lesson.wordCount })}
                  </span>
                </span>
                <span className={`v-lv-cycle${!saved && lesson.finishedCycle >= 3 ? ' is-done' : ''}`}>
                  {lesson.locked
                    ? t('vocab.lesson.locked')
                    : saved
                      ? t('vocab.lesson.openDeck')
                      : lesson.finishedCycle >= 3
                      ? t('vocab.lesson.done')
                      : lesson.finishedCycle > 0
                        ? t('vocab.lesson.cycleOf', { n: lesson.finishedCycle })
                        : t('vocab.lesson.start')}
                </span>
              </button>
            </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
