import '../styles.css'
import '../tutor.css'
import '../ielts.css'
import '../grammar.css'
import Providers from './providers.jsx'

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
    <html lang="ru">
      <head>
        {/* Ранний preconnect к JTS-бэкенду срезает DNS+TLS перед первым fetch.
            Два линка не случайно: CORS-запросы (fetch с Authorization) и
            no-CORS (<img> обложек) используют разные соединения. */}
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="" />
        <link rel="preconnect" href={API_ORIGIN} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
