// Крошечный детерминированный банк теста уровня: routing с fixedOrder и
// известным верным вариантом, два задания моста, по одному заданию
// чтения/грамматики/письма. Подменяет реальный bank.json через route — так
// сценарий «новичок ушёл на мост» воспроизводится точно, а не вероятностно.
// Общий для tests/placement.spec.js и tests/level-test-profile.spec.js.
export const FAKE_BANK = {
  bank: {
    version: 'e2e',
    // buildUoeBatch читает blocks.formatMix/itemsPerSession — без них клик по
    // «Начать» в грамматике падал бы внутри движка.
    blocks: { itemsPerSession: 8, formatMix: { cloze_open: 4, wform: 3, transform: 3 } },
    readingTexts: [{ id: 't1', level: 'A2', text: 'Anna has a small cat.' }],
    items: [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `rt-${i}`, block: 'routing', level: 'A2', format: 'mcq4', fixedOrder: true,
        stem: `Routing ${i + 1}`, key: 0,
        options: [{ t: 'CORRECT' }, { t: 'WRONG-1' }, { t: 'WRONG-2' }, { t: 'WRONG-3' }],
      })),
      { id: 'br-1', block: 'a0_bridge', level: 'A1', format: 'cloze_open', stem: 'Bridge one ___', answer: ['ok'] },
      { id: 'br-2', block: 'a0_bridge', level: 'A1', format: 'cloze_open', stem: 'Bridge two ___', answer: ['ok'] },
      {
        id: 'r-1', block: 'reading', level: 'A2', format: 'mcq4', fixedOrder: true, source: 't1',
        stem: 'Who has a cat?', key: 0,
        options: [{ t: 'Anna' }, { t: 'Nick' }, { t: 'Dana' }, { t: 'Aigerim' }],
      },
      { id: 'u-1', block: 'uoe', level: 'A1', format: 'cloze_open', constructFamily: 'tense_aspect', stem: 'She ___ happy.', answer: ['is'] },
      { id: 'w-1', block: 'writing', level: 'A1', stem: 'Write about your day.' },
    ],
  },
  bank2: {
    minpairs: [],
    clips: { sources: [], items: [] },
    listening2: { sources: [], items: [] },
    interactive: { order: [], bankfill: [], match: [] },
  },
  manifest: { sources: [] },
  vocab: {},
  appliedPatches: [],
}

/**
 * Проверка ответов для FAKE_BANK вместо /api/placement/grade.
 *
 * С тех пор как ключи ушли из публичного банка на сервер (bankSplit.js), роут
 * проверяет по СВОЕМУ ключу, а заданий фикстуры (rt-0, br-1…) в нём нет —
 * любой ответ на них получал 0, и сценарий «мост пройден» стал непроходимым.
 * Проверяем по полям самой фикстуры: key для выбора, answer для ввода.
 */
export function gradeFakeBank(answers) {
  const byId = new Map(FAKE_BANK.bank.items.map((it) => [it.id, it]))
  return answers.map((a) => {
    const item = byId.get(a.id)
    let correct = 0
    if (item?.answer) correct = item.answer.includes(String(a.text || '').trim().toLowerCase()) ? 1 : 0
    else if (item?.key != null) correct = a.optIndex === item.key ? 1 : 0
    return { id: a.id, correct }
  })
}

/**
 * Подменяет банк и его проверку на странице. [vocab] — словарь LexTALE (у
 * фикстуры он пуст, и раздел проскакивается): с ним после моста сразу идёт
 * словарь, ведь остальные разделы до него в фикстуре пустые.
 *
 * Разминка на фикстуре проваливается всегда: движок берёт 2×A2, 2×B1, B2 и
 * C1, а у фикстуры все шесть заданий A2 — попадают два, остальные четыре
 * считаются «без ответа». Дальше в основной тест ведёт только пройденный мост.
 */
export async function routeFakeBank(page, { vocab } = {}) {
  const bank = vocab ? { ...FAKE_BANK, vocab } : FAKE_BANK
  await page.route('**/practice/placement/bank.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bank) }),
  )
  await page.route('**/api/placement/grade', (route) => {
    const { answers = [] } = route.request().postDataJSON() || {}
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scores: gradeFakeBank(answers), session: false }),
    })
  })
}

/**
 * Тексты верных вариантов всех заданий с выбором реального банка. Ключ лежит
 * на сервере (src/practice/placement/keys.generated.json), варианты — в
 * публичном bank.json: сводим их по id задания.
 */
export async function correctOptionTexts(page, keysPath) {
  const { readFileSync } = await import('node:fs')
  const keys = JSON.parse(readFileSync(keysPath, 'utf8')).items
  const bank = await (await page.request.get('/practice/placement/bank.json')).json()
  const set = new Set()
  for (const it of bank.bank.items) {
    const key = keys[it.id]?.key
    if (it.options?.length && typeof key === 'number' && it.options[key]) set.add(it.options[key].t)
  }
  return set
}
