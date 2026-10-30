import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AssetImage from '../../components/AssetImage.jsx'
import { UserIcon } from '../../components/icons.jsx'
import { useI18n, LANGS } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { SKILLS, skillBars } from '../../practice/skillStatsCore.js'
import DeleteAccount from './DeleteAccount.jsx'
import { MaskIcon } from './MaskIcon.jsx'

/*
 * Профиль на телефоне — по дизайну мобильного приложения (Figma «pitch JTS (Copy)», страница «Mobile» → «Сервисы» →
 * «Профиль», 6420:8726; решение владельца 26.10.2026: телефон повторяет приложение). В приложении это стопка экранов,
 * а не одна страница с окнами: профиль → шестерёнка → «Настройки» → правка, язык, удаление. Поэтому экраны — свой
 * стек внутри раздела: адрес приложения один (?screen=profile), «назад» с первого экрана уходит туда, откуда пришли.
 *
 * Сверх кадров оставлено только то, чему на телефоне больше негде жить: тест уровня (пересдача — только из профиля),
 * IELTS у ученика IELTS, блоки подбора учителя, звук уведомлений (где раздел не скрыт) и третий документ комплекта
 * («Безопасность онлайн-платежей» — документы обязаны открываться из профиля, решение 29.10.2026). «Поделиться» и
 * «Обратная связь» не перенесены: первого в приложении нет, вторая — плитка «Сервисов».
 */

const SKILL_ICO = {
  listening: ['headphones', 'violet'],
  speaking: ['mic', 'green'],
  reading: ['auto_stories', 'pink'],
  writing: ['edit_note', 'yellow'],
  grammar: ['text_fields', 'blue'],
  vocab: ['menu_book', 'orange'],
}
const SEGMENTS = 10
// Порядок языков — как в кадре «Язык» (7293:11420), а не как в общем списке LANGS.
const LANG_ORDER = ['ru', 'kk', 'en']

export default function ProfilePhone(p) {
  const { t, lang, setLang } = useI18n()
  const [stack, setStack] = useState(['main'])
  const view = stack[stack.length - 1]
  const [sheet, setSheet] = useState(null)
  const go = (next) => setStack((s) => [...s, next])
  const back = () => {
    // Пока уходит DELETE, экран не меняем: ответ всё равно уведёт на «Аккаунт удалён» или покажет ошибку здесь.
    if (p.deletion.busy) return
    if (stack.length > 1) setStack((s) => s.slice(0, -1))
    else p.onBack()
  }
  // Новый экран стопки — с верха, как в приложении: иначе «Настройки» открылись бы на высоте навыков профиля.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  function openEdit() {
    p.edit.open()
    go('edit')
  }
  function openDelete() {
    p.deletion.reset()
    go('delete')
  }
  async function saveEdit() {
    if (await p.edit.save()) back()
  }
  function toggleHarsh() {
    // Включение — через шторку с объяснением (подпись кадра 7293:11291), выключение — сразу: спрашивать «точно
    // вернуть обычный режим?» незачем.
    if (p.harsh.on) p.harsh.choose('calm')
    else setSheet('harsh')
  }

  let body
  if (view === 'settings') {
    body = (
      <Screen title={t('nav.settings')} onBack={back}>
        <Card title={t('profile.sectionPersonalization')}>
          <Row ico="edit" tone="violet" title={t('profile.editProfile')} onClick={openEdit} />
          <Row ico="language" tone="blue" title={t('profile.language')} sub={p.langLabel} onClick={() => go('lang')} />
          <Row ico="palette" tone="pink" title={t('profile.customization')} onClick={() => setSheet('custom')} />
          {p.notif.visible && (
            <Row ico="notifications" tone="violet" title={t('profile.notifications')} sub={p.notif.enabled ? t('profile.notifOn') : t('profile.notifOff')} onClick={() => { p.notif.open(); setSheet('notif') }} />
          )}
          {p.harsh.visible && (
            <button type="button" role="switch" aria-checked={p.harsh.on} className="pfm-row" data-key="harsh" onClick={toggleHarsh}>
              <Plate ico="chat_bubble" tone="orange" />
              <span className="pfm-row__t"><b>{t('temper.invite.title')}</b></span>
              <span className={`pfm-switch ${p.harsh.on ? 'is-on' : ''}`} aria-hidden="true"><i /></span>
            </button>
          )}
        </Card>
        <Card title={t('profile.m.help')}>
          <Row ico="help" tone="green" title={t('profile.support')} onClick={p.help.support} />
          <Row ico="verified_user" tone="blue" title={t('profile.privacy')} onClick={p.help.privacy} />
          <Row ico="description" tone="yellow" title={t('profile.terms')} onClick={p.help.terms} />
          <Row ico="description" tone="yellow" title={t('legal.payment-security')} onClick={p.help.paymentSecurity} />
        </Card>
        <div className="pfm-out">
          <button type="button" className="pfm-btn pfm-btn--ghost pfm-btn--danger-text" onClick={() => setSheet('logout')}>
            {t('profile.m.logout')}
          </button>
          <button type="button" className="pfm-out__del" onClick={openDelete}>
            {t('profile.delete.link')}
          </button>
        </div>
      </Screen>
    )
  } else if (view === 'edit') {
    body = (
      <Screen title={t('profile.m.editTitle')} onBack={back} fill>
        <section className="pfm-card pfm-edit">
          <div className="pfm-edit__ava">
            <button type="button" className="pfm-edit__disc" style={p.avatarBg ? { background: p.avatarBg } : undefined} onClick={p.onPickPhoto} aria-label={t('profile.m.editPhoto')}>
              {p.avatar ? <img src={p.avatar} alt="" /> : p.initial || <UserIcon size={48} />}
              <span className="pfm-edit__cam">
                <MaskIcon name="photo_camera" />
              </span>
            </button>
            <button type="button" className="pfm-edit__photo" onClick={p.onPickPhoto}>
              {t('profile.m.editPhoto')}
            </button>
          </div>
          <label className="pfm-field">
            <span>{t('profile.editName')}</span>
            <input className="pfm-input" value={p.edit.form.name} placeholder={t('profile.editNameHint')} onChange={(e) => p.edit.setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="pfm-field">
            <span>{t('profile.m.email')}</span>
            <input className="pfm-input" type="email" value={p.edit.form.email} placeholder={t('profile.editEmailHint')} onChange={(e) => p.edit.setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          {p.phone && (
            <div className="pfm-field">
              <span>{t('profile.editPhone')}</span>
              <div className="pfm-input pfm-input--ro" aria-readonly="true">
                <span>{p.phone}</span>
                <MaskIcon name="lock" />
              </div>
              <small>{t('profile.m.phoneNote')}</small>
            </div>
          )}
          {p.edit.error && <p className="pfm-err" role="alert">{p.edit.error}</p>}
        </section>
        <div className="pfm-bar">
          <button type="button" className="pfm-btn pfm-btn--primary" disabled={p.edit.saving} onClick={saveEdit}>
            {p.edit.saving ? t('profile.editSaving') : t('profile.editSave')}
          </button>
        </div>
      </Screen>
    )
  } else if (view === 'lang') {
    body = (
      <Screen title={t('profile.language')} onBack={back}>
        <Card title={t('profile.m.langTitle')}>
          {LANG_ORDER.map((code) => LANGS.find((l) => l.code === code)).filter(Boolean).map((l) => (
            <button key={l.code} type="button" role="radio" aria-checked={l.code === lang} className={`pfm-lang ${l.code === lang ? 'is-on' : ''}`} onClick={() => setLang(l.code)}>
              <span>{l.label}</span>
              <span className="pfm-radio" aria-hidden="true">
                {l.code === lang && <MaskIcon name="check" />}
              </span>
            </button>
          ))}
        </Card>
      </Screen>
    )
  } else if (view === 'delete') {
    body = (
      <Screen title={t('profile.delete.title')} onBack={back} fill>
        <DeleteAccount deletion={p.deletion} onKeep={back} />
      </Screen>
    )
  } else {
    body = (
      <Screen
        title={t('kingdom.profile')}
        onBack={back}
        right={
          <button type="button" className="pfm-nav__btn" onClick={() => go('settings')} aria-label={t('nav.settings')}>
            <MaskIcon name="settings" />
          </button>
        }
      >
        <Hero p={p} t={t} onEdit={openEdit} />
        {p.showLevel && <LevelCard p={p} t={t} lang={lang} />}
        {p.ieltsRows.length > 0 && (
          <Card title="IELTS">
            {p.ieltsRows.map((r) => (
              <Row key={r.key} ico="school" tone="blue" title={r.title} sub={r.trailing} onClick={r.onClick} />
            ))}
          </Card>
        )}
        {p.blocks}
        <SkillsCard stats={p.skillStats} t={t} />
      </Screen>
    )
  }

  return (
    <div className="pfm" data-view={view}>
      {body}
      {sheet === 'logout' && (
        <Sheet onClose={() => setSheet(null)} label={t('profile.m.logoutTitle')}>
          <span className="pfm-sheet__plate pfm-tone--red">
            <MaskIcon name="logout" />
          </span>
          <h2 className="pfm-sheet__title">{t('profile.m.logoutTitle')}</h2>
          <p className="pfm-sheet__text">{t('profile.m.logoutText')}</p>
          <div className="pfm-sheet__acts">
            <button type="button" className="pfm-btn pfm-btn--danger" onClick={p.onLogout}>
              {t('profile.m.logout')}
            </button>
            <button type="button" className="pfm-btn pfm-btn--ghost" onClick={() => setSheet(null)}>
              {t('profile.cancel')}
            </button>
          </div>
        </Sheet>
      )}
      {sheet === 'harsh' && (
        <Sheet onClose={() => setSheet(null)} label={t('temper.invite.title')}>
          <img className="pfm-sheet__art" src="/assets/m/profile/temper-sheet.webp" alt="" width="338" height="210" />
          <h2 className="pfm-sheet__title">{t('temper.invite.title')}</h2>
          <p className="pfm-sheet__text">{t('temper.invite.text')}</p>
          <div className="pfm-sheet__acts">
            <button
              type="button"
              className="pfm-btn pfm-btn--primary"
              onClick={() => {
                p.harsh.choose('harsh')
                setSheet(null)
              }}
            >
              {t('temper.invite.try')}
            </button>
            <button type="button" className="pfm-btn pfm-btn--ghost" onClick={() => setSheet(null)}>
              {t('temper.invite.keep')}
            </button>
          </div>
        </Sheet>
      )}
      {sheet === 'custom' && (
        <Sheet onClose={() => setSheet(null)} label={t('profile.customTitle')}>
          <h2 className="pfm-sheet__title">{t('profile.customTitle')}</h2>
          {p.renderCustom()}
        </Sheet>
      )}
      {sheet === 'notif' && (
        <Sheet onClose={() => setSheet(null)} label={t('profile.notifTitle')}>
          <h2 className="pfm-sheet__title">{t('profile.notifTitle')}</h2>
          {p.notif.render()}
        </Sheet>
      )}
      {p.toast && <div className="pf-toast">{p.toast}</div>}
    </div>
  )
}

function Screen({ title, onBack, right, fill = false, children }) {
  const { t } = useI18n()
  return (
    <div className={`pfm-screen ${fill ? 'pfm-screen--fill' : ''}`}>
      <header className="pfm-nav">
        <button type="button" className="pfm-nav__btn" onClick={onBack} aria-label={t('common.back')}>
          <MaskIcon name="arrow_back" />
        </button>
        <h1 className="pfm-nav__title">{title}</h1>
        <span className="pfm-nav__slot">{right}</span>
      </header>
      <div className="pfm-content">{children}</div>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`pfm-card ${className}`}>
      {title && <h2 className="pfm-card__title">{title}</h2>}
      <div className="pfm-card__rows">{children}</div>
    </section>
  )
}

function Plate({ ico, tone }) {
  return (
    <span className={`pfm-plate pfm-tone--${tone}`}>
      <MaskIcon name={ico} />
    </span>
  )
}

function Row({ ico, tone, title, sub, onClick }) {
  return (
    <button type="button" className="pfm-row" onClick={onClick}>
      <Plate ico={ico} tone={tone} />
      <span className="pfm-row__t">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </span>
      <MaskIcon name="chevron_right" className="pfm-row__chev" />
    </button>
  )
}

function Hero({ p, t, onEdit }) {
  return (
    <section className="svc-hero pfm-hero">
      <AssetImage className="svc-hero__mascot" src="/assets/m/services/mascot.webp" alt="" />
      <span className="svc-hero__who">
        <span className="svc-hero__avatar pfm-hero__ava" style={p.avatarBg && !p.avatar ? { background: p.avatarBg } : undefined}>
          {p.avatar ? <img src={p.avatar} alt="" /> : p.initial || <UserIcon size={28} />}
          <button type="button" className="pfm-hero__cam" onClick={p.onPickPhoto} aria-label={t('profile.m.editPhoto')}>
            <MaskIcon name="photo_camera" />
          </button>
        </span>
        <span className="svc-hero__name">
          <b>{p.name || t('profile.noName')}</b>
          <button type="button" className="pfm-hero__edit" onClick={onEdit}>
            {t('profile.m.edit')}
            <MaskIcon name="chevron_right" />
          </button>
        </span>
      </span>
      {p.phone && (
        <span className="pfm-hero__phone">
          <MaskIcon name="phone" />
          {p.phone}
        </span>
      )}
      {p.showChip && (
        <span className="svc-hero__chips">
          <span className="svc-chip">
            <i className="svc-chip__ico" aria-hidden="true" />
            {t('role.' + p.role.key)} · {p.level}
          </span>
        </span>
      )}
    </section>
  )
}

function Coin({ role, size }) {
  return (
    <span className={`pfm-coin pfm-coin--${size}`}>
      <img src={`/assets/world/roles/${role.key}.png`} alt="" />
    </span>
  )
}

function LevelCard({ p, t, lang }) {
  if (p.levelUnknown) {
    return (
      <section className="pfm-card pfm-level">
        <div className="pfm-level__head">
          <span className="pfm-coin pfm-coin--48 pfm-coin--unknown">?</span>
          <span className="pfm-level__ht">
            <b>{t('profile.sectionLevel')}</b>
            <span>{t('profile.levelTestNone')}</span>
          </span>
        </div>
        {p.onLevelTest && <Row ico="school" tone="violet" title={t('profile.levelTest')} onClick={p.onLevelTest} />}
      </section>
    )
  }
  const { value, remaining } = p.progress
  const caption =
    remaining == null ? t('profile.keepLearning') : remaining <= 0 ? t('profile.levelComplete') : plural(t, lang, 'profile.m.left', remaining)
  return (
    <section className="pfm-card pfm-level">
      <div className="pfm-level__head">
        <Coin role={p.role} size={48} />
        <span className="pfm-level__ht">
          <b>{t('role.' + p.role.key)}</b>
          <span>{t('profile.m.yourLevel')}</span>
        </span>
        <span className="pfm-level__chip">{p.level}</span>
      </div>
      <div className="pfm-next">
        <p className="pfm-next__cap">{caption}</p>
        <div className="pfm-next__row">
          <Coin role={p.role} size={36} />
          <span className="pfm-next__track">
            <i style={{ width: `${Math.round(value * 100)}%` }} />
          </span>
          <Coin role={p.nextRole || p.role} size={36} />
        </div>
      </div>
      {p.onLevelTest && <Row ico="school" tone="violet" title={t('profile.levelTest')} sub={p.level} onClick={p.onLevelTest} />}
    </section>
  )
}

function SkillsCard({ stats, t }) {
  return (
    <Card title={t('profile.skills.title')}>
      {SKILLS.map((skill) => {
        const stat = stats?.[skill]
        const done = stat?.done || 0
        const firstTry = stat?.firstTry || 0
        const empty = done === 0
        const filled = skillBars({ done, firstTry })
        const pct = empty ? 0 : Math.round(Math.min(1, firstTry / done) * 100)
        const [ico, tone] = SKILL_ICO[skill]
        return (
          <div key={skill} className={`pfm-skill ${empty ? '' : 'is-on'}`} data-skill={skill}>
            <Plate ico={ico} tone={tone} />
            <span className="pfm-skill__t">
              <b>{t('profile.skills.' + skill)}</b>
              <span>{empty ? t('profile.skills.empty') : t('profile.skills.meta', { done, pct })}</span>
              <span className="pfm-skill__segs" aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <i key={i} className={!empty && i < filled ? 'is-on' : ''} />
                ))}
              </span>
            </span>
          </div>
        )
      })}
    </Card>
  )
}

// Шторка снизу (кадры «Выход из аккаунта», «Жёсткий режим»). Порталом в body: обёртка экрана .scr-in на входе
// анимирует transform, и fixed внутри неё встал бы не по окну. Метка data-assistant-overlay — чтобы Луна видела
// шторку в снимке экрана (lib/assistant/screenSnapshot.js читает порталы только с ней).
function Sheet({ onClose, label, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="pfm-sheet" role="dialog" aria-modal="true" aria-label={label} data-assistant-overlay="шторка профиля">
      <div className="pfm-sheet__dim" onClick={onClose} />
      <div className="pfm-sheet__body">
        <span className="pfm-sheet__grab" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  )
}
