import { useCallback, useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  getMyHomework, getHomeworkById, uploadMedia,
  attachHomeworkAnswer, removeHomeworkAnswer, submitHomework, saveHomeworkAnswer,
  getMyMaterialAssignments,
} from '../api.js'
import HomeworkList from './homework/HomeworkList.jsx'
import HomeworkDetail from './homework/HomeworkDetail.jsx'
import MaterialAssignmentDetail from './homework/MaterialAssignmentDetail.jsx'
import { isAllowedFile, studentOrder } from './homework/homeworkFormat.js'
import { loadAnswers, pendingAnswers } from './homework/homeworkExercises.js'
import { gradeQuestion } from './workspace/practiceGrading.js'
import { materialCard } from './homework/materialAssignments.js'

/**
 * Экран «Домашняя работа» ученика: история заданий слева, открытое задание справа.
 *
 * В одном списке два источника: обычные домашние работы (/admin/homework/my)
 * и задания с живых уроков — материалы, которые преподаватель назначил через
 * «задать как ДЗ» в админке (/student/assignments). Список приходит сразу с
 * файлами и оценками, поэтому карточка открывается без похода в сеть; заново
 * задание перечитывается только после действий, которые его меняют, —
 * загрузки файла, удаления и отправки на проверку.
 */
export default function HomeworkPage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [materials, setMaterials] = useState([])
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error' (гость — см. view ниже)
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    Promise.all([
      getMyHomework(token),
      // Задания с уроков — best-effort: если назначений нет или право ещё не
      // раскатано, экран с обычными работами остаётся рабочим.
      getMyMaterialAssignments(token).catch(() => []),
    ])
      .then(([list, assignments]) => {
        if (cancelled) return
        const rows = Array.isArray(list) ? list : []
        const cards = (Array.isArray(assignments) ? assignments : []).map(materialCard)
        setItems(rows)
        setMaterials(cards)
        const first = [...rows, ...cards].sort((a, b) => studentOrder(a) - studentOrder(b))[0]
        setSelectedId((id) => id ?? first?.id ?? null)
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  // Гостю запрашивать нечего: домашние работы висят на аккаунте, и эффект выше
  // молча выходит без токена. Стартовое состояние при этом остаётся 'loading',
  // и экран навсегда застревал на «Загрузка домашних работ…» — так открывался
  // диплинк ?screen=homework без входа. Состояние гостя выводим из токена, а не
  // держим четвёртым setState: менять его в эффекте нечем и незачем.
  const view = token ? state : 'anon'

  // Сверху то, что ждёт ученика (возврат на доработку, заданное), внизу —
  // сданное и проверенное; внутри группы сохраняется порядок бэкенда
  // (новые сначала) — sort стабильный.
  const combined = useMemo(
    () => [...items, ...materials].sort((a, b) => studentOrder(a) - studentOrder(b)),
    [items, materials]
  )

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

  const selected = combined.find((hw) => hw.id === selectedId) || null

  // Файлы грузятся по очереди, а не разом.
  //
  // Каждый attach отвечает всей карточкой задания, собранной на момент своего
  // запроса. При параллельной загрузке ответ более медленного запроса приходил
  // последним и затирал в списке файл, который успел прикрепиться раньше:
  // ученик видел одно вложение вместо двух и грузил второй файл заново.
  const handleUpload = async (files) => {
    if (!selected) return
    setError(null)

    const wrongFormat = files.find((file) => !isAllowedFile(file.name))
    if (wrongFormat) {
      setError(t('homework.badFormat', { name: wrongFormat.name }))
      return
    }

    setBusy(true)
    try {
      for (const file of files) {
        const { url } = await uploadMedia(token, file)
        if (!url) throw new Error('upload returned no url')
        replace(await attachHomeworkAnswer(token, selected.id, file.name, url))
      }
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

  // Отвечено в этом сеансе, включая то, что ещё не уехало на сервер: по этому
  // числу оживает «Отправить на проверку». Храним вместе с id работы — иначе
  // после переключения счёт от предыдущей работы на мгновение разрешал бы сдачу.
  const [draft, setDraft] = useState({ homeworkId: null, answered: 0 })
  const draftAnswered = selected && draft.homeworkId === selected.id ? draft.answered : 0

  const handleSubmit = async () => {
    if (!selected) return
    setError(null)
    setBusy(true)
    try {
      // Ответ уезжает преподавателю по кнопке «Проверить» у каждого задания, и
      // ученик не обязан её нажимать — он решает и сдаёт работу. Всё решённое,
      // но недосланное, отправляем здесь: иначе статус «сдано» стоит, а
      // преподаватель видит «ученик ещё не отвечал» и оценивать ему нечего.
      //
      // Последовательно, как и загрузка файлов выше: каждый ответ возвращает
      // работу целиком, и параллельные затирали бы друг друга.
      const pending = pendingAnswers(selected, loadAnswers(selected.id))
      for (const { exercise, answer } of pending) {
        const { correct } = gradeQuestion(exercise.question, answer)
        await saveHomeworkAnswer(selected.id, exercise.id, token, answer, correct)
      }
      replace(await submitHomework(token, selected.id))
    } catch {
      // Статус не двигаем: работа, сданная без ответов, выглядит проверяемой,
      // а проверять в ней нечего.
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
          {view === 'loading' && <p className="hw__hint">{t('homework.loading')}</p>}
          {view === 'anon' && <p className="hw__hint">{t('homework.needAuth')}</p>}
          {view === 'error' && <p className="hw__error">{t('homework.loadError')}</p>}
          {view === 'ready' && (
            <div className="hw__layout">
              <div className="hw__col">
                <HomeworkList items={combined} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              {selected?.kind === 'material' ? (
                <MaterialAssignmentDetail card={selected} token={token} />
              ) : (
                <HomeworkDetail
                  hw={selected}
                  token={token}
                  busy={busy}
                  error={error}
                  onUpload={handleUpload}
                  onRemoveFile={handleRemove}
                  onSubmit={handleSubmit}
                  onSaved={replace}
                  onAnswered={setDraft}
                  draftAnswered={draftAnswered}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </LearningLayout>
  )
}
