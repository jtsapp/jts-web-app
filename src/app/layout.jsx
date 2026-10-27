import '../styles.css'
import '../tutor.css'
import '../ielts.css'
import '../sat.css'
import '../grammar.css'
import '../vocab.css'
import '../vocab-catalog.css'
import '../listening.css'
import '../shadowing.css'
import '../writing.css'
import '../workbook.css'
import '../reading.css'
import '../situations.css'
import '../speakspin.css'
import '../numbers.css'
import '../listen.css'
import '../words.css'
import '../verbs.css'
import '../listenchoose.css'
import '../arcade.css'
import '../karaoke.css'
import '../lessonWorkspace.css'
import '../courseCatalog.css'
import '../course.css'
import '../trial.css'
import '../feedback.css'
import '../demo.css'
import '../services.css'
import '../placement.css'
import '../matching.css'
import '../assistant.css'
// Вход и регистрация (макет «Регистрация», 21.10.2026)
import '../auth.css'
// Мобильный слой по макету «Web Адаптивка» — строго после всех файлов разделов
import '../mobile/base.css'
import '../mobile/registration.css'
import '../mobile/profile.css'
import '../mobile/lessons.css'
import '../mobile/tutor.css'
import '../mobile/learning.css'
import '../mobile/practice.css'
import '../mobile/practice-grammar.css'
import '../mobile/homework.css'
import '../mobile/home.css'
import '../mobile/nav.css'
// Казахский интерфейс — на Inter: перекрывает шрифты разделов и мобильного слоя
import '../kk-font.css'
// Набросок тёмной темы — последним: перекрывает всё выше под html[data-theme=dark]
import '../theme-dark.generated.css'
import '../theme-dark.css'
import Providers from './providers.jsx'
import { THEME_BOOT } from '../lib/theme.js'
import { UI_LANG_BOOT } from '../lib/uiLang.js'

// Тот же дефолт, что в src/api.js (BASE) — держать в синхроне.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://dev-server.justtostudy.kz'

export const metadata = {
  title: 'Just to Study — Обучайся английскому с личным тьютором',
  icons: { icon: '/assets/dexter.png' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* До гидратации: иначе тёмная тема мигает белым при каждой загрузке. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Тоже до гидратации: казахский интерфейс иначе мигал бы Manrope. */}
        <script dangerouslySetInnerHTML={{ __html: UI_LANG_BOOT }} />
        {/* Ранний preconnect к JTS-бэкенду срезает DNS+TLS перед первым fetch.
            Два линка не случайно: CORS-запросы (fetch с Authorization) и
            no-CORS (<img> обложек) используют разные соединения. */}
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="" />
        <link rel="preconnect" href={API_ORIGIN} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
