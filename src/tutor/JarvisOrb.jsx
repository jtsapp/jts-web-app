import { useEffect, useRef } from 'react'
import JarvisOrbEngine from './orbEngine.js'

/**
 * Аватар Джарвиса — орб вместо лица. Ставится там же, где остальные тьюторы
 * показывают картинку/TutorFace, и держит тот же контракт с вёрсткой: размер
 * берётся из обёртки (ResizeObserver), а не из пропа — у канвы пиксельный буфер,
 * и на мобилке он обязан пересчитаться при смене ширины.
 *
 * @param state      'idle' | 'listening' | 'thinking' | 'speaking'
 * @param inputLevel уровень микрофона ученика 0..1 (см. micLevel.js) — орб
 *                   разгорается на его речи в режиме listening
 * @param audioTrack MediaStreamTrack голоса тьютора: пульсация по реальной
 *                   амплитуде вместо синтетической модуляции
 * @param className  класс обёртки — размер задаёт вёрстка
 */
export default function JarvisOrb({
  state = 'idle',
  inputLevel = 0,
  audioTrack = null,
  className = 't-voice__face',
  label = 'KZ тест',
}) {
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const orbRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const orb = new JarvisOrbEngine(canvasRef.current, {
      size: box?.clientWidth || 300,
      reducedMotion: Boolean(mq?.matches),
    })
    orbRef.current = orb

    const fit = () => {
      const w = box?.clientWidth
      if (w) orb.setSize(Math.round(w))
    }
    const ro = new ResizeObserver(fit)
    if (box) ro.observe(box)
    // Смена зума/монитора меняет devicePixelRatio, а ширина бокса та же —
    // ResizeObserver молчит, и канва остаётся в старом разрешении (мыло).
    window.addEventListener('resize', fit)

    const onMotion = (e) => orb.setReducedMotion(e.matches)
    mq?.addEventListener?.('change', onMotion)
    const onVis = () => orb.setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      mq?.removeEventListener?.('change', onMotion)
      document.removeEventListener('visibilitychange', onVis)
      orb.destroy()
      orbRef.current = null
    }
  }, [])

  useEffect(() => {
    orbRef.current?.setState(state)
  }, [state])

  useEffect(() => {
    orbRef.current?.setInputLevel(inputLevel)
  }, [inputLevel])

  // AudioContext заводим только когда трек реально пришёл: до разговора он не
  // нужен, а лишний «висящий» контекст в Safari ещё и держит батарею.
  useEffect(() => {
    const orb = orbRef.current
    if (!orb || !audioTrack) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    let actx
    try {
      actx = new Ctx()
      const src = actx.createMediaStreamSource(new MediaStream([audioTrack]))
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.6
      // Только source → analyser, без destination: звук уже играет через
      // RoomAudioRenderer, второе подключение дало бы эхо.
      src.connect(analyser)
      orb.attachAnalyser(analyser)
    } catch {
      // Нет Web Audio или трек не отдался — орб пульсирует синтетикой.
      return
    }
    return () => {
      orb.attachAnalyser(null)
      actx?.close?.().catch(() => {})
    }
  }, [audioTrack])

  return (
    <div className={`${className} t-orb`} ref={boxRef}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}
