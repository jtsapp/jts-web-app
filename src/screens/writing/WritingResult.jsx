import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { computeHighlights, wordDiff } from '../../practice/writing/resultFormat.js'
import WritingModal from './WritingModal.jsx'

// Критерии оценки — CRIT прототипа (data/jtswriting.html 12602–12607),
// пересаженный на палитру раздела: свои хексы прототипа (#874BF8/#0AAFFF/…)
// заменены локальными переменными .wr, чтобы разбор выглядел роднёй соседних
// карточек, а не чужим виджетом.
const CRIT = [
  { id: 'task', labelKey: 'writing.result.critTask', color: 'var(--wr-purple)' },
  { id: 'organisation', labelKey: 'writing.result.critOrganisation', color: 'var(--wr-sky-ink)' },
  { id: 'vocabulary', labelKey: 'writing.result.critVocabulary', color: 'var(--wr-green)' },
  { id: 'grammar', labelKey: 'writing.result.critGrammar', color: 'var(--wr-gold)' },
]

// Порт ring() прототипа (9956–9968): кольцо — две окружности, дуга рисуется
// stroke-dasharray/offset, повёрнута на -90° css'ом, подпись поверх.
function Ring({ percent, color, size, label }) {
  const s = size || 56
  const r = s / 2 - 5
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(1, percent / 100)))
  return (
    <div className="wr-res-ring" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--wr-line)" strokeWidth="6" />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
        />
      </svg>
      <b>{label}</b>
    </div>
  )
}

// Экран разбора проверенного текста — порт renderResult (12609–12766) без
// XP-карточки прототипа (очки/бейджи/серия в веб-версию не переносились).
// Правильный ответ ученику не показывается нигде и здесь тоже: модалка правки
// показывает «было/стало» ЕГО текста и правило-объяснение, а не ключ ответа.
// genre в пропсах — часть контракта WritingPage (прототип показывал по нему
// поздравление о закрытии жанра в XP-карточке, которую мы не переносим).
export default function WritingResult({ assessment, text, onBackToPad, onBackToTrainer }) {
  const { t } = useI18n()
  // Пустой объект-заглушка мемоизирован, чтобы не дёргать useMemo сегментов
  // на каждый рендер, когда assessment вдруг не передали.
  const a = useMemo(() => assessment || {}, [assessment])
  const scores = a.scores || {}
  const srcText = String(text || '')

  // detail = {kind:'corr'|'good', i} — какая пометка открыта в модалке.
  const [detail, setDetail] = useState(null)
  const [showDiff, setShowDiff] = useState(true)

  const segments = useMemo(() => computeHighlights(srcText, a), [srcText, a])
  const diffSegs = useMemo(
    () => (a.rewrite ? wordDiff(srcText, a.rewrite) : null),
    [srcText, a.rewrite],
  )

  const corrections = a.corrections || []
  const strengths = a.strengths || []
  const detailData = detail
    ? detail.kind === 'good'
      ? strengths[detail.i]
      : corrections[detail.i]
    : null

  const openDetail = (seg) => setDetail({ kind: seg.refKind, i: seg.refIndex })

  return (
    <>
      {/* Карточка 1: оценки по критериям, CEFR и резюме */}
      <div className="wr-card">
        <div className="wr-res-head">
          <h2 className="wr-sec-title">{t('writing.result.title')}</h2>
          <span className={a.mode === 'live' ? 'wr-pill' : 'wr-pill wr-pill--score'}>
            {a.mode === 'live' ? t('writing.result.modeAi') : t('writing.result.modeOffline')}
          </span>
        </div>
        <div className="wr-res-rings">
          {CRIT.map((c) => {
            const val = scores[c.id] || 0
            return (
              <div key={c.id} className="wr-res-ringwrap">
                <Ring percent={(val / 5) * 100} color={c.color} size={76} label={val + '/5'} />
                <div>{t(c.labelKey)}</div>
              </div>
            )
          })}
        </div>
        <div className="wr-res-lvl">
          <span className="wr-res-cefr">{t('writing.result.cefr', { cefr: a.cefr || '—' })}</span>
          <span className="wr-pill">
            {t(a.wordCount === 1 ? 'writing.result.word1' : 'writing.result.words', { n: a.wordCount || 0 })}
          </span>
        </div>
        {a.summary && <p className="wr-res-summary">{a.summary}</p>}
      </div>

      {/* Карточка 2: текст с пометками + списки правок и удач */}
      <div className="wr-card">
        <h3 className="wr-sec-title">{t('writing.result.marksTitle')}</h3>
        <div className="wr-res-howto">{t('writing.result.marksHowto')}</div>
        {/* Переносы строк внутри сегментов рисует white-space:pre-wrap —
            вручную по \n не режем (сегменты компонует computeHighlights). */}
        <div className="wr-res-text">
          {segments.map((seg, i) =>
            seg.kind === 'plain' ? (
              <span key={i}>{seg.text}</span>
            ) : (
              <span
                key={i}
                role="button"
                tabIndex={0}
                className={'wr-hl wr-hl--' + seg.kind}
                onClick={() => openDetail(seg)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(seg)
                  }
                }}
              >
                {seg.text}
              </span>
            ),
          )}
        </div>

        {corrections.length ? (
          <>
            <div className="wr-res-fnhead">{t('writing.result.corrHead')}</div>
            {corrections.map((d, i) => (
              <div key={i} className="wr-res-item">
                <div className="wr-res-was">
                  <s>{d.original}</s> → <b>{d.corrected}</b>
                </div>
                <div className={'wr-res-fb ' + (d.severity === 'high' ? 'wr-res-fb--err' : 'wr-res-fb--tip')}>
                  {d.explanation}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="wr-res-fb wr-res-fb--ok">{t('writing.result.noErrors')}</div>
        )}

        {strengths.length > 0 && (
          <>
            <div className="wr-res-fnhead">{t('writing.result.strengthsHead')}</div>
            {strengths.map((s, i) => (
              <div key={i} className="wr-res-fb wr-res-fb--ok">
                <b>“{s.quote}” </b>
                {s.why}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Карточка 3: три шага к следующему уровню */}
      <div className="wr-card">
        <h3 className="wr-sec-title">{t('writing.result.stepsTitle')}</h3>
        <ol className="wr-res-steps">
          {(a.nextSteps || []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {/* Карточка 4: переписанный текст с диффом (только когда модель его дала) */}
      {a.rewrite && (
        <div className="wr-card">
          <h3 className="wr-sec-title">{t('writing.result.rewriteTitle')}</h3>
          <div className="wr-res-howto">{t('writing.result.rewriteHowto')}</div>
          <div className="wr-res-text wr-res-diff">
            {showDiff
              ? diffSegs.map((seg, i) => {
                  // Контракт wordDiff: del-пробелы прячем (иначе между словами
                  // повисают красные «пустышки»), ins-пробелы рисуем обычным
                  // текстом — так дифф совпадает с прототипом пиксель-в-пиксель.
                  if (seg.op === 'same') return <span key={i}>{seg.text}</span>
                  if (seg.op === 'del') {
                    return /^\s+$/.test(seg.text) ? null : <del key={i}>{seg.text}</del>
                  }
                  return /^\s+$/.test(seg.text) ? <span key={i}>{seg.text}</span> : <ins key={i}>{seg.text}</ins>
                })
              : a.rewrite}
          </div>
          <div className="wr-res-row">
            <button type="button" className="wr-ghost" onClick={() => setShowDiff((v) => !v)}>
              {showDiff ? t('writing.result.diffHide') : t('writing.result.diffShow')}
            </button>
          </div>
        </div>
      )}

      <div className="wr-res-nav">
        <button type="button" className="wr-primary" onClick={onBackToPad}>
          {t('writing.result.toPad')}
        </button>
        <button type="button" className="wr-ghost" onClick={onBackToTrainer}>
          {t('writing.result.toTasks')}
        </button>
      </div>

      {/* Модалка пометки: у правки — было/стало/правило (12653–12671), ключ
          ответа тут не появляется — «стало» это формулировка модели по тексту
          самого ученика; у удачи — цитата и почему это работает. */}
      <WritingModal open={!!detailData} onClose={() => setDetail(null)}>
        {detailData && (
          <>
            <h3 className="wr-modal__title">
              {t(detail.kind === 'good' ? 'writing.result.modalGood' : 'writing.result.modalBad')}
            </h3>
            {detail.kind === 'good' ? (
              <>
                <div className="wr-res-quote">{detailData.quote}</div>
                <p className="wr-res-summary">{detailData.why}</p>
              </>
            ) : (
              <>
                <div className="wr-res-was">
                  {t('writing.result.before')}
                  <s>{detailData.original}</s>
                  <br />
                  {t('writing.result.after')}
                  <b>{detailData.corrected}</b>
                </div>
                <div className="wr-res-fb wr-res-fb--tip">{detailData.explanation}</div>
                <div className="wr-res-row">
                  {/* type/severity приходят английскими токенами от чекера —
                      прототип показывал их как есть, не переводим и мы. */}
                  <span className="wr-pill">{detailData.type + ' · ' + detailData.severity}</span>
                </div>
              </>
            )}
            <button type="button" className="wr-primary wr-res-got" onClick={() => setDetail(null)}>
              {t('writing.result.gotIt')}
            </button>
          </>
        )}
      </WritingModal>
    </>
  )
}
