// Единственное место, где подключается @zoom/videosdk. Импорт динамический:
// SDK тяжёлый и трогает window, поэтому не должен попадать в SSR и общий бандл.

// Методы SDK иногда не бросают, а возвращают объект ошибки — приводим к исключению.
async function run(call) {
  const result = await call()
  if (result && typeof result === 'object' && 'reason' in result) {
    throw Object.assign(new Error(result.reason || result.type), { sdk: result })
  }
  return result
}

// Причины закрытия, при которых хост убрал именно этого участника (написание как в SDK).
const REMOVED_REASONS = ['kicked by host', 'expeled by host']

function toParticipant(u) {
  return {
    // userId — номер в сессии Zoom (им управляем видео и модерацию); identity — наш id из токена.
    userId: String(u.userId),
    identity: u.userIdentity ? String(u.userIdentity) : '',
    name: u.displayName || '',
    // muted не задан, пока человек не подключил микрофон, — для плитки это тоже «выключен»
    audioMuted: u.muted !== false,
    videoOn: Boolean(u.bVideoOn),
    isHost: Boolean(u.isHost),
  }
}

export async function createVideoClient() {
  const { default: ZoomVideo, VideoQuality, ConnectionState } = await import('@zoom/videosdk')
  const client = ZoomVideo.createClient()
  let stream = null
  let joining = null
  let leaving = null
  const qualities = { low: VideoQuality.Video_180P, medium: VideoQuality.Video_360P }

  const subscribe = (sdkEvents, handler) => {
    sdkEvents.forEach((e) => client.on(e, handler))
    return () => sdkEvents.forEach((e) => client.off(e, handler))
  }

  return {
    join(sessionName, token, userName) {
      if (leaving) return Promise.reject(new Error('client already left'))
      joining = (async () => {
        await run(() => client.init('en-US', 'Global'))
        await run(() => client.join(sessionName, token, userName))
        stream = client.getMediaStream()
      })()
      return joining
    },
    // createClient() у SDK — синглтон. Выход выполняется один раз на обёртку: запоздалый
    // повторный вызов старой обёртки иначе закрыл бы уже начатую новую сессию. После выхода
    // клиент уничтожается, чтобы следующий звонок получил чистый.
    leave(end = false) {
      leaving ||= (async () => {
        if (joining) await joining.catch(() => {})
        try {
          await run(() => client.leave(end))
        } finally {
          await ZoomVideo.destroyClient().catch(() => {})
        }
      })()
      return leaving
    },
    selfId: () => String(client.getCurrentUserInfo().userId),
    participants: () => client.getAllUser().map(toParticipant),

    startAudio: () => run(() => stream.startAudio()),
    muteSelf: () => run(() => stream.muteAudio()),
    unmuteSelf: () => run(() => stream.unmuteAudio()),
    startVideo: () => run(() => stream.startVideo()),
    stopVideo: () => run(() => stream.stopVideo()),

    attachVideo: (userId, quality) => run(() => stream.attachVideo(Number(userId), qualities[quality] ?? qualities.low)),
    detachVideo: (userId) => run(() => stream.detachVideo(Number(userId))),

    muteUser: (userId) => run(() => stream.muteAudio(Number(userId))),
    muteAll: () => run(() => stream.muteAllAudio()),
    removeUser: (userId) => run(() => client.removeUser(Number(userId))),

    on(event, cb) {
      switch (event) {
        case 'participants':
          return subscribe(
            ['user-added', 'user-updated', 'user-removed', 'peer-video-state-change', 'video-active-change'],
            () => cb(),
          )
        case 'audio':
          // join пропускаем: сам по себе он не говорит, включён ли микрофон.
          return subscribe(['current-audio-change'], ({ action }) => {
            if (action === 'muted') cb('muted')
            else if (action === 'unmuted') cb('unmuted')
            else if (action === 'leave') cb('left')
          })
        case 'speaker':
          return subscribe(['active-speaker'], (list) => cb(list.map((s) => String(s.userId))))
        case 'connection':
          return subscribe(['connection-change'], ({ state, reason }) => {
            if (state === ConnectionState.Reconnecting) cb('reconnecting')
            else if (state === ConnectionState.Connected) cb('connected')
            // Удаление хостом — отдельное событие removed, здесь его быть не должно.
            else if ((state === ConnectionState.Closed || state === ConnectionState.Fail) && !REMOVED_REASONS.includes(reason)) {
              cb('closed', reason)
            }
          })
        case 'removed':
          // Выход по удалению хостом приходит как Closed с причиной, а не отдельным событием.
          return subscribe(['connection-change'], ({ state, reason }) => {
            if (state === ConnectionState.Closed && REMOVED_REASONS.includes(reason)) cb()
          })
        default:
          return () => {}
      }
    },
  }
}
