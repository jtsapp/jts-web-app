import { useState } from 'react'

// Лицо тьютора в рамке — страница тьютора по макету 29.10.2026 (узел
// TutorFrame: скруглённый квадрат с белой каймой, под лицом свой тон тьютора).
// Раньше на этом месте было абстрактное лицо Speaking Buddy (TutorFace): в
// новом макете в рамке сам персонаж.
//
// Эмоции нарисованы только у Декстера (компонент «Dexter Flat» на странице
// «АВАТАР ТЬЮТОРА»: нейтрально, радуется, думает, удивляется) — это его
// tutor.portraits. Остальным макет лица не дал: у них одно лицо, а состояние
// звонка видно по движению (говорит — покачивается, думает — наклоняется).
// «Слушает» у Декстера в макете совпадает с «удивляется» — тогда он весь звонок
// слушал бы с открытым ртом, поэтому слушает он нейтральным лицом.
const VARIANT = {
  happy: 'happy',
  celebrate: 'happy',
  gloat: 'happy',
  surprised: 'surprised',
  confused: 'surprised',
  thinking: 'thinking',
}

export default function TutorPortrait({ tutor = {}, emotion = 'idle', speaking = false, className = '' }) {
  const variants = tutor.portraits || {}
  const want = variants[VARIANT[emotion]] ? VARIANT[emotion] : 'base'
  // Однажды показанные варианты не размонтируем: смена на них — без загрузки,
  // а кроссфейд идёт между двумя уже готовыми картинками.
  const [seen, setSeen] = useState([want])
  if (!seen.includes(want)) setSeen([...seen, want])

  const state = speaking ? ' is-speaking' : emotion === 'thinking' ? ' is-thinking' : emotion === 'listening' ? ' is-listening' : ''
  return (
    <div
      className={'tp-portrait' + state + (className ? ' ' + className : '')}
      style={tutor.tint ? { '--tp-tint': tutor.tint } : undefined}
    >
      <div className="tp-portrait__rig">
        {seen.map((key) => (
          <img
            key={key}
            className={'tp-portrait__img' + (key === want ? ' is-on' : '')}
            src={key === 'base' ? tutor.portrait || tutor.avatar : variants[key]}
            alt=""
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}
