'use client'

// Профиль ученика на компьютере и планшете (от 561 px; телефон — ProfilePhone по дизайну приложения). Задача 214
// доски «Профиль подправить» (ТЗ и прототип Улданы Ертаевой, 18.11.2026): прежний профиль был одной узкой колонкой
// ~3600 px, уровень повторялся четыре раза, интересы занимали полэкрана шестью аккордеонами, настройки были
// разбросаны по пяти блокам, а «Удалить аккаунт» стоял рядом с «Выйти».
//
// Теперь одна страница сверху вниз, порядок блоков одинаковый на любой ширине:
//   1. Шапка: аватар, имя, телефон, звание с уровнем (единственное место уровня в профиле), IELTS, три цифры,
//      «Редактировать» и полоса до следующего звания с числами.
//   2. «Обучение»: учитель | интересы (чипы, выбор — окном), ниже «Цели и экзамены» (тест на уровень, IELTS).
//   3. «Настройки»: «Занятия» (формат и частота, часовой пояс, уведомления) | Луна (язык объяснений, подсказки —
//      переключателями в строке, память Луны — окном).
//   4. «Аккаунт и помощь» — список в две колонки, «Выйти» красным; под карточкой тихая ссылка «Удалить аккаунт».
// Раскладка — container queries (profile.css): уже 600 px — одна колонка, 600–1023 — пары карточек, от 1024 — шапка в
// одну строку.
//
// Бизнес-логику и API ТЗ трогать не велит, и здесь они прежние: данные и обработчики приходят из ProfilePage, подбор
// учителя (учитель, интересы, часовой пояс, формат) — из того же хранилища, что «Мой учитель» (matchingStore).
// Формат и частоту задаёт тариф, а не ученик, поэтому строка «Формат и частота» их только показывает; если формат
// не выбран — ведёт туда, где его выбирают («Уроки → Мой учитель»).
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { UserIcon } from '../../components/icons.jsx'
import LegalDocumentsPanel from '../../components/LegalDocumentsPanel.jsx'
import { saveMatchingInterests } from '../../api.js'
import { applyMatchingCard, useMatching } from '../../matching/matchingStore.js'
import { matchingView } from '../../matching/matchingState.js'
import { nextOccurrence, studentTimezone } from '../../matching/slots.js'
import { lessonDateLabel } from '../../matching/ConfirmCard.jsx'
import TeacherPhoto from '../../matching/TeacherPhoto.jsx'
import TimezoneModal, { zoneTitle } from '../../matching/TimezoneModal.jsx'
import { errorText } from '../../matching/ui.jsx'
import { useMatchingT } from '../../matching/texts.js'
import { useTeacher } from '../../matching/useTeacher.js'
import { INTEREST_CATS, MAX_INTERESTS, interestLabel, toggleInterest } from '../../matching/interests.js'
import { PROACTIVE_LEVELS } from '../../lib/assistant/proactiveSetting.js'
import LunaMemory from './LunaMemory.jsx'

// Подбор на стенде выключен или абонемента нет — тогда нет и учителя с интересами (как у ProfileBlocks).
const MATCHING_HIDDEN = new Set(['idle', 'loading', 'unavailable', 'no_subscription'])

// Язык разборов SAT — на самом этом языке при любом языке интерфейса: ученик ищет глазами свой язык.
const EXPLAIN_LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'en', label: 'English' },
]

export default function ProfileDesktop({
  token,
  onNav,
  teacher = false,
  matching = false,
  hero,
  goals,
  notif,
  luna,
  lunaMemory,
  explain,
  account,
  onBack,
  backLabel,
  toast,
}) {
  const { t } = useI18n()
  const [sheet, setSheet] = useState(null)
  const close = () => setSheet(null)

  // Esc закрывает любое окно профиля (ТЗ, нефункциональные: «закрытие по Esc/скриму»).
  useEffect(() => {
    if (!sheet) return undefined
    const onKey = (e) => e.key === 'Escape' && setSheet(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  const learn = useLearning(token, matching && !teacher, toast)
  const showLearn = learn.visible || goals.length > 0

  const lessonRows = [
    ...(learn.visible
      ? [
          learn.formatRow({ onChoose: () => onNav?.('my-teacher') }),
          {
            key: 'tz',
            icon: <IcClock />,
            title: learn.mt('pb.tz'),
            sub: learn.mt('pb.tzNote'),
            value: zoneTitle(learn.tz),
            onClick: () => setSheet('tz'),
          },
        ]
      : []),
    ...(notif.visible
      ? [{ key: 'notif', icon: <IcBell />, title: t('profile.notifications'), sub: t('profile.v2.notifSub'), value: notif.enabled ? t('profile.notifOn') : t('profile.notifOff'), onClick: notif.open }]
      : []),
  ]

  const accountRows = [
    { key: 'lang', icon: <IcGlobe />, title: t('profile.v2.uiLang'), value: account.langLabel, onClick: account.openLang },
    { key: 'custom', icon: <IcPalette />, title: t('profile.v2.look'), sub: t('profile.v2.lookSub'), onClick: account.openCustom },
    { key: 'help', icon: <IcChat />, title: t('profile.v2.help'), sub: t('profile.v2.helpSub'), onClick: () => setSheet('help') },
    { key: 'docs', icon: <IcDoc />, title: t('profile.v2.docs'), sub: t(account.rules ? 'profile.v2.docsSub' : 'profile.v2.docsSubTeacher'), onClick: () => setSheet('docs') },
    { key: 'share', icon: <IcShare />, title: t('profile.shareApp'), onClick: account.share },
    { key: 'logout', icon: <IcLogout />, title: t('profile.logout'), onClick: account.onLogout, danger: true, noChev: true },
  ]

  // Окна — рядом с корнем, а не внутри: корень — контейнер container queries, а такой элемент становится опорой для
  // position: fixed потомков, и окно легло бы в колонку профиля вместо середины экрана. Цвета окнам даёт .pf2-layer.
  return (
    <>
      <div className="pf2">
        {onBack && (
          <button type="button" className="pf-back" onClick={onBack}>
            ← {backLabel || t('common.back')}
          </button>
        )}
        <div className="pf2-grid">
          <Hero hero={hero} />

          {showLearn && <h2 className="pf2-sect">{t('profile.v2.sectionLearning')}</h2>}
          {learn.visible && (
            <>
              <TeacherCard learn={learn} token={token} onNav={onNav} />
              <InterestsCard learn={learn} onPick={() => setSheet('interests')} />
            </>
          )}
          {goals.length > 0 && (
            <section className="pf2-card pf2-span" data-section="goals">
              <h3 className="pf2-card__h">{t('profile.v2.goals')}</h3>
              <RowList rows={goals} two />
            </section>
          )}

          <h2 className="pf2-sect">{t('profile.sectionSettings')}</h2>
          {lessonRows.length > 0 && (
            <section className={`pf2-card${luna.visible ? '' : ' pf2-span'}`} data-section="lessons">
              <h3 className="pf2-card__h">{t(learn.visible ? 'profile.v2.lessonsCard' : 'profile.notifications')}</h3>
              <RowList rows={lessonRows} />
            </section>
          )}
          {luna.visible && (
            <section className={`pf2-card${lessonRows.length ? '' : ' pf2-span'}`} data-section="luna">
              <h3 className="pf2-card__h">{t('profile.v2.lunaCard')}</h3>
              {explain && (
                <Segmented
                  label={t('profile.satExplain')}
                  sub={t('profile.v2.explainSub')}
                  value={explain.value}
                  options={EXPLAIN_LANGS.map((o) => ({ value: o.code, label: o.label, lang: o.code }))}
                  // «Сохранено» — по ответу сервера: выбор оптимистичный и при отказе откатывается
                  onPick={(v) => explain.pick(v).then((ok) => toast(t(ok ? 'profile.v2.saved' : 'profile.v2.saveFailed')))}
                  attr="data-explain"
                />
              )}
              <Segmented
                label={t('profile.v2.hints')}
                sub={t('profile.v2.hintsSub')}
                value={luna.level}
                options={PROACTIVE_LEVELS.map((v) => ({ value: v, label: t(`profile.v2.hints.${v}`), title: t(`profile.luna.note.${v}`) }))}
                onPick={(v) => {
                  luna.choose(v)
                  toast(t('profile.v2.saved'))
                }}
                attr="data-luna"
                first={!explain}
              />
              {lunaMemory && (
                <RowList
                  rows={[
                    {
                      key: 'memory',
                      icon: <IcBulb />,
                      title: t('profile.lunaMemory'),
                      sub: t('profile.v2.memorySub'),
                      value: lunaMemory.facts.length ? String(lunaMemory.facts.length) : t('profile.v2.memoryEmpty'),
                      muted: !lunaMemory.facts.length,
                      onClick: () => setSheet('memory'),
                    },
                  ]}
                  bordered
                />
              )}
            </section>
          )}

          <h2 className="pf2-sect">{t('profile.v2.sectionAccount')}</h2>
          <section className="pf2-card pf2-span" data-section="account">
            <RowList rows={accountRows} two />
          </section>
          <div className="pf2-span pf2-delete">
            <button type="button" className="pf-delete-link" onClick={account.onDelete}>
              {t('profile.delete.link')}
            </button>
          </div>
        </div>
      </div>

      <div className="pf2-layer">
        {sheet === 'interests' && <InterestsSheet learn={learn} onClose={close} />}
        {sheet === 'tz' && learn.visible && (
          <TimezoneModal token={token} current={learn.snap.card?.timezone} onClose={close} onSaved={(msg) => toast(msg)} />
        )}
        {sheet === 'memory' && lunaMemory && (
          <Sheet title={t('profile.lunaMemory')} onClose={close}>
            <LunaMemory memory={lunaMemory} />
          </Sheet>
        )}
        {sheet === 'help' && (
          <Sheet title={t('profile.v2.help')} onClose={close}>
            <RowList
              rows={[
                ...(account.feedback ? [{ key: 'feedback', icon: <IcChat />, title: t('profile.feedback'), sub: t('profile.v2.feedbackSub'), onClick: () => { close(); account.feedback() } }] : []),
                { key: 'support', icon: <IcHelp />, title: t('profile.support'), sub: t('profile.v2.supportSub'), onClick: () => { close(); account.support() } },
              ]}
            />
          </Sheet>
        )}
        {sheet === 'docs' && (
          <Sheet title={t('profile.v2.docs')} onClose={close} wide>
            {account.rules && (
              <RowList rows={[{ key: 'rules', icon: <IcDoc />, title: t('profile.rules'), sub: t('profile.v2.rulesSub'), onClick: () => { close(); account.rules() } }]} />
            )}
            <LegalDocumentsPanel className="legal-profile pf2-legal" />
          </Sheet>
        )}
      </div>
    </>
  )
}

// ── Шапка ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function Hero({ hero }) {
  const { t } = useI18n()
  const { avatar, avatarBg, initial, name, phone, rank, ieltsBand, stats, progress, onPickPhoto, onEdit } = hero
  return (
    <section className="pf2-card pf2-hero" aria-label={t('profile.v2.heroLabel')}>
      <div className="pf2-who">
        <div className="pf2-ava">
          {avatar ? (
            <img className="pf2-ava__img" src={avatar} alt="" />
          ) : (
            <span className="pf2-ava__initial" style={{ background: avatarBg }}>
              {initial || <UserIcon size={28} />}
            </span>
          )}
          <button type="button" className="pf2-ava__cam" onClick={onPickPhoto} aria-label={t('profile.m.editPhoto')}>
            <IcCamera />
          </button>
        </div>
        <div className="pf2-who__text">
          <h1 className="pf2-name">{name || t('profile.noName')}</h1>
          {phone && <div className="pf2-phone">{phone}</div>}
          {(rank || ieltsBand != null) && (
            <div className="pf2-chips">
              {rank && (
                <span className="pf2-chip" data-chip="rank">
                  {t('role.' + rank.roleKey)} · {rank.level}
                </span>
              )}
              {ieltsBand != null && (
                <span className="pf2-chip pf2-chip--warm" data-chip="ielts">
                  IELTS {ieltsBand}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="pf2-stats" style={{ '--pf2-stats': stats.length }}>
        {stats.map((s) => (
          <div key={s.key} className="pf2-stat" data-stat={s.key}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <button type="button" className="pf2-btn pf2-edit" onClick={onEdit}>
        {t('profile.v2.edit')}
      </button>
      {progress && <Progress progress={progress} />}
    </section>
  )
}

// Полоса до следующего звания — с числами (ТЗ FR-4: «До Паладина: 7 из 12»). Звание считает CEFR (kingdoms.js), а шаги —
// пройденные задания тропы своего уровня («Повторение», countProgress): ровно то же, что раньше полоса без цифр.
function Progress({ progress }) {
  const { t } = useI18n()
  const { done, total, nextRoleKey, level } = progress
  const known = total > 0
  const complete = known && done >= total
  const left = complete
    ? t('profile.levelComplete')
    : nextRoleKey
    ? t('profile.v2.toRank', { role: t('role.' + nextRoleKey) })
    : level
    ? t('profile.v2.levelProgress', { level })
    : t('profile.keepLearning')
  const pct = known ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="pf2-prog">
      <div className="pf2-prog__row">
        <span>{left}</span>
        {known && <span><b>{done}</b> {t('profile.v2.ofTotal', { total })}</span>}
      </div>
      <div
        className="pf2-prog__bar"
        role="progressbar"
        aria-label={left}
        aria-valuemin={0}
        aria-valuemax={known ? total : 100}
        aria-valuenow={known ? done : 0}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Подбор учителя: учитель, интересы, формат, часовой пояс ─────────────────────────────────────────────────────────
function useLearning(token, enabled, toast) {
  const { t: mt, lang } = useMatchingT()
  const snap = useMatching(enabled ? token : null)
  const view = matchingView(snap)
  const visible = enabled && !MATCHING_HIDDEN.has(view.status)
  const a = view.assignment
  const teacher = useTeacher(token, visible ? a?.teacherId : null)
  const tz = studentTimezone(snap.card)
  const next = visible && a ? nextOccurrence(a.slots, new Date(), view.lessonWindow) : null

  // Чип отмечается сразу, не дожидаясь сервера; отказ возвращает прежний список (как в ProfileBlocks).
  const saveInterests = async (list) => {
    const before = snap.card
    applyMatchingCard({ ...before, interests: list })
    try {
      applyMatchingCard(await saveMatchingInterests(token, list))
      return true
    } catch (e) {
      applyMatchingCard(before)
      toast(errorText(e, mt))
      return false
    }
  }

  // Формат выбирают не все: у гарантии, IELTS и SAT его нет (needsFormatStep, как в «Мой учитель») — там занятия «по
  // программе платформы», и звать их выбирать формат значило бы отправить туда, где выбора нет.
  const formatRow = ({ onChoose }) => {
    const format = !view.needsFormatStep ? mt('format.platform') : view.format ? mt('format.' + view.format) : null
    const perWeek = view.tariff?.perWeek
    return {
      key: 'format',
      icon: <IcScreen />,
      title: mt('pb.format'),
      sub: [format || null, perWeek ? mt('pb.perWeek') + ': ' + perWeek : null].filter(Boolean).join(' · ') || null,
      // Формат не выбран — значение предупреждением и прямое действие (ТЗ, C); выбран — строка только показывает.
      value: format ? null : mt('pb.formatNone'),
      warn: !format,
      onClick: format ? null : onChoose,
    }
  }

  return {
    visible,
    snap,
    view,
    tz,
    assignment: a,
    teacherName: teacher?.card?.name || a?.teacherName || '',
    teacherHasPhoto: teacher?.card?.hasPhoto ?? true,
    nextLabel: next ? lessonDateLabel(next, tz, lang) : null,
    kids: view.tariff?.name === 'Kids',
    interests: view.interests || [],
    saveInterests,
    formatRow,
    mt,
    lang,
  }
}

function TeacherCard({ learn, token, onNav }) {
  const { t } = useI18n()
  const { mt, assignment: a, view } = learn
  return (
    <section className="pf2-card" data-section="teacher">
      <h3 className="pf2-card__h">{t('profile.v2.teacher')}</h3>
      {a ? (
        <div className="pf2-teacher">
          <TeacherPhoto token={token} teacherId={a.teacherId} name={learn.teacherName} hasPhoto={learn.teacherHasPhoto} className="mt-ava pf2-teacher__ava" />
          <div className="pf2-teacher__text">
            <b>{learn.teacherName}</b>
            <span>{learn.nextLabel ? mt('pb.next', { date: learn.nextLabel }) : t('profile.v2.noNextLesson')}</span>
          </div>
          <span className="pf2-badge">{mt('pb.fixed')}</span>
          <button type="button" className="pf2-btn" onClick={() => onNav?.('my-teacher')}>
            {mt('btn.open')}
          </button>
        </div>
      ) : (
        <div className="pf2-empty">
          <span>{view.status === 'none' ? mt('pb.chooseText') : mt('st.' + view.status)}</span>
          <button type="button" className="pf2-btn pf2-btn--primary" onClick={() => onNav?.(view.status === 'none' ? 'teacher-wizard' : 'my-teacher')}>
            {view.status === 'none' ? mt('btn.chooseTeacher') : mt('btn.open')}
          </button>
        </div>
      )}
    </section>
  )
}

function InterestsCard({ learn, onPick }) {
  const { t } = useI18n()
  const { interests, lang, kids } = learn
  return (
    <section className="pf2-card" data-section="interests">
      <h3 className="pf2-card__h">
        {t(kids ? 'profile.v2.interestsKids' : 'profile.v2.interests')} <small>· {t('profile.v2.interestsSub')}</small>
      </h3>
      {interests.length ? (
        <div className="pf2-chips pf2-chips--wrap">
          {interests.map((item) => (
            <span key={item} className="pf2-pill is-on">
              {interestLabel(lang, item)}
            </span>
          ))}
          <button type="button" className="pf2-pill" onClick={onPick}>
            {t('profile.v2.interestsChange')}
          </button>
        </div>
      ) : (
        <div className="pf2-empty pf2-empty--warn">
          <span>{t('profile.v2.interestsEmpty')}</span>
          <button type="button" className="pf2-btn pf2-btn--primary" onClick={onPick}>
            {t('profile.v2.interestsPick', { max: MAX_INTERESTS })}
          </button>
        </div>
      )}
    </section>
  )
}

// Выбор интересов — окном со всеми категориями (ТЗ FR-1): максимум 5, остальные чипы гаснут, «Сохранить» / «Отмена».
function InterestsSheet({ learn, onClose }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(learn.interests)
  const [busy, setBusy] = useState(false)
  const full = draft.length >= MAX_INTERESTS
  const toggle = (item) => {
    const next = toggleInterest(draft, item)
    if (!next.error) setDraft(next.list)
  }
  const save = async () => {
    setBusy(true)
    const ok = await learn.saveInterests(draft)
    setBusy(false)
    if (ok) onClose()
  }
  return (
    <Sheet title={t('profile.v2.interestsTitle')} onClose={onClose} wide>
      <p className="pf2-sheet__lead">{t('profile.v2.interestsCount', { k: draft.length, max: MAX_INTERESTS })}</p>
      {INTEREST_CATS.map((cat) => (
        <div key={cat.id} className="pf2-group">
          <h4>{learn.mt('cat.' + cat.id)}</h4>
          <div className="pf2-chips pf2-chips--wrap">
            {cat.items.map((item) => {
              const on = draft.includes(item)
              return (
                <button key={item} type="button" className={`pf2-pill${on ? ' is-on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle(item)}>
                  {interestLabel(learn.lang, item)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="pf2-sheet__actions">
        <button type="button" className="pf2-btn" onClick={onClose}>
          {t('profile.cancel')}
        </button>
        <button type="button" className="pf2-btn pf2-btn--primary" disabled={busy} onClick={save}>
          {busy ? t('profile.editSaving') : t('profile.editSave')}
        </button>
      </div>
    </Sheet>
  )
}

// ── Кирпичи ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Строка списка: значок 32, заголовок, подпись, значение справа, шеврон; высота от 44 (ТЗ, «Дизайн»).
function RowList({ rows, two = false, bordered = false }) {
  return (
    <div className={`pf2-list${two ? ' pf2-list--two' : ''}${bordered ? ' pf2-list--bordered' : ''}`}>
      {rows.map((r) => {
        const body = (
          <>
            <span className="pf2-row__ic">{r.icon}</span>
            <span className="pf2-row__t">
              <b>{r.title}</b>
              {r.sub && <span>{r.sub}</span>}
            </span>
            {r.value != null && <span className={`pf2-row__v${r.warn ? ' is-warn' : ''}${r.muted ? ' is-muted' : ''}`}>{r.value}</span>}
            {r.onClick && !r.noChev && <span className="pf2-row__chev" aria-hidden="true">›</span>}
          </>
        )
        // .pf-row — только кнопкам: у него в styles.css курсор-рука и подсветка, а строка без действия кнопкой не прикидывается.
        const cls = `pf2-row${r.danger ? ' is-danger' : ''}`
        return r.onClick ? (
          <button key={r.key} type="button" className={`${cls} pf-row`} data-key={r.key} onClick={r.onClick}>
            {body}
          </button>
        ) : (
          <div key={r.key} className={cls} data-key={r.key}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

// Настройка переключателем в строке (ТЗ FR-3): сохраняется по нажатию, aria-pressed у вариантов.
function Segmented({ label, sub, value, options, onPick, attr, first = false }) {
  return (
    <div className={`pf2-seg${first ? ' pf2-seg--first' : ''}`}>
      <div className="pf2-seg__lbl">
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </div>
      <div className="pf2-seg__opts" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            className={o.value === value ? 'is-on' : ''}
            title={o.title}
            lang={o.lang}
            {...{ [attr]: o.value }}
            onClick={() => o.value !== value && onPick(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Окно поверх профиля — те же классы, что у прежних окон профиля (.pf-modal): тёмная тема и мобильный слой их знают.
// Фокус уходит в окно и возвращается на кнопку, которая его открыла: иначе Tab бродил бы по странице под окном.
function Sheet({ title, children, onClose, wide = false }) {
  const { t } = useI18n()
  const ref = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    ref.current?.focus()
    return () => before?.focus?.()
  }, [])
  return (
    <div className="pf-modal" onClick={onClose}>
      <div ref={ref} tabIndex={-1} className={`pf-modal__sheet pf2-sheet${wide ? ' pf2-sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="pf2-sheet__head">
          <div className="pf-modal__title">{title}</div>
          <button type="button" className="pf2-sheet__x" onClick={onClose} aria-label={t('profile.v2.close')}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Значки: линия 1.8, как у прежних значков профиля ──────────────────────────────────────────────────────────────
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true }
const IcCamera = () => (<svg {...S} width={15} height={15}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>)
const IcClock = () => (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>)
const IcBell = () => (<svg {...S}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>)
const IcScreen = () => (<svg {...S}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /></svg>)
const IcGlobe = () => (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>)
const IcPalette = () => (<svg {...S}><path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="8" r="1" /></svg>)
const IcChat = () => (<svg {...S}><path d="M4 5h16v11H8l-4 4V5Z" /></svg>)
const IcHelp = () => (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 3.5 2.3c0 1.5-2 1.7-2 3M12 16.5h.01" /></svg>)
const IcDoc = () => (<svg {...S}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>)
const IcShare = () => (<svg {...S}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" /></svg>)
const IcLogout = () => (<svg {...S}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h9" /></svg>)
const IcBulb = () => (<svg {...S}><path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3Z" /><path d="M10 22h4" /></svg>)
export const IcTest = () => (<svg {...S}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>)
export const IcCap = () => (<svg {...S}><path d="M12 3 2 8l10 5 10-5-10-5Z" /><path d="M6 10v5c3 2 9 2 12 0v-5" /></svg>)
