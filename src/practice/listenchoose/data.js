// Данные «Слушай и выбирай»: questions.json (сцены и задания, его режет
// scripts/extract-listenchoose.js) и адреса картинок и записей. Всё статика из
// public/, поэтому раздел работает без бэкенда и в гостевом режиме.

export const LC_BASE = '/practice/listenchoose'

// Ключ картинки — тот, что прототип ждал от внешних файлов:
// <сцена>-<номер фото 0–3>-<ширина 320|512>.
export function imagePath(sceneId, index, size = 512) {
  return `${LC_BASE}/img/${sceneId}-${index}-${size}.webp`
}

// Показанная картинка и предзагрузка следующей берут ОДИН и тот же srcset и
// sizes: иначе на плотном экране телефона показ выбрал бы 512w, а предзагрузили
// бы 320w — трафик впустую, и следующее задание всё равно ждало бы картинки.
export const IMAGE_SIZES = '(max-width:900px) 46vw, 246px'

export function imageSrcSet(sceneId, index, suffix = '') {
  return `${imagePath(sceneId, index, 320)}${suffix} 320w, ${imagePath(sceneId, index, 512)}${suffix} 512w`
}

export function buildData(json) {
  if (!json || !Array.isArray(json.questions) || !Array.isArray(json.scenes)) {
    throw new Error('listenchoose: в questions.json нет scenes/questions')
  }
  return {
    levels: json.levels,
    scenes: json.scenes,
    questions: json.questions,
    byId: Object.fromEntries(json.questions.map((q) => [q.id, q])),
    sceneById: Object.fromEntries(json.scenes.map((s) => [s.id, s])),
  }
}

// Четыре подписи фото сцены задания: alt картинок и текст разбора.
export function optionsOf(data, question) {
  return data.sceneById[question.scene].options
}

// Один fetch на вкладку. Провал в кэше не держим: иначе «проверь связь и
// обнови» не помогало бы до перезагрузки страницы целиком.
let loading = null

export function loadListenChoose(fetchImpl = fetch) {
  if (!loading) {
    const p = fetchImpl(`${LC_BASE}/questions.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`listenchoose: questions.json ${res.status}`)
        return res.json()
      })
      .then(buildData)
    p.catch(() => {
      if (loading === p) loading = null
    })
    loading = p
  }
  return loading
}

// Только для тестов: модульный кэш иначе переезжает из теста в тест.
export function resetListenChooseCache() {
  loading = null
}
