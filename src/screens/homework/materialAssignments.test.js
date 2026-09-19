import { describe, it, expect } from 'vitest'
import { materialCard, isMaterialGraded, isInteractiveMaterial, isLessonCard, hasAnswerFiles, needsAnswerFile, isWholeCatalogLesson } from './materialAssignments.js'
import { homeworkStateKey } from './homeworkFormat.js'

const assignment = (over = {}) => ({
  id: 5,
  materialId: 12,
  materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML',
  isGraded: true,
  fileUrl: 'https://files.example/m.html',
  dueDate: '2026-08-25',
  teacherScore: null,
  teacherFeedback: null,
  gradedAt: null,
  ...over,
})

describe('materialCard', () => {
  it('приводит назначение к форме карточки списка с префиксом id', () => {
    const card = materialCard(assignment())
    expect(card.id).toBe('m-5')
    expect(card.kind).toBe('material')
    expect(card.title).toBe('Present Perfect · practice test')
    expect(card.status).toBe('ASSIGNED')
    expect(card.grade).toBeNull()
  })

  it('оценённое назначение читается как проверенная работа', () => {
    const card = materialCard(assignment({ teacherScore: 5, gradedAt: '2026-08-20T10:00:00' }))
    expect(card.status).toBe('COMPLETED')
    expect(card.grade).toBe(5)
    expect(homeworkStateKey(card)).toBe('completed')
  })

  // Просрочка по dueDate считается тем же правилом, что у обычной работы.
  it('непроверенное назначение с прошедшим дедлайном — просрочено', () => {
    const card = materialCard(assignment({ dueDate: '2026-08-01' }))
    expect(homeworkStateKey(card, new Date(2026, 7, 20))).toBe('overdue')
  })
})

describe('isMaterialGraded / isInteractiveMaterial', () => {
  it('оценка — это балл или отметка о проверке', () => {
    expect(isMaterialGraded(assignment())).toBe(false)
    expect(isMaterialGraded(assignment({ teacherScore: 4 }))).toBe(true)
    expect(isMaterialGraded(assignment({ gradedAt: '2026-08-20T10:00:00' }))).toBe(true)
  })

  it('интерактив отличается от обычного файла', () => {
    expect(isInteractiveMaterial(assignment())).toBe(true)
    expect(isInteractiveMaterial(assignment({ materialType: 'PDF' }))).toBe(false)
  })
})

/**
 * Одна карточка живого урока вместо материала целиком.
 *
 * Раньше такого задания не существовало: с урока на дом уходили только вопросы,
 * а карточку без них задать было нечем.
 */
describe('карточка живого урока', () => {
  const карточка = (over = {}) => ({
    id: 7, materialTitle: 'Unit 3', cardId: 'ce37fee00', catalogLessonId: 77,
    cardTitle: 'Four seasons, one favourite', ...over,
  })

  it('заданием называется карточка, а не весь материал', () => {
    expect(materialCard(карточка()).title).toBe('Four seasons, one favourite')
  })

  // Название карточки могло не сохраниться (старая выдача) — тогда лучше
  // название материала, чем пустая строка в списке заданий.
  it('без названия карточки остаётся название материала', () => {
    expect(materialCard(карточка({ cardTitle: null })).title).toBe('Unit 3')
  })

  it('материал целиком по-прежнему называется собой', () => {
    expect(materialCard({ id: 8, materialTitle: 'Unit 3' }).title).toBe('Unit 3')
  })

  it('карточку урока отличаем от обычного материала', () => {
    expect(isLessonCard(карточка())).toBe(true)
    expect(isLessonCard({ id: 8, materialTitle: 'Unit 3' })).toBe(false)
    // Адрес без урока открыть нечем — это не карточка.
    expect(isLessonCard(карточка({ catalogLessonId: null }))).toBe(false)
    expect(isLessonCard(null)).toBe(false)
  })
})

/**
 * Ответ файлом.
 *
 * У карточки урока нет ни проверяемых заданий, ни сессии — закрыть её нечем, а
 * срок выдача получает по умолчанию. Без вложения такая работа краснела у
 * ученика просроченной и оставалась такой навсегда: снять это могла только
 * ручная оценка преподавателя.
 */
describe('Ответ на выданный материал файлом', () => {
  const карточкаУрока = (over = {}) =>
    assignment({ catalogLessonId: 314, cardId: 'cad401560', cardTitle: 'Итог урока', ...over })

  it('файл требуется у карточки урока', () => {
    expect(needsAnswerFile(карточкаУрока())).toBe(true)
  })

  /**
   * У материала целиком свой цикл: интерактив закрывается сессией и оценкой,
   * обычный файл так и живёт. Расширять туда — отдельное решение.
   */
  it('и не требуется у материала целиком', () => {
    expect(needsAnswerFile(assignment())).toBe(false)
  })

  it('пустой список вложений — это «не ответил»', () => {
    expect(hasAnswerFiles(карточкаУрока())).toBe(false)
    expect(hasAnswerFiles(карточкаУрока({ files: [] }))).toBe(false)
    expect(hasAnswerFiles(карточкаУрока({ files: [{ id: 1 }] }))).toBe(true)
  })

  /** ГЛАВНОЕ: приложенный файл снимает вечную просрочку. */
  it('приложенный файл переводит карточку в «на проверке» и снимает просрочку', () => {
    const просроченнаяДата = '2020-01-01'
    const без = materialCard(карточкаУрока({ dueDate: просроченнаяДата }))
    const с = materialCard(карточкаУрока({ dueDate: просроченнаяДата, files: [{ id: 1, fileName: 'answer.pdf' }] }))

    expect(без.status).toBe('ASSIGNED')
    expect(homeworkStateKey(без)).toBe('overdue')

    expect(с.status).toBe('SUBMITTED')
    expect(homeworkStateKey(с)).toBe('submitted')
  })

  /** Оценка весомее вложения: проверенная работа проверена. */
  it('оценка перебивает вложение', () => {
    const проверено = materialCard(карточкаУрока({ files: [{ id: 1 }], teacherScore: 5, gradedAt: '2026-09-11T10:00:00' }))
    expect(проверено.status).toBe('COMPLETED')
  })
})

/**
 * Урок каталога, заданный ЦЕЛИКОМ («В домашнюю работу» → весь урок).
 *
 * Такое назначение приходит ссылкой на файл урока, и раньше ученик открывал
 * именно файл — в новой вкладке. В файле курса скрипта заданий нет вовсе (он
 * только переключает режим и переворачивает карточки слов): запись играет, а
 * варианты ответа не нажимаются. Ровно это и прислали с урока — «аудиозапись
 * воспроизводится, но сами задания не нажимаются». Такой урок открывается в
 * кабинете, как заданная карточка, — там задания живые.
 */
describe('урок каталога целиком', () => {
  const FILE = 'https://files.justtostudy.kz/production/course-catalog/a1/lessons/L01.html?mode=solo'
  const урокЦеликом = (over = {}) => assignment({
    materialType: 'LINK', isGraded: false, fileUrl: FILE, catalogLessonId: null, cardId: null, ...over,
  })

  it('ссылка на файл урока каталога — это урок, а не файл', () => {
    expect(isWholeCatalogLesson(урокЦеликом())).toBe(true)
    // Преподаватель выбрал урок в каталоге окна назначения — id приходит прямо.
    expect(isWholeCatalogLesson(урокЦеликом({ catalogLessonId: 77 }))).toBe(true)
  })

  it('заданная карточка идёт своим путём', () => {
    expect(isWholeCatalogLesson(урокЦеликом({ catalogLessonId: 77, cardId: 'c2b5954ea' }))).toBe(false)
  })

  // Пробный урок и диагностика лежат рядом с каталожными, но уроками каталога
  // не являются: на шаги они не разбираются и ведут занятие сами.
  it('самодостаточный урок остаётся файлом', () => {
    expect(isWholeCatalogLesson(урокЦеликом({
      fileUrl: 'https://files.justtostudy.kz/production/course-catalog/standalone/trial-a1.html',
    }))).toBe(false)
  })

  it('чужая ссылка, PDF и загруженный интерактив — не урок каталога', () => {
    expect(isWholeCatalogLesson(урокЦеликом({ fileUrl: 'https://example.com/lesson.html' }))).toBe(false)
    expect(isWholeCatalogLesson(урокЦеликом({ materialType: 'PDF', fileUrl: 'https://files.example/course-catalog/a1/x.pdf' }))).toBe(false)
    expect(isWholeCatalogLesson(assignment())).toBe(false)
    expect(isWholeCatalogLesson(null)).toBe(false)
  })
})
