import BannerBlock from './blocks/BannerBlock.jsx'
import TheoryBlock from './blocks/TheoryBlock.jsx'
import InfoBlock from './blocks/InfoBlock.jsx'
import PracticeBlock from './blocks/PracticeBlock.jsx'
import VocabBlock from './blocks/VocabBlock.jsx'

// `practice` — обрабатывается отдельно ниже (нужны answers/checked/onAnswer/onCheck).
const BLOCK_BY_TYPE = {
  banner: BannerBlock,
  theory: TheoryBlock,
  info: InfoBlock,
  vocab: VocabBlock,
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
  for (const block of blocks || []) {
    const last = groups[groups.length - 1]
    if (block?.type === 'info' && last?.type === 'info') {
      last.blocks.push(block)
    } else if (block?.type === 'info') {
      groups.push({ type: 'info', blocks: [block] })
    } else {
      groups.push({ type: 'single', block })
    }
  }
  return groups
}

// Центр workspace: рендерит блоки активного шага диспетчером по `block.type`.
// `answers`/`checked`/`onAnswer`/`onCheck` прокидываются в practice-блоки как
// есть — сам компонент состояния не хранит.
export default function LessonContent({ step, answers, checked, onAnswer, onCheck, readOnly }) {
  const groups = groupBlocks(step?.blocks)

  return (
    <div className="lw-content">
      {groups.map((group, i) => {
        if (group.type === 'info') {
          return (
            <div className="lw-card lw-info" key={i}>
              {group.blocks.map((block, j) => (
                <InfoBlock key={j} block={block} />
              ))}
            </div>
          )
        }

        const block = group.block
        if (block.type === 'practice') {
          return (
            <PracticeBlock
              key={i}
              block={block}
              answers={answers}
              checked={checked}
              onAnswer={onAnswer}
              onCheck={onCheck}
              readOnly={readOnly}
            />
          )
        }
        const Block = BLOCK_BY_TYPE[block.type]
        if (!Block) return null
        return <Block key={i} block={block} />
      })}
    </div>
  )
}
