// Короткие сигналы облачка голосовой команды (21.10.2026): «слушаю» — после позывного
// без команды, «нажала» — после быстрой команды. Голос Луны для них слишком медленный
// (синтез — секунды), а тишина — непонятно, услышала ли. WebAudio, без файлов; любой
// сбой — тишина, облачко видно и так.

let ctx = null

// [частота Гц, сдвиг с] — «слушаю» вверх двумя нотами, «нажала» — одна короткая.
const TONES = {
  listen: [
    [660, 0],
    [880, 0.09],
  ],
  press: [[520, 0]],
}

export function playCue(kind) {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AC || !TONES[kind]) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const t0 = ctx.currentTime
    for (const [freq, at] of TONES[kind]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + at)
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + at)
      osc.stop(t0 + at + 0.14)
    }
  } catch {
    /* звука нет — облачко всё равно видно */
  }
}
