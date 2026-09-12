// @vitest-environment jsdom
// Кэш каталога: кого он считает хозяином ответа, что делает с отзывом выдачи
// курса и как расстаётся с записями прошлых поколений.
//
// Кэш каталога бессрочный: ни TTL, ни инвалидации у него нет. Для витрин
// (баланс, ситуативки, комиксы) это и задумано, а вот содержимое урока каталога
// — единственное, что сервер закрывает выдачей. Пока оно лежало в localStorage,
// менеджер отзывал выдачу, сервер отвечал 403, фоновое обновление отказ глотало
// — и ученик открывал закрытый курс с любой перезагрузки, пока не почистит кэш
// браузера руками.
//
// Мокаем транспорт (fetch), а не модуль: проверяется сам кэш — тот же приём, что
// в screens/bookCache.test.js и screens/boothApi.test.js.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const TOKEN = `${b64url({ alg: 'HS512' })}.${b64url({ sub: '77001234567', userId: 42 })}.sig`

// Ученики с кириллическими именами — то, из-за чего написан блок «личность в
// ключе». Пары «имя + sub» подобраны так, чтобы base64url payload'а содержал
// '-' или '_'; тест это и проверяет первым делом, чтобы фикстура не перестала
// молча проверять то, ради чего заведена.
const studentToken = ({ sub, userId, name }) =>
  `${b64url({ alg: 'HS512' })}.${b64url({ sub, userId, name, role: 'STUDENT' })}.sig`
const DANIYAR = { sub: '7700000001', userId: 41, name: 'Данияр' }
const AYAULYM = { sub: '7700000002', userId: 42, name: 'Аяулым' }

const payloadSegment = (token) => token.split('.')[1]

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })

const TREE = [{ level: 'A1', courses: [] }]
const OTHER_TREE = [{ level: 'B1', courses: [] }]

// Форма ключа и BASE списаны с catalogCacheKey в api.js намеренно: разъедутся
// они — тесты покраснеют, а не промолчат.
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'
const keyFor = (ver, identity, path) => `jts_catalog_${ver}:${BASE}:${identity}:${path}`
const liveKey = (identity, path) => keyFor('v2', identity, path)
const legacyKey = (identity, path) => keyFor('v1', identity, path)
const CATALOG_PATH = '/mobile/course-catalog'
const WORDS_PATH = '/mobile/saved-words'

// Ключи кэша каталога, лежащие в браузере прямо сейчас.
const catalogKeys = () =>
  Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).filter((k) =>
    k.startsWith('jts_catalog_'),
  )

const allKeys = () =>
  Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).sort()

// Фоновому обновлению надо дать упасть: оно живёт в промисной ветке, которую
// вызывающий не ждёт.
const settleBackground = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('кэш каталога и отзыв выдачи курса', () => {
  let api

  // Уборка прошлых поколений идёт на импорте — то есть при загрузке
  // приложения, — поэтому воспроизводить её надо импортом, а не вызовом.
  // Заодно сброс модулей разводит RAM-кэш: он живёт в области модуля, и без
  // этого тесты видели бы кэш друг друга.
  const bootApp = async () => {
    vi.resetModules()
    return import('./api.js')
  }

  beforeEach(async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    api = await bootApp()
  })

  afterEach(() => vi.unstubAllGlobals())

  describe('содержимое урока', () => {
    it('не откладывается в браузере: каждое открытие спрашивает сервер', async () => {
      globalThis.fetch.mockResolvedValue(ok({ id: 7, title: 'L01', fileUrl: 'f.html', content: null }))

      await api.getCourseCatalogLessonContent(7, TOKEN)
      await api.getCourseCatalogLessonContent(7, TOKEN)

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
      expect(catalogKeys()).toEqual([])
    })

    it('отказ доходит до вызывающего, а не тонет в фоновом обновлении', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ id: 7, fileUrl: 'f.html', content: null }))
      await api.getCourseCatalogLessonContent(7, TOKEN)

      globalThis.fetch.mockResolvedValueOnce(status(403))

      await expect(api.getCourseCatalogLessonContent(7, TOKEN)).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('витрины каталога', () => {
    it('отказ в фоновом обновлении выбрасывает сохранённый ответ, а не глотается', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok(TREE))
      await api.getCourseCatalog(TOKEN)
      expect(catalogKeys()).toHaveLength(1)

      // Второй заход отдаётся из кэша мгновенно, а фоном приходит отказ.
      globalThis.fetch.mockResolvedValueOnce(status(403))
      expect(await api.getCourseCatalog(TOKEN)).toEqual(TREE)

      await vi.waitFor(() => expect(catalogKeys()).toEqual([]))

      // И следующий заход снова идёт на сервер, а не отвечает из памяти.
      globalThis.fetch.mockResolvedValueOnce(status(403))
      await expect(api.getCourseCatalog(TOKEN)).rejects.toMatchObject({ status: 403 })
    })

    it('обрыв связи сохранённый ответ не выбрасывает: ученик в метро остаётся с каталогом', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok(TREE))
      await api.getCourseCatalog(TOKEN)

      globalThis.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      expect(await api.getCourseCatalog(TOKEN)).toEqual(TREE)
      await settleBackground()

      expect(catalogKeys()).toHaveLength(1)
      globalThis.fetch.mockClear()
      expect(await api.getCourseCatalog(TOKEN)).toEqual(TREE)
    })

    it('пятисотка сохранённый ответ не выбрасывает: это осечка сервера, а не отказ ученику', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok(TREE))
      await api.getCourseCatalog(TOKEN)

      globalThis.fetch.mockResolvedValueOnce(status(500))
      expect(await api.getCourseCatalog(TOKEN)).toEqual(TREE)
      await settleBackground()

      expect(catalogKeys()).toHaveLength(1)
    })
  })

  // Кого кэш считает хозяином ответа. Ключ разделяет учеников, и пока разбор
  // payload'а спотыкался о base64url, ученик с кириллическим именем проваливался
  // в 'anon' — ключ, общий на всех безымянных. На общем компьютере (класс,
  // ресепшн) следующий вошедший видел из localStorage баланс, стрик и
  // сохранённые слова предыдущего ещё до того, как сеть успевала ответить.
  describe('личность в ключе кэша', () => {
    // Стража фикстур. base64url отличается от base64 ровно двумя символами —
    // '-' вместо '+' и '_' вместо '/'; подбери мы имена, в которых их нет, и
    // тесты ниже проверяли бы совсем не то, ради чего написаны, — молча.
    it('у фикстур в payload и правда есть символы base64url', () => {
      expect(payloadSegment(studentToken(DANIYAR))).toMatch(/[-_]/)
      expect(payloadSegment(studentToken(AYAULYM))).toMatch(/[-_]/)
    })

    it('ученик с кириллическим именем попадает под своим sub, а не в общий "anon"', async () => {
      globalThis.fetch.mockResolvedValue(ok(TREE))

      await api.getCourseCatalog(studentToken(DANIYAR))

      expect(catalogKeys()).toEqual([liveKey(DANIYAR.sub, CATALOG_PATH)])
    })

    it('два ученика с кириллическими именами не делят один ключ', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok(TREE))
      expect(await api.getCourseCatalog(studentToken(DANIYAR))).toEqual(TREE)

      // Второму каталог обязан приехать свой. Пока оба считались 'anon', этот
      // вызов не ходил в сеть вовсе и отдавал каталог первого.
      globalThis.fetch.mockResolvedValueOnce(ok(OTHER_TREE))
      expect(await api.getCourseCatalog(studentToken(AYAULYM))).toEqual(OTHER_TREE)

      expect(catalogKeys().sort()).toEqual(
        [liveKey(DANIYAR.sub, CATALOG_PATH), liveKey(AYAULYM.sub, CATALOG_PATH)].sort(),
      )
    })
  })

  // Безымянный вызов. Токен приходит из localStorage: он бывает обрезанным,
  // протухшим или оставшимся от другой версии приложения. А главное — его
  // может не быть вовсе: getPracticeToken отдаёт null, когда демо-ручка
  // ответила 503 (передеплой) или 502, и PracticePage несёт этот null дальше
  // в getSavedWords, getSituativki и соседей, ничего не проверяя.
  describe('вызов без опознанной личности', () => {
    const NO_IDENTITY = [null, undefined, '', 'не-jwt', 'header-only', 'a.!!!.c', 'a.b.c.d']

    it('ничего не кладёт в кэш: отдавать следующему будет нечего', async () => {
      globalThis.fetch.mockResolvedValue(ok(TREE))

      for (const token of NO_IDENTITY) {
        expect(await api.getCourseCatalog(token)).toEqual(TREE)
      }

      expect(catalogKeys()).toEqual([])
    })

    it('не читает общий бакет, даже если тот уже лежит в браузере', async () => {
      // Ровно то, из-за чего правка: слова Данияра, отложенные под общим
      // ключом, гость получал раньше сети. Ключ здесь ТЕКУЩЕГО поколения —
      // проверяется путь чтения, а не уборка (ей посвящён блок ниже).
      const shared = liveKey('anon', WORDS_PATH)
      window.localStorage.setItem(shared, JSON.stringify([{ word: 'дом' }]))
      globalThis.fetch.mockResolvedValue(ok([{ word: 'guest' }]))

      expect(await api.getSavedWords(null)).toEqual([{ word: 'guest' }])
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('сброс кэша после записи слова не сносит чужой ключ "null"', async () => {
      // saveWord и соседи по словарю сбрасывают кэш тем же ключом, каким его
      // заводили, а ключа у безымянного вызова нет. Без проверки в
      // dropCachedAuthGet в removeItem уезжал бы null — и браузер приводил бы
      // его к строке, вынося ключ с именем "null" из чужого хранилища.
      window.localStorage.setItem('null', 'чужое')
      globalThis.fetch.mockResolvedValue(ok({ id: 1 }))

      await api.saveWord(null, { word: 'home', translation: 'дом' })

      expect(window.localStorage.getItem('null')).toBe('чужое')
    })

    it('и в память тоже не кладёт: второй вызов подряд снова идёт в сеть', async () => {
      // RAM-кэш живёт рядом с localStorage и ключуется так же. Разреши мы
      // безымянному вызову хотя бы память — чужие слова доставались бы
      // следующему до конца жизни вкладки, без всякого localStorage.
      globalThis.fetch.mockResolvedValueOnce(ok([{ word: 'дом' }]))
      await api.getSavedWords(null)

      globalThis.fetch.mockResolvedValueOnce(ok([{ word: 'guest' }]))
      expect(await api.getSavedWords(null)).toEqual([{ word: 'guest' }])
    })
  })

  // Уборка прошлых поколений. Версия в ключе разводит поколения, но сама по
  // себе ничего не удаляет — записи v1 остались бы лежать навсегда и занимать
  // общую квоту домена (5 МБ), вытесняя черновики домашки и прогресс Практики.
  describe('уборка прошлых поколений', () => {
    it('выносит записи прошлого поколения, включая общий бакет "anon"', async () => {
      const sharedWords = legacyKey('anon', WORDS_PATH)
      const named = legacyKey(DANIYAR.sub, CATALOG_PATH)
      const lessonContent = legacyKey(DANIYAR.sub, '/mobile/course-catalog/lessons/7/content')
      for (const key of [sharedWords, named, lessonContent]) {
        window.localStorage.setItem(key, JSON.stringify([{ word: 'дом' }]))
      }

      api = await bootApp() // загрузка приложения с выкаченной правкой

      expect(catalogKeys()).toEqual([])
    })

    it('чужие ключи приложения не трогает', async () => {
      // Полный список того, что лежит в том же хранилище: сессия, черновик
      // ответов домашки, прогресс разделов Практики, настройки профиля. Кэш
      // каталога — единственное, что уборке позволено видеть.
      const foreign = {
        jts_access_token: 'a.b.c',
        jts_refresh_token: 'r',
        jts_user_snapshot: '{"id":41}',
        'hw-answers:7': '{"1":"черновик"}',
        jts_words_done: '{"scenes":{}}',
        jts_workbook_state: '{"prog":{}}',
        'jts.vocab.learned.v1': '{}',
        'jts-a1-done': '["L01"]',
        jts_profile_avatar: 'url',
        lang: 'ru',
      }
      for (const [key, value] of Object.entries(foreign)) window.localStorage.setItem(key, value)
      window.localStorage.setItem(legacyKey('anon', WORDS_PATH), '[]')

      api = await bootApp()

      expect(allKeys()).toEqual(Object.keys(foreign).sort())
    })

    it('записи текущего поколения переживают загрузку', async () => {
      // Иначе «уборка» стала бы очисткой кэша на каждый заход, и SWR не
      // отдавал бы мгновенно ничего и никогда.
      globalThis.fetch.mockResolvedValue(ok(TREE))
      await api.getCourseCatalog(studentToken(DANIYAR))
      expect(catalogKeys()).toEqual([liveKey(DANIYAR.sub, CATALOG_PATH)])

      api = await bootApp()

      expect(catalogKeys()).toEqual([liveKey(DANIYAR.sub, CATALOG_PATH)])
    })

    it('гость в минуту передеплоя не видит слов предыдущего ученика', async () => {
      // Сценарий целиком: общий компьютер класса, под 'anon' остались слова
      // Данияра из прошлого поколения, гость открывает «Практику», демо-ручка
      // отвечает 503 — и в getSavedWords уезжает null.
      window.localStorage.setItem(legacyKey('anon', WORDS_PATH), JSON.stringify([{ word: 'дом' }]))

      api = await bootApp()
      globalThis.fetch.mockResolvedValue(ok([]))

      expect(await api.getSavedWords(null)).toEqual([])
      expect(catalogKeys()).toEqual([])
    })
  })
})
