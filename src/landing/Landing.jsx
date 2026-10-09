// Лендинг по макету Figma «Landing» (pitch JTS (Copy), кадр 5688:2728 —
// десктоп 1440, кадр 5748:6355 — телефон 390). Серверный компонент: страница
// статична, интерактив (вкладки разделов, лента преподавателей, форма) —
// в своих клиентских островках.
//
// Картинки — экспорт из Figma как есть (public/landing/img), не пересборка:
// маскоты, фото, превью разделов и карта острова — растр рендера макета.
import { PRIVACY_URL, SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import LibraryTabs from './LibraryTabs.jsx'
import TeachersCarousel from './TeachersCarousel.jsx'
import TrialForm from './TrialForm.jsx'

const IMG = '/landing/img/'
const IC = '/landing/icons/'

// В макете нет адресов Instagram и публичной оферты; пока их нет, пункт
// подвала остаётся текстом, а не ссылкой в никуда.
const INSTAGRAM_URL = null
const OFFER_URL = null

function Icon({ src, size, className }) {
  return <img className={className} src={src} width={size} height={size} alt="" aria-hidden="true" />
}

function Header({ c, lang, links }) {
  return (
    <header className="ld-header">
      <div className="ld-header__bar">
        <a className="ld-header__logo" href="#top" aria-label="Just to Study">
          <img src={IC + 'logo.svg'} width="168" height="34" alt="Just to Study" />
        </a>
        <div className="ld-header__right">
          <nav className="ld-lang" aria-label="Язык">
            <a className={'ld-lang__opt' + (lang === 'ru' ? ' is-on' : '')} href={links.langRu} hrefLang="ru">{c.nav.langRu}</a>
            <a className={'ld-lang__opt' + (lang === 'kz' ? ' is-on' : '')} href={links.langKz} hrefLang="kk">{c.nav.langKz}</a>
          </nav>
          <div className="ld-header__btns">
            <a className="ld-btn ld-btn--ghost" href={links.login}>{c.nav.login}</a>
            <a className="ld-btn ld-btn--primary" href={links.start}>{c.nav.start}</a>
          </div>
        </div>
      </div>
    </header>
  )
}

function HeroVisual({ h }) {
  return (
    <div className="ld-hero__visual" aria-hidden="true">
      <picture>
        <source media="(max-width: 560px)" srcSet={IC + 'hero-blob-m.svg'} />
        <img className="ld-hero__blob" src={IC + 'hero-blob.svg'} alt="" />
      </picture>
      <picture>
        <source media="(max-width: 560px)" srcSet={IMG + 'hero-photo-m.webp'} />
        <img className="ld-hero__photo" src={IMG + 'hero-photo.webp'} alt="" fetchPriority="high" />
      </picture>
      <div className="ld-plan">
        <div className="ld-plan__title">{h.plan.title}</div>
        {h.plan.items.map((it) => (
          <div key={it.text} className={'ld-plan__row' + (it.accent ? ' is-accent' : '')}>
            {it.done
              ? <img className="ld-plan__box" src={IC + 'ic-checkbox-on.svg'} alt="" />
              : <span className={'ld-plan__box ld-plan__box--empty' + (it.accent ? ' is-accent' : '')} />}
            <span>{it.text}</span>
          </div>
        ))}
      </div>
      <div className="ld-program">
        <div className="ld-program__label">{h.program.label}</div>
        <div className="ld-program__levels">
          <span>{h.program.from}</span>
          <img src={IC + 'ic-arrow-line.svg'} alt="" />
          <b>{h.program.to}</b>
        </div>
        <div className="ld-program__bar"><i /></div>
        <div className="ld-program__label">{h.program.week}</div>
      </div>
    </div>
  )
}

function Hero({ c }) {
  const h = c.hero
  return (
    <section className="ld-hero">
      <HeroVisual h={h} />
      <div className="ld-hero__text">
        <div className="ld-hero__head">
          <h1 className="ld-hero__title">
            {h.title.map((line) => <span key={line}>{line} </span>)}
            <em>{h.accent}</em>
          </h1>
          <p className="ld-hero__lead">{h.lead}</p>
        </div>
        <div className="ld-hero__cta">
          <a className="ld-cta" href="#trial">
            <span>{h.cta}</span>
            <span className="ld-cta__arrow"><Icon src={IC + 'ic-arrow-hero.svg'} size={22} /></span>
          </a>
          <ul className="ld-hero__checks">
            {h.checks.map((t) => (
              <li key={t}><Icon src={IC + 'ic-check-circle-hero.svg'} size={18} />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Perks({ c }) {
  return (
    <section className="ld-perks">
      {c.perks.map((p) => (
        <article key={p.title} className="ld-perk">
          <img className="ld-perk__img" src={p.img} width="112" height="112" alt="" />
          <div className="ld-perk__body">
            <h3 className="ld-perk__title">{p.title}</h3>
            <p className="ld-perk__text">{p.text}</p>
          </div>
        </article>
      ))}
    </section>
  )
}

function Pain({ p }) {
  return (
    <article className={'ld-pain' + (p.dark ? ' ld-pain--dark' : '')}>
      <div className="ld-pain__tag">
        <span className="ld-pain__icon"><Icon src={p.icon} size={18} /></span>
        {p.tag}
      </div>
      <p className="ld-pain__quote">{p.quote}</p>
      <div className="ld-pain__fix">
        <span className="ld-pain__check"><Icon src={IC + 'ic-check-white.svg'} size={16} /></span>
        <p>{p.fix}</p>
      </div>
    </article>
  )
}

function Pains({ c }) {
  const p = c.pains
  const [a, b, d, e] = p.items
  return (
    <section className="ld-band ld-band--grey ld-pains">
      <div className="ld-pains__grid">
        <div className="ld-pains__intro">
          <h2 className="ld-h2 ld-pains__title">{p.title}<em>{p.accent}</em></h2>
          <p className="ld-pains__lead">{p.lead}</p>
        </div>
        <Pain p={a} />
        <Pain p={b} />
        <div className="ld-mascot">
          <span className="ld-mascot__halo" />
          <img className="ld-mascot__img" src={IMG + 'dexter.webp'} alt="" />
          <p className="ld-mascot__bubble">{p.mascot.bubble}</p>
          <a className="ld-mascot__btn" href="#trial">
            {p.mascot.cta}
            <span className="ld-mascot__arrow"><Icon src={IC + 'ic-arrow-sm.svg'} size={16} /></span>
          </a>
        </div>
        <Pain p={d} />
        <Pain p={e} />
      </div>
    </section>
  )
}

function Heading({ title, lead, className = '' }) {
  return (
    <div className={'ld-heading ' + className}>
      <h2 className="ld-h2">{title}</h2>
      {lead && <p className="ld-heading__lead">{lead}</p>}
    </div>
  )
}

// Высоты столбиков формы волны — из макета (5688:2800), сверху вниз по центру.
const WAVE = [8, 14, 22, 30, 38, 26, 34, 44, 30, 20, 36, 28, 18, 12, 24, 16, 10]
// Столбики прогресса (5688:2898): левый край и высота от верха группы 299×218.
const BARS = [[0, 120, 73], [53, 95, 105], [105, 103, 89], [158, 55, 137], [210, 33, 170], [263, 0, 218]]

function Bento({ c }) {
  const p = c.platform
  const hw = p.homework
  return (
    <div className="ld-bento">
      <div className="ld-bento__col">
        <article className="ld-card ld-card--tutor">
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.tutor.title}</h3>
            <p className="ld-card__text">{p.tutor.text}</p>
          </div>
          <div className="ld-tutor__row" aria-hidden="true">
            <img className="ld-tutor__ava" src={IMG + 'b-aizere.webp'} width="60" height="60" alt="" />
            <div className="ld-tutor__wave">{WAVE.map((h, i) => <i key={i} style={{ height: h }} />)}</div>
            <span className="ld-tutor__mic"><Icon src={IC + 'ic-mic-26.svg'} size={26} /></span>
          </div>
        </article>
        <article className="ld-card ld-card--club">
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.club.title}</h3>
            <p className="ld-card__text">{p.club.text}</p>
          </div>
          <div className="ld-club__faces" aria-hidden="true">
            {['b-t2', 'b-t4', 'b-t1', 'b-t3'].map((f) => <img key={f} src={IMG + f + '.webp'} width="36" height="36" alt="" />)}
            <span>{p.club.more}</span>
          </div>
        </article>
        <article className="ld-card ld-card--device">
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.device.title}</h3>
            <p className="ld-card__text">{p.device.text}</p>
          </div>
          <img className="ld-device__shot" src={IMG + 'b-platform.webp'} alt="" />
        </article>
      </div>

      <div className="ld-bento__col">
        <article className="ld-card ld-card--lessons">
          <img className="ld-card__bg" src={IMG + 'b-call.webp'} alt="" />
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.lessons.title}</h3>
            <p className="ld-card__text">{p.lessons.text}</p>
          </div>
          <div className="ld-call" aria-hidden="true">
            <span className="ld-call__btn"><Icon src={IC + 'ic-call-mic.svg'} size={22} /></span>
            <span className="ld-call__btn"><Icon src={IC + 'ic-call-cam.svg'} size={22} /></span>
            <span className="ld-call__btn ld-call__btn--end"><Icon src={IC + 'ic-call-phone.svg'} size={22} /></span>
          </div>
        </article>
        <article className="ld-card ld-card--homework">
          <div className="ld-card__head">
            <h3 className="ld-card__title">{hw.title}</h3>
            <p className="ld-card__text">{hw.text}</p>
          </div>
          <div className="ld-score">
            <div className="ld-score__top">
              <span className="ld-score__num">{hw.score}</span>
              <span className="ld-score__unit">{hw.unit}</span>
              <span className="ld-score__badge"><Icon src={IC + 'ic-check-green.svg'} size={14} />{hw.badge}</span>
            </div>
            <div className="ld-score__caption">{hw.caption}</div>
            <div className="ld-score__grid">
              {hw.skills.map((s) => (
                <div key={s.name} className="ld-score__cell">
                  <span>{s.name}</span>
                  <b className={s.low ? 'is-low' : ''}>{s.value}</b>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="ld-bento__col">
        <article className="ld-card ld-card--situations">
          <img className="ld-card__bg" src={IMG + 'b-airport.webp'} alt="" />
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.situations.title}</h3>
            <p className="ld-card__text">{p.situations.text}</p>
          </div>
        </article>
        <article className="ld-card ld-card--progress">
          <div className="ld-progress__text">
            <h3 className="ld-card__title">{p.progress.title[0]}<br />{p.progress.title[1]}</h3>
            <p className="ld-card__text">{p.progress.text}</p>
          </div>
          <div className="ld-progress__bars" aria-hidden="true">
            {BARS.map(([x, y, h], i) => <i key={i} style={{ left: x, top: y, height: h }} />)}
          </div>
        </article>
        <article className="ld-card ld-card--vocab">
          <div className="ld-card__head">
            <h3 className="ld-card__title">{p.vocab.title}</h3>
            <p className="ld-card__text">{p.vocab.text}</p>
          </div>
          <div className="ld-vocab" aria-hidden="true">
            <span className="ld-vocab__back ld-vocab__back--1" />
            <span className="ld-vocab__back ld-vocab__back--2" />
            <div className="ld-vocab__card">
              <div className="ld-vocab__word">{p.vocab.word}<Icon src={IC + 'ic-headphones.svg'} size={20} /></div>
              <div className="ld-vocab__ipa">{p.vocab.ipa}</div>
            </div>
          </div>
        </article>
      </div>

      <div className="ld-bento__row">
        <article className="ld-card ld-card--schedule">
          <div className="ld-schedule__head">
            <h3 className="ld-schedule__title">{p.schedule.title}</h3>
            <p className="ld-card__text">{p.schedule.text}</p>
          </div>
          <div className="ld-schedule__list" aria-hidden="true">
            <div className="ld-schedule__track">
              {p.schedule.items.map((it, i) => (
                <div key={i} className={'ld-lesson' + (it.current ? ' is-current' : '')}>
                  <div className="ld-tear">
                    <span className="ld-tear__month">{p.schedule.month}</span>
                    <span className="ld-tear__day">{it.day}</span>
                  </div>
                  <div className="ld-lesson__text">
                    <b>{it.title}</b>
                    <span>{it.when}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="ld-card ld-card--map">
          <div className="ld-map__text">
            <span className="ld-chip ld-chip--white">{p.map.chip}</span>
            <h3 className="ld-map__title">{p.map.title}</h3>
            <p className="ld-map__lead">{p.map.text}</p>
            <span className="ld-chip ld-chip--white ld-map__range"><Icon src={IC + 'ic-trending.svg'} size={18} />{p.map.range}</span>
          </div>
          <img className="ld-map__island" src={IMG + 'b-island.webp'} alt="" />
        </article>
      </div>
    </div>
  )
}

// Перевод строки в тексте → <br>, который виден только на десктопе.
function lines(text) {
  // Пробел перед <br>: на телефоне <br> скрыт, и без пробела слова склеились бы.
  return text.split('\n').flatMap((part, i) => (i ? [' ', <br key={i} className="ld-br-desk" />, part] : [part]))
}

function Platform({ c }) {
  const p = c.platform
  return (
    <section className="ld-band ld-platform" id="platform">
      <Heading title={p.title} lead={p.lead} />
      <div className="ld-flow">
        <p className="ld-flow__title"><span>{p.flowTitle[0]}</span> {p.flowTitle[1]}</p>
        <ol className="ld-flow__steps">
          {p.flow.map((s, i) => (
            <li key={s.title} className="ld-flow__step">
              <span className="ld-flow__num">{i + 1}</span>
              <span className="ld-flow__text"><b>{lines(s.title)}</b><span>{s.sub}</span></span>
              {i < p.flow.length - 1 && <Icon className="ld-flow__arrow" src={IC + 'ic-arrow-flow.svg'} size={18} />}
            </li>
          ))}
        </ol>
      </div>
      <Bento c={c} />
    </section>
  )
}

function Library({ c }) {
  const l = c.library
  return (
    <section className="ld-band ld-band--grey ld-library" id="library">
      <div className="ld-library__head">
        <span className="ld-chip">{l.chip}</span>
        <h2 className="ld-h2 ld-library__title">{l.title}<em>{l.accent}</em></h2>
        <p className="ld-library__lead">{l.lead}</p>
      </div>
      <LibraryTabs label={l.listLabel} sections={l.sections} checkIcon={IC + 'ic-bullet-check.svg'} />
    </section>
  )
}

function Teachers({ c }) {
  const t = c.teachers
  return (
    <section className="ld-band ld-teachers" id="teachers">
      <Heading title={t.title} lead={t.lead} />
      <TeachersCarousel t={t} icons={{
        school: IC + 'ic-school.svg', forum: IC + 'ic-forum.svg', check: IC + 'ic-check-circle-t.svg',
        prev: IC + 'ic-chevron-left.svg', next: IC + 'ic-chevron-right.svg',
      }} />
    </section>
  )
}

function Story({ s }) {
  return (
    <article className="ld-story">
      <div className="ld-story__head">
        {s.photo
          ? <img className="ld-story__ava" src={s.photo} width="48" height="48" alt="" />
          : <span className="ld-story__ava ld-story__ava--letter">{s.initial}</span>}
        <div>
          <div className="ld-story__name">{s.name}</div>
          <span className="ld-story__tag">{s.tag}</span>
        </div>
      </div>
      <p className="ld-story__text">{s.text}</p>
    </article>
  )
}

function Stories({ c }) {
  const s = c.stories
  return (
    <section className="ld-band ld-band--grey ld-stories" id="stories">
      <Heading title={s.title} lead={s.lead} />
      <div className="ld-stories__cols">
        {s.columns.map((col, i) => (
          <div key={i} className="ld-stories__col">
            {col.map((st) => <Story key={st.name} s={st} />)}
          </div>
        ))}
      </div>
    </section>
  )
}

function Trial({ c, lang }) {
  const t = c.trial
  return (
    <section className="ld-trial" id="trial">
      <span className="ld-trial__ring ld-trial__ring--1" aria-hidden="true" />
      <span className="ld-trial__ring ld-trial__ring--2" aria-hidden="true" />
      <div className="ld-trial__inner">
        <div className="ld-trial__left">
          <span className="ld-chip ld-chip--dark"><Icon src={IC + 'ic-lock.svg'} size={18} />{t.chip}</span>
          <h2 className="ld-h2 ld-trial__title">{t.title}<em>{t.accent}</em></h2>
          <p className="ld-trial__lead">{t.lead}</p>
          <ul className="ld-trial__features">
            {t.features.map((f) => <li key={f.text}><Icon src={f.icon} size={20} />{f.text}</li>)}
          </ul>
          <ol className="ld-trial__steps">
            {t.steps.map((s, i) => (
              <li key={s}>
                <span className={'ld-trial__num' + (i === t.steps.length - 1 ? ' is-last' : '')}>{i + 1}</span>
                {s}
                {i < t.steps.length - 1 && <Icon className="ld-trial__arrow" src={IC + 'ic-arrow-steps.svg'} size={16} />}
              </li>
            ))}
          </ol>
        </div>
        <TrialForm f={t.form} lang={lang} privacyUrl={PRIVACY_URL} mascot={IMG + 'aizere-form.webp'} icons={{
          person: IC + 'ic-person.svg', phone: IC + 'ic-call-form.svg', arrow: IC + 'ic-arrow-form.svg',
        }} />
      </div>
    </section>
  )
}

function Faq({ c }) {
  const f = c.faq
  return (
    <section className="ld-band ld-band--grey ld-faq" id="faq">
      <h2 className="ld-h2 ld-faq__title">{f.title}</h2>
      <div className="ld-faq__list">
        {/* Нативный аккордеон: name делает <details> взаимоисключающими —
            открыт один вопрос, как в макете, и без единой строки JS. */}
        {f.items.map((it, i) => (
          <details key={it.q} className="ld-qa" name="ld-faq" open={i === 0}>
            <summary className="ld-qa__q">
              {it.q}
              <span className="ld-qa__toggle" aria-hidden="true">
                <Icon className="ld-qa__plus" src={IC + 'ic-add.svg'} size={22} />
                <i className="ld-qa__minus" />
              </span>
            </summary>
            <p className="ld-qa__a">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Footer({ c }) {
  const f = c.footer
  const phoneHref = 'tel:+' + f.phone.replace(/\D/g, '')
  return (
    <footer className="ld-footer">
      <img className="ld-footer__logo" src={IC + 'logo-big.svg'} width="1000" height="200" alt="Just to Study" />
      <div className="ld-footer__grid">
        <nav className="ld-footer__nav" aria-label={f.navTitle}>
          <div className="ld-footer__label">{f.navTitle}</div>
          <div className="ld-footer__navcols">
            {f.nav.map((col, i) => (
              <ul key={i}>
                {col.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            ))}
          </div>
        </nav>
        <div className="ld-footer__contacts">
          <div className="ld-footer__label">{f.contactsTitle}</div>
          <ul>
            <li><a href={phoneHref}>{f.phone}</a></li>
            <li><a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{f.whatsapp}</a></li>
            <li>{INSTAGRAM_URL ? <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{f.instagram}</a> : <span>{f.instagram}</span>}</li>
          </ul>
        </div>
      </div>
      <div className="ld-footer__bottom">
        <span>{f.copy}</span>
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">{f.privacy}</a>
        {OFFER_URL ? <a href={OFFER_URL} target="_blank" rel="noopener noreferrer">{f.offer}</a> : <span>{f.offer}</span>}
      </div>
    </footer>
  )
}

// links — куда ведут «Войти» и «Начать обучение»: на домене лендинга это
// адрес приложения (см. appLink в hostRouting.js); langRu/langKz — ҚАЗ/РУС
// с теми же метками рекламы.
export default function Landing({ c, lang, links }) {
  return (
    // <html lang> задаёт общий layout приложения (ru) — язык страницы
    // уточняем на корне: по нему браузер и скринридеры выбирают произношение.
    <div className="ld" id="top" lang={lang === 'kz' ? 'kk' : 'ru'}>
      <Header c={c} lang={lang} links={links} />
      <main>
        <Hero c={c} />
        <Perks c={c} />
        <Pains c={c} />
        <Platform c={c} />
        <Library c={c} />
        <Teachers c={c} />
        <Stories c={c} />
        <Trial c={c} lang={lang} />
        <Faq c={c} />
      </main>
      <Footer c={c} />
      {/* Нижняя панель телефона из макета (Buttonbar 5748:7131): на десктопе
          эти кнопки живут в шапке. */}
      <div className="ld-mbar">
        <a className="ld-btn ld-btn--ghost" href={links.login}>{c.nav.login}</a>
        <a className="ld-btn ld-btn--primary" href={links.start}>{c.nav.start}</a>
      </div>
    </div>
  )
}
