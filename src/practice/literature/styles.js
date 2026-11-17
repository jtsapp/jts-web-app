// CSS «Literature World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/literature/extract-styles.js из трёх <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const LITERATURE_CSS = `:host{
  --violet:#874BF8; --violet-ink:#5F2BD1; --violet-50:#F4EEFF; --violet-100:#E9DDFE;
  --cyan:#0AC7FF; --cyan-50:#E6F8FF; --orange:#FF7D1D; --orange-50:#FFF1E6; --green:#00D441;
  --ink:#141216; --ink-2:#3A3640; --muted:#6F6A76; --line:#E7E2EA; --paper:#FBFAF7; --paper-2:#F4F1EB; --white:#fff;
  --ui:var(--lit-font,inherit);
  --text:var(--lit-font,inherit);
  --lit:Georgia,'Times New Roman',serif;
  --r:22px; --r-sm:14px; --shadow:0 24px 60px -32px rgba(40,20,80,.35);
}
*{box-sizing:border-box}

.lw{margin:0;background:var(--paper);color:var(--ink);font-family:var(--text);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
button{font:inherit;color:inherit;cursor:pointer}
a{color:var(--violet-ink)}
.wrap{max-width:1200px;margin:0 auto;padding:0 28px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

.kicker{font-family:var(--ui);font-size:12.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--violet-ink)}
.display{font-family:var(--lit);font-weight:500;font-size:clamp(44px,6.4cqw,92px);line-height:.98;letter-spacing:-.025em;margin:0;font-optical-sizing:auto}
.display em{font-style:italic;font-weight:400;color:var(--violet)}
.h2{font-family:var(--lit);font-weight:500;font-size:clamp(32px,3.6cqw,48px);line-height:1.05;letter-spacing:-.02em;margin:0}
.h3{font-family:var(--lit);font-weight:500;font-size:26px;line-height:1.15;letter-spacing:-.01em;margin:0}
.lede{font-family:var(--text);font-size:19px;line-height:1.55;color:var(--ink-2);max-width:620px}
.meta{font-family:var(--ui);font-size:13px;color:var(--muted)}

.btn{display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 22px;font-family:var(--ui);font-weight:600;font-size:15px;background:var(--violet);color:#fff;transition:transform .2s,box-shadow .2s,background .2s}
.btn:hover{transform:translateY(-1px);box-shadow:0 12px 26px -12px rgba(135,75,248,.7)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.btn.ghost:hover{background:var(--ink);color:#fff}
.btn.sm{padding:9px 15px;font-size:13.5px}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;font-family:var(--ui);font-size:12.5px;font-weight:600;background:var(--paper-2);color:var(--ink-2)}
.pill.lv{background:var(--ink);color:#fff}
.pill.v{background:var(--violet-50);color:var(--violet-ink)}
.pill.c{background:var(--cyan-50);color:#04769a}
.pill.o{background:var(--orange-50);color:#b04d00}

.top{position:sticky;top:0;z-index:60;background:rgba(251,250,247,.86);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--line)}
.top-in{max-width:1200px;margin:auto;display:flex;align-items:center;gap:20px;padding:12px 28px}
.brand{display:flex;align-items:center;gap:14px;border:0;background:none;padding:0;white-space:nowrap}
.brand img{height:22px;width:auto}
.brand i{width:1px;height:22px;background:var(--line)}
.brand span{font-family:var(--lit);font-size:21px;font-weight:500;letter-spacing:-.01em}
.nav{display:flex;gap:4px;margin-left:auto}
.nav button{border:0;background:none;font-family:var(--ui);font-size:14.5px;font-weight:500;color:var(--ink-2);padding:8px 13px;border-radius:999px}
.nav button:hover{background:var(--paper-2)}
.nav button.on{background:var(--ink);color:#fff}
.tools{display:flex;gap:8px;align-items:center}
.sel{appearance:none;border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 30px 8px 13px;font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ink);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23141216' stroke-width='1.6' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
.lang{display:flex;background:var(--paper-2);border-radius:999px;padding:3px}
.lang button{border:0;background:none;border-radius:999px;padding:6px 9px;font-family:var(--ui);font-size:12px;font-weight:600;color:var(--muted)}
.lang button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.burger{display:none;border:0;background:var(--paper-2);border-radius:999px;width:40px;height:40px}

.bubble-clip{clip-path:url(#bubble);-webkit-clip-path:url(#bubble)}
.bubble-box{border-radius:46% 46% 46% 10% / 46% 46% 46% 10%}

.hero{position:relative;overflow:hidden;padding:56px 0 40px}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
.hero .lede{margin:26px 0 30px}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap}
.gallery-frame{position:relative;aspect-ratio:1/1.02;width:100%;max-width:560px;margin-left:auto}
.gallery-frame .art{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transform:scale(1.06);transition:opacity 1.6s ease,transform 9s ease}
.gallery-frame .art.on{opacity:1;transform:scale(1)}
.gallery-frame .clip{position:absolute;inset:0;background:var(--paper-2)}
.art-cap{position:absolute;left:-8px;bottom:6%;max-width:300px;background:#fff;border-radius:18px 18px 18px 4px;padding:14px 16px;box-shadow:var(--shadow);font-family:var(--ui);font-size:13px;line-height:1.4;transition:opacity .6s}
.art-cap b{display:block;font-family:var(--lit);font-weight:500;font-size:18px;margin-bottom:2px}
.art-cap button{margin-top:8px;border:0;background:none;padding:0;color:var(--violet-ink);font-weight:600;font-family:var(--ui)}
.quote-chip{position:absolute;right:-6px;top:6%;max-width:260px;background:var(--cyan);color:#05232e;border-radius:20px 20px 4px 20px;padding:13px 16px;font-family:var(--lit);font-style:italic;font-size:17px;line-height:1.3;box-shadow:var(--shadow)}
.dots{display:flex;gap:6px;position:absolute;right:12px;bottom:-26px}
.dots button{width:8px;height:8px;border-radius:50%;border:0;background:var(--line);padding:0}
.dots button.on{background:var(--violet);width:22px;border-radius:6px}

.section{padding:84px 0}
.sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:28px}
.rooms{display:grid;grid-template-columns:repeat(12,1fr);gap:18px}
.room{position:relative;border:0;padding:0;text-align:left;border-radius:var(--r);overflow:hidden;min-height:330px;background:var(--ink);color:#fff;box-shadow:var(--shadow);transition:transform .35s}
.room:hover{transform:translateY(-4px)}
.room:nth-child(1){grid-column:span 7;min-height:420px}.room:nth-child(2){grid-column:span 5;min-height:420px}
.room:nth-child(3){grid-column:span 5}.room:nth-child(4){grid-column:span 7}
.room .bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform 1s}
.room:hover .bg{transform:scale(1.04)}
.room:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,22,0) 35%,rgba(20,18,22,.88))}
.room .in{position:absolute;left:26px;right:26px;bottom:24px;z-index:2}
.room .h2{color:#fff}
.room p{margin:8px 0 0;font-size:15px;color:#e9e5ee;max-width:440px}
.room .count{font-family:var(--ui);font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#fff;opacity:.85}
.room.proverbs{background:var(--violet)}
.room.proverbs:after{display:none}
.room.proverbs .bubbles{position:absolute;inset:18px 18px 110px;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start}
.room.proverbs .bubbles span{background:#fff;color:var(--ink);font-family:var(--lit);font-size:18px;padding:10px 15px;border-radius:18px 18px 18px 4px}
.room.proverbs .bubbles span:nth-child(3n){background:var(--cyan);color:#05232e}
.room.proverbs .bubbles span:nth-child(4n){background:var(--orange);color:#fff}

.featured{display:grid;grid-template-columns:.8fr 1.2fr;gap:44px;align-items:center;background:#fff;border-radius:32px;padding:34px;box-shadow:0 1px 0 var(--line)}
.featured .plate{background:var(--paper-2);border-radius:20px;padding:22px;display:grid;place-items:center}
.featured .plate img{max-height:420px;width:auto;border-radius:6px;box-shadow:0 18px 40px -24px rgba(0,0,0,.5)}

.timeline{display:grid;grid-template-columns:repeat(7,1fr);gap:12px;position:relative}
.timeline:before{content:"";position:absolute;left:0;right:0;top:27px;height:2px;background:linear-gradient(90deg,var(--violet),var(--cyan))}
.era-btn{position:relative;border:0;background:none;text-align:left;padding:0}
.era-btn .dot{width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--violet);margin:20px 0 14px}
.era-btn b{display:block;font-family:var(--lit);font-weight:500;font-size:19px;line-height:1.15}
.era-btn small{font-family:var(--ui);font-size:12px;color:var(--muted)}
.era-btn .faces{display:flex;margin-top:10px}
.era-btn .faces img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--paper);margin-right:-8px}
.era-btn:hover b{color:var(--violet-ink)}
.levels{display:flex;gap:8px;flex-wrap:wrap}
.levels button{border:1.5px solid var(--line);background:#fff;border-radius:16px;padding:12px 16px;font-family:var(--ui);text-align:left;min-width:120px}
.levels button b{display:block;font-size:20px}
.levels button span{font-size:12px;color:var(--muted)}
.levels button.on,.levels button:hover{border-color:var(--violet);background:var(--violet-50)}

.page-head{padding:52px 0 18px}
.page-head .lede{margin-top:14px}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:20px 0 6px}
.chip{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-family:var(--ui);font-size:13.5px;font-weight:500;color:var(--ink-2)}
.chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.chip:hover{border-color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:24px 0 80px}
.card{border:0;padding:0;background:#fff;border-radius:var(--r);overflow:hidden;text-align:left;display:flex;flex-direction:column;box-shadow:0 1px 0 var(--line);transition:transform .3s,box-shadow .3s}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.card .ph{aspect-ratio:4/3.2;background:var(--paper-2) center/cover no-repeat;position:relative}
.card .ph.plate{background-size:contain;background-origin:content-box;padding:16px}
.card .tx{padding:18px 20px 20px;display:flex;flex-direction:column;gap:8px;flex:1}
.card .first{font-family:var(--lit);font-style:italic;font-size:18px;line-height:1.35;color:var(--ink-2)}
.card .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:6px;align-items:center}
.card .who{font-family:var(--ui);font-size:13px;color:var(--muted)}
.typo{display:grid;place-items:center;height:100%;padding:22px;background:var(--violet-50)}
.typo span{font-family:var(--lit);font-style:italic;font-size:24px;line-height:1.2;text-align:center;color:var(--violet-ink)}
.typo.c{background:var(--cyan-50)} .typo.c span{color:#04769a}
.typo.o{background:var(--orange-50)} .typo.o span{color:#b04d00}
.typo .big{font-size:96px;font-style:normal;line-height:1}
.section-label{display:flex;align-items:baseline;gap:14px;margin:46px 0 4px}
.section-label .meta{max-width:560px}

.keys{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:20px 0 10px}
.key{border:0;background:#fff;border-radius:20px;padding:18px;text-align:left;box-shadow:0 1px 0 var(--line);transition:.25s}
.key:hover{background:var(--violet);color:#fff;transform:translateY(-2px)}
.key .g{font-family:var(--lit);font-size:56px;line-height:1;font-weight:500}
.key small{display:block;font-family:var(--ui);font-size:12.5px;margin-top:6px;opacity:.75}
.mini-play{width:38px;height:38px;border-radius:50%;border:0;background:var(--violet);color:#fff;display:grid;place-items:center;flex:none}
.mini-play svg{width:14px;height:14px}

.wall{columns:3 300px;column-gap:18px;margin:24px 0 80px}
.saying{display:block;width:100%;break-inside:avoid;margin:0 0 18px;border:0;text-align:left;padding:22px 22px 16px;border-radius:24px 24px 24px 6px;background:#fff;box-shadow:0 1px 0 var(--line);transition:.25s}
.saying:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.saying q{display:block;font-family:var(--lit);font-size:24px;line-height:1.22;quotes:none}
.saying .f{display:flex;justify-content:space-between;margin-top:12px;font-family:var(--ui);font-size:12px;color:var(--muted)}
.saying.v{background:var(--violet);color:#fff}.saying.v .f{color:#e4d8ff}
.saying.c{background:var(--cyan);color:#05232e}.saying.c .f{color:#0a4a5c}
.saying.big q{font-size:30px}

.crumbs{display:flex;gap:8px;align-items:center;padding:22px 0 0;font-family:var(--ui);font-size:13.5px;color:var(--muted)}
.crumbs button{border:0;background:none;padding:0;color:var(--muted);font-family:var(--ui)}
.crumbs button:hover{color:var(--violet-ink)}
.stage-tabs{position:sticky;top:63px;z-index:40;display:flex;gap:6px;justify-content:center;padding:12px 0;background:linear-gradient(var(--paper) 70%,rgba(251,250,247,0))}
.stage-tabs button{border:0;background:#fff;border-radius:999px;padding:10px 20px;font-family:var(--ui);font-weight:600;font-size:14.5px;color:var(--ink-2);box-shadow:0 1px 0 var(--line)}
.stage-tabs button span{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--paper-2);font-size:11px;margin-right:8px}
.stage-tabs button.on{background:var(--ink);color:#fff}
.stage-tabs button.on span{background:var(--violet);color:#fff}
.exp{display:grid;grid-template-columns:minmax(300px,.85fr) 1.15fr;gap:56px;padding:22px 0 70px;align-items:start}
.exp-side{position:sticky;top:130px}
.art-wrap{border-radius:var(--r);overflow:hidden;background:var(--paper-2)}
.art-wrap img{width:100%;max-height:68vh;object-fit:cover}
.art-wrap.plate{padding:26px;display:grid;place-items:center}
.art-wrap.plate img{width:auto;max-width:100%;max-height:62vh;object-fit:contain;border-radius:4px;box-shadow:0 20px 40px -26px rgba(0,0,0,.55)}
.art-wrap.small{padding:26px;display:grid;place-items:center}
.art-wrap.small img{max-width:340px;width:100%}
.caption{font-family:var(--ui);font-size:12px;line-height:1.45;color:var(--muted);margin-top:10px}
.caption a{color:var(--muted)}
.typo-art{aspect-ratio:1/1;display:grid;place-items:center;background:var(--violet-50);border-radius:var(--r);position:relative;overflow:hidden}
.typo-art .b{width:72%;aspect-ratio:1/1;background:var(--violet);display:grid;place-items:center;color:#fff}
.typo-art .b span{font-family:var(--lit);font-size:clamp(90px,12cqw,170px);line-height:1;font-weight:500;margin-top:-6%}
.typo-art.c{background:var(--cyan-50)} .typo-art.c .b{background:var(--cyan);color:#05232e}
.typo-art.o{background:var(--orange-50)} .typo-art.o .b{background:var(--orange)}
.author-chip{display:flex;gap:12px;align-items:center;margin-top:18px;border:0;background:none;padding:0;text-align:left}
.author-chip img{width:52px;height:52px;border-radius:50%;object-fit:cover}
.author-chip b{display:block;font-family:var(--lit);font-weight:500;font-size:19px}
.author-chip small{font-family:var(--ui);font-size:12.5px;color:var(--muted)}
.title-block .display{font-size:clamp(40px,4.6cqw,66px)}
.title-block .by{font-family:var(--lit);font-style:italic;font-size:22px;color:var(--ink-2);margin-top:12px}
.title-block .pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px}

.voice{margin:26px 0 8px;background:#fff;border-radius:24px;padding:14px 18px 14px 14px;box-shadow:0 1px 0 var(--line)}
.voice .row{display:flex;align-items:center;gap:14px}
.voice .play{width:58px;height:58px;flex:none;border:0;padding:0;background:var(--violet);color:#fff;display:grid;place-items:center;transition:transform .2s}
.voice .play:hover{transform:scale(1.05)}
.voice .play svg{width:20px;height:20px;margin:-4px 0 0 2px}
.voice .mid{flex:1;min-width:0}
.voice .lab{font-family:var(--ui);font-size:13px;font-weight:600}
.voice .lab span{font-weight:400;color:var(--muted)}
.voice .bar{height:6px;border-radius:6px;background:var(--paper-2);margin-top:9px;cursor:pointer;position:relative}
.voice .bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:6px;background:linear-gradient(90deg,var(--violet),var(--cyan))}
.voice .t{font-family:var(--ui);font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;min-width:74px;text-align:right}
.voice .sp{border:0;background:var(--paper-2);border-radius:999px;padding:6px 10px;font-family:var(--ui);font-size:12px;font-weight:600}
.voice .readers{display:flex;gap:6px;margin-top:10px;padding-left:72px;flex-wrap:wrap}
.voice .readers button{border:0;background:var(--paper-2);border-radius:999px;padding:5px 11px;font-family:var(--ui);font-size:12px}
.voice .readers button.on{background:var(--violet-50);color:var(--violet-ink);font-weight:600}
.voice .credit{font-family:var(--ui);font-size:11.5px;color:var(--muted);margin:8px 0 0 72px}
.voice .credit a{color:var(--muted)}
.voice .note{font-family:var(--ui);font-size:12.5px;color:var(--ink-2);margin:8px 0 0 72px}
.voice.playing .play{background:var(--ink)}

.poem{font-family:var(--lit);font-size:23px;line-height:1.66;color:#1b1820;margin-top:30px;font-optical-sizing:auto}
.poem .ln{display:block;position:relative;padding:0 12px;margin:0 -12px;border-radius:8px;transition:background .25s,box-shadow .25s;white-space:pre-wrap}
.poem .ln:hover{background:rgba(135,75,248,.06)}
.poem .ln.hl{background:var(--violet-50)}
.poem .ln.i1{padding-left:44px}.poem .ln.i2{padding-left:76px}.poem .ln.i3{padding-left:108px}
.poem .no{position:absolute;left:-30px;top:.5em;font-family:var(--ui);font-size:11px;color:#b9b3c0;line-height:1}
.poem .gap{display:block;height:22px}
.poem .speaker{display:block;font-family:var(--ui);font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--violet-ink);margin:10px 0 4px}
.poem.prose .ln{white-space:normal}
.w{border:0;background:none;padding:0;font:inherit;color:inherit;border-bottom:1.5px dotted rgba(135,75,248,.55);cursor:help;line-height:inherit}
.w:hover,.w.on{color:var(--violet-ink);border-bottom-color:var(--violet)}
.src-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:28px;padding-top:16px;border-top:1px solid var(--line);font-family:var(--ui);font-size:12.5px;color:var(--muted)}
.src-line button{border:0;background:none;padding:0;color:var(--muted);text-decoration:underline;text-underline-offset:3px;font-family:var(--ui);font-size:12.5px}
.src-more{margin-top:10px;font-family:var(--ui);font-size:12.5px;color:var(--ink-2);background:#fff;border-radius:14px;padding:14px 16px;line-height:1.55}
.extract{font-family:var(--ui);font-size:12.5px;color:#b04d00;margin-top:12px}

.watch{margin-top:40px}
.vid{position:relative;aspect-ratio:16/9;border-radius:20px;overflow:hidden;background:#000}
.vid .poster{position:absolute;inset:0;border:0;padding:0;background:#000 center/cover;width:100%}
.vid .poster:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55))}
.vid .poster span{position:absolute;left:18px;bottom:16px;z-index:2;display:flex;align-items:center;gap:10px;color:#fff;font-family:var(--ui);font-weight:600}
.vid .poster span i{width:52px;height:52px;display:grid;place-items:center;background:var(--violet)}
.vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.vmeta{font-family:var(--ui);font-size:13px;color:var(--muted);margin-top:10px;line-height:1.5}
.vmeta b{color:var(--ink)}
.vids{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}

.explore{display:grid;grid-template-columns:1.1fr .9fr;gap:24px;padding:26px 0 80px}
.panel{background:#fff;border-radius:var(--r);padding:28px;box-shadow:0 1px 0 var(--line)}
.panel + .panel{margin-top:24px}
.panel h3{margin:0 0 12px}
.story{font-family:var(--lit);font-size:21px;line-height:1.55}
.author-card{display:grid;grid-template-columns:96px 1fr;gap:18px;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--line)}
.author-card img{width:96px;height:120px;object-fit:cover;border-radius:14px}
.learner{font-family:var(--ui);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#9a93a3;margin-bottom:8px;display:block}
.words{display:grid;gap:14px}
.words div{display:grid;grid-template-columns:130px 1fr;gap:12px;align-items:baseline;padding-bottom:12px;border-bottom:1px solid var(--line)}
.words b{font-family:var(--lit);font-weight:500;font-size:20px}
.words small{display:block;color:var(--muted);font-size:13.5px;margin-top:2px}
.seg{display:inline-flex;background:var(--paper-2);border-radius:999px;padding:3px;margin-bottom:14px}
.seg button{border:0;background:none;border-radius:999px;padding:6px 12px;font-family:var(--ui);font-size:12.5px;font-weight:600;color:var(--muted)}
.seg button.on{background:#fff;color:var(--ink)}
.devices{display:flex;flex-wrap:wrap;gap:8px}
.dev{border:0;border-radius:999px;padding:8px 14px;background:var(--violet-50);color:var(--violet-ink);font-family:var(--ui);font-size:13.5px;font-weight:600}
.dev.on{background:var(--violet);color:#fff}
.dev-def{margin-top:12px;font-size:15px;color:var(--ink-2);min-height:22px}
.callout{border-radius:16px;padding:14px 16px;background:var(--orange-50);font-size:15px;margin-top:14px}
.callout b{font-family:var(--ui);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#b04d00;display:block;margin-bottom:4px}
.callout.c{background:var(--cyan-50)} .callout.c b{color:#04769a}
.rhyme-map{font-family:var(--lit);font-size:18px;line-height:1.6;margin-top:12px}
.rhyme-map div{display:flex;gap:10px}
.rhyme-map em{font-style:normal;font-family:var(--ui);font-size:11px;font-weight:700;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;margin-top:4px;flex:none}

.practise{display:grid;grid-template-columns:1.25fr .75fr;gap:24px;padding:26px 0 80px}
.acts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
.acts button{border:0;background:var(--paper-2);border-radius:999px;padding:9px 15px;font-family:var(--ui);font-size:13.5px;font-weight:600;color:var(--ink-2)}
.acts button.on{background:var(--violet);color:#fff}
.hint{font-size:14.5px;color:var(--muted);margin:0 0 14px}
.built{min-height:64px;border:2px dashed var(--line);border-radius:16px;padding:10px;display:grid;gap:6px;margin-bottom:12px}
.built div{font-family:var(--lit);font-size:19px;padding:6px 12px;border-radius:10px;background:var(--paper-2)}
.built div.ok{background:#E3F8EA}.built div.no{background:#FFE9E1}
.choices{display:grid;gap:8px}
.choices button{text-align:left;border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:10px 14px;font-family:var(--lit);font-size:19px}
.choices button:hover{border-color:var(--violet)}
.choices button[disabled]{opacity:.3}
.opts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.opts button{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:9px 17px;font-family:var(--lit);font-size:19px}
.opts button.ok{background:#E3F8EA;border-color:#79d49a}.opts button.no{background:#FFE9E1;border-color:#f3a98d}
.opts button[disabled]{opacity:.3}
.fb{min-height:22px;margin-top:12px;font-family:var(--ui);font-size:14px;font-weight:600;color:var(--violet-ink)}
.line-card{font-family:var(--lit);font-size:22px;line-height:1.5;padding:16px 18px;border-radius:16px;background:var(--paper-2)}
.blank{display:inline-block;min-width:90px;border-bottom:2px solid var(--violet);color:var(--violet);text-align:center}
.taps{display:flex;gap:6px;margin-top:10px}
.taps i{width:14px;height:14px;border-radius:50%;background:var(--line)}
.taps i.on{background:var(--violet)}
.clap{width:96px;height:96px;font-size:34px}
.ladder{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ladder button{border:1.5px solid var(--line);background:#fff;border-radius:16px;padding:14px;text-align:center;font-family:var(--ui)}
.ladder button b{display:block;font-family:var(--lit);font-weight:500;font-size:24px}
.ladder button.on{border-color:var(--violet);background:var(--violet-50)}
.timer{font-family:var(--lit);font-size:56px;font-variant-numeric:tabular-nums;margin:12px 0}
.stress{display:flex;gap:8px;flex-wrap:wrap}
.stress button{border:1.5px solid var(--line);background:#fff;border-radius:12px;padding:6px 12px;font-family:var(--lit);font-size:26px}
.stress button.on{background:var(--violet);color:#fff;border-color:var(--violet);text-transform:uppercase}
.rec{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px}
.rec audio{height:40px;max-width:100%}
.recdot{width:10px;height:10px;border-radius:50%;background:#e5484d;display:none;animation:p 1s infinite}
.recording .recdot{display:inline-block}
@keyframes p{50%{opacity:.2}}
textarea{width:100%;min-height:120px;border:1.5px solid var(--line);border-radius:16px;padding:14px;font-family:var(--lit);font-size:19px;background:var(--paper);resize:vertical}
.next-row{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding:26px 0 70px}
.next-row button{border:0;background:none;text-align:left;font-family:var(--ui);padding:0;max-width:45%}
.next-row button small{display:block;color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.next-row button b{font-family:var(--lit);font-weight:500;font-size:22px}
.next-row button:last-child{text-align:right}

.pv-hero{display:grid;place-items:center;text-align:center;padding:60px 0 30px}
.pv-bubble{max-width:860px;background:var(--violet);color:#fff;border-radius:48px 48px 48px 10px;padding:52px 56px;box-shadow:var(--shadow)}
.pv-bubble q{display:block;font-family:var(--lit);font-weight:500;font-size:clamp(34px,4.6cqw,58px);line-height:1.08;quotes:none;letter-spacing:-.015em}
.pv-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px 0 80px}
.reveal-btn{border:0;background:var(--paper-2);border-radius:16px;padding:16px;width:100%;text-align:left;font-family:var(--text);font-size:17px}
.reveal-btn.shut{color:transparent;text-shadow:0 0 12px rgba(0,0,0,.35)}

.pop{position:absolute;z-index:90;max-width:300px;background:var(--ink);color:#fff;border-radius:16px 16px 16px 4px;padding:13px 15px;font-size:14.5px;box-shadow:var(--shadow)}
.pop b{display:block;font-family:var(--lit);font-weight:500;font-size:20px}
.pop .tr{margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.18);color:#d8d2e2}
.pop .l{font-family:var(--ui);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#a49cb0}
.modal{position:fixed;inset:0;z-index:100;background:rgba(20,18,22,.5);display:grid;place-items:center;padding:20px}
.modal .box{background:#fff;border-radius:26px;max-width:720px;width:100%;max-height:86vh;overflow:auto;padding:30px}
footer{background:var(--ink);color:#c9c3d1;padding:44px 0;font-family:var(--ui);font-size:13.5px}
footer .wrap{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:center}
footer img{height:22px}
footer button{border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:9px 15px;font-family:var(--ui)}
.fade{animation:fade .55s ease both}
@keyframes fade{from{opacity:0;transform:translateY(8px)}}
@container lw (max-width:1020px){
  .hero-grid,.featured,.exp,.explore,.practise,.pv-grid{grid-template-columns:1fr}
  .exp-side{position:static}
  .gallery-frame{margin:0 auto;max-width:440px}
  .grid{grid-template-columns:1fr 1fr}
  .rooms .room{grid-column:span 12!important;min-height:300px!important}
  .timeline{grid-template-columns:repeat(4,1fr)}
  .nav{display:none}.nav.open{display:flex;position:absolute;top:62px;left:12px;right:12px;flex-direction:column;background:#fff;border-radius:18px;padding:10px;box-shadow:var(--shadow)}
  .burger{display:grid;place-items:center;margin-left:auto}
}
@container lw (max-width:640px){
  .wrap,.top-in{padding-left:16px;padding-right:16px}
  .brand span{display:none}.brand i{display:none}
  .grid{grid-template-columns:1fr}
  .timeline{grid-template-columns:1fr 1fr}
  .poem{font-size:20px}.poem .ln.i1{padding-left:28px}.poem .ln.i2{padding-left:44px}.poem .ln.i3{padding-left:60px}.poem .no{display:none}
  .stage-tabs button{padding:9px 13px;font-size:13px}.stage-tabs button span{display:none}
  .vids{grid-template-columns:1fr}.words div{grid-template-columns:1fr}
  .pv-bubble{padding:34px 26px}.quote-chip{display:none}.art-cap{left:6px;right:6px;max-width:none}
  .sel{max-width:110px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

.badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;font-family:var(--ui);font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--paper-2);color:var(--ink-2)}
.badge.tr{background:#FFF6D6;color:#7a5600}
.badge.us{background:var(--cyan-50);color:#04769a}
.badge.full{background:#E4F9EA;color:#0b6b2c}
.badge.ex{background:var(--orange-50);color:#b04d00}
.badge.cr{background:#F1E9E9;color:#7a2a2a}
.src{font-family:var(--ui);font-size:12.5px;color:var(--muted);margin-top:8px}
.src a{color:var(--muted)}
.learner{display:inline-block;font-family:var(--ui);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--violet-ink);background:var(--violet-50);border-radius:999px;padding:3px 9px;margin-bottom:10px}

.world-hero{position:relative;min-height:560px;color:#fff;overflow:hidden;background:#1b1420}
.world-hero .bg{position:absolute;inset:0;background-size:cover;background-position:50% 35%;filter:saturate(.9)}
.world-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,14,26,.92) 0%,rgba(20,14,26,.7) 45%,rgba(20,14,26,.15) 100%)}
.world-hero .wrap{position:relative;z-index:2;padding-top:110px;padding-bottom:90px}
.world-hero .display{color:#fff;max-width:760px}
.world-hero .display em{color:#c9a8ff}
.world-hero .lede{color:#e6e0ee}
.world-hero .kicker{color:#c9a8ff}
.curtain{position:absolute;top:0;bottom:0;width:7%;z-index:1;background:linear-gradient(90deg,#3b0f2c,#6b1846 40%,#3b0f2c);opacity:.9}
.curtain.l{left:0}.curtain.r{right:0;transform:scaleX(-1)}
.stats{display:flex;gap:34px;flex-wrap:wrap;margin-top:34px}
.stats b{display:block;font-family:var(--lit);font-size:40px;font-weight:500;line-height:1}
.stats span{font-family:var(--ui);font-size:13px;color:#d9d1e4}

.feature{display:grid;grid-template-columns:1.15fr 1fr;gap:0;border-radius:var(--r);overflow:hidden;background:#fff;box-shadow:var(--shadow);border:0;padding:0;text-align:left;width:100%}
.feature .ph{min-height:420px;background-size:cover;background-position:50% 30%}
.feature .tx{padding:40px 40px 34px;display:flex;flex-direction:column;gap:12px}
.feature q{font-family:var(--lit);font-style:italic;font-size:24px;line-height:1.35;color:var(--ink-2)}
.pcards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:18px}
.pcard{border:0;padding:0;text-align:left;background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:0 1px 0 var(--line),0 14px 34px -26px rgba(40,20,80,.35);transition:transform .3s;display:flex;flex-direction:column}
.pcard:hover{transform:translateY(-3px)}
.pcard .ph{aspect-ratio:4/3;background-size:cover;background-position:50% 30%;background-color:var(--paper-2)}
.pcard .ph.ty{display:flex;align-items:flex-end;padding:18px;background:linear-gradient(160deg,#2a1b3d,#52307f)}
.pcard .ph.ty.c{background:linear-gradient(160deg,#063244,#0a7fa6)}
.pcard .ph.ty.o{background:linear-gradient(160deg,#4a1d00,#c45a10)}
.pcard .ph.ty span{font-family:var(--lit);font-size:30px;line-height:1.02;color:#fff;font-style:italic}
.pcard .tx{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.pcard .tx small{font-family:var(--ui);font-size:12.5px;color:var(--muted)}
.genre-row{margin-top:46px}
.genre-row h3{display:flex;align-items:baseline;gap:12px}
.genre-row h3 small{font-family:var(--ui);font-size:13px;color:var(--muted);font-weight:500}
.plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:14px}
.prow{display:flex;gap:14px;align-items:center;border:0;background:#fff;border-radius:16px;padding:14px 16px;text-align:left;box-shadow:0 1px 0 var(--line);transition:background .2s}
.prow:hover{background:var(--violet-50)}
.prow .ini{flex:none;width:46px;height:46px;border-radius:50% 50% 50% 8px;display:grid;place-items:center;font-family:var(--lit);font-size:22px;color:#fff;background:var(--violet)}
.prow.Comedy .ini{background:var(--cyan)}.prow.History .ini{background:var(--orange)}.prow.Romance .ini{background:#2bb673}
.prow b{display:block;font-family:var(--lit);font-weight:500;font-size:19px;line-height:1.15}
.prow small{font-family:var(--ui);font-size:12px;color:var(--muted)}

.life{position:relative;margin-top:26px;display:grid;grid-template-columns:repeat(2,1fr);gap:14px 40px}
.life .ev{display:grid;grid-template-columns:110px 1fr;gap:16px;padding:14px 0;border-top:1px solid var(--line)}
.life .ev b{font-family:var(--lit);font-size:22px;font-weight:500;color:var(--violet-ink)}
.life .ev p{margin:0;font-size:15.5px}
.theatre{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px}
.theatre .panel h3{font-size:22px;margin-bottom:8px}
.theatre .panel p{margin:0;font-size:15px}
.figrow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px}
.figrow figure{margin:0;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 0 var(--line)}
.figrow figure img{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--paper-2)}
.figrow figcaption{padding:10px 14px 14px;font-family:var(--ui);font-size:12.5px;color:var(--muted)}

.play-head{position:relative;color:#fff;background:#1b1420;overflow:hidden}
.play-head .bg{position:absolute;inset:0;background-size:cover;background-position:50% 30%;opacity:.55}
.play-head:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,14,26,.3),rgba(20,14,26,.92))}
.play-head .wrap{position:relative;z-index:2;padding-top:80px;padding-bottom:30px}
.play-head .display{color:#fff;font-size:clamp(46px,6cqw,86px)}
.play-head .kicker{color:#c9a8ff}
.play-head .by{font-family:var(--lit);font-style:italic;font-size:22px;color:#e6e0ee;margin-top:10px}
.play-head .crumbs button,.play-head .crumbs{color:#d9d1e4}
.ptabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:26px}
.ptabs button{border:0;border-radius:999px;padding:10px 16px;font-family:var(--ui);font-weight:600;font-size:14px;background:rgba(255,255,255,.12);color:#fff}
.ptabs button.on{background:#fff;color:var(--ink)}
.ov{display:grid;grid-template-columns:1.4fr 1fr;gap:26px;padding:40px 0 10px}
.facts{display:grid;gap:12px}
.fact{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 1px 0 var(--line)}
.fact b{display:block;font-family:var(--ui);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.acts-guide{display:grid;gap:12px;margin-top:16px}
.acts-guide .a{display:grid;grid-template-columns:70px 1fr;gap:14px;align-items:start;background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 0 var(--line)}
.acts-guide .a b{font-family:var(--lit);font-size:26px;color:var(--violet)}
.acts-guide .a p{margin:0}
.acts-guide .a button{margin-top:8px}

.reader{display:grid;grid-template-columns:250px 1fr;gap:34px;padding:30px 0 40px}
.snav{position:sticky;top:84px;align-self:start;max-height:calc(100vh - 100px);overflow:auto;padding-right:6px}
.snav .act{font-family:var(--ui);font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
.snav button{display:block;width:100%;text-align:left;border:0;background:none;border-radius:10px;padding:7px 10px;font-family:var(--ui);font-size:13.5px;color:var(--ink-2)}
.snav button small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.snav button:hover{background:var(--paper-2)}
.snav button.on{background:var(--ink);color:#fff}.snav button.on small{color:#cfc8d8}
.snav-sel{display:none;width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--line);font-family:var(--ui);font-size:15px;background:#fff}
.script{max-width:760px}
.scene-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:10px}
.scene-h h2{font-family:var(--lit);font-weight:500;font-size:40px;margin:0;letter-spacing:-.01em}
.scene-h span{font-family:var(--lit);font-style:italic;font-size:21px;color:var(--muted)}
.happens{background:var(--violet-50);border-radius:16px;padding:14px 18px;margin:14px 0 24px;font-size:15.5px}
.rtools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 20px;font-family:var(--ui);font-size:13.5px}
.rtools select,.rtools button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 12px;font-family:var(--ui);font-size:13.5px}
.rtools button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.sd{font-family:var(--lit);font-style:italic;color:#6d5a86;font-size:calc(var(--fs,19px) - 1px);margin:14px 0 14px 0;padding-left:16px;border-left:2px solid var(--violet-100)}
.sp{margin:0 0 16px;font-family:var(--lit);font-size:var(--fs,19px);line-height:1.6;scroll-margin-top:120px;border-radius:12px;transition:background 1.2s}
.sp .who{display:block;font-family:var(--ui);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--violet-ink);margin-bottom:2px}
.sp.c .who{display:none}
.sp .vl{display:block;padding-left:1.4em;text-indent:-1.4em}
.sp .vl.ind{padding-left:3em}
.sp p{margin:0 0 8px}
.sp i.isd{font-style:italic;color:#6d5a86;font-size:.92em}
.sp.flash{background:#FFF3B8}
.sp.mine .lines{filter:blur(5px);cursor:pointer;user-select:none;transition:filter .3s}
.sp.mine.show .lines{filter:none}
.sp.mine .who:after{content:" · your line";color:var(--orange);letter-spacing:.04em;text-transform:none;font-weight:600}
.pager{display:flex;justify-content:space-between;gap:12px;margin-top:30px}

.houses{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:18px}
.house{border-radius:var(--r);padding:20px;color:#fff}
.house.m{background:linear-gradient(160deg,#173b6c,#2c64a8)}
.house.c{background:linear-gradient(160deg,#6c1734,#a82c52)}
.house.v{background:linear-gradient(160deg,#3d2d52,#6a4f8e)}
.house h3{color:#fff;margin-bottom:10px}
.house div{background:rgba(255,255,255,.12);border-radius:12px;padding:9px 12px;margin-top:8px;font-size:14.5px}
.house div b{font-family:var(--ui);font-size:12.5px;letter-spacing:.06em}
.bars{display:grid;gap:8px;margin-top:12px}
.bars div{display:grid;grid-template-columns:150px 1fr 54px;gap:10px;align-items:center;font-family:var(--ui);font-size:13px}
.bars i{display:block;height:10px;border-radius:99px;background:var(--violet)}
.personae{columns:2;column-gap:28px;margin-top:12px;font-size:15px}
.personae div{break-inside:avoid;padding:6px 0;border-bottom:1px solid var(--line)}

.themes{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:16px}
.qt{display:block;width:100%;text-align:left;border:0;background:var(--paper-2);border-radius:14px;padding:12px 14px;margin-top:10px;font-family:var(--lit);font-size:19px;font-style:italic;line-height:1.4}
.qt small{display:block;font-family:var(--ui);font-style:normal;font-size:12px;color:var(--muted);margin-top:6px}
.qt:hover{background:var(--violet-50)}
.wordlist{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
.wordlist div{background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 1px 0 var(--line)}
.wordlist b{font-family:var(--lit);font-size:21px;font-weight:500}
.wordlist small{display:block;font-family:var(--ui);font-size:13px;color:var(--muted)}
.wordlist em{display:block;font-family:var(--lit);font-size:16px;color:var(--ink-2);margin-top:4px}
.tl{margin-top:14px}
.tl div{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:10px 0;border-top:1px solid var(--line);font-size:15px}
.tl b{font-family:var(--lit);font-size:20px;font-weight:500;color:var(--violet-ink)}

.shelf{margin-top:44px}
.shelf .sh-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:10px}
.shelf .sh-h p{margin:0;color:var(--muted);font-size:15px}
.books{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-top:16px}
.book{position:relative;border:0;text-align:left;padding:20px 18px 18px 26px;background:#fff;border-radius:6px 18px 18px 6px;box-shadow:inset 6px 0 0 var(--violet),0 1px 0 var(--line),0 14px 30px -24px rgba(40,20,80,.4);display:flex;flex-direction:column;gap:6px;min-height:190px;transition:transform .25s}
.book:hover{transform:translateY(-3px) rotate(-.3deg)}
.book.c{box-shadow:inset 6px 0 0 var(--cyan),0 1px 0 var(--line),0 14px 30px -24px rgba(40,20,80,.4)}
.book.o{box-shadow:inset 6px 0 0 var(--orange),0 1px 0 var(--line),0 14px 30px -24px rgba(40,20,80,.4)}
.book h4{font-family:var(--lit);font-weight:500;font-size:22px;line-height:1.12;margin:0}
.book .au{font-family:var(--lit);font-style:italic;color:var(--ink-2)}
.book .bl{margin-top:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.book img.thumb{width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:6px;background:var(--paper-2)}

.text-head{padding:46px 0 10px;display:grid;grid-template-columns:1fr 320px;gap:36px;align-items:end}
.text-head .by{font-family:var(--lit);font-style:italic;font-size:22px;color:var(--ink-2);margin-top:10px}
.text-head figure{margin:0}
.text-head figure img{border-radius:18px;box-shadow:var(--shadow);max-height:360px;width:100%;object-fit:cover}
.reading{display:grid;grid-template-columns:1fr 300px;gap:40px;padding:20px 0 30px}
.prose-body{max-width:720px;font-family:var(--lit);font-size:var(--fs,20px);line-height:1.7;color:#221f26}
.prose-body p{margin:0 0 1em}
.prose-body p:first-of-type:first-letter{font-size:3.4em;float:left;line-height:.9;padding:6px 10px 0 0;color:var(--violet)}
.prose-body h3{font-family:var(--lit);font-weight:500;font-size:28px;margin:1.6em 0 .6em;color:var(--violet-ink)}
.prose-body .gl{font-family:var(--ui);font-size:13.5px;color:#6d5a86;background:var(--violet-50);border-radius:10px;padding:8px 12px;margin:6px 0 14px;line-height:1.45}
.prose-body .stz{margin:0 0 1.1em}
.prose-body .stz span{display:block}
.prose-body .moral{font-style:italic;font-size:1.1em;color:var(--violet-ink);border-top:1px solid var(--line);padding-top:12px}
.side{position:sticky;top:90px;align-self:start;display:grid;gap:14px}
.warn{background:var(--orange-50);border-radius:14px;padding:12px 14px;font-size:14.5px;color:#7a3a00}
.halves .line-card{font-size:20px}

.eras-v{position:relative;margin-top:30px}
.eras-v:before{content:"";position:absolute;left:21px;top:0;bottom:0;width:2px;background:linear-gradient(var(--violet),var(--cyan),var(--orange))}
.era-v{position:relative;padding:0 0 34px 64px}
.era-v .dot{position:absolute;left:8px;top:6px;width:28px;height:28px;border-radius:50% 50% 50% 6px;background:var(--violet);box-shadow:0 0 0 6px var(--paper)}
.era-v:nth-child(3n+2) .dot{background:var(--cyan)}.era-v:nth-child(3n) .dot{background:var(--orange)}
.era-v .card-e{background:#fff;border-radius:var(--r);padding:22px 24px;box-shadow:0 1px 0 var(--line),0 18px 40px -32px rgba(40,20,80,.35)}
.era-v .card-e .h3 small{font-family:var(--ui);font-size:13px;color:var(--muted);margin-left:10px;font-weight:500}
.era-v .card-e p{margin:10px 0 0;font-size:16px}
.chips2{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.chips2 button{border:0;border-radius:999px;padding:8px 13px;background:var(--paper-2);font-family:var(--lit);font-size:16px}
.chips2 button:hover{background:var(--violet-50)}
.chips2 button i{font-family:var(--ui);font-style:normal;font-size:11px;color:var(--muted);margin-left:6px;text-transform:uppercase;letter-spacing:.06em}
.godot{background:linear-gradient(160deg,#211d27,#3a3242);color:#fff;border-radius:var(--r);padding:30px;display:grid;grid-template-columns:1fr 1.2fr;gap:30px;margin-top:20px}
.godot .h2{color:#fff}.godot p{color:#ddd6e6}
.formline{display:flex;gap:0;overflow-x:auto;margin-top:26px;padding-bottom:6px}
.formline div{flex:1 0 170px;border-top:3px solid var(--violet);padding:12px 14px 0 0;font-size:14.5px}
.formline div:nth-child(2n){border-color:var(--cyan)}.formline div:nth-child(3n){border-color:var(--orange)}
.formline b{display:block;font-family:var(--lit);font-weight:500;font-size:19px}
.formline small{font-family:var(--ui);color:var(--muted)}
@container lw (max-width:1020px){
  .feature{grid-template-columns:1fr}.feature .ph{min-height:260px}
  .pcards{grid-template-columns:repeat(2,1fr)}
  .theatre{grid-template-columns:repeat(2,1fr)}
  .life{grid-template-columns:1fr}
  .ov,.reading,.text-head{grid-template-columns:1fr}
  .side{position:static}
  .reader{grid-template-columns:1fr}
  .snav{display:none}.snav-sel{display:block}
  .houses,.themes{grid-template-columns:1fr}
  .godot{grid-template-columns:1fr}
}
@container lw (max-width:640px){
  .pcards,.theatre,.figrow,.wordlist{grid-template-columns:1fr}
  .world-hero{min-height:480px}.world-hero .wrap{padding-top:70px}
  .curtain{display:none}
  .life .ev{grid-template-columns:80px 1fr}
  .bars div{grid-template-columns:100px 1fr 44px}
  .personae{columns:1}
  .scene-h h2{font-size:30px}
  .feature .tx{padding:24px}
  .text-head figure{display:none}
}
.room:nth-child(5){grid-column:span 7}.room:nth-child(6){grid-column:span 5}
.nav button{white-space:nowrap;padding:8px 11px;font-size:14px}
.top-in{gap:14px}
#lang,#lvlSel{flex:none}
.top-in > *{flex-shrink:0}
.top-in .nav{flex-shrink:1}
@container lw (max-width:1280px){.brand span,.brand i{display:none}}
@container lw (min-width:1021px) and (max-width:1180px){.nav button{padding:8px 8px;font-size:13.5px}}
.ov{align-items:start}.facts{align-content:start}
@container lw (max-width:640px){.top-in{gap:8px}.top-in > *{flex-shrink:1}#lvlSel{max-width:86px;font-size:13px}.lang button{padding:6px 7px;font-size:12px}.brand img{height:19px}.burger{flex:none}}
.room:nth-child(5),.room:nth-child(6){min-height:440px}.room.proverbs .bubbles span:nth-child(n+5){display:none}

:host{
  --paper:#F5F0E6; --paper-2:#ECE4D4; --card:#FFFDF8; --ink:#1F1B18; --ink-2:#463F38; --muted:#7D7367; --line:#DFD5C3;
  --display:Georgia,'Times New Roman',serif;
  --lit:Georgia,'Times New Roman',serif;
  --burgundy:#7B2335; --oxblood:#5A1E24; --forest:#2E4B3C; --navy:#24344F; --umber:#6B4A2B; --plum:#4D3160; --teal:#1F4D55; --slate:#3E4A57;
  --accent:var(--violet-ink); --accent-soft:#EFE7FF;
  --shadow:0 30px 60px -40px rgba(45,30,15,.45);
}
[data-lw-theme=museum]{--accent:#6B4A2B;--accent-soft:#EFE5D3}
[data-lw-theme=renaissance]{--accent:var(--burgundy);--accent-soft:#F3E3E1}
[data-lw-theme=theatre]{--accent:var(--oxblood);--accent-soft:#F1E2DF}
[data-lw-theme=romantic]{--accent:var(--forest);--accent-soft:#E2ECE3}
[data-lw-theme=victorian]{--accent:var(--navy);--accent-soft:#E3E8F0}
[data-lw-theme=modern]{--accent:var(--plum);--accent-soft:#ECE3F1}
[data-lw-theme=medieval]{--accent:var(--umber);--accent-soft:#F0E6D6}
[data-lw-theme=augustan]{--accent:var(--teal);--accent-soft:#E0ECEC}
[data-lw-theme=american]{--accent:var(--slate);--accent-soft:#E5E9EE}
[data-lw-theme=brand]{--accent:var(--violet-ink);--accent-soft:var(--violet-50)}
.lw{background:var(--paper);color:var(--ink);transition:background .4s}
::selection{background:var(--accent-soft)}

.display{font-family:var(--display);font-weight:500;letter-spacing:-.012em;line-height:.94}
.display em{color:var(--accent);font-weight:500}
.h2{font-family:var(--display);font-weight:600;letter-spacing:-.01em;font-size:clamp(34px,3.8cqw,52px);line-height:1}
.h3{font-family:var(--display);font-weight:600;font-size:28px;letter-spacing:0;line-height:1.08}
.kicker{font-family:var(--ui);font-size:11.5px;letter-spacing:.2em;color:var(--accent)}
.lede{font-family:var(--lit);font-size:21px;line-height:1.55;color:var(--ink-2)}
.meta{color:var(--muted)}
.btn{background:var(--violet)}
.btn.ghost{box-shadow:inset 0 0 0 1px var(--ink)}
.pill{background:var(--paper-2)}
.pill.lv{background:var(--ink)}
.panel{background:var(--card);border:1px solid var(--line);box-shadow:none;border-radius:6px}
.learner{background:var(--accent-soft);color:var(--accent)}
.top{background:rgba(245,240,230,.9);border-bottom:1px solid var(--line)}
.brand span{font-family:var(--display);font-size:23px;font-weight:600}
.nav button{font-size:14px;color:var(--ink-2)}
.nav button.on{background:transparent;color:var(--ink);box-shadow:inset 0 -2px 0 var(--accent);border-radius:0}
.nav button:hover{background:transparent;color:var(--accent)}
footer{background:#1F1B18}
.src{font-size:12px}
.chip.on{background:var(--ink)}

.lbl{font-family:var(--ui);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);line-height:1.5}
.lbl b{display:block;font-family:var(--lit);font-style:italic;font-weight:400;font-size:17px;letter-spacing:0;text-transform:none;color:var(--ink);margin-bottom:2px}
.lbl a{color:var(--muted)}

.frame{background:var(--card);padding:14px;border:1px solid var(--line);box-shadow:var(--shadow)}
.frame img{width:100%;height:100%;object-fit:cover;display:block}

.lw-hero{padding:60px 0 40px;position:relative;overflow:hidden}
.lw-hero:before{content:"";position:absolute;inset:0 0 auto;height:100%;background:radial-gradient(1200px 600px at 85% 20%,#EBDDC4 0,rgba(235,221,196,0) 60%)}
.lw-hero .wrap{position:relative;display:grid;grid-template-columns:1fr 1.05fr;gap:60px;align-items:center}
.lw-over{font-family:var(--ui);font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:12px}
.lw-over i{flex:0 0 46px;height:1px;background:var(--ink)}
.lw-title{font-family:var(--display);font-weight:500;font-size:clamp(66px,9.4cqw,148px);line-height:.84;letter-spacing:-.025em;margin:26px 0 0}
.lw-title em{display:block;font-style:italic;font-weight:400;color:var(--burgundy);padding-left:.55em}
.lw-intro{font-family:var(--lit);font-size:22px;line-height:1.5;color:var(--ink-2);max-width:520px;margin:30px 0 0}
.lw-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.lw-facts{display:flex;gap:34px;margin:40px 0 0;padding-top:22px;border-top:1px solid var(--line)}
.lw-facts div{min-width:0}
.lw-facts dt{font-family:var(--display);font-size:44px;font-weight:500;line-height:1}
.lw-facts dd{margin:4px 0 0;font-family:var(--ui);font-size:12.5px;color:var(--muted)}
.lw-stage{position:relative}
.lw-stage .frame{aspect-ratio:4/5;position:relative;padding:16px}
.lw-stage .art{position:absolute;inset:16px;background-size:cover;background-position:center;opacity:0;transition:opacity 1.4s ease,transform 8s ease;transform:scale(1.03)}
.lw-stage .art.on{opacity:1;transform:scale(1)}
.lw-stage .lbl{margin-top:16px;display:flex;justify-content:space-between;gap:18px;align-items:flex-end}
.lw-stage .lbl button{border:0;background:none;padding:0;font-family:var(--ui);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);white-space:nowrap}
.lw-dots{display:flex;gap:8px;margin-top:14px}
.lw-dots button{width:26px;height:3px;border:0;padding:0;background:var(--line)}
.lw-dots button.on{background:var(--ink)}
.lw-quote{position:absolute;left:-46px;bottom:96px;max-width:300px;background:var(--card);border:1px solid var(--line);padding:18px 22px 16px;box-shadow:var(--shadow);font-family:var(--display);font-style:italic;font-size:24px;line-height:1.2;border-radius:22px 22px 22px 4px}
.lw-quote:before{content:"“";position:absolute;top:-18px;left:16px;font-size:64px;color:var(--violet);font-style:normal;line-height:1}

.lw-sh{display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:end;margin-bottom:28px}
.lw-sh .no{font-family:var(--display);font-style:italic;font-size:22px;color:var(--muted)}
.lw-sh .rule{height:1px;background:var(--line);margin-bottom:12px}
.lw-sh p{margin:0;max-width:360px;font-family:var(--lit);font-size:17px;color:var(--muted);text-align:right}

.galleries{display:grid;grid-template-columns:repeat(12,1fr);gap:22px}
.gal{position:relative;border:0;padding:0;text-align:left;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;overflow:hidden;transition:transform .4s,box-shadow .4s;color:var(--ink)}
.gal:hover{transform:translateY(-4px);box-shadow:var(--shadow)}
.gal .pic{background-size:cover;background-position:center;flex:1;min-height:220px;transition:transform 1.2s}
.gal:hover .pic{transform:scale(1.03)}
.gal .cap{padding:22px 24px 24px;border-top:3px solid var(--g,var(--ink))}
.gal .cap .lbl{margin-bottom:8px}
.gal h3{font-family:var(--display);font-weight:600;font-size:36px;line-height:1;margin:0}
.gal p{margin:10px 0 0;font-family:var(--lit);font-size:17px;color:var(--ink-2);max-width:520px}
.gal.g1{grid-column:span 12;flex-direction:row;min-height:440px}.gal.g1 .pic{flex:1.5}.gal.g1 .cap{flex:1;border-top:0;border-left:3px solid var(--g);display:flex;flex-direction:column;justify-content:flex-end;padding:40px}
.gal.g1 h3{font-size:58px}
.gal.g2{grid-column:span 5;min-height:520px}.gal.g3{grid-column:span 7;min-height:520px}
.gal.g4{grid-column:span 4;min-height:460px}.gal.g5{grid-column:span 4;min-height:460px}.gal.g6{grid-column:span 4;min-height:460px}
.gal.g6 .pic{background:var(--violet);position:relative}
.gal.g6 .bub{position:absolute;inset:20px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.gal.g6 .bub span{background:#fff;color:var(--ink);font-family:var(--lit);font-size:18px;padding:9px 14px;border-radius:18px 18px 18px 4px}
.gal.g6 .bub span:nth-child(2){background:var(--cyan)}.gal.g6 .bub span:nth-child(3){background:var(--orange);color:#fff;align-self:flex-end}

.salon{columns:3;column-gap:22px}
.salon .w{break-inside:avoid;margin:0 0 26px;display:block;width:100%;border:0;padding:0;background:none;text-align:left;cursor:pointer}
.salon .w .frame{padding:10px}
.salon .w img{height:auto}
.salon .w .lbl{margin-top:10px}
.salon .w:hover .frame{border-color:var(--ink)}

.strip{display:grid;grid-auto-flow:column;grid-auto-columns:220px;gap:16px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x mandatory}
.strip button{scroll-snap-align:start;border:0;padding:0;background:none;text-align:left}
.strip .ph{aspect-ratio:3/4;background-size:cover;background-position:center;border:1px solid var(--line);background-color:var(--paper-2)}
.strip b{display:block;font-family:var(--display);font-size:24px;font-weight:600;margin-top:10px}
.strip small{font-family:var(--ui);font-size:12px;color:var(--muted)}

.featured{background:var(--card);border:1px solid var(--line);border-radius:0;box-shadow:none}
.featured .plate{background:var(--paper-2)}

.card{background:var(--card);border:1px solid var(--line);border-radius:0;box-shadow:none}
.card:hover{border-color:var(--ink);box-shadow:var(--shadow)}
.card .h3{font-size:25px}
.card .ph{border-bottom:1px solid var(--line)}
.typo{background:var(--paper-2)!important;color:var(--ink)!important;position:relative}
.typo span{font-family:var(--display)!important;font-style:italic;color:var(--ink)!important;font-size:28px!important;line-height:1.15!important;padding:0 26px;text-align:center}
.typo:before{content:"❦";position:absolute;top:16px;left:50%;transform:translateX(-50%);color:var(--accent);font-size:18px;font-style:normal}
.typo:after{content:"";position:absolute;inset:10px;border:1px solid var(--line)}
.typo.v span,.typo.c span,.typo.o span{color:var(--ink)!important}
.typo-art .b{background:var(--paper-2)!important;border-radius:0!important;clip-path:none!important;border:1px solid var(--line)}
.typo-art .b span{font-family:var(--display)!important;color:var(--accent)!important}

.world-hero{min-height:640px;background:#1c1214}
.world-hero .bg{filter:none;opacity:.9;background-position:50% 40%}
.world-hero:after{background:linear-gradient(90deg,rgba(28,14,16,.94) 0%,rgba(40,14,20,.78) 42%,rgba(40,14,20,.12) 100%)}
.curtain{display:none}
.world-hero .display{font-size:clamp(56px,7.4cqw,112px)}
.world-hero .display em{color:#E9C4B8}
.world-hero .kicker{color:#E9C4B8}
.world-hero .credit{position:absolute;right:28px;bottom:18px;z-index:3;color:#d9c8c0;font-family:var(--ui);font-size:11px;letter-spacing:.06em}
.feature{border-radius:0;border:1px solid var(--line);background:var(--card);box-shadow:none}
.feature q{font-family:var(--display);font-size:30px}
.pcards{gap:22px}
.pcard{border-radius:0;border:1px solid var(--line);background:var(--card);box-shadow:none}
.pcard .ph{aspect-ratio:4/5;background-position:50% 30%}
.pcard .h3{font-size:26px!important}
.pcard .ph.ty{background:var(--paper-2)!important;position:relative;align-items:center;justify-content:center}
.pcard .ph.ty span{color:var(--ink);font-family:var(--display);font-size:34px;text-align:center}
.pcard .ph.ty:after{content:"";position:absolute;inset:12px;border:1px solid var(--line)}
.prow{border-radius:0;background:var(--card);border:1px solid var(--line);box-shadow:none;padding:10px 14px 10px 10px}
.prow .ini{width:58px;height:72px;border-radius:0;background-size:cover;background-position:center;font-size:0}
.prow b{font-family:var(--display);font-weight:600;font-size:22px}
.prow:hover{background:var(--accent-soft)}
.life .ev b{font-family:var(--display);color:var(--accent);font-size:26px}
.theatre .panel{border-top:3px solid var(--accent)}
.figrow figure{border-radius:0;border:1px solid var(--line);background:var(--card)}
.figrow figure img{aspect-ratio:3/4;object-fit:cover;object-position:top}

.play-head{min-height:520px;display:flex;align-items:flex-end}
.play-head .bg{opacity:1;background-position:50% 30%}
.play-head:after{background:linear-gradient(180deg,rgba(20,12,12,.15) 0%,rgba(20,12,12,.35) 40%,rgba(20,12,12,.92) 100%)}
.play-head .wrap{width:100%}
.play-head .display{font-size:clamp(54px,7cqw,104px)}
.play-head .by{font-family:var(--lit)}
.play-head .credit{position:absolute;right:28px;top:20px;z-index:3;max-width:320px;text-align:right;color:#e8ddd6;font-family:var(--ui);font-size:11px;letter-spacing:.04em}
.ptabs button{border-radius:0;background:transparent;box-shadow:inset 0 -1px 0 rgba(255,255,255,.3);padding:12px 16px;font-size:13.5px;letter-spacing:.04em}
.ptabs button.on{background:transparent;color:#fff;box-shadow:inset 0 -3px 0 #fff}
.fact{border-radius:0;border:1px solid var(--line);background:var(--card);box-shadow:none}
.acts-guide .a{border-radius:0;border:1px solid var(--line);box-shadow:none;background:var(--card)}
.acts-guide .a b{font-family:var(--display);color:var(--accent)}
.happens{border-radius:0;background:var(--accent-soft);border-left:3px solid var(--accent)}

.script{max-width:720px}
.scene-h h2{font-family:var(--display);font-weight:600;font-size:46px}
.scene-h span{font-family:var(--lit)}
.sp{font-family:var(--lit);font-size:var(--fs,20px);line-height:1.58;padding-left:0}
.sp .who{font-family:var(--lit);font-variant:small-caps;font-size:17px;font-weight:500;letter-spacing:.09em;text-transform:lowercase;color:var(--accent);margin-bottom:0}
.sp .lines{padding-left:1.4em}
.sd{font-family:var(--lit);color:var(--muted);border-left:0;padding-left:1.4em;font-size:calc(var(--fs,20px) - 2px)}
.sp i.isd{color:var(--muted)}
.snav button.on{background:var(--accent)}
.snav .act{color:var(--accent)}

.qt{border-radius:0;background:transparent;border-left:2px solid var(--accent);font-family:var(--display);font-size:24px;padding:6px 0 6px 18px}
.qt:hover{background:var(--accent-soft)}
.house{border-radius:0}
.house.m{background:linear-gradient(160deg,#1f2e46,#33496b)}.house.c{background:linear-gradient(160deg,#4e1621,#7b2335)}.house.v{background:linear-gradient(160deg,#3b3229,#5c4f42)}
.house div{border-radius:0}
.wordlist div{border-radius:0;border:1px solid var(--line);box-shadow:none;background:var(--card)}
.wordlist b{font-family:var(--display);font-weight:600}
.bars i{background:var(--accent)}
.tl b{font-family:var(--display);color:var(--accent)}

.poem{font-family:var(--lit);font-size:22px;line-height:1.62}
.poem .no{font-family:var(--ui)}
.title-block .display{font-size:clamp(48px,5.5cqw,80px)}
.title-block .by{font-family:var(--lit);font-style:italic}
.art-wrap{border-radius:0!important;background:var(--card);padding:12px;border:1px solid var(--line)}
.art-wrap img{border-radius:0!important}
.author-chip{border-radius:0}
.voice{border-radius:0;border:1px solid var(--line);background:var(--card)}
.voice .play{background:var(--violet)}

.formline div{border-top-width:1px;border-color:var(--ink)!important}
.formline b{font-family:var(--display);font-weight:600;font-size:22px}
.godot{border-radius:0;background:#1F1B18;grid-template-columns:1fr 1fr 1.1fr;align-items:end}
.godot .gimg{background-size:cover;background-position:center;min-height:280px;grid-row:span 1}

.shelf .sh-h{border-bottom:1px solid var(--ink);padding-bottom:12px}
.shelf .sh-h h2{font-size:34px}
.books{grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:26px 22px}
.book{border-radius:0;box-shadow:none!important;background:transparent;padding:0;min-height:0;gap:4px}
.book:hover{transform:none}
.book .cover{aspect-ratio:3/4;background-size:cover;background-position:center top;border:1px solid var(--line);background-color:var(--card);margin-bottom:10px;position:relative;transition:box-shadow .4s,transform .4s}
.book:hover .cover{box-shadow:var(--shadow);transform:translateY(-3px)}
.book .cover.ty{display:flex;flex-direction:column;justify-content:space-between;padding:22px 18px;text-align:center;background:var(--jacket,#2E4B3C);color:#F5EEDC;border:0}
.book .cover.ty .a{font-family:var(--ui);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;opacity:.85}
.book .cover.ty .t{font-family:var(--display);font-size:28px;line-height:1.02;font-weight:600}
.book .cover.ty .o{font-size:16px;opacity:.8}
.book .cover.ty:after{content:"";position:absolute;inset:8px;border:1px solid rgba(245,238,220,.45)}
.book h4{font-family:var(--display);font-weight:600;font-size:23px}
.book .au{font-family:var(--lit)}
.rows{display:grid;gap:0;margin-top:10px}
.rowb{display:grid;grid-template-columns:90px 1fr auto;gap:20px;align-items:center;padding:16px 0;border:0;border-bottom:1px solid var(--line);background:none;text-align:left}
.rowb .th{width:90px;height:110px;background-size:cover;background-position:center top;border:1px solid var(--line);background-color:var(--paper-2)}
.rowb b{font-family:var(--display);font-weight:600;font-size:26px;display:block;line-height:1.05}
.rowb i{font-family:var(--lit);color:var(--ink-2)}
.rowb:hover b{color:var(--accent)}

.front{display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:60px;align-items:end;padding:40px 0 30px}
.front.noimg{grid-template-columns:1fr}
.front .frame img{max-height:540px;object-fit:contain;background:var(--paper-2)}
.front .lbl{margin-top:12px}
.front .display{font-size:clamp(46px,5.6cqw,84px)}
.front .by{font-family:var(--lit);font-style:italic;font-size:24px;color:var(--ink-2);margin-top:12px}
.prose-body{font-family:var(--lit);font-size:var(--fs,21px);line-height:1.68;max-width:66ch;hyphens:auto}
.prose-body p{text-indent:1.6em;margin:0}
.prose-body p:first-of-type,.prose-body h3+p{text-indent:0}
.prose-body p:first-of-type:first-letter{font-family:var(--display);font-size:4.2em;line-height:.8;padding:8px 10px 0 0;color:var(--accent);font-weight:600}
.prose-body h3{font-family:var(--display);font-weight:600;text-align:center;font-size:30px;margin:2em 0 1em;color:var(--ink)}
.prose-body h3:before{content:"❦";display:block;color:var(--accent);font-size:18px;margin-bottom:6px}
.prose-body .stz span{display:block;padding-left:1.4em;text-indent:-1.4em}
.prose-body .gl{border-radius:0;background:var(--accent-soft);font-family:var(--lit);font-style:italic;font-size:16px;color:var(--ink-2)}
.prose-body .moral{font-family:var(--display);font-size:1.25em;text-indent:0;text-align:center;border-top:1px solid var(--line);margin-top:1em;padding-top:1em;color:var(--accent)}

.side .panel{border-radius:0}

.eras-v:before{display:none}
.era-v{padding:0 0 46px;display:grid;grid-template-columns:300px 1fr;gap:40px;align-items:start}
.era-v:nth-child(even){grid-template-columns:1fr 300px}
.era-v:nth-child(even) .eimg{order:2}
.era-v .dot{display:none}
.era-v .eimg .frame{padding:10px}
.era-v .eimg .frame img{aspect-ratio:4/5;object-fit:cover}
.era-v .eimg.none .frame{aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:80px;color:var(--accent);font-style:italic}
.era-v .card-e{border-radius:0;box-shadow:none;border:0;border-top:1px solid var(--ink);background:transparent;padding:18px 0 0}
.era-v .card-e .h3{font-size:42px}
.era-v .num{font-family:var(--display);font-style:italic;color:var(--muted);font-size:20px}
.chips2 button{border-radius:0;background:var(--card);border:1px solid var(--line);font-family:var(--lit);font-size:17px}

.saying{border-radius:22px 22px 22px 4px}
@container lw (max-width:1020px){
  .lw-hero .wrap{grid-template-columns:1fr;gap:40px}
  .lw-quote{left:10px;bottom:auto;top:-20px}
  .gal.g1{flex-direction:column}.gal.g1 .cap{border-left:0;border-top:3px solid var(--g)}
  .gal.g2,.gal.g3{grid-column:span 12;min-height:440px}
  .gal.g4,.gal.g5,.gal.g6{grid-column:span 12;min-height:380px}
  .salon{columns:2}
  .front{grid-template-columns:1fr;gap:26px}.front .frame{max-width:380px}
  .era-v,.era-v:nth-child(even){grid-template-columns:1fr}.era-v:nth-child(even) .eimg{order:0}.era-v .eimg{max-width:300px}
  .godot{grid-template-columns:1fr}
  .lw-sh{grid-template-columns:auto 1fr}.lw-sh p{display:none}
}
@container lw (max-width:640px){
  .lw-title{font-size:72px}.lw-intro{font-size:19px}
  .lw-facts{gap:20px}.lw-facts dt{font-size:34px}
  .salon{columns:1}
  .strip{grid-auto-columns:170px}
  .gal h3,.gal.g1 h3{font-size:38px}
  .gal.g1 .cap{padding:24px}
  .rowb{grid-template-columns:64px 1fr}.rowb .th{width:64px;height:80px}.rowb .pill{display:none}
  .world-hero .credit,.play-head .credit{display:none}
  .play-head{min-height:420px}
  .lw-quote{display:none}
}
.play-head .kicker{color:#E9C4B8}

.nav{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.nav::-webkit-scrollbar{display:none}
.nav button{white-space:nowrap}
.top-in{max-width:1440px}
.nav button{padding:8px 7px!important;font-size:13.5px!important}.nav{gap:2px!important}
@container lw (max-width:1330px){.brand span{display:none}.brand i{display:none}}
.top-in{gap:12px!important;padding-left:22px!important;padding-right:22px!important}.brand span{font-size:21px!important}
.world-hero.slim{min-height:0!important}.world-hero.slim .wrap{padding-top:64px!important;padding-bottom:52px!important}
.author-card.noimg{grid-template-columns:1fr}.author-chip.noimg img{display:none}
.nav button.nx{color:var(--violet-ink)}
.bg-fail{background:linear-gradient(135deg,var(--paper-2),#e9e2d6)!important}
.vblock{margin:0 0 18px 28px;font-family:var(--lit);font-style:italic}.vblock span{display:block}
.path6{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.path6 span{display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:7px 14px 7px 7px;font-family:var(--ui);font-size:14px;box-shadow:0 1px 0 var(--line)}
.path6 b{width:24px;height:24px;border-radius:50%;background:var(--violet);color:#fff;display:inline-grid;place-items:center;font-size:12px}
.wgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin:16px 0 34px}
.wcard{display:flex;flex-direction:column;gap:6px;text-align:left;border:0;background:#fff;border-radius:22px 22px 22px 6px;padding:20px;box-shadow:0 1px 0 var(--line);transition:.2s;position:relative}
.wcard:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.wcard>b{font-family:var(--display);font-size:30px;line-height:1.05;font-weight:600}
.wcard .m{font-size:15px;color:var(--ink-2)}
.wcard q{font-family:var(--lit);font-style:italic;font-size:17px;line-height:1.35;quotes:none;color:var(--ink);border-left:2px solid var(--line);padding-left:10px;margin-top:4px}
.wcard small{font-family:var(--ui);font-size:12px;color:var(--muted)}
.wcard .pill.lv{position:absolute;top:16px;right:16px}
.wcard.slang,.wcard.dialect{background:#FFF7EE}.wcard.archaic{background:#F7F3FF}.wcard.idiom{background:#F0FAFC}
mark{background:#FFE58A;color:inherit;border-radius:3px;padding:0 2px}
.wchips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.wchips button{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-family:var(--lit);font-size:18px;text-align:left}
.wchips button small{font-family:var(--ui);font-size:12px;color:var(--muted);margin-left:4px}
.wchips button:hover{border-color:var(--violet)}
.find form{display:flex;gap:10px;margin-top:12px}.find input,.srch{flex:1;border:1.5px solid var(--line);border-radius:999px;padding:12px 18px;font:inherit;font-family:var(--ui);background:#fff;min-width:260px}
.hits{display:grid;gap:8px;margin:16px 0}
.hit{display:block;text-align:left;border:0;background:#fff;border-radius:14px;padding:12px 16px;box-shadow:0 1px 0 var(--line)}
.hit .q{display:block;font-family:var(--lit);font-size:19px;line-height:1.35}.hit small{font-family:var(--ui);font-size:12px;color:var(--muted)}
.hit:hover{background:var(--violet-50)}
.whead{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;padding:20px 0 26px;border-bottom:1px solid var(--line)}
.ipa{font-family:var(--ui);color:var(--muted);font-size:18px;margin-top:6px}
.wsteps{display:grid;gap:18px;margin-top:26px}
.wstep{display:grid;grid-template-columns:56px 1fr;gap:18px;background:#fff;border-radius:var(--r);padding:24px;box-shadow:0 1px 0 var(--line)}
.wstep .n{width:44px;height:44px;border-radius:50%;background:var(--violet);color:#fff;display:grid;place-items:center;font-family:var(--display);font-size:24px;font-weight:700}
.wstep h2{margin:6px 0 12px}
.enc{font-family:var(--lit);font-size:clamp(22px,2.4cqw,30px);line-height:1.35;margin:0 0 8px;padding:6px 0 6px 18px;border-left:3px solid var(--violet)}
.mean{font-family:var(--lit);font-size:24px;margin:8px 0}.tr{font-family:var(--lit);font-size:20px;color:var(--ink-2)}
.wstep textarea{width:100%;min-height:90px;border:1.5px solid var(--line);border-radius:14px;padding:12px;font-family:var(--lit);font-size:19px}
.qp{font-family:var(--ui)}.qp .line-card{margin:10px 0}
.phr{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-top:20px}
.pcard2{background:#fff;border-radius:var(--r);padding:20px;box-shadow:0 1px 0 var(--line)}
.ph-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ph-top b{font-family:var(--display);font-size:27px;line-height:1.1}
.pcard2 .m{margin:6px 0 10px;font-size:15px}.pcard2 .tr{font-size:15px;font-family:var(--ui)}
.ladder{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:6px}
.rung{background:#fff;border-radius:var(--r);padding:20px;box-shadow:0 1px 0 var(--line);border-top:5px solid var(--violet)}
.rung.r1{border-color:var(--teal)}.rung.r2{border-color:var(--cyan)}.rung.r3{border-color:var(--orange)}.rung.r4{border-color:var(--burgundy)}.rung.r5{border-color:var(--forest)}.rung.r6{border-color:var(--umber)}
.rung .h{display:flex;gap:10px;align-items:center}.rung .h span{font-family:var(--ui);font-size:12px;color:var(--muted)}.rung .h b{font-family:var(--display);font-size:26px}
.rung p{font-size:15px;margin:8px 0}
.vxs{display:grid;gap:8px}.vx{display:block;text-align:left;border:0;background:var(--paper-2);border-radius:12px;padding:10px 12px}
.vx q{display:block;font-family:var(--lit);font-style:italic;font-size:18px;line-height:1.3;quotes:none}.vx small{font-family:var(--ui);font-size:12px;color:var(--muted)}
.gro{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
.gcard{background:#fff;border-radius:18px 18px 18px 6px;padding:18px;box-shadow:0 1px 0 var(--line)}
.gcard .gh{display:flex;justify-content:space-between;align-items:center;gap:8px}.gcard .gh b{font-family:var(--ui);letter-spacing:.06em;font-size:15px}
.gcard .entry{font-family:var(--lit);font-size:18px;line-height:1.4;margin:8px 0}
.gcard .now{font-size:14px;margin-bottom:6px}
.decision{border-left:5px solid var(--violet)}
.learnx{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.learnx button{display:flex;flex-direction:column;gap:8px;text-align:left;border:0;background:#fff;border-radius:24px 24px 24px 6px;padding:24px;box-shadow:0 1px 0 var(--line);transition:.2s}
.learnx button:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.learnx h3{font-family:var(--display);font-size:30px;line-height:1.05;margin:0}.learnx p{margin:0;font-size:15px;color:var(--ink-2);flex:1}
.learnx .btn{align-self:flex-start}
@container lw (max-width:980px){.learnx{grid-template-columns:1fr 1fr}}
@container lw (max-width:600px){.learnx{grid-template-columns:1fr}.wstep{grid-template-columns:1fr}}
.ws-grid{display:grid;grid-template-columns:280px 1fr;gap:24px;align-items:start}
.ws-nav{position:sticky;top:84px;display:grid;gap:14px}
.ws-g b{display:block;font-family:var(--ui);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.ws-g button{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:12px;padding:8px 12px;font-family:var(--ui);font-size:15px}
.ws-g button.on,.ws-g button:hover{background:#fff;box-shadow:0 1px 0 var(--line)}
.ws-main{min-height:360px}
@container lw (max-width:860px){.ws-grid{grid-template-columns:1fr}.ws-nav{position:static}}
.wordtiles{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.wordtiles button{border:1.5px solid var(--line);background:#fff;border-radius:10px;padding:8px 12px;font-family:var(--lit);font-size:19px}
.built span{font-family:var(--lit);font-size:21px}.built span.ok{color:#137a3a}.built span.no{color:#b23b12}
.srcbtn{border:0;background:none;text-decoration:underline;color:var(--violet-ink);font-family:var(--ui);font-size:14px;padding:0 6px}
.fb .btn{margin-left:8px}
.rid{display:flex;gap:10px;margin-top:12px}.rid input{flex:1;border:1.5px solid var(--line);border-radius:999px;padding:10px 16px;font:inherit}
.sayx{columns:3 280px;column-gap:16px;margin:18px 0 6px}.sayx .saying q{font-size:22px}.sayx .mm{display:block;margin-top:8px;font-family:var(--ui);font-size:13px;opacity:.85}
.audit{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}.audit .panel+.panel{margin-top:0}.audit p{font-size:15px;margin:6px 0 0}
.tbl{overflow:auto;background:#fff;border-radius:var(--r);box-shadow:0 1px 0 var(--line);max-height:75vh}
.tbl table{border-collapse:collapse;width:100%;font-family:var(--ui);font-size:13px}
.tbl th{position:sticky;top:0;background:var(--paper-2);text-align:left;padding:10px;z-index:1}.tbl td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}
.tbl td button{border:0;background:none;text-align:left;font-family:var(--lit);font-size:16px;padding:0;color:var(--ink)}.tbl td button:hover{color:var(--violet)}
.nb{background:var(--violet-50)}

:host{
  --night:#110D15; --night-2:#1A1420; --night-3:#271E2D; --night-line:rgba(231,185,103,.2);
  --candle:#E7B967; --candle-2:#F4DCA4; --ember:#B66A2C;
  --gold-ink:#8A6A2E; --gold-em:#A0702A; --gold-line:#C9A35A; --veil:#F6F0E4; --vellum:#EFE5D3; --ribbon:#F8F3EA;
  --paper:#F3ECDF; --paper-2:#E9DFCC; --card:#FBF7EF; --page:#FDFAF4;
  --ink:#1F1915; --ink-2:#4A3F36; --muted:#6F6355; --line:#DACCB4;
  --gold:#A9823E; --gold-2:#D5B06A;
  --vio:#874BF8; --vio-2:#B996FF; --vio-ink:#5F2BD1;
  --accent:#8A6a34; --accent-soft:#F0E6D3; --tint:var(--paper);
  --display:Georgia,'Times New Roman',serif;
  --lit:Georgia,'Times New Roman',serif;
  --ui:var(--lit-font,inherit);
  --shadow:0 34px 60px -38px rgba(30,18,8,.55);
  --glow:0 0 0 1px rgba(231,185,103,.28),0 26px 50px -28px rgba(0,0,0,.8);
  --grain:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .15 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E");
}

[data-lw-theme=museum]{--accent:#8A6A34;--accent-soft:#EFE4CF;--tint:#F3ECDF}
[data-lw-theme=renaissance]{--accent:#8C2F2A;--accent-soft:#F3E2DA;--tint:#F4EBDF}
[data-lw-theme=theatre]{--accent:#7E1F2E;--accent-soft:#F2DFDF;--tint:#F4EAE2}
[data-lw-theme=romantic]{--accent:#3E5B3F;--accent-soft:#E2EBDC;--tint:#F0EEE2}
[data-lw-theme=victorian]{--accent:#24395C;--accent-soft:#E0E6EF;--tint:#F0EBE2}
[data-lw-theme=gothic]{--accent:#47407A;--accent-soft:#E5E2F2;--tint:#EEEBEF}
[data-lw-theme=nursery]{--accent:#6B3AD6;--accent-soft:#EEE6FF;--tint:#F7EFE4}
[data-lw-theme=press]{--accent:#6A4426;--accent-soft:#EFE3D1;--tint:#F2EADC}
[data-lw-theme=writers]{--accent:#5A3570;--accent-soft:#EDE3F2;--tint:#F3ECE3}
[data-lw-theme=archive]{--accent:#7A5626;--accent-soft:#F0E5D0;--tint:#F2EBDD}
[data-lw-theme=modern]{--accent:#4D3160;--accent-soft:#ECE3F1;--tint:#F1EDE6}
[data-lw-theme=medieval]{--accent:#6B4A2B;--accent-soft:#F0E6D6;--tint:#F2EBDD}
[data-lw-theme=augustan]{--accent:#1F4D55;--accent-soft:#E0ECEC;--tint:#EEEEE6}
[data-lw-theme=american]{--accent:#3E4A57;--accent-soft:#E5E9EE;--tint:#EFEDE8}
[data-lw-theme=brand]{--accent:#6B3AD6;--accent-soft:#EEE6FF;--tint:#F7EFE4}

.lw{background:var(--tint) var(--grain);color:var(--ink);font-family:var(--lit);transition:background-color .6s}
::selection{background:rgba(135,75,248,.22)}
#app{min-height:70vh}
.wrap{max-width:1240px}
:focus-visible{outline:2px solid var(--vio);outline-offset:3px}
#app .lw-say p b,#app .lw-margin p b,#app .blank{color:#6F35E0}
#app .saying.v .f span{color:#fff}

.display{font-family:var(--display);font-weight:500;letter-spacing:-.015em;line-height:.95}
.display em{font-style:italic;font-weight:400;color:var(--accent)}
.h2{font-family:var(--display);font-weight:500;font-size:clamp(36px,4cqw,56px);line-height:1;letter-spacing:-.01em}
.h3{font-family:var(--display);font-weight:600;letter-spacing:0}
.kicker,.lw-over{font-family:var(--ui);font-size:11.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.lede{font-family:var(--lit);font-size:21px;line-height:1.55;color:var(--ink-2)}
.meta{font-family:var(--ui);color:var(--muted)}
.orn{display:flex;align-items:center;justify-content:center;gap:14px;color:var(--gold);font-family:var(--display);font-size:20px}
.orn:before,.orn:after{content:"";height:1px;width:min(120px,18cqw);background:linear-gradient(90deg,transparent,currentColor)}
.orn:after{transform:scaleX(-1)}

.btn{background:var(--vio);color:#fff;border-radius:999px;font-family:var(--ui);font-weight:600;letter-spacing:.01em;box-shadow:0 10px 24px -14px rgba(135,75,248,.9)}
.btn:hover{background:#7A3DF0;box-shadow:0 16px 30px -14px rgba(135,75,248,.95)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.btn.light{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px rgba(31,25,21,.55)}
.btn.light:hover{background:rgba(169,130,62,.12)}
.btn.sm{padding:10px 16px;font-size:13.5px}
.pill{font-family:var(--ui);background:var(--accent-soft);color:var(--ink-2);border-radius:999px}
.pill.lv{background:var(--candle-2);color:var(--ink)}
.chip{font-family:var(--ui);background:transparent;border:1px solid var(--line);color:var(--ink-2);border-radius:999px}
.chip:hover{border-color:var(--accent);color:var(--accent)}
.chip.on{background:var(--candle);border-color:var(--candle);color:var(--ink)}
.panel{background:var(--card);border:1px solid var(--line);border-radius:4px;box-shadow:0 1px 0 rgba(255,255,255,.6) inset}
.learner{background:var(--accent-soft);color:var(--accent)}
.badge{font-family:var(--ui)}

.top{background:rgba(250,246,238,.94);backdrop-filter:saturate(1.2) blur(12px);border-bottom:1px solid var(--line)}
.brand img{height:22px}
.brand i{background:rgba(169,130,62,.35)}
.brand span{font-family:var(--display);font-style:italic;font-weight:500;color:var(--ink);font-size:22px!important}
.nav button{color:var(--ink-2)!important;border-radius:0!important;font-family:var(--ui)}
.nav button:hover{color:var(--ink)!important;background:transparent!important}
.nav button.on{color:var(--ink)!important;background:transparent!important;box-shadow:inset 0 -2px 0 var(--gold-line)!important}
.sel{background-color:var(--card);border-color:var(--line);color:var(--ink);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238A6A2E' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")}
.sel option{color:#1F1915;background:#fff}
.lang{background:var(--paper-2)}
.lang button{color:var(--muted)}
.lang button.on{background:var(--candle);color:var(--ink);box-shadow:none}
.burger{background:var(--paper-2);color:var(--ink)}
@container lw (max-width:1020px){.nav.open{background:var(--card)!important;border:1px solid var(--line)}}

.lw-tag{display:inline-flex;align-items:center;gap:7px;font-family:var(--ui);font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;line-height:1;padding:6px 10px;border-radius:999px;background:rgba(251,247,239,.84);color:var(--ink-2);backdrop-filter:blur(6px)}
.lw-tag:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--vio-2)}
.lw-tag.auth:before{background:var(--candle)}

.lw-say{display:flex;align-items:flex-end;gap:10px;margin-top:26px}
.lw-say img{height:96px;width:auto;flex:none;filter:drop-shadow(0 10px 14px rgba(60,40,15,.28))}
.lw-say p{position:relative;margin:0 0 22px;max-width:360px;background:#fff;color:var(--ink);border-radius:22px 22px 22px 5px;padding:11px 16px 12px;font-family:var(--ui);font-size:14.5px;line-height:1.45;box-shadow:0 0 0 1px rgba(169,130,62,.2),0 14px 30px -18px rgba(60,40,15,.4)}
.lw-say p b{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--vio);margin-bottom:3px}
.lw-say.rev{flex-direction:row-reverse}
.lw-say.rev p{border-radius:22px 22px 5px 22px}

.lw-home{background:var(--paper)}
.lw-entry{position:relative;height:calc(100svh - 62px);min-height:620px;max-height:940px;overflow:hidden;background:var(--veil);color:var(--ink);display:flex;align-items:flex-end;isolation:isolate}
.lw-entry .scene{position:absolute;inset:-2%;background-size:cover;background-position:64% 50%;animation:lwKen 46s ease-in-out infinite alternate;z-index:-3}
.lw-entry video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:64% 50%;z-index:-2;opacity:0;transition:opacity 1.6s ease}
.lw-entry video.on{opacity:1}
.lw-entry:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(246,240,228,.97) 0%,rgba(246,240,228,.9) 26%,rgba(246,240,228,.5) 52%,rgba(246,240,228,0) 70%),linear-gradient(0deg,rgba(246,240,228,.97) 0%,rgba(246,240,228,0) 34%),linear-gradient(180deg,rgba(246,240,228,.55) 0%,rgba(246,240,228,0) 18%)}
@keyframes lwKen{from{transform:scale(1) translate3d(0,0,0)}to{transform:scale(1.07) translate3d(-1.2%,-.8%,0)}}
.lw-entry .in{position:relative;width:100%;max-width:1240px;margin:0 auto;padding:0 28px 8vh}
.lw-entry .over{font-family:var(--ui);font-size:12px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:var(--gold-ink);display:flex;align-items:center;gap:14px}
.lw-entry .over i{flex:0 0 44px;height:1px;background:var(--gold-line)}
.lw-entry h1{font-family:var(--display);font-weight:500;font-size:clamp(60px,8.6cqw,138px);line-height:.86;letter-spacing:-.022em;margin:22px 0 0;max-width:820px;text-shadow:0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)}
.lw-entry h1 em{display:block;font-style:italic;font-weight:400;color:var(--gold-em);padding-left:.5em}
.lw-entry .lede{color:var(--ink-2);text-shadow:0 0 18px rgba(246,240,228,.95);max-width:540px;margin:28px 0 0;font-size:21px}
.lw-entry .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.lw-entry .facts{display:flex;gap:30px;flex-wrap:wrap;margin-top:38px;padding-top:20px;border-top:1px solid rgba(169,130,62,.35);max-width:620px}
.lw-entry .facts b{display:block;font-family:var(--display);font-weight:500;font-size:40px;line-height:1;color:var(--ink)}
.lw-entry .facts span{font-family:var(--ui);font-size:12px;color:var(--muted)}
.lw-entry .lw-tag{position:absolute;right:24px;bottom:22px}
.lw-entry .cue{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);font-family:var(--ui);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:8px;border:0;background:none;cursor:pointer}
.lw-entry .cue:after{content:"";width:1px;height:34px;background:linear-gradient(var(--gold-line),transparent);animation:lwCue 2.4s ease-in-out infinite}
@keyframes lwCue{0%,100%{transform:scaleY(.4);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}}

.motes{position:absolute;inset:0;pointer-events:none;z-index:-1;overflow:hidden}
.motes span{position:absolute;bottom:-10px;width:var(--s,3px);height:var(--s,3px);border-radius:50%;background:radial-gradient(circle,#FFE6AE 0,rgba(255,230,174,0) 70%);opacity:0;animation:lwMote var(--d,14s) linear var(--w,0s) infinite}
@keyframes lwMote{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:.85}80%{opacity:.5}100%{transform:translate3d(var(--x,30px),-62vh,0);opacity:0}}

.lw-entry .over,.lw-entry h1,.lw-entry .lede,.lw-entry .ctas,.lw-entry .facts{animation:lwRise 1.1s cubic-bezier(.2,.7,.2,1) both}
.lw-entry h1{animation-delay:.12s}.lw-entry .lede{animation-delay:.3s}.lw-entry .ctas{animation-delay:.45s}.lw-entry .facts{animation-delay:.6s}
@keyframes lwRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

.lw-prologue{background:var(--paper) var(--grain);padding:96px 0 90px;position:relative}
.lw-prologue:before{content:"";position:absolute;left:0;right:0;top:0;height:120px;background:linear-gradient(rgba(169,130,62,1),rgba(169,130,62,0));opacity:.08}
.lw-tale{max-width:720px;margin:0 auto;text-align:center}
.lw-tale .over{font-family:var(--ui);font-size:11.5px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--gold)}
.lw-tale h2{font-family:var(--display);font-weight:500;font-size:clamp(40px,5cqw,66px);line-height:1;margin:16px 0 0}
.lw-tale h2 em{font-style:italic;font-weight:400;color:var(--vio-ink)}
.lw-tale p{font-family:var(--lit);font-size:22px;line-height:1.62;color:var(--ink-2);margin:26px 0 0;text-align:left}
.lw-tale p:first-of-type:first-letter{float:left;font-family:var(--display);font-weight:600;font-size:4.6em;line-height:.78;padding:8px 12px 0 0;color:var(--vio)}
.lw-cast{margin:70px auto 0;max-width:1120px}
.lw-cast-h{text-align:center}
.lw-cast-h h3{font-family:var(--display);font-style:italic;font-weight:500;font-size:clamp(34px,3.6cqw,46px);margin:10px 0 0}
.lw-cast-h small{display:block;font-family:var(--lit);font-style:italic;font-size:17px;color:var(--muted);margin-top:4px}
.lw-roles{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:38px}
.lw-role{text-align:center;padding:0 6px}
.lw-role .stage{position:relative;height:230px;display:flex;align-items:flex-end;justify-content:center}
.lw-role .stage:before{content:"";position:absolute;left:12%;right:12%;bottom:0;height:60%;border-radius:50% 50% 8px 8px / 60% 60% 8px 8px;background:radial-gradient(ellipse at 50% 100%,rgba(231,185,103,.45),rgba(231,185,103,0) 70%)}
.lw-role img{position:relative;height:214px;width:auto;transition:transform .5s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 16px 16px rgba(60,35,10,.28))}
.lw-role:hover img{transform:translateY(-8px) rotate(-2deg)}
.lw-role b{display:block;font-family:var(--display);font-weight:600;font-size:21px;letter-spacing:.16em;text-transform:uppercase;margin-top:16px}
.lw-role i{display:block;font-family:var(--lit);font-size:17.5px;line-height:1.42;color:var(--ink-2);margin-top:6px}
.lw-role small{display:block;font-family:var(--ui);font-size:11.5px;letter-spacing:.06em;color:var(--muted);margin-top:8px}

.lw-map{position:relative;background:radial-gradient(1200px 620px at 50% 0%,#FBF7EF 0%,var(--vellum) 62%) ;color:var(--ink);padding:100px 0 110px;overflow:hidden}
.lw-map:before{content:"";position:absolute;inset:0;background:var(--grain);opacity:.6;pointer-events:none}
.lw-head{display:grid;grid-template-columns:1fr minmax(260px,380px);gap:40px;align-items:end;margin-bottom:54px;position:relative}
.lw-head .over{font-family:var(--ui);font-size:11.5px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--gold-ink)}
.lw-head h2{font-family:var(--display);font-weight:500;font-size:clamp(44px,5.6cqw,84px);line-height:.92;margin:14px 0 0;letter-spacing:-.015em}
.lw-head h2 em{font-style:italic;font-weight:400;color:var(--gold-em)}
.lw-head p{font-family:var(--lit);font-size:19px;line-height:1.5;color:var(--muted);margin:0}
.lw-paper .lw-head p{color:var(--muted)}
.lw-paper .lw-head .over{color:var(--gold)}
.lw-paper .lw-head h2 em{color:var(--vio-ink)}
.lw-doors{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:56px 26px}
.lw-path{position:absolute;inset:-20px 0 0 0;width:100%;height:100%;pointer-events:none}
.lw-path path{fill:none;stroke:var(--gold);stroke-width:1.4;stroke-dasharray:1 9;stroke-linecap:round;opacity:.55}
.lw-door{position:relative;border:0;background:none;padding:0;text-align:left;color:inherit;cursor:pointer}
.lw-door:nth-child(4n+2),.lw-door:nth-child(4n+4){margin-top:48px}
.lw-door .arch{position:relative;display:block;aspect-ratio:3/4.15;border-radius:999px 999px 6px 6px;overflow:hidden;background:var(--paper-2);box-shadow:0 0 0 1px rgba(169,130,62,.55),0 0 0 7px var(--card),0 0 0 8px rgba(169,130,62,.35),0 40px 60px -30px rgba(60,40,15,.45);transition:box-shadow .5s,transform .5s cubic-bezier(.2,.8,.2,1)}
.lw-door .arch .img{position:absolute;inset:0;background-size:cover;background-position:var(--p,50% 50%);transition:transform 1.4s cubic-bezier(.2,.8,.2,1),filter .6s;filter:saturate(.92) brightness(.9)}
.lw-door .arch:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(246,240,228,0) 45%,rgba(246,240,228,.92) 100%)}
.lw-door .arch .q{position:absolute;left:18px;right:18px;bottom:16px;z-index:2;font-family:var(--display);font-style:italic;font-size:20px;line-height:1.15;color:var(--ink);opacity:.94;transition:transform .5s}
.lw-door:hover .arch{transform:translateY(-6px);box-shadow:0 0 0 1px var(--gold),0 0 0 7px var(--card),0 0 0 8px rgba(169,130,62,.6),0 0 46px 6px rgba(231,185,103,.3),0 40px 60px -30px rgba(60,40,15,.5)}
.lw-door:hover .arch .img{transform:scale(1.07);filter:saturate(1.05) brightness(1)}
.lw-door .no{position:relative;z-index:3;display:grid;place-items:center;width:46px;height:46px;margin:-23px auto 0;border-radius:50%;background:var(--card);border:1px solid var(--gold-line);font-family:var(--display);font-style:italic;font-size:19px;color:var(--gold-ink)}
.lw-door b{display:block;text-align:center;font-family:var(--display);font-weight:600;font-size:25px;line-height:1.05;margin-top:12px;color:var(--ink)}
.lw-door small{display:block;text-align:center;font-family:var(--ui);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:6px}
.lw-lanes{position:relative;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:26px 22px;border:1px solid rgba(169,130,62,.35);border-radius:6px;background:rgba(255,255,255,.45);align-self:center}
.lw-lanes h3{font-family:var(--display);font-style:italic;font-weight:500;font-size:28px;margin:0;color:var(--gold-em)}
.lw-lanes p{margin:0 0 6px;font-family:var(--lit);font-size:16px;color:var(--muted)}
.lw-lane{display:flex;align-items:center;gap:12px;border:0;background:none;padding:6px 6px 6px 0;text-align:left;color:var(--ink);cursor:pointer;border-radius:8px}
.lw-lane span.t{flex:none;width:52px;height:52px;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 1px rgba(169,130,62,.55),0 0 0 4px var(--card);transition:transform .4s}
.lw-lane b{display:block;font-family:var(--display);font-weight:600;font-size:19px;line-height:1.1}
.lw-lane small{font-family:var(--ui);font-size:11.5px;color:var(--muted)}
.lw-lane:hover span.t{transform:scale(1.08)}
.lw-lane:hover b{color:var(--gold-em)}
.lw-map .lw-say{position:relative;margin:60px 0 0}
.lw-map .lw-say p{max-width:420px}

.lw-cabinet{position:relative;background:linear-gradient(180deg,#F1E6D3 0%,#E8D9C0 100%);color:var(--ink);padding:100px 0 110px;overflow:hidden}
.lw-cabinet:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(120,80,30,.025) 0 2px,transparent 2px 9px),var(--grain);opacity:.9;pointer-events:none}
.lw-cabinet .lw-head h2 em{color:var(--gold-em)}
.lw-curios{position:relative;columns:4 240px;column-gap:24px}
.lw-curio{display:block;width:100%;break-inside:avoid;margin:0 0 30px;border:0;padding:0;background:none;text-align:left;color:inherit;cursor:pointer}
.lw-curio .fr,.lw-curio .mat,.lw-curio .plaque{display:block}
.lw-curio .fr{position:relative;padding:12px;background:linear-gradient(145deg,#6E4F23,#3E2A12 40%,#8A6730 70%,#4A3215);box-shadow:0 22px 40px -22px rgba(60,40,15,.55),inset 0 0 0 1px rgba(255,220,150,.35)}
.lw-curio .fr .mat{background:#F8F3E8;padding:10px;box-shadow:inset 0 0 18px rgba(60,40,15,.22)}
.lw-curio img{width:100%;height:auto;display:block;filter:sepia(.08) saturate(.95);transition:filter .5s,transform .8s}
.lw-curio:hover img{filter:none;transform:scale(1.02)}
.lw-curio .plaque{margin:14px 4px 0}
.lw-curio .plaque .lw-tag{background:rgba(169,130,62,.14);color:var(--gold-ink)}
.lw-curio .plaque b{display:block;font-family:var(--display);font-weight:600;font-size:22px;line-height:1.1;margin-top:10px;color:var(--ink)}
.lw-curio .plaque q{display:block;quotes:none;font-family:var(--lit);font-style:italic;font-size:17px;line-height:1.38;color:var(--ink-2);margin-top:6px}
.lw-curio .plaque small{display:block;font-family:var(--ui);font-size:11px;line-height:1.45;color:var(--muted);margin-top:8px}
.lw-curio:hover .plaque b{color:var(--gold-em)}

.lw-desk{position:relative;background:radial-gradient(900px 520px at 28% 40%,rgba(231,185,103,.3),rgba(231,185,103,0) 70%),linear-gradient(180deg,#F8F2E7 0%,#F1E7D6 100%);color:var(--ink);padding:100px 0;overflow:hidden}
.lw-desk-in{display:grid;grid-template-columns:minmax(260px,.8fr) 1.2fr;gap:56px;align-items:center}
.lw-desk .plate{position:relative;padding:14px;background:linear-gradient(145deg,#6E4F23,#3E2A12 40%,#8A6730 70%,#4A3215);box-shadow:0 30px 60px -30px rgba(60,40,15,.55)}
.lw-desk .plate img{width:100%;display:block;background:#EDE3CF}
.lw-desk .plate figcaption{position:absolute;left:0;right:0;top:calc(100% + 12px);font-family:var(--ui);font-size:11.5px;color:var(--muted)}
.lw-desk .sheet{position:relative;background:var(--page) var(--grain);color:var(--ink);padding:40px 44px 34px;box-shadow:0 0 0 1px rgba(169,130,62,.16),0 40px 70px -40px rgba(60,40,15,.5);border-radius:2px}
.lw-desk .sheet .kicker{color:var(--vio-ink)}
.lw-desk .sheet h2{font-family:var(--display);font-weight:500;font-size:clamp(40px,4.4cqw,60px);line-height:1;margin:10px 0 4px}
.lw-desk .sheet .q{font-family:var(--display);font-style:italic;font-size:30px;line-height:1.2;margin:18px 0 0;color:var(--ink-2)}
.lw-desk .lw-say{position:absolute;right:-18px;top:-74px;margin:0}
.lw-desk .lw-say img{height:110px}

.lw-ages{background:var(--paper) var(--grain);padding:100px 0 90px}
.lw-strip{display:grid;grid-auto-flow:column;grid-auto-columns:200px;gap:20px;overflow-x:auto;padding:6px 4px 20px;scroll-snap-type:x mandatory;scrollbar-width:thin}
.lw-strip button{scroll-snap-align:start;border:0;background:none;padding:0;text-align:left;cursor:pointer;color:var(--ink)}
.lw-strip .fr{padding:8px;background:linear-gradient(145deg,#C9A35A,#8A6730 50%,#D8B66E);box-shadow:0 18px 30px -20px rgba(40,25,10,.7)}
.lw-strip .ph{aspect-ratio:3/4;background-size:cover;background-position:center;background-color:var(--paper-2);filter:sepia(.1)}
.lw-strip button:hover .ph{filter:none}
.lw-strip .n{display:block;font-family:var(--display);font-style:italic;color:var(--gold);font-size:17px;margin-top:12px}
.lw-strip b{display:block;font-family:var(--display);font-weight:600;font-size:22px;line-height:1.05}
.lw-strip small{font-family:var(--ui);font-size:11.5px;color:var(--muted)}

.lw-study{background:var(--paper-2) var(--grain);padding:96px 0}
.lw-desks{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.lw-desks button{display:flex;flex-direction:column;text-align:left;border:0;padding:0;background:var(--card);cursor:pointer;color:var(--ink);box-shadow:0 1px 0 var(--line),0 24px 40px -30px rgba(40,25,10,.6);transition:transform .35s,box-shadow .35s}
.lw-desks button:hover{transform:translateY(-4px);box-shadow:0 1px 0 var(--line),0 34px 50px -30px rgba(40,25,10,.75)}
.lw-desks .ph{aspect-ratio:16/10;background-size:cover;background-position:center}
.lw-desks .tx{padding:20px 22px 24px;display:flex;flex-direction:column;gap:8px;flex:1}
.lw-desks h3{font-family:var(--display);font-weight:600;font-size:27px;line-height:1.05;margin:0}
.lw-desks p{margin:0;font-family:var(--lit);font-size:16.5px;line-height:1.45;color:var(--ink-2);flex:1}
.lw-desks .go{font-family:var(--ui);font-size:13px;font-weight:600;color:var(--vio-ink)}

.lw-levels{background:var(--paper) var(--grain);padding:90px 0 100px}
.lw-plates{display:grid;grid-template-columns:repeat(7,1fr);gap:14px}
.lw-plates button{position:relative;border:0;background:var(--card);padding:22px 10px 18px;text-align:center;cursor:pointer;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line),inset 0 0 0 6px var(--card),inset 0 0 0 7px var(--line);transition:transform .3s,box-shadow .3s}
.lw-plates button:hover{transform:translateY(-3px)}
.lw-plates button.on{background:var(--candle-2);color:var(--ink);box-shadow:inset 0 0 0 1px var(--gold),inset 0 0 0 6px var(--candle-2),inset 0 0 0 7px rgba(169,130,62,.6)}
.lw-plates small.ex{display:block;font-family:var(--ui);font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
.lw-plates b{display:block;font-family:var(--display);font-weight:600;font-size:40px;line-height:1;margin:6px 0}
.lw-plates span{display:block;font-family:var(--lit);font-style:italic;font-size:14.5px;line-height:1.25;color:var(--ink-2)}
.lw-plates em{display:block;font-style:normal;font-family:var(--ui);font-size:11px;color:var(--muted);margin-top:6px}
.lw-plates button.on span,.lw-plates button.on em,.lw-plates button.on small.ex{color:var(--ink-2)}

.lw-arrive{position:relative;min-height:clamp(540px,76vh,760px);display:flex;align-items:flex-end;overflow:hidden;background:radial-gradient(900px 620px at 12% 78%,var(--glow,rgba(231,185,103,.16)),rgba(0,0,0,0) 70%),var(--veil);color:var(--ink);isolation:isolate}
.lw-arrive .scene{position:absolute;top:0;right:0;bottom:0;left:35%;background-size:cover;background-position:var(--p,50% 50%);z-index:-2;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 26%);mask-image:linear-gradient(90deg,transparent 0,#000 26%);animation:lwOpen 1.8s cubic-bezier(.2,.7,.2,1) both}
@keyframes lwOpen{from{transform:scale(1.08);filter:blur(6px) brightness(1.35) saturate(.6)}to{transform:scale(1);filter:none}}
.lw-arrive:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,rgba(246,240,228,.92) 0%,rgba(246,240,228,0) 38%),linear-gradient(90deg,rgba(246,240,228,.82) 0%,rgba(246,240,228,.62) 36%,rgba(246,240,228,0) 56%)}
.lw-arrive .in{position:relative;width:100%;padding-top:110px;padding-bottom:56px}
.lw-arrive .in>*{max-width:530px}
.lw-arrive .in>h1{max-width:600px}
.lw-arrive[data-w=globe],.world-hero{--glow:rgba(214,150,70,.22)}
.lw-arrive[data-w=theatre]{--glow:rgba(170,30,50,.3)}
.lw-arrive[data-w=poets]{--glow:rgba(150,180,120,.2)}
.lw-arrive[data-w=library]{--glow:rgba(60,140,90,.2)}
.lw-arrive[data-w=gothic]{--glow:rgba(110,100,200,.28)}
.lw-arrive[data-w=writers]{--glow:rgba(231,185,103,.2)}
.lw-arrive[data-w=archive]{--glow:rgba(200,140,60,.22)}
.lw-arrive[data-w=nursery]{--glow:rgba(210,80,50,.24)}
.lw-arrive[data-w=sayings]{--glow:rgba(231,185,103,.26)}
.lw-arrive[data-w=streets]{--glow:rgba(90,120,170,.26)}
.lw-arrive[data-w=press]{--glow:rgba(200,130,60,.22)}
.lw-arrive .ch{font-family:var(--ui);font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--gold-ink);display:flex;align-items:center;gap:12px}
.lw-arrive .ch i{flex:0 0 40px;height:1px;background:var(--gold-line)}
.lw-arrive h1.display{color:var(--ink);font-size:clamp(52px,5.8cqw,94px)!important;line-height:.9;margin:16px 0 0!important;max-width:600px;text-shadow:0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)}
.lw-arrive h1.display em{color:var(--gold-em)}
.lw-arrive .lede{color:var(--ink-2);text-shadow:0 0 18px rgba(246,240,228,.95);max-width:500px;margin-top:20px}
.lw-arrive .lede b{color:var(--ink)}
.lw-arrive .ch,.lw-arrive h1,.lw-arrive .lede,.lw-arrive .lw-say{animation:lwRise 1s cubic-bezier(.2,.7,.2,1) both}
.lw-arrive h1{animation-delay:.15s}.lw-arrive .lede{animation-delay:.3s}.lw-arrive .lw-say{animation-delay:.6s}
.lw-arrive .lw-tag{position:absolute;right:24px;top:20px}
.lw-hist{position:absolute;right:max(28px,calc((100cqw - 1240px)/2 + 28px));bottom:56px;width:230px;margin:0;animation:lwRise 1.2s .8s cubic-bezier(.2,.7,.2,1) both}
.lw-hist .fr{padding:9px;background:linear-gradient(145deg,#C9A35A,#7B5A27 50%,#D8B66E);box-shadow:0 24px 40px -20px rgba(60,40,15,.55)}
.lw-hist img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--paper-2)}
.lw-hist figcaption{margin-top:10px;font-family:var(--ui);font-size:11px;line-height:1.45;color:var(--ink-2);text-shadow:0 0 10px rgba(246,240,228,.95)}
.lw-hist figcaption b{display:block;font-family:var(--display);font-style:italic;font-weight:500;font-size:16px;color:var(--gold-em);letter-spacing:0;margin-bottom:2px}
.lw-arrive .crumbs,.lw-arrive .crumbs button{color:var(--muted)}
.lw-arrive .stats b{color:var(--ink)}
.lw-arrive .stats span{color:var(--muted)}
.lw-arrive .hero-ctas .btn.ghost{color:var(--ink)!important;box-shadow:inset 0 0 0 1px rgba(31,25,21,.6)!important}
.page-head.lw-done{padding-top:30px}
.page-head.lw-empty{display:none}
.page-head.lw-empty+.wrap{padding-top:40px}

.lw-route{background:var(--ribbon);color:var(--ink-2);border-bottom:1px solid var(--line)}
.lw-route .wrap{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:10px;padding-bottom:10px}
.lw-route ol{display:flex;gap:2px;list-style:none;margin:0;padding:0;overflow-x:auto;scrollbar-width:none}
.lw-route ol::-webkit-scrollbar{display:none}
.lw-route li button{display:flex;align-items:center;gap:8px;border:0;background:none;padding:7px 11px 7px 7px;border-radius:999px;font-family:var(--ui);font-size:12.5px;color:var(--muted);white-space:nowrap;cursor:pointer}
.lw-route li button:hover{color:var(--ink);background:rgba(31,25,21,.05)}
.lw-route li i{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:50%;border:1px solid rgba(169,130,62,.5);font-family:var(--display);font-size:13px;font-style:italic;color:var(--gold-ink)}
.lw-route li.on button{color:var(--ink);background:rgba(169,130,62,.14)}
.lw-route li.on i{background:var(--candle);color:var(--ink);border-color:var(--candle)}
.lw-route .next{flex:none;border:0;background:none;font-family:var(--ui);font-size:13px;color:var(--gold-ink);cursor:pointer;white-space:nowrap}
.lw-route .next b{font-family:var(--display);font-style:italic;font-weight:500;font-size:17px;color:var(--ink)}

.world-hero.lw-scened{min-height:clamp(560px,82vh,800px)!important;display:flex;align-items:flex-end;background:var(--veil)}
.world-hero.lw-scened{background:radial-gradient(900px 620px at 12% 78%,var(--glow),rgba(0,0,0,0) 70%),var(--veil)!important}
.world-hero.lw-scened .bg{left:35%!important;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 26%);mask-image:linear-gradient(90deg,transparent 0,#000 26%);opacity:1!important;filter:none!important;animation:lwOpen 1.8s cubic-bezier(.2,.7,.2,1) both}
.world-hero.lw-scened .wrap>*{max-width:560px}
.world-hero.lw-scened:after{background:linear-gradient(0deg,rgba(246,240,228,.92) 0%,rgba(246,240,228,0) 38%),linear-gradient(90deg,rgba(246,240,228,.82) 0%,rgba(246,240,228,.62) 36%,rgba(246,240,228,0) 56%)!important}
.world-hero.lw-scened .display{font-size:clamp(52px,5.8cqw,94px)!important}
.world-hero.lw-scened .wrap{width:100%;padding-top:110px!important;padding-bottom:56px!important}
.world-hero.lw-scened .credit{display:none}
.world-hero .display em{color:var(--gold-em)!important}
.world-hero .kicker{color:var(--gold-ink)!important}
.world-hero.slim.lw-scened{min-height:clamp(460px,64vh,620px)!important}
.feature{background:var(--card);border:1px solid var(--line);box-shadow:0 30px 50px -40px rgba(40,25,10,.6)}
.feature q{font-family:var(--display);font-style:italic}
.pcard{background:var(--card);border:1px solid var(--line);transition:transform .35s,box-shadow .35s}
.pcard:hover{transform:translateY(-4px);box-shadow:0 30px 50px -34px rgba(40,25,10,.7)}
.pcard .ph{position:relative}
.pcard .ph:after{content:"";position:absolute;inset:8px;border:1px solid rgba(255,240,210,.45);pointer-events:none}
.prow{background:var(--card);border:1px solid var(--line)}
.prow:hover{background:var(--accent-soft);border-color:var(--accent)}
.life .ev{border-top-color:var(--line)}
.theatre .panel{border-top:3px solid var(--accent)}
.figrow figure{background:var(--card);border:1px solid var(--line);padding:8px}
.figrow figcaption{font-family:var(--ui)}

.play-head{min-height:560px;background:var(--veil)}
.play-head .lw-curtain{position:absolute;top:0;bottom:0;width:min(9cqw,120px);z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#8A1F30 0 10px,#B2364A 10px 22px,#9A2638 22px 30px);box-shadow:inset -18px 0 30px rgba(60,10,20,.35);animation:lwDrawL 1.6s cubic-bezier(.2,.7,.2,1) both}
.play-head .lw-curtain.l{left:0;border-radius:0 0 60% 0 / 0 0 22% 0}
.play-head .lw-curtain.r{right:0;transform:scaleX(-1);animation-name:lwDrawR}
@keyframes lwDrawL{from{width:50cqw}to{width:min(9cqw,120px)}}
@keyframes lwDrawR{from{width:50cqw}to{width:min(9cqw,120px)}}
.play-head .lw-pelmet{position:absolute;left:0;right:0;top:0;height:22px;z-index:2;background:linear-gradient(180deg,#D2A955,#9C7330);box-shadow:0 6px 16px rgba(60,40,15,.3)}
.play-head .wrap{position:relative;z-index:2}
.play-head .credit{z-index:3;top:32px!important}
.play-head .lw-say{position:absolute;right:max(130px,calc((100cqw - 1240px)/2 + 40px));bottom:84px;z-index:3;margin:0}
.play-head .lw-say img{height:120px}
.ptabs button{font-family:var(--ui)}
.ptabs button.on{box-shadow:inset 0 -3px 0 var(--gold-line)!important}
.sp .who{color:var(--accent)}
.happens{background:var(--accent-soft);border-left-color:var(--accent)}
.snav button.on{background:var(--candle);color:var(--ink)}
.snav button.on small{color:var(--ink-2)}

.card{background:var(--card);border:1px solid var(--line);border-radius:2px;transition:transform .35s,box-shadow .35s,border-color .35s}
.card:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:0 30px 50px -34px rgba(40,25,10,.7)}
.card .ph{position:relative}
.card .ph:after{content:"";position:absolute;inset:8px;border:1px solid rgba(255,240,210,.4);pointer-events:none}
.card .h3{font-size:26px}
.card .first{font-family:var(--lit);font-style:italic}
.typo{background:linear-gradient(160deg,var(--accent-soft),var(--paper-2))!important}
.typo:before{color:var(--accent)!important}
.typo:after{border-color:rgba(120,90,50,.25)!important}
.section-label{border-bottom:1px solid var(--line);padding-bottom:10px;margin:56px 0 10px!important}
.section-label .h3{font-size:34px}
.book .cover{border:0!important;box-shadow:0 18px 30px -18px rgba(40,25,10,.7)}
.book .cover.ty{background:linear-gradient(90deg,rgba(0,0,0,.28) 0,rgba(255,255,255,.08) 4%,rgba(0,0,0,0) 9%),var(--jacket,#2E4B3C)!important}
.book .cover.ty:after{border-color:rgba(231,195,120,.55)!important}
.book .cover.ty .t{font-family:var(--display)}
.book .cover.ty .o{color:var(--candle-2)}
.rowb{border-bottom-color:var(--line)}
.shelf .sh-h{border-bottom:1px solid var(--accent)}
.era-v .card-e{border-top-color:var(--accent)}
.era-v .eimg .frame{background:linear-gradient(145deg,#C9A35A,#8A6730 50%,#D8B66E);border:0;padding:9px}
.chips2 button{background:var(--card)}
.chips2 button:hover{background:var(--accent-soft)}
.wcard,.pcard2,.gcard,.rung,.hit,.wstep{border-radius:3px!important;background:var(--card)!important;border:1px solid var(--line);box-shadow:none!important}
.wcard:hover,.hit:hover{border-color:var(--accent)}
.wcard.slang,.wcard.dialect{background:#FBF2E6!important}.wcard.archaic{background:#F6F1FA!important}.wcard.idiom{background:#EFF6F5!important}
.saying{border-radius:24px 24px 24px 5px;background:var(--card);border:1px solid var(--line)}
.saying.v{background:var(--vio);border-color:var(--vio)}
.saying.c{background:#DDF4FC;border-color:#BFE8F6}
.key{background:var(--card);border:1px solid var(--line);border-radius:18px}
.key:hover{background:var(--vio);border-color:var(--vio)}
.ws-g button.on,.ws-g button:hover{background:var(--card)}
.tbl{border-radius:3px;border:1px solid var(--line)}
.path6 span{background:var(--card);border:1px solid var(--line)}
.path6 b{background:var(--accent)}
.wstep .n{background:var(--accent)}
.enc{border-left-color:var(--accent)}

.stage-tabs{background:linear-gradient(var(--tint) 70%,rgba(0,0,0,0))!important}
.stage-tabs button{background:var(--card);border:1px solid var(--line);font-family:var(--ui)}
.stage-tabs button.on{background:var(--candle);color:var(--ink);border-color:var(--candle)}
.stage-tabs button.on span{background:var(--vio)}
.exp article{position:relative;background:var(--page) var(--grain);padding:46px 52px 40px;box-shadow:0 1px 0 var(--line),0 40px 70px -50px rgba(40,25,10,.7);border:1px solid var(--line)}
.exp article:before{content:"";position:absolute;inset:8px;border:1px solid rgba(169,130,62,.18);pointer-events:none}
.art-wrap{background:linear-gradient(145deg,#C9A35A,#8A6730 50%,#D8B66E)!important;border:0!important;padding:10px!important;box-shadow:0 26px 44px -26px rgba(40,25,10,.8)}
.art-wrap img{background:var(--paper-2)}
.art-wrap.plate,.art-wrap.small{background:linear-gradient(145deg,#C9A35A,#8A6730 50%,#D8B66E)!important}
.art-wrap.plate img,.art-wrap.small img{box-shadow:none}
.typo-art{border-radius:2px!important;background:linear-gradient(160deg,var(--accent-soft),var(--paper-2))!important}
.poem .ln.hl{background:var(--accent-soft)}
.w{border-bottom-color:rgba(135,75,248,.55)}
.voice{background:var(--card);border:1px solid var(--line);border-radius:999px 24px 24px 999px!important}
.voice .play{border-radius:50%}
.front .frame{background:linear-gradient(145deg,#C9A35A,#8A6730 50%,#D8B66E);border:0;padding:12px}
.prose-body p:first-of-type:first-letter{color:var(--vio)}
.reading .side .panel,.ov .panel{background:var(--card)}
.lw-margin{display:flex;align-items:flex-end;gap:8px;margin-top:22px}
.lw-margin img{height:84px;width:auto;flex:none;filter:drop-shadow(0 8px 10px rgba(40,25,10,.3))}
.lw-margin p{margin:0 0 16px;position:relative;background:var(--card);border:1px solid var(--line);border-radius:18px 18px 18px 4px;padding:9px 13px 10px;font-family:var(--ui);font-size:13.5px;line-height:1.45;color:var(--ink-2)}
.lw-margin p b{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--vio);margin-bottom:2px}
.pv-bubble{background:var(--vio);box-shadow:0 30px 60px -30px rgba(95,43,209,.7)}

footer{background:var(--paper-2);border-top:1px solid var(--line);color:var(--ink-2)}
footer .wrap{align-items:center}
footer .lw-colophon{flex-basis:100%;order:3;margin-top:8px;font-family:var(--lit);font-style:italic;font-size:15px;color:var(--muted)}
footer button{background:rgba(169,130,62,.14);color:var(--ink)}

@container lw (max-width:1100px){
  .lw-doors{grid-template-columns:repeat(2,1fr);gap:46px 22px}
  .lw-door:nth-child(n){margin-top:0}
  .lw-door:nth-child(even){margin-top:40px}
  .lw-path{display:none}
  .lw-roles{grid-template-columns:repeat(2,1fr);gap:40px 20px}
  .lw-desks{grid-template-columns:repeat(2,1fr)}
  .lw-plates{grid-template-columns:repeat(4,1fr)}
  .lw-desk-in{grid-template-columns:1fr;gap:70px}
  .lw-desk .plate{max-width:420px}
  .lw-head{grid-template-columns:1fr;gap:16px}
  .lw-hist{display:none}
  .play-head .lw-say{display:none}
}
@container lw (max-width:720px){
  .wrap{padding-left:16px;padding-right:16px}
  .lw-entry{height:auto;min-height:calc(100svh - 58px);max-height:none}
  .lw-entry .scene,.lw-entry video{inset:0 0 auto 0;height:360px;background-position:80% 50%;object-position:80% 50%;-webkit-mask-image:linear-gradient(180deg,#000 62%,transparent 100%);mask-image:linear-gradient(180deg,#000 62%,transparent 100%)}
  .lw-entry .scene{animation:none}
  .lw-entry:before{background:none}
  .lw-entry .in{padding:318px 16px 56px}
  .lw-entry h1{font-size:clamp(50px,15cqw,72px)}
  .lw-entry .lede{font-size:18px}
  .lw-entry .facts{gap:18px}.lw-entry .facts b{font-size:30px}
  .lw-entry .lw-tag{right:12px;bottom:auto;top:14px}
  .lw-entry .cue{display:none}
  .lw-prologue,.lw-map,.lw-cabinet,.lw-desk,.lw-ages,.lw-study,.lw-levels{padding:70px 0}
  .lw-tale p{font-size:19px}
  .lw-roles{grid-template-columns:1fr 1fr;gap:30px 12px}
  .lw-role .stage{height:170px}.lw-role img{height:160px}
  .lw-role b{font-size:17px}.lw-role i{font-size:15.5px}
  .lw-doors{grid-template-columns:1fr 1fr;gap:34px 14px}
  .lw-door:nth-child(even){margin-top:30px}
  .lw-door b{font-size:19px}.lw-door .arch .q{font-size:15.5px;left:12px;right:12px}
  .lw-door small{font-size:10px;letter-spacing:.08em}
  .lw-lanes{grid-column:1/-1}
  .lw-curios{columns:2;column-gap:14px}
  .lw-curio .fr{padding:7px}.lw-curio .fr .mat{padding:5px}
  .lw-curio .plaque b{font-size:18px}.lw-curio .plaque q{font-size:15px}
  .lw-desk .sheet{padding:30px 22px}
  .lw-desk .plate figcaption{position:static;margin-top:12px}
  .lw-desk .lw-say{right:6px;top:-64px}.lw-desk .lw-say img{height:84px}.lw-desk .lw-say p{max-width:210px;font-size:13px}
  .lw-desks{grid-template-columns:1fr}
  .lw-plates{grid-template-columns:repeat(2,1fr)}
  .lw-arrive{min-height:auto}
  .lw-arrive .scene,.world-hero.lw-scened .bg{left:0!important;bottom:auto!important;height:330px!important;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%)!important;mask-image:linear-gradient(180deg,#000 55%,transparent 100%)!important}
  .lw-arrive .in{padding-top:270px;padding-bottom:36px}
  .lw-arrive:before,.world-hero.lw-scened:after{background:none!important}
  .lw-arrive h1.display{font-size:clamp(46px,13cqw,66px)!important}
  .lw-arrive .lw-tag,.world-hero .lw-tag{right:12px;top:12px;font-size:9.5px}
  .lw-say img{height:76px}.lw-say p{font-size:13.5px}
  .world-hero.lw-scened .wrap{padding-top:240px!important;padding-bottom:36px!important}
  .exp article{padding:28px 20px}
  .play-head .lw-curtain{width:22px}
  @keyframes lwDrawL{from{width:50cqw}to{width:22px}}
  @keyframes lwDrawR{from{width:50cqw}to{width:22px}}
}
@media (prefers-reduced-motion:reduce){
  .lw-entry .scene,.motes span,.lw-arrive .scene{animation:none!important}
  .lw-entry video{display:none}
}

.badge.tr{font-family:var(--ui)!important;font-size:11.5px!important;color:#7a5600}

.world-hero{color:var(--ink)}
.world-hero .display{color:var(--ink);text-shadow:0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)}
.world-hero .lede{color:var(--ink-2);text-shadow:0 0 18px rgba(246,240,228,.95)}
.world-hero .stats b{color:var(--ink)}
.world-hero .stats span{color:var(--muted)}
.world-hero .hero-ctas .btn.ghost{color:var(--ink)!important;box-shadow:inset 0 0 0 1px rgba(31,25,21,.6)!important}
.world-hero .lw-hist figcaption{color:var(--ink-2)}
.play-head{color:var(--ink)}
.play-head:after{background:linear-gradient(180deg,rgba(246,240,228,.1) 0%,rgba(246,240,228,.38) 40%,rgba(246,240,228,.95) 100%)!important}
.play-head .display{color:var(--ink)!important;text-shadow:0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)}
.play-head .kicker{color:var(--accent)!important}
.play-head .by{color:var(--ink-2)!important}
.play-head .crumbs,.play-head .crumbs button{color:var(--ink-2)!important}
.play-head .credit{color:var(--ink-2)!important;text-shadow:0 0 8px rgba(246,240,228,1),0 0 3px rgba(246,240,228,1)}
.ptabs button{color:var(--ink-2)!important;box-shadow:inset 0 -1px 0 rgba(31,25,21,.22)}
.ptabs button.on{color:var(--ink)!important}
.lw-map .meta{color:var(--muted)!important}
.lw-entry .over,.lw-arrive .ch,.world-hero .kicker{text-shadow:0 0 12px rgba(246,240,228,1),0 0 4px rgba(246,240,228,1)}

:host{--scrim:246,240,228}

.lw-hist{position:relative;right:auto;bottom:auto;z-index:auto;width:auto;max-width:440px;margin:22px 0 0;display:grid;grid-template-columns:148px 1fr;gap:16px;align-items:center;animation:lwRise 1s .45s cubic-bezier(.2,.7,.2,1) both}
.lw-hist .fr{padding:7px}
.lw-hist figcaption{margin-top:0;text-shadow:none}
.lw-arrive .in>.lw-hist,.world-hero.lw-scened .wrap>.lw-hist{width:fit-content;max-width:440px}   

@container lw (min-width:721px){
  .lw-arrive:before,.world-hero.lw-scened:after{background:linear-gradient(90deg,rgba(var(--scrim),.86) 0%,rgba(var(--scrim),.72) 30%,rgba(var(--scrim),.3) 42%,rgba(var(--scrim),0) 48%)!important}
  .lw-entry:before{background:linear-gradient(90deg,rgba(var(--scrim),.96) 0%,rgba(var(--scrim),.86) 30%,rgba(var(--scrim),.4) 44%,rgba(var(--scrim),0) 52%),linear-gradient(180deg,rgba(var(--scrim),.45) 0%,rgba(var(--scrim),0) 9%)}
}

.lw-arrive .in h1,.lw-arrive .in .lede,.lw-arrive .in .ch,.world-hero.lw-scened .wrap h1,.world-hero.lw-scened .wrap .lede,.world-hero.lw-scened .wrap .kicker{text-shadow:0 0 22px rgba(var(--scrim),.95),0 0 6px rgba(var(--scrim),.85)}
.lw-entry .scene{inset:0;animation:none}   
.lw-entry .lw-tag{top:20px;bottom:auto}
.lw-door .arch .img,.lw-door:hover .arch .img{filter:none}
.lw-door .arch:after{background:none}
.lw-curio img,.lw-curio:hover img,.lw-strip .ph,.lw-strip button:hover .ph{filter:none}

.lw-door-note{align-self:center;justify-self:center;min-width:0}
.lw-door-note .lw-say{margin:0}
.lw-rooms{position:relative;margin-top:72px}
.lw-rooms-h{display:flex;align-items:center;gap:20px;margin:0 0 34px}
.lw-rooms-h h3{font-family:var(--display);font-style:italic;font-weight:500;font-size:clamp(28px,3cqw,40px);line-height:1;margin:0;color:var(--gold-em);white-space:nowrap}
.lw-rooms-h:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--gold-line),rgba(201,163,90,0))}
.lw-door .no.orn{font-style:normal;font-size:15px;color:var(--gold-em)}
@container lw (max-width:720px){.lw-rooms{margin-top:52px}.lw-rooms-h{margin-bottom:24px}}

@container lw (min-width:1101px){
  .lw-arrive .scene,.world-hero.lw-scened .bg{bottom:auto!important;height:min(100%,max(520px,calc(100vh - 62px)));-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12%),linear-gradient(0deg,transparent 0,#000 6%);mask-image:linear-gradient(90deg,transparent 0,#000 12%),linear-gradient(0deg,transparent 0,#000 6%);-webkit-mask-composite:source-in;mask-composite:intersect}
}

@container lw (max-width:1100px){
  .lw-hist{display:grid}
}
@container lw (min-width:721px) and (max-width:1100px){
  .lw-arrive{min-height:0}
  .lw-arrive .scene,.world-hero.lw-scened .bg{left:0!important;right:0!important;top:0!important;bottom:auto!important;height:var(--scene-h,clamp(380px,50cqw,520px))!important;-webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%)!important;mask-image:linear-gradient(180deg,#000 84%,transparent 100%)!important}
  .lw-arrive:before,.world-hero.lw-scened:after{background:none!important}
  .lw-arrive .in{padding-top:calc(var(--scene-h,clamp(380px,50cqw,520px)) - 6px)}
  .world-hero.lw-scened{min-height:0!important}
  .world-hero.lw-scened .wrap{padding-top:calc(var(--scene-h,clamp(380px,50cqw,520px)) - 6px)!important}
  .lw-entry{height:auto;min-height:0;max-height:none}
  .lw-entry .scene,.lw-entry video{inset:0 0 auto 0;height:var(--scene-h,clamp(400px,52cqw,540px));-webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%);mask-image:linear-gradient(180deg,#000 84%,transparent 100%)}
  .lw-entry:before{background:none}
  .lw-entry .in{padding-top:calc(var(--scene-h,clamp(400px,52cqw,540px)) - 6px)}
  .lw-entry .lw-tag{right:16px;bottom:auto;top:16px}
}

@container lw (max-width:720px){
  .lw-hist{grid-template-columns:112px 1fr;gap:12px}
  .find input{min-width:0}   
  .lw-arrive .scene,.world-hero.lw-scened .bg{height:var(--scene-h,360px)!important;-webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%)!important;mask-image:linear-gradient(180deg,#000 84%,transparent 100%)!important}
  .lw-arrive .in{padding-top:calc(var(--scene-h,360px) - 6px)}
  .world-hero.lw-scened .wrap{padding-top:calc(var(--scene-h,360px) - 6px)!important}
  .lw-entry .scene,.lw-entry video{height:var(--scene-h,380px);-webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%);mask-image:linear-gradient(180deg,#000 84%,transparent 100%)}
  .lw-entry .in{padding-top:calc(var(--scene-h,380px) - 6px)}
}

.wfil{display:flex;align-items:baseline;gap:14px;margin-top:16px;flex-wrap:wrap}
.wfil .filters{margin:0}
.wfl{font-family:var(--ui);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);min-width:54px}
.wfind{display:flex;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap}
.wfind input{flex:1 1 280px;max-width:460px;font:inherit;font-family:var(--ui);font-size:15px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink)}
.wfind input:focus{outline:2px solid var(--violet,#874BF8);outline-offset:1px}
.wsec{margin-top:8px}
.wsec.clip .wcard.x{display:none}
.wsec .wmore{margin:14px 0 6px}
.wcard .wtags{display:flex;gap:6px;align-items:center;margin-top:auto;padding-top:8px}
.wcard .wtags .pill.lv{position:static}
.wcard .wt{font-family:var(--ui);font-size:10.5px;color:var(--muted);letter-spacing:.04em}
.wcard .wnow{display:block;font-family:var(--ui);font-size:12px;color:var(--burgundy,#7B2335);margin-top:2px}
.thennow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0 10px}
.thennow>div{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff}
.thennow>div:last-child{background:transparent;border-style:dashed}
.thennow b{display:block;font-family:var(--ui);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.thennow p{margin:0}
.wref{font-family:var(--ui);font-size:12.5px;color:var(--muted);margin-top:12px;line-height:1.5}
.wref b{color:var(--ink-2,var(--ink));font-weight:600}
.wref a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.wnav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:26px;padding-top:16px;border-top:1px solid var(--line)}
.wlab{margin-top:34px}
.fb .lnk{border:0;background:none;padding:0;margin-left:6px;color:var(--violet,#874BF8);font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
@container lw (max-width:720px){.thennow{grid-template-columns:1fr}.wfil{gap:6px}.wfl{min-width:0;width:100%}.wnav .meta{display:none}}
.wcard[hidden],.wsec[hidden],.wmore[hidden]{display:none!important}

img.lw-wait{background-color:rgba(120,100,70,.08)}
img.lw-img-failed{object-fit:cover;background:#EDE5D6}
.lw-bg-failed{background-size:cover!important;background-position:center!important}
.imgdebug [data-img-failed]{outline:3px dashed #D33!important;outline-offset:-3px}
.imgdebug [data-img-failed]::after{content:"IMAGE FAILED: " attr(data-img-failed);position:absolute;left:6px;bottom:6px;z-index:9;background:#D33;color:#fff;font:600 11px/1.3 system-ui;padding:3px 6px;border-radius:4px;max-width:90%}
#app{min-height:100vh}
header .tools,.tools{min-height:36px}
:host{display:block;container:lw/inline-size}
.lw{position:relative;overflow-wrap:break-word}
.lw[lang="kk"]{--ui:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;--text:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.lw [lang="kk"]{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.lw .lw-exit{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;border:1px solid var(--line);border-radius:50%;background:none;color:inherit;cursor:pointer;padding:0}
.lw .lw-exit svg{width:20px;height:20px}
.lw .lw-exit[hidden]{display:none!important}
`
