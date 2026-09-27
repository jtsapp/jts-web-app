'use client'

import { useState, useEffect } from 'react'
import { loadLyrics, trackProgress, saveKaraokeResult } from '../practice/karaoke/karaokeData.js'
import KaraokePlayer from './karaoke/KaraokePlayer.jsx'
import KaraokeResult from './karaoke/KaraokeResult.jsx'

// Один караоке-трек: плеер → результат (макет Figma «Караоке», 24.09.2026).
//
// Режим один — Full Karaoke (цельное исполнение с оценкой). Warm-up (лексика
// по словарю трека) был, но его убрали 23.09.2026 по решению продукта.
// Прежняя карточка трека с выбором режима и настройкой ушла вместе с ним:
// по макету с карточки каталога попадаешь сразу на сцену, а «Минус» и
// «Микрофон» выбираются на ней же.
//
// Плеер — полноэкранный, поверх сайдбара (см. KaraokePlayer); результат —
// в раскладке Практики. «Повторить» строку с результата открывает тот же
// плеер поверх результата в режиме одной строки.

// Разгон перед строкой при «Повторить»: две секунды музыки, чтобы вступить в
// такт, а не с полуслова. Хвост — чтобы последнее слово не обрезалось на лету.
const LEAD_IN = 2
const TAIL = 0.6

export default function KaraokeTrack({ track, token, onBack }) {
  const [doc, setDoc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [result, setResult] = useState(null)
  const [prev, setPrev] = useState(null)
  // Номер попытки — ключ плеера: «Спеть ещё раз» начинает с чистого листа, а
  // не с состояния прошлого дубля.
  const [attempt, setAttempt] = useState(0)
  const [repeatRow, setRepeatRow] = useState(null)
  // Новое совпадение строк после «Повторить» — показываем рядом со старым.
  const [repeats, setRepeats] = useState({})

  useEffect(() => {
    let alive = true
    loadLyrics(track, token).then((d) => {
      if (!alive) return
      if (d) setDoc(d)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [track, token])

  if (!result) {
    return (
      <KaraokePlayer
        key={attempt}
        track={track}
        doc={doc}
        failed={failed}
        onExit={onBack}
        onResult={(res) => {
          // Прошлый балл читаем ДО записи нового — иначе сравнивали бы с собой.
          setPrev(trackProgress(track.slug).last)
          // Дубль на нестандартной скорости разбираем и показываем, но в
          // прогресс не пишем: замедлившись, петь заметно легче, и «Лучший»
          // в каталоге перестал бы сравниваться с чужими и со своими же
          // прошлыми попытками.
          if (!res.offRate) saveKaraokeResult(track.slug, { score: res.score, weakLines: res.repeat.map((r) => r.id) })
          setRepeats({})
          setResult(res)
        }}
      />
    )
  }

  const line = repeatRow && doc.lines.find((l) => l.id === repeatRow.id)
  return (
    <>
      <KaraokeResult
        track={track}
        result={result}
        prev={prev}
        repeats={repeats}
        onRepeat={setRepeatRow}
        onAgain={() => {
          setResult(null)
          setAttempt((n) => n + 1)
        }}
        onBack={onBack}
      />
      {line && (
        <KaraokePlayer
          key={`line-${line.id}-${attempt}`}
          track={track}
          doc={doc}
          range={{ line, from: Math.max(0, line.start - LEAD_IN), to: Math.min(doc.duration, line.end + TAIL) }}
          onExit={() => setRepeatRow(null)}
          onLineResult={({ id, ratio }) => {
            setRepeats((r) => ({ ...r, [id]: ratio }))
            setRepeatRow(null)
          }}
        />
      )}
    </>
  )
}
