import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { speak } from '../../../practice/vocab/audio.js'
import { inlineBold } from '../inlineBold.jsx'

/**
 * Колода карточек словаря из урока каталога (`block.type === 'vocab'`).
 *
 * Экстрактор отдаёт слова отдельным блоком, а не HTML: оборот с переводом
 * должен открываться кликом. LessonContent раньше не знал этот тип и молча
 * выкидывал блок — у преподавателя карточки были, у ученика оставались
 * только инструкция «нажми карточку» и matching.
 *
 * `revealed` — карточки, которые открыл преподаватель. Он нажимает карточку,
 * чтобы показать классу перевод; ключ — само слово (у преподавателя свой порядок).
 *
 * Некоторые B2-колоды положили колонки DICT в VOCAB: IPA под RU, английский
 * gloss под KZ. `sanitizeVocabCard` это чинит на отображении до переимпорта.
 */
function looksLikeIpa(value) {
  const t = String(value ?? '').trim()
  if (!t) return false
  return /[ˈˌɪʊəɔʌæθðŋʃʒː]/.test(t) || /^\/[^/]+\/$/.test(t)
}

function looksLikeEnglishGloss(value) {
  const t = String(value ?? '').trim()
  if (!t || /[а-яёәіңғүұқөһ]/i.test(t)) return false
  return /^[a-z][a-z\s,',.\-]{6,}$/i.test(t)
}

function looksLikeCyrillicTranslation(value) {
  return /[а-яёәіңғүұқөһ]/i.test(String(value ?? ''))
}

/** Repair mis-mapped KZ/RU so IPA shows as IPA and English gloss as definition. */
function sanitizeVocabCard(card) {
  let definition = card.definition
  let kz = card.translationKz
  let ru = card.translationRu
  let ipa = card.ipa

  if (looksLikeIpa(ru) || looksLikeEnglishGloss(kz)) {
    if (looksLikeIpa(ru)) {
      if (!ipa) ipa = String(ru).replace(/^\/|\/$/g, '')
      ru = ''
    } else if (ru && !looksLikeCyrillicTranslation(ru)) {
      ru = ''
    }
    if (looksLikeEnglishGloss(kz)) {
      if (!definition) definition = kz
      kz = ''
    }
  }

  return { ...card, definition, translationKz: kz, translationRu: ru, ipa }
}

export default function VocabBlock({ block, revealed }) {
  const { t } = useI18n()
  const cards = Array.isArray(block?.cards)
    ? block.cards.filter((card) => card?.word).map(sanitizeVocabCard)
    : []
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
          const isFlipped = flipped.has(key) || !!revealed?.has(String(card.word))
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
              >
                <div className="lw-vcard__inner">
                  <div className="lw-vcard__face lw-vcard__front">
                    {hasImg && (
                      <img
                        src={card.imageUrl}
                        alt=""
                        onError={() => setImgFailed((prev) => new Set(prev).add(key))}
                      />
                    )}
                    <div className="lw-vcard__word">{card.word}</div>
                    {card.pos && <div className="lw-vcard__pos">{card.pos}</div>}
                  </div>
                  <div className="lw-vcard__face lw-vcard__back">
                    <div className="lw-vcard__bhead">
                      <div className="lw-vcard__word">{card.word}</div>
                      {card.pos && <div className="lw-vcard__pos">{card.pos}</div>}
                      {card.ipa && <div className="lw-vcard__ipa">/{card.ipa}/</div>}
                    </div>
                    <div className="lw-vcard__bbody">
                      {card.definition && (
                        <div className="lw-vcard__def">{inlineBold(card.definition)}</div>
                      )}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
