import { useEffect } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { withProfileGoal } from '../placement/reportModel.js'
import { PlacementNext, PlacementResults, usePlacementReport } from './home/PlacementReport.jsx'

/**
 * «Результаты теста» — полный отчёт теста уровня v16 своей страницей (ТЗ v2.0 «Луна-трекер», 5.5 и 5.7): уровень и
 * навыки, отзыв о говорении, цель, на что сделать упор и задания для тебя. С «Главной» он ушёл — там было десять блоков
 * и четыре источника советов, — и открывается ссылкой «Результаты теста →» из «Сильных и слабых сторон».
 *
 * «Пройти тест заново» — здесь, в шапке «Что делать дальше» (обратная связь 11.11, решение владельца: из Профиля
 * пересдачу не находили). Тест открывается с первого экрана, а не на прошлом итоге (onRetake → freshAttempt.js).
 * Теста ещё нет — вместо неё кнопка теста. Цель — та же, что на баннере (профиль GE), а не предложенная тестом в
 * день прохождения.
 */
export default function PlacementResultsPage({ token, userName, userLevel, geTarget = null, placementVersion = 0, onNav, onProfile, onStartTest, onRetake }) {
  const { t } = useI18n()
  const placement = usePlacementReport(token, placementVersion)
  const report = geTarget ? { ...placement, view: withProfileGoal(placement.view, geTarget) } : placement
  const missing = placement.loaded && !placement.view
  // Ссылка стоит внизу «Главной», и страница открывалась бы на её прокрутке. «Назад» на этот экран прокрутку вернёт
  // сам (restoreScroll в App докручивает по кадрам позже).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="home" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="hm hm--v2 pl-page-results">
        <header className="pl-results__head">
          <button type="button" className="pl-results__back" onClick={() => onNav?.('home')}>
            {t('placement.page.back')}
          </button>
          <h1 className="hm-top__title">{t('placement.page.title')}</h1>
        </header>
        <PlacementResults report={report} onRetake={missing ? onStartTest : onRetake} token={token} collapsible={false} />
        <PlacementNext report={report} onNav={onNav} onRetake={onRetake} />
      </div>
    </LearningLayout>
  )
}
