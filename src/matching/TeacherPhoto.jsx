import { useEffect, useState } from 'react'
import { getMatchingTeacherPhoto } from '../api.js'
import { initials } from './ui.jsx'

// Фото учителя отдаётся только с токеном (ручка ученика проверяет, что учитель из его подбора), поэтому не
// <img src>, а blob. Object URL живёт всю вкладку: список учителей, карточка и профиль показывают одно фото, и
// каждый раз качать его заново незачем. null — фото нет, рисуем инициалы.
const cache = new Map()

function loadPhoto(token, id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      getMatchingTeacherPhoto(token, id).then((blob) => (blob ? URL.createObjectURL(blob) : null)),
    )
  }
  return cache.get(id)
}

export default function TeacherPhoto({ token, teacherId, name, hasPhoto = true, className = 'mt-ava' }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!token || !teacherId || !hasPhoto) return undefined
    let alive = true
    loadPhoto(token, teacherId).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [token, teacherId, hasPhoto])
  return (
    <div className={className} aria-hidden={url ? undefined : 'true'}>
      {url ? <img src={url} alt={name || ''} /> : initials(name)}
    </div>
  )
}
