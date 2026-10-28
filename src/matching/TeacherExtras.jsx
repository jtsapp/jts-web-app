import { useEffect, useRef, useState } from 'react'
import { getMatchingTeacherExtras, getMatchingTeacherResultPhoto, getMatchingTeacherVideo } from '../api.js'
import { useMatchingT } from './texts.js'

// Что учитель добавил к резюме (ТЗ «Подбор учителя»): «Как проходят мои уроки», «Результаты моих учеников» с фото и видео-знакомство.
// Фото результатов студент видит только одобренные координатором — сервер других и не отдаёт. Каждого блока нет, пока учитель его не заполнил;
// на старом стенде без ручки блока нет вовсе. Видео тяжёлое (до 30 МБ), поэтому качается только по нажатию «Смотреть видео».
function Photo({ token, teacherId, photo }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    let made = null
    getMatchingTeacherResultPhoto(token, teacherId, photo.id).then((blob) => {
      if (alive && blob) {
        made = URL.createObjectURL(blob)
        setUrl(made)
      }
    })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [token, teacherId, photo.id])
  return (
    <figure className="mt-res">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: из ручки с Bearer, next/image такую не оптимизирует */}
      {url ? <img src={url} alt={photo.caption || ''} /> : <div className="mt-res__ph" aria-hidden="true" />}
      {photo.caption && <figcaption className="mt-tiny">{photo.caption}</figcaption>}
    </figure>
  )
}

export default function TeacherExtras({ token, teacherId }) {
  const { t } = useMatchingT()
  const [extras, setExtras] = useState(null)
  const [video, setVideo] = useState({ state: 'idle', url: null })
  const made = useRef(null)

  useEffect(() => {
    let alive = true
    getMatchingTeacherExtras(token, teacherId).then((d) => alive && setExtras(d))
    return () => {
      alive = false
      if (made.current) URL.revokeObjectURL(made.current)
    }
  }, [token, teacherId])

  const play = async () => {
    setVideo({ state: 'loading', url: null })
    const blob = await getMatchingTeacherVideo(token, teacherId)
    if (!blob) return setVideo({ state: 'error', url: null })
    made.current = URL.createObjectURL(blob)
    setVideo({ state: 'ready', url: made.current })
  }

  if (!extras) return null
  const photos = extras.resultPhotos || []
  return (
    <>
      {extras.howLessonsGo && (
        <section className="mt-sec" data-testid="how-lessons">
          <h3 className="mt-h3">{t('pf.lessons')}</h3>
          <p>{extras.howLessonsGo}</p>
        </section>
      )}
      {(extras.achievements || photos.length > 0) && (
        <section className="mt-sec" data-testid="results">
          <h3 className="mt-h3">{t('pf.results')}</h3>
          {extras.achievements && <p>{extras.achievements}</p>}
          {photos.length > 0 && <div className="mt-gal">{photos.map((p) => <Photo key={p.id} token={token} teacherId={teacherId} photo={p} />)}</div>}
        </section>
      )}
      {extras.video?.present && (
        <section className="mt-sec" data-testid="video">
          <h3 className="mt-h3">{t('pf.video')}</h3>
          {video.state === 'ready' ? (
            <video src={video.url} controls autoPlay className="mt-video" />
          ) : (
            <button type="button" className="mt-btn mt-btn--line" onClick={play} disabled={video.state === 'loading'}>
              {video.state === 'loading' ? t('loading') : t('pf.videoPlay')}
            </button>
          )}
          {video.state === 'error' && <p className="mt-small" role="alert">{t('pf.videoError')}</p>}
        </section>
      )}
    </>
  )
}
