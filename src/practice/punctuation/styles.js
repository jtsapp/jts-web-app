// CSS «Punctuation World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/punctuation/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS/DARK_APP_CSS генератора (там же — что
// и почему отличается от прототипа).

export const PUNCTUATION_CSS = `:host{
 --violet:#874BF8;--violet-d:#6B33E6;--violet-dd:#4F22B8;--violet-l:#F1EAFF;--violet-m:#DCCBFF;
 --cyan:#0AAFFF;--cyan-t:#0077B8;--cyan-l:#E2F5FF;
 --green:#00D441;--green-t:#00823A;--green-l:#E1FAE9;
 --orange:#FF7D1D;--orange-t:#C9520A;--orange-l:#FFEEE0;
 --yellow:#FFAD00;--yellow-t:#9A6500;--yellow-l:#FFF3D1;
 --ink:#141217;--ink2:#4E4B55;--ink3:#86838F;--line:#ECE8F4;--line2:#DDD7EA;
 --bg:#F8F6FD;--card:#fff;
 --ok:#00A63E;--ok-l:#E3F8EA;--bad:#E5484D;--bad-l:#FFECEC;--alt:#8B5CF6;--alt-l:#F1EAFF;
 --r-xl:32px;--r-lg:24px;--r-md:18px;--r-sm:12px;
 --sh1:0 1px 2px rgba(40,20,90,.06),0 6px 18px rgba(60,30,140,.06);
 --sh2:0 2px 6px rgba(40,20,90,.06),0 18px 44px rgba(60,30,140,.12);
 --font:var(--punct-font,inherit);
 --ease:cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}

.punct{margin:0;font-family:var(--font);font-size:16.5px;line-height:1.55;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;display:block}
button{font:inherit;color:inherit;cursor:pointer}
a{color:var(--violet-d)}
:focus-visible{outline:3px solid var(--violet);outline-offset:2px;border-radius:8px}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.narrow{max-width:960px}
h1,h2,h3,h4{margin:0;line-height:1.12;letter-spacing:-.022em;font-weight:800}
p{margin:0}
.eyebrow{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--violet-d)}


.f-end{--fc:var(--orange);--ft:var(--orange-t);--fl:var(--orange-l)}
.f-link{--fc:var(--cyan);--ft:var(--cyan-t);--fl:var(--cyan-l)}
.f-sig{--fc:var(--violet);--ft:var(--violet-d);--fl:var(--violet-l)}
.f-voice{--fc:var(--green);--ft:var(--green-t);--fl:var(--green-l)}
.f-word{--fc:var(--yellow);--ft:var(--yellow-t);--fl:var(--yellow-l)}


.mk{--s:56px;position:relative;display:inline-grid;place-items:center;width:var(--s);height:var(--s);flex:none;color:var(--ft,var(--violet-d));font-weight:800;font-size:calc(var(--s)*.72);line-height:1}
.mk>i{font-style:normal;transform:translateY(-.04em)}
.sprite-ok .mk[data-i]{background-image:var(--sprite);background-size:1200% 100%;background-repeat:no-repeat;background-position:calc(var(--i)*100%/11) 0}
.sprite-ok .mk[data-i]>i{opacity:0}


.top{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.86);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid rgba(220,210,240,.7)}
.top .wrap{display:flex;align-items:center;gap:14px;height:64px;max-width:1280px}
.brand{display:flex;align-items:center;gap:12px;background:none;border:0;padding:0;text-align:left}
.logo{height:26px;width:auto}
.lo-w{fill:var(--ink)}.lo-to{fill:var(--violet)}
.brand-sep{width:1px;height:24px;background:var(--line2)}
.brand-name{font-weight:800;font-size:15.5px;letter-spacing:-.01em;white-space:nowrap}
.brand-name b{color:var(--violet)}
.nav{display:flex;gap:4px;margin-left:10px}
.nav button{background:none;border:0;padding:8px 14px;border-radius:999px;font-weight:600;color:var(--ink2);font-size:15px}
.nav button:hover{background:var(--violet-l);color:var(--violet-d)}
.nav button[aria-current=page]{background:var(--violet-l);color:var(--violet-d)}
.sp{flex:1}
.pill{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;background:#fff;border:1px solid var(--line2);font-weight:700;font-size:14px;white-space:nowrap}
.pill svg{width:16px;height:16px;color:var(--yellow)}
.pill small{color:var(--ink3);font-weight:600}
.ibtn{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1px solid var(--line2);background:#fff}
.ibtn svg{width:19px;height:19px}
.ibtn[aria-pressed=false]{color:var(--ink3)}
.trbar{display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;border:1px solid var(--line2);background:#fff}
.trbar .cap{display:flex;align-items:center;gap:6px;padding:0 8px 0 6px;color:var(--ink3);font-size:13px;font-weight:600}
.trbar .cap img{width:26px;height:26px;object-fit:contain;margin:-4px 0}
.trb{border:0;background:none;padding:6px 11px;border-radius:999px;font-weight:700;font-size:13.5px;color:var(--ink2)}
.trb[aria-pressed=true]{background:var(--violet);color:#fff}


.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 24px;border-radius:999px;border:0;font-weight:700;font-size:16px;letter-spacing:-.005em;transition:transform .15s var(--ease),box-shadow .2s,background .2s;text-decoration:none;white-space:nowrap}
.btn svg{width:19px;height:19px}
.btn-p{background:var(--violet);color:#fff;box-shadow:0 8px 22px rgba(135,75,248,.32)}
.btn-p:hover{background:var(--violet-d);transform:translateY(-1px)}
.btn-p:disabled{background:#C9B8F2;box-shadow:none;cursor:not-allowed;transform:none}
.btn-s{background:#fff;color:var(--ink);border:1.5px solid var(--line2)}
.btn-s:hover{border-color:var(--violet);color:var(--violet-d)}
.btn-sm{min-height:40px;padding:0 16px;font-size:14.5px}
.linkbtn{background:none;border:0;padding:0;color:var(--violet-d);font-weight:700;text-decoration:underline;text-underline-offset:3px}


.bub{position:relative;background:#fff;border-radius:22px 22px 22px 6px;padding:14px 18px;box-shadow:var(--sh1);font-size:15.5px}
.bub b.who{display:block;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--violet-d);margin-bottom:2px}
.says{display:flex;align-items:flex-end;gap:12px}
.says .av{width:78px;height:78px;flex:none;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(60,30,140,.18))}
.says .bub{flex:1}


.tr{display:none;margin-top:6px;padding-left:12px;border-left:3px solid var(--violet-m);color:var(--ink2);font-size:.94em}
.punct[data-tr=ru] .tr-ru,.punct[data-tr=kk] .tr-kk{display:block}


.hero{position:relative;overflow:hidden;background:linear-gradient(115deg,#E7D9FF 0%,#D9E6FF 45%,#CFF1FA 100%)}
.hero-frame{position:relative;max-width:1600px;margin:0 auto;aspect-ratio:16/9;max-height:calc(100vh - 64px);min-height:560px}
.hero-art{position:absolute;top:0;bottom:0;left:7%;width:100%;height:100%;object-fit:cover;object-position:50% 50%;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 9%);mask-image:linear-gradient(90deg,transparent 0,#000 9%)}
.hero-copy{position:absolute;left:clamp(24px,5cqw,80px);top:clamp(28px,7vh,90px);max-width:540px;z-index:3}
.hero-copy .eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.75);padding:7px 14px;border-radius:999px;color:var(--violet-dd)}
.hero h1{font-size:clamp(44px,5.2cqw,80px);margin:16px 0 14px;letter-spacing:-.035em;line-height:.95;color:var(--ink)}
.hero h1 span{color:var(--violet)}
.hero .lead{font-size:clamp(17px,1.45cqw,19.5px);color:#2E2A3A;max-width:440px}
.hero .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
.crew{position:absolute;left:5%;bottom:8.5%;width:39%;height:36%;z-index:2;pointer-events:none}
.crew img{position:absolute;bottom:0;height:auto;filter:drop-shadow(0 14px 10px rgba(60,40,120,.22))}
.crew .shadow{position:absolute;bottom:-1.5%;height:7%;border-radius:50%;background:radial-gradient(closest-side,rgba(60,50,110,.32),transparent);filter:blur(2px)}
.crew .c1{left:4%;width:23%}.crew .c2{left:25%;width:20%}.crew .c3{left:45%;width:22%}.crew .c4{left:66%;width:18%}
.bob{animation:bob 4.8s ease-in-out infinite}
.crew .c2.bob{animation-delay:-1.2s}.crew .c3.bob{animation-delay:-2.4s}.crew .c4.bob{animation-delay:-3.6s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.drift{position:absolute;z-index:2;pointer-events:none;animation:drift 9s ease-in-out infinite}
@keyframes drift{0%,100%{transform:translate(0,0) rotate(-6deg)}50%{transform:translate(8px,-14px) rotate(6deg)}}

.sec{padding:84px 0}
.sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:34px;flex-wrap:wrap}
.sec-head h2{font-size:clamp(30px,3.6cqw,46px);margin-top:10px}
.sec-head p.sub{color:var(--ink2);max-width:560px;margin-top:10px;font-size:17px}



.role{background:#fff;border-radius:var(--r-lg);padding:16px;box-shadow:var(--sh1);display:flex;flex-direction:column;gap:12px}
.role h3{font-size:24px}
.role .job{font-weight:700;color:var(--violet-d);font-size:14px;margin-top:-6px}
.role p{color:var(--ink2);font-size:15px}


.legend{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px}
.fam{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--fl);color:var(--ft);font-weight:700;font-size:14px}
.fam .mk{--s:30px;background-color:#fff;border-radius:50%}
.fam small{font-weight:600;color:var(--ink2);margin-left:2px}


.isles{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.isle-tab{position:relative;text-align:left;border:2px solid transparent;background:#fff;border-radius:var(--r-lg);padding:0;overflow:hidden;box-shadow:var(--sh1);transition:transform .2s var(--ease),box-shadow .2s,border-color .2s}
.isle-tab:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.isle-tab[aria-selected=true]{border-color:var(--violet);box-shadow:0 0 0 4px rgba(135,75,248,.14),var(--sh2)}
.isle-art{height:118px;background-color:#DCE9FF;background-image:var(--world);background-size:var(--bs,300%);background-position:var(--bp,50% 50%);position:relative}
.isle-art .band{position:absolute;left:10px;top:10px;background:#fff;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:800}
.isle-tab .meta{padding:12px 14px 14px}
.isle-tab h3{font-size:17px;letter-spacing:-.01em}
.isle-tab .bar{height:6px;border-radius:9px;background:var(--line);margin-top:10px;overflow:hidden}
.isle-tab .bar i{display:block;height:100%;background:var(--violet);border-radius:9px}
.isle-tab small{color:var(--ink3);font-weight:600;font-size:12.5px}
.isle-panel{margin-top:22px;background:#fff;border-radius:var(--r-xl);box-shadow:var(--sh1);padding:28px;display:grid;grid-template-columns:300px 1fr;gap:28px}
.isle-panel .intro h3{font-size:30px}
.isle-panel .intro p{color:var(--ink2);margin-top:8px}
.isle-panel .intro .says{margin-top:18px}
.topics{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.topic{display:flex;align-items:center;gap:16px;padding:12px 14px;border-radius:var(--r-md);border:1.5px solid var(--line);background:#fff;text-align:left;width:100%;transition:border-color .2s,background .2s}
.topic:hover{border-color:var(--violet-m);background:#FCFAFF}
.topic .mkbox{width:58px;height:58px;border-radius:18px 18px 18px 6px;background:var(--fl);display:grid;place-items:center;flex:none}
.topic .mkbox .mk{--s:48px}
.topic .tx{flex:1;min-width:0}
.topic .tx b{display:block;font-size:16.5px;letter-spacing:-.01em}
.topic .tx span{display:block;color:var(--ink2);font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topic .num{font-size:12.5px;font-weight:700;color:var(--ink3)}


.exband{position:relative;border-radius:var(--r-xl);overflow:hidden;min-height:420px;display:flex;align-items:flex-end;background:linear-gradient(120deg,#E4D6FF,#CDEFFF);box-shadow:var(--sh2)}
.exband img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%}
.exband .panel{position:relative;margin:26px;background:rgba(255,255,255,.93);backdrop-filter:blur(10px);border-radius:var(--r-lg);padding:24px;max-width:520px;box-shadow:var(--sh1)}
.exband h2{font-size:clamp(28px,3cqw,40px);margin:8px 0 10px}
.exband p{color:var(--ink2)}

.foot{padding:40px 0 60px;color:var(--ink3);font-size:14px}
.method{background:#fff;border-radius:var(--r-lg);box-shadow:var(--sh1);padding:6px 22px}
.method summary{cursor:pointer;font-weight:700;color:var(--ink);padding:14px 0;list-style:none}
.method summary::-webkit-details-marker{display:none}
.method summary::before{content:"+";display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--violet-l);color:var(--violet-d);margin-right:10px;font-weight:800}
.method[open] summary::before{content:"–"}
.method ul{margin:0 0 18px;padding-left:20px;color:var(--ink2);font-size:15px;display:grid;gap:8px}
.foot .row{display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:22px}


.l-top{background:linear-gradient(180deg,#EFE6FF,var(--bg))}
.crumb{display:flex;align-items:center;gap:10px;padding-top:22px;color:var(--ink2);font-size:14.5px;font-weight:600;flex-wrap:wrap}
.crumb button{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line2);border-radius:999px;padding:7px 14px 7px 10px;font-weight:700;font-size:14px}
.crumb svg{width:16px;height:16px}
.l-head{display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:center;padding:30px 0 34px}
.l-badge{width:200px;height:200px;border-radius:56px 56px 56px 14px;background:var(--fl);display:grid;place-items:center;position:relative;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)}
.l-badge .mks{display:flex;align-items:center;justify-content:center;gap:0}
.l-badge .mk{--s:120px}
.l-badge .mks.m2 .mk{--s:96px}.l-badge .mks.m3 .mk{--s:74px}
.l-head h1{font-size:clamp(34px,4.4cqw,56px);margin:8px 0 14px}
.l-head .fam{margin-bottom:16px}
.outcome{background:#fff;border-radius:var(--r-md);padding:14px 18px;box-shadow:var(--sh1);max-width:640px}
.outcome small{display:block;font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ok)}
.stepnav{position:sticky;top:64px;z-index:30;background:rgba(248,246,253,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.stepnav ol{list-style:none;margin:0 auto;padding:10px 24px;display:flex;gap:8px;max-width:960px;overflow-x:auto;scrollbar-width:none}
.stepnav ol::-webkit-scrollbar{display:none}
.stepnav a{display:flex;align-items:center;gap:8px;padding:7px 14px 7px 8px;border-radius:999px;text-decoration:none;color:var(--ink2);font-weight:700;font-size:14.5px;white-space:nowrap;background:#fff;border:1px solid var(--line)}
.stepnav a i{font-style:normal;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--violet-l);color:var(--violet-d);font-size:12.5px}
.stepnav a.on{background:var(--violet);border-color:var(--violet);color:#fff}
.stepnav a.on i{background:#fff}
.lsec{padding:48px 0 8px}
.lsec>.wrap>h2{font-size:clamp(26px,3cqw,36px);display:flex;align-items:center;gap:14px;margin-bottom:8px}
.lsec>.wrap>h2 .q{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--violet);padding:5px 11px;border-radius:999px;font-weight:800}
.lsec .sub{color:var(--ink2);margin-bottom:22px;font-size:16.5px}
.look{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:18px}
.glyph{background:#fff;border-radius:var(--r-lg);padding:18px;box-shadow:var(--sh1);display:flex;align-items:center;gap:16px}
.glyph .mkbox{width:84px;height:84px;border-radius:24px 24px 24px 8px;background:var(--fl);display:grid;place-items:center;flex:none}
.glyph .mkbox .mk{--s:70px}
.glyph b{display:block;font-size:18px}
.glyph span{color:var(--ink2);font-size:14px}
.defcard{background:#fff;border-radius:var(--r-lg);padding:22px 24px;box-shadow:var(--sh1);font-size:18px}
.gloss{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.gloss details{background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:8px 14px;max-width:100%}
.gloss details[open]{border-color:var(--violet-m);flex-basis:100%}
.gloss summary{cursor:pointer;font-weight:700;list-style:none}
.gloss summary::-webkit-details-marker{display:none}
.gloss summary::after{content:" ＋";color:var(--violet)}
.gloss details[open] summary::after{content:" －"}
.gloss details p{margin-top:6px;color:var(--ink2);font-size:15px}
.job{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bigline{background:var(--violet);color:#fff;border-radius:28px 28px 28px 8px;padding:26px 28px;font-size:clamp(20px,2.1cqw,26px);font-weight:700;letter-spacing:-.015em;line-height:1.3}
.bigline .tr{color:#EDE4FF;border-color:rgba(255,255,255,.5);font-weight:500;font-size:16px}
.hearpair{background:#fff;border-radius:var(--r-lg);padding:20px;box-shadow:var(--sh1)}
.hearpair h3{font-size:17px;margin-bottom:10px}
.hp-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:var(--bg);margin-top:8px}
.hp-row .tx{flex:1}
.hp-row .lab{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.hp-row.no .lab{color:var(--bad)}.hp-row.yes .lab{color:var(--ok)}
.hear{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:0;background:var(--violet-l);color:var(--violet-d);flex:none}
.hear svg{width:18px;height:18px}
.hear.on{background:var(--violet);color:#fff}
.rules{display:grid;gap:16px}
.rule{background:#fff;border-radius:var(--r-lg);padding:22px 24px;box-shadow:var(--sh1)}
.rule-h{display:flex;align-items:flex-start;gap:12px;margin-bottom:8px}
.rule-h h3{font-size:20px;flex:1}
.tag{flex:none;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-top:2px}
.tag.Rule{background:var(--violet);color:#fff}
.tag.Standard{background:var(--cyan-l);color:var(--cyan-t)}
.tag.Style{background:var(--yellow-l);color:var(--yellow-t)}
.tag.Option{background:var(--green-l);color:var(--green-t)}
.rule .t{color:var(--ink2)}
.ex{display:grid;gap:8px;margin-top:14px}
.ex-ok{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:var(--ok-l)}
.ex-ok .ic{color:var(--ok);font-weight:800}
.ex-ok .tx{flex:1;font-size:16.5px}
mark.hl{background:var(--violet-l);color:var(--violet-dd);font-weight:800;padding:0 3px;border-radius:6px;box-shadow:inset 0 -2px 0 var(--violet-m)}
.fix{border-radius:14px;border:1.5px dashed #F2B7B9;background:#FFF8F8;padding:10px 12px}
.fix .top-row{display:flex;align-items:center;gap:12px}
.fix .tx{flex:1}
.fix s{color:#A13C40;text-decoration-thickness:1.5px}
.fix .after{display:none;margin-top:8px;padding-top:8px;border-top:1px solid #F4D2D3}
.fix.open{border-style:solid;border-color:#CDEBD7;background:#F6FCF8}
.fix.open .after{display:block}
.fix .after b{color:var(--ok)}
.fix .after span{display:block;color:var(--ink2);font-size:14.5px;margin-top:4px}
.fixbtn{border:0;background:var(--bad);color:#fff;font-weight:700;font-size:13.5px;border-radius:999px;padding:7px 14px;white-space:nowrap}
.fix.open .fixbtn{background:var(--ok)}
.doc{background:#fff;border-radius:var(--r-lg);box-shadow:var(--sh1);overflow:hidden}
.doc-h{display:flex;align-items:center;gap:10px;padding:12px 18px;background:#FBFAFE;border-bottom:1px solid var(--line);font-weight:700;font-size:14px;color:var(--ink2)}
.doc-h i{width:10px;height:10px;border-radius:50%;background:var(--line2);display:inline-block}
.doc-b{padding:20px 22px;font-size:18px;line-height:1.85}
.doc-b button.n{border:0;background:var(--violet-l);color:var(--violet-dd);font-weight:800;border-radius:8px;padding:0 4px;margin:0 1px;position:relative}
.doc-b button.n sup{font-size:10px;color:var(--violet);margin-left:1px}
.doc-b button.n.on{background:var(--violet);color:#fff}
.doc-b button.n.on sup{color:#fff}
.doc-notes{list-style:none;margin:0;padding:6px 22px 20px;display:grid;gap:6px;counter-reset:n}
.doc-notes li{display:flex;gap:10px;font-size:15px;color:var(--ink2);padding:6px 8px;border-radius:10px}
.doc-notes li b{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--violet-l);color:var(--violet-d);font-size:12px}
.doc-notes li.on{background:var(--violet-l);color:var(--ink)}
.vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:10px}
.vs .side{background:var(--bg);border-radius:14px;padding:10px 14px;font-weight:700;text-align:center}
.vs em{font-style:normal;font-weight:800;color:var(--violet)}
.cards2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.card{background:#fff;border-radius:var(--r-lg);padding:22px 24px;box-shadow:var(--sh1)}
.card h3{font-size:18px;margin-bottom:10px}
.splist{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.splist li{display:flex;gap:10px;color:var(--ink2)}
.splist li::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:var(--violet);margin-top:9px}
.ukus{display:flex;gap:14px;align-items:flex-start}
.flags{display:flex;flex-direction:column;gap:6px;flex:none}
.flags span{font-size:12px;font-weight:800;border-radius:8px;padding:4px 8px;background:var(--cyan-l);color:var(--cyan-t);text-align:center}
.flags span+span{background:var(--orange-l);color:var(--orange-t)}
.srcs{margin:0;padding-left:18px;color:var(--ink2);font-size:14.5px;display:grid;gap:4px}
.route{position:relative;display:grid;gap:22px;padding:56px 0 30px}
.stage{position:relative;display:grid;grid-template-columns:96px 1fr;gap:22px;align-items:start}
.stage .node{position:relative;z-index:1;width:96px;height:96px;border-radius:32px 32px 32px 10px;background:#fff;box-shadow:var(--sh2);display:grid;place-items:center;font-weight:800}
.stage .node b{font-size:34px;line-height:1;color:var(--violet)}
.stage .node small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);text-align:center;margin-top:-18px}
.stage .node img{position:absolute;right:-26px;bottom:-14px;width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 6px 6px rgba(60,30,140,.2))}
.route::before{content:"";position:absolute;left:47px;top:80px;bottom:60px;width:0;border-left:4px dashed #E2D4C2;border-radius:2px}
.stars{display:inline-flex;gap:2px}
.stars i{width:18px;height:18px;color:#E3DDF0}
.stars i.on{color:var(--yellow)}
.stars svg{width:100%;height:100%}
.stage.locked .node{filter:grayscale(1);opacity:.7}
.lockline{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:var(--ink3)}
.lockline svg{width:16px;height:16px}


.play{min-height:calc(100vh - 64px);position:relative;background:linear-gradient(180deg,#E7DCFF 0%,#DDEBFF 55%,#F4F7FF 100%)}
.play>img.bg{position:fixed;inset:64px 0 0 0;width:100%;height:calc(100% - 64px);object-fit:cover;object-position:50% 100%;pointer-events:none}
.dots{display:flex;gap:5px}
.dots i{width:10px;height:10px;border-radius:50%;background:var(--line2)}
.dots i.cur{background:var(--violet);box-shadow:0 0 0 3px rgba(135,75,248,.22)}
.dots i.s3{background:var(--ok)}.dots i.s2{background:var(--yellow)}.dots i.s1{background:#F3A3A5}
.how{display:flex;gap:10px;align-items:flex-start;background:var(--violet-l);border-radius:16px;padding:12px 14px;font-size:15px;color:var(--violet-dd);margin-bottom:20px}
.rq{font-size:clamp(20px,2.2cqw,25px);font-weight:800;letter-spacing:-.015em;margin-bottom:16px}
.ln{display:block}
.ln+.ln{margin-top:4px}

.w{display:inline;border:0;background:none;padding:0;font:inherit;color:inherit;line-height:inherit;border-radius:6px}
button.w{cursor:pointer;transition:background-color .15s}
button.w:hover{background-color:var(--violet-l)}
@keyframes pop{0%{transform:scale(.6)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
.changed{background:#FFF3CF!important;color:#8A5A00!important;border-radius:6px}

.st-ok{border-color:var(--ok)!important;background:var(--ok-l)!important;color:#0A6B2E!important}
.st-bad{border-color:var(--bad)!important;background:var(--bad-l)!important;color:#A3262B!important}
.st-alt{border-color:var(--alt)!important;background:var(--alt-l)!important;color:#5B2BC4!important}
.st-miss{outline:2px dashed var(--bad);outline-offset:2px;border-radius:6px}
.reader{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line2);background:#fff;border-radius:999px;padding:4px 16px 4px 4px;font-weight:700;font-size:14.5px;min-height:46px}
.reader img{width:38px;height:38px;object-fit:contain;border-radius:50%;background:#FFEDE3}
.reader.on{border-color:var(--violet);color:var(--violet-d)}
@keyframes palin{from{opacity:0;transform:translateY(6px) scale(.98)}}
.versions{margin-top:10px;display:grid;gap:6px}
.versions div{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.75);border-radius:12px;padding:6px 8px 6px 12px;font-size:15.5px}
.versions div span{flex:1}
.versions div b{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);width:62px;flex:none}

.burst{position:fixed;pointer-events:none;z-index:80}
.burst i{position:absolute;width:9px;height:9px;border-radius:3px;animation:burst .8s ease-out forwards}
@keyframes burst{to{transform:translate(var(--x),var(--y)) rotate(260deg);opacity:0}}
.shake{animation:shake .4s}
@keyframes shake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.view-in{animation:viewin .35s var(--ease)}
@keyframes viewin{from{opacity:0;transform:translateY(8px)}}


@container punct (max-width:1080px){
 .isles{grid-template-columns:repeat(3,1fr)}
 .isle-panel{grid-template-columns:1fr}
}
@container punct (max-width:860px){
 .nav{display:none}
 .trbar .cap span{display:none}
 .hero-frame{aspect-ratio:auto;max-height:none;min-height:0;display:flex;flex-direction:column}
 .hero-copy{position:relative;left:auto;top:auto;max-width:none;padding:28px 22px 18px}
 .hero-stage{position:relative;aspect-ratio:4/3;overflow:hidden}
 .hero-art{left:0;object-position:24% 62%;-webkit-mask-image:none;mask-image:none}
 .crew{left:6%;bottom:6%;width:82%;height:42%}
 .job{grid-template-columns:1fr}
 .l-head{grid-template-columns:1fr;gap:20px}
 .l-badge{width:140px;height:140px;border-radius:42px 42px 42px 12px}
 .l-badge .mk{--s:88px}.l-badge .mks.m2 .mk{--s:68px}.l-badge .mks.m3 .mk{--s:54px}
}
@container punct (min-width:861px){.hero-stage{position:absolute;inset:0}}
@container punct (max-width:640px){
 .punct{font-size:16px}
 .wrap{padding:0 16px}
 .top .wrap{gap:8px;height:58px}
 .stepnav{top:58px}
 .play>img.bg{inset:58px 0 0 0}
 .brand-sep,.brand-name small{display:none}
 .logo{height:22px}
 .brand-name{font-size:14px}
 .pill{padding:0 10px;height:36px}
 .trbar{display:none}
 .sec{padding:56px 0}
 .isles{grid-template-columns:1fr 1fr}
 .isle-tab:last-child{grid-column:span 2}
 .isle-art{height:92px}
 .isle-panel{padding:18px;border-radius:var(--r-lg)}
 .role{padding:10px}
 .role h3{font-size:19px}
 .role p{font-size:13.5px}
 .topic{gap:12px;padding:10px}
 .topic .mkbox{width:48px;height:48px}
 .topic .mkbox .mk{--s:40px}
 .exband{min-height:520px}
 .exband .panel{margin:12px;padding:18px}
 .stage{grid-template-columns:1fr}
 .stage .node{display:none}
 .route::before{display:none}
 .reader{flex:1 0 100%;justify-content:center}
 @keyframes sheet{from{transform:translateY(100%)}}
 .doc-b{font-size:17px}
}
@media (prefers-reduced-motion:reduce){
 *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
}
.trbar.inline{display:inline-flex!important}
.trbar.inline .cap span{display:inline!important}
.hearpair h3{display:flex;align-items:center;gap:8px}
.hearpair h3 img.mini{width:40px;height:40px;object-fit:contain}
.ledge{position:absolute;left:-4%;bottom:-6%;width:52%;height:30%;border-radius:50%;background:radial-gradient(ellipse at 50% 30%,#CDEBB6,#A9D98F 60%,#93C97C);box-shadow:inset 0 -18px 0 rgba(135,75,248,.18)}
.has-art .ledge{display:none}
.hero-stage .fb-isle{position:absolute;border-radius:48% 52% 46% 54%/38% 40% 60% 62%;background:linear-gradient(180deg,#D5F0C4 0 30%,#B9A2FF 30% 60%,#7FD0FF 60%);opacity:.9}
.has-art .fb-isle{display:none}
@container punct (max-width:480px){.top .pill{display:none}}
@container punct (max-width:640px){
 .hero .ctas .btn{flex:1 1 auto}
}

.adv{position:relative;height:calc(100dvh - 64px);min-height:420px;overflow:hidden;background:#2B2450;container-type:size;user-select:none;-webkit-user-select:none;touch-action:manipulation;color:#fff}
.adv *{box-sizing:border-box}
.adv-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 70%;transition:filter 1.2s ease,opacity 1.2s ease;pointer-events:none}
.adv-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(20,12,50,.45) 100%)}


.hud{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:12px 14px;z-index:30;pointer-events:none}
.hud>*{pointer-events:auto}
.spool{display:flex;align-items:center;gap:10px;background:rgba(30,20,70,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:6px 14px 6px 6px;border:1.5px dashed rgba(255,255,255,.35)}
.threads{display:flex;gap:5px;align-items:center}
.threads b{display:block;width:9px;height:26px;border-radius:6px;background:repeating-linear-gradient(160deg,var(--tc) 0 3px,color-mix(in srgb,var(--tc) 70%,#000) 3px 5px);transition:transform .4s,opacity .4s,filter .4s;box-shadow:0 1px 0 rgba(0,0,0,.25)}
.threads b.off{opacity:.18;filter:grayscale(1);transform:scaleY(.55)}
@keyframes snap{0%{transform:none}30%{transform:translateY(-6px) rotate(-18deg)}100%{transform:scaleY(.55)}}
.threads b.wind{animation:wind .7s ease}
@keyframes wind{0%{transform:scale(1.6);filter:brightness(1.8)}100%{transform:none}}
.hbtn{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);background:rgba(30,20,70,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;padding:0}
.hbtn svg{width:20px;height:20px}
.hbtn:hover{background:rgba(135,75,248,.7)}
.hbtn img{width:34px;height:34px;object-fit:contain}
.hbtn.on{background:var(--violet);border-color:#fff}
@keyframes flut{0%,100%{transform:translate(0,0) rotate(-4deg)}50%{transform:translate(6px,-12px) rotate(5deg)}}


.scene{position:absolute;inset:0;z-index:10;--gy:67cqh;--lw:23cqw;--fs:min(2.9cqw,5.4cqh)}
.ledge{position:absolute;top:var(--gy);bottom:-2cqh;width:var(--lw);border-radius:22px 22px 0 0;
 background:
 repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 3px,transparent 3px 9px),
 linear-gradient(180deg,#9FD08A 0 16%,#7A5BD6 16% 58%,#5B44B5 58%);
 box-shadow:inset 0 6px 0 rgba(255,255,255,.25),0 -2px 0 rgba(255,255,255,.4),0 20px 40px rgba(20,10,60,.35)}
.ledge::after{content:"";position:absolute;left:8px;right:8px;top:10px;border-top:2px dashed rgba(255,255,255,.55)}
.ledge.l{left:0;border-top-left-radius:0}
.ledge.r{right:0;border-top-right-radius:0}


.bridge{position:absolute;top:var(--gy);left:var(--lw);right:var(--lw);transform-origin:0 0;transition:transform .6s cubic-bezier(.3,1.4,.5,1),filter .6s;z-index:3}
.ctx{position:absolute;bottom:100%;left:0;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ctx span{background:rgba(30,20,70,.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;color:#fff;letter-spacing:.01em}
.w{display:inline}
.sock{display:inline-grid;place-items:center;vertical-align:-.28em;width:1.3em;height:1.3em;margin-left:.08em;border-radius:50%;border:3px dashed #8B5CF6;background:rgba(139,92,246,.12);animation:pulse 1.6s ease-in-out infinite;position:relative;padding:0;font:inherit;color:inherit}
.sock.hot{background:rgba(139,92,246,.35);transform:scale(1.15)}
.sock.full{animation:none;border-style:solid;border-color:transparent;background:none}
.sock .mk{--s:1.3em}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.45)}50%{box-shadow:0 0 0 10px rgba(139,92,246,0)}}
.sock.grey{filter:grayscale(1);opacity:.7}


.dex{position:absolute;left:5cqw;bottom:calc(100cqh - var(--gy));height:29cqh;width:auto;z-index:6;transform-origin:50% 100%;filter:drop-shadow(0 12px 10px rgba(20,10,60,.35));will-change:transform}
.dex img{height:100%;width:auto;display:block}
.dex img.flip{transform:scaleX(-1)}
.dex.bob img{animation:dbob 3.4s ease-in-out infinite}
@keyframes dbob{0%,100%{translate:0 0}50%{translate:0 -1.4cqh}}
.dex .shadow{position:absolute;left:12%;right:12%;bottom:-1.2cqh;height:2.4cqh;border-radius:50%;background:radial-gradient(closest-side,rgba(20,10,50,.45),transparent);z-index:-1}
@keyframes tokbob{0%,100%{translate:0 0}50%{translate:0 -5px}}
.flyer{position:fixed;z-index:200;pointer-events:none;display:grid;place-items:center}
.flyer .mk{--s:100%}


.say{position:absolute;z-index:25;left:calc(5cqw + 17cqh);bottom:calc(100cqh - var(--gy) + 17cqh);max-width:min(440px,52cqw);background:#fff;color:#1E1838;border-radius:22px 22px 22px 6px;padding:14px 18px;font-size:clamp(15px,1.6cqw,18px);font-weight:600;line-height:1.4;box-shadow:0 16px 40px rgba(20,10,60,.35);animation:popin .35s cubic-bezier(.2,1.4,.4,1)}
.say b.who{display:block;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--violet-d);margin-bottom:3px}
.say .acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
@keyframes popin{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}


.rule-line{position:absolute;left:50%;top:15cqh;transform:translateX(-50%);z-index:26;display:flex;align-items:center;gap:10px;background:#fff;color:#1E1838;border-radius:999px;padding:8px 18px 8px 8px;font-weight:700;font-size:clamp(14px,1.5cqw,17px);box-shadow:0 12px 30px rgba(20,10,60,.35);animation:popin .3s ease;max-width:92cqw}
.rule-line .mk{--s:38px;background:var(--fl);border-radius:50%}
@keyframes unroll{from{transform:translateX(-50%) scaleY(.1);opacity:0}to{transform:translateX(-50%) scaleY(1);opacity:1}}


.card-ov{position:absolute;inset:0;z-index:60;display:grid;place-items:center;padding:20px;background:linear-gradient(180deg,rgba(20,12,50,.25),rgba(20,12,50,.65))}
.card-ov.clear{background:none;pointer-events:none}
.card-ov.clear>*{pointer-events:auto}
.scard{width:min(620px,100%);background:rgba(255,255,255,.96);color:#1E1838;border-radius:30px;padding:26px 28px;box-shadow:0 30px 80px rgba(10,5,40,.5);text-align:center;animation:popin .4s ease;max-height:calc(100cqh - 40px);overflow:auto}
.scard h1{font-size:clamp(30px,4cqw,46px);letter-spacing:-.03em;line-height:1}
.scard h2{font-size:clamp(22px,2.6cqw,30px);letter-spacing:-.02em}
.scard .eyebrow{display:block;margin-bottom:8px}
.scard p{color:#4E4B55;margin-top:10px;font-size:16.5px}
.scard .hero-dex{height:min(30cqh,220px);margin:-4px auto 6px;filter:drop-shadow(0 12px 14px rgba(40,20,90,.25))}
.scard .acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}
@keyframes capin{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
.skip{position:absolute;right:16px;bottom:16px;z-index:63}
@keyframes kb{from{transform:scale(1.04) translate(0,0)}to{transform:scale(1.14) translate(-2%,-1%)}}
.lamps{display:flex;gap:6px;margin-left:auto}
.lamps i{width:22px;height:22px;border-radius:50%;background:#D9D2E6;box-shadow:inset 0 -3px 0 rgba(0,0,0,.12);transition:background .5s,box-shadow .5s}
.lamps i.on{background:radial-gradient(circle at 40% 35%,#FFF6C8,#FFB703);box-shadow:0 0 14px 4px rgba(255,190,40,.7)}
.msg{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-top:1px solid rgba(140,95,50,.15);font-size:min(2.3cqw,4.4cqh,20px);font-weight:700}
.msg:first-of-type{border-top:0}
.msg b{flex:none;width:5.6em;font-size:.72em;letter-spacing:.06em;text-transform:uppercase;color:#8A6A3C}
.msg.cur{color:#2A1E52}
.msg .mk{--s:1.15em;vertical-align:-.25em}


.cocoon{position:relative;display:inline-block}
.cocoon img{height:min(32cqh,240px);transition:filter 1s}
.cocoon.wrapped img{filter:grayscale(1) brightness(1.05) contrast(.8)}
.cocoon svg{position:absolute;inset:-6%;width:112%;height:112%;transition:opacity .8s,transform .8s}
.cocoon:not(.wrapped) svg{opacity:0;transform:scale(1.3) rotate(20deg)}


@container (max-aspect-ratio: 1/1){
 .scene{--gy:60cqh;--lw:4cqw;--fs:min(5.6cqw,3.8cqh)}
 .ctx{left:auto;right:0;justify-content:flex-end;max-width:70cqw}
 .ctx span{font-size:12px;padding:4px 10px}
 .dex{height:17cqh;left:1cqw}
 .say{left:4cqw;right:4cqw;max-width:none;bottom:calc(100cqh - var(--gy) + 20cqh)}
 .msg{font-size:4.2cqw}
 .msg b{width:4.8em}
 .rule-line{top:11cqh}
}
@container (max-height: 560px){
 .zt small{display:none}
}
@media (prefers-reduced-motion: reduce){
 .adv *{animation:none!important;transition:none!important}
}

.ledge{display:none}

@container (max-width: 520px){.hud{justify-content:space-between}.hud .spool{margin-right:auto}}


.adv{--gy:74cqh}
.stage2{position:absolute;inset:0;z-index:10}
.murmur{display:flex;align-items:center;gap:8px;background:rgba(30,20,70,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:7px 12px;border:1.5px dashed rgba(255,255,255,.3);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.murmur .lv{display:flex;gap:4px}
.murmur .lv i{width:12px;height:18px;border-radius:4px;background:rgba(255,255,255,.18)}
.murmur .lv i.on{background:repeating-linear-gradient(160deg,#C9C4D8 0 3px,#8E89A3 3px 5px)}
.murmur .lv i.on.hot{background:repeating-linear-gradient(160deg,#FFB4B4 0 3px,#E5484D 3px 5px)}
.hud2{position:absolute;left:0;right:0;top:0;z-index:30;display:flex;gap:8px;align-items:center;padding:10px 12px;pointer-events:none}
.hud2>*{pointer-events:auto}
.hud2 .sp{flex:1}


.tide{position:absolute;left:-2%;right:-2%;bottom:0;z-index:7;height:calc(9cqh + var(--lvl,0) * 4.6cqh);transition:height 1.1s cubic-bezier(.3,.7,.2,1);pointer-events:none}
.tide .w{position:absolute;left:0;right:0;top:-3.2cqh;height:7cqh;background-repeat:repeat-x;background-size:16cqh 100%;animation:tidew 7s linear infinite}
.tide .w.b{top:-1.6cqh;animation-duration:11s;animation-direction:reverse;opacity:.85}
.tide .body{position:absolute;left:0;right:0;top:1.6cqh;bottom:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 3px,transparent 3px 8px),repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 2px,transparent 2px 7px),linear-gradient(180deg,#B9B4C8,#8F89A6)}
@keyframes tidew{from{background-position:0 0}to{background-position:16cqh 0}}
.tide.surge{animation:surge .9s ease}
@keyframes surge{0%,100%{filter:none}40%{filter:brightness(1.25)}}


.banner{position:absolute;left:50%;top:15cqh;transform:translateX(-50%);z-index:8;max-width:84cqw;min-width:40cqw;text-align:center;padding:.5em .9em .55em;border-radius:16px;font-size:min(3.1cqw,5.4cqh);font-weight:800;line-height:1.3;color:#2A1E52;
 background:repeating-linear-gradient(90deg,rgba(0,0,0,.035) 0 2px,transparent 2px 7px),repeating-linear-gradient(0deg,rgba(255,255,255,.2) 0 2px,transparent 2px 6px),linear-gradient(180deg,#FFF8E8,#F3DDB8);
 box-shadow:inset 0 -6px 0 rgba(140,90,40,.16),0 18px 40px rgba(20,10,60,.35);outline:2.5px dashed rgba(140,95,50,.45);outline-offset:-8px;animation:sway 6s ease-in-out infinite;transform-origin:50% -15cqh}
.banner::before,.banner::after{content:"";position:absolute;bottom:100%;width:0;height:15cqh;border-left:3px dashed rgba(255,255,255,.65)}
.banner::before{left:14%}.banner::after{right:14%}
@keyframes sway{0%,100%{rotate:-.6deg}50%{rotate:.6deg}}
.banner .tag{position:absolute;left:14px;top:-15px;background:#2A1E52;color:#fff;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 11px}
.banner .tag.retry{background:#E5484D}
.banner .sockw{display:inline-grid;place-items:center;vertical-align:-.28em;min-width:1.3em;height:1.3em;margin:0 .06em;border-radius:12px;border:3px dashed #8B5CF6;background:rgba(139,92,246,.12);animation:pulse 1.6s ease-in-out infinite;padding:0 .15em}
.banner .sockw.full{animation:none;border-color:transparent;background:none}
.banner .sockw.full.word{border-bottom:3px solid #00A63E;border-radius:0;color:#00823A}
.banner .sockw.bad{border:3px solid #E5484D;background:#FFECEC}
.banner .sockw .mk{--s:1.25em}
.banner.ok{box-shadow:inset 0 -6px 0 rgba(140,90,40,.16),0 0 0 4px #fff,0 0 40px 8px rgba(255,214,107,.9)}


.objs{position:absolute;left:30cqw;right:3cqw;bottom:calc(100cqh - var(--gy));z-index:6;display:flex;justify-content:space-around;align-items:flex-end;pointer-events:none}
.obj{pointer-events:auto;position:relative;border:0;background:none;padding:0;cursor:pointer;display:grid;justify-items:center;transition:transform .2s;color:#2A1E52;font:inherit}
.obj:hover,.obj:focus-visible{transform:translateY(-6px)}
.obj:focus-visible{outline:3px solid #FFD66B;outline-offset:6px;border-radius:16px}
.obj .tk{width:min(10cqh,78px);height:min(10cqh,78px);min-width:58px;min-height:58px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#fff,#F1EAFF);display:grid;place-items:center;box-shadow:0 8px 18px rgba(20,10,60,.35);position:relative;z-index:2;animation:tokbob 3s ease-in-out infinite}
.obj:nth-child(2) .tk{animation-delay:-1s}.obj:nth-child(3) .tk{animation-delay:-2s}
.obj .tk .mk{--s:74%}
.obj .tk .none{width:52%;height:52%;border-radius:50%;border:4px dashed #A99BC9}
.obj kbd{position:absolute;top:-4px;right:-4px;z-index:3;width:22px;height:22px;border-radius:50%;background:#2A1E52;color:#fff;font:800 12px/22px var(--font);text-align:center}

.obj.stone .base{width:min(17cqh,130px);height:min(6.5cqh,48px);margin-top:-2.4cqh;border-radius:50%;background:radial-gradient(ellipse at 40% 30%,#E6E1F2,#9F97BC 70%);box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 8px 0 rgba(60,50,110,.25)}

.obj.key .base{width:min(12cqh,92px);height:min(12cqh,92px);margin-top:-4.6cqh;border-radius:22px;transform:rotate(45deg);background:repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 3px,transparent 3px 8px),linear-gradient(135deg,#7FD9FF,#3A7BD5);box-shadow:inset 0 -6px 0 rgba(0,0,0,.18),0 10px 20px rgba(20,10,60,.35);z-index:1}

.obj.spring .base{width:min(9cqh,70px);height:min(13cqh,100px);margin-top:-1cqh;background:repeating-linear-gradient(0deg,#FFB703 0 6px,#E07A00 6px 12px);border-radius:12px 12px 6px 6px;box-shadow:0 8px 0 rgba(60,30,10,.25);transform-origin:50% 100%}
.obj.spring .base::after{content:"";position:absolute;left:-30%;right:-30%;bottom:-8px;height:14px;border-radius:8px;background:#6B4423}

.obj.wkey .tk{border-radius:16px;width:auto;min-width:min(16cqh,130px);height:auto;padding:12px 16px;font-size:min(2.6cqw,4.4cqh,24px);font-weight:800;color:#2A1E52;background:linear-gradient(180deg,#FFF7DA,#FFE08A)}
.obj.wkey .base{width:min(14cqh,110px);height:min(7cqh,54px);margin-top:-6px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 50'%3E%3Ccircle cx='22' cy='25' r='18' fill='none' stroke='%23C99A1E' stroke-width='9'/%3E%3Crect x='38' y='20' width='76' height='10' rx='4' fill='%23C99A1E'/%3E%3Crect x='92' y='28' width='8' height='14' fill='%23C99A1E'/%3E%3Crect x='104' y='28' width='8' height='10' fill='%23C99A1E'/%3E%3C/svg%3E")}

.obj.gate .base{width:min(16cqh,124px);height:min(22cqh,170px);margin-top:-3cqh;border-radius:80px 80px 6px 6px;background:radial-gradient(ellipse at 50% 85%,rgba(20,10,50,.85),rgba(40,25,90,.75) 60%),#2A1E52;box-shadow:inset 0 0 0 10px #9F7BE8,inset 0 0 0 14px #6B4FC0,0 10px 20px rgba(20,10,60,.35)}
.obj.gate .tk{margin-bottom:-4cqh}

.obj.pick{transform:translateY(-4px)}
.obj.sink{animation:sink 1s ease-in forwards}
@keyframes sink{to{transform:translateY(14cqh);opacity:.2;filter:grayscale(1)}}
.obj.glow .tk{box-shadow:0 0 0 4px #fff,0 0 30px 10px rgba(255,214,107,.9)}
.obj.shake{animation:oshake .5s}
@keyframes oshake{20%{transform:translateX(-8px) rotate(-3deg)}40%{transform:translateX(8px) rotate(3deg)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
.obj.barred .base{filter:grayscale(.7) brightness(.7)}
.obj.barred .base::before{content:"";position:absolute;inset:18% 12%;background:repeating-linear-gradient(90deg,#8F89A6 0 8px,transparent 8px 22px);border-radius:60px 60px 0 0}
.obj.gate .base{position:relative}
.objs.locked .obj{pointer-events:none}
.objs.locked .obj:not(.pick){opacity:.5;filter:grayscale(.5)}
.door{position:absolute;right:5cqw;bottom:calc(100cqh - var(--gy));width:min(18cqh,140px);height:min(28cqh,220px);z-index:5;border-radius:90px 90px 6px 6px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 3px,transparent 3px 22px),linear-gradient(180deg,#B5763C,#7A4A22);box-shadow:inset 0 0 0 8px #5E3A1A,0 14px 30px rgba(20,10,60,.4);transform-origin:0 50%;transition:transform .9s cubic-bezier(.3,.7,.2,1)}
.door::after{content:"";position:absolute;right:16%;top:52%;width:12px;height:12px;border-radius:50%;background:#FFD66B}
.door.open{transform:perspective(600px) rotateY(-70deg)}
.door-in{position:absolute;right:5cqw;bottom:calc(100cqh - var(--gy));width:min(18cqh,140px);height:min(28cqh,220px);z-index:4;border-radius:90px 90px 6px 6px;background:radial-gradient(ellipse at 50% 60%,#FFE9A8,#FFB703 70%)}
.portalglow{position:absolute;right:30cqw;top:24cqh;width:30cqh;height:40cqh;border-radius:50%;z-index:4;background:radial-gradient(closest-side,rgba(180,240,255,.95),rgba(127,217,255,.4),transparent);opacity:0;pointer-events:none}


.planks{position:absolute;left:19cqw;right:2cqw;top:var(--gy);z-index:6;display:flex;flex-wrap:wrap;align-items:center;row-gap:1.4cqh;font-size:min(2.6cqw,4.6cqh);font-weight:800;color:#2A1E52}
.planks.banner-mode{position:absolute;left:50%;top:13cqh;right:auto;transform:translateX(-50%);width:min(980px,90cqw);padding:18px 18px 22px;border-radius:22px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.03) 0 2px,transparent 2px 7px),linear-gradient(180deg,#FFF8E8,#F3DDB8);box-shadow:0 18px 40px rgba(20,10,60,.35);outline:2.5px dashed rgba(140,95,50,.45);outline-offset:-8px;row-gap:12px;font-size:min(2.4cqw,4.2cqh,24px);z-index:8}
.pl{padding:.35em .5em .4em;border-radius:10px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 2px,transparent 2px 7px),linear-gradient(180deg,#F8E1B8,#DDB27A);box-shadow:inset 0 -4px 0 rgba(110,60,20,.25),0 6px 10px rgba(20,10,60,.3);transition:transform .5s,opacity .5s}
.banner-mode .pl{background:none;box-shadow:none;padding:.1em .12em}
.pl.fall{transform:translateY(16cqh) rotate(14deg);opacity:0}
.knot{width:8px;height:4px;background:#8B5A2B;border-radius:2px;margin:0 1px}
.banner-mode .knot{width:4px;background:none}
.gap{display:inline-grid;place-items:center;width:1.55em;height:1.55em;margin:0 2px;border-radius:50%;border:3px dashed #8B5CF6;background:rgba(255,255,255,.75);padding:0;font:inherit;color:inherit;cursor:pointer;position:relative}
.gap:hover,.gap:focus-visible{background:#F1EAFF;transform:scale(1.08)}
.gap:focus-visible{outline:3px solid #FFD66B;outline-offset:2px}
.gap .mk{--s:1.25em}
.gap.set{border-style:solid;border-color:#8B5CF6;background:#fff}
.gap.ok{border-color:#00A63E;background:#E3F8EA}
.gap.bad{border-color:#E5484D;background:#FFECEC;animation:oshake .5s}
.gap.fixed{border-color:#00A63E;background:#E3F8EA}
.picker{position:fixed;z-index:120;display:flex;gap:6px;background:#2A1E52;border-radius:18px;padding:8px;box-shadow:0 16px 40px rgba(10,5,40,.5);animation:popin .2s ease}
.picker button{width:52px;height:52px;border-radius:14px;border:0;background:#fff;display:grid;place-items:center;padding:0;cursor:pointer}
.picker button:hover,.picker button:focus-visible{background:#F1EAFF;outline:3px solid #FFD66B}
.picker button .mk{--s:40px}
.picker button .none{width:26px;height:26px;border-radius:50%;border:3px dashed #A99BC9}
.picker small{position:absolute;bottom:100%;left:8px;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;text-shadow:0 1px 4px #000}
.go{position:absolute;left:50%;bottom:3cqh;transform:translateX(-50%);z-index:21}
.lamps2{position:absolute;right:4cqw;top:44cqh;z-index:9;display:flex;gap:6px;background:rgba(30,20,70,.6);padding:8px 10px;border-radius:999px}


.lesson{width:min(860px,100%);max-height:calc(100cqh - 30px);overflow:auto;background:#FFFDF7;color:#1E1838;border-radius:30px;box-shadow:0 30px 80px rgba(10,5,40,.55);animation:popin .4s ease;display:grid;grid-template-columns:minmax(200px,34%) 1fr}
.lesson .side{background:linear-gradient(160deg,var(--fl),#fff);padding:24px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;border-radius:30px 0 0 30px}
.lesson .side .big{width:min(140px,18cqh);height:min(140px,18cqh);border-radius:40px 40px 40px 12px;background:#fff;display:grid;place-items:center;box-shadow:0 10px 24px rgba(40,20,90,.15)}
.lesson .side .big .mk{--s:80%}
.lesson .side .big.two{gap:0;grid-auto-flow:column}
.lesson .side .big.two .mk{--s:62px}
.lesson .side h2{font-size:clamp(22px,2.4cqw,30px);margin-top:8px}
.lesson .side .role{font-size:13.5px;font-weight:700;color:var(--ft)}
.lesson .side img{height:min(120px,16cqh);margin-top:auto;filter:drop-shadow(0 8px 10px rgba(40,20,90,.2))}
.lesson .main{padding:22px 24px 20px;display:grid;gap:10px;align-content:start}
.lesson .eyebrow{color:var(--ft)}
.lesson .does{font-size:clamp(17px,1.8cqw,20px);font-weight:700;line-height:1.35}
.lesson .box{background:#F6F2FF;border-radius:16px;padding:10px 12px;font-size:15px;line-height:1.45}
.lesson .box b.h{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B4FC0;margin-bottom:3px}
.lesson .box.ex{background:#E3F8EA}.lesson .box.ex b.h{color:#00823A}
.lesson .box.no{background:#FFF1F1}.lesson .box.no b.h{color:#C2373C}
.lesson .box ul{margin:0;padding-left:18px}
.lesson mark{background:#FFE08A;color:inherit;border-radius:4px;padding:0 3px;font-weight:800}
.lesson s{color:#A13C40}
.lesson .acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px}
.lesson .tr{display:none}
.punct[data-tr=ru] .lesson .tr-ru,.punct[data-tr=kk] .lesson .tr-kk{display:block;color:#6A5A7E;font-size:14px;border-left:3px solid #E2D3F7;padding-left:10px}

@container (max-aspect-ratio: 1/1){
 .adv{--gy:70cqh}
 .banner{top:13cqh;max-width:94cqw;font-size:5.4cqw}
 .objs{left:22cqw;right:1cqw}
 .obj .tk{min-width:52px;min-height:52px}
 .obj.stone .base{width:22cqw}
 .obj.gate .base{width:22cqw;height:16cqh}
 .obj.wkey .tk{font-size:4cqw;padding:10px 8px;min-width:24cqw}
 .planks{left:4cqw;right:4cqw;top:auto;bottom:calc(100cqh - var(--gy) + 18cqh);font-size:4.6cqw}
 .planks.banner-mode{top:12cqh;bottom:auto;font-size:4.2cqw;width:94cqw}
 .lesson{grid-template-columns:1fr}
 .lesson .side{border-radius:30px 30px 0 0;flex-direction:row;flex-wrap:wrap;justify-content:center;padding:14px}
 .lesson .side img{display:none}
 .lesson .side .big{width:70px;height:70px;border-radius:20px}
 .door,.door-in{right:2cqw}
}
@container (max-width: 700px){.murmur b{display:none}}

.buddy{position:absolute;left:calc(4cqw + 20cqh);bottom:calc(100cqh - var(--gy));height:17cqh;z-index:6;filter:drop-shadow(0 10px 8px rgba(20,10,60,.3));animation:dbob 3.8s ease-in-out infinite}
.dex.danger img{animation:fret .35s ease-in-out infinite alternate}
@keyframes fret{from{translate:-2px 0}to{translate:2px 0}}
.rule-line{max-width:min(760px,92cqw)}
@container (max-aspect-ratio: 1/1){.buddy{left:auto;right:2cqw;height:11cqh}}

.rule-line .mk{background-color:var(--fl,#F1EAFF)!important;background:none}
.sprite-ok .rule-line .mk[data-i]{background-image:var(--sprite);background-size:1200% 100%;background-repeat:no-repeat;background-position:calc(var(--i)*100%/11) 0}
.objs.stones{bottom:7cqh}
.adv{--gy:76cqh}
.banner .tag{white-space:nowrap;max-width:calc(100% - 28px);overflow:hidden;text-overflow:ellipsis}
@container (max-aspect-ratio: 1/1){
 .banner{padding-top:1em}
 .banner .tag{font-size:10.5px;padding:3px 9px;top:-12px}
 .objs.wk{left:28cqw;right:34cqw;flex-direction:column;align-items:center;gap:3.5cqh;bottom:calc(100cqh - var(--gy) + 2cqh)}
 .door,.door-in{width:24cqw;height:20cqh}
}




.isle-panel>*{min-width:0}
.topics{grid-template-columns:minmax(0,1fr)}
.topics li{min-width:0}
.stepnav a{position:relative}


.btn.step-btn{min-height:58px;padding:0 26px 0 18px;text-align:left}
.btn.step-btn span{display:grid;line-height:1.15;max-width:300px}
.btn.step-btn small{font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;opacity:.75}
.btn.step-btn span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rhythm{list-style:none;margin:22px 0 0;padding:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rhythm li{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink2)}
.rhythm li i{font-style:normal;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--violet-d);box-shadow:var(--sh1)}
.rhythm li i svg{width:15px;height:15px}
.rhythm li.p i{background:#2B2450;color:#FFD66B}
.rhythm li b{color:var(--ink);font-weight:800}
.rhythm li span{display:none}
.rhythm li.ar{width:22px;height:2px;background:var(--line2);border-radius:2px}

.lp2{display:flex;gap:6px;flex:none}
.lp2>span{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:999px;background:var(--bg);color:var(--ink3);border:1px solid var(--line);white-space:nowrap}
.lp2 svg{width:13px;height:13px}
.lp2 .st-l.on{background:var(--violet-l);color:var(--violet-d);border-color:var(--violet-m)}
.lp2 .st-p{color:var(--ink3)}
.lp2 .st-p.on{background:#FFF6DD;border-color:#FFE08A}
.stars.sm i{width:14px;height:14px}
@container punct (max-width:640px){.lp2{flex-direction:column;align-items:flex-end}.lp2>span{padding:3px 8px;font-size:11.5px}}
.cc{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:4px 10px 4px 4px;font-size:12px;font-weight:800;color:var(--ink3)}
.cc .mk{--s:26px;background-color:var(--violet-l);border-radius:50%}
.cc.on{border-color:#FFE08A;background:#FFFBEF;color:var(--ink)}
.exband .lockline{margin-top:16px}


.modes{display:inline-flex;align-items:center;gap:6px;margin-left:auto;background:#fff;border:1.5px solid var(--line);border-radius:999px;padding:4px;font-weight:800;font-size:13.5px}
.modes>span:not(.ln),.modes button{display:flex;align-items:center;gap:6px;padding:4px 12px 4px 4px;border-radius:999px;border:0;background:none;color:var(--ink3);font-weight:800}
.modes i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:10.5px;background:var(--line)}
.modes .on{background:var(--violet-l);color:var(--violet-d)}
.modes .on i{background:var(--violet);color:#fff}
.modes .ln{width:16px;height:2px;background:var(--line2)}
.modes button i{background:#2B2450;color:#FFD66B}
.modes button:hover{color:#2B2450}
@container punct (max-width:640px){.modes{margin-left:0}}
.stepnav li.pn a{background:#2B2450;border-color:#2B2450;color:#fff}
.stepnav li.pn a i{background:#FFD66B;color:#2B2450}
.stepnav li.pn a i svg{width:12px;height:12px;margin-left:2px}
.stepnav li.pn a.on{background:#FFB703;border-color:#FFB703;color:#2A1E52}
.srcbox{margin-top:30px;border-top:1px solid var(--line);padding-top:14px}
.srcbox summary{cursor:pointer;font-weight:800;font-size:15px;color:var(--ink2)}
.srcbox .srcs{margin-top:10px}


.gate{padding:34px 0 80px}
.gate-card{position:relative;overflow:hidden;border-radius:var(--r-xl);background:#2B2450;color:#fff;min-height:420px;display:flex;align-items:center;box-shadow:0 30px 70px rgba(43,36,80,.35);isolation:isolate}
.gate-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.gate-card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(26,18,60,.94) 0%,rgba(26,18,60,.82) 46%,rgba(26,18,60,.15) 100%)}
.gate-copy{padding:38px 40px;max-width:600px}
.gate-done{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#7CF0A6}
.gate-done svg{width:16px;height:16px}
.gate h2{font-size:clamp(34px,4.6cqw,54px);color:#fff;margin:10px 0 6px;letter-spacing:-.035em;line-height:1}
.gate h2 span{color:#FFD66B}
.gate .tr{color:#E4DAFB;border-color:rgba(255,255,255,.3)}
.gate-how{margin-top:12px}
.gate-how p{color:rgba(255,255,255,.9);font-size:17px;line-height:1.5}
.gate-legend{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 26px}
.gate-legend span{font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14)}
.gate-legend .ok{color:#7CF0A6}.gate-legend .bad{color:#FFB4B4}
.playbtn{display:inline-flex;align-items:center;gap:16px;border:0;border-radius:999px;padding:10px 30px 10px 10px;background:linear-gradient(180deg,#FFE27A,#FFB703);color:#2A1E52;font-weight:900;font-size:26px;letter-spacing:-.02em;box-shadow:0 8px 0 #C77C00,0 18px 40px rgba(255,183,3,.3);transition:transform .15s var(--ease),box-shadow .15s;animation:pbpulse 2.4s ease-in-out infinite}
.playbtn:hover{transform:translateY(-2px)}
.playbtn:active{transform:translateY(5px);box-shadow:0 3px 0 #C77C00}
.playbtn:focus-visible{outline:3px solid #fff;outline-offset:4px}
.playbtn .pb-ic{width:58px;height:58px;border-radius:50%;background:#2A1E52;color:#FFD66B;display:grid;place-items:center;flex:none}
.playbtn .pb-ic svg{width:26px;height:26px;margin-left:4px}
.playbtn .pb-tx{display:grid;text-align:left;line-height:1.02}
.playbtn .pb-tx small{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;opacity:.72}
.playbtn .stars{margin-left:4px}
.playbtn .stars i:not(.on){color:rgba(42,30,82,.25)}
@keyframes pbpulse{0%,100%{box-shadow:0 8px 0 #C77C00,0 0 0 0 rgba(255,214,107,.55)}55%{box-shadow:0 8px 0 #C77C00,0 0 0 16px rgba(255,214,107,0)}}
.gate-dex{position:absolute;right:5%;bottom:8%;height:74%;max-height:320px;filter:drop-shadow(0 18px 18px rgba(10,5,40,.45));animation:dbob 3.4s ease-in-out infinite;pointer-events:none}
.gate-skip{display:flex;justify-content:space-between;gap:12px;margin-top:16px;flex-wrap:wrap}
.gate-skip .linkbtn{display:inline-flex;align-items:center;gap:4px;color:var(--ink3);text-decoration:none;font-size:14px}
.gate-skip .linkbtn:hover{color:var(--violet-d)}
.gate-skip svg{width:15px;height:15px}
@container punct (max-width:760px){
 .gate{padding:24px 0 60px}
 .gate-card{flex-direction:column;align-items:stretch;min-height:0}
 .gate-card::before{background:linear-gradient(180deg,rgba(26,18,60,.25) 0,rgba(26,18,60,.92) 210px)}
 .gate-dex{position:relative;right:auto;bottom:auto;height:190px;margin:22px auto -14px;order:-1}
 .gate-copy{padding:20px 20px 26px}
 .playbtn{width:100%;font-size:23px}
}
@media (prefers-reduced-motion: reduce){.playbtn,.gate-dex{animation:none}}


.warp{position:fixed;inset:0;z-index:300;pointer-events:none;display:grid;place-items:center;background:radial-gradient(circle at var(--x) var(--y),#874BF8 0,#3B2C7A 30%,#2B2450 70%);clip-path:circle(0px at var(--x) var(--y));transition:clip-path .72s cubic-bezier(.7,0,.25,1),opacity .55s ease}
.warp.on{clip-path:circle(160vmax at var(--x) var(--y))}
.warp.out{opacity:0}
.warp-in{display:grid;justify-items:center;gap:4px;color:#fff;transform:scale(.5) rotate(-6deg);opacity:0;transition:transform .55s .2s cubic-bezier(.2,1.5,.4,1),opacity .3s .2s}
.warp.on .warp-in{transform:none;opacity:1}
.warp-in img{height:min(30vh,240px);filter:drop-shadow(0 16px 20px rgba(0,0,0,.35))}
.warp-in b{font-size:clamp(40px,8cqw,84px);font-weight:900;letter-spacing:-.04em;line-height:1;text-shadow:0 5px 0 #4F22B8}


.punct.in-game{background:#2B2450}
.adv.game{height:var(--punct-game-h,100dvh)}
.gtitle{display:flex;align-items:center;gap:8px;min-width:0;background:rgba(30,20,70,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:5px 14px 5px 5px;border:1.5px dashed rgba(255,255,255,.3)}
.gtitle .mk{--s:32px;background-color:rgba(255,255,255,.92);border-radius:50%;flex:none}
.gtitle .gt{display:grid;line-height:1.1;min-width:0}
.gtitle .gt small{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.gtitle .gt b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:34cqw}
@container (max-width:620px){.gtitle .gt{display:none}.gtitle{padding-right:10px}}
.splash{position:absolute;left:50%;top:40%;translate:-50% -50%;z-index:50;width:min(92cqw,820px);text-align:center;display:grid;gap:8px;animation:splashin .5s cubic-bezier(.2,1.4,.4,1)}
.splash b{font-size:clamp(38px,7cqw,84px);font-weight:900;letter-spacing:-.04em;line-height:1;color:#fff;text-shadow:0 5px 0 #4F22B8,0 14px 34px rgba(10,5,40,.6)}
.splash span{font-size:clamp(17px,2.3cqw,26px);font-weight:800;color:#FFE27A;text-shadow:0 2px 12px rgba(10,5,40,.85)}
@keyframes splashin{from{opacity:0;scale:.7}to{opacity:1;scale:1}}
.rule-line.cheer{gap:8px;padding:8px 20px 8px 8px;font-size:clamp(17px,2cqw,22px);font-weight:900;color:#00823A;animation:popin .3s ease}
.rule-line.cheer span{width:34px;height:34px;border-radius:50%;background:#00D441;color:#fff;display:grid;place-items:center}
.rule-line.cheer span svg{width:20px;height:20px}
.oops{position:absolute;left:50%;top:42cqh;transform:translateX(-50%);z-index:40;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 14px;width:max-content;max-width:min(640px,94cqw);background:#fff;color:#1E1838;border-radius:22px;padding:10px 12px 10px 14px;box-shadow:0 18px 50px rgba(10,5,40,.5);animation:popin .25s ease}
.oops .oh{display:flex;align-items:center;gap:6px;font-size:20px;font-weight:900;color:#E5484D;white-space:nowrap}
.oops .oh img{width:42px;height:42px;object-fit:contain;margin:-10px 0}
.oops .cue{font-size:15.5px;font-weight:800;color:#5A4A1E;background:#FFF3D1;border-radius:999px;padding:6px 14px}
.banner .sockw.fixd{border:3px solid #00A63E;background:#E3F8EA;animation:popin .35s ease}
.banner .sockw.fixd.word{border-width:0 0 3px;border-radius:0;color:#00823A;background:none}
.obj.right .tk{box-shadow:0 0 0 4px #00D441,0 0 26px 6px rgba(0,212,65,.55)}
.objs.locked .obj.right{opacity:1;filter:none}
.ptag{position:absolute;left:14px;top:-15px;background:#2A1E52;color:#fff;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 11px}
.ptag.retry,.banner .tag.retry{background:#FFB703;color:#2A1E52}
.planks:not(.banner-mode) .ptag{left:0;top:-30px}

.rafts{position:absolute;left:25cqw;right:4cqw;top:16cqh;z-index:8;display:grid;grid-template-columns:1fr 1fr;gap:2.6cqw;align-items:start}
.rafts .rq{grid-column:1/-1;justify-self:center;font-size:clamp(16px,2cqw,22px);font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(10,5,40,.85)}
.raft{position:relative;border:0;padding:0;background:none;cursor:pointer;font:inherit;color:#2A1E52;display:grid;animation:raftbob 4.4s ease-in-out infinite}
.raft:nth-of-type(2){animation-delay:-2.2s}
@keyframes raftbob{0%,100%{translate:0 0}50%{translate:0 -1.2cqh}}
.raft .rt{display:block;padding:.9em 1em 1em;border-radius:20px;font-weight:800;font-size:clamp(15px,min(2cqw,3.4cqh),22px);line-height:1.38;text-align:left;background:repeating-linear-gradient(90deg,rgba(0,0,0,.035) 0 2px,transparent 2px 7px),linear-gradient(180deg,#FFF8E8,#F3DDB8);box-shadow:inset 0 -5px 0 rgba(140,90,40,.16),0 16px 34px rgba(20,10,60,.38);outline:2.5px dashed rgba(140,95,50,.45);outline-offset:-7px;transition:transform .2s,box-shadow .3s}
.raft .rb{height:3cqh;margin:-1cqh 9% 0;border-radius:0 0 50% 50%/0 0 100% 100%;background:linear-gradient(180deg,#A79FC6,#6E6790);box-shadow:0 8px 0 rgba(60,50,110,.25);position:relative;z-index:-1}
.raft kbd{position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#2A1E52;color:#fff;font:800 12px/24px var(--font);text-align:center}
.raft:hover .rt,.raft:focus-visible .rt{transform:translateY(-5px)}
.raft:focus-visible{outline:none}.raft:focus-visible .rt{outline:3px solid #FFD66B;outline-offset:3px}
.raft.glow .rt,.raft.right .rt{box-shadow:0 0 0 4px #00D441,0 0 34px 8px rgba(0,212,65,.5);outline-color:transparent}
.raft.sink{animation:sink 1s ease-in forwards}
.rafts.locked .raft{pointer-events:none}
.rafts.locked .raft:not(.pick):not(.right){opacity:.55}
.scard.win .big-stars{display:flex;justify-content:center;gap:10px;margin:8px 0 6px}
.scard.win .big-stars i{width:52px;height:52px;color:#E7E1F3}
.scard.win .big-stars i.on{color:var(--yellow);animation:pop .5s var(--ease) both}
.scard.win .big-stars i:nth-child(2).on{animation-delay:.12s}.scard.win .big-stars i:nth-child(3).on{animation-delay:.24s}
.scard.win .big-stars svg{width:100%;height:100%}
.scard.win h1{margin-top:4px}
.scard .acts.sm{margin-top:14px;gap:20px}
.scard .step-btn span{max-width:340px}
.joined{font-weight:700;color:#4E4B55}
@container (max-aspect-ratio: 1/1){
 .rafts{left:4cqw;right:4cqw;top:11cqh;grid-template-columns:1fr;gap:2.2cqh}
 .raft .rt{font-size:min(4.4cqw,2.5cqh)}
 .oops{max-width:94cqw}
 .oops .oh{font-size:18px}
}


.gtitle .snum{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#FFD66B;color:#2A1E52;font-weight:900;font-size:16px;line-height:1;flex:none}
.gtitle .snum small{font-size:9px;opacity:.6;margin-top:-2px}
.gtitle .snum{grid-auto-flow:column;gap:0}
.gtitle .trail{display:flex;gap:3px;margin-left:6px;flex:none}
.gtitle .trail i{width:14px;height:6px;border-radius:3px;background:rgba(255,255,255,.25)}
.gtitle .trail i.on{background:#00D441}
.gtitle .trail i.now{background:#FFD66B}
.gtitle .cnt{font-size:12px;font-weight:800;color:rgba(255,255,255,.8);margin-left:6px;flex:none}
@container (max-width:620px){.gtitle .trail{display:none}}
.splash small{font-size:clamp(12px,1.4cqw,15px);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#fff;opacity:.85;text-shadow:0 2px 10px rgba(10,5,40,.8)}
.strail{display:flex;gap:8px;justify-content:center;margin-top:8px}
.strail i{width:clamp(22px,4cqw,46px);height:8px;border-radius:4px;background:rgba(255,255,255,.3);box-shadow:0 2px 8px rgba(10,5,40,.4)}
.strail i.on{background:#00D441}
.strail i.now{background:#FFD66B;animation:pulse 1.2s ease-in-out infinite}

.weather{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden}
.adv.st-night .adv-bg{filter:brightness(calc(.5 + var(--lit,0) * .14)) saturate(calc(.6 + var(--lit,0) * .13)) hue-rotate(-10deg);transition:filter 1.4s ease}
.adv.lit .adv-bg{filter:none}
.adv.st-storm .adv-bg{filter:saturate(.55) brightness(.85);animation:flash 7s infinite}
@keyframes flash{0%,92%,100%{filter:saturate(.55) brightness(.85)}93%{filter:saturate(.4) brightness(1.5)}95%{filter:saturate(.55) brightness(.85)}96%{filter:saturate(.4) brightness(1.3)}}
.adv.st-wind .adv-bg{filter:saturate(.8) brightness(.92)}
.moth{position:absolute;left:-12%;top:var(--y);width:calc(9cqh * var(--s));animation:mothfly 9s linear infinite;animation-delay:var(--d);filter:drop-shadow(0 6px 8px rgba(0,0,0,.25));opacity:.92}
@keyframes mothfly{0%{transform:translate(0,0) rotate(-6deg)}25%{transform:translate(30cqw,-4cqh) rotate(8deg)}50%{transform:translate(60cqw,3cqh) rotate(-8deg)}75%{transform:translate(90cqw,-3cqh) rotate(6deg)}100%{transform:translate(125cqw,0) rotate(0)}}
.moth.flee{animation:mothflee .9s ease-in forwards}
@keyframes mothflee{to{transform:translate(40cqw,-60cqh) scale(.4);opacity:0}}
.gust{position:absolute;left:-30%;top:22%;width:30%;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent);animation:gust 3.2s linear infinite}
.gust.g2{top:48%;animation-delay:-1.2s;animation-duration:2.6s}.gust.g3{top:66%;animation-delay:-2.1s;animation-duration:3.8s}
@keyframes gust{to{transform:translateX(450%)}}
.captive{position:absolute;right:6cqw;bottom:calc(100cqh - var(--gy));height:20cqh;z-index:6}
.captive img{height:100%;filter:grayscale(1) brightness(1.05) contrast(.8)}
.captive svg{position:absolute;inset:-8%;width:116%;height:116%}
@container (max-aspect-ratio: 1/1){.captive{height:12cqh;right:3cqw}}

.banner .tag{background:#2A1E52}
.objs.two{left:34cqw;right:14cqw}

.rafts .fact{grid-column:1/-1;justify-self:center;display:flex;align-items:center;gap:10px;background:#fff;color:#1E1838;border-radius:18px;padding:8px 16px 8px 8px;box-shadow:0 12px 30px rgba(10,5,40,.35);font-weight:800;font-size:clamp(15px,1.8cqw,19px);max-width:100%}
.rafts .fact img{width:44px;height:44px;object-fit:contain;flex:none}
.rafts .fact small{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6B4FC0}

.planks.repair{outline-color:rgba(229,72,77,.45)}
.gap.pre{border-style:solid;border-color:#D7CDE8;background:#fff}
.gap.pre.nil{width:.9em;height:.9em;border:2px dashed #CBBFE0;background:rgba(255,255,255,.6);vertical-align:middle}
.gap.pre:hover,.gap.pre:focus-visible{border-color:#8B5CF6;background:#F1EAFF}
.planks.banner-mode .ptag{left:14px;top:-15px}

.scard.win .duo{display:flex;justify-content:center;align-items:flex-end;gap:0;margin:-6px 0 4px}
.scard.win .duo img{height:min(24cqh,180px);filter:drop-shadow(0 12px 14px rgba(40,20,90,.25))}
.scard.win .duo img+img{height:min(18cqh,140px);margin-left:-14px}
.scard p.small{font-size:14px;margin-top:2px;color:#86838F}
.usedmarks{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px}
.usedmarks span{display:inline-flex;align-items:center;gap:6px;background:#F6F2FF;border-radius:999px;padding:4px 12px 4px 4px;font-size:13.5px;color:#4E4B55}
.usedmarks .mk{--s:26px;background-color:#fff;border-radius:50%}
.usedmarks b{color:#2A1E52}

.planks.bridge{top:15cqh;left:4cqw;right:4cqw;justify-content:center;row-gap:1.6cqh;font-size:min(2.3cqw,4.2cqh)}
.gap.jl{margin-left:-1px}.gap.jr{margin-right:-1px}
@container (max-aspect-ratio: 1/1){.planks.bridge{top:11cqh;bottom:auto;font-size:4.2cqw}}

.fxcanvas{position:absolute;inset:0;width:100%;height:100%;z-index:70;pointer-events:none}
.beam{position:absolute;right:15cqw;top:21cqh;width:90cqw;height:26cqh;transform-origin:100% 50%;background:linear-gradient(270deg,rgba(255,236,160,.85),rgba(255,236,160,.25) 40%,transparent 85%);clip-path:polygon(100% 45%,0 0,0 100%,100% 55%);mix-blend-mode:screen;animation:beam 5s ease-in-out infinite alternate}
@keyframes beam{from{transform:rotate(-8deg)}to{transform:rotate(9deg)}}
.dex.party img,.buddy.party{animation:hop .7s ease-in-out infinite}
@keyframes hop{0%,100%{translate:0 0}50%{translate:0 -4cqh}}
@media (prefers-reduced-motion: reduce){.beam,.dex.party img,.buddy.party,.moth,.gust{animation:none!important}}

.lp2 .st-p,.gate-skip .linkbtn,.lp2>span{color:var(--ink2)}
.cc{color:var(--ink2)}

.adv.game{min-height:0}
.banner{top:max(15cqh,74px)}
.planks.bridge{top:max(15cqh,74px)}
.planks.banner-mode{top:max(13cqh,74px)}
.rafts{top:max(16cqh,70px)}
@container (max-height:520px){
 .hud2{padding:6px 10px}
 .hbtn{width:38px;height:38px}
 .banner,.planks.bridge,.planks.banner-mode{top:62px}
 .rafts{top:58px}
 .planks.banner-mode{padding:12px 14px 14px;row-gap:6px;font-size:min(2.4cqw,4.4cqh)}
 .go{bottom:8px;min-height:42px}
 .scard{padding:16px 20px}
 .scard.win .duo img{height:16cqh}.scard.win .duo img+img{height:13cqh}
 .scard.win h1{font-size:26px}
 .scard.win .big-stars i{width:34px;height:34px}
 .scard p{margin-top:6px;font-size:15px}
 .usedmarks{margin-top:6px}
 .scard .hero-dex{height:22cqh}
}
@container (max-height:520px){.scard.win .duo{display:none}.planks.bridge{top:72px}.scard.win .eyebrow{margin-bottom:2px}}
@container (max-height:520px){.scard.win .usedmarks span:nth-child(n+4){display:none}.scard.win .acts{margin-top:10px}.scard .acts.sm{margin-top:6px}.scard.win>p{line-height:1.35}}
.punct{container:punct/inline-size;overflow-wrap:break-word}
.punct [lang="kk"]{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.punct .lsec,.punct .gate,.punct .sec{scroll-margin-top:84px}
:host([data-theme="dark"]) {
    --violet: var(--dk-acc);
    --violet-d: var(--dk-acc);
    --violet-dd: var(--dk-acc-strong);
    --violet-l: var(--dk-acc-tint);
    --violet-m: var(--dk-acc-soft);
    --cyan: var(--dk-blue);
    --cyan-t: var(--dk-blue);
    --cyan-l: var(--dk-blue-tint);
    --green: var(--dk-green);
    --green-t: var(--dk-green);
    --green-l: var(--dk-green-tint);
    --orange: var(--dk-orange);
    --orange-t: var(--dk-orange);
    --orange-l: var(--dk-orange-tint);
    --yellow: var(--dk-yellow);
    --yellow-t: var(--dk-yellow);
    --yellow-l: var(--dk-yellow-tint);
    --ink: var(--dk-text);
    --ink2: var(--dk-text-2);
    --ink3: var(--dk-muted);
    --line: var(--dk-line);
    --line2: var(--dk-line);
    --bg: var(--dk-page);
    --card: var(--dk-card);
    --ok: var(--dk-green);
    --ok-l: var(--dk-green-tint);
    --bad: var(--dk-red);
    --bad-l: var(--dk-red-tint);
    --alt: var(--dk-acc);
    --alt-l: var(--dk-acc-tint);
    --sh1: 0 1px 2px color-mix(in oklab, var(--dk-acc) 6%, transparent),0 6px 18px color-mix(in oklab, var(--dk-acc) 6%, transparent);
    --sh2: 0 2px 6px color-mix(in oklab, var(--dk-acc) 6%, transparent),0 18px 44px color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .punct:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink);
    background: var(--bg)
}
:host([data-theme="dark"]) button:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: inherit
}
:host([data-theme="dark"]) a:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 3px solid var(--violet)
}
:host([data-theme="dark"]) .eyebrow:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
:host([data-theme="dark"]) .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ft,var(--violet-d))
}
:host([data-theme="dark"]) .sprite-ok .mk[data-i]:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-image: var(--sprite)
}
:host([data-theme="dark"]) .top:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-card) 86%, transparent);
    border-bottom: 1px solid rgba(220,210,240,.7)
}
:host([data-theme="dark"]) .brand:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none;
    border: 0
}
:host([data-theme="dark"]) .lo-w:not(:is(.hero, .adv, .hero *, .adv *)) {
    fill: var(--ink)
}
:host([data-theme="dark"]) .lo-to:not(:is(.hero, .adv, .hero *, .adv *)) {
    fill: var(--violet)
}
:host([data-theme="dark"]) .brand-sep:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .brand-name b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .nav button:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none;
    border: 0;
    color: var(--ink2)
}
:host([data-theme="dark"]) .nav button:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .nav button[aria-current=page]:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .pill:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    border: 1px solid var(--line2)
}
:host([data-theme="dark"]) .pill svg:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .pill small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .ibtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1px solid var(--line2);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ibtn[aria-pressed=false]:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .trbar:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1px solid var(--line2);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .trbar .cap:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .trb:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: none;
    color: var(--ink2)
}
:host([data-theme="dark"]) .trb[aria-pressed=true]:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .btn:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0
}
:host([data-theme="dark"]) .btn-p:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc);
    box-shadow: 0 8px 22px color-mix(in oklab, var(--dk-acc) 32%, transparent)
}
:host([data-theme="dark"]) .btn-p:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-d)
}
:host([data-theme="dark"]) .btn-p:disabled:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-soft);
    box-shadow: none
}
:host([data-theme="dark"]) .btn-s:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--ink);
    border: 1.5px solid var(--line2)
}
:host([data-theme="dark"]) .btn-s:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--violet);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .linkbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none;
    border: 0;
    color: var(--violet-d)
}
:host([data-theme="dark"]) .bub:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .bub b.who:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
:host([data-theme="dark"]) .tr:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-left: 3px solid var(--violet-m);
    color: var(--ink2)
}
:host([data-theme="dark"]) .hero-copy .eyebrow:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-card) 75%, transparent);
    color: var(--violet-dd)
}
:host([data-theme="dark"]) .crew .shadow:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(closest-side,color-mix(in oklab, var(--dk-acc) 32%, transparent),transparent)
}
:host([data-theme="dark"]) .sec-head p.sub:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .role:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .role .job:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
:host([data-theme="dark"]) .role p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .fam:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--fl);
    color: var(--ft)
}
:host([data-theme="dark"]) .fam .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--dk-card)
}
:host([data-theme="dark"]) .fam small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .isle-tab:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 2px solid transparent;
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .isle-tab:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: var(--sh2)
}
:host([data-theme="dark"]) .isle-tab[aria-selected=true]:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--violet);
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--dk-acc) 14%, transparent),var(--sh2)
}
:host([data-theme="dark"]) .isle-art:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--dk-blue-tint);
    background-image: var(--world)
}
:host([data-theme="dark"]) .isle-art .band:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .isle-tab .bar:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .isle-tab .bar i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .isle-tab small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .isle-panel:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .isle-panel .intro p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .topic:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .topic:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--violet-m);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .topic .mkbox:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--fl)
}
:host([data-theme="dark"]) .topic .tx span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .topic .num:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .exband:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(120deg,var(--dk-acc-tint),var(--dk-blue-tint));
    box-shadow: var(--sh2)
}
:host([data-theme="dark"]) .exband .panel:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-card) 93%, transparent);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .exband p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .foot:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .method:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .method summary:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .method summary:not(:is(.hero, .adv, .hero *, .adv *))::before {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .method ul:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .l-top:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(180deg,var(--dk-acc-tint),var(--bg))
}
:host([data-theme="dark"]) .crumb:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .crumb button:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    border: 1px solid var(--line2)
}
:host([data-theme="dark"]) .l-badge:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--fl);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.6)
}
:host([data-theme="dark"]) .outcome:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .outcome small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ok)
}
:host([data-theme="dark"]) .stepnav:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-page) 92%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .stepnav a:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2);
    background: var(--dk-card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .stepnav a i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .stepnav a.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    border-color: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .stepnav a.on i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .lsec>.wrap>h2 .q:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-on-acc);
    background: var(--violet)
}
:host([data-theme="dark"]) .lsec .sub:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .glyph:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .glyph .mkbox:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--fl)
}
:host([data-theme="dark"]) .glyph span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .defcard:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .gloss details:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .gloss details[open]:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--violet-m)
}
:host([data-theme="dark"]) .gloss summary:not(:is(.hero, .adv, .hero *, .adv *))::after {
    color: var(--violet)
}
:host([data-theme="dark"]) .gloss details p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .bigline:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .bigline .tr:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-on);
    border-color: rgba(255,255,255,.5)
}
:host([data-theme="dark"]) .hearpair:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .hp-row:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--bg)
}
:host([data-theme="dark"]) .hp-row.no .lab:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .hp-row.yes .lab:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ok)
}
:host([data-theme="dark"]) .hear:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .hear.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .rule:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .tag.Rule:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .tag.Standard:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--cyan-l);
    color: var(--cyan-t)
}
:host([data-theme="dark"]) .tag.Style:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--yellow-l);
    color: var(--yellow-t)
}
:host([data-theme="dark"]) .tag.Option:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--green-l);
    color: var(--green-t)
}
:host([data-theme="dark"]) .rule .t:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .ex-ok:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--ok-l)
}
:host([data-theme="dark"]) .ex-ok .ic:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ok)
}
:host([data-theme="dark"]) mark.hl:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-dd);
    box-shadow: inset 0 -2px 0 var(--violet-m)
}
:host([data-theme="dark"]) .fix:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1.5px dashed var(--dk-red-line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .fix s:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .fix .after:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-top: 1px solid var(--dk-line)
}
:host([data-theme="dark"]) .fix.open:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-green-line);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .fix .after b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ok)
}
:host([data-theme="dark"]) .fix .after span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .fixbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: var(--bad);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .fix.open .fixbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--ok)
}
:host([data-theme="dark"]) .doc:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .doc-h:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-page);
    border-bottom: 1px solid var(--line);
    color: var(--ink2)
}
:host([data-theme="dark"]) .doc-h i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .doc-b button.n:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: var(--violet-l);
    color: var(--violet-dd)
}
:host([data-theme="dark"]) .doc-b button.n sup:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .doc-b button.n.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .doc-b button.n.on sup:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff
}
:host([data-theme="dark"]) .doc-notes li:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .doc-notes li b:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .doc-notes li.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--ink)
}
:host([data-theme="dark"]) .vs .side:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--bg)
}
:host([data-theme="dark"]) .vs em:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .card:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .splist li:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .splist li:not(:is(.hero, .adv, .hero *, .adv *))::before {
    background: var(--violet)
}
:host([data-theme="dark"]) .flags span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--cyan-l);
    color: var(--cyan-t)
}
:host([data-theme="dark"]) .flags span+span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--orange-l);
    color: var(--orange-t)
}
:host([data-theme="dark"]) .srcs:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .stage .node:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: var(--sh2)
}
:host([data-theme="dark"]) .stage .node b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .stage .node small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .route:not(:is(.hero, .adv, .hero *, .adv *))::before {
    border-left: 4px dashed var(--dk-line)
}
:host([data-theme="dark"]) .stars i:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .stars i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .lockline:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .play:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(180deg,var(--dk-acc-tint) 0%,var(--dk-blue-tint) 55%,var(--dk-page) 100%)
}
:host([data-theme="dark"]) .dots i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .dots i.cur:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .dots i.s3:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--ok)
}
:host([data-theme="dark"]) .dots i.s2:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--yellow)
}
:host([data-theme="dark"]) .dots i.s1:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-red-soft)
}
:host([data-theme="dark"]) .how:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-dd)
}
:host([data-theme="dark"]) .w:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: none;
    color: inherit
}
:host([data-theme="dark"]) button.w:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--violet-l)
}
:host([data-theme="dark"]) .changed:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow-tint) !important;
    color: var(--dk-yellow) !important
}
:host([data-theme="dark"]) .st-ok:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--ok) !important;
    background: var(--ok-l) !important;
    color: var(--dk-green) !important
}
:host([data-theme="dark"]) .st-bad:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--bad) !important;
    background: var(--bad-l) !important;
    color: var(--dk-red) !important
}
:host([data-theme="dark"]) .st-alt:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--alt) !important;
    background: var(--alt-l) !important;
    color: var(--dk-acc-text) !important
}
:host([data-theme="dark"]) .st-miss:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 2px dashed var(--bad)
}
:host([data-theme="dark"]) .reader:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1.5px solid var(--line2);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .reader img:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-orange-tint)
}
:host([data-theme="dark"]) .reader.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--violet);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .versions div:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-card) 75%, transparent)
}
:host([data-theme="dark"]) .versions div b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .ledge:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(ellipse at 50% 30%,var(--dk-green-tint),var(--dk-green-soft) 60%,var(--dk-green-soft));
    box-shadow: inset 0 -18px 0 color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .hero-stage .fb-isle:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(180deg,var(--dk-green-tint) 0 30%,var(--dk-acc) 30% 60%,var(--dk-blue-soft) 60%)
}
:host([data-theme="dark"]) .adv-vig:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(120% 90% at 50% 40%,transparent 55%,color-mix(in oklab, var(--dk-acc) 45%, transparent) 100%)
}
:host([data-theme="dark"]) .spool:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 55%, transparent);
    border: 1.5px dashed rgba(255,255,255,.35)
}
:host([data-theme="dark"]) .threads b:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(160deg,var(--tc) 0 3px,color-mix(in srgb,var(--tc) 70%,#000) 3px 5px);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.5)
}
:host([data-theme="dark"]) .hbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1.5px solid rgba(255,255,255,.35);
    background: color-mix(in oklab, var(--dk-acc) 55%, transparent);
    color: #fff
}
:host([data-theme="dark"]) .hbtn:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) .hbtn.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    border-color: var(--dk-line)
}
:host([data-theme="dark"]) .ledge:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 3px,transparent 3px 9px),
 linear-gradient(180deg,var(--dk-green-soft) 0 16%,var(--dk-acc) 16% 58%,var(--dk-acc-strong) 58%);
    box-shadow: inset 0 6px 0 rgba(255,255,255,.25),0 -2px 0 rgba(255,255,255,.4),0 20px 40px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .ledge:not(:is(.hero, .adv, .hero *, .adv *))::after {
    border-top: 2px dashed rgba(255,255,255,.55)
}
:host([data-theme="dark"]) .ctx span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 70%, transparent);
    color: #fff
}
:host([data-theme="dark"]) .sock:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px dashed var(--dk-acc);
    background: color-mix(in oklab, var(--dk-acc) 12%, transparent);
    color: inherit
}
:host([data-theme="dark"]) .sock.hot:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .sock.full:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: transparent;
    background: none
}
:host([data-theme="dark"]) .dex .shadow:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(closest-side,color-mix(in oklab, var(--dk-acc) 45%, transparent),transparent)
}
:host([data-theme="dark"]) .say:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text);
    box-shadow: 0 16px 40px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .say b.who:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
:host([data-theme="dark"]) .rule-line:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text);
    box-shadow: 0 12px 30px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .rule-line .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--fl)
}
:host([data-theme="dark"]) .card-ov:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(180deg,color-mix(in oklab, var(--dk-acc) 25%, transparent),color-mix(in oklab, var(--dk-acc) 65%, transparent))
}
:host([data-theme="dark"]) .card-ov.clear:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none
}
:host([data-theme="dark"]) .scard:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    color: var(--dk-acc-text);
    box-shadow: 0 30px 80px color-mix(in oklab, var(--dk-acc) 50%, transparent)
}
:host([data-theme="dark"]) .scard p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .lamps i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-chip);
    box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.24)
}
:host([data-theme="dark"]) .lamps i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(circle at 40% 35%,var(--dk-yellow-tint),var(--dk-yellow));
    box-shadow: 0 0 14px 4px color-mix(in oklab, var(--dk-yellow) 70%, transparent)
}
:host([data-theme="dark"]) .msg:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-top: 1px solid color-mix(in oklab, var(--dk-yellow) 15%, transparent)
}
:host([data-theme="dark"]) .msg:first-of-type:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-top: 0
}
:host([data-theme="dark"]) .msg b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .msg.cur:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .murmur:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 55%, transparent);
    border: 1.5px dashed rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .murmur .lv i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: rgba(255,255,255,.18)
}
:host([data-theme="dark"]) .murmur .lv i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(160deg,var(--dk-raised) 0 3px,var(--dk-raised) 3px 5px)
}
:host([data-theme="dark"]) .murmur .lv i.on.hot:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(160deg,var(--dk-red-soft) 0 3px,var(--dk-red) 3px 5px)
}
:host([data-theme="dark"]) .tide .body:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 3px,transparent 3px 8px),repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.05) 0 2px,transparent 2px 7px),linear-gradient(180deg,var(--dk-raised),var(--dk-raised))
}
:host([data-theme="dark"]) .banner:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text);
    background: repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.035) 0 2px,transparent 2px 7px),repeating-linear-gradient(0deg,rgba(255,255,255,.2) 0 2px,transparent 2px 6px),linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-tint));
    box-shadow: inset 0 -6px 0 color-mix(in oklab, var(--dk-yellow) 16%, transparent),0 18px 40px color-mix(in oklab, var(--dk-acc) 35%, transparent);
    outline: 2.5px dashed color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .banner:not(:is(.hero, .adv, .hero *, .adv *))::before, :host([data-theme="dark"]) .banner:not(:is(.hero, .adv, .hero *, .adv *))::after {
    border-left: 3px dashed rgba(255,255,255,.65)
}
:host([data-theme="dark"]) .banner .tag:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #fff
}
:host([data-theme="dark"]) .banner .tag.retry:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-red)
}
:host([data-theme="dark"]) .banner .sockw:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px dashed var(--dk-acc);
    background: color-mix(in oklab, var(--dk-acc) 12%, transparent)
}
:host([data-theme="dark"]) .banner .sockw.full:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: transparent;
    background: none
}
:host([data-theme="dark"]) .banner .sockw.full.word:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-bottom: 3px solid var(--dk-green);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .banner .sockw.bad:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px solid var(--dk-red);
    background: var(--dk-red-tint)
}
:host([data-theme="dark"]) .banner.ok:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: inset 0 -6px 0 color-mix(in oklab, var(--dk-yellow) 16%, transparent),0 0 0 4px var(--dk-card),0 0 40px 8px color-mix(in oklab, var(--dk-yellow) 90%, transparent)
}
:host([data-theme="dark"]) .obj:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: none;
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .obj:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 3px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .obj .tk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(circle at 40% 30%,var(--dk-card),var(--dk-acc-tint));
    box-shadow: 0 8px 18px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .obj .tk .none:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 4px dashed var(--dk-acc)
}
:host([data-theme="dark"]) .obj kbd:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #fff
}
:host([data-theme="dark"]) .obj.stone .base:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(ellipse at 40% 30%,var(--dk-acc-tint),var(--dk-acc) 70%);
    box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.3),0 8px 0 color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .obj.key .base:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 3px,transparent 3px 8px),linear-gradient(135deg,var(--dk-blue-soft),var(--dk-blue));
    box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.36),0 10px 20px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .obj.spring .base:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(0deg,var(--dk-yellow) 0 6px,var(--dk-orange) 6px 12px);
    box-shadow: 0 8px 0 color-mix(in oklab, var(--dk-orange) 25%, transparent)
}
:host([data-theme="dark"]) .obj.spring .base:not(:is(.hero, .adv, .hero *, .adv *))::after {
    background: var(--dk-orange)
}
:host([data-theme="dark"]) .obj.wkey .tk:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text);
    background: linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-tint))
}
:host([data-theme="dark"]) .obj.wkey .base:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 50'%3E%3Ccircle cx='22' cy='25' r='18' fill='none' stroke='%23C99A1E' stroke-width='9'/%3E%3Crect x='38' y='20' width='76' height='10' rx='4' fill='%23C99A1E'/%3E%3Crect x='92' y='28' width='8' height='14' fill='%23C99A1E'/%3E%3Crect x='104' y='28' width='8' height='10' fill='%23C99A1E'/%3E%3C/svg%3E")
}
:host([data-theme="dark"]) .obj.gate .base:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(ellipse at 50% 85%,color-mix(in oklab, var(--dk-acc) 85%, transparent),color-mix(in oklab, var(--dk-acc) 75%, transparent) 60%),var(--dk-acc-deep);
    box-shadow: inset 0 0 0 10px var(--dk-acc),inset 0 0 0 14px var(--dk-acc),0 10px 20px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .obj.glow .tk:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: 0 0 0 4px var(--dk-card),0 0 30px 10px color-mix(in oklab, var(--dk-yellow) 90%, transparent)
}
:host([data-theme="dark"]) .obj.barred .base:not(:is(.hero, .adv, .hero *, .adv *))::before {
    background: repeating-linear-gradient(90deg,var(--dk-raised) 0 8px,transparent 8px 22px)
}
:host([data-theme="dark"]) .door:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.08) 0 3px,transparent 3px 22px),linear-gradient(180deg,var(--dk-orange),var(--dk-orange));
    box-shadow: inset 0 0 0 8px var(--dk-orange),0 14px 30px color-mix(in oklab, var(--dk-acc) 40%, transparent)
}
:host([data-theme="dark"]) .door:not(:is(.hero, .adv, .hero *, .adv *))::after {
    background: var(--dk-yellow)
}
:host([data-theme="dark"]) .door-in:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(ellipse at 50% 60%,var(--dk-yellow-tint),var(--dk-yellow) 70%)
}
:host([data-theme="dark"]) .portalglow:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(closest-side,color-mix(in oklab, var(--dk-blue-tint) 95%, transparent),color-mix(in oklab, var(--dk-blue) 40%, transparent),transparent)
}
:host([data-theme="dark"]) .planks:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .planks.banner-mode:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.03) 0 2px,transparent 2px 7px),linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-tint));
    box-shadow: 0 18px 40px color-mix(in oklab, var(--dk-acc) 35%, transparent);
    outline: 2.5px dashed color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .pl:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.05) 0 2px,transparent 2px 7px),linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-soft));
    box-shadow: inset 0 -4px 0 color-mix(in oklab, var(--dk-orange) 25%, transparent),0 6px 10px color-mix(in oklab, var(--dk-acc) 30%, transparent)
}
:host([data-theme="dark"]) .banner-mode .pl:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none;
    box-shadow: none
}
:host([data-theme="dark"]) .knot:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-orange)
}
:host([data-theme="dark"]) .banner-mode .knot:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: none
}
:host([data-theme="dark"]) .gap:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px dashed var(--dk-acc);
    background: color-mix(in oklab, var(--dk-card) 75%, transparent);
    color: inherit
}
:host([data-theme="dark"]) .gap:hover:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .gap:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .gap:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 3px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .gap.set:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-acc);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .gap.ok:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-green);
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .gap.bad:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-red);
    background: var(--dk-red-tint)
}
:host([data-theme="dark"]) .gap.fixed:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-green);
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .picker:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    box-shadow: 0 16px 40px color-mix(in oklab, var(--dk-acc) 50%, transparent)
}
:host([data-theme="dark"]) .picker button:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: var(--dk-card)
}
:host([data-theme="dark"]) .picker button:hover:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .picker button:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-tint);
    outline: 3px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .picker button .none:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px dashed var(--dk-acc)
}
:host([data-theme="dark"]) .picker small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff;
    text-shadow: 0 1px 4px #000
}
:host([data-theme="dark"]) .lamps2:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 60%, transparent)
}
:host([data-theme="dark"]) .lesson:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text);
    box-shadow: 0 30px 80px color-mix(in oklab, var(--dk-acc) 55%, transparent)
}
:host([data-theme="dark"]) .lesson .side:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(160deg,var(--fl),var(--dk-card))
}
:host([data-theme="dark"]) .lesson .side .big:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    box-shadow: 0 10px 24px color-mix(in oklab, var(--dk-acc) 15%, transparent)
}
:host([data-theme="dark"]) .lesson .side .role:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ft)
}
:host([data-theme="dark"]) .lesson .eyebrow:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ft)
}
:host([data-theme="dark"]) .lesson .box:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .lesson .box b.h:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .lesson .box.ex:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .lesson .box.ex b.h:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .lesson .box.no:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .lesson .box.no b.h:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .lesson mark:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow-tint);
    color: inherit
}
:host([data-theme="dark"]) .lesson s:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .punct[data-tr=ru] .lesson .tr-ru:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .punct[data-tr=kk] .lesson .tr-kk:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text);
    border-left: 3px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .rule-line .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--fl,#F1EAFF) !important;
    background: none
}
:host([data-theme="dark"]) .sprite-ok .rule-line .mk[data-i]:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-image: var(--sprite)
}
:host([data-theme="dark"]) .rhythm li:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .rhythm li i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--violet-d);
    box-shadow: var(--sh1)
}
:host([data-theme="dark"]) .rhythm li.p i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #FFD66B
}
:host([data-theme="dark"]) .rhythm li b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .rhythm li.ar:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .lp2>span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--bg);
    color: var(--ink3);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .lp2 .st-l.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d);
    border-color: var(--violet-m)
}
:host([data-theme="dark"]) .lp2 .st-p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .lp2 .st-p.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow-tint);
    border-color: var(--dk-yellow-line)
}
:host([data-theme="dark"]) .cc:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink3)
}
:host([data-theme="dark"]) .cc .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--violet-l)
}
:host([data-theme="dark"]) .cc.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-yellow-line);
    background: var(--dk-page);
    color: var(--ink)
}
:host([data-theme="dark"]) .modes:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .modes>span:not(.ln):not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .modes button:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: none;
    color: var(--ink3)
}
:host([data-theme="dark"]) .modes i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .modes .on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet-l);
    color: var(--violet-d)
}
:host([data-theme="dark"]) .modes .on i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .modes .ln:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--line2)
}
:host([data-theme="dark"]) .modes button i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #FFD66B
}
:host([data-theme="dark"]) .modes button:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .stepnav li.pn a:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    border-color: var(--dk-acc);
    color: #fff
}
:host([data-theme="dark"]) .stepnav li.pn a i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .stepnav li.pn a.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow);
    border-color: var(--dk-yellow-line);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .srcbox:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .srcbox summary:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .gate-card:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #fff;
    box-shadow: 0 30px 70px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .gate-card:not(:is(.hero, .adv, .hero *, .adv *))::before {
    background: linear-gradient(90deg,color-mix(in oklab, var(--dk-acc) 94%, transparent) 0%,color-mix(in oklab, var(--dk-acc) 82%, transparent) 46%,color-mix(in oklab, var(--dk-acc) 15%, transparent) 100%)
}
:host([data-theme="dark"]) .gate-done:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #7CF0A6
}
:host([data-theme="dark"]) .gate h2:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff
}
:host([data-theme="dark"]) .gate h2 span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #FFD66B
}
:host([data-theme="dark"]) .gate .tr:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-on);
    border-color: rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .gate-how p:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: rgba(255,255,255,.9)
}
:host([data-theme="dark"]) .gate-legend span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.14)
}
:host([data-theme="dark"]) .gate-legend .ok:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #7CF0A6
}
:host([data-theme="dark"]) .gate-legend .bad:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #FFB4B4
}
:host([data-theme="dark"]) .playbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow));
    color: var(--dk-acc-text);
    box-shadow: 0 8px 0 var(--dk-yellow),0 18px 40px color-mix(in oklab, var(--dk-yellow) 30%, transparent)
}
:host([data-theme="dark"]) .playbtn:active:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: 0 3px 0 var(--dk-yellow)
}
:host([data-theme="dark"]) .playbtn:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 3px solid var(--dk-line)
}
:host([data-theme="dark"]) .playbtn .pb-ic:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #FFD66B
}
:host([data-theme="dark"]) .playbtn .stars i:not(.on):not(:is(.hero, .adv, .hero *, .adv *)) {
    color: color-mix(in oklab, var(--dk-acc-text) 25%, transparent)
}
:host([data-theme="dark"]) .gate-skip .linkbtn:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .gate-skip .linkbtn:hover:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--violet-d)
}
@container punct (max-width:760px) {
    :host([data-theme="dark"]) .gate-card:not(:is(.hero, .adv, .hero *, .adv *))::before {
        background: linear-gradient(180deg,color-mix(in oklab, var(--dk-acc) 25%, transparent) 0,color-mix(in oklab, var(--dk-acc) 92%, transparent) 210px)
    }
}
:host([data-theme="dark"]) .warp:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: radial-gradient(circle at var(--x) var(--y),var(--dk-acc) 0,var(--dk-acc-strong) 30%,var(--dk-acc-deep) 70%)
}
:host([data-theme="dark"]) .warp-in:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff
}
:host([data-theme="dark"]) .warp-in b:not(:is(.hero, .adv, .hero *, .adv *)) {
    text-shadow: 0 5px 0 var(--dk-acc-strong)
}
:host([data-theme="dark"]) .punct.in-game:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep)
}
:host([data-theme="dark"]) .gtitle:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: color-mix(in oklab, var(--dk-acc) 55%, transparent);
    border: 1.5px dashed rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .gtitle .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: color-mix(in oklab, var(--dk-card) 92%, transparent)
}
:host([data-theme="dark"]) .gtitle .gt small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: rgba(255,255,255,.7)
}
:host([data-theme="dark"]) .splash b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff;
    text-shadow: 0 5px 0 var(--dk-acc-strong),0 14px 34px color-mix(in oklab, var(--dk-acc) 60%, transparent)
}
:host([data-theme="dark"]) .splash span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #FFE27A;
    text-shadow: 0 2px 12px color-mix(in oklab, var(--dk-acc) 85%, transparent)
}
:host([data-theme="dark"]) .rule-line.cheer:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .rule-line.cheer span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-green);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .oops:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text);
    box-shadow: 0 18px 50px color-mix(in oklab, var(--dk-acc) 50%, transparent)
}
:host([data-theme="dark"]) .oops .oh:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .oops .cue:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-yellow);
    background: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .banner .sockw.fixd:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 3px solid var(--dk-green);
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .banner .sockw.fixd.word:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-green);
    background: none
}
:host([data-theme="dark"]) .obj.right .tk:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: 0 0 0 4px var(--dk-green),0 0 26px 6px color-mix(in oklab, var(--dk-green) 55%, transparent)
}
:host([data-theme="dark"]) .ptag:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #fff
}
:host([data-theme="dark"]) .ptag.retry:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .banner .tag.retry:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .rafts .rq:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff;
    text-shadow: 0 2px 12px color-mix(in oklab, var(--dk-acc) 85%, transparent)
}
:host([data-theme="dark"]) .raft:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 0;
    background: none;
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .raft .rt:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: repeating-linear-gradient(90deg,rgba(255, 255, 255, 0.035) 0 2px,transparent 2px 7px),linear-gradient(180deg,var(--dk-yellow-tint),var(--dk-yellow-tint));
    box-shadow: inset 0 -5px 0 color-mix(in oklab, var(--dk-yellow) 16%, transparent),0 16px 34px color-mix(in oklab, var(--dk-acc) 38%, transparent);
    outline: 2.5px dashed color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .raft .rb:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(180deg,var(--dk-acc),var(--dk-acc));
    box-shadow: 0 8px 0 color-mix(in oklab, var(--dk-acc) 25%, transparent)
}
:host([data-theme="dark"]) .raft kbd:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep);
    color: #fff
}
:host([data-theme="dark"]) .raft:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: none
}
:host([data-theme="dark"]) .raft:focus-visible .rt:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline: 3px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .raft.glow .rt:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .raft.right .rt:not(:is(.hero, .adv, .hero *, .adv *)) {
    box-shadow: 0 0 0 4px var(--dk-green),0 0 34px 8px color-mix(in oklab, var(--dk-green) 50%, transparent);
    outline-color: transparent
}
:host([data-theme="dark"]) .scard.win .big-stars i:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .scard.win .big-stars i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--yellow)
}
:host([data-theme="dark"]) .joined:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .gtitle .snum:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .gtitle .trail i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: rgba(255,255,255,.25)
}
:host([data-theme="dark"]) .gtitle .trail i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-green)
}
:host([data-theme="dark"]) .gtitle .trail i.now:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow)
}
:host([data-theme="dark"]) .gtitle .cnt:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: rgba(255,255,255,.8)
}
:host([data-theme="dark"]) .splash small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: #fff;
    text-shadow: 0 2px 10px color-mix(in oklab, var(--dk-acc) 80%, transparent)
}
:host([data-theme="dark"]) .strail i:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: rgba(255,255,255,.3);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--dk-acc) 40%, transparent)
}
:host([data-theme="dark"]) .strail i.on:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-green)
}
:host([data-theme="dark"]) .strail i.now:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-yellow)
}
:host([data-theme="dark"]) .gust:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(90deg,transparent,color-mix(in oklab, var(--dk-card) 80%, transparent),transparent)
}
:host([data-theme="dark"]) .banner .tag:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-acc-deep)
}
:host([data-theme="dark"]) .rafts .fact:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text);
    box-shadow: 0 12px 30px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .rafts .fact small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .planks.repair:not(:is(.hero, .adv, .hero *, .adv *)) {
    outline-color: color-mix(in oklab, var(--dk-red) 45%, transparent)
}
:host([data-theme="dark"]) .gap.pre:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .gap.pre.nil:not(:is(.hero, .adv, .hero *, .adv *)) {
    border: 2px dashed var(--dk-acc-line);
    background: color-mix(in oklab, var(--dk-card) 60%, transparent)
}
:host([data-theme="dark"]) .gap.pre:hover:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .gap.pre:focus-visible:not(:is(.hero, .adv, .hero *, .adv *)) {
    border-color: var(--dk-acc);
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .scard p.small:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .usedmarks span:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: var(--dk-page);
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .usedmarks .mk:not(:is(.hero, .adv, .hero *, .adv *)) {
    background-color: var(--dk-card)
}
:host([data-theme="dark"]) .usedmarks b:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .beam:not(:is(.hero, .adv, .hero *, .adv *)) {
    background: linear-gradient(270deg,color-mix(in oklab, var(--dk-yellow-tint) 85%, transparent),color-mix(in oklab, var(--dk-yellow-tint) 25%, transparent) 40%,transparent 85%)
}
:host([data-theme="dark"]) .lp2 .st-p:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .gate-skip .linkbtn:not(:is(.hero, .adv, .hero *, .adv *)), :host([data-theme="dark"]) .lp2>span:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .cc:not(:is(.hero, .adv, .hero *, .adv *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) :is(.hero, .adv) {
    color-scheme: light;
    --violet: #874BF8;
    --violet-d: #6B33E6;
    --violet-dd: #4F22B8;
    --violet-l: #F1EAFF;
    --violet-m: #DCCBFF;
    --cyan: #0AAFFF;
    --cyan-t: #0077B8;
    --cyan-l: #E2F5FF;
    --green: #00D441;
    --green-t: #00823A;
    --green-l: #E1FAE9;
    --orange: #FF7D1D;
    --orange-t: #C9520A;
    --orange-l: #FFEEE0;
    --yellow: #FFAD00;
    --yellow-t: #9A6500;
    --yellow-l: #FFF3D1;
    --ink: #141217;
    --ink2: #4E4B55;
    --ink3: #86838F;
    --line: #ECE8F4;
    --line2: #DDD7EA;
    --bg: #F8F6FD;
    --card: #fff;
    --ok: #00A63E;
    --ok-l: #E3F8EA;
    --bad: #E5484D;
    --bad-l: #FFECEC;
    --alt: #8B5CF6;
    --alt-l: #F1EAFF;
    --sh1: 0 1px 2px rgba(40,20,90,.06),0 6px 18px rgba(60,30,140,.06);
    --sh2: 0 2px 6px rgba(40,20,90,.06),0 18px 44px rgba(60,30,140,.12)
}
:host([data-theme="dark"]) .hero {
    color: var(--ink)
}
:host([data-theme="dark"]){color-scheme:dark;--violet-d:var(--dk-acc-text);--line2:var(--dk-line-strong)}
:host([data-theme="dark"]) .btn-p:hover{background:var(--dk-acc-strong)}
`
