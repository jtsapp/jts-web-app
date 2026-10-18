'use client'

// Базовый Meta Pixel лендинга: PageView на загрузке. Лендинг — одна страница, а смена языка (?lang=kz) —
// обычный переход с перезагрузкой, поэтому отдельного PageView на смену роутера не нужно.
// Монтируется только на домене лендинга: см. src/app/landing/page.jsx.
import Script from 'next/script'
import { pixelBootstrap, pixelNoscriptSrc } from './metaPixel.js'

export default function MetaPixel({ pixelId }) {
  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{pixelBootstrap(pixelId)}</Script>
      <noscript>
        <img height="1" width="1" style={{ display: 'none' }} alt="" src={pixelNoscriptSrc(pixelId)} />
      </noscript>
    </>
  )
}
