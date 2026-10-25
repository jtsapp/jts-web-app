import { useState } from 'react'
import Tabs from '../ui/Tabs.jsx'
import { useI18n } from '../../i18n.jsx'

// Блоки «наставника» разбора Writing (lib/ielts/writingGrader.js → coachWriting): как развить именно это эссе и как
// улучшить его по предложениям или целиком. Ученик просил не только «что не так», но и «как написать сильнее» —
// поэтому рядом с каждым улучшением стоит причина-приём, который можно повторить в следующей работе.
// У работ, оценённых до 25.10.2026, этих полей нет — блоки не рисуются.

const critLabel = (t, c, kind) => t(`ieltsWriting.crit.${c}${c === 'taskResponse' && kind !== 't2' ? '1' : ''}`)

/** «Как развить эссе»: советы по абзацам с готовым примером на английском. */
export function WritingDevelop({ tips }) {
  const { t } = useI18n()
  if (!tips?.length) return null
  return (
    <section className="ih-card ih-wcoach">
      <h3>{t('ieltsWriting.c.devTitle')}</h3>
      <p className="ih-muted">{t('ieltsWriting.c.devHint')}</p>
      <ol className="ih-wcoach__tips">
        {tips.map((d, i) => (
          <li key={i} className="ih-wcoach__tip">
            <span className="ih-wcoach__num">{i + 1}</span>
            <div>
              <div className="ih-wcoach__tags">
                <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(`ieltsWriting.c.area.${d.area}`)}</span></span>
                <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{d.paragraph ? t('ieltsWriting.c.paragraph', { n: String(d.paragraph) }) : t('ieltsWriting.c.wholeText')}</span></span>
              </div>
              <p>{d.tip}</p>
              {d.example && (
                <p className="ih-wcoach__example">
                  <small>{t('ieltsWriting.c.example')}</small>
                  <span lang="en">{d.example}</span>
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * «Как улучшить эссе»: по предложениям (было → лучше, причина и критерий), сгруппировано по абзацам, — или всё эссе
 * целиком на уровне выше, рядом со своим текстом абзац за абзацем.
 */
export function WritingImprove({ sentences, essay, paragraphs, kind }) {
  const { t } = useI18n()
  const hasSentences = sentences?.length > 0
  const hasEssay = essay?.length > 0
  const [tab, setTab] = useState(hasSentences ? 'sentences' : 'essay')
  if (!hasSentences && !hasEssay) return null
  const items = [hasSentences && { key: 'sentences', label: t('ieltsWriting.c.bySentence', { n: String(sentences.length) }) }, hasEssay && { key: 'essay', label: t('ieltsWriting.c.whole') }].filter(Boolean)
  const byPara = new Map()
  for (const s of sentences || []) byPara.set(s.paragraph, [...(byPara.get(s.paragraph) || []), s])

  return (
    <section className="ih-card ih-wcoach">
      <h3>{t('ieltsWriting.c.title')}</h3>
      {items.length > 1 && <Tabs items={items} value={tab} onChange={setTab} idBase="ih-wcoach" label={t('ieltsWriting.c.title')} />}

      {tab === 'sentences' && hasSentences && (
        <div id="ih-wcoach-panel-sentences" role="tabpanel" className="ih-wcoach__panel">
          {[...byPara.keys()].sort((a, b) => a - b).map((p) => (
            <div key={p} className="ih-wcoach__group">
              <h4>{t('ieltsWriting.c.paragraph', { n: String(p) })}</h4>
              {byPara.get(p).map((s, i) => (
                <article key={i} className="ih-wcoach__sent">
                  <p className="ih-wcoach__was" lang="en"><small>{t('ieltsWriting.c.yours')}</small>{s.original}</p>
                  <p className="ih-wcoach__now" lang="en"><small>{t('ieltsWriting.c.better')}</small>{s.improved}</p>
                  <p className="ih-wcoach__why">
                    <span className="ih-chip ih-chip--muted ih-chip--sm"><span>{critLabel(t, s.criterion, kind)}</span></span>
                    {s.why}
                  </p>
                </article>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'essay' && hasEssay && (
        <div id="ih-wcoach-panel-essay" role="tabpanel" className="ih-wcoach__panel">
          <p className="ih-muted">{t('ieltsWriting.c.wholeHint')}</p>
          {essay.map((p, i) => (
            <div key={i} className="ih-wcoach__pair">
              <div>
                <small>{t('ieltsWriting.c.paragraph', { n: String(i + 1) })} · {t('ieltsWriting.c.yours')}</small>
                <p lang="en" className="ih-muted">{paragraphs[i] || '—'}</p>
              </div>
              <div>
                <small>{t('ieltsWriting.c.paragraph', { n: String(i + 1) })} · {t('ieltsWriting.c.better')}</small>
                <p lang="en">{p}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
