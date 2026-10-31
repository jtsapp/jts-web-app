// Одна карта разделов для меню и прямых ссылок. Общедоступные экраны сюда не входят.
const SECTION_OF = {
  'my-teacher': 'teacher', 'teacher-wizard': 'teacher', 'teacher-pick': 'teacher',
  group: 'group', lessons: 'lessons', 'course-catalog': 'lessons', homework: 'homework',
  tutor: 'speaking', 'speed-reading': 'speed', learning: 'review', practice: 'practice',
  'grammar-games': 'grammar', vocab: 'vocabulary', ielts: 'ielts', sat: 'sat',
}

export function sectionOf(key) {
  if (typeof key === 'string' && key.startsWith('ielts-')) return 'ielts'
  if (typeof key === 'string' && key.startsWith('sat-')) return 'sat'
  return SECTION_OF[key] || null
}

export function validStudentSections(access) {
  return !!access && typeof access.known === 'boolean' && Array.isArray(access.allowed)
    && access.allowed.every((key) => typeof key === 'string')
}

/** loading/error отличаются от ответа «тариф запрещает»: у них свои объяснение и повтор. */
export function studentSectionStatus(access, key, exams) {
  const section = sectionOf(key)
  if (!section) return 'open'
  if (access?.status === 'error') return 'error'
  if (access?.status === 'loading' || !validStudentSections(access)) return 'loading'
  // Явный ответ сервера «нет абонемента» сохраняет онбординг. Отсутствие ответа им не считается.
  if (access.known && !access.allowed.includes(section)) return 'closed'
  if (exams && (section === 'ielts' || section === 'sat')) {
    if (!exams.ready) return 'loading'
    if (!exams[section]) return 'closed'
  }
  return 'open'
}

export function isSectionOpen(access, key) {
  return studentSectionStatus(access, key) === 'open'
}
