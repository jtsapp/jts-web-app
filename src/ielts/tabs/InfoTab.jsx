import data from '../info/infoData.json'
import { SectionTile } from '../sections.jsx'
import { roundBand } from '../model/dashboard.js'
import { CheckIcon, InfoIcon, OpenInNewIcon, ScheduleIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Вкладка «Инфо» (Figma «Инфо об экзамене»): слева оглавление из восьми глав, справа открытая глава.
// Тексты — методиста, из прототипа (`jts-ielts-htmls/ielts/90-info.html`, ветка inf.* в ru / kk / en) и лежат в
// `info/infoData.json` вместе с таблицами band §17 и официальными ссылками: справочник статичный, в бэкенд за ним не
// ходим. Цен и дат нет намеренно (ТЗ §22) — они меняются и живут на сайтах IDP и British Council.

const SKILLS = ['listening', 'reading', 'writing', 'speaking']
const CHAPTERS = ['format', 'diff', 'band', 'tips', 'reg', 'day', 'checklists', 'faq']
const DIFF = ['purpose', 'listening', 'reading', 'readingScore', 'writing1', 'writing2', 'speaking']
const REG_STEPS = [1, 2, 3, 4, 5, 6, 7]
const BRING = ['id', 'water', 'nothing']
const RULES = ['check', 'food', 'issue']
const CHECK = { month: ['book', 'id', 'mock', 'target', 'feedback'], week: ['writing', 'speaking', 'traps', 'route', 'sleep'], eve: ['doc', 'letter', 'light', 'rest'], day: ['breakfast', 'early', 'take', 'devices', 'time'] }
const FAQ = ['validity', 'late', 'osr', 'cdpaper', 'remark']
const TRACK_NAME = { academic: 'Academic', general: 'General Training' }
const OVERALL_EXAMPLE = [6.5, 6.0, 6.0, 6.5]

// Строки, которых не было в прототипе: две карточки под таблицей формата, чип трека и короткое имя главы в оглавлении
// (в макете «Academic и General Training», полное название главы — заголовком справа).
const EXTRA = {
  ru: {
    navDiff: 'Academic и General Training',
    trackChip: 'Трек: {track}',
    overallTitle: 'Как считается overall',
    overallText: 'Каждая секция — от 0 до 9 с шагом 0.5. Overall — среднее четырёх, округлённое до ближайших 0.5.',
    whereTitle: 'Где сдавать в Казахстане',
    whereText: 'Два официальных оператора. Цены, даты и города — на их сайтах.',
    toc: 'Разделы',
  },
  kk: {
    navDiff: 'Academic және General Training',
    trackChip: 'Трек: {track}',
    overallTitle: 'Overall қалай есептеледі',
    overallText: 'Әр бөлім 0-ден 9-ға дейін 0.5 қадаммен бағаланады. Overall — төрт бөлімнің орташасы, жақын 0.5-ке дөңгелектенеді.',
    whereTitle: 'Қазақстанда қайда тапсыруға болады',
    whereText: 'Екі ресми оператор. Бағасы, күндері мен қалалары — олардың сайттарында.',
    toc: 'Бөлімдер',
  },
  en: {
    navDiff: 'Academic vs General Training',
    trackChip: 'Track: {track}',
    overallTitle: 'How overall is calculated',
    overallText: 'Each section is scored 0 to 9 in steps of 0.5. Overall is the average of the four, rounded to the nearest 0.5.',
    whereTitle: 'Where to take it in Kazakhstan',
    whereText: 'Two official operators. Prices, dates and cities are on their websites.',
    toc: 'Chapters',
  },
}

function lookup(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}

function Ext({ href, children }) {
  if (!href) return null
  return (
    <a className="ih-info__ext" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <OpenInNewIcon size={16} />
    </a>
  )
}

function BandTable({ rows, caption, x }) {
  return (
    <table className="ih-info__table ih-info__table--band">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{x('band.raw')}</th>
          <th scope="col">{x('band.band')}</th>
        </tr>
      </thead>
      <tbody>
        {rows
          .filter((r) => r[2] >= 4)
          .map(([a, b, v]) => (
            <tr key={`${a}-${b}`}>
              <td>{a === b ? a : `${a}–${b}`}</td>
              <td>{v.toFixed(1)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}

/**
 * Одна глава справочника (формат, Academic/GT, band, советы, регистрация, день экзамена, чек-листы, FAQ) — тексты
 * методиста из infoData.json. Справочник «Об экзамене» по дизайну «IELTS new» встраивает главы в «Быстрые ответы».
 */
export function InfoChapter({ chapter, track }) {
  const { lang } = useI18n()
  const T = data.text[lang] || data.text.ru
  const E = EXTRA[lang] || EXTRA.ru
  const tr = track === 'general' ? 'gt' : 'ac'
  const trackName = TRACK_NAME[track]
  const L = data.links

  const x = (path, vars) => {
    let s = lookup(T, path) ?? lookup(data.text.ru, path) ?? ''
    for (const [k, v] of Object.entries(vars || {})) s = s.replaceAll(`{${k}}`, v)
    return s
  }
  const e = (k, vars) => {
    let s = E[k]
    for (const [kk, v] of Object.entries(vars || {})) s = s.replaceAll(`{${kk}}`, v)
    return s
  }

  let body
  if (chapter === 'format') {
    const sum = OVERALL_EXAMPLE.reduce((a, b) => a + b, 0)
    const avg = sum / OVERALL_EXAMPLE.length
    body = (
      <>
        <p className="ih-info__lead">{x('format.intro', { track: trackName })}</p>
        <div className="ih-info__fmt" role="table" aria-label={x('sec.format')}>
          <div className="ih-info__fmt-head" role="row">
            <span role="columnheader">{x('format.col.section')}</span>
            <span role="columnheader">{x('format.col.time')}</span>
            <span role="columnheader">{x('format.col.what')}</span>
          </div>
          {SKILLS.map((s) => (
            <div key={s} className="ih-info__fmt-row" role="row">
              <span role="cell" className="ih-info__skill">
                <SectionTile section={s} size={32} iconSize={18} />
                <b>{s[0].toUpperCase() + s.slice(1)}</b>
              </span>
              <span role="cell" className="ih-info__time">{x(`format.${s}.time`)}</span>
              <span role="cell">{x(s === 'reading' || s === 'writing' ? `format.${s}.${tr}` : `format.${s}.what`)}</span>
            </div>
          ))}
        </div>
        <p className="ih-info__total"><ScheduleIcon size={18} />{x('format.total').replace(/\.$/, '')}</p>
        <div className="ih-info__pair">
          <section className="ih-card ih-info__card">
            <h3>{E.overallTitle}</h3>
            <p>{E.overallText}</p>
            <p className="ih-info__example">
              {OVERALL_EXAMPLE.map((v) => v.toFixed(1)).join(' + ')} = {avg} → overall {roundBand(avg).toFixed(1)}
            </p>
          </section>
          <section className="ih-card ih-info__card">
            <h3>{E.whereTitle}</h3>
            <p>{E.whereText}</p>
            <div className="ih-info__btns">
              <Ext href={L.idp}>IDP</Ext>
              <Ext href={L.britishCouncil}>British Council</Ext>
            </div>
          </section>
        </div>
      </>
    )
  } else if (chapter === 'diff') {
    body = (
      <>
        <p className="ih-info__lead">{x('diff.intro')}</p>
        <div className="ih-info__scroll">
          <table className="ih-info__table">
            <caption>{x('sec.diff')}</caption>
            <thead>
              <tr>
                <th scope="col">{x('diff.col.what')}</th>
                <th scope="col">Academic</th>
                <th scope="col">General Training</th>
              </tr>
            </thead>
            <tbody>
              {DIFF.map((r) => {
                const same = lookup(T, `diff.${r}.same`)
                return (
                  <tr key={r}>
                    <th scope="row">{x(`diff.${r}.name`)}</th>
                    {same ? <td colSpan={2}>{same}</td> : (
                      <>
                        <td>{x(`diff.${r}.ac`)}</td>
                        <td>{x(`diff.${r}.gt`)}</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="ih-muted">{x('diff.mine', { track: TRACK_NAME[track === 'general' ? 'general' : 'academic'] })}</p>
      </>
    )
  } else if (chapter === 'band') {
    const avg = OVERALL_EXAMPLE.reduce((a, b) => a + b, 0) / OVERALL_EXAMPLE.length
    body = (
      <>
        <p className="ih-info__lead">{x('band.intro')}</p>
        <p className="ih-info__example">{x('band.example', { sum: OVERALL_EXAMPLE.map((v) => v.toFixed(1)).join(' + '), avg: String(avg), band: roundBand(avg).toFixed(1) })}</p>
        <p>{x('band.lr')}</p>
        <div className="ih-info__pair">
          <section className="ih-card ih-info__card">
            <h3>Listening</h3>
            <BandTable rows={data.bandTables.listening} caption="Listening" x={x} />
          </section>
          <section className="ih-card ih-info__card">
            <h3>{x('band.reading', { track: trackName })}</h3>
            <BandTable rows={tr === 'gt' ? data.bandTables.readingGT : data.bandTables.readingAC} caption={x('band.reading', { track: trackName })} x={x} />
          </section>
        </div>
        <p className="ih-muted">{x('approx')}</p>
        <p>{x('band.ws')}</p>
        <ul className="ih-info__list">
          <li>{x('band.wCrit')}</li>
          <li>{x('band.sCrit')}</li>
        </ul>
      </>
    )
  } else if (chapter === 'tips') {
    body = (
      <div className="ih-info__grid">
        {SKILLS.map((s) => (
          <section key={s} className="ih-card ih-info__card">
            <h3 className="ih-info__skill"><SectionTile section={s} size={32} iconSize={18} />{s[0].toUpperCase() + s.slice(1)}</h3>
            <p>{x(s === 'writing' ? `tips.writing.${tr}` : `tips.${s}`)}</p>
          </section>
        ))}
      </div>
    )
  } else if (chapter === 'reg') {
    body = (
      <>
        <p className="ih-info__lead">{x('reg.intro')}</p>
        <div className="ih-info__pair">
          {[['idp', 'IDP IELTS Kazakhstan'], ['britishCouncil', 'British Council Kazakhstan']].map(([k, name]) => (
            <section key={k} className="ih-card ih-info__card">
              <h3>{name}</h3>
              <div className="ih-info__btns"><Ext href={L[k]}>{x('reg.open')}</Ext></div>
            </section>
          ))}
        </div>
        <p className="ih-muted">{x('reg.noPrices')}</p>
        <h3 className="ih-info__h">{x('reg.stepsTitle')}</h3>
        <ol className="ih-info__list">
          {REG_STEPS.map((n) => <li key={n}>{x(`reg.step.${n}`, { track: trackName })}</li>)}
        </ol>
        <h3 className="ih-info__h">{x('reg.formatsTitle')}</h3>
        <div className="ih-info__pair">
          {['cd', 'paper'].map((k) => (
            <section key={k} className="ih-card ih-info__card">
              <h3>{x(`reg.${k}.title`)}</h3>
              <p>{x(`reg.${k}.text`)}</p>
            </section>
          ))}
        </div>
        <section className="ih-card ih-info__card ih-info__card--gold">
          <h3>{x('reg.osr.title')}</h3>
          <p>{x('reg.osr.text')}</p>
          <div className="ih-info__btns">
            <Ext href={L.osrIdp}>IDP</Ext>
            <Ext href={L.osrBritishCouncil}>British Council</Ext>
          </div>
        </section>
        {/* миграционные требования нужны только General Training — Academic для миграции не берут */}
        {tr === 'gt' && (
          <section className="ih-card ih-info__card ih-info__card--violet">
            <h3>{x('reg.mig.title')}</h3>
            <p>{x('reg.mig.text')}</p>
            <div className="ih-info__links">
              <Ext href={L.migrationCanada}>{x('reg.mig.canada')}</Ext>
              <Ext href={L.migrationAustralia}>{x('reg.mig.australia')}</Ext>
            </div>
          </section>
        )}
      </>
    )
  } else if (chapter === 'day') {
    body = (
      <>
        <p className="ih-info__lead"><b>{x('day.arrive')}</b></p>
        <p className="ih-info__warn">{x('day.late')}</p>
        <h3 className="ih-info__h">{x('day.bringTitle')}</h3>
        <ul className="ih-info__list">{BRING.map((k) => <li key={k}>{x(`day.bring.${k}`)}</li>)}</ul>
        <h3 className="ih-info__h">{x('day.rulesTitle')}</h3>
        <ul className="ih-info__list">{RULES.map((k) => <li key={k}>{x(`day.rules.${k}`)}</li>)}</ul>
      </>
    )
  } else if (chapter === 'checklists') {
    body = (
      <div className="ih-info__grid">
        {Object.entries(CHECK).map(([when, items]) => (
          <section key={when} className="ih-card ih-info__card">
            <h3>{x(`check.${when}.title`)}</h3>
            <ul className="ih-info__checks">
              {items.map((k) => (
                <li key={k}><CheckIcon size={18} /><span>{x(`check.${when}.${k}`)}</span></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  } else {
    body = (
      <>
        {FAQ.map((k) => (
          <section key={k} className="ih-card ih-info__card">
            <h3>{x(`faq.${k}.q`)}</h3>
            <p>{x(`faq.${k}.a`)}</p>
          </section>
        ))}
        <h3 className="ih-info__h">{x('links.official')}</h3>
        <div className="ih-info__links">
          <Ext href={L.writingDescriptors}>{x('links.wd')}</Ext>
          <Ext href={L.speakingDescriptors}>{x('links.sd')}</Ext>
          <Ext href={L.freePractice}>{x('links.free')}</Ext>
        </div>
      </>
    )
  }

  return body
}
