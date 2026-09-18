// Фейковый AudioContext для тестов бита и записей: узлы ничего не звучат,
// но запоминают, что и на какое время было запущено. currentTime двигает тест.

function param() {
  return {
    value: 0,
    calls: [],
    setValueAtTime(v, t) {
      this.value = v
      this.calls.push(['set', v, t])
    },
    setTargetAtTime(v, t) {
      this.value = v
      this.calls.push(['target', v, t])
    },
    cancelScheduledValues() {},
    exponentialRampToValueAtTime() {},
  }
}

export function fakeAudioContext() {
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    state: 'running',
    destination: { kind: 'destination' },
    started: [], // { kind, at, buffer }
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} }
    },
    createDynamicsCompressor() {
      return { threshold: { value: 0 }, ratio: { value: 0 }, connect() {} }
    },
    createBuffer(channels, length, rate) {
      const data = new Float32Array(length)
      return { length, sampleRate: rate, numberOfChannels: channels, getChannelData: () => data }
    },
    createOscillator() {
      return node('osc')
    },
    createBufferSource() {
      return node('src')
    },
    createBiquadFilter() {
      return { type: '', frequency: { value: 0 }, connect() {} }
    },
    resume() {
      ctx.state = 'running'
      return Promise.resolve()
    },
  }
  function node(kind) {
    const n = {
      kind,
      type: '',
      buffer: null,
      frequency: param(),
      onended: null,
      stopped: false,
      connect() {},
      disconnect() {},
      start(at) {
        ctx.started.push({ kind, at, buffer: n.buffer, node: n })
      },
      stop() {
        n.stopped = true
      },
    }
    return n
  }
  return ctx
}
