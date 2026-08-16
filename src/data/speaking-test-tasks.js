// Placement probe for the Спарк level test. ONE level-agnostic prompt: it must
// give a weak speaker room for simple description AND let a strong speaker show
// argumentation, so the grader (api/speaking-test/assess, mode:'placement') can
// place the answer anywhere on A1–C2. Record → transcribe → Sonnet returns the
// CEFR level; this path never touches LiveKit, so there is NO talk-time cap.

export const PLACEMENT_TASK = {
  id: 'placement',
  instruction:
    'Introduce yourself and talk about your everyday life — your work or studies and how you spend your free time. Then choose something you have an opinion about and explain what you think and why.',
  minSeconds: 120,
  // Верхняя граница — подсказка, а не таймер: запись не обрывается сама, и
  // ученик может говорить дольше (пайплайн держит ~13 минут, см. MAX_BYTES в
  // api/transcribe). Раньше стояло 3 минуты, потому что распознавание не
  // вывозило больше — теперь ограничение снято.
  maxSeconds: 300,
}
