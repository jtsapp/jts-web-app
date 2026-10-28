import { useEffect, useMemo, useRef, useState } from 'react'
import { getMatchingTeachers, saveMatchingInterests } from '../api.js'
import InterestsPicker from './InterestsPicker.jsx'
import TeacherCard from './TeacherCard.jsx'
import { useMatchingT } from './texts.js'

const AGES = ['20–25', '26–35', '35+']
const EXPS = [0, 3, 5]
const MAX_CHOICES = 3

// Шаг «Учителя» (ТЗ §2.4): фильтры слева (на телефоне — сверху), список карточек, выбор до трёх с приоритетом.
// Процент совпадения считает сервер по интересам карточки, поэтому смена интересов сохраняется (с паузой, чтобы
// не слать запрос на каждый клик) и список перечитывается.
export const STUDENT_AGES = ['kids', 'teens', 'adults']

export default function TeachersStep({ token, tz, kids, pickedTotal, interests, onInterests, choices, onChoices, onProfile, onLimit, toast, onLoaded }) {
  const { t } = useMatchingT()
  const [list, setList] = useState(null)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState({ age: 'all', spec: 'all', exp: 0 })
  // Кого учит учитель — фильтрует сервер, поэтому смена значения перечитывает список.
  const [students, setStudents] = useState('all')
  const first = useRef(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!first.current) await saveMatchingInterests(token, interests)
        first.current = false
        const next = await getMatchingTeachers(token, students === 'all' ? null : students)
        if (alive) {
          setList(Array.isArray(next) ? next : [])
          setError(false)
          onLoaded?.(Array.isArray(next) ? next : [])
        }
      } catch {
        if (alive) setError(true)
      }
    }
    const timer = setTimeout(load, first.current ? 0 : 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
    // onLoaded — колбэк родителя, на смену его ссылки список не перечитываем
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, interests, students])

  const specs = useMemo(() => [...new Set((list || []).flatMap((x) => x.specializations || []))].sort(), [list])
  const shown = (list || [])
    .filter((x) => filters.age === 'all' || x.ageGroup === filters.age)
    .filter((x) => filters.spec === 'all' || (x.specializations || []).includes(filters.spec))
    .filter((x) => (x.yearsExperience || 0) >= filters.exp)
    .sort((a, b) => b.matchPercent - a.matchPercent)

  const pick = (id) => {
    if (choices.includes(id)) return
    if (choices.length >= MAX_CHOICES) {
      toast(t('teachers.limit'))
      return
    }
    onChoices([...choices, id])
  }

  return (
    <div className="mt-layout3">
      <aside className="mt-card mt-filters" aria-label={t('teachers.filters')}>
        <h3 className="mt-h3">{t('teachers.filters')}</h3>
        <div className="mt-fgroup">
          <div className="mt-row mt-between">
            <span className="mt-small"><b>{t(kids ? 'teachers.interestsKids' : 'teachers.interests')}</b></span>
            <span className="mt-tiny">{interests.length} / 5</span>
          </div>
          <InterestsPicker value={interests} onChange={onInterests} onLimit={onLimit} hint={t('teachers.interestsHint')} />
        </div>
        <div className="mt-fgroup">
          <label className="mt-small" htmlFor="mt-fstudents"><b>{t('teachers.studentAge')}</b></label>
          <select id="mt-fstudents" className="mt-select" value={students} onChange={(e) => setStudents(e.target.value)}>
            <option value="all">{t('teachers.any')}</option>
            {STUDENT_AGES.map((a) => <option key={a} value={a}>{t('studentAge.' + a)}</option>)}
          </select>
        </div>
        <div className="mt-fgroup">
          <label className="mt-small" htmlFor="mt-fage"><b>{t('teachers.age')}</b></label>
          <select id="mt-fage" className="mt-select" value={filters.age} onChange={(e) => setFilters({ ...filters, age: e.target.value })}>
            <option value="all">{t('teachers.any')}</option>
            {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="mt-fgroup">
          <label className="mt-small" htmlFor="mt-fspec"><b>{t('teachers.spec')}</b></label>
          <select id="mt-fspec" className="mt-select" value={filters.spec} onChange={(e) => setFilters({ ...filters, spec: e.target.value })}>
            <option value="all">{t('teachers.anyF')}</option>
            {specs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mt-fgroup">
          <label className="mt-small" htmlFor="mt-fexp"><b>{t('teachers.exp')}</b></label>
          <select id="mt-fexp" className="mt-select" value={filters.exp} onChange={(e) => setFilters({ ...filters, exp: Number(e.target.value) })}>
            {EXPS.map((n) => <option key={n} value={n}>{n ? t('teachers.expYears', { n }) : t('teachers.any')}</option>)}
          </select>
        </div>
      </aside>
      <div className="mt-stack">
        {error && <p className="mt-banner mt-banner--warn">{t('teachers.loadError')}</p>}
        {list === null && !error && <p className="mt-muted">{t('loading')}</p>}
        {list !== null && (
          <p className="mt-small mt-muted">{t('teachers.count', { n: shown.length })}</p>
        )}
        {list !== null && shown.length === 0 && (
          <div className="mt-card mt-stack">
            <h2 className="mt-h2">{t('teachers.emptyTitle')}</h2>
            <p className="mt-muted">{t('teachers.emptyText')}</p>
          </div>
        )}
        {shown.map((teacher) => (
          <TeacherCard
            key={teacher.id}
            token={token}
            teacher={teacher}
            tz={tz}
            pickedTotal={pickedTotal}
            priority={choices.indexOf(teacher.id)}
            canPick={choices.length < MAX_CHOICES}
            myInterests={interests}
            onPick={pick}
            onUnpick={(id) => onChoices(choices.filter((x) => x !== id))}
            onProfile={onProfile}
          />
        ))}
      </div>
    </div>
  )
}
