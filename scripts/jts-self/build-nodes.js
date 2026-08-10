// Стадии урока → узлы тропы «Обучения».
//
// Урок источника — это 20–30 минут работы и до 130 экранов. Одним узлом тропы
// он был бы вдвое длиннее любого нынешнего урока и без права выйти с
// сохранением, поэтому каждая стадия становится своим узлом.
const { normalizeBlock } = require('./normalize-task')

/** Меньше — и на тропе появляется «печенька» из одного клика. */
const MIN_NODE_TASKS = 3

const pad2 = (n) => String(n).padStart(2, '0')

function tasksOfStage(stage, ctx) {
  return stage.blocks.map((b) => normalizeBlock(b, ctx)).filter(Boolean)
}

function buildLessonNodes({ lesson, level, stages }) {
  const trackFile = (id) => lesson.tracks[id] || null
  const code = `L${pad2(lesson.no)}`

  const built = stages
    .map((stage) => ({ name: stage.name, tasks: tasksOfStage(stage, { sec: stage.name, level, trackFile }) }))
    .filter((s) => s.tasks.length > 0)

  const nodes = []
  for (const stage of built) {
    const previous = nodes[nodes.length - 1]
    if (stage.tasks.length < MIN_NODE_TASKS && previous) {
      previous.tasks.push(...stage.tasks)
      continue
    }
    nodes.push({ name: stage.name, tasks: [...stage.tasks], unit: lesson.unit })
  }

  // Короткая стадия в начале урока «предыдущего» не имела — доклеиваем её к
  // тому узлу, который открылся после неё.
  if (nodes.length > 1 && nodes[0].tasks.length < MIN_NODE_TASKS) {
    nodes[1].tasks.unshift(...nodes[0].tasks)
    nodes[1].name = nodes[0].name
    nodes.shift()
  }

  return nodes.map((node, i) => ({
    code: `${code}-${i + 1}`,
    title: `${lesson.title} · ${node.name}`,
    unit: node.unit,
    tasks: node.tasks,
  }))
}

function buildReviewNode({ review, level, stages }) {
  const trackFile = () => null
  const tasks = stages.flatMap((stage) => tasksOfStage(stage, { sec: stage.name, level, trackFile }))
  return { code: `R${pad2(review.no)}`, title: review.title, unit: review.unit, tasks }
}

/** «Печенька» узла на тропе — та же группировка, что в KingdomInteriorPage. */
function taskGroup(type) {
  if (type === 'listen') return 'audio'
  if (type === 'watch' || type === 'video') return 'video'
  if (type === 'info') return 'info'
  return 'choice'
}

function lessonType(code, tasks) {
  if (/^R\d/i.test(code)) return 'final'
  const first = tasks && tasks[0]
  return first ? taskGroup(first.type) : 'choice'
}

module.exports = { buildLessonNodes, buildReviewNode, lessonType, MIN_NODE_TASKS }
