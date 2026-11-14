'use client'

// Parts of Speech World — движок раздела частей речи, перенесённый из прототипа
// методиста почти дословно (как Tenses World, Punctuation World и «Числа»):
// карта мира из девяти регионов с четырьмя маскотами, 16 юнитов (объяснения
// по частям + упражнения шести типов: classify, tag, gap, fix, order, write) и
// игра «The Meridian Bureau» — 14 дел, у дела стадии на десяти движках (hunt,
// sort, forge, fault, deduce, dialogue, rebuild, map, link, slots). Экран
// PartsOfSpeechPage монтирует его в Shadow DOM: классы прототипа (.btn, .top,
// .wrap, .tabs, .card) совпадают с глобальными классами сайта.
//
// Тело — два блока движка прототипа (4 — игра, 5 — оболочка) в том же порядке
// и почти без правок, плюс пять функций слоя мира (regionOf, regionOfCase, img,
// mascot, setGuide) из блока 1. Отличия — только связь с приложением (спека
// 2026-11-14-parts-of-speech-world-design.md, «Сайт»):
// - данные — cfg.bundle с бэкенда (/mobile/parts-of-speech), а не глобальные
//   window.IMG / WORLD / CASES / REFS / HOWTO / SCENES / GAME_DOSSIER и UNITS
//   из блоков данных; копия — своя у каждого монтажа (движок красит дела);
// - разметку страницы прототипа (шапка, боковая карта, колонка) движок ставит
//   сам (SHELL): шапка без логотипа — у экрана своя шапка приложения; в подвале
//   логотипа тоже нет; <main> прототипа — <div class="main">: главный ориентир
//   страницы уже есть у приложения;
// - роутер — переменная HASH вместо адреса страницы: клики по <a href="#…">
//   перехватываются в корне, location.replace и location.hash — go();
//   document.title не трогаем;
// - классы страницы (full, page-*, in-practice, show-labels) — на корне
//   раздела, а не на <body>; lang — на корне; --guide-face и --guide-c
//   (setGuide) — на хосте тени, а не на <html>;
// - поиск по document → по корню раздела ($id: тень не видна поиску по
//   документу); конфетти и искры кладутся в корень, а не в <body>;
// - хранилище pos:* и pos:g:* — не localStorage: прогресс (упражнения
//   progress, дела prog, найденные подсказки clues, показанные «How to play»
//   seen) — cfg.progress() / cfg.onProgress(state, info) (синк с аккаунтом),
//   перечитывается на каждой смене экрана; «Replay this quest» называет
//   сброшенное дело (info.reset) — экран сводит запись с хранилищем, и без
//   этого сброс тут же вернулся бы; язык перевода tl — cfg.lang /
//   cfg.onLang; звук и подписи слов — cfg.prefs / cfg.onPrefs, черновики
//   письма — cfg.drafts / cfg.onDrafts (устройство);
// - дело, все стадии которого решены (на двух устройствах по половине),
//   считается закрытым: прототип ставит complete только в момент решения
//   последней стадии, а объединение двух копий этот момент пропускает;
// - звук — как есть (синтез Web Audio); контекст создаётся и будится в жесте
//   (первый sfx — всегда из клика), в destroy() — close();
// - ответ на задание — в cfg.onAnswer(ok): у упражнения — каждая проверка, у
//   стадии — первая попытка задания (повтор в конце стадии не считается);
// - боковая карта-шторка (кнопка «Map») у прототипа — position:fixed от левого
//   края окна под шапкой 68px; у нас раздел — колонка рядом с сайдбаром, поэтому
//   её место считается от шапки раздела (placeMenu → --pos-x / --pos-y);
// - «назад» из раздела в шапке — только если передан cfg.onExit и только на
//   карте мира;
// - слушатели окна и корня — через AbortController, таймеры — через обёртку,
//   наблюдатель секций и аудиоконтекст отпускаются: destroy() снимает всё.
// Мёртвый код прототипа (livingSentence, startLS, startLW, renderDesign — в
// прототипе они объявлены, но не вызываются или не достижимы по ссылкам)
// перенесён как есть: движок сверяется с прототипом хэшем, и вырезанное
// пришлось бы вырезать заново при каждом обновлении.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

// Знак бренда (облачко речи) — эмблемы дел и портреты рисуются им через <use>; символ лежит в корне раздела:
// ссылка по id из тени наружу не выходит.
const BUBBLE =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="jts-bubble" viewBox="208 148 422 404"><path fill="currentColor" d="M 424.2 551.7 L 223.5 551.7 C 213.4 551.7 208.6 539.2 216.3 532.4 L 256.7 497.2 C 263.9 491.1 264.4 480.6 258.5 473.3 C 230.7 438.1 216.1 396.9 216.1 349.6 C 216.1 293.2 236.4 245.6 275.4 206.5 C 315.8 167.6 364.9 148.8 424.2 148.8 C 480.4 148.8 529.5 167.6 568.6 206.5 C 609.0 245.6 629.2 293.2 629.2 349.6 C 629.2 405.9 609.0 453.5 568.6 492.6 C 529.5 531.5 480.4 551.7 424.2 551.7 "/></symbol></svg>'

// Разметка страницы прототипа (<body>) без логотипа и блоков скрипта.
const SHELL =
  BUBBLE +
  '<header class="top"><div class="top-in">' +
  '<button class="menu-btn exit-btn" id="exitBtn" type="button" aria-label="Back" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>' +
  '<button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="side"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg><span>Map</span></button>' +
  '<a class="brand" href="#map" aria-label="Parts of Speech World, home"><span class="brand-name">Parts of Speech <em>World</em></span></a>' +
  '<nav class="tabs" aria-label="Section"><a href="#map" data-tab="learn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Learn</a><a href="#bureau" data-tab="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.7z" fill="currentColor"/></svg>Quests</a></nav>' +
  '<div class="langs" role="group" aria-label="Translations shown under the English text">' +
  '<button type="button" data-lang="en" data-short="EN" aria-pressed="true" title="English only">English</button>' +
  '<button type="button" data-lang="kk" data-short="ҚАЗ" aria-pressed="false" lang="kk" title="Show Kazakh under each paragraph">Қазақша</button>' +
  '<button type="button" data-lang="ru" data-short="РУС" aria-pressed="false" lang="ru" title="Show Russian under each paragraph">Русский</button>' +
  '</div></div></header>' +
  '<div class="wrap"><nav class="side" id="side" aria-label="World map"></nav><div class="main" id="main"><div class="col" id="view"></div></div></div>'

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM) — <div class="posw">; разметку страницы движок ставит сам
 * @param {{ bundle: object, progress?: () => object, onProgress?: (state: object, info?: { reset: string }) => void,
 *   onAnswer?: (ok: boolean) => void, lang?: string, onLang?: (lang: string) => void,
 *   prefs?: () => object, onPrefs?: (prefs: object) => void, drafts?: () => object,
 *   onDrafts?: (drafts: object) => void, onExit?: () => void }} cfg
 */
export function mountPartsOfSpeech(root, cfg) {
const { bundle, progress = () => null, onProgress = () => {}, onAnswer = () => {}, lang: startLang = 'en', onLang = () => {}, prefs: readPrefs = () => null, onPrefs = () => {}, drafts: readDrafts = () => null, onDrafts = () => {}, onExit = null } = cfg
const ROOT = root
// --guide-face / --guide-c прототип ставил на <html>; у нас переменные раздела живут на хосте тени (:host)
const HOST = (ROOT.getRootNode && ROOT.getRootNode().host) || ROOT
ROOT.innerHTML = SHELL
let dead = false
const abort = new AbortController()
const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: abort.signal })
const TIMERS = new Set()
const TICKS = new Set()
const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { TIMERS.delete(id); if (!dead) fn() }, ms); TIMERS.add(id); return id }
const clearTimeout = (id) => { TIMERS.delete(id); globalThis.clearTimeout(id) }
const setInterval = (fn, ms) => { const id = globalThis.setInterval(() => { if (!dead) fn() }, ms); TICKS.add(id); return id }
const clearInterval = (id) => { TICKS.delete(id); globalThis.clearInterval(id) }
// id в тени: поиск по документу, как у прототипа, её не видит
const $id = (id) => ROOT.querySelector('[id="' + String(id).replace(/["\\]/g, '') + '"]')
const reportAnswer = (ok) => { try { onAnswer(!!ok) } catch (e) { /* навык — не повод ронять практику */ } }
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const copy = (x, empty) => (x == null ? empty : JSON.parse(JSON.stringify(x)))

// ---------- роутер: адрес раздела — переменная, а не адрес страницы ----------
let HASH = '#map'
let ROUTE = () => {}
function afterRoute() {
  const b = $id('exitBtn')
  if (b) b.hidden = !(onExit && (HASH === '#map' || HASH === '#toc' || HASH === '#'))
}
function go(h) {
  h = String(h || '#map')
  if (dead || h === HASH) return
  HASH = h
  ROUTE()
  afterRoute()
}
on(ROOT, 'click', (e) => {
  // ссылки «по странице» (лента глав урока) прототип обрабатывает сам и гасит переход
  if (e.defaultPrevented) return
  const a = e.target.closest && e.target.closest('a[href^="#"]')
  if (!a || !ROOT.contains(a)) return
  e.preventDefault()
  go(a.getAttribute('href'))
})
// Шторка карты: у прототипа — от левого края окна под шапкой; у нас — от края и низа шапки раздела.
function placeMenu() {
  const top = ROOT.querySelector('.top')
  if (!top) return
  const r = top.getBoundingClientRect()
  ROOT.style.setProperty('--pos-x', Math.max(0, Math.round(r.left)) + 'px')
  ROOT.style.setProperty('--pos-y', Math.max(0, Math.round(r.bottom)) + 'px')
}
const menuOpen = () => { const s = $id('side'); return !!s && s.classList.contains('open') }
on(window, 'scroll', () => { if (menuOpen()) placeMenu() }, { passive: true })
on(window, 'resize', () => { if (menuOpen()) placeMenu() })
if (onExit) on($id('exitBtn'), 'click', () => onExit())

// ---------- данные бандла (у прототипа — глобалы блоков данных) ----------
const IMG = copy(bundle.IMG, {})
const UNITS = copy(bundle.UNITS, [])
const CASES = copy(bundle.CASES, [])
const REFS = Object.assign({ title: { en: '' }, lede: { en: '' }, list: [] }, copy(bundle.REFS, {}))
const HOWTO = copy(bundle.HOWTO, {})
const SCENES = copy(bundle.SCENES, {})
const GAME_DOSSIER = typeof bundle.GAME_DOSSIER === 'string' ? bundle.GAME_DOSSIER : ''

/* слой мира прототипа (блок 1): данные — из бандла, пять функций — как в прототипе */
const WORLD = (function(){
const W0 = copy(bundle.WORLD, {})
const MASCOTS = W0.MASCOTS || {}, REGIONS = W0.REGIONS || [], STORY = W0.STORY || {}, SPOTS = W0.SPOTS || {}
function regionOf(unitId){return REGIONS.find(r=>r.units.includes(unitId))||REGIONS[0];}
function regionOfCase(c){return regionOf(c.unit);}
function img(k){return IMG[k]||"";}
function mascot(k){return MASCOTS[k]||MASCOTS.dexter;}
/* the guide's face drives the feedback bubbles on every page */
function setGuide(k){const m=mascot(k);HOST.style.setProperty("--guide-face",'url("'+img(m.face)+'")');HOST.style.setProperty("--guide-c",m.color);}
return {MASCOTS,REGIONS,STORY,SPOTS,regionOf,regionOfCase,img,mascot,setGuide};
})();

// ---------- хранилище: прогресс аккаунта и настройки устройства ----------
// STATE — те же объекты, что прототип держал в памяти после load(): acts — pos:progress, cases — pos:g:prog,
// clues — pos:g:clues, seen — pos:g:seen. Перечитываются на месте (ссылки движка остаются живыми) на каждой смене
// экрана: снимок сервера, пришедший позже первого кадра, подхватывается без пересоздания раздела.
const STATE = { acts: {}, cases: {}, clues: {}, seen: {} }
function refreshState() {
  const s = copy(progress(), {}) || {}
  for (const k of Object.keys(STATE)) {
    for (const id of Object.keys(STATE[k])) delete STATE[k][id]
    if (isObj(s[k])) Object.assign(STATE[k], s[k])
  }
  for (const c of CASES) {
    const st = STATE.cases[c.id]
    if (!st) continue
    if (!Array.isArray(st.done)) st.done = []
    if (!isObj(st.first)) st.first = {}
    // все стадии решены (по частям на двух устройствах) — дело закрыто
    if (c.stages.every((_, n) => st.done.includes(n))) st.complete = true
  }
}
refreshState()
// reset — id дела, сброшенного «Replay this quest»: единственное, что в разделе убывает (экран не сводит его с прежним)
const pushState = (reset) => { try { onProgress(copy(STATE), reset ? { reset } : undefined) } catch (e) { /* хранилище — не повод ронять раздел */ } }
const PREFS = Object.assign({ sound: true, labels: false }, isObj(readPrefs()) ? readPrefs() : {})
const savePrefs = () => { try { onPrefs({ sound: PREFS.sound !== false, labels: PREFS.labels === true }) } catch (e) { /* то же */ } }
const DRAFTS = isObj(readDrafts()) ? copy(readDrafts()) : {}
function saveDraft(id, text) {
  text = String(text || '')
  // write-задание зовёт save и при отрисовке: пустое и неизменившееся не пишем
  if (text ? DRAFTS[id] === text : !(id in DRAFTS)) return
  if (text) DRAFTS[id] = text
  else delete DRAFTS[id]
  try { onDrafts(copy(DRAFTS)) } catch (e) { /* то же */ }
}

/* =========================================================================
   THE MERIDIAN BUREAU — game layer for the Parts of Speech section
   Data: window.CASES (one object per case). Engines: hunt, sort, forge,
   fault, deduce, dialogue, rebuild, map, link, slots.
   Mastery rule: an item answered wrongly returns at the end of the stage
   and must be solved before the stage closes. Progress = solved stages only.
   ========================================================================= */
const GAME=(function(){
const $=(s,r)=>(r||ROOT).querySelector(s), $$=(s,r)=>[...(r||ROOT).querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// хранилище прототипа pos:g:* — прогресс аккаунта (prog, clues, seen) и звук устройства
function load(k,d){return k==="prog"?STATE.cases:k==="clues"?STATE.clues:k==="seen"?STATE.seen:k==="sound"?PREFS.sound!==false:d}
function save(k,v,reset){if(k==="sound"){PREFS.sound=!!v;savePrefs();}else pushState(reset);}
const prog=load("prog",{}); // {caseId:{done:[stageIdx...], first:{stageIdx:[correct,total]}, complete:bool}}
let soundOn=load("sound",true);

/* ---------------- audio: synthesised, no external files ---------------- */
let ac=null;
function ctx(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){ac=null}}if(ac&&ac.state==="suspended"){try{ac.resume()}catch(e){}}return ac}
function tone(f,t0,dur,type,vol){const a=ctx();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type||"sine";o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,a.currentTime+t0);g.gain.exponentialRampToValueAtTime(vol||0.08,a.currentTime+t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+t0+dur);o.connect(g);g.connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+dur+0.02);}
const SFX={
  click(){tone(880,0,.05,"triangle",.035)},
  pick(){tone(660,0,.06,"triangle",.05)},
  ok(){tone(660,0,.12,"sine",.07);tone(990,.08,.18,"sine",.06)},
  no(){tone(196,0,.16,"triangle",.07);tone(165,.07,.18,"triangle",.05)},
  stage(){[523,659,784].forEach((f,i)=>tone(f,i*.09,.22,"sine",.06))},
  done(){[523,659,784,1047].forEach((f,i)=>tone(f,i*.11,.32,"sine",.07));tone(1568,.5,.5,"sine",.03)},
  page(){const a=ctx();if(!a)return;const n=a.createBufferSource(),b=a.createBuffer(1,a.sampleRate*.12,a.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.25;const fl=a.createBiquadFilter();fl.type="highpass";fl.frequency.value=1800;
    const g=a.createGain();g.gain.value=.5;n.buffer=b;n.connect(fl);fl.connect(g);g.connect(a.destination);n.start();}
};
function sfx(n){if(soundOn&&SFX[n])try{SFX[n]()}catch(e){}}

/* ---------------- confetti (only on case completion) ---------------- */
function confetti(){
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const c=document.createElement("canvas");c.className="g-confetti";ROOT.appendChild(c);
  const x=c.getContext("2d");const W=c.width=innerWidth,H=c.height=innerHeight;
  const cols=["#874BF8","#0AC7FF","#00E641","#FF7D1D","#FFF805","#874BF8"];
  const P=Array.from({length:150},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*11,vy:-Math.random()*12-4,r:Math.random()*6+3,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6,s:(Math.random()-.5)*.3}));
  // fireworks: three bursts in brand colours, then the confetti falls
  const FW=[];[[.25,.3,20],[.75,.25,45],[.5,.18,70]].forEach(b=>{for(let n=0;n<42;n++){const ang=n/42*Math.PI*2,sp=3+Math.random()*3;FW.push({x:W*b[0],y:H*b[1],vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,t0:b[2],c:cols[n%5],life:60});}});
  let t=0;(function f(){x.clearRect(0,0,W,H);
    FW.forEach(p=>{if(t<p.t0||t>p.t0+p.life)return;p.vy+=.06;p.vx*=.97;p.vy*=.97;p.x+=p.vx;p.y+=p.vy;x.globalAlpha=1-(t-p.t0)/p.life;x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,2.4,0,7);x.fill();x.globalAlpha=1;});
    if(t>40)P.forEach(p=>{p.vy+=.32;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.s;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r,-p.r/2,p.r*2,p.r);x.restore();});
    if(!dead&&++t<200)requestAnimationFrame(f);else c.remove();})();
}

/* ---------------- shared helpers ---------------- */
function caseState(id){if(!prog[id])prog[id]={done:[],first:{},complete:false};return prog[id];}
function isUnlocked(i){return true;} // every case is open; the map recommends an order
function nextCase(){const i=CASES.findIndex(c=>!(prog[c.id]&&prog[c.id].complete));return i<0?0:i;}
function fmtS(s){return String(s).replace(/\{x:([^}]+)\}/g,'<span class="x">$1</span>');}
const KIND={hunt:"Evidence hunt",sort:"Sorting the evidence",forge:"The workbench",fault:"Fault finding",deduce:"Deduction",dialogue:"Conversation",rebuild:"Reconstruction",map:"Field work",link:"Reference tracing",slots:"Blueprint analysis"};
const shuffle=(a,seed)=>{const b=a.slice();let s=seed||11;for(let i=b.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const norm=s=>String(s).toLowerCase().replace(/[’']/g,"'").replace(/[.!?]+$/,"").replace(/\s+/g," ").replace(/\s+([,.!?;:])/g,"$1").trim();

/* ---------------- district palette (Just to Study brand colours) ---------------- */
// fill, text-on-fill, ink-on-white
const PAL=[["#874BF8","#fff","#6E35E8"],["#0AAFFF","#06263A","#0070A8"],["#FF631E","#1F0A00","#BF3E0B"],["#00D441","#0E1A12","#08773A"],["#FFAD00","#1A1200","#875600"]];
CASES.forEach((c,i)=>{const p=PAL[i%PAL.length];c.color=p[0];c.on=p[1];c.ink=p[2];});
function accVars(c){return "--g-acc:"+c.color+";--g-on:"+c.on+";--g-ink:"+c.ink;}

/* ---------------- HUB: the quest board of the world ---------------- */
const WD=WORLD;
function hubHTML(){
  const done=CASES.filter(c=>prog[c.id]&&prog[c.id].complete).length,nx=nextCase(),N=CASES[nx],NR=WD.regionOfCase(N),NG=WD.mascot(NR.guide);
  let h='<div class="g-hub"><section class="q-hero"><img class="q-hero-img" src="'+WD.img("r_bridges")+'" alt=""><div class="q-hero-shade" aria-hidden="true"></div>'+
   '<div class="q-hero-t"><h1>Quests</h1><p class="lede">Fix the words on every island.</p>'+
   '<div class="q-go"><a class="btn btn-xl g-go" href="#case-'+N.id+'"><span>'+(done?"Continue":"Start")+'</span><b>'+N.title+'</b></a></div>'+
   '<div class="q-stat"><div class="q-meter" role="img" aria-label="'+done+' of '+CASES.length+' quests complete"><span style="width:'+Math.round(done/CASES.length*100)+'%"></span></div><span>'+done+' / '+CASES.length+'</span>'+
   '<button class="g-snd" id="gSnd" type="button" aria-pressed="'+soundOn+'" aria-label="Sound">'+(soundOn?"🔊":"🔇")+'</button></div></div>'+
   '<div class="q-hero-guide"><img src="'+WD.img(NG.img)+'" alt="'+NG.name+'"></div></section>';
  h+='<div class="q-board">';
  WD.REGIONS.forEach((r,ri)=>{
    const cs=CASES.map((c,i)=>({c,i})).filter(x=>r.units.includes(x.c.unit));if(!cs.length)return;
    h+='<section class="q-isle" style="--rc:'+r.hue+'"><div class="q-isle-art"><img src="'+WD.img(r.img)+'" alt="" loading="lazy"><img class="q-isle-face" src="'+WD.img(WD.mascot(r.guide).face)+'" alt=""></div>'+
     '<div class="q-isle-t"><h2>'+esc(r.name)+'</h2><ol class="g-caselist">';
    cs.forEach(({c,i})=>{const st=prog[c.id]||{};
      h+='<li><a class="g-case'+(st.complete?" closed":"")+(i===nx?" next":"")+'" style="'+accVars(c)+'" href="#case-'+c.id+'">'+
       '<span class="g-case-e" aria-hidden="true">'+c.mark+'</span><span class="g-case-t"><b>'+c.title+'</b><span class="g-case-n">'+c.level+'</span></span>'+
       '<span class="g-case-s">'+(st.complete?"✓":(st.done||[]).length?(st.done||[]).length+"/"+c.stages.length:i===nx?"Start":"→")+'</span></a></li>';});
    h+='</ol></div></section>';
  });
  h+='</div></div>';
  return h;
}
let cur=null; // current stage state
function sceneHTML(c){
  const S=SCENES&&SCENES[c.id],R=WD.regionOfCase(c);
  const clues=((S&&S.clues)||[]).map((p,k)=>c.stages[k]&&c.stages[k].learned?'<button type="button" class="g-clue" data-k="'+k+'" style="left:'+p[0]+'%;top:'+Math.max(14,Math.min(p[1],78))+'%" aria-label="Hidden clue '+(k+1)+'"><span></span></button>':"").join("");
  return '<div class="g-scene"><img class="g-scene-img" src="'+WD.img(R.img)+'" alt="">'+clues+
    '<div class="g-clue-bar"><span class="g-clue-n"></span></div><div class="g-clue-pop" hidden></div></div>';
}
function caseHTML(c,i){
  const st=caseState(c.id);
  const brief=(c.brief.match(/<p>[\s\S]*?<\/p>/)||[c.brief])[0];
  let h='<div class="g-case-screen" style="'+accVars(c)+'">';
  h+='<nav class="g-crumbs"><a href="#bureau"><span aria-hidden="true">←</span> Quests</a>'+(c.unit?'<a href="#'+c.unit+'">Lesson</a>':'')+'</nav>';
  h+='<header class="g-banner">'+sceneHTML(c)+'<div class="g-banner-t">'+emblem(c)+'<div><div class="kicker">'+esc(WD.regionOfCase(c).name)+' · '+c.level+'</div><h1>'+c.title+'</h1></div></div></header>';
  const G=WD.mascot(WD.regionOfCase(c).guide);
  h+='<div class="g-brief"><div class="g-who">'+portrait(c.who)+'<div><b>'+c.who.name+'</b><span>'+c.who.role+'</span></div></div><div class="g-brief-t">'+brief+'</div></div>';
  h+='<ol class="g-steps" aria-label="Stages">'+c.stages.map((s,k)=>'<li class="'+(st.done.includes(k)?"done":"")+'" data-k="'+k+'"><button type="button" data-k="'+k+'"'+(canOpen(c,k)?"":" disabled")+'><span class="g-sn">'+(st.done.includes(k)?"✓":k+1)+'</span><span><b>'+s.title+'</b><small>'+HOWTO_NAME(s.type)+'</small></span></button></li>').join("")+'</ol>';
  h+='<section class="g-stage" id="gStage" aria-live="polite"></section>';
  h+='</div>';return h;
}
const HOWTO_NAME=t=>(HOWTO&&HOWTO[t]&&HOWTO[t].name)||KIND[t];
function wireScene(c){
  const sc=$(".g-scene");if(!sc)return;const found=load("clues",{});const f=new Set(found[c.id]||[]);
  const total=$$(".g-clue",sc).length,pop=$(".g-clue-pop",sc),n=$(".g-clue-n",sc);
  const upd=()=>{n.textContent=total?("✦ Clues "+f.size+"/"+total):"";};
  $$(".g-clue",sc).forEach(b=>{if(f.has(+b.dataset.k))b.classList.add("got");
    b.addEventListener("click",()=>{const k=+b.dataset.k;f.add(k);found[c.id]=[...f];save("clues",found);b.classList.add("got");sfx("pick");
      pop.hidden=false;pop.innerHTML='<b>Clue '+(k+1)+'</b>'+c.stages[k].learned+'<button type="button" class="g-clue-x" aria-label="Close">×</button>';
      $(".g-clue-x",pop).addEventListener("click",()=>{pop.hidden=true;});upd();burst(b,c.color);});});
  upd();
}
function canOpen(c,k){const st=caseState(c.id);return k===0||st.done.includes(k-1)||st.done.includes(k);}
function emblem(c){const fs=c.mark.length>2?17:c.mark.length>1?22:28;return '<svg class="g-emb" viewBox="0 0 88 84" aria-hidden="true"><use href="#jts-bubble" width="88" height="84" style="color:var(--g-acc)"/><text x="45" y="'+(42+fs*.36)+'" text-anchor="middle" font-family="inherit" font-size="'+fs+'" font-weight="700" fill="var(--g-on)">'+c.mark+'</text></svg>';}
function portrait(w){const ini=w.name.split(" ").map(x=>x[0]).join("").slice(0,2);return '<svg class="g-por" viewBox="0 0 60 58" aria-hidden="true"><use href="#jts-bubble" width="60" height="58" style="color:var(--g-acc)"/><text x="31" y="35" text-anchor="middle" font-family="inherit" font-size="17" font-weight="700" fill="var(--g-on)">'+ini+'</text></svg>';}

function openCase(c,i){
  const view=$("#view");view.innerHTML=caseHTML(c,i);WD.setGuide(WD.regionOfCase(c).guide);
  $$(".g-steps button",view).forEach(b=>b.addEventListener("click",()=>{sfx("click");openStage(c,i,+b.dataset.k);}));
  wireScene(c);
  const st=caseState(c.id);let k=0;while(st.done.includes(k)&&k<c.stages.length-1)k++;
  if(st.complete){stageIntro(c,i,null);}else openStage(c,i,k,true);
}
function setActive(k){$$(".g-steps li").forEach(li=>li.classList.toggle("on",+li.dataset.k===k));}
function stageIntro(c,i,k){ // case-closed screen
  const box=$("#gStage");setActive(-1);
  box.innerHTML='<div class="g-closed"><div class="kicker">Quest complete</div><h2>'+c.title+'</h2><div class="g-debrief">'+c.debrief+'</div>'+summary(c)+
   '<div class="bar">'+(CASES[i+1]?'<a class="btn" href="#case-'+CASES[i+1].id+'">Next quest: '+CASES[i+1].title+'</a>':'<a class="btn" href="#bureau">Back to all quests</a>')+
   '<button class="btn ghost" type="button" id="gReplay">Replay this quest</button></div></div>';
  $("#gReplay").addEventListener("click",()=>{prog[c.id]={done:[],first:{},complete:false};save("prog",prog,c.id);openCase(c,i);});
}
function summary(c){
  const st=caseState(c.id);let r=0,t=0;Object.values(st.first).forEach(v=>{r+=v[0];t+=v[1];});
  if(!t)return"";const pct=Math.round(r/t*100);
  let note=pct>=85?"Your first attempts were secure. Revisit this quest in a few weeks to keep it that way.":pct>=60?"Several items needed a second look. Replaying the quest after a short break will consolidate them.":"Many items needed more than one attempt. Re-read the unit explanation, then replay the quest.";
  return '<p class="g-sum"><b>First-attempt accuracy: '+pct+'%</b> ('+r+' of '+t+'). '+note+'</p>';
}

function openStage(c,i,k,auto){
  if(!canOpen(c,k))return;
  const s=c.stages[k];setActive(k);
  const items=(s.items||[]).map((it,n)=>Object.assign({_n:n},it));
  cur={c:c,i:i,k:k,s:s,queue:items,pos:0,right:0,total:items.length,seen:new Set(),misses:0};
  const box=$("#gStage");
  box.innerHTML='<div class="g-stage-h"><div class="g-stage-top"><div class="kicker">'+(k+1)+' / '+c.stages.length+'</div><button type="button" class="g-howbtn">How to play</button></div><h2>'+s.title+'</h2>'+
    '<p class="g-do">'+(s.task||"")+'</p>'+(s.tip?'<p class="g-tip"><b>Tip</b> '+s.tip+'</p>':'')+'</div><div class="g-play"></div>';
  if(!auto)box.scrollIntoView({behavior:"smooth",block:"start"});
  sfx("page");
  const seen=load("seen",{});
  const start=()=>ENG[s.type](s,$(".g-play",box));
  $(".g-howbtn",box).addEventListener("click",()=>howTo(s,null));
  if(!seen[s.type]){seen[s.type]=1;save("seen",seen);howTo(s,start);}else start();
}
function howTo(s,onStart){
  const H=(HOWTO||{})[s.type];if(!H){onStart&&onStart();return;}
  const box=$("#gStage");const old=$(".g-how",box);if(old)old.remove();
  const el=document.createElement("div");el.className="g-how";el.setAttribute("role","dialog");if(!onStart)el.classList.add("g-how-float");el.setAttribute("aria-label","How to play: "+H.name);
  el.innerHTML='<div class="g-how-card"><div class="kicker">How to play</div><h3>'+H.name+'</h3><div class="g-demo g-demo-'+s.type+'" aria-hidden="true">'+DEMO[s.type]+'</div>'+
    '<ol class="g-how-steps">'+H.steps.map(t=>'<li>'+t.replace("{target}",s.target||"target word")+'</li>').join("")+'</ol>'+
    '<button type="button" class="btn g-how-go">'+(onStart?"Start":"Got it")+'</button></div>';
  box.appendChild(el);const go=$(".g-how-go",el);go.focus({preventScroll:true});
  go.addEventListener("click",()=>{sfx("click");el.remove();onStart&&onStart();});
}
const DEMO={
  hunt:'<p class="dm-doc">The guard <span class="dm-t">walked</span> home and <span class="dm-t d2">locked</span> the door.</p><i class="dm-ptr"></i>',
  sort:'<span class="dm-card">apple</span><span class="dm-bin b1">noun</span><span class="dm-bin b2">verb</span>',
  forge:'<p class="dm-doc">Two <span class="dm-gap"><span class="dm-type">children</span></span> are playing.</p>',
  fault:'<p class="dm-doc">She <span class="dm-bad">go</span><span class="dm-fix">goes</span> to school.</p>',
  deduce:'<p class="dm-doc">I love my <mark>work</mark>.</p><span class="dm-pill p1">noun</span><span class="dm-pill p2">verb</span>',
  dialogue:'<span class="dm-b1">Can I help you?</span><span class="dm-b2">Yes, please.</span>',
  rebuild:'<span class="dm-tile t1">She</span><span class="dm-tile t2">went</span><span class="dm-tile t3">home</span>',
  map:'<span class="dm-house h1"></span><span class="dm-house h2"></span><span class="dm-house h3"></span><i class="dm-pin"></i>',
  link:'<p class="dm-doc"><span class="dm-ref">Dana</span> called. <mark>She</mark> was late.</p><svg viewBox="0 0 200 60"><path class="dm-arc" d="M150 44 C 140 4 40 4 30 44" fill="none" stroke="#7A3FC7" stroke-width="3" stroke-dasharray="5 4"/></svg>',
  slots:'<span class="dm-ph"><b class="dm-l"></b>She</span><span class="dm-ph"><b>V</b>sleeps</span>'
};
function burst(el,col){
  if(!el||(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches))return;
  const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const cols=[col||"#874BF8","#0AC7FF","#00D441","#FFAD00"];
  for(let n=0;n<10;n++){const d=document.createElement("i");d.className="g-spark";d.style.left=cx+"px";d.style.top=cy+"px";d.style.background=cols[n%4];ROOT.appendChild(d);
    const a=n/10*Math.PI*2,dist=26+Math.random()*26;
    const an=d.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},{transform:"translate(calc(-50% + "+Math.cos(a)*dist+"px),calc(-50% + "+Math.sin(a)*dist+"px)) scale(.3)",opacity:0}],{duration:560,easing:"cubic-bezier(.2,.7,.2,1)"});
    an.onfinish=()=>d.remove();}
}
function flip(el,mutate){ // animate an element moving to its new place
  const a=el.getBoundingClientRect();mutate();const b=el.getBoundingClientRect();
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  el.animate([{transform:"translate("+(a.left-b.left)+"px,"+(a.top-b.top)+"px)"},{transform:"none"}],{duration:280,easing:"cubic-bezier(.2,.7,.2,1)"});
}
function progressBar(){const solved=cur.total-cur.queue.length+cur.pos;return '<div class="g-prog"><span class="g-prog-b"><i style="width:'+Math.round(Math.min(cur.pos,cur.queue.length)/cur.queue.length*100)+'%"></i></span><span>'+(cur.queue.length-cur.pos)+' left'+(cur.queue.length>cur.total?' (incl. '+(cur.queue.length-cur.total)+' to revisit)':'')+'</span></span></div>';}
function record(it,ok,again){ // first-attempt accuracy and mastery requeue
  if(!cur.seen.has(it._n)){cur.seen.add(it._n);if(ok)cur.right++;reportAnswer(ok);}
  if(again){cur.misses++;cur.queue.push(Object.assign({},it,{_again:true}));}
}
function feedback(el,ok,why,extra,again){if(again===undefined)again=!ok;
  el.className="g-fb show "+(ok?"good":"bad");
  el.innerHTML='<strong>'+(ok?"Correct!":"Not quite.")+'</strong>'+(extra||"")+fmtS(why||"")+(again?'<em class="g-again">You will see this one again at the end of the stage.</em>':'');
  sfx(ok?"ok":"no");if(ok)burst(el.querySelector("strong"));
}
function nextBtn(play,fn){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Continue";b.addEventListener("click",()=>{sfx("click");fn();});
  const bar=$(".g-bar",play)||play.appendChild(Object.assign(document.createElement("div"),{className:"g-bar"}));bar.innerHTML="";bar.appendChild(b);b.focus({preventScroll:true});}
function stageDone(){
  const c=cur.c,k=cur.k,st=caseState(c.id);
  if(!st.done.includes(k))st.done.push(k);
  if(!(k in st.first))st.first[k]=[cur.right,cur.total];
  const all=c.stages.every((_,n)=>st.done.includes(n));
  if(all)st.complete=true;save("prog",prog);
  const li=$('.g-steps li[data-k="'+k+'"]');if(li){li.classList.add("done");const sn=$(".g-sn",li);if(sn)sn.textContent="✓";}
  const nb=$('.g-steps li[data-k="'+(k+1)+'"] button');if(nb)nb.disabled=false;
  const play=$(".g-play");
  if(all){sfx("done");confetti();stageIntro(c,cur.i,null);return;}
  sfx("stage");
  play.innerHTML='<div class="g-done"><div class="g-stamp" aria-hidden="true">Stage '+(k+1)+'<b>cleared</b></div><div class="kicker">Stage complete</div><p class="g-learned"><b>Remember:</b> '+(cur.s.learned||"")+'</p><p class="g-sum">First attempt: '+cur.right+' of '+cur.total+(cur.misses?' · '+cur.misses+' item'+(cur.misses>1?"s":"")+' revisited':'')+'</p><div class="g-bar"></div></div>';
  let nk=k+1;while(nk<c.stages.length&&st.done.includes(nk))nk++;if(nk>=c.stages.length)nk=c.stages.findIndex((_,n)=>!st.done.includes(n));
  nextBtn(play,()=>openStage(c,cur.i,nk));
}
function step(play,render){ // drive the queue
  if(cur.pos>=cur.queue.length)return stageDone();
  const it=cur.queue[cur.pos];
  play.innerHTML=progressBar()+(it._again?'<div class="g-tag">Revisit</div>':"")+'<div class="g-item"></div><div class="g-fb" role="status"></div><div class="g-bar"></div>';
  render(it,$(".g-item",play),$(".g-fb",play),(ok,again)=>{record(it,ok,again===undefined?!ok:again);nextBtn(play,()=>{cur.pos++;step(play,render);});});
}

/* ---------------- ENGINES ---------------- */
const ENG={};

/* hunt: find every target word in a passage; wrong clicks get an explanation */
ENG.hunt=function(s,play){
  const items=cur.queue; // each item = one passage
  step(play,(it,box,fb,done)=>{
    const toks=it.text.match(/\{[^}]+\}|[A-Za-z0-9’'\-]+|[^\sA-Za-z0-9]+|\s+/g)||[];
    let need=0,found=0,miss=0;
    box.innerHTML='<div class="g-hunt-bar"><span class="g-count"></span><button type="button" class="g-lights">Turn on the lights</button></div><div class="g-doc g-torch">'+toks.map(t=>{
      if(/^\s+$/.test(t))return t;const tg=t[0]==="{";const w=tg?t.slice(1,-1):t;if(tg)need++;
      return /^[A-Za-z0-9]/.test(w)?'<button type="button" class="g-w" data-t="'+(tg?1:0)+'" data-w="'+esc(w)+'">'+esc(w)+'</button>':esc(w);}).join("")+'</div><div class="g-notes"></div>';
    const cnt=$(".g-count",box),notes=$(".g-notes",box),doc=$(".g-doc",box);
    const torchOK=window.matchMedia&&matchMedia("(pointer:fine)").matches&&!matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!torchOK){doc.classList.remove("g-torch");$(".g-lights",box).remove();}
    else{doc.addEventListener("pointermove",e=>{const r=doc.getBoundingClientRect();doc.style.setProperty("--mx",(e.clientX-r.left)+"px");doc.style.setProperty("--my",(e.clientY-r.top)+"px");});
      $(".g-lights",box).addEventListener("click",function(){doc.classList.remove("g-torch");this.remove();});}
    const upd=()=>cnt.innerHTML='<b>'+found+'</b> of '+need+' '+s.target+(need>1?"s":"")+' found';upd();
    $$(".g-w",box).forEach(b=>b.addEventListener("click",()=>{
      if(b.disabled)return;const w=b.dataset.w;
      if(b.dataset.t==="1"){b.disabled=true;b.classList.add("found");found++;sfx("pick");upd();burst(b);
        const n=it.notes&&it.notes[w];if(n){notes.insertAdjacentHTML("afterbegin",'<p class="g-note ok"><b>'+esc(w)+'</b> — '+n+'</p>');}
        if(found===need){doc.classList.remove("g-torch");feedback(fb,miss===0,it.why||"",miss?'<span class="g-lead">All found, with '+miss+' wrong selection'+(miss>1?"s":"")+'. </span>':'',false);done(miss===0,false);}
      }else{miss++;b.classList.add("wrong");setTimeout(()=>b.classList.remove("wrong"),600);sfx("no");
        const tr=(it.traps&&it.traps[w])||s.trap||"Not a "+s.target+" in this sentence. Apply the tests: position, form, and what it combines with.";
        notes.insertAdjacentHTML("afterbegin",'<p class="g-note bad"><b>'+esc(w)+'</b> — '+tr+'</p>');}
    }));
  });
};

/* sort: one card at a time, with its sentence; choose the right bin (tap or drag) */
ENG.sort=function(s,play){
  step(play,(it,box,fb,done)=>{
    box.innerHTML='<div class="g-card" draggable="true"><span class="g-card-w">'+it.w+'</span>'+(it.ctx?'<span class="g-card-c">'+fmtS(it.ctx)+'</span>':'')+'</div><div class="g-bins">'+
      s.bins.map(b=>'<button type="button" class="g-bin" data-b="'+esc(b)+'"><span>'+b+'</span></button>').join("")+'</div>';
    const card=$(".g-card",box);let over=null;
    card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain","x");});
    $$(".g-bin",box).forEach(b=>{
      b.addEventListener("dragover",e=>{e.preventDefault();b.classList.add("over");});
      b.addEventListener("dragleave",()=>b.classList.remove("over"));
      b.addEventListener("drop",e=>{e.preventDefault();b.classList.remove("over");choose(b);});
      b.addEventListener("click",()=>choose(b));
    });
    function choose(b){if(box.dataset.lock)return;box.dataset.lock=1;const ok=b.dataset.b===it.a;
      $$(".g-bin",box).forEach(x=>{x.disabled=true;if(x.dataset.b===it.a)x.classList.add("right");else if(x===b)x.classList.add("wrong");});
      if(ok&&card.animate&&!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){const a=card.getBoundingClientRect(),t=b.getBoundingClientRect();
        card.animate([{transform:"none",opacity:1},{transform:"translate("+(t.left+t.width/2-a.left-a.width/2)+"px,"+(t.top+t.height/2-a.top-a.height/2)+"px) scale(.25)",opacity:.2}],{duration:420,easing:"cubic-bezier(.5,0,.2,1)",fill:"forwards"});}
      else card.classList.add(ok?"in":"shake");feedback(fb,ok,it.why);done(ok);}
  });
};

/* forge: type the form a slot needs */
ENG.forge=function(s,play){
  step(play,(it,box,fb,done)=>{
    box.innerHTML='<p class="g-sent">'+fmtS(esc(it.s)).replace("___",'<span class="g-slot">?</span>')+'</p>'+(it.base?'<p class="g-base">Base word: <b>'+esc(it.base)+'</b></p>':'')+
      (it.chips?'<div class="g-chips">'+it.chips.map(c=>'<button type="button" class="g-chip">'+esc(c)+'</button>').join("")+'</div>':'')+
      '<div class="g-forge"><input type="text" class="txt" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the word"><button type="button" class="btn">Check</button></div>'+
      (it.hint?'<button type="button" class="g-hint">Show a hint</button><p class="g-hinttext" hidden>'+it.hint+'</p>':'');
    const inp=$("input",box),btn=$(".g-forge .btn",box);
    $$(".g-chip",box).forEach(ch=>ch.addEventListener("click",()=>{sfx("click");inp.value=ch.textContent;inp.focus();}));
    const h=$(".g-hint",box);if(h)h.addEventListener("click",()=>{h.hidden=true;$(".g-hinttext",box).hidden=false;});
    const go=()=>{if(inp.disabled||!inp.value.trim())return;inp.disabled=true;btn.disabled=true;const ok=it.a.some(a=>norm(a)===norm(inp.value));
      $(".g-slot",box).textContent=ok?inp.value.trim():it.a[0];$(".g-slot",box).classList.add(ok?"ok":"fix");
      feedback(fb,ok,it.why,ok?"":'<span class="g-lead">The answer is <b>'+esc(it.a[0])+'</b>. </span>');done(ok);};
    btn.addEventListener("click",go);inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}});
    inp.focus({preventScroll:true});
  });
};

/* fault: first locate the faulty word, then choose the repair */
ENG.fault=function(s,play){
  step(play,(it,box,fb,done)=>{
    const toks=it.s.match(/\[\[[^\]]+\]\]|[A-Za-z0-9’'\-]+|[^\sA-Za-z0-9]+|\s+/g)||[];
    box.innerHTML=(it.task?'<p class="g-task">'+it.task+'</p>':'')+'<p class="g-sent g-faultline">'+toks.map(t=>{
      if(/^\s+$/.test(t))return t;const f=t.startsWith("[[");const w=f?t.slice(2,-2):t;
      return /^[A-Za-z0-9]/.test(w)?'<button type="button" class="g-w" data-f="'+(f?1:0)+'">'+esc(w)+'</button>':esc(w);}).join("")+'</p><div class="g-repair" hidden></div><div class="g-notes"></div>';
    let firstTry=true;
    $$(".g-w",box).forEach(b=>b.addEventListener("click",()=>{if(box.dataset.lock)return;
      if(b.dataset.f==="1"){box.dataset.lock=1;b.classList.add("found");sfx("pick");const r=$(".g-repair",box);r.hidden=false;
        r.innerHTML='<p class="g-task">Now choose the correction:</p><div class="g-opts">'+shuffle(it.fix,it.s.length).map(f=>'<button type="button" class="opt">'+esc(f)+'</button>').join("")+'</div>';
        $$(".opt",r).forEach(o=>o.addEventListener("click",()=>{const ok=o.textContent===it.fix[0];$$(".opt",r).forEach(x=>{x.disabled=true;if(x.textContent===it.fix[0])x.classList.add("right");else if(x===o)x.classList.add("wrong");});
          if(ok){if(/^\(remove/.test(it.fix[0]))b.style.display="none";else b.textContent=it.fix[0];}feedback(fb,ok&&firstTry,it.why,ok&&!firstTry?'<span class="g-lead">Fixed, but it took more than one try to find the error. </span>':ok?'':'<span class="g-lead">The correction is <b>'+esc(it.fix[0])+'</b>. </span>',!ok);done(ok&&firstTry,!ok);}));
      }else{firstTry=false;b.classList.add("wrong");setTimeout(()=>b.classList.remove("wrong"),600);sfx("no");
        $(".g-notes",box).innerHTML='<p class="g-note bad"><b>'+esc(b.textContent)+'</b> is correct here. Look for a word whose class or form does not fit its position.</p>';}
    }));
  });
};

/* deduce: decide the class, then the evidence that proves it */
ENG.deduce=function(s,play){
  step(play,(it,box,fb,done)=>{
    box.innerHTML='<p class="g-sent">'+fmtS(esc(it.s)).replace(/\[\[(.+?)\]\]/,'<mark>$1</mark>')+'</p><p class="g-task"><b>1.</b> What is the highlighted word here?</p><div class="g-opts" data-q="1">'+
      it.classes.map(o=>'<button type="button" class="opt">'+esc(o)+'</button>').join("")+'</div><div class="g-ev" hidden><p class="g-task"><b>2.</b> Which evidence proves it?</p><div class="g-opts" data-q="2">'+
      shuffle(it.evidence.map((e,n)=>({e,n})),it.s.length).map(o=>'<button type="button" class="opt" data-n="'+o.n+'">'+o.e+'</button>').join("")+'</div></div>';
    let ok1=true;
    $$('[data-q="1"] .opt',box).forEach(o=>o.addEventListener("click",()=>{if(o.disabled)return;
      if(o.textContent===it.a){$$('[data-q="1"] .opt',box).forEach(x=>x.disabled=true);o.classList.add("right");sfx("pick");$(".g-ev",box).hidden=false;}
      else{ok1=false;o.disabled=true;o.classList.add("wrong");sfx("no");fb.className="g-fb show bad";fb.innerHTML='<strong>Not quite.</strong>'+(it.hint||"Look at the words just before and after it.");}
    }));
    $$('[data-q="2"] .opt',box).forEach(o=>o.addEventListener("click",()=>{const ok=+o.dataset.n===0;$$('[data-q="2"] .opt',box).forEach(x=>{x.disabled=true;if(+x.dataset.n===0)x.classList.add("right");else if(x===o)x.classList.add("wrong");});
      feedback(fb,ok&&ok1,it.why,!ok?'<span class="g-lead">That fact does not prove the class. </span>':!ok1?'<span class="g-lead">Good evidence, but the class took a second try. </span>':'');done(ok&&ok1);}));
  });
};

/* dialogue: speak to a character; a wrong choice produces a realistic misunderstanding */
ENG.dialogue=function(s,play){
  step(play,(it,box,fb,done)=>{
    box.innerHTML='<div class="g-chat">'+(it.lines||[]).map(l=>'<div class="g-line'+(l[0]==="You"?" me":"")+'"><b>'+l[0]+'</b><span>'+l[1]+'</span></div>').join("")+'</div><p class="g-task">'+it.prompt+'</p><div class="g-opts g-say">'+
      shuffle(it.options.map((o,n)=>({o,n})),it.prompt.length).map(x=>'<button type="button" class="opt" data-n="'+x.n+'">'+esc(x.o.t)+'</button>').join("")+'</div>';
    let first=true;
    $$(".g-say .opt",box).forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;const o=it.options[+b.dataset.n];
      const chat=$(".g-chat",box);chat.insertAdjacentHTML("beforeend",'<div class="g-line me"><b>You</b><span>'+esc(o.t)+'</span></div><div class="g-line g-typing"><b>'+it.who+'</b><span><i></i><i></i><i></i></span></div>');
      const tl=chat.lastElementChild;setTimeout(()=>{tl.classList.remove("g-typing");$("span",tl).innerHTML=o.reply;},(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)?0:650);
      if(o.ok){$$(".g-say .opt",box).forEach(x=>x.disabled=true);b.classList.add("right");feedback(fb,first,o.why||it.why,first?"":'<span class="g-lead">You reached the goal on a later attempt. </span>',false);done(first,false);}
      else{first=false;b.disabled=true;b.classList.add("wrong");sfx("no");fb.className="g-fb show bad";fb.innerHTML='<strong>That reply did not work.</strong>'+fmtS(o.why||"")+' Try another reply.';}
    }));
  });
};

/* rebuild: restore torn text by ordering pieces; optional decoy pieces */
ENG.rebuild=function(s,play){
  step(play,(it,box,fb,done)=>{
    const pieces=it.w.map((w,k)=>({w,k})).concat((it.decoy||[]).map((w,k)=>({w,k:"d"+k})));
    box.innerHTML=(it.ctx?'<p class="g-task">'+it.ctx+'</p>':'')+'<div class="g-strip" aria-label="Your sentence" data-empty="Tap the pieces below in order"></div><div class="g-pool">'+
      shuffle(pieces,it.w.join("").length+cur.pos).map(p=>'<button type="button" class="tile" data-k="'+p.k+'">'+esc(p.w)+'</button>').join("")+'</div><div class="g-bar2"><button type="button" class="btn" data-a="check">Check</button><button type="button" class="btn ghost" data-a="clear">Clear</button></div>';
    const strip=$(".g-strip",box),pool=$(".g-pool",box);
    $$(".tile",box).forEach(t=>t.addEventListener("click",()=>{if(t.disabled)return;sfx("click");flip(t,()=>(t.parentNode===pool?strip:pool).appendChild(t));}));
    $('[data-a="clear"]',box).addEventListener("click",()=>{$$(".tile",strip).forEach(t=>flip(t,()=>pool.appendChild(t)));});
    $('[data-a="check"]',box).addEventListener("click",function(){const sent=$$(".tile",strip).map(t=>t.textContent).join(" ");if(!sent)return;
      const ok=it.a.some(a=>norm(a)===norm(sent));$$(".tile",box).forEach(t=>t.disabled=true);this.disabled=true;$('[data-a="clear"]',box).disabled=true;
      strip.classList.add(ok?"ok":"bad");feedback(fb,ok,it.why,ok?"":'<span class="g-lead">Restored text: <b>'+esc(it.a[0])+'</b>. </span>');done(ok);});
  });
};

/* map: interpret prepositional descriptions on a street plan */
ENG.map=function(s,play){
  const M=s.plan;
  step(play,(it,box,fb,done)=>{
    let svg='<svg viewBox="0 0 '+M.w+' '+M.h+'" class="g-plan" role="group" aria-label="Street plan">';
    svg+='<rect width="'+M.w+'" height="'+M.h+'" fill="var(--g-sky)" rx="10"/>';
    (M.roads||[]).forEach(r=>{svg+='<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'" fill="var(--g-road)"/>'+(r[4]?'<text x="'+(r[0]+r[2]/2)+'" y="'+(r[1]+r[3]/2+4)+'" text-anchor="middle" font-size="11" fill="var(--ink3)" letter-spacing="1">'+r[4]+'</text>':'');});
    (M.deco||[]).forEach(d=>{svg+=d;});
    const RC=["#874BF8","#0AAFFF","#FF631E","#00D441","#FFAD00"];
    M.spots.forEach((p,q)=>{svg+='<g class="g-spot" tabindex="0" role="button" data-id="'+p.id+'" aria-label="'+esc(p.label)+'"><rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="8" fill="#fff" stroke="#C4B5EA" stroke-width="1.5"/><rect x="'+(p.x+1)+'" y="'+(p.y+1)+'" width="'+(p.w-2)+'" height="9" rx="7" fill="'+RC[q%5]+'"/><text x="'+(p.x+p.w/2)+'" y="'+(p.y+p.h/2+4)+'" text-anchor="middle" font-size="12" fill="var(--ink)">'+esc(p.label)+'</text></g>';});
    svg+='</svg>';
    box.innerHTML='<div class="g-brief-mini"><b>'+(it.from||"Message")+':</b> '+it.instr+'</div><div class="g-mapbox">'+svg+'</div>';
    $$(".g-spot",box).forEach(g=>{const act=()=>{if(box.dataset.lock)return;box.dataset.lock=1;const ok=g.dataset.id===it.a;
      $$(".g-spot",box).forEach(x=>{if(x.dataset.id===it.a)x.classList.add("right");else if(x===g)x.classList.add("wrong");});
      const mb=$(".g-mapbox",box),gr=g.getBoundingClientRect(),br=mb.getBoundingClientRect(),pin=document.createElement("i");pin.className="g-pin"+(ok?"":" bad");pin.style.left=(gr.left-br.left+gr.width/2)+"px";pin.style.top=(gr.top-br.top+gr.height/2)+"px";mb.appendChild(pin);
      feedback(fb,ok,it.why);done(ok);};g.addEventListener("click",act);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act();}});});
  });
};

/* link: trace what a pronoun refers to */
ENG.link=function(s,play){
  step(play,(it,box,fb,done)=>{
    let n=0;const html=esc(it.text).replace(/&lt;&lt;(.+?)&gt;&gt;/g,(m,w)=>'<button type="button" class="g-cand" data-n="'+(n++)+'">'+w+'</button>').replace(/\[\[(.+?)\]\]/,'<mark>$1</mark>');
    box.innerHTML='<p class="g-task">Who or what does <mark>'+it.p+'</mark> refer to?</p><div class="g-doc">'+html+'</div>';
    $$(".g-cand",box).forEach(b=>b.addEventListener("click",()=>{if(box.dataset.lock)return;box.dataset.lock=1;const ok=+b.dataset.n===it.a;
      $$(".g-cand",box).forEach(x=>{if(+x.dataset.n===it.a)x.classList.add("right");else if(x===b)x.classList.add("wrong");});
      const doc=$(".g-doc",box),m=$(".g-doc mark",box),tgt=$('.g-cand[data-n="'+it.a+'"]',box);
      if(m&&tgt){const r=doc.getBoundingClientRect(),A=m.getBoundingClientRect(),B=tgt.getBoundingClientRect();const x1=A.left+A.width/2-r.left,y1=A.top-r.top,x2=B.left+B.width/2-r.left,y2=B.top-r.top;
        const top=Math.min(y1,y2)-28;doc.insertAdjacentHTML("beforeend",'<svg class="g-arc" viewBox="0 0 '+r.width+' '+r.height+'" aria-hidden="true"><path d="M'+x1+' '+y1+' C '+x1+' '+top+' '+x2+' '+top+' '+x2+' '+y2+'" fill="none" stroke="var(--c-pr)" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="'+x2+'" cy="'+y2+'" r="4" fill="var(--c-pr)"/></svg>');}
      feedback(fb,ok,it.why);done(ok);}));
  });
};

/* slots: label every phrase of a clause with its function */
ENG.slots=function(s,play){
  const L=s.labels;
  step(play,(it,box,fb,done)=>{
    box.innerHTML='<div class="g-slots">'+
      it.phr.map((p,k)=>'<button type="button" class="g-ph" data-k="'+k+'" data-v="-1"><span class="g-ph-l">?</span><span class="g-ph-w">'+esc(p)+'</span></button>').join("")+
      '</div><p class="g-legend">'+L.map(l=>'<b>'+l[0]+'</b> '+l[1]).join(" · ")+'</p><div class="g-bar2"><button type="button" class="btn" data-a="check">Check</button></div>';
    $$(".g-ph",box).forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;sfx("click");const v=(+b.dataset.v+1)%L.length;b.dataset.v=v;$(".g-ph-l",b).textContent=L[v][0];}));
    $('[data-a="check"]',box).addEventListener("click",function(){const bs=$$(".g-ph",box);if(bs.some(b=>b.dataset.v==="-1")){fb.className="g-fb show bad";fb.innerHTML="<strong>Not finished.</strong>Give every part a label first.";return;}
      let ok=true;bs.forEach((b,k)=>{b.disabled=true;const want=it.a[k];if(L[+b.dataset.v][0]===want)b.classList.add("right");else{ok=false;b.classList.add("wrong");$(".g-ph-l",b).textContent=L[+b.dataset.v][0]+" → "+want;}});
      this.disabled=true;feedback(fb,ok,it.why);done(ok);});
  });
};

/* ---------------- DESIGN DOSSIER ---------------- */
function dossierHTML(){return GAME_DOSSIER||"";}

/* ---------------- routing hooks used by app.js ---------------- */
return {
  route(id,view){
    if(id==="bureau"){WD.setGuide("spark");view.innerHTML=hubHTML();
      $("#gSnd").addEventListener("click",function(){soundOn=!soundOn;save("sound",soundOn);this.textContent=soundOn?"🔊":"🔇";this.setAttribute("aria-pressed",soundOn);sfx("click");});
      return true;}
    if(id==="bureau-design"){view.innerHTML=dossierHTML();return true;}
    if(id.startsWith("case-")){const i=CASES.findIndex(c=>"case-"+c.id===id);if(i<0)return false;
      openCase(CASES[i],i);return true;}
    return false;
  },
  caseFor(unit){const i=CASES.findIndex(c=>c.unit===unit||c.also===unit);return i<0?null:{c:CASES[i],i:i,un:isUnlocked(i),st:prog[CASES[i].id]};},
  cases:CASES,
  _state(){return cur;},
  _close(){if(ac){try{ac.close()}catch(e){}ac=null;}}
};
})();


const APP=(function(){
const LANGS=["en","kk","ru"];
const UI={
  map:{en:"Course map",kk:"Курс картасы",ru:"Карта курса"},
  refs:{en:"References",kk:"Әдебиеттер",ru:"Литература"},
  start:{en:"Start here",kk:"Осыдан бастаңыз",ru:"Начните отсюда"},
  units:{en:"Units",kk:"Бөлімдер",ru:"Разделы"},
  unit:{en:"Unit",kk:"Бөлім",ru:"Раздел"},
  plan:{en:"Lesson goals",kk:"Сабақ мақсаттары",ru:"Цели урока"},
  obj:{en:"Learning objectives",kk:"Оқу мақсаттары",ru:"Цели обучения"},
  con:{en:"Concepts covered",kk:"Қамтылатын ұғымдар",ru:"Рассматриваемые понятия"},
  pre:{en:"Prerequisites",kk:"Алдын ала қажет білім",ru:"Необходимые знания"},
  app:{en:"Speaking and writing application",kk:"Ауызша және жазбаша қолдану",ru:"Применение в устной и письменной речи"},
  out:{en:"Expected outcomes",kk:"Күтілетін нәтижелер",ru:"Ожидаемые результаты"},
  str:{en:"How this unit is built",kk:"Бөлімнің құрылымы",ru:"Как построен раздел"},
  practice:{en:"Practice",kk:"Жаттығу",ru:"Практика"},
  practiceLede:{en:"Each task gives feedback that explains the grammar, not just the answer. Tasks are in English; the explanations above are available in all three languages.",kk:"Әр тапсырма тек дұрыс жауапты емес, оның грамматикалық себебін де түсіндіреді. Тапсырмалар ағылшын тілінде; жоғарыдағы түсіндірмелер үш тілде қолжетімді.",ru:"Каждое задание объясняет не только правильный ответ, но и его грамматическую причину. Задания даны на английском; объяснения выше доступны на трёх языках."},
  check:{en:"Check answer",kk:"Жауапты тексеру",ru:"Проверить ответ"},
  next:{en:"Next question",kk:"Келесі сұрақ",ru:"Следующий вопрос"},
  again:{en:"Do it again",kk:"Қайта орындау",ru:"Пройти ещё раз"},
  seeRes:{en:"See my score",kk:"Нәтижемді көру",ru:"Мой результат"},
  nextAct:{en:"Next activity",kk:"Келесі жаттығу",ru:"Следующее задание"},
  mLearn:{en:"Learn",kk:"Үйрену",ru:"Изучение"},
  mLearnSub:{en:"Read and explore",kk:"Оқы және зертте",ru:"Читай и исследуй"},
  mPractice:{en:"Practice",kk:"Жаттығу",ru:"Практика"},
  mPracticeSub:{en:"Use what you learned",kk:"Үйренгеніңді қолдан",ru:"Применяй выученное"},
  rdyH:{en:"Ready to use it?",kk:"Қолдануға дайынсың ба?",ru:"Готов применить?"},
  rdyBtn:{en:"Start practice",kk:"Жаттығуды бастау",ru:"Начать практику"},
  backLearn:{en:"Back to the lesson",kk:"Сабаққа оралу",ru:"Назад к уроку"},
  allDone:{en:"All activities done",kk:"Барлық жаттығу орындалды",ru:"Все задания выполнены"},
  reset:{en:"Reset",kk:"Тазалау",ru:"Сбросить"},
  model:{en:"Show a model answer",kk:"Үлгі жауапты көрсету",ru:"Показать образец"},
  correct:{en:"Correct.",kk:"Дұрыс.",ru:"Верно."},
  notq:{en:"Not quite.",kk:"Толық дұрыс емес.",ru:"Не совсем."},
  accepted:{en:"Accepted answer:",kk:"Дұрыс жауап:",ru:"Правильный ответ:"},
  of:{en:"of",kk:"/",ru:"из"},
  item:{en:"Question",kk:"Сұрақ",ru:"Вопрос"},
  score:{en:"Your score",kk:"Нәтижеңіз",ru:"Ваш результат"},
  words:{en:"words",kk:"сөз",ru:"слов"},
  selfcheck:{en:"Check your text against these points:",kk:"Мәтініңізді осы талаптар бойынша тексеріңіз:",ru:"Проверьте свой текст по этим пунктам:"},
  prev:{en:"Previous",kk:"Алдыңғы",ru:"Назад"},
  nextu:{en:"Next",kk:"Келесі",ru:"Далее"},
  legend:{en:"Colour key",kk:"Түстер белгісі",ru:"Цветовые обозначения"},
  typeHere:{en:"Type your answer",kk:"Жауабыңызды жазыңыз",ru:"Введите ответ"},
  select:{en:"Select the words, then press Check.",kk:"Сөздерді белгілеп, «Тексеру» батырмасын басыңыз.",ru:"Выберите слова и нажмите «Проверить»."},
  build:{en:"Tap a placed word to send it back.",kk:"Орнатылған сөзді басса, ол орнына қайтады.",ru:"Нажмите на поставленное слово, чтобы вернуть его."},
  edit:{en:"Edit the sentence so that it is correct.",kk:"Сөйлемді дұрыс болатындай түзетіңіз.",ru:"Исправьте предложение."},
  saved:{en:"Your draft is saved on this device.",kk:"Жобаңыз осы құрылғыда сақталады.",ru:"Черновик сохраняется на этом устройстве."},
  game:{en:"Game: the cases",kk:"Ойын: істер",ru:"Игра: расследования"},
  gameCase:{en:"Game · Case",kk:"Ойын · Іс",ru:"Игра · Дело"},
  gameEnter:{en:"Start the quest →",kk:"Квесті бастау →",ru:"Начать квест →"},
  gameClosed:{en:"Quest complete · replay →",kk:"Квест аяқталды · қайта өту →",ru:"Квест пройден · пройти снова →"},
  gameLocked:{en:"Locked: close the previous case first",kk:"Жабық: алдымен алдыңғы істі жабыңыз",ru:"Закрыто: сначала закройте предыдущее дело"},
  answered:{en:"Answer chosen",kk:"Жауап таңдалды",ru:"Ответ выбран"},
  contents:{en:"Contents",kk:"Мазмұны",ru:"Содержание"},
  hKick:{en:"Just to Study · Grammar · A0–C2",kk:"Just to Study · Грамматика · A0–C2",ru:"Just to Study · Грамматика · A0–C2"},
  hTitle:{en:"Parts of <em>Speech</em>",kk:"Сөз <em>таптары</em>",ru:"Части <em>речи</em>"},
  hLede:{en:"Every English word does a job in its sentence. Learn to see that job, explain it and use it, from your first nouns and verbs to the cases grammarians still debate.",kk:"Ағылшын тіліндегі әр сөз сөйлемде өз қызметін атқарады. Сол қызметті көруге, түсіндіруге және қолдануға үйреніңіз: алғашқы зат есім мен етістіктен бастап грамматистер әлі де талқылап жүрген жағдайларға дейін.",ru:"Каждое английское слово выполняет в предложении свою работу. Научитесь видеть эту работу, объяснять её и использовать: от первых существительных и глаголов до случаев, о которых грамматисты спорят до сих пор."},
  hGo:{en:"Start learning",kk:"Оқуды бастау",ru:"Начать обучение"},
  hPlay:{en:"Play the game",kk:"Ойынды бастау",ru:"Играть"},
  lsK:{en:"Try it",kk:"Байқап көріңіз",ru:"Попробуйте"},
  lsH:{en:"One sentence, every job",kk:"Бір сөйлем — барлық қызмет",ru:"Одно предложение — все функции"},
  lsI:{en:"Tap a word to see what it does in the sentence.",kk:"Сөздің сөйлемде не істейтінін көру үшін оны басыңыз.",ru:"Нажмите на слово, чтобы увидеть, что оно делает в предложении."},
  lsAll:{en:"Play the whole sentence",kk:"Бүкіл сөйлемді көрсету",ru:"Показать всё предложение"},
  lsStart:{en:"Each word class does a different job. Start with <i>jumped</i> or <i>small</i>.",kk:"Әр сөз табы әртүрлі қызмет атқарады. <i>jumped</i> немесе <i>small</i> сөзінен бастаңыз.",ru:"Каждая часть речи выполняет свою работу. Начните с <i>jumped</i> или <i>small</i>."},
  hOne:{en:"One word",kk:"Бір сөз",ru:"Одно слово"},
  mUnits:{en:"units",kk:"бөлім",ru:"разделов"},
  mActs:{en:"practice activities",kk:"жаттығу",ru:"упражнений"},
  mCases:{en:"game cases",kk:"ойын ісі",ru:"игровых дел"},
  mLangs:{en:"translations under every paragraph",kk:"әр абзац астындағы аударма",ru:"перевода под каждым абзацем"},
  dReadK:{en:"Read and practise",kk:"Оқу және жаттығу",ru:"Читать и практиковаться"},
  dReadH:{en:"Sixteen units",kk:"Он алты бөлім",ru:"Шестнадцать разделов"},
  dReadP:{en:"Clear English explanations grounded in the reference grammars, with Kazakh and Russian translations available under every paragraph. Every unit ends with practice whose feedback explains the grammar, not only the answer.",kk:"Анықтамалық грамматикаларға негізделген түсінікті ағылшынша түсіндірмелер; әр абзацтың астынан қазақша және орысша аудармасын ашуға болады. Әр бөлім кері байланысы тек жауапты емес, грамматиканы да түсіндіретін жаттығулармен аяқталады.",ru:"Понятные объяснения на английском языке на основе справочных грамматик; под каждым абзацем можно открыть перевод на казахский и русский. Каждый раздел завершается практикой, обратная связь в которой объясняет грамматику, а не только ответ."},
  dReadGo:{en:"Start reading",kk:"Оқуды бастау",ru:"Начать чтение"},
  dPlayK:{en:"Play",kk:"Ойын",ru:"Игра"},
  dPlayP:{en:"Thirteen cases in a city where words have slipped out of place. Investigate, repair and explain: every case is built on one unit. The cases are in English.",kk:"Сөздер орнынан ауып кеткен қаладағы он үш іс. Іздеңіз, түзетіңіз және түсіндіріңіз: әр іс бір бөлімге негізделген. Істер ағылшын тілінде.",ru:"Тринадцать дел в городе, где слова оказались не на своих местах. Ищите, исправляйте и объясняйте: каждое дело построено на одном разделе. Дела ведутся на английском языке."},
  dPlayGo:{en:"Enter the city",kk:"Қалаға кіру",ru:"Войти в город"},
  tocK:{en:"Contents",kk:"Мазмұны",ru:"Содержание"},
  tocH:{en:"From word to clause",kk:"Сөзден сөйлемге",ru:"От слова к предложению"},
  tocP:{en:"Six stages, sixteen units. Each unit can be read on its own, but the order builds every idea on the one before it.",kk:"Алты кезең, он алты бөлім. Әр бөлімді жеке оқуға болады, бірақ реті әр идея алдыңғысына сүйенетіндей құрылған.",ru:"Шесть этапов, шестнадцать разделов. Каждый раздел можно читать отдельно, но порядок выстроен так, что каждая идея опирается на предыдущую."},
  design:{en:"Design notes",kk:"Дизайн туралы",ru:"Заметки о дизайне"},
  stageW:{en:"Stage",kk:"Кезең",ru:"Этап"},
  /* world layer */
  wKick:{en:"Just to Study · Grammar · A0–C2",kk:"Just to Study · Грамматика · A0–C2",ru:"Just to Study · Грамматика · A0–C2"},
  wTitle:{en:"Parts of Speech <em>World</em>",kk:"Parts of Speech <em>World</em>",ru:"Parts of Speech <em>World</em>"},
  wLede:{en:"Every word has a job. Explore the islands and find out what each word does.",kk:"Әр сөздің өз қызметі бар. Аралдарды аралап, әр сөздің не істейтінін біл.",ru:"У каждого слова своя работа. Исследуй острова и узнай, что делает каждое слово."},
  wBegin:{en:"Start",kk:"Бастау",ru:"Начать"},
  wCont:{en:"Continue",kk:"Жалғастыру",ru:"Продолжить"},
  wQuests:{en:"Quests",kk:"Квестер",ru:"Квесты"},
  wExplore:{en:"Explore",kk:"Зерттеу",ru:"Исследовать"},
  wTeamK:{en:"The team",kk:"Команда",ru:"Команда"},
  wTeamH:{en:"You won't travel alone",kk:"Сен жалғыз емессің",ru:"Ты не будешь путешествовать один"},
  wMapK:{en:"The map",kk:"Карта",ru:"Карта"},
  wMapH:{en:"Choose an island",kk:"Аралды таңда",ru:"Выбери остров"},
  wMapP:{en:"Each island is home to one family of words. Follow the route in order, or jump to the island you need. Every lesson ends with practice, and every island has a quest.",
    kk:"Әр арал бір сөз табының мекені. Бағытпен ретімен жүр немесе өзіңе қажет аралға бірден өт. Әр сабақ жаттығумен аяқталады, ал әр аралда квест бар.",
    ru:"Каждый остров — дом одной семьи слов. Иди по маршруту по порядку или сразу переходи на нужный остров. Каждый урок заканчивается практикой, а на каждом острове есть квест."},
  wNextK:{en:"Your next step",kk:"Келесі қадамың",ru:"Твой следующий шаг"},
  wLesson:{en:"Lesson",kk:"Сабақ",ru:"Урок"},
  wLessons:{en:"lessons",kk:"сабақ",ru:"уроков"},
  wIsland:{en:"Island",kk:"Арал",ru:"Остров"},
  wQuest:{en:"Quest",kk:"Квест",ru:"Квест"},
  wOpen:{en:"Open",kk:"Ашу",ru:"Открыть"},
  wDone:{en:"Done",kk:"Өтті",ru:"Пройдено"},
  wWorld:{en:"World map",kk:"Әлем картасы",ru:"Карта мира"},
  wOnPage:{en:"On this page",kk:"Осы бетте",ru:"На этой странице"},
  wPractice:{en:"Practice trail",kk:"Жаттығу соқпағы",ru:"Тропа практики"},
  wPracticeP:{en:"Your turn. Every answer comes back with an explanation of the grammar, so a mistake is a clue, not a failure.",
    kk:"Енді сенің кезегің. Әр жауаптан кейін грамматикалық түсіндірме беріледі, сондықтан қате — сәтсіздік емес, із.",
    ru:"Твоя очередь. После каждого ответа ты получишь объяснение грамматики, так что ошибка — это подсказка, а не провал."},
  wChallenge:{en:"Challenge",kk:"Тапсырма",ru:"Задание"},
  wNextStop:{en:"Next stop",kk:"Келесі аялдама",ru:"Следующая остановка"},
  wPrevStop:{en:"Previous stop",kk:"Алдыңғы аялдама",ru:"Предыдущая остановка"},
  wLabels:{en:"Labels",kk:"Белгілер",ru:"Подписи"},
  wHover:{en:"Point at a coloured word to light up its whole family.",kk:"Түсті сөзді нұсқасаң, оның бүкіл тобы жарқырайды.",ru:"Наведи на цветное слово, и подсветится вся его семья."},
  wProgress:{en:"lessons completed",kk:"сабақ аяқталды",ru:"уроков пройдено"},
  wPlayQuest:{en:"Play the island quest",kk:"Арал квесін ойнау",ru:"Сыграть квест острова"},
  wXK:{en:"Explore the island",kk:"Аралды зертте",ru:"Исследуй остров"},
  wXP:{en:"Every object here has a word. Tap a glowing point to wake the word up and see the job it does.",kk:"Мұндағы әр заттың өз сөзі бар. Сөзді оятып, оның қызметін көру үшін жарқыраған нүктені бас.",ru:"У каждого предмета здесь есть своё слово. Нажми на светящуюся точку, чтобы разбудить слово и увидеть, какую работу оно выполняет."},
  wXAll:{en:"Show all",kk:"Барлығын көрсету",ru:"Показать все"},
  wXHint:{en:"Tap a light.",kk:"Жарықты бас.",ru:"Нажми на огонёк."},
};
const CLS={n:"noun",pr:"pronoun",det:"determiner",v:"verb",aux:"auxiliary",adj:"adjective",adv:"adverb",p:"preposition",cj:"conjunction",i:"interjection"};
const CLS_T={
  n:{en:"noun",kk:"зат есім",ru:"существительное"},pr:{en:"pronoun",kk:"есімдік",ru:"местоимение"},
  det:{en:"determiner",kk:"детерминатив",ru:"детерминатив"},v:{en:"lexical verb",kk:"негізгі етістік",ru:"смысловой глагол"},
  aux:{en:"auxiliary",kk:"көмекші етістік",ru:"вспомогательный глагол"},adj:{en:"adjective",kk:"сын есім",ru:"прилагательное"},
  adv:{en:"adverb",kk:"үстеу",ru:"наречие"},p:{en:"preposition",kk:"предлог",ru:"предлог"},
  cj:{en:"conjunction",kk:"жалғаулық",ru:"союз"},i:{en:"interjection",kk:"одағай",ru:"междометие"}
};

/* ---------- storage ---------- */
// хранилище прототипа pos:* — прогресс аккаунта (progress), язык перевода (tl → cfg.lang / cfg.onLang), подписи и
// черновики письма — устройство
function load(k,d){if(k==="tl")return {kk:startLang==="kk",ru:startLang==="ru"};if(k==="progress")return STATE.acts;if(k==="labels")return PREFS.labels===true;
  if(k.indexOf("draft:")===0){const t=DRAFTS[k.slice(6)];return typeof t==="string"?t:d;}return d;}
function save(k,v){if(k==="tl"){try{onLang(v.kk?"kk":v.ru?"ru":"en")}catch(e){}}else if(k==="labels"){PREFS.labels=!!v;savePrefs();}
  else if(k.indexOf("draft:")===0)saveDraft(k.slice(6),v);else pushState();}
const lang="en"; // interface and explanations are always English
let SHOW=load("tl",{kk:false,ru:false}); if(!SHOW||typeof SHOW!=="object") SHOW={kk:false,ru:false}; if(SHOW.kk&&SHOW.ru) SHOW={kk:true,ru:false};
const TL_LABEL={kk:"ҚАЗ",ru:"РУС"};
const activeTL=()=>["kk","ru"].filter(l=>SHOW[l]);
const progress=load("progress",{});

/* ---------- text helpers ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function fmt(s){
  return String(s)
   .replace(/\[(n|pr|det|v|aux|adj|adv|p|cj|i|f):([^\]]+)\]/g,(m,c,w)=>'<span class="w w-'+c+'" title="'+(c==="f"?"function":CLS[c])+'">'+w+'</span>')
   .replace(/\{x:([^}]+)\}/g,'<span class="x"><span class="sr">incorrect: </span>$1</span>')
   .replace(/\{ok:([^}]+)\}/g,'<span class="ok"><span class="sr">correct: </span>$1</span>');
}
const TR=new Map(); let trId=0;
/* Translatable element. The English text is always rendered. With mode "bi" the active
   translations (Kazakh and/or Russian) are placed directly under the English block they translate.
   Mode "en" (navigation, labels, buttons) shows English only. */
const BI_TAGS=["h1","h2","h3","p","div","small","b"];
function tr(obj,tag,attrs,mode){
  const id="t"+(trId++); TR.set(id,obj);
  const t=tag||"span", m=mode||(BI_TAGS.includes(t)?"bi":"en");
  return "<"+t+' data-tr="'+id+'" data-m="'+m+'"'+(attrs?" "+attrs:"")+">"+bi(obj,m)+"</"+t+">";
}
const ui=(k,tag,attrs,mode)=>tr(UI[k],tag,attrs,mode||"en");
const BLOCK_RE=/<(p|div|ul|ol|table|h[1-6])[\s>]/i;
const nTxt=x=>String(x||"").replace(/\s+/g," ").trim();
function trl(l,html,tag){return "<"+(tag||"span")+' class="trl" lang="'+l+'" data-l="'+TL_LABEL[l]+'">'+html+"</"+(tag||"span")+">";}
function bi(obj,mode){
  if(obj==null) return "";
  if(typeof obj!=="object") return fmt(obj);
  const en=fmt(obj.en!=null?obj.en:"");
  if(mode==="term"){const l=activeTL()[0];const t=l&&obj[l]!=null&&nTxt(obj[l])!==nTxt(obj.en)?'<span class="term-tl" lang="'+l+'">'+fmt(obj[l])+'</span>':"";return '<span class="term-en">'+en+'</span>'+t;}
  const act=mode==="bi"?activeTL().filter(l=>obj[l]!=null&&nTxt(obj[l])!==nTxt(obj.en)):[];
  if(!act.length) return en;
  if(!BLOCK_RE.test(obj.en)) return en+act.map(l=>trl(l,fmt(obj[l]))).join("");
  return flow(en,act.map(l=>[l,fmt(obj[l])]));
}
/* Align the English HTML with each translation block by block and insert each
   translation right after the English block it corresponds to. */
const TL_MISS=[];
function frag(h){const d=document.createElement("div");d.innerHTML=h;return d;}
function leafy(el){
  if(/^(P|H[1-6]|LI|TD|TH|DT|DD|FIGCAPTION|BLOCKQUOTE)$/.test(el.tagName)) return true;
  if(el.tagName==="SPAN"||el.tagName==="B"||el.tagName==="I"||el.tagName==="EM"||el.tagName==="STRONG") return true;
  for(const n of el.childNodes) if(n.nodeType===3&&n.textContent.trim()) return true;
  return el.children.length===0;
}
function place(el,pairs){
  // pairs: [[lang, translatedElement]]
  const diff=pairs.filter(([l,o])=>nTxt(o.textContent)!==nTxt(el.textContent));
  if(!diff.length) return;
  const t=el.tagName;
  if(/^(P|H[1-6]|BLOCKQUOTE)$/.test(t)){
    let ref=el; diff.forEach(([l,o])=>{const w=frag(trl(l,o.innerHTML,"div")).firstChild; if(/^H/.test(t)) w.classList.add("trl-h"); ref.after(w); ref=w;});
  } else {
    diff.forEach(([l,o])=>el.insertAdjacentHTML("beforeend",trl(l,o.innerHTML,el.tagName==="SPAN"||el.tagName==="LI"||el.tagName==="TD"||el.tagName==="TH"?"span":"div")));
  }
}
function walk(e,pairs,path){
  const ec=[...e.children];
  const ok=pairs.every(([l,o])=>{const oc=[...o.children];return oc.length===ec.length&&oc.every((x,i)=>x.tagName===ec[i].tagName);});
  if(!ok){
    TL_MISS.push(path+" :: en "+ec.map(x=>x.tagName).join(",")+" | "+pairs.map(([l,o])=>l+" "+[...o.children].map(x=>x.tagName).join(",")).join(" | "));
    pairs.forEach(([l,o])=>{if(nTxt(o.textContent)!==nTxt(e.textContent)) e.insertAdjacentHTML("beforeend",trl(l,o.innerHTML,"div"));});
    return;
  }
  ec.forEach((el,i)=>{
    const sub=pairs.map(([l,o])=>[l,o.children[i]]);
    if(sub.every(([l,o])=>nTxt(o.textContent)===nTxt(el.textContent))) return;
    if(leafy(el)) place(el,sub); else walk(el,sub,path+">"+el.tagName+(el.className?"."+el.className.split(" ")[0]:"")+"["+i+"]");
  });
}
function flow(enHTML,list){
  const E=frag(enHTML);
  walk(E,list.map(([l,h])=>[l,frag(h)]),"root");
  return E.innerHTML;
}
const uiTxt=k=>UI[k][lang]||UI[k].en;

/* ---------- navigation ---------- */
const side=$id("side"), view=$id("view");
const W=WORLD;
/* every topic has its own colour and sign, taken from the word class it teaches */
const UCLS={u02:"n",u03:"pr",u04:"det",u05:"v",u06:"aux",u07:"adj",u08:"adv",u09:"p",u10:"cj",u11:"i"};
const ICO={
 n:'<rect x="4.5" y="7" width="15" height="12.5" rx="2.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/>',
 pr:'<circle cx="9" cy="12" r="5"/><circle cx="15.5" cy="12" r="5" stroke-dasharray="2.4 2.2"/>',
 det:'<path d="M4 18 15.5 6.5"/><path d="M10 6.5h5.5V12"/><circle cx="18.5" cy="18" r="2"/>',
 v:'<path d="M3 14h7l-2 6 13-11h-7l2-6z"/>',
 aux:'<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
 adj:'<path d="M12 3.5c3 4.2 5.5 7.2 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 10.7 9 7.7 12 3.5z"/>',
 adv:'<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.5-5"/><circle cx="12" cy="16" r="1.4"/>',
 p:'<rect x="5" y="13" width="14" height="7" rx="1.5"/><circle cx="12" cy="7.5" r="3"/>',
 cj:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 i:'<path d="M12 4v10"/><circle cx="12" cy="19" r="1.2"/><path d="M5.5 7 7.5 9M18.5 7 16.5 9"/>',
 f:'<rect x="4" y="14" width="16" height="5" rx="1.5"/><rect x="6.5" y="8.5" width="11" height="5" rx="1.5"/><rect x="9" y="3" width="6" height="5" rx="1.5"/>'
};
const ucls=id=>UCLS[id]||"f";
const ACT_DO={
 tag:{en:"Tap the words",kk:"Сөздерді белгіле",ru:"Отметь слова"},
 classify:{en:"Choose the answer",kk:"Жауапты таңда",ru:"Выбери ответ"},
 gap:{en:"Type the word",kk:"Сөзді жаз",ru:"Впиши слово"},
 fix:{en:"Fix the mistake",kk:"Қатені түзет",ru:"Исправь ошибку"},
 order:{en:"Build the sentence",kk:"Сөйлем құрастыр",ru:"Собери предложение"},
 write:{en:"Write your own",kk:"Өзің жаз",ru:"Напиши сам"}
};
const ACT_DO_ID={u01a3:{en:"Find the verbs",kk:"Етістіктерді тап",ru:"Найди глаголы"},u02a1:{en:"Find the nouns",kk:"Зат есімдерді тап",ru:"Найди существительные"},u07a1:{en:"Find the adjectives",kk:"Сын есімдерді тап",ru:"Найди прилагательные"},u06a2:{en:"Build the question",kk:"Сұрақ құрастыр",ru:"Собери вопрос"},u08a4:{en:"Find the adverbs",kk:"Үстеулерді тап",ru:"Найди наречия"},u08a5:{en:"Name the type",kk:"Түрін анықта",ru:"Определи тип"},u08a6:{en:"Choose by meaning",kk:"Мағынасына қарай таңда",ru:"Выбери по смыслу"}};
const ACT_ICO={
 tag:'<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a5.5 5.5 0 0 1-5.5 5.5h-.6a5 5 0 0 1-4-2l-2.6-3.6a1.5 1.5 0 0 1 2.3-1.9L9 14"/>',
 classify:'<rect x="3.5" y="5" width="7" height="14" rx="2"/><rect x="13.5" y="5" width="7" height="14" rx="2"/><path d="m15.5 12 1.5 1.5 2.5-3"/>',
 gap:'<path d="M3 17h5M16 17h5"/><path d="M10 17h4" stroke-dasharray="1.5 1.8"/><path d="M12 13V5M9.5 7.5 12 5l2.5 2.5"/>',
 fix:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 order:'<rect x="3" y="4" width="8" height="6" rx="1.5"/><rect x="13" y="4" width="8" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/>',
 write:'<path d="M4 6h16M4 11h16M4 16h9"/><path d="m15 20 1-3 4.5-4.5 2 2L18 19z"/>'
};
const actDo=a=>ACT_DO_ID[a.id]||ACT_DO[a.type]||ACT_DO.classify;
const actIco=t=>'<span class="a-ico" aria-hidden="true"><svg viewBox="0 0 24 24">'+(ACT_ICO[t]||ACT_ICO.classify)+'</svg></span>';
const ICO_LEARN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg>';
const ICO_PRACTICE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>';
const ccol=c=>c==="f"?"var(--brand)":"var(--c-"+c+")";
const ico=(c,cls)=>'<span class="'+(cls||"t-ico")+'" style="--tc:'+ccol(c)+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+ICO[c]+'</svg></span>';
const UBY=id=>UNITS.find(u=>u.id===id);
function navHTML(cur){
  let h='<a class="nav-world" href="#map"><span class="nav-world-i" aria-hidden="true">◎</span>'+ui("wWorld")+'</a>';
  W.REGIONS.forEach((r,ri)=>{
    const here=r.units.includes(cur);
    h+='<div class="nav-r'+(here?" here":"")+'" style="--rc:'+r.hue+'"><div class="nav-r-h"><span class="nav-r-img" style="background-image:url('+W.img(r.img)+')" aria-hidden="true"></span><span>'+esc(r.name)+'</span></div>';
    r.units.forEach(id=>{const u=UBY(id);if(!u)return;
      h+='<a href="#'+u.id+'" class="'+(unitDone(u)?"done":"")+'"'+(cur===u.id?' aria-current="page"':"")+' style="--tc:'+ccol(ucls(u.id))+'">'+ico(ucls(u.id),"n-ico")+tr(u.title,"span",'class="nt"',"term")+'<span class="lv">'+u.level+"</span></a>";});
    h+='</div>';
  });
  h+='<a class="nav-refs" href="#refs"'+(cur==="refs"?' aria-current="page"':"")+'><span class="num">§</span>'+ui("refs")+"</a>";
  return h;
}
const pad=n=>String(n).padStart(2,"0");
function unitDone(u){const a=(u.acts||[]).filter(x=>x.type!=="write");return a.length>0&&a.every(x=>progress[x.id]);}

function legend(){
  return '<div class="legend" aria-label="colour key"><div class="legend-top"><label class="lbl-sw"><input type="checkbox" id="lblSw"'+(load("labels",false)?" checked":"")+'><span class="sw-ui" aria-hidden="true"></span>'+ui("wLabels")+'</label></div><div class="legend-keys">'+
   Object.keys(CLS_T).map(c=>'<button type="button" class="lg-k" data-c="'+c+'" style="--wc:var(--c-'+c+')"><i></i>'+tr(CLS_T[c],"span",'class="lg-t"',"term")+"</button>").join("")+'</div></div>';
}

const LW=[
  {w:"work",s:[["I love my {work}.","n"],["They {work} late.","v"]]},
  {w:"round",s:[["The table is {round}.","adj"],["We walked {round} the lake.","p"]]},
  {w:"that",s:[["{That} book is mine.","det"],["I know {that} she's right.","cj"]]}
];
/* ---------- the world: entry screen ---------- */
const FLOAT=[["lantern","n",8,58,0],["runs","v",22,74,1.2],["brave","adj",33,52,2.1],["quietly","adv",14,86,.6],["under","p",41,70,1.7],["and","cj",28,40,2.8],["the","det",47,84,.3],["she","pr",6,34,2.4]];
function nextUnit(){return UNITS.find(u=>!unitDone(u))||UNITS[0];}
function doneCount(){return UNITS.filter(unitDone).length;}
function mascotPic(k,cls){const m=W.mascot(k);return '<img class="'+(cls||"m-pic")+'" src="'+W.img(m.img)+'" alt="'+m.name+'" loading="lazy" decoding="async">';}
function face(k,cls){const m=W.mascot(k);return '<img class="'+(cls||"m-face")+'" src="'+W.img(m.face)+'" alt="" aria-hidden="true" decoding="async">';}
function renderMap(){
  const started=doneCount()>0||Object.keys(progress).length>0, nu=nextUnit();
  let h='<section class="w-hero" aria-labelledby="heroT">'+
    '<div class="w-hero-art"><img class="w-hero-img" src="'+W.img("hero")+'" alt="Dexter, Spark, Luna and Aizere look out over the islands of the Parts of Speech World" fetchpriority="high">'+
    '<div class="w-float" aria-hidden="true">'+FLOAT.slice(0,7).map(f=>'<span class="w-tile" style="--wc:var(--c-'+f[1]+');animation-delay:-'+f[4]+'s"><b>'+f[0]+'</b><i>'+CLS_T[f[1]].en+'</i></span>').join("")+'</div></div>'+
    '<div class="w-hero-shade" aria-hidden="true"></div>'+
    '<div class="w-hero-t">'+ui("wTitle","h1",'id="heroT"',"en")+ui("wLede","p",'class="lede"',"bi")+
    '<div class="bar"><a class="btn btn-xl" href="#'+(started?nu.id:"u01")+'">'+ui(started?"wCont":"wBegin")+' <span aria-hidden="true">→</span></a>'+
    ((CASES||[]).length?'<a class="btn btn-xl glass" href="#bureau">'+ui("wQuests")+'</a>':'')+'</div>'+
    (started?'<div class="w-prog"><span><i style="width:'+Math.round(doneCount()/UNITS.length*100)+'%"></i></span>'+doneCount()+' / '+UNITS.length+'</div>':'')+'</div>'+
    '</section>';
  h+='<section class="w-map" id="toc" aria-labelledby="mapH">'+ui("wMapH","h2",'id="mapH" class="w-map-h"')+'<ol class="w-route">';
  W.REGIONS.forEach((r,ri)=>{
    const us=r.units.map(UBY).filter(Boolean),nd=us.filter(unitDone).length,cs=(CASES||[]).filter(c=>r.units.includes(c.unit));
    const here=r.units.includes(nu.id)&&started;
    h+='<li class="w-stop'+(nd===us.length?" done":"")+(here?" here":"")+'" style="--rc:'+r.hue+'">'+
      '<a class="w-stop-art" href="#'+us[0].id+'" tabindex="-1" aria-hidden="true"><img src="'+W.img(r.img)+'" alt="" loading="lazy" decoding="async"><span class="w-stop-n">'+(ri+1)+'</span>'+face(r.guide,"w-stop-guide")+'</a>'+
      '<div class="w-stop-t"><h3>'+esc(r.name)+'</h3>'+
      '<ul class="w-stop-u">'+us.map(u=>'<li><a href="#'+u.id+'" class="'+(unitDone(u)?"done":"")+(u.id===nu.id&&started?" next":"")+(UCLS[u.id]?" is-pos":"")+'" style="--tc:'+ccol(ucls(u.id))+'">'+ico(ucls(u.id))+tr(u.title,"span",'class="t"',"term")+'<span class="lv">'+u.level+'</span><span class="go" aria-hidden="true">'+(unitDone(u)?"✓":"→")+'</span></a></li>').join("")+'</ul>'+
      (cs.length?'<div class="w-stop-q">'+cs.map(c=>'<a href="#case-'+c.id+'"><span aria-hidden="true">★</span> '+esc(c.title)+'</a>').join("")+'</div>':'')+
      '</div></li>';
  });
  h+='</ol></section>';
  h+=footer();
  return h;
}

/* ---------- The living sentence: every word acts out its job ---------- */
const LS=[
 ["The","det",{en:"<b>Determiner.</b> <i>The</i> points to one particular cat that the listener can identify.",kk:"<b>Детерминатив.</b> <i>The</i> тыңдаушыға таныс белгілі бір мысықты көрсетеді.",ru:"<b>Детерминатив.</b> <i>The</i> указывает на конкретную кошку, которую слушатель может опознать."}],
 ["small","adj",{en:"<b>Adjective.</b> <i>small</i> modifies the noun <i>cat</i>: it changes what the cat is like.",kk:"<b>Сын есім.</b> <i>small</i> <i>cat</i> зат есімін анықтайды: мысықтың қандай екенін өзгертеді.",ru:"<b>Прилагательное.</b> <i>small</i> определяет существительное <i>cat</i>: меняет то, какая это кошка."}],
 ["cat","n",{en:"<b>Noun.</b> <i>cat</i> names a thing. It heads the phrase <i>the small cat</i>, the subject.",kk:"<b>Зат есім.</b> <i>cat</i> затты атайды. Ол бастауыш болып тұрған <i>the small cat</i> тіркесінің басыңқы сөзі.",ru:"<b>Существительное.</b> <i>cat</i> называет предмет и является главным словом группы <i>the small cat</i> — подлежащего."}],
 ["jumped","v",{en:"<b>Verb.</b> <i>jumped</i> is the action. The <i>-ed</i> ending shows past tense.",kk:"<b>Етістік.</b> <i>jumped</i> — іс-әрекет. <i>-ed</i> жалғауы өткен шақты көрсетеді.",ru:"<b>Глагол.</b> <i>jumped</i> — действие. Окончание <i>-ed</i> показывает прошедшее время."}],
 ["quickly","adv",{en:"<b>Adverb.</b> <i>quickly</i> modifies the verb: it tells us how the cat jumped.",kk:"<b>Үстеу.</b> <i>quickly</i> етістікті анықтайды: мысықтың қалай секіргенін айтады.",ru:"<b>Наречие.</b> <i>quickly</i> относится к глаголу: сообщает, как кошка прыгнула."}],
 ["onto","p",{en:"<b>Preposition.</b> <i>onto</i> links the action to <i>the old wall</i> and shows movement to a surface.",kk:"<b>Предлог.</b> <i>onto</i> әрекетті <i>the old wall</i> тіркесімен байланыстырып, бетке қарай қозғалысты көрсетеді.",ru:"<b>Предлог.</b> <i>onto</i> связывает действие с <i>the old wall</i> и показывает движение на поверхность."}],
 ["the","det",{en:"<b>Determiner.</b> <i>the</i> marks one particular wall.",kk:"<b>Детерминатив.</b> <i>the</i> белгілі бір қабырғаны көрсетеді.",ru:"<b>Детерминатив.</b> <i>the</i> указывает на конкретную стену."}],
 ["old","adj",{en:"<b>Adjective.</b> <i>old</i> modifies the noun <i>wall</i>.",kk:"<b>Сын есім.</b> <i>old</i> <i>wall</i> зат есімін анықтайды.",ru:"<b>Прилагательное.</b> <i>old</i> определяет существительное <i>wall</i>."}],
 ["wall","n",{en:"<b>Noun.</b> <i>wall</i> heads the phrase <i>the old wall</i>, the complement of <i>onto</i>.",kk:"<b>Зат есім.</b> <i>wall</i> — <i>onto</i> предлогынан кейінгі <i>the old wall</i> тіркесінің басыңқы сөзі.",ru:"<b>Существительное.</b> <i>wall</i> — главное слово группы <i>the old wall</i> после предлога <i>onto</i>."}],
 [",",null,null],
 ["and","cj",{en:"<b>Conjunction.</b> <i>and</i> joins two clauses of equal status.",kk:"<b>Жалғаулық.</b> <i>and</i> тең дәрежелі екі бөлікті байланыстырады.",ru:"<b>Союз.</b> <i>and</i> соединяет две равноправные части предложения."}],
 ["then","adv",{en:"<b>Adverb.</b> <i>then</i> places the second event after the first.",kk:"<b>Үстеу.</b> <i>then</i> екінші оқиғаның біріншісінен кейін болғанын көрсетеді.",ru:"<b>Наречие.</b> <i>then</i> показывает, что второе событие произошло после первого."}],
 ["it","pr",{en:"<b>Pronoun.</b> <i>it</i> refers back to <i>the small cat</i>.",kk:"<b>Есімдік.</b> <i>it</i> алдыңғы <i>the small cat</i> тіркесін нұсқайды.",ru:"<b>Местоимение.</b> <i>it</i> отсылает к <i>the small cat</i>."}],
 ["slept","v",{en:"<b>Verb.</b> <i>slept</i> is the irregular past form of <i>sleep</i>.",kk:"<b>Етістік.</b> <i>slept</i> — <i>sleep</i> етістігінің өткен шақтағы ерекше формасы.",ru:"<b>Глагол.</b> <i>slept</i> — неправильная форма прошедшего времени глагола <i>sleep</i>."}],
 [".",null,null]
];
function livingSentence(){
  let svg='<svg class="ls-scene" viewBox="0 0 720 300" role="img" aria-label="A small cat, an old wall and a sun">'+
   '<rect width="720" height="300" fill="#F2ECFF"/>'+
   '<circle cx="640" cy="64" r="34" fill="#FFF805" opacity=".9"/><circle cx="640" cy="64" r="48" fill="#FFF805" opacity=".18"/>'+
   '<g fill="#fff" opacity=".9"><ellipse cx="120" cy="70" rx="46" ry="14"/><ellipse cx="150" cy="60" rx="30" ry="14"/><ellipse cx="360" cy="46" rx="38" ry="11"/></g>'+
   '<rect y="250" width="720" height="50" fill="#DCCBFF"/><rect y="250" width="720" height="4" fill="#C2A8FF"/>'+
   // wall
   '<g class="ls-wall"><rect x="440" y="168" width="180" height="82" rx="4" class="ls-wall-b"/>'+
   '<g stroke="#fff" stroke-opacity=".55" stroke-width="2"><path d="M440 195h180M440 222h180M485 168v27M545 168v27M600 168v27M470 195v27M520 195v27M580 195v27M495 222v28M555 222v28M610 222v28"/></g>'+
   '<g class="ls-crack" fill="none" stroke="#3A2A70" stroke-width="2" stroke-linecap="round"><path d="M470 170l8 14-6 10 9 12M590 180l-7 12 8 9-5 14"/></g>'+
   '<g class="ls-moss" fill="#00B83A"><ellipse cx="452" cy="250" rx="16" ry="5"/><ellipse cx="610" cy="250" rx="12" ry="4"/></g>'+
   '<rect class="ls-top" x="440" y="164" width="180" height="6" rx="3" fill="#874BF8"/></g>'+
   // onto path
   '<path class="ls-path" d="M175 222 Q 330 40 520 150" fill="none" stroke="#874BF8" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>'+
   '<path class="ls-path-h" d="M512 140 l12 10 -15 5" fill="none" stroke="#874BF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
   // cat
   '<g class="ls-cat"><g class="ls-cat-s">'+
    '<path class="ls-tail" d="M-28 -6 q -26 -4 -22 -30" fill="none" stroke="#2B1C5E" stroke-width="7" stroke-linecap="round"/>'+
    '<ellipse cx="0" cy="-14" rx="30" ry="18" fill="#2B1C5E"/>'+
    '<circle cx="26" cy="-34" r="15" fill="#2B1C5E"/><path d="M15 -44 l3 -14 8 10z M30 -46 l7 -12 3 14z" fill="#2B1C5E"/>'+
    '<g class="ls-eyes" fill="#FFF805"><ellipse cx="22" cy="-36" rx="2.6" ry="3.4"/><ellipse cx="32" cy="-36" rx="2.6" ry="3.4"/></g>'+
    '<g class="ls-shut" stroke="#FFF805" stroke-width="2" stroke-linecap="round" opacity="0"><path d="M19 -36h6M29 -36h6"/></g>'+
    '<g fill="#2B1C5E"><rect x="-22" y="-4" width="7" height="12" rx="3"/><rect x="14" y="-4" width="7" height="12" rx="3"/></g>'+
   '</g><g class="ls-zzz" fill="#874BF8" font-family="inherit" font-weight="700" opacity="0"><text x="40" y="-58" font-size="16">z</text><text x="54" y="-74" font-size="20">z</text><text x="70" y="-94" font-size="25">Z</text></g>'+
   '<ellipse class="ls-spot" cx="4" cy="6" rx="58" ry="10" fill="#874BF8" opacity="0"/></g>'+
   '<g class="ls-speed" stroke="#0AAFFF" stroke-width="3" stroke-linecap="round" opacity="0"><path d="M120 200h-40M128 214h-52M120 228h-36"/></g>'+
   '<g class="ls-label" opacity="0"><rect rx="12" height="26" fill="#121017"/><text fill="#fff" font-size="13" font-family="inherit" font-weight="600" y="17"></text></g>'+
   '</svg>';
  const words=LS.map((w,k)=>w[1]?'<button type="button" class="ls-w" data-k="'+k+'" style="--wc:var(--c-'+w[1]+')">'+w[0]+'<small>'+esc(CLS_T[w[1]].en)+'</small></button>':'<span class="ls-p">'+w[0]+'</span>').join(" ");
  return '<section class="ls" aria-labelledby="lsH"><div class="ls-head"><div>'+ui("lsK","div",'class="kicker"')+ui("lsH","h2",'id="lsH"')+ui("lsI","p","","bi")+'</div>'+
    '<button type="button" class="btn ghost" id="lsAll">'+ui("lsAll")+'</button></div>'+
    '<div class="ls-stage">'+svg+'</div><div class="ls-strip" lang="en">'+words+'<svg class="ls-link" aria-hidden="true"></svg></div>'+
    '<div class="ls-cap" aria-live="polite">'+ui("lsStart","p","","bi")+'</div></section>';
}
function startLS(){
  const root=view.querySelector(".ls");if(!root)return;
  const still=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg=root.querySelector(".ls-scene"),cat=svg.querySelector(".ls-cat"),catS=svg.querySelector(".ls-cat-s"),cap=root.querySelector(".ls-cap"),strip=root.querySelector(".ls-strip"),link=root.querySelector(".ls-link");
  const GROUND=[150,250],WALL=[520,168];let pos="g",small=false,busy=null,timers=[];
  const at=p=>"translate("+p[0]+"px,"+p[1]+"px)";
  function place(p){cat.style.transition="none";cat.style.transform=at(p);}
  function clearFx(){timers.forEach(clearTimeout);timers=[];svg.classList.remove("fx-the","fx-path","fx-old","fx-wall","fx-cat","fx-speed","fx-sleep");link.innerHTML="";strip.querySelectorAll(".ls-w").forEach(b=>b.classList.remove("on","rel"));hideLabel();}
  function label(txt,x,y){const g=svg.querySelector(".ls-label"),t=g.querySelector("text"),r=g.querySelector("rect");t.textContent=txt;const w=txt.length*8.4+24;r.setAttribute("width",w);t.setAttribute("x",11);g.setAttribute("transform","translate("+(x-w/2)+","+y+")");g.style.opacity=1;}
  function hideLabel(){svg.querySelector(".ls-label").style.opacity=0;}
  function jump(dur,cb){
    place(GROUND);void cat.getBoundingClientRect();
    if(still){place(WALL);pos="w";cb&&cb();return;}
    const pts=[];for(let i=0;i<=12;i++){const t=i/12,x=GROUND[0]+(WALL[0]-GROUND[0])*t,y=GROUND[1]+(WALL[1]-GROUND[1])*t-170*4*t*(1-t);pts.push({transform:at([x,y])});}
    const a=cat.animate(pts,{duration:dur,easing:"ease-in-out",fill:"forwards"});a.onfinish=()=>{a.cancel();place(WALL);pos="w";cb&&cb();};
  }
  function setSmall(v){small=v;catS.style.transform=v?"scale(.62)":"scale(1)";}
  function linkWords(a,b){const r=strip.getBoundingClientRect(),A=strip.querySelector('[data-k="'+a+'"]').getBoundingClientRect(),B=strip.querySelector('[data-k="'+b+'"]').getBoundingClientRect();
    const x1=A.left+A.width/2-r.left,x2=B.left+B.width/2-r.left,y1=A.top-r.top-2,y2=B.top-r.top-2;
    link.setAttribute("viewBox","0 0 "+r.width+" "+r.height);link.innerHTML='<path d="M'+x1+' '+y1+' C '+x1+' '+(Math.min(y1,y2)-46)+' '+x2+' '+(Math.min(y1,y2)-46)+' '+x2+' '+y2+'" fill="none" stroke="var(--c-pr)" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="'+x2+'" cy="'+y2+'" r="4" fill="var(--c-pr)"/>';}
  const ACT={
    "0":()=>{svg.classList.add("fx-the","fx-cat");label("this one cat",(pos==="w"?WALL:GROUND)[0],(pos==="w"?WALL:GROUND)[1]-(small?80:110));},
    "1":()=>{setSmall(!small);label(small?"small cat":"cat",(pos==="w"?WALL:GROUND)[0],(pos==="w"?WALL:GROUND)[1]-(small?80:110));},
    "2":()=>{svg.classList.add("fx-cat");label("cat = a thing",(pos==="w"?WALL:GROUND)[0],(pos==="w"?WALL:GROUND)[1]-(small?80:110));},
    "3":()=>{svg.classList.remove("fx-sleep");jump(1300,()=>label("jumped",WALL[0],WALL[1]-(small?80:110)));},
    "4":()=>{svg.classList.remove("fx-sleep");svg.classList.add("fx-speed");jump(420,()=>label("quickly",WALL[0],WALL[1]-(small?80:110)));},
    "5":()=>{svg.classList.add("fx-path");label("onto the wall",340,40);},
    "6":()=>{svg.classList.add("fx-wall");label("this wall",530,126);},
    "7":()=>{svg.classList.toggle("is-old");label(svg.classList.contains("is-old")?"old wall":"wall",530,126);},
    "8":()=>{svg.classList.add("fx-wall");label("wall = a thing",530,126);},
    "10":()=>{strip.querySelectorAll(".ls-w").forEach(b=>{const k=+b.dataset.k;if(k!==10)b.classList.add(k<10?"on":"rel");});},
    "11":()=>{if(pos!=="w")jump(900,()=>{label("first: jump",WALL[0],WALL[1]-(small?80:110));timers.push(setTimeout(()=>{svg.classList.add("fx-sleep");label("then: sleep",WALL[0],WALL[1]-(small?80:110));},900));});else{svg.classList.add("fx-sleep");label("then: sleep",WALL[0],WALL[1]-(small?80:110));}},
    "12":()=>{svg.classList.add("fx-cat");linkWords(12,2);},
    "13":()=>{const go=()=>{svg.classList.add("fx-sleep");label("slept",WALL[0],WALL[1]-(small?80:110));};if(pos!=="w")jump(900,go);else go();}
  };
  function show(k){clearFx();const w=LS[k];strip.querySelector('[data-k="'+k+'"]').classList.add("on");
    cap.innerHTML='<p data-tr="ls'+k+'" data-m="bi">'+bi(w[2],"bi")+'</p>';TR.set("ls"+k,w[2]);
    (ACT[String(k)]||(()=>{}))();}
  strip.querySelectorAll(".ls-w").forEach(b=>b.addEventListener("click",()=>{clearInterval(busy);busy=null;show(+b.dataset.k);}));
  root.querySelector("#lsAll").addEventListener("click",()=>{clearInterval(busy);place(GROUND);pos="g";setSmall(false);svg.classList.remove("is-old");
    const order=LS.map((w,k)=>w[1]?k:-1).filter(k=>k>=0);let n=0;show(order[n++]);
    busy=setInterval(()=>{if(!ROOT.contains(root)||n>=order.length){clearInterval(busy);busy=null;return;}show(order[n++]);},2600);});
  place(GROUND);
}
function startLW(){
  const box=view.querySelector(".lw");if(!box)return;
  const word=box.querySelector(".lw-word"),cls=box.querySelector(".lw-cls"),A=box.querySelector(".lw-says.a"),B=box.querySelector(".lw-says.b"),dots=[...box.querySelectorAll(".lw-dots button")];
  let wi=0,si=0,timer=null;
  const still=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  function say(el,pair){const c=pair[1];el.innerHTML='<small data-c="'+c+'">'+esc((CLS_T[c][lang]||CLS_T[c].en))+'</small>'+esc(pair[0]).replace(/\{(.+?)\}/,'<span class="k" style="color:var(--c-'+c+')">$1</span>');}
  function show(){const W=LW[wi];word.textContent=W.w;say(A,W.s[0]);say(B,W.s[1]);const c=W.s[si][1];
    cls.textContent=CLS_T[c][lang]||CLS_T[c].en;cls.style.background="var(--c-"+c+")";word.style.color="var(--c-"+c+")";
    A.classList.toggle("on",si===0);B.classList.toggle("on",si===1);dots.forEach((d,k)=>d.setAttribute("aria-pressed",String(k===wi)));}
  function tick(){si++;if(si>1){si=0;wi=(wi+1)%LW.length;}show();}
  function arm(){clearInterval(timer);if(!still)timer=setInterval(()=>{if(!ROOT.contains(box)){clearInterval(timer);return;}tick();},3200);}
  A.addEventListener("click",()=>{si=0;show();arm();});B.addEventListener("click",()=>{si=1;show();arm();});
  dots.forEach((d,k)=>d.addEventListener("click",()=>{wi=k;si=0;show();arm();}));
  box.addEventListener("mouseenter",()=>clearInterval(timer));box.addEventListener("mouseleave",arm);
  box._refresh=show;show();arm();
  const tt=$id("toToc");if(tt)tt.addEventListener("click",()=>$id("toc").scrollIntoView({behavior:still?"auto":"smooth"}));
}
function footer(){
  return '<footer class="foot"><span class="slogan">English is simple</span><nav><a href="#refs">'+ui("refs")+'</a></nav></footer>';
}
function renderDesign(){
  const sw=(n,h,dark)=>'<div style="background:'+h+';color:'+(dark?"#fff":"#121017")+'">'+n+'<br>'+h+'</div>';
  const mates=Object.keys(W.MASCOTS).map(k=>{const m=W.MASCOTS[k];const rs=W.REGIONS.filter(r=>r.guide===k).map(r=>r.name).join(", ");return '<tr><td><b>'+m.name+'</b></td><td>'+m.role.en+'</td><td>'+rs+'</td></tr>';}).join("");
  return '<div class="dn"><div class="kicker">Just to Study · Parts of Speech World</div><h1>Design notes</h1>'+
  '<p class="lede">Why the section looks and behaves the way it does. Every decision starts from the Just to Study Visual Guideline 1.0, the logo presentation and the school\'s four mascots.</p>'+
  '<h2>1. What the previous version did well, and what it lacked</h2>'+
  '<p><b>Kept.</b> All sixteen units of explanation, every Kazakh and Russian translation, all practice activities, the fourteen-quest game with its ten mechanics and mastery loop, the references and the colour code for word classes. None of the academic content was rewritten.</p>'+
  '<ul><li>The section felt like a well-typeset textbook, not a place: the first screen was a purple block of text and the map was a list.</li><li>The school\'s mascots, its strongest visual asset, were missing.</li><li>The game lived in a separate night city whose look had nothing to do with the lessons.</li><li>A learner could not see at a glance where they were or what came next.</li></ul>'+
  '<h2>2. The concept: a world of speech-bubble islands</h2>'+
  '<p>The brand symbol is the speech bubble in the word <i>to</i>. In the Parts of Speech World every island is shaped like that bubble, so the whole world is built from the school\'s own sign. Each island is home to one family of words, and the island\'s design acts out what those words do: things on market stalls for nouns, pointing lanterns for determiners, machines in motion for verbs, a garden that paint transforms for adjectives, clocks, dials and rapids for adverbs, objects on, under and between each other for prepositions, knitted bridges between broken fragments for conjunctions, and an observatory for structure.</p>'+
  '<h2>3. The mascots are the team</h2><table><thead><tr><th>Mascot</th><th>Personality</th><th>Guides you through</th></tr></thead><tbody>'+mates+'</tbody></table>'+
  '<p>Their appearance is exactly the school\'s: the artwork is cut from the official reference sheets, and the generated scenes were made with those sheets as references. Each island has one guide who introduces every lesson in a speech bubble and answers in the feedback bubbles of the practice. The story is deliberately short (a misprint scattered the words; the team brings them home) so that it motivates without slowing anyone down.</p>'+
  '<h2>4. Visuals</h2><p>Ten images were generated with Higgsfield: one hero scene with all four mascots, and one environment for each island, all made from the hero as a style reference so the world reads as one place. Smaller graphics (the living sentence, the word tiles, the activity interfaces) are built in code, so they stay sharp, translate and react.</p>'+
  '<h3>Colour</h3><div class="sw">'+sw("Purple · primary","#874BF8",1)+sw("Cyan","#0AC7FF")+sw("Green","#00E641")+sw("Orange","#FF7D1D")+sw("Yellow","#FFF805")+sw("Dusk","#2A1670",1)+sw("Mist","#F4F0FE")+'</div>'+
  '<p>Purple is the sky of the world and the colour of every primary action. Green always means correct and orange always means "look again". The ten word-class colours are functional: they mark words in examples, on the island artwork and in the legend, and pointing at one lights up its whole family.</p>'+
  '<h3>Typography</h3><p>Headings use PT Root UI where it is installed, with Golos Text (same foundry, full Kazakh Cyrillic) as the web fallback. The English being studied is set in Literata, a reading serif, so the language under study is always distinct from the language that explains it.</p>'+
  '<h3>Motion</h3><p>Motion carries meaning: words float into the hero, wake up on their objects, the chapter rail follows the reader, feedback rises as a bubble. Everything stops when the device asks for reduced motion.</p>'+
  '<h2>5. Orientation</h2><p>Every page answers four questions. <b>Where am I?</b> The island art, the breadcrumb and the side map. <b>What am I learning?</b> The lesson title and the guide\'s one-sentence summary. <b>What can I explore?</b> The chapter rail, the island hotspots and the colour key. <b>What next?</b> The practice trail, the island quest and the next-stop card.</p>'+
  '<h2>6. Translations</h2><p>English is always on screen. Қазақша and Русский add the translation directly under each English paragraph, heading, table cell and example note, and both can be shown at once.</p>'+
  footer()+'</div>';
}
function renderRefs(){
  return '<div class="kicker">'+ui("refs")+"</div>"+tr(REFS.title,"h1")+tr(REFS.lede,"p",'class="lede"')+'<div class="refs">'+REFS.list.map(r=>"<p>"+r+"</p>").join("")+"</div>"+footer();
}
function renderUnit(u,idx){
  const r=W.regionOf(u.id),ri=W.REGIONS.indexOf(r),g=W.mascot(r.guide);
  let h='<header class="u-hero r-'+r.id+'" style="--rc:'+r.hue+'"><div class="u-hero-bg"><img class="u-hero-img" src="'+W.img(r.img)+'" alt="" decoding="async"></div><div class="u-hero-shade" aria-hidden="true"></div>'+
    '<div class="u-hero-t"><a class="u-back" href="#map" data-region="'+r.id+'"><span aria-hidden="true">←</span> '+esc(r.name)+'</a>'+
    '<div class="topic-wrap">'+ico(ucls(u.id),"topic-ico")+tr(u.title,"h1",'class="topic'+(UCLS[u.id]?" is-pos":"")+(u.title.en.length>14?" is-long":"")+'"',"term")+'</div>'+tr(u.summary,"p",'class="u-def"',"bi")+'<span class="u-lv">'+u.level+'</span></div>'+
    '<div class="u-guide">'+mascotPic(r.guide,"u-guide-m")+'</div></header>';
  const nActs=(u.acts||[]).length;
  if(nActs){
    h+='<div class="mode-sw" role="tablist" aria-label="Lesson mode">'+
      '<button type="button" role="tab" class="mode-b mode-l" data-mode="learn" aria-selected="true">'+'<span class="mode-i">'+ICO_LEARN+'</span><span class="mode-t">'+tr(UI.mLearn,"span",'class="mode-n"',"term")+'<small>'+u.sec.length+' parts</small></span></button>'+
      '<button type="button" role="tab" class="mode-b mode-p" data-mode="practice" aria-selected="false">'+'<span class="mode-i">'+ICO_PRACTICE+'</span><span class="mode-t">'+tr(UI.mPractice,"span",'class="mode-n"',"term")+'<small>'+nActs+' activities</small></span></button></div>';
  }
  h+='<div class="mode-view mv-learn" data-view="learn">';
  h+='<nav class="u-rail" aria-label="'+esc(uiTxt("wOnPage"))+'">'+u.sec.map((s,i)=>'<a href="#'+u.id+'-s'+i+'">'+esc(String(s.h.en).replace(/<[^>]+>/g,""))+'</a>').join("")+'</nav>';
  const m=u.meta;
  const li=o=>"<ul>"+(o[lang]||o.en).map(x=>"<li>"+fmt(x)+"</li>").join("")+"</ul>";
  // lists translated as whole blocks
  const blk=(k,o)=>"<div><h4>"+ui(k)+"</h4>"+tr(listObj(o),"div")+"</div>";
  h+='<details class="plan"><summary>'+ui("plan")+'</summary><div class="plan-grid">'+
    blk("obj",m.obj)+blk("pre",m.pre)+blk("con",m.con)+blk("str",m.str)+blk("app",m.app)+blk("out",m.out)+"</div></details>";
  if(u.legend) h+=legend();
  const SP=W.SPOTS[r.id];
  if(SP&&r.units[0]===u.id){
    h+='<figure class="isle-x" style="--rc:'+r.hue+'"><div class="isle-stage"><img src="'+W.img(r.img)+'" alt="'+esc(r.name)+'" loading="lazy">'+
      SP.map((p,k)=>'<button type="button" class="isle-pt" data-k="'+k+'" style="left:'+p[0]+'%;top:'+p[1]+'%;--wc:var(--c-'+p[3]+')" aria-label="'+esc(p[2])+'"><span class="isle-dot"></span><span class="isle-w"><b>'+esc(p[2])+'</b><i>'+CLS_T[p[3]].en+'</i></span></button>').join("")+
      '<button type="button" class="isle-all" aria-pressed="false">'+ui("wXAll")+'</button></div><figcaption class="isle-cap" aria-live="polite">'+face(r.guide,"isle-face")+'<p class="isle-says">'+ui("wXHint")+'</p></figcaption></figure>';
  }
  u.sec.forEach((s,i)=>{h+='<section class="ex" id="'+u.id+"-s"+i+'">'+(s.tag?tr(s.tag,"div",'class="tag"',"en"):"")+tr(s.h,"h2")+tr(s.b,"div")+"</section>";});
  if(nActs){
    h+='<div class="ready"><div class="ready-t">'+ui("rdyH","h2","","term")+'<p class="ready-list">'+u.acts.map(a=>'<span>'+actIco(a.type)+tr(actDo(a),"span","","term")+'</span>').join("")+'</p></div><button type="button" class="btn btn-xl btn-practice" data-go="practice">'+ICO_PRACTICE+ui("rdyBtn")+' <span aria-hidden="true">→</span></button></div>';
  }
  h+='</div>';
  if(nActs){
    h+='<div class="mode-view mv-practice" data-view="practice" hidden><div class="pr-head">'+face(r.guide,"ph-face")+'<div><div class="pr-k">'+ui("mPractice")+'</div><h2 class="pr-topic">'+tr(u.title,"span","","term")+'</h2></div></div>';
    h+='<ol class="steps" role="tablist" aria-label="Activities">'+u.acts.map((a,k)=>{const pr=progress[a.id];
      return '<li role="presentation"><button type="button" role="tab" class="step'+(pr?" done":"")+'" data-k="'+k+'" aria-selected="'+(k===0)+'"><span class="step-n">'+(pr?"✓":k+1)+'</span>'+actIco(a.type)+'<span class="step-t">'+tr(actDo(a),"span",'class="step-do"',"term")+'<small class="step-s">'+(pr?pr.score+" / "+pr.total:(a.items?a.items.length+" questions":"open task"))+'</small></span></button></li>';}).join("")+'</ol>';
    u.acts.forEach((a,k)=>{h+='<div class="act" id="'+a.id+'" data-k="'+k+'"'+(k?' hidden':'')+'></div>';});
  }
  const G=GAME&&GAME.caseFor(u.id);
  if(G){h+='<a class="u-quest r-'+r.id+'" href="'+(G.un?'#case-'+G.c.id:'#bureau')+'"><img src="'+W.img(r.img)+'" alt="" loading="lazy">'+mascotPic(r.guide,"u-quest-m")+'<span class="u-quest-t"><span class="kicker">★ '+ui("wQuest")+'</span><b>'+G.c.title+'</b><em class="btn">'+(G.st&&G.st.complete?tr(UI.gameClosed):tr(UI.gameEnter))+'</em></span></a>';}
  if(nActs) h+='</div>';
  const p=UNITS[idx-1],n=UNITS[idx+1];
  const card=(x,k,right)=>{const xr=W.regionOf(x.id);return '<a href="#'+x.id+'" class="pg'+(right?" pg-n":"")+'"><img src="'+W.img(xr.img)+'" alt="" loading="lazy"><span><small>'+(right?ui("nextu")+' →':'← '+ui("prev"))+'</small>'+tr(x.title,"span",'class="pg-t"',"term")+'</span></a>';};
  h+='<div class="pager">'+(p?card(p,"wPrevStop"):"<span></span>")+(n?card(n,"wNextStop",1):'<a href="#map" class="pg pg-n"><span><small>→</small>'+ui("wWorld")+"</span></a>")+"</div>"+footer();
  return h;
}
function listObj(o){const r={};LANGS.forEach(l=>{const a=o[l]||o.en;r[l]="<ul>"+a.map(x=>"<li>"+x+"</li>").join("")+"</ul>";});return r;}

function setMode(id,isUnit){
  const full=!isUnit&&id!=="refs";
  ROOT.className="posw "+(full?"full ":"")+"page-"+(isUnit?"unit":id.startsWith("case-")?"case":id==="bureau-design"?"dossier":id==="bureau"?"bureau":id==="design"?"design":id==="refs"?"refs":"home");
  const play=!isUnit&&(id==="bureau"||id.startsWith("case-")||id==="bureau-design");
  ROOT.querySelectorAll(".tabs a").forEach(t=>{const on=(t.dataset.tab==="play")===play;if(on)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current");});
  view.style.animation="none";void view.offsetWidth;view.style.animation="";
}
function route(){
  refreshState();
  const id=(HASH||"#map").slice(1);
  TR.clear(); trId=0;
  let idx=UNITS.findIndex(u=>u.id===id);
  let target=null;
  let startMode="learn";
  if(idx<0 && /-practice$/.test(id)){idx=UNITS.findIndex(u=>id===u.id+"-practice");startMode="practice";}
  if(idx<0 && id.indexOf("-s")>0){idx=UNITS.findIndex(u=>id.startsWith(u.id+"-"));target=id;}
  if(idx<0&&GAME&&GAME.route(id,view)){setMode(id,false);side.innerHTML=navHTML(id);closeMenu();window.scrollTo(0,0);return;}
  if(idx<0&&id!=="refs"&&id!=="design"&&id!=="map"&&id!=="toc"&&id!==""){go("#map");return;}
  setMode(idx>=0?"unit":(id==="refs"||id==="design")?id:"map",idx>=0);
  if(idx>=0){W.setGuide(W.regionOf(UNITS[idx].id).guide);view.innerHTML=renderUnit(UNITS[idx],idx);(UNITS[idx].acts||[]).forEach(a=>mountAct(a));wireUnit(UNITS[idx],startMode);}
  else if(id==="refs"){W.setGuide("dexter");view.innerHTML=renderRefs();}
  else if(id==="design"){W.setGuide("dexter");view.innerHTML=renderDesign();}
  else {W.setGuide("dexter");view.innerHTML=renderMap();wireHome();}
  side.innerHTML=navHTML(idx>=0?UNITS[idx].id:id==="refs"?"refs":id==="design"?"design":"map");
  closeMenu();
  if(target){const el=$id(target);if(el){el.scrollIntoView();return;}}
  window.scrollTo(0,0);
}

/* ---------- unit page: orientation and living words ---------- */
let actDone=null,railIO=null,focusRegion=null;
function fitTopic(){
  const h=view.querySelector("h1.topic");if(!h)return;const en=h.querySelector(".term-en");if(!en)return;
  h.style.fontSize="";let fs=parseFloat(getComputedStyle(h).fontSize),n=0;
  en.style.whiteSpace="nowrap";const words=en.textContent.split(/\s+/);
  // shrink until the longest word fits the column
  const fits=()=>{const probe=document.createElement("span");probe.style.cssText="position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit";h.appendChild(probe);let ok=true;const hero=h.closest(".u-hero"),avail=Math.min(h.clientWidth,hero?hero.getBoundingClientRect().right-20-h.getBoundingClientRect().left:1e9);for(const w of words){probe.textContent=w;if(probe.offsetWidth>avail){ok=false;break;}}probe.remove();return ok;};
  en.style.whiteSpace="";
  while(!fits()&&fs>22&&n<40){fs-=2;h.style.fontSize=fs+"px";n++;}
}
let ftTimer=0;on(window,"resize",()=>{clearTimeout(ftTimer);ftTimer=setTimeout(fitTopic,120);});
function wireUnit(u,startMode){
  fitTopic();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(!dead)fitTopic();});
  // Learn ⇄ Practice
  const msw=view.querySelector(".mode-sw");
  const setModeV=(m,scroll)=>{if(!msw)return;view.querySelectorAll(".mode-b").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.mode===m)));
    view.querySelectorAll(".mode-view").forEach(v=>v.hidden=v.dataset.view!==m);ROOT.classList.toggle("in-practice",m==="practice");
    if(scroll){const y=msw.getBoundingClientRect().top+scrollY-84;if(scrollY>y)window.scrollTo({top:y,behavior:"auto"});}};
  if(msw){view.querySelectorAll(".mode-b").forEach(b=>b.addEventListener("click",()=>setModeV(b.dataset.mode,true)));
    view.querySelectorAll('[data-go="practice"]').forEach(b=>b.addEventListener("click",()=>setModeV("practice",true)));
    setModeV(startMode==="practice"?"practice":"learn",false);
    if(startMode==="practice")setTimeout(()=>msw.scrollIntoView({block:"start"}),50);}
  // one activity at a time
  const steps=[...view.querySelectorAll(".step")],acts=[...view.querySelectorAll(".mv-practice .act")];
  const openStep=k=>{steps.forEach(b=>b.setAttribute("aria-selected",String(+b.dataset.k===k)));acts.forEach(a=>a.hidden=+a.dataset.k!==k);};
  steps.forEach(b=>b.addEventListener("click",()=>openStep(+b.dataset.k)));
  actDone=a=>{const k=acts.findIndex(x=>x.id===a.id),st=steps[k],pr=progress[a.id];if(st){st.classList.add("done");st.querySelector(".step-n").textContent="✓";const sm=st.querySelector(".step-s");if(sm&&pr)sm.textContent=pr.score+" / "+pr.total;}
    const nb=acts[k]&&acts[k].querySelector('[data-role="nextact"]');if(nb){if(k<acts.length-1)nb.addEventListener("click",()=>{openStep(k+1);view.querySelector(".steps").scrollIntoView({block:"start"});});else{const q=view.querySelector(".u-quest");if(q){nb.textContent=uiTxt("wPlayQuest");nb.addEventListener("click",()=>{go(q.getAttribute("href"));});}else nb.remove();}}};
  const still=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  // chapter rail scrolls in place (keeps practice state) and follows the reader
  const rail=view.querySelector(".u-rail");
  if(rail){
    const links=[...rail.querySelectorAll("a")];
    links.forEach(a=>a.addEventListener("click",e=>{e.preventDefault();const t=$id(a.getAttribute("href").slice(1));if(t)t.scrollIntoView({behavior:still?"auto":"smooth",block:"start"});}));
    const targets=links.map(a=>$id(a.getAttribute("href").slice(1))).filter(Boolean);
    if("IntersectionObserver" in window){
      if(railIO)railIO.disconnect();
      const io=railIO=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(l=>l.classList.toggle("on",l.getAttribute("href")==="#"+en.target.id));const on=rail.querySelector("a.on");if(on&&rail.scrollWidth>rail.clientWidth)rail.scrollTo({left:on.offsetLeft-40,behavior:still?"auto":"smooth"});}});},{rootMargin:"-30% 0px -60% 0px"});
      targets.forEach(t=>io.observe(t));
    }
  }
  // explore the island: words wake up on their objects
  const fx=view.querySelector(".isle-x");
  if(fx){const r=W.regionOf(u.id),SP=W.SPOTS[r.id]||[],cap=fx.querySelector(".isle-says");
    const pts=[...fx.querySelectorAll(".isle-pt")];
    const pick=k=>{pts.forEach(p=>p.classList.toggle("on",+p.dataset.k===k));const p=SP[k];cap.style.setProperty("--wc","var(--c-"+p[3]+")");const tl=activeTL()[0];cap.innerHTML='<span class="isle-cls" style="--wc:var(--c-'+p[3]+')">'+esc(CLS_T[p[3]].en)+(tl?'<i lang="'+tl+'">'+esc(CLS_T[p[3]][tl])+'</i>':'')+'</span> <span lang="en" class="isle-ex">'+p[4]+'</span>';};
    pts.forEach(p=>p.addEventListener("click",()=>pick(+p.dataset.k)));
    const all=fx.querySelector(".isle-all");all.addEventListener("click",()=>{const on=all.getAttribute("aria-pressed")!=="true";all.setAttribute("aria-pressed",String(on));fx.classList.toggle("awake",on);});
  }
  // label every word
  const sw=$id("lblSw");
  const applyLabels=()=>ROOT.classList.toggle("show-labels",!!(sw&&sw.checked));
  if(sw){sw.addEventListener("change",()=>{save("labels",sw.checked);applyLabels();});}
  applyLabels();
  // a word lights up its whole family
  let pinned=null;
  const light=c=>{view.querySelectorAll("section.ex,.legend").forEach(s=>{if(c)s.dataset.hl=c;else delete s.dataset.hl;});view.querySelectorAll(".lg-k").forEach(k=>k.setAttribute("aria-pressed",String(k.dataset.c===c)));};
  view.querySelectorAll("section.ex").forEach(sec=>{
    sec.addEventListener("mouseover",e=>{const w=e.target.closest&&e.target.closest(".w");if(w&&!pinned){const c=[...w.classList].find(x=>x.startsWith("w-"));if(c)light(c.slice(2));}});
    sec.addEventListener("mouseout",e=>{const w=e.target.closest&&e.target.closest(".w");if(w&&!pinned)light(null);});
  });
  view.querySelectorAll(".lg-k").forEach(k=>k.addEventListener("click",()=>{pinned=pinned===k.dataset.c?null:k.dataset.c;light(pinned);}));
}
/* ---------- home: floating words answer when touched ---------- */
on(ROOT,"click",e=>{const a=e.target.closest&&e.target.closest("[data-region]");if(a)focusRegion=a.dataset.region;},{capture:true});
function wireHome(){
  const fr=focusRegion;focusRegion=null;
  if(fr){const ri=W.REGIONS.findIndex(r=>r.id===fr),li=view.querySelectorAll(".w-stop")[ri];if(li)setTimeout(()=>{li.scrollIntoView({block:"center"});li.classList.add("pulse");},60);}
  view.querySelectorAll(".w-tile").forEach(t=>t.addEventListener("click",()=>t.classList.toggle("flip")));
  const hero=view.querySelector(".w-hero");
  if(hero&&!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){
    hero.addEventListener("pointermove",e=>{const r=hero.getBoundingClientRect();hero.style.setProperty("--px",((e.clientX-r.left)/r.width-.5).toFixed(3));hero.style.setProperty("--py",((e.clientY-r.top)/r.height-.5).toFixed(3));});
  }
}

/* ---------- language switching (keeps the reader's place) ---------- */
function anchorEl(){
  const els=[...view.querySelectorAll("h1,h2,h3,p,li,tr,.exs,.note-box,.legend,.act,.toc-r,.practice-head")].filter(e=>!e.closest(".trl"));
  let best=null;
  for(const el of els){const r=el.getBoundingClientRect(); if(r.bottom>70){best=el;break;}}
  return best;
}
function syncLangButtons(){
  ROOT.querySelectorAll(".langs button").forEach(b=>{const l=b.dataset.lang;b.setAttribute("aria-pressed",String(l==="en"?!activeTL().length:!!SHOW[l]));});
}
function setLang(l){
  if(!LANGS.includes(l)) return;
  const a=anchorEl(); const before=a?a.getBoundingClientRect().top:0;
  if(l==="en"||SHOW[l]) SHOW={kk:false,ru:false}; else SHOW={kk:l==="kk",ru:l==="ru"};
  save("tl",SHOW); syncLangButtons();
  ROOT.querySelectorAll("[data-tr]").forEach(el=>{const o=TR.get(el.dataset.tr); if(o) el.innerHTML=bi(o,el.dataset.m);});
  if(a){const after=a.getBoundingClientRect().top; window.scrollBy({top:after-before,left:0,behavior:"instant"});}
}
ROOT.querySelectorAll(".langs button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
syncLangButtons();

/* ---------- mobile menu ---------- */
const menuBtn=$id("menuBtn");
function closeMenu(){side.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");}
menuBtn.addEventListener("click",()=>{placeMenu();const o=side.classList.toggle("open");menuBtn.setAttribute("aria-expanded",String(o));});

/* ---------- activities ---------- */
const bu=(k,cls,extra)=>'<button type="button" class="'+(cls||"btn")+'" data-ui="'+k+'"'+(extra||"")+">"+esc(uiTxt(k))+"</button>";
const okAns=(list,v)=>list.some(x=>{x=String(x);if(x.length>2&&x[0]==="/"&&x[x.length-1]==="/"){try{return new RegExp(x.slice(1,-1)).test(v);}catch(e){return false;}}return norm(x)===v;});
const norm=s=>String(s).toLowerCase().replace(/[’']/g,"'").replace(/[.!?]+$/,"").replace(/\s+/g," ").replace(/\s+([,.!?;:])/g,"$1").trim();
function shuffle(a,seed){const b=a.slice();let s=seed||7;for(let i=b.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

function mountAct(a){
  const box=$id(a.id); if(!box) return;
  box.innerHTML='<div class="act-h"><div class="act-do">'+actIco(a.type)+tr(actDo(a),"span","","term")+'</div>'+tr(a.title,"h3")+tr(a.instr,"p",'class="act-in"')+'</div><div class="act-b"></div>';
  const body=box.querySelector(".act-b");
  if(a.type==="write") return writeAct(a,body);
  let i=0,score=0;
  const total=a.items.length;
  function finish(){
    progress[a.id]={score:score,total:total}; save("progress",progress);
    body.innerHTML='<div class="done-card"><div class="prog" style="justify-content:center">'+esc(uiTxt("score"))+'</div><div class="big">'+score+" / "+total+"</div>"+'<div class="bar" style="justify-content:center">'+bu("again","btn ghost")+bu("nextAct","btn",' data-role="nextact"')+"</div></div>";
    body.querySelector('[data-ui="again"]').addEventListener("click",()=>{i=0;score=0;show();});
    if(actDone)actDone(a);
    const link=side.querySelector('a[href="#'+(UNITS.find(u=>(u.acts||[]).includes(a))||{}).id+'"]');
    const u=UNITS.find(u=>(u.acts||[]).includes(a)); if(link&&u&&unitDone(u)) link.classList.add("done");
  }
  function frame(inner){
    return '<div class="prog"><span><span data-ui="item">'+esc(uiTxt("item"))+"</span> "+(i+1)+" / "+total+"</span><span>✓ "+score+"</span></div>"+inner+
     '<div class="fb" role="status" aria-live="polite"></div><div class="bar">'+bu("check","btn",' data-role="check"')+bu("next","btn ghost",' data-role="next" hidden')+"</div>";
  }
  function feedback(ok,why,extra){
    const fb=body.querySelector(".fb");
    fb.className="fb show "+(ok?"good":"bad");
    fb.innerHTML="<strong>"+esc(uiTxt(ok?"correct":"notq"))+"</strong>"+(extra||"")+(why&&typeof why==="object"?tr(why,"div",'class="fb-why"',"bi"):fmt(why||""));
    if(ok) score++;
    reportAnswer(ok);
    body.querySelector('[data-role="check"]').hidden=true;
    const nx=body.querySelector('[data-role="next"]'); nx.hidden=false; if(i===total-1)nx.textContent=uiTxt("seeRes"); nx.focus({preventScroll:true});
    nx.onclick=()=>{i++; i<total?show():finish();};
  }
  function show(){
    const it=a.items[i];
    if(a.type==="classify"){
      const s=esc(it.s).replace(/\[\[(.+?)\]\]/,"<mark>$1</mark>");
      body.innerHTML=frame('<div class="q-s">'+s+'</div><div class="opts" role="group">'+a.options.map(o=>'<button type="button" class="opt" aria-pressed="false" data-v="'+esc(o)+'">'+esc(o)+"</button>").join("")+"</div>");
      const ck=body.querySelector('[data-role="check"]'); ck.disabled=true; let pick=null;
      body.querySelectorAll(".opt").forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;pick=b.dataset.v;body.querySelectorAll(".opt").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));ck.disabled=false;}));
      ck.onclick=()=>{const ok=pick===it.a;body.querySelectorAll(".opt").forEach(x=>{x.disabled=true;if(x.dataset.v===it.a)x.classList.add("right");else if(x.dataset.v===pick)x.classList.add("wrong");});feedback(ok,it.why);};
    }
    else if(a.type==="tag"){
      const toks=it.s.match(/\{[^}]+\}|[A-Za-z0-9’'\-]+|[^\sA-Za-z0-9]/g)||[];
      let html="";toks.forEach((t,k)=>{const tgt=t[0]==="{";const w=tgt?t.slice(1,-1):t;const punct=/^[^A-Za-z0-9]$/.test(w);
        html+=punct?'<span class="tok punct">'+esc(w)+"</span>":'<button type="button" class="tok" aria-pressed="false" data-t="'+(tgt?1:0)+'">'+esc(w)+"</button>";});
      body.innerHTML=frame('<div class="q-s">'+html+"</div>");
      body.querySelectorAll("button.tok").forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;b.setAttribute("aria-pressed",String(b.getAttribute("aria-pressed")!=="true"));}));
      body.querySelector('[data-role="check"]').onclick=()=>{let ok=true;body.querySelectorAll("button.tok").forEach(b=>{const on=b.getAttribute("aria-pressed")==="true",t=b.dataset.t==="1";b.disabled=true;
        if(on&&t)b.classList.add("right");else if(on&&!t){b.classList.add("wrong");ok=false;}else if(!on&&t){b.classList.add("missed");ok=false;}});feedback(ok,it.why);};
    }
    else if(a.type==="gap"||a.type==="fix"){
      const inp=a.type==="gap"
        ? '<div class="q-s">'+esc(it.s).replace("___",'<span style="border-bottom:2px solid var(--ink3);padding:0 30px"> </span>')+'</div><p class="base">( <b>'+esc(it.base)+'</b> )</p><input class="txt" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="answer" data-uiph="typeHere" placeholder="'+esc(uiTxt("typeHere"))+'">'
        : '<textarea class="txt" style="min-height:70px;font-family:var(--serif);font-size:18px" aria-label="corrected sentence" spellcheck="false">'+esc(it.s)+"</textarea>";
      body.innerHTML=frame(inp);
      const f=body.querySelector(".txt"); f.focus({preventScroll:true});
      const go=()=>{const v=norm(f.value);const ok=okAns(it.a,v);f.disabled=true;
        feedback(ok,it.why,ok?"":'<span style="display:block;margin-bottom:4px">'+esc(uiTxt("accepted"))+" <b>"+esc(it.a[0])+"</b></span>");};
      body.querySelector('[data-role="check"]').onclick=go;
      if(a.type==="gap") f.addEventListener("keydown",e=>{if(e.key==="Enter"&&!f.disabled){e.preventDefault();go();}});
    }
    else if(a.type==="order"){
      const pool=shuffle(it.w.map((w,k)=>({w,k})),it.w.length*13+i);
      body.innerHTML=frame(tr(UI.build,"p",'class="base"',"en")+'<div class="tiles" data-z="ans" aria-label="your sentence"></div><div class="tiles" data-z="pool" style="border-style:solid;background:transparent">'+pool.map(p=>'<button type="button" class="tile" data-k="'+p.k+'">'+esc(p.w)+"</button>").join("")+"</div>");
      const ans=body.querySelector('[data-z="ans"]'),pl=body.querySelector('[data-z="pool"]');
      body.querySelectorAll(".tile").forEach(t=>t.addEventListener("click",()=>{if(t.disabled)return;(t.parentNode===pl?ans:pl).appendChild(t);}));
      body.querySelector('[data-role="check"]').onclick=()=>{const s=[...ans.querySelectorAll(".tile")].map(t=>t.textContent).join(" ");
        const ok=pl.children.length===0&&okAns(it.a,norm(s));body.querySelectorAll(".tile").forEach(t=>t.disabled=true);
        feedback(ok,it.why,ok?"":'<span style="display:block;margin-bottom:4px">'+esc(uiTxt("accepted"))+" <b>"+esc(it.a[0])+"</b></span>");};
    }
  }
  show();
}
function writeAct(a,body){
  const key="draft:"+a.id; const d=load(key,"");
  body.innerHTML='<textarea class="txt" aria-label="your text" data-uiph="typeHere" placeholder="'+esc(uiTxt("typeHere"))+'">'+esc(d)+'</textarea><div class="wc"><span data-n>0</span> <span data-ui="words">'+esc(uiTxt("words"))+'</span> · <span data-ui="saved">'+esc(uiTxt("saved"))+"</span></div>"+
    '<p style="margin:16px 0 4px;font-weight:600">'+tr(UI.selfcheck)+"</p>"+a.checklist.map((c,k)=>'<label class="check"><input type="checkbox"> <span>'+fmt(c)+"</span></label>").join("")+
    '<div class="bar">'+bu("model","btn ghost",' data-role="m"')+'</div><div class="fb neutral" role="status"></div>';
  const ta=body.querySelector("textarea"),n=body.querySelector("[data-n]");
  const upd=()=>{n.textContent=(ta.value.trim().match(/\S+/g)||[]).length;save(key,ta.value);};
  ta.addEventListener("input",upd);upd();
  body.querySelector('[data-role="m"]').addEventListener("click",()=>{const fb=body.querySelector(".fb");fb.classList.toggle("show");fb.innerHTML=fmt(a.model);});
}

/* ---------- boot ---------- */
syncLangButtons();
ROOT.lang=lang;
ROOT.querySelectorAll("[data-ui]").forEach(el=>{el.textContent=uiTxt(el.dataset.ui);});
ROUTE=route;
route();
return {route,stop(){if(railIO)railIO.disconnect();}};
})();


afterRoute()

function destroy() {
  if (dead) return
  dead = true
  abort.abort()
  TIMERS.forEach((id) => globalThis.clearTimeout(id))
  TIMERS.clear()
  TICKS.forEach((id) => globalThis.clearInterval(id))
  TICKS.clear()
  APP.stop()
  GAME._close()
  ROOT.querySelectorAll('.g-confetti,.g-spark').forEach((el) => el.remove())
}

return {
  destroy,
  /** Открыть экран раздела по адресу движка: #map, #bureau, #u01, #u01-practice, #case-c01, #refs. */
  go,
  /** Перерисовать текущий экран на месте (снимок прогресса с сервера пришёл позже первого кадра). */
  refresh() {
    if (dead) return
    const y = window.scrollY
    APP.route()
    afterRoute()
    window.scrollTo(0, y)
  },
  snapshot: () => ({ hash: HASH, state: copy(STATE) }),
  /** Состояние открытой стадии игры (очередь заданий, позиция) — для сверки с оракулом и e2e. */
  stage: () => GAME._state(),
}
}
