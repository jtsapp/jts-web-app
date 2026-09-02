import { useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'
import PaymentMethodModal from '../components/PaymentMethodModal.jsx'
import {
  BONUSES,
  CURRENCY,
  GROUP,
  INCLUDED,
  INDIVIDUAL_DURATIONS,
  SELF_STUDY,
  formatPrice,
  individualPlans,
} from '../data/pricing.js'
import { addItem, cartCount, cartTotal, qtyOf, removeItem, setQty } from '../lib/cart.js'

// Витрина тарифов (макет демо-доступа, экраны 4-5). Сюда ведут все призывы
// «открыть полный доступ»: плашка демо на «Главной», скидка в сайдбаре и кнопка
// «Приобрести подписку» в окне демо-лимита.
//
// Каталог — статикой в data/pricing.js (там же объяснено почему), корзина —
// чистыми операциями в lib/cart.js. Здесь остаётся только вёрстка и решение,
// куда ведёт «Перейти к оплате».
export default function PricingPage({ onBack, onDone }) {
  const { t, lang } = useI18n()
  const [duration, setDuration] = useState(INDIVIDUAL_DURATIONS[0])
  const [items, setItems] = useState([])
  const [payOpen, setPayOpen] = useState(false)

  const individual = useMemo(() => individualPlans(duration), [duration])
  const total = cartTotal(items)
  const count = cartCount(items)

  const lessonsLabel = (n) => plural(t, lang, 'pricing.lessons', n)

  const add = (item) => setItems((prev) => addItem(prev, item))
  const bump = (id, delta) => setItems((prev) => setQty(prev, id, qtyOf(prev, id) + delta))

  const selfItem = (p) => ({
    id: p.id,
    kind: 'self',
    title: t('pricing.self'),
    subtitle: t(`pricing.self.n${p.levels}`),
    price: p.price,
  })
  const indItem = (p) => ({
    id: p.id,
    kind: 'ind',
    title: t('pricing.cart.ind'),
    subtitle: t('pricing.cart.indSub', { lessons: lessonsLabel(p.lessons), min: String(p.duration) }),
    price: p.price,
  })
  const groupItem = (p) => ({
    id: p.id,
    kind: 'group',
    title: t('pricing.cart.group'),
    subtitle: t('pricing.cart.groupSub', { lessons: lessonsLabel(p.lessons) }),
    price: p.price,
  })

  // Оплаты внутри приложения нет: платёжного роута нет в src/app/api, и
  // абонемент студенту всё равно заводит менеджер руками в админке. Поэтому все
  // три способа сейчас ведут к менеджеру, но с уже собранным заказом в тексте —
  // человеку не приходится пересказывать, что он выбрал. Когда появится
  // настоящий чекаут, меняется только эта функция.
  const pay = (method) => {
    const lines = items.map(
      (x) => `• ${x.title} — ${x.subtitle} × ${x.qty} = ${formatPrice(x.price * x.qty)} ${CURRENCY}`,
    )
    const text = [
      t('pricing.cart'),
      ...lines,
      `${t('pricing.cart.total')}: ${formatPrice(total)} ${CURRENCY}`,
      `[${method}]`,
    ].join('\n')
    window.open(`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setPayOpen(false)
    onDone?.(method)
  }

  return (
    <div className="pr">
      <header className="pr__top">
        <button type="button" className="pr__back" onClick={onBack} aria-label={t('common.back')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="pr__title">{t('pricing.title')}</h1>
      </header>

      <div className="pr__grid">
        <div className="pr__cols">
          {/* ——— Self Study ——— */}
          <section className="pr-sec pr-sec--self">
            <h2 className="pr-sec__title">
              <SecIcon kind="self" />
              {t('pricing.self')}
            </h2>
            <div className="pr-tiles pr-tiles--4">
              {SELF_STUDY.map((p) => (
                <PlanTile
                  key={p.id}
                  title={t(`pricing.self.n${p.levels}`)}
                  price={p.price}
                  note={t('pricing.self.minutes', { n: String(p.tutorMinutes) })}
                  qty={qtyOf(items, p.id)}
                  onAdd={() => add(selfItem(p))}
                  onBump={(d) => bump(p.id, d)}
                  t={t}
                />
              ))}
            </div>
          </section>

          {/* ——— Индивидуальные ——— */}
          <section className="pr-sec pr-sec--ind">
            <div className="pr-sec__head">
              <h2 className="pr-sec__title">
                <SecIcon kind="ind" />
                {t('pricing.ind')}
              </h2>
              {/* Переключатель длительности урока: он меняет и цену, и то, что
                  попадёт в корзину, поэтому стоит в заголовке раздела, а не у
                  каждой плитки — иначе выбор пришлось бы повторять шесть раз. */}
              <div className="pr-toggle" role="group" aria-label={t('pricing.ind')}>
                {INDIVIDUAL_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`pr-toggle__btn${d === duration ? ' is-on' : ''}`}
                    aria-pressed={d === duration}
                    onClick={() => setDuration(d)}
                  >
                    {t('pricing.ind.duration', { n: String(d) })}
                  </button>
                ))}
              </div>
            </div>

            <div className="pr-tiles pr-tiles--3">
              {individual.map((p) => (
                <PlanTile
                  key={p.id}
                  title={lessonsLabel(p.lessons)}
                  price={p.price}
                  note={t('pricing.perLesson', { price: formatPrice(p.perLesson) })}
                  qty={qtyOf(items, p.id)}
                  onAdd={() => add(indItem(p))}
                  onBump={(d) => bump(p.id, d)}
                  t={t}
                />
              ))}
            </div>

            <div className="pr-extras">
              <ul className="pr-feats">
                <li><FeatIcon kind="teacher" />{t('pricing.ind.f1')}</li>
                <li><FeatIcon kind="calendar" />{t('pricing.ind.f2')}</li>
                <li><FeatIcon kind="mic" />{t('pricing.ind.f3')}</li>
              </ul>
              <Bonuses list={BONUSES.individual} t={t} />
            </div>
          </section>

          {/* ——— Групповые ——— */}
          <section className="pr-sec pr-sec--group">
            <h2 className="pr-sec__title">
              <SecIcon kind="group" />
              {t('pricing.group')}
            </h2>
            <div className="pr-tiles pr-tiles--3">
              {GROUP.map((p) => (
                <PlanTile
                  key={p.id}
                  accent
                  title={`${lessonsLabel(p.lessons)} · ${plural(t, lang, 'pricing.courses', p.courses)}`}
                  price={p.price}
                  note={t('pricing.perLesson', { price: formatPrice(p.perLesson) })}
                  qty={qtyOf(items, p.id)}
                  onAdd={() => add(groupItem(p))}
                  onBump={(d) => bump(p.id, d)}
                  t={t}
                />
              ))}
            </div>
            <div className="pr-extras">
              <ul className="pr-feats">
                <li><FeatIcon kind="mic" />{t('pricing.group.f1')}</li>
                <li><FeatIcon kind="gift" />{t('pricing.group.f2')}</li>
              </ul>
              <Bonuses list={BONUSES.group} t={t} />
            </div>
          </section>

          {/* ——— Входит в любой тариф ——— */}
          <section className="pr-inc">
            <h2 className="pr-inc__title">
              <CheckMark />
              {t('pricing.included')}
            </h2>
            <div className="pr-inc__grid">
              {INCLUDED.map((f) => (
                <div className="pr-inc__cell" key={f.id}>
                  <FeatIcon kind={f.icon} />
                  <span>
                    <b>{t(f.title)}</b>
                    <i>{t(f.sub)}</i>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ——— Корзина ——— */}
        <aside className="pr-cart">
          <div className="pr-cart__inner">
            <div className="pr-cart__head">
              <CartIcon />
              <b>{t('pricing.cart')}</b>
              {count > 0 && <span className="pr-cart__count">{count}</span>}
            </div>

            {count === 0 ? (
              <p className="pr-cart__empty">{t('pricing.cart.empty')}</p>
            ) : (
              <ul className="pr-cart__list">
                {items.map((x) => (
                  <li className="pr-line" key={x.id}>
                    <span className={`pr-line__ic pr-line__ic--${x.kind}`} aria-hidden="true">
                      <SecIcon kind={x.kind} />
                    </span>
                    <span className="pr-line__body">
                      <b>{x.title}</b>
                      <i>{x.subtitle}</i>
                    </span>
                    <button
                      type="button"
                      className="pr-line__del"
                      onClick={() => setItems((prev) => removeItem(prev, x.id))}
                      aria-label={t('pricing.cart.remove')}
                    >
                      <TrashMark />
                    </button>
                    <span className="pr-line__foot">
                      <Stepper qty={x.qty} onBump={(d) => bump(x.id, d)} t={t} />
                      <b className="pr-line__price">{formatPrice(x.price * x.qty)} {CURRENCY}</b>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pr-cart__total">
              <span>{t('pricing.cart.total')}</span>
              <b>{formatPrice(total)} {CURRENCY}</b>
            </div>

            <button
              type="button"
              className="pr-cart__pay"
              disabled={count === 0}
              onClick={() => setPayOpen(true)}
            >
              {t('pricing.cart.pay')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="pr-cart__note">
              <InfoMark />
              {t('pricing.cart.note')}
            </p>
          </div>
        </aside>
      </div>

      {payOpen && <PaymentMethodModal onClose={() => setPayOpen(false)} onPick={pay} />}
    </div>
  )
}

// Плитка тарифа. Пока пакет не в заказе — «+»; после добавления на его месте
// счётчик «− n +», чтобы не приходилось искать количество в корзине.
function PlanTile({ title, price, note, qty, onAdd, onBump, accent = false, t }) {
  const chosen = qty > 0
  return (
    <div className={`pr-tile${chosen ? ' is-chosen' : ''}${accent ? ' pr-tile--accent' : ''}`}>
      <div className="pr-tile__head">
        <b className="pr-tile__title">{title}</b>
        {chosen ? (
          <Stepper qty={qty} onBump={onBump} t={t} />
        ) : (
          <button type="button" className="pr-tile__add" onClick={onAdd} aria-label={t('pricing.add')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="pr-tile__price">{formatPrice(price)} {CURRENCY}</div>
      <div className="pr-tile__note">{note}</div>
    </div>
  )
}

function Stepper({ qty, onBump, t }) {
  return (
    <span className="pr-step">
      <button type="button" onClick={() => onBump(-1)} aria-label={t('pricing.minus')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <i>{qty}</i>
      <button type="button" className="is-plus" onClick={() => onBump(1)} aria-label={t('pricing.plus')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  )
}

function Bonuses({ list, t }) {
  return (
    <div className="pr-bonus">
      <div className="pr-bonus__title">
        <GiftMark />
        {t('pricing.bonus')}
      </div>
      <ul>
        {list.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

/* ——— Иконки. Локальные, как в SkillRatings: раздувать общий icons.jsx ради
   одного экрана незачем. ——— */

function SecIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (kind === 'self') return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
  if (kind === 'group') return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19a5.6 5.6 0 0 0-2-4.2" /></svg>
  return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
}

function FeatIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'teacher':
    case 'manager':
      return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
    case 'calendar':
      return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></svg>
    case 'mic':
      return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
    case 'gift':
      return <svg {...p}><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="M3.5 13.5h17M12 9v11" /><path d="M12 9S10.5 4.5 8 4.5a2.2 2.2 0 0 0 0 4.5M12 9s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5" /></svg>
    case 'program':
      return <svg {...p}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'practice':
      return <svg {...p}><path d="M4 12a8 8 0 1 1 3 6.2" /><path d="M4 19v-5h5" /></svg>
    case 'vocab':
      return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
    case 'dialogs':
      return <svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6A1.5 1.5 0 0 1 14.5 13H8l-4 3z" /><path d="M18 9h.5A1.5 1.5 0 0 1 20 10.5v6A1.5 1.5 0 0 1 18.5 18H14l-2 2v-2" /></svg>
    case 'selfstudy':
      return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /></svg>
  }
}

function CheckMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path d="m8 12.3 2.7 2.7L16 9.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GiftMark() {
  return <FeatIcon kind="gift" />
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4.5h2.3l2.2 10.2a2 2 0 0 0 2 1.6h7.3a2 2 0 0 0 2-1.5L20.5 8H6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10.5" cy="19.5" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

function TrashMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5.2M12 7.9v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
