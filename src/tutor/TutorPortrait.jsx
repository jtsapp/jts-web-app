import { useState } from 'react'

// Лицо тьютора в рамке — страница тьютора по макету 29.10.2026 (узел
// TutorFrame: скруглённый квадрат с белой каймой, под лицом свой тон тьютора).
// Раньше на этом месте было абстрактное лицо Speaking Buddy (TutorFace): в
// новом макете в рамке сам персонаж.
//
// Эмоции нарисованы только у Декстера (компонент «Dexter Flat» на странице
// «АВАТАР ТЬЮТОРА»: нейтрально, радуется, думает, удивляется, слушает, злится)
// — это его tutor.portraits. У остальных анимаций пока нет — временно одно
// нейтральное лицо, а состояние звонка видно по движению (говорит —
// покачивается, думает — наклоняется).
// До 30.10.2026 «Слушает» в макете совпадал с «удивляется», и слушал Декстер
// нейтральным лицом; теперь это своя поза — рука у уха.
// «Говорит» в макете (30.10.2026) без рта — слоя Mouth в варианте нет, лицо
// пустое. Пока его не дорисуют, говорит Декстер текущим лицом с покачиванием.
// У сочувствия и скуки своего варианта нет — нейтральное лицо.
const VARIANT = {
  happy: 'happy',
  celebrate: 'happy',
  gloat: 'happy',
  surprised: 'surprised',
  confused: 'surprised',
  thinking: 'thinking',
  listening: 'listening',
  angry: 'angry',
  rage: 'angry',
}

// Ключ по тьютору: профиль может догрузиться, когда страница уже открыта, и
// отметка «загружено» от прежнего тьютора оставила бы на экране чужое лицо.
export default function TutorPortrait({ tutor = {}, ...rest }) {
  return <Face key={tutor.key} tutor={tutor} {...rest} />
}

function Face({ tutor, emotion = 'idle', speaking = false, className = '', onReady }) {
  const variants = tutor.portraits || {}
  const want = variants[VARIANT[emotion]] ? VARIANT[emotion] : 'base'
  // Однажды показанные варианты не размонтируем: смена на них — без загрузки,
  // а кроссфейд идёт между двумя уже готовыми картинками.
  const [seen, setSeen] = useState([want])
  if (!seen.includes(want)) setSeen([...seen, want])

  // Старое лицо держим, пока новое не приехало. Замер на проде 04.11.2026: при
  // первом показе эмоции файл идёт 420–450 мс на Slow 4G, старое лицо гасло за
  // 200 мс, и рамка оставалась пустой на 270–300 мс. Не загрузился — лицо то же.
  const [loaded, setLoaded] = useState({})
  const [shown, setShown] = useState(want)
  const on = want === shown || loaded[want] ? want : shown
  if (on !== shown) setShown(on)

  // Первое лицо приехало — качаем остальные: разговор начнётся с этой страницы,
  // и в звонке файлы уже не будут делить канал с голосом. Раньше первого лица
  // нельзя: на телефоне оно и так ждёт в общей очереди страницы.
  const [settled, setSettled] = useState(false)
  const settle = (key, ok) => {
    if (ok) setLoaded((all) => ({ ...all, [key]: true }))
    if (settled) return
    setSettled(true)
    onReady?.()
  }
  const keys = settled ? [...new Set([...seen, 'base', ...Object.keys(variants)])] : seen

  const state = speaking ? ' is-speaking' : emotion === 'thinking' ? ' is-thinking' : emotion === 'listening' ? ' is-listening' : ''
  return (
    <div
      className={'tp-portrait' + state + (className ? ' ' + className : '')}
      style={tutor.tint ? { '--tp-tint': tutor.tint } : undefined}
    >
      <div className="tp-portrait__rig">
        {keys.map((key) => (
          <img
            key={key}
            className={'tp-portrait__img' + (key === on ? ' is-on' : '')}
            src={key === 'base' ? tutor.portrait || tutor.avatar : variants[key]}
            alt=""
            draggable={false}
            fetchPriority={seen.includes(key) ? 'high' : 'low'}
            onLoad={() => settle(key, true)}
            onError={() => settle(key, false)}
          />
        ))}
      </div>
    </div>
  )
}
