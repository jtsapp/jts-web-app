import { useEffect, useRef, useState } from 'react'
import { nextLive } from './captions.js'

// Какая реплика висит на экране во время звонка. Вынесено из CallStage не ради
// красоты: без отдельного хука это поведение нечем накрыть тестом — CallStage
// живёт внутри LiveKitRoom и в jsdom не поднимается.
export function useLiveCaption(tutorCaption, userCaption) {
  const [live, setLive] = useState({ text: '', isUser: false })
  const seenRef = useRef({ tutor: '', user: '' })
  useEffect(() => {
    // Снимок рефа берём в ЛОКАЛЬНУЮ переменную до того, как его перезапишем, и
    // передаём в апдейтер именно её. Читать seenRef.current внутри апдейтера
    // нельзя: React считает его отложенно, уже на следующем рендере, и к тому
    // моменту реф хранит СВЕЖИЕ реплики. Тогда сравнение «изменилось?» всегда
    // ложно, и подпись навсегда застревает на фолбэке «О чём хочешь
    // поговорить со мной?» — при живой панели «показать текст», которая от
    // рефа не зависит. Быстрый путь React (расчёт прямо в setState) это
    // маскировал, но он доступен, только пока у фибера нет незакрытых
    // обновлений, а рядом раз в секунду тикает useCountdown.
    const seen = seenRef.current
    seenRef.current = { tutor: tutorCaption, user: userCaption }
    setLive((prev) => nextLive(prev, seen, tutorCaption, userCaption))
  }, [tutorCaption, userCaption])
  return live
}
