// Справочник Reading: 12 типов вопросов ТЗ §13.2, дриллы и ловушки. Ключи — те же, что в банках прототипа
// и в ielts_tests.category на бэкенде (rtType / drill), чтобы каталог, статистика и разбор говорили одним языком.

// Тип тренажёра → типы вопросов, которые он объединяет (как JTS.config.readingTypes прототипа).
export const READING_CATEGORIES = [
  { id: 'tfng', types: ['tfng'] },
  { id: 'ynng', types: ['ynng'] },
  { id: 'multiple_choice', types: ['multiple_choice_single', 'multiple_choice_multi'] },
  { id: 'matching_headings', types: ['matching_headings'] },
  { id: 'matching_information', types: ['matching_information'] },
  { id: 'matching_features', types: ['matching_features'] },
  { id: 'matching_sentence_endings', types: ['matching_sentence_endings'] },
  { id: 'sentence_completion', types: ['sentence_completion'] },
  { id: 'summary_completion', types: ['summary_completion'] },
  { id: 'note_table_flow_chart', types: ['note_completion', 'table_completion', 'flow_chart_completion'] },
  { id: 'diagram_label', types: ['diagram_label'] },
  { id: 'short_answer', types: ['short_answer'] },
]

// Названия типов — английские во всех языках интерфейса: так они звучат на экзамене (прототип делает так же).
export const CATEGORY_LABEL = {
  tfng: 'True / False / Not Given',
  ynng: 'Yes / No / Not Given',
  multiple_choice: 'Multiple choice',
  matching_headings: 'Matching headings',
  matching_information: 'Matching information',
  matching_features: 'Matching features',
  matching_sentence_endings: 'Matching sentence endings',
  sentence_completion: 'Sentence completion',
  summary_completion: 'Summary completion',
  note_table_flow_chart: 'Note / Table / Flow-chart completion',
  diagram_label: 'Diagram label completion',
  short_answer: 'Short-answer questions',
}

const TYPE_TO_CATEGORY = Object.fromEntries(READING_CATEGORIES.flatMap((c) => c.types.map((t) => [t, c.id])))

export function categoryOf(type) {
  return TYPE_TO_CATEGORY[type] || type
}

// Подпись типа вопроса в чипах: у note/table/flow-chart своя, у остальных — по категории.
const TYPE_LABEL = {
  note_completion: 'Note completion',
  table_completion: 'Table completion',
  flow_chart_completion: 'Flow-chart completion',
  multiple_choice_single: 'Multiple choice',
  multiple_choice_multi: 'Multiple choice',
  // типы Listening (IeltsDocument.LISTENING_TYPES)
  form_completion: 'Form completion',
  summary_completion: 'Summary completion',
  sentence_completion: 'Sentence completion',
  short_answer: 'Short answer',
  matching: 'Matching',
  map_labelling: 'Map labelling',
  dictation: 'Dictation',
  spelling: 'Spelling',
}

export function typeLabel(type) {
  return TYPE_LABEL[type] || CATEGORY_LABEL[categoryOf(type)] || type
}

export const DRILLS = ['skimming', 'scanning', 'ng', 'paraphrase', 'headings', 'keyword', 'timing', 'gt']

export const TRAPS = ['paraphrase', 'distractor', 'NG_vs_False', 'spelling', 'plural', 'number_trap', 'synonym_trap',
  'over_generalisation', 'self_correction', 'word_limit_violation', 'wrong_text_GT', 'extra_selection']

// Механика ответа — экран ветвится по ней, а не по типу (12 типов, 4 механики).
export const MECHANIC = {
  tfng: 'judgement',
  ynng: 'judgement',
  multiple_choice_single: 'choice',
  multiple_choice_multi: 'multi',
  matching_headings: 'select',
  matching_information: 'select',
  matching_features: 'select',
  matching_sentence_endings: 'select',
}

export function mechanicOf(type) {
  return MECHANIC[type] || 'gap'
}

export const JUDGEMENT_OPTIONS = {
  tfng: ['TRUE', 'FALSE', 'NOT GIVEN'],
  ynng: ['YES', 'NO', 'NOT GIVEN'],
}

// Лимит экзамена на один текст, когда в тесте он не задан (ТЗ: 20 минут на текст).
export const PASSAGE_SEC = 20 * 60
