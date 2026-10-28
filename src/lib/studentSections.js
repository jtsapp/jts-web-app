'use client'

import { useEffect, useState } from 'react'
import { getMySections } from '../api.js'

// Какому разделу кабинета принадлежит пункт меню или экран (ТЗ кабинетов, 14е). Раздел открыт, если координатор
// разрешил его и формату, и тарифу ученика (сервер отдаёт готовый список `allowed`, см. GET /cabinet/my-sections).
// «Главная», «Уведомления», «Договоры», «Призы» и «Feedback» открыты всем и сюда не входят. IELTS и SAT тоже:
// их открывает доступ экзамена (getIeltsMe / getSatMe, см. App и Sidebar), второй замок на них дал бы ученику с
// открытым менеджером доступом закрытый раздел из-за названия абонемента.
const SECTION_OF = {
  'my-teacher': 'teacher',
  'teacher-wizard': 'teacher',
  'teacher-pick': 'teacher',
  group: 'group',
  lessons: 'lessons',
  'course-catalog': 'lessons',
  homework: 'homework',
  tutor: 'speaking',
  'speed-reading': 'speed',
  learning: 'review',
  practice: 'practice',
  // «Грамматика» (ТЗ: отдельный пункт меню и первая плитка «Практики») открывает раздел `grammar` из настроек координатора.
  'grammar-games': 'grammar',
  vocab: 'vocabulary',
}

/** Раздел меню для ключа пункта или экрана; `null` — раздел настройке не подлежит. */
export function sectionOf(key) {
  return SECTION_OF[key] || null
}

/**
 * Открыт ли пункт. Нет ответа сервера, нет абонемента (`known: false` — онбординг) или раздел не настраивается —
 * открыт: ошибка сети и новый ученик не должны терять меню.
 */
export function isSectionOpen(access, key) {
  const section = sectionOf(key)
  if (!section || !access || access.known === false || !Array.isArray(access.allowed)) return true
  return access.allowed.includes(section)
}

/** Разделы ученика: `null`, пока ответ не пришёл (меню полное), и для не-ученика (токена нет). */
export function useStudentSections(token) {
  const [access, setAccess] = useState(null)
  useEffect(() => {
    if (!token) {
      setAccess(null)
      return undefined
    }
    let alive = true
    // Метода может не быть в подменённом api.js (тесты экранов): тогда, как и при ошибке сети, меню остаётся полным.
    try {
      Promise.resolve(getMySections(token)).then((value) => {
        if (alive) setAccess(value || null)
      }).catch(() => {})
    } catch {
      /* без ответа — без ограничений */
    }
    return () => {
      alive = false
    }
  }, [token])
  return access
}
