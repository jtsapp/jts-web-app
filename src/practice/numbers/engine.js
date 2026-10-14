'use client'

// «Числа» (Dexter's Number World) — движок игры, перенесённый из прототипа
// data/jtsnumbers.html почти дословно (как у SpeakSpin): карта трёх миров,
// объяснение перед игрой (с переводом kk/ru), прыжки Декстера по островам,
// итоги раунда. Экран NumbersPage монтирует его в Shadow DOM: классы прототипа
// (.hero, .card, .btn, .chip…) совпадают с глобальными классами приложения.
//
// От прототипа отличается только связь с приложением:
// - элементы ищутся и вставляются внутри root (модалки, конфетти, тосты — тоже);
// - прогресс — cfg.progress (общее хранилище «Практики», numbersProgress.js):
//   читается перед каждым экраном, пишется один раз — в итогах раунда;
// - звук — cfg.voice (Soniox через /api/tts, voice.js), а не синтез браузера;
// - картинки — файлами из /practice/numbers/img (экстрактор), не base64;
// - слушатели — через AbortController, таймеры — через later(): destroy() снимает
//   всё, а отложенные шаги после await видят, что игра закрыта (R = null), и молчат;
// - сброса прогресса нет: прогресс общий с аккаунтом, и сброс воскресал бы из
//   копии другого устройства при сведении (merge).
// Чистая логика (сборка раундов, план слотов, итог прыжка) — в logic.js под тестами.

import { buildRound, itemKey, jumpOutcome, passMark, positionPlan, rateFor, exSay, spokenOf, starsFor, withGeneratedTours, GEN_ROUND } from './logic.js'

const IMG = '/practice/numbers/img/'
const ASSET = { dex: IMG + 'dex.webp', island: IMG + 'island.webp', portal: IMG + 'portal.webp', crystal: IMG + 'crystal.webp' }
const POSE = { idle: ASSET.dex, crouch: IMG + 'crouch.webp', jump: IMG + 'jump.webp', win: IMG + 'win.webp', oops: IMG + 'oops.webp' }
const SLOW_RATE = 0.7

/**
 * @param {HTMLElement} root  корень игры внутри Shadow DOM (разметка markup.js)
 * @param {{ data: {sections, tours, lessons, sources},
 *   progress: { read: () => object, update: (fn) => void },
 *   voice: { ok, reset, say, stop, prefetch, unlock },
 *   onSkill?: (firstTry: boolean) => void, langKey?: string, fast?: boolean }} cfg
 * @returns {() => void} destroy
 */
export function mountNumbers(root, cfg) {
  const { data, progress, voice, onSkill = () => {}, onView = () => {}, langKey = null, fast = false } = cfg
  const SECTIONS = data.sections
  const TOURS = withGeneratedTours(data.sections, data.tours)
  const LESSONS = data.lessons
  const SOURCES = data.sources

  const ac = new AbortController()
  const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ac.signal })
  let dead = false
  const timers = new Set()
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms)
    timers.add(id)
    return id
  }

// d — Декстер, с которым начали анимацию: поиск «живого» #dex в хвосте прыжка,
// пережившего уход из раунда, поставил бы позу Декстеру уже нового раунда.
function setPose(p, d=$('#dex')){ if(!d || !d.isConnected) return; $$('img',d).forEach(i=>i.classList.toggle('on', i.dataset.p===p)); d.dataset.pose=p; }
const WORLDS = {
  /* fy = vertical focus of the in-game background (0 top … 1 bottom), chosen so each world's magic numerals stay in frame;
     zoom = extra scale over "cover"; numerals sit at the far left/right edges of every painting (see sizeSky) */
  1:{bg:'var(--bg1)', name:'Meadow of First Numbers', lv:'Pre-A1 → A1', fy:.55, zoom:1.04, pfy:1, pzoom:1.16},
  2:{bg:'var(--bg2)', name:'Golden Canyon of Hundreds', lv:'A1+ → A2', fy:.22, zoom:1.03, pfy:.9, pzoom:1.10},
  3:{bg:'var(--bg3)', name:'Starlight Citadel of Billions', lv:'B1 → C1', fy:.30, zoom:1.04, pfy:.5, pzoom:1.02}
};
const IC = {
  speaker:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>',
  play:'<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  back:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
  bulb:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
  star:(on)=>`<svg viewBox="0 0 24 24" class="${on?'on':''}"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${on?'#f5b400':'#e2ddf0'}" stroke="${on?'#d99a00':'#cfc8e6'}" stroke-width="1.2"/></svg>`,
  wave:'<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/></svg>'
};

/* =========================================================
   State: progress lives in the shared practice store; read fresh before every screen
   ========================================================= */
const S = () => progress.read();
const toursOf = id => TOURS[id] || [];
const roundCount = id => toursOf(id).length;
const secRec = id => S().sections[id] || {rounds:[], stars:0, best:0, bestCr:0, done:false, plays:0};
const roundRec = (id,k) => secRec(id).rounds[k] || {passed:false,best:0,stars:0,plays:0};
const roundsPassed = id => toursOf(id).filter((_,k)=>roundRec(id,k).passed).length;
const currentRound = id => { const n=roundCount(id); for(let k=0;k<n;k++) if(!roundRec(id,k).passed) return k; let low=0; for(let k=1;k<n;k++) if(roundRec(id,k).best<roundRec(id,low).best) low=k; return low; };
const roundSize = (id,k) => { const s=byId(id); return (s.boss||s.lab) ? GEN_ROUND : toursOf(id)[k].items.length; };
const isDone = id => roundCount(id)>0 && roundsPassed(id)===roundCount(id);   // every round passed
const byId = id => SECTIONS.find(s=>s.id===id);

/* =========================================================
   Utilities
   ========================================================= */
const $ = (sel, r=root) => r.querySelector(sel);
const $$ = (sel, r=root) => [...r.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const sleep = ms => new Promise(r=>later(r, R && R.fast ? Math.min(ms,30) : ms));
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const talk = (text, rate, onFail) => voice.say(text, rate, onFail);
const canSay = () => voice.ok();
function clearConfetti(){ $$('.confetti').forEach(c=>c.remove()); }
function confetti(){
  const colors=['#874BF8','#f5b400','#1fa65a','#ff5a3c','#3a8ee6','#ff5fd2'];
  for(let i=0;i<80;i++){const c=document.createElement('div');c.className='confetti';
    c.style.left=Math.random()*100+'vw';c.style.background=colors[i%colors.length];
    c.style.animationDuration=(1.8+Math.random()*1.6)+'s';c.style.animationDelay=(Math.random()*.5)+'s';
    root.appendChild(c);later(()=>c.remove(),4300);}
}

/* =========================================================
   Header
   ========================================================= */
function renderHeader(){
  const d=SECTIONS.filter(s=>isDone(s.id)).length; const h=$('#hdrProg'); if(h) h.textContent=`${d} / ${SECTIONS.length} levels`;
}

/* =========================================================
   Dashboard
   ========================================================= */
function nextSection(){
  return SECTIONS.find(s=>!s.lab && !isDone(s.id)) || (!isDone('lab') ? byId('lab') : null);   // topics in order; inside a topic, the first unpassed round
}
/* Cover art for each level: the world scene + the level's own object on a floating island */
const COVER = {
  basic:{v:'0–20', pos:'8% 30%'}, teens:{v:'13 · 30', pos:'92% 35%'}, ordinals:{skin:'medal', v:'1st', pos:'30% 55%'},
  phone:{skin:'phone', v:'+7 0771', pos:'75% 25%'}, time:{skin:'clock', v:'9:15', pos:'55% 45%'}, money:{skin:'tag', v:'£5.99', pos:'100% 60%'},
  boss1:{portal:true, pos:'78% 40%'},
  dates:{skin:'cal', v:'5 May', pos:'5% 45%'}, hundreds:{skin:'odo', v:'1,000', pos:'95% 40%'}, measure:{skin:'road', v:'5 km', pos:'50% 75%'},
  boss2:{portal:true, pos:'50% 85%'},
  fractions:{skin:'pie', v:'¾', pos:'5% 35%'}, maths:{v:'7 × 8', pos:'95% 30%'}, big:{skin:'odo', v:'10⁹', pos:'62% 70%'},
  reallife:{skin:'ticket:GATE', v:'Gate 14', pos:'30% 80%'}, boss3:{portal:true, pos:'60% 75%'}
};
function coverArt(s){
  const c = COVER[s.id] || {v:s.big, pos:'center'};
  const obj = c.portal ? `<img class="cv-portal" src="${ASSET.portal}" alt="">`
    : `<span class="cv-obj">${c.skin ? skinHTML(c.skin, c.v) : `<span class="o glass">${esc(c.v)}</span>`}</span>`;
  return `<span class="cover" style="background-image:${WORLDS[s.stage].bg};background-position:${c.pos}">
    ${obj}${c.portal?'':`<img class="cv-isl" src="${ASSET.island}" alt="">`}</span>`;
}
function pipsHTML(id){
  const n=roundCount(id), p=roundsPassed(id);
  return `<span class="pips" role="img" aria-label="${p} of ${n} rounds passed">${Array.from({length:n},(_,k)=>`<i class="${roundRec(id,k).passed?'on':''}"></i>`).join('')}<b>${p}/${n}</b></span>`;
}
function cardHTML(s, nextId){
  const done=isDone(s.id);
  const cls=['card', s.boss?'boss':'', done?'done':'', s.id===nextId?'next':''].join(' ');
  return `<button class="${cls}" data-id="${s.id}" aria-label="${esc(s.title)}: ${roundsPassed(s.id)} of ${roundCount(s.id)} rounds passed">
    ${coverArt(s)}
    ${s.boss?'<span class="tag-boss">BOSS</span>':''}${done?`<span class="state">${IC.check}</span>`:''}
    <span class="card-body"><span class="card-title">${esc(s.title)}</span><span class="card-desc">${esc(s.desc)}</span>
      <span class="card-foot">${pipsHTML(s.id)}<span class="cta">${done?'Play again':roundsPassed(s.id)?`Round ${currentRound(s.id)+1}`:s.id===nextId?'Start here':'Play'}</span></span></span></button>`;
}
// Где сейчас игра — для единственной кнопки «назад» оболочки (NumbersPage).
// У прототипа своих кнопок было три («Back to the map» в уроке, стрелка в игре,
// «World map» в итогах) плюс «В Практику» оболочки рядом: две кнопки «назад»
// вели в разные места. Теперь «назад» одна, и шаг у неё — туда, откуда пришли:
// из игры и итогов — в урок раздела, если раунд запускали из него, иначе на
// карту; из урока — на карту; с карты — из игры вон (решает оболочка).
let view = 'map';
let lessonOpen = null;
function setView(v){ view = v; onView(v); }
function back(){
  if(view==='game' && R && R.idx>0 && !R.finished && !confirm('Leave this level? Your progress in it will be lost.')) return true;
  if((view==='game' || view==='results') && lessonOpen){
    showLesson(lessonOpen);
    const st=$('.ls-start'); if(st) st.scrollIntoView({block:'end'});
    return true;
  }
  if(view!=='map'){ showDashboard(); return true; }
  return false;
}

function showDashboard(){
  stopGame();
  lessonOpen = null;
  setView('map');
  renderHeader();
  const nx = nextSection();
  const doneCount = SECTIONS.filter(s=>isDone(s.id)).length;
  const lab = byId('lab');
  $('#view').innerHTML = `<div class="dash">
    <section class="hero">
      <img class="hero-dex" src="${ASSET.dex}" alt="Dexter, the JTS mascot">
      <div class="hero-txt">
        <h1>Dexter's Magical Number World</h1>
        <p>Listen, leap onto the right number and open the portals of three magical worlds.</p>
        <div class="hero-row">
          ${nx?`<button class="btn btn-white" id="btnContinue">${IC.play} ${doneCount||roundsPassed(nx.id)?'Continue':'Start'}: ${esc(nx.title)}, round ${currentRound(nx.id)+1}</button>`:`<span class="btn btn-white" aria-disabled="true">Every world completed</span>`}
          <span class="hero-prog"><span class="bar"><i style="width:${doneCount/SECTIONS.length*100}%"></i></span>${doneCount} / ${SECTIONS.length} levels</span>
        </div>
      </div>
    </section>
    ${[1,2,3].map(n=>`<div class="world" style="background-image:${WORLDS[n].bg}">
        <div><span>World ${n} · ${WORLDS[n].lv}</span><h2>${WORLDS[n].name}</h2></div></div>
      <div class="grid">${SECTIONS.filter(s=>s.stage===n).map(s=>cardHTML(s, nx&&nx.id)).join('')}</div>`).join('')}
    <button class="lab-card" data-id="lab" aria-label="Listening and Pronunciation Challenge">
      ${IC.wave}
      <span class="lc-txt"><span class="lc-t">Listening & Pronunciation Challenge</span><span class="lc-d">${esc(lab.desc)}</span></span>
      ${pipsHTML('lab')}
    </button>
  </div>`;
  $$('#view [data-id]').forEach(b=>b.addEventListener('click',()=>startSection(b.dataset.id)));
  const c=$('#btnContinue'); if(c) c.onclick=()=>startGame(nx.id, currentRound(nx.id));
  window.scrollTo(0,0);
}

/* =========================================================
   GAME — Dexter's jump adventure (one shared component)
   ========================================================= */
let R = null;
const SLOTS = [0.19, 0.5, 0.81];          // island x positions (fraction of width), portrait
const SLOTS_L = [0.27, 0.5, 0.73];        // landscape: side islands kept clear of the edge numerals
const SLOT_Y = [0.50, 0.43, 0.50];        // grass-top heights (fraction of height)
const SLOT_YP = [0.47, 0.38, 0.47];       // portrait phones
const BASE = {x:0.5, y:0.93};
const ANC = 0.13;                          // grass top as fraction of island image height

/* How an item is presented. 'read': the cue is shown and nothing is spoken before the jump.
   Listen items follow the round: 'show' = words on screen + audio, 'listen' = audio only,
   'mix' = the first half with words, then audio only. No sound at all — the words are shown. */
function roundMode(i){
  const it=R.rounds[i];
  if(it[5]==='R') return 'read';
  if(!canSay()) return 'show';
  return it[9] || 'show';
}
const itemText = it => it[5]==='R' ? it[7] : it[0];
function stopGame(){ clearConfetti(); if(R){ R.dead=true; } R=null; voice.stop(); window.removeEventListener('keydown', gameKeys); window.removeEventListener('resize', relayout); }

/* =========================================================
   LESSON — taught before every game (English / Қазақша / Русский)
   ========================================================= */
const UI = {
  learn:'Explanation', mistakes:'Common mistakes', check:'Quick check', play:'Start the game', again:'Read the explanation',
  sources:'Sources for teachers', tap:'Select an example to hear it.', right:'Correct.', wrong:'Not quite.',
  jumps:'jumps', need:'to pass', soundOnly:'sound only', pattern:'Pattern', note:'Note', translation:'Translation',
  showTr:'Show the explanation in', trHint:'The translation appears under each English part.', enOnly:'English only'
};
const TR_NAME = {kk:'Қазақша түсіндірме', ru:'Объяснение на русском'};

const LANGS = [['en','English'],['kk','+ Қазақша'],['ru','+ Русский']];
let LANG = (()=>{ try{ const v=langKey && localStorage.getItem(langKey); return v==='kk'||v==='ru'?v:'en'; }catch(e){ return 'en'; } })();
function startSection(id){ showLesson(id); }
function showLesson(id){
  stopGame();
  lessonOpen = id;
  setView('lesson');
  const s = byId(id), L = LESSONS[id], w = WORLDS[s.stage||2];
  const answered = {}; let cur = currentRound(id);
  const render = () => {
    const tr = (LANG==='kk'||LANG==='ru') ? LANG : null;
    const E = o => o ? o.en : '';
    const X = o => (tr && o) ? o[tr] : '';
    // translation panel: shown directly under an English part, never replacing it
    const trBox = inner => tr ? `<div class="ls-tr" lang="${tr}"><span class="trh">${TR_NAME[tr]}</span>${inner}</div>` : '';
    const trLine = o => tr && o ? `<span class="ls-trs" lang="${tr}">${o[tr]}</span>` : '';
    let hintShown = false;
    const exHTML = ex => {
      if(!ex) return '';
      const hint = (canSay() && !hintShown) ? (hintShown=true, `<p class="ls-hint">${esc(UI.tap)}</p>`) : '';
      const groups=[]; ex.forEach(e=>{ const dlg=/^[?✓]$/.test(e[0]); const g=groups[groups.length-1]; if(g&&g.dlg===dlg) g.items.push(e); else groups.push({dlg,items:[e]}); });
      return groups.map(g=> g.dlg
        ? `<div class="ls-dlg">${g.items.map(([f,t])=>`<button class="ls-line" data-say="${esc(t)}"><span class="who">${f==='?'?'Ask':'Answer'}</span><span class="w">${esc(t)}</span>${IC.speaker}</button>`).join('')}</div>`
        : `<div class="ls-ex">${g.items.map(([f,t])=>`<button class="ls-x" data-say="${esc(exSay([f,t]))}" aria-label="${esc(f)}: ${esc(t)}. Play"><span class="fig">${esc(f)}</span><span class="w">${esc(t)}</span>${IC.speaker}</button>`).join('')}</div>`).join('')
        + hint;
    };
    const kicker = s.lab ? 'Listening Lab: sounds from every world' : `World ${s.stage}: ${w.name}`;
    const level = s.lab ? 'All levels' : (s.boss ? `Boss review, ${w.lv}` : w.lv);
    const tour = toursOf(id)[cur];
    $('#view').innerHTML = `<div class="lesson" lang="en">
      <header class="ls-head" style="background-image:${w.bg}"><div>
        <p class="ls-world">${esc(kicker)}</p><h1>${esc(s.title)}</h1><span class="ls-level">${esc(level)}</span>
      </div></header>

      <div class="ls-sheet">
        <div class="ls-langbar">
          <div class="ls-seg" role="group" aria-label="${esc(UI.translation)}">${LANGS.map(([k,n])=>`<button data-tr="${k}" lang="${k}" aria-pressed="${LANG===k}">${n}</button>`).join('')}</div>
          <span class="hint">${esc(UI.trHint)}</span>
        </div>
        <section class="ls-expl" aria-label="${esc(UI.learn)}">
          <p class="ls-lead">${E(L.lead)}</p>
          ${trBox(`<p>${X(L.lead)}</p>`)}
          <ol class="ls-rules">
          ${L.rules.map((r,i)=>`<li class="ls-rule"><div class="ls-rn" aria-hidden="true">${i+1}</div><div>
            <h2>${E(r.t)}</h2>
            <p>${E(r.r)}</p>
            ${r.pat?`<div class="ls-pat"><span>${esc(UI.pattern)}</span><strong>${esc(r.pat)}</strong></div>`:''}
            ${exHTML(r.ex)}
            ${r.x?`<p class="ls-note"><span>${esc(UI.note)}</span>${E(r.x)}</p>`:''}
            ${trBox(`<p class="trt">${X(r.t)}</p><p>${X(r.r)}</p>${r.x?`<p class="trx">${X(r.x)}</p>`:''}`)}
          </div></li>`).join('')}
          </ol>
        </section>
      </div>

      ${L.mistakes.length?`<section class="ls-sec"><h2>${esc(UI.mistakes)}</h2><ul class="ls-mis">
        ${L.mistakes.map(m=>`<li><div class="ls-pair"><span class="bad"><span class="sr">Incorrect: </span>${esc(m.bad)}</span><span class="arr" aria-hidden="true">→</span><span class="good"><span class="sr">Correct: </span>${esc(m.good)}</span></div>
          <p class="why">${E(m.note)}</p>${trLine(m.note)}</li>`).join('')}
      </ul></section>`:''}

      <section class="ls-sec ls-check"><h2>${esc(UI.check)}</h2>
        ${L.check.map((c,qi)=>{ const a=answered[qi], done=a===c.a;
          return `<div class="qc" data-q="${qi}"><p>${E(c.q)}${trLine(c.q)}</p>
          <div class="qc-opts">${c.opts.map(o=>`<button class="qc-o ${a?(o===c.a&&done?'right':a===o&&!done?'wrong':''):''}" data-o="${esc(o)}" ${done?'disabled':''}>${esc(o)}</button>`).join('')}</div>
          <div class="qc-fb ${a?(done?'ok':'no'):''}" role="status">${a?`<b>${esc(done?UI.right:UI.wrong)}</b> ${E(c.why)}${trLine(c.why)}`:''}</div></div>`; }).join('')}
      </section>

      <div class="ls-start">
        <div class="ls-rounds" role="group" aria-label="Rounds">${toursOf(id).map((_,k)=>{ const r=roundRec(id,k); return `<button class="rnum ${r.passed?'ok':''} ${k===cur?'cur':''}" data-k="${k}" aria-pressed="${k===cur}" aria-label="Round ${k+1}${r.passed?', passed':''}">${r.passed?IC.check:''}${k+1}</button>`; }).join('')}</div>
        <button class="btn btn-gold" id="goBtn">${IC.play} Start round ${cur+1}</button>
        <span>${tour&&tour.name?`<b>${esc(tour.name)}.</b> ${esc(tour.goal)} `:''}${roundSize(id,cur)} ${esc(UI.jumps)}. You need ${Math.round(passMark(s)*100)}% ${esc(UI.need)}.</span></div>
      <details class="ls-src"><summary>${esc(UI.sources)}</summary><ul>${L.src.map(k=>{const [t,u]=SOURCES[k]; return `<li>${u?`<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`:esc(t)}</li>`;}).join('')}</ul></details>
    </div>`;
    $$('[data-tr]').forEach(b=>b.onclick=()=>{ LANG=b.dataset.tr; try{ if(langKey) localStorage.setItem(langKey,LANG); }catch(e){ /* хранилище недоступно: язык живёт до ухода с экрана */ } const y=window.scrollY; render(); window.scrollTo(0,y); const nb=$(`[data-tr="${LANG}"]`); if(nb) nb.focus({preventScroll:true}); });
    $$('[data-say]').forEach(b=>b.onclick=()=>{ voice.unlock(); talk(b.dataset.say,.85); });
    $$('.qc').forEach(q=>{ const qi=+q.dataset.q, c=L.check[qi];
      $$('.qc-o',q).forEach(b=>b.onclick=()=>{ if(answered[qi]===c.a) return; answered[qi]=b.dataset.o; const y=window.scrollY; render(); window.scrollTo(0,y); }); });
    $('#goBtn').onclick = ()=>startGame(id, cur);
    $$('.rnum').forEach(b=>b.onclick=()=>{ cur=+b.dataset.k; const y=window.scrollY; render(); window.scrollTo(0,y); });
  };
  render();
  window.scrollTo(0,0);
}

function startGame(id, k){
  stopGame();
  voice.unlock();   // в тике нажатия: иначе iPhone молчит до следующего тапа
  voice.reset();    // новый раунд снова пробует звук
  const s = byId(id);
  if(k==null || !toursOf(id)[k]) k = currentRound(id);
  const items = buildRound(s, toursOf(id)[k], (S().seen||{})[id]||{});
  R = {s, rk:k, rounds:items, plan:positionPlan(items.length), idx:0, crystals:0, combo:0, bestCombo:0, score:0, correct:0, results:[], busy:true, dead:false, fast};
  // Раунд из урока другого раздела («Next: …» в итогах уже открыл его урок) —
  // урок этого; с карты («Continue») урока за спиной нет.
  if(lessonOpen && lessonOpen!==id) lessonOpen = null;
  setView('game');
  $('#view').innerHTML = `
  <div class="g-top">
    <h1 class="g-title">${esc(s.title)}: round ${k+1} of ${roundCount(id)}${toursOf(id)[k].name?` · ${esc(toursOf(id)[k].name)}`:''}</h1>
    <div class="path" role="img" aria-label="Progress through this round">${R.rounds.map((_,i)=>`<span class="stone" data-st="${i}"></span>`).join('')}<img id="pathPortal" src="${ASSET.portal}" alt="Portal"></div>
  </div>
  <div class="g-wrap">
    <div class="scene ${s.boss?'boss-tint':''}" id="scene">
      <div class="sky" id="sky" style="background-image:${WORLDS[s.stage||2].bg}"></div>
      <div class="vignette"></div>
      <div class="motes" id="motes"></div>
      <div id="isles"></div>
      <div class="dex idle" id="dex" role="img" aria-label="Dexter"><span class="shadow"></span>${Object.keys(POSE).map(p=>`<img data-p="${p}" src="${POSE[p]}" alt=""${p==="idle"?' class="on"':''}>`).join('')}</div>
      <div class="prompt" id="prompt" aria-live="polite"></div>
      <div class="hud">
        <span class="chip" title="Crystals in this run"><img src="${ASSET.crystal}" alt=""><span id="gCr">0</span></span>
        <span class="chip combo hidden" id="gCombo">Combo ×0</span>
        <span class="chip rno">Round ${k+1}/${roundCount(id)}</span>
      </div>
      <div class="hud-r"><button class="hbtn" id="gShow">${IC.bulb} Show word</button></div>
      <div class="msg" id="msg" role="status" aria-live="polite"></div>
    </div>
    <p class="g-note" id="gNote"></p>
  </div>`;
  renderNote();
  $('#gShow').onclick = showWord;
  const motes=$('#motes'); for(let i=0;i<16;i++){const m=document.createElement('span');m.className='mote';m.style.left=Math.random()*100+'%';m.style.top=(30+Math.random()*65)+'%';m.style.animationDuration=(5+Math.random()*6)+'s';m.style.animationDelay=(-Math.random()*8)+'s';motes.appendChild(m);}
  on(window, 'keydown', gameKeys);
  on(window, 'resize', relayout);
  // base island + Dexter
  const base = makeIsland(null, 'base'); $('#isles').appendChild(base); R.base = base;
  relayout();
  placeDexOn(base);
  spawnRound();
  window.scrollTo(0,0);
}
function renderNote(){
  const n=$('#gNote'); if(!n) return;
  n.textContent = canSay() ? 'Keys: 1, 2, 3 to jump; Space to listen again.' : 'Sound is unavailable right now, so the words are shown on screen.';
}

/* ---- geometry ---- */
function geo(){
  const sc=$('#scene'); const W=sc.clientWidth, H=sc.clientHeight;
  const portrait = W < H*0.9;
  const iw = portrait ? Math.max(100, Math.min(W*0.31, H*0.24)) : Math.max(110, Math.min(W*0.27, H*0.40, 250));
  return {W,H,iw, ih:iw*0.7, dh:Math.min(iw*0.58, H*0.2)};
}
const SKIN = {ordinals:'medal', phone:'phone', time:'time', money:'tag', dates:'cal', hundreds:'odo', measure:'meas', fractions:'pie', big:'odo', reallife:'ticket'};
const CUE  = {time:'Find the clock', dates:'Find the date', money:'Find the price', phone:'Find the number', maths:'Solve and jump', measure:'Find the measurement', reallife:'Find it', fractions:'Find the amount', ordinals:'Find the position'};
function clockFace(t){
  const [h,m]=t.split(':').map(Number); const ma=m*6, ha=((h%12)+m/60)*30;
  let tk=''; for(let i=0;i<12;i++){ const a=i*30*Math.PI/180; tk+=`<line x1="${50+38*Math.sin(a)}" y1="${50-38*Math.cos(a)}" x2="${50+44*Math.sin(a)}" y2="${50-44*Math.cos(a)}" stroke="#6b5fa8" stroke-width="${i%3?2:4}" stroke-linecap="round"/>`; }
  const n=[12,3,6,9].map((v,i)=>{const a=i*90*Math.PI/180;return `<text x="${50+30*Math.sin(a)}" y="${50-30*Math.cos(a)+5}" text-anchor="middle" font-family="inherit" font-weight="800" font-size="14" fill="#2b1a66">${v}</text>`}).join('');
  const P=(ang,len)=>`${50+len*Math.sin(ang*Math.PI/180)} ${50-len*Math.cos(ang*Math.PI/180)}`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#874BF8" stroke-width="5"/>${tk}${n}<path d="M50 50L${P(ha,24)}" stroke="#2b1a66" stroke-width="6" stroke-linecap="round"/><path d="M50 50L${P(ma,36)}" stroke="#874BF8" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="4.5" fill="#2b1a66"/></svg>`;
}
const PIE = {'½':[1,2],'⅓':[1,3],'¼':[1,4],'¾':[3,4],'⅖':[2,5],'⅕':[1,5],'⅔':[2,3]};
function pieSVG(n,d){
  let p=''; for(let i=0;i<d;i++){ const a0=i/d*2*Math.PI-Math.PI/2, a1=(i+1)/d*2*Math.PI-Math.PI/2;
    p+=`<path d="M50 50L${50+44*Math.cos(a0)} ${50+44*Math.sin(a0)}A44 44 0 ${1/d>.5?1:0} 1 ${50+44*Math.cos(a1)} ${50+44*Math.sin(a1)}Z" fill="${i<n?'#874BF8':'#efe7ff'}" stroke="#fff" stroke-width="2.5"/>`; }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${p}<circle cx="50" cy="50" r="44" fill="none" stroke="#5b2fcf" stroke-width="3"/></svg>`;
}
const ICON = {
  ruler:'<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2" fill="#ffd34d" stroke="#8a5a00" stroke-width="1.5"/><path d="M6 7v4M10 7v3M14 7v4M18 7v3" stroke="#8a5a00" stroke-width="1.5"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><path d="M5 9h14l2 11H3z" fill="#874BF8"/><circle cx="12" cy="6" r="3.2" fill="#b98cff" stroke="#5b2fcf" stroke-width="1.5"/></svg>',
  thermo:'<svg viewBox="0 0 24 24"><rect x="9.5" y="2" width="5" height="14" rx="2.5" fill="#fff" stroke="#e2453c" stroke-width="1.5"/><circle cx="12" cy="18" r="4" fill="#e2453c"/><rect x="11" y="8" width="2" height="9" fill="#e2453c"/></svg>',
  bottle:'<svg viewBox="0 0 24 24"><path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z" fill="#7cd3f7" stroke="#1b6fa8" stroke-width="1.5"/><rect x="8" y="12" width="8" height="5" fill="#fff" opacity=".7"/></svg>',
  speed:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#e2453c" stroke-width="3"/><path d="M12 12l4-4" stroke="#2b1a66" stroke-width="2" stroke-linecap="round"/></svg>'
};
function measIcon(v){ if(/°/.test(v)) return ICON.thermo; if(/\b(kg|g)\b/.test(v)) return ICON.scale; if(/\b(ml|l)\b/.test(v)) return ICON.bottle; if(/mph/.test(v)) return ICON.speed; return ICON.ruler; }
function ticketHead(a){
  if(/^Gate/.test(a)) return ['GATE', s=>s.replace(/^Gate\s*/,'')];
  if(/^Plat/.test(a)) return ['PLATFORM', s=>s.replace(/^Plat\.\s*/,'')];
  if(/^\d+[A-Z]$/.test(a)) return ['SEAT', s=>s];
  if(/^\d{3,4}$/.test(a)) return ['ROOM', s=>s];
  if(/^[A-Z]{2} \d+$/.test(a)) return ['FLIGHT', s=>s];
  if(/\/100$/.test(a)) return ['TEST SCORE', s=>s];
  if(/^\d+–\d+$/.test(a)) return ['SCORE', s=>s];
  if(/^[A-Z]{2}\d/.test(a)) return ['POSTCODE', s=>s];
  if(/B$/.test(a)) return ['FILE SIZE', s=>s];
  return ['', s=>s];
}
/* Decide how this round's three answers are drawn (same object type for all three) */
function roundSkin(id, opts, ans){
  const k = SKIN[id]; if(!k) return null;
  if(k==='time') return opts.some(o=>/^(0|1[3-9]|2\d)/.test(o)) ? 'digi' : 'clock';
  if(k==='pie') return opts.every(o=>PIE[o]||/^\d[½⅓¼¾]$/.test(o)) ? 'pie' : 'pie-text';
  if(k==='ticket') return 'ticket:'+ticketHead(ans)[0];
  if(k==='meas') return /km|mph/.test(ans) ? 'road' : 'meas';
  return k;
}
function skinHTML(skin, v){
  const e=esc(v);
  switch(skin.split(':')[0]){
    case 'clock': return `<span class="o clock">${clockFace(v)}</span>`;
    case 'digi': return `<span class="o digi">${e}</span>`;
    case 'medal': return `<span class="o medal"><span class="disc">${e}</span></span>`;
    case 'phone': return `<span class="o phone">${e}</span>`;
    case 'tag': return `<span class="o tag">${e}</span>`;
    case 'cal': { const m=v.match(/^(\d+) ([A-Za-z]+)$/); return m ? `<span class="o cal"><b>${esc(m[2].toUpperCase())}</b><span>${m[1]}</span></span>` : `<span class="o cal yr"><b>YEAR</b><span>${e}</span></span>`; }
    case 'odo': return `<span class="o odo">${e}</span>`;
    case 'road': return /km|mph/.test(v) ? `<span class="o road">${e}</span>` : `<span class="o meas">${measIcon(v)}<span>${e}</span></span>`;
    case 'meas': return `<span class="o meas">${measIcon(v)}<span>${e}</span></span>`;
    case 'pie-text': return `<span class="o pie"><i style="font-size:1em;padding:.12em .3em 0">${e}</i></span>`;
    case 'pie': { const m=v.match(/^(\d)([½⅓¼¾⅖⅕⅔])$/); if(m){ const [n,d]=PIE[m[2]]; return `<span class="o pie" style="flex-direction:row;gap:.1em"><span style="font-family:inherit;font-weight:800;color:#2b1a66;font-size:.9em">${m[1]}</span>${pieSVG(n,d)}<i>${e}</i></span>`; }
      const [n,d]=PIE[v]; return `<span class="o pie">${pieSVG(n,d)}<i>${e}</i></span>`; }
    case 'ticket': { const head=skin.split(':')[1]; const shown=ticketHead(v)[1](v); return `<span class="o ticket">${head?`<b>${esc(head)}</b>`:''}<span>${esc(shown)}</span></span>`; }
  }
  return null;
}
function makeIsland(label, kind, skin){
  const b=document.createElement(kind==='base'?'div':'button');
  b.className='isl'+(kind==='base'?' base':'');
  const inner = (label!=null && skin) ? skinHTML(skin, label) : null;
  b.innerHTML=`<span class="float"><img class="rock" src="${ASSET.island}" alt="">${label!=null?(inner?`<span class="tab sk">${inner}</span>`:`<span class="tab">${esc(label)}</span>`):''}</span>`;
  if(label!=null){ b.setAttribute('aria-label', label); b.dataset.v=label; }
  return b;
}
function setIsl(el, fx, fy){ // fy = grass-top y as fraction
  const g=geo(); el.style.width=g.iw+'px'; el.style.setProperty('--anc', (ANC*100)+'%');
  el.style.left=(fx*g.W)+'px'; el.style.top=(fy*g.H - g.ih*ANC)+'px';
  el._fx=fx; el._fy=fy;
  el.style.setProperty('--iw', g.iw+'px');
  const tab=el.querySelector('.tab:not(.sk)');
  if(tab && el.classList.contains('wd')){   // word islands: never wider than their slot, so neighbours never overlap
    const t=tab.textContent, longest=Math.max(...t.split(/\s+/).map(w=>w.length)), avail=Math.min(g.iw*1.08, g.W*(slotX()[1]-slotX()[0]));
    let fs=Math.min(g.iw*0.15, (avail-20)/(longest*0.6));
    const perLine=Math.max(1,Math.floor((avail-20)/(fs*0.56))); if(Math.ceil(t.length/perLine)>3) fs=Math.min(fs,(avail-20)*3/(t.length*0.6));
    tab.style.boxSizing='border-box'; tab.style.fontSize=Math.round(Math.max(10.5,fs))+'px'; tab.style.width=Math.round(avail-8)+'px'; tab.style.minWidth='0'; tab.style.maxWidth='none'; }
  else if(tab){ const len=tab.textContent.length; tab.style.fontSize=Math.round(Math.min(g.iw*0.26, g.iw*1.5/Math.max(len,2)))+'px';
    const av=Math.min(g.iw*1.08, g.W*(slotX()[1]-slotX()[0]))-8, tw=tab.offsetWidth; if(tw>av){ tab.style.minWidth='0'; tab.style.paddingLeft=tab.style.paddingRight='10px';
      for(let i=0;i<5 && tab.offsetWidth>av;i++) tab.style.fontSize=(parseFloat(tab.style.fontSize)*Math.max(.6,(av-20)/(tab.offsetWidth-20))).toFixed(1)+'px'; } }
  const sk=el.querySelector('.tab.sk');
  if(sk){ const len=sk.textContent.replace(/\s+/g,' ').trim().length, avail=Math.min(g.iw*1.08, g.W*(slotX()[1]-slotX()[0]));   // long numbers shrink to stay inside their slot
    sk.style.fontSize = len>5 ? Math.round(Math.min(g.iw*0.2, avail/(len*0.64+1.4)))+'px' : '';
    const o=sk.firstElementChild; for(let i=0;i<5 && o && o.offsetWidth>avail-8;i++){ sk.style.fontSize=(parseFloat(getComputedStyle(sk).fontSize)*Math.max(.6,(avail-8)/o.offsetWidth)).toFixed(1)+'px'; } }
}
function anchorOf(el){ const g=geo(); return {x:el._fx*g.W, y:el._fy*g.H}; }
function placeDex(x,y){ const g=geo(); const d=$('#dex'); d.style.width=(g.dh*1.2)+'px'; d.style.height=g.dh+'px'; d._x=x; d._y=y; d.style.transform=`translate(${x - g.dh*0.6}px, ${y - g.dh + 4}px)`; }
function placeDexOn(el){ const a=anchorOf(el); placeDex(a.x, a.y); R.on = el; }
/* ---- background framing: keep the painting's aspect, show its full width where the scene allows,
   and pan exactly from the left edge (first numeral) to the right edge (last numeral) over the level ---- */
const BG_AR = 1920/1086;
function sizeSky(){
  const sky=$('#sky'), sc=$('#scene'); if(!sky||!sc||!R) return;
  const w=WORLDS[R.s.stage||2], W=sc.clientWidth, H=sc.clientHeight;
  // t: 0 for wide (desktop) scenes … 1 for tall (phone) scenes; on tall scenes the art is lifted so the
  // numerals rise above the answer islands instead of hiding behind them
  const t=Math.min(1, Math.max(0, (1.6 - W/H)/0.8));
  const zoom=w.zoom+(w.pzoom-w.zoom)*t, fy=w.fy+(w.pfy-w.fy)*t;
  const sh=Math.max(H, W/BG_AR)*zoom, sw=sh*BG_AR;
  sky.style.width=sw+'px'; sky.style.height=sh+'px';
  sky.style.top=(-(sh-H)*fy)+'px';
  R.skyRange=Math.max(0, sw-W);
  sky.style.transform=`translateX(${-(R.skyRange*(R.skyP||0)).toFixed(1)}px)`;
}
function slotX(){ const sc=$('#scene'); return sc.clientWidth < sc.clientHeight*0.9 ? SLOTS : SLOTS_L; }
function relayout(){
  if(!R || !$('#scene')) return;
  sizeSky();
  setIsl(R.base, R.base._fx??BASE.x, R.base._fy??BASE.y);
  (R.isles||[]).forEach(el=>{ if(el.isConnected) setIsl(el, el._fx, el._fy); });
  if(R.portal) setPortal(R.portal);
  if(R.on && R.on.isConnected) placeDexOn(R.on);
}

/* ---- Dexter animation ---- */
function jumpDex(to, {peak=0.2, dur=620, back=false, land=true}={}){
  const d=$('#dex'), g=geo(); const x0=d._x, y0=d._y, x1=to.x, y1=to.y;
  const quick = R && R.fast;
  const top=Math.min(y0,y1) - g.H*peak; const frames=[]; const N=18; const off=g.dh*0.6;
  d.classList.remove('idle');
  setPose('crouch', d);
  return sleep(quick?0:120).then(()=>{
    setPose('jump', d);
    for(let i=0;i<=N;i++){ const t=i/N; const x=x0+(x1-x0)*t; const y=(1-t)*(1-t)*y0 + 2*(1-t)*t*(top) + t*t*y1;
      const sx = i===0?0.94: i===N?1.04: 1, sy = i===0?1.08: i===N?0.96: 1;
      const rot = (x1>x0?1:-1)*(t<.5?6:-3)*(back?-1:1);
      frames.push({transform:`translate(${x-off}px, ${y-g.dh+4}px) rotate(${i===0||i===N?0:rot}deg) scale(${sx},${sy})`, offset:t}); }
    return d.animate(frames,{duration:quick?20:dur,easing:'linear'}).finished;
  }).then(()=>{ d._x=x1; d._y=y1; d.style.transform=`translate(${x1-off}px, ${y1-g.dh+4}px)`;
    if(!land) return;
    setPose('crouch', d);
    return d.animate([{transform:d.style.transform+' scale(1.06,.94)'},{transform:d.style.transform}],{duration:quick?10:200,easing:'ease-out'}).finished; })
    .then(()=>{ if(land){ setPose('idle', d); d.classList.add('idle'); } });
}
function celebrateDex(){
  const d=$('#dex'); const t=d.style.transform; d.classList.remove('idle'); setPose('win', d);
  return d.animate([{transform:t},{transform:t+' translateY(-34px)'},{transform:t+' translateY(0)'},{transform:t+' translateY(-14px)'},{transform:t}],{duration:R&&R.fast?20:760,easing:'ease-in-out'}).finished.then(()=>{ setPose('idle', d); d.classList.add('idle'); });
}
function dizzyDex(){ const d=$('#dex'); if(!d) return Promise.resolve(); d.classList.remove('idle'); setPose('oops', d); d.classList.add('dizzy'); return sleep(1100).then(()=>{ if(!d.isConnected) return; d.classList.remove('dizzy'); if(d.dataset.pose==='oops') setPose('idle', d); d.classList.add('idle');}); }

/* ---- effects ---- */
function burst(x,y,n=16){
  const sc=$('#scene'); const cols=['#fff6b0','#b98cff','#6ff2e4','#ff8be0','#ffd34d'];
  for(let i=0;i<n;i++){ const s=document.createElement('span'); s.className='spark'; s.style.left=x+'px'; s.style.top=y+'px'; s.style.background=cols[i%cols.length]; s.style.boxShadow=`0 0 10px ${cols[i%cols.length]}`;
    sc.appendChild(s); const a=Math.random()*Math.PI*2, r=40+Math.random()*70;
    s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*r-5}px,${Math.sin(a)*r-5}px) scale(.2)`,opacity:0}],{duration:700+Math.random()*300,easing:'cubic-bezier(.2,.7,.3,1)'}).finished.then(()=>s.remove()); }
}
function popText(txt,x,y){ const p=document.createElement('div'); p.className='pop'; p.textContent=txt; p.style.left=x+'px'; p.style.top=y+'px'; $('#scene').appendChild(p); later(()=>p.remove(),1150); }
function flyCrystals(n, from){
  const sc=$('#scene'), r=sc.getBoundingClientRect(), t=$('#gCr').getBoundingClientRect(); const tx=t.left-r.left, ty=t.top-r.top;
  const jobs=[];
  for(let i=0;i<n;i++){ const c=document.createElement('img'); c.src=ASSET.crystal; c.className='fly'; c.alt=''; c.style.left=from.x+'px'; c.style.top=from.y+'px'; sc.appendChild(c);
    const mx=(from.x+tx)/2+(Math.random()*120-60), my=Math.min(from.y,ty)-80-Math.random()*60;
    jobs.push(c.animate([{transform:'translate(-50%,-50%) scale(.4)',offset:0},{transform:`translate(${mx-from.x}px,${my-from.y}px) scale(1.2)`,offset:.45},{transform:`translate(${tx-from.x}px,${ty-from.y}px) scale(.6)`,offset:1}],{duration:R&&R.fast?20:750,delay:R&&R.fast?0:i*90,easing:'ease-in'}).finished.then(()=>c.remove())); }
  return Promise.all(jobs);
}
function message(kind, html, ms){
  const m=$('#msg'); if(!m) return; m.className='msg show '+kind; m.innerHTML=html;
  const g=geo();   // keep the bubble clear of Dexter and the number tablets
  if(g.W>=700){ m.style.left='16px'; m.style.bottom='64px'; m.style.maxWidth=Math.min(360,g.W*0.34)+'px'; m.style.textAlign='left'; m.classList.add('side'); }
  else { m.style.left='50%'; m.style.bottom=(g.H*(1-BASE.y)+g.dh+10)+'px'; m.style.maxWidth=''; m.style.textAlign='center'; m.classList.remove('side'); }
  clearTimeout(m._t); if(ms) m._t=later(()=>m.classList.remove('show'), ms);
}
function hideMessage(){ const m=$('#msg'); if(m) m.classList.remove('show'); }

/* ---- rounds ---- */
async function spawnRound(){
  const my=R;
  if(!R||R.dead) return;
  const i=R.idx, round=R.rounds[i];
  R.mode = roundMode(i); R.attempts=0; R.revealed=false; R.shown=(R.mode!=='listen'); R.busy=true;
  $$('.stone').forEach((st,k)=>st.classList.toggle('cur',k===i));
  const [, ans, d1, d2] = round;
  // Прогрев: эта фраза (звучит после подлёта островов) и следующая — первая
  // задержка синтеза ~0.6 с остаётся только у самого первого задания.
  voice.prefetch(spokenOf(round)); if(R.rounds[i+1]) voice.prefetch(spokenOf(R.rounds[i+1]));
  $('#scene').dataset.answer = ans;   // для e2e, как data-correct у Word Rush
  const others = shuffle([d1,d2]); const opts = [];
  for(let k=0;k<3;k++) opts.push(k===R.plan[i] ? ans : others.pop());   // islands carry their value; validation never uses the slot
  const skin = R.mode==='read' ? null : roundSkin(round[8]||R.s.id, opts, ans);
  R.isles = opts.map((v,k)=>{ const el=makeIsland(v,'ans',skin); if(R.mode==='read') el.classList.add('wd'); el.dataset.k=k; el.insertAdjacentHTML('beforeend',`<span class="key">${k+1}</span>`); $('#isles').appendChild(el);
    setIsl(el, slotX()[k], ($('#scene').clientWidth < $('#scene').clientHeight*0.9 ? SLOT_YP : SLOT_Y)[k]);
    el.onclick=()=>choose(el); el.disabled=true; return el; });
  renderPrompt();
  // fly in
  const g=geo();
  await Promise.all(R.isles.map((el,k)=>el.animate([{transform:`translate(calc(-50% + ${g.W*0.6}px), -${g.H*0.3}px) scale(.6)`,opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1}],{duration:R.fast?10:650,delay:R.fast?0:k*110,easing:'cubic-bezier(.2,.9,.3,1.15)',fill:'backwards'}).finished));
  if(R!==my||!R||R.dead) return;
  R.isles.forEach(el=>el.disabled=false);
  R.busy=false;
  sayRound();
}
function renderPrompt(){
  const it=R.rounds[R.idx], say=it[0];
  const p=$('#prompt');
  if(R.mode==='read'){
    const cue=it[7];
    p.innerHTML = `<div class="pill ${cue.length>18?'long':''}" id="pill"><small>${esc(it[6])}</small>${esc(cue)}</div>`;
    $('#gShow').classList.add('hidden'); return;
  }
  const long = say.split(' ').length>4;
  const word = R.shown ? `<small>${R.mode==='show'?(CUE[it[8]||R.s.id]||'Jump to'):'You heard'}</small>${esc(cap(say))}` : `<small>Listen and jump</small><span class="listen"><i></i><i></i><i></i><i></i></span>`;
  const audible = canSay();
  p.innerHTML = `${audible?`<button class="rbtn" id="gPlay" aria-label="Play again">${IC.speaker}</button>`:''}<div class="pill ${R.shown&&long?'long':''} ${R.shown&&say.length>60?'xl':''}" id="pill">${word}</div>${audible?`<button class="rbtn slow" id="gSlow" aria-label="Play slowly">Slow</button>`:''}`;
  if(audible){ $('#gPlay').onclick=()=>sayRound(); $('#gSlow').onclick=()=>sayRound(SLOW_RATE); }
  const sb=$('#gShow'); sb.disabled = R.shown; sb.classList.toggle('hidden', !audible || R.mode==='show');
}
function sayRound(rate){
  if(!R || R.mode==='read') return;
  const my=R, i=R.idx;
  talk(R.rounds[i][0], rate||rateFor(R.rounds[i], i), ()=>{   // the sound never came: show the words, no penalty
    if(R!==my || R.idx!==i) return;
    renderNote();
    if(R.shown) return;
    R.mode='show'; R.shown=true; renderPrompt(); });
}
function showWord(){ if(!R || R.shown) return; R.shown=true; renderPrompt(); message('info','Word shown — this jump now earns fewer crystals.',2200); }

function showWrongMsg(v, ans, txt, fb){
  const custom = fb ? ' '+esc(fb) : teenTenNote(v, ans);
  if(R.attempts>=2) message('no', `<b>That was ${esc(v)}.</b> The right island is glowing: ${R.mode==='read'?esc(txt):`“${esc(txt)}”`} → <b>${esc(ans)}</b>.${custom}`);
  else message('no', `<b>That island is ${esc(v)}.</b> ${R.mode==='listen'&&canSay()?'Listen again and jump.':'Read carefully and jump again.'}${custom}`);
}
function teenTenNote(a,b){
  const n=x=>parseInt(String(x).replace(/[^0-9]/g,''),10);
  const A=n(a),B=n(b); if(isNaN(A)||isNaN(B)) return '';
  const isTeen=v=>v>=13&&v<=19, isTen=v=>v>=20&&v<=90&&v%10===0;
  const pair=(t,x)=>isTeen(t)&&isTen(x)&&Math.floor(x/10)===t-10;
  if(pair(A,B)||pair(B,A)) return ' Listen to the end: a long <b>-TEEN</b> means 13–19, a short <b>-ty</b> means 30–90.';
  return '';
}
async function choose(el){
  const my=R;
  if(!R || R.busy || el.disabled) return;
  R.busy=true;
  const round=R.rounds[R.idx], [say, ans,, , fb] = round, v=el.dataset.v, txt=itemText(round);
  hideMessage();
  const to=anchorOf(el);
  if(v===ans){
    R.isles.forEach(x=>x.disabled=true);
    // статистика навыка — только задания на слух; «с первой попытки» — без ошибок
    if(round[5]==='L') onSkill(R.attempts===0 && !R.revealed);
    if(!R.fast) talk(spokenOf(round), R.mode==='read'?0.9:1);
    await jumpDex(to); if(R!==my||!R||R.dead) return; R.on=el;
    // reward
    const o = jumpOutcome({attempts:R.attempts, shown:R.shown, mode:R.mode, revealed:R.revealed, combo:R.combo});
    const kind=o.kind, gain=o.gain; R.combo=o.combo; R.score+=o.score;
    R.bestCombo=Math.max(R.bestCombo,R.combo); R.crystals+=gain; R.correct++;
    R.results.push({say:txt, ans, kind, read:R.mode==='read'});
    const tab=el.querySelector('.tab'); const tr=tab.getBoundingClientRect(), sr=$('#scene').getBoundingClientRect();
    const cx=tr.left-sr.left+tr.width/2, cy=tr.top-sr.top+tr.height/2;
    burst(cx,cy,kind==='gold'?22:12); tab.animate([{opacity:1,transform:'translateX(-50%) scale(1)'},{opacity:0,transform:'translateX(-50%) scale(1.6)'}],{duration:R.fast?10:400,fill:'forwards'});
    $(`.stone[data-st="${R.idx}"]`).classList.add(kind);
    const cb=$('#gCombo'); cb.classList.toggle('hidden', R.combo<2); cb.textContent=`Combo ×${R.combo}`; cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
    if(gain){ popText(`+${gain}`, cx, cy-10); await flyCrystals(gain,{x:cx,y:cy}); }
    if(R!==my||!R||R.dead) return;
    $('#gCr').textContent=R.crystals;
    const praise = kind==='gold' ? (R.combo>=3?`Brilliant! Combo ×${R.combo} — bonus crystals!`:'Correct!') : kind==='silver' ? 'Correct — you got there!' : 'Now you know it. Let’s keep going!';
    message(kind==='miss'?'info':'ok', `<b>${praise}</b> ${R.mode==='read'?`${esc(txt)} → ${esc(ans)}`:`${esc(cap(say))} = ${esc(ans)}`}.`, 1300);
    await celebrateDex(); if(R!==my||!R||R.dead) return;
    await travel(el);
  } else {
    R.attempts++; R.combo=0; $('#gCombo').classList.add('hidden');
    el.disabled=true;
    const back=anchorOf(R.on);
    await jumpDex(to,{peak:.16,dur:460}); if(R!==my||!R||R.dead) return;
    el.classList.add('crack','wrongTab');
    showWrongMsg(v, ans, txt, fb);
    await sleep(180);
    if(R!==my||!R||R.dead) return;
    const g=geo();
    el.animate([{transform:'translate(-50%,0) rotate(0)',opacity:1},{transform:`translate(-50%,${g.H*0.6}px) rotate(14deg)`,opacity:0}],{duration:R.fast?10:900,easing:'ease-in',fill:'forwards'}).finished.then(()=>el.remove());
    await jumpDex(back,{peak:.12,dur:460,back:true}); if(R!==my||!R||R.dead) return;
    if(R.attempts>=2){
      R.revealed=true;
      const right=R.isles.find(x=>x.dataset.v===ans); right.classList.add('glow');
      if(!R.shown){ R.shown=true; renderPrompt(); }
    } else if(R.mode==='listen'){ const again=R; later(()=>{ if(R===again) sayRound(); }, R.fast?0:250); }   // ушли из раунда — молчим
    R.busy=false;
    dizzyDex();
  }
}
async function travel(chosen){
  const my=R;
  if(!R||R.dead) return;
  const g=geo(); R.idx++;
  // background parallax
  R.skyP = R.idx / R.rounds.length; sizeSky();
  // old base and other islands fall away; chosen island glides to the base slot carrying Dexter
  const old=R.base, others=R.isles.filter(x=>x!==chosen);
  others.forEach(el=>el.animate([{transform:'translate(-50%,0)',opacity:1},{transform:`translate(calc(-50% - ${g.W*0.4}px), ${g.H*0.5}px) scale(.7)`,opacity:0}],{duration:R.fast?10:700,easing:'ease-in',fill:'forwards'}).finished.then(()=>el.remove()));
  old.animate([{transform:'translate(-50%,0)',opacity:1},{transform:`translate(calc(-50% - ${g.W*0.5}px), ${g.H*0.35}px)`,opacity:0}],{duration:R.fast?10:700,easing:'ease-in',fill:'forwards'}).finished.then(()=>old.remove());
  const from=anchorOf(chosen), dx=BASE.x*g.W-from.x, dy=BASE.y*g.H-from.y;
  const d=$('#dex'); const dt=d.style.transform;
  const k1=chosen.animate([{transform:'translate(-50%,0)'},{transform:`translate(calc(-50% + ${dx}px), ${dy}px)`}],{duration:R.fast?10:800,easing:'cubic-bezier(.45,0,.2,1)'}).finished;
  const k2=d.animate([{transform:dt},{transform:`${dt} translate(${dx}px, ${dy}px)`}],{duration:R.fast?10:800,easing:'cubic-bezier(.45,0,.2,1)'}).finished;
  await Promise.all([k1,k2]); if(R!==my||!R||R.dead) return;
  chosen.classList.add('base'); chosen.classList.remove('glow'); chosen.disabled=true; chosen.querySelector('.tab')?.remove(); chosen.querySelector('.key')?.remove();
  setIsl(chosen, BASE.x, BASE.y); R.base=chosen; placeDexOn(chosen);
  R.isles=[];
  if(R.idx>=R.rounds.length) return finishLevel();
  spawnRound();
}
function setPortal(el){ const g=geo(); const w=Math.min(g.iw*0.9, g.H*0.34); const h=w*1.317; const top=0.64*g.H - h; el.style.width=w+'px'; el.style.left=(0.5*g.W)+'px'; el.style.top=top+'px'; el._ax=0.5*g.W; el._ay=top+h*0.66; }
async function finishLevel(){
  const my=R;
  R.finished=true; R.busy=true; hideMessage();
  const acc = R.score / R.rounds.length;
  const pass = acc >= passMark(R.s);
  // Записать раунд СРАЗУ, до анимации портала: «назад» на финише не спрашивает
  // подтверждения, и уход за эти ~2.5 с терял бы пройденный раунд.
  const saved = saveRound(acc, pass);
  const need = Math.round(passMark(R.s)*100);
  $('#prompt').innerHTML = `<div class="pill"><small>${pass?'Portal unlocked':'Almost there'}</small>${pass?'Jump through!':`You need ${need}%`}</div>`;
  $('#gShow').classList.add('hidden');
  if(pass){
    const p=document.createElement('div'); p.className='portal'; p.innerHTML=`<img src="${ASSET.portal}" alt="Magic portal">`; $('#isles').appendChild(p); R.portal=p; setPortal(p);
    await p.animate([{transform:'translate(-50%,-60px) scale(.3)',opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1}],{duration:R.fast?10:800,easing:'cubic-bezier(.2,.9,.3,1.2)'}).finished;
    if(R!==my||!R||R.dead) return;
    $('#pathPortal').classList.add('open');
    burst(p._ax, p._ay, 26);
    await jumpDex({x:p._ax, y:p._ay},{peak:.12,dur:700,land:false}); if(R!==my||!R||R.dead) return;
    const d=$('#dex'); d.classList.remove('idle');
    await d.animate([{transform:d.style.transform+' scale(1) rotate(0)',opacity:1},{transform:d.style.transform+' scale(.1) rotate(540deg)',opacity:0}],{duration:R.fast?10:700,easing:'ease-in',fill:'forwards'}).finished;
  } else {
    await dizzyDex();
  }
  await sleep(300);
  if(R!==my) return;
  showResults(acc, pass, saved);
}

function gameKeys(e){
  if(!R || !$('#scene')) return;
  // Зажатый пробел — автоповтор: каждый повтор обрывал фразу с начала, и она не
  // звучала до конца. Ctrl/Alt/Cmd+цифра — сочетание браузера, а не ответ.
  if(e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  // Событие из Shadow DOM перенацелено на хост — настоящая цель в composedPath.
  const t = (e.composedPath && e.composedPath()[0]) || e.target;
  if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||''))) return;
  if(['1','2','3'].includes(e.key)){ const el=(R.isles||[]).filter(x=>x.isConnected).find(x=>x.dataset.k===String(+e.key-1)); if(el) choose(el); }
  if(e.key===' ' && R.mode!=='read' && !(t && t.tagName==='BUTTON')){ e.preventDefault(); sayRound(); }
}

/* =========================================================
   Results: the round is written once (saveRound, at the finish line), read-modify-write
   on the fresh store state; showResults only draws
   ========================================================= */
function saveRound(acc, passed){
  const s=R.s, run=R, k=run.rk, n=roundCount(s.id);
  const stars = starsFor(acc, passed);
  const bonusCr = passed ? (s.boss?8:4) : 0;
  const cr = run.crystals + bonusCr;
  const wasDone = isDone(s.id);
  progress.update(st=>{
    const rec = st.sections[s.id] || {rounds:[], stars:0, best:0, bestCr:0, done:false, plays:0};
    const prev = rec.rounds[k] || {passed:false,best:0,stars:0,plays:0};
    rec.rounds[k] = {passed:prev.passed||passed, best:Math.max(prev.best,acc), stars:Math.max(prev.stars,stars), plays:(prev.plays||0)+1};
    for(let i=0;i<n;i++) if(!rec.rounds[i]) rec.rounds[i]=null;
    rec.stars=Math.max(rec.stars||0,stars); rec.best=Math.max(rec.best||0,acc); rec.bestCr=Math.max(rec.bestCr||0,cr); rec.plays=(rec.plays||0)+1;
    rec.done = rec.rounds.slice(0,n).filter(r=>r&&r.passed).length===n;
    st.sections[s.id]=rec;
    st.totalCorrect=(st.totalCorrect||0)+run.correct; st.bestCombo=Math.max(st.bestCombo||0, run.bestCombo);
    // «уже было» нужно только выбору заданий боссов и Lab
    if(s.boss || s.lab){ const seen = st.seen[s.id] = st.seen[s.id] || {}; run.rounds.forEach(it=>{ const key=itemKey(it); seen[key]=(seen[key]||0)+1; }); }
  });
  return {stars, cr, wasDone};
}
function showResults(acc, passed, {stars, cr, wasDone}){
  const s=R.s, run=R, k=run.rk, n=roundCount(s.id);
  const done = isDone(s.id);
  const finishedNow = done && !wasDone;
  const worldMsg = finishedNow && s.boss && s.stage<3 ? `<p class="res-note">World ${s.stage} conquered! Next: ${esc(WORLDS[s.stage+1].name)}.</p>` : finishedNow ? `<p class="res-note">All ${n} rounds passed!</p>` : '';
  stopGame(); renderHeader();
  setView('results');
  const nx = nextSection();
  const missed = run.results.filter(r=>r.kind!=='gold');
  const nextK = passed && k+1<n ? k+1 : null;
  $('#view').innerHTML = `<div class="res"><div class="panel">
    <div class="banner" style="background-image:${WORLDS[s.stage||2].bg}">${passed?`<img src="${POSE.win}" alt="Dexter celebrating">`:`<img src="${POSE.oops}" alt="Dexter" style="animation:none">`}</div>
    <h1>${!passed?'Almost there!':s.boss?(done?'Boss defeated!':`Boss round ${k+1} cleared!`):'Portal opened!'}</h1>
    <p class="res-sub">${esc(s.title)}: round ${k+1} of ${n}</p>
    <div class="big-stars">${[1,2,3].map(i=>IC.star(i<=stars)).join('')}</div>
    <div class="res-stats">
      <div class="mini"><b>${Math.round(acc*100)}%</b><span>correct</span></div>
      <div class="mini"><b>${cr}</b><span>crystals</span></div>
    </div>
    <div class="res-rounds" role="img" aria-label="Rounds passed: ${Array.from({length:n},(_,i)=>i).filter(i=>roundRec(s.id,i).passed).map(i=>i+1).join(', ')||'none'}">${Array.from({length:n},(_,i)=>`<span class="${roundRec(s.id,i).passed?'ok':''} ${i===k?'cur':''}">${i+1}</span>`).join('')}</div>
    ${passed?'':`<p class="res-tip">You need ${Math.round(passMark(s)*100)}% to pass this round.</p>`}
    ${worldMsg}
    ${missed.length?`<div class="review-list"><h4>Practise these again</h4><ul>${missed.map(m=>`<li>${m.read?esc(m.say):`“${esc(m.say)}”`} → <b>${esc(m.ans)}</b></li>`).join('')}</ul></div>`:''}
    <div class="actions">
      ${nextK!=null?`<button class="btn btn-primary" id="rNextRound">${IC.play} Round ${nextK+1}</button>`:''}
      ${nextK==null && passed && nx && nx.id!==s.id ? `<button class="btn btn-primary" id="rNext">Next: ${esc(nx.title)}</button>`:''}
      <button class="btn ${passed?'btn-ghost':'btn-primary'}" id="rRetry">Play round ${k+1} again</button>
      <button class="btn btn-ghost" id="rLesson">All rounds</button>
      <button class="btn btn-ghost" id="rHome">World map</button>
    </div></div></div>`;
  if(passed) confetti();
  const rr=$('#rNextRound'); if(rr) rr.onclick=()=>startGame(s.id, nextK);
  const rn=$('#rNext'); if(rn) rn.onclick=()=>startSection(nx.id);
  $('#rRetry').onclick=()=>startGame(s.id, k);
  $('#rLesson').onclick=()=>{ showLesson(s.id); const st=$('.ls-start'); if(st) st.scrollIntoView({block:'end'}); };
  $('#rHome').onclick=showDashboard;
  window.scrollTo(0,0);
}

  showDashboard();

  return {
    back,
    destroy() {
      dead = true;
      stopGame();
      ac.abort();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      root.innerHTML = '';
    },
  };
}
