import { useEffect, useRef } from 'react'
import TutorAvatar from './avatarEngine.js'
import { EMOTIONS } from './avatarEmotions.js'

/**
 * Лицо тьютора на canvas. Заменяет плоский орб: эмоция — это выражение лица,
 * цвет формы и характер движения, а не подсветка рамки вокруг карточки.
 *
 * Размер берётся из вёрстки (ResizeObserver по обёртке), а не из пропа: у канвы
 * пиксельный буфер, и на мобилке он обязан пересчитаться при смене ширины.
 *
 * @param emotion    ключ пресета из avatarEmotions.js
 * @param intensity  сила 1..3 (из тега агента); двигает подвижность
 * @param speaking   тьютор сейчас озвучивает реплику. Не эмоция, а слой поверх
 *                   неё: рот открывается у ЛЮБОГО выражения, мимика остаётся
 *                   той, что прислал агент
 * @param audioTrack MediaStreamTrack голоса тьютора — рот открывается по
 *                   реальной амплитуде вместо имитации
 * @param className  класс обёртки: размер лица задаёт вёрстка (в канве ~1/3
 *                   бокса — прозрачное поле под тень и конфетти, его съедает
 *                   отрицательный margin). Дефолт — экран звонка.
 */
export default function TutorFace({
  emotion = 'idle',
  intensity = 2,
  speaking = false,
  audioTrack = null,
  className = 't-voice__face',
}) {
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const avRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const av = new TutorAvatar(canvasRef.current, {
      size: box?.clientWidth || 300,
      reducedMotion: Boolean(mq?.matches),
    })
    avRef.current = av

    const fit = () => {
      const w = box?.clientWidth
      if (w) av.setSize(Math.round(w))
    }
    const ro = new ResizeObserver(fit)
    if (box) ro.observe(box)
    // Смена зума/монитора меняет devicePixelRatio, а ширина бокса при этом та
    // же — ResizeObserver молчит, и канва остаётся в старом разрешении (мыло).
    // window.resize при смене dpr срабатывает, setSize сам сверит буфер.
    window.addEventListener('resize', fit)

    const onMotion = (e) => av.setReducedMotion(e.matches)
    mq?.addEventListener?.('change', onMotion)
    // Вкладка скрыта — rAF и так засыпает, но после возврата время не должно
    // прыгнуть на минуты вперёд и дёрнуть анимацию.
    const onVis = () => av.setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      mq?.removeEventListener?.('change', onMotion)
      document.removeEventListener('visibilitychange', onVis)
      av.destroy()
      avRef.current = null
    }
  }, [])

  useEffect(() => {
    avRef.current?.setEmotion(emotion, intensity)
  }, [emotion, intensity])

  useEffect(() => {
    avRef.current?.setSpeaking(speaking)
  }, [speaking])

  // Липсинк по реальному звуку. AudioContext заводим только когда трек реально
  // пришёл: до разговора он не нужен, а лишний «висящий» контекст в Safari ещё
  // и держит батарею.
  useEffect(() => {
    const av = avRef.current
    if (!av || !audioTrack) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    let actx
    try {
      actx = new Ctx()
      const src = actx.createMediaStreamSource(new MediaStream([audioTrack]))
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      // Только source → analyser, без destination: звук уже играет через
      // RoomAudioRenderer, второе подключение дало бы эхо.
      src.connect(analyser)
      av.attachAnalyser(analyser)
    } catch {
      // Нет Web Audio или трек не отдался — рот шевелится имитацией.
      return
    }
    return () => {
      av.attachAnalyser(null)
      actx?.close?.().catch(() => {})
    }
  }, [audioTrack])

  return (
    <div className={className} ref={boxRef}>
      <canvas ref={canvasRef} role="img" aria-label={EMOTIONS[emotion]?.label || ''} />
    </div>
  )
}
