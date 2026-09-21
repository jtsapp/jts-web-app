import { describe, it, expect } from 'vitest'
import { materialCard, isMaterialGraded, isInteractiveMaterial, isCatalogHtmlLink, isLessonCard, hasAnswerFiles, needsAnswerFile } from './materialAssignments.js'
import { homeworkStateKey } from './homeworkFormat.js'

const assignment = (over = {}) => ({
  id: 5,
  materialId: 12,
  materialTitle: 'Present Perfect · practice test',
  materialType: 'INTERACTIVE_HTML',
  isGraded: true,
  // Статус и просрочку считает сервер — карточка их только переносит.
  status: 'ASSIGNED',
  isOverdue: false,
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
    const card = materialCard(assignment({ status: 'COMPLETED', teacherScore: 5, gradedAt: '2026-08-20T10:00:00' }))
    expect(card.status).toBe('COMPLETED')
    expect(card.grade).toBe(5)
    expect(homeworkStateKey(card)).toBe('completed')
  })

  /* Главное: статус и просрочку СЧИТАЕТ СЕРВЕР, карточка их только переносит.
     Раньше их выводили здесь («есть вложения — значит сдана»), и по работе,
     которая решается прямо в уроке, сдача не наступала никогда. */
  it('статус берётся с сервера, а не выводится из полей', () => {
    const сданнаяБезВложений = materialCard(assignment({ status: 'SUBMITTED', files: [] }))
    expect(сданнаяБезВложений.status).toBe('SUBMITTED')

    const свложениемНоНеСданная = materialCard(assignment({ status: 'ASSIGNED', files: [{ id: 1 }] }))
    expect(свложениемНоНеСданная.status).toBe('ASSIGNED')
  })

  it('просрочку тоже решает сервер, а не часы клиента', () => {
    // Срок прошёл, но сервер сказал «не просрочена» — верим ему.
    const card = materialCard(assignment({ dueDate: '2026-08-01', isOverdue: false }))
    expect(homeworkStateKey(card, new Date(2026, 7, 20))).toBe('assigned')

    const просрочена = materialCard(assignment({ dueDate: '2026-08-01', isOverdue: true }))
    expect(homeworkStateKey(просрочена, new Date(2026, 7, 20))).toBe('overdue')
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

  /**
   * Главное в этой спеке: у выданного блока живого урока materialType — LINK,
   * и ученик открывал сырой файл мимо render-эндпоинта: без моста и с начала
   * урока, не зная, какой блок ему задали. Адрес — настоящий, со стенда.
   */
  it('урок каталога ссылкой — тоже через render-эндпоинт, а не сырым файлом', () => {
    const урокКаталога = assignment({
      materialType: 'LINK',
      fileUrl: 'https://files-dev.justtostudy.kz/development/course-catalog/standalone/a0-lesson-1-1789678276662.html',
    })
    expect(isInteractiveMaterial(урокКаталога)).toBe(true)
    expect(isCatalogHtmlLink(урокКаталога)).toBe(true)
  })

  it('ссылка вне каталога остаётся обычным файлом — её сервер не тянет', () => {
    expect(isInteractiveMaterial(assignment({ materialType: 'LINK', fileUrl: 'https://youtube.com/watch?v=x' }))).toBe(false)
    expect(isInteractiveMaterial(assignment({ materialType: 'LINK', fileUrl: 'https://files.example/course-catalog/notes.pdf' }))).toBe(false)
    expect(isInteractiveMaterial(assignment({ materialType: 'LINK', fileUrl: null }))).toBe(false)
  })

  // Адрес каталога бывает с якорем или запросом — .html там не в конце строки.
  it('каталожный адрес с запросом и якорем опознаётся', () => {
    const c = (fileUrl) => isCatalogHtmlLink(assignment({ materialType: 'LINK', fileUrl }))
    expect(c('https://f.kz/course-catalog/a0.html?v=2')).toBe(true)
    expect(c('https://f.kz/course-catalog/a0.htm#stage-3')).toBe(true)
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
    const без = materialCard(карточкаУрока({ dueDate: просроченнаяДата, status: 'ASSIGNED', isOverdue: true }))
    const с = materialCard(карточкаУрока({ dueDate: просроченнаяДата, files: [{ id: 1, fileName: 'answer.pdf' }], status: 'SUBMITTED', isOverdue: false }))

    expect(без.status).toBe('ASSIGNED')
    expect(homeworkStateKey(без)).toBe('overdue')

    expect(с.status).toBe('SUBMITTED')
    expect(homeworkStateKey(с)).toBe('submitted')
  })

  /** Оценка весомее вложения: проверенная работа проверена. */
  it('оценка перебивает вложение', () => {
    const проверено = materialCard(карточкаУрока({ files: [{ id: 1 }], teacherScore: 5, gradedAt: '2026-09-11T10:00:00', status: 'COMPLETED' }))
    expect(проверено.status).toBe('COMPLETED')
  })
})
