import { useEffect } from 'react'
import BannerBlock from './blocks/BannerBlock.jsx'
import TheoryBlock from './blocks/TheoryBlock.jsx'
import InfoBlock from './blocks/InfoBlock.jsx'
import PracticeBlock from './blocks/PracticeBlock.jsx'
import VocabBlock from './blocks/VocabBlock.jsx'
import ChecklistBlock from './blocks/ChecklistBlock.jsx'
import WritingBlock from './blocks/WritingBlock.jsx'
import SpeakingBlock from './blocks/SpeakingBlock.jsx'
import TranslatePopover from './TranslatePopover.jsx'
import { useTapTranslate } from './useTapTranslate.js'
import { useI18n } from '../../i18n.jsx'

// `practice` — обрабатывается отдельно ниже (нужны answers/checked/onAnswer/onCheck).
const BLOCK_BY_TYPE = {
  banner: BannerBlock,
  theory: TheoryBlock,
  info: InfoBlock,
  vocab: VocabBlock,
  checklist: ChecklistBlock,
  writing: WritingBlock,
  speaking: SpeakingBlock,
}

/**
 * Склеивает подряд идущие info-блоки в одну группу.
 *
 * Экстрактор урока каталога режет тело упражнения по прямым детям `.ex-body`,
 * поэтому инструкция, подсказка под ней и сама разметка приезжают тремя
 * отдельными блоками. В реальном уроке (A2, L01) их 88 на семь шагов, сериями
 * до семнадцати подряд — карточка на блок превращала шаг в стопку из двух
 * десятков белых плашек, где «1 · Match each word to its meaning.» жила
 * отдельной карточкой r-step, оторванной от упражнения, к которому относится.
 *
 * У преподавателя тот же урок открывается файлом, и там это один поток
 * `.ex-body` — отсюда и расхождение двух экранов. Группа возвращает поток:
 * одна карточка на серию, блоки внутри разделены отступом, как в файле.
 */
export function groupBlocks(blocks) {
  const groups = []
  ;(blocks || []).forEach((block, blockIndex) => {
    const last = groups[groups.length - 1]
    if (block?.type === 'info' && last?.type === 'info') {
      last.blocks.push(block)
    } else if (block?.type === 'info') {
      // blockIndex — позиция ПЕРВОГО блока серии в сыром step.blocks (не
      // groups!) — это же и есть якорь для live-трекинга скролла ниже:
      // и веб-админка, и этот компонент читают один и тот же сырой массив,
      // а сериями info склеиваются только тут (см. комментарий выше).
      groups.push({ type: 'info', blocks: [block], blockIndex })
    } else {
      groups.push({ type: 'single', block, blockIndex })
    }
  })
  return groups
}

// Ключ practice-карточки в множестве `checkedKeys`. Шаг урока — это не одно
// упражнение: экстрактор режет тело урока по прямым детям `.ex-body`, и в
// реальном уроке один шаг («Vocabulary») несёт до дюжины пронумерованных
// заданий подряд, каждое своей карточкой с собственной кнопкой «Проверить».
// Ключ по одному только `stepId` считал бы весь шаг проверенным после первого
// же клика — соседние карточки открывали бы чужие ответы и блокировали ввод,
// хотя студент их ещё не касался. `groupIndex` — позиция карточки в потоке
// `groupBlocks`, стабильна для данных шага (порядок блоков не меняется).
export function practiceBlockKey(stepId, groupIndex) {
  return `${stepId ?? ''}:${groupIndex}`
}

// Центр workspace: рендерит блоки активного шага диспетчером по `block.type`.
// `answers`/`checkedKeys`/`onAnswer`/`onCheck` прокидываются в practice-блоки:
// сам компонент состояния не хранит, только вычисляет per-карточный ключ.
//
// `liveQuestionId` — только у смотрящего (преподаватель/собеседник): где
// сейчас ученик (см. useActiveQuestionTracker в LiveLessonPage). Не только
// вопрос practice — тот же id может указывать и на info/theory/vocab/
// checklist-карточку (`block-<индекс>`, см. groupBlocks): ученик читает
// правило или примеры так же долго, как отвечает на вопросы, и подглядывать
// только за practice-блоками значило бы, что смотрящий застревает на
// последнем вопросе шага, пока ученик уже читает материал дальше. Сам
// ученик liveQuestionId не получает — он не следует за собой.
export default function LessonContent({ step, answers, checkedKeys, onAnswer, onCheck, readOnly, liveQuestionId, token, source }) {
  const groups = groupBlocks(step?.blocks)
  const { lang } = useI18n()
  // Тап-перевод слова в info-блоках (тексты для чтения) — та же карточка, что
  // в читалке книг, см. useTapTranslate.js. Один экземпляр на весь шаг, а не
  // по одному на info-блок: попап один, и клик по новому слову должен закрыть
  // прошлый, а не открыть второй рядом.
  const { pop, openWord, close, onSave } = useTapTranslate({ token, lang, source })

  // Ученик перешёл/проскроллил на новый вопрос — подъезжаем к нему, а не
  // ждём, пока смотрящий сам найдёт нужную карточку в потоке. Без задержки
  // элемента ещё может не быть в DOM (смена шага и первого live-события
  // приходят почти одновременно).
  useEffect(() => {
    if (liveQuestionId == null) return
    const t = setTimeout(() => {
      // instant, не smooth: smooth scrollIntoView внутри скроллящегося предка
      // ненадёжен (проверено живьём — анимация иногда просто не запускается).
      document
        .querySelector(`[data-question-id="${CSS.escape(String(liveQuestionId))}"]`)
        ?.scrollIntoView({ behavior: 'instant', block: 'center' })
    }, 60)
    return () => clearTimeout(t)
  }, [liveQuestionId, step?.id])

  return (
    <div className="lw-content" onClick={close}>
      {groups.map((group, i) => {
        if (group.type === 'info') {
          const anchorId = `block-${group.blockIndex}`
          return (
            <div
              className={`lw-card lw-info${anchorId === liveQuestionId ? ' lw-q--live-here' : ''}`}
              key={i}
              data-question-id={anchorId}
            >
              {group.blocks.map((block, j) => (
                <InfoBlock key={j} block={block} onWord={openWord} />
              ))}
            </div>
          )
        }

        const block = group.block
        if (block.type === 'grammar_concept') {
          const anchorId = `block-${group.blockIndex}`
          return (
            <div
              className={`lw-card lw-info${anchorId === liveQuestionId ? ' lw-q--live-here' : ''}`}
              key={i}
              data-question-id={anchorId}
            >
              <InfoBlock block={block} onWord={openWord} />
            </div>
          )
        }
        if (block.type === 'practice') {
          const key = practiceBlockKey(step?.id, i)
          return (
            <PracticeBlock
              key={i}
              block={block}
              answers={answers}
              checked={checkedKeys?.has(key) ?? false}
              onAnswer={onAnswer}
              onCheck={() => onCheck(key)}
              readOnly={readOnly}
              liveQuestionId={liveQuestionId}
              onWord={openWord}
            />
          )
        }
        const Block = BLOCK_BY_TYPE[block.type]
        if (!Block) return null
        const anchorId = `block-${group.blockIndex}`
        return (
          <div
            key={i}
            data-question-id={anchorId}
            className={anchorId === liveQuestionId ? 'lw-q--live-here' : undefined}
          >
            <Block block={block} onWord={openWord} />
          </div>
        )
      })}
      <TranslatePopover pop={pop} onSave={onSave} />
    </div>
  )
}
