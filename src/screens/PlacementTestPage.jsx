'use client'

import { useEffect, useRef, useState } from 'react'
import { placementLevel, PLACEMENT_URL } from '../lib/placement.js'

// Тест на определение уровня — раннер из бандла школы, встроенный как есть
// (public/practice/placement/, банк аудио и клипов рядом). Портировать его
// в React намеренно не стали: там свой движок — IRT с ветвлением на A0,
// LexTALE с псевдословами, ограничения по семьям конструкций, аудио с лимитом
// прослушиваний и оценка письма. Любой ручной перенос потерял бы часть
// калибровки, а уровень студента — не то место, где это допустимо.
//
// Наружу раннер отдаёт результат через postMessage (JTS_BRIDGE внутри файла):
// «placement:result» — как только тест посчитан, «placement:done» — по кнопке
// «Let's go». Первое сообщение и есть страховка: уровень сохраняется, даже
// если человек закроет вкладку на экране результата.
export default function PlacementTestPage({ lang, onDone, onLevel }) {
  const [ready, setReady] = useState(false)
  // Уровень мог прийти раньше, чем человек дошёл до кнопки: держим последний,
  // чтобы «Let's go» не потребовал второго round-trip.
  const lastLevel = useRef(null)

  useEffect(() => {
    const onMessage = (e) => {
      const data = e.data
      if (!data || data.source !== 'jts-placement') return
      const level = placementLevel(data.result)
      if (level) {
        lastLevel.current = level
        if (data.type === 'placement:result') onLevel?.(level, data.result)
      }
      if (data.type === 'placement:done') onDone?.(lastLevel.current, data.result)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onDone, onLevel])

  // Язык интерфейса приложения — стартовый язык раннера; свой экран выбора
  // языка у него остаётся, человек может переключить.
  const src = `${PLACEMENT_URL}${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`

  return (
    <div className="pl-host">
      {!ready && <div className="pl-host__loading" />}
      <iframe
        className="pl-host__frame"
        src={src}
        title="JTS Placement"
        onLoad={() => setReady(true)}
        allow="autoplay; microphone"
      />
    </div>
  )
}
