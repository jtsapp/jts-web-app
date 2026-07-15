// Deterministic answer-key grading for the IELTS objective sections
// (Listening / Reading). Isomorphic on purpose: the client grades for instant
// results, the record-section route re-grades the same answers before writing
// the canonical row — the DB never trusts a client-computed score.

// Small number-word map so "6" ≡ "six" without hand-listing every variant in
// the accept arrays. Applied to whole normalized tokens.
const NUMBER_WORDS = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
}

// Normalize a free-text gap answer for comparison: lowercase, collapse
// whitespace, strip surrounding punctuation, currency signs and thousands
// commas, drop a leading article, map number words to digits.
export function normalizeAnswer(raw) {
  let s = raw.toLowerCase().trim().replace(/\s+/g, ' ')
  // Currency / punctuation noise: "$800." → "800", "'balcony'," → "balcony".
  s = s.replace(/[$€£]/g, '').replace(/^[\s.,!?;:'"()-]+|[\s.,!?;:'"()-]+$/g, '')
  // "1,000" → "1000" (comma only between digits, keeps "pace, individual" intact).
  s = s.replace(/(\d),(\d)/g, '$1$2')
  // Leading article never changes a gap answer's correctness.
  s = s.replace(/^(a|an|the)\s+/, '')
  // Number words → digits, token-wise ("six" → "6", "eight hundred" stays
  // two tokens "8 hundred" — accept lists cover such composites explicitly).
  s = s
    .split(' ')
    .map((t) => NUMBER_WORDS[t] ?? t)
    .join(' ')
  return s
}

export function gradeQuestion(q, userAnswer) {
  const a = (userAnswer ?? '').trim()
  if (!a) return false
  if (q.kind === 'gap') {
    const norm = normalizeAnswer(a)
    return q.accept.some((v) => normalizeAnswer(v) === norm)
  }
  // mcq / tfng — exact key match (radio inputs, no free text).
  return a.toUpperCase() === q.answer
}

function expectedFor(q) {
  if (q.kind === 'gap') return q.display
  if (q.kind === 'mcq') {
    const opt = q.options.find((o) => o.key === q.answer)
    return `${q.answer}${opt ? ` — ${opt.text}` : ''}`
  }
  return q.answer
}

// Ratio → estimated band, anchored loosely to the official Listening raw-score
// conversion. Capped at 8.0: a handful of questions can't certify a 9. The UI
// always labels this «оценочно».
export function estimateBand(correct, total) {
  if (total <= 0) return 0
  const r = correct / total
  if (r >= 1) return 8.0
  if (r >= 0.8) return 7.5
  if (r >= 0.65) return 6.5
  if (r >= 0.5) return 5.5
  if (r >= 0.3) return 5.0
  if (r >= 0.15) return 4.0
  return 2.5
}

export function gradeSection(questions, answers) {
  const perQuestion = questions.map((q) => {
    const userAnswer = answers[q.id] ?? ''
    return {
      id: q.id,
      correct: gradeQuestion(q, userAnswer),
      userAnswer,
      expected: expectedFor(q),
    }
  })
  const correct = perQuestion.filter((p) => p.correct).length
  return {
    correct,
    total: questions.length,
    band: estimateBand(correct, questions.length),
    perQuestion,
  }
}
