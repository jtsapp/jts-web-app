'use client'

// «Грамматика · игры» — движок прототипа методиста (data/jtsgrammar-games.html),
// перенесённый почти дословно, как «Числа» и Prepositions World: хаб с пятью
// уровнями, правило темы (3D-карточки формул, таблицы, ошибки), окно слова,
// сетка игр и 13 игр со звёздами. Экран GrammarGamesPage монтирует его в Shadow
// DOM: классы прототипа (.hero, .btn, .card, .tabs) совпадают с глобальными
// классами сайта.
//
// От прототипа отличается только связь с приложением (спека, часть A3):
// - темы — cfg.index (шапки) и cfg.loadTopic(id) при открытии темы, словарь —
//   cfg.loadGloss() на первом клике по слову, маскоты и эмодзи — адреса статики
//   (cfg.asset), а не 3,5 МБ JS-литералов;
// - звёзды — cfg.progress и cfg.onResult (бэкенд; монеты считает он, сюда
//   приходит только их число — тостом прототипа), уровень — cfg.level по
//   профилю, язык — приложения (api.setLang), звук — настройка устройства
//   (api.setSound); localStorage прототипа и «режим преподавателя» убраны;
// - HOOK.mist не подключён: ошибки не сохраняются (решение 25.10.2026);
//   HOOK.popBtn — своя кнопка «В словарь» (cfg.addWord);
// - голос — cfg.speak (Soniox), а не speechSynthesis; автоозвучка выключена,
//   как в прототипе;
// - inline onclick="f(…)" разметки → data-act/data-args и один делегированный
//   обработчик: inline-обработчик в тени ищет глобальную функцию, которой у
//   модуля нет;
// - слушатели — на корне и через AbortController, таймеры — счётчик поколений
//   прототипа плюс флаг dead, окна, тосты и конфетти — внутри корня; destroy()
//   снимает всё;
// - починка: строка разбирается на слова до экранирования (text.js, wrapEN).
// Каждый ответ в игре — cfg.onAnswer(верно?) → рейтинг навыка «грамматика».
// Прокрутку на смене вида делает приложение — cfg.scrollTop(вид): во вкладке Практики раздел стоит под карточками
// навыков, и хаб показывается с верха страницы, а тема и игра — с верха раздела.

import { stagesOf, acc } from './stages.js'
import { esc, wrapEN, lookUp, norm, trail, sentOf } from './text.js'

/**
 * @param {HTMLElement} root  корень раздела (.gg) в Shadow DOM
 * @param {object} cfg  см. docs/superpowers/plans/2026-10-25-grammar-games-web.md, Task 4
 */
export function mountGrammarGames(root, cfg) {
const { index, loadTopic, loadGloss, onResult = () => null, onAnswer = () => {}, speak = () => {}, stopVoice = () => {}, addWord = null, asset, initialTopic = null, scrollTop = () => {} } = cfg
const doc = root.ownerDocument
const SR = root.getRootNode()
const ac = new AbortController()
const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ac.signal })
let dead = false
const timers = new Set()
// Глобальные таймеры — через globalThis: имя setTimeout ниже занято обёрткой поколений прототипа.
const rawT = (f, d) => globalThis.setTimeout(f, d)
const later = (fn, ms) => { const id = rawT(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }

/* ================= UI strings ================= */
const U={
 sub:{ru:'Грамматика · игры',kk:'Грамматика · ойындар',en:'Grammar · games'},
 heroT:{ru:'Вся грамматика английского — в играх',kk:'Ағылшын грамматикасы — ойын арқылы',en:'All English grammar — through games'},
 heroP:{ru:'5 уровней, 125 тем. В каждой теме — правило с 3D-формулами и таблицами, больше десяти игр и финальный бой.',kk:'5 деңгей, 125 тақырып. Әр тақырыпта — 3D формулалар мен кестелері бар ереже, оннан көп ойын және соңғы шайқас.',en:'5 levels, 125 topics. Each has a rule with 3D formulas and tables, 10+ games and a final battle.'},
 stars:{ru:'звёзд',kk:'жұлдыз',en:'stars'},topics:{ru:'тем',kk:'тақырып',en:'topics'},
 soon:{ru:'скоро',kk:'жақында',en:'soon'},
 back:{ru:'← Все темы',kk:'← Барлық тақырыптар',en:'← All topics'},
 backQuest:{ru:'← К играм',kk:'← Ойындарға',en:'← Back to games'},
 tabRule:{ru:'📖 Правило',kk:'📖 Ереже',en:'📖 Rule'},tabQuest:{ru:'🎮 Игры',kk:'🎮 Ойындар',en:'🎮 Games'},
 formulas:{ru:'Формулы — нажми на карточку, чтобы раскрыть',kk:'Формулалар — ашу үшін карточканы бас',en:'Formulas — tap a card to open it'},
 more:{ru:'Подробнее',kk:'Толығырақ',en:'More'},
 tables:{ru:'Таблица',kk:'Кесте',en:'Table'},
 mistakes:{ru:'Типичные ошибки',kk:'Жиі кездесетін қателер',en:'Typical mistakes'},
 tapWord:{ru:'Нажми на любое английское слово — увидишь перевод и услышишь его',kk:'Кез келген ағылшын сөзін бас — аудармасын көріп, тыңдайсың',en:'Tap any English word to see the translation and hear it'},
 examples:{ru:'Примеры',kk:'Мысалдар',en:'Examples'},
 ctaT:{ru:'Правило понятно?',kk:'Ереже түсінікті ме?',en:'Got the rule?'},ctaP:{ru:'Закрепи тему в играх — их больше десяти, а в конце финальный бой Декстера и Спарка.',kk:'Тақырыпты ойындармен бекіт — олар оннан көп, соңында Декстер мен Спарктың соңғы шайқасы.',en:'Practise the topic in 10+ games, with a final Dexter vs Spark battle at the end.'},
 toQuest:{ru:'Перейти к играм →',kk:'Ойындарға өту →',en:'Go to the games →'},
 questT:{ru:'Квест по теме',kk:'Тақырып бойынша квест',en:'Topic quest'},
 locked:{ru:'Сначала пройди предыдущий этап',kk:'Алдымен алдыңғы кезеңді өт',en:'Finish the previous stage first'},
 check:{ru:'Проверить',kk:'Тексеру',en:'Check'},clear:{ru:'Очистить',kk:'Тазалау',en:'Clear'},next:{ru:'Дальше',kk:'Әрі қарай',en:'Next'},
 ok:{ru:'Верно!',kk:'Дұрыс!',en:'Correct!'},great:{ru:'Отлично!',kk:'Керемет!',en:'Great!'},bad:{ru:'Не совсем…',kk:'Дәл емес…',en:'Not quite…'},again:{ru:'Попробуй ещё раз',kk:'Тағы байқап көр',en:'Try again'},
 answerIs:{ru:'Правильно:',kk:'Дұрысы:',en:'Answer:'},
 score:{ru:'Очки',kk:'Ұпай',en:'Score'},moves:{ru:'Ходы',kk:'Жүрістер',en:'Moves'},mist:{ru:'Ошибки',kk:'Қателер',en:'Mistakes'},
 playAgain:{ru:'Ещё раз',kk:'Қайта ойнау',en:'Play again'},nextStage:{ru:'Следующая игра →',kk:'Келесі ойын →',en:'Next game →'},toQuestBtn:{ru:'Все игры',kk:'Барлық ойындар',en:'All games'},
 done0:{ru:'Почти! Попробуй ещё раз',kk:'Сәл қалды! Тағы байқап көр',en:'Almost! Try again'},done1:{ru:'Хорошее начало!',kk:'Жақсы бастама!',en:'Good start!'},done2:{ru:'Здорово!',kk:'Тамаша!',en:'Well done!'},done3:{ru:'Идеально!',kk:'Мінсіз!',en:'Perfect!'},
 correctOf:{ru:'правильно',kk:'дұрыс',en:'correct'},
 clickWrong:{ru:'Нажми на слово с ошибкой',kk:'Қатесі бар сөзді бас',en:'Tap the wrong word'},chooseFix:{ru:'Выбери исправление',kk:'Түзетуді таңда',en:'Choose the correction'},
 build:{ru:'Нажимай на слова по порядку. Одно слово лишнее!',kk:'Сөздерді ретімен бас. Бір сөз артық!',en:'Tap the words in order. One word is extra!'},
 matchHint:{ru:'Переворачивай карточки и находи пары',kk:'Карточкаларды аударып, жұбын тап',en:'Flip the cards and find pairs'},
 sortHint:{ru:'Выбери слово, потом нажми на нужную корзину',kk:'Сөзді таңда, содан кейін керекті себетті бас',en:'Pick a word, then tap the right basket'},
 typeHint:{ru:'Впиши пропущенное слово',kk:'Түсіп қалған сөзді жаз',en:'Type the missing word'},hintBtn:{ru:'💡 Подсказка',kk:'💡 Көмек',en:'💡 Hint'},
 transHint:{ru:'Преврати предложение — выбери правильный вариант',kk:'Сөйлемді өзгерт — дұрыс нұсқаны таңда',en:'Transform the sentence — choose the right version'},
 dialogHint:{ru:'Читай диалог и выбирай пропущенное слово',kk:'Диалогты оқып, түсіп қалған сөзді таңда',en:'Read the dialogue and choose the missing word'},
 listenHint:{ru:'Послушай и выбери предложение, которое прозвучало',kk:'Тыңдап, естілген сөйлемді таңда',en:'Listen and choose the sentence you heard'},showText:{ru:'👁 Показать текст',kk:'👁 Мәтінді көрсету',en:'👁 Show text'},
 raceHint:{ru:'Предложение правильное? Отвечай быстро — помоги Декстеру обогнать Спарка!',kk:'Сөйлем дұрыс па? Жылдам жауап бер — Декстерге Спарктан озуға көмектес!',en:'Is the sentence correct? Answer fast and help Dexter beat Spark!'},
 tTrue:{ru:'✓ Верно',kk:'✓ Дұрыс',en:'✓ Correct'},tFalse:{ru:'✗ Ошибка',kk:'✗ Қате',en:'✗ Wrong'},you:{ru:'ТЫ',kk:'СЕН',en:'YOU'},rival:{ru:'СОПЕРНИК',kk:'ҚАРСЫЛАС',en:'RIVAL'},
 catchStart:{ru:'Нажимай только на правильные облака! Ошибка — минус жизнь.',kk:'Тек дұрыс бұлттарды бас! Қате — бір өмір кетеді.',en:'Tap only the correct clouds! A mistake costs a life.'},start:{ru:'Старт',kk:'Бастау',en:'Start'},caught:{ru:'Поймано',kk:'Ұсталды',en:'Caught'},
 placeHint:{ru:'Прочитай и нажми, куда поставить',kk:'Оқып, қай жерге қою керегін бас',en:'Read and tap where it goes'},
 bossHint:{ru:'Финальный бой! Помоги Декстеру победить Спарка: каждый верный ответ — удар, 3 ошибки — поражение.',kk:'Соңғы шайқас! Декстерге Спаркты жеңуге көмектес: әр дұрыс жауап — соққы, 3 қате — жеңіліс.',en:'Final battle! Help Dexter beat Spark: every right answer is a hit, 3 mistakes and you lose.'},
 bossWin:{ru:'Декстер победил!',kk:'Декстер жеңді!',en:'Dexter wins!'},bossLose:{ru:'В этот раз победил Спарк',kk:'Бұл жолы Спарк жеңді',en:'Spark won this time'},
 isCorrect:{ru:'Какое предложение правильное?',kk:'Қай сөйлем дұрыс?',en:'Which sentence is correct?'},
 legend:{ru:'Подлежащее|Вспомогательный / be / модальный|Глагол|Отрицание|Вопросительное слово|Остальное',kk:'Бастауыш|Көмекші / be / модаль|Етістік|Болымсыздық|Сұрау сөз|Басқасы',en:'Subject|Auxiliary / be / modal|Verb|Negation|Question word|Other'},
 pos:{ru:'Утверждение',kk:'Болымды',en:'Positive'},neg:{ru:'Отрицание',kk:'Болымсыз',en:'Negative'},que:{ru:'Вопрос',kk:'Сұраулы',en:'Question'},
 word:{ru:'слово',kk:'сөз',en:'word'},sentence:{ru:'предложение',kk:'сөйлем',en:'sentence'},noTr:{ru:'перевода нет',kk:'аудармасы жоқ',en:'no translation'},
 /* порт: загрузка темы с бэкенда, «В словарь», монеты */
 loading:{ru:'Загружаем тему…',kk:'Тақырып жүктелуде…',en:'Loading the topic…'},
 loadFail:{ru:'Не удалось загрузить тему. Проверьте интернет и попробуйте ещё раз.',kk:'Тақырып жүктелмеді. Интернетті тексеріп, қайта көріңіз.',en:"Couldn't load the topic. Check your connection and try again."},
 retry:{ru:'Ещё раз',kk:'Қайталау',en:'Try again'},
 toDict:{ru:'＋ В словарь',kk:'＋ Сөздікке',en:'＋ To dictionary'},inDict:{ru:'✓ В словаре',kk:'✓ Сөздікте',en:'✓ In dictionary'},
 coins:{ru:'Монеты: +{n}',kk:'Тиын: +{n}',en:'Coins: +{n}'}
};
const GAMES={
 pick:{i:'🎯',n:{ru:'Выбери форму',kk:'Пішінді таңда',en:'Pick the form'},d:{ru:'Картинка и пропуск — выбери форму',kk:'Сурет пен бос орын — пішінді таңда',en:'Picture + gap — choose the form'}},
 match:{i:'🃏',n:{ru:'Найди пары',kk:'Жұбын тап',en:'Find pairs'},d:{ru:'Карточки на память',kk:'Есте сақтау карточкалары',en:'Memory cards'}},
 sort:{i:'🧺',n:{ru:'Разложи по корзинам',kk:'Себеттерге сұрыпта',en:'Sort it out'},d:{ru:'Раздели слова по группам',kk:'Сөздерді топтарға бөл',en:'Split words into groups'}},
 build:{i:'🧩',n:{ru:'Собери предложение',kk:'Сөйлем құра',en:'Build the sentence'},d:{ru:'Пузыри-слова по порядку',kk:'Сөз-көпіршіктерді ретімен',en:'Word bubbles in order'}},
 trans:{i:'🔄',n:{ru:'Трансформер',kk:'Трансформер',en:'Transformer'},d:{ru:'Сделай отрицание, вопрос и др.',kk:'Болымсыз, сұраулы т.б. жаса',en:'Make it negative, a question…'}},
 fix:{i:'🔍',n:{ru:'Найди ошибку',kk:'Қатені тап',en:'Find the mistake'},d:{ru:'Найди и исправь неверное слово',kk:'Қате сөзді тауып, түзет',en:'Spot and fix the wrong word'}},
 place:{i:'📦',n:{ru:'Где это?',kk:'Бұл қайда?',en:'Where is it?'},d:{ru:'Поставь предмет на место',kk:'Затты орнына қой',en:'Put the object in place'}},
 type:{i:'⌨️',n:{ru:'Впиши сам',kk:'Өзің жаз',en:'Type it'},d:{ru:'Впиши форму с клавиатуры',kk:'Пішінді пернетақтамен жаз',en:'Type the form yourself'}},
 dialog:{i:'💬',n:{ru:'Диалог',kk:'Диалог',en:'Dialogue'},d:{ru:'Живой диалог с пропусками',kk:'Бос орындары бар диалог',en:'A real dialogue with gaps'}},
 listen:{i:'🎧',n:{ru:'Слушай и выбирай',kk:'Тыңда да таңда',en:'Listen & choose'},d:{ru:'Аудирование: что прозвучало?',kk:'Тыңдалым: не естілді?',en:'Listening: what did you hear?'}},
 race:{i:'🏎️',n:{ru:'Гонка: верно или нет',kk:'Жарыс: дұрыс па, жоқ па',en:'Race: right or wrong'},d:{ru:'Верно или ошибка — на скорость',kk:'Дұрыс па, қате ме — жылдамдыққа',en:'Right or wrong — against the clock'}},
 catch:{i:'☁️',n:{ru:'Лови правильное',kk:'Дұрысын ұста',en:'Catch it'},d:{ru:'Падающие облака — лови верное',kk:'Құлаған бұлттар — дұрысын ұста',en:'Falling clouds — catch the right ones'}},
 boss:{i:'🥊',n:{ru:'Финальный бой',kk:'Соңғы шайқас',en:'Final battle'},d:{ru:'Декстер против Спарка: вся тема',kk:'Декстер мен Спарк: бүкіл тақырып',en:'Dexter vs Spark: the whole topic'}}
};
/* ================= state ================= */
// Прототип читал язык, уровень и звук из localStorage; здесь — из приложения (cfg), прогресс — с бэкенда.
const G={view:'hub',lv:cfg.level||'L1',topic:null,stage:null,lang:cfg.lang||'ru',sound:cfg.sound!==false,tab:'rule'};
const P=JSON.parse(JSON.stringify(cfg.progress||{}));
const LEVELS=index.levels||[],PROGRAM=index.program||[],TOPICS=index.topics||[];
const IDX={};TOPICS.forEach(x=>IDX[x.id]=x);
// Тела тем — по мере открытия (TMAP прототипа держал все 125 сразу).
const TMAP={};
const IMG=new Proxy({},{get:(_,k)=>asset.img(String(k))});
let GLOSS=null;
const t=k=>(U[k]||{})[G.lang]||k;
const L=o=>o==null?'':typeof o==='string'?o:(o[G.lang]||o.en||o.ru||'');
const $=id=>SR.getElementById?SR.getElementById(id):root.querySelector('#'+id);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const topic=()=>TMAP[G.topic];
// У шапки темы набор игр приходит с бэкенда (games), у тела — считается тем же правилом.
const gamesOf=tp=>tp.games||stagesOf(tp);
const starsOf=(tid,g)=>((P[tid]||{})[g])||0;
const topicStars=tp=>gamesOf(tp).reduce((a,g)=>a+starsOf(tp.id,g),0);
const topicMax=tp=>gamesOf(tp).length*3;
function unlocked(){return true;}
function starStr(n,max=3){let h='';for(let i=0;i<max;i++)h+=`<span class="${i<n?'y':''}">★</span>`;return h;}
// Решение 25.10.2026: ошибки игр нигде не сохраняются и никуда не уходят — крючок прототипа пустой.
function mist(){}
function answered(ok){try{onAnswer(!!ok);}catch{/* рейтинг навыка — не повод ронять игру */}}
const plain=html=>{const d=doc.createElement('div');d.innerHTML=html;return d.textContent.replace(/\s+/g,' ').trim();};
// Кнопка разметки: имя действия и аргументы в data-*, обработчик один — на корне (см. шапку файла).
const act=(name,...args)=>`data-act="${name}"${args.length?` data-args="${esc(JSON.stringify(args))}"`:''}`;
// Темы и уровни приходят из заливки методиста и правки JSON в админке, а не из файла прототипа: всё, что из них
// попадает в разметку, экранируется (прототип вставлял иконки, картинки заданий и названия уровней как есть — на
// домене сайта это XSS), цвет и градиент берутся только в известной форме, иначе — цвета прототипа.
const col=c=>/^#[0-9a-fA-F]{3,8}$/.test(String(c))?c:'#874BF6';
const grad=g=>/^linear-gradient\([#\w\s.,%-]+\)$/.test(String(g))?g:'linear-gradient(110.8deg,#9047FF 15.5%,#6932BB 94.2%)';
/* ================= sound & voice ================= */
let AC=null;
function beep(type){if(!G.sound)return;try{AC=AC||new (globalThis.AudioContext||globalThis.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const now=AC.currentTime+.01;
 /* мягкие «колокольчики»: синус + тихая октава, плавная атака и затухание */
 const bell=(f,d,vol,len)=>{[[f,1],[f*2,.25],[f*3,.06]].forEach(([fr,k])=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=fr;g.gain.setValueAtTime(.0001,now+d);g.gain.linearRampToValueAtTime(vol*k,now+d+.012);g.gain.exponentialRampToValueAtTime(.0001,now+d+len);o.connect(g);g.connect(AC.destination);o.start(now+d);o.stop(now+d+len+.05);});};
 const soft=(f1,f2,d,vol,len)=>{const o=AC.createOscillator(),g=AC.createGain(),lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;o.type='triangle';o.frequency.setValueAtTime(f1,now+d);o.frequency.exponentialRampToValueAtTime(f2,now+d+len*.8);g.gain.setValueAtTime(.0001,now+d);g.gain.linearRampToValueAtTime(vol,now+d+.02);g.gain.exponentialRampToValueAtTime(.0001,now+d+len);o.connect(lp);lp.connect(g);g.connect(AC.destination);o.start(now+d);o.stop(now+d+len+.05);};
 if(type==='ok'){bell(784,0,.11,.45);bell(1175,.08,.09,.6);}
 else if(type==='bad'){soft(330,247,0,.14,.32);soft(262,196,.13,.11,.38);}
 else if(type==='win'){[523,659,784,1047].forEach((f,k)=>bell(f,k*.11,.09,.7));}
 else if(type==='hit'){bell(392,0,.1,.25);bell(587,.04,.08,.3);}
 else bell(660,0,.08,.3);}catch{/* нет Web Audio — играем без звука */}}
/* авто-озвучка выключена: голос только по кнопке 🔊 и в играх, где он нужен для задания (Слушай и выбирай — say(...,1)) */
function say(text,force){if(!force)return;try{speak(text);}catch{/* озвучка не должна ронять игру */}}
function confetti(){const c=['#9047FF','#FFB400','#2FB164','#1F8FE5','#FF6B9A'];for(let i=0;i<46;i++){const d=doc.createElement('div');d.className='confetti';d.style.left=Math.random()*100+'vw';d.style.background=c[i%c.length];d.style.animationDelay=Math.random()*.5+'s';root.appendChild(d);later(()=>d.remove(),2300);}}
function toast(m){const d=doc.createElement('div');d.className='toast';d.textContent=m;root.appendChild(d);later(()=>d.remove(),1800);}
/* ================= clickable words ================= */
let glossP=null;
function ensureGloss(){if(!glossP)glossP=Promise.resolve().then(()=>loadGloss()).then(g=>{GLOSS=g&&typeof g==='object'?g:{};},()=>{glossP=null;});return glossP;}
const added=new Set();
// «＋ В словарь» вместо HOOK.popBtn прототипа; «✓» — только у слов, добавленных в этом заходе (Д14).
function popBtn(word,key,tr){if(!addWord||!tr)return '';const has=added.has(key);return `<button ${act('addWord',word,key)} ${has?'disabled':''}>${has?t('inDict'):t('toDict')}</button>`;}
const dictWord=w=>/^I(?:['’]|$)/.test(w)?w:w.toLowerCase();
function addWordClick(btn,word,key){const tr=GLOSS&&lookUp(GLOSS,key);if(!tr)return;btn.disabled=true;
 Promise.resolve().then(()=>addWord({en:dictWord(word),ru:tr[0],kk:tr[1]})).then(r=>{if(dead)return;if(r){added.add(key);btn.textContent=t('inDict');}else btn.disabled=false;},()=>{if(!dead)btn.disabled=false;});}
function fillPop(w,tr,loading){const pop=$('pop');const k=w.dataset.k;const sent=w.closest('[data-s]');
 pop.innerHTML=`<div class="wd">${esc(w.textContent)}</div>${loading?`<div class="tr" style="color:var(--muted)">…</div>`:tr?`<div class="tr"><b>RU</b><span>${esc(tr[0])}</span></div><div class="tr"><b>KZ</b><span>${esc(tr[1])}</span></div>`:`<div class="tr" style="color:var(--muted)">${t('noTr')}</div>`}
  <div class="acts"><button ${act('say',w.textContent)}>🔊 ${t('word')}</button>${sent?`<button ${act('say',sent.dataset.s)}>🔊 ${t('sentence')}</button>`:''}${loading?'':popBtn(w.textContent,k,tr)}</div>`;
 // Окно — внутри корня (position:absolute), поэтому координаты — от корня, а не от страницы, как у прототипа.
 pop.style.display='block';const rr=root.getBoundingClientRect(),r=w.getBoundingClientRect();const pw=Math.min(290,pop.offsetWidth||250);let x=r.left-rr.left+r.width/2-pw/2;x=Math.max(8,Math.min(x,rr.width-pw-8));pop.style.left=x+'px';const ph=pop.offsetHeight||150;pop.style.top=((r.bottom+ph+12>globalThis.innerHeight&&r.top>ph+12)?(r.top-rr.top-ph-8):(r.bottom-rr.top+8))+'px';}
function openWord(w){root.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'));w.classList.add('sel');const k=w.dataset.k;
 if(GLOSS){fillPop(w,lookUp(GLOSS,k),false);}
 else{fillPop(w,null,true);ensureGloss().then(()=>{if(!dead&&w.isConnected&&w.classList.contains('sel'))fillPop(w,GLOSS?lookUp(GLOSS,k):null,false);});}
 say(w.textContent);}
function hidePop(){const pop=$('pop');if(pop)pop.style.display='none';root.querySelectorAll('.w.sel').forEach(x=>x.classList.remove('sel'));}
/* делегированные клики, клавиши и 3D-наклон — на корне, а не на document (без утечек после ухода) */
on(root,'click',e=>{const a=e.target.closest&&e.target.closest('[data-act]');
 if(a&&root.contains(a)&&!a.disabled){const fn=ACT[a.dataset.act];if(fn)fn(a,...(a.dataset.args?JSON.parse(a.dataset.args):[]));}
 const w=e.target.closest&&e.target.closest('.w');
 if(w&&w.isConnected){e.stopPropagation();openWord(w);return;}
 if(!(e.target.closest&&e.target.closest('#pop')))hidePop();});
on(root,'mousemove',e=>{const c=e.target.closest&&e.target.closest('.c3d');root.querySelectorAll('.c3d.tilt').forEach(x=>{if(x!==c){x.classList.remove('tilt');x.style.transform='';}});if(!c)return;const r=c.getBoundingClientRect();const px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;c.classList.add('tilt');c.style.transform=`perspective(900px) rotateY(${px*16}deg) rotateX(${-py*14}deg) translateZ(10px)`;});
on(root,'keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='tin')typeCheck();});
// Escape и клик мимо окна слова — на документе, как в прототипе: после клика по карточке фокус уходит на body, и
// keydown до корня тени не доходит. Снимаются вместе с остальными слушателями (тот же AbortController).
on(doc,'keydown',e=>{if(e.key==='Escape')closeModal();});
on(doc,'click',e=>{if(!(e.composedPath&&e.composedPath().includes(root)))hidePop();});
/* ================= navigation ================= */
let loadSeq=0;
function go(v,a,b){loadSeq++;stopLoops();closeModal();hidePop();
 // Тело темы приходит с бэкенда при первом открытии; дальше — из памяти, как TMAP прототипа.
 if(v==='topic'){const id=a||G.topic;if(!TMAP[id])return openTopic(id,b||'rule');G.topic=id;G.tab=b||'rule';}
 if(v==='game'){G.stage=a;}
 G.view=v;render();scrollTop(G.view);return Promise.resolve();}
function openTopic(id,tab){const seq=++loadSeq;G.view='loading';G.loading=id;G.loadTab=tab;render();scrollTop(G.view);
 return Promise.resolve().then(()=>loadTopic(id)).then(body=>{if(dead||seq!==loadSeq)return;if(!body||body.id!==id)throw new Error('тема не та');TMAP[id]=body;G.topic=id;G.tab=tab;G.view='topic';render();},
  ()=>{if(dead||seq!==loadSeq)return;G.view='loadfail';render();});}
function render(){const a=$('app');if(G.view==='hub')a.innerHTML=vHub();else if(G.view==='topic')a.innerHTML=G.tab==='rule'?vRule():vQuest();else if(G.view==='game')startGame();else if(G.view==='result')a.innerHTML=vResult();else if(G.view==='loading')a.innerHTML=vWait(false);else if(G.view==='loadfail')a.innerHTML=vWait(true);}
function vWait(fail){return `<button class="back" ${act('go','hub')}>${t('back')}</button><div class="stage gg-wait" ${fail?'role="alert"':'role="status"'}><img src="${fail?IMG.sleep:IMG.read}" alt=""><p class="sub">${t(fail?'loadFail':'loading')}</p>${fail?`<button class="btn" ${act('retryTopic')}>${t('retry')}</button>`:''}</div>`;}
/* ================= HUB ================= */
function vHub(){const total=TOPICS.reduce((a,tp)=>a+topicStars(tp),0);
 const lvl=LEVELS.find(l=>l.id===G.lv)||LEVELS[0];if(!lvl)return '';const list=PROGRAM.filter(p=>p.lv===lvl.id);
 return `<div class="hero"><img src="${IMG.cheer}" alt=""><div><h1>${t('heroT')}</h1><p>${t('heroP')}</p></div><div class="stat"><b>⭐ ${total}</b>${t('stars')}</div></div>
 <div class="levels">${LEVELS.map(l=>{const tps=TOPICS.filter(x=>x.lv===l.id);const s=tps.reduce((a,x)=>a+topicStars(x),0),m=tps.reduce((a,x)=>a+topicMax(x),0)||1;return `<button class="lvcard ${l.id===G.lv?'on':''}" style="background:${grad(l.bg)}" ${act('lv',l.id)}><div class="big">${esc(l.range)}</div><div class="nm">${esc(l.name)}</div><div class="bar"><i style="width:${Math.round(s/m*100)}%"></i></div><div class="cnt">${PROGRAM.filter(p=>p.lv===l.id).length} ${t('topics')} · ⭐ ${s}</div></button>`;}).join('')}</div>
 <div class="lvhead"><div><div class="sub" style="margin:0;font-weight:800;letter-spacing:2px;font-size:12px">${esc(String(lvl.name||'').toUpperCase())}</div><h2>${esc(lvl.range)}</h2></div><div class="stk">${(lvl.stk||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div></div>
 <div class="tgrid">${list.map(p=>{const tp=IDX[p.id];if(!tp)return `<div class="tcard soon"><span class="num">${esc(String(p.n).padStart(2,'0'))}</span><div class="ic" style="background:#F1EEF8">⏳</div><div><h3>${esc(p.t)}</h3><p>${t('soon')}</p></div></div>`;const s=topicStars(tp),m=topicMax(tp);
  return `<button class="tcard" ${act('go','topic',tp.id)}><span class="num">${esc(String(tp.n).padStart(2,'0'))}</span><div class="ic" style="background:${col(tp.color)}1A">${esc(tp.icon)}</div><div style="flex:1;min-width:0"><h3>${esc(L(tp.title))}</h3><p>${esc(L(tp.sub))}</p><div class="prog"><div class="bar"><i style="width:${Math.round(s/m*100)}%;background:${col(tp.color)}"></i></div>⭐ ${s}/${m}</div></div></button>`;}).join('')}</div>`;}
/* ================= RULE ================= */
function fhtml(f){return `<div class="formula">${f.map((b,i)=>`${i?'<span class="plus">+</span>':''}<span class="brick ${esc(b[0])}">${esc(b[1])}</span>`).join('')}</div>`;}
function headTabs(tp){const lv=LEVELS.find(l=>l.id===tp.lv)||{range:tp.lv};return `<button class="back" ${act('go','hub')}>${t('back')}</button>
 <div class="thead"><div class="ic" style="background:${col(tp.color)}1A">${esc(tp.icon)}</div><div style="flex:1;min-width:0"><span class="lvb">${esc(lv.range)} · ${esc(String(tp.n).padStart(2,'0'))}</span><h1>${esc(L(tp.title))}</h1>${G.tab==='rule'?`<p class="intro">${esc(L(tp.intro))}</p>`:`<p class="intro" style="color:var(--muted)">${esc(L(tp.sub))}</p>`}</div><img src="${G.tab==='rule'?IMG.read:IMG.fly}" alt=""></div>
 <div class="tabs"><button class="${G.tab==='rule'?'on':''}" ${act('go','topic',tp.id,'rule')}>${t('tabRule')}</button><button class="${G.tab==='quest'?'on':''}" ${act('go','topic',tp.id,'quest')}>${t('tabQuest')} · ⭐ ${topicStars(tp)}/${topicMax(tp)}</button></div>`;}
function hcell(h){if(typeof h==='object')return `<span>${esc(L(h))}</span>`;if(h==='➕')return `<span class="hc p">＋ ${t('pos')}</span>`;if(h==='➖')return `<span class="hc m">− ${t('neg')}</span>`;if(h==='❓')return `<span class="hc q">? ${t('que')}</span>`;return esc(h);}
function vRule(){const tp=topic();const lg=t('legend').split('|');
 return headTabs(tp)+`<h2 class="sec">🧊 ${t('formulas')}</h2>
 <div class="cards3d">${tp.cards.map((c,i)=>`<div class="c3d" ${act('openCard',i)}><span class="no">${i+1}</span><h4>${esc(L(c.h))}</h4><div class="fz">${fhtml(c.f)}</div><div class="ex1">${esc(c.ex[0])}</div><div class="more-hint">✦ ${t('more')} →</div></div>`).join('')}</div>
 <div class="legend">${['s','a','v','n','q','o'].map((k,i)=>`<span><i style="background:var(--k${k}b);border:1.5px solid var(--k${k})"></i>${lg[i]}</span>`).join('')}</div>
 <p class="sub" style="margin-top:22px">👆 ${t('tapWord')}</p>
 ${(tp.tables||[]).map(tb=>`<div class="gtable"><div class="cap">📊 ${esc(L(tb.cap))}</div><div class="tscroll"><table class="gt"><thead><tr>${tb.head.map(h=>`<th>${hcell(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows.map(r=>`<tr>${r.map(c=>`<td data-s="${esc(c)}">${wrapEN(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('')}
 <h2 class="sec">💬 ${t('examples')}</h2>
 <div class="exlist">${tp.cards.flatMap(c=>c.ex).map(e=>`<div class="exl" data-s="${esc(e)}"><button class="spk" ${act('sayParent')}>🔊</button><span>${wrapEN(e)}</span></div>`).join('')}</div>
 <h2 class="sec">⚠️ ${t('mistakes')}</h2>
 <div class="mlist">${tp.mistakes.map(m=>`<div class="mist"><div class="b">✗ ${wrapEN(m.bad)}</div><div class="g" data-s="${esc(m.good)}">✓ ${wrapEN(m.good)} <button class="spk" style="width:28px;height:28px;font-size:12px;vertical-align:middle" ${act('sayParent')}>🔊</button></div><div class="why">${esc(L(m.why))}</div></div>`).join('')}</div>
 <div class="cta"><div><h3>${t('ctaT')}</h3><p>${t('ctaP')}</p></div><button class="btn big" ${act('go','topic',tp.id,'quest')}>${t('toQuest')}</button></div>`;}
function openCard(i){const c=topic().cards[i];closeModal();const ov=doc.createElement('div');ov.className='ov';ov.id='ov';ov.onclick=e=>{if(e.target===ov)closeModal();};
 ov.innerHTML=`<div class="modal"><button class="icon-btn x" ${act('closeModal')}>✕</button><h3>${i+1}. ${esc(L(c.h))}</h3>${fhtml(c.f)}<div class="txt">${esc(L(c.more))}</div><div class="exlist">${c.ex.map(e=>`<div class="exl" data-s="${esc(e)}"><button class="spk" ${act('sayParent')}>🔊</button><span>${wrapEN(e)}</span></div>`).join('')}</div></div>`;root.appendChild(ov);say(c.ex[0]);}
function ruleSheet(){const tp=topic();closeModal();const ov=doc.createElement('div');ov.className='ov';ov.id='ov';ov.onclick=e=>{if(e.target===ov)closeModal();};
 ov.innerHTML=`<div class="modal"><button class="icon-btn x" ${act('closeModal')}>✕</button><h3>📖 ${esc(L(tp.title))}</h3>${tp.cards.map(c=>`<div style="margin-bottom:18px"><b>${esc(L(c.h))}</b><div style="margin:8px 0">${fhtml(c.f)}</div><div style="color:var(--muted);font-size:14.5px;line-height:1.6">${esc(L(c.more))}</div></div>`).join('')}</div>`;root.appendChild(ov);}
function closeModal(){const o=$('ov');if(o)o.remove();}
/* ================= QUEST ================= */
function vQuest(){const tp=topic();const st=stagesOf(tp);
 return headTabs(tp)+`<div class="games">${st.map((g,i)=>{const s=starsOf(tp.id,g);return `<button class="gcard g-${g} ${g==='boss'?'boss':''} ${s?'done':''}" ${act('openStage',i)}><div class="gi">${GAMES[g].i}</div><b>${L(GAMES[g].n)}</b><span>${L(GAMES[g].d)}</span><div class="stars">${starStr(s)}</div></button>`;}).join('')}</div>`;}
function openStage(i){const tp=topic();if(!unlocked(tp,i)){toast(t('locked'));beep('bad');return;}go('game',stagesOf(tp)[i]);}
/* ================= GAME FRAME ================= */
let R=null,loops=[],GEN=0;function stopLoops(){GEN++;loops.forEach(f=>f());loops=[];}
/* game timers belong to the screen that started them: leaving the screen cancels them */
// Прототип подменял window.setTimeout на всю страницу; здесь та же обёртка поколений — только внутри движка.
const setTimeout=(f,d,...a)=>{const g=GEN;const id=rawT(()=>{timers.delete(id);if(!dead&&g===GEN&&typeof f==='function')f(...a);},d);timers.add(id);return id;};
const clearTimeout=id=>{timers.delete(id);globalThis.clearTimeout(id);};
function frame(inner,{progress,right}={}){const tp=topic();return `<div class="gtop"><button class="back" style="margin:0" ${act('go','topic',tp.id,'quest')}>${t('backQuest')}</button><div class="title">${GAMES[G.stage].i} ${L(GAMES[G.stage].n)} · <span style="color:${col(tp.color)}">${esc(L(tp.title))}</span></div><div class="sp"></div><button class="icon-btn" title="Rule" ${act('ruleSheet')}>📖</button>${right!=null?right:`<span class="pill">${t('score')}: ${R.score}</span>`}</div>${progress!=null?`<div class="pbar"><i style="width:${progress}%"></i></div>`:''}<div class="stage">${inner}</div>`;}
// Звёзды уходят на бэкенд (HOOK.finish прототипа); монеты он считает сам и возвращает их число.
function report(tid,game,stars){let p;try{p=Promise.resolve(onResult(tid,game,stars));}catch{return;}
 p.then(r=>{if(dead||!r)return;const c=Number(r.coins)||0;if(c>0)toast(t('coins').replace('{n}',c));const b=Number(r.best);if(Number.isFinite(b)){P[tid]=P[tid]||{};P[tid][game]=Math.max(P[tid][game]||0,b);}},()=>{});}
function finish(stars,extra){if(R.over)return;R.over=true;stopLoops();const tp=topic();report(tp.id,G.stage,stars);P[tp.id]=P[tp.id]||{};P[tp.id][G.stage]=Math.max(P[tp.id][G.stage]||0,stars);R.stars=stars;R.extra=extra;G.view='result';beep(stars?'win':'bad');if(stars>=2)confetti();render();}
function vResult(){const tp=topic();const st=stagesOf(tp);const i=st.indexOf(G.stage);const nx=st[i+1];const can=nx&&unlocked(tp,i+1);
 const head=G.stage==='boss'?(R.stars?t('bossWin'):t('bossLose')):t(['done0','done1','done2','done3'][R.stars]);
 return frame(`<div class="result"><img src="${R.stars?IMG.cheer:IMG.sleep}" alt=""><div class="big">${starStr(R.stars)}</div><h2>${head}</h2><p class="sub" style="margin:0">${R.extra||''}</p>
 <div class="row"><button class="btn line" ${act('go','game',G.stage)}>↻ ${t('playAgain')}</button>${can?`<button class="btn" ${act('go','game',nx)}>${t('nextStage')}</button>`:`<button class="btn" ${act('go','topic',tp.id,'quest')}>${t('toQuestBtn')}</button>`}</div></div>`);}
function startGame(){const tp=topic();R={score:0,i:0,ok:0,miss:0,over:false};({pick:gPick,match:gMatch,sort:gSort,build:gBuild,trans:gTrans,fix:gFix,place:gPlace,type:gType,dialog:gDialog,listen:gListen,race:gRace,catch:gCatch,boss:gBoss})[G.stage](tp);}
const prog=()=>R.i/R.items.length*100;
const nextOr=(fn,res)=>{R.i++;if(R.i>=R.items.length)finish(...res());else fn();};
/* ---- 1. pick ---- */
function gPick(tp){R.items=shuffle(tp.gap).map(g=>({...g,opts:shuffle([{x:g.a,ok:1},...g.o.map(x=>({x}))])}));drawPick();}
function qhtml(g,fill){return esc(g.s).replace('___',`<span class="blank" id="blank">${fill?esc(fill):'?'}</span>`)+(g.h?` <span class="hint">(${esc(g.h)})</span>`:'');}
function drawPick(){const g=R.items[R.i];R.lock=false;$('app').innerHTML=frame(`<div class="pic">${esc(g.pic||'✏️')}</div><div class="q">${qhtml(g)}</div><div class="opts">${g.opts.map((o,k)=>`<button class="opt" id="o${k}" ${act('pickAns',k)}>${esc(o.x)}</button>`).join('')}</div><div class="fb" id="fb"></div>`,{progress:prog()});}
function pickAns(k){if(R.lock)return;R.lock=true;const g=R.items[R.i],o=g.opts[k],right=g.opts.findIndex(x=>x.ok);$('blank').textContent=g.a;
 if(o.ok){R.ok++;R.score+=10;$('o'+k).classList.add('ok');fb('ok',R.ok%4===0?'great':'ok');answered(1);}else{R.miss++;$('o'+k).classList.add('bad');$('o'+right).classList.add('ok');fb('bad','bad');answered(0);mist(g.s+(g.h?' ('+g.h+')':''),[g.a,...g.o],g.a);}
 say(sentOf(g.s,g.a));setTimeout(()=>nextOr(drawPick,()=>[acc(R.ok,R.items.length),`${R.ok} / ${R.items.length} ${t('correctOf')}`]),o.ok?1100:2000);}
function fb(cls,key,extra){const f=$('fb');if(!f)return;f.className='fb '+cls;f.innerHTML=t(key)+(extra||'');beep(cls==='ok'?'ok':'bad');}
/* ---- 2. match ---- */
function gMatch(tp){const pl=tp.pairs.list;R.pairs=pl;R.task=tp.pairs.task;R.cards=shuffle(pl.flatMap((p,i)=>[{t:p[0],side:0,p:i},{t:p[1],side:1,p:i}]));R.open=[];R.done=new Set();R.moves=0;R.long=pl.some(p=>p[0].length>12||p[1].length>12);drawMatch();}
function drawMatch(){$('app').innerHTML=frame(`<div class="taskline">${esc(L(R.task))}</div><p class="ginst">${t('matchHint')}</p><div class="cards ${R.long?'long':''}">${R.cards.map((c,k)=>`<div class="mc ${R.open.includes(k)||R.done.has(k)?'flip':''} ${R.done.has(k)?'done':''}" ${act('mflip',k)}><div class="in"><div class="f">?</div><div class="b" ${/[A-Za-z0-9А-я]/.test(c.t)?'':'style="font-size:34px"'}>${esc(c.t)}</div></div></div>`).join('')}</div>`,{progress:R.done.size/R.cards.length*100,right:`<span class="pill">${t('moves')}: ${R.moves}</span>`});}
function mflip(k){if(R.lock||R.done.has(k)||R.open.includes(k))return;R.open.push(k);beep('pop');drawMatch();
 if(R.open.length===2){R.moves++;const [a,b]=R.open.map(i=>R.cards[i]);R.lock=true;const okp=a.side!==b.side&&R.pairs.some(p=>(p[0]===a.t&&p[1]===b.t)||(p[0]===b.t&&p[1]===a.t));answered(okp);
  if(okp){setTimeout(()=>{R.open.forEach(i=>R.done.add(i));R.open=[];R.lock=false;beep('ok');const l=a.side===0?a:b,r=a.side===0?b:a;say(l.t+' — '+r.t);drawMatch();if(R.done.size===R.cards.length){const n=R.pairs.length;finish(R.moves<=n+3?3:R.moves<=Math.round(n*1.8)?2:1,`${t('moves')}: ${R.moves}`);}},450);}
  else setTimeout(()=>{R.open=[];R.lock=false;beep('bad');drawMatch();},950);}}
/* ---- 3. sort ---- */
function gSort(tp){R.task=tp.sort.task;R.cats=tp.sort.cats;R.items=shuffle(tp.sort.items).map(x=>({w:x[0],c:x[1]}));R.placed=[];R.sel=null;drawSort();}
function drawSort(badK){const left=R.items.map((x,k)=>({...x,k})).filter(x=>!R.placed.includes(x.k));
 $('app').innerHTML=frame(`<div class="taskline">${esc(L(R.task))}</div><p class="ginst">${t('sortHint')}</p><div class="chips">${left.map(x=>`<button class="chip2 ${R.sel===x.k?'sel':''} ${badK===x.k?'bad':''}" ${act('sortSel',x.k)}>${esc(x.w)}</button>`).join('')}</div>
 <div class="buckets" style="grid-template-columns:repeat(${R.cats.length},minmax(0,1fr))">${R.cats.map((c,ci)=>`<div class="bucket" ${act('sortDrop',ci)}><h5>${esc(L(c))}</h5><div class="in">${R.placed.filter(k=>R.items[k].c===ci).map(k=>`<span>${esc(R.items[k].w)}</span>`).join('')}</div></div>`).join('')}</div>`,{progress:R.placed.length/R.items.length*100,right:`<span class="pill">${t('mist')}: ${R.miss}</span>`});}
function sortDrop(ci){if(R.sel==null){toast(t('sortHint'));return;}const it=R.items[R.sel];if(it.c===ci){R.placed.push(R.sel);R.ok++;R.sel=null;beep('ok');answered(1);say(it.w);drawSort();if(R.placed.length===R.items.length)setTimeout(()=>finish(R.miss<=1?3:R.miss<=4?2:1,`${t('mist')}: ${R.miss}`),500);}else{R.miss++;beep('bad');answered(0);const k=R.sel;drawSort(k);}}
/* ---- 4. build ---- */
function gBuild(tp){R.items=shuffle(tp.order);newBuild();}
function newBuild(){const it=R.items[R.i];R.target=it.s.split(' ');R.pool=shuffle([...R.target.map(w=>({w})),{w:it.x,extra:1}]);R.sel=[];R.tries=0;R.solved=false;R.showSol=false;drawBuild();}
function drawBuild(state){const it=R.items[R.i];const full=R.sel.length===R.target.length;
 $('app').innerHTML=frame(`<div class="pic">${esc(it.pic||'🧩')}</div><p class="ginst">${t('build')}</p><div class="answer ${state||''}">${R.sel.map((pi,k)=>`<button class="word" ${act('unpick',k)}>${esc(R.pool[pi].w)}</button>`).join('')||'&nbsp;'}</div>
 <div class="bubbles">${R.pool.map((p,k)=>`<button class="bub ${R.sel.includes(k)?'used':''}" ${act('bpick',k)}>${esc(p.w)}</button>`).join('')}</div>
 ${R.solved?'':`<div class="row"><button class="btn line" ${act('bclear')}>${t('clear')}</button><button class="btn" ${full?'':'disabled'} ${act('bcheck')}>${t('check')}</button></div>`}
 <div class="fb ${state==='ok'?'ok':state==='bad'?'bad':''}">${state==='ok'?t('ok'):state==='bad'?t('again'):''}</div>
 ${R.showSol?`<div class="solution">${t('answerIs')} <b>${esc(it.s)}</b></div><div class="row"><button class="btn" ${act('bnext')}>${t('next')}</button></div>`:''}`,{progress:prog()});}
function bpick(k){if(R.solved||R.sel.includes(k)||R.sel.length>=R.target.length)return;R.sel.push(k);beep('pop');drawBuild();}
function unpick(k){if(R.solved)return;R.sel.splice(k,1);drawBuild();}
function bcheck(){const it=R.items[R.i];const got=R.sel.map(k=>R.pool[k].w).join(' ');R.tries++;
 if(got===it.s){R.ok+=R.tries===1?1:.5;R.score+=R.tries===1?10:5;R.solved=true;beep('ok');answered(1);say(it.s);drawBuild('ok');setTimeout(bnext,1300);}
 else{beep('bad');answered(0);R.miss++;if(R.tries>=2){R.solved=true;R.showSol=true;say(it.s);}drawBuild('bad');}}
function bnext(){nextOr(newBuild,()=>[acc(R.ok,R.items.length),`${Math.round(R.ok)} / ${R.items.length} ${t('correctOf')}`]);}
/* ---- 5. transformer ---- */
function gTrans(tp){R.items=shuffle(tp.trans).map(x=>({...x,opts:shuffle([{x:x.to,ok:1},...x.o.map(y=>({x:y}))])}));drawTrans();}
function drawTrans(){const it=R.items[R.i];R.lock=false;$('app').innerHTML=frame(`<p class="ginst">${t('transHint')}</p><div class="tbox"><div class="tfrom">${esc(it.from)}</div><br><span class="ttask">⚙️ ${esc(L(it.task))}</span><div class="arrow">⬇</div></div><div class="opts col">${it.opts.map((o,k)=>`<button class="opt" id="o${k}" ${act('transAns',k)}>${esc(o.x)}</button>`).join('')}</div><div class="fb" id="fb"></div>`,{progress:prog()});}
function transAns(k){if(R.lock)return;R.lock=true;const it=R.items[R.i],o=it.opts[k],r=it.opts.findIndex(x=>x.ok);if(o.ok){R.ok++;R.score+=10;$('o'+k).classList.add('ok');fb('ok','ok');answered(1);}else{R.miss++;$('o'+k).classList.add('bad');$('o'+r).classList.add('ok');fb('bad','bad');answered(0);mist(it.from+' → '+L(it.task),[it.to,...it.o],it.to);}
 say(it.to);setTimeout(()=>nextOr(drawTrans,()=>[acc(R.ok,R.items.length),`${R.ok} / ${R.items.length} ${t('correctOf')}`]),o.ok?1200:2200);}
/* ---- 6. fix ---- */
function gFix(tp){R.items=shuffle(tp.fix);R.step=0;R.err=0;drawFix();}
function drawFix(state){const it=R.items[R.i];const words=it.s.split(' ');
 $('app').innerHTML=frame(`<div class="pic">🔍</div><div class="taskline">${R.step===0?t('clickWrong'):t('chooseFix')}</div>
 <div class="sentence">${words.map((w,k)=>`<button class="word ${R.step>0&&k===it.w?(state==='fixed'?'fixed':'sel'):''} ${R.missK===k?'miss':''}" ${act('fixWord',k)}>${esc(R.step>0&&k===it.w&&state==='fixed'?it.c+trail(w):w)}</button>`).join('')}</div>
 ${R.step===1?`<div class="opts">${R.opts.map((o,k)=>`<button class="opt" id="fo${k}" ${act('fixPick',k)}>${esc(o)}</button>`).join('')}</div>`:''}
 <div class="fb ${state==='fixed'?'ok':state==='bad'?'bad':''}">${state==='fixed'?t('ok'):state==='bad'?t('bad'):''}</div>`,{progress:prog()});R.missK=null;}
function fixWord(k){if(R.step!==0)return;const it=R.items[R.i];if(k===it.w){R.step=1;R.opts=shuffle(it.o);beep('pop');drawFix();}else{R.err++;R.miss++;R.missK=k;beep('bad');answered(0);drawFix('bad');}}
function fixPick(k){if(R.step!==1)return;const it=R.items[R.i];const o=R.opts[k];
 if(o===it.c){R.step=2;R.ok+=R.err?.5:1;R.score+=10;beep('ok');answered(1);const w=it.s.split(' ');w[it.w]=it.c+trail(w[it.w]);say(w.join(' '));drawFix('fixed');setTimeout(()=>{R.step=0;R.err=0;nextOr(drawFix,()=>[acc(R.ok,R.items.length),`${Math.round(R.ok)} / ${R.items.length} ${t('correctOf')}`]);},1400);}
 else{R.err++;R.miss++;beep('bad');answered(0);const b=$('fo'+k);if(b)b.classList.add('bad');const w=it.s.split(' ');const good=w.slice();good[it.w]=it.c+trail(w[it.w]);mist(t('isCorrect'),[good.join(' '),it.s],good.join(' '));}}
/* ---- 7. place ---- */
const ZONES={on:[220,108],in:[220,190],under:[220,268],next:[82,262],between:[362,262],front:[268,322],behind:[304,150]};
function gPlace(tp){R.items=shuffle(tp.place);drawPlace();}
function drawPlace(state,zk){const it=R.items[R.i];const pos=zk?ZONES[zk]:null;R.lock=!!state;
 $('app').innerHTML=frame(`<div class="taskline" style="font-size:22px" data-s="${esc(it.s)}">${esc(it.s)} <button class="spk" ${act('sayParent')}>🔊</button></div><p class="ginst">${t('placeHint')} ${esc(it.item)}</p>
 <div class="scenewrap" id="sw"><div class="scene" id="scene"><div class="boxA"></div><div class="legA" style="left:158px"></div><div class="legA" style="left:270px"></div><div class="boxB"></div>
 ${Object.entries(ZONES).map(([k,[x,y]])=>`<div class="zone ${zk===k?state:''}" style="left:${x}px;top:${y}px" ${act('placeAt',k)}></div>`).join('')}
 ${pos?`<div class="thing z-${['behind','in','front'].includes(zk)?zk:'other'}" style="left:${pos[0]}px;top:${pos[1]}px">${esc(it.item)}</div>`:''}</div></div>
 <div class="fb ${state||''}">${state==='ok'?t('ok'):state==='bad'?t('bad'):''}</div>`,{progress:prog()});fitScene();}
function fitScene(){const w=$('sw'),s=$('scene');if(!w||!s)return;const k=Math.min(1,w.clientWidth/580);s.style.transform=`scale(${k})`;w.style.height=(360*k)+'px';}
on(globalThis,'resize',fitScene);
function placeAt(k){if(R.lock)return;const it=R.items[R.i];if(k===it.z){R.ok++;R.score+=10;beep('ok');answered(1);say(it.s);drawPlace('ok',k);}else{R.miss++;beep('bad');answered(0);drawPlace('bad',k);setTimeout(()=>{if(G.view==='game'){drawPlace('ok',it.z);say(it.s);}},900);}
 setTimeout(()=>{if(G.view==='game')nextOr(()=>drawPlace(),()=>[acc(R.ok,R.items.length),`${R.ok} / ${R.items.length} ${t('correctOf')}`]);},k===it.z?1300:2300);}
/* ---- 8. type ---- */
function gType(tp){R.items=shuffle(tp.gap).slice(0,10);newType();}
function newType(){R.tries=0;R.hint=0;drawType();setTimeout(()=>{const i=$('tin');if(i)i.focus();},50);}
function drawType(state,val){const g=R.items[R.i];$('app').innerHTML=frame(`<div class="pic">${esc(g.pic||'⌨️')}</div><p class="ginst">${t('typeHint')}</p><div class="q">${qhtml(g,state==='ok'||state==='show'?g.a:null)}</div>
 <div class="tin"><input id="tin" autocomplete="off" autocapitalize="off" spellcheck="false" class="${state==='ok'?'ok':state==='bad'?'bad':''}" value="${esc(val||'')}" ${state==='ok'||state==='show'?'disabled':''}><button class="btn" ${act('typeCheck')} ${state==='ok'||state==='show'?'disabled':''}>${t('check')}</button></div>
 <div class="row" style="margin-top:12px">${state==='ok'||state==='show'?'':`<button class="btn line" ${act('typeHint')}>${t('hintBtn')}</button>`}</div>
 <div class="fb ${state==='ok'?'ok':state?'bad':''}">${state==='ok'?t('ok'):state==='bad'?t('again'):state==='show'?t('answerIs')+' '+esc(g.a):''}</div>
 ${state==='show'?`<div class="row"><button class="btn" ${act('typeNext')}>${t('next')}</button></div>`:''}`,{progress:prog()});}
function typeHint(){const g=R.items[R.i];R.hint=Math.min(g.a.length,R.hint+1);const i=$('tin');if(i){i.value=g.a.slice(0,R.hint);i.focus();}}
function typeCheck(){const inp=$('tin');if(!inp||inp.disabled)return;const g=R.items[R.i];const v=inp.value;if(!v.trim())return;const okv=[g.a,...(g.alt||[])].map(norm);R.tries++;
 if(okv.includes(norm(v))){const pts=R.tries===1&&!R.hint?1:.5;R.ok+=pts;R.score+=pts*10;beep('ok');answered(1);say(sentOf(g.s,g.a));drawType('ok',v);setTimeout(typeNext,1300);}
 else{R.miss++;beep('bad');answered(0);if(R.tries>=2){say(sentOf(g.s,g.a));mist(g.s+(g.h?' ('+g.h+')':''),[g.a,...g.o],g.a);drawType('show',v);}else{drawType('bad',v);setTimeout(()=>{const i=$('tin');if(i){i.focus();i.select();}},30);}}}
function typeNext(){nextOr(newType,()=>[acc(R.ok,R.items.length),`${Math.round(R.ok)} / ${R.items.length} ${t('correctOf')}`]);}
/* ---- 9. dialog ---- */
function gDialog(tp){R.d=tp.dialog;R.items=tp.dialog.lines;R.shown=[];R.gaps=R.items.filter(l=>l.a).length;R.lock=false;dialogStep();}
function dialogStep(){if(R.over)return;if(R.i>=R.items.length){finish(acc(R.ok,R.gaps),`${R.ok} / ${R.gaps} ${t('correctOf')}`);return;}const l=R.items[R.i];
 if(!l.a){R.shown.push({who:l.who,html:esc(l.t)});drawDialog();say(l.t);R.i++;const tm=setTimeout(dialogStep,Math.min(2600,900+l.t.length*35));loops.push(()=>clearTimeout(tm));}
 else{R.opts=shuffle([l.a,...l.o]);R.lock=false;drawDialog(true);}}
function drawDialog(ask){const l=R.items[R.i];const av={A:'🙋‍♀️',B:'🙋‍♂️'};
 $('app').innerHTML=frame(`<div class="taskline">💬 ${esc(L(R.d.title))}</div><p class="ginst">${t('dialogHint')}</p><div class="chat" id="chat">${R.shown.map(m=>`<div class="msg ${esc(m.who)}"><span class="av">${av[m.who]}</span><div class="bb">${m.html}</div></div>`).join('')}
 ${ask?`<div class="msg ${esc(l.who)}"><span class="av">${av[l.who]}</span><div class="bb">${esc(l.t).replace('___','<span class="blank">?</span>')}</div></div>`:''}</div>
 ${ask?`<div class="opts chatopts">${R.opts.map((o,k)=>`<button class="opt" id="o${k}" ${act('dialogAns',k)}>${esc(o)}</button>`).join('')}</div>`:''}<div class="fb" id="fb"></div>`,{progress:R.i/R.items.length*100});
 const c=$('chat');if(c)c.scrollTop=c.scrollHeight;}
function dialogAns(k){if(R.lock)return;const l=R.items[R.i];const o=R.opts[k];
 if(o===l.a){R.lock=true;if(!R.err)R.ok++;R.err=0;R.score+=10;$('o'+k).classList.add('ok');fb('ok','ok');answered(1);const txt=sentOf(l.t,l.a);say(txt);setTimeout(()=>{R.shown.push({who:l.who,html:esc(l.t).replace('___',`<span class="fill">${esc(l.a)}</span>`)});R.i++;dialogStep();},1000);}
 else{R.err=1;R.miss++;$('o'+k).classList.add('bad');$('o'+k).disabled=true;fb('bad','bad');answered(0);mist(l.t,[l.a,...l.o],l.a);}}
/* ---- 10. listen ---- */
function gListen(tp){R.items=shuffle(tp.gap).slice(0,10).map(g=>{const right=sentOf(g.s,g.a);return {right,opts:shuffle([{x:right,ok:1},...g.o.map(o=>({x:sentOf(g.s,o)}))])};});drawListen();}
function drawListen(){const it=R.items[R.i];R.lock=false;R.peek=false;$('app').innerHTML=frame(`<p class="ginst">${t('listenHint')}</p><button class="lbtn" id="lb" ${act('listenPlay')}>🔊</button>
 <div style="text-align:center;margin-bottom:16px"><button class="btn line" style="padding:8px 14px;font-size:13px" ${act('listenPeek')}>${t('showText')}</button><div id="peek" style="display:none;margin-top:10px;font-weight:700;color:var(--muted)">${esc(it.right)}</div></div>
 <div class="opts col">${it.opts.map((o,k)=>`<button class="opt" id="o${k}" ${act('listenAns',k)}>${esc(o.x)}</button>`).join('')}</div><div class="fb" id="fb"></div>`,{progress:prog()});setTimeout(listenPlay,250);}
function listenPlay(){const it=R.items[R.i];say(it.right,1);const b=$('lb');if(b){b.classList.add('play');setTimeout(()=>b&&b.classList.remove('play'),1800);}}
function listenAns(k){if(R.lock)return;R.lock=true;const it=R.items[R.i],o=it.opts[k],r=it.opts.findIndex(x=>x.ok);if(o.ok){R.ok+=R.peek?.5:1;R.score+=10;$('o'+k).classList.add('ok');fb('ok','ok');answered(1);}else{R.miss++;$('o'+k).classList.add('bad');$('o'+r).classList.add('ok');fb('bad','bad');answered(0);mist(t('isCorrect'),it.opts.map(x=>x.x),it.right);}
 setTimeout(()=>nextOr(drawListen,()=>[acc(R.ok,R.items.length),`${Math.round(R.ok)} / ${R.items.length} ${t('correctOf')}`]),o.ok?1000:1900);}
/* ---- 11. race ---- */
const RACE_LEN=12;
const NM=k=>({d:{ru:'Декстер',kk:'Декстер',en:'Dexter'},s:{ru:'Спарк',kk:'Спарк',en:'Spark'}})[k][G.lang]||'';
function gRace(tp){const pool=shuffle(tp.gap);R.items=[];for(let r=0;r<2;r++)shuffle(pool).forEach(g=>{const truth=Math.random()<.5;R.items.push({s:sentOf(g.s,truth?g.a:g.o[Math.floor(Math.random()*2)]),truth,right:sentOf(g.s,g.a)});});
 R.me=0;R.riv=0;R.started=false;const sp={L1:3.6,L2:3.3,L3:3.0,L4:2.8,L5:2.6}[tp.lv]||3.2;R.speed=sp;drawRace();}
const rpos=n=>`calc(64px + (100% - 150px) * ${n/RACE_LEN})`;
function drawRace(){const it=R.items[R.i];$('app').innerHTML=frame(`<p class="ginst">${t('raceHint')}</p>
 <div class="rtrack ${R.started?'run':''}" id="rtrack"><div class="rclouds"></div><div class="rhills"></div>
  <div class="rlane"><span class="rnm">${NM('d')}</span><span class="rfin"></span><img class="racer d ${R.started?'go':''}" id="carMe" src="${IMG.dexter}" alt="" style="left:${rpos(R.me)}"></div>
  <div class="rlane"><span class="rnm">${NM('s')}</span><span class="rfin"></span><img class="racer s ${R.started?'go':''}" id="carRiv" src="${IMG.spark}" alt="" style="left:${rpos(R.riv)}"></div></div>
 ${R.started?`<div class="tfq" id="tfq">${esc(it.s)}</div><div class="tfb"><button class="opt" id="bt" ${act('raceAns',true)}>${t('tTrue')}</button><button class="opt" id="bf" ${act('raceAns',false)}>${t('tFalse')}</button></div><div class="fb" id="fb"></div>`:`<div style="text-align:center;padding:20px"><button class="btn big" ${act('raceGo')}>🏁 ${t('start')}</button></div>`}`,{right:`<span class="pill">${t('mist')}: ${R.miss}</span>`});}
function raceEnd(won){const tr=$('rtrack');if(tr)tr.classList.remove('run');const me=$('carMe'),rv=$('carRiv');if(me){me.classList.remove('go');me.classList.add(won?'cheer':'sad');}if(rv){rv.classList.remove('go');rv.classList.add(won?'sad':'cheer');}}
function raceGo(){R.started=true;R.lock=false;drawRace();const iv=setInterval(()=>{if(dead||R.over||R.ending)return;R.riv++;const c=$('carRiv');if(c)c.style.left=rpos(R.riv);if(R.riv>=RACE_LEN){R.ending=1;R.lock=true;raceEnd(false);setTimeout(()=>finish(R.me>=RACE_LEN*.75?1:0,`${t('mist')}: ${R.miss}`),1300);}},R.speed*1000);loops.push(()=>clearInterval(iv));}
function raceAns(v){if(R.lock||R.ending)return;R.lock=true;const it=R.items[R.i];const ok=v===it.truth;const me=$('carMe');answered(ok);
 if(ok){R.me++;R.ok++;R.score+=10;$(v?'bt':'bf').classList.add('ok');fb('ok','ok');if(me){me.style.left=rpos(R.me);me.classList.remove('boost');void me.offsetWidth;me.classList.add('boost');}}
 else{R.miss++;$(v?'bt':'bf').classList.add('bad');if(me){me.classList.remove('trip');void me.offsetWidth;me.classList.add('trip');}fb('bad','bad',`<div class="explain">${t('answerIs')} <b>${esc(it.right)}</b></div>`);}
 if(R.me>=RACE_LEN){R.ending=1;raceEnd(true);setTimeout(()=>finish(R.miss<=1?3:R.miss<=3?2:1,`${t('mist')}: ${R.miss}`),1300);return;}
 setTimeout(()=>{if(R.over||R.ending)return;R.i=(R.i+1)%R.items.length;R.lock=false;const q=$('tfq');if(!q)return;q.textContent=R.items[R.i].s;['bt','bf'].forEach(id=>$(id).classList.remove('ok','bad'));$('fb').innerHTML='';$('fb').className='fb';const p=root.querySelector('.gtop .pill');if(p)p.textContent=`${t('mist')}: ${R.miss}`;},ok?500:1700);}
/* ---- 12. catch ---- */
function gCatch(tp){const c=tp.catch;R.task=c.task;R.right=c.right;R.wrong=c.wrong;R.lives=3;R.caught=0;R.time=50;
 $('app').innerHTML=frame(`<div class="taskline">${esc(L(c.task))}</div><div class="skywrap"><img class="catcher" id="catcher" src="${IMG.dexter}" alt=""><div class="sky" id="sky"><div style="position:absolute;inset:0;display:grid;place-items:center"><div style="text-align:center;max-width:420px;padding:10px"><p class="sub" style="font-size:17px">${t('catchStart')}</p><button class="btn" ${act('catchGo')}>▶ ${t('start')}</button></div></div></div></div>`,{right:catchRight()});}
function catchRight(){return `<span class="pill" id="cTime">⏱ ${Math.ceil(R.time)}s</span> <span class="pill" id="cScore">${t('caught')}: ${R.caught}</span> <span class="pill" id="cLives">${'❤️'.repeat(R.lives)}${'🤍'.repeat(3-R.lives)}</span>`;}
function catchHud(){const a=$('cTime'),b=$('cScore'),c=$('cLives');if(!a)return;a.textContent=`⏱ ${Math.max(0,Math.ceil(R.time))}s`;b.textContent=`${t('caught')}: ${R.caught}`;c.textContent='❤️'.repeat(Math.max(0,R.lives))+'🤍'.repeat(3-Math.max(0,R.lives));}
function catchGo(){const sky=$('sky');sky.innerHTML='';R.clouds=[];let last=performance.now(),spawnT=0,alive=true;const H=sky.clientHeight,W=sky.clientWidth;
 const spawn=()=>{const ok=Math.random()<.55;const pool=ok?R.right:R.wrong;const w=pool[Math.floor(Math.random()*pool.length)];const el=doc.createElement('div');el.className='cloud';el.textContent=w;sky.appendChild(el);
  const cw=el.offsetWidth||120;const x=10+Math.random()*Math.max(10,W-cw-20);const cl={el,ok,w,y:-50,v:50+Math.random()*30+R.caught*2.2,dead:false};el.style.left=x+'px';el.style.top='-50px';
  el.onclick=()=>{if(cl.dead)return;cl.dead=true;const ct=$('catcher');if(ct){ct.classList.remove('jump','oops');void ct.offsetWidth;ct.classList.add(cl.ok?'jump':'oops');}answered(cl.ok);if(cl.ok){R.caught++;R.score+=10;el.classList.add('ok');beep('ok');say(w);}else{R.lives--;R.miss++;el.classList.add('bad');beep('bad');setTimeout(()=>{el.style.opacity=0;},300);}catchHud();setTimeout(()=>el.remove(),400);if(R.lives<=0)endCatch();};R.clouds.push(cl);};
 const tick=now=>{if(!alive||dead)return;const dt=Math.min(.05,(now-last)/1000);last=now;R.time-=dt;spawnT-=dt;if(spawnT<=0){spawn();spawnT=Math.max(.6,1.15-R.caught*.03);}
  R.clouds.forEach(c=>{if(c.dead)return;c.y+=c.v*dt;c.el.style.top=c.y+'px';if(c.y>H){c.dead=true;c.el.remove();}});catchHud();if(R.time<=0){endCatch();return;}requestAnimationFrame(tick);};
 requestAnimationFrame(tick);loops.push(()=>{alive=false;});}
function endCatch(){if(G.view!=='game'||R.over)return;finish(R.lives<=0?(R.caught>=10?1:0):R.caught>=16?3:R.caught>=9?2:1,`${t('caught')}: ${R.caught}`);}
/* ---- 13. boss ---- */
const BOSS_HP=10;
function gBoss(tp){const q=[];
 tp.gap.forEach(g=>q.push({kind:'gap',html:qhtml(g),opts:shuffle([{x:g.a,ok:1},...g.o.map(x=>({x}))]),say:sentOf(g.s,g.a)}));
 tp.trans.forEach(x=>q.push({kind:'trans',html:`<div class="tfrom" style="font-size:19px">${esc(x.from)}</div><br><span class="ttask">⚙️ ${esc(L(x.task))}</span>`,opts:shuffle([{x:x.to,ok:1},...x.o.map(y=>({x:y}))]),say:x.to,col:1}));
 tp.fix.forEach(x=>{const w=x.s.split(' ');const good=w.slice();good[x.w]=x.c+trail(w[x.w]);const other=x.o.find(o=>o!==x.c);const alt=w.slice();alt[x.w]=other+trail(w[x.w]);q.push({kind:'fix',html:`<span style="font-size:20px">${t('isCorrect')}</span>`,opts:shuffle([{x:good.join(' '),ok:1},{x:x.s},{x:alt.join(' ')}]),say:good.join(' '),col:1});});
 (tp.dialog.lines||[]).filter(l=>l.a).forEach(l=>q.push({kind:'gap',html:esc(l.t).replace('___','<span class="blank">?</span>'),opts:shuffle([{x:l.a,ok:1},...l.o.map(x=>({x}))]),say:sentOf(l.t,l.a)}));
 R.items=shuffle(q);R.hp=BOSS_HP;R.lives=3;drawBoss();}
function arenaHud(){return `<div class="ar-hud l"><b>${NM('d')}</b><div class="hp2"><i id="hpD" style="width:${R.lives/3*100}%"></i></div><span id="lvD">${'❤️'.repeat(R.lives)}${'🤍'.repeat(3-R.lives)}</span></div><div class="ar-vs">VS</div><div class="ar-hud r"><b>${NM('s')}</b><div class="hp2 sp"><i id="hpS" style="width:${R.hp/BOSS_HP*100}%"></i></div><span id="lvS">HP ${R.hp} / ${BOSS_HP}</span></div>`;}
function drawBoss(){const it=R.items[R.i%R.items.length];R.lock=false;$('app').innerHTML=frame(`<p class="ginst">${t('bossHint')}</p><div class="arena2" id="arena"><div class="ar-lights"></div><div class="ar-ring"></div>${arenaHud()}<img class="ftr d idle" id="fd" src="${IMG.dexter}" alt=""><img class="ftr s idle" id="fs" src="${IMG.spark}" alt=""><div class="pow" id="pow"></div></div>
 <div class="q" style="font-size:22px">${it.html}</div><div class="opts ${it.col?'col':''}">${it.opts.map((o,k)=>`<button class="opt" id="o${k}" ${act('bossAns',k)}>${esc(o.x)}</button>`).join('')}</div><div class="fb" id="fb"></div>`,{right:`<span class="pill">${t('mist')}: ${R.miss}</span>`});}
function strike(who){const a=$(who==='d'?'fd':'fs'),b=$(who==='d'?'fs':'fd'),pw=$('pow');if(!a||!b)return;a.classList.remove('idle');b.classList.remove('idle');a.classList.add('atk');
 setTimeout(()=>{b.classList.add('hit');if(pw){pw.textContent=['POW!','BAM!','WHAM!','BOOM!'][Math.floor(Math.random()*4)];pw.className='pow show '+(who==='d'?'atS':'atD');}beep('hit');
  const hd=$('hpD'),hs=$('hpS'),ld=$('lvD'),ls=$('lvS');if(hd)hd.style.width=(R.lives/3*100)+'%';if(hs)hs.style.width=(R.hp/BOSS_HP*100)+'%';if(ld)ld.textContent='❤️'.repeat(Math.max(0,R.lives))+'🤍'.repeat(3-Math.max(0,R.lives));if(ls)ls.textContent=`HP ${R.hp} / ${BOSS_HP}`;},260);
 setTimeout(()=>{a.classList.remove('atk');b.classList.remove('hit');if(R.hp<=0){$('fs').classList.add('ko');$('fd').classList.add('win');}else if(R.lives<=0){$('fd').classList.add('ko');$('fs').classList.add('win');}else{a.classList.add('idle');b.classList.add('idle');}},760);}
function bossAns(k){if(R.lock)return;R.lock=true;const it=R.items[R.i%R.items.length],o=it.opts[k],r=it.opts.findIndex(x=>x.ok);
 if(o.ok){R.hp--;R.ok++;$('o'+k).classList.add('ok');strike('d');fb('ok','ok');answered(1);}else{R.lives--;R.miss++;$('o'+k).classList.add('bad');$('o'+r).classList.add('ok');strike('s');fb('bad','bad');answered(0);mist(plain(it.html),it.opts.map(x=>x.x),it.opts[r].x);}
 say(it.say);const end=R.hp<=0||R.lives<=0;setTimeout(()=>{if(R.over)return;if(R.hp<=0)return finish(R.lives,`${t('mist')}: ${R.miss}`);if(R.lives<=0)return finish(0,`HP ${R.hp}/${BOSS_HP}`);R.i++;drawBoss();},end?2100:(o.ok?1100:2100));}
/* ================= действия разметки (вместо inline onclick прототипа) ================= */
const ACT={
 go:(el,v,a,b)=>go(v,a,b),
 lv:(el,id)=>{G.lv=id;render();},
 openCard:(el,i)=>openCard(i),closeModal:()=>closeModal(),ruleSheet:()=>ruleSheet(),openStage:(el,i)=>openStage(i),
 say:(el,text)=>say(text,1),sayParent:el=>say(el.parentNode.dataset.s,1),
 addWord:(el,word,key)=>addWordClick(el,word,key),
 retryTopic:()=>openTopic(G.loading,G.loadTab||'rule'),
 pickAns:(el,k)=>pickAns(k),mflip:(el,k)=>mflip(k),
 sortSel:(el,k)=>{R.sel=k;beep('pop');drawSort();},sortDrop:(el,ci)=>sortDrop(ci),
 unpick:(el,k)=>unpick(k),bpick:(el,k)=>bpick(k),bclear:()=>{R.sel=[];drawBuild();},bcheck:()=>bcheck(),bnext:()=>bnext(),
 transAns:(el,k)=>transAns(k),fixWord:(el,k)=>fixWord(k),fixPick:(el,k)=>fixPick(k),placeAt:(el,k)=>placeAt(k),
 typeCheck:()=>typeCheck(),typeHint:()=>typeHint(),typeNext:()=>typeNext(),
 dialogAns:(el,k)=>dialogAns(k),
 listenPlay:()=>listenPlay(),listenPeek:()=>{R.peek=true;$('peek').style.display='block';},listenAns:(el,k)=>listenAns(k),
 raceGo:()=>raceGo(),raceAns:(el,v)=>raceAns(v),catchGo:()=>catchGo(),bossAns:(el,k)=>bossAns(k)
};
/* ================= Apple emoji (картинки статики, одинаковый вид на любом устройстве) ================= */
const EMO_LIST=(asset&&asset.emojiList)||[];
const EMO_RE=EMO_LIST.length?new RegExp(EMO_LIST.slice().sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'):null;
// 4 = NodeFilter.SHOW_TEXT; 1/2 — FILTER_ACCEPT/FILTER_REJECT (как в прототипе)
function emojify(node){if(!EMO_RE||!node||!doc.createTreeWalker)return;const w=doc.createTreeWalker(node,4,{acceptNode:n=>{const p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName))return 2;EMO_RE.lastIndex=0;return EMO_RE.test(n.nodeValue)?1:2;}});const list=[];while(w.nextNode())list.push(w.currentNode);
 list.forEach(n=>{const s=n.nodeValue,frag=doc.createDocumentFragment();let last=0,m;EMO_RE.lastIndex=0;while((m=EMO_RE.exec(s))){if(m.index>last)frag.appendChild(doc.createTextNode(s.slice(last,m.index)));const im=doc.createElement('img');im.src=asset.emoji(m[0]);im.alt=m[0];im.className='emj';im.draggable=false;frag.appendChild(im);last=m.index+m[0].length;}if(last<s.length)frag.appendChild(doc.createTextNode(s.slice(last)));if(n.parentNode)n.parentNode.replaceChild(frag,n);});}
let mo=null;
if(EMO_RE&&typeof MutationObserver!=='undefined'){mo=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){if(m.target.parentNode)emojify(m.target.parentNode);continue;}m.addedNodes.forEach(n=>{if(n.nodeType===1)emojify(n);else if(n.nodeType===3&&n.parentNode)emojify(n.parentNode);});}});mo.observe(root,{childList:true,subtree:true,characterData:true});}
/* ================= start ================= */
root.innerHTML='<main id="app"></main><div id="pop" class="pop" style="display:none"></div>';
if(initialTopic&&IDX[initialTopic])go('topic',initialTopic);else render();

function destroy(){if(dead)return;dead=true;stopLoops();ac.abort();timers.forEach(id=>globalThis.clearTimeout(id));timers.clear();if(mo)mo.disconnect();
 if(AC){try{const p=AC.close();if(p&&p.catch)p.catch(()=>{});}catch{/* уже закрыт */}AC=null;}
 try{stopVoice();}catch{/* голос уже молчит */}root.innerHTML='';}

return {
 destroy,
 /** Переход движка (для экрана: открыть тему по ссылке; для тестов). */
 go:(v,a,b)=>Promise.resolve(go(v,a,b)),
 /** Язык приложения. Идущую игру не трогаем (как прототип) — новый язык со следующего экрана. */
 setLang(l){if(!l||l===G.lang)return;G.lang=l;if(G.view==='game')return;closeModal();hidePop();render();},
 setSound(v){G.sound=!!v;},
 snapshot:()=>({view:G.view,lv:G.lv,topic:G.topic,stage:G.stage,tab:G.tab,R,P}),
};
}
