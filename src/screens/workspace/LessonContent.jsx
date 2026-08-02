import BannerBlock from './blocks/BannerBlock.jsx'
import TheoryBlock from './blocks/TheoryBlock.jsx'
import PracticeBlock from './blocks/PracticeBlock.jsx'

// `practice` — обрабатывается отдельно ниже (нужны answers/checked/onAnswer/onCheck).
const BLOCK_BY_TYPE = {
  banner: BannerBlock,
  theory: TheoryBlock,
}

// Центр workspace: рендерит блоки активного шага диспетчером по `block.type`.
// `answers`/`checked`/`onAnswer`/`onCheck` прокидываются в practice-блоки как
// есть — сам компонент состояния не хранит.
export default function LessonContent({ step, answers, checked, onAnswer, onCheck }) {
  const blocks = step?.blocks || []

  return (
    <div className="lw-content">
      {blocks.map((block, i) => {
        if (block.type === 'practice') {
          return (
            <PracticeBlock
              key={i}
              block={block}
              answers={answers}
              checked={checked}
              onAnswer={onAnswer}
              onCheck={onCheck}
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
