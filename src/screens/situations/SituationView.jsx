'use client'

import { useI18n } from '../../i18n.jsx'
import MultiLine from './MultiLine.jsx'
import SpeakingRecorder from './SpeakingRecorder.jsx'

// Один сценарий: видео → что происходит → сцена → задание → запись → разбор
// материала. Порядок — из прототипа; методист его уже согласовал, и менять
// его ради порта незачем.
//
// Блоки у уровней разные (A1 — диалог и вопросы, A2+ — сцена с ролями и
// «миссией», B2/C1 добавляют критическое мышление, ролевую смену и
// follow-up). Экран не спрашивает уровень: рисует то, что пришло в данных, —
// разложить пять форм по одной его работа экстрактора.

function Block({ name, items }) {
  const { t } = useI18n()
  if (!items?.length) return null
  return (
    <section className="sit-block">
      <h3 className="sit-block__head">{t(`situations.block.${name}`)}</h3>
      <ol className="sit-block__list">
        {items.map((item, i) => (
          <li key={i}>
            <MultiLine data={item} prefix={`${i + 1}.`} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function Scene({ scene }) {
  const { t } = useI18n()
  if (!scene?.lines?.length) return null
  return (
    <section className="sit-block">
      <h3 className="sit-block__head">
        {t(scene.kind === 'dialogue' ? 'situations.block.dialogue' : 'situations.block.scene')}
      </h3>
      <div className="sit-scene">
        {scene.lines.map((line, i) => {
          if (line.who === 'scene') {
            return (
              <div className="sit-beat sit-beat--scene" key={i}>
                <span className="sit-beat__tag">{t('situations.scene.tag')}</span>
                <MultiLine data={line} />
              </div>
            )
          }
          if (line.who === 'you') {
            return (
              <div className="sit-beat sit-beat--you" key={i}>
                <span className="sit-beat__tag">{t('situations.scene.yourTurn')}</span>
                <MultiLine data={line} />
              </div>
            )
          }
          return (
            <div className={`sit-beat sit-beat--them${line.side === 1 ? ' is-alt' : ''}`} key={i}>
              {line.label && <span className="sit-beat__who">{line.label}</span>}
              <MultiLine data={line} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function SituationView({ level, item, token, done, onBack, onDone }) {
  const { t } = useI18n()

  return (
    <article className="sit-view">
      <div className="sit-top">
        <button type="button" className="sit-back" onClick={onBack}>
          ← {t('situations.toCatalog')}
        </button>
        <span className="sit-level">
          {level.toUpperCase()} · {item.id}/10
        </span>
      </div>

      <header className="sit-view__head">
        <MultiLine data={item.title} main className="sit-view__title" />
        {done && <span className="sit-view__flag">{t('situations.done')}</span>}
      </header>

      {item.intro && (
        <div className="sit-view__intro">
          <span className="sit-view__youtag">{t('situations.youAreHere')}</span>
          <MultiLine data={item.intro} />
        </div>
      )}

      <div className="sit-video">
        {/* Постер отдаётся сразу, сам mp4 — только по действию студента:
            preload="metadata" вместо auto, иначе каталог из десяти сценариев
            тянул бы десятки мегабайт при первом же заходе. */}
        <video controls playsInline preload="metadata" poster={item.poster}>
          <source src={item.video} type="video/mp4" />
        </video>
        {item.hasAudio === false && <p className="sit-video__note">{t('situations.noAudio')}</p>}
      </div>

      <Scene scene={item.scene} />
      <Block name="mission" items={item.mission} />
      <Block name="questions" items={item.questions} />
      <Block name="react" items={item.react} />

      <div className="sit-task">
        <div className="sit-task__label">{t('situations.yourTask')}</div>
        <MultiLine data={item.task} />
      </div>

      <SpeakingRecorder
        level={level}
        situation={item.id}
        task={item.task?.en || ''}
        token={token}
        onRecorded={onDone}
      />

      <Block name="vocab" items={item.vocab} />
      <Block name="phrases" items={item.phrases} />
      <Block name="linkers" items={item.linkers} />
      <Block name="critical" items={item.critical} />
      <Block name="roleplay" items={item.roleplay} />
      <Block name="followup" items={item.followup} />
    </article>
  )
}
