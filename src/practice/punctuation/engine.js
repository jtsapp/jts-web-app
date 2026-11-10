'use client'

// Punctuation World — движок раздела пунктуации, перенесённый из прототипа
// методиста почти дословно (как «Числа», Prepositions World и Pronunciation
// World): 20 страниц A0–C2 на пяти островах, у страницы Learn (что это, работа
// знака, когда, почему, как, примеры, «Hear the difference», реальный документ,
// «Don't confuse») и Play — приключение Декстера в семь стадий по банку
// предложений. Экран PunctuationPage монтирует его в Shadow DOM: классы
// прототипа (.top, .btn, .hero, .gate) совпадают с глобальными классами сайта.
//
// Тело — остаток единственного <script> прототипа без объявлений данных (тот,
// от которого считается хэш движка) в том же порядке и почти без правок.
// Отличия — только связь с приложением (спека
// 2026-11-10-tenses-punctuation-world-design.md, «Punctuation World» → «Сайт»):
// - данные — cfg.bundle с бэкенда (/mobile/punctuation), картинки — ссылками
//   бакета, копия — своя у каждого монтажа; логотипа в бандле нет;
// - роутер — переменная HASH вместо адреса страницы, ссылки в тени (#/…, #s-…)
//   перехватываются в корне;
// - перевод (data-tr), класс игры, спрайт знаков (--sprite, --world,
//   sprite-ok), тост, живой регион, искры, вспышка портала и выбор знака — на
//   корне раздела, а не на <html>/<body>; слушатели — на корне или окне и
//   снимаются в destroy();
// - прогресс read/p/fin — cfg.progress()/cfg.onProgress (синк с аккаунтом,
//   перечитывается на каждом экране); вид tr/mute/luna — cfg.prefs/onPrefs,
//   недоигранное приключение run — cfg.runs/onRuns (только устройство);
// - Луна читает голосом cfg.speak (Soniox), а не синтезом браузера; эффекты —
//   Web Audio, как у прототипа, контекст закрывается в destroy();
// - шапка без логотипа, на главной раздела — «назад» из раздела (cfg.onExit);
//   «Reset progress» и строки «progress is saved in this browser» нет: прогресс
//   общий с аккаунтом, а прототип спрашивал подтверждение про этот браузер;
// - каждое задание игры — в cfg.onAnswer(с первой попытки) (навык «грамматика»);
// - таймеры и кадры — через обёртки ниже: после destroy() ничего не сработает.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM), внутри — <div id="app">
 * @param {{ bundle: object, progress?: () => object, onProgress?: (state: object) => void,
 *   prefs?: () => object, onPrefs?: (prefs: object) => void, runs?: () => object, onRuns?: (runs: object) => void,
 *   onAnswer?: (ok: boolean) => void, speak?: (text: string, opts: { onEnd: Function }) => void,
 *   stopSpeech?: () => void, onExit?: () => void, onRoute?: (hash: string) => void }} cfg
 */
export function mountPunctuation(root, cfg) {
const { bundle, progress = () => null, onProgress = () => {}, prefs = () => null, onPrefs = () => {}, runs = () => null, onRuns = () => {}, onAnswer = () => {}, onExit = null, onRoute = () => {} } = cfg
const say = cfg.speak || ((t, o) => o && o.onEnd && o.onEnd())
const stopVoice = () => { try { (cfg.stopSpeech || (() => {}))() } catch (e) { /* голос — не повод ронять раздел */ } }
const ROOT = root
let dead = false
const abort = new AbortController()
const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: abort.signal })
const timers = new Set()
const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }
const clearTimeout = (id) => { timers.delete(id); globalThis.clearTimeout(id) }
const requestAnimationFrame = (fn) => globalThis.requestAnimationFrame((ts) => { if (!dead) fn(ts) })
const cancelAnimationFrame = (id) => globalThis.cancelAnimationFrame(id)
const answered = (ok) => { try { onAnswer(!!ok) } catch (e) { /* навык — не повод ронять игру */ } }
const activeEl = () => { const r = ROOT.getRootNode(); return (r && r.activeElement) || null }
const pull = (fn) => { try { const v = fn(); return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : null } catch (e) { return null } }
const copy = (x, empty) => (x == null ? empty : JSON.parse(JSON.stringify(x)))
let HASH = '#/'
// Данные — из бандла, в форме прототипа (имена ключей прототипа), своя копия на монтаж.
const ASSET = { ...(bundle.ASSET || {}) }
const ART = { ...(bundle.ART || {}) }
const ADV_ART = { ...(bundle.ADV_ART || {}) }
const ADV_ART2 = { ...(bundle.ADV_ART2 || {}) }
const LESSONS = copy(bundle.LESSONS, { SOURCES: {}, TOPICS: [], LX: {} })
const CUE = copy(bundle.CUE, {})
const BANK = copy(bundle.BANK, [])
const MEANING = copy(bundle.MEANING, [])

/* =====================================================================
   PUNCTUATION WORLD · application
   One journey per page:  LEARN (#/lesson/N)  →  PLAY NOW  →  PLAY (#/play/N)  →  next page
   Views: home (world + islands) · lesson (learn mode) · play (game mode) · final rescue
   ===================================================================== */
const {SOURCES,TOPICS,LX}=LESSONS;
const app=ROOT.querySelector("#app");
const $=(s,r=ROOT)=>r.querySelector(s), $$=(s,r=ROOT)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const rich=s=>esc(s).replace(/\{\{(.+?)\}\}/g,'<mark class="hl">$1</mark>').replace(/\n/g,"<br>");
const plain=s=>String(s).replace(/\{\{(.+?)\}\}/g,"$1");
const shuffle=(a,seed)=>{a=a.slice();let s=seed||Math.floor(Math.random()*1e9);const r=()=>(s=(s*9301+49297)%233280)/233280;for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---------- icons ---------- */
const I={
 star:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.4l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
 sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.6 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
 mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
 speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 tr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h9M8.5 3v2M6 5c.6 3 2.6 5.6 5.5 7M11 5c-.6 3.2-2.8 6-6.5 7.5M13.5 21l4-10 4 10M15 17.5h5"/></svg>'
};
const stars=(n,cls)=>`<span class="stars ${cls||""}" aria-label="${n} of 3 stars">${[0,1,2].map(i=>`<i class="${i<n?"on":""}">${I.star}</i>`).join("")}</span>`;

/* ---------- marks: families and knitted sprites ---------- */
const SPRITE_I={".":0,",":1,"?":2,"!":3,":":4,";":5,"“":6,"”":7,"’":8,"(":9,")":10,"–":11,"—":11};
const FAMS={end:{n:"Endings",d:"stop · ask · exclaim",ex:"."},link:{n:"Links",d:"join · pause",ex:","},sig:{n:"Signals",d:"announce · turn",ex:":"},voice:{n:"Voices & asides",d:"speech · extra information",ex:"“"},word:{n:"Word marks",d:"inside and between words",ex:"’"}};
function famOf(v){
 if(v==null||v==="")return "";
 v=String(v).trim();
 if(/^’\./.test(v))return "end";
 if(/^(’s|s’|s|’|-)$/.test(v))return "word";
 if(/^[.?!]/.test(v))return "end";
 if(/^[,;]/.test(v))return "link";
 if(/^[:–—]/.test(v))return "sig";
 if(/^[“”‘(\)\[\]…]/.test(v))return "voice";
 if(/^[a-z]/i.test(v))return "sig";
 return "sig";
}
const mk=(g,size)=>{const i=SPRITE_I[g];return `<span class="mk f-${famOf(g)||"sig"}"${i!=null?` data-i style="--i:${i}${size?`;--s:${size}`:""}"`:size?` style="--s:${size}"`:""} aria-hidden="true"><i>${esc(g)}</i></span>`};
const GN={".":["Full stop","period in American English"],"?":["Question mark","ends a direct question"],"!":["Exclamation mark","exclamation point in American English"],",":["Comma","the most frequent mark in English"],"’":["Apostrophe","the same shape as a closing single quote"],"“”":["Quotation marks","also called inverted commas or speech marks (UK)"],"‘’":["Single quotation marks","first choice in many British books"],":":["Colon","two dots, one above the other"],";":["Semicolon","a dot above a comma"],"–":["En dash","longer than a hyphen; spaced in British style"],"—":["Em dash","the longest dash; closed up in American style"],"-":["Hyphen","the shortest line; joins words"],"()":["Round brackets","parentheses in American English"],"[]":["Square brackets","brackets in American English"],"…":["Ellipsis","three dots as one character"]};
const TOPIC_MARKS={11:["“”"],16:["–","()"],18:["“”","‘’"],19:["–","[]"],20:["…","[]"]};
const topicMarks=t=>TOPIC_MARKS[t.id]||[t.g];
const markGlyphs=m=>m==="()"?["(",")"]:m==="[]"?["[","]"]:m==="“”"?["“","”"]:m==="‘’"?["‘","’"]:[m];
const topicFam=t=>famOf(markGlyphs(topicMarks(t)[0])[0])||"sig";
const mkSet=(t,size)=>topicMarks(t).slice(0,1).flatMap(markGlyphs).map(g=>mk(g,size)).join("");
/* ---------- world data ---------- */
const ISLES=[
 {id:"A1",band:"A0–A1",name:["Full Stop Harbour","Гавань точки","Нүкте айлағы"],line:["Ending sentences, asking questions, shouting and listing.","Конец предложения, вопросы, восклицания и списки.","Сөйлемді аяқтау, сұрақ, леп және тізім."],bp:"42% 36%",lm:"the exclamation-mark lighthouse"},
 {id:"A2",band:"A2",name:["Comma Bridges","Мосты запятых","Үтір көпірлері"],line:["Joining sentences, opening gates and showing owners.","Соединение предложений, вводные части и апострофы.","Сөйлемдерді жалғау, кіріспе бөліктер және апострофтар."],bp:"72% 46%",lm:"the comma bridge"},
 {id:"B1",band:"B1",name:["Quotation Quarter","Квартал кавычек","Тырнақша мекені"],line:["Clauses, voices, lists and signposts.","Придаточные, прямая речь, списки и связки.","Бағыныңқылар, төл сөз, тізімдер және байланыстырғыштар."],bp:"98% 54%",lm:"the quotation gate"},
 {id:"B2",band:"B2",name:["Semicolon Heights","Высоты точки с запятой","Нүктелі үтір биіктері"],line:["Balance, emphasis, hyphens and two Englishes.","Баланс, акцент, дефисы и два варианта английского.","Тепе-теңдік, екпін, дефистер және ағылшынның екі нұсқасы."],bp:"100% 14%",bs:"420%",lm:"the semicolon tower"},
 {id:"C1",band:"C1–C2",name:["The Editors’ Observatory","Обсерватория редакторов","Редакторлар обсерваториясы"],line:["Precise marks and honest academic quotation.","Точные знаки и честное академическое цитирование.","Нақты белгілер және адал академиялық дәйексөз."],bp:"85% 17%",lm:"the question portal"}
];
const CREW={
 dexter:{n:"Dexter",job:"Your guide",d:"Leads the Expedition and shows you where to go next. Short tips, never lectures.",tr:["Ведёт экспедицию и подсказывает, куда идти дальше.","Экспедицияны бастап, қайда бару керегін көрсетеді."],pose:{intro:"guide",ok:"win",part:"think",bad:"oops",idle:"front",cheer:"cheer",jump:"jump"}},
 luna:{n:"Luna",job:"The Reader",d:"Patient and thoughtful. She reads your sentences aloud, so you hear what every mark does.",tr:["Терпеливая и вдумчивая. Читает ваши предложения вслух, чтобы вы услышали работу каждого знака.","Сабырлы әрі ойшыл. Әр белгінің қызметін естуіңіз үшін сөйлемдеріңізді дауыстап оқиды."],pose:{intro:"kind",ok:"cheer",part:"listen",bad:"listen",idle:"kind"}},
 spark:{n:"Spark",job:"The Tone Coach",d:"Pure energy. Runs the Tone Studio, where marks change volume, rhythm and feeling.",tr:["Сплошная энергия. Ведёт студию тона, где знаки меняют громкость, ритм и чувство.","Нағыз қуат. Белгілер дыбысты, ырғақты және сезімді өзгертетін Тон студиясын басқарады."],pose:{intro:"thumb",ok:"jump",part:"fist",bad:"fist",idle:"thumb"}},
 aizere:{n:"Aizere",job:"The Editor",d:"Speaks Kazakh. Catches the mistakes that come from Kazakh and Russian habits, and opens the translations.",tr:["Говорит по-казахски. Замечает ошибки, пришедшие из казахского и русского, и открывает переводы.","Қазақша сөйлейді. Қазақ және орыс тілдерінен келетін қателерді байқап, аудармаларды ашады."],pose:{intro:"explain",ok:"cheer",part:"explain",bad:"explain",idle:"wave"}}
};
const av=(who,pose)=>ASSET[who+"-"+(CREW[who].pose[pose]||pose)]||ASSET[who+"-"+CREW[who].pose.idle];
const img=(who,pose,cls,alt)=>`<img class="${cls||""}" src="${av(who,pose)}" alt="${esc(alt||"")}" ${alt?"":'aria-hidden="true"'} draggable="false">`;

/* ---------- progress ---------- */
/* порт: прогресс (read, p, fin) — cfg.progress/onProgress, синк с аккаунтом; вид (tr, mute, luna) и недоигранное
   приключение (run) — устройство, cfg.prefs/cfg.runs. Перечитывается на каждом экране (route): снимок сервера
   приходит позже первого кадра. Запись — только того, что поменялось: хранилище «Практики» шлёт её на сервер. */
let PR={read:{},p:{},tr:"",mute:false,luna:false,fin:0};
const wrote={};
function load(){
 PR=Object.assign({read:{},p:{},tr:"",mute:false,luna:false,fin:0},pull(progress),pull(prefs));
 const r=pull(runs);if(r&&Object.keys(r).length)PR.run=r;
 PR.read=PR.read||{};PR.p=PR.p||{};
}
function put(k,fn,v){const j=JSON.stringify(v);if(wrote[k]===j)return;wrote[k]=j;try{fn(JSON.parse(j))}catch(e){/* хранилище — не повод ронять раздел */}}
const save=()=>{if(dead)return;put("p",onProgress,{read:PR.read,p:PR.p,fin:+PR.fin||0});put("v",onPrefs,{tr:PR.tr||"",mute:!!PR.mute,luna:!!PR.luna});put("r",onRuns,PR.run||{})};
load();
const pStars=id=>+PR.p[id]||0;
const totalStars=()=>Object.values(PR.p).reduce((a,b)=>a+(+b||0),0)+(+PR.fin||0);
ROOT.dataset.tr=PR.tr||"";

/* ---------- translations toggle ---------- */
const bi=(en,ru,kk,tag)=>{tag=tag||"p";const tn=tag.split(" ")[0];return `<${tag}${tag.includes("class=")?"":' class="en"'}>${rich(en)}</${tn}>${ru?`<p class="tr tr-ru" lang="ru">${esc(ru)}</p>`:""}${kk?`<p class="tr tr-kk" lang="kk">${esc(kk)}</p>`:""}`};
const trs=(ru,kk)=>`${ru?`<p class="tr tr-ru" lang="ru">${esc(ru)}</p>`:""}${kk?`<p class="tr tr-kk" lang="kk">${esc(kk)}</p>`:""}`;
function setTr(k){PR.tr=PR.tr===k?"":k;save();ROOT.dataset.tr=PR.tr;$$("[data-act=tr]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.k===PR.tr)))}
const trBar=cls=>`<div class="trbar ${cls||""}" role="group" aria-label="Show translations"><span class="cap"><img src="${av("aizere","idle")}" alt="" aria-hidden="true"><span>Aizere translates</span></span>${[["kk","Қазақша"],["ru","Русский"]].map(([k,l])=>`<button type="button" class="trb" data-act="tr" data-k="${k}" lang="${k}" aria-pressed="${PR.tr===k}">${l}</button>`).join("")}</div>`;

/* порт: Луна читает голосом cfg.speak (Soniox, британский голос; запасной — голос устройства), а не
   синтезом браузера. Текст чистится так же, как в прототипе. Кнопка гаснет, когда голос кончился, оборвался или
   не зазвучал вовсе (onEnd зовётся всегда). Повторное нажатие той же кнопки — стоп, как у прототипа: прежнюю
   кнопку запоминаем ДО обрыва голоса — его onEnd может прийти сразу. */
let speakingBtn=null;
function speak(text,btn){
 if(PR.mute){toast("Sound is off. Turn it on to hear Luna read.");return}
 try{
  const was=speakingBtn;speakingBtn=null;if(was)was.classList.remove("on");
  stopVoice();
  if(btn&&was===btn)return;
  const t=String(text).replace(/[“”‘]/g,"").replace(/’(?=\w)/g,"'").replace(/’/g,"").replace(/ – /g,", ").replace(/—/g,", ").replace(/\s+/g," ").trim();
  if(btn){btn.classList.add("on");speakingBtn=btn}
  say(t,{onEnd:()=>{if(btn){btn.classList.remove("on");if(speakingBtn===btn)speakingBtn=null}}});
 }catch(e){}
}
function stopSpeech(){stopVoice();if(speakingBtn){speakingBtn.classList.remove("on");speakingBtn=null}}

/* ---------- effects ---------- */
function burst(el,n){if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;const r=el.getBoundingClientRect(),box=document.createElement("div");box.className="burst";box.style.left=(r.left+r.width/2)+"px";box.style.top=(r.top+r.height/2)+"px";const C=["#874BF8","#0AC7FF","#00D441","#FF7D1D","#FFAD00"];for(let i=0;i<(n||18);i++){const s=document.createElement("i"),a=Math.random()*Math.PI*2,d=50+Math.random()*90;s.style.background=C[i%C.length];s.style.setProperty("--x",Math.cos(a)*d+"px");s.style.setProperty("--y",Math.sin(a)*d-30+"px");box.appendChild(s)}ROOT.appendChild(box);setTimeout(()=>box.remove(),900)}
function shake(el){if(!el)return;el.classList.remove("shake");void el.offsetWidth;el.classList.add("shake")}
let toastT;function toast(msg){let t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","status");t.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#141217;color:#fff;padding:12px 18px;border-radius:999px;font-weight:600;font-size:14.5px;z-index:90;max-width:92vw;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)";ROOT.appendChild(t)}t.textContent=msg;t.style.display="block";clearTimeout(toastT);toastT=setTimeout(()=>t.style.display="none",2600)}

/* ---------- audio engine ----------
   All sounds are synthesised with the Web Audio API: no audio files to download or fail.
   Bell partials, plucks and filtered noise run through a soft reverb and a compressor
   (so nothing clips). The context starts only after the learner's first tap or key press
   (browser autoplay rules). Each sound has a cooldown and the engine caps live voices, so
   sounds never pile up. Mute suspends the context and also stops Luna's reading voice. */
const AU={ctx:null,master:null,rev:null,noise:null,voices:0,last:{}};
function auInit(){
 if(PR.mute)return null;
 if(AU.ctx){if(AU.ctx.state==="suspended")AU.ctx.resume().catch(()=>{});return AU.ctx}
 try{
  const C=new(window.AudioContext||window.webkitAudioContext)();
  const comp=C.createDynamicsCompressor();comp.threshold.value=-20;comp.knee.value=12;comp.ratio.value=4;
  const m=C.createGain();m.gain.value=.5;m.connect(comp);comp.connect(C.destination);
  const len=Math.floor(C.sampleRate*1.4),ir=C.createBuffer(2,len,C.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  const cv=C.createConvolver();cv.buffer=ir;const rg=C.createGain();rg.gain.value=.25;cv.connect(rg);rg.connect(m);
  const nb=C.createBuffer(1,C.sampleRate,C.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  Object.assign(AU,{ctx:C,master:m,rev:cv,noise:nb});return C;
 }catch(e){return null}
}
["pointerdown","keydown","touchstart"].forEach(ev=>on(ROOT,ev,()=>auInit(),{capture:true,passive:true}));
function ac(){if(PR.mute||!AU.ctx)return null;if(AU.ctx.state==="suspended")AU.ctx.resume().catch(()=>{});return AU.ctx}
function out(C,node,rev){node.connect(AU.master);if(rev){const s=C.createGain();s.gain.value=rev;node.connect(s);s.connect(AU.rev)}}
function nt(f,o){const C=ac();if(!C||AU.voices>48)return;o=o||{};
 try{const t0=C.currentTime+(o.t||0),d=o.d||.3,osc=C.createOscillator(),v=C.createGain();
  osc.type=o.type||"sine";osc.frequency.setValueAtTime(f,t0);if(o.glide)osc.frequency.exponentialRampToValueAtTime(o.glide,t0+d*.85);if(o.det)osc.detune.value=o.det;
  v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(o.g||.15,t0+(o.a||.006));v.gain.exponentialRampToValueAtTime(.0001,t0+d);
  osc.connect(v);let n=v;if(o.lp){const fl=C.createBiquadFilter();fl.type="lowpass";fl.frequency.value=o.lp;v.connect(fl);n=fl}
  out(C,n,o.rev==null?.35:o.rev);AU.voices++;osc.onended=()=>{AU.voices--};osc.start(t0);osc.stop(t0+d+.05)}catch(e){}}
function nz(o){const C=ac();if(!C||AU.voices>48)return;o=o||{};
 try{const t0=C.currentTime+(o.t||0),d=o.d||.25,s=C.createBufferSource(),f=C.createBiquadFilter(),v=C.createGain();
  s.buffer=AU.noise;f.type=o.type||"bandpass";f.frequency.setValueAtTime(o.f||1200,t0);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t0+d);f.Q.value=o.q||1;
  v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(o.g||.08,t0+(o.a||.01));v.gain.exponentialRampToValueAtTime(.0001,t0+d);
  s.connect(f);f.connect(v);out(C,v,o.rev==null?.2:o.rev);AU.voices++;s.onended=()=>{AU.voices--};s.start(t0,Math.random()*.5);s.stop(t0+d+.05)}catch(e){}}
const hz=n=>440*Math.pow(2,(n-69)/12);
function bell(n,o){o=o||{};const f=hz(n),g=o.g||.11;nt(f,Object.assign({d:1,g},o));nt(f*2.01,Object.assign({},o,{d:.5,g:g*.28,rev:.25}));nt(f*3.98,Object.assign({},o,{d:.18,g:g*.08,rev:.1}))}
function pluck(n,o){o=o||{};nt(hz(n),Object.assign({type:"triangle",d:.22,g:.1,lp:3200},o))}
function once(id,ms,fn){const now=performance.now();if(AU.last[id]&&now-AU.last[id]<ms)return;AU.last[id]=now;fn()}
const SFX={
 tap:()=>once("tap",50,()=>{nz({d:.04,g:.05,f:3200,q:4,rev:0});nt(1250,{d:.05,g:.035,type:"triangle",rev:0})}),
 place:()=>once("place",60,()=>{pluck(79);pluck(86,{t:.05,g:.08})}),
 ok:()=>once("ok",120,()=>{bell(84);bell(88,{t:.07});bell(91,{t:.14,d:1.3})}),
 bad:()=>once("bad",200,()=>{nt(hz(62),{type:"triangle",d:.24,g:.08,lp:900,rev:.15});nt(hz(57),{t:.14,type:"triangle",d:.38,g:.07,lp:700,rev:.15})}),
 step:()=>once("step",90,()=>nz({d:.05,g:.035,f:700,q:2,rev:0})),
 run:()=>{[0,.16,.32,.48].forEach(t=>nz({t,d:.05,g:.03,f:650+Math.random()*200,q:2,rev:0}))},
 jump:()=>once("jump",120,()=>nt(320,{glide:720,d:.18,g:.06,type:"triangle",rev:.1})),
 stone:()=>once("stone",120,()=>{nt(110,{glide:70,d:.28,g:.18,rev:.1});nz({d:.12,g:.06,f:400,q:1,rev:.1});bell(88,{t:.12,g:.08})}),
 portal:()=>once("portal",300,()=>{nz({d:1.1,g:.05,f:600,f2:5000,q:6,a:.3,rev:.6});[84,88,91,96].forEach((n,i)=>bell(n,{t:.1+i*.09,g:.07}))}),
 spring:()=>once("spring",200,()=>{nt(180,{glide:900,d:.32,g:.1,type:"triangle",rev:.15});nt(240,{t:.03,glide:1100,d:.3,g:.04,type:"sine",det:20,rev:.1})}),
 key:()=>once("key",150,()=>{nz({d:.04,g:.09,f:4500,q:6,rev:0});nz({t:.06,d:.05,g:.07,f:3000,q:6,rev:0});pluck(76,{t:.12,g:.06})}),
 door:()=>once("door",250,()=>{nz({d:.55,g:.05,f:300,f2:180,q:8,rev:.3});nt(98,{t:.05,d:.5,g:.06,type:"triangle",lp:500})}),
 gate:()=>once("gate",250,()=>{nt(hz(55),{d:1,g:.08,type:"triangle",lp:1200,a:.08});nt(hz(62),{t:.08,d:1,g:.06,type:"triangle",lp:1200,a:.08});bell(86,{t:.25,g:.06})}),
 stitch:()=>once("stitch",45,()=>{nz({d:.03,g:.05,f:5000,q:5,rev:0});pluck(91,{d:.12,g:.05})}),
 bridge:()=>once("bridge",300,()=>{[79,83,86].forEach((n,i)=>pluck(n,{t:i*.06,g:.08}));bell(91,{t:.2,g:.08})}),
 repair:()=>once("repair",300,()=>{[96,100,103,108].forEach((n,i)=>bell(n,{t:i*.05,g:.05,d:.6}))}),
 restore:()=>once("restore",400,()=>{[72,76,79,84].forEach((n,i)=>nt(hz(n),{t:i*.02,d:1.6,g:.05,type:"triangle",lp:2200,a:.25,rev:.6}));bell(96,{t:.3,g:.07})}),
 rise:()=>once("rise",300,()=>nz({d:.8,g:.05,f:250,f2:900,q:2,a:.25,type:"lowpass",rev:.3})),
 fall:()=>once("fall",300,()=>nz({d:.45,g:.035,f:2500,f2:600,q:1,a:.05,type:"lowpass",rev:.2})),
 area:()=>once("area",500,()=>{nz({d:.9,g:.04,f:400,f2:3000,q:1,a:.3,type:"lowpass",rev:.5});[67,71,74].forEach((n,i)=>bell(n+12,{t:.35+i*.11,g:.06}))}),
 stage:()=>once("stage",600,()=>{[72,76,79,84].forEach((n,i)=>bell(n,{t:i*.1,g:.08}));nt(hz(48),{d:.8,g:.05,type:"triangle",lp:600,t:.3})}),
 free:()=>once("free",600,()=>{for(let i=0;i<9;i++)bell(90+((i*5)%12),{t:i*.05,g:.045,d:.7})}),
 pop:()=>{nz({d:.18,g:.06,f:900+Math.random()*1500,q:.7,rev:.4});nz({t:.05,d:.6,g:.025,f:6000,q:.5,type:"highpass",rev:.3})},
 fanfare:()=>once("fanfare",2000,()=>{const seq=[[72,0],[76,.14],[79,.28],[84,.46],[79,.7],[84,.84]];seq.forEach(([n,t])=>{bell(n+12,{t,g:.09,d:1.2});nt(hz(n),{t,d:.5,g:.05,type:"triangle",lp:2400})});[60,64,67,72].forEach(n=>nt(hz(n),{t:.84,d:2.2,g:.045,type:"triangle",lp:1800,a:.2,rev:.6}))})
};
const sfx={tap:SFX.tap,place:SFX.place,ok:SFX.ok,bad:SFX.bad,win:SFX.stage};
function toggleMute(){PR.mute=!PR.mute;save();
 if(PR.mute){stopSpeech();if(AU.ctx)AU.ctx.suspend().catch(()=>{})}else{auInit();SFX.tap()}
 $$("[data-act=mute]").forEach(b=>{b.innerHTML=PR.mute?I.mute:I.sound;b.setAttribute("aria-pressed",String(!PR.mute));b.setAttribute("aria-label",PR.mute?"Sound off":"Sound on")})}

function announce(t){let l=$("#live");if(!l){l=document.createElement("div");l.id="live";l.className="sr";l.setAttribute("aria-live","polite");ROOT.appendChild(l)}l.textContent="";setTimeout(()=>l.textContent=t,30)}

/* ---------- header ---------- */
/* порт: без логотипа — шапка приложения уже есть; на главной раздела — «назад» из раздела (cfg.onExit) */
function header(cur,main){return `<header class="top"><div class="wrap">
 ${main&&onExit?`<button class="ibtn" id="pu-exit" aria-label="Back">${I.back}</button>`:""}<button class="brand" data-go="#/" aria-label="Just To Study · Punctuation World home"><span class="brand-name">Punctuation <b>World</b></span></button>
 <nav class="nav" aria-label="Main"><button data-go="#/islands" ${cur==="islands"?'aria-current="page"':""}>Islands</button></nav>
 <span class="sp"></span>
 <span class="pill" title="Stars earned in Play">${I.star}<b>${totalStars()}</b><small>stars</small></span>
 ${trBar()}
 <button class="ibtn" data-act="mute" aria-pressed="${!PR.mute}" aria-label="${PR.mute?"Sound off":"Sound on"}">${PR.mute?I.mute:I.sound}</button>
</div></header>`}

/* ---------- the journey: Learn → Play → next page ---------- */
function nextStep(){
 for(const t of TOPICS){if(!PR.read[t.id])return {k:"learn",t};if(!pStars(t.id))return {k:"play",t}}
 return null;
}
const stepHash=s=>!s?null:s.k==="learn"?`#/lesson/${s.t.id}`:`#/play/${s.t.id}`;
function stepBtn(s,prefix){
 if(!s)return `<button class="btn btn-p" data-go="#/islands">${I.check} Every page learned and played</button>`;
 const run=s.k==="play"&&PR.run&&PR.run[s.t.id];
 return s.k==="learn"?`<button class="btn btn-p step-btn" data-go="#/lesson/${s.t.id}">${I.next}<span><small>${prefix} · Learn · page ${s.t.id}</small>${esc(s.t.title)}</span></button>`
  :`<button class="btn btn-p step-btn" data-play="#/play/${s.t.id}">${I.play}<span><small>${prefix} · Play · page ${s.t.id}${run?` · stage ${run.s+1}`:""}</small>${esc(s.t.title)}</span></button>`;
}

/* ---------- router ---------- */
let S={isle:null,obs:null,toGate:false};
/* порт: адрес раздела — переменная HASH, а не адрес страницы: адрес приложения не трогаем */
function go(h){if(dead)return;HASH=String(h||"#/");route()}
function route(){
 if(dead)return;load();
 stopSpeech();if(S.obs){S.obs.disconnect();S.obs=null}gameTeardown();
 ROOT.classList.remove("in-game");
 const h=HASH.replace(/^#\/?/,"");let m;
 if((m=h.match(/^lesson\/(\d+)$/))&&TOPICS.find(t=>t.id==m[1]))lessonView(+m[1]);
 else if((m=h.match(/^play\/(\d+|final)$/)))playView(m[1]);
 else if(h==="adventure"||h==="expedition"||/^play\//.test(h)){go(stepHash(nextStep())||"#/islands");return}
 else if((m=h.match(/^islands(?:\/(A1|A2|B1|B2|C1))?$/))){if(m[1])S.isle=m[1];home("islands")}
 else home();
 app.classList.remove("view-in");void app.offsetWidth;app.classList.add("view-in");
 try{onRoute(HASH)}catch(e){/* прокрутка — не повод ронять переход */}
}

/* ======================= HOME ======================= */
const lessonsIn=id=>TOPICS.filter(t=>t.lv===id);
function home(anchor){
 const ns=nextStep(),started=Object.keys(PR.read).length+Object.keys(PR.p).length>0;
 const nextIsle=ISLES.find(i=>lessonsIn(i.id).some(t=>!PR.read[t.id]||!pStars(t.id)))||ISLES[0];
 if(!S.isle)S.isle=nextIsle.id;
 const played=TOPICS.filter(t=>pStars(t.id)).length;
 app.innerHTML=header(anchor==="islands"?"islands":"",true)+`
 <section class="hero" aria-labelledby="h-title"><div class="hero-frame">
  <div class="hero-copy">
   <span class="eyebrow">${mk(".","18px")} Just To Study · English punctuation</span>
   <h1 id="h-title">Punctuation <span>World</span></h1>
   <div class="lead">${bi("Every mark has a job. Learn what it does, then play it straight away to help Dexter escape the Murmur.","У каждого знака своя работа. Узнайте, что он делает, и сразу сыграйте: помогите Декстеру уйти от серого прилива.","Әр белгінің өз қызметі бар. Оның не істейтінін біліп, бірден ойнаңыз: Декстерге сұр толқыннан құтылуға көмектесіңіз.")}</div>
   <div class="ctas">${stepBtn(ns,started?"Continue":"Start")}<button class="btn btn-s" data-go="#/islands">All islands</button></div>
   <ol class="rhythm" aria-label="How every page works"><li><i>${I.next}</i><b>Learn</b><span>the rule</span></li><li class="ar" aria-hidden="true"></li><li class="p"><i>${I.play}</i><b>Play</b><span>use it at once</span></li><li class="ar" aria-hidden="true"></li><li><i>${I.star}</i><b>Next mark</b><span>and again</span></li></ol>
  </div>
  <div class="hero-stage">
   <img class="hero-art" src="${ART.world}" ${ART.world.startsWith("data:")?"":`srcset="${ART.worldM} 1280w, ${ART.world} 2400w" sizes="100vw"`} alt="Punctuation World: floating speech-bubble islands with an exclamation-mark lighthouse, a comma bridge, a quotation-mark gate and a question-mark portal" onerror="this.remove()" onload="this.closest('.hero').classList.add('has-art')">
   <span class="ledge" aria-hidden="true"></span><span class="fb-isle" style="right:8%;top:22%;width:22%;height:26%" aria-hidden="true"></span><span class="fb-isle" style="right:34%;top:40%;width:16%;height:20%" aria-hidden="true"></span>
   <div class="crew" aria-hidden="true">
    <span class="shadow" style="left:6%;width:20%"></span><span class="shadow" style="left:26%;width:18%"></span><span class="shadow" style="left:46%;width:20%"></span><span class="shadow" style="left:66%;width:16%"></span>
    <img class="c1 bob" src="${av("dexter","intro")}" alt=""><img class="c2 bob" src="${av("luna","intro")}" alt=""><img class="c3 bob" src="${av("spark","intro")}" alt=""><img class="c4 bob" src="${av("aizere","idle")}" alt="">
   </div>
   <span class="drift" style="left:46%;top:16%">${mk(",","46px")}</span>
  </div>
 </div></section>

 <section class="sec" id="islands" aria-labelledby="isl-h" style="padding-top:20px"><div class="wrap">
  <div class="sec-head"><div><span class="eyebrow">Five islands · A0 to C2</span><h2 id="isl-h">Twenty pages. Learn each one, then play it.</h2><p class="sub">Every page teaches one mark in full. At the end, one button takes you straight into the game.</p></div></div>
  <div class="legend" aria-label="Mark families">${Object.entries(FAMS).map(([k,f])=>`<span class="fam f-${k}">${mk(f.ex)}${f.n}<small>${f.d}</small></span>`).join("")}</div>
  <div class="isles" role="tablist" aria-label="Islands">${ISLES.map(i=>{const L=lessonsIn(i.id),n=L.length*2,r=L.filter(t=>PR.read[t.id]).length+L.filter(t=>pStars(t.id)).length;return `<button class="isle-tab" role="tab" id="tab-${i.id}" aria-controls="isle-panel" aria-selected="${S.isle===i.id}" data-act="isle" data-k="${i.id}"><div class="isle-art" style="--bp:${i.bp}${i.bs?`;--bs:${i.bs}`:""}"><span class="band">${i.band}</span></div><div class="meta"><h3>${esc(i.name[0])}</h3><div class="bar"><i style="width:${Math.round(r/n*100)}%"></i></div><small>${L.length} pages · ${L.filter(t=>pStars(t.id)).length} played</small></div></button>`}).join("")}</div>
  <div id="isle-panel" role="tabpanel">${islePanel(S.isle)}</div>
 </div></section>

 <section class="sec" aria-labelledby="fin-h" style="padding-top:20px"><div class="wrap">
  <div class="exband"><img class="bg" src="${ADV_ART.harbourLit}" alt="" loading="lazy" onerror="this.remove()">
   <div class="panel"><span class="eyebrow">Play · every page</span><h2 id="fin-h">Dexter and the Murmur</h2>
    ${bi("Every page ends in a full adventure: seven stages from Lantern Dock to the lighthouse, with the marks you have just learned and the ones before them.","Каждая страница заканчивается полным приключением: семь этапов от Фонарной пристани до маяка — со знаками, которые вы только что изучили, и с предыдущими.","Әр бет толық шытырман оқиғамен аяқталады: Фонарь айлағынан маякқа дейін жеті кезең — жаңа үйренген белгілермен де, бұрынғылармен де.")}
    <p class="lockline" style="margin-top:14px">${I.star} ${played} of ${TOPICS.length} adventures completed</p>
    <div style="margin-top:14px">${stepBtn(ns,started?"Continue":"Start")}</div>
   </div></div>
 </div></section>
 ${footer()}`;
 if(anchor==="islands"){const el=$("#islands");if(el)el.scrollIntoView({block:"start"})}else window.scrollTo(0,0);
}
function islePanel(id){
 const i=ISLES.find(x=>x.id===id),list=lessonsIn(id),nx=list.find(t=>!PR.read[t.id]||!pStars(t.id));
 return `<div class="isle-panel"><div class="intro"><span class="eyebrow">${i.band}</span><h3>${esc(i.name[0])}</h3>${trs(i.name[1],i.name[2])}${bi(i.line[0],i.line[1],i.line[2])}
  ${says("dexter","guide",nx?`Next up: page ${nx.id}. Learn it, then play it.`:"Island complete. Every page learned and played!")}</div>
  <ul class="topics">${list.map(t=>{const r=PR.read[t.id],s=pStars(t.id);return `<li><button class="topic" data-go="#/lesson/${t.id}"><span class="mkbox f-${topicFam(t)}">${mkSet(t)}</span><span class="tx"><span class="num">Page ${t.id}</span><b>${esc(t.title)}</b><span>${esc(t.fn)}</span></span><span class="lp2" aria-label="${r?"Learned":"Not learned yet"}; ${s?s+" stars in Play":"not played yet"}"><span class="st-l ${r?"on":""}">${r?I.check:""}Learn</span><span class="st-p ${s?"on":""}">${s?stars(s,"sm"):`${I.play}Play`}</span></span></button></li>`}).join("")}</ul></div>`;
}
const says=(who,pose,html,extra)=>`<div class="says ${extra||""}">${img(who,pose,"av")}<div class="bub"><b class="who">${CREW[who].n}</b>${html}</div></div>`;
function footer(){return `<footer class="foot"><div class="wrap">
 <details class="method"><summary>How Punctuation World teaches, and where the rules come from</summary><ul>
  <li><b>Sourced rules.</b> Every lesson labels each point as a Rule, Standard practice, Style choice or Option and lists its sources: Purdue OWL, the UNC Writing Center, The Chicago Manual of Style (18th ed., 2024), APA Style, MLA, New Hart’s Rules (Oxford) and The Cambridge Grammar of the English Language. British English is the default; American conventions are shown wherever they differ.</li>
  <li><b>Learn, then play.</b> Each page teaches the mark in full: what it looks like, what it does, when to use it, why it matters and how to use it well. Teaching ends there. One button opens the game for that page.</li>
  <li><b>The move is the rule.</b> In play, your punctuation choice is the action: it makes a stone solid, opens a door or breaks the bridge (intrinsic integration; Habgood &amp; Ainsworth, 2011).</li>
  <li><b>Retrieval, not rereading.</b> You choose and place marks yourself instead of reading them again (Roediger &amp; Karpicke, 2006).</li>
  <li><b>Short feedback in play.</b> A wrong mark shows its consequence and the correct version at once, with a one-line cue, and the game keeps moving. The full explanation stays on the lesson page.</li>
  <li><b>Grammar inside writing.</b> Punctuation is practised in real sentences, messages and stories rather than in isolated drills (Myhill et al., 2012).</li>
 </ul></details>
 <div class="row"><span>Just To Study · Punctuation World</span></div>
</div></footer>`}

/* ======================= LESSON ======================= */
const TAGN={Rule:"Rule",Standard:"Standard",Style:"Style choice",Option:"Option"};
const TAGD={Rule:"Always true in standard English.",Standard:"What careful writers normally do.",Style:"Style guides differ — choose one and be consistent.",Option:"You may choose."};
const L1RX=/Russian|Kazakh/;
function lessonView(id){
 const t=TOPICS.find(x=>x.id===id),X=LX[id],T=X.tr,isle=ISLES.find(i=>i.id===t.lv),f=topicFam(t);
 const marks=topicMarks(t);
 const l1=[...t.special.map((s,i)=>({s,tr:T.special[i]})),...t.confuse.map((c,i)=>({s:c.t,tr:T.confuse[i],c}))].filter(o=>L1RX.test(o.s));
 const special=t.special.map((s,i)=>({s,tr:T.special[i]})).filter(o=>!L1RX.test(o.s));
 const confuse=t.confuse.map((c,i)=>({c,tr:T.confuse[i]})).filter(o=>!L1RX.test(o.c.t));
 const pair=(()=>{for(const r of t.rules)if(r.bad&&r.bad.length)return r.bad[0];return null})();
 let k=0;const realBody=esc(t.real.text).replace(/\{\{(.+?)\}\}/g,(_,m)=>{k++;return `<button class="n" data-act="note" data-k="${k}" aria-label="Mark ${k}: show note">${m}<sup>${k}</sup></button>`}).replace(/\n/g,"<br>");
 const gm=gameMeta(t),best=pStars(t.id);
 const prev=TOPICS.find(x=>x.id===id-1),next=TOPICS.find(x=>x.id===id+1);
 app.innerHTML=header("islands")+`
 <div class="l-top f-${f}"><div class="wrap narrow">
  <div class="crumb"><button data-go="#/islands/${t.lv}">${I.back}${esc(isle.name[0])}</button><span>Page ${t.id} of 20 · ${isle.band} · ${esc(t.place)}</span><span class="modes" role="group" aria-label="This page has two steps"><span class="on" aria-current="step"><i>01</i>Learn</span><span class="ln" aria-hidden="true"></span><button data-act="toplay"><i>02</i>Play</button></span></div>
  <div class="l-head">
   <div class="l-badge"><div class="mks m${marks.flatMap(markGlyphs).length>2?3:marks.flatMap(markGlyphs).length}">${marks.flatMap(markGlyphs).map(g=>mk(g)).join("")}</div></div>
   <div><span class="fam f-${f}">${mk(FAMS[f].ex)}${FAMS[f].n}<small>${FAMS[f].d}</small></span>
    <h1>${esc(t.title)}</h1>
    <div class="outcome"><small>By the end of this page you can</small>${bi(X.outcome[0],X.outcome[1],X.outcome[2])}</div>
    <div style="margin-top:14px">${trBar("inline")}</div>
   </div>
  </div>
 </div></div>
 <nav class="stepnav" aria-label="On this page"><ol>${[["look","Look","What it looks like"],["job","Job","What it does"],["when","When","When to use it"],["why","Why","Why it matters"],["how","How","How to use it well"]].map(([a,b,c],i)=>`<li><a href="#s-${a}" data-sec="${a}"><i>${i+1}</i>${b}<span class="sr"> — ${c}</span></a></li>`).join("")}<li class="pn"><a href="#s-play" data-sec="play"><i>${I.play}</i>Play<span class="sr"> — use it in the game</span></a></li></ol></nav>
 <main>
 <section class="lsec" id="s-look"><div class="wrap narrow">
  <h2><span class="q">Look</span>What it looks like</h2>
  <div class="look" style="margin-top:16px">${marks.map(m=>{const n=GN[m]||[m,""];return `<div class="glyph f-${famOf(markGlyphs(m)[0])}"><span class="mkbox">${markGlyphs(m).map(g=>mk(g,markGlyphs(m).length>1?"46px":"70px")).join("")}</span><div><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div></div>`}).join("")}</div>
  <div class="defcard">${bi(t.def,T.def[0],T.def[1])}</div>
  <div class="gloss" aria-label="Words you need">${X.words.map(w=>`<details><summary>${esc(w[0])}</summary>${bi(w[1],w[2],w[3])}</details>`).join("")}</div>
 </div></section>

 <section class="lsec" id="s-job"><div class="wrap narrow">
  <h2><span class="q">Job</span>What it does</h2>
  <div class="job" style="margin-top:16px">
   <div class="bigline">${bi(t.fn,T.fn[0],T.fn[1])}</div>
   ${pair?`<div class="hearpair"><h3>${img("luna","listen","mini","")} Hear the difference</h3><div class="hp-row no"><button class="hear" data-act="say" data-t="${esc(pair[0])}" aria-label="Luna reads the incorrect version">${I.speak}</button><div class="tx"><span class="lab">Without the rule</span><br>${esc(pair[0])}</div></div><div class="hp-row yes"><button class="hear" data-act="say" data-t="${esc(pair[1])}" aria-label="Luna reads the correct version">${I.speak}</button><div class="tx"><span class="lab">With the rule</span><br>${esc(pair[1])}</div></div></div>`:says("dexter","guide",bi(X.intro[0],X.intro[1],X.intro[2]))}
  </div>
  ${pair?`<div style="margin-top:16px">${says("dexter","guide",bi(X.intro[0],X.intro[1],X.intro[2]))}</div>`:""}
 </div></section>

 <section class="lsec" id="s-when"><div class="wrap narrow">
  <h2><span class="q">When</span>When to use it</h2>
  <p class="sub">${t.rules.length} points. Tap <b>Fix it</b> on each mistake before you read the answer.</p>
  <div class="rules">${t.rules.map((r,ri)=>{const q=T.rules[ri]||[];return `<article class="rule">
   <div class="rule-h"><h3>${rich(r.h)}${trs(q[0],q[1])}</h3><span class="tag ${r.tag}" title="${esc(TAGD[r.tag])}">${TAGN[r.tag]}</span></div>
   <div class="t">${bi(r.t,q[2],q[3])}</div>
   ${((r.ok&&r.ok.length)||(r.bad&&r.bad.length))?`<div class="ex">${(r.ok||[]).map(e=>`<div class="ex-ok"><span class="ic" aria-label="Correct">✓</span><span class="tx">${rich(e)}</span><button class="hear" data-act="say" data-t="${esc(plain(e).replace(/\s*\([^)]*\)\s*$/,"").replace(/^.*→\s*/,""))}" aria-label="Hear it">${I.speak}</button></div>`).join("")}
   ${(r.bad||[]).map(([w,fx,y])=>`<div class="fix"><div class="top-row"><span class="ic" aria-hidden="true">✗</span><span class="tx"><s>${esc(w)}</s></span><button class="fixbtn" data-act="fix" aria-expanded="false">Fix it</button></div><div class="after"><b>✓ ${esc(fx)}</b>${y?`<span>${esc(y)}</span>`:""}</div></div>`).join("")}</div>`:""}
  </article>`}).join("")}</div>
 </div></section>

 <section class="lsec" id="s-why"><div class="wrap narrow">
  <h2><span class="q">Why</span>Why it matters</h2>
  <p class="sub">The rule at work in real writing. Tap a numbered mark.</p>
  <div class="doc"><div class="doc-h"><i></i><i></i><i></i>${esc(t.real.ctx)}<span class="sp"></span><button class="hear" data-act="say" data-t="${esc(plain(t.real.text))}" aria-label="Luna reads the text">${I.speak}</button></div><div class="doc-b">${realBody}</div><ol class="doc-notes">${t.real.notes.map((n,i)=>`<li data-n="${i+1}"><b>${i+1}</b><span>${rich(n)}</span></li>`).join("")}</ol></div>
  ${confuse.length?`<div class="cards2" style="margin-top:16px">${confuse.map(o=>`<div class="card"><h3>Don’t confuse</h3><div class="vs"><span class="side">${esc(o.c.a)}</span><em>vs</em><span class="side">${esc(o.c.b)}</span></div>${bi(o.c.t,o.tr&&o.tr[0],o.tr&&o.tr[1])}</div>`).join("")}</div>`:""}
  ${l1.length?`<div style="margin-top:16px">${says("aizere","explain",`<p style="font-weight:700;margin-bottom:4px">A note for Kazakh and Russian speakers</p>${l1.map(o=>bi(o.c?`${o.c.a} / ${o.c.b}: ${o.s}`:o.s,o.tr&&o.tr[0],o.tr&&o.tr[1])).join("")}`)}</div>`:""}
 </div></section>

 <section class="lsec" id="s-how"><div class="wrap narrow">
  <h2><span class="q">How</span>How to use it well</h2>
  <div class="cards2" style="margin-top:16px">
   <div class="card"><h3>Special cases</h3><ul class="splist">${special.map(o=>`<li><div>${bi(o.s,o.tr&&o.tr[0],o.tr&&o.tr[1])}</div></li>`).join("")}</ul></div>
   <div class="card"><h3>British and American English</h3><div class="ukus"><div class="flags"><span>UK</span><span>US</span></div><div>${bi(t.vary,T.vary[0],T.vary[1])}</div></div></div>
  </div>
  <details class="srcbox"><summary>Sources for this page</summary><ul class="srcs">${t.src.map(k=>{const s=SOURCES[k];return `<li>${s.u?`<a href="${s.u}" target="_blank" rel="noopener">${esc(s.n)}</a>`:esc(s.n)}</li>`}).join("")}</ul></details>
 </div></section>

 <section class="gate" id="s-play" aria-labelledby="gate-h"><div class="wrap narrow">
  <div class="gate-card">
   <img class="gate-bg" src="${gm.bg}" alt="" loading="lazy" onerror="this.remove()">
   <div class="gate-copy">
    <span class="gate-done">${I.check} Lesson complete</span>
    <h2 id="gate-h">You’ve learned it.<br><span>Now use it.</span></h2>${trs("Урок пройден. Теперь примените его.","Сабақ аяқталды. Енді оны қолданыңыз.")}
    <div class="gate-how">${bi(gm.how,gm.tr[0],gm.tr[1])}</div>
    <div class="gate-legend" aria-hidden="true"><span class="ok">✓ Right mark: the path holds</span><span class="bad">✗ Wrong mark: the Murmur rises</span></div>
    <button class="playbtn" data-play="#/play/${t.id}"><span class="pb-ic">${I.play}</span><span class="pb-tx"><small>Ready?</small>Play now</span>${best?stars(best,"sm"):""}</button>
   </div>
   <img class="gate-dex" src="${DX.jump}" alt="" aria-hidden="true">
  </div>
  <div class="gate-skip">${prev?`<button class="linkbtn" data-go="#/lesson/${prev.id}">${I.back} Page ${prev.id}</button>`:"<span></span>"}${next?`<button class="linkbtn" data-go="#/lesson/${next.id}">Skip the game · page ${next.id} ${I.next}</button>`:""}</div>
 </div></section>
 </main>`;
 if(S.toGate){S.toGate=false;const g=$("#s-play");if(g)g.scrollIntoView({block:"center"})}else window.scrollTo(0,0);
 const links=$$(".stepnav a");
 if("IntersectionObserver" in window){
  S.obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const id=e.target.id.replace("s-","");links.forEach(a=>a.classList.toggle("on",a.dataset.sec===id));if((id==="how"||id==="play")&&!PR.read[t.id]){PR.read[t.id]=1;save()}}})},{rootMargin:"-40% 0px -55% 0px"});
  $$(".lsec,.gate").forEach(s=>S.obs.observe(s));
 }else{PR.read[t.id]=1;save()}
}

const A2=Object.assign({},typeof ADV_ART2!=="undefined"?ADV_ART2:{});
const DX={walk:ADV_ART.walk,run:A2.run||ADV_ART.walk,wobble:ADV_ART.wobble,alarm:A2.alarm||ADV_ART.wobble,swept:A2.swept||ADV_ART.cocoon,key:A2.key||ASSET["dexter-win"],hang:ADV_ART.hang,spool:ADV_ART.spool,rest:ADV_ART.rest,
 front:ASSET["dexter-front"],think:ASSET["dexter-think"],cheer:ASSET["dexter-cheer"],jump:ASSET["dexter-jump"],win:ASSET["dexter-win"],oops:ASSET["dexter-oops"],guide:ASSET["dexter-guide"]};
const DFLIP={walk:1,run:!A2.run?1:0};

/* =====================================================================
   PLAY · CHALLENGE BANK
   One sentence = one line: [page, difficulty 1–3, context, text].
   A gap is written ⟨answer|rule⟩ (answer may be empty = no mark).
   ⟨answer|rule~x~y⟩ also accepts x and y (equally correct versions).
   Every rule knows its page (t), a one-line cue and plausible wrong marks (alt).
   The engine turns the same sentence into different game moments:
   one stone, a two-way comparison, a raft, a bridge, a repair or the final restoration.
   ===================================================================== */


/* meaning: same words, two versions; the fact decides which one is right */


/* ======================= PLAY · the adventure =======================
   Every page’s Play button opens one complete adventure: Dexter crosses seven
   areas of Punctuation World to reach the lighthouse before the Murmur rises.

   STAGE                         MOMENTS  WHAT THE LEARNER DOES                      DIFFICULTY
   1 Lantern Dock    (enter)        2     recognise: which mark makes the stone hold   easy, this page
   2 Portal Stones   (first steps)  3     apply: keystone · stone · spring             easy→mid, this page
   3 Floating Market (explore)      3     compare two versions · review gate · meaning mid, + review
   4 Cloud Cliffs    (danger)       3     two plausible marks, Murmur starts higher    mid, interleaved
   5 Broken Bridge   (complex)      3     stitch several marks across two sentences    hard, mixed
   6 Moth Storm      (obstacle)     3     find and repair damaged signs; free a friend hard, mixed
   7 The Lighthouse  (mastery)      3     restore three messages; each lights the world hardest, cumulative
   ≈ 20 moments. This page’s rule returns in every stage (recognise → apply → new context →
   distinguish → combine → repair → restore). Earlier pages are interleaved from stage 3.
   A miss sends a NEW sentence on the same rule later in the stage (retrieval, not repetition).
   Five misses in a row of the Murmur → back to the start of that stage, never the whole game.
   =================================================================== */
const GRE=/⟨([^|⟩]*)\|([^⟩]*)⟩/g;
function parseB(s){const parts=[];let i=0,m;GRE.lastIndex=0;while((m=GRE.exec(s))){if(m.index>i)parts.push({t:s.slice(i,m.index)});const [k,...x]=m[2].split("~");parts.push({g:1,a:m[1],k,acc:[m[1],...x],c:CUE[k]});i=GRE.lastIndex}if(i<s.length)parts.push({t:s.slice(i)});return parts}
const ITEMS=BANK.map(([t,d,ctx,s,label],id)=>({id,t,d,ctx,s,label}));
const freshParts=it=>parseB(it.s).map(p=>Object.assign(p,{item:it.id}));
const gval=(p,v)=>{const x=v==null?p.a:v;return x===""&&p.c.sp?" ":x};
const joinTxt=parts=>parts.map(p=>p.g?gval(p,p.v):p.t).join("").replace(/\s+/g," ").trim();
const wrongs=p=>p.c.alt.filter(x=>!p.acc.includes(x));
const MK={"":"no mark",".":"full stop",",":"comma","?":"question mark","!":"exclamation mark",":":"colon",";":"semicolon","“":"opening quotation mark","”":"closing quotation mark","’":"apostrophe","’s":"apostrophe s","s’":"s apostrophe","s":"plain s","-":"hyphen","–":"en dash","—":"em dash","/":"slash","…":"ellipsis","(":"opening bracket",")":"closing bracket","[":"opening square bracket","]":"closing square bracket","?”":"question mark and closing quote",",”":"comma and closing quote",".”":"full stop and closing quote","”?":"closing quote then question mark","”.":"closing quote then full stop","”,":"closing quote then comma","?,”":"question mark, comma and quote","’.":"quote then full stop",".’":"full stop then quote"};
const mkName=g=>MK[g]||g;
const markFam=g=>({".":"Full stop","?":"Question mark","!":"Exclamation mark",",":"Comma",";":"Semicolon",":":"Colon","’":"Apostrophe","-":"Hyphen","–":"Dash","…":"Ellipsis","/":"Slash","(":"Brackets","[":"Square brackets","“":"Quotation marks","”":"Quotation marks"})[g];
function countMarks(v,into){if(!v)return;const seen=new Set();[...v].forEach(ch=>{const f=(ch==="’"&&/^(’\.|\.’)$/.test(v))?"Quotation marks":markFam(ch==="s"?"":ch);if(f&&!seen.has(f)){seen.add(f);into[f]=(into[f]||0)+1}})}

/* ---------------- the world ---------------- */
const STG=[
 {name:"Lantern Dock",go:"The Murmur is rising!",sub:"Get Dexter to the lighthouse.",bg:()=>ADV_ART.harbour,tide:1,mech:["stone","stone"]},
 {name:"Portal Stones",go:"Portal Stones",sub:"Only the right mark holds.",bg:()=>ART.portal,mech:["keystone","stone","spring"]},
 {name:"The Floating Market",go:"The Floating Market",sub:"Every sign needs its mark.",bg:()=>ART.world},
 {name:"Cloud Cliffs",go:"Cloud Cliffs",sub:"Higher up. The Murmur is faster!",bg:()=>ART.back,tide:2,cls:"st-wind"},
 {name:"The Broken Bridge",go:"The Broken Bridge",sub:"Stitch every gap. Then cross.",bg:()=>ADV_ART.camp},
 {name:"The Moth Storm",go:"The Moth Storm",sub:"The Hush chewed the signs. Repair them!",bg:()=>ADV_ART.opening,cls:"st-storm"},
 {name:"The Lighthouse",go:"The Lighthouse",sub:"Restore the keeper’s three messages.",bg:()=>ADV_ART.harbour,tide:2,cls:"st-night"}
];
const FRIEND={A1:"luna",A2:"spark",B1:"aizere",B2:"luna",C1:"spark"};
const LIGHTS=["The dock lamps","The bridge lanterns","The great beam"];
const OKW={stone:"Solid!",keystone:"Portal open!",spring:"Boing!",wkey:"Click. Open!",gate:"Gate open!",raft:"It holds!",bridge:"The bridge holds!",repair:"Sign repaired!",final:"Light restored!"};

/* ---------------- building one adventure for page N ---------------- */
function buildRun(N){
 const pool=ITEMS.filter(it=>it.t<=N);
 const uses={},usedPairs=new Set(),usedMean=new Set();
 const use=it=>{uses[it.id]=(uses[it.id]||0)+1};
 const elig=(it,test)=>freshParts(it).filter(p=>p.g&&wrongs(p).length&&test(p));
 const rnd=a=>a[Math.floor(Math.random()*a.length)];
 /* review topics: most recent pages first, older ones mixed in */
 const rq=[];const earlier=[...new Set(pool.map(i=>i.t))].filter(t=>t<N).sort((a,b)=>b-a);
 earlier.forEach((t,i)=>{if(i<3)rq.push(t,t);else rq.push(t)});
 let rqi=0;const reviewTopics=shuffle2(rq);
 const nextReview=()=>reviewTopics.length?reviewTopics[rqi++%reviewTopics.length]:null;
 function pick(test,dmin,dmax,exclude){
  let c=pool.filter(it=>!(exclude||[]).includes(it.id)&&elig(it,test).length);
  if(!c.length)return null;
  const inD=c.filter(it=>it.d>=dmin&&it.d<=dmax);if(inD.length)c=inD;
  const m=Math.min(...c.map(it=>uses[it.id]||0));c=c.filter(it=>(uses[it.id]||0)===m);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- use() прототипа — счётчик заданий, а не хук React
  const it=rnd(c);use(it);return it;
 }
 const focusT=p=>p.c.t===N, reviewT=rt=>p=>p.c.t===rt&&!(p.k==="stop"&&N>2&&rt!==1);
 function one(kind,dmin,dmax,mech,opts){
  let test=focusT;
  if(kind==="r"){const rt=nextReview();if(rt)test=reviewT(rt)}
  let it=pick(test,dmin,dmax);
  if(!it&&kind==="r"){test=p=>p.c.t<N&&p.k!=="stop";it=pick(test,1,3)}
  if(!it){test=focusT;it=pick(test,1,3)}
  if(!it)return null;
  const tg=rnd(elig(it,test));
  return Object.assign({type:"one",item:it.id,key:tg.k,mech,two:!!(opts&&opts.two)},opts||{});
 }
 function raft(kind){
  const T=kind==="f"?N:(nextReview()||N);
  const tp=TOPICS.find(x=>x.id===T);
  const letters=x=>x.toLowerCase().replace(/[^a-z0-9]/g,"");
  const pairs=tp.rules.filter(r=>r.tag==="Rule"||r.tag==="Standard").flatMap(r=>(r.bad||[]).map(([w,f])=>({w,f}))).filter(x=>!usedPairs.has(x.f)&&letters(x.w)===letters(x.f)&&x.w!==x.f);
  if(pairs.length&&Math.random()<.75){const x=rnd(pairs);usedPairs.add(x.f);return {type:"raft",f:x.f,w:x.w,t:T}}
  const it=pick(p=>p.c.t===T,1,3)||pick(focusT,1,3);if(!it)return null;
  const tg=rnd(elig(it,p=>p.c.t===T).length?elig(it,p=>p.c.t===T):elig(it,()=>true));
  const P=freshParts(it),gi=freshParts(it).findIndex(p=>p.g&&p.k===tg.k);
  const f=joinTxt(P);P[gi].v=wrongs(P[gi])[0];const w=joinTxt(P);
  return {type:"raft",f,w,t:T,key:tg.k};
 }
 function mean(kind){
  const T=kind==="f"?N:null;
  let c=MEANING.filter((m,i)=>!usedMean.has(i)&&(T?m[0]===T:m[0]<N));
  if(!c.length)return raft(kind);
  const m=rnd(c);usedMean.add(MEANING.indexOf(m));return {type:"mean",fact:m[1],f:m[2],w:m[3],t:m[0]};
 }
 function multi(type,dmin){
  /* two sentences side by side: one for this page, one from anywhere taught so far */
  const a=pick(p=>p.c.t===N,dmin,3);if(!a)return null;
  const rt=nextReview();
  const b=pick(rt?(p=>p.c.t===rt&&p.k!=="stop"):(p=>p.c.t===N),dmin,3,[a.id])||pick(p=>p.c.t<=N&&p.k!=="stop",1,3,[a.id]);
  return {type,items:b?shuffle2([a.id,b.id]):[a.id]};
 }
 const S=[
  [one("f",1,1,"stone"),one("f",1,2,"stone")],
  [one("f",1,2,"keystone"),one("f",1,2,"stone"),one("f",2,3,"spring")],
  [raft("f"),one("r",1,3,"gate"),mean("f")],
  [one("f",2,3,"spring",{two:true}),one("r",2,3,"stone",{two:true}),one("f",2,3,"gate",{two:true})],
  [multi("bridge",1),multi("bridge",2),multi("bridge",2)],
  [multi("repair",2),mean("r"),multi("repair",2)],
  [multi("final",2),multi("final",3),multi("final",3)]
 ];
 return S.map(st=>st.filter(Boolean));
}

/* ---------------- state ---------------- */
let G=null;
const W={gen:0,timers:new Set(),anims:new Set(),el:{},wait:null,keyH:null,picker:null};
const RMo=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
function zz(ms){const g=W.gen;return new Promise((res,rej)=>{const t=setTimeout(()=>{W.timers.delete(t);g===W.gen?res():rej("stale")},RMo()?Math.min(ms,120):ms);W.timers.add(t)})}
function an(el,kf,o){if(!el)return Promise.resolve();const g=W.gen;const a=el.animate(kf,Object.assign({fill:"forwards",easing:"cubic-bezier(.3,.7,.2,1)"},o,RMo()?{duration:1}:{}));W.anims.add(a);return a.finished.then(()=>{W.anims.delete(a);if(g!==W.gen)throw"stale"},()=>{throw"stale"})}
function waitFor(kind){return new Promise((res,rej)=>{const g=W.gen;W.wait={kind,go:v=>{W.wait=null;g===W.gen?res(v):rej("stale")}}})}
function gameTeardown(){W.gen++;W.timers.forEach(clearTimeout);W.timers.clear();W.anims.forEach(a=>{try{a.cancel()}catch(e){}});W.anims.clear();W.wait=null;closePicker();if(W.keyH){ROOT.removeEventListener("keydown",W.keyH);W.keyH=null}}
const fx={thump:SFX.stone,sink:()=>{nt(150,{glide:60,d:.45,g:.12,rev:.1});nz({d:.35,g:.05,f:500,f2:150,q:1,type:"lowpass"})},spring:SFX.spring,stitch:SFX.stitch,rise:SFX.rise,fall:SFX.fall,door:SFX.door,key:SFX.key,gate:SFX.gate,portal:SFX.portal};
const ico={close:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
const WAVE=`url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 70" preserveAspectRatio="none"><path d="M0 40 Q20 10 40 40 T80 40 T120 40 T160 40 V70 H0Z" fill="#B9B4C8"/><path d="M0 44 Q20 18 40 44 T80 44 T120 44 T160 44" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-dasharray="6 6"/></svg>')}")`;
const mkx=g=>g===""?'<span class="none" aria-hidden="true"></span>':mk(g);
const shuffle2=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function gameMeta(t){return {bg:ADV_ART.harbour,how:"Seven stages from Lantern Dock to the lighthouse, about twenty challenges. Every right mark moves Dexter on; every wrong one lets the Murmur rise.",tr:["Семь этапов от Фонарной пристани до маяка, около двадцати заданий. Каждый верный знак продвигает Декстера вперёд, каждый неверный поднимает серый прилив.","Фонарь айлағынан маякқа дейін жеті кезең, жиырмаға жуық тапсырма. Әр дұрыс белгі Декстерді алға жылжытады, әр қате белгі сұр толқынды көтереді."]}}

/* ---------------- the transition: learn mode closes, game mode opens ---------------- */
function enterGame(hash,btn){
 const m=hash.match(/play\/(\d+)/);if(m&&!PR.read[m[1]]){PR.read[m[1]]=1;save()}
 if(RMo()){go(hash);return}
 const r=btn?btn.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
 const w=document.createElement("div");w.className="warp";w.setAttribute("aria-hidden","true");
 w.style.setProperty("--x",(r.left+r.width/2)+"px");w.style.setProperty("--y",(r.top+r.height/2)+"px");
 w.innerHTML=`<div class="warp-in"><img src="${DX.jump}" alt=""><b>Play!</b></div>`;
 ROOT.appendChild(w);auInit();SFX.portal();
 requestAnimationFrame(()=>requestAnimationFrame(()=>w.classList.add("on")));
 setTimeout(()=>{go(hash);requestAnimationFrame(()=>{w.classList.add("out");setTimeout(()=>w.remove(),650)})},760);
}

/* ---------------- view ---------------- */
function playView(key){
 const t=TOPICS.find(x=>x.id==key);if(!t){go("#/");return}
 const saved=PR.run&&PR.run[t.id];
 G={t,N:t.id,stages:buildRun(t.id),si:saved?saved.s:0,ci:0,res:saved?saved.res.slice():[],marks:saved?Object.assign({},saved.marks):{},tide:0,friend:FRIEND[t.lv],freed:saved?saved.s>5:false,resumed:!!saved,makeups:0};
 ROOT.classList.add("in-game");
 app.innerHTML=`<div class="adv game" id="adv" aria-label="Play: ${esc(t.title)}">
  <img class="adv-bg" id="bg1" src="${STG[G.si].bg()}" alt=""><div class="adv-vig"></div><div class="weather" id="weather" aria-hidden="true"></div>
  <div class="portalglow" id="pglow"></div>
  <div class="stage2" id="stage"></div>
  <div class="tide" id="tide" aria-hidden="true"><div class="w" style="background-image:${WAVE}"></div><div class="w b" style="background-image:${WAVE}"></div><div class="body"></div></div>
  <div class="hud2" id="hud"></div><div id="ov"></div></div>`;
 ["adv","bg1","stage","tide","hud","ov","pglow","weather"].forEach(k=>W.el[k]=$("#"+k));
 W.keyH=keys3;ROOT.addEventListener("keydown",W.keyH);
 setTide(0,true);window.scrollTo(0,0);
 runGame();
}
function hud(){
 if(!G||!W.el.hud)return;
 const si=Math.min(G.si,6),st=STG[si],cur=G.stages[si]||[];
 const trail=STG.map((_,i)=>`<i class="${i<G.si?"on":i===G.si?"now":""}"></i>`).join("");
 W.el.hud.innerHTML=`<button class="hbtn" data-a3="exit" aria-label="Leave the game" title="Leave">${ico.close}</button>
  <div class="gtitle"><span class="snum">${si+1}<small>/7</small></span><span class="gt"><small>Page ${G.N} · stage ${si+1} of 7</small><b>${esc(st.name)}</b></span><span class="trail" aria-label="Stage ${si+1} of 7">${trail}</span><span class="cnt" aria-label="Challenge ${Math.min(G.ci+1,cur.length)} of ${cur.length}">${Math.min(G.ci+1,cur.length)}/${cur.length}</span></div>
  <span class="sp"></span>
  <div class="murmur" role="img" aria-label="The Murmur is at level ${G.tide} of 5"><b>Murmur</b><span class="lv">${[0,1,2,3,4].map(i=>`<i class="${i<G.tide?"on":""} ${i<G.tide&&G.tide>=3?"hot":""}"></i>`).join("")}</span></div>
  <button class="hbtn" data-a3="listen" aria-label="Luna reads the sentence aloud" title="Listen (L)"><img src="${av("luna","listen")}" alt=""></button>
  <button class="hbtn" data-act="mute" aria-pressed="${!PR.mute}" aria-label="${PR.mute?"Sound off":"Sound on"}">${PR.mute?I.mute:I.sound}</button>`;
}
function setTide(l,quiet){if(!G)return;G.tide=Math.max(0,Math.min(5,l));if(W.el.tide){W.el.tide.style.setProperty("--lvl",G.tide);if(!quiet){W.el.tide.classList.remove("surge");void W.el.tide.offsetWidth;W.el.tide.classList.add("surge")}}hud();
 const d=$("#dex");if(d)d.classList.toggle("danger",G.tide>=3)}
function setBg(src){const b=W.el.bg1;if(b&&b.getAttribute("src")!==src){an(b,[{opacity:1},{opacity:.15}],{duration:350}).then(()=>{b.src=src;return an(b,[{opacity:.15},{opacity:1}],{duration:600})}).catch(()=>{})}}
function ov(html,cls){W.el.ov.innerHTML=`<div class="card-ov ${cls||""}">${html}</div>`;const b=W.el.ov.querySelector(".btn-p,button");if(b)setTimeout(()=>b.focus({preventScroll:true}),60)}
function ovClear(){if(W.el.ov)W.el.ov.innerHTML=""}

/* ---------------- Dexter and friends ---------------- */
function scene(){W.el.stage.innerHTML=`<div class="dex" id="dex"><span class="shadow"></span><img id="dexi" src="${DX.front}" alt="Dexter"></div>${G&&G.freed?`<img class="buddy" id="buddy" src="${av(G.friend,"idle")}" alt="${CREW[G.friend].n}">`:""}${G&&G.si===5&&!G.freed?`<div class="captive" aria-hidden="true"><img src="${av(G.friend,"listen")}" alt=""><svg viewBox="0 0 100 100"><g fill="none" stroke="#B9B4C8" stroke-width="6" stroke-linecap="round"><path d="M12 40c20-10 56-12 76 2"/><path d="M10 55c24-8 58-6 80 4"/><path d="M14 70c22-6 52-6 72 2"/><path d="M18 30c18-12 48-14 66-2"/></g></svg></div>`:""}`;pose("front")}
function pose(p){const im=$("#dexi");if(!im)return;if(G&&G.tide>=3&&(p==="front"||p==="think"))p="alarm";im.src=DX[p]||DX.front;im.classList.toggle("flip",!!DFLIP[p]);const d=$("#dex");if(d)d.classList.toggle("bob",["front","think","guide","spool","alarm"].includes(p))}
function rel(a,b){const r1=a.getBoundingClientRect(),r2=b.getBoundingClientRect();return{x:r2.left+r2.width/2-(r1.left+r1.width/2),y:r2.bottom-r1.bottom}}
const tx=d=>{const m=getComputedStyle(d).transform;return m==="none"?0:parseFloat(m.split(",")[4])||0};
async function enter(){const d=$("#dex");pose("run");SFX.run();await an(d,[{transform:"translateX(-30cqw)"},{transform:"translateX(0)"}],{duration:900});pose("front")}
async function exitRight(p){const d=$("#dex");pose(p||"run");SFX.run();const w=W.el.adv.getBoundingClientRect().width;await an(d,[{transform:getComputedStyle(d).transform==="none"?"none":getComputedStyle(d).transform},{transform:`translateX(${w}px)`}],{duration:950,easing:"ease-in"})}

/* ---------------- short in-game signals ---------------- */
async function splash(si){
 const st=STG[si];
 const el=document.createElement("div");el.className="splash";el.setAttribute("role","status");
 el.innerHTML=`<small>Stage ${si+1} of 7</small><b>${esc(st.go)}</b><span>${esc(st.sub)}</span><div class="strail">${STG.map((s,i)=>`<i class="${i<si?"on":i===si?"now":""}" title="${esc(s.name)}"></i>`).join("")}</div>`;
 W.el.stage.appendChild(el);SFX.area();announce(`Stage ${si+1} of 7. ${st.go}. ${st.sub}`);
 let sk;const skp=new Promise(r=>sk=r);W.el.adv.addEventListener("pointerdown",sk,{once:true});
 try{await Promise.race([zz(2100),skp]);await an(el,[{opacity:1},{opacity:0}],{duration:240})}finally{el.remove();if(W.el.adv)W.el.adv.removeEventListener("pointerdown",sk)}
}
function cheerTag(word){const ln=document.createElement("div");ln.className="rule-line cheer";ln.setAttribute("role","status");ln.innerHTML=`<span>${I.check}</span><b>${esc(word)}</b>`;W.el.stage.appendChild(ln);announce(word);return ln}
async function oops(cue,anchor,head){
 const el=document.createElement("div");el.className="oops";el.setAttribute("role","alertdialog");el.setAttribute("aria-label","Try again");
 el.innerHTML=`<b class="oh"><img src="${DX.oops}" alt="">${esc(head||"Not that one!")}</b>${cue?`<span class="cue">${esc(cue)}</span>`:""}<button class="btn btn-p btn-sm" data-a3="ok">Keep going ${I.next}</button>`;
 W.el.stage.appendChild(el);
 if(anchor){const a=anchor.getBoundingClientRect(),r=W.el.adv.getBoundingClientRect();el.style.top=Math.max(70,Math.min(a.bottom-r.top+14,r.height-el.offsetHeight-14))+"px"}
 announce("Not that one. "+(cue||""));
 setTimeout(()=>{const b=el.querySelector("button");if(b)b.focus({preventScroll:true})},60);
 await waitFor("ok");el.remove();
}
function weather(si){
 const w=W.el.weather;if(!w)return;W.el.adv.className="adv game "+(STG[si].cls||"");
 w.innerHTML=si===5?Array.from({length:7},(_,i)=>`<img class="moth" src="${ADV_ART.moth}" style="--d:${i*1.3}s;--y:${8+i*9}%;--s:${.7+((i*37)%5)/10}" alt="">`).join(""):si===3?`<i class="gust"></i><i class="gust g2"></i><i class="gust g3"></i>`:"";
}
async function shooMoths(){$$(".weather .moth").slice(0,2).forEach(m=>{m.classList.add("flee");setTimeout(()=>m.remove(),900)})}

/* ---------------- flow ---------------- */
async function runGame(){
 try{
  hud();
  if(G.resumed&&G.si>0){toast(`Welcome back: stage ${G.si+1}, ${STG[G.si].name}`)}
  while(G.si<STG.length){
   const si=G.si;PR.run=PR.run||{};PR.run[G.N]={s:si,res:G.res,marks:G.marks};save();
   setBg(STG[si].bg());weather(si);setTide(Math.max(STG[si].tide||0,Math.min(G.tide,3)),true);
   G.ci=0;hud();scene();await enter();
   await splash(si);
   const r=await runStage(si);
   if(r==="swept")continue;
   if(si===5&&!G.freed)await freeFriend();
   if(si<6){scene();pose("cheer");burst($("#dex"),20);SFX.stage();await zz(500);await exitRight("run")}
   G.si++;
  }
  await ending();
 }catch(e){if(e!=="stale")console.error(e)}
}
async function runStage(si){
 const q=G.stages[si];G.makeups=0;
 const startRes=G.res.length;
 for(G.ci=0;G.ci<q.length;G.ci++){
  hud();const ch=q[G.ci];
  const r=await play1(ch,si);
  answered(r!=="swept"&&r.first);
  if(r==="swept"){G.res.length=startRes;q.splice(q.length-G.makeups,G.makeups);setTide(1,true);return "swept"}
  G.res.push(r.first?1:0);
  if(!r.first&&ch.type==="one"&&G.makeups<2){const m=makeup(ch);if(m){q.push(m);G.makeups++}}
 }
}
function makeup(ch){
 const c=ITEMS.filter(it=>it.t<=G.N&&it.id!==ch.item&&freshParts(it).some(p=>p.g&&p.k===ch.key&&wrongs(p).length));
 if(!c.length)return null;
 const it=c[Math.floor(Math.random()*c.length)];
 return Object.assign({},ch,{item:it.id,again:true});
}
async function play1(ch,si){
 if(ch.type==="one")return await routeCh(ch);
 if(ch.type==="raft"||ch.type==="mean")return await raftRound(ch);
 return await stitch(ch,si);
}

/* ---------------- ONE GAP: stones, keystones, springs, keys, gates ---------------- */
async function routeCh(ch){
 scene();pose("think");
 const it=ITEMS[ch.item],P=freshParts(it);
 const gi=P.findIndex(p=>p.g&&p.k===ch.key&&wrongs(p).length);const g=P[gi];
 let pre,post;
 const rawPre=P.slice(0,gi).map(p=>p.g?gval(p):p.t).join(""),rawPost=P.slice(gi+1).map(p=>p.g?gval(p):p.t).join("");
 pre=rawPre.replace(/\s+/g," ").replace(/^\s/,"");post=rawPost.replace(/\s+/g," ").replace(/\s$/,"");
 const word=!!g.c.word;let mech=word?"wkey":ch.mech;
 let opts=ch.two?[g.a,wrongs(g)[0]]:[g.a,...wrongs(g)].slice(0,3);opts=shuffle2(opts);
 let shown=opts,ans=g.a;
 if(word){const b=(pre.match(/[A-Za-z]+$/)||[""])[0],t=(post.match(/^[A-Za-z]+/)||[""])[0];pre=pre.slice(0,pre.length-b.length);post=post.slice(t.length);shown=opts.map(o=>b+o+t);ans=b+g.a+t}
 const lab={stone:"stone",keystone:"keystone",spring:"spring",wkey:"key",gate:"gate"}[mech];
 W.el.stage.insertAdjacentHTML("beforeend",`<div class="banner ctx-${it.ctx}" id="banner">${ch.again?`<span class="tag retry">New sentence · same rule</span>`:`<span class="tag">${esc(it.label||({chat:"Message",sign:"Sign",note:"Note",story:"Story",email:"Email",doc:"Notice",article:"News",post:"Post"})[it.ctx]||"Sign")}</span>`}${esc(pre)}<span class="sockw ${word?"word":""}" id="sock" aria-label="missing ${word?"word":"mark"}">${word?"&nbsp;?&nbsp;":""}</span>${esc(post)}</div>${mech==="wkey"?`<div class="door-in"></div><div class="door" id="door"></div>`:""}
  <div class="objs ${mech==="stone"?"stones":""} ${mech==="wkey"?"wk":""} ${ch.two?"two":""}" id="objs" role="group" aria-label="Choose a ${lab}">${shown.map((g2,i)=>`<button class="obj ${mech}" data-a3="pick" data-v="${esc(g2)}" aria-label="${word?`Key: ${esc(g2)}`:`${lab} with a ${mkName(g2)}`}"><span class="tk">${word?esc(g2):mkx(g2)}</span><span class="base"></span><kbd aria-hidden="true">${i+1}</kbd></button>`).join("")}</div>`);
 if(mech==="wkey"&&innerWidth>innerHeight){$("#objs").style.right="24cqw"}
 announce(`${pre} blank ${post}. Choose: ${shown.map(x=>word?x:mkName(x)).join(", ")}.`);
 W.ans=word?[ans]:g.acc;
 const v=await waitFor("pick");
 $("#objs").classList.add("locked");
 const ob=[...$$(".obj")].find(b=>b.dataset.v===v);ob.classList.add("pick");sfx.tap();
 const d=$("#dex"),ok=word?v===ans:g.acc.includes(v);
 const r=rel(d,ob);
 if(mech==="stone"||mech==="spring"){pose("jump");SFX.jump();await an(d,[{transform:"translate(0,0)"},{transform:`translate(${r.x*.5}px,-14cqh)`},{transform:`translate(${r.x}px,${mech==="stone"?"2cqh":"-6cqh"})`}],{duration:620,easing:"ease-out"})}
 else{pose("walk");SFX.run();await an(d,[{transform:"translate(0,0)"},{transform:`translate(${r.x-(mech==="wkey"?0:30)}px,0)`}],{duration:760,easing:"linear"})}
 if(mech==="wkey")pose("key");
 const sock=$("#sock");
 if(word){sock.textContent=v;sock.classList.add("full")}else{await flyTo(ob.querySelector(".tk"),sock,v);sock.innerHTML=mkx(v);sock.classList.add("full")}
 sfx.place();
 if(ok){countMarks(g.a,G.marks);await routeOk(mech,ob,d);return {first:true}}
 const res=await routeBad(mech,ob,d,v,word?ans:g.a,word,g);
 return res==="swept"?"swept":{first:false};
}
async function flyTo(from,to,g){
 if(!from||!to||RMo())return;
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
 const f=document.createElement("div");f.className="flyer";f.innerHTML=mkx(g);f.style.cssText=`left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;ROOT.appendChild(f);
 try{await an(f,[{transform:"translate(0,0) scale(1)"},{transform:`translate(${b.left-a.left+(b.width-a.width)/2}px,${b.top-a.top+(b.height-a.height)/2}px) scale(${Math.max(.3,b.height/a.height)})`}],{duration:420,easing:"cubic-bezier(.5,0,.3,1.3)"})}finally{f.remove()}
}
async function routeOk(mech,ob,d){
 $("#banner").classList.add("ok");ob.classList.add("glow");sfx.ok();burst(ob,18);
 setTide(G.tide-1);
 const ln=cheerTag(OKW[mech]);
 if(mech==="keystone"){fx.portal();await an(W.el.pglow,[{opacity:0,transform:"scale(.6)"},{opacity:1,transform:"scale(1.1)"}],{duration:550});pose("cheer");await zz(450);await an(d,[{transform:getComputedStyle(d).transform},{transform:getComputedStyle(d).transform+" scale(.2)",opacity:0}],{duration:550});an(W.el.pglow,[{opacity:1},{opacity:0}],{duration:400}).catch(()=>{})}
 else if(mech==="spring"){fx.spring();await an(ob.querySelector(".base"),[{transform:"scaleY(1)"},{transform:"scaleY(.5)"},{transform:"scaleY(1.2)"}],{duration:260});pose("jump");const w=W.el.adv.getBoundingClientRect().width;await an(d,[{transform:getComputedStyle(d).transform},{transform:`translate(${w*.45}px,-40cqh)`},{transform:`translate(${w}px,-6cqh)`}],{duration:950,easing:"ease-out"})}
 else if(mech==="wkey"){const door=$("#door");fx.key();setTimeout(()=>fx.door(),250);const r=rel(d,door);await an(d,[{transform:getComputedStyle(d).transform},{transform:`translate(${tx(d)+r.x}px,0)`}],{duration:550});door.classList.add("open");await zz(450);pose("walk");await an(d,[{opacity:1},{opacity:0}],{duration:400})}
 else if(mech==="gate"){fx.gate();pose("walk");await an(d,[{transform:getComputedStyle(d).transform,opacity:1},{transform:getComputedStyle(d).transform+" scale(.6)",opacity:0}],{duration:650})}
 else{fx.thump();await an(ob,[{transform:"translateY(0)"},{transform:"translateY(-1.5cqh)"}],{duration:240});pose("cheer");await zz(300);await exitRight("run")}
 await zz(200);ln.remove();
}
async function routeBad(mech,ob,d,v,ans,word,g){
 const sock=$("#sock");sock.classList.add("bad");sfx.bad();
 if(mech==="stone"){fx.sink();ob.classList.add("sink");pose("wobble");await an(d,[{transform:getComputedStyle(d).transform},{transform:getComputedStyle(d).transform+" translateY(3cqh)"}],{duration:360});await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:620,easing:"ease-in-out"})}
 else if(mech==="spring"){if(v==="!"){fx.spring();pose("jump");await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,-36cqh) rotate(-20deg)"},{transform:"translate(0,0)"}],{duration:900})}else{ob.classList.add("shake");await an(ob.querySelector(".base"),[{transform:"scaleY(1)"},{transform:"scaleY(.8)"},{transform:"scaleY(1)"}],{duration:360});pose("wobble");await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:620})}}
 else if(mech==="keystone"){ob.classList.add("shake");await an(W.el.pglow,[{opacity:0,filter:"grayscale(1)"},{opacity:.6,filter:"grayscale(1)"},{opacity:0}],{duration:520});pose("wobble");await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:620})}
 else if(mech==="wkey"){const door=$("#door");const r=rel(d,door);await an(d,[{transform:getComputedStyle(d).transform},{transform:`translate(${tx(d)+r.x}px,0)`}],{duration:520});door.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:400});pose("wobble");await zz(320);await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:650})}
 else{ob.classList.add("barred","shake");fx.sink();pose("wobble");await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:620})}
 setTide(G.tide+1);fx.rise();pose(G.tide>=3?"alarm":"wobble");await zz(400);
 if(G.tide>=5)return await swept();
 sock.classList.remove("bad");sock.classList.add("fixd");
 if(word)sock.textContent=ans;else sock.innerHTML=mkx(ans);
 const right=[...$$(".obj")].find(b=>b.dataset.v===ans);if(right)right.classList.add("right");
 await oops(g.c.cue,$("#banner"));
}
async function swept(){
 const d=$("#dex");pose("swept");
 await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(-45cqw,4cqh) rotate(-25deg)"}],{duration:1100,easing:"ease-in"});
 ov(`<div class="scard"><img class="hero-dex" src="${DX.swept}" alt="Dexter tangled in grey yarn"><h2>Swept back!</h2><p>The Murmur carried Dexter to the start of ${esc(STG[G.si].name)}. He’s fine, just tangled.</p><div class="acts"><button class="btn btn-p" data-a3="ok">Try this stage again ${I.next}</button></div></div>`);
 await waitFor("ok");ovClear();
 return "swept";
}

/* ---------------- RAFTS: which version holds? (comparison and meaning) ---------------- */
async function raftRound(ch){
 scene();pose("think");
 const opts=shuffle2([{v:"f",t:ch.f},{v:"w",t:ch.w}]);
 const head=ch.type==="mean"?`<span class="fact"><img src="${av("luna","listen")}" alt=""><span><small>The fact</small>${esc(ch.fact)}</span></span>`:`<span class="rq">Which one holds?</span>`;
 W.el.stage.insertAdjacentHTML("beforeend",`<div class="rafts" id="objs" role="group" aria-label="Which sentence holds?">${head}${opts.map((o,i)=>`<button class="raft" data-a3="pick" data-v="${o.v}"><span class="rt">${esc(o.t)}</span><span class="rb"></span><kbd aria-hidden="true">${i+1}</kbd></button>`).join("")}</div>`);
 announce(`${ch.type==="mean"?"The fact: "+ch.fact+". ":""}Which sentence holds? ${opts.map((o,i)=>`${i+1}: ${o.t}`).join(" ")}`);
 const v=await waitFor("pick");
 const box=$("#objs");box.classList.add("locked");
 const ob=[...$$(".raft")].find(b=>b.dataset.v===v);ob.classList.add("pick");sfx.tap();
 const d=$("#dex"),ok=v==="f";
 const db=d.getBoundingClientRect(),rb=ob.getBoundingClientRect();
 const dx=rb.left+rb.width/2-(db.left+db.width/2),dy=(rb.bottom-rb.height*.12)-db.bottom;
 pose("jump");SFX.jump();await an(d,[{transform:"translate(0,0)"},{transform:`translate(${dx*.5}px,${Math.min(dy,0)-8}px)`},{transform:`translate(${dx}px,${dy}px) scale(.8)`}],{duration:620,easing:"ease-out"});
 if(ok){
  ob.classList.add("glow");fx.thump();sfx.ok();burst(ob,18);setTide(G.tide-1);
  const ln=cheerTag(OKW.raft);pose("cheer");await zz(550);
  await an(d,[{transform:getComputedStyle(d).transform,opacity:1},{transform:`translate(${W.el.adv.getBoundingClientRect().width}px,${dy}px) scale(.8)`,opacity:1}],{duration:850,easing:"ease-in"});
  ln.remove();return {first:true};
 }
 ob.classList.add("sink");fx.sink();sfx.bad();pose("wobble");
 await an(d,[{transform:getComputedStyle(d).transform},{transform:"translate(0,0)"}],{duration:650,easing:"ease-in-out"});
 setTide(G.tide+1);fx.rise();pose(G.tide>=3?"alarm":"wobble");await zz(350);
 if(G.tide>=5)return await swept();
 const right=$(".raft[data-v=f]");if(right)right.classList.add("right");
 await oops(ch.key&&CUE[ch.key]?CUE[ch.key].cue:(ch.type==="mean"?"Read the fact again: the marks change the meaning.":"Look closely at each mark."),box);
 return {first:false};
}

/* ---------------- BRIDGE · REPAIR · FINAL: several marks at once ---------------- */
function plankHTML(parts,repair){let gi=0;return parts.map((p,pi)=>{if(p.g){const id=gi++;p.id=id;const v=p.v==null?"":p.v;const L=parts[pi-1],R=parts[pi+1];const jl=L&&L.t&&/\S$/.test(L.t)?"jl":"",jr=R&&R.t&&/^\S/.test(R.t)?"jr":"";return `<button class="gap ${jl} ${jr} ${repair?"pre":""} ${v!==""?"set":""} ${repair&&v===""?"nil":""}" data-a3="gap" data-k="${id}" aria-label="Gap ${id+1}: ${repair?mkName(v)+". Tap to change.":"empty. Choose a mark or leave it empty."}">${v!==""?mk(v):""}</button>`}
  return p.t.split(/(\s+)/).filter(x=>x.trim()).map((w,j,arr)=>`<span class="pl">${esc(w)}</span>${j<arr.length-1?'<span class="knot"></span>':""}`).join("")}).join("")}
async function stitch(ch,si){
 scene();pose("think");
 const fin=ch.type==="final",repair=ch.type==="repair";
 let parts=[];ch.items.forEach((id,i)=>{if(i)parts.push({t:" "});parts=parts.concat(freshParts(ITEMS[id]))});
 const gaps=parts.filter(p=>p.g);
 gaps.forEach(g=>g.v=repair?g.a:"");
 let broken=0;
 if(repair){/* the Hush damaged one mark per sentence; the page’s own rule first */
  ch.items.forEach(id=>{const gs=gaps.filter(g=>g.item===id&&wrongs(g).length);const pref=gs.filter(g=>g.c.t===G.N);const g=(pref.length?pref:gs.filter(g=>g.k!=="stop").length?gs.filter(g=>g.k!=="stop"):gs)[0];if(g){g.v=wrongs(g)[0];broken++}})}
 const opts=[...new Set([...gaps.map(g=>g.a),...gaps.filter(g=>g.c.t===G.N).map(g=>wrongs(g)[0]),""])].filter(x=>x!=null).slice(0,8);
 const fi=fin?G.ci:0;
 const tag=fin?`<span class="tag ptag">${esc(LIGHTS[fi]||"Message")} · message ${fi+1} of 3</span>`:repair?`<span class="tag ptag">Damaged sign · fix ${broken} mark${broken>1?"s":""}</span>`:`<span class="tag ptag">Bridge · ${gaps.length} gaps</span>`;
 W.el.stage.insertAdjacentHTML("beforeend",`<div class="planks ${fin||repair?"banner-mode":"bridge"} ${repair?"repair":""}" id="planks" role="group" aria-label="${repair?"Damaged sign: tap a mark to change it":"Sentence with gaps"}">${tag}${plankHTML(parts,repair)}</div>
  ${fin?`<div class="lamps2 lamps" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<fi?"on":""}"></i>`).join("")}</div>`:""}
  <button class="btn btn-p go" data-a3="send">${fin?"✦ Restore the light":repair?"Repair the sign":"Send Dexter across"} ${I.next}</button>`);
 W.stitch={parts,gaps,opts,repair};
 announce(repair?`A damaged sign. ${broken} marks are wrong. Tap a mark to change it.`:`${gaps.length} gaps. Tap a gap to choose a mark, or leave it empty.`);
 await waitFor("send");closePicker();
 $$(".gap").forEach(b=>b.setAttribute("disabled",""));$(".go").remove();
 const d=$("#dex");let errors=0;
 for(const g of gaps){
  const el=$(`.gap[data-k="${g.id}"]`);
  if(si===4){const r=rel(d,el);pose("walk");await an(d,[{transform:getComputedStyle(d).transform},{transform:`translate(${tx(d)+r.x}px,0)`}],{duration:420,easing:"linear"})}
  if(g.acc.includes(g.v)){el.classList.add("ok");fx.stitch();countMarks(g.v,G.marks);await zz(si===4?80:150);continue}
  errors++;el.classList.add("bad");sfx.bad();
  if(si===4){let after=false;$$("#planks > *").forEach(n=>{if(n===el)after=true;else if(after&&n.classList.contains("pl"))n.classList.add("fall")});pose("wobble")}
  setTide(G.tide+1);fx.rise();await zz(550);
  if(G.tide>=5)return await swept();
  g.v=g.a;el.classList.remove("bad");el.classList.add("fixed");el.innerHTML=mkx(g.a);
  await oops(g.c.cue,$("#planks"),repair?"Still damaged here!":"It broke here!");
  $$(".pl.fall").forEach(n=>n.classList.remove("fall"));
 }
 if(!errors){setTide(G.tide-1);burst($("#planks"),22)}
 (fin?SFX.restore:repair?SFX.repair:SFX.bridge)();
 const ln=cheerTag(fin?`${LIGHTS[fi]} shine again!`:repair?OKW.repair:OKW.bridge);
 if(fin){const L=$$(".lamps2 i")[fi];if(L)L.classList.add("on");W.el.adv.style.setProperty("--lit",fi+1);await zz(1100)}
 else if(repair){await shooMoths();await zz(700)}
 else{await exitRight("run")}
 ln.remove();
 return {first:errors===0};
}
function openPicker(btn){
 closePicker();const S=W.stitch;if(!S)return;const k=+btn.dataset.k;const g=S.gaps.find(x=>x.id===k);
 const r=btn.getBoundingClientRect();
 const p=document.createElement("div");p.className="picker";p.setAttribute("role","menu");
 p.innerHTML=S.opts.map((v,i)=>`<button role="menuitem" data-a3="pk" data-v="${esc(v)}" aria-label="${mkName(v)}${i<9?`, key ${i+1}`:""}">${mkx(v)}</button>`).join("");
 ROOT.appendChild(p);const pw=p.getBoundingClientRect().width;
 p.style.left=Math.max(8,Math.min(innerWidth-pw-8,r.left+r.width/2-pw/2))+"px";p.style.top=Math.max(8,r.top-74)+"px";
 W.picker={el:p,btn,g};const f=p.querySelector(`[data-v="${CSS.escape(g.v||"")}"]`)||p.querySelector("button");f&&f.focus();
}
function closePicker(){if(W.picker){W.picker.el.remove();W.picker=null}}
function pickGap(v){const P=W.picker;if(!P)return;P.g.v=v;P.btn.innerHTML=v===""?"":mk(v);P.btn.classList.toggle("set",v!=="");P.btn.classList.toggle("nil",v===""&&P.btn.classList.contains("pre"));P.btn.setAttribute("aria-label",`Gap ${P.g.id+1}: ${mkName(v)}`);sfx.place();const b=P.btn;closePicker();b.focus()}

/* ---------------- story beats ---------------- */
async function freeFriend(){
 const f=G.friend,n=CREW[f].n;
 scene();pose("cheer");
 ov(`<div class="scard"><span class="eyebrow">The storm is over</span><h2>${esc(n)} was caught in the Hush!</h2>
  <div class="cocoon wrapped" id="coc"><img src="${av(f,"listen")}" alt="${esc(n)}"><svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#B9B4C8" stroke-width="5" stroke-linecap="round"><path d="M12 40c20-10 56-12 76 2"/><path d="M10 55c24-8 58-6 80 4"/><path d="M14 70c22-6 52-6 72 2"/><path d="M18 30c18-12 48-14 66-2"/><path d="M16 84c20-4 48-4 66 0"/></g></svg></div>
  <div class="acts"><button class="btn btn-p" data-a3="ok">Pull away the grey threads</button></div></div>`);
 await waitFor("ok");const cc=$("#coc");if(cc){cc.classList.remove("wrapped");await zz(450);cc.querySelector("img").src=av(f,"cheer");SFX.free();burst(cc,30)}
 const b=$("#ov .acts");if(b)b.innerHTML=`<p class="joined">${esc(n)} joins Dexter for the last climb.</p>`;
 G.freed=true;await zz(1500);ovClear();
}
async function ending(){
 if(G.done)return;G.done=true;
 SFX.fanfare();setBg(ADV_ART.harbourLit);W.el.adv.classList.add("lit");W.el.weather.innerHTML='';
 W.el.tide.style.transition="height 2.5s ease-in";setTide(0);
 scene();pose("win");$("#dex").classList.add("party");const bd=$("#buddy");if(bd)bd.classList.add("party");celebrate();await zz(1700);
 const n=G.res.length,first=G.res.reduce((a,b)=>a+b,0),ratio=n?first/n:1;
 const sc=ratio>=.9?3:ratio>=.7?2:1;
 PR.p[G.N]=Math.max(pStars(G.N),sc);if(PR.run)delete PR.run[G.N];save();
 const next=TOPICS.find(x=>x.id===G.N+1),f=CREW[G.friend].n;
 const marks=Object.entries(G.marks).sort((a,b)=>b[1]-a[1]);
 const glyph={"Full stop":".","Question mark":"?","Exclamation mark":"!","Comma":",","Semicolon":";","Colon":":","Apostrophe":"’","Hyphen":"-","Dash":"–","Ellipsis":"…","Slash":"/","Brackets":"(","Square brackets":"[","Quotation marks":"“"};
 ov(`<div class="scard win">
  <div class="duo"><img src="${DX.win}" alt="Dexter"><img src="${av(G.friend,"cheer")}" alt="${esc(f)}"></div>
  <span class="eyebrow">Seven stages · ${n} challenges</span>
  <h1>The lighthouse is lit!</h1>
  <p>Every mark you placed rebuilt the path. Dexter and ${esc(f)} are safe, and the Murmur has rolled back into the sea.</p>
  <div class="big-stars" aria-label="${sc} of 3 stars">${[0,1,2].map(i=>`<i class="${i<sc?"on":""}">${I.star}</i>`).join("")}</div>
  <p class="small">${first} of ${n} right first time</p>
  ${marks.length?`<div class="usedmarks" aria-label="Marks you placed correctly">${marks.map(([k,v])=>`<span>${glyph[k]?mk(glyph[k]):""}<b>${v}×</b> ${esc(k.toLowerCase())}</span>`).join("")}</div>`:""}
  <div class="acts">${next?`<button class="btn btn-p step-btn" data-go="#/lesson/${next.id}">${I.next}<span><small>Next · Learn · page ${next.id}</small>${esc(next.title)}</span></button>`:`<button class="btn btn-p" data-go="#/">Back to Punctuation World ${I.next}</button>`}</div>
  <div class="acts sm"><button class="linkbtn" data-a3="again">Play again</button><button class="linkbtn" data-go="#/lesson/${G.N}">Back to the lesson</button></div>
 </div>`);
 const p=$(".top .pill b");if(p)p.textContent=totalStars();
}

/* ---------------- the finale: confetti and fireworks, once per adventure ---------------- */
function celebrate(){
 if(!G||G.celebrated)return;G.celebrated=true;
 if(RMo())return;
 const cv=document.createElement("canvas");cv.className="fxcanvas";cv.setAttribute("aria-hidden","true");W.el.adv.appendChild(cv);
 const ctx=cv.getContext("2d"),dpr=Math.min(2,window.devicePixelRatio||1);
 const r=W.el.adv.getBoundingClientRect();cv.width=r.width*dpr;cv.height=r.height*dpr;
 const Wd=cv.width,Ht=cv.height,COL=["#874BF8","#0AC7FF","#00D441","#FF7D1D","#FFAD00","#FF5FA2","#FFFFFF"],P=[];
 for(let i=0;i<150;i++)P.push({k:"c",x:Math.random()*Wd,y:-Math.random()*Ht*.7,vx:(Math.random()-.5)*1.4*dpr,vy:(1.4+Math.random()*2.4)*dpr,r:Math.random()*6.28,vr:(Math.random()-.5)*.25,w:(6+Math.random()*6)*dpr,h:(3+Math.random()*4)*dpr,c:COL[i%COL.length]});
 const rocket=()=>{const x=Wd*(.15+Math.random()*.7),y=Ht*(.1+Math.random()*.3),c=COL[Math.floor(Math.random()*6)];SFX.pop();for(let i=0;i<44;i++){const a=Math.PI*2*i/44,sp=(1.8+Math.random()*3.4)*dpr;P.push({k:"s",x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,c,life:55+Math.random()*30,t:0})}};
 let fr=0,raf=0;const g=W.gen;
 const tick=()=>{
  if(g!==W.gen||!cv.isConnected){cancelAnimationFrame(raf);return}
  fr++;ctx.clearRect(0,0,Wd,Ht);
  if(fr<320&&fr%40===1)rocket();
  for(let i=P.length-1;i>=0;i--){const p=P[i];
   if(p.k==="c"){p.x+=p.vx+Math.sin((fr+i)*.05)*.6*dpr;p.y+=p.vy;p.r+=p.vr;
    if(p.y>Ht+20){if(fr<280){p.y=-20;p.x=Math.random()*Wd}else{P.splice(i,1);continue}}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,Math.max(1,p.h*Math.abs(Math.cos(p.r*1.3))));ctx.restore()}
   else{p.t++;p.vx*=.97;p.vy=p.vy*.97+.05*dpr;p.x+=p.vx;p.y+=p.vy;const a=1-p.t/p.life;if(a<=0){P.splice(i,1);continue}
    ctx.globalAlpha=a;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.2*dpr,0,6.283);ctx.fill();ctx.globalAlpha=1}}
  if(P.length||fr<320)raf=requestAnimationFrame(tick);else cv.remove()};
 raf=requestAnimationFrame(tick);
 W.anims.add({cancel:()=>{cancelAnimationFrame(raf);cv.remove()}});
}

/* ---------------- input ---------------- */
function keys3(e){
 if(W.picker){const bs=$$(".picker button");if(e.key==="Escape"){e.preventDefault();const b=W.picker.btn;closePicker();b.focus();return}if(/^[1-9]$/.test(e.key)&&bs[+e.key-1]){e.preventDefault();bs[+e.key-1].click();return}
  if(/Arrow(Left|Right)/.test(e.key)){e.preventDefault();const i=bs.indexOf(activeEl());bs[(i+(e.key==="ArrowRight"?1:-1)+bs.length)%bs.length].focus();return}}
 if(W.wait&&W.wait.kind==="pick"&&/^[1-4]$/.test(e.key)){const b=$$(".obj,.raft")[+e.key-1];if(b){e.preventDefault();b.click()}return}
 if((e.key==="l"||e.key==="L")&&!e.ctrlKey&&!e.metaKey){listen3()}
}
function listen3(){const b=$("#banner")||$("#planks")||$(".rafts");if(b){const t=b.cloneNode(true);t.querySelectorAll(".tag,kbd,.rq,.fact small").forEach(x=>x.remove());t.querySelectorAll(".raft").forEach(x=>x.append(" … "));speak(t.textContent.replace(/\s+/g," ").trim())}}
on(ROOT,"click",e=>{
 const a=e.target.closest("[data-a3]");if(!a||!$("#adv"))return;
 switch(a.dataset.a3){
  case "ok":if(W.wait&&W.wait.kind==="ok")W.wait.go();break;
  case "pick":if(W.wait&&W.wait.kind==="pick")W.wait.go(a.dataset.v);break;
  case "gap":if(W.wait&&W.wait.kind==="send")openPicker(a);break;
  case "pk":pickGap(a.dataset.v);break;
  case "send":if(W.wait&&W.wait.kind==="send")W.wait.go();break;
  case "listen":listen3();break;
  case "again":if(PR.run)delete PR.run[G.N];save();route();break;
  case "exit":if(G&&G.t){S.toGate=true;go(`#/lesson/${G.t.id}`)}else go("#/");break;
 }
});
on(ROOT,"click",e=>{if(W.picker&&!e.target.closest(".picker")&&!e.target.closest(".gap"))closePicker()},{capture:true});
on(window,"resize",()=>closePicker());


/* ======================= EVENTS ======================= */
on(ROOT,"click",e=>{
 /* порт: ссылки в тени — свои: #/… ведёт роутер раздела, #s-… (полоса шагов урока) — прокрутка к секции внутри
    тени; иначе браузер поменял бы адрес приложения и искал бы id в документе, а не в тени */
 const ln=e.target.closest('a[href^="#"]');
 if(ln){e.preventDefault();const href=ln.getAttribute("href");if(href.startsWith("#/")){go(href);return}const el=href.length>1?ROOT.querySelector(href):null;if(el)el.scrollIntoView({block:"start",behavior:RMo()?"auto":"smooth"});return}
 const x=e.target.closest("#pu-exit");if(x&&onExit){e.preventDefault();onExit();return}
 const p=e.target.closest("[data-play]");if(p&&!p.disabled){e.preventDefault();enterGame(p.dataset.play,p);return}
 const g=e.target.closest("[data-go]");if(g&&!g.disabled){e.preventDefault();go(g.dataset.go);return}
 const a=e.target.closest("[data-act]");if(!a)return;
 const act=a.dataset.act,k=a.dataset.k;
 switch(act){
  case "tr":setTr(k);break;
  case "mute":toggleMute();break;
  case "isle":{S.isle=k;$$(".isle-tab").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.k===k)));$("#isle-panel").innerHTML=islePanel(k);HASH="#/islands/"+k;break}
  case "say":speak(a.dataset.t,a);break;
  case "fix":{const box=a.closest(".fix");box.classList.toggle("open");const o=box.classList.contains("open");a.textContent=o?"Fixed":"Fix it";a.setAttribute("aria-expanded",String(o));if(o)sfx.place();break}
  case "note":{const n=a.dataset.k;$$(".doc-b button.n").forEach(b=>b.classList.toggle("on",b===a));$$(".doc-notes li").forEach(li=>li.classList.toggle("on",li.dataset.n===n));sfx.tap();break}
  case "toplay":{const s=$("#s-play");if(s)s.scrollIntoView({block:"center",behavior:"smooth"});break}
 }
});

/* ---------- boot: sprite + art availability (graceful offline fallback) ---------- */
ROOT.style.setProperty("--sprite",`url("${ART.marks}")`);
ROOT.style.setProperty("--world",`url("${ART.worldM}")`);
(()=>{const t=new Image();t.onload=()=>{if(!dead)ROOT.classList.add("sprite-ok")};t.src=ART.marks})();

route();


return {
  go,
  route,
  snapshot: () => ({ hash: HASH }),
  /** Для тестов: состояние игры и чистые функции прототипа (наружу ученику не выдаётся). */
  debug: () => ({ G, W, PR, TOPICS, CUE, parseB, buildRun, famOf, countMarks, gval, joinTxt, wrongs, freshParts, ITEMS }),
  destroy() {
    if (dead) return
    gameTeardown()
    stopSpeech()
    if (S.obs) { S.obs.disconnect(); S.obs = null }
    dead = true
    abort.abort()
    for (const id of timers) globalThis.clearTimeout(id)
    timers.clear()
    try { if (AU.ctx) AU.ctx.close().catch(() => {}) } catch (e) { /* уже закрыт */ }
    AU.ctx = null
    ROOT.innerHTML = ''
    delete ROOT.dataset.tr
    ROOT.classList.remove('in-game', 'sprite-ok')
    ROOT.style.removeProperty('--sprite')
    ROOT.style.removeProperty('--world')
  },
}
}
