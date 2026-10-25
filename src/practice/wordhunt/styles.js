// CSS Word Hunt для Shadow DOM — СГЕНЕРИРОВАН scripts/wordhunt/extract-assets.js из прототипа
// методиста, руками не править: новая версия прототипа = перезапуск скрипта, правки — в его PATCHES
// и APP_CSS. Отличия от прототипа: :root → :host, body → корень .wh, картинки дизайна — файлами
// /practice/wordhunt/img/, гарнитуры — inherit (шрифт сайта, в казахском — Inter), небо обрезано по
// разделу (.sky-clip), логотип и RU/KZ сняты.
export const WORDHUNT_CSS = `/* =====================================================================
   WORD HUNT — vocabulary games by just to study
   A bright, magical sky: sky blue → lavender → soft pink, luminous nebulae,
   sparkles and drifting words (the learner's own collected words).
   Each CEFR level is a region of it — Stars · Moons · Planets ·
   Constellations · Galaxies, and Stations for professional words — with its
   own painted sky (shown whole), its own 3D markers and its own guide: one
   of the four JTS tutors (Dexter, Luna, Aizere, Spark).
   Rules: art is never cropped into slivers; text sits on white glass;
   correct letters glow gold like stars; Crossword = violet, Word Search =
   cyan. Fonts: PT Root UI headings, SF Pro Display text.
   ===================================================================== */
:host{
  --ink:#1F1650; --ink-2:#463F7C; --mut:#5A538C; --mut-2:#7C76A8;
  --violet:#874BF8; --violet-dk:#6A2FE3; --violet-lt:#EFE7FE; --violet-sky:#B48CFF;
  --cyan:#0AC7FF; --cyan-dk:#0079BF; --cyan-lt:#E2F5FF;
  --green:#00C23C; --green-dk:#0E7A38; --green-lt:#E1FAEB;
  --orange:#FF631E; --orange-lt:#FFEBE2;
  --amber:#FFAD00; --amber-dk:#8F6100; --amber-lt:#FFF4DC; --gold:#FFC93D; --gold-lt:#FFE27A;
  --grey:#5F5974; --line:#E4DEF5; --line-2:#CDC5E6; --canvas:#F5F2FD; --white:#fff;
  --glass:rgba(255,255,255,.7); --glass-hi:rgba(255,255,255,.86); --glass-b:rgba(255,255,255,.95);
  --sh:0 10px 30px rgba(84,58,190,.14),0 2px 6px rgba(84,58,190,.06);
  --sh-lg:0 18px 50px rgba(84,58,190,.22);
  --r-sm:10px; --r:14px; --r-lg:20px; --r-xl:28px;
  --top:62px; --zc:var(--gold); --zd:var(--amber-dk);
}
*{box-sizing:border-box}
.wh{color:var(--ink);font-family:inherit;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh;overflow-x:clip;
  background:
    radial-gradient(720px 440px at 90% -80px,rgba(180,140,255,.55),transparent 70%) no-repeat,
    radial-gradient(640px 440px at -10% 240px,rgba(100,200,255,.45),transparent 70%) no-repeat,
    radial-gradient(760px 560px at 106% 860px,rgba(255,160,215,.40),transparent 70%) no-repeat,
    radial-gradient(640px 500px at -8% 1500px,rgba(120,230,220,.30),transparent 70%) no-repeat,
    linear-gradient(180deg,#D7EBFF 0%,#E5E0FF 34%,#EFE4FB 70%,#F7E6F4 100%)}
button{font-family:inherit;font-size:inherit;color:inherit}
h1,h2,h3,h4{font-family:inherit;color:var(--ink);margin:0;letter-spacing:-.015em}
:focus-visible{outline:3px solid var(--violet);outline-offset:3px;border-radius:10px}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
.app{position:relative;z-index:1}

/* ------------------------------------------------------------ the air --- */
.sky{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.sky.stage::before{content:"";position:absolute;inset:0;background:var(--zimg) 70% center/cover no-repeat;opacity:.7}
.sky.stage::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(226,236,255,.55) 0%,rgba(238,232,255,.62) 50%,rgba(250,236,250,.72) 100%)}
.sky>*{z-index:1}
.fw{position:absolute;left:0;white-space:nowrap;font-family:inherit;font-weight:800;font-size:calc(24px * var(--z));letter-spacing:.02em;color:rgba(104,70,214,.22);text-shadow:0 0 14px rgba(255,255,255,.95),0 0 2px rgba(255,255,255,.9);animation:drift var(--t) linear var(--dl) infinite;will-change:transform}
.fw:nth-child(3n){color:rgba(0,140,210,.22)}
.fw:nth-child(4n){color:rgba(214,70,160,.2)}
.fw.new{color:rgba(135,75,248,.5);animation-duration:38s}
@keyframes drift{0%{transform:translate3d(-30vw,0,0)}50%{transform:translate3d(45vw,-16px,0)}100%{transform:translate3d(115vw,0,0)}}
.spk{position:absolute;width:calc(14px * var(--s));height:calc(14px * var(--s));background:#fff;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:drop-shadow(0 0 3px rgba(255,255,255,.95)) drop-shadow(0 0 6px rgba(150,110,255,.8));animation:tw var(--d) ease-in-out infinite}
.spk:nth-child(3n){background:#FFF3B8;filter:drop-shadow(0 0 4px rgba(255,201,61,.9))}
.spk:nth-child(4n){background:#E8F8FF;filter:drop-shadow(0 0 5px rgba(10,199,255,.8))}
@keyframes tw{0%,100%{opacity:.25;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(20deg)}}
.flyword{position:fixed;z-index:90;pointer-events:none;font-family:inherit;font-weight:800;font-size:22px;white-space:nowrap;color:#fff;padding:4px 14px;border-radius:999px;background:var(--fc,var(--violet));box-shadow:0 0 0 4px rgba(255,255,255,.6),0 0 28px var(--fc,var(--violet))}
.twk{position:fixed;z-index:85;pointer-events:none;width:16px;height:16px;background:#FFE27A;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);filter:drop-shadow(0 0 6px #FFC93D);animation:twk 1s ease-out both}
@keyframes twk{0%{opacity:0;transform:scale(.2) rotate(0)}30%{opacity:1;transform:scale(1.3) rotate(40deg) translateY(-6px)}100%{opacity:0;transform:scale(.4) rotate(90deg) translateY(-26px)}}
.burst{position:fixed;inset:0;pointer-events:none;z-index:75}
.confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80}

/* ------------------------------------------------------ mascots & art --- */
.mz{display:block;background:var(--img) center bottom/contain no-repeat;filter:drop-shadow(0 10px 14px rgba(70,40,170,.22))}
.av{display:block;width:40px;height:40px;flex:none;border-radius:50%;background:var(--img) var(--hp,50% 14%)/var(--hz,190%) auto no-repeat,radial-gradient(circle at 50% 35%,#FFFFFF,#DCD0FF);border:2px solid #fff;box-shadow:0 4px 12px rgba(84,58,190,.25)}
.m-dexter{--hp:50% 0%;--hz:118%}
.m-luna{--hp:50% 5%;--hz:125%}
.m-aizere{--hp:50% 4%;--hz:125%}
.m-spark{--hp:50% 8%;--hz:120%}
.spr{display:block;background:var(--sp) center/contain no-repeat}

/* ----------------------------------------------------------- top bar --- */
.top{position:sticky;top:0;z-index:40;height:var(--top);display:flex;align-items:center;gap:10px;padding:0 20px;background:rgba(255,255,255,.74);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid rgba(255,255,255,.95);box-shadow:0 4px 20px rgba(84,58,190,.08)}
.brand{display:flex;align-items:center;gap:12px;cursor:pointer;border:0;background:none;padding:4px 0}
.jts-logo{display:block;width:110px;height:auto}
.jts-logo .w{fill:#000}
.jts-logo .t{fill:var(--violet)}
.brand .sep{width:1px;height:22px;background:var(--line-2)}
.brand .desc{font-family:inherit;font-weight:800;font-size:17px;color:var(--ink);letter-spacing:-.01em;white-space:nowrap}
.brand .desc b{color:var(--violet);font-weight:inherit}
.top .sp{flex:1}
.pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 11px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(84,58,190,.12);font-weight:800;font-size:13px;color:var(--ink);white-space:nowrap}
.pill svg{width:15px;height:15px}
.pill.star svg{color:var(--amber)}
.pill.fire svg{color:var(--orange)}
.lang{display:flex;gap:2px;padding:3px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(84,58,190,.12)}
.lang button{border:0;background:none;cursor:pointer;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:800;color:var(--mut);letter-spacing:.03em}
.lang button.on{background:var(--violet);color:#fff}
.iconbtn{width:36px;height:36px;flex:none;border-radius:11px;border:0;background:#fff;box-shadow:0 1px 4px rgba(84,58,190,.16);cursor:pointer;display:grid;place-items:center;transition:.15s;color:var(--ink)}
.iconbtn:hover{color:var(--violet-dk);transform:translateY(-1px)}
.iconbtn svg{width:17px;height:17px}

.wrap{max-width:1120px;margin:0 auto;padding:18px 20px 70px}
.view{display:none}
.view.on{display:block;animation:viewIn .4s cubic-bezier(.2,.7,.3,1) backwards}
@keyframes viewIn{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}

/* ---------------------------------------------------------- buttons --- */
.cta{border:0;cursor:pointer;border-radius:999px;padding:11px 20px;font-weight:700;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;color:#fff;background:linear-gradient(180deg,#8550F5,#6A2FE3);transition:.16s;box-shadow:0 8px 20px rgba(122,63,224,.35),inset 0 1px 0 rgba(255,255,255,.3)}
.cta:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(122,63,224,.45),inset 0 1px 0 rgba(255,255,255,.3)}
.cta:disabled{opacity:.4;cursor:default}
.cta svg{width:17px;height:17px}
.cta.cy{background:linear-gradient(180deg,#0E86C7,#00639E);box-shadow:0 8px 20px rgba(0,121,191,.32),inset 0 1px 0 rgba(255,255,255,.3)}
.cta.big{padding:13px 24px;font-size:16px}
.cta.sm{padding:8px 15px;font-size:13.5px;box-shadow:0 4px 12px rgba(122,63,224,.28)}
.cta.sm svg{width:15px;height:15px}
.ghost{border:0;background:#fff;cursor:pointer;border-radius:999px;padding:10px 18px;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;color:var(--violet-dk);box-shadow:0 2px 8px rgba(84,58,190,.14);transition:.15s}
.ghost:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(84,58,190,.2)}
.ghost svg{width:16px;height:16px}
.ghost.sm{padding:7px 13px;font-size:13px}
.ghost.sm svg{width:15px;height:15px}

/* chat bubble: the brand's speech-bubble motif */
.cb{display:inline-flex;align-items:center;position:relative;padding:9px 14px;border-radius:16px;font-weight:600;font-size:14px;color:var(--ink);background:#fff;line-height:1.3;box-shadow:0 6px 18px rgba(84,58,190,.18)}
.cb::after{content:"";position:absolute;bottom:-6px;width:14px;height:10px;background:inherit;clip-path:polygon(0 0,100% 0,0 100%)}
.cb.l::after{left:16px}
.cb.gr{background:var(--green);color:#fff}

/* ------------------------------------------------------------- lobby --- */
/* the hero shows the whole painting: the box has the image's own ratio */
.hero{position:relative;border-radius:var(--r-xl);overflow:hidden;aspect-ratio:1680/712;box-shadow:var(--sh-lg);border:3px solid rgba(255,255,255,.85)}
.hero-art{position:absolute;inset:0;background:var(--hero) center/cover no-repeat}
.hero::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(44,26,128,.62) 0%,rgba(44,26,128,.34) 34%,rgba(44,26,128,0) 56%);pointer-events:none}
.hero-in{position:absolute;z-index:2;left:0;top:0;bottom:0;width:50%;padding:28px 34px;display:flex;flex-direction:column;justify-content:center;color:#fff}
.hero .eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.88)}
.hero h1{font-size:clamp(36px,5vw,54px);line-height:1;margin:8px 0 0;letter-spacing:-.03em;font-weight:800;color:#fff;text-shadow:0 4px 22px rgba(30,15,100,.45)}
.hero h1 b{color:var(--gold-lt);font-weight:inherit}
.hero p{font-size:16px;color:#fff;margin:10px 0 0;max-width:34ch;text-shadow:0 2px 10px rgba(30,15,100,.45)}
.hero-acts{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px}
.hero .nextl{font-size:13px;color:#fff;font-weight:700;padding:5px 11px;border-radius:999px;background:rgba(44,26,128,.35);backdrop-filter:blur(4px)}

.sec{margin:30px 0 0}
.sec-h{display:flex;align-items:baseline;gap:12px;margin:0 0 12px;flex-wrap:wrap}
.sec-h h2{font-size:22px}
.sec-h p{margin:0;color:var(--mut);font-size:14px}


/* worlds: each card shows its painted sky whole */
.levels{display:flex;flex-wrap:wrap;gap:14px}
.lvl{flex:1 1 300px;position:relative;overflow:hidden;text-align:left;cursor:pointer;background:var(--glass-hi);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,.95);border-radius:var(--r-xl);padding:0 0 12px;display:flex;flex-direction:column;transition:.22s;box-shadow:var(--sh);color:var(--ink)}
.lvl:hover{transform:translateY(-4px);box-shadow:var(--sh-lg),0 0 0 3px var(--zc)}
.lvl .art{position:relative;display:block;aspect-ratio:1400/594;background:var(--zimg) center/cover no-repeat;border-radius:24px 24px 0 0}
.lvl .code{position:absolute;top:10px;right:10px;font-family:inherit;font-weight:800;font-size:14px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--zd)}
.lvl .info{display:flex;align-items:center;gap:10px;padding:10px 14px 0}
.lvl .info .spr{width:40px;height:40px;flex:none;margin-top:-30px;filter:drop-shadow(0 4px 8px rgba(70,40,170,.3))}
.lvl .nm{flex:1;min-width:0;font-size:12.5px;color:var(--mut);font-weight:600;line-height:1.3}
.lvl .nm b{display:block;font-family:inherit;font-size:19px;color:var(--ink);font-weight:800}
.lvl .pct{font-family:inherit;font-weight:800;font-size:15px;color:var(--zd)}
.lvl .meta{font-size:12px;color:var(--mut);font-weight:600;margin:6px 14px 0}

/* stations */
.cats{display:flex;flex-wrap:wrap;gap:6px 16px;margin:-4px 0 10px}
.cat-h{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--ink-2)}
.cat-h i{width:10px;height:10px;border-radius:50%;background:var(--zc);box-shadow:0 0 8px var(--zc)}
.fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.fld{position:relative;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;background:var(--glass);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(255,255,255,.95);border-left:4px solid var(--zc);border-radius:var(--r);padding:9px 10px;transition:.15s;color:var(--ink);box-shadow:0 2px 8px rgba(84,58,190,.08)}
.fld:hover{transform:translateY(-2px);box-shadow:var(--sh)}
.fld .fi{width:32px;height:32px;flex:none;border-radius:10px;display:grid;place-items:center;font-size:17px;background:#fff;box-shadow:0 1px 3px rgba(84,58,190,.12)}
.fld>span:nth-child(2){min-width:0;flex:1}
.fld b{display:block;font-weight:700;font-size:13.5px;line-height:1.3;overflow-wrap:anywhere;hyphens:auto}
.fld small{display:block;font-size:11.5px;color:var(--mut);font-weight:600}
.ring2{width:22px;height:22px;flex:none;border-radius:50%;background:conic-gradient(var(--zd) calc(var(--p) * 1%),var(--line) 0);-webkit-mask:radial-gradient(circle,transparent 6px,#000 7px);mask:radial-gradient(circle,transparent 6px,#000 7px)}

.comet{display:flex;align-items:center;gap:14px;padding:10px 16px 10px 10px;border-radius:var(--r-lg);margin:14px 0 0;background:linear-gradient(90deg,#FFF6DC,rgba(255,255,255,.8));border:2px solid #FFE08A;box-shadow:var(--sh)}
.comet .mz{width:54px;height:60px;flex:none}
.comet .t{flex:1;min-width:0}
.comet .t b{display:block;font-family:inherit;font-size:16px;color:var(--ink)}
.comet .t span{font-size:13px;color:var(--ink-2)}
.comet .acts{display:flex;gap:8px;flex-wrap:wrap}


/* ----------------------------------------------------- level header --- */
@keyframes float{50%{transform:translateY(-8px)}}
.legend{display:flex;gap:8px 16px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--ink-2);margin:14px 4px 0;font-weight:600}
.legend .lg{display:inline-flex;align-items:center;gap:6px}
.legend .lg>i{width:14px;height:14px;border-radius:50%}
.lg-d{background:radial-gradient(circle,#fff 30%,var(--gold));box-shadow:0 0 0 2px var(--gold),0 0 8px var(--gold)}
.lg-n{background:#fff;box-shadow:0 0 0 3px var(--zc),0 0 10px var(--zc)}
.lg-u{background:#E6E2F0;box-shadow:0 0 0 1px var(--line-2)}

/* ------------------------------------------------------ the journey --- */
.jpath{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1}
.j-base{fill:none;stroke:rgba(255,255,255,.85);stroke-width:14;stroke-linecap:round;filter:drop-shadow(0 0 10px rgba(150,120,255,.45))}
.j-dust{fill:none;stroke:var(--violet-sky);stroke-width:4;stroke-dasharray:1 12;stroke-linecap:round;animation:dust 2.6s linear infinite}
@keyframes dust{to{stroke-dashoffset:-26}}
.j-lit{fill:none;stroke-width:7;stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,201,61,.95))}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.35}}
.marks{display:flex;gap:2px;align-items:center;height:11px}
.marks .s{width:11px;height:11px;color:#D6D0E8}
.marks .s.on{color:var(--amber)}
.marks .h{width:6px;height:6px;border-radius:1.5px;transform:rotate(45deg);background:#D6D0E8;margin-left:3px}
.marks .h.on{background:var(--cyan-dk)}
.marks .sp{width:3px}

/* ------------------------------------------------------ lesson sheet --- */
.scrim{position:fixed;inset:0;z-index:60;background:rgba(60,40,140,.28);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade .2s both}
@keyframes fade{from{opacity:0}to{opacity:1}}
.sheet{position:relative;width:min(560px,100%);max-height:calc(100vh - 40px);overflow-y:auto;border-radius:var(--r-xl);background:#fff;color:var(--ink);box-shadow:0 30px 80px rgba(60,40,140,.35);padding:20px;animation:sheetIn .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes sheetIn{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:none}}
.sheet-m{position:absolute;right:58px;top:6px;width:62px;height:70px;pointer-events:none}
.sheet-h{display:flex;align-items:center;gap:13px;padding-right:56px}
.sheet-h>div{min-width:0}
.sheet-h .orb{position:relative;width:56px;height:56px;flex:none;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,#F3EEFF,#fff 70%)}
.sheet-h .orb .spr{width:46px;height:46px;filter:drop-shadow(0 4px 8px rgba(70,40,170,.28))}
.sheet-h .orb .num{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);min-width:24px;height:20px;padding:0 6px;border-radius:10px;background:var(--zd);color:#fff;font-weight:800;font-size:11.5px;line-height:20px;font-family:inherit}
.sheet-h small{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--zd)}
.sheet-h h3{font-size:19px;line-height:1.2}
.sheet-h p{margin:2px 0 0;font-size:13px;color:var(--grey)}
.sheet-h .iconbtn{position:absolute;top:16px;right:16px;background:var(--canvas);box-shadow:none}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:var(--canvas);margin-top:16px}
.tab{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;background:none;cursor:pointer;border-radius:11px;padding:9px 10px;font-weight:700;font-size:14px;color:var(--grey)}
.tab svg{width:18px;height:18px}
.tab.on{background:#fff;color:var(--violet-dk);box-shadow:0 1px 4px rgba(84,58,190,.16)}
.tab.ws.on{color:var(--cyan-dk)}
.tab:disabled{opacity:.45;cursor:not-allowed}
.game{margin-top:12px}
.game .gd{margin:0 2px 10px;font-size:13px;color:var(--grey)}
.chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.chip{border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:9px 11px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:1px;min-width:0;transition:.15s;color:var(--ink)}
.chip b{font-size:14px;font-family:inherit;color:var(--ink);line-height:1.25}
.chip>span:last-child{font-size:11.5px;color:var(--grey);line-height:1.35}
.chip .st{display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--violet-dk)}
.game.hunt .chip .st{color:#00639E}
.chip .st svg{width:12px;height:12px;flex:none}
.chip .ok{display:inline-flex;margin-left:auto;color:var(--amber)}
.game.hunt .chip .ok{color:var(--green-dk)}
.chip:hover:not(:disabled){border-color:var(--violet-sky)}
.chip.on{border-color:var(--violet);background:var(--violet-lt)}
.game.hunt .chip:hover:not(:disabled){border-color:var(--cyan)}
.game.hunt .chip.on{border-color:var(--cyan-dk);background:var(--cyan-lt)}
.chip:disabled{opacity:.45;cursor:not-allowed}
.game .row{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:14px;flex-wrap:wrap}
.game .row small{font-size:12px;color:var(--grey);font-weight:600;margin-right:auto;line-height:1.45}
.tog{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px 5px 6px;cursor:pointer;font-size:13px;font-weight:600;color:var(--ink)}
.tog i{width:30px;height:18px;border-radius:99px;background:var(--line-2);position:relative;transition:.2s;flex:none}
.tog i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.2s}
.tog.on i{background:var(--cyan-dk)}
.tog.on i::after{left:14px}

/* --------------------------------------------------------- game HUD --- */
.hud{position:relative;z-index:30;display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:8px 12px 8px 8px;border-radius:var(--r-lg);background:var(--glass-hi);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid #fff;box-shadow:var(--sh)}
.hud .t{flex:1;min-width:0}
.hud .t small{display:block;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--violet-dk)}
.hud.cy .t small{color:var(--cyan-dk)}
.hud .t b{display:block;font-family:inherit;font-size:18px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hud .prog{display:flex;align-items:center;gap:10px}
.ring{position:relative;width:44px;height:44px}
.ring svg{transform:rotate(-90deg)}
.ring span{position:absolute;inset:0;display:grid;place-items:center;font-family:inherit;font-weight:800;font-size:12px;color:var(--ink)}
.timer{font-family:inherit;font-weight:800;font-size:17px;font-variant-numeric:tabular-nums;padding:6px 11px;border-radius:11px;background:#fff;color:var(--ink);box-shadow:0 1px 4px rgba(84,58,190,.14);min-width:66px;text-align:center}
.timer.low{color:#C2410C;box-shadow:0 0 0 2px var(--orange);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:.55}}

/* the guide in the HUD, and what it says */
.buddy{position:relative;flex:none}
.buddy .av{width:48px;height:48px}
.buddy.hop .av{animation:hop .55s cubic-bezier(.3,1.6,.5,1)}
@keyframes hop{30%{transform:translateY(-9px) rotate(-6deg)}60%{transform:translateY(0) rotate(4deg)}}
.buddy .bub{position:absolute;left:calc(100% + 10px);top:50%;margin-top:-22px;z-index:50;width:max-content;max-width:min(320px,calc(100vw - 40px));padding:9px 13px;border-radius:14px;background:#fff;color:var(--ink);font-size:14px;font-weight:600;line-height:1.35;box-shadow:0 10px 28px rgba(84,58,190,.28);opacity:0;transform:translateX(-6px) scale(.96);transform-origin:0 20px;pointer-events:none;transition:.2s}
.buddy .bub::before{content:"";position:absolute;left:-7px;top:15px;width:9px;height:13px;background:inherit;clip-path:polygon(100% 0,0 50%,100% 100%)}
.buddy .bub.show{opacity:1;transform:none;pointer-events:auto}
.buddy .bub b{font-family:inherit;font-size:16px;color:var(--ink)}
.buddy .bub .tr{color:var(--grey);font-weight:500}
.buddy .bub .plus{color:var(--amber-dk);font-weight:800;white-space:nowrap}
.buddy .bub.ask{box-shadow:0 0 0 2.5px var(--gold),0 10px 28px rgba(84,58,190,.28)}
.bub-acts{display:flex;gap:6px;align-items:center;margin-top:7px}
.bub-b{border:0;cursor:pointer;border-radius:999px;padding:6px 14px;font-weight:700;font-size:13px;background:var(--violet);color:#fff}
.hud.cy .bub-b{background:var(--cyan-dk)}
.bub-x{border:0;cursor:pointer;width:28px;height:28px;border-radius:50%;background:var(--canvas);color:var(--grey);font-size:18px;line-height:1}

/* letters drifting around a board: decoration only */
.floaters{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible}
.floaters i{position:absolute;font-style:normal;font-family:inherit;font-weight:800;font-size:30px;width:44px;height:44px;display:grid;place-items:center;border-radius:12px;color:rgba(122,63,224,.35);background:rgba(255,255,255,.45);box-shadow:0 0 18px rgba(255,255,255,.8);transform:rotate(var(--r));animation:bob var(--d) ease-in-out infinite}
@keyframes bob{50%{transform:rotate(calc(var(--r) * -1)) translateY(-10px)}}

/* ------------------------------------------------------- crossword --- */
.xp{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start;position:relative}
.xp-main{min-width:0;display:flex;flex-direction:column;gap:10px}
.clue{position:relative;display:flex;align-items:center;gap:8px;padding:12px 10px;border-radius:20px;min-height:68px;background:#fff;color:var(--ink);margin-bottom:6px;box-shadow:var(--sh);border:2px solid transparent}
.clue::after{content:"";position:absolute;left:28px;bottom:-9px;width:18px;height:11px;background:inherit;clip-path:polygon(0 0,100% 0,0 100%)}
.clue.ok{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,201,61,.25),var(--sh)}
.clue .nav{width:34px;height:34px;flex:none;border-radius:11px;border:0;cursor:pointer;background:var(--canvas);color:var(--ink);display:grid;place-items:center}
.clue .nav:hover{background:var(--violet-lt);color:var(--violet-dk)}
.clue .nav svg{width:16px;height:16px}
.clue .bd{flex:1;min-width:0}
.clue .lab{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--violet-dk)}
.clue.ok .lab{color:var(--amber-dk)}
.clue .tx{font-family:inherit;font-weight:500;font-size:18px;line-height:1.4;margin-top:1px;color:#000}
.clue .msg{font-size:13px;margin-top:5px;font-weight:700;color:var(--green-dk)}
.clue .msg.bad{color:#B8420E}
.clue .cpic{float:left;width:52px;height:70px;margin:0 12px 0 0}
.enum{font-family:inherit;font-size:.8em;color:var(--grey);font-weight:600;white-space:nowrap}
.gap{display:inline-block;min-width:44px;height:1em;border-bottom:2px solid var(--violet);transform:translateY(-3px);margin:0 2px}
.form{display:block;font-family:inherit;font-size:12.5px;color:var(--grey);font-weight:500}
.hint2{display:block;margin-top:7px;padding:7px 10px;border-radius:10px;background:var(--amber-lt);font-family:inherit;font-size:13.5px;font-weight:500;color:var(--ink);line-height:1.45}
.hint2 b{color:var(--amber-dk)}
.ref{display:inline-block;font-family:inherit;font-weight:700;font-size:.8em;padding:0 6px;border-radius:6px;background:var(--cyan-lt);color:#00639E;line-height:1.55;vertical-align:1px}
.refw{color:var(--green-dk);font-weight:700}

/* the grid floats in the zone's sky on a soft halo of light */
.board-w{position:relative;padding:26px 18px;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--r-xl);background:radial-gradient(ellipse 70% 62% at 50% 50%,rgba(255,255,255,.9),rgba(255,255,255,.55) 55%,rgba(255,255,255,0) 78%)}
.board{position:relative;z-index:1;display:grid;margin:0 auto;width:max-content;grid-template-columns:repeat(var(--w),var(--cs));grid-auto-rows:var(--cs)}
.tl{position:relative;border-radius:24%;user-select:none;-webkit-user-select:none}
.tl.L{background:linear-gradient(180deg,#FFFFFF,#F0EBFF);border:1.5px solid #D8CDFB;box-shadow:0 3px 0 #C8B8FA,0 6px 14px rgba(84,58,190,.12);cursor:pointer;transition:background .15s,border-color .15s,box-shadow .2s}
.tl .n{position:absolute;top:1px;left:3px;font-size:calc(var(--cs) * .26);font-weight:800;color:#5C5294;line-height:1.1;pointer-events:none}
.tl .v{position:absolute;inset:0;display:grid;place-items:center;font-family:inherit;font-weight:800;font-size:calc(var(--cs) * .54);padding-top:calc(var(--cs) * .06);color:var(--ink);pointer-events:none}
.tl.f{background:linear-gradient(180deg,#FFFFFF,#E9E0FF)}
.tl.hl{background:linear-gradient(180deg,#F1EAFF,#DCCBFF);border-color:#B99BFA;box-shadow:0 3px 0 #A988F5,0 0 12px rgba(135,75,248,.25)}
.tl.cur{background:linear-gradient(180deg,#A273FF,#7A3FE0);border-color:#7A3FE0;box-shadow:0 3px 0 #5521C9,0 0 0 3px rgba(180,140,255,.45),0 0 20px rgba(135,75,248,.55)}
.tl.cur .v,.tl.cur .n{color:#fff}
.tl.ok{background:linear-gradient(180deg,#FFF8D6,#FFE38A);border-color:#F2C230;box-shadow:0 3px 0 #E0AE14,0 0 14px rgba(255,201,61,.55)}
.tl.ok .v{color:#5E4100}
.tl.ok .n{color:#9A7A1A}
.tl.ok.cur{background:linear-gradient(180deg,#FFD84D,#FFAD00);border-color:#FFAD00}
.tl.ok.cur .v{color:#3E2B00}
.tl.bad{background:linear-gradient(180deg,#FFF0E8,#FFD6C4);border-color:var(--orange);box-shadow:0 3px 0 #E45A1C}
.tl.bad .v{color:#B8420E}
.tl.rv::after{content:"";position:absolute;top:3px;right:3px;width:6px;height:6px;border-radius:50%;background:var(--cyan)}
.tl.pop{animation:pop .45s cubic-bezier(.2,.8,.2,1.4)}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}
.tl.sweep{animation:sweep .75s cubic-bezier(.2,.8,.3,1.2) calc(var(--i) * 70ms) both}
@keyframes sweep{0%{transform:none}35%{transform:scale(1.2) translateY(-3px);box-shadow:0 0 0 4px rgba(255,226,122,.75),0 0 30px #FFE27A}100%{transform:none}}
.key{position:absolute;width:24px;height:24px;opacity:0;border:0;padding:0;margin:0;font-size:16px;background:transparent;color:transparent;caret-color:transparent;pointer-events:none;z-index:1}
.dock{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.dock .sp{flex:1}
.tool{display:inline-flex;align-items:center;gap:6px;border:0;background:#fff;border-radius:999px;padding:8px 13px;cursor:pointer;font-weight:700;font-size:13px;color:var(--ink-2);transition:.15s;box-shadow:0 2px 8px rgba(84,58,190,.14)}
.tool:hover{color:var(--violet-dk);transform:translateY(-1px)}
.tool:disabled{opacity:.45;cursor:default}
.tool svg{width:16px;height:16px;color:var(--violet)}
.hp .tool svg{color:var(--cyan-dk)}
.keys{font-size:11.5px;color:var(--mut);margin:0}
@media (hover:none){.keys{display:none}}
.clues,.wlist{position:relative;z-index:1;border-radius:var(--r-xl);background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--ink);box-shadow:var(--sh);border:1.5px solid #fff;max-height:calc(100vh - var(--top) - 190px);overflow-y:auto}
.clues{padding:4px 0}
.clues h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--grey);padding:12px 16px 4px;font-family:inherit;font-weight:800}
.clues ol{list-style:none;margin:0;padding:0}
.cl{display:grid;grid-template-columns:26px 1fr;gap:2px 6px;padding:8px 14px 8px 12px;border-left:3px solid transparent;cursor:pointer;font-size:13.5px;line-height:1.45;color:var(--ink)}
.cl:hover{background:var(--canvas)}
.cl .no{font-family:inherit;font-weight:800;color:var(--violet-dk)}
.cl.on{background:var(--violet-lt);border-left-color:var(--violet)}
.cl.x{background:var(--canvas)}
.cl.ok .no{color:var(--amber-dk)}
.cl.ok .ct{color:var(--grey)}
.cl .ans{grid-column:2;display:flex;align-items:center;gap:6px;margin-top:3px;font-family:inherit;font-weight:800;color:var(--amber-dk)}
.cl .ans em{font-style:normal;font-family:inherit;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--grey)}
.cl .cpic{float:left;width:44px;height:58px;margin:2px 10px 4px 0;border-radius:9px}
.cl .ct::after{content:"";display:block;clear:both}
.strip{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:8px 12px;margin-top:8px}
.strip .wd{display:inline-flex;gap:3px;align-items:center}
.strip .tl{width:var(--ss);height:var(--ss);--cs:var(--ss);flex:none}
.strip .fx{font-family:inherit;font-weight:700;color:var(--grey);font-size:calc(var(--ss) * .6)}
.strip .fx.p{font-family:inherit;font-weight:600;font-size:13px}
.clues .strip{--ss:28px}
.snd{width:26px;height:26px;flex:none;border-radius:8px;border:0;cursor:pointer;display:inline-grid;place-items:center;background:var(--violet-lt);color:var(--violet-dk)}
.snd:hover{background:var(--violet);color:#fff}
.snd svg{width:13px;height:13px}

/* clue kinds */
.ktag{display:inline-block;font-family:inherit;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:6px;margin-right:7px;vertical-align:2px;background:var(--canvas);color:var(--ink)}
.ktag.k-tr{background:var(--amber-lt);color:var(--amber-dk)}
.ktag.k-def{background:var(--violet-lt);color:var(--violet-dk)}
.ktag.k-ctx{background:var(--cyan-lt);color:#00639E}
.ktag.k-col{background:var(--green-lt);color:var(--green-dk)}
.supl{display:block;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--amber-dk);margin-top:3px}
.cpic{display:block;width:72px;height:96px;object-fit:cover;border-radius:12px;margin:2px 0 6px}

/* ---------------------------------------------------- word search --- */
.hp{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}
.hboard-w{position:relative;border-radius:var(--r-xl);padding:16px;background:rgba(255,255,255,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,.95);box-shadow:var(--sh-lg),0 0 40px rgba(10,199,255,.15);display:flex;justify-content:center}
.hboard{position:relative;z-index:1;display:grid;grid-template-columns:repeat(var(--n),var(--hs));grid-auto-rows:var(--hs);gap:var(--hg);touch-action:none;user-select:none;-webkit-user-select:none;cursor:crosshair}
.hc{position:relative;display:grid;place-items:center;font-family:inherit;font-weight:800;font-size:calc(var(--hs) * .5);border-radius:28%;color:var(--ink);background:rgba(255,255,255,.92);box-shadow:0 2px 0 #DCD3F7;transition:color .15s,background .15s,transform .15s,box-shadow .15s;z-index:1}
.hc.sel{color:#fff;background:linear-gradient(180deg,#3FD4FF,#0A9BE6);transform:scale(1.08);box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 16px rgba(10,199,255,.85)}
.hc.fd{background:rgba(255,255,255,.4);box-shadow:none}
.hc.lit{animation:litup .7s ease-out calc(var(--i) * 50ms) both}
@keyframes litup{0%{transform:none}40%{transform:scale(1.22);color:#fff;text-shadow:0 0 10px #fff;box-shadow:0 0 22px #FFE27A}100%{transform:none}}
.hc.kb{box-shadow:0 0 0 2.5px var(--cyan-dk) inset}
.hc.anc{box-shadow:0 0 0 2.5px var(--amber) inset,0 0 12px rgba(255,173,0,.5);background:var(--amber-lt)}
.hc.miss{color:#B8420E}
.hboard svg.caps{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:2;mix-blend-mode:multiply}
.hboard svg.caps line{stroke-linecap:round;opacity:.42}
.hboard svg.caps line.live{opacity:0}
.hboard svg.caps line.new{animation:capIn .45s cubic-bezier(.2,.8,.2,1.2) both}
@keyframes capIn{from{opacity:0;stroke-width:0}}
.hboard svg.caps line.miss{opacity:.3;stroke-dasharray:2 10}
.wlist{padding:14px}
.wlist h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--grey);font-family:inherit;font-weight:800;margin:0 0 8px;display:flex;justify-content:space-between}
.words.cards{display:flex;flex-direction:column;gap:6px}
.wc{display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border-radius:13px;background:var(--canvas);border:1.5px solid transparent;transition:.3s;font-size:13.5px;line-height:1.45}
.wc .cpic{width:44px;height:58px;margin:0;border-radius:9px;flex:none}
.wc .wb{flex:1;min-width:0;color:var(--ink)}
.wc .ans{display:flex;align-items:center;gap:7px;margin-top:5px;font-family:inherit}
.wc .ans b{color:#000;font-size:15px}
.wc .ans small{color:var(--grey);font-family:inherit;font-weight:600;font-size:12px}
.wc.fd{background:#fff;border-color:var(--wc);box-shadow:0 0 12px color-mix(in srgb,var(--wc) 35%,transparent)}
.wc.fd .wb{color:var(--grey)}
.wc.miss{background:var(--orange-lt)}
.wc.flash{animation:pop .5s cubic-bezier(.2,.8,.2,1.4)}
.peeks{display:flex;gap:6px;margin-top:6px}
.peek{border:1px solid var(--line-2);background:#fff;border-radius:999px;padding:5px 12px;min-height:28px;font-size:11.5px;font-weight:600;color:var(--grey);cursor:pointer}
.peek:hover{color:var(--cyan-dk);border-color:var(--cyan-dk)}
.wlist .note{font-size:12px;color:var(--grey);margin:10px 0 0;line-height:1.5}

/* ---------------------------------------------------------- result --- */
.res{max-width:700px;margin:0 auto;text-align:center}
.res-top{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:4px;margin-top:4px}
.res-top::before{content:"";position:absolute;left:50%;top:50%;width:min(420px,100vw);height:300px;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(255,255,255,.95),rgba(255,255,255,0) 65%);z-index:-1}
.res-top .mz{width:124px;height:140px}
.res-top .mz.cele{animation:cele 1.1s cubic-bezier(.3,1.5,.5,1) .2s 2 both}
@keyframes cele{0%,100%{transform:none}25%{transform:translateY(-22px) rotate(-8deg)}50%{transform:translateY(0) rotate(0)}70%{transform:translateY(-10px) rotate(6deg)}}
.res .big{position:relative;width:170px;height:162px;color:var(--violet);margin-bottom:46px;filter:drop-shadow(0 10px 24px rgba(122,63,224,.4))}
.res.ws .big{color:var(--cyan-dk);filter:drop-shadow(0 10px 24px rgba(0,121,191,.4))}
.res.to .big{color:#C24A12;filter:drop-shadow(0 10px 24px rgba(194,74,18,.35))}
.res .big svg{position:absolute;inset:0;width:100%;height:100%}
.res .big .num{position:absolute;left:0;right:0;top:38px;font-family:inherit;font-weight:800;font-size:48px;line-height:1;color:#fff}
.res .big .lbl{position:absolute;left:0;right:0;top:92px;font-size:13px;font-weight:700;color:#fff}
.res h1{font-size:30px;margin-top:6px}
.res .sub{color:var(--ink-2);margin:4px 0 0;font-size:14px}
.gain{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0}
.gain>span{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;background:#fff;box-shadow:0 2px 8px rgba(84,58,190,.12);font-size:13px;font-weight:600;color:var(--ink-2)}
.gain span b{font-family:inherit;color:var(--ink)}
.gain .steps{gap:3px}
.gain .steps svg{width:20px;height:20px;color:#D6D0E8}
.gain .steps svg.on{color:var(--amber);filter:drop-shadow(0 0 4px rgba(255,173,0,.6))}
.gain .steps .h{width:12px;height:12px;border-radius:3px;transform:rotate(45deg);background:#D6D0E8;margin:4px}
.gain .steps .h.on{background:var(--cyan-dk);box-shadow:0 0 6px rgba(10,199,255,.6)}
.unlock{display:flex;justify-content:center;margin:0 0 14px}
.res .acts{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 20px}
.lists{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;text-align:left}
.reslist{border-radius:var(--r-lg);background:rgba(255,255,255,.92);color:var(--ink);padding:10px 14px;box-shadow:var(--sh)}
.reslist h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--grey);font-family:inherit;font-weight:800;margin:2px 0 4px}
.reslist.cm{background:#FFF8E6;box-shadow:var(--sh),inset 0 0 0 1.5px var(--amber)}
.reslist.cm h4{color:var(--amber-dk)}
.rw{display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid var(--line)}
.reslist.cm .rw{border-top-color:rgba(181,122,0,.18)}
.rw:first-of-type{border-top:0}
.rw b{font-family:inherit;font-size:14.5px;color:#000}
.rw span{margin-left:auto;color:var(--grey);font-size:13px;text-align:right}
.toast{position:fixed;right:18px;top:calc(var(--top) + 12px);z-index:80;display:flex;align-items:center;gap:12px;padding:10px 16px 10px 10px;border-radius:18px;background:#fff;color:var(--ink);box-shadow:var(--sh-lg),0 0 0 2px var(--gold);animation:achIn .4s cubic-bezier(.2,.8,.2,1.2) both;max-width:calc(100vw - 36px)}
.toast .bd{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg,#FFE27A,#FFAD00);color:#fff}
.toast .bd svg{width:19px;height:19px}
.toast small{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amber-dk)}
.toast b{font-family:inherit;font-size:15px;color:#000}
@keyframes achIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* --------------------------------------------------------- tablet --- */
@media (max-width:1000px){
  .fields{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:960px){
  .xp,.hp{grid-template-columns:minmax(0,1fr)}
  .side{position:static}
  .clues,.wlist{max-height:none;overflow:visible}
  .buddy.big{display:none}
  .clue{position:sticky;top:calc(var(--top) + 8px);z-index:20}
}
/* hero and level header stack below 760: the painting stays whole on top */
@media (max-width:760px){
  .hero{aspect-ratio:auto;background:rgba(255,255,255,.88)}
  .hero-art{position:relative;display:block;aspect-ratio:1680/712}
  .hero::before{display:none}
  .hero-in{position:relative;width:auto;padding:16px 18px 18px;color:var(--ink)}
  .hero .eyebrow{color:var(--violet-dk)}
  .hero h1{color:var(--ink);text-shadow:none;font-size:34px}
  .hero h1 b{color:var(--violet)}
  .hero p{color:var(--ink-2);text-shadow:none;font-size:14.5px}
  .hero .nextl{color:var(--ink-2);background:var(--canvas)}
}
/* --------------------------------------------------------- mobile --- */
@media (max-width:700px){
  :host{--top:54px}
  .top{padding:0 12px;gap:8px}
  .jts-logo{width:86px}
  .brand{gap:9px}
  .brand .desc{font-size:15px}
  .pill.fire{display:none}
  .inner .brand .sep,.inner .brand .desc{display:none}
  .lang button{padding:5px 9px}
  .wrap{padding:12px 12px 60px}
  .sec{margin-top:24px}
  .sec-h h2{font-size:20px}
  .levels{gap:10px}
  .lvl{flex-basis:100%}
  .comet{flex-wrap:wrap}
  .comet .acts{width:100%}
  .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .fld{padding:8px;gap:8px}
  .fld .fi{width:28px;height:28px;font-size:15px}
  .fld b{font-size:12px;overflow-wrap:normal}
  .fld .ring2{display:none}
  .legend{gap:6px 12px;font-size:11.5px}
  .chips{grid-template-columns:1fr}
  .chip{padding:7px 11px}
  .sheet{padding:16px;border-radius:24px 24px 16px 16px}
  .sheet-m{width:50px;height:56px;right:52px}
  .scrim{align-items:flex-end;padding:8px}
  .board-w{padding:14px 6px;margin:0 -6px}
  .hboard-w{padding:7px;margin:0 -4px;border-radius:var(--r-lg)}
  .floaters{display:none}
  .clue .tx{font-size:15.5px}
  .clue{padding:10px 8px;gap:6px;min-height:60px}
  .clue .nav{width:30px;height:30px}
  .tool{padding:7px 11px;font-size:12.5px}
  .hud{padding:6px 10px 6px 6px;gap:10px;backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.94)}
  .hud .t b{font-size:15.5px}
  .buddy .av{width:42px;height:42px}
  .timer{font-size:15px;min-width:58px;padding:5px 8px}
  .res-top .mz{width:96px;height:110px}
  .res .big{width:140px;height:134px;margin-bottom:38px}
  .res .big .num{top:30px;font-size:40px}
  .res .big .lbl{top:76px;font-size:12px}
  .res h1{font-size:23px}
  .toast{right:10px;left:10px;top:auto;bottom:calc(14px + env(safe-area-inset-bottom))}
  .flyword{font-size:18px}
  /* on a phone the HUD may be scrolled away: the guide speaks from the bottom edge */
  .buddy .bub{position:fixed;left:12px;right:12px;top:auto;bottom:calc(12px + env(safe-area-inset-bottom));margin:0;width:auto;max-width:none;min-height:58px;padding:10px 14px 10px 64px;display:flex;flex-direction:column;justify-content:center;transform:translateY(12px);transform-origin:50% 100%}
  .buddy .bub.show{transform:none}
  .buddy .bub::before{left:10px;top:50%;margin-top:-21px;width:42px;height:42px;border-radius:50%;clip-path:none;background:var(--img) var(--hp)/var(--hz) auto no-repeat,radial-gradient(circle at 50% 35%,#fff,#DCD0FF)}
}
@media (max-width:430px){.top .pill{display:none}}


/* ----------------------------------------------------- level header --- */
.lvl .bar,.zcap .bar{height:7px;border-radius:9px;background:var(--line);overflow:hidden;margin:8px 14px 0}
.zcap .bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--zc),var(--gold-lt));min-width:5px;box-shadow:0 0 8px var(--zc)}
.zhead{position:relative;border-radius:var(--r-xl);overflow:hidden;box-shadow:var(--sh-lg);border:3px solid rgba(255,255,255,.85)}
.zart{aspect-ratio:1400/594;background:var(--zimg) center/cover no-repeat}
.zcap{position:absolute;left:18px;bottom:18px;width:min(430px,calc(100% - 36px));display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-lg);background:rgba(255,255,255,.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:var(--sh)}
.zcap .zmk{width:54px;height:54px;flex:none;display:grid;place-items:center}
.zcap .zmk .spr{width:54px;height:54px;filter:drop-shadow(0 4px 8px rgba(70,40,170,.3))}
.zcap .zmk .fi{font-size:30px}
.zcap .mt{min-width:0;flex:1}
.zcap small{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--zd)}
.zcap h1{font-size:24px;line-height:1.15;margin-top:1px}
.zcap p{margin:2px 0 0;color:var(--mut);font-size:12.5px;font-weight:600}
.zcap .bar{margin:8px 0 0}
.guide{position:absolute;left:44%;bottom:0;display:flex;align-items:flex-end;gap:4px}
.guide .cb{margin-bottom:126px;max-width:220px;font-size:13.5px}
.guide .cb::after{left:auto;right:-8px;bottom:12px;width:12px;height:12px;clip-path:polygon(0 0,100% 50%,0 100%)}
.guide .mz{width:150px;height:170px;animation:float 4s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-8px)}}

/* the bar under the header: every sector + the way to the next lesson */
.mapbar{position:sticky;top:calc(var(--top) + 6px);z-index:30;display:flex;align-items:center;gap:8px;margin-top:12px;padding:6px;border-radius:999px;background:rgba(255,255,255,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1.5px solid #fff;box-shadow:var(--sh)}
.sectabs{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;scroll-behavior:smooth}
.sectabs::-webkit-scrollbar{display:none}
.stab{flex:none;display:flex;align-items:center;gap:7px;max-width:220px;padding:4px 11px 4px 4px;border-radius:999px;border:0;background:transparent;cursor:pointer;color:var(--ink);transition:.15s}
.stab:hover{background:var(--canvas)}
.stab .n{width:28px;height:28px;flex:none;border-radius:50%;display:grid;place-items:center;font-family:inherit;font-weight:800;font-size:13px;background:var(--line);color:var(--ink-2)}
.stab .n svg{width:14px;height:14px}
.stab .tt{font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.stab .cnt{font-size:11px;font-weight:700;color:var(--mut)}
.stab.done .n{background:var(--green);color:#fff}
.stab.here{background:#fff;box-shadow:0 0 0 2px var(--zc)}
.stab.here .n{background:var(--zc);color:var(--ink);box-shadow:0 0 10px var(--zc)}
.gonext{flex:none;white-space:nowrap}
.legend{display:flex;gap:8px 16px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--ink-2);margin:12px 6px 0;font-weight:600}
.legend .lg{display:inline-flex;align-items:center;gap:6px}
.legend .lg>i{width:14px;height:14px;border-radius:50%}
.lg-s{background:#fff;box-shadow:0 0 0 2px var(--zd)}
.legend .marks{margin:0}

/* ------------------------------------------------------ the journey --- */
.journey{position:relative;margin-top:4px;min-height:300px;overflow-x:clip}
.jpath{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1}
.j-base{fill:none;stroke:rgba(255,255,255,.85);stroke-width:14;stroke-linecap:round;filter:drop-shadow(0 0 10px rgba(150,120,255,.45))}
.j-dust{fill:none;stroke:var(--violet-sky);stroke-width:4;stroke-dasharray:1 12;stroke-linecap:round;animation:dust 2.6s linear infinite}
@keyframes dust{to{stroke-dashoffset:-26}}
.j-lit{fill:none;stroke-width:7;stroke-linecap:round;filter:drop-shadow(0 0 6px rgba(255,201,61,.95))}
.sector{position:absolute;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:10px;padding:7px 18px 7px 7px;border-radius:999px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:var(--sh),0 0 0 3px rgba(255,255,255,.6);max-width:calc(100% - 16px);scroll-margin-top:140px}
.sector .n{width:36px;height:36px;flex:none;border-radius:50%;display:grid;place-items:center;font-family:inherit;font-weight:800;font-size:15px;color:#fff;background:var(--zd);box-shadow:0 0 0 3px var(--zc),0 0 12px var(--zc)}
.sector>span:last-child{min-width:0}
.sector small{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--zd);white-space:nowrap}
.sector b{display:block;font-family:inherit;font-size:15.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.deco{position:absolute;z-index:0;background:var(--sp) center/contain no-repeat;animation:float 7s ease-in-out infinite;filter:drop-shadow(0 14px 18px rgba(84,58,190,.2));opacity:.95;pointer-events:none}
.node{position:absolute;z-index:4;width:80px;height:80px;margin:-40px 0 0 -40px;border:0;background:none;padding:0;cursor:pointer;color:var(--ink);border-radius:50%}
.node .orb{position:absolute;left:0;top:0;width:80px;height:80px;border-radius:50%;display:grid;place-items:center;transition:transform .2s}
.node .orb::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95) 0,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 70%)}
.node .orb .spr{position:relative;width:62px;height:62px;filter:drop-shadow(0 6px 10px rgba(70,40,170,.28));transition:filter .2s}
.node.new .orb .spr{filter:grayscale(.4) saturate(.75) brightness(1.06) opacity(.86)}
.node.next .orb .spr{filter:drop-shadow(0 6px 12px rgba(70,40,170,.3))}
.node .num{position:absolute;z-index:2;bottom:0;left:50%;transform:translateX(-50%);min-width:26px;height:21px;padding:0 7px;border-radius:11px;background:#fff;color:var(--ink);font-weight:800;font-size:12px;line-height:21px;font-family:inherit;box-shadow:0 2px 6px rgba(84,58,190,.28)}
.node.any .num{background:var(--zd);color:#fff}
.node.done .orb{background:radial-gradient(circle,rgba(255,236,160,.9),rgba(255,226,122,0) 70%)}
.node.done .orb::after{content:"";position:absolute;inset:2px;border-radius:50%;border:3px solid var(--gold);box-shadow:0 0 18px rgba(255,201,61,.85),inset 0 0 14px rgba(255,201,61,.5)}
.node .ck{position:absolute;z-index:2;top:2px;right:2px;width:24px;height:24px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,120,40,.3)}
.node .ck svg{width:13px;height:13px}
.node.next .orb{transform:scale(1.14)}
.node.next .orb::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--zc);box-shadow:0 0 22px var(--zc);animation:pulse 1.8s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.35}}
.node:hover .orb{transform:scale(1.1)}
.node.next:hover .orb{transform:scale(1.2)}
.node:focus-visible{outline-offset:6px}
.node .lab{position:absolute;top:50%;transform:translateY(-50%);left:86px;width:180px;text-align:left;display:flex;flex-direction:column;gap:3px;padding:7px 11px;border-radius:14px;background:rgba(255,255,255,.9);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(84,58,190,.14);transition:.2s}
.node:not(.lr) .lab{left:auto;right:86px;align-items:flex-end;text-align:right}
.node .lab em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--zd)}
.node .lab b{font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.28;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.node.new .lab b{color:var(--ink-2)}
.node.next .lab{background:#fff;box-shadow:0 0 0 2.5px var(--zc),0 6px 18px rgba(84,58,190,.2)}
.node:hover .lab{background:#fff}
.node .orb{z-index:1}
.node .trav{position:absolute;z-index:0;top:-92px;left:-4px;width:88px;height:100px;pointer-events:none;animation:float 3s ease-in-out infinite}

@media (max-width:1000px){
  .guide{left:auto;right:12px}
  .guide .cb{display:none}
}
@media (max-width:760px){
  .zcap{position:relative;left:auto;bottom:auto;width:auto;border-radius:0;box-shadow:none;background:rgba(255,255,255,.94)}
  .guide{top:8px;bottom:auto;right:8px;left:auto}
  .guide .mz{width:96px;height:108px}
}
@media (max-width:700px){
  .zcap{padding:12px}
  .zcap h1{font-size:20px}
  .zcap .zmk,.zcap .zmk .spr{width:44px;height:44px}
  .guide .mz{width:84px;height:94px}
  .mapbar{border-radius:18px;padding:5px;gap:6px}
  .stab .tt{max-width:110px}
  .stab .cnt{display:none}
  .gonext{padding:7px 12px}
  .legend{gap:6px 12px;font-size:11.5px}
  .sector{padding:6px 14px 6px 6px}
  .sector .n{width:30px;height:30px;font-size:13px}
  .sector b{font-size:14px}
  .node{width:68px;height:68px;margin:-34px 0 0 -34px}
  .node .orb{width:68px;height:68px}
  .node .orb .spr{width:52px;height:52px}
  .node .lab{width:144px;left:72px;padding:6px 9px}
  .node:not(.lr) .lab{right:72px}
  .node .lab b{font-size:12px}
  .node .trav{width:64px;height:72px;top:-66px;left:2px}
}

/* ------------------------------------- the guide beside the game lists --- */
.side{position:sticky;top:calc(var(--top) + 8px);z-index:5;display:flex;flex-direction:column;min-width:0}
.buddy.big{position:relative;z-index:2;display:flex;align-items:flex-end;height:150px;margin:-6px 0 -16px 6px}
.buddy.big .mz{width:132px;height:150px;flex:none}
.buddy.big.hop .mz{animation:hop .6s cubic-bezier(.3,1.6,.5,1)}
.buddy.big .bub{left:138px;top:auto;bottom:34px;margin-top:0;max-width:186px}
.hud .buddy{display:none}

/* --------------------------------------- flying letters and their trails --- */
.fl{position:absolute;left:0;top:0;font-family:inherit;font-weight:800;font-size:calc(30px * var(--z));line-height:1;color:#fff;text-shadow:0 0 8px var(--zc),0 0 20px var(--zc);opacity:.8;animation:flyx var(--t) linear var(--dl) infinite;will-change:transform}
.fl::before{content:"";position:absolute;right:calc(100% + 4px);top:50%;width:calc(80px * var(--z));height:3px;margin-top:-1.5px;border-radius:3px;background:linear-gradient(90deg,rgba(255,255,255,0),var(--zc));opacity:.75}
@keyframes flyx{0%{transform:translate3d(-14vw,0,0) rotate(-8deg)}50%{transform:translate3d(48vw,-34px,0) rotate(7deg)}100%{transform:translate3d(114vw,0,0) rotate(-6deg)}}
.fl.up{top:auto;bottom:0;animation-name:flyup}
.fl.up::before{right:auto;left:50%;top:calc(100% + 4px);width:3px;height:calc(64px * var(--z));margin:0 0 0 -1.5px;background:linear-gradient(0deg,rgba(255,255,255,0),var(--zc))}
@keyframes flyup{0%{transform:translate3d(0,14vh,0) rotate(0)}50%{transform:translate3d(26px,-48vh,0) rotate(12deg)}100%{transform:translate3d(-10px,-112vh,0) rotate(-6deg)}}
.risel{position:fixed;z-index:88;pointer-events:none;font-family:inherit;font-weight:800;font-size:28px;line-height:1;color:#fff;text-shadow:0 0 8px var(--fc),0 0 20px var(--fc),0 0 2px #fff}
.risel::after{content:"";position:absolute;left:50%;top:100%;width:3px;height:42px;margin-left:-1.5px;border-radius:3px;background:linear-gradient(180deg,var(--fc),rgba(255,255,255,0))}

@media (min-width:961px){.hud{min-height:62px}}
@media (max-width:960px){.hud .buddy{display:block}.buddy.big{display:none}}
@media (max-width:1000px){
  .dest{padding-left:14px;padding-top:14px}
  .dest-guide{position:relative;left:auto;width:auto;flex-direction:row-reverse;justify-content:flex-end;align-items:flex-end;margin:6px 0 -6px;pointer-events:auto}
  .dest-guide .mz{width:118px;height:132px}
  .dest-guide .cb{margin-bottom:60px}
  .dest-guide .cb::after{left:auto;margin:0;right:-8px;bottom:12px;width:12px;height:12px;clip-path:polygon(0 0,100% 50%,0 100%)}
}
@media (max-width:700px){
  .mhead{flex-wrap:wrap;padding:8px 12px 10px 8px}
  .mhead h1{font-size:19px}
  .mprog{width:100%;text-align:left}
  .dest{padding:10px 8px 16px;border-radius:22px;min-height:0}
  .dest-h b{font-size:15px}
  .dest-guide .mz{width:96px;height:108px}
  .dest-guide .cb{margin-bottom:50px;font-size:13px;max-width:200px}
  .node{width:66px;height:66px;margin:-33px 0 0 -33px}
  .node .orb .spr{width:52px;height:52px}
  .node .lab{top:72px;width:108px;padding:4px 6px}
  .node .lab b{font-size:11px}
  .fl{opacity:.6}
}
/* touch screens: a larger invisible hit area for the RU/KZ switch (look unchanged) */
@media (pointer:coarse){.lang button{position:relative}.lang button::after{content:"";position:absolute;inset:-9px -1px}}
/* Word Hunt art */
.hero{--hero:url("/practice/wordhunt/img/hero.webp")}
.z-A0{--zimg:url("/practice/wordhunt/img/z-A0.webp")}
.z-A1{--zimg:url("/practice/wordhunt/img/z-A1.webp")}
.z-A2{--zimg:url("/practice/wordhunt/img/z-A2.webp")}
.z-B1{--zimg:url("/practice/wordhunt/img/z-B1.webp")}
.z-B2{--zimg:url("/practice/wordhunt/img/z-B2.webp")}
.z-ST{--zimg:url("/practice/wordhunt/img/z-ST.webp")}
.m-dexter{--img:url("/practice/wordhunt/img/m-dexter.webp")}
.m-luna{--img:url("/practice/wordhunt/img/m-luna.webp")}
.m-aizere{--img:url("/practice/wordhunt/img/m-aizere.webp")}
.m-spark{--img:url("/practice/wordhunt/img/m-spark.webp")}
.s-star{--sp:url("/practice/wordhunt/img/s-star.webp")}
.s-crescent{--sp:url("/practice/wordhunt/img/s-crescent.webp")}
.s-fullmoon{--sp:url("/practice/wordhunt/img/s-fullmoon.webp")}
.s-ringcyan{--sp:url("/practice/wordhunt/img/s-ringcyan.webp")}
.s-green{--sp:url("/practice/wordhunt/img/s-green.webp")}
.s-orange{--sp:url("/practice/wordhunt/img/s-orange.webp")}
.s-ringpink{--sp:url("/practice/wordhunt/img/s-ringpink.webp")}
.s-galaxy{--sp:url("/practice/wordhunt/img/s-galaxy.webp")}
.s-comet{--sp:url("/practice/wordhunt/img/s-comet.webp")}
.s-island{--sp:url("/practice/wordhunt/img/s-island.webp")}
.s-rocket{--sp:url("/practice/wordhunt/img/s-rocket.webp")}
.s-station{--sp:url("/practice/wordhunt/img/s-station.webp")}
.s-cloud{--sp:url("/practice/wordhunt/img/s-cloud.webp")}
.s-portal{--sp:url("/practice/wordhunt/img/s-portal.webp")}
.s-asteroids{--sp:url("/practice/wordhunt/img/s-asteroids.webp")}

/* ===================== слой приложения (scripts/wordhunt/extract-assets.js) ===================== */
/* Корень раздела — своя группа слоёв: z-index неба, шапки и окон не спорят со слоями приложения. */
.wh{position:relative;isolation:isolate;margin:0}
/* Небо прототипа — position:fixed на весь экран. В приложении слева сайдбар, и небо легло бы поверх
   него. Обёртка обрезает его по разделу (clip-path режет и fixed-потомков), а само небо остаётся
   неподвижным при прокрутке, как в прототипе. */
.sky-clip{position:absolute;inset:0;z-index:0;clip-path:inset(0);pointer-events:none}
/* Логотип и переключатель RU/KZ сняты (язык — интерфейса приложения): в шапке остаётся название. */
.brand .sep{display:none}
`
