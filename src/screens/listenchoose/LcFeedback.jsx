'use client'

// Полоса разбора под картинками и текст записи. Состояние полосы —
// idle / retry / correct / failed: по нему CSS красит фон. Правильный ответ и
// «Ключевая деталь» показываются только после закрытия задания; после первой
// ошибки ответ скрыт, и студенту остаётся «послушай ещё раз».

export default function LcFeedback({ snap, t, nextRef, onNext, onToggleTranscript }) {
  const { question, round, options, heard, transcriptOpen, isLast } = snap
  // Ключ для помощника по сайту — только когда задание закрыто промахом обеих попыток. После первой ошибки ответ
  // скрыт намеренно (вторая попытка), и помощник не должен его выдать. Подпись фото нужна потому, что на плитке её
  // нет текстом: снимок видит лишь номер и галочку «3 ✓», а подпись живёт в alt и aria-label.
  const expected =
    round.resolved && !round.correct && options
      ? `${t('listenchoose.picture')} ${round.order.indexOf(question.answer) + 1}: ${options[question.answer]}`
      : undefined
  let state = 'idle'
  let title = 'idleTitle'
  let detail = 'idleDetail'
  if (round.resolved) {
    state = round.correct ? 'correct' : 'failed'
    title = round.correct ? (round.attempts === 1 ? 'good' : 'secondGood') : 'failed'
    detail = round.correct ? 'key' : 'failedDetail'
  } else if (round.wrong.length) {
    state = 'retry'
    title = 'wrong'
    detail = 'wrongDetail'
  } else if (heard) {
    title = 'readyTitle'
    detail = 'readyDetail'
  }
  return (
    <>
      <div className="lc-feedback" data-state={state} data-assistant-expected={expected}>
        <div className="lc-feedback__copy" role="status" aria-live="polite" aria-atomic="true">
          <strong>{t(`listenchoose.${title}`)}</strong>
          <p>{round.resolved && round.correct ? `${t('listenchoose.key')}: ${question.key}` : t(`listenchoose.${detail}`)}</p>
        </div>
        {round.resolved && (
          <div className="lc-feedback__actions">
            <button
              type="button"
              className="lc-quiet"
              aria-expanded={transcriptOpen}
              aria-controls="lc-transcript"
              onClick={onToggleTranscript}
            >
              {t(transcriptOpen ? 'listenchoose.hide' : 'listenchoose.show')}
            </button>
            <button type="button" ref={nextRef} className="lc-primary" onClick={onNext}>
              {t(isLast ? 'listenchoose.results' : 'listenchoose.next')}
            </button>
          </div>
        )}
      </div>
      {transcriptOpen && round.resolved && (
        <div className="lc-transcript" id="lc-transcript">
          <p lang="en">{question.text}</p>
          <p className="lc-transcript__key">
            {t('listenchoose.key')}: <span lang="en">{question.key}</span>
          </p>
        </div>
      )}
    </>
  )
}
