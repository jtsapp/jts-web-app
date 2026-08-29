'use client'

import { speak, stopAudio } from '../../../practice/workbook/voice.js'
import PickAct, { RespondAct, TfAct } from './PickAct.jsx'
import { BankAct, MatchAct, TableAct, ChatAct, ClozeAct } from './BlankActs.jsx'
import { OrderAct, TransAct, FixAct, SortAct, SeqAct, EparaAct } from './TapActs.jsx'
import { TypeAct, DropAct, MemoAct } from './InputActs.jsx'
import { TtransAct, WformAct, ChainAct } from './TypedActs.jsx'
import QuizAct from './QuizAct.jsx'
import {
  ListenAct, ReadAct, WriteAct, SpeakAct, ModelAct, WorkedAct, RuleAct, VideoAct,
} from './SourceActs.jsx'

// Диспетчер экранов. Порт реестра R{} из прототипов: тип задания → компонент.
// Незнакомый тип сюда не доедет — экстрактор роняет сборку на неизвестном `t`
// (scripts/extract-workbook.js), поэтому пустого экрана у студента не будет.
//
// Типы приходят из пяти разных прототипов: A0 знает восемнадцать, A1 добавил
// trans, B1 — ttrans/wform/worked/model, B2 — rule/chain/epara/cloze/quiz/video.

const MAP = {
  choose: PickAct,
  odd: PickAct,
  label: PickAct,
  tf: TfAct,
  respond: RespondAct,
  bank: BankAct,
  match: MatchAct,
  table: TableAct,
  cloze: ClozeAct,
  order: OrderAct,
  trans: TransAct,
  fix: FixAct,
  epara: EparaAct,
  sort: SortAct,
  seq: SeqAct,
  type: TypeAct,
  drop: DropAct,
  memo: MemoAct,
  quiz: QuizAct,
}

// Типы, которые судят НАБРАННЫЙ ответ: им нужен уровень, потому что судья
// у каждого уровня свой (src/practice/workbook/match.js).
const TYPED = { type: TypeAct, ttrans: TtransAct, wform: WformAct, chain: ChainAct }

/** Само задание без обёртки-источника. */
function TaskBody({ act, ctl, level, slow }) {
  if (act.t === 'chat') {
    return (
      <ChatAct
        act={act}
        ctl={ctl}
        onSpeak={() => {
          stopAudio()
          // Реплики читаются уже заполненными: диалог должен звучать целиком.
          speak(
            act.lines.map((ln) => ({ t: String(ln.s).replace(/___/g, ln.a || ''), v: ln.w ? 'B' : 'A' })),
            { slow }
          )
        }}
      />
    )
  }
  const Typed = TYPED[act.t]
  if (Typed) return <Typed act={act} ctl={ctl} level={level} />
  const Cmp = MAP[act.t]
  if (!Cmp) return null
  return <Cmp act={act} ctl={ctl} />
}

export default function ActBody({ act, ctl, level, unit, slow, onSlow, draft, onDraft }) {
  // Обёртки судят вложенное задание; у остальных типов task нет вовсе, и
  // считать его заранее нельзя — компонент упадёт на undefined.
  const task = act.task ? <TaskBody act={act.task} ctl={ctl} level={level} slow={slow} /> : null

  if (act.t === 'listen') {
    return (
      <ListenAct act={act} level={level} slow={slow} onSlow={onSlow}>
        {task}
      </ListenAct>
    )
  }
  if (act.t === 'read') {
    return (
      <ReadAct act={act} slow={slow}>
        {task}
      </ReadAct>
    )
  }
  if (act.t === 'video') {
    return (
      <VideoAct act={act} level={level} unit={unit} slow={slow}>
        {task}
      </VideoAct>
    )
  }
  if (act.t === 'model') {
    return (
      <ModelAct act={act} slow={slow}>
        {task}
      </ModelAct>
    )
  }
  if (act.t === 'worked') return <WorkedAct act={act}>{task}</WorkedAct>
  if (act.t === 'rule') return <RuleAct act={act}>{task}</RuleAct>
  if (act.t === 'write') return <WriteAct act={act} slow={slow} draft={draft} onDraft={onDraft} />
  if (act.t === 'speak') return <SpeakAct act={act} slow={slow} />
  return <TaskBody act={act} ctl={ctl} level={level} slow={slow} />
}
