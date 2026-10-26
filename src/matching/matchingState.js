// Статус ученика в подборе не хранится на сайте — он выводится из карточки бэкенда (спека §2). Тогда меню,
// «Мой учитель», профиль и окна при входе не могут разойтись между собой: у них одна функция и одна карточка.

const NO_FORMAT_TARIFFS = new Set(['IELTS', 'SAT'])
// Заявки, которые ученик видит строками «Статус заявок»: свои и менеджерские. Встречная заявка на другое время
// (student_counter) и повторное закрепление — служебные, у них своё место на экране.
const VISIBLE_SOURCES = new Set(['student', 'manager_proposal', 'manager_assigned'])

function requestState(r) {
  if (r.status === 'sent') return 'waiting'
  if (r.status === 'schedule_proposed' || r.status === 'schedule_confirmed') return 'accepted'
  if (r.status === 'declined') return 'declined'
  if (r.status === 'expired') return 'expired'
  return 'cancelled'
}

const liveCounter = (card) =>
  (card.requests || []).find((r) => r.source === 'student_counter' && r.status === 'sent') || null

function statusOf(card) {
  const s = card.matchStatus
  // Попросил менеджера ещё до подтверждения тарифа — для ученика это уже «менеджер подбирает» (ТЗ §4).
  if (s === 'tariff') return card.askedAt ? 'manager_picking' : card.tariffConfirmed ? 'none' : 'tariff_pending'
  if (s === 'ask') return 'manager_picking'
  if (s === 'self') return 'none'
  if (s === 'help') return card.reasonCode === 'confirm_expired' ? 'confirm_expired' : 'none'
  if (s === 'sent') return 'matching'
  if (s === 'confirm') return liveCounter(card) ? 'change_requested' : 'schedule_proposed'
  if (s === 'change') return 'change_pending'
  if (s === 'done') return 'assigned'
  return 'none'
}

// Чьё время предлагалось. В 'confirm' бэкенд кладёт предложенного учителя в assignedTeacher*, а после истечения
// срока (help/confirm_expired) — уже нет: тогда имя берём из последней заявки с этим временем (список — новые первыми).
function proposalOf(card, status) {
  if (!['schedule_proposed', 'change_requested', 'confirm_expired'].includes(status)) return null
  const reqs = card.requests || []
  const proposed = reqs.find((r) => r.status === 'schedule_proposed')
    || reqs.find((r) => r.source !== 'student_counter' && (r.proposedSlots || []).length)
    || null
  const live = status !== 'confirm_expired'
  return {
    teacherId: (live ? card.assignedTeacherId : null) ?? proposed?.teacherId ?? null,
    teacherName: (live ? card.assignedTeacherName : null) ?? proposed?.teacherName ?? '',
    slots: card.proposedSlots || [],
    deadline: card.deadline || null,
    by: String(proposed?.source || '').startsWith('manager') ? 'manager' : 'teacher',
    commonSlots: proposed?.availableSlots || [],
  }
}

export function matchingView(snap, now = new Date()) {
  if (!snap || snap.status === 'idle' || snap.status === 'loading') return { status: snap?.status || 'idle', badge: 0 }
  if (snap.status === 'not_added') return { status: 'no_subscription', badge: 0 }
  if (snap.status !== 'ready' || !snap.card) return { status: 'unavailable', badge: 0 }
  const card = snap.card
  const status = statusOf(card)
  const handoffs = snap.handoffs || []
  const requests = (card.requests || [])
    .filter((r) => VISIBLE_SOURCES.has(r.source))
    .map((r) => ({ ...r, state: requestState(r) }))
    .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9))
  const counter = liveCounter(card)
  const vacationHandoff = handoffs.find((h) => !h.studentChoice) || null
  const pauseHandoff = handoffs.find((h) => h.studentChoice === 'pause') || null
  const today = now.toISOString().slice(0, 10)
  const temporary = card.temporaryFrom && card.temporaryTo && card.temporaryFrom <= today && today <= card.temporaryTo
    ? { from: card.temporaryFrom, to: card.temporaryTo, teacherName: card.assignedTeacherName }
    : null
  const badge = status === 'none' || status === 'schedule_proposed' || status === 'confirm_expired'
    || (status === 'assigned' && vacationHandoff) ? 1 : 0
  return {
    status,
    badge,
    studentId: card.studentId,
    needsFormatStep: !card.guarantee && !NO_FORMAT_TARIFFS.has(card.tariff),
    tariff: {
      name: card.tariff,
      guarantee: !!card.guarantee,
      duration: card.lessonDuration,
      perWeek: card.lessonsPerWeek,
      confirmed: !!card.tariffConfirmed,
    },
    managerName: card.responsibleManagerName || null,
    allDeclined: card.matchStatus === 'help' && card.reasonCode === 'all_declined',
    changeApproved: status === 'none' && card.excludedTeacherId != null,
    proposal: proposalOf(card, status),
    counter: counter ? { slots: counter.proposedSlots || [], expiresAt: counter.expiresAt } : null,
    requests,
    managerRequest: status === 'manager_picking'
      ? { managerName: card.responsibleManagerName || null, wish: card.wish || '', dueAt: card.deadline || null, slots: card.availableSlots || [] }
      : null,
    assignment: status === 'assigned' || status === 'change_pending'
      ? {
          teacherId: card.assignedTeacherId,
          teacherName: card.assignedTeacherName,
          slots: card.finalSlots || [],
          format: card.format || null,
          duration: card.lessonDuration,
        }
      : null,
    vacation: vacationHandoff
      ? { id: vacationHandoff.id, teacherName: vacationHandoff.teacherName, from: vacationHandoff.dateFrom, to: vacationHandoff.dateTo }
      : null,
    temporary,
    paused: pauseHandoff ? { from: pauseHandoff.dateFrom, to: pauseHandoff.dateTo } : null,
    change: card.change || null,
    format: card.format || null,
    interests: card.interests || [],
    availableSlots: card.availableSlots || [],
    limits: {
      formatChangeAvailableAt: card.formatChangeAvailableAt || null,
      teacherChangesLeft: card.teacherChangesLeft ?? 2,
    },
  }
}

// Окно при входе — только там, где ждут действия (ТЗ 2.12), и одно на событие: ключ несёт срок или id события,
// поэтому новое предложение после «другого времени» снова покажет окно, а повторный заход с тем же — нет.
export function popupFor(v) {
  if (!v) return null
  if (v.status === 'schedule_proposed') return { kind: 'proposal', key: 'proposal:' + (v.proposal?.deadline || '') }
  if (v.status === 'confirm_expired') return { kind: 'expired', key: 'expired:' + (v.proposal?.deadline || '') }
  if (v.allDeclined) return { kind: 'all_declined', key: 'declined:' + v.requests.map((r) => r.id).join(',') }
  if (v.changeApproved && v.change?.id) return { kind: 'approved', key: 'approved:' + v.change.id }
  if (v.vacation) return { kind: 'vacation', key: 'vacation:' + v.vacation.id }
  return null
}

// Последний шаг онбординга нужен, пока учителя нет и заявки не отправлены (ТЗ §2.1).
export function needsTeacherPick(v) {
  return v?.status === 'tariff_pending' || v?.status === 'none'
}
