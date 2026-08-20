import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { speak } from '../../../practice/vocab/audio.js'

/**
 * Колода карточек словаря из урока каталога (`block.type === 'vocab'`).
 *
 * Экстрактор отдаёт слова отдельным блоком, а не HTML: оборот с переводом
 * должен открываться кликом. LessonContent раньше не знал этот тип и молча
 * выкидывал блок — у преподавателя карточки были, у ученика оставались
 * только инструкция «нажми карточку» и matching.
 */
export default function VocabBlock({ block }) {
  const { t } = useI18n()
  const cards = Array.isArray(block?.cards) ? block.cards.filter((card) => card?.word) : []
  const [flipped, setFlipped] = useState(() => new Set())
  // Картинка есть в данных, но файл не грузится (битая ссылка, 404) — так же
  // считаем карточку безкартиночной: иначе .lw-vcard остаётся на 3:4 (место
  // под картинку, которая не показалась), и лицо карточки — слово в углу
  // пустой плашки, то же самое, что и без imageUrl вовсе.
  const [imgFailed, setImgFailed] = useState(() => new Set())

  if (!cards.length && !block?.title) return null

  const toggle = (key) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="lw-card lw-vocab">
      {block?.title && <h3 className="lw-vocab__title">{block.title}</h3>}
      <p className="lw-vocab__hint">{t('lesson.ws.vocabHint')}</p>
      <div className="lw-vocab__grid">
        {cards.map((card, i) => {
          const key = `${card.word}-${i}`
          const isFlipped = flipped.has(key)
          const hasImg = !!card.imageUrl && !imgFailed.has(key)
          return (
            // Кнопка озвучки — сосед lw-vcard, не потомок: сама карточка уже
            // кнопка (клик — переворот), а вложенные <button> — невалидный
            // HTML и ломают переворот (браузер закрывает внешний тег раньше).
            <div key={key} className="lw-vcard-wrap">
              <button
                type="button"
                className={`lw-vcard${isFlipped ? ' is-flipped' : ''}${hasImg ? '' : ' is-noimg'}`}
                onClick={() => toggle(key)}
                aria-pressed={isFlipped}
                // Слово ушло из лицевой стороны под карточку, а обратная сторона
                // из дерева доступности не исчезает (backface-visibility прячет
                // только от глаз) — без явной подписи кнопка называлась бы всем
                // текстом оборота: слово, транскрипция, определение, переводы.
                aria-label={card.word}
              >
                <div className="lw-vcard__inner">
                  {/* Лицевая сторона — только картинка: слово в макете стоит
                      подписью под карточкой (.lw-vcard__caption ниже). */}
                  <div className="lw-vcard__face lw-vcard__front">
                    {hasImg && (
                      <img
                        src={card.imageUrl}
                        alt=""
                        onError={() => setImgFailed((prev) => new Set(prev).add(key))}
                      />
                    )}
                  </div>
                  <div className="lw-vcard__face lw-vcard__back">
                    <div className="lw-vcard__bhead">
                      <div className="lw-vcard__word">{card.word}</div>
                      {card.pos && <div className="lw-vcard__pos">{card.pos}</div>}
                      {card.ipa && <div className="lw-vcard__ipa">/{card.ipa}/</div>}
                    </div>
                    <div className="lw-vcard__bbody">
                      {card.definition && <div className="lw-vcard__def">{card.definition}</div>}
                      {(card.translationKz || card.translationRu) && (
                        <div className="lw-vcard__trs">
                          {card.translationKz && (
                            <div className="lw-vcard__tr">
                              <b>KZ</b>
                              <span>{card.translationKz}</span>
                            </div>
                          )}
                          {card.translationRu && (
                            <div className="lw-vcard__tr">
                              <b>RU</b>
                              <span>{card.translationRu}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="lw-vcard__speak"
                onClick={() => speak(card.word)}
                aria-label={t('lesson.play')}
              >
                🔊
              </button>
              {/* Подпись вне кнопки переворота: в макете она под карточкой и
                  не уезжает вместе с ней на оборот. */}
              <div className="lw-vcard__caption">
                {card.word}
                {card.pos && <span className="lw-vcard__pos">{card.pos}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
