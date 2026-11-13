import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { openSection } from './helpers/nav.js'
import { JPX_PLATE_RGB, PLATE_JP2, pdfWithJpxImage } from '../src/screens/live/pdf/__fixtures__/jpxPdf.js'
import { LEGAL_VERSION } from '../src/lib/legalDocuments.js'

// Регрессия 12.11.2026: учебник «Skillful 4» в живом уроке у ученика — все страницы
// пустые. Картинки в нём JPEG 2000, их pdf.js декодирует своим OpenJPEG на wasm и
// догружает его по wasmUrl, а загрузчик pdf.js этих адресов не давал
// («JpxError: OpenJPEG failed to initialize»). Здесь — настоящий Chrome, настоящий
// pdf.js с воркером из сборки и ресурсы, которые раздаёт само приложение (/pdfjs/…).
//
// Страница PDF — 300 × 400 pt, плашка картинки ровно посередине, поэтому смотрим
// центр холста, каким бы ни был масштаб.

test.use({ channel: 'chrome' })

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 116 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

const PDF_URL = 'https://files-dev.justtostudy.kz/materials/skillful-4.pdf'

// Время урока — от «сейчас»: урок, чей конец больше трёх часов назад, считается забытым (liveNow.js).
const at = (minutes) => {
  const d = new Date(Date.now() + minutes * 60000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const OCC = [
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: at(-10), durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
]

const SECTIONS = [
  { id: 1, title: 'Раздел 1', position: 0, materials: [{ id: 5, materialId: 5, title: 'Skillful 4', materialType: 'PDF', fileUrl: PDF_URL }] },
]

test('учебник с картинками JPEG 2000 рисуется у ученика, а не выходит пустым', async ({ page }) => {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt('STUDENT'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  // Документы платформы уже приняты — иначе вместо кабинета экран согласия.
  await page.route('**/user/legal-documents**', (r) => r.fulfill(json({ version: LEGAL_VERSION, acceptedAt: '2026-10-29T10:00:00Z' })))
  // Тариф не известен — меню показывает все разделы, «Уроки» в том числе.
  await page.route('**/cabinet/my-sections', (r) => r.fulfill(json({ known: false, allowed: [] })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 })))
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json(SECTIONS)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', participants: [] })))
  await page.route('**/mobile/course-catalog', (r) => r.fulfill(json([])))
  await page.route('**/student/lessons/14/materials/5/progress', (r) =>
    r.request().method() === 'GET' ? r.fulfill(json({ eventsJson: null })) : r.fulfill(json({})))
  await page.route(PDF_URL, (r) => r.fulfill({
    status: 200,
    contentType: 'application/pdf',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: Buffer.from(pdfWithJpxImage(new Uint8Array(fs.readFileSync(path.resolve(process.cwd(), PLATE_JP2))))),
  }))

  await page.goto('/')
  await openSection(page, 'Уроки')
  await page.getByRole('button', { name: /Присоединиться к уроку|Войти в класс/ }).filter({ visible: true }).first().click()
  await expect(page.locator('.pdfv__count')).toHaveText('1 / 1', { timeout: 15_000 })

  // Пустая страница — белый центр холста; нарисованная — цвет плашки (JPEG 2000 с потерями, поэтому с допуском).
  const centre = () => page.locator('.pdfv__page canvas').first().evaluate((canvas) => {
    if (!canvas.width) return null
    return Array.from(canvas.getContext('2d').getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data)
  })
  const isPlate = (pixel) => !!pixel && pixel[3] === 255 && JPX_PLATE_RGB.every((channel, i) => Math.abs(pixel[i] - channel) < 20)
  await expect.poll(async () => isPlate(await centre()), {
    message: 'центр страницы не цвета плашки — картинку JPEG 2000 pdf.js не нарисовал',
    timeout: 15_000,
  }).toBe(true)
})
