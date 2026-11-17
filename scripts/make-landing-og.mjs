// Картинки превью ссылки лендинга (Open Graph, 1200×630): public/landing/og.png и og-kz.png.
// Собирает их из логотипа и фото героя лендинга; запуск из корня: node scripts/make-landing-og.mjs
// Текст — заголовок лендинга (src/landing/content.js / content-kz.js); поменялся заголовок — перезапустить.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const W = 1200, H = 630
const logo = readFileSync('public/landing/icons/logo.svg', 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const variants = {
  ru: { lines: ['Индивидуальные', 'уроки английского'], accent: 'по цене групповых', sub: 'Преподаватели IELTS 7.0+ · AI 24/7', out: 'public/landing/og.png' },
  kz: { lines: ['Ағылшын тілінен', 'жеке сабақтар'], accent: 'топтық бағамен', sub: 'IELTS 7.0+ мұғалімдер · AI 24/7', out: 'public/landing/og-kz.png' },
}

for (const v of Object.values(variants)) {
  const font = "font-family=\"Onest, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif\""
  const text = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#efe7ff"/>
    <circle cx="1010" cy="330" r="330" fill="#9047ff" opacity="0.18"/>
    <g transform="translate(64,64) scale(1.6)">${logo.replace(/<\/?svg[^>]*>/g, '')}</g>
    <text x="64" y="236" ${font} font-size="54" font-weight="800" fill="#0f1222">${esc(v.lines[0])}</text>
    <text x="64" y="302" ${font} font-size="54" font-weight="800" fill="#0f1222">${esc(v.lines[1])}</text>
    <text x="64" y="368" ${font} font-size="54" font-weight="800" fill="#8a3ffc">${esc(v.accent)}</text>
    <text x="64" y="440" ${font} font-size="28" font-weight="500" fill="#3a3d52">${esc(v.sub)}</text>
    <rect x="64" y="520" width="384" height="56" rx="28" fill="#9047ff"/>
    <text x="256" y="557" ${font} font-size="26" font-weight="700" fill="#fff" text-anchor="middle">justtostudy-english.kz</text>
  </svg>`
  const photo = await sharp('public/landing/img/hero-photo.webp').resize({ height: 500 }).toBuffer()
  const meta = await sharp(photo).metadata()
  await sharp(Buffer.from(text))
    .composite([{ input: photo, left: W - meta.width + 70, top: H - 500 + 20 }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(v.out)
  console.log(v.out, meta.width)
}
