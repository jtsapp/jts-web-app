'use client'

// Короткий «дзынь» на верный тап — порт tick() прототипа (jtswords.html:~324):
// два синусоидальных тона вверх, ми → ля, второй на 80 мс позже. Без него
// верный ответ звучал так же, как промах, — тишиной, и засчитанное слово
// приходилось высматривать глазами (замечание по разделу, 29.09.2026).
//
// Это ЕДИНСТВЕННЫЙ синтезированный звук раздела, и он не про слова: запрет
// на синтез в useWordsVoice касается произношения, звон — сигнал интерфейса.
//
// Контекст один на страницу и не закрывается — как AC в прототипе. Свой на
// каждую сцену плодил бы контексты: браузер держит их ограниченное число и
// на лишних начинает ругаться, а открывать его заново на каждый тап дорого.

const NOTES = [
  [659, 0], // E5
  [880, 0.08], // A5
]
// Громкость пика. Тихо намеренно: сразу за звоном идёт запись следующего
// слова, и звон не должен её перекрикивать.
const PEAK = 0.06

let ctx = null

export function playSuccessTick() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return
    ctx = ctx || new AC()
    // Контекст, заведённый до первого касания, браузер держит на паузе.
    // Тап по картинке — само касание, так что resume здесь проходит.
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    for (const [freq, delay] of NOTES) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      // Экспонента не умеет от нуля — отсюда 0.0001 вместо тишины.
      gain.gain.setValueAtTime(0.0001, t + delay)
      gain.gain.exponentialRampToValueAtTime(PEAK, t + delay + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22)
      osc.start(t + delay)
      osc.stop(t + delay + 0.24)
    }
  } catch {
    // Звон — украшение: без Web Audio ответ всё равно засчитан и отмечен
    // галочкой.
  }
}
