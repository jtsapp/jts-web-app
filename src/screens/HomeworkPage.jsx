import { useCallback, useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  getMyHomework, getHomeworkById, uploadMedia,
  attachHomeworkAnswer, removeHomeworkAnswer, submitHomework,
} from '../api.js'
import HomeworkList from './homework/HomeworkList.jsx'
import HomeworkDetail from './homework/HomeworkDetail.jsx'
import { isAllowedFile } from './homework/homeworkFormat.js'

/**
 * Экран «Домашняя работа» ученика: история заданий слева, открытое задание справа.
 *
 * Список приходит одним запросом (/admin/homework/my) уже с файлами и оценками,
 * поэтому карточка открывается без похода в сеть; заново задание перечитывается
 * только после действий, которые его меняют, — загрузки файла, удаления и
 * отправки на проверку.
 */
export default function HomeworkPage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    getMyHomework(token)
      .then((list) => {
        if (cancelled) return
        const rows = Array.isArray(list) ? list : []
        setItems(rows)
        setSelectedId((id) => id ?? rows[0]?.id ?? null)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  // Ответ сервера на каждое действие — это уже свежая карточка задания,
  // поэтому список чинится на месте, без перезагрузки всего экрана.
  const replace = useCallback((updated) => {
    if (!updated) return
    setItems((list) => list.map((hw) => (hw.id === updated.id ? updated : hw)))
  }, [])

  const refresh = useCallback(async (id) => {
    try {
      replace(await getHomeworkById(token, id))
    } catch {
      /* карточка осталась прежней — следующее действие покажет актуальную */
    }
  }, [token, replace])

  const selected = items.find((hw) => hw.id === selectedId) || null

  const handleUpload = async (file) => {
    if (!selected) return
    setError(null)
    if (!isAllowedFile(file.name)) {
      setError(t('homework.badFormat', { name: file.name }))
      return
    }
    setBusy(true)
    try {
      const { url } = await uploadMedia(token, file)
      if (!url) throw new Error('upload returned no url')
      replace(await attachHomeworkAnswer(token, selected.id, file.name, url))
    } catch {
      setError(t('homework.uploadFailed'))
      await refresh(selected.id)
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (material) => {
    if (!selected) return
    setError(null)
    setBusy(true)
    try {
      replace(await removeHomeworkAnswer(token, selected.id, material.id))
    } catch {
      setError(t('homework.removeFailed'))
      await refresh(selected.id)
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async () => {
    if (!selected) return
    setError(null)
    setBusy(true)
    try {
      replace(await submitHomework(token, selected.id))
    } catch {
      setError(t('homework.submitFailed'))
      await refresh(selected.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="homework" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="hw">
        <header className="hw__head">
          <h1 className="hw__title">{t('nav.homework')}</h1>
        </header>

        <div className="hw__body">
          {state === 'loading' && <p className="hw__hint">{t('homework.loading')}</p>}
          {state === 'error' && <p className="hw__error">{t('homework.loadError')}</p>}
          {state === 'ready' && (
            <div className="hw__layout">
              <div className="hw__col">
                <HomeworkList items={items} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              <HomeworkDetail
                hw={selected}
                busy={busy}
                error={error}
                onUpload={handleUpload}
                onRemoveFile={handleRemove}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>
      </div>
    </LearningLayout>
  )
}
