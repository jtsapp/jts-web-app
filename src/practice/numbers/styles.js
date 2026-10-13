// CSS игры «Числа» (Dexter's Number World) для Shadow DOM — перенесён из
// прототипа data/jtsnumbers.html. Отличия: :root → :host (переменные видны
// внутри тени), правило body — на корне .nw, фоны миров — файлами
// /practice/numbers/img/, а @font-face убран: внутри Shadow DOM он применяется
// ненадёжно, поэтому NumbersPage подключает /practice/numbers/fonts/fonts.css к
// документу (шрифты документа внутрь тени видны). Правки оформления — здесь и в
// прототипе одновременно.

export const NUMBERS_CSS = `:host{
  --brand:#874BF8; --brand-d:#6a2fe0; --brand-l:#efe7ff;
  --ink:#1f1640; --ink2:#5b5478; --bg:#f6f3ff; --card:#fff;
  --good:#1fa65a; --good-l:#e3f7eb; --bad:#e2453c; --bad-l:#fde9e7;
  --gold:#f5b400; --line:#e4def5; --shadow:0 10px 30px rgba(60,30,140,.14);
  --radius:22px;
  --num:'Baloo 2','Nunito','PT Root UI','SF Pro Display',system-ui,sans-serif;
  --txt:'PT Root UI','SF Pro Display','Nunito',system-ui,-apple-system,'Segoe UI',sans-serif;
  --bg1:url("/practice/numbers/img/bg1.webp"); --bg2:url("/practice/numbers/img/bg2.webp"); --bg3:url("/practice/numbers/img/bg3.webp");
}
*{box-sizing:border-box}
.nw{display:block;font-family:var(--txt);color:var(--ink);background:var(--bg);min-height:100vh;-webkit-font-smoothing:antialiased}
button{font-family:inherit;cursor:pointer}
button:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--brand);outline-offset:3px}
.hidden{display:none!important}
svg.ic{width:20px;height:20px;flex:none}

/* ---------- Top bar ---------- */
.topbar{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:14px;padding:10px 20px}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--num);font-weight:800;font-size:21px;color:var(--ink);white-space:nowrap}
.logo img{width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.2))}
.spacer{flex:1}
.stat{display:flex;align-items:center;gap:7px;background:var(--bg);border-radius:999px;padding:6px 12px;font-weight:800;font-size:14px;white-space:nowrap}
.stat .ic{width:18px;height:18px}
.stat img{width:14px;height:22px;object-fit:contain}
.bar{height:8px;background:var(--line);border-radius:99px;overflow:hidden;margin-top:4px}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--brand),#b98cff);border-radius:99px;transition:width .6s ease}
.icon-btn{border:0;background:var(--bg);border-radius:12px;width:40px;height:40px;display:grid;place-items:center;color:var(--ink)}
.icon-btn:hover{background:var(--brand-l)}

/* ---------- Dashboard ---------- */
.dash{max-width:1180px;margin:0 auto;padding:24px 20px 80px}
.hero{position:relative;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);min-height:330px;background:var(--bg1) 40% 70%/cover;color:#fff;padding:36px 40px;display:flex;align-items:flex-end;margin-bottom:8px}
.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(36,12,100,.86) 0%,rgba(36,12,100,.55) 42%,rgba(36,12,100,0) 70%)}
.hero>*{position:relative}
.hero-txt{max-width:520px}
.hero h1{font-family:var(--num);font-size:44px;line-height:1;margin:0 0 10px;text-shadow:0 3px 14px rgba(0,0,0,.3)}
.hero p{margin:0 0 20px;font-weight:600;font-size:17px;opacity:.95;max-width:430px}
.hero-row{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.hero-prog{display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px}
.hero-prog .bar{width:120px;margin:0;background:rgba(255,255,255,.3)}
.hero-prog .bar>i{background:#fff}
.hero-dex{position:absolute!important;right:6%;bottom:-4px;height:94%;max-height:330px;filter:drop-shadow(0 16px 20px rgba(30,10,80,.5));animation:idle 2.6s ease-in-out infinite;transform-origin:50% 100%}
.btn{border:0;border-radius:16px;padding:14px 22px;font-weight:800;font-size:16px;display:inline-flex;align-items:center;gap:8px;transition:transform .12s,box-shadow .12s}
.btn:active{transform:translateY(2px)}
.btn-primary{background:var(--brand);color:#fff;box-shadow:0 4px 0 var(--brand-d)}
.btn-white{background:#fff;color:var(--brand);box-shadow:0 4px 0 rgba(0,0,0,.18);align-self:flex-start}
.btn-ghost{background:var(--bg);color:var(--ink)}
.btn-bad{background:var(--bad);color:#fff;box-shadow:0 4px 0 #a92c25}
.btn-gold{background:linear-gradient(180deg,#ffd34d,#f5a400);color:#3a2400;box-shadow:0 4px 0 #b97600}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.mini{background:var(--bg);border-radius:14px;padding:12px;text-align:center}
.mini b{display:block;font-family:var(--num);font-size:26px;line-height:1}
.mini span{font-size:12px;color:var(--ink2);font-weight:700}
.world{position:relative;border-radius:20px;overflow:hidden;margin:34px 0 16px;padding:20px 24px;color:#fff;background-size:cover;background-position:center 40%;min-height:92px;display:flex;align-items:flex-end;gap:14px;box-shadow:var(--shadow)}
.world::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(25,8,70,.82),rgba(25,8,70,.35) 60%,rgba(25,8,70,.1))}
.world>*{position:relative}
.world h2{font-family:var(--num);font-size:24px;margin:0;line-height:1.1}
.world span{font-weight:700;font-size:13px;opacity:.9}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}
.card{position:relative;border:0;text-align:left;background:var(--card);border-radius:var(--radius);padding:0;box-shadow:0 8px 24px rgba(60,30,140,.12);overflow:hidden;transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;color:var(--ink)}
.card:hover{transform:translateY(-5px);box-shadow:0 20px 40px rgba(60,30,140,.22)}
.card:hover .cover{background-size:auto 138%}
.card.next{box-shadow:0 0 0 3px var(--brand),0 16px 34px rgba(135,75,248,.3)}
.cover{position:relative;height:190px;background-size:auto 126%;background-repeat:no-repeat;transition:background-size .5s ease;overflow:hidden}
.cover::after{content:"";position:absolute;inset:auto 0 0 0;height:38%;background:linear-gradient(transparent,rgba(20,8,60,.25));pointer-events:none}
.cv-isl{position:absolute;left:0;right:0;margin:0 auto;bottom:-26px;width:150px;filter:drop-shadow(0 14px 14px rgba(20,8,70,.4));z-index:1}
.cv-obj{--iw:150px;position:absolute;left:0;right:0;bottom:62px;display:flex;justify-content:center;font-size:calc(var(--iw)*.2);z-index:2;animation:bob 3.4s ease-in-out infinite}
.cv-obj>.o{filter:drop-shadow(0 10px 16px rgba(30,10,90,.4)) drop-shadow(0 0 18px rgba(185,140,255,.55))}
.card:nth-child(2n) .cv-obj{animation-delay:-1.3s}.card:nth-child(3n) .cv-obj{animation-delay:-2.2s}
.o.glass{background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(239,231,255,.97));border:3px solid #fff;border-radius:20px;padding:.22em .55em .08em;box-shadow:0 0 0 3px rgba(135,75,248,.55);font-family:var(--num);font-weight:800;color:#2b1a66;font-size:1.25em;white-space:nowrap}
.cv-portal{position:absolute;left:0;right:0;margin:0 auto;bottom:-18px;height:200px;filter:drop-shadow(0 0 22px rgba(185,140,255,.8));z-index:1;animation:bob 3.4s ease-in-out infinite}
.card-body{padding:14px 18px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
.card-title{font-weight:800;font-size:17px}
.card-desc{font-size:13.5px;color:var(--ink2);line-height:1.4}
.card-foot{margin-top:auto;padding-top:6px;display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:var(--ink2)}
.card-foot .cta{margin-left:auto;color:var(--brand)}
.stars{display:flex;gap:2px}
.stars svg{width:17px;height:17px}
.state{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:var(--good);color:#fff;display:grid;place-items:center;z-index:3;box-shadow:0 4px 10px rgba(0,0,0,.2)}
.tag-boss{position:absolute;left:12px;top:12px;background:var(--gold);color:#3a2a00;font-weight:800;font-size:11px;border-radius:99px;padding:4px 10px;letter-spacing:.6px;z-index:3}
.lab-card{margin-top:34px;position:relative;display:flex;gap:18px;align-items:center;border-radius:var(--radius);padding:18px 24px;border:0;width:100%;text-align:left;box-shadow:var(--shadow);overflow:hidden;color:#fff;background:var(--bg2) center 60%/cover}
.lab-card::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,90,110,.9),rgba(60,20,120,.55))}
.lab-card>*{position:relative}
.lab-card .lc-txt{flex:1;display:block}
.lab-card .lc-t{display:block;margin:0 0 4px;font-size:19px;font-weight:800}
.lab-card .lc-d{display:block;margin:0;opacity:.92;font-size:14px}
.cover,.card-title,.card-desc,.isl .float{display:block}
.foot-tools{margin-top:40px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap}

/* ---------- Game ---------- */
.g-top{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 20px 8px}
.g-title{margin:0;font-weight:800;font-size:14px;color:var(--brand-d);text-transform:uppercase;letter-spacing:.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.path{flex:1;display:flex;align-items:center;gap:5px;min-width:0}
.stone{flex:1;height:12px;border-radius:99px;background:var(--line);position:relative;transition:background .4s,box-shadow .4s}
.stone.cur{background:#cdbcfa;box-shadow:0 0 0 2px var(--brand) inset}
.stone.gold{background:linear-gradient(90deg,#ffd34d,#f5a400);box-shadow:0 0 10px rgba(245,180,0,.6)}
.stone.silver{background:linear-gradient(90deg,#c9c3e3,#9d95c4)}
.stone.miss{background:#f3b2ad}
.path img{width:24px;height:32px;object-fit:contain;flex:none;filter:grayscale(1) opacity(.55);transition:filter .5s}
.path img.open{filter:none drop-shadow(0 0 6px #b98cff)}
.g-wrap{max-width:1240px;margin:0 auto;padding:0 20px 40px}
.scene{position:relative;width:100%;height:min(74vh,700px);min-height:440px;border-radius:28px;overflow:hidden;overflow:clip;box-shadow:0 20px 50px rgba(40,15,110,.3);background:#2a1a6e;user-select:none;-webkit-user-select:none;touch-action:manipulation;isolation:isolate}
.sky{position:absolute;top:0;left:0;width:100%;height:100%;background-size:100% 100%;background-repeat:no-repeat;transition:transform 1.1s cubic-bezier(.45,0,.2,1);will-change:transform}
.vignette{position:absolute;inset:0;background:radial-gradient(140% 100% at 50% 40%,transparent 70%,rgba(20,6,60,.28));pointer-events:none;z-index:1}
.boss-tint .vignette{background:radial-gradient(140% 100% at 50% 40%,rgba(60,0,80,.08) 50%,rgba(30,0,50,.42))}
.motes{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.mote{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px rgba(255,240,200,.8);opacity:0;animation:mote linear infinite}
@keyframes mote{0%{opacity:0;transform:translateY(0)}15%{opacity:.9}85%{opacity:.7}100%{opacity:0;transform:translateY(-140px) translateX(30px)}}
.isl{position:absolute;border:0;background:none;padding:0;z-index:4;transform:translate(-50%,0);-webkit-tap-highlight-color:transparent}
.isl img.rock{display:block;width:100%;height:auto;pointer-events:none;filter:drop-shadow(0 18px 18px rgba(20,8,70,.35))}
.isl .float{animation:bob 3.2s ease-in-out infinite}
.isl:nth-of-type(2) .float{animation-delay:-1.1s}.isl:nth-of-type(3) .float{animation-delay:-2.2s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.tab{position:absolute;left:50%;bottom:calc(100% - var(--anc) + 10px);transform:translateX(-50%);min-width:74%;padding:6px 16px 2px;border-radius:20px;text-align:center;
  background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(239,231,255,.96));border:3px solid #fff;box-shadow:0 0 0 3px rgba(135,75,248,.55),0 10px 24px rgba(40,10,120,.35),0 0 28px rgba(185,140,255,.6);
  font-family:var(--num);font-weight:800;color:#2b1a66;line-height:1.05;white-space:nowrap;transition:transform .15s,box-shadow .15s}
.tab::after{content:"";position:absolute;left:50%;top:100%;width:3px;height:12px;margin-left:-1.5px;background:linear-gradient(#b98cff,transparent)}
.isl:hover:not([disabled]) .tab,.isl:focus-visible .tab{transform:translateX(-50%) translateY(-5px) scale(1.05);box-shadow:0 0 0 4px #874BF8,0 14px 28px rgba(40,10,120,.45),0 0 36px rgba(185,140,255,.9)}
.isl[disabled]{cursor:default}
.isl .key{position:absolute;left:50%;top:calc(var(--anc) + 22%);transform:translateX(-50%);font:800 12px var(--txt);color:#fff;background:rgba(30,10,80,.55);border-radius:8px;padding:2px 7px}
.isl.glow .tab{box-shadow:0 0 0 4px var(--gold),0 0 40px 8px rgba(255,210,80,.9);animation:pulse 1s ease-in-out infinite}
@keyframes pulse{50%{transform:translateX(-50%) scale(1.07)}}
.isl.crack img.rock{filter:drop-shadow(0 18px 18px rgba(20,8,70,.35)) saturate(.3) brightness(.85);animation:shake .4s}
.isl.wrongTab .tab{background:#ffe1de;box-shadow:0 0 0 3px var(--bad)}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px) rotate(-2deg)}60%{transform:translateX(7px) rotate(2deg)}}
.base{pointer-events:none;z-index:3}
.portal{position:absolute;z-index:4;transform:translate(-50%,0);pointer-events:none;filter:drop-shadow(0 0 30px rgba(185,140,255,.8))}
.portal img{width:100%;display:block;animation:bob 3s ease-in-out infinite}
.dex{position:absolute;z-index:6;left:0;top:0;pointer-events:none;will-change:transform;transform-origin:50% 100%}
.dex .shadow{position:absolute;left:50%;bottom:-6%;width:70%;height:12%;margin-left:-35%;border-radius:50%;background:rgba(20,8,60,.35);filter:blur(3px)}
.dex img{position:absolute;left:0;right:0;bottom:0;margin:0 auto;width:auto;max-width:none;transform-origin:50% 100%;filter:drop-shadow(0 6px 8px rgba(20,8,60,.35));visibility:hidden}
.dex img.on{visibility:visible}
.dex img[data-p=idle]{height:100%}.dex img[data-p=oops]{height:100%}.dex img[data-p=crouch]{height:92.6%}.dex img[data-p=jump]{height:87%}.dex img[data-p=win]{height:103.8%}
.dex.idle img{animation:idle 2.4s ease-in-out infinite}
@keyframes idle{0%,100%{transform:scale(1,1) translateY(0)}50%{transform:scale(1.02,.97) translateY(0)}}
.dex.dizzy img{animation:dizzy .7s ease-in-out}
@keyframes dizzy{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}50%{transform:rotate(10deg)}75%{transform:rotate(-6deg)}}
.prompt{position:absolute;z-index:7;left:50%;top:16px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:calc(100% - 32px)}
.pill{background:rgba(255,255,255,.95);border-radius:999px;padding:8px 26px 6px;box-shadow:0 0 0 4px rgba(255,255,255,.35),0 12px 30px rgba(30,10,90,.35);font-family:var(--num);font-weight:800;font-size:30px;color:#2b1a66;min-width:200px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pill small{display:block;font:800 11px var(--txt);letter-spacing:1.2px;text-transform:uppercase;color:var(--brand);margin-bottom:-2px}
.pill .listen{display:inline-flex;gap:4px;align-items:flex-end;height:26px;vertical-align:middle}
.pill .listen i{width:5px;border-radius:3px;background:var(--brand);animation:eq 1s ease-in-out infinite}
.pill .listen i:nth-child(2){animation-delay:-.2s}.pill .listen i:nth-child(3){animation-delay:-.4s}.pill .listen i:nth-child(4){animation-delay:-.6s}
@keyframes eq{0%,100%{height:6px}50%{height:24px}}
.rbtn{width:56px;height:56px;border-radius:18px;border:0;background:#ff5a3c;color:#fff;display:grid;place-items:center;box-shadow:0 5px 0 #c53a20,0 10px 20px rgba(0,0,0,.25);flex:none}
.rbtn svg{width:28px;height:28px}
.rbtn:active{transform:translateY(3px);box-shadow:0 2px 0 #c53a20}
.rbtn.slow{width:auto;padding:0 14px;height:44px;border-radius:14px;background:#fff;color:var(--ink);box-shadow:0 4px 0 rgba(0,0,0,.15);font-weight:800;font-size:14px}
.hud{position:absolute;z-index:7;left:16px;bottom:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.chip{background:rgba(255,255,255,.94);border-radius:999px;padding:6px 12px;font-weight:800;font-size:15px;color:var(--ink);display:flex;align-items:center;gap:6px;box-shadow:0 6px 14px rgba(20,8,60,.25)}
.chip img{width:14px;height:22px;object-fit:contain}
.chip.combo{background:linear-gradient(180deg,#ffd34d,#f5a400);color:#3a2400}
.chip.combo.bump{animation:bump .4s}
@keyframes bump{50%{transform:scale(1.25)}}
.hud-r{position:absolute;z-index:7;right:16px;bottom:16px;display:flex;gap:8px}
.hbtn{border:0;background:rgba(255,255,255,.94);border-radius:999px;padding:8px 14px;font-weight:800;font-size:14px;color:var(--ink);display:flex;gap:6px;align-items:center;box-shadow:0 6px 14px rgba(20,8,60,.25)}
.hbtn[disabled]{opacity:.55}
.msg{position:absolute;z-index:8;left:50%;bottom:70px;transform:translate(-50%,20px);opacity:0;transition:all .3s;max-width:min(560px,calc(100% - 32px));background:#fff;border-radius:18px;padding:12px 18px;font-weight:700;font-size:16px;line-height:1.35;box-shadow:0 14px 30px rgba(20,8,60,.35);text-align:center}
.msg.show{opacity:1;transform:translate(-50%,0)}
.msg.side{transform:translate(0,20px)}.msg.side.show{transform:translate(0,0)}
.msg.ok{background:#e3f7eb;color:#11653a;border:2px solid #9fe0b9}
.msg.no{background:#fff1ef;color:#9b2a22;border:2px solid #f3b2ad}
.msg.info{background:#fff8dc;color:#6b4e00;border:2px solid #f0d27a}
.pop{position:absolute;z-index:9;font-family:var(--num);font-weight:800;font-size:30px;color:#fff;text-shadow:0 2px 0 #6a2fe0,0 0 14px rgba(185,140,255,.9);pointer-events:none;animation:popup 1.1s ease-out forwards}
@keyframes popup{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-14px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-70px) scale(1)}}
.fly{position:absolute;z-index:9;width:28px;pointer-events:none;filter:drop-shadow(0 0 8px rgba(185,140,255,.9))}
.spark{position:absolute;z-index:8;width:10px;height:10px;border-radius:50%;pointer-events:none}
.g-note{max-width:1100px;margin:10px auto 0;padding:0 20px;color:var(--ink2);font-size:13px;font-weight:700;text-align:center}

/* ================= explanation page =================
   Reading mode: Literata for headings and figures, Golos Text for running text.
   English is the teaching text; a translation layer (teal) can be shown under each English part. */
.lesson{
  --l-serif:'Literata','Iowan Old Style','PT Serif',Georgia,serif;
  --l-sans:'Golos Text','PT Root UI','Segoe UI',system-ui,-apple-system,sans-serif;
  --l-ink:#1d1538; --l-ink2:#4f4869; --l-ink3:#676085;
  --l-violet:#5a2fc8; --l-violet-t:#f2edff; --l-line:#e7e1f4; --l-paper:#ffffff;
  --l-tr:#0b6158; --l-tr-bg:#eef7f5; --l-tr-line:#c9e5df;
  --l-note:#8a5a00; --l-note-bg:#fff8e6;
  --l-bad:#b42318; --l-bad-bg:#fdeceb; --l-good:#11703f; --l-good-bg:#e8f6ee;
  max-width:860px;margin:0 auto;padding:14px 20px 40px;font-family:var(--l-sans);color:var(--l-ink);
  font-size:17px;line-height:1.6;font-variant-numeric:lining-nums
}
.lesson :is(h1,h2,h3){font-family:var(--l-serif);font-weight:600;letter-spacing:-.01em;color:var(--l-ink);text-wrap:balance}
.lesson b{font-weight:650;color:var(--l-ink)}
.ls-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ls-top .crumb{font-size:14px;font-weight:600;color:var(--l-ink2)}

/* header band: world art, title, level */
.ls-head{position:relative;border-radius:20px;overflow:hidden;background-size:cover;background-position:center 58%;color:#fff;padding:28px 32px 26px;min-height:168px;display:flex;align-items:flex-end}
.ls-head::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(24,10,70,.92) 0%,rgba(24,10,70,.78) 48%,rgba(24,10,70,.28) 100%)}
.ls-head>div{position:relative;max-width:620px}
.ls-world{font-size:14.5px;font-weight:500;color:rgba(255,255,255,.86);margin:0}
.ls-head h1{color:#fff;font-size:40px;line-height:1.12;margin:4px 0 12px}
.ls-level{display:inline-block;font-size:13.5px;font-weight:600;border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:3px 11px;color:#fff}

/* language bar — sits directly above the English explanation */
.ls-langbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;margin:22px 0 0;padding:0 0 14px;border-bottom:1px solid var(--l-line)}
.ls-seg{display:inline-flex;background:#ece7f7;border-radius:12px;padding:3px;gap:2px}
.ls-seg button{border:0;background:transparent;border-radius:9px;min-height:40px;padding:0 16px;font:600 15px/1 var(--l-sans);color:var(--l-ink2);display:inline-flex;align-items:center;gap:7px}
.ls-seg button:hover{color:var(--l-ink)}
.ls-seg button[aria-pressed="true"]{background:var(--l-paper);color:var(--l-ink);box-shadow:0 1px 2px rgba(30,15,80,.12),0 0 0 1px rgba(30,15,80,.06)}
.ls-seg button[data-tr="kk"][aria-pressed="true"],.ls-seg button[data-tr="ru"][aria-pressed="true"]{color:var(--l-tr)}
.ls-seg .dot{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.35}
.ls-seg button[aria-pressed="true"] .dot{opacity:1}
.ls-langbar .hint{font-size:13.5px;color:var(--l-ink3);flex-basis:100%}

/* explanation */
.ls-expl{padding:0 32px 30px}
.ls-sheet{background:var(--l-paper);border-radius:20px;box-shadow:0 12px 32px rgba(50,25,120,.07);margin-top:18px;overflow:hidden}
.ls-sheet .ls-langbar{margin:0;padding:16px 32px 14px}
.ls-lead{font-family:var(--l-serif);font-size:21px;line-height:1.5;color:var(--l-ink);margin:22px 0 0;max-width:40em}
.ls-lead b{font-weight:650;color:var(--l-violet)}
.ls-rules{list-style:none;margin:8px 0 0;padding:0;counter-reset:rule}
.ls-rule{display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 14px;padding:26px 0 4px;border-top:1px solid var(--l-line);margin-top:22px}
.ls-rule:first-child{margin-top:24px}
.ls-rn{font-family:var(--l-serif);font-size:30px;line-height:1;font-weight:500;color:#b7a6ea;padding-top:2px}
.ls-rule h2{font-size:23px;line-height:1.25;margin:0 0 8px}
.ls-rule p{margin:0 0 12px;max-width:40em}
.ls-rule p b{color:var(--l-violet)}
.ls-pat{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;background:var(--l-violet-t);border-radius:10px;padding:10px 14px;margin:4px 0 14px}
.ls-pat span{font-size:13px;font-weight:600;color:var(--l-violet)}
.ls-pat strong{font-family:var(--l-serif);font-size:18px;font-weight:550;color:var(--l-ink);letter-spacing:.005em}

/* examples: figure | words */
.ls-ex{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:0 28px;margin:2px 0 6px}
.ls-x{display:grid;grid-template-columns:minmax(64px,auto) 1fr 18px;align-items:baseline;gap:12px;border:0;border-bottom:1px solid var(--l-line);background:none;text-align:left;padding:9px 2px;color:var(--l-ink);border-radius:0;font:inherit}
.ls-x .fig{font-family:var(--l-serif);font-size:21px;font-weight:600;color:#2a1b72;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.ls-x .w{font-size:16px;line-height:1.4}
.ls-x svg{width:16px;height:16px;color:var(--l-ink3);opacity:.55;align-self:center}
.ls-x:hover{background:#faf8ff}.ls-x:hover svg{opacity:1;color:var(--l-violet)}
.ls-dlg{display:flex;flex-direction:column;gap:6px;margin:2px 0 8px}
.ls-line{display:grid;grid-template-columns:56px 1fr 18px;gap:12px;align-items:baseline;border:0;background:none;text-align:left;padding:8px 2px;border-bottom:1px solid var(--l-line);font:inherit;color:var(--l-ink)}
.ls-line .who{font-size:13px;font-weight:600;color:var(--l-ink3)}
.ls-line .w{font-family:var(--l-serif);font-size:18px}
.ls-line svg{width:16px;height:16px;color:var(--l-ink3);opacity:.55;align-self:center}
.ls-line:hover svg{opacity:1;color:var(--l-violet)}
.ls-hint{font-size:13px;color:var(--l-ink3);margin:6px 0 0}
.ls-note{border-left:3px solid #f0b429;background:var(--l-note-bg);border-radius:0 10px 10px 0;padding:10px 14px;margin:12px 0 10px;font-size:16px;max-width:40em}
.ls-note>span{font-weight:650;color:var(--l-note);margin-right:6px}

/* translation layer */
.ls-tr{border:1px solid var(--l-tr-line);background:var(--l-tr-bg);border-radius:12px;padding:12px 16px 4px;margin:14px 0 8px;max-width:44em}
.ls-tr .trh{display:block;font-size:13px;font-weight:600;color:var(--l-tr);margin:0 0 6px}
.ls-tr p{margin:0 0 9px;font-size:16px;line-height:1.55;color:#173b37}
.ls-tr p b{color:#0b4d46}
.ls-tr .trt{font-weight:650;color:#0b4d46}
.ls-tr .trx{border-top:1px dashed var(--l-tr-line);padding-top:8px}
.ls-lead+.ls-tr{margin-top:14px}
.ls-trs{display:block;font-size:14.5px;line-height:1.5;color:var(--l-tr);margin-top:4px}

/* mistakes and quick check */
.ls-sec{background:var(--l-paper);border-radius:20px;padding:24px 32px 22px;margin-top:18px;box-shadow:0 12px 32px rgba(50,25,120,.07)}
.ls-sec h2{font-size:23px;margin:0 0 10px}
.ls-mis{list-style:none;margin:0;padding:0}
.ls-mis li{padding:12px 0;border-top:1px solid var(--l-line)}
.ls-mis li:first-child{border-top:0}
.ls-pair{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:4px}
.ls-pair .bad{color:var(--l-bad);background:var(--l-bad-bg);text-decoration:line-through;text-decoration-thickness:1.5px;border-radius:7px;padding:2px 9px;font-weight:500}
.ls-pair .good{color:var(--l-good);background:var(--l-good-bg);border-radius:7px;padding:2px 9px;font-weight:650}
.ls-pair .arr{color:var(--l-ink3)}
.ls-pair .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ls-mis .why{margin:0;font-size:16px;color:var(--l-ink2)}
.qc{padding:14px 0;border-top:1px solid var(--l-line)}
.qc:first-of-type{border-top:0;padding-top:4px}
.qc>p{margin:0 0 10px;font-weight:600}
.qc-opts{display:flex;flex-wrap:wrap;gap:8px}
.qc-o{border:1.5px solid #d9d1ef;background:#fff;border-radius:10px;min-height:44px;padding:8px 16px;font:500 16px var(--l-sans);color:var(--l-ink)}
.qc-o:hover:not([disabled]){border-color:var(--l-violet)}
.qc-o.right{border-color:var(--l-good);background:var(--l-good-bg);color:var(--l-good);font-weight:650}
.qc-o.wrong{border-color:var(--l-bad);background:var(--l-bad-bg);color:var(--l-bad)}
.qc-o[disabled]{cursor:default}
.qc-fb{font-size:15.5px;margin-top:10px}
.qc-fb:empty{display:none}
.qc-fb.ok b{color:var(--l-good)}.qc-fb.no b{color:var(--l-bad)}

/* start bar + sources */
.ls-start{position:sticky;bottom:12px;margin-top:20px;display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border-radius:16px;padding:12px 14px;box-shadow:0 10px 30px rgba(60,30,140,.18);z-index:5;font-family:var(--l-sans)}
.ls-start .btn{font-size:18px;padding:14px 26px}
.ls-start span{font-size:14px;color:var(--l-ink2)}
.ls-src{margin-top:18px;font-size:14px;color:var(--l-ink2)}
.ls-src summary{cursor:pointer;font-weight:600}
.ls-src li{margin:6px 0}
.ls-src a{color:var(--l-violet)}
@media (max-width:720px){
  .lesson{padding:10px 12px 32px;font-size:16px}
  .ls-head{padding:20px 18px;min-height:132px;border-radius:16px}
  .ls-head h1{font-size:29px}
  .ls-sheet,.ls-sec{border-radius:16px}
  .ls-sheet .ls-langbar{padding:14px 16px 12px}
  .ls-seg{width:100%}.ls-seg button{flex:1;justify-content:center;padding:0 8px;font-size:14.5px;min-height:44px}
  .ls-expl{padding:4px 16px 22px}
  .ls-sec{padding:20px 16px 16px}
  .ls-lead{font-size:18.5px}
  .ls-rule{grid-template-columns:1fr;padding-top:20px;margin-top:18px}
  .ls-rn{font-size:15px;font-family:var(--l-sans);font-weight:600;color:var(--l-violet);margin-bottom:4px}
  .ls-rule h2,.ls-sec h2{font-size:20.5px}
  .ls-ex{grid-template-columns:1fr}
  .ls-x .fig{font-size:19px}
  .ls-tr{padding:10px 12px 2px}
  .ls-start .btn{width:100%;justify-content:center}
}

/* rounds: pips, chips, word islands, long prompts, lesson round list, results strip */
.isl.wd .tab{white-space:normal;line-height:1.12;min-width:96%;max-width:118%;padding:7px 10px 6px;font-family:var(--txt);font-weight:800;letter-spacing:0}
.pill.long{white-space:normal;font-size:20px;line-height:1.25;border-radius:22px;max-width:min(760px,calc(100vw - 150px));padding:8px 22px 9px;text-align:center}
.res-sub{margin:0;color:var(--ink2);font-weight:700}
.res-note{font-weight:800;color:var(--brand)}
.res-tip{font-size:14.5px;color:var(--ink2);margin:6px 0}
@media (max-width:720px){
      .pill.long{font-size:16px;max-width:calc(100vw - 120px);padding:7px 14px 8px}
  .pill.long.xl{font-size:14px;line-height:1.2}
  }

/* numbered rounds: card pips, lesson buttons, in-game chip, results strip */
.pips{display:inline-flex;align-items:center;gap:4px}
.pips i{width:14px;height:6px;border-radius:99px;background:var(--line)}
.pips i.on{background:var(--brand)}
.pips b{font-size:12px;color:var(--ink2);margin-left:4px}
.lab-card .pips i{background:rgba(255,255,255,.35)}.lab-card .pips i.on{background:#fff}.lab-card .pips b{color:#fff}
.ls-rounds{display:flex;gap:6px;flex-wrap:wrap}
.rnum{min-width:44px;height:44px;border-radius:12px;border:1.5px solid #d9d1ef;background:#fff;font:700 16px var(--l-sans,inherit);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;gap:3px;padding:0 10px}
.rnum .ic{width:14px;height:14px}
.rnum.ok{border-color:#b9e3c9;background:var(--good-l);color:#11703f}
.rnum.cur{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand) inset;color:var(--brand-d)}
.rnum:hover{border-color:var(--brand)}
.chip.rno{font-weight:800;font-size:13px}
.res-rounds{display:flex;gap:6px;justify-content:center;margin:12px 0 6px}
.res-rounds span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--bg);font-weight:800;font-size:13.5px;color:var(--ink2)}
.res-rounds span.ok{background:var(--good);color:#fff}
.res-rounds span.cur{box-shadow:0 0 0 2px var(--brand)}

/* results */
.res{max-width:640px;margin:20px auto;padding:0 16px;text-align:center}
.res .panel{background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:32px 26px;overflow:hidden;position:relative}
.res .banner{margin:-32px -26px 10px;height:170px;background-size:cover;background-position:center 40%;position:relative}
.res .banner img{position:absolute;left:50%;bottom:-18px;height:150px;transform:translateX(-50%);filter:drop-shadow(0 10px 12px rgba(0,0,0,.35));animation:cheer 1s ease-in-out infinite}
@keyframes cheer{0%,100%{transform:translateX(-50%) translateY(0) rotate(0)}30%{transform:translateX(-50%) translateY(-16px) rotate(-6deg)}60%{transform:translateX(-50%) translateY(0) rotate(5deg)}}
.res h1{font-family:var(--num);font-size:36px;margin:22px 0 4px}
.big-stars{display:flex;justify-content:center;gap:10px;margin:8px 0 14px}
.big-stars svg{width:60px;height:60px}
.big-stars svg.on{animation:popstar .5s backwards}
.big-stars svg:nth-child(2){animation-delay:.15s}.big-stars svg:nth-child(3){animation-delay:.3s}
@keyframes popstar{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
.res-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0}
.review-list{text-align:left;margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
.review-list h4{margin:0 0 8px}
.review-list li{margin-bottom:6px;font-size:15px}
.actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;justify-content:center}
.confetti{position:fixed;top:-20px;width:10px;height:16px;z-index:60;pointer-events:none;animation:fall linear forwards;border-radius:2px}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg)}}
.modal-bg{position:fixed;inset:0;background:rgba(20,10,50,.45);z-index:70;display:grid;place-items:center;padding:20px}
.modal{background:#fff;border-radius:var(--radius);max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.3)}
.modal h3{margin:0 0 12px;font-family:var(--num);font-size:26px}
.toast-box{position:fixed;top:74px;right:16px;z-index:80;display:flex;flex-direction:column;gap:10px}
.toast{background:#1f1640;color:#fff;border-radius:16px;padding:12px 16px;display:flex;gap:12px;align-items:center;box-shadow:var(--shadow);animation:tin .3s ease;max-width:340px}
@keyframes tin{from{transform:translateX(120%)}to{transform:translateX(0)}}

/* ---------- topic skins: each section shows its own object on the island ---------- */
.tab.sk{background:none;border:0;box-shadow:none;padding:0;min-width:0;font-size:calc(var(--iw)*.2)}
.tab.sk::after{display:none}
.tab.sk>.o{filter:drop-shadow(0 10px 16px rgba(30,10,90,.35)) drop-shadow(0 0 16px rgba(185,140,255,.55));transition:filter .15s}
.isl:hover:not([disabled]) .tab.sk,.isl:focus-visible .tab.sk{box-shadow:none}
.isl:hover:not([disabled]) .tab.sk>.o,.isl:focus-visible .tab.sk>.o{filter:drop-shadow(0 12px 18px rgba(30,10,90,.45)) drop-shadow(0 0 0 #fff) drop-shadow(0 0 22px rgba(160,100,255,.95))}
.isl.glow .tab.sk{box-shadow:none}
.isl.glow .tab.sk>.o{filter:drop-shadow(0 0 4px #ffd34d) drop-shadow(0 0 22px rgba(255,200,60,.95))}
.isl.wrongTab .tab.sk{background:none;box-shadow:none}
.isl.wrongTab .tab.sk>.o{filter:grayscale(.6) drop-shadow(0 0 12px rgba(226,69,60,.9))}
.o{display:block;line-height:1}
/* clock */
.o.clock{width:calc(var(--iw)*.56);height:calc(var(--iw)*.56)}
.o.clock svg{width:100%;height:100%;display:block}
/* digital clock */
.o.digi{background:linear-gradient(180deg,#2a1d5c,#140c33);border:4px solid #b98cff;border-radius:16px;padding:.18em .45em .1em;color:#7cf7e4;font-family:'Courier New',ui-monospace,monospace;font-weight:700;font-size:1.05em;letter-spacing:.04em;text-shadow:0 0 10px rgba(124,247,228,.8)}
/* medal */
.o.medal{position:relative;width:calc(var(--iw)*.5);height:calc(var(--iw)*.5)}
.o.medal .disc{position:absolute;inset:0;z-index:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fff6c2,#ffd34d 45%,#e09a00);border:4px solid #fff3b0;box-shadow:inset 0 -6px 0 rgba(160,90,0,.35);font-family:var(--num);font-weight:800;color:#5a3500;font-size:1.05em}
.o.medal::before,.o.medal::after{content:"";position:absolute;z-index:0;bottom:-30%;width:26%;height:46%;background:#874BF8;clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)}
.o.medal::before{left:18%;transform:rotate(14deg)}.o.medal::after{right:18%;transform:rotate(-14deg);background:#ff5fa8}
/* phone screen */
.o.phone{background:linear-gradient(180deg,#24243a,#0f0f1d);border:4px solid #d9d5ec;border-radius:18px;padding:.42em .5em .3em;color:#fff;font-family:var(--num);font-weight:700;font-size:.9em;letter-spacing:.06em;position:relative;white-space:nowrap}
.o.phone::before{content:"";position:absolute;top:.14em;left:50%;width:22%;height:.12em;margin-left:-11%;border-radius:9px;background:#3d3d55}
/* price tag */
.o.tag{position:relative;background:linear-gradient(180deg,#ffe27a,#ffc93c);color:#4a2c00;font-family:var(--num);font-weight:800;font-size:.95em;padding:.2em .5em .1em 1.05em;border-radius:6px 14px 14px 6px;clip-path:polygon(16% 0,100% 0,100% 100%,16% 100%,0 50%);white-space:nowrap}
.o.tag::before{content:"";position:absolute;left:.42em;top:50%;width:.26em;height:.26em;margin-top:-.13em;border-radius:50%;background:#5b3c00;box-shadow:0 0 0 2px #fff6cc}
/* calendar page */
.o.cal{width:calc(var(--iw)*.52);background:#fff;border-radius:12px;overflow:hidden;text-align:center;border:3px solid #fff}
.o.cal b{display:block;background:linear-gradient(180deg,#ff5a6e,#e23a52);color:#fff;font:800 .3em/1.7 var(--txt);letter-spacing:.12em}
.o.cal span{display:block;font-family:var(--num);font-weight:800;color:#2b1a66;font-size:.95em;padding:.08em .1em .02em}
.o.cal.yr span{font-size:.7em;padding:.22em .1em .14em}
/* odometer / scoreboard */
.o.odo{background:linear-gradient(180deg,#2b1a66,#160c3c);border:4px solid #f5b400;border-radius:14px;padding:.18em .4em .06em;color:#ffd34d;font-family:var(--num);font-weight:800;font-size:.85em;letter-spacing:.04em;white-space:nowrap;text-shadow:0 0 12px rgba(255,200,60,.6)}
/* measurement label with instrument icon */
.o.meas{display:flex;align-items:center;gap:.25em;background:#fff;border-radius:14px;padding:.14em .4em .1em .26em;border:3px solid #e8e0ff;font-family:var(--num);font-weight:800;color:#2b1a66;font-size:.8em;white-space:nowrap}
.o.meas svg{width:1.2em;height:1.2em;flex:none}
.o.road{background:#1f8a4c;color:#fff;border:4px solid #fff;outline:3px solid #1f8a4c;border-radius:10px;padding:.14em .45em .06em;font-family:var(--num);font-weight:800;font-size:.85em;white-space:nowrap}
/* fraction pie */
.o.pie{display:flex;flex-direction:column;align-items:center;gap:.08em;background:rgba(255,255,255,.96);border-radius:18px;padding:.16em .3em .06em;border:3px solid #fff}
.o.pie svg{width:calc(var(--iw)*.34);height:calc(var(--iw)*.34)}
.o.pie i{font-style:normal;font-family:var(--num);font-weight:800;color:#2b1a66;font-size:.55em}
/* boarding pass / ticket */
.o.ticket{position:relative;background:#fff;border-radius:12px;padding:.1em .5em .06em;text-align:center;border-left:.32em solid #874BF8;white-space:nowrap}
.o.ticket b{display:block;font:800 .26em/1.6 var(--txt);letter-spacing:.14em;color:#874BF8}
.o.ticket span{display:block;font-family:var(--num);font-weight:800;color:#2b1a66;font-size:.8em}
@media (max-width:820px){
  .hero{min-height:300px;padding:24px 22px}
  .hero h1{font-size:30px;max-width:64%}
  .hero p{max-width:60%;font-size:14px}
  .hero-dex{height:62%;right:2%}
  .grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
  .topbar-in{gap:8px;padding:8px 12px}
  .stat{padding:5px 9px;font-size:13px}
  .icon-btn{width:36px;height:36px}
  .g-top{padding:10px 12px 6px}.g-wrap{padding:0 10px 30px}
  .g-title{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .scene{height:min(74vh,640px);min-height:480px;border-radius:22px}
  .pill{font-size:22px;min-width:0;flex:0 1 auto;padding:7px 14px 5px}
  .prompt{width:calc(100% - 20px);justify-content:center;gap:6px}
  .rbtn{flex:none}
  .rbtn{width:48px;height:48px;border-radius:15px}
  .prompt{display:grid;grid-template-columns:auto minmax(0,auto);grid-auto-rows:auto;gap:6px;align-items:center}
  .prompt>.rbtn{grid-column:1;grid-row:1}
  .prompt>.rbtn.slow{grid-row:2;width:48px;height:30px;padding:0;border-radius:10px;font-size:11.5px;box-shadow:0 3px 0 rgba(0,0,0,.15)}
  .prompt>.pill{grid-column:2;grid-row:1 / span 2}
  .hud{left:10px;bottom:10px}.hud-r{right:10px;bottom:10px}
  .chip,.hbtn{font-size:13px;padding:6px 10px}
  .msg{bottom:60px;font-size:14px}
  .isl .key{display:none}
  .g-note{display:none}
  .res-stats{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:480px){.logo span{display:none}}
@media (max-width:560px){
  .grid{grid-template-columns:1fr 1fr;gap:12px}
  .cover{height:140px}
  .cv-obj{--iw:112px;bottom:46px}
  .cv-isl{width:112px;bottom:-20px}
  .cv-portal{height:150px;bottom:-14px}
  .card-desc{display:none}
  .card-body{padding:10px 12px 12px;gap:4px}
  .card-title{font-size:14.5px;line-height:1.25}
  .card-foot .cta{display:none}
  .stars svg{width:14px;height:14px}
  .state{width:26px;height:26px;top:8px;right:8px}
  .hero{min-height:0;padding:22px 20px 24px;align-items:flex-start}
  .hero-dex{top:12px;bottom:auto;right:8px;height:128px}
  .hero h1{font-size:28px;max-width:62%}
  .hero p{max-width:100%;font-size:14px;margin-bottom:16px}
  .hero-row{gap:12px}
  .world{padding:16px 18px;min-height:78px;margin:26px 0 12px}
  .world h2{font-size:20px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* Только в приложении, в прототипе этого нет: казахский текст — на Inter, как
   во всём приложении (src/kk-font.css). Перевод объяснений и кнопка «+ Қазақша»
   несут lang="kk"; .nw в селекторе — чтобы перебить шорткат font у .ls-seg button.
   Сам Inter грузит документ (layout.jsx) — шрифты документа внутрь тени видны. */
.nw [lang="kk"]{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
`
