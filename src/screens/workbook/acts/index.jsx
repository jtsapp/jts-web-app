'use client'

import { speak, stopAudio } from '../../../practice/workbook/voice.js'
import PickAct, { RespondAct, TfAct } from './PickAct.jsx'
import { BankAct, MatchAct, TableAct, ChatAct } from './BlankActs.jsx'
import { OrderAct, FixAct, SortAct, SeqAct } from './TapActs.jsx'
import { TypeAct, DropAct, MemoAct } from './InputActs.jsx'
import { ListenAct, ReadAct, WriteAct, SpeakAct } from './SourceActs.jsx'

// Диспетчер экранов. Порт реестра R{} из прототипа: тип задания → компонент.
// Незнакомый тип сюда не доедет — экстрактор роняет сборку на неизвестном `t`
// (scripts/extract-workbook.js), поэтому пустого экрана у студента не будет.

const MAP = {
  choose: PickAct,
  odd: PickAct,
  label: PickAct,
  tf: TfAct,
  respond: RespondAct,
  bank: BankAct,
  match: MatchAct,
  table: TableAct,
  order: OrderAct,
  fix: FixAct,
  sort: SortAct,
  seq: SeqAct,
  type: TypeAct,
  drop: DropAct,
  memo: MemoAct,
}

/** Само задание без обёртки-источника. */
function TaskBody({ act, ctl, slow }) {
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
  const Cmp = MAP[act.t]
  if (!Cmp) return null
  return <Cmp act={act} ctl={ctl} />
}

export default function ActBody({ act, ctl, level, slow, onSlow, draft, onDraft }) {
  if (act.t === 'listen') {
    return (
      <ListenAct act={act} level={level} slow={slow} onSlow={onSlow}>
        <TaskBody act={act.task} ctl={ctl} slow={slow} />
      </ListenAct>
    )
  }
  if (act.t === 'read') {
    return (
      <ReadAct act={act} slow={slow}>
        <TaskBody act={act.task} ctl={ctl} slow={slow} />
      </ReadAct>
    )
  }
  if (act.t === 'write') return <WriteAct act={act} slow={slow} draft={draft} onDraft={onDraft} />
  if (act.t === 'speak') return <SpeakAct act={act} slow={slow} />
  return <TaskBody act={act} ctl={ctl} slow={slow} />
}
