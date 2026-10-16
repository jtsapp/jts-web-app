import { test, expect } from '@playwright/test'

// Звонок Луне в окне помощника: кнопка-трубка, полоса звонка вместо поля ввода,
// «Завершить» возвращает чат. Сам разговор (агент LiveKit) здесь не проверить —
// он в юнит-тесте AssistantWidget.call.test.jsx; тут — что окно в настоящем
// браузере доходит до соединения и кладёт трубку. Веб-сокет LiveKit «висит»
// (routeWebSocket без ответа), поэтому звонок стоит на «Соединяю…».
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['microphone'],
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.SHOT_DIR

test('звонок: трубка в шапке → полоса звонка → «Завершить» → снова чат', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('jts_assistant_voice_muted', '1')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  await page.route('**/api/assistant/chat', (r) =>
    r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Вы на Главной. Начните с домашки.' }),
  )
  const calls = []
  await page.route('**/api/assistant/call', async (r) => {
    calls.push(r.request().headers().authorization)
    await r.fulfill(json({ configured: true, token: 'lk-token', url: 'wss://lk.example.test', room: 'jts-luna-e2e-1760600000000', identity: 's', ttl: 900, limitSec: 900 }))
  })
  await page.route('**/api/livekit/session', (r) => r.fulfill(json({ ok: true })))
  await page.routeWebSocket(/lk\.example\.test/, () => {})
  await page.route(/lk\.example\.test/, (r) => r.abort())

  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toContainText('Начните с домашки')

  await dialog.getByRole('button', { name: 'Позвонить Луне' }).click()
  const bar = dialog.getByRole('group', { name: 'Звонок Луне' })
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('Соединяю')
  await expect.poll(() => calls).toEqual(['Bearer test-token'])
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  await expect(dialog).toContainText('На звонке')
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/call-${info.project.name}.png` })

  // Окно закрыли посреди звонка — звонок идёт, кнопка Луны в зелёном кольце.
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(page.getByRole('button', { name: 'Помощник' })).toHaveClass(/is-call/)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/call-closed-${info.project.name}.png` })
  await page.getByRole('button', { name: 'Помощник' }).click()

  await dialog.getByRole('button', { name: 'Завершить звонок' }).click()
  await expect(dialog.getByRole('textbox')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Позвонить Луне' })).toBeVisible()
})
