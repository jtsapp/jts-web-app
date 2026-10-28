import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getMatchingGrid, saveMatchingPreferences, sendMatchingRequests } from '../api.js'
import { useMatching, applyMatchingCard, flashMatching, refreshMatching } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'
import { useMatchingT, FORMAT_CODES, pluralForm } from '../matching/texts.js'
import { loadDraft, saveDraft, clearDraft, draftIsCurrent } from '../matching/wizardDraft.js'
import {
  bestCells, localOf, schoolDaysCount, slotKey, studentTimezone, teachersFitting,
} from '../matching/slots.js'
import WizardHead from '../matching/WizardHead.jsx'
import TimeGrid from '../matching/TimeGrid.jsx'
import TeachersStep from '../matching/TeachersStep.jsx'
import TeacherProfileModal from '../matching/TeacherProfileModal.jsx'
import ManagerPickModal, { managerButtonLabel } from '../matching/ManagerPickModal.jsx'
import TimezoneModal, { zoneTitle } from '../matching/TimezoneModal.jsx'
import { errorText, useBusy, useToast } from '../matching/ui.jsx'

// Мастер подбора (ТЗ §2.2–§2.4): «Формат → Время → Учитель», без «Формата» у гарантии, IELTS и SAT. Где ученик
// остановился (шаг, формат, слоты, интересы, выбор) — черновик на устройстве; слоты и интересы ещё и в карточке
// бэкенда, поэтому вернувшийся с другого устройства видит их на месте.
const WIZARD_STATUSES = new Set(['none', 'confirm_expired'])
const keyToSlot = (k) => {
  const [w, hm] = k.split('-')
  return { weekday: Number(w), start: hm + ':00' }
}

export default function TeacherWizardPage({ token, userName, userLevel, initialStep, onNav, onProfile }) {
  const { t, lang } = useMatchingT()
  const snap = useMatching(token)
  const view = matchingView(snap)
  const card = snap.card
  const [toastNode, toast] = useToast()

  // «Добавить время» из «Подтвердите расписание» (ТЗ §2.7): общих часов с учителем мало — ученик дополняет удобное
  // время, и «Выбрать другое время» берёт уже расширенный набор. Мастер тогда из одного шага «Время».
  const addTime = initialStep === 'time' && view.status === 'schedule_proposed'
  // Повторный вход при отправленных заявках ведёт на их статус, а не на первый шаг (ТЗ §2.6).
  const leave = !['idle', 'loading'].includes(view.status) && !WIZARD_STATUSES.has(view.status) && !addTime
  useEffect(() => {
    if (leave) onNav(view.status === 'tariff_pending' ? 'teacher-pick' : 'my-teacher')
  }, [leave, view.status, onNav])

  const layout = (children) => (
    <LearningLayout userName={userName} userLevel={userLevel} active="my-teacher" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="mt">
        <div className="mt-wrap mt-wrap--bar">{children}</div>
      </div>
      {toastNode}
    </LearningLayout>
  )

  if (!card || leave) return layout(<p className="mt-muted">{t('loading')}</p>)
  return layout(<Wizard key={card.studentId} token={token} card={card} view={view} initialStep={initialStep} addTime={addTime} onNav={onNav} toast={toast} lang={lang} t={t} />)
}

function Wizard({ token, card, view, initialStep, addTime, onNav, toast, lang, t }) {
  const tz = studentTimezone(card)
  const steps = addTime ? ['time'] : view.needsFormatStep ? ['format', 'time', 'teacher'] : ['time', 'teacher']
  const perWeek = view.tariff.perWeek
  const kids = view.tariff.name === 'Kids'
  const [draft, setDraft] = useState(() => {
    const saved = loadDraft(card.studentId)
    const d = draftIsCurrent(saved, card.statusChangedAt) ? saved : loadDraft(null)
    return {
      step: steps.includes(initialStep) ? initialStep : steps.includes(d.step) ? d.step : steps[0],
      format: view.needsFormatStep ? d.format || card.format || null : 'platform',
      picked: (d.slots.length ? d.slots : card.availableSlots || []).map(slotKey),
      interests: d.interests.length ? d.interests : card.interests || [],
      choices: d.choices,
    }
  })
  const [grid, setGrid] = useState(null)
  const [gridError, setGridError] = useState(false)
  const [modal, setModal] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [busy, run] = useBusy()
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const index = steps.indexOf(draft.step)

  // Шаг сменился — к началу экрана: сетка времени длинная, и шаг «Учителя» иначе открывался бы с середины.
  useEffect(() => {
    try {
      document.querySelector('.learn__main')?.scrollTo?.({ top: 0 })
      window.scrollTo({ top: 0 })
    } catch {
      /* jsdom без прокрутки — тестам она не нужна */
    }
  }, [draft.step])

  useEffect(() => {
    saveDraft(card.studentId, { step: draft.step, format: draft.format, slots: draft.picked.map(keyToSlot), interests: draft.interests, choices: draft.choices })
  }, [card.studentId, draft])

  // Сетка нужна шагу «Время» (цифры в ячейках) и шагу «Формат» (сколько учителей у каждого формата).
  const gridFormat = draft.step === 'time' ? draft.format : null
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (draft.step === 'teacher') return undefined
    let alive = true
    getMatchingGrid(token, gridFormat)
      .then((g) => {
        if (!alive) return
        setGrid(g)
        setGridError(false)
      })
      .catch(() => alive && setGridError(true))
    return () => {
      alive = false
    }
  }, [token, gridFormat, draft.step, reload])

  const cells = grid?.slots || []
  const days = schoolDaysCount(draft.picked.map(keyToSlot))
  const fitting = teachersFitting(cells, draft.picked, perWeek)
  const enoughDays = days >= perWeek
  // У ученика не в UTC+5 два разных своих дня могут оказаться одним днём школы — объясняем, а не молчим.
  const localDays = new Set(draft.picked.map((k) => localOf(keyToSlot(k), tz).day)).size
  const schoolDayHint = localDays > days
  const best = enoughDays && fitting.length === 0 ? bestCells(cells, draft.picked) : []

  const back = () => {
    if (index > 0) set({ step: steps[index - 1] })
    else onNav('my-teacher')
  }

  const toTeachers = () =>
    run(async () => {
      try {
        const saved = await saveMatchingPreferences(token, {
          slots: draft.picked.map(keyToSlot),
          interests: draft.interests,
          wish: null,
          format: draft.format,
        })
        applyMatchingCard(saved)
        if (addTime) {
          // время добавлено в карточку — черновик своё отслужил и не должен вернуть эти клетки потом
          clearDraft(card.studentId)
          flashMatching(t('time.added'))
          onNav('my-teacher')
        } else set({ step: 'teacher' })
      } catch (e) {
        toast(errorText(e, t))
        refreshMatching(token)
      }
    })

  const send = () =>
    run(async () => {
      try {
        applyMatchingCard(await sendMatchingRequests(token, draft.choices))
        clearDraft(card.studentId)
        flashMatching(t('teachers.sent'))
        onNav('my-teacher')
      } catch (e) {
        toast(errorText(e, t))
        refreshMatching(token)
        // время заняли или учитель больше не подходит — к сетке со свежими цифрами: список учителей того же
        // времени дал бы тот же отказ; выбор сбрасываем, он строился на старых данных
        if (e?.code === 'slot_taken' || e?.code === 'teacher_unavailable') {
          set({ step: 'time', choices: [] })
          setReload((n) => n + 1)
        }
      }
    })

  const managerOpen = view.status === 'manager_picking'
  const head = (
    <WizardHead
      steps={steps}
      index={index}
      tariff={view.tariff}
      onBack={back}
      onManager={() => !managerOpen && setModal({ kind: 'manager' })}
      managerLabel={managerButtonLabel(view, t, tz, lang)}
    />
  )

  const modals = (
    <>
      {modal?.kind === 'manager' && (
        <ManagerPickModal
          token={token}
          view={view}
          slots={draft.picked.map(keyToSlot)}
          interests={draft.interests}
          format={draft.format}
          tz={tz}
          onClose={() => setModal(null)}
          onSent={(text) => {
            clearDraft(card.studentId)
            flashMatching(text)
            onNav('my-teacher')
          }}
        />
      )}
      {modal?.kind === 'tz' && <TimezoneModal token={token} current={card.timezone} onClose={() => setModal(null)} onSaved={toast} />}
      {modal?.kind === 'profile' && (
        <TeacherProfileModal
          token={token}
          teacherId={modal.id}
          mode="wizard"
          tz={tz}
          myInterests={draft.interests}
          format={draft.format}
          priority={draft.choices.indexOf(modal.id)}
          canPick={draft.choices.length < 3}
          onPick={(id) => {
            if (draft.choices.length >= 3) toast(t('teachers.limit'))
            else set({ choices: [...draft.choices, id] })
          }}
          onUnpick={(id) => set({ choices: draft.choices.filter((x) => x !== id) })}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )

  if (draft.step === 'format') {
    return (
      <>
        {head}
        <div className="mt-stack mt-stack--tight">
          <h1 className="mt-h1">{t('format.title')}</h1>
          <p className="mt-muted">{t('format.sub')}</p>
        </div>
        <div className="mt-grid3">
          {FORMAT_CODES.map((f) => (
            <button key={f} type="button" className="mt-opt" aria-pressed={draft.format === f} onClick={() => set({ format: f })}>
              <span className="mt-opt__ic">{f === 'platform' ? 'JTS' : f === 'books' ? 'EF' : '✎'}</span>
              <h3 className="mt-h3">{t('format.' + f)}</h3>
              <p className="mt-small mt-muted">{t('format.' + f + '.d')}</p>
              {grid && <span className="mt-tiny">{t('format.available', { n: grid.formats?.[f] ?? 0 })}</span>}
            </button>
          ))}
        </div>
        <div className="mt-row mt-end">
          <button type="button" className="mt-btn" disabled={!draft.format} onClick={() => set({ step: 'time' })}>{t('format.next')}</button>
        </div>
        {modals}
      </>
    )
  }

  if (draft.step === 'time') {
    const k = draft.picked.length
    return (
      <>
        {head}
        <div className="mt-stack mt-stack--tight">
          <h1 className="mt-h1">{t(kids ? 'time.titleKids' : 'time.title')}</h1>
          <p className="mt-muted">{t('time.sub', { n: perWeek })}</p>
        </div>
        <div className="mt-card mt-stack">
          <div className="mt-row mt-between">
            <div className="mt-row">
              <span className="mt-small"><b>{t('time.perWeek')}</b> {perWeek}</span>
              <span className="mt-pill mt-pill--gray">{t('time.durationChip', { n: view.tariff.duration })}</span>
              <span className="mt-tiny">{t('tariff.changeHint')}</span>
            </div>
            <span className="mt-small">
              🌍 {t('time.tz')} <b>{zoneTitle(tz)}</b>{' '}
              <button type="button" className="mt-link" onClick={() => setModal({ kind: 'tz' })}>{t('time.tzChange')}</button>
            </span>
          </div>
          {gridError ? (
            <div className="mt-banner mt-banner--warn">
              <p>{t('time.loadError')}</p>
              <button type="button" className="mt-btn mt-btn--sm" onClick={() => setReload((n) => n + 1)}>{t('time.retry')}</button>
            </div>
          ) : !grid ? (
            <p className="mt-muted">{t('loading')}</p>
          ) : (
            <TimeGrid cells={cells} duration={view.tariff.duration} tz={tz} picked={draft.picked} best={best} onChange={(picked) => set({ picked })} />
          )}
          <div className="mt-legend">
            <span><i style={{ background: 'var(--mt-soft)' }} />{t('time.legend.many')}</span>
            <span><i style={{ background: 'var(--mt-softer)' }} />{t('time.legend.few')}</span>
            <span><i style={{ background: 'var(--mt-bg)' }} />{t('time.legend.zero')}</span>
            <span>{t('time.legend.note', { n: view.tariff.duration })}</span>
          </div>
        </div>
        {!addTime && enoughDays && grid && fitting.length === 0 && (
          <div className="mt-banner mt-banner--warn">
            <p>{t('time.none')}</p>
            <button type="button" className="mt-btn mt-btn--sm mt-btn--ghost" onClick={() => !managerOpen && setModal({ kind: 'manager' })}>
              {managerButtonLabel(view, t, tz, lang)}
            </button>
          </div>
        )}
        {!addTime && enoughDays && fitting.length > 0 && fitting.length < 3 && (
          <div className="mt-banner mt-banner--brand"><p>{t('time.few', { n: fitting.length })}</p></div>
        )}
        <div className="mt-bar">
          <span>
            {t('time.picked', {
              k,
              slots: t('time.slot.' + pluralForm(k)),
              d: days,
              days: t('time.day.' + (days === 1 ? 'one' : 'many')),
            })}{' '}
            {!enoughDays && t('time.needDays', { n: perWeek })}
            {schoolDayHint && <span className="mt-tiny" style={{ display: 'block' }}>{t('time.schoolDays')}</span>}
          </span>
          <button
            type="button"
            className="mt-btn"
            disabled={busy || (addTime ? draft.picked.length === 0 : !enoughDays || fitting.length === 0)}
            onClick={toTeachers}
          >
            {addTime ? t('time.saveAdded') : t('time.show', { n: fitting.length })}
          </button>
        </div>
        {modals}
      </>
    )
  }

  return (
    <>
      {head}
      <div className="mt-stack mt-stack--tight">
        <h1 className="mt-h1">{t('teachers.title')}</h1>
        <p className="mt-muted">{t('teachers.sub', { n: perWeek })}</p>
      </div>
      <TeachersStep
        token={token}
        tz={tz}
        kids={kids}
        pickedTotal={draft.picked.length}
        interests={draft.interests}
        onInterests={(interests) => set({ interests })}
        choices={draft.choices}
        onChoices={(choices) => set({ choices })}
        onProfile={(id) => setModal({ kind: 'profile', id })}
        onLimit={() => toast(t('interests.limit'))}
        toast={toast}
        onLoaded={(list) => {
          setTeachers(list)
          // выбранный раньше учитель мог выпасть из подбора (другое время, интересы) — убрать его из выбора нечем,
          // карточки в списке нет, а с ним заявка получала бы отказ при каждой отправке
          setDraft((d) => ({ ...d, choices: d.choices.filter((id) => list.some((x) => x.id === id)) }))
        }}
      />
      <ChosenBar choices={draft.choices} teachers={teachers} busy={busy} onSend={send} t={t} />
      {modals}
    </>
  )
}

// Панель снизу шага «Учителя»: «Выбрано: k из 3 · 1. Айгерим · 2. Данияр» + «Отправить заявки».
function ChosenBar({ choices, teachers, busy, onSend, t }) {
  const names = useMemo(() => new Map(teachers.map((x) => [x.id, x.name])), [teachers])
  return (
    <div className="mt-bar">
      <span>
        <b>{t('teachers.picked', { k: choices.length })}</b>{' '}
        {choices.map((id, i) => `${i + 1}. ${String(names.get(id) || '').split(' ')[0]}`).join(' · ')}
      </span>
      <button type="button" className="mt-btn" disabled={!choices.length || busy} onClick={onSend}>{t('teachers.send')}</button>
    </div>
  )
}
