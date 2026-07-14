import '../styles.css'
import '../tutor.css'
import Providers from './providers.jsx'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Тьютор-раздел использует PT Root UI (как в макете Figma) */}
        <link href="https://fonts.cdnfonts.com/css/pt-root-ui" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
