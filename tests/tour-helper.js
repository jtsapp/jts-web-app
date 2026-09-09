// Онбординг-тур «Практики» и «Обучения» выходит сам при первом заходе и
// перехватывает клики (модалка поверх экрана) — тесты про другое до своих
// элементов не доходят. Гасим его отметкой в localStorage ДО загрузки
// приложения; device-id фиксируем тем же скриптом, иначе ключ отметки
// случайный на каждый прогон (см. tourKeyFor в OnboardingTour.jsx).
//
// Сам тур проверяется отдельно — tests/practice-learning-tour.spec.js.
export async function noTours(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_device_id', 'e2e-device')
    for (const scope of ['dash', 'learn', 'practice']) {
      localStorage.setItem(`jts_tour_${scope}:e2e-device`, '1')
    }
  })
}
