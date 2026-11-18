import { isStudentSectionHidden } from '../config.js'
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
import { getProfileStats, getLearningPath, countProgress, updateUser, getCurrentUser, getIeltsMe, getIeltsProfile, getSatMeCached, getSatProfile, saveSatProfile } from '../api.js'
import { birthDateProblem } from '../lib/birthDate.js'
import BirthDateInput from '../components/BirthDateInput.jsx'
import { useStudentTokens } from '../practice/practiceTokens.js'
import { openRules } from './lessons/rules/openRules.js'
import { readAvatar, saveAvatar, removeAvatar, readAvatarBg, saveAvatarBg } from '../lib/profileAvatar.js'
import { shrinkImage } from '../lib/shrinkImage.js'
import { legalDocumentUrl } from '../lib/legalDocuments.js'
import { isSoundEnabled, setSoundEnabled, playCue } from '../lib/notifySound.js'
import { isTeacher } from '../lib/jwt.js'
import { useMediaQuery, MOBILE_QUERY } from '../lib/useMediaQuery.js'
import ProfileBlocks, { NotificationChannels } from '../matching/ProfileBlocks.jsx'
import { AXIS_TUTOR_KEYS, temperFor } from '../tutor/tutors.js'
import ProfilePhone from './profile/ProfilePhone.jsx'
import ProfileDesktop, { IcTest, IcCap } from './profile/ProfileDesktop.jsx'
import { useProactiveLevel, writeProactiveLevel } from '../lib/assistant/proactiveSetting.js'
import { useLunaMemory } from '../lib/assistant/lunaMemory.js'
import DeleteAccount from './profile/DeleteAccount.jsx'
import { useAccountDeletion } from './profile/useAccountDeletion.js'

// Фото и фон аватара хранит lib/profileAvatar.js: у них ключ свой на аккаунт.

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
  // Уровня в аккаунте нет (тест не пройден или его результат не сохранился).
  // userLevel тогда — стартовый 'A1' из стейта App, а не измерение.
  levelUnknown = false,
  onLevelTest,
  // Ученик IELTS (useStudentExams: признак из админки): теста уровня General English у него нет — строку
  // «Тест на уровень · Не пройден» без уровня не показываем, вместо неё — диагностика и план IELTS.
  ieltsAccount = false,
  // вкладка IELTS открыта (useStudentExams) — тогда в профиле и блок «IELTS»: то же правило, что у меню
  ieltsTab = false,
  // «Назад» туда, откуда открыли профиль (App, lib/navStack.js).
  onBack,
  backLabel,
  // Нрав тьюторов и его смена — переключатель «Жёсткий режим общения» в настройках телефона (тот же выбор, что окно
  // после тура на «Главной»: App.onTemperChoice ставит его всем тьюторам с осью нрава).
  tempers,
  onTemperChoice,
  // Аккаунт удалён (DELETE /user/me прошёл): App чистит сессию, как при выходе, и показывает «Аккаунт удалён».
  onAccountDeleted,
}) {
  const { t, lang, setLang } = useI18n()
  const fileRef = useRef(null)
  const phoneLayout = useMediaQuery(MOBILE_QUERY)
  const deletion = useAccountDeletion(token, onAccountDeleted)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Esc закрывает и окно удаления — кроме момента, когда удаление уже идёт.
  useEffect(() => {
    if (!deleteOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && !deletion.busy && setDeleteOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteOpen, deletion.busy])

  // Имя держим в локальном состоянии, чтобы правка в «Редактировать профиль»
  // сразу отражалась в шапке; наружу отдаём через onUpdateName.
  const [name, setName] = useState(userName || '')
  useEffect(() => setName(userName || ''), [userName])

  const [avatar, setAvatar] = useState(null)
  const [avatarBg, setAvatarBg] = useState(AVATAR_BGS[0])
  // Выбирал ли ученик фон сам: в герое телефона аватар без выбора белый, как в кадре, а не лавандовый по умолчанию.
  const [avatarBgPicked, setAvatarBgPicked] = useState(false)
  // «Уведомления» — звук сигналов кабинета (lib/notifySound.js, тот же, что
  // у колокольчика). Раньше тут был «Push-уведомления» со своим флагом,
  // который никто не читал: пушей у веба нет, переключатель ничего не менял.
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [streak, setStreak] = useState(0)
  const [lessons, setLessons] = useState(0)
  const [levelProg, setLevelProg] = useState(null)
  const [toast, setToast] = useState('')
  // Баланс токенов — четвёртая плитка шапки (ТЗ v2.0, 5.8). Хук общий с блоком токенов «Главной» (один запрос на
  // вкладку); учителю и там, где раздел токенов скрыт (прод), он отдаёт null — плитки тогда нет.
  const tokens = useStudentTokens(token)
  const tokenBalance = tokens?.period ? Number(tokens.period.balance) || 0 : null
  // IELTS: { me, overall } — блок «IELTS» профиля. Раньше его не было вовсе, и ученица IELTS видела в профиле только
  // «Тест на уровень · Не пройден» (жалоба 27.10.2026: «нет раздела, пишет, что нужно снова сдать тест»).
  const [ielts, setIelts] = useState(null)
  useEffect(() => {
    if (!token || !ieltsTab) return undefined
    let alive = true
    getIeltsMe(token)
      .then(async (me) => {
        const p = me.diagnosticDone ? await getIeltsProfile(token).catch(() => null) : null
        return { me, overall: p?.bands?.overall ?? null }
      })
      .then((v) => alive && setIelts(v))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token, ieltsTab])

  // Модалки
  const [langOpen, setLangOpen] = useState(false)
  // «Подсказки Луны: часто / иногда / только по запросу» (ТЗ v2.0, 7.4) — настройка устройства (proactiveSetting.js).
  const lunaLevel = useProactiveLevel()
  // «Память Луны» (ТЗ v2.0, 8.1) — только у ученика: у преподавателя Луны нет.
  const lunaMemory = useLunaMemory(token, !isTeacher(token))
  // язык разборов SAT — бывший шаг «время на занятия» (ТЗ SAT 21.10, задача 3.1): блок есть только у начавших SAT
  const [satLang, setSatLang] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  // Форма редактирования профиля
  // Пола в форме нет намеренно: у бэкенда нет такого поля ни в /user/me, ни в
  // UpdateUserRequest — выбор молча выбрасывался, а тост писал «Сохранено».
  // gender: null — ещё не пришёл из /user/me (тогда не шлём и бэкенд его не трогает), '' — «не указан».
  const [form, setForm] = useState({ name: '', email: '', city: '', birthDate: '', gender: null })
  const [saving, setSaving] = useState(false)
  const [editErr, setEditErr] = useState('')

  const role = roleForLevel(userLevel)
  const nextRole = useMemo(() => nextRoleFor(userLevel), [userLevel])
  // Пустое имя → силуэт вместо буквы «J» (из 'JTS'), а сам заголовок —
  // локализованное «Без имени» вместо голого прочерка «—».
  const trimmedName = (name || '').trim()
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : null
  const phone = formatPhone(userPhone)

  // Персистентные настройки из localStorage. Аватар читается под токеном:
  // сменился аккаунт — показываем его фото, а не оставшееся от прошлого.
  useEffect(() => {
    setAvatar(readAvatar(token))
    const bg = readAvatarBg(token)
    setAvatarBg(bg || AVATAR_BGS[0])
    setAvatarBgPicked(!!bg)
  }, [token])

  useEffect(() => {
    try {
      setNotifEnabled(isSoundEnabled())
    } catch {}
  }, [])

  useEffect(() => {
    if (!token) return
    let alive = true
    Promise.resolve(getSatMeCached(token))
      .then((me) => (me?.onboarded ? getSatProfile(token) : null))
      .then((p) => alive && p?.exists && setSatLang(p.explainLang || 'ru'))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  // true — сервер сохранил: «Сохранено» показывается по ответу, а не до него (выбор оптимистичный и при отказе откатывается).
  const pickSatLang = (code) => {
    if (code === satLang) return Promise.resolve(true)
    const prev = satLang
    setSatLang(code)
    return saveSatProfile(token, { explainLang: code })
      .then(() => true)
      .catch(() => {
        setSatLang(prev)
        return false
      })
  }

  // «Дней подряд» и «уроков пройдено» считает сервер: серия — по входам; уроки — занятия с
  // преподавателем, а если их нет — «Самостоятельно» (не складываются, чтобы не считать дважды).
  useEffect(() => {
    if (!token) return
    let alive = true
    getProfileStats(token)
      .then((s) => {
        if (!alive || !s) return
        setStreak(s.streak ?? 0)
        setLessons(s.lessonsPassed ?? 0)
      })
      .catch(() => {})

    // Полоса прогресса уровня — по тропе «Повторения» своего уровня; в счётчик уроков не входит.
    const kingdoms = computeKingdoms(userLevel).filter((k) => !k.comingSoon)
    kingdoms.forEach((k) => {
      if (k.level.toUpperCase() !== (userLevel || 'A1').toUpperCase()) return
      getLearningPath(k.level, token)
        .then((p) => alive && setLevelProg(countProgress(p)))
        .catch(() => {})
    })

    return () => {
      alive = false
    }
  }, [token, userLevel])

  // Блока «Навыки» в Профиле больше нет (ТЗ v2.0, 5.5 и 5.8; задача 190): навыки — только на «Главной», в «Сильных и
  // слабых сторонах». Две копии одного расчёта уже расходились (чтение 32 % на «Главной» и 73 % здесь).

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  // Фото ужимаем до 256px (см. lib/shrinkImage.js): как есть оно в квоту
  // localStorage не влезало и молча пропадало после перезагрузки. Не вышло
  // прочитать или сохранить — говорим об этом, а не показываем фото, которого
  // после перезагрузки не будет.
  async function pickAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let url
    try {
      url = await shrinkImage(file)
    } catch {
      showToast(t('profile.avatarFailed'))
      return
    }
    if (!saveAvatar(token, url)) {
      showToast(t('profile.avatarFailed'))
      return
    }
    setAvatar(url)
  }

  function resetAvatar() {
    setAvatar(null)
    removeAvatar(token)
  }

  function chooseBg(c) {
    setAvatarBg(c)
    setAvatarBgPicked(true)
    saveAvatarBg(token, c)
  }

  function toggleNotif() {
    const next = !notifEnabled
    setNotifEnabled(next)
    setSoundEnabled(next)
    // Сразу проигрываем — как колокольчик: иначе непонятно, что именно включили.
    if (next) playCue('notification')
  }

  // Ту же настройку переключает и колокольчик в углу экрана — к открытию окна
  // она могла измениться, поэтому перечитываем, а не верим своему состоянию.
  function openNotif() {
    setNotifEnabled(isSoundEnabled())
    setNotifOpen(true)
  }

  function openEdit() {
    setEditErr('')
    setForm({ name: name || '', email: '', city: '', birthDate: '', gender: null })
    setEditOpen(true)
    // Сохранённое подтягиваем из профиля: пустое поле читалось бы как «не
    // указано» — ученик вводил email заново, думая, что он пропал. Уже
    // начатую правку не затираем: ответ может прийти, когда человек печатает.
    // Осечка сети не мешает править остальное — поля просто останутся пустыми.
    if (token) {
      getCurrentUser(token)
        .then((me) => {
          if (!me) return
          setForm((f) => ({
            ...f,
            email: f.email || me.email || '',
            city: f.city || me.city || '',
            birthDate: f.birthDate || (me.birthDate ? String(me.birthDate).slice(0, 10) : ''),
            // ключа нет — бэкенд без поля (до V542): пол не показываем выбранным и не шлём
            gender: f.gender ?? ('gender' in me ? (me.gender === 'MALE' || me.gender === 'FEMALE' ? me.gender : '') : null),
          }))
        })
        .catch(() => {})
    }
  }

  // true — сохранено: экран правки телефона по нему уходит назад, окно десктопа закрывается само.
  async function saveProfile() {
    const trimmed = form.name.trim()
    if (!trimmed) {
      setEditErr(t('profile.editNameRequired'))
      return false
    }
    // Пустую дату пропускаем: у аккаунтов, заведённых до обязательного поля,
    // её нет, и правка имени не должна упираться в чужой пробел. Заполненная
    // проходит те же границы, что и на регистрации.
    const dobProblem = form.birthDate ? birthDateProblem(form.birthDate) : null
    if (dobProblem) {
      setEditErr(t(`regbirth.${dobProblem}`))
      return false
    }
    setSaving(true)
    setEditErr('')
    try {
      await updateUser(token, {
        name: trimmed,
        email: form.email.trim(),
        city: form.city.trim(),
        birthDate: form.birthDate,
        // пол — для обращения помощника (Луна / Айзере): «ты выбрал» / «ты выбрала»; null — не загрузился, не трогаем
        ...(form.gender != null ? { gender: form.gender } : {}),
      })
      setName(trimmed)
      onUpdateName?.(trimmed)
      setEditOpen(false)
      showToast(t('profile.editSaved'))
      return true
    } catch (e) {
      setEditErr(e.message || 'Ошибка')
      return false
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

  const langLabel = LANGS.find((l) => l.code === lang)?.label || 'Русский'

  // Тест на уровень живёт и здесь, а не только сразу после регистрации: часть
  // учеников его после входа не увидела (пришли по ссылке, нажали «позже»,
  // закрыли вкладку), и пройти его потом было неоткуда, кроме карточки на
  // «Главной». Без уровня тест его ставит; с уровнем — пробный прогон, уровень
  // в аккаунте не меняется (тест v16 пишет уровень только в пустой аккаунт, см.
  // finalizePlacement в App.jsx).
  const levelRows = [
    {
      key: 'level-test',
      icon: <PfTestIcon />,
      title: t('profile.levelTest'),
      trailing: levelUnknown ? t('profile.levelTestNone') : (userLevel || '').toUpperCase(),
      onClick: () => onLevelTest?.(),
    },
  ]

  const ieltsRows = ielts && ieltsTab
    ? [
        {
          key: 'ielts-diagnostic',
          icon: <PfTestIcon />,
          title: t('profile.ieltsDiagnostic'),
          trailing: ielts.me.diagnosticDone ? (ielts.overall != null ? `Band ${Number(ielts.overall).toFixed(1)}` : t('profile.ieltsDone')) : t('profile.levelTestNone'),
          onClick: () => onNav?.(ielts.me.diagnosticDone ? 'ielts-diagnostic-result' : ielts.me.onboarded ? 'ielts-diagnostic' : 'ielts-onboarding'),
        },
        {
          key: 'ielts-plan',
          icon: <PfTestIcon />,
          title: t('profile.ieltsPlan'),
          trailing: ielts.me.programmeName || (ielts.me.track === 'general' ? 'General Training' : 'Academic'),
          onClick: () => onNav?.('ielts'),
        },
      ]
    : []

  const showLevelTest = !!onLevelTest && !(ieltsAccount && levelUnknown)

  // «Служба поддержки» — страница «Контакты и реквизиты» (почта, телефон, WhatsApp школы). Раньше здесь было
  // письмо на support@justtostudy.kz, а такого адреса у школы нет (аудит ТЗ v2.0, 06.11.2026). Жалобы — в Feedback.
  // Адрес — как у infoUrl (landing/info.js), без импорта: модуль тянет тексты всех страниц покупателя (30 КБ).
  const openSupport = () => window.open(`/info/contacts${lang === 'kk' ? '?lang=kz' : ''}`, '_blank', 'noopener')
  const openDoc = (kind) => window.open(legalDocumentUrl(kind, lang), '_blank')

  // Окна «Кастомизация» и «Уведомления» — одно содержимое на обе раскладки: на компьютере окном, на телефоне шторкой.
  const customContent = (
    <>
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
    </>
  )
  const notifContent = (
    <>
      <button className="pf-toggle-row" onClick={toggleNotif}>
        <span>{t('profile.notifSound')}</span>
        <span className={`pf-switch ${notifEnabled ? 'pf-switch--on' : ''}`}>
          <span className="pf-switch__knob" />
        </span>
      </button>
      {!isTeacher(token) && <NotificationChannels phone={phone} />}
    </>
  )
  const blocks = !isTeacher(token) && !isStudentSectionHidden('my-teacher') ? <ProfileBlocks token={token} onNav={onNav} onOpenNotifications={openNotif} /> : null

  if (phoneLayout) {
    // Жёсткий режим «включён», когда он у всех тьюторов с осью нрава: окно после тура и этот переключатель ставят
    // его всем сразу, а свой тумблер у тьютора может развести их — тогда переключатель предлагает включить снова.
    const harshOn = AXIS_TUTOR_KEYS.length > 0 && AXIS_TUTOR_KEYS.every((k) => temperFor(k, tempers?.[k]) === 'harsh')
    return (
      <LearningLayout userName={name} userLevel={userLevel} active="" token={token} onNav={onNav} onProfile={() => {}}>
        <ProfilePhone
          name={trimmedName}
          initial={initial}
          phone={phone}
          avatar={avatar}
          avatarBg={avatarBgPicked ? avatarBg : null}
          role={role}
          nextRole={nextRole}
          level={(userLevel || 'A1').toUpperCase()}
          levelUnknown={levelUnknown}
          // Плашка звания в герое — как в «Сервисах»: только у ученика General English с измеренным уровнем.
          showChip={!levelUnknown && !isTeacher(token) && !ieltsAccount}
          showLevel={!(ieltsAccount && levelUnknown)}
          onLevelTest={onLevelTest}
          progress={{ value, remaining }}
          // «Правила школы» (ТЗ 5.8) — ученику; ведут во вкладку «Правила» «Уроков», как на компьютере.
          onRules={isTeacher(token) ? null : () => openRules(onNav)}
          ieltsRows={ieltsRows}
          blocks={blocks}
          // Без истории (диплинк, F5) «назад» ведёт во вкладку «Сервисы»: профиль открывается оттуда.
          onBack={onBack || (() => onNav?.('services'))}
          onPickPhoto={() => fileRef.current?.click()}
          edit={{ form, setForm, saving, error: editErr, open: openEdit, save: saveProfile }}
          langLabel={langLabel}
          luna={{ visible: !isTeacher(token), level: lunaLevel, choose: writeProactiveLevel }}
          lunaMemory={lunaMemory.status === 'ready' ? lunaMemory : null}
          notif={{
            visible: isTeacher(token) || !isStudentSectionHidden('notifications'),
            enabled: notifEnabled,
            open: openNotif,
            render: () => notifContent,
          }}
          harsh={{ visible: !!onTemperChoice && !isTeacher(token), on: harshOn, choose: (temper) => onTemperChoice?.(temper) }}
          help={{
            support: openSupport,
            privacy: () => openDoc('privacy'),
            terms: () => openDoc('offer'),
            paymentSecurity: () => openDoc('payment-security'),
          }}
          renderCustom={() => customContent}
          onLogout={onLogout}
          deletion={deletion}
          toast={toast}
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
      </LearningLayout>
    )
  }

  // Компьютер и планшет — раскладка задачи 214 (ProfileDesktop): шапка, «Обучение», «Настройки», «Аккаунт и помощь».
  // Уровень в содержимом профиля — один раз, чипом звания в шапке (ТЗ: прежде он стоял четырежды).
  const studentTeacher = isTeacher(token)
  // Звание с уровнем — как плашка телефона: у ученика General English с измеренным уровнем.
  const showRank = !levelUnknown && !studentTeacher && !ieltsAccount
  const heroStats = [
    { key: 'streak', value: streak, label: t('profile.statStreak') },
    { key: 'lessons', value: lessons, label: t('profile.statLessons') },
    ...(tokenBalance == null ? [] : [{ key: 'tokens', value: new Intl.NumberFormat().format(tokenBalance), label: t('profile.statTokens') }]),
  ]
  const goals = [
    ...(showLevelTest
      ? [{ key: 'level-test', icon: <IcTest />, title: t('profile.levelTest'), value: levelRows[0].trailing, warn: levelUnknown, onClick: levelRows[0].onClick }]
      : []),
    ...ieltsRows.map((it) => ({ key: it.key, icon: <IcCap />, title: it.title, value: it.trailing, onClick: it.onClick })),
  ]
  return (
    <LearningLayout userName={name} userLevel={userLevel} active="" token={token} onNav={onNav} onProfile={() => {}}>
      <ProfileDesktop
        token={token}
        onNav={onNav}
        teacher={studentTeacher}
        matching={!studentTeacher && !isStudentSectionHidden('my-teacher')}
        onBack={onBack}
        backLabel={backLabel}
        toast={showToast}
        hero={{
          avatar,
          avatarBg,
          initial,
          name: trimmedName,
          phone,
          rank: showRank ? { roleKey: role.key, level: (userLevel || 'A1').toUpperCase() } : null,
          ieltsBand: ielts && ieltsTab && ielts.overall != null ? Number(ielts.overall).toFixed(1) : null,
          stats: heroStats,
          // Полоса до звания — там же, где чип звания: иначе она называла бы звание, которого на экране нет.
          progress: showRank ? { done: levelProg?.done ?? 0, total: levelProg?.total ?? 0, nextRoleKey: nextRole?.key || null, level: (userLevel || 'A1').toUpperCase() } : null,
          onPickPhoto: () => fileRef.current?.click(),
          onEdit: openEdit,
        }}
        goals={goals}
        notif={{ visible: studentTeacher || !isStudentSectionHidden('notifications'), enabled: notifEnabled, open: openNotif }}
        luna={{ visible: !studentTeacher, level: lunaLevel, choose: writeProactiveLevel }}
        lunaMemory={lunaMemory.status === 'ready' ? lunaMemory : null}
        explain={satLang ? { value: satLang, pick: pickSatLang } : null}
        account={{
          langLabel,
          openLang: () => setLangOpen(true),
          openCustom: () => setCustomOpen(true),
          feedback: !studentTeacher && isStudentSectionHidden('feedback') ? null : () => onNav?.('feedback'),
          support: openSupport,
          rules: studentTeacher ? null : () => openRules(onNav),
          share: shareApp,
          onLogout,
          onDelete: () => {
            deletion.reset()
            setDeleteOpen(true)
          },
        }}
      />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />

      {/* ── Удаление аккаунта: своего кадра у десктопа нет — содержимое экрана телефона окном ── */}
      {deleteOpen && (
        <div className="pf-modal" onClick={() => !deletion.busy && setDeleteOpen(false)}>
          <div
            className="pf-modal__sheet pf-modal__sheet--delete"
            role="dialog"
            aria-modal="true"
            aria-label={t('profile.delete.title')}
            onClick={(e) => e.stopPropagation()}
          >
            <DeleteAccount deletion={deletion} onKeep={() => setDeleteOpen(false)} />
          </div>
        </div>
      )}

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
          <div className="pf-field">
            <span>{t('profile.editBirthDate')}</span>
            <BirthDateInput
              value={form.birthDate}
              onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))}
            />
          </div>
          <label className="pf-field">
            <span>{t('profile.editGender')}</span>
            <select
              className="pf-input"
              value={form.gender ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="">{t('profile.gender.none')}</option>
              <option value="FEMALE">{t('profile.gender.female')}</option>
              <option value="MALE">{t('profile.gender.male')}</option>
            </select>
            <small className="pf-field__note">{t('profile.genderNote')}</small>
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
          {editErr && <div className="pf-err">{editErr}</div>}
          <button className="pf-save" disabled={saving} onClick={saveProfile}>
            {saving ? t('profile.editSaving') : t('profile.editSave')}
          </button>
        </Modal>
      )}

      {/* ── Модалка уведомлений ── */}
      {notifOpen && (
        <Modal onClose={() => setNotifOpen(false)} title={t('profile.notifTitle')}>
          {notifContent}
        </Modal>
      )}

      {/* ── Модалка кастомизации ── */}
      {customOpen && (
        <Modal onClose={() => setCustomOpen(false)} title={t('profile.customTitle')}>
          {customContent}
        </Modal>
      )}

      {toast && <div className="pf-toast">{toast}</div>}
    </LearningLayout>
  )
}

// Окна профиля закрываются и клавишей Esc (ТЗ задачи 214: «закрытие по Esc/скриму»), как окна ProfileDesktop.
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="pf-modal" onClick={onClose}>
      <div className="pf-modal__sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="pf-modal__grab" />
        <div className="pf-modal__title">{title}</div>
        {children}
      </div>
    </div>
  )
}

/* ── Иконки профиля (инлайн SVG) ── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function PfTestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M9 4h6v3H9z" />
      <path d="M9 5.5H6V21h12V5.5h-3" />
      <path d="m9 14 2 2 4-4" />
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
