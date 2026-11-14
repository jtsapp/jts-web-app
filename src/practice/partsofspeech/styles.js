// CSS «Parts of Speech World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/partsofspeech/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const PARTSOFSPEECH_CSS = `:host{
  
  --brand:#874BF8; --brand-ink:#6E35E8; --brand-soft:#F2ECFF; --brand-mist:#F8F5FF;
  --cyan:#0AC7FF; --cyan-2:#0AAFFF; --cyan-ink:#0070A8; --cyan-soft:#E2F7FF;
  --green:#00E641; --green-2:#00D441; --green-ink:#08773A; --green-soft:#E3FAEA;
  --orange:#FF7D1D; --orange-2:#FF631E; --orange-ink:#BF3E0B; --orange-soft:#FFEEE3;
  --yellow:#FFF805; --amber:#FFAD00; --amber-ink:#875600; --amber-soft:#FFF5D9;
  --black:#000; --g70:#4E4B4B; --g50:#8B8787; --g25:#C4C3C3;
  
  --bg:#FAF9FD; --paper:#FFFFFF; --ink:#121017; --ink2:#4E4B4B; --ink3:#716D6D;
  --line:#E8E5F0; --line2:#F1EFF6;
  --night:#140C2B; --night-2:#1E1442; --night-3:#2B1C5E;
  
  --accent:var(--brand); --accent-soft:var(--brand-soft);
  --good:var(--green-ink); --good-soft:var(--green-soft); --good-line:#9BE3B4;
  --bad:var(--orange-ink); --bad-soft:var(--orange-soft); --bad-line:#FFC4A1;
  --warn:var(--amber-ink); --warn-soft:var(--amber-soft);
  
  --c-n:#1D5FC4; --c-pr:#7A3FC7; --c-det:#0B7F7A; --c-v:#C8293E; --c-aux:#8E2A63;
  --c-adj:#1E7F34; --c-adv:#B85A00; --c-p:#6B5634; --c-cj:#4B5563; --c-i:#C2367D;
  
  --display:var(--pos-font,inherit);
  --sans:var(--pos-font,inherit);
  --serif:var(--pos-font,inherit);
  
  --r-xl:32px; --r-lg:24px; --r-md:16px; --r-sm:12px;
  --shadow:0 1px 2px rgba(18,16,23,.04),0 8px 24px -12px rgba(46,24,110,.14);
  --shadow-up:0 2px 4px rgba(18,16,23,.05),0 18px 40px -18px rgba(46,24,110,.30);
  --ease:cubic-bezier(.2,.7,.2,1);
}
*{box-sizing:border-box}

.posw{margin:0;background:var(--bg);color:var(--ink);font:17px/1.68 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--brand-ink);text-underline-offset:3px;text-decoration-thickness:1px}
a:hover{color:var(--brand)}
button{font:inherit;cursor:pointer;color:inherit}
::selection{background:#E0D2FF}
:focus-visible{outline:3px solid var(--cyan-2);outline-offset:2px;border-radius:6px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.logo{display:block;height:auto}


.top{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.88);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--line)}
.top-in{max-width:1400px;margin:0 auto;display:flex;align-items:center;gap:18px;padding:0 28px;height:68px}
.brand{display:flex;align-items:center;gap:16px;text-decoration:none;color:var(--ink);min-width:0}
.brand .logo{width:112px}
.brand-rule{width:1px;height:26px;background:var(--line)}
.brand-name{font-family:var(--display);font-weight:600;font-size:15.5px;letter-spacing:-.01em;white-space:nowrap}
.menu-btn{display:none;align-items:center;gap:8px;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 14px;font-family:var(--display);font-weight:500;font-size:14px}
.menu-btn svg{width:16px;height:16px}
.langs{margin-left:auto;display:flex;border-radius:999px;padding:4px;background:var(--line2)}
.langs button{border:0;background:transparent;padding:7px 15px;border-radius:999px;color:var(--ink2);font-family:var(--display);font-weight:500;font-size:14px;transition:background .2s var(--ease),color .2s}
.langs button:hover{color:var(--ink)}
.langs button[aria-pressed="true"]{background:var(--paper);color:var(--brand-ink);box-shadow:0 1px 2px rgba(0,0,0,.08),0 2px 8px -2px rgba(46,24,110,.18)}


.wrap{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:300px minmax(0,1fr)}
nav.side{position:sticky;top:68px;align-self:start;height:calc(100vh - 68px);overflow:auto;padding:28px 18px 48px 28px;scrollbar-width:thin}
.main{padding:44px 56px 96px;min-width:0}
.col{max-width:780px}
.posw.full .wrap{grid-template-columns:minmax(0,1fr)}
.posw.full .main{padding:28px 28px 96px}
.posw.full .col{max-width:none}
.posw.page-case .col{max-width:1120px;margin:0 auto}
.posw.page-dossier .col,.posw.page-design .col{max-width:860px;margin:0 auto}
.posw.full .menu-btn{display:inline-flex}
.posw.full nav.side{position:fixed;left:var(--pos-x,0px);top:var(--pos-y,68px);width:min(360px,88cqw);height:calc(100vh - var(--pos-y,68px));background:var(--paper);z-index:35;transform:translateX(-104%);transition:transform .3s var(--ease);box-shadow:0 24px 60px -20px rgba(20,12,43,.35);border-right:1px solid var(--line)}
.posw.full nav.side.open{transform:none}
#view{animation:viewIn .5s var(--ease)}
@keyframes viewIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}


.side h2{font-family:var(--display);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:26px 10px 8px;font-weight:600}
.side a{position:relative;display:flex;gap:12px;align-items:baseline;padding:7px 10px;border-radius:12px;text-decoration:none;color:var(--ink2);font-size:14.5px;line-height:1.35;transition:background .2s,color .2s}
.side a:hover{background:var(--line2);color:var(--ink)}
.side a[aria-current="page"]{background:var(--brand-soft);color:var(--ink);font-weight:500}
.side a[aria-current="page"] .num{color:var(--brand-ink)}
.side .num{font-family:var(--display);font-variant-numeric:tabular-nums;color:var(--g50);font-size:12.5px;min-width:22px;font-weight:600}
.side .lv{margin-left:auto;font-size:11px;color:var(--ink3);white-space:nowrap;font-family:var(--display)}
.side .done .num{color:var(--green-ink)}
.side .done .num::after{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green-2);margin-left:4px;vertical-align:2px}
.side-top{display:grid;gap:6px;margin-bottom:6px}
.side-top a{font-family:var(--display);font-weight:500;color:var(--ink)}
.side-top a .num{font-size:15px;color:var(--brand)}
.g-navlink{background:var(--night);color:#fff!important}
.g-navlink:hover{background:var(--night-2)!important}
.g-navlink .num{color:var(--yellow)!important}
.g-navlink small{display:block;font-size:12px;color:rgba(255,255,255,.62);font-weight:400}
.side a.g-navlink[aria-current="page"]{background:var(--night-3)}


.kicker{font-family:var(--display);font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-ink);font-weight:600}
h1{font-family:var(--display);font-weight:700;font-size:clamp(34px,4.6cqw,56px);line-height:1.04;letter-spacing:-.032em;margin:10px 0 16px}
.lede{font-size:clamp(18px,1.6cqw,20.5px);line-height:1.6;color:var(--ink2);margin:0 0 26px;max-width:720px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 30px}
.chip{font-family:var(--display);font-size:13px;font-weight:500;border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:4px 12px;color:var(--ink2);text-decoration:none}
a.chip:hover{border-color:var(--brand);color:var(--brand-ink)}


.u-head{position:relative;margin:0 0 8px;padding-top:4px}
.u-num{font-family:var(--display);font-weight:700;font-size:15px;color:var(--brand-ink);display:flex;align-items:center;gap:12px;letter-spacing:.02em}
.u-num b{display:inline-grid;place-items:center;min-width:44px;height:44px;padding:0 10px;border-radius:14px 14px 14px 4px;background:var(--brand);color:#fff;font-size:18px;letter-spacing:0}
.u-num span{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}


details.plan{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);margin:0 0 40px;transition:box-shadow .2s}
details.plan[open]{box-shadow:var(--shadow)}
details.plan summary{cursor:pointer;padding:16px 20px;font-family:var(--display);font-weight:600;font-size:16px;list-style:none;display:flex;align-items:center;gap:12px}
details.plan summary::-webkit-details-marker{display:none}
details.plan summary::before{content:"";width:22px;height:22px;flex:none;border-radius:50%;background:var(--brand-soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 7l5 5-5 5' fill='none' stroke='%23874BF8' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat;transition:transform .25s var(--ease)}
details.plan[open] summary::before{transform:rotate(90deg)}
.plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 32px;padding:0 20px 20px}
.plan-grid h4{margin:14px 0 4px;font-family:var(--display);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-ink)}
.plan-grid ul{margin:0;padding-left:18px;font-size:15px;color:var(--ink2);line-height:1.55}


section.ex{margin:0 0 44px;scroll-margin-top:92px}
section.ex h2{font-family:var(--display);font-weight:700;font-size:clamp(23px,2.4cqw,28px);line-height:1.18;margin:0 0 14px;letter-spacing:-.022em}
section.ex h3{font-family:var(--display);font-size:17.5px;font-weight:600;margin:26px 0 8px;letter-spacing:-.01em}
section.ex p{margin:0 0 14px}
section.ex ul,section.ex ol{padding-left:22px}
section.ex li{margin:4px 0}
.tag{display:inline-block;font-family:var(--display);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-ink);margin-bottom:6px;font-weight:600}
table{position:relative;width:100%;border-collapse:separate;border-spacing:0;margin:16px 0 22px;font-size:15px;line-height:1.5;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden;display:block;overflow-x:auto}
table thead th{background:var(--brand-mist);font-family:var(--display);font-weight:600;font-size:13px;color:var(--ink);letter-spacing:.01em}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line2);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover td{background:#FCFBFF}


.exs{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:22px 22px 22px 6px;padding:16px 22px;margin:16px 0 22px}
.exs::before{content:"";position:absolute;left:-1px;bottom:-1px;width:14px;height:14px;background:var(--paper);border-left:1px solid var(--line);border-bottom:1px solid var(--line);border-radius:0 0 0 6px;transform:translate(-7px,0) skewX(32deg);display:none}
.exs .e{margin:8px 0}
.exs .s{font-family:var(--serif);font-size:18.5px;line-height:1.55;color:var(--ink)}
.exs .note{display:block;font-size:14.5px;color:var(--ink3);margin-top:2px}
.note-box{border-radius:var(--r-md);padding:14px 18px;margin:18px 0;font-size:15.5px;line-height:1.6}
.note-box.warn{background:var(--amber-soft);border:1px solid #FFE3A0}
.note-box.info{background:var(--brand-mist);border:1px solid #E6DBFF}
.note-box b:first-child{display:block;font-family:var(--display);font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
.note-box.warn b:first-child{color:var(--amber-ink)}
.note-box.info b:first-child{color:var(--brand-ink)}
.cite{color:var(--ink3);font-size:14px}
.x{color:var(--bad);font-style:italic;position:relative}
.x::before{content:"✗ ";font-style:normal;display:inline-block}
.ok{color:var(--good);position:relative}
.ok::before{content:"✓ ";display:inline-block}


.w{border-bottom:2.5px solid currentColor;padding:0 1px;font-weight:500}
.w-n{color:var(--c-n)}.w-pr{color:var(--c-pr)}.w-det{color:var(--c-det)}.w-v{color:var(--c-v)}.w-aux{color:var(--c-aux)}
.w-adj{color:var(--c-adj)}.w-adv{color:var(--c-adv)}.w-p{color:var(--c-p)}.w-cj{color:var(--c-cj)}.w-i{color:var(--c-i)}
.w-f{color:var(--ink);border-bottom:2px dotted var(--ink3)}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:13.5px;margin:6px 0 34px;padding:12px 16px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md)}
.legend b{font-family:var(--display);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-right:4px}
.legend span{display:inline-flex;align-items:center;gap:7px}
.legend i{width:16px;height:4px;border-radius:2px;display:inline-block}


.tree{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);padding:18px;margin:16px 0 22px;overflow-x:auto}
.tree .row{display:flex;gap:8px;flex-wrap:nowrap;min-width:max-content}
.tree .cst{border:1.5px solid var(--line);border-radius:14px 14px 14px 4px;padding:8px 12px 10px;text-align:center;background:var(--brand-mist)}
.tree .fn{display:block;font-family:var(--display);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);font-weight:600}
.tree .ph{display:block;font-family:var(--display);font-size:11.5px;color:var(--brand-ink);font-weight:600;margin-bottom:2px}
.tree .wd{font-family:var(--serif);font-size:18px}


.practice-head{margin:64px 0 22px;padding:30px 0 0;border-top:1px solid var(--line);position:relative}
.practice-head::before{content:"";position:absolute;top:-1px;left:0;width:72px;height:3px;background:var(--brand);border-radius:2px}
.practice-head h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,3cqw,36px);letter-spacing:-.028em;margin:6px 0 8px;line-height:1.1}
.practice-head p{color:var(--ink2);margin:0;max-width:640px}
.act{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);margin:0 0 24px;overflow:hidden;scroll-margin-top:92px}
.act-h{padding:20px 24px 16px;border-bottom:1px solid var(--line2)}
.act-h .tag{color:var(--brand-ink)}
.act-h h3{margin:0;font-family:var(--display);font-size:19px;font-weight:600;letter-spacing:-.012em}
.act-h p{margin:6px 0 0;color:var(--ink2);font-size:15px}
.act-b{padding:22px 24px 24px}
.prog{font-family:var(--display);font-size:13px;color:var(--ink3);margin-bottom:10px;display:flex;justify-content:space-between;gap:10px}
.q-s{font-family:var(--serif);font-size:21px;line-height:1.5;margin:4px 0 18px}
.q-s mark{background:#EFE6FF;padding:0 5px;border-radius:6px;color:inherit;box-shadow:inset 0 -2px 0 var(--brand)}
.opts{display:flex;flex-wrap:wrap;gap:8px}
.opt{border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:8px 18px;font-size:15px;color:var(--ink);transition:border-color .15s,background .15s,transform .12s var(--ease)}
.opt:hover:not([disabled]){border-color:var(--brand);background:var(--brand-mist)}
.opt:active:not([disabled]){transform:scale(.97)}
.opt[aria-pressed="true"]{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-ink)}
.opt.right{border-color:var(--green-2);background:var(--good-soft);color:var(--good)}
.opt.wrong{border-color:var(--orange-2);background:var(--bad-soft);color:var(--bad)}
.opt[disabled]{cursor:default}
.tok{border:1.5px solid transparent;background:transparent;border-radius:8px;padding:2px 5px;margin:0 1px;font-family:var(--serif);font-size:21px;color:var(--ink);transition:background .15s,border-color .15s}
.tok:hover:not([disabled]){background:var(--line2)}
.tok[aria-pressed="true"]{background:var(--brand-soft);border-color:var(--brand)}
.tok.right{background:var(--good-soft);border-color:var(--green-2)}
.tok.wrong{background:var(--bad-soft);border-color:var(--orange-2)}
.tok.missed{border-color:var(--green-2);border-style:dashed}
.tok.punct{padding:0;margin-left:-3px}
input.txt,textarea.txt{width:100%;font:inherit;font-size:17px;padding:12px 16px;border:1.5px solid var(--line);border-radius:14px;background:var(--paper);color:var(--ink);transition:border-color .15s,box-shadow .15s}
input.txt:focus,textarea.txt:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
textarea.txt{min-height:140px;font-size:16.5px;line-height:1.6}
.base{font-size:14.5px;color:var(--ink2);margin:-8px 0 12px}
.base b{font-family:var(--serif);font-size:17px;color:var(--ink)}
.tiles{display:flex;flex-wrap:wrap;gap:8px;min-height:52px;padding:10px;border:1.5px dashed var(--g25);border-radius:16px;margin-bottom:10px;background:var(--brand-mist)}
.tile{border:1.5px solid var(--line);background:var(--paper);border-radius:12px;padding:6px 14px;font-family:var(--serif);font-size:17.5px;box-shadow:0 2px 0 var(--line);transition:transform .12s var(--ease),border-color .15s}
.tile:hover{border-color:var(--brand);transform:translateY(-1px)}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;background:var(--brand);color:#fff;border-radius:999px;padding:11px 22px;font-family:var(--display);font-weight:600;font-size:15px;letter-spacing:-.005em;text-decoration:none;transition:background .2s,transform .12s var(--ease),box-shadow .2s;box-shadow:0 6px 16px -8px rgba(135,75,248,.7)}
.btn:hover{background:var(--brand-ink);color:#fff}
.btn:active{transform:scale(.97)}
.btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line);box-shadow:none}
.btn.ghost:hover{border-color:var(--brand);color:var(--brand-ink);background:var(--brand-mist)}
.btn[disabled]{opacity:.4;cursor:default;transform:none}

.fb{position:relative;margin-top:18px;border-radius:20px 20px 20px 6px;padding:14px 18px;font-size:15.5px;line-height:1.6;display:none}
.fb.show{display:block;animation:bubbleIn .35s var(--ease)}
.fb.good{background:var(--good-soft);border:1px solid var(--good-line)}
.fb.bad{background:var(--bad-soft);border:1px solid var(--bad-line)}
.fb.neutral{background:var(--brand-mist);border:1px solid #E6DBFF}
.fb strong{display:block;font-family:var(--display);margin-bottom:2px}
.fb.good strong{color:var(--good)}.fb.bad strong{color:var(--bad)}
@keyframes bubbleIn{from{opacity:0;transform:translateY(6px) scale(.98);transform-origin:0 100%}to{opacity:1;transform:none}}
.done-card{text-align:center;padding:14px 0}
.done-card .big{font-family:var(--display);font-weight:700;font-size:44px;letter-spacing:-.03em;color:var(--brand)}
.check{display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:15.5px}
.check input{margin-top:5px;width:18px;height:18px;accent-color:var(--brand)}
.wc{font-size:13px;color:var(--ink3);margin-top:6px}



.trl{display:block;font-family:var(--sans);font-size:.92em;font-weight:400;font-style:normal;line-height:1.6;letter-spacing:0;text-transform:none;color:var(--ink2);margin:5px 0 0;padding:1px 0 1px 12px;border-left:2px solid var(--tl-c,var(--line))}
.trl[lang=kk]{--tl-c:#8FDDFB}
.trl[lang=ru]{--tl-c:#FFC2A0}
.trl::before{content:attr(data-l);font-family:var(--display);font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--ink3);margin-right:8px;vertical-align:1px}
.trl + .trl{margin-top:4px}
div.trl{margin:-8px 0 16px}
div.trl + div.trl{margin-top:-10px}
.trl.trl-h{margin:-4px 0 12px;font-size:15px}
h1 .trl{font-size:max(15px,.36em);line-height:1.4;margin-top:10px}
h2 .trl{font-size:max(14.5px,.6em);line-height:1.45;margin-top:6px}
h3 .trl{font-size:14.5px;margin-top:4px}
.lede .trl{font-size:.88em}
td .trl,th .trl,li .trl{font-size:.9em;margin-top:3px}
th .trl{font-weight:400}
.exs .note .trl{font-size:1em;margin-top:2px}
.note-box > .trl,.note-box .trl{margin:8px 0 0;font-size:.95em}
.note-box .trl + .trl{margin-top:12px}
.note-box .trl b:first-child{display:inline;font-size:inherit;letter-spacing:0;text-transform:none;margin:0 6px 0 0;color:var(--ink)}
.toc-r b .trl{font-family:var(--sans);font-size:14px;font-weight:400;letter-spacing:0}
.toc-r small .trl{font-size:1em}
.hero .trl,.door-play .trl{color:rgba(255,255,255,.8)}
.hero .trl::before,.door-play .trl::before{color:rgba(255,255,255,.6)}
.hero .trl[lang=kk],.door-play .trl[lang=kk]{--tl-c:rgba(10,199,255,.7)}
.hero .trl[lang=ru],.door-play .trl[lang=ru]{--tl-c:rgba(255,125,29,.75)}
.plan-grid li .trl{font-size:.95em}
.langs button[aria-pressed="true"][data-lang="kk"]{color:var(--cyan-ink)}
.langs button[aria-pressed="true"][data-lang="ru"]{color:var(--orange-ink)}

.refs p{padding-left:30px;text-indent:-30px;margin:0 0 12px;font-size:15.5px;overflow-wrap:anywhere}
.pager{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:56px;padding-top:28px;border-top:1px solid var(--line)}
.pager a{text-decoration:none;border:1px solid var(--line);background:var(--paper);border-radius:var(--r-md);padding:14px 18px;color:var(--ink);font-family:var(--display);font-weight:600;font-size:16px;line-height:1.3;transition:border-color .2s,transform .2s var(--ease),box-shadow .2s}
.pager a:hover{border-color:var(--brand);transform:translateY(-2px);box-shadow:var(--shadow)}
.pager a small{display:block;color:var(--ink3);font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:4px}
.foot{margin-top:72px;padding:28px 0 0;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:14px 28px;align-items:center;color:var(--ink3);font-size:14px}
.foot .logo{width:120px}
.foot .slogan{font-family:var(--display);color:var(--brand-ink);font-weight:500}
.foot nav{margin-left:auto;display:flex;gap:18px;flex-wrap:wrap}
.foot nav a{color:var(--ink2);text-decoration:none;font-family:var(--display);font-weight:500}
.foot nav a:hover{color:var(--brand-ink)}


.hero{position:relative;overflow:hidden;background:var(--brand);color:#fff;border-radius:var(--r-xl);padding:clamp(28px,5cqw,72px) clamp(24px,5cqw,72px) clamp(32px,4.5cqw,64px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(24px,4cqw,56px);align-items:center;isolation:isolate}
.hero::before{content:"";position:absolute;right:-12%;top:-30%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.14),rgba(255,255,255,0));z-index:-1}
.hero-mark{position:absolute;left:-2%;bottom:-11%;width:104%;opacity:.09;z-index:-1;pointer-events:none;--logo-k:#fff;--logo-a:#fff}
.hero .kicker{color:rgba(255,255,255,.78);display:flex;align-items:center;gap:12px}
.hero .kicker::before{content:"";width:28px;height:1.5px;background:currentColor}
.hero h1{font-size:clamp(48px,7.6cqw,104px);line-height:.94;letter-spacing:-.045em;margin:18px 0 22px;color:#fff}
.hero h1 em{font-style:normal;color:var(--cyan)}
.hero .lede{color:rgba(255,255,255,.88);font-size:clamp(18px,1.7cqw,22px);max-width:560px;margin-bottom:34px}
.hero .bar{margin:0;gap:12px}
.hero .btn{background:#fff;color:var(--brand-ink);box-shadow:0 12px 28px -14px rgba(20,12,43,.6)}
.hero .btn:hover{background:var(--brand-mist);color:var(--brand-ink)}
.hero .btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}
.hero .btn.ghost:hover{background:rgba(255,255,255,.1);border-color:#fff;color:#fff}
.hero-meta{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:34px;font-family:var(--display);font-size:14px;color:rgba(255,255,255,.75)}
.hero-meta b{color:#fff;font-weight:600}

.lw{position:relative;aspect-ratio:1/0.96;max-width:500px;width:100%;justify-self:center}
.lw-bub{position:absolute;inset:6% 4% 4% 8%;color:#fff;filter:drop-shadow(0 30px 40px rgba(20,12,43,.28))}
.lw-bub svg{width:100%;height:100%;display:block}
.lw-core{position:absolute;inset:6% 4% 4% 8%;display:grid;place-content:center;justify-items:center;text-align:center;color:var(--ink);padding:0 12%}
.lw-cap{font-family:var(--display);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);font-weight:600}
.lw-word{font-family:var(--serif);font-size:clamp(54px,7cqw,92px);line-height:1.05;letter-spacing:-.02em;margin:6px 0 12px;transition:color .5s var(--ease)}
.lw-cls{font-family:var(--display);font-weight:600;font-size:15px;padding:6px 16px;border-radius:999px;color:#fff;background:var(--ink);transition:background .5s var(--ease)}
.lw-says{position:absolute;max-width:62%;font-family:var(--serif);font-size:clamp(15px,1.4cqw,18px);line-height:1.35;padding:11px 16px 12px;border-radius:18px 18px 18px 4px;background:var(--paper);color:var(--ink);box-shadow:0 14px 30px -14px rgba(20,12,43,.45);border:0;text-align:left;transition:opacity .45s var(--ease),transform .45s var(--ease)}
.lw-says small{display:block;font-family:var(--display);font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--ink3);margin-bottom:2px}
.lw-says .k{border-bottom:2.5px solid currentColor}
.lw-says.a{left:-4%;top:6%}
.lw-says.b{right:-6%;bottom:2%;border-radius:18px 18px 4px 18px}
.lw-says:not(.on){opacity:.55;transform:scale(.96)}
.lw-says.on{opacity:1;transform:none}
.lw-dots{position:absolute;left:50%;bottom:-34px;transform:translateX(-50%);display:flex;gap:8px}
.lw-dots button{width:28px;height:4px;border-radius:2px;border:0;background:rgba(255,255,255,.35);padding:0}
.lw-dots button[aria-pressed="true"]{background:#fff}

.doors{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;margin:22px 0 0}
.door{position:relative;overflow:hidden;border-radius:var(--r-xl);padding:34px 36px;min-height:280px;display:flex;flex-direction:column;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--line);transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.door:hover{transform:translateY(-4px);box-shadow:var(--shadow-up);color:var(--ink)}
.door .kicker{margin-bottom:12px}
.door h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,3cqw,40px);line-height:1.02;letter-spacing:-.035em;margin:0 0 12px}
.door p{margin:0 0 18px;color:var(--ink2);max-width:460px}
.door .go{margin-top:auto;display:inline-flex;align-items:center;gap:10px;font-family:var(--display);font-weight:600;color:var(--brand-ink)}
.door .go i{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--brand);color:#fff;font-style:normal;transition:transform .35s var(--ease)}
.door:hover .go i{transform:translateX(4px)}
.door-read .stats{display:flex;gap:28px;margin:4px 0 22px;flex-wrap:wrap}
.door-read .stats div{font-family:var(--display);font-size:13px;color:var(--ink3);line-height:1.3}
.door-read .stats b{display:block;font-size:34px;color:var(--ink);letter-spacing:-.03em;font-weight:700}
.door-play{background:var(--night);color:#fff;border-color:var(--night)}
.door-play:hover{color:#fff}
.door-play .kicker{color:var(--yellow)}
.door-play p{color:rgba(255,255,255,.74)}
.door-play .go{color:#fff}
.door-play .go i{background:var(--yellow);color:var(--night)}
.door-play svg.sky{position:absolute;right:0;bottom:0;width:100%;height:56%;pointer-events:none;opacity:.95}
.door-play > *:not(svg){position:relative}

.toc{margin:88px 0 0}
.sec-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 24px;margin:0 0 26px}
.sec-h h2{font-family:var(--display);font-weight:700;font-size:clamp(32px,4cqw,52px);letter-spacing:-.04em;line-height:1;margin:6px 0 0}
.sec-h p{margin:0;color:var(--ink2);max-width:440px}
.toc-g{display:grid;grid-template-columns:240px minmax(0,1fr);gap:8px 40px;padding:28px 0;border-top:1px solid var(--line)}
.toc-g h3{font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:16px 0 0}
.toc-g h3 .sn{display:block;font-size:30px;letter-spacing:-.03em;text-transform:none;color:var(--brand);font-weight:700;margin-bottom:6px}
.toc-r{display:grid;grid-template-columns:62px minmax(0,1fr) auto 40px;align-items:center;gap:6px 18px;padding:16px 14px;margin:0 -14px;border-radius:var(--r-md);text-decoration:none;color:var(--ink);transition:background .25s var(--ease)}
.toc-r + .toc-r{border-top:1px solid var(--line2)}
.toc-r:hover{background:var(--paper);box-shadow:var(--shadow);color:var(--ink)}
.toc-r .n{font-family:var(--display);font-weight:700;font-size:28px;letter-spacing:-.03em;color:var(--g25);transition:color .25s}
.toc-r:hover .n{color:var(--brand)}
.toc-r b{display:block;font-family:var(--display);font-size:19px;font-weight:600;letter-spacing:-.015em;line-height:1.3}
.toc-r small{display:block;color:var(--ink3);font-size:14.5px;line-height:1.45;margin-top:2px}
.toc-r .lv{font-family:var(--display);font-size:12.5px;font-weight:600;color:var(--ink2);border:1px solid var(--line);border-radius:999px;padding:3px 10px;white-space:nowrap}
.toc-r .ar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--brand);background:var(--brand-soft);opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .25s var(--ease)}
.toc-r:hover .ar{opacity:1;transform:none}
.toc-r.done .n{color:var(--green-2)}

.dn h2{font-family:var(--display);font-weight:700;font-size:28px;letter-spacing:-.025em;margin:48px 0 12px}
.dn h3{font-family:var(--display);font-size:18px;margin:24px 0 8px}
.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin:14px 0 24px}
.sw div{border-radius:16px 16px 16px 4px;padding:56px 12px 10px;font-family:var(--display);font-size:12.5px;font-weight:600;border:1px solid rgba(0,0,0,.06)}
.spec{border:1px solid var(--line);background:var(--paper);border-radius:var(--r-md);padding:18px 22px;margin:12px 0}
.spec .l{font-family:var(--display);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);font-weight:600}


:host{--g-acc:var(--brand);--g-ink:var(--brand-ink);--g-on:#fff;--g-sky:#EDE6FF;--g-road:#D6C6FF}
.g-unitcase{position:relative;overflow:hidden;display:grid;gap:4px;margin:44px 0 0;padding:26px 28px 26px 112px;border-radius:var(--r-lg);text-decoration:none;color:#fff;background:var(--night);transition:transform .3s var(--ease),box-shadow .3s}
.g-unitcase:hover{transform:translateY(-3px);box-shadow:var(--shadow-up);color:#fff}
.g-unitcase::before{content:attr(data-mark);position:absolute;left:28px;top:50%;transform:translateY(-50%);width:62px;height:60px;display:grid;place-items:center;border-radius:22px 22px 22px 6px;background:var(--g-acc);color:var(--g-on);font-family:var(--display);font-weight:700;font-size:20px}
.g-unitcase .kicker{color:var(--yellow)}
.g-unitcase b{font-family:var(--display);font-size:24px;font-weight:700;letter-spacing:-.025em;line-height:1.15}
.g-unitcase span:not(.kicker){color:rgba(255,255,255,.7);font-size:14.5px}
.g-unitcase em{font-style:normal;font-family:var(--display);font-weight:600;color:#fff;margin-top:8px}

.g-hero{position:relative;overflow:hidden;border-radius:var(--r-xl);background:var(--night);color:#fff;isolation:isolate}
.g-hero-t{position:relative;padding:clamp(28px,4.6cqw,64px) clamp(24px,4.6cqw,64px) 0;max-width:820px}
.g-hero .kicker{color:var(--yellow)}
.g-hero h1{color:#fff;font-size:clamp(42px,6.4cqw,84px);line-height:.96;letter-spacing:-.045em;margin:14px 0 18px}
.g-hero .lede{color:rgba(255,255,255,.78);margin:0;max-width:640px;font-size:clamp(16.5px,1.5cqw,19px)}
.g-mapwrap{position:relative;margin-top:8px}
.g-city{display:block;width:100%;height:auto}
.g-stn{cursor:pointer;outline:none}
.g-stn .b{transition:transform .3s var(--ease);transform-box:fill-box;transform-origin:20% 100%}
.g-stn:hover .b,.g-stn:focus-visible .b{transform:scale(1.14) translateY(-2px)}
.g-stn:focus-visible .b{stroke:var(--cyan);stroke-width:3}
.g-stn.locked{cursor:not-allowed}
.g-stn-l{font-family:var(--display);font-weight:500;letter-spacing:.01em}
.g-hub-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 18px;margin:0;padding:18px clamp(20px,4.6cqw,64px) 26px;font-family:var(--display);font-size:14.5px;color:rgba(255,255,255,.75);border-top:1px solid rgba(255,255,255,.08)}
.g-hub-bar > span:first-child b{color:#fff}
.g-hub-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.g-hub-bar .btn.ghost{color:#fff;border-color:rgba(255,255,255,.28);padding:8px 16px;font-size:14px}
.g-hub-bar .btn.ghost:hover{background:rgba(255,255,255,.08);border-color:#fff;color:#fff}
.g-switch{display:inline-flex;gap:8px;align-items:center;font-size:14px;cursor:pointer}
.g-switch input{accent-color:var(--yellow);width:16px;height:16px}
.btn{text-decoration:none}
.g-list-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:64px 0 18px}
.g-list-h h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,3.4cqw,40px);letter-spacing:-.035em;margin:6px 0 0;line-height:1}
.g-caselist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.g-case{position:relative;display:grid;grid-template-columns:56px minmax(0,1fr);gap:2px 16px;align-items:start;padding:20px 20px 18px;border:1px solid var(--line);border-radius:var(--r-lg);background:var(--paper);text-decoration:none;color:var(--ink);transition:transform .3s var(--ease),box-shadow .3s,border-color .3s}
.g-case:hover{transform:translateY(-3px);box-shadow:var(--shadow-up);border-color:transparent;color:var(--ink)}
.g-case-e{grid-row:1/5;width:52px;height:50px;display:grid;place-items:center;border-radius:18px 18px 18px 5px;background:var(--g-acc);color:var(--g-on);font-family:var(--display);font-weight:700;font-size:15px}
.g-case b{font-family:var(--display);font-size:18.5px;font-weight:600;line-height:1.25;letter-spacing:-.015em}
.g-case-n{font-family:var(--display);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);font-weight:600}
.g-case-p{font-size:14px;color:var(--ink3);line-height:1.4}
.g-case-s{margin-top:8px;justify-self:start;font-family:var(--display);font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--line2);color:var(--ink2)}
.g-case.closed .g-case-s{background:var(--good-soft);color:var(--good)}
.g-case.locked{background:transparent;border-style:dashed;box-shadow:none}
.g-case.locked:hover{transform:none;border-color:var(--g25)}
.g-caselist .g-case:last-child:nth-child(4n+1){grid-column:1/-1}
.g-case.locked .g-case-e{background:var(--line2);color:var(--g50)}
.g-case.locked b{color:var(--ink3)}

.g-back{display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;font-family:var(--display);font-weight:500;font-size:14.5px;text-decoration:none;color:var(--ink2)}
.g-back:hover{color:var(--brand-ink)}
.g-banner{position:relative;overflow:hidden;display:flex;gap:24px;align-items:center;margin-bottom:18px;padding:30px 34px;border-radius:var(--r-xl);background:var(--night);color:#fff;isolation:isolate}
.g-banner::after{content:"";position:absolute;right:-60px;top:-80px;width:320px;height:320px;border-radius:50%;background:var(--g-acc);opacity:.22;filter:blur(60px);z-index:-1}
.g-banner .kicker{color:var(--yellow)}
.g-banner h1{color:#fff;margin:8px 0 12px;font-size:clamp(32px,4.4cqw,52px)}
.g-banner .chips{margin:0}
.g-banner .chip{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff}
.g-banner a.chip:hover{border-color:#fff;color:#fff}
.g-emb{width:88px;height:84px;flex:none;filter:drop-shadow(0 12px 24px rgba(0,0,0,.35))}
.g-brief{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:end;margin:0 0 22px}
.g-who{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;width:92px}
.g-who b{display:block;font-family:var(--display);font-size:13.5px;line-height:1.25}.g-who span{display:block;font-size:12px;color:var(--ink3);line-height:1.3}
.g-por{width:60px;height:58px;flex:none}
.g-brief-t{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:24px 24px 24px 6px;padding:20px 24px;box-shadow:var(--shadow)}
.g-brief-t p{margin:0 0 10px}.g-brief-t p:last-child{margin:0}
.g-steps{list-style:none;margin:0 0 22px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;counter-reset:s}
.g-steps button{width:100%;height:100%;display:flex;gap:12px;align-items:center;text-align:left;background:var(--paper);border:1.5px solid var(--line);border-radius:var(--r-md);padding:12px 14px;color:var(--ink);transition:border-color .2s,transform .2s var(--ease)}
.g-steps button:hover:not([disabled]){border-color:var(--g-acc);transform:translateY(-1px)}
.g-steps button[disabled]{opacity:.5;cursor:not-allowed;background:transparent;border-style:dashed}
.g-steps b{display:block;font-family:var(--display);font-size:14.5px;line-height:1.25;font-weight:600}.g-steps small{font-size:12px;color:var(--ink3)}
.g-sn{width:30px;height:28px;border-radius:12px 12px 12px 4px;display:grid;place-items:center;font-family:var(--display);font-size:13px;font-weight:700;background:var(--line2);color:var(--ink2);flex:none;transition:background .25s}
.g-steps li.on button{border-color:var(--g-acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--g-acc) 22%,transparent)}
.g-steps li.on .g-sn{background:var(--g-acc);color:var(--g-on)}
.g-steps li.done .g-sn{background:var(--green-2);color:#fff}
.g-stage{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:28px 30px;scroll-margin-top:90px;animation:viewIn .45s var(--ease)}
.g-stage-h .kicker{color:var(--g-ink)}
.g-stage-h h2{font-family:var(--display);font-size:clamp(24px,2.6cqw,30px);font-weight:700;letter-spacing:-.025em;margin:6px 0 8px;line-height:1.15}
.g-intro{color:var(--ink2);margin-bottom:18px}.g-intro p{margin:0 0 8px}
.g-prog{display:flex;justify-content:space-between;align-items:center;gap:14px;font-family:var(--display);font-size:13px;color:var(--ink3);margin-bottom:16px}
.g-prog-b{flex:1;height:6px;border-radius:3px;background:var(--line2);overflow:hidden}
.g-prog-b i{display:block;height:100%;background:var(--g-acc);border-radius:3px;transition:width .5s var(--ease)}
.g-tag{display:inline-block;font-family:var(--display);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;background:var(--amber-soft);color:var(--amber-ink);border-radius:999px;padding:3px 12px;margin-bottom:10px;font-weight:600}
.g-task{font-size:15.5px;color:var(--ink2);margin:0 0 12px}
.g-task mark,.g-doc mark{background:var(--brand-soft);color:var(--brand-ink);border-radius:6px;padding:0 4px;box-shadow:inset 0 -2px 0 var(--brand)}
.g-count{font-family:var(--display);font-weight:600;color:var(--g-ink);margin-left:6px}
.g-doc{font-family:var(--serif);font-size:20px;line-height:1.9;background:var(--brand-mist);border:1px solid var(--line);border-radius:20px;padding:20px 24px}
.g-w,.g-cand{font:inherit;background:transparent;border:0;border-radius:6px;padding:0 2px;color:inherit;cursor:pointer;transition:background .15s}
.g-w:hover:not([disabled]),.g-cand:hover{background:rgba(135,75,248,.12)}
.g-w.found{background:var(--good-soft);color:var(--good);box-shadow:inset 0 -2px 0 var(--green-2)}
.g-w.wrong,.g-cand.wrong{background:var(--bad-soft);animation:gShake .4s}
.g-cand{border-bottom:2px dotted var(--g50)}
.g-cand.right{background:var(--good-soft);border-bottom-color:var(--green-2)}
@keyframes gShake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.g-notes{margin-top:12px;max-height:200px;overflow:auto}
.g-note{margin:6px 0;font-size:14.5px;padding:8px 12px;border-radius:14px 14px 14px 4px}
.g-note.ok{background:var(--good-soft)}.g-note.bad{background:var(--bad-soft)}
.g-card{margin:6px auto 20px;max-width:540px;text-align:center;background:var(--paper);border:1.5px solid var(--line);border-radius:24px 24px 24px 6px;padding:22px;box-shadow:var(--shadow-up);cursor:grab;transition:transform .3s var(--ease),opacity .3s}
.g-card.in{transform:scale(.92) translateY(6px);opacity:.6}.g-card.shake{animation:gShake .4s}
.g-card-w{display:block;font-family:var(--serif);font-size:30px;line-height:1.2}
.g-card-c{display:block;margin-top:8px;color:var(--ink2);font-size:15.5px}
.g-bins{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.g-bin{min-height:72px;border:1.5px dashed var(--g25);border-radius:var(--r-md);background:var(--paper);font-family:var(--display);font-weight:600;color:var(--ink);padding:12px;transition:border-color .15s,background .15s,transform .12s var(--ease)}
.g-bin:hover:not([disabled]),.g-bin.over{border-color:var(--g-acc);border-style:solid;background:var(--brand-mist)}
.g-bin:active:not([disabled]){transform:scale(.98)}
.g-bin.right{border-style:solid;border-color:var(--green-2);background:var(--good-soft);color:var(--good)}
.g-bin.wrong{border-style:solid;border-color:var(--orange-2);background:var(--bad-soft);color:var(--bad)}
.g-sent{font-family:var(--serif);font-size:22px;line-height:1.6;margin:4px 0 14px}
.g-sent mark{background:#EFE6FF;border-radius:6px;padding:0 5px;box-shadow:inset 0 -2px 0 var(--brand)}
.g-slot{display:inline-block;min-width:96px;text-align:center;border-bottom:2.5px solid var(--g-acc);color:var(--g-ink);font-weight:600}
.g-slot.ok{color:var(--good);border-color:var(--green-2)}.g-slot.fix{color:var(--bad);border-color:var(--orange-2)}
.g-base{font-size:14.5px;color:var(--ink2);margin:-4px 0 12px}.g-base b{font-family:var(--serif);font-size:18px;color:var(--ink)}
.g-forge{display:flex;gap:10px}.g-forge .txt{flex:1}
.g-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.g-chip{border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:5px 14px;font-size:14.5px;transition:border-color .15s}
.g-chip:hover{border-color:var(--g-acc)}
.g-hint{background:none;border:0;color:var(--brand-ink);padding:8px 0;font-size:14.5px;text-decoration:underline;text-underline-offset:3px}
.g-hinttext{font-size:14.5px;color:var(--ink2);background:var(--brand-mist);padding:10px 14px;border-radius:14px 14px 14px 4px}
.g-faultline .g-w{border-bottom:1px dashed transparent}.g-faultline .g-w:hover{border-bottom-color:var(--g50)}
.g-opts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.g-repair{margin-top:14px}
.g-chat{display:grid;gap:10px;margin-bottom:16px}
.g-line{max-width:84%;background:var(--line2);border-radius:20px 20px 20px 5px;padding:10px 16px;font-size:16px;line-height:1.5;animation:bubbleIn .35s var(--ease)}
.g-line b{display:block;font-family:var(--display);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}
.g-line.me{justify-self:end;background:var(--brand);color:#fff;border-radius:20px 20px 5px 20px}
.g-line.me b{color:rgba(255,255,255,.72)}
.g-say .opt{text-align:left;border-radius:18px 18px 18px 5px}
.g-strip{min-height:58px;border:1.5px dashed var(--g25);border-radius:var(--r-md);padding:10px;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;background:var(--brand-mist)}
.g-strip.ok{border-style:solid;border-color:var(--green-2);background:var(--good-soft)}.g-strip.bad{border-style:solid;border-color:var(--orange-2);background:var(--bad-soft)}
.g-pool{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.g-bar,.g-bar2{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.g-fb{display:none;margin-top:18px;border-radius:20px 20px 20px 6px;padding:14px 18px;font-size:15.5px;line-height:1.6}
.g-fb.show{display:block;animation:bubbleIn .35s var(--ease)}.g-fb.good{background:var(--good-soft);border:1px solid var(--good-line)}.g-fb.bad{background:var(--bad-soft);border:1px solid var(--bad-line)}
.g-fb strong{display:block;font-family:var(--display);margin-bottom:2px}.g-fb.good strong{color:var(--good)}.g-fb.bad strong{color:var(--bad)}
.g-again{display:block;margin-top:6px;font-size:13.5px;color:var(--ink3)}
.g-plan{width:100%;height:auto;display:block;border-radius:var(--r-md);border:1px solid var(--line)}
.g-spot{cursor:pointer}.g-spot rect{transition:stroke .15s,fill .15s}.g-spot:hover rect,.g-spot:focus rect{stroke:var(--g-acc);stroke-width:3}
.g-spot.right rect{fill:var(--good-soft);stroke:var(--green-2);stroke-width:3}.g-spot.wrong rect{fill:var(--bad-soft);stroke:var(--orange-2);stroke-width:3}
.g-brief-mini{background:var(--paper);border:1px solid var(--line);border-radius:20px 20px 20px 5px;padding:12px 18px;margin-bottom:12px;font-family:var(--serif);font-size:17.5px;box-shadow:var(--shadow)}
.g-slots{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.g-ph{display:grid;gap:2px;justify-items:center;border:1.5px solid var(--line);border-radius:16px 16px 16px 5px;background:var(--paper);padding:8px 14px 10px;min-width:76px;transition:border-color .15s,transform .12s var(--ease)}
.g-ph:hover:not([disabled]){border-color:var(--g-acc)}
.g-ph:active:not([disabled]){transform:scale(.97)}
.g-ph-l{font-family:var(--display);font-size:12.5px;font-weight:700;letter-spacing:.08em;color:var(--g-ink)}
.g-ph-w{font-family:var(--serif);font-size:19px;color:var(--ink)}
.g-ph.right{border-color:var(--green-2);background:var(--good-soft)}.g-ph.wrong{border-color:var(--orange-2);background:var(--bad-soft)}
.g-legend{font-size:13.5px;color:var(--ink3)}
.g-done,.g-closed{text-align:left}
.g-learned{background:var(--brand-mist);border:1px solid #E6DBFF;border-radius:20px 20px 20px 6px;padding:14px 18px}
.g-sum{font-size:15px;color:var(--ink2)}
.g-closed .kicker{color:var(--green-ink)}
.g-closed h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,3.4cqw,40px);letter-spacing:-.03em;margin:6px 0 14px;line-height:1.08}
.g-debrief p{margin:0 0 12px}
.g-confetti{position:fixed;inset:0;pointer-events:none;z-index:99}
.g-lead{font-weight:500}
.dossier table{font-size:14.5px}
.dossier .refs{overflow-wrap:anywhere}
.dossier section.ex{margin-bottom:40px}


@container posw (max-width:1180px){
  .hero{grid-template-columns:1fr}
  .lw{max-width:420px;margin-bottom:28px}
  .doors{grid-template-columns:1fr}
  .toc-g{grid-template-columns:1fr;gap:0}
  .toc-g h3{margin:0 0 8px}
  .toc-g h3 .sn{display:inline;font-size:13px;color:var(--brand-ink);margin:0 8px 0 0;letter-spacing:.14em}
}
@container posw (max-width:980px){
  .wrap{grid-template-columns:1fr}
  .menu-btn{display:inline-flex}
  nav.side{position:fixed;left:var(--pos-x,0px);top:var(--pos-y,68px);width:min(340px,88cqw);height:calc(100vh - var(--pos-y,68px));background:var(--paper);z-index:35;transform:translateX(-104%);transition:transform .3s var(--ease);box-shadow:0 24px 60px -20px rgba(20,12,43,.35);border-right:1px solid var(--line)}
  nav.side.open{transform:none}
  .main{padding:30px 22px 80px}
  .posw.full .main{padding:18px 16px 80px}
  .plan-grid{grid-template-columns:1fr}
}
@container posw (max-width:760px){
  .g-brief{grid-template-columns:1fr}.g-who{flex-direction:row;width:auto;text-align:left;align-items:center}
  .g-brief-t{border-radius:6px 24px 24px 24px}
  .g-stage{padding:20px 16px}.g-sent{font-size:20px}.g-doc{font-size:18px;padding:14px 16px}
  .g-banner{padding:22px 20px;gap:14px;align-items:flex-start}.g-emb{width:58px;height:56px}
  .g-forge{flex-direction:column}
  .g-unitcase{padding:96px 22px 22px}.g-unitcase::before{top:24px;left:22px;transform:none}
  .toc-r{grid-template-columns:44px minmax(0,1fr);padding:14px 10px;margin:0 -10px}
  .toc-r .n{font-size:22px}.toc-r .lv{grid-column:2;justify-self:start}.toc-r .ar{display:none}
  .door{padding:26px 24px;min-height:0}
  .pager{grid-template-columns:1fr}
  .foot nav{margin-left:0}
}
@container posw (max-width:560px){
  .top-in{padding:0 12px;gap:8px;height:60px}
  
  .brand{gap:10px}.brand .logo{width:88px}.brand-rule,.brand-name{display:none}
  .menu-btn{padding:6px 10px}.menu-btn span{display:none}
  .langs{padding:3px}.langs button{padding:6px 9px;font-size:13px}
  .q-s{font-size:19px}.tok{font-size:19px}
  .act-b,.act-h{padding-left:16px;padding-right:16px}
  .hero{padding:30px 22px 64px;border-radius:24px}
  .hero h1{font-size:52px}
  .lw-says{max-width:74%;font-size:14.5px;padding:9px 12px}
  .lw-says.a{left:-2%;top:0}.lw-says.b{right:-2%}
  .hero-meta{gap:6px 16px}
  .g-hero{border-radius:24px}
  .g-caselist{grid-template-columns:1fr}
  .g-stn-l{display:none}
  .hero .kicker::before{display:none}
}


.tabs{display:flex;gap:4px;margin-left:8px;padding:4px;border-radius:999px;background:var(--line2)}
.tabs a{font-family:var(--display);font-weight:600;font-size:14.5px;text-decoration:none;color:var(--ink2);padding:7px 18px;border-radius:999px;transition:background .2s,color .2s}
.tabs a:hover{color:var(--ink)}
.tabs a[aria-current="page"]{background:var(--brand);color:#fff;box-shadow:0 4px 12px -6px rgba(135,75,248,.8)}
.tabs a[data-tab="play"][aria-current="page"]{background:var(--night);box-shadow:0 4px 12px -6px rgba(20,12,43,.8)}
.menu-btn,.posw.full .menu-btn{display:none!important}
.u-num em{font-style:normal;margin-left:auto;font-family:var(--display);font-size:12.5px;font-weight:600;color:var(--ink2);border:1px solid var(--line);border-radius:999px;padding:3px 11px;letter-spacing:0}
.u-head{margin-bottom:28px}
.practice-head h2{margin-top:0}

.ls{margin:72px auto 0;max-width:980px}
.ls-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin-bottom:18px}
.ls-head h2{font-family:var(--display);font-weight:700;font-size:clamp(30px,3.6cqw,46px);letter-spacing:-.035em;line-height:1.02;margin:6px 0 8px}
.ls-head p{margin:0;color:var(--ink2)}
.ls-stage{border-radius:var(--r-xl) var(--r-xl) 0 0;overflow:hidden;border:1px solid var(--line);border-bottom:0;background:#F2ECFF}
.ls-scene{display:block;width:100%;height:auto}
.ls-strip{position:relative;display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 8px;padding:26px 24px 18px;background:var(--paper);border:1px solid var(--line);border-top:0;border-bottom:0;font-family:var(--serif);font-size:clamp(20px,2.2cqw,26px)}
.ls-w{position:relative;font:inherit;border:0;background:transparent;padding:2px 4px 4px;border-radius:10px;color:var(--ink);border-bottom:3px solid var(--wc);display:grid;justify-items:center;transition:background .2s,transform .2s var(--ease)}
.ls-w small{font-family:var(--display);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--wc);font-weight:700;line-height:1;margin-top:5px;opacity:.75}
.ls-w:hover{background:var(--brand-mist);transform:translateY(-2px)}
.ls-w.on{background:color-mix(in srgb,var(--wc) 14%,#fff);transform:translateY(-3px)}
.ls-w.on small{opacity:1}
.ls-w.rel{background:var(--line2)}
.ls-p{align-self:flex-start;margin-left:-6px}
.ls-link{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.ls-cap{min-height:86px;padding:16px 24px 20px;background:var(--paper);border:1px solid var(--line);border-top:1px solid var(--line2);border-radius:0 0 var(--r-xl) var(--r-xl)}
.ls-cap p{margin:0;font-size:16.5px}
.ls-cap b{font-family:var(--display)}
.ls-cat{transition:transform .5s var(--ease)}
.ls-cat-s{transition:transform .5s var(--ease);transform-box:fill-box;transform-origin:50% 100%}
.ls-wall-b{fill:#B58CFF;transition:fill .6s}
.ls-scene.is-old .ls-wall-b{fill:#8B7AA8}
.ls-crack,.ls-moss{opacity:0;transition:opacity .6s}
.ls-scene.is-old .ls-crack,.ls-scene.is-old .ls-moss{opacity:1}
.ls-path,.ls-path-h{opacity:0;transition:opacity .4s}
.ls-scene.fx-path .ls-path{opacity:1;animation:march 1s linear infinite}
.ls-scene.fx-path .ls-path-h{opacity:1}
.ls-scene.fx-path .ls-top{animation:glow 1s ease-in-out infinite alternate}
@keyframes march{to{stroke-dashoffset:-32}}
@keyframes glow{to{fill:#FFF805}}
.ls-scene.fx-wall .ls-wall-b{fill:#FFAD00}
.ls-scene.fx-cat .ls-spot,.ls-scene.fx-the .ls-spot{opacity:.28}
.ls-scene.fx-cat .ls-cat-s{animation:hop .5s var(--ease) 2}
@keyframes hop{50%{transform:translateY(-10px)}}
.ls-scene.fx-speed .ls-speed{opacity:1;transition:opacity .2s}
.ls-scene.fx-sleep .ls-eyes{opacity:0}
.ls-scene.fx-sleep .ls-shut{opacity:1}
.ls-scene.fx-sleep .ls-zzz{opacity:1;animation:zz 1.6s ease-in-out infinite}
@keyframes zz{50%{transform:translateY(-6px)}}
.ls-label{transition:opacity .3s}

.g-hub-bar{gap:12px 22px}
.g-go{display:inline-flex;flex-direction:column;align-items:flex-start;gap:0;line-height:1.2;padding:12px 24px;background:var(--yellow);color:var(--night);box-shadow:0 10px 26px -12px rgba(255,248,5,.6)}
.g-go span{font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.g-go b{font-size:17px}
.g-go:hover{background:#fff;color:var(--night)}
.g-hub-p{margin-right:auto}
.g-snd{background:transparent;border:1.5px solid rgba(255,255,255,.28);color:#fff;border-radius:999px;padding:8px 16px;font-family:var(--display);font-weight:500;font-size:14px}
.g-snd:hover{border-color:#fff}
.g-stn.next .b{animation:nextPulse 1.6s ease-in-out infinite}
@keyframes nextPulse{50%{transform:scale(1.18) translateY(-3px)}}
.g-list-t{font-family:var(--display);font-weight:700;font-size:24px;letter-spacing:-.02em;margin:44px 0 14px}
.g-caselist{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.g-caselist .g-case{grid-template-columns:48px minmax(0,1fr) auto;align-items:center;padding:12px 16px;border-radius:18px;height:100%}
.g-caselist .g-case-e{grid-row:auto;width:44px;height:42px;font-size:13.5px}
.g-case-t{display:grid;min-width:0}
.g-caselist .g-case b{font-size:16px}
.g-caselist .g-case-s{margin:0;align-self:center;white-space:nowrap}
.g-case.next{border-color:var(--g-acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--g-acc) 20%,transparent)}
.g-case.next .g-case-s{background:var(--g-acc);color:var(--g-on)}
.g-caselist .g-case:last-child:nth-child(4n+1){grid-column:auto}

.g-crumbs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.g-crumbs a{display:inline-flex;align-items:center;gap:6px;font-family:var(--display);font-weight:600;font-size:14px;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:7px 14px;transition:border-color .2s}
.g-crumbs a:hover{border-color:var(--brand);color:var(--brand-ink)}
.g-banner{display:block;padding:0}
.g-banner::after{display:none}
.g-banner-t{display:flex;gap:16px;align-items:center;padding:18px 26px 22px}
.g-banner h1{margin:4px 0 0}
.g-banner .g-emb{width:64px;height:62px}
.g-scene{position:relative;line-height:0}
.g-scene-svg{display:block;width:100%;height:auto}
.g-clue{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border:0;padding:0;border-radius:50%;background:transparent;cursor:pointer}
.g-clue span{position:absolute;inset:7px;border-radius:50%;background:#FFF805;box-shadow:0 0 0 0 rgba(255,248,5,.6);animation:glint 2.6s ease-in-out infinite;opacity:.55}
.g-clue:hover span,.g-clue:focus-visible span{opacity:1;transform:scale(1.25)}
.g-clue.got span{background:#00E641;opacity:.9;animation:none}
@keyframes glint{0%,100%{box-shadow:0 0 0 0 rgba(255,248,5,.5);transform:scale(.8)}50%{box-shadow:0 0 0 10px rgba(255,248,5,0);transform:scale(1.05)}}
.g-clue-bar{position:absolute;left:14px;bottom:12px;line-height:1.3}
.g-clue-n{display:inline-block;font-family:var(--display);font-size:12.5px;font-weight:600;color:#fff;background:rgba(20,12,43,.7);border-radius:999px;padding:5px 12px}
.g-clue-n:empty{display:none}
.g-clue-pop{position:absolute;left:50%;top:14px;transform:translateX(-50%);width:min(560px,calc(100% - 28px));line-height:1.55;background:#fff;color:var(--ink);border-radius:18px 18px 18px 5px;padding:14px 40px 14px 18px;font-size:15px;box-shadow:var(--shadow-up);animation:bubbleIn .3s var(--ease)}
.g-clue-pop b:first-child{display:block;font-family:var(--display);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-ink);margin-bottom:2px}
.g-clue-x{position:absolute;right:8px;top:6px;border:0;background:transparent;font-size:22px;color:var(--ink3);width:30px;height:30px;border-radius:50%}
.g-clue-x:hover{background:var(--line2)}
.g-brief-t p{margin:0}
.g-steps small{font-size:12px}
.g-stage{position:relative}
.g-stage-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.g-howbtn{border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:5px 14px;font-family:var(--display);font-weight:600;font-size:13px;color:var(--brand-ink)}
.g-howbtn:hover{border-color:var(--brand)}
.g-do{font-size:18px;font-weight:500;color:var(--ink);margin:0 0 6px}
.g-tip{font-size:14.5px;color:var(--ink2);margin:0 0 18px}
.g-tip b{font-family:var(--display);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--amber-ink);background:var(--amber-soft);border-radius:999px;padding:2px 8px;margin-right:6px}
.g-stage-h{margin-bottom:6px}

.g-how{position:relative;display:grid;place-items:start center;padding:4px 0 6px;animation:viewIn .3s var(--ease)}
.g-how.g-how-float{position:absolute;inset:0;z-index:5;padding:22px 14px;overflow:auto;background:rgba(250,249,253,.92);backdrop-filter:blur(3px);border-radius:var(--r-lg)}
.g-how-card{width:min(520px,100%);background:var(--paper);border:1px solid var(--line);border-radius:24px 24px 24px 6px;box-shadow:var(--shadow-up);padding:22px 24px}
.g-how-card h3{font-family:var(--display);font-size:24px;letter-spacing:-.02em;margin:4px 0 12px}
.g-how-steps{margin:14px 0 18px;padding-left:22px;font-size:16px}
.g-how-steps li{margin:6px 0}
.g-how-steps li::marker{font-family:var(--display);font-weight:700;color:var(--brand)}
.g-demo{position:relative;height:118px;border-radius:16px;background:var(--brand-mist);border:1px solid #E6DBFF;overflow:hidden;font-family:var(--serif);font-size:18px}
.dm-doc{margin:0;position:absolute;left:18px;right:18px;top:40px;line-height:1.5}
.dm-t{border-radius:6px;padding:0 3px;animation:dmFound 4s infinite}
.dm-t.d2{animation-delay:1s}
@keyframes dmFound{0%,30%{background:transparent}40%,100%{background:#C9F5D7;box-shadow:inset 0 -2px 0 #00D441}}
.dm-ptr{position:absolute;width:18px;height:18px;border-radius:50%;background:rgba(135,75,248,.45);border:2px solid #874BF8;left:20px;top:80px;animation:dmPtr 4s infinite}
@keyframes dmPtr{0%{left:20px;top:80px}25%{left:118px;top:50px}35%{left:118px;top:50px}55%{left:232px;top:50px}100%{left:232px;top:50px}}
.dm-card{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:6px 16px;box-shadow:var(--shadow);animation:dmSort 3.4s infinite}
@keyframes dmSort{0%,25%{left:50%;top:12px;opacity:1}60%{left:28%;top:66px;opacity:.9}75%,100%{left:28%;top:70px;opacity:0}}
.dm-bin{position:absolute;bottom:10px;width:34%;text-align:center;font-family:var(--display);font-size:13px;font-weight:600;border:1.5px dashed var(--g25);border-radius:12px;padding:8px 0;background:#fff}
.dm-bin.b1{left:11%;animation:dmBin 3.4s infinite}.dm-bin.b2{right:11%}
@keyframes dmBin{55%,80%{border-color:#00D441;background:#E3FAEA}}
.dm-gap{display:inline-block;min-width:90px;border-bottom:2.5px solid var(--brand);text-align:center}
.dm-type{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom;width:0;animation:dmType 3.4s steps(8) infinite}
@keyframes dmType{0%,15%{width:0}55%,100%{width:4.4em}}
.dm-bad{color:var(--bad);animation:dmBad 3.4s infinite;border-radius:6px;padding:0 3px}
.dm-fix{display:inline-block;color:var(--good);font-weight:600;width:0;overflow:hidden;vertical-align:bottom;animation:dmFix 3.4s infinite}
@keyframes dmBad{25%,45%{background:#FFE0CC}55%,100%{text-decoration:line-through;opacity:.5}}
@keyframes dmFix{0%,55%{width:0}70%,100%{width:3em;margin-left:6px}}
.dm-pill{position:absolute;bottom:14px;font-family:var(--display);font-size:13px;font-weight:600;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:5px 14px}
.dm-pill.p1{left:24%;animation:dmPick 3.4s infinite}.dm-pill.p2{left:54%}
@keyframes dmPick{40%,100%{border-color:#00D441;background:#E3FAEA;color:var(--good)}}
.g-demo mark{background:#EFE6FF;box-shadow:inset 0 -2px 0 var(--brand);border-radius:5px;padding:0 4px}
.dm-b1,.dm-b2{position:absolute;font-family:var(--sans);font-size:15px;padding:8px 14px;border-radius:16px 16px 16px 4px;background:#fff;border:1px solid var(--line)}
.dm-b1{left:16px;top:16px;animation:dmIn 3.4s infinite}
.dm-b2{right:16px;bottom:16px;background:var(--brand);color:#fff;border:0;border-radius:16px 16px 4px 16px;animation:dmIn2 3.4s infinite}
@keyframes dmIn{0%{opacity:0;transform:translateY(6px)}15%,100%{opacity:1;transform:none}}
@keyframes dmIn2{0%,40%{opacity:0;transform:translateY(6px)}55%,100%{opacity:1;transform:none}}
.dm-tile{position:absolute;top:66px;background:#fff;border:1.5px solid var(--line);border-radius:10px;padding:4px 12px;box-shadow:0 2px 0 var(--line)}
.dm-tile.t1{animation:dmT1 3.6s infinite}.dm-tile.t2{animation:dmT2 3.6s infinite}.dm-tile.t3{animation:dmT3 3.6s infinite}
@keyframes dmT1{0%,15%{left:62%;top:66px}35%,100%{left:12%;top:16px}}
@keyframes dmT2{0%,35%{left:12%;top:66px}55%,100%{left:32%;top:16px}}
@keyframes dmT3{0%,55%{left:38%;top:66px}75%,100%{left:55%;top:16px}}
.dm-house{position:absolute;bottom:18px;width:60px;height:56px;background:#fff;border:1.5px solid var(--g25);border-radius:6px}
.dm-house.h1{left:16%}.dm-house.h2{left:44%;animation:dmBin 3.2s infinite}.dm-house.h3{left:72%}
.dm-pin{position:absolute;left:calc(44% + 22px);top:0;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--orange-2);animation:dmPin 3.2s infinite}
@keyframes dmPin{0%,20%{top:-20px}45%,100%{top:48px}}
.g-demo-link svg{position:absolute;left:18px;top:4px;width:200px;height:60px}
.dm-arc{stroke-dashoffset:200;animation:dmArc 3.2s infinite}
@keyframes dmArc{0%,20%{stroke-dashoffset:200;opacity:0}60%,100%{stroke-dashoffset:0;opacity:1}}
.dm-ref{animation:dmPick 3.2s infinite;border-radius:5px;padding:0 3px}
.dm-ph{position:relative;display:inline-grid;justify-items:center;margin:34px 0 0 22px;background:#fff;border:1.5px solid var(--line);border-radius:14px 14px 14px 4px;padding:6px 14px;font-size:17px}
.dm-ph b{font-family:var(--display);font-size:12px;color:var(--brand-ink)}
.dm-l::after{content:"?";animation:dmCycle 3.6s steps(1) infinite}
@keyframes dmCycle{0%{content:"?"}25%{content:"O"}50%{content:"V"}75%,100%{content:"S"}}

.g-hunt-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-family:var(--display);font-size:14.5px;color:var(--ink2)}
.g-hunt-bar .g-count{margin:0;color:var(--ink2)}
.g-hunt-bar b{color:var(--g-ink);font-size:18px}
.g-lights{border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:5px 12px;font-family:var(--display);font-weight:500;font-size:13px}
.g-item:has(.g-torch){background:var(--night);border-radius:22px;padding:14px;margin:-4px}
.g-item:has(.g-torch) .g-hunt-bar{color:rgba(255,255,255,.75)}
.g-item:has(.g-torch) .g-hunt-bar b{color:var(--yellow)}
.g-item:has(.g-torch) .g-count{color:rgba(255,255,255,.8)}
.g-item:has(.g-torch) .g-lights{background:transparent;color:#fff;border-color:rgba(255,255,255,.3)}
.g-doc.g-torch{-webkit-mask-image:radial-gradient(circle 130px at var(--mx,50%) var(--my,40%),#000 55%,rgba(0,0,0,.14) 100%);mask-image:radial-gradient(circle 130px at var(--mx,50%) var(--my,40%),#000 55%,rgba(0,0,0,.14) 100%)}
.g-doc.g-torch:focus-within{-webkit-mask-image:none;mask-image:none}
.g-doc{position:relative}
.g-arc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.g-spark{position:fixed;z-index:98;width:7px;height:7px;border-radius:50%;pointer-events:none}
.g-mapbox{position:relative}
.g-pin{position:absolute;width:22px;height:22px;margin:-30px 0 0 -11px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--green-2);border:3px solid #fff;box-shadow:0 6px 12px -4px rgba(0,0,0,.4);animation:pinDrop .45s var(--ease)}
.g-pin.bad{background:var(--orange-2)}
@keyframes pinDrop{from{margin-top:-80px;opacity:0}to{margin-top:-30px;opacity:1}}
.g-typing span{display:inline-flex;gap:4px;padding:6px 0}
.g-typing i{width:7px;height:7px;border-radius:50%;background:var(--g50);animation:dot 1s infinite}
.g-typing i:nth-child(2){animation-delay:.15s}.g-typing i:nth-child(3){animation-delay:.3s}
@keyframes dot{50%{transform:translateY(-4px);opacity:.4}}
.g-strip:empty::before{content:attr(data-empty);font-size:14.5px;color:var(--ink3);align-self:center;padding:0 6px}
.g-done{position:relative}
.g-stamp{position:absolute;right:4px;top:-6px;transform:rotate(-8deg);font-family:var(--display);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--green-ink);border:3px solid var(--green-2);border-radius:14px;padding:6px 14px;text-align:center;line-height:1.1;animation:stamp .5s cubic-bezier(.3,1.6,.5,1)}
.g-stamp b{display:block;font-size:20px}
@keyframes stamp{from{transform:rotate(-8deg) scale(2.2);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:1}}

.sp{transform-box:fill-box;transform-origin:50% 50%}
.sp-bob{animation:spBob 3.2s ease-in-out infinite alternate}
@keyframes spBob{to{transform:translateY(-9px)}}
.sp-pulse{animation:spPulse 3s ease-in-out infinite}
@keyframes spPulse{0%,100%{transform:scale(1)}20%{transform:scale(1.12)}40%{transform:scale(1)}}
.sp-strong rect{filter:drop-shadow(0 0 8px rgba(255,255,255,.7))}
.sp-faint{animation:spFaint 2.4s ease-in-out infinite}
@keyframes spFaint{0%,100%{opacity:.35}50%{opacity:.85}}
.sp-file1{transform:translate(180px,150px);animation:spFile1 5s ease-in-out infinite}
.sp-file2{transform:translate(480px,150px);animation:spFile2 5s ease-in-out infinite;animation-delay:1.2s}
@keyframes spFile1{0%{transform:translate(330px,40px);opacity:0}12%{opacity:1}55%,85%{transform:translate(180px,150px);opacity:1}100%{transform:translate(180px,150px);opacity:0}}
@keyframes spFile2{0%{transform:translate(330px,40px);opacity:0}12%{opacity:1}55%,85%{transform:translate(480px,150px);opacity:1}100%{transform:translate(480px,150px);opacity:0}}
.sp-fly{opacity:0;animation:spFly 6.4s linear infinite}
@keyframes spFly{0%{transform:translate(-60px,220px) rotate(-10deg);opacity:0}8%{opacity:1}50%{transform:translate(420px,60px) rotate(8deg)}92%{opacity:1}100%{transform:translate(1000px,150px) rotate(-6deg);opacity:0}}
.sp-draw{animation:march 1.2s linear infinite}
.sp-stamp{animation:spStamp 3.6s cubic-bezier(.3,1.4,.5,1) infinite}
@keyframes spStamp{0%{transform:translateY(-50px);opacity:0}25%,85%{transform:none;opacity:1}100%{opacity:0}}
.sp-train{transform:translate(330px,0);animation:spTrain 9s linear infinite}
@keyframes spTrain{0%{transform:translate(-320px,0)}40%,60%{transform:translate(330px,0)}100%{transform:translate(980px,0)}}
.sp-arrive{transform:translate(620px,118px);animation:spArrive 6s ease-out infinite}
@keyframes spArrive{0%{transform:translate(1010px,118px);opacity:0}10%{opacity:1}45%,90%{transform:translate(620px,118px);opacity:1}100%{opacity:0;transform:translate(620px,118px)}}
.sp-depart{transform:translate(380px,118px);animation:spDepart 6s ease-in infinite}
@keyframes spDepart{0%,40%{transform:translate(380px,118px);opacity:1}95%{transform:translate(-80px,118px);opacity:1}100%{opacity:0;transform:translate(-80px,118px)}}
.sp-swing{transform-box:view-box;animation:spSwing 3.6s ease-in-out infinite alternate}
@keyframes spSwing{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.sp-bright{fill:#C2A8FF;animation:spBright 3s ease-in-out infinite alternate}
@keyframes spBright{to{fill:#FFF805;filter:drop-shadow(0 0 10px #FFF805)}}
.sp-darken{fill:#140C2B;opacity:0;animation:spDark 3s ease-in-out 1s infinite alternate}
@keyframes spDark{to{opacity:.6}}
.sp-large{transform-box:fill-box;transform-origin:50% 50%;animation:spLarge 3s ease-in-out 2s infinite alternate}
@keyframes spLarge{to{transform:scale(1.9)}}
.sp-ball{transform:translate(480px,160px);animation:spBall 8s ease-in-out infinite}
@keyframes spBall{0%,20%{transform:translate(480px,160px)}25%,45%{transform:translate(480px,72px)}50%,70%{transform:translate(480px,232px)}75%,95%{transform:translate(600px,184px)}100%{transform:translate(480px,160px)}}
.sp-prep{opacity:0;animation:spPrep 8s infinite}
@keyframes spPrep{0%{opacity:0}3%,22%{opacity:1}25%,100%{opacity:0}}
.sp-pop{animation:spPop 3.6s ease-in-out infinite}
@keyframes spPop{0%{transform:scale(.4);opacity:0}15%,85%{transform:scale(1);opacity:1}100%{opacity:0}}
.sp-rise{animation:spRise 4.2s ease-in-out infinite}
@keyframes spRise{0%{transform:translateY(40px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(-70px);opacity:0}}
.sp-spin{transform-box:fill-box;transform-origin:50% 50%;animation:spin 10s linear infinite}
.sp-spin-r{transform-box:fill-box;transform-origin:50% 50%;animation:spin 7s linear infinite reverse}
@keyframes spin{to{transform:rotate(360deg)}}
.sp-step{animation:spStep 3.6s ease-in-out infinite}
@keyframes spStep{0%{opacity:0;transform:translateY(10px)}20%,80%{opacity:1;transform:none}100%{opacity:0}}
.sp-slide{animation:spSlide 5s cubic-bezier(.3,1.3,.5,1) infinite}
@keyframes spSlide{0%{transform:translateY(-90px);opacity:0}20%,85%{transform:none;opacity:1}100%{opacity:0}}
.sp-sheet{animation:spSheet 4s ease-in-out infinite}
@keyframes spSheet{0%{transform:translateX(-80px);opacity:0}25%,75%{transform:none;opacity:1}100%{transform:translateX(40px);opacity:0}}
.sp-zip{transform:translate(400px,170px);animation:spZip 14s linear infinite}
@keyframes spZip{0%{transform:translate(-100px,190px)}100%{transform:translate(1300px,120px)}}

.g-mapbox{max-width:780px;margin:0 auto}
.g-plan{background:#EDE6FF}
.g-banner{position:relative}
.g-banner-t{padding:12px 24px 18px}
.g-banner h1{font-size:clamp(28px,3.4cqw,42px)}
.g-banner .g-emb{width:52px;height:50px}
.g-scene-svg{max-height:290px}
.g-clue-bar{left:14px;bottom:10px}

@container posw (max-width:760px){
  .g-scene-svg{height:210px;max-height:none}
  .g-clue-n{font-size:11.5px}
  .g-steps{display:flex;overflow-x:auto;gap:8px;padding-bottom:6px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
  .g-steps li{flex:0 0 70%;scroll-snap-align:start}
  .g-brief-t{font-size:15.5px;padding:14px 18px}
  .g-do{font-size:16.5px}
}
@media (prefers-reduced-motion:reduce){.sp-prep{opacity:0}.sp-prep:first-of-type{opacity:1}.sp-fly{opacity:0}.dm-type{width:4.4em}}
@container posw (max-width:760px){
  .tabs{margin-left:auto}.tabs a{padding:6px 12px;font-size:13.5px}
  .langs{margin-left:6px}
  .ls-strip{padding:20px 14px 14px;gap:8px 4px}
  .ls-cap{padding:14px 16px 16px}
  .g-banner-t{padding:14px 16px 18px}.g-banner .g-emb{width:48px;height:46px}
  .g-clue{width:36px;height:36px;margin:-18px 0 0 -18px}
  .g-hub-bar .g-go{width:100%}
  .g-stamp{position:static;display:inline-block;margin-bottom:10px}
}
@container posw (max-width:980px){.posw.page-unit .menu-btn,.posw.page-refs .menu-btn{display:inline-flex!important}}
@container posw (max-width:560px){
  .top-in{gap:6px}
  .brand .logo{width:74px}
  .tabs{padding:3px;margin-left:auto}.tabs a{padding:6px 10px;font-size:13px}
  .langs button{padding:6px 8px;font-size:0}.langs button::after{content:attr(data-short);font-size:12px}
  .menu-btn{padding:6px 9px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}


:host{
  --dusk:#2A1670; --dusk-2:#3B1F94; --dusk-3:#5B33D6; --mist:#F4F0FE; --mist-2:#ECE5FD;
  --bg:#F7F4FE; --line:#E6DFF7; --line2:#F0EBFB;
  --r-xl:36px; --r-lg:26px;
  --shadow:0 1px 2px rgba(42,22,112,.05),0 10px 30px -14px rgba(42,22,112,.22);
  --shadow-up:0 2px 6px rgba(42,22,112,.06),0 26px 50px -22px rgba(42,22,112,.42);
  --guide-c:#874BF8;
  --display:var(--pos-font,inherit);
  --sans:var(--pos-font,inherit);
}
.posw{background:var(--bg);background-image:radial-gradient(1200px 500px at 85% -10%,rgba(135,75,248,.10),transparent 60%),radial-gradient(900px 500px at -10% 30%,rgba(10,199,255,.06),transparent 60%);background-attachment:fixed}


.top{background:rgba(255,255,255,.82);border-bottom:1px solid rgba(135,75,248,.12)}
.top-in{max-width:1480px;height:70px}
.brand-name{font-weight:700;font-size:16px;color:var(--ink)}
.brand-name em{font-style:normal;color:var(--brand)}
.tabs{background:var(--mist-2)}
.tabs a{display:inline-flex;align-items:center;gap:7px}
.tabs a svg{width:16px;height:16px}
.tabs a[data-tab="play"][aria-current="page"]{background:var(--dusk)}
.langs{background:var(--mist-2)}


.wrap{max-width:1480px}
@container posw (min-width:981px){.wrap{grid-template-columns:288px minmax(0,1fr)}.posw.full .wrap{grid-template-columns:minmax(0,1fr)}}
.main{padding:28px 48px 96px}
.col{max-width:820px}
.posw.page-unit .col{max-width:1020px}
.posw.full .main{padding:20px 24px 96px}
.posw.page-home .col,.posw.page-bureau .col{max-width:1320px;margin:0 auto}


nav.side{padding:22px 14px 48px 22px}
.nav-world{display:flex!important;align-items:center;gap:10px;margin:0 0 12px;padding:10px 12px!important;border-radius:16px!important;background:var(--paper);border:1px solid var(--line);font-family:var(--display);font-weight:600;color:var(--ink)!important}
.nav-world-i{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;font-size:14px}
.nav-r{margin:4px 0 8px;padding:6px;border-radius:18px;transition:background .25s}
.nav-r.here{background:var(--paper);box-shadow:var(--shadow)}
.nav-r-h{display:flex;align-items:center;gap:10px;padding:6px 6px 4px;font-family:var(--display);font-weight:700;font-size:14px;color:var(--ink);line-height:1.2}
.nav-r-h small{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);font-weight:600}
.nav-r-img{width:38px;height:38px;flex:none;border-radius:12px 12px 12px 4px;background-size:cover;background-position:65% 50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.side a{font-size:14px;padding:6px 10px}
.side .nav-r a{margin-left:4px}
.side a[aria-current="page"]{background:var(--brand-soft)}
.nav-refs{margin-top:14px}


.kicker{letter-spacing:.13em}
.btn{border-radius:999px}
.btn-xl{padding:14px 26px;font-size:16.5px}
.btn.glass{background:rgba(255,255,255,.16);color:#fff;border:1.5px solid rgba(255,255,255,.5);box-shadow:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.btn.glass:hover{background:rgba(255,255,255,.28);color:#fff}
.sec-h h2{letter-spacing:-.035em}



.w-float{position:absolute;inset:0;z-index:0;pointer-events:none}
.w-tile{position:absolute;pointer-events:auto;cursor:pointer;display:grid;justify-items:center;padding:8px 14px 7px;border-radius:16px 16px 16px 5px;background:rgba(255,255,255,.93);color:var(--wc);box-shadow:0 12px 26px -12px rgba(20,12,43,.55),0 0 0 1px rgba(255,255,255,.6);animation:wDrift 9s ease-in-out infinite;transform-origin:50% 100%;transition:background .3s}
.w-tile b{font-family:var(--serif);font-weight:500;font-size:clamp(15px,1.3cqw,19px);line-height:1.1;border-bottom:2.5px solid currentColor}
.w-tile i{font-style:normal;font-family:var(--display);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;max-height:0;opacity:0;overflow:hidden;transition:max-height .3s,opacity .3s,margin .3s}
.w-tile:hover i,.w-tile.flip i{max-height:20px;opacity:1;margin-top:4px}
.w-tile:hover,.w-tile.flip{background:#fff}
@keyframes wDrift{0%,100%{transform:translate(0,0) rotate(-2deg)}33%{transform:translate(10px,-14px) rotate(1.5deg)}66%{transform:translate(-8px,-6px) rotate(-1deg)}}






.w-map{margin:88px 0 0}
.w-route{list-style:none;margin:0;padding:0;position:relative;display:grid;gap:26px}
.w-route::before{content:"";position:absolute;left:50%;top:40px;bottom:40px;width:4px;margin-left:-2px;background:repeating-linear-gradient(180deg,var(--brand) 0 12px,transparent 12px 24px);opacity:.35;border-radius:2px}
.w-stop{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:center}
.w-stop:nth-child(even) .w-stop-art{order:2}
.w-stop-art{position:relative;border-radius:30px 30px 30px 8px;overflow:hidden;aspect-ratio:16/10;box-shadow:var(--shadow-up);background:#8C67F0}
.w-stop:nth-child(even) .w-stop-art{border-radius:30px 30px 8px 30px}
.w-stop-art img:first-child{width:100%;height:100%;object-fit:cover;object-position:68% 50%;transition:transform 1s var(--ease)}
.w-stop:hover .w-stop-art img:first-child{transform:scale(1.04)}
.w-stop-n{position:absolute;left:18px;top:16px;display:grid;place-items:center;width:46px;height:44px;border-radius:16px 16px 16px 5px;background:#fff;color:var(--brand-ink);font-family:var(--display);font-weight:700;font-size:20px;box-shadow:0 8px 20px -10px rgba(20,12,43,.6)}
.w-stop.done .w-stop-n{background:var(--green-2);color:#fff}
.w-stop-guide{position:absolute;right:14px;bottom:12px;width:72px;height:72px;border-radius:50%;background:#fff;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 4px rgba(255,255,255,.7),0 12px 24px -10px rgba(20,12,43,.6)}
.w-here{position:absolute;left:18px;bottom:16px;font-family:var(--display);font-weight:700;font-size:13px;background:var(--yellow);color:var(--night);padding:6px 12px;border-radius:999px;box-shadow:0 8px 20px -10px rgba(20,12,43,.6);animation:nextPulse 2s ease-in-out infinite}
.w-stop-t h3{font-family:var(--display);font-weight:700;font-size:clamp(26px,2.6cqw,34px);letter-spacing:-.03em;line-height:1.05;margin:6px 0 10px}
.w-stop-t .kicker{color:var(--rc)}
.w-stop-p{color:var(--ink2);margin:0 0 14px;font-size:16px}
.w-stop-u{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.w-stop-u a{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 14px;border-radius:16px;background:var(--paper);border:1px solid var(--line);text-decoration:none;color:var(--ink);transition:border-color .2s,transform .2s var(--ease),box-shadow .2s}
.w-stop-u a:hover{border-color:var(--brand);transform:translateX(4px);box-shadow:var(--shadow);color:var(--ink)}
.w-stop-u .n{font-family:var(--display);font-weight:700;font-size:18px;color:var(--g25)}
.w-stop-u a.done .n{color:var(--green-2)}
.w-stop-u .t{font-family:var(--display);font-weight:600;font-size:15.5px;line-height:1.3}
.w-stop-u .lv{font-family:var(--display);font-size:12px;font-weight:600;color:var(--ink3);border:1px solid var(--line);border-radius:999px;padding:2px 9px;white-space:nowrap}
.w-stop-q{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.w-stop-q a{font-family:var(--display);font-weight:600;font-size:13.5px;text-decoration:none;color:#fff;background:var(--dusk);border-radius:999px;padding:7px 14px;transition:background .2s}
.w-stop-q a span{color:var(--yellow)}
.w-stop-q a:hover{background:var(--brand);color:#fff}
.w-stop.pulse .w-stop-art{animation:stopPulse 1.4s var(--ease) 2}
@keyframes stopPulse{50%{box-shadow:0 0 0 8px rgba(135,75,248,.35),var(--shadow-up)}}




.u-hero{position:relative;overflow:visible;border-radius:var(--r-xl);min-height:360px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:10px;isolation:isolate;color:#fff;margin:0 0 18px}
.u-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:70% 45%;border-radius:var(--r-xl);z-index:-2}
.u-hero-shade{position:absolute;inset:0;border-radius:var(--r-xl);z-index:-1;background:linear-gradient(90deg,rgba(42,22,112,.82),rgba(42,22,112,.45) 50%,rgba(42,22,112,.05) 80%),linear-gradient(0deg,rgba(42,22,112,.45),transparent 50%)}
.u-hero-t{padding:26px 30px 30px}
.u-crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:var(--display);font-size:13.5px;margin-bottom:18px}
.u-crumbs a{color:rgba(255,255,255,.86);text-decoration:none;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:4px 12px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.u-crumbs a:hover{background:rgba(255,255,255,.26);color:#fff}
.u-crumbs span{color:rgba(255,255,255,.6)}
.u-hero .u-num{color:#fff}
.u-hero .u-num b{background:#fff;color:var(--brand-ink)}
.u-hero .u-num span{color:rgba(255,255,255,.8)}
.u-hero .u-num em{color:#fff;border-color:rgba(255,255,255,.4);margin-left:6px}
.u-hero h1{color:#fff;font-size:clamp(34px,4.6cqw,60px);margin:14px 0 0;text-shadow:0 4px 24px rgba(20,12,43,.35);max-width:640px}
.u-hero h1 .trl{color:rgba(255,255,255,.85)}
.u-hero .trl::before{color:rgba(255,255,255,.6)}
.u-hero .trl[lang=kk]{--tl-c:rgba(10,199,255,.8)}.u-hero .trl[lang=ru]{--tl-c:rgba(255,125,29,.85)}
.u-guide{position:relative;display:flex;align-items:flex-end;gap:0;padding-right:18px;max-width:430px}
.u-say{position:relative;align-self:center;margin:0 -8px 40px 0;background:#fff;color:var(--ink);border-radius:24px 24px 6px 24px;padding:14px 18px;font-size:15.5px;line-height:1.55;box-shadow:0 18px 40px -18px rgba(20,12,43,.6);animation:bubbleIn .6s var(--ease) .2s both}
.u-say b{display:block;font-family:var(--display);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--guide-c)}
.u-say p{margin:0}
.u-say .trl{color:var(--ink2)}
.u-hero .u-say .trl::before{color:var(--ink3)}
.u-hero .u-say .trl[lang=kk]{--tl-c:#8FDDFB}.u-hero .u-say .trl[lang=ru]{--tl-c:#FFC2A0}
.u-guide-m{height:230px;width:auto;margin-bottom:-18px;filter:drop-shadow(0 18px 20px rgba(20,12,43,.45));animation:guideIn .8s var(--ease) both;transform-origin:50% 100%}
@keyframes guideIn{from{opacity:0;transform:translateY(30px) scale(.9)}to{opacity:1;transform:none}}
.u-guide-m:hover{animation:guideHop .6s var(--ease)}
@keyframes guideHop{40%{transform:translateY(-12px) rotate(-3deg)}}

.u-rail{position:sticky;top:78px;z-index:20;display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none;margin:26px 0 30px;padding:7px;border-radius:999px;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:var(--shadow)}
.u-rail::-webkit-scrollbar{display:none}
.u-rail-k{flex:none;font-family:var(--display);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);padding:0 8px 0 10px}
.u-rail a{flex:none;font-family:var(--display);font-weight:500;font-size:13.5px;text-decoration:none;color:var(--ink2);padding:6px 12px;border-radius:999px;white-space:nowrap;transition:background .2s,color .2s}
.u-rail a span{font-weight:700;color:var(--ink3);margin-right:2px}
.u-rail a:hover{background:var(--line2);color:var(--ink)}
.u-rail a.on{background:var(--brand);color:#fff}
.u-rail a.on span{color:rgba(255,255,255,.75)}
.u-rail a.u-rail-p{background:var(--dusk);color:#fff;margin-left:auto}
.u-rail a.u-rail-p.on{background:var(--brand)}
.posw.page-unit .col>details.plan,.posw.page-unit .col>.legend,.posw.page-unit .col>section.ex,.posw.page-unit .col>.practice-head,.posw.page-unit .col>.act,.posw.page-unit .col>.isle-x{max-width:820px}
details.plan{border-radius:22px;background:var(--paper)}
details.plan summary{font-size:15.5px}

.legend{display:block;border-radius:22px;padding:14px 18px;margin:0 0 30px;box-shadow:var(--shadow)}
.legend-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.legend-top>b{font-family:var(--display);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
.legend-keys{display:flex;flex-wrap:wrap;gap:6px}
.lg-k{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:4px 12px 4px 8px;font-size:13.5px;color:var(--ink);transition:border-color .2s,background .2s}
.lg-k i{width:12px;height:12px;border-radius:50%;background:var(--wc);display:inline-block}
.lg-k:hover,.lg-k[aria-pressed="true"]{border-color:var(--wc);background:color-mix(in srgb,var(--wc) 9%,#fff)}
.legend-hint{margin:10px 0 0;font-size:13.5px;color:var(--ink3)}
.lbl-sw{display:inline-flex;align-items:center;gap:9px;font-family:var(--display);font-size:13.5px;font-weight:600;color:var(--ink2);cursor:pointer}
.lbl-sw input{position:absolute;opacity:0;pointer-events:none}
.sw-ui{width:38px;height:22px;border-radius:999px;background:var(--g25);position:relative;transition:background .2s}
.sw-ui::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .25s var(--ease)}
.lbl-sw input:checked+.sw-ui{background:var(--brand)}
.lbl-sw input:checked+.sw-ui::after{transform:translateX(16px)}
.lbl-sw input:focus-visible+.sw-ui{outline:3px solid var(--cyan-2);outline-offset:2px}

.w{transition:opacity .25s,background .25s;border-radius:4px}
[data-hl] .w{opacity:.32}
[data-hl="n"] .w-n,[data-hl="pr"] .w-pr,[data-hl="det"] .w-det,[data-hl="v"] .w-v,[data-hl="aux"] .w-aux,[data-hl="adj"] .w-adj,[data-hl="adv"] .w-adv,[data-hl="p"] .w-p,[data-hl="cj"] .w-cj,[data-hl="i"] .w-i,[data-hl="f"] .w-f{opacity:1;background:color-mix(in srgb,currentColor 12%,transparent)}
.posw.show-labels .w{display:inline-flex;flex-direction:column;align-items:center;line-height:1.25;vertical-align:top;padding:0 3px 1px}
.posw.show-labels .w::after{content:attr(title);font-family:var(--display);font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.2;margin-top:1px;opacity:.85;white-space:nowrap}

.isle-x{margin:0 0 44px;background:var(--paper);border:1px solid var(--line);border-radius:28px;overflow:hidden;box-shadow:var(--shadow)}
.isle-x figcaption{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 18px;padding:18px 22px 14px}
.isle-x figcaption p{margin:4px 0 0;color:var(--ink2);font-size:15px;max-width:540px}
.isle-x .btn{padding:8px 16px;font-size:14px}
.isle-x .isle-all[aria-pressed="true"]{background:var(--brand);color:#fff;border-color:var(--brand)}
.isle-stage{position:relative;aspect-ratio:16/9;background:#8C67F0}
.isle-stage>img{width:100%;height:100%;object-fit:cover;display:block}
.isle-pt{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border:0;padding:0;background:transparent;cursor:pointer}
.isle-dot{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px color-mix(in srgb,var(--wc) 55%,transparent),0 0 18px 6px rgba(255,255,255,.65);animation:glint 2.6s ease-in-out infinite}
.isle-pt:nth-child(3n) .isle-dot{animation-delay:-.9s}.isle-pt:nth-child(3n+1) .isle-dot{animation-delay:-1.7s}
.isle-w{position:absolute;left:50%;bottom:30px;transform:translate(-50%,10px) scale(.7);opacity:0;display:grid;justify-items:center;padding:6px 12px 5px;border-radius:14px 14px 14px 4px;background:#fff;color:var(--wc);box-shadow:0 12px 24px -10px rgba(20,12,43,.6);white-space:nowrap;pointer-events:none;transition:opacity .3s,transform .4s cubic-bezier(.3,1.5,.5,1)}
.isle-w b{font-family:var(--serif);font-weight:500;font-size:17px;line-height:1.1;border-bottom:2.5px solid currentColor}
.isle-w i{font-style:normal;font-family:var(--display);font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-top:3px}
.isle-pt:hover .isle-w,.isle-pt:focus-visible .isle-w,.isle-pt.on .isle-w,.isle-x.awake .isle-w{opacity:1;transform:translate(-50%,0) scale(1)}
.isle-pt.on .isle-dot{background:var(--wc);animation:none;box-shadow:0 0 0 5px #fff,0 0 22px 8px rgba(255,255,255,.7)}
.isle-pt.on{z-index:3}
.isle-cap{display:flex;align-items:center;gap:14px;padding:14px 20px 16px;min-height:76px;border-top:1px solid var(--line2)}
.isle-face{width:48px;height:48px;border-radius:50%;object-fit:cover;background:var(--mist);flex:none}
.isle-says{margin:0;font-size:16px;color:var(--ink2)}
.isle-ex{font-family:var(--serif);font-size:19px;color:var(--ink)}
.isle-ex b{color:var(--wc,var(--brand));font-weight:500;border-bottom:2.5px solid currentColor}
.isle-cls{display:inline-block;font-family:var(--display);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:var(--wc);border-radius:999px;padding:3px 10px;margin-right:6px;vertical-align:3px}
.isle-says:has(.isle-cls){--wc:inherit}

section.ex{position:relative;padding:4px 0 0 0;margin:0 0 52px}
.ex-n{font-family:var(--display);font-weight:700;font-size:13px;color:var(--brand-ink);background:var(--brand-soft);display:inline-block;padding:3px 10px;border-radius:10px 10px 10px 3px;margin-bottom:8px;letter-spacing:.02em}
section.ex h2{font-size:clamp(25px,2.6cqw,32px)}
.exs{border-radius:24px 24px 24px 6px;box-shadow:var(--shadow);border-color:var(--line);background:linear-gradient(180deg,#fff,#FDFCFF)}
.exs .s{font-size:19.5px}
.note-box{border-radius:20px 20px 20px 6px}
.note-box.info{background:var(--mist);border-color:#E3D8FD}
table{border-radius:18px;box-shadow:var(--shadow)}

.practice-head{display:flex;gap:18px;align-items:center;margin:72px 0 26px;padding:24px;border:0;border-radius:28px;background:linear-gradient(135deg,var(--dusk),var(--dusk-3));color:#fff;scroll-margin-top:140px}
.practice-head::before{display:none}
.practice-head .kicker{color:var(--yellow)}
.practice-head h2{color:#fff;margin:4px 0 6px!important}
.practice-head h2 .trl{color:rgba(255,255,255,.8)}
.practice-head p{color:rgba(255,255,255,.82)}
.practice-head .trl{color:rgba(255,255,255,.78)}
.practice-head .trl::before{color:rgba(255,255,255,.55)}
.ph-face{width:86px;height:86px;flex:none;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.95);box-shadow:0 0 0 4px rgba(255,255,255,.25)}
.act{position:relative;border-radius:26px;border-color:var(--line);overflow:visible}
.act::before{content:"Challenge " attr(data-n);position:absolute;top:-11px;left:22px;font-family:var(--display);font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:var(--brand);color:#fff;border-radius:999px;padding:3px 11px}
.act-h{padding-top:24px}
.opt{border-radius:999px}
.q-s mark,.g-sent mark{background:#EFE6FF}

.fb,.g-fb{padding-left:74px!important;min-height:64px}
.fb::before,.g-fb::before{content:"";position:absolute;left:14px;top:12px;width:46px;height:46px;border-radius:50%;background:#fff var(--guide-face) center 30%/cover no-repeat;box-shadow:0 0 0 3px #fff,0 6px 14px -6px rgba(20,12,43,.4)}
.g-fb{position:relative}
.fb.good::before,.g-fb.good::before{animation:guideHop .6s var(--ease)}
.fb.bad::before,.g-fb.bad::before{animation:gShake .4s}

.u-quest{position:relative;display:block;overflow:hidden;margin:56px 0 0;border-radius:var(--r-xl);min-height:260px;text-decoration:none;color:#fff;isolation:isolate;max-width:1020px}
.u-quest>img:first-child{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transition:transform 1s var(--ease)}
.u-quest:hover>img:first-child{transform:scale(1.04)}
.u-quest::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(20,12,43,.88),rgba(20,12,43,.45) 60%,rgba(20,12,43,.1))}
.u-quest-t{display:grid;gap:6px;padding:34px 36px;max-width:560px}
.u-quest .kicker{color:var(--yellow)}
.u-quest b{font-family:var(--display);font-size:clamp(26px,3cqw,36px);letter-spacing:-.03em;line-height:1.05}
.u-quest-t>span:not(.kicker){color:rgba(255,255,255,.75);font-size:15px}
.u-quest em{font-style:normal;justify-self:start;margin-top:10px;background:var(--yellow);color:var(--night);box-shadow:none}
.u-quest em .trl{color:var(--night)}
.u-quest-m{position:absolute;right:30px;bottom:-4px;height:200px;width:auto;filter:drop-shadow(0 16px 20px rgba(0,0,0,.45));transition:transform .5s var(--ease)}
.u-quest:hover .u-quest-m{transform:translateY(-8px) rotate(3deg)}

.pager{gap:16px;max-width:1020px}
.pager .pg{display:flex;align-items:center;gap:14px;padding:12px;border-radius:22px}
.pager .pg img{width:96px;height:64px;border-radius:14px 14px 14px 4px;object-fit:cover;flex:none}
.pager .pg-n{flex-direction:row-reverse;text-align:right}
.pager .pg span{display:block}
.foot{max-width:1020px}
.foot-team{display:inline-flex}
.foot-face{width:34px;height:34px;border-radius:50%;object-fit:cover;background:var(--mist);border:2px solid #fff;margin-left:-8px;box-shadow:0 4px 10px -6px rgba(20,12,43,.5)}
.foot-face:first-child{margin-left:0}


.q-hero{position:relative;overflow:hidden;border-radius:var(--r-xl);min-height:520px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;isolation:isolate;color:#fff;background:var(--dusk)}
.q-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:60% 50%;z-index:-2;filter:saturate(.9)}
.q-hero-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(20,12,43,.9),rgba(30,20,66,.72) 45%,rgba(30,20,66,.2) 75%),linear-gradient(0deg,rgba(20,12,43,.6),transparent 50%)}
.q-hero-t{padding:clamp(28px,4.6cqw,60px);max-width:680px}
.q-hero .kicker{color:var(--yellow)}
.q-hero h1{color:#fff;font-size:clamp(40px,6cqw,80px);line-height:.96;letter-spacing:-.045em;margin:14px 0 16px}
.q-hero .lede{color:rgba(255,255,255,.82);font-size:clamp(16px,1.4cqw,18.5px);margin:0 0 26px}
.q-go{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;font-family:var(--display);color:rgba(255,255,255,.78)}
.q-meter{width:140px;height:8px;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden}
.q-meter span{display:block;height:100%;background:var(--yellow);border-radius:4px}
.q-hero-guide{position:relative;display:flex;align-items:flex-end;padding-right:24px}
.q-hero-guide img{height:240px;width:auto;margin-bottom:-6px;filter:drop-shadow(0 18px 20px rgba(0,0,0,.5));animation:guideIn .8s var(--ease) both}
.q-say{align-self:center;max-width:230px;margin-right:-10px;margin-bottom:50px;background:#fff;color:var(--ink);border-radius:22px 22px 6px 22px;padding:12px 16px;font-size:15px;line-height:1.45;box-shadow:0 18px 40px -18px rgba(0,0,0,.6);animation:bubbleIn .6s var(--ease) .3s both}
.q-say b{display:block;font-family:var(--display);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--guide-c)}
.q-board{display:grid;gap:22px;margin-top:30px}
.q-isle{display:grid;grid-template-columns:300px minmax(0,1fr);gap:24px;align-items:start;padding:16px;border-radius:30px;background:var(--paper);border:1px solid var(--line);box-shadow:var(--shadow)}
.q-isle-art{position:relative;border-radius:22px 22px 22px 6px;overflow:hidden;aspect-ratio:16/11}
.q-isle-art img:first-child{width:100%;height:100%;object-fit:cover;object-position:68% 50%}
.q-isle-face{position:absolute;right:10px;bottom:10px;width:54px;height:54px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.7)}
.q-isle-t{padding:6px 4px 4px 0}
.q-isle-t .kicker{color:var(--rc)}
.q-isle-t h2{font-family:var(--display);font-weight:700;font-size:26px;letter-spacing:-.025em;margin:4px 0 12px}
.q-isle .g-caselist{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.g-case-p{display:block;font-size:13px;color:var(--ink3);line-height:1.35}
.q-dossier{margin:28px 0 0;text-align:center;font-family:var(--display);font-size:14.5px}
.q-dossier a{color:var(--ink3)}

.g-banner{background:var(--dusk);border-radius:var(--r-xl);overflow:hidden}
.g-scene{position:relative;aspect-ratio:21/8;max-height:340px;width:100%;overflow:hidden}
.g-scene-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:68% 50%}
.g-scene::after{content:"";position:absolute;inset:auto 0 0 0;height:50%;background:linear-gradient(0deg,var(--dusk),transparent);pointer-events:none}
.g-clue{z-index:2}
.g-clue-bar{z-index:3}
.g-banner-t{position:relative;padding:4px 26px 22px!important;margin-top:-40px;z-index:2}
.g-mate{display:flex;align-items:center;gap:12px;margin:0 0 22px;padding:10px 16px 10px 10px;border-radius:999px 22px 22px 999px;background:var(--mist);border:1px solid #E3D8FD;max-width:760px}
.g-mate img{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#fff;flex:none}
.g-mate p{margin:0;font-size:15px;color:var(--ink2)}
.g-mate b{font-family:var(--display);color:var(--guide-c)}
.g-stage{border-radius:28px}
.g-crumbs a{border-radius:999px}


@container posw (max-width:1180px){
  .u-guide{max-width:360px}.u-guide-m{height:190px}
}
@container posw (max-width:980px){
  .main{padding:22px 18px 80px}
  .w-route::before{left:22px}
  .w-stop{grid-template-columns:1fr;gap:14px;padding-left:46px}
  .w-stop:nth-child(even) .w-stop-art{order:0}
  .w-stop::before{content:"";position:absolute;left:12px;top:30px;width:24px;height:24px;border-radius:50%;background:var(--paper);border:4px solid var(--brand)}
  .w-stop.done::before{background:var(--green-2);border-color:var(--green-2)}
  .u-hero{grid-template-columns:1fr;min-height:0}
  .u-guide{max-width:none;justify-content:flex-end;padding:0 10px 0 16px;margin-top:-10px}
  .u-say{margin-bottom:30px}
  .u-guide-m{height:150px}
  .q-hero{grid-template-columns:1fr}
  .q-hero-guide{justify-content:flex-end}
  .q-hero-guide img{height:170px}
  .q-isle{grid-template-columns:1fr}
  .u-rail{top:72px}
}
@container posw (max-width:760px){
  .w-float{bottom:auto;height:0;padding-bottom:75%}
  .w-float .w-tile{display:none}
  .w-stop-art{aspect-ratio:16/9}
  .u-hero-t{padding:20px 20px 10px}
  .u-say{font-size:14.5px;padding:12px 14px}
  .u-guide-m{height:120px}
  .u-rail{border-radius:18px;margin:16px -4px 22px}
  .u-rail-k{display:none}
  .practice-head{padding:18px;gap:12px}.ph-face{width:58px;height:58px}
  .u-quest-t{padding:26px 22px 120px}.u-quest-m{height:140px;right:14px}
  .pager .pg img{width:64px;height:48px}
  .isle-pt{width:38px;height:38px;margin:-19px 0 0 -19px}
  .isle-w b{font-size:14.5px}
  .isle-cap{padding:12px 14px}
  .isle-ex{font-size:17px}
  .q-hero-guide img{height:130px}.q-say{font-size:14px;max-width:190px;margin-bottom:30px}
  .g-scene{aspect-ratio:16/9}
  .fb,.g-fb{padding-left:64px!important}.fb::before,.g-fb::before{width:38px;height:38px;left:12px}
}
@container posw (max-width:560px){
  .brand-name{display:none}
  .w-stop{padding-left:40px}
  .w-stop-u a{grid-template-columns:30px minmax(0,1fr);}
  .w-stop-u .lv{grid-column:2;justify-self:start}
  .u-guide{flex-direction:column;align-items:flex-end;padding:0 14px}
  .u-say{margin:0 0 -6px 0;border-radius:22px 22px 6px 22px}
  .u-guide-m{height:110px;margin-bottom:-12px}
}


.u-hero.r-gate .u-hero-img{object-position:60% 6%}
.u-quest.r-gate>img:first-child{object-position:60% 70%}
.w-stop-guide,.q-isle-face,.isle-face,.ph-face,.foot-face,.g-mate img{object-position:50% 50%!important}

.g-clue-bar{top:14px!important;bottom:auto!important;left:16px!important}
.q-hero-img{object-position:70% 50%}




.w-hero{position:relative;border-radius:var(--r-xl);overflow:hidden;background:var(--dusk);color:#fff;isolation:isolate}
.w-hero-art{position:relative;aspect-ratio:2752/1536;width:100%}
.w-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.w-hero-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(42,22,112,.78) 0%,rgba(52,28,140,.55) 26%,rgba(91,51,214,0) 50%)}
.w-hero-t{position:absolute;left:0;top:0;bottom:0;width:min(46%,600px);display:flex;flex-direction:column;justify-content:center;padding:0 0 0 clamp(28px,4.4cqw,72px)}
.w-hero h1{color:#fff;font-size:clamp(44px,6.4cqw,96px);line-height:.94;letter-spacing:-.045em;margin:0 0 20px;text-shadow:0 6px 30px rgba(42,22,112,.35)}
.w-hero h1 em{font-style:normal;color:var(--cyan);display:block}
.w-hero .lede{color:#fff;font-size:clamp(17px,1.5cqw,21px);line-height:1.45;max-width:440px;margin:0 0 30px;text-shadow:0 2px 12px rgba(42,22,112,.5)}
.w-hero .lede .trl{color:rgba(255,255,255,.86)}
.w-hero .trl::before{color:rgba(255,255,255,.65)}
.w-hero .bar{gap:12px;margin:0}
.w-hero .btn:not(.glass){background:#fff;color:var(--brand-ink);box-shadow:0 14px 30px -14px rgba(20,12,43,.7)}
.w-hero .btn:not(.glass):hover{background:var(--brand-mist)}
.w-prog{display:flex;align-items:center;gap:12px;margin-top:22px;font-family:var(--display);font-weight:600;font-size:14px;color:rgba(255,255,255,.85)}
.w-prog span{width:120px;height:6px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden}
.w-prog i{display:block;height:100%;background:var(--yellow)}

.w-float{position:absolute;inset:0;pointer-events:none}
.w-tile{position:absolute;pointer-events:auto;cursor:pointer;display:grid;justify-items:center;padding:7px 13px 6px;border-radius:15px 15px 15px 5px;background:rgba(255,255,255,.94);color:var(--wc);box-shadow:0 12px 26px -12px rgba(20,12,43,.55);animation:wDrift 10s ease-in-out infinite}
.w-tile b{font-family:var(--serif);font-weight:500;font-size:clamp(14px,1.25cqw,19px);line-height:1.1;border-bottom:2.5px solid currentColor}
.w-tile i{font-style:normal;font-family:var(--display);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;max-height:0;opacity:0;overflow:hidden;transition:max-height .3s,opacity .3s,margin .3s}
.w-tile:hover i,.w-tile.flip i{max-height:20px;opacity:1;margin-top:3px}
.w-tile:nth-child(odd){animation-duration:12s}
.w-tile:nth-child(1){left:48%;top:7%}
.w-tile:nth-child(2){left:52%;top:63%}
.w-tile:nth-child(3){left:55%;top:44%}
.w-tile:nth-child(4){left:88%;top:8%}
.w-tile:nth-child(5){left:47%;top:84%}
.w-tile:nth-child(6){left:77%;top:46%}
.w-tile:nth-child(7){left:62%;top:3%}
@container posw (max-width:900px){
  .w-hero{border-radius:26px}
  .w-hero-shade{display:none}
  .w-hero-t{position:relative;width:auto;padding:24px 22px 28px;background:var(--dusk)}
  .w-hero h1{font-size:clamp(40px,10cqw,64px);margin-bottom:14px}
  .w-hero .lede{margin-bottom:22px}
  .w-tile{padding:5px 9px 4px}.w-tile b{font-size:13px}
  .w-tile:nth-child(2),.w-tile:nth-child(5){display:none}
}
@media (prefers-reduced-motion:reduce){.w-tile{animation:none}}


.w-map{margin:72px 0 0}
.w-map-h{font-family:var(--display);font-weight:700;font-size:clamp(30px,3.4cqw,44px);letter-spacing:-.035em;margin:0 0 30px}
.w-stop-art{display:block}
.w-stop-t h3{margin:0 0 14px}
.w-stop-u a{grid-template-columns:minmax(0,1fr) auto 24px;padding:13px 16px;min-height:52px}
.w-stop-u .go{font-family:var(--display);font-weight:700;color:var(--brand);text-align:center}
.w-stop-u a.done .go{color:var(--green-2)}
.w-stop-u a.next{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.w-stop-q a{padding:8px 14px}
.w-stop-guide{width:64px;height:64px}


.u-hero{min-height:340px;align-items:end}
.u-hero-bg{position:absolute;inset:0;border-radius:var(--r-xl);overflow:hidden;z-index:-2}
.u-hero-bg .u-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:70% 45%;border-radius:0}
.u-hero.r-gate .u-hero-img{object-position:60% 50%}
.u-hero-t{padding:26px 30px 32px}
.u-back{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 16px;border-radius:999px;font-family:var(--display);font-weight:600;font-size:14.5px;color:#fff;text-decoration:none;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);margin-bottom:22px}
.u-back:hover{background:rgba(255,255,255,.3);color:#fff}
.u-hero h1{margin:0 0 12px}
.u-lv{display:inline-block;font-family:var(--display);font-weight:600;font-size:13px;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:3px 11px}
.u-guide{padding-right:22px;padding-bottom:0}
.u-guide-m{height:220px;margin-bottom:0;align-self:flex-end}
.u-say{margin:0 -6px 60px 0;max-width:290px}
.u-rail{gap:4px}
.u-rail a{padding:8px 14px}

.legend{padding:12px 16px}
.legend-top{margin:0 0 8px}

.isle-all{position:absolute;right:14px;top:14px;z-index:4;min-height:40px;padding:6px 16px;border-radius:999px;border:0;background:rgba(255,255,255,.92);color:var(--brand-ink);font-family:var(--display);font-weight:600;font-size:14px;box-shadow:0 8px 20px -10px rgba(20,12,43,.5)}
.isle-all[aria-pressed="true"]{background:var(--brand);color:#fff}
.isle-pt{width:48px;height:48px;margin:-24px 0 0 -24px}
.isle-dot{width:18px;height:18px;margin:-9px 0 0 -9px}

.practice-head{padding:16px 22px;gap:14px;margin:64px 0 24px}
.practice-head h2{margin:0!important;font-size:clamp(26px,2.6cqw,32px)}
.ph-face{width:60px;height:60px}
.act::before{display:none}
.act-h{padding-top:20px}
.act-h h3{margin-top:0}

.u-quest{min-height:220px}
.u-quest-t{gap:8px}
.u-quest-m{bottom:0;height:180px}

.pager .pg{min-height:88px}

.q-hero{min-height:440px}
.q-hero h1{font-size:clamp(48px,6.4cqw,88px);margin:0 0 10px}
.q-hero .lede{font-size:clamp(17px,1.5cqw,20px);color:#fff;margin:0 0 26px}
.q-stat{display:flex;align-items:center;gap:14px;margin-top:22px;font-family:var(--display);font-weight:600;color:rgba(255,255,255,.85)}
.g-snd{width:42px;height:42px;padding:0;display:grid;place-items:center;font-size:18px}
.q-hero-guide{padding:0 34px 0 0}
.q-hero-guide img{height:250px;margin:0;align-self:flex-end}
.q-isle-t h2{margin:4px 0 14px}
.g-case-t b{display:block}
.g-case{min-height:64px}
.g-howbtn{min-height:40px;padding:8px 16px;font-size:14.5px;font-weight:600}
.g-scene .g-clue-n{font-family:var(--display);font-weight:600}

@container posw (max-width:980px){
  .u-guide{justify-content:flex-end;margin-top:-6px}
  .u-say{margin-bottom:36px}
  .u-guide-m{height:150px}
  .q-hero-guide img{height:170px}
}
@container posw (max-width:760px){
  .u-hero-t{padding:18px 18px 8px}
  .u-back{margin-bottom:16px}
  .u-guide{padding:0 12px}
  .u-guide-m{height:130px}
  .u-say{margin:0 -4px 40px 0;max-width:none}
  .isle-all{right:10px;top:10px;min-height:36px;font-size:13px;padding:4px 12px}
  .isle-pt{width:40px;height:40px;margin:-20px 0 0 -20px}
  .practice-head{padding:12px 16px}
  .ph-face{width:46px;height:46px}
  .u-quest-t{padding:24px 20px 26px;max-width:62%}
  .u-quest-m{height:130px;right:12px}
  .q-hero-guide{padding:0 16px 0 0}
  .q-hero-guide img{height:130px}
}
@container posw (max-width:560px){
  .u-guide{flex-direction:row;align-items:flex-end}
  .u-say{margin:0 -4px 30px 0;font-size:14.5px}
  .u-guide-m{height:116px}
}

.brand,.brand .logo{flex:none}
@container posw (max-width:1100px){.brand-name,.brand-rule{display:none}}
.u-guide-m{position:relative;z-index:1}
.u-say{margin-right:10px!important}
@container posw (max-width:560px){.u-guide-m{height:104px}.u-say{margin-right:6px!important}}
@container posw (max-width:480px){.tabs a svg{display:none}.tabs a{padding:7px 10px}.top-in{gap:8px;padding:0 10px}.menu-btn span{display:none}.menu-btn{padding:8px}}
@container posw (max-width:480px){.langs button{padding:6px 8px!important;min-width:0!important}.posw:not(.full) .brand{display:none}.top-in{justify-content:space-between}}
@container posw (max-width:400px){.top .logo{width:62px!important;height:auto}.tabs a{padding:7px 9px!important;font-size:14px}.langs button{padding:6px 6px!important}}


:host{
  --f-ui:var(--pos-font,inherit);
  --f-tl:var(--pos-font,inherit);
  --display:var(--pos-font,inherit);
}
.posw{font-family:var(--f-ui);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:"kern","liga"}
section.ex>div,section.ex p,section.ex li{font-size:17.5px;line-height:1.7}
section.ex h2{font-family:var(--f-ui);font-weight:700;letter-spacing:-.025em;line-height:1.15}


.trl::before{content:none!important;display:none!important}
.trl{font-family:var(--f-ui);font-weight:400;color:var(--ink2);padding-left:14px;border-left:2px solid var(--tl-c)}
.trl[lang=kk]{--tl-c:#0AC7FF}.trl[lang=ru]{--tl-c:#FF7D1D}
h1 .trl,h2 .trl,h3 .trl,.trl.trl-h{font-family:var(--f-tl);font-style:italic;font-weight:500;letter-spacing:0;border-left:0;padding-left:0;color:var(--ink2)}
h1 .trl{font-size:.42em}h2 .trl,.trl.trl-h{font-size:.68em}h3 .trl{font-size:.8em}
.u-hero .trl{border-left:0;padding-left:0}


.term-en{display:block}
.term-tl{display:block;font-family:var(--f-tl);font-style:italic;font-weight:500;letter-spacing:0;text-transform:none;line-height:1.25;color:var(--ink2);margin-top:3px;overflow-wrap:anywhere}


.topic-wrap{display:flex;align-items:flex-start;gap:clamp(12px,1.6cqw,20px);margin:0 0 16px}
.topic-ico{flex:none;display:grid;place-items:center;width:clamp(48px,5cqw,64px);height:clamp(48px,5cqw,64px);margin-top:4px;border-radius:20px 20px 20px 6px;background:#fff;color:var(--tc);box-shadow:0 12px 26px -12px rgba(20,12,43,.6)}
.topic-ico svg{width:58%;height:58%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.u-hero h1.topic{margin:0;font-family:var(--f-ui);font-weight:800;font-size:clamp(34px,4.4cqw,58px);line-height:1.02;letter-spacing:-.03em;color:#fff;text-shadow:0 4px 24px rgba(20,12,43,.4);max-width:600px}
.u-hero h1.topic.is-pos{font-size:clamp(46px,6.6cqw,92px);letter-spacing:-.015em;text-transform:uppercase;line-height:.95}
.u-hero h1.topic .term-tl{font-size:max(19px,.36em);color:rgba(255,255,255,.92);margin-top:10px;text-shadow:0 2px 12px rgba(20,12,43,.45)}
.u-hero h1.topic.is-pos .term-tl{font-size:max(20px,.34em)}


.w-stop-u a{grid-template-columns:44px minmax(0,1fr) auto 22px;gap:14px;padding:12px 16px 12px 12px;min-height:64px;border-left:0}
.t-ico{display:grid;place-items:center;width:44px;height:44px;border-radius:14px 14px 14px 4px;background:color-mix(in srgb,var(--tc) 11%,#fff);color:var(--tc)}
.t-ico svg,.n-ico svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.w-stop-u .t{font-family:var(--f-ui);font-weight:700;font-size:18px;line-height:1.2;letter-spacing:-.01em;color:var(--ink)}
.w-stop-u a.is-pos .t .term-en{font-weight:800;font-size:19px;letter-spacing:.04em;text-transform:uppercase;color:var(--tc)}
.w-stop-u .t .term-tl{font-size:15px;margin-top:2px}
.w-stop-u a:hover{border-color:var(--tc)}


.side .nav-r a{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 10px}
.n-ico{display:grid;place-items:center;width:30px;height:30px;border-radius:10px 10px 10px 3px;background:color-mix(in srgb,var(--tc) 11%,#fff);color:var(--tc)}
.n-ico svg{width:17px;height:17px}
.nt{font-family:var(--f-ui);font-weight:600;font-size:14.5px;line-height:1.25;color:var(--ink)}
.nt .term-tl{font-size:13px;font-weight:500;margin-top:1px}
.side a[aria-current="page"] .nt{color:var(--brand-ink)}


.lg-k{align-items:center;padding:6px 14px 6px 10px;gap:8px;font-family:var(--f-ui);font-weight:600;font-size:14px}
.lg-t{display:inline-flex;flex-direction:column;align-items:flex-start;text-align:left;line-height:1.15}
.lg-t .term-en{color:var(--wc)}
.lg-t .term-tl{font-size:12.5px;margin-top:1px}


.pg-t{display:block;font-family:var(--f-ui);font-weight:700;font-size:17px;line-height:1.25;color:var(--ink)}
.pg-t .term-tl{font-size:14px;font-weight:500}


.isle-cls i{font-family:var(--f-tl);font-style:italic;font-weight:500;letter-spacing:0;text-transform:none;margin-left:8px;opacity:.9}


.exs .s{font-family:var(--serif)}

@container posw (max-width:760px){
  .topic-wrap{gap:10px}
  .u-hero h1.topic{font-size:clamp(30px,8.4cqw,42px)}
  .u-hero h1.topic.is-pos{font-size:clamp(40px,12cqw,58px)}
  .u-hero h1.topic .term-tl,.u-hero h1.topic.is-pos .term-tl{font-size:18px}
  .w-stop-u a{grid-template-columns:40px minmax(0,1fr) 22px;gap:12px}
  .w-stop-u .lv{grid-column:2;justify-self:start;margin-top:-4px}
  .w-stop-u .go{grid-column:3;grid-row:1}
  .t-ico{width:40px;height:40px}
  section.ex>div,section.ex p,section.ex li{font-size:16.5px}
}

.u-hero{grid-template-columns:minmax(0,1fr) auto;min-height:380px}
.u-hero-t{padding:28px 32px 34px;min-width:0}
.u-hero-shade{background:linear-gradient(90deg,rgba(42,22,112,.88),rgba(42,22,112,.62) 48%,rgba(42,22,112,.12) 80%),linear-gradient(0deg,rgba(42,22,112,.5),transparent 55%)}
.u-hero h1.topic{max-width:none;min-width:0;flex:1}
.u-def{margin:6px 0 18px;max-width:560px;font-size:17px;line-height:1.6;color:rgba(255,255,255,.93);text-shadow:0 1px 10px rgba(20,12,43,.45)}
.u-def .trl{color:rgba(255,255,255,.8);font-size:.94em;border-left-color:rgba(255,255,255,.5);margin-top:8px}
.u-guide{padding:0 26px 0 0}
.u-guide-m{height:250px}
@container posw (max-width:980px){.u-guide-m{height:180px}}
@container posw (max-width:760px){
  .u-hero{grid-template-columns:1fr}
  .u-hero-t{padding:18px 18px 4px}
  .topic-wrap{flex-direction:column;gap:10px}
  .topic-ico{width:46px;height:46px}
  .u-def{font-size:15.5px;margin-bottom:14px}
  .u-guide{justify-content:flex-end;padding:0 14px;margin-top:-64px;pointer-events:none}
  .u-guide-m{height:110px}
  .u-hero-t .u-lv{margin-bottom:6px}
}
.u-hero h1.topic.is-pos.is-long{font-size:clamp(40px,4.8cqw,70px)}
@container posw (max-width:760px){.u-hero h1.topic.is-pos.is-long{font-size:clamp(34px,10cqw,46px)}}
@container posw (max-width:900px){.langs button{padding:6px 10px;font-size:0}.langs button::after{content:attr(data-short);font-size:13px;font-weight:600}}


section.ex h2{font-weight:600;font-size:clamp(24px,2.4cqw,30px);letter-spacing:-.02em}
.w-map-h,.w-stop-t h3,.q-isle-t h2,.q-hero h1{font-weight:600}
.w-stop-t h3{font-size:clamp(24px,2.4cqw,30px);letter-spacing:-.02em}
.btn{font-family:var(--f-ui);font-weight:600;font-size:16px;min-height:48px;padding:12px 22px;letter-spacing:0;display:inline-flex;align-items:center;justify-content:center;gap:9px}
.btn.btn-xl{font-size:17px;min-height:54px;padding:14px 28px}
.btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.btn:focus-visible,.mode-b:focus-visible,.step:focus-visible{outline:3px solid var(--cyan-2,#0AC7FF);outline-offset:3px}
.tabs a{font-weight:600}


.mode-sw{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:26px 0 30px;max-width:820px}
.mode-b{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:24px;border:1.5px solid var(--line);background:rgba(255,255,255,.6);color:var(--ink2);text-align:left;cursor:pointer;transition:background .25s,border-color .25s,box-shadow .25s,transform .2s var(--ease)}
.mode-b:hover{border-color:var(--brand);background:#fff;transform:translateY(-2px)}
.mode-i{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:18px 18px 18px 5px;background:var(--mist-2);color:var(--brand-ink)}
.mode-i svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.mode-t{display:grid;gap:2px}
.mode-n .term-en{font-family:var(--f-ui);font-weight:800;font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink)}
.mode-n .term-tl{font-size:15px;margin-top:0}
.mode-t small{font-family:var(--f-ui);font-size:14px;font-weight:500;color:var(--ink3)}
.mode-l[aria-selected="true"]{background:#fff;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft),var(--shadow);color:var(--ink)}
.mode-l[aria-selected="true"] .mode-i{background:var(--brand);color:#fff}
.mode-p .mode-i{background:#FFF7B8;color:#8A6A00}
.mode-p[aria-selected="true"]{background:var(--dusk);border-color:var(--dusk);box-shadow:0 18px 36px -18px rgba(42,22,112,.7)}
.mode-p[aria-selected="true"] .mode-i{background:var(--yellow);color:var(--night)}
.mode-p[aria-selected="true"] .mode-n .term-en{color:#fff}
.mode-p[aria-selected="true"] .mode-n .term-tl{color:rgba(255,255,255,.8)}
.mode-p[aria-selected="true"] .mode-t small{color:rgba(255,255,255,.7)}
.mode-view[hidden]{display:none!important}


.ready{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;max-width:820px;margin:64px 0 0;padding:26px 28px;border-radius:28px;background:var(--paper);border:1px solid var(--line);box-shadow:var(--shadow)}
.ready h2{margin:0 0 12px;font-weight:600;font-size:26px;letter-spacing:-.02em}
.ready h2 .term-tl{font-size:17px}
.ready-list{display:flex;flex-wrap:wrap;gap:8px;margin:0}
.ready-list>span{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;background:var(--mist);font-weight:500;font-size:14.5px;color:var(--ink)}
.ready-list .term-tl{display:inline;font-size:13.5px;margin-left:6px}
.ready-list .term-en{display:inline}
.a-ico{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#fff;color:var(--brand-ink)}
.a-ico svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.btn-practice{background:var(--dusk);color:#fff}
.btn-practice:hover{background:var(--brand);color:#fff}
.btn-practice svg{color:var(--yellow)}


.mv-practice{max-width:860px;padding:26px;border-radius:32px;background:linear-gradient(160deg,var(--dusk) 0%,#3B1F94 60%,#4A2BB8 100%);color:#fff;box-shadow:0 30px 60px -36px rgba(42,22,112,.8)}
.pr-head{display:flex;align-items:center;gap:16px;margin:0 0 22px}
.pr-head .ph-face{width:62px;height:62px;background:#fff}
.pr-k{font-family:var(--f-ui);font-weight:600;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--yellow)}
.pr-topic{margin:2px 0 0;font-family:var(--f-ui);font-weight:800;font-size:clamp(26px,3cqw,36px);letter-spacing:.01em;text-transform:uppercase;color:#fff;line-height:1.05}
.pr-topic .term-tl{text-transform:none;letter-spacing:0;font-size:17px;color:rgba(255,255,255,.82);margin-top:4px;font-weight:500}
.steps{list-style:none;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
.step{width:100%;display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:12px;padding:14px 16px;border-radius:20px;border:1.5px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;text-align:left;cursor:pointer;transition:background .2s,border-color .2s,transform .2s var(--ease)}
.step:hover{background:rgba(255,255,255,.14);transform:translateY(-2px)}
.step[aria-selected="true"]{background:#fff;color:var(--ink);border-color:#fff;box-shadow:0 0 0 4px rgba(255,248,5,.55)}
.step-n{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.16);font-family:var(--f-ui);font-weight:600;font-size:14px}
.step[aria-selected="true"] .step-n{background:var(--dusk);color:#fff}
.step.done .step-n{background:var(--green-2);color:#fff}
.step .a-ico{background:rgba(255,255,255,.14);color:#fff}
.step[aria-selected="true"] .a-ico{background:var(--mist);color:var(--brand-ink)}
.step-t{display:grid;gap:1px;min-width:0}
.step-do .term-en{font-family:var(--f-ui);font-weight:600;font-size:16.5px;line-height:1.25}
.step-do .term-tl{font-size:14px;color:inherit;opacity:.78;margin-top:0}
.step-s{font-size:13px;opacity:.7;font-weight:500}
.mv-practice .act{background:#fff;color:var(--ink);border:0;border-radius:26px;margin:0;box-shadow:0 24px 50px -30px rgba(0,0,0,.6)}
.act-do{display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;padding:4px 14px 4px 4px;border-radius:999px;background:var(--mist);font-family:var(--f-ui);font-weight:600;font-size:14.5px;color:var(--brand-ink)}
.act-do .term-en{display:inline}.act-do .term-tl{display:inline;margin:0 0 0 8px;font-size:13.5px}
.act-h h3{font-family:var(--f-ui);font-weight:600;font-size:clamp(21px,2cqw,25px);letter-spacing:-.015em;line-height:1.25;margin:0 0 6px}
.act-in{color:var(--ink2);font-size:16px;margin:0}
.act .prog{font-family:var(--f-ui);font-size:14px;font-weight:500}
.act .bar{gap:12px;margin-top:18px}
.done-card .bar .btn{min-width:170px}
.mv-practice .u-quest{margin:26px 0 0;border-radius:26px}
@container posw (max-width:760px){
  .mode-sw{gap:8px;margin:18px 0 22px}
  .mode-b{flex-direction:column;align-items:flex-start;gap:10px;padding:14px}
  .mode-i{width:44px;height:44px}
  .mode-n .term-en{font-size:19px}
  .mv-practice{padding:16px;border-radius:26px;margin:0 -6px}
  .pr-head .ph-face{width:48px;height:48px}
  .steps{grid-template-columns:1fr}
  .step{padding:11px 14px}
  .ready{padding:20px}
  .btn-practice{width:100%}
}
[hidden]{display:none!important}



.w-tile:nth-child(1){left:48%;top:7%}
.w-tile:nth-child(2){left:60%;top:21%}
.w-tile:nth-child(3){left:55%;top:44%}
.w-tile:nth-child(4){left:88%;top:8%}
.w-tile:nth-child(5){left:48%;top:35%}
.w-tile:nth-child(6){left:77%;top:46%}
.w-tile:nth-child(7){left:62%;top:3%}

.u-quest{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:0 12px}
.u-quest-t{grid-column:1;grid-row:1;align-self:center;max-width:none}
.u-quest-m{position:relative;grid-column:2;grid-row:1;right:auto;bottom:auto;align-self:end;height:200px;margin:12px 22px 0 0}
.mv-practice .u-quest-m{height:170px}
@container posw (max-width:760px){
  .u-quest-t{padding:22px 0 22px 20px;max-width:none}
  .u-quest-m,.mv-practice .u-quest-m{height:118px;margin-right:10px}
  .u-quest b{font-size:clamp(21px,6cqw,26px)}
}
.tree .row{flex-wrap:wrap;row-gap:10px}.tree{overflow-x:visible}
.tree .row{min-width:0!important;flex-wrap:wrap!important}
.side .lv{color:#5f5a66}
:host{display:block;container:posw/inline-size}
.posw{overflow-wrap:break-word}
.posw [lang="kk"]{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.posw.full nav.side{transform:none;opacity:0;visibility:hidden;transition:opacity .2s var(--ease),visibility 0s .2s}
.posw.full nav.side.open{opacity:1;visibility:visible;transition:opacity .2s var(--ease)}
@container posw (max-width:980px){
  .posw nav.side{transform:none;opacity:0;visibility:hidden;transition:opacity .2s var(--ease),visibility 0s .2s}
  .posw nav.side.open{opacity:1;visibility:visible;transition:opacity .2s var(--ease)}
}
.posw .top .exit-btn{display:inline-flex;padding:8px}
.posw .top .exit-btn[hidden]{display:none!important}
`
