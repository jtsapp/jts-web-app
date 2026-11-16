import '../../hiring/hiring.css'

// Сайт онлайн-отбора преподавателей (ТЗ 08.11, ПЗ 13.11): отдельные страницы без сайдбара и входа приложения,
// как пробный урок. Стили — только внутри .hr-site (src/hiring/hiring.css). Заголовки — Montserrat по макету.
export const metadata = {
  title: 'Отбор преподавателей — Just To Study',
  description: 'Онлайн-отбор преподавателей английского Just To Study: анкета, тест, интервью и условия работы.',
}

export default function HiringLayout({ children }) {
  return (
    <div className="hr-site">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap" precedence="default" />
      {children}
    </div>
  )
}
