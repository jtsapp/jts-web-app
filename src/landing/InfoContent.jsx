// Содержимое страниц /info/<страница> (маршрут src/app/info/[page]/page.jsx).
// Серверный компонент без состояния: всё, что видит проверяющий из платёжного
// провайдера, есть в HTML с сервера.
import { CATALOG_CATEGORIES, formatPrice, offerCategory, pricePerLesson } from '../data/pricing.js'
import { legalDocumentUrl } from '../lib/legalDocuments.js'
import { COMPANY, COMPANY_TEXT } from './company.js'
import { INFO_PAGES, infoUrl, pickInfo } from './info.js'
import PaymentLogos from './PaymentLogos.jsx'

// Разделы прайса в порядке витрины приложения; неизвестная категория — в
// «Другие предложения», а не молча мимо: цена на сайте должна быть у всего,
// что продаётся.
export function groupOffers(offers) {
  const groups = new Map(CATALOG_CATEGORIES.map((cat) => [cat, []]))
  groups.set('OTHER', [])
  for (const offer of offers) {
    const cat = offerCategory(offer)
    groups.get(groups.has(cat) ? cat : 'OTHER').push(offer)
  }
  return [...groups].filter(([, list]) => list.length > 0)
}

// Формат и цена за занятие: у SAT названия группового и индивидуального
// пакетов совпадают, различает их только формат.
function offerNote(o, t) {
  const parts = []
  if (t.kinds[o.kind]) parts.push(t.kinds[o.kind])
  if (o.lessons > 1) parts.push(t.perLesson.replace('{n}', formatPrice(pricePerLesson(o))))
  return parts.join(' · ')
}

function Tariffs({ t, offers }) {
  return (
    <>
      {offers?.length ? groupOffers(offers).map(([cat, list]) => {
        const meta = t.categories[cat] || t.categories.OTHER
        return (
          <section key={cat} className="ld-info__block">
            <h2>{meta.title}</h2>
            {meta.text && <p>{meta.text}</p>}
            <ul className="ld-info__prices">
              {list.map((o) => (
                <li key={o.code}>
                  <span className="ld-info__offer">
                    <b>{o.title}</b>
                    <small>{offerNote(o, t)}</small>
                  </span>
                  <span className="ld-info__price">
                    {o.previousPrice > o.price && <s aria-label={t.priceFrom}>{formatPrice(o.previousPrice)} ₸</s>}
                    <b>{formatPrice(o.price)} ₸</b>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      }) : <p className="ld-info__warn">{t.unavailable}</p>}
      <ul className="ld-info__notes">
        {t.notes.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </>
  )
}

function Sections({ sections }) {
  return sections.map((s) => (
    <section key={s.h} className="ld-info__block">
      <h2>{s.h}</h2>
      {s.p?.map((p) => <p key={p}>{p}</p>)}
      {s.ol && <ol>{s.ol.map((li) => <li key={li}>{li}</li>)}</ol>}
      {s.ul && <ul className="ld-info__list">{s.ul.map((li) => <li key={li}>{li}</li>)}</ul>}
      {s.warn && <p className="ld-info__warn">{s.warn}</p>}
    </section>
  ))
}

function ContactsList({ t }) {
  return (
    <dl className="ld-info__dl">
      <dt>{t.email}</dt>
      <dd><a href={'mailto:' + COMPANY.email}>{COMPANY.email}</a></dd>
      <dt>{t.phone}</dt>
      <dd><a href={COMPANY.phoneHref}>{COMPANY.phone}</a></dd>
      <dt>{t.whatsapp}</dt>
      <dd><a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.writeWhatsapp}</a></dd>
    </dl>
  )
}

function Contacts({ t, lang }) {
  const co = COMPANY_TEXT[lang] || COMPANY_TEXT.ru
  return (
    <>
      <section className="ld-info__block">
        <h2>{t.contactsTitle}</h2>
        <ContactsList t={t} />
        <dl className="ld-info__dl">
          <dt>{t.address}</dt>
          <dd>{co.address}</dd>
          <dt>{t.site}</dt>
          <dd><a href={COMPANY.site}>{COMPANY.site.replace('https://', '')}</a></dd>
        </dl>
        <p>{t.claims}</p>
      </section>
      <section className="ld-info__block">
        <h2>{t.requisitesTitle}</h2>
        <dl className="ld-info__dl">
          <dt>{t.company}</dt>
          <dd>{co.name}</dd>
          <dt>{t.iin}</dt>
          <dd>{COMPANY.iin}</dd>
          <dt>{t.registration}</dt>
          <dd>{co.registration}</dd>
          <dt>{t.address}</dt>
          <dd>{co.address}</dd>
          <dt>{t.bank}</dt>
          <dd>{co.bank}</dd>
          <dt>{t.iik}</dt>
          <dd>{COMPANY.iik}</dd>
          <dt>{t.bik}</dt>
          <dd>{COMPANY.bik}</dd>
          <dt>{t.kbe}</dt>
          <dd>{COMPANY.kbe}</dd>
        </dl>
      </section>
    </>
  )
}

export default function InfoContent({ page, lang, offers, home }) {
  const info = pickInfo(lang)
  const t = info[page]
  return (
    <div className="ld-info__wrap">
      <a className="ld-info__back" href={home}>← {info.back}</a>
      <h1>{t.title}</h1>
      <p className="ld-info__lead">{t.lead}</p>

      {/* Соседние страницы — проверяющий обходит их по очереди. */}
      <nav className="ld-info__tabs" aria-label={info.nav.title}>
        {INFO_PAGES.map((p) => (
          <a key={p} href={infoUrl(p, lang)} aria-current={p === page ? 'page' : undefined}>{info.nav[p]}</a>
        ))}
      </nav>

      {(page === 'tariffs' || page === 'payment') && <PaymentLogos label={info.cards} className="ld-info__cards" />}

      {page === 'tariffs' && <Tariffs t={t} offers={offers} />}
      {(page === 'payment' || page === 'refund') && <Sections sections={t.sections} />}
      {page === 'refund' && (
        <section className="ld-info__block">
          <h2>{info.contacts.contactsTitle}</h2>
          <ContactsList t={info.contacts} />
        </section>
      )}
      {page === 'contacts' && <Contacts t={t} lang={lang} />}

      <section className="ld-info__block">
        <h2>{info.docs.title}</h2>
        <ul className="ld-info__docs">
          <li><a href={legalDocumentUrl('offer', lang)} target="_blank" rel="noopener noreferrer">{info.docs.offer}</a></li>
          <li><a href={legalDocumentUrl('privacy', lang)} target="_blank" rel="noopener noreferrer">{info.docs.privacy}</a></li>
          <li><a href={legalDocumentUrl('payment-security', lang)} target="_blank" rel="noopener noreferrer">{info.docs.paymentSecurity}</a></li>
        </ul>
      </section>
    </div>
  )
}
