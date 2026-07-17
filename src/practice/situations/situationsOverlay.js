// Нативная интеграция «Speaking Practice A1–C1» (бывший standalone
// «ситуаций.html») в приложение: полноэкранный оверлей поверх Практики.
//
// Архитектура повторяет оригинал: оболочка с табами уровней + по одному
// iframe на уровень. В оригинале уровневые страницы лежали внутри HTML как
// text/plain-блоки с base64-видео (62 МБ) и грузились через srcdoc; здесь
// они извлечены скриптом scripts/extract-situations.js в лёгкие статические
// страницы public/practice/situations/<level>.html, а видео/постеры — в
// отдельные файлы media/. Оболочка портирована нативно (этот модуль), iframe
// подгружается лениво при первом открытии уровня.
//
// CSS оболочки заскоуплен под #sitworld, поэтому вставляется один раз и не
// подкрашивает остальное приложение.
import { SITUATION_LEVELS } from './levels.js'

const ACCENTS = {
  a1: '#0AC7FF',
  a2: '#00D441',
  b1: '#FF631E',
  b2: '#A57BFA',
  c1: '#6A35E0',
}

// CSS оболочки из ситуаций.html, вручную заскоупленный под #sitworld
// (body-правила перенесены на сам контейнер, generic-селекторы получили префикс).
const CSS = `
#sitworld{
  --purple:#874BF8;--purple-deep:#6A35E0;--purple-soft:#A57BFA;
  --cyan:#0AC7FF;--cyan-deep:#0AAFFF;--orange:#FF631E;--green:#00D441;
  --ink:#16131F;--bg:#F3F1FB;--bg-2:#ECE8FA;--card:#FFFFFF;--line:#ECE7F8;
  --g1:#4E4B4B;--g2:#898787;
  --pill:999px;
  --display:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  --body:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,system-ui,sans-serif;
  position:fixed;inset:0;z-index:2147482000;
  margin:0;font-family:var(--body);color:var(--ink);background:var(--bg);
  -webkit-font-smoothing:antialiased;display:flex;flex-direction:column;overflow:hidden;
}
#sitworld *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
#sitworld .sw-wordmark{font-family:var(--display);margin:0;line-height:1.08;}
#sitworld button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;}
#sitworld :focus-visible{outline:3px solid var(--cyan);outline-offset:2px;border-radius:10px;}

#sitworld .sw-appbar{
  flex:none;position:relative;z-index:5;
  background:linear-gradient(135deg,var(--purple) 0%,var(--purple-deep) 72%,#5a2fce 100%);
  color:#fff;box-shadow:0 10px 30px -18px rgba(78,40,160,.85);
}
#sitworld .sw-appbar-row{
  max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:14px;
  justify-content:space-between;flex-wrap:wrap;padding:12px 18px 10px;
}
#sitworld .sw-brand{display:flex;align-items:center;gap:11px;min-width:0;}
#sitworld .sw-logo{
  width:38px;height:38px;flex:none;border-radius:13px 13px 13px 5px;
  background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);
  display:grid;place-items:center;
}
#sitworld .sw-logo svg{width:20px;height:20px;}
#sitworld .sw-brand-text{display:flex;flex-direction:column;line-height:1;min-width:0;}
#sitworld .sw-wordmark{font-weight:900;font-size:21px;letter-spacing:-.6px;color:#fff;display:inline-flex;align-items:baseline;}
#sitworld .sw-wordmark .to{color:var(--cyan);}
#sitworld .sw-slogan{font-size:11.5px;font-weight:700;opacity:.9;margin-top:3px;letter-spacing:.2px;}
#sitworld .sw-right{display:flex;align-items:center;gap:10px;}
#sitworld .sw-pill{
  display:inline-flex;align-items:center;gap:7px;font-family:var(--display);
  font-weight:800;font-size:11.5px;color:#fff;background:rgba(255,255,255,.15);
  border:1px solid rgba(255,255,255,.25);padding:6px 12px;border-radius:var(--pill);
}
#sitworld .sw-pill .d{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(0,212,65,.3);}
#sitworld .sw-close{
  display:inline-flex;align-items:center;gap:7px;font-family:var(--display);
  font-weight:800;font-size:12.5px;color:#fff;background:rgba(255,255,255,.15);
  border:1px solid rgba(255,255,255,.25);padding:8px 14px;border-radius:var(--pill);
  transition:background .2s;
}
#sitworld .sw-close:hover{background:rgba(255,255,255,.28);}

#sitworld .sw-levelbar{background:rgba(255,255,255,.07);border-top:1px solid rgba(255,255,255,.12);}
#sitworld .sw-levelbar-row{
  max-width:1100px;margin:0 auto;display:flex;gap:9px;padding:11px 18px;
  overflow-x:auto;scrollbar-width:none;
}
#sitworld .sw-levelbar-row::-webkit-scrollbar{display:none;}
#sitworld .sw-lvl{
  flex:0 0 auto;display:flex;align-items:center;gap:9px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);
  color:#fff;padding:9px 16px;border-radius:var(--pill);
  transition:transform .18s cubic-bezier(.2,1,.3,1),background .2s,box-shadow .2s;
}
#sitworld .sw-lvl:hover{transform:translateY(-1px);background:rgba(255,255,255,.2);}
#sitworld .sw-lvl .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px rgba(255,255,255,.18);flex:none;}
#sitworld .sw-lvl-code{font-family:var(--display);font-weight:900;font-size:15px;letter-spacing:-.3px;}
#sitworld .sw-lvl-desc{font-family:var(--display);font-weight:700;font-size:11.5px;opacity:.82;white-space:nowrap;}
#sitworld .sw-lvl.is-active{
  background:#fff;color:var(--purple-deep);border-color:#fff;
  box-shadow:0 12px 26px -14px rgba(0,0,0,.5);
}
#sitworld .sw-lvl.is-active .dot{box-shadow:0 0 0 3px rgba(135,75,248,.18);}
#sitworld .sw-lvl.is-active .sw-lvl-desc{opacity:.62;}

#sitworld .sw-stage{flex:1 1 auto;position:relative;background:var(--bg);min-height:0;}
#sitworld .sw-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--bg);}
#sitworld .sw-frame[hidden]{display:none;}

#sitworld .sw-veil{
  position:absolute;inset:0;display:none;place-items:center;z-index:3;background:var(--bg);
}
#sitworld .sw-veil.show{display:grid;}
#sitworld .sw-veil .box{display:flex;flex-direction:column;align-items:center;gap:16px;}
#sitworld .sw-spinner{
  width:46px;height:46px;border-radius:50%;
  border:5px solid var(--bg-2);border-top-color:var(--purple);
  animation:sw-spin .8s linear infinite;
}
@keyframes sw-spin{to{transform:rotate(360deg);}}
#sitworld .sw-veil .lbl{font-family:var(--display);font-weight:800;font-size:14px;color:var(--g1);}
#sitworld .sw-veil .lbl b{color:var(--purple);}

@media (max-width:560px){
  #sitworld .sw-slogan{display:none;}
  #sitworld .sw-pill{display:none;}
  #sitworld .sw-lvl-desc{display:none;}
  #sitworld .sw-lvl{padding:9px 15px;}
}
@media (prefers-reduced-motion:reduce){
  #sitworld .sw-lvl,#sitworld .sw-spinner{transition:none;animation:none;}
}
`

const LOGO_SVG =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="#fff"/><circle cx="8" cy="11" r="1.4" fill="#874BF8"/><circle cx="12" cy="11" r="1.4" fill="#0AC7FF"/><circle cx="16" cy="11" r="1.4" fill="#FF631E"/></svg>'

let host = null
let current = null
let onExitCb = null

function ensureFont() {
  if (document.querySelector('link[data-sitworld-font]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'
  link.setAttribute('data-sitworld-font', '')
  document.head.appendChild(link)
}

function pauseMedia(frame) {
  // same-origin, поэтому можем поставить медиа скрытого уровня на паузу
  try {
    frame?.contentDocument?.querySelectorAll('video,audio').forEach((m) => {
      try {
        m.pause()
      } catch {}
    })
  } catch {}
}

function frameFor(code) {
  return host.querySelector(`.sw-frame[data-level="${code}"]`)
}

function activate(code) {
  const meta = SITUATION_LEVELS.find((l) => l.code === code) || SITUATION_LEVELS[0]
  code = meta.code
  if (current && current !== code) pauseMedia(frameFor(current))
  host.querySelectorAll('.sw-lvl').forEach((t) => {
    const on = t.dataset.level === code
    t.classList.toggle('is-active', on)
    t.setAttribute('aria-selected', on ? 'true' : 'false')
  })
  host.querySelectorAll('.sw-frame').forEach((f) => {
    f.hidden = f.dataset.level !== code
  })
  host.querySelector('.sw-pill span:last-child').textContent = `${meta.desc} · ${meta.label}`
  current = code
  const frame = frameFor(code)
  if (!frame.src) {
    const veil = host.querySelector('.sw-veil')
    host.querySelector('.sw-veil b').textContent = meta.label
    veil.classList.add('show')
    frame.addEventListener('load', () => veil.classList.remove('show'), { once: true })
    frame.src = `/practice/situations/${code}.html`
  }
}

function close() {
  SITUATION_LEVELS.forEach((l) => pauseMedia(frameFor(l.code)))
  host.style.display = 'none'
  const cb = onExitCb
  onExitCb = null
  if (cb) cb()
}

function ensureHost() {
  if (host) return
  const style = document.createElement('style')
  style.setAttribute('data-sitworld', '')
  style.textContent = CSS
  document.head.appendChild(style)

  host = document.createElement('div')
  host.id = 'sitworld'
  host.innerHTML = `
  <header class="sw-appbar">
    <div class="sw-appbar-row">
      <div class="sw-brand">
        <span class="sw-logo" aria-hidden="true">${LOGO_SVG}</span>
        <div class="sw-brand-text">
          <span class="sw-wordmark">Just&nbsp;<span class="to">To</span>&nbsp;Study<span class="reg"></span></span>
          <span class="sw-slogan">Speaking practice · A1 → C1</span>
        </div>
      </div>
      <div class="sw-right">
        <span class="sw-pill"><span class="d"></span><span></span></span>
        <button type="button" class="sw-close" aria-label="Закрыть">✕ Выйти</button>
      </div>
    </div>
    <nav class="sw-levelbar" aria-label="Proficiency level">
      <div class="sw-levelbar-row" role="tablist">
        ${SITUATION_LEVELS.map(
          (l) =>
            `<button type="button" class="sw-lvl" role="tab" aria-selected="false" data-level="${l.code}" style="--accent:${ACCENTS[l.code] || '#874BF8'}"><span class="dot"></span><span class="sw-lvl-code">${l.label}</span><span class="sw-lvl-desc">${l.desc}</span></button>`
        ).join('')}
      </div>
    </nav>
  </header>
  <main class="sw-stage">
    ${SITUATION_LEVELS.map(
      (l) =>
        `<iframe class="sw-frame" data-level="${l.code}" title="Just To Study — ${l.label} Speaking" allow="microphone; autoplay" hidden></iframe>`
    ).join('')}
    <div class="sw-veil" aria-live="polite">
      <div class="box">
        <div class="sw-spinner" aria-hidden="true"></div>
        <div class="lbl">Loading <b>A1</b> lessons…</div>
      </div>
    </div>
  </main>`
  document.body.appendChild(host)

  host.querySelector('.sw-close').addEventListener('click', close)
  host.querySelectorAll('.sw-lvl').forEach((t) => {
    t.addEventListener('click', () => activate(t.dataset.level))
  })
  // стрелки по табам, как в оригинальной оболочке
  host.querySelector('.sw-levelbar-row').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const order = SITUATION_LEVELS.map((l) => l.code)
    let idx = Math.max(0, order.indexOf(current))
    idx = e.key === 'ArrowRight' ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1)
    activate(order[idx])
    host.querySelector(`.sw-lvl[data-level="${order[idx]}"]`)?.focus()
    e.preventDefault()
  })
}

// Открыть разговорную практику на уровне (например уровне пользователя).
export function openSituations(level, { onExit } = {}) {
  onExitCb = onExit || null
  ensureFont()
  ensureHost()
  host.style.display = ''
  activate(String(level || 'a1').toLowerCase())
}
