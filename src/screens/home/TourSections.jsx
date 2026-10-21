import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SatIcon } from '../../components/icons.jsx'

// Последняя подсказка тура «Главной» (макет «Первый заход», «подсказка 3 из 3»):
// разделы меню с одной строкой о каждом. Список — не свой, а тот, что сейчас в
// сайдбаре (data-nav у пунктов): у аккаунта IELTS, демо и тьютор-онли разделы
// разные, и тур не должен рассказывать про пункт, которого у ученика нет.
// Иконки — экспорт макета (Material Symbols); у SAT в макете строки нет, его
// иконка — та же, что в меню.
const ICONS = {
  learning: '/assets/first-login/map.svg',
  practice: '/assets/first-login/auto_stories.svg',
  tutor: '/assets/first-login/auto_awesome.svg',
  lessons: '/assets/first-login/videocam.svg',
  homework: '/assets/first-login/assignment.svg',
  ielts: '/assets/first-login/school.svg',
  vocab: '/assets/first-login/menu_book.svg',
}
const FALLBACK = ['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab']

export default function TourSections() {
  const { t } = useI18n()
  const [keys, setKeys] = useState(null)

  // Из DOM — эффектом: сайдбар рядом, но в своей ветке дерева, и его список
  // известен только ему (аккаунт IELTS он узнаёт у бэкенда сам).
  useEffect(() => {
    const found = [...document.querySelectorAll('.sb__nav [data-nav]')]
      .map((el) => el.getAttribute('data-nav'))
      .filter((k) => k && k !== 'home')
    setKeys(found.length ? found : FALLBACK)
  }, [])

  if (!keys) return null
  return (
    <ul className="hm-tour-sections">
      {keys.map((key) => (
        <li className="hm-tour-sections__item" key={key}>
          <span className="hm-tour-sections__plate" aria-hidden="true">
            {ICONS[key] ? <img src={ICONS[key]} alt="" width="24" height="24" /> : <SatIcon size={24} />}
          </span>
          <span className="hm-tour-sections__text">
            <b>{t(`nav.${key}`)}</b>
            <span>{t(`tour.sections.${key}`)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
