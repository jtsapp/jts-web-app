import { useState, useEffect, useMemo } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  PlayIcon,
  EyeIcon,
  VolumeIcon,
  ChevronRightCircleIcon,
} from '../components/icons.jsx'
import {
  getPracticeToken,
  getVideoLessons,
  getMediaClips,
  getSituativki,
  getSavedWords,
} from '../api.js'

// Просмотры: 1331 → «1 331», 12000 → «12 тыс», 3400000 → «3.4 млн»
function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)} млн`
  if (v >= 10_000) return `${Math.round(v / 1000)} тыс`
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// CEFR-уровень → сложность (кол-во точек + подпись)
function difficulty(level) {
  const l = String(level || '').toUpperCase()
  if (l.startsWith('C')) return { dots: 3, label: 'Тяжело' }
  if (l.startsWith('B')) return { dots: 2, label: 'Средне' }
  return { dots: 1, label: 'Легко' }
}

function Dots({ level }) {
  const { dots, label } = difficulty(level)
  return (
    <span className="pp-dots">
      <span className="pp-dots__row">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < dots ? 'on' : ''} />
        ))}
      </span>
      {label}
    </span>
  )
}

// Плитка-обёртка с фолбэком, если картинки нет
function Thumb({ src, alt, className, children }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`pp-thumb ${className || ''}`}>
      {ok && src ? (
        <img src={src} alt={alt || ''} loading="lazy" onError={() => setOk(false)} />
      ) : (
        <div className="pp-thumb__ph" />
      )}
      {children}
    </div>
  )
}

function SectionHead({ title, onAll }) {
  return (
    <div className="pp-sec__head">
      <h2>{title}</h2>
      <button className="pp-all" onClick={onAll}>
        Посмотреть все <ChevronRightCircleIcon size={18} />
      </button>
    </div>
  )
}

function Rail({ children }) {
  return <div className="pp-rail">{children}</div>
}

// Проговаривание слова браузером (бэкенд не отдаёт аудио для словаря)
function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* нет поддержки — молча пропускаем */
  }
}

export default function PracticePage({ userLevel = 'A1', userName, token, onNav }) {
  const { t } = useI18n()
  const [state, setState] = useState({ loading: true, error: '' })
  const [videos, setVideos] = useState([])
  const [clips, setClips] = useState([])
  const [situations, setSituations] = useState([])
  const [words, setWords] = useState([])
  const [tab, setTab] = useState('saved') // 'saved' | 'learned'

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: '' })
    getPracticeToken(token)
      .then((tok) => {
        // Тянем всё параллельно; отдельные сбои не роняют страницу целиком.
        const pull = (fn, set) =>
          fn(tok)
            .then((d) => alive && set(Array.isArray(d) ? d : d?.content || d?.items || []))
            .catch(() => {})
        return Promise.all([
          pull((k) => getVideoLessons(k), setVideos),
          pull((k) => getMediaClips(k), setClips),
          pull((k) => getSituativki(k, userLevel), setSituations),
          pull((k) => getSavedWords(k), setWords),
        ])
      })
      .then(() => alive && setState({ loading: false, error: '' }))
      .catch((e) =>
        alive && setState({ loading: false, error: e?.message || 'Не удалось загрузить контент' })
      )
    return () => {
      alive = false
    }
  }, [token, userLevel])

  const saved = words
  const learned = useMemo(() => words.filter((w) => w.learned), [words])
  const list = tab === 'learned' ? learned : saved

  const chips = ['Видеоклипы', 'Ситуации', 'Сказки', 'Мемы и рилсы', 'Книжки']
  const [chip, setChip] = useState('Видеоклипы')

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" onNav={onNav} onProfile={() => {}}>
      <div className="pp pp--enter">
        {/* ───── Центр: ленты контента ───── */}
        <div className="pp__center">
          <h1 className="pp__title">Практика</h1>

          <div className="pp-chips">
            {chips.map((c) => (
              <button
                key={c}
                className={`pp-chip ${chip === c ? 'pp-chip--on' : ''}`}
                onClick={() => {
                  setChip(c)
                  jump('sec-' + c)
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {state.error && <div className="pp-note pp-note--err">{state.error}</div>}

          {/* Видеоклипы */}
          <section id="sec-Видеоклипы" className="pp-sec">
            <SectionHead title="Видеоклипы" onAll={() => jump('sec-Видеоклипы')} />
            {videos.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {videos.map((v) => (
                  <a
                    key={v.id}
                    className="pp-vcard"
                    href={v.videoUrl || (v.youtubeKey ? `https://youtu.be/${v.youtubeKey}` : '#')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Thumb src={v.thumbnailUrl} alt={v.title} className="pp-thumb--16x9">
                      <span className="pp-play"><PlayIcon size={22} /></span>
                    </Thumb>
                    <div className="pp-vcard__title">{v.title}</div>
                    <div className="pp-vcard__meta">
                      <span className="pp-views"><EyeIcon size={14} /> {formatViews(v.views)}</span>
                      <Dots level={v.level} />
                    </div>
                  </a>
                ))}
              </Rail>
            )}
          </section>

          {/* Мемы и рилсы */}
          <section id="sec-Мемы и рилсы" className="pp-sec">
            <SectionHead title="Мемы и рилсы" onAll={() => jump('sec-Мемы и рилсы')} />
            {clips.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {clips.map((c) => (
                  <a
                    key={c.id}
                    className="pp-mcard"
                    href={c.mediaUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Thumb src={c.thumbnailUrl} alt={c.title} className="pp-thumb--portrait" />
                    <span className="pp-mcard__views"><EyeIcon size={13} /> {formatViews(c.views)}</span>
                  </a>
                ))}
              </Rail>
            )}
          </section>

          {/* Книжки — бэкенд пока не отдаёт (в мобилке это bundled-манифест) */}
          <section id="sec-Книжки" className="pp-sec">
            <SectionHead title="Книжки" onAll={() => {}} />
            <Empty loading={false} text="Раздел появится, когда книги заведут в админке" />
          </section>

          {/* Сказки — тоже без бэкенд-эндпоинта */}
          <section id="sec-Сказки" className="pp-sec">
            <SectionHead title="Сказки" onAll={() => {}} />
            <Empty loading={false} text="Раздел появится, когда сказки заведут в админке" />
          </section>

          {/* Ситуации */}
          <section id="sec-Ситуации" className="pp-sec">
            <SectionHead title="Ситуации" onAll={() => jump('sec-Ситуации')} />
            {situations.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {situations.map((s) => (
                  <a
                    key={s.id}
                    className="pp-scard"
                    href={s.videoUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Thumb src={s.coverUrl} alt={s.title} className="pp-thumb--situation" />
                    <div className="pp-scard__title">{s.title}</div>
                  </a>
                ))}
              </Rail>
            )}
          </section>
        </div>

        {/* ───── Правая колонка: Словарь ───── */}
        <aside className="pp__side">
          <h2 className="pp-voc__title">Словарь</h2>

          <div className="pp-voc__tabs">
            <button
              className={`pp-voc__tab ${tab === 'saved' ? 'on' : ''}`}
              onClick={() => setTab('saved')}
            >
              Сохранено <b>{saved.length}</b>
            </button>
            <button
              className={`pp-voc__tab ${tab === 'learned' ? 'on' : ''}`}
              onClick={() => setTab('learned')}
            >
              Изучено <b>{learned.length}</b>
            </button>
          </div>

          <div className="pp-voc__list">
            {list.length === 0 ? (
              <div className="pp-voc__empty">
                {state.loading ? 'Загрузка…' : 'Пока нет слов'}
              </div>
            ) : (
              list.map((w) => (
                <div key={w.id} className="pp-word">
                  <div className="pp-word__text">
                    <b>{w.word}</b>
                    <span>{w.translation}</span>
                  </div>
                  <button className="pp-word__say" onClick={() => speak(w.word)} aria-label="Прослушать">
                    <VolumeIcon size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button className="pp-voc__cta">Практика по словарю</button>
        </aside>
      </div>
    </LearningLayout>
  )
}

function Empty({ loading, text }) {
  return (
    <div className="pp-empty">
      {loading ? 'Загрузка…' : text || 'Нет данных'}
    </div>
  )
}
