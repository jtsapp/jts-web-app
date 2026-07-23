import { useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { UserIcon } from '../components/icons.jsx'
import { useI18n, LANGS } from '../i18n.jsx'
import {
  computeKingdoms,
  roleForLevel,
  LEVEL_ORDER,
  levelIndex,
  ROLE_BY_LEVEL,
} from '../kingdoms.js'
import { getBalance, getLearningPath, countProgress, updateUser } from '../api.js'

// Ключи localStorage — веб-аналог AppCustomizationCubit / настроек мобилки.
const AVATAR_KEY = 'jts_profile_avatar'
const AVATAR_BG_KEY = 'jts_avatar_bg'
const NOTIF_KEY = 'jts_notifications_enabled'

// Палитра фонов аватара (как cosmetics-фоны мобилки, но без лутбокса).
const AVATAR_BGS = ['#f0ebff', '#dbeafe', '#dcfce7', '#fef3c7', '#ffe4e6', '#e0e7ff', '#fae8ff', '#f1f5f9']

// Форматирует сырой номер бэкенда в «+7 777 711 14 34» (порт _formatPhone из мобилки).
function formatPhone(raw) {
  if (!raw) return ''
  let s = String(raw).replace(/\D/g, '')
  if (s.length === 10) s = '7' + s
  if (s.length === 11 && s.startsWith('8')) s = '7' + s.slice(1)
  if (s.length !== 11 || !s.startsWith('7')) return String(raw)
  return `+7 ${s.slice(1, 4)} ${s.slice(4, 7)} ${s.slice(7, 9)} ${s.slice(9, 11)}`
}

// Градиент hero-сцены по рангу — самодостаточный фон, не зависящий от
// тяжёлых hero-картинок (они приезжают отдельным PR). Если PNG всё же есть,
// он ложится верхним слоем поверх градиента.
const HERO_GRADIENT = {
  merchant: 'linear-gradient(135deg, #ffce9e 0%, #ff8f6b 100%)',
  knight: 'linear-gradient(135deg, #a6e3a1 0%, #3f9d6b 100%)',
  baron: 'linear-gradient(135deg, #9ed8ef 0%, #4f7fe0 100%)',
  viscount: 'linear-gradient(135deg, #b7a6ff 0%, #6a5cff 100%)',
  king: 'linear-gradient(135deg, #d8b6ff 0%, #9047ff 100%)',
  emperor: 'linear-gradient(135deg, #ffd27a 0%, #c1440e 100%)',
  lord: 'linear-gradient(135deg, #ffd27a 0%, #c1440e 100%)',
}

function heroGradientFor(level) {
  return HERO_GRADIENT[roleForLevel(level).key] || HERO_GRADIENT.merchant
}

// Роль для следующего по порядку CEFR-уровня (для правой «монеты» прогресса).
function nextRoleFor(level) {
  const idx = levelIndex(level)
  const next = LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)]
  const cur = ROLE_BY_LEVEL[(level || 'A1').toUpperCase()]
  const nxt = ROLE_BY_LEVEL[next]
  return nxt && nxt.key !== cur?.key ? nxt : null
}

export default function ProfilePage({
  userName,
  userLevel = 'A1',
  userPhone,
  token,
  onNav,
  onLogout,
  onUpdateName,
}) {
  const { t, lang, setLang } = useI18n()
  const fileRef = useRef(null)

  // Имя держим в локальном состоянии, чтобы правка в «Редактировать профиль»
  // сразу отражалась в шапке; наружу отдаём через onUpdateName.
  const [name, setName] = useState(userName || '')
  useEffect(() => setName(userName || ''), [userName])

  const [avatar, setAvatar] = useState(null)
  const [avatarBg, setAvatarBg] = useState(AVATAR_BGS[0])
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [streak, setStreak] = useState(0)
  const [lessons, setLessons] = useState(0)
  const [levelProg, setLevelProg] = useState(null)
  const [toast, setToast] = useState('')

  // Модалки
  const [langOpen, setLangOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  // Форма редактирования профиля
  const [form, setForm] = useState({ name: '', email: '', city: '', gender: '' })
  const [saving, setSaving] = useState(false)
  const [editErr, setEditErr] = useState('')

  const role = roleForLevel(userLevel)
  const nextRole = useMemo(() => nextRoleFor(userLevel), [userLevel])
  // Пустое имя → силуэт вместо буквы «J» (из 'JTS'), а сам заголовок —
  // локализованное «Без имени» вместо голого прочерка «—».
  const trimmedName = (name || '').trim()
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : null
  const phone = formatPhone(userPhone)

  // Персистентные настройки из localStorage.
  useEffect(() => {
    try {
      const a = localStorage.getItem(AVATAR_KEY)
      if (a) setAvatar(a)
      const bg = localStorage.getItem(AVATAR_BG_KEY)
      if (bg) setAvatarBg(bg)
      const n = localStorage.getItem(NOTIF_KEY)
      if (n != null) setNotifEnabled(n === '1')
    } catch {}
  }, [])

  // Стрик + уроки (сумма пройденных активностей по открытым королевствам).
  useEffect(() => {
    if (!token) return
    let alive = true
    getBalance(token)
      .then((b) => alive && b && setStreak(b.streak ?? 0))
      .catch(() => {})

    const kingdoms = computeKingdoms(userLevel).filter((k) => !k.comingSoon)
    let sumDone = 0
    Promise.all(
      kingdoms.map((k) =>
        getLearningPath(k.level, token)
          .then((p) => {
            const c = countProgress(p)
            sumDone += c.done
            if (k.level.toUpperCase() === (userLevel || 'A1').toUpperCase() && alive) setLevelProg(c)
          })
          .catch(() => {}),
      ),
    ).then(() => alive && setLessons(sumDone))

    return () => {
      alive = false
    }
  }, [token, userLevel])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  function pickAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setAvatar(url)
      try {
        localStorage.setItem(AVATAR_KEY, url)
      } catch {}
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function resetAvatar() {
    setAvatar(null)
    try {
      localStorage.removeItem(AVATAR_KEY)
    } catch {}
  }

  function chooseBg(c) {
    setAvatarBg(c)
    try {
      localStorage.setItem(AVATAR_BG_KEY, c)
    } catch {}
  }

  function toggleNotif() {
    setNotifEnabled((v) => {
      const nv = !v
      try {
        localStorage.setItem(NOTIF_KEY, nv ? '1' : '0')
      } catch {}
      return nv
    })
  }

  function openEdit() {
    setEditErr('')
    setForm({ name: name || '', email: '', city: '', gender: '' })
    setEditOpen(true)
  }

  async function saveProfile() {
    const trimmed = form.name.trim()
    if (!trimmed) {
      setEditErr(t('profile.editNameRequired'))
      return
    }
    setSaving(true)
    setEditErr('')
    try {
      await updateUser(token, {
        name: trimmed,
        email: form.email.trim(),
        city: form.city.trim(),
        gender: form.gender,
      })
      setName(trimmed)
      onUpdateName?.(trimmed)
      setEditOpen(false)
      showToast(t('profile.editSaved'))
    } catch (e) {
      setEditErr(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  function shareApp() {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://justtostudy.kz'
    if (navigator.share) navigator.share({ title: 'JTS', url }).catch(() => {})
    else navigator.clipboard?.writeText(url).then(() => showToast(t('profile.linkCopied'))).catch(() => {})
  }

  // Прогресс к следующему званию.
  const p = levelProg
  const value = p && p.total > 0 ? p.done / p.total : 0
  const remaining = p ? p.total - p.done : null
  const progressCaption =
    remaining == null
      ? t('profile.keepLearning')
      : remaining <= 0
      ? t('profile.levelComplete')
      : t('profile.remaining', { n: remaining })

  const langLabel = LANGS.find((l) => l.code === lang)?.label || 'Русский'

  const personalization = [
    { key: 'edit', icon: <PfEditIcon />, title: t('profile.editProfile'), onClick: openEdit },
    { key: 'lang', icon: <PfGlobeIcon />, title: t('profile.language'), trailing: langLabel, onClick: () => setLangOpen(true) },
    { key: 'custom', icon: <PfGiftIcon />, title: t('profile.customization'), onClick: () => setCustomOpen(true) },
  ]

  const settings = [
    { key: 'notif', icon: <PfBellIcon />, title: t('profile.notifications'), trailing: notifEnabled ? t('profile.notifOn') : t('profile.notifOff'), onClick: () => setNotifOpen(true) },
    { key: 'rate', icon: <PfStarIcon />, title: t('profile.rateApp'), onClick: shareApp },
    { key: 'share', icon: <PfShareIcon />, title: t('profile.shareApp'), onClick: shareApp },
    { key: 'support', icon: <PfSupportIcon />, title: t('profile.support'), onClick: () => { window.location.href = 'mailto:support@justtostudy.kz' } },
    { key: 'privacy', icon: <PfShieldIcon />, title: t('profile.privacy'), onClick: () => window.open('https://justtostudy.kz/privacy', '_blank') },
    { key: 'terms', icon: <PfDocIcon />, title: t('profile.terms'), onClick: () => window.open('https://justtostudy.kz/terms', '_blank') },
  ]

  return (
    <LearningLayout userName={name} userLevel={userLevel} active="" onNav={onNav} onProfile={() => {}}>
      <div className="pf">
        {/* ── Hero ── */}
        <section className="pf-hero">
          <div
            className="pf-hero__scene"
            style={{
              // PNG-шапка (если есть) ложится поверх градиента; при её отсутствии
              // виден только градиент — экран самодостаточен.
              backgroundImage: `url(/assets/world/hero/${(userLevel || 'a1').toLowerCase()}.png), ${heroGradientFor(userLevel)}`,
            }}
          />
          <div className="pf-hero__sheet">
            <div className="pf-avatar">
              {avatar ? (
                <img className="pf-avatar__img" src={avatar} alt="" />
              ) : (
                <span className="pf-avatar__initial" style={{ background: avatarBg }}>
                  {initial || <UserIcon size={44} />}
                </span>
              )}
              <button className="pf-avatar__cam" onClick={() => fileRef.current?.click()} aria-label="Сменить фото">
                <PfCameraIcon />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
            </div>

            <h1 className="pf-name">{trimmedName || t('profile.noName')}</h1>
            {phone && (
              <div className="pf-phone">
                <PfPhoneIcon />
                <span>{phone}</span>
              </div>
            )}

            <div className="pf-rank">
              <img className="pf-rank__coin" src={`/assets/world/roles/${role.key}.png`} alt="" />
              <div className="pf-rank__text">
                <span>{t('profile.rankPrefix')}</span>
                <b>{t('role.' + role.key)}</b>
              </div>
              <span className="pf-rank__cefr">{(userLevel || 'A1').toUpperCase()}</span>
            </div>

            <div className="pf-progress">
              <div className="pf-progress__cap">{progressCaption}</div>
              <div className="pf-progress__row">
                <img className="pf-progress__coin" src={`/assets/world/roles/${role.key}.png`} alt="" />
                <div className="pf-progress__bar">
                  <div className="pf-progress__fill" style={{ width: `${Math.round(value * 100)}%` }} />
                </div>
                <img
                  className={`pf-progress__coin ${nextRole ? 'pf-progress__coin--dim' : ''}`}
                  src={`/assets/world/roles/${(nextRole || role).key}.png`}
                  alt=""
                />
              </div>
            </div>

            <div className="pf-stats">
              <div className="pf-stat">
                <img className="pf-stat__ic" src="/assets/world/streak.svg" alt="" />
                <b>{streak}</b>
                <span>{t('profile.statStreak')}</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat__glyph"><PfCapIcon /></span>
                <b>{lessons}</b>
                <span>{t('profile.statLessons')}</span>
              </div>
              <div className="pf-stat">
                <span className="pf-stat__glyph pf-stat__glyph--gold"><PfGroupIcon /></span>
                <b>0</b>
                <span>{t('profile.statClubs')}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="pf-label">{t('profile.sectionPersonalization')}</div>
        <div className="pf-card">
          {personalization.map((it, i) => (
            <SettingRow key={it.key} item={it} chip last={i === personalization.length - 1} />
          ))}
        </div>

        <div className="pf-label">{t('profile.sectionSettings')}</div>
        <div className="pf-card">
          {settings.map((it, i) => (
            <SettingRow key={it.key} item={it} last={i === settings.length - 1} />
          ))}
        </div>

        <button className="pf-logout" onClick={onLogout}>
          <PfLogoutIcon />
          <span>{t('profile.logout')}</span>
        </button>
      </div>

      {/* ── Модалка выбора языка ── */}
      {langOpen && (
        <Modal onClose={() => setLangOpen(false)} title={t('profile.languageTitle')}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`pf-lang ${l.code === lang ? 'pf-lang--active' : ''}`}
              onClick={() => {
                setLang(l.code)
                setLangOpen(false)
              }}
            >
              <l.Flag size={22} />
              <span>{l.label}</span>
              {l.code === lang && <PfCheckIcon />}
            </button>
          ))}
        </Modal>
      )}

      {/* ── Модалка редактирования профиля ── */}
      {editOpen && (
        <Modal onClose={() => setEditOpen(false)} title={t('profile.editTitle')}>
          <label className="pf-field">
            <span>{t('profile.editName')}</span>
            <input
              className="pf-input"
              value={form.name}
              placeholder={t('profile.editNameHint')}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          {phone && (
            <label className="pf-field">
              <span>{t('profile.editPhone')}</span>
              <input className="pf-input pf-input--disabled" value={phone} disabled />
            </label>
          )}
          <label className="pf-field">
            <span>{t('profile.editEmail')}</span>
            <input
              className="pf-input"
              type="email"
              value={form.email}
              placeholder={t('profile.editEmailHint')}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="pf-field">
            <span>{t('profile.editCity')}</span>
            <input
              className="pf-input"
              value={form.city}
              placeholder={t('profile.editCityHint')}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </label>
          <div className="pf-field">
            <span>{t('profile.editGender')}</span>
            <div className="pf-seg">
              {[
                ['MALE', t('profile.genderMale')],
                ['FEMALE', t('profile.genderFemale')],
                ['OTHER', t('profile.genderOther')],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={`pf-seg__opt ${form.gender === v ? 'pf-seg__opt--active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, gender: v }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {editErr && <div className="pf-err">{editErr}</div>}
          <button className="pf-save" disabled={saving} onClick={saveProfile}>
            {saving ? t('profile.editSaving') : t('profile.editSave')}
          </button>
        </Modal>
      )}

      {/* ── Модалка уведомлений ── */}
      {notifOpen && (
        <Modal onClose={() => setNotifOpen(false)} title={t('profile.notifTitle')}>
          <button className="pf-toggle-row" onClick={toggleNotif}>
            <span>{t('profile.notifPush')}</span>
            <span className={`pf-switch ${notifEnabled ? 'pf-switch--on' : ''}`}>
              <span className="pf-switch__knob" />
            </span>
          </button>
        </Modal>
      )}

      {/* ── Модалка кастомизации ── */}
      {customOpen && (
        <Modal onClose={() => setCustomOpen(false)} title={t('profile.customTitle')}>
          <div className="pf-custom__preview">
            {avatar ? (
              <img className="pf-avatar__img" src={avatar} alt="" style={{ width: 80, height: 80 }} />
            ) : (
              <span className="pf-avatar__initial" style={{ width: 80, height: 80, background: avatarBg, fontSize: 32 }}>
                {initial || <UserIcon size={38} />}
              </span>
            )}
          </div>
          <div className="pf-custom__label">{t('profile.customSubtitle')}</div>
          <div className="pf-swatches">
            {AVATAR_BGS.map((c) => (
              <button
                key={c}
                className={`pf-swatch ${avatarBg === c ? 'pf-swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => chooseBg(c)}
                aria-label={c}
              />
            ))}
          </div>
          {avatar && (
            <button className="pf-custom__reset" onClick={resetAvatar}>
              {t('profile.customReset')}
            </button>
          )}
        </Modal>
      )}

      {toast && <div className="pf-toast">{toast}</div>}
    </LearningLayout>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="pf-modal" onClick={onClose}>
      <div className="pf-modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pf-modal__grab" />
        <div className="pf-modal__title">{title}</div>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ item, chip = false, last = false }) {
  return (
    <>
      <button className={`pf-row ${chip ? 'pf-row--chip' : 'pf-row--flat'}`} onClick={item.onClick}>
        <span className={`pf-row__ic ${chip ? 'pf-row__ic--chip' : ''}`}>{item.icon}</span>
        <span className="pf-row__title">{item.title}</span>
        {item.trailing && <span className="pf-row__trailing">{item.trailing}</span>}
        <span className="pf-row__chev">
          <PfChevronIcon />
        </span>
      </button>
      {!last && <div className="pf-row__divider" />}
    </>
  )
}

/* ── Иконки профиля (инлайн SVG) ── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function PfCameraIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...S}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}
function PfPhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  )
}
function PfCapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...S}>
      <path d="M2 8.5 12 4l10 4.5-10 4.5z" />
      <path d="M6 10.5V15c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.5" />
    </svg>
  )
}
function PfGroupIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...S}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M18 19c0-2-.8-3.6-2.2-4.6" />
    </svg>
  )
}
function PfEditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S}>
      <path d="M4 20h4L18 10l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </svg>
  )
}
function PfGlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}
function PfGiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S}>
      <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
      <path d="M3.5 13h17M12 9v11M12 9c-1.5-3.5-6-3-6 0zM12 9c1.5-3.5 6-3 6 0z" />
    </svg>
  )
}
function PfBellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}
function PfStarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  )
}
function PfShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
    </svg>
  )
}
function PfSupportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 3.5 2.3c0 1.5-2 1.7-2 3M12 16.5h.01" />
    </svg>
  )
}
function PfShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
function PfDocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  )
}
function PfLogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M15 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  )
}
function PfChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...S} strokeWidth="2.2">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
function PfCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S} strokeWidth="2.2">
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="m8 12.2 2.6 2.6L16 9.4" stroke="#fff" />
    </svg>
  )
}
