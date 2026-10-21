// CSS Prepositions World для Shadow DOM — перенесён из прототипа. Отличия:
// :root → :host (переменные видны внутри тени), body → .pw (корень раздела),
// шрифт — сайта: --sans берёт --pw-font, который экран ставит из вычисленного
// шрифта страницы (Manrope, на телефоне PT Root UI, в казахском — Inter).
// Golos Text прототипа не переносится: свой шрифт выбил бы раздел из
// приложения. Правки оформления — здесь и в прототипе одновременно.
// Класс слова-предлога .pw прототипа записан как «.pw .pw»: корень раздела
// теперь тоже .pw, и без этого цвет и жирность слова легли бы на весь раздел.

export const PREPOSITIONS_CSS = `
:host{--bg:#f4f0fb;--ink:#1d1538;--ink2:#4f4869;--ink3:#676085;--v:#5a2fc8;--vt:#f2edff;--line:#e7e1f4;--paper:#fff;--tr:#0b6158;--trbg:#eef7f5;--trl:#c9e5df;--good:#0f7a4a;--goodbg:#e3f6ec;--bad:#b3261e;--badbg:#fdecea;--note:#8a5a00;--notebg:#fff7e0;
 --sans:var(--pw-font,inherit);--serif:var(--sans)}
*{box-sizing:border-box}.pw{margin:0;background:var(--bg);color:var(--ink);font:500 17px/1.55 var(--sans);-webkit-text-size-adjust:100%}
h1,h2,h3{margin:0;line-height:1.15}a{color:inherit}button{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:3px solid #f0a500;outline-offset:2px;border-radius:10px}
.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px clamp(12px,3vw,28px);background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}.logo{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#8a5cff,#4a22b8);color:#fff;font:800 22px var(--serif)}
.bt{display:flex;flex-direction:column;line-height:1.05}.bt b{font-size:18px;font-weight:700}.bt small{color:var(--ink3);font-size:11px;letter-spacing:.08em}
.stages{display:flex;gap:4px;background:#ece7f7;padding:4px;border-radius:999px}.stages a{display:flex;align-items:center;gap:8px;text-decoration:none;padding:6px 16px 6px 6px;border-radius:999px;font-weight:650;color:var(--ink2);min-height:44px}
.stages .num{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#fff;color:var(--v);font-size:15px;font-weight:700}.stages a.on{background:var(--v);color:#fff}
main{max-width:1060px;margin:0 auto;padding:18px clamp(12px,3vw,28px) 60px;outline:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:10px 24px;border-radius:14px;border:2px solid var(--v);background:#fff;color:var(--v);font-weight:700;font-size:17px;text-decoration:none}
.btn.primary{background:var(--v);color:#fff}.btn.ghost{border-color:#cfc6ea;color:var(--ink2)}.btn.big{font-size:19px;padding:14px 30px}
.icon-btn{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:#fff;text-decoration:none;color:var(--ink)}
.hero{position:relative;border-radius:20px;overflow:hidden;background-size:cover;background-position:center 60%;color:#fff;min-height:210px;display:flex;align-items:flex-end}
.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(24,10,70,.92),rgba(24,10,70,.72) 55%,rgba(24,10,70,.2))}
.hero-in{position:relative;padding:26px 30px;max-width:640px}.hero.small{min-height:150px;background:linear-gradient(120deg,#3a1f94,#6d3df0)}
.kick{margin:0;font-size:14px;font-weight:650;color:rgba(255,255,255,.85)}.hero h1{font-size:clamp(26px,5vw,38px);margin:4px 0 10px;color:#fff}.hero p{margin:0 0 6px}.prog{font-weight:650;color:#ffd66b}
h2.sec{font-size:24px;margin:26px 0 12px}
.tgrid,.wgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
.tcard,.wcard{display:flex;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;text-decoration:none;box-shadow:0 8px 24px rgba(50,25,120,.09);border:2px solid transparent;transition:transform .12s,border-color .12s}
.tcard:hover,.wcard:not(.locked):hover{transform:translateY(-3px);border-color:var(--v)}
.tfig,.wfig{position:relative;aspect-ratio:1000/563;background:#ddd}.tfig svg,.wfig svg{display:block;width:100%;height:100%}
.badge{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:4px;background:var(--good);color:#fff;font-weight:700;font-size:13px;padding:4px 10px 4px 7px;border-radius:999px}
.tbody,.wbody{padding:14px 18px 16px}.tnum{font-size:13px;font-weight:650;color:var(--v)}.tbody h3,.wbody h3{font-size:21px;margin:2px 0 4px}.tw{margin:0 0 6px;color:var(--ink2);font-size:15.5px}.tkk,.trs{font-size:14px;color:var(--tr);font-weight:600}.trs{margin-left:6px}
.wcard.locked{opacity:.78}.wcard.locked .wfig svg{filter:grayscale(.85) brightness(.7)}.lockb{position:absolute;inset:0;display:grid;place-items:center;color:#fff}.lockb svg{width:46px;height:46px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
.wm{margin:0 0 6px;color:var(--ink2);font-size:15px}.need{margin:0;font-size:14px;color:var(--bad);font-weight:600}.stars{display:inline-flex;gap:2px}
.goplay{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:26px;color:var(--ink2)}
/* lesson */
.lesson{max-width:900px;margin:0 auto}.ls-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}.crumb{font-size:14px;color:var(--ink2)}
.ls-head{position:relative;border-radius:20px;overflow:hidden;background-size:cover;background-position:center 58%;color:#fff;padding:26px 30px;min-height:150px;display:flex;align-items:flex-end}
.ls-head::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(24,10,70,.9),rgba(24,10,70,.7) 50%,rgba(24,10,70,.15))}.ls-head>div{position:relative}
.ls-world{margin:0;font-size:14.5px;color:rgba(255,255,255,.88)}.ls-head h1{color:#fff;font-size:clamp(28px,5vw,40px);margin-top:4px}
.ls-sheet{background:var(--paper);border-radius:20px;box-shadow:0 12px 32px rgba(50,25,120,.07);margin-top:16px;overflow:hidden}
.ls-langbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;padding:16px clamp(16px,4vw,32px) 14px;border-bottom:1px solid var(--line)}
.ls-seg{display:inline-flex;background:#ece7f7;border-radius:12px;padding:3px;gap:2px}.ls-seg button{border:0;background:transparent;border-radius:9px;min-height:42px;padding:0 16px;font:600 15px var(--sans);color:var(--ink2)}
.ls-seg button[aria-pressed=true]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(30,15,80,.14)}.ls-seg button[data-tr=kk][aria-pressed=true],.ls-seg button[data-tr=ru][aria-pressed=true]{color:var(--tr)}
.hint{font-size:13.5px;color:var(--ink3);flex-basis:100%}
.ls-expl{padding:0 clamp(16px,4vw,32px) 28px}.ls-lead{font-family:var(--serif);font-size:clamp(18px,3vw,21px);line-height:1.5;margin:22px 0 0;max-width:40em}
.ls-rules{list-style:none;margin:8px 0 0;padding:0}.ls-rule{display:grid;grid-template-columns:34px minmax(0,1fr);gap:0 12px;padding:26px 0 6px;border-top:1px solid var(--line);margin-top:24px}.ls-rule:first-child{margin-top:20px}
.ls-rn{font-family:var(--serif);font-size:28px;font-weight:500;color:#b7a6ea}.ls-rule h2{font-size:30px;margin:0 0 12px}.pw .pw{font-family:var(--serif);color:var(--v);font-weight:700}
.fig{margin:0 0 14px}.fig svg{display:block;width:100%;height:auto;border-radius:16px;box-shadow:0 8px 22px rgba(30,15,80,.18)}.fig figcaption{font-size:14.5px;color:var(--ink2);margin-top:8px}
.def{font-size:18px;margin:0 0 10px;max-width:38em}
.ls-ex{margin:10px 0}.exh{display:block;font-size:13px;font-weight:650;color:var(--ink3);margin-bottom:2px}
.ls-x{display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;padding:8px 2px;width:100%}.ls-x .w{font-family:var(--serif);font-size:20px;font-weight:600;color:#2a1b72}.ls-x svg{color:var(--ink3);opacity:.7;flex:none}.ls-x:hover svg{color:var(--v);opacity:1}
.ls-trs{display:block;font-size:16px;color:var(--tr);margin-top:6px;font-weight:600}
.ls-note{border-left:3px solid #f0b429;background:var(--notebg);border-radius:0 10px 10px 0;padding:10px 14px;margin:12px 0 10px;font-size:16px;max-width:40em}.ls-note>span{font-weight:700;color:var(--note);margin-right:6px}
.ls-tr{border:1px solid var(--trl);background:var(--trbg);border-radius:12px;padding:12px 16px 4px;margin:10px 0 8px;max-width:44em}.ls-tr .trh{display:block;font-size:13px;font-weight:650;color:var(--tr);margin-bottom:6px}.ls-tr p{margin:0 0 9px;font-size:16px;line-height:1.55;color:#173b37}.ls-tr .trt{font-weight:700;font-size:19px;color:#0b4d46}
.ls-start{position:sticky;bottom:12px;margin-top:18px;display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border-radius:16px;padding:12px 14px;box-shadow:0 10px 30px rgba(60,30,140,.18);z-index:5}
.ls-src{margin-top:16px;font-size:14.5px;color:var(--ink2)}.ls-src summary{cursor:pointer;font-weight:600;padding:6px 0}.ls-src a{color:var(--v)}
.speak{display:inline-grid;place-items:center;width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:#fff;color:var(--v);flex:none}
/* scene */
svg.scene{display:block;width:100%;height:auto;border-radius:16px;background:#8fd3ff}
.ring{fill:rgba(255,255,255,.08);stroke-width:5;stroke-dasharray:14 9;animation:dash 1.2s linear infinite}.ring.a{stroke:#ffd23c}.ring.b{stroke:#3fe0f5}
@keyframes dash{to{stroke-dashoffset:-46}}
.arrow{fill:none;stroke:#ffd23c;stroke-width:7;stroke-linecap:round;stroke-dasharray:2 14;filter:drop-shadow(0 2px 2px rgba(60,20,0,.5))}.spot{fill:rgba(255,210,60,.35);stroke:#ffd23c;stroke-width:4}
.tag rect{fill:#fff;stroke:var(--v);stroke-width:3}.tag text{font:800 28px var(--sans);fill:var(--ink)}
.hot rect{fill:rgba(255,255,255,0);stroke:transparent;stroke-width:5;cursor:pointer}.hot:hover rect,.hot:focus rect{fill:rgba(255,255,255,.22);stroke:#ffd23c}.hot.good rect{fill:rgba(40,200,120,.3);stroke:#1fd68a}.hot.bad rect{fill:rgba(240,70,90,.3);stroke:#ff4d6d}
.spot-hot{cursor:pointer}.spot-hot circle{fill:rgba(255,210,60,.35);stroke:#ffd23c;stroke-width:5;stroke-dasharray:10 7;animation:dash 1.2s linear infinite}.spot-hot text{font:800 40px var(--sans);fill:#fff;stroke:#3a1f94;stroke-width:5;paint-order:stroke}
.spot-hot.good circle{fill:rgba(40,200,120,.4);stroke:#1fd68a}.spot-hot.bad circle{fill:rgba(240,70,90,.4);stroke:#ff4d6d}

/* ===== v4 ===== */
.hero{min-height:230px}.hero .mascot{position:absolute;right:18px;bottom:0;filter:drop-shadow(0 8px 14px rgba(0,0,0,.4))}
.art-place{background-image:var(--x)}.art-time,.art-movement,.art-manner,.art-cause,.art-relations,.art-patterns,.art-advanced,.art-place{background-size:cover;background-position:center 60%}
.cat{margin-top:30px}.cat-head{position:relative;border-radius:18px;overflow:hidden;color:#fff;padding:22px 26px;min-height:150px;display:flex;align-items:flex-end;background-size:cover;background-position:center 55%}
.cat-head::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(24,10,70,.9),rgba(24,10,70,.65) 55%,rgba(24,10,70,.15))}.cat-head>div{position:relative;max-width:560px}
.catn{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ffd66b}.cat-head h2{font-size:clamp(24px,4vw,32px);color:#fff;margin:2px 0 4px}.cat-head p{margin:0;color:rgba(255,255,255,.92);font-size:16px}.cat-tr{margin-top:6px!important;color:#aef0e6!important;font-size:14.5px!important}
.lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-top:12px}
.lcard{position:relative;display:flex;gap:12px;align-items:flex-start;background:#fff;border-radius:16px;padding:14px 16px;text-decoration:none;box-shadow:0 6px 18px rgba(50,25,120,.08);border:2px solid transparent}
.lcard:hover{border-color:var(--v)}.lcard.done{border-color:#bfe8d3}.lno{flex:none;display:grid;place-items:center;min-width:44px;height:36px;padding:0 8px;border-radius:10px;background:var(--vt);color:var(--v);font-weight:800;font-size:15px}
.lbody h3{font-size:18px;margin:0 0 2px}.lp{margin:0;color:var(--ink2);font-size:14.5px}.lcard .badge{position:absolute;top:10px;right:10px;padding:3px 8px}
.ls-pad{padding:18px clamp(16px,4vw,32px) 28px}.steps{display:flex;gap:6px;margin-bottom:16px}.stp{flex:1;height:8px;border-radius:6px;background:#e4ddf6}.stp.past{background:#b9a6ef}.stp.cur{background:var(--v)}
.sh{font-size:clamp(22px,4vw,28px);margin:6px 0 4px}.sh-tr{margin:0 0 8px}.blk{margin:22px 0}.blk h3{font-size:21px;margin:0 0 4px}
.ls-lead{font-family:var(--serif);font-size:clamp(18px,3vw,20px);line-height:1.5;margin:14px 0 6px;max-width:40em}
.ls-pat{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;background:var(--vt);border-radius:10px;padding:9px 14px;margin:8px 0 10px}.ls-pat span{font-size:13px;font-weight:650;color:var(--v)}.ls-pat strong{font-family:var(--serif);font-size:18px;font-weight:600}
.ls-exs{margin:6px 0}.ex{margin-bottom:2px}
.tblw{overflow-x:auto;margin-top:8px;border-radius:14px;border:1px solid var(--line)}.tbl{width:100%;border-collapse:collapse;min-width:520px;background:#fff}
.tbl th,.tbl td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-weight:500}.tbl thead th{background:var(--v);color:#fff;font-size:17px;font-weight:800;text-align:center}.tbl thead th:first-child{background:#3a1f94}
.tbl tbody th{background:var(--vt);font-weight:700;color:var(--ink);white-space:nowrap}.tbl td{text-align:center}.cell{border:0;background:none;font:650 17px var(--sans);color:#2a1b72;padding:8px 6px;min-height:40px;border-radius:8px}.cell:hover{background:var(--vt)}
.tbl .ls-trs{font-size:13.5px}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}.cmpc{border:2px solid var(--line);border-radius:14px;padding:12px 14px;background:#fff}.cmpl{display:inline-block;background:var(--v);color:#fff;font-weight:800;padding:2px 12px;border-radius:999px;margin-bottom:6px}.cmpc p{margin:0 0 6px}
.coll{list-style:none;margin:8px 0 0;padding:0}.coll li{border-bottom:1px solid var(--line);padding:4px 0}.coll .ls-x{border:0}.coll .k{flex:none;min-width:150px;color:var(--v);font-size:17px}.coll .ls-x .w{font-size:17px;font-family:var(--sans);font-weight:500;color:var(--ink);flex:1}
.fig.diagf svg{box-shadow:none;border:1px solid var(--line)}.diag{display:block;width:100%;height:auto}
.memory{background:linear-gradient(135deg,#fff7e0,#ffeec2);border-radius:16px;padding:14px 18px;margin:20px 0;border:1px solid #f0d58a}.memory span{font-weight:800;color:var(--note);font-size:14px;text-transform:uppercase;letter-spacing:.05em}.memory p{margin:4px 0 0;font-size:18px;font-weight:600}
.ls-mis{list-style:none;margin:8px 0;padding:0}.ls-mis li{padding:12px 0;border-top:1px solid var(--line)}.ls-mis li:first-child{border-top:0}.ls-pair{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:4px}
.ls-pair .bad{color:var(--bad);background:var(--badbg);text-decoration:line-through;border-radius:7px;padding:2px 9px}.ls-pair .good{color:var(--good);background:var(--goodbg);border-radius:7px;padding:2px 9px;font-weight:700}.ls-pair .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.ls-mis .why{margin:0;color:var(--ink2);font-size:16px}
.ls-start{justify-content:flex-end;align-items:center}.ls-start .spacer{flex:1}
.pcat{margin-top:26px}.pcat-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.pcat-h h2{font-size:22px}.btn.mini{min-height:42px;padding:6px 16px;font-size:15px}.plock{display:inline-flex;gap:6px;align-items:center;color:var(--ink3);font-size:14.5px}
.plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:10px}.prow{display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:10px 14px;text-decoration:none;border:2px solid transparent;box-shadow:0 4px 14px rgba(50,25,120,.06)}.prow:hover{border-color:var(--v)}
.prow .pt{flex:1;font-weight:650}.prow .pt small{display:block;font-weight:500;color:var(--ink3);font-size:13.5px}.prow .go{color:var(--v);font-weight:800}.prow.locked{opacity:.65}.prow .lk{color:var(--ink3)}.stars{display:inline-flex}
.final{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:30px;background:linear-gradient(120deg,#3a1f94,#6d3df0);color:#fff;border-radius:18px;padding:22px 26px}.final h2{color:#fff}.final p{margin:4px 0 0;color:rgba(255,255,255,.9)}.final .btn.primary{background:#ffc83c;color:#3a2600;border-color:#c98a00}.final .plock{color:#e5dcff}
/* practice */
.top.game{justify-content:flex-start}.gt{display:flex;flex-direction:column;line-height:1.15;margin-right:auto;min-width:0}.gt b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gt small{color:var(--ink3);font-size:13px}
.ls-seg.mini button{min-height:36px;padding:0 10px;font-size:13px}
.pbar{height:6px;background:#e4ddf6}.pbar span{display:block;height:100%;background:var(--v);transition:width .25s}
.gmain{max-width:820px}.qbox{background:#fff;border-radius:20px;padding:18px clamp(14px,3vw,26px) 22px;box-shadow:0 12px 32px rgba(50,25,120,.08)}
.qtag{margin:0 0 8px;font-size:13.5px;font-weight:650;color:var(--v)}.stem{font-family:var(--serif);font-size:clamp(22px,4.2vw,30px);line-height:1.4;margin:4px 0 18px}.blank{display:inline-block;min-width:70px;border-bottom:4px solid var(--v);text-align:center;color:var(--v)}
.hintq{margin:0 0 8px;font-weight:650;color:var(--ink2)}.wrongw{color:var(--bad);text-decoration:line-through;background:var(--badbg);border-radius:6px;padding:0 6px}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.opts.four{grid-template-columns:repeat(2,1fr)}
.opt{display:flex;align-items:center;gap:10px;min-height:60px;padding:10px 14px;border:2px solid #d9d1ef;background:#fff;border-radius:14px;font-weight:700;font-size:20px;text-align:left}.opt:hover:not(:disabled){border-color:var(--v);background:var(--vt)}
.opt .ol{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#ece7f7;color:var(--v);font-size:15px;font-weight:800}.opt.good{border-color:var(--good);background:var(--goodbg);color:var(--good)}.opt.good .ol{background:var(--good);color:#fff}.opt.bad{border-color:var(--bad);background:var(--badbg);color:var(--bad)}.opt.bad .ol{background:var(--bad);color:#fff}
.opt:disabled{cursor:default}.opt.wide{width:100%;font-weight:600;font-size:18px;font-family:var(--serif)}.cmpopts{display:grid;gap:10px}.opt.small{min-height:44px;font-size:17px;padding:6px 14px}
.dlg{display:flex;flex-direction:column;gap:10px;margin:4px 0 18px}.bub{max-width:88%;padding:10px 16px;border-radius:18px;font-size:clamp(18px,3.4vw,22px);font-family:var(--serif)}.bub.l{background:#ece7f7;border-bottom-left-radius:4px}.bub.r{background:#dff3ef;align-self:flex-end;border-bottom-right-radius:4px}
.passage{font-family:var(--serif);font-size:clamp(18px,3.2vw,22px);line-height:1.8;margin:4px 0 14px}.pgap{display:inline-grid;place-items:center;min-width:34px;height:30px;padding:0 6px;border-radius:8px;border:2px dashed var(--v);color:var(--v);font:800 16px var(--sans)}.pgap.good{border:2px solid var(--good);background:var(--goodbg);color:var(--good);font-family:var(--serif);font-weight:700;font-size:18px}.pgap.bad{border:2px solid var(--bad);background:var(--badbg);color:var(--bad)}
.pg{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}.pgn{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--v);color:#fff;font-weight:800;font-size:15px}
.stage{margin-bottom:14px}.stage svg.scene{box-shadow:0 6px 18px rgba(30,15,80,.2)}
.fb{margin-top:16px;border-radius:14px;padding:14px 16px}.fb:empty{display:none}.fb.ok{background:var(--goodbg);border:1px solid #b4e3c9}.fb.no{background:var(--badbg);border:1px solid #f1bdb8}
.fbt{font-size:20px}.fb.ok .fbt b{color:var(--good)}.fb.no .fbt b{color:var(--bad)}.answ{background:#fff;border-radius:8px;padding:0 10px;border:2px solid var(--good);color:var(--good)}
.fbs{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-size:19px;margin:8px 0 4px}.fbm{margin:6px 0 0;font-size:16px;color:var(--ink2)}.fbm.tr{color:var(--tr);font-weight:600}.whys{margin:8px 0 0;padding-left:0;list-style:none}.whys li{margin:4px 0;font-size:15.5px}
.fb .btn{margin-top:12px}
.endm{display:grid;place-items:center}.end{text-align:center;background:#fff;border-radius:22px;padding:26px 22px;max-width:560px;width:100%;box-shadow:0 12px 32px rgba(50,25,120,.1)}.end h1{font-size:32px;margin:6px 0}.score{font-size:20px;font-weight:650;margin:0}.end .mm{margin:10px 0;display:flex;justify-content:center}
.weak{background:var(--vt);border-radius:14px;padding:10px 14px;margin:12px 0;text-align:left}.weak p{margin:0 0 6px;font-weight:700}.weak a{display:block;padding:6px 0;color:var(--v);font-weight:650}.weak small{color:var(--ink3);font-weight:500}.allok{color:var(--good);font-weight:700}.navrow{display:flex;gap:12px;flex-wrap:wrap}.navrow.center{justify-content:center;margin-top:10px}
@media (max-width:640px){.opts,.opts.four{grid-template-columns:1fr}.cmp{grid-template-columns:1fr}.coll .ls-x{flex-wrap:wrap}.coll .k{min-width:0;width:100%}.hero .mascot{height:120px!important;width:auto!important;opacity:.95}.stages a{padding-right:10px}.stages a .num{display:none}.bt small{display:none}.ls-rn{display:none}.hero-in{padding:20px}.cat-head{padding:18px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}

/* ===== picture stage (practice v5) ===== */
.pstage{position:relative;margin-bottom:12px}
.pstage svg.scene{box-shadow:0 8px 22px rgba(30,15,80,.22);border-radius:20px;background:#cfe}
.pstage .hot{cursor:pointer;outline:none}.pstage .hot rect{fill:transparent;stroke:transparent;stroke-width:4}
.pstage .hot:hover rect,.pstage .hot:focus-visible rect{stroke:rgba(255,255,255,.9);fill:rgba(255,255,255,.12)}
.pstage .it{transform-box:view-box;animation:none}
.pstage .it.mas{animation:bob 3.6s ease-in-out infinite}
.pstage .it.mas:nth-of-type(2n){animation-duration:4.2s;animation-delay:-1.3s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.pstage .it.tap{animation:tapb .5s ease}
@keyframes tapb{0%{transform:translateY(0) scale(1)}35%{transform:translateY(-16px) scale(1.06)}70%{transform:translateY(0) scale(.97)}100%{transform:translateY(0) scale(1)}}
.pstage .it.cheer{animation:cheer .9s cubic-bezier(.3,1.5,.5,1) both}
@keyframes cheer{0%{transform:translateY(0)}30%{transform:translateY(-34px) rotate(-4deg)}55%{transform:translateY(0)}75%{transform:translateY(-14px) rotate(3deg)}100%{transform:translateY(0)}}
.pstage .it.oops{animation:oops .6s ease both}
@keyframes oops{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px) rotate(-2deg)}40%{transform:translateX(8px) rotate(2deg)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.pstage .spk{animation:spk 1s ease-out both}
@keyframes spk{0%{transform:translate(0,0) scale(.3);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}
.pstage.is-ok svg.scene{box-shadow:0 0 0 4px #2fb6a8,0 8px 22px rgba(30,15,80,.22)}
.pstage.is-no svg.scene{box-shadow:0 0 0 4px #e8505b,0 8px 22px rgba(30,15,80,.22)}
.pcap{position:absolute;left:50%;bottom:12px;transform:translate(-50%,10px);background:#2a1a4d;color:#fff;font-weight:700;padding:6px 16px;border-radius:999px;opacity:0;pointer-events:none;transition:.2s;font-size:15px}
.pcap.on{opacity:.95;transform:translate(-50%,0)}
.pstage .ntag rect{fill:#fff;stroke:#7a4cc8;stroke-width:3}.pstage .ntag text{font-size:20px;font-weight:800;fill:#2a1a4d}
.pstage .hand{transform:rotate(var(--to,0deg))}
.pstage .hotday{animation:pulse 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes pulse{50%{transform:scale(1.12)}}
@media (prefers-reduced-motion:reduce){.pstage *{animation:none!important}}
.speak.aud{flex:none}.speak.aud.on{background:var(--v);color:#fff;animation:audp 1s ease-in-out infinite}
@keyframes audp{50%{box-shadow:0 0 0 7px rgba(122,76,200,.25)}}
@media(max-width:560px){.tbl{min-width:0;font-size:13.5px}.tbl th,.tbl td{padding:8px 4px}.tbl tbody th{white-space:normal;min-width:76px;font-size:13px}.cell{font:650 14px var(--sans);padding:8px 3px}.tbl thead th{font-size:13px}}

/* ===== JTS brand layer (v6): palette, logo, bubbles, type ===== */
:host{--bg:#f6f3ff;--ink:#141010;--ink2:#4e4b4b;--ink3:#6b6868;--v:#874bf8;--vd:#6a33d6;--vt:#f1eaff;--line:#e6ddfb;--cy:#0ac7ff;--gr:#00e641;--or:#ff7d1e;--ye:#fff805;
 --tr:#0b6158;--good:#00792a;--goodbg:#e5fcec;--bad:#b8470a;--badbg:#fff0e3;--note:#8a5a00;--notebg:#fff8dc;--bub:22px 22px 22px 6px}
.pw{font-weight:500;letter-spacing:-.003em}
h1,h2,h3{letter-spacing:-.015em}
:focus-visible{outline:3px solid var(--or);outline-offset:2px}
/* header */
.top{background:rgba(255,255,255,.96);border-bottom:0;box-shadow:0 1px 0 var(--line);min-height:64px}
.brand{gap:14px}.jts{display:inline-block;--lg:#141010;--lg-to:#874bf8;line-height:0}.jts svg{display:block;height:30px;width:auto}
.brand .bt{padding-left:14px;border-left:2px solid var(--line);justify-content:center}.bt b{font-size:15px;font-weight:700;color:var(--ink2);letter-spacing:0}
.stages{background:var(--vt);padding:4px}.stages a{color:var(--ink2);transition:background .15s,color .15s}.stages a:hover:not(.on){background:#fff}.stages .num{color:var(--v);font-weight:800}.stages a.on{background:var(--v);color:#fff;box-shadow:0 4px 12px rgba(135,75,248,.35)}
/* buttons */
.btn{border-radius:999px;border-width:2px;transition:transform .12s,box-shadow .12s,background .15s}
.btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(1px)}
.btn.primary{background:var(--v);border-color:var(--v);box-shadow:0 6px 16px rgba(135,75,248,.32)}.btn.primary:hover{background:var(--vd);border-color:var(--vd)}
.icon-btn{border-radius:50%;border:2px solid var(--line);transition:border-color .15s,background .15s}.icon-btn:hover{border-color:var(--v);background:var(--vt)}
/* hero + category + lesson banners */
.hero,.cat-head,.ls-head{border-radius:var(--bub);isolation:isolate}
.hero::before,.ls-head::before,.cat-head::before{background:linear-gradient(100deg,rgba(78,32,190,.95),rgba(135,75,248,.78) 52%,rgba(135,75,248,.08))}
.cat-head::before,.ls-head::before{background:linear-gradient(100deg,rgba(54,22,140,.93),rgba(98,50,214,.72) 55%,rgba(98,50,214,.06))}
.hero.small{background:var(--v)}.hero.small::before{background:linear-gradient(120deg,#6a33d6,#874bf8)}.hero.small::after{content:"";position:absolute;right:-40px;top:-50px;width:210px;height:210px;border-radius:50%;background:var(--cy);opacity:.9}
.kick{letter-spacing:.04em;text-transform:uppercase;font-size:13px;color:rgba(255,255,255,.9)}
.chip{display:inline-block;position:relative;margin-top:10px;background:var(--cy);color:#141010;border-radius:18px 18px 18px 5px;padding:8px 16px 10px;font-weight:600;font-size:15px}.chip b{font-weight:800}
.chipbar{display:block;height:5px;border-radius:5px;background:rgba(20,16,16,.18);margin-top:6px;overflow:hidden}.chipbar i{display:block;height:100%;background:#141010;border-radius:5px;transition:width .5s}
.cat-head{border-left:0}.cat-head::after{content:"";position:absolute;left:0;top:0;bottom:0;width:8px;background:var(--acc,#874bf8);z-index:1}
.catn{display:inline-block;background:var(--acc,#874bf8);color:var(--acci,#fff);border-radius:999px;padding:3px 12px;letter-spacing:.05em}
.cat-tr{color:#d6fbff!important}
/* cards */
.lcard,.prow{border-radius:20px 20px 20px 6px;border:2px solid transparent;box-shadow:0 6px 20px rgba(70,35,160,.08);transition:transform .15s,box-shadow .15s,border-color .15s}
.lcard:hover,.prow:not(.locked):hover{transform:translateY(-3px);border-color:var(--acc,#874bf8);box-shadow:0 12px 28px rgba(70,35,160,.16)}
.lno{background:var(--acc,#874bf8);color:var(--acci,#fff);border-radius:12px 12px 12px 4px;min-width:46px;height:38px}
.lcard.done{border-color:#9be9b2}.badge{background:var(--gr);color:#141010}
.lbody h3{font-size:18.5px}.lp{color:var(--ink3)}
.prow .go{background:var(--v);color:#fff;border-radius:999px;padding:4px 14px;font-size:14px}
.pcat-h h2{font-size:22px}.pcat-h h2::before{content:"";display:inline-block;width:10px;height:22px;border-radius:5px;background:var(--acc,#874bf8);margin-right:10px;vertical-align:-3px}
.final{background:var(--v);border-radius:var(--bub);position:relative;overflow:hidden}.final::after{content:"";position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:rgba(10,199,255,.35)}.final>*{position:relative;z-index:1}
.final .btn.primary{background:var(--ye);color:#141010;border-color:var(--ye);box-shadow:0 6px 16px rgba(0,0,0,.2)}.final .btn.primary:hover{background:#fff;border-color:#fff}
.goplay{padding:18px 20px;background:#fff;border-radius:var(--bub);box-shadow:0 6px 20px rgba(70,35,160,.08)}
/* lesson */
.ls-sheet{border-radius:var(--bub);box-shadow:0 10px 30px rgba(70,35,160,.09)}
.ls-seg{background:var(--vt);border-radius:999px}.ls-seg button{border-radius:999px}.ls-seg button[aria-pressed=true]{color:var(--v);box-shadow:0 2px 6px rgba(135,75,248,.2)}
.ls-seg button[data-tr=kk][aria-pressed=true],.ls-seg button[data-tr=ru][aria-pressed=true]{color:var(--v)}
.stp{height:8px;background:#e9e0fc}.stp.past{background:#c7a9fd}.stp.cur{background:var(--v)}
.ls-lead{font-weight:500;font-size:clamp(18px,3vw,21px);color:#2b2626}.pw .pw{font-weight:800}.ls-rn{font-family:var(--sans);font-weight:800;color:#d2bcfd}
.ls-x .w{font-family:var(--sans);font-weight:650;color:var(--ink)}.ls-pat strong{font-family:var(--sans);font-weight:700}
.ls-note{border-left-color:var(--or);background:var(--notebg);border-radius:0 14px 14px 0}.memory{background:#fff8dc;border:0;border-left:5px solid var(--ye);border-radius:0 16px 16px 0}
.ls-tr{background:#eefbff;border-color:#bfeeff;border-radius:16px}.ls-tr .trh,.ls-trs,.tkk,.trs,.cat-tr{color:#0a7fa6}.ls-tr p{color:#10324a}.ls-tr .trt{color:#0b4f73}
.ls-start{border-radius:999px;padding:10px 12px 10px 20px;box-shadow:0 12px 32px rgba(70,35,160,.22)}
.tbl thead th{background:var(--v)}.tbl thead th:first-child{background:#5a28c8}.tbl tbody th{background:var(--vt)}.tblw{border-radius:16px;border-color:var(--line)}.cell{color:#4a1fb5}.cell:hover{background:var(--vt)}
.cmpl{background:var(--v)}.cmpc{border-radius:18px 18px 18px 6px}
.ls-pair .bad{background:var(--badbg)}.ls-pair .good{background:var(--goodbg)}
/* practice */
.pbar{height:8px;background:#e9e0fc}.pbar span{background:linear-gradient(90deg,var(--v),var(--cy));border-radius:0 8px 8px 0}
.qbox{border-radius:var(--bub);box-shadow:0 12px 34px rgba(70,35,160,.1)}
.qtag{color:var(--v);letter-spacing:.02em}.stem{font-family:var(--sans);font-weight:650;line-height:1.38}.blank{border-bottom-color:var(--v);color:var(--v)}
.opt{border:2px solid #ded3f9;border-radius:18px 18px 18px 6px;transition:transform .12s,border-color .15s,background .15s,box-shadow .15s}
.opt:hover:not(:disabled){border-color:var(--v);background:var(--vt);transform:translateY(-2px);box-shadow:0 8px 18px rgba(135,75,248,.15)}.opt:active:not(:disabled){transform:translateY(1px)}
.opt .ol{background:var(--vt);color:var(--v)}
.opt.good{border-color:var(--gr);background:var(--goodbg);color:var(--good)}.opt.good .ol{background:var(--gr);color:#141010}
.opt.bad{border-color:var(--or);background:var(--badbg);color:var(--bad)}.opt.bad .ol{background:var(--or);color:#141010}
.opt.wide{font-family:var(--sans)}
.bub{font-family:var(--sans);font-weight:500}.bub.l{background:var(--vt)}.bub.r{background:#e3f8ff}.passage{font-family:var(--sans);font-weight:500}
.pgap{border-color:var(--v);color:var(--v)}.pgap.good{border-color:var(--gr);background:var(--goodbg);color:var(--good);font-family:var(--sans)}.pgap.bad{border-color:var(--or);background:var(--badbg);color:var(--bad)}.pgn{background:var(--v)}
.fb{border-radius:22px 22px 22px 6px;animation:rise .28s ease both}.fb.ok{background:var(--goodbg);border:2px solid #7fe99d}.fb.no{background:var(--badbg);border:2px solid #ffb27a}
.fb.ok .fbt b{color:var(--good)}.fb.no .fbt b{color:var(--bad)}.fbs{font-family:var(--sans);font-weight:650}.answ{border-color:var(--gr);color:var(--good)}.wrongw{color:var(--bad);background:var(--badbg)}
.fbm.tr{color:#0a7fa6}
.pstage svg.scene{border-radius:22px 22px 22px 8px}.pstage.is-ok svg.scene{box-shadow:0 0 0 4px var(--gr),0 8px 22px rgba(30,15,80,.22)}.pstage.is-no svg.scene{box-shadow:0 0 0 4px var(--or),0 8px 22px rgba(30,15,80,.22)}
.pcap{background:var(--v)}.pstage .ntag rect{stroke:var(--v)}.pstage .ntag text{fill:#141010}
.speak{border:2px solid var(--line)}.speak.aud.on{background:var(--v)}
.end{border-radius:var(--bub)}.weak{background:var(--vt);border-radius:16px}.weak a{color:var(--v)}
/* footer */
.foot{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:26px 16px 36px;color:var(--ink3);font-size:14px}.foot .jts svg{height:22px;opacity:.9}.foot .tag-en{color:var(--v);font-weight:600}
/* motion */
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
main>*{animation:rise .35s ease both}main>*:nth-child(2){animation-delay:.04s}main>*:nth-child(3){animation-delay:.08s}
@media(max-width:640px){.jts svg{height:26px}.brand .bt{display:none}.chip{font-size:14px}.hero .mascot{height:110px!important}}
@media(prefers-reduced-motion:reduce){main>*,.fb{animation:none!important}.opt,.lcard,.btn{transition:none!important}}

/* a11y layer (v7): contrast + 44px touch targets */
.foot .tag-en{color:var(--vd)}
.hero .kick,.hero p,.hero.small .kick,.hero.small p{color:#fff;opacity:1}
.ls-seg.mini button{min-height:44px}
.speak,.speak.aud{width:44px;height:44px}
.stp{position:relative}.stp::after{content:"";position:absolute;left:0;right:0;top:-18px;bottom:-18px}
.brand{min-height:44px}
.cell{min-height:44px}
.btn.mini{min-height:44px}
/* text-over-photo legibility: keep the overlay dense under the copy on narrow screens */
.hero-in,.cat-head>*,.ls-head>*{text-shadow:0 1px 3px rgba(30,10,90,.45)}
@media(max-width:760px){.hero::before,.ls-head::before,.cat-head::before{background:linear-gradient(100deg,rgba(78,32,190,.96),rgba(100,48,215,.9) 58%,rgba(120,64,235,.72))}}
@media(max-width:760px){.hero.small::after{width:110px;height:110px;right:-34px;top:-62px}}
#main:focus,#main:focus-visible{outline:none}
/* hover feedback without moving the hit box (a lifted element under a resting pointer flickers hover on/off at its edge) */
.opt:hover:not(:disabled),.btn:hover,.lcard:hover,.prow:not(.locked):hover,.tcard:hover,.wcard:not(.locked):hover{transform:none}
.final p{color:#fff}

`
