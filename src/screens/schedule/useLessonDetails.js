import { useEffect, useRef, useState } from 'react'
import { getLessonById, getLessonSections } from '../../api.js'
import { lessonTopicFromSections } from './lessonFormat.js'

// Ссылка на видеозвонок и тема урока живут в карточке урока, а не в списке
// occurrences: /admin/lessons/occurrences отдаёт только время, преподавателя и
// статус. Поэтому расписание догружает недостающее по конкретным урокам —
// тому, что показан карточкой сверху, и тем, что открыты в панели дня.
//
// Догрузка — украшение: у ученика может не быть доступа к уроку чужой группы,
// и любая осечка обязана оставить экран рабочим. Отсюда catch → null и отметка
// в кэше: неудачный урок больше не дёргается, иначе каждый ре-рендер бил бы в
// сеть заново.

/**
 * Map<lessonId(строкой) → { meetingUrl, group }> для переданных уроков.
 * Кэш живёт весь показ экрана: перелистывание дней не перезапрашивает то,
 * что уже загружено.
 *
 * `group` — групповое занятие или индивидуальное: /admin/lessons/occurrences
 * такого поля не отдаёт, а карточка дня в макете разводит их цветом. Считаем
 * по числу участников урока — запрос за ним всё равно уже делается ради ссылки
 * на звонок, второго похода в сеть тут нет.
 */
export function useLessonCards(token, lessonIds) {
  const cacheRef = useRef(new Map())
  const [cards, setCards] = useState(() => new Map())

  // Ключ строкой, а не массивом: массив пересоздаётся на каждом рендере и
  // эффект уходил бы в цикл.
  const key = [...new Set((lessonIds || []).filter((id) => id != null).map(String))].sort().join(',')

  useEffect(() => {
    if (!token || !key) return
    const missing = key.split(',').filter((id) => !cacheRef.current.has(id))
    if (missing.length === 0) return

    let cancelled = false
    Promise.all(
      missing.map((id) =>
        getLessonById(token, id)
          .then((lesson) => [id, {
            meetingUrl: lesson?.meetingUrl || null,
            group: (lesson?.participants?.length || 0) > 1,
          }])
          // Урок не отдался — карточка покажется без ссылки и без типа, но
          // покажется: догрузка здесь украшение, а не условие показа.
          .catch(() => [id, { meetingUrl: null, group: null }])
      )
    ).then((pairs) => {
      if (cancelled) return
      for (const [id, card] of pairs) cacheRef.current.set(id, card)
      setCards(new Map(cacheRef.current))
    })

    return () => { cancelled = true }
  }, [token, key])

  return cards
}

/** Тема одного урока (см. lessonTopicFromSections) или null, пока её нет. */
export function useLessonTopic(token, lessonId) {
  const [topic, setTopic] = useState(null)

  useEffect(() => {
    setTopic(null)
    if (!token || lessonId == null) return

    let cancelled = false
    getLessonSections(token, lessonId)
      .then((sections) => { if (!cancelled) setTopic(lessonTopicFromSections(sections)) })
      .catch(() => { /* темы не будет — карточка покажет дату и время */ })

    return () => { cancelled = true }
  }, [token, lessonId])

  return topic
}
