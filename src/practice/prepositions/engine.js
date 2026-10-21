'use client'

// Prepositions World — движок курса предлогов, перенесённый из прототипа
// методиста почти дословно (как «Числа» и SpeakSpin): главная с категориями,
// уроки экранами (правила, схемы, сцены), практика с картинками-сценами,
// итоги со звёздами. Экран PrepositionsPage монтирует его в Shadow DOM: классы
// прототипа (.hero, .btn, .top, .card) совпадают с глобальными классами сайта.
//
// От прототипа отличается связь с приложением и пять починок (спека, «Баги
// прототипа»):
// - данные — cfg.bundle с бэкенда (/mobile/prepositions), картинки и записи —
//   ссылками MinIO: каждая картинка — <image href=URL> на месте, а не ссылка на
//   символ из общего списка (13 МБ base64 в DOM прототипа браузер больше не
//   держит и грузит только видимое);
// - роутер — своя переменная HASH вместо адреса страницы, клики по <a href="#/…">
//   перехватываются в корне: адрес приложения не трогаем;
// - прогресс — cfg.progress (общее хранилище «Практики», progress.js):
//   читается перед каждым экраном и перед записью итога;
// - озвучка уроков — cfg.speak (Soniox через /api/tts, запасной — голос
//   устройства), записи практики — cfg.playUrl (один <audio> приложения: iOS);
// - шапка без логотипа и подвала — у экрана своя шапка приложения;
// - слушатели — через AbortController, таймеры — через later(): destroy()
//   снимает всё.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

/**
 * @param {HTMLElement} root  корень раздела в Shadow DOM, внутри — <div id="app">
 * @param {object} cfg  см. docs/superpowers/plans/2026-10-22-prepositions-world-web.md, Task 5
 */
export function mountPrepositions(root, cfg) {
const { bundle, lang = 'en', langKey = null, progress, speak: sayLesson, playUrl, stopAudio, onAnswer = () => {} } = cfg
const ac = new AbortController()
const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ac.signal })
let dead = false
const timers = new Set()
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }
let HASH = '#/'
function go(h) { HASH = h; route(); return h }

const PH={"in":"in","inside":"inside","outside":"outside","on":"on","under":"under","above":"above","over":"over","below":"below","beneath":"beneath","infront":"in front of","behind":"behind","nextto":"next to","beside":"beside","near":"near","between":"between","among":"among","into":"into","onto":"onto","out of":"out of"};
const SYN=[["in","inside"],["under","below","beneath"],["above","over"],["nextto","beside","near"],["between","among"],["into","in","inside"],["onto","on"],["out of","outside"]];
const PDEF = bundle.pdef;

/* ===== Scene engine v3: premium art, slots, geometry ===== */
const ASSET = JSON.parse(JSON.stringify(bundle.assets)); // {img,size,slots}; копия: ниже движок дописывает SLOTS
// Картинка по ключу. Ключа нет в бандле — пусто: <image href=""> браузер не запрашивает, а «undefined» уходил GET-ом к Next.
const IMG = (k) => ASSET.img[k] || '';
const MS = ASSET.size, SLOTS = ASSET.slots;
const VW = 1000, VH = 563;
/* extra slots (fractions of the object's box; y may be <0) */
SLOTS.s_saucer = {poly:[[.27,.5],[.27,.22],[.36,.07],[.5,.03],[.64,.07],[.73,.22],[.73,.5]]};
SLOTS.boat = {poly:[[.12,-3],[.88,-3],[.88,.40],[.7,.55],[.5,.60],[.3,.56],[.12,.42]], noRect:1};
(function(){ const c=[],r=.13; for(let i=0;i<24;i++){const t=i/24*6.2832; c.push([+(.575+Math.cos(t)*r).toFixed(3),+(.665+Math.sin(t)*r*1.5).toFixed(3)]);} SLOTS.u_sub={poly:c}; })();

const MASC = {
  dexter:{name:'Dexter', poses:{std:'dexter',hip:'dexter_hip',win:'dexter_win',jump:'dexter_jump',crouch:'dexter_crouch'}},
  luna:{name:'Luna', poses:{std:'luna'}},
  spark:{name:'Spark', poses:{std:'spark'}},
  aizere:{name:'Aizere', poses:{std:'aizere'}}
};
/* art metadata: n = name in sentences; deck = top surface (fraction of height); ux = x-range of that surface; under = fraction where underside begins */
const ART = {
  f_hollow:{n:'the hollow tree',cont:1}, f_mush:{n:'the mushroom',under:.5,ux:[.1,.9]}, f_rock:{n:'the rock',deck:.17,ux:[.18,.82]},
  f_log:{n:'the log',deck:.3,ux:[.12,.88]}, f_bridge:{n:'the bridge'}, f_lantern:{n:'the lantern'}, f_glow:{n:'the glowing plant'},
  s_planet:{n:'the planet'}, s_moon:{n:'the moon'}, s_sat:{n:'the satellite'}, s_saucer:{n:'the spaceship',cont:1}, s_aster:{n:'the asteroid'}, s_crystal:{n:'the crystal'},
  u_sub:{n:'the submarine',cont:1}, u_coral1:{n:'the coral'}, u_coral2:{n:'the coral'}, u_rock:{n:'the rock',deck:.1,ux:[.2,.8]}, u_chest:{n:'the treasure chest',deck:.2,ux:[.15,.85]},
  u_jelly:{n:'the jellyfish'}, u_fish:{n:'the fish'}, u_shell:{n:'the shell'}, u_weed:{n:'the seaweed'},
  c_tower:{n:'the tower'}, c_gate:{n:'the gate'}, c_bridge:{n:'the bridge'}, c_barrel:{n:'the barrel'}, c_crate:{n:'the crate',deck:.12,ux:[.1,.9]}, c_pillar:{n:'the pillar'},
  i_igloo:{n:'the igloo',cont:1}, i_block:{n:'the ice block',deck:.1,ux:[.15,.85]}, i_snowman:{n:'the snowman'}, i_penguin:{n:'the penguin'}, i_spire:{n:'the ice spire'},
  m_cave:{n:'the cave',cont:1}, m_rope:{n:'the rope bridge'}, m_balloon:{n:'the balloon',under:1}, m_sign:{n:'the sign'},
  boat:{n:'the boat',cont:1}, tent:{n:'the tent',cont:1}
};
const BGN = {forest:'bg_forest', space:'bg_space', under:'bg_under', castle:'bg_castle', ice:'bg_ice', valley:'bg_valley', sunset:'bg_sunset', sky:'bg_sky'};

/* item: id, art|m(+pose), cx, b (bottom y), w|h, z, flip, inside(container id), name */
function mkItem(s){
  const it = Object.assign({}, s);
  if(s.m){
    const key = MASC[s.m].poses[s.pose||'std'], sz = MS[key];
    it.key = key; it.kind = 'm'; it.name = MASC[s.m].name;
    it.h = s.h||190; it.w = it.h*sz[0]/sz[1];
  } else {
    const sz = MS[s.art], meta = ART[s.art]; it.key = s.art; it.kind = 'o'; it.name = s.name||meta.n; it.meta = meta;
    if(s.w){ it.w = s.w; it.h = s.w*sz[1]/sz[0]; } else { it.h = s.h; it.w = s.h*sz[0]/sz[1]; }
  }
  it.box = {x:s.cx-it.w/2, y:s.b-it.h, w:it.w, h:it.h};
  it.z = s.z==null ? s.b : s.z; it.zSet = s.z;
  return it;
}
function slotOf(it){ // absolute polygon + rect for a container
  const sl = it.meta && SLOTS[it.key]; if(!sl) return null;
  const B = it.box, poly = sl.poly.map(([x,y])=>[B.x+x*B.w, B.y+y*B.h]);
  const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]);
  return {poly, x0:Math.min(...xs), x1:Math.max(...xs), y0:Math.min(...ys), y1:Math.max(...ys)};
}
function mkScene(o){
  const sc = {bg:o.bg, items:o.items.map(mkItem), mv:o.mv||null, alt:o.alt||'', among:o.among||null};
  sc.get = id=>sc.items.find(i=>i.id===id);
  sc.items.forEach(it=>{ if(it.meta&&it.meta.cont) it.slot = slotOf(it); });
  sc.items.forEach(it=>{ if(it.inside && it.cx==null){ const c=sc.get(it.inside), s=c.slot, B=c.box;
      const bottom = c.key==='boat'? B.y+.58*B.h : c.key==='s_saucer'? s.y1-6 : s.y1-8;
      it.cx = (s.x0+s.x1)/2 + (it.dx||0); it.b = bottom + (it.dy||0);
      it.box = {x:it.cx-it.w/2, y:it.b-it.h, w:it.w, h:it.h}; it.z = c.z+.5; } });
  return sc;
}

/* ---------- geometry: does the relation hold in the picture? ---------- */
const G = {next:95, nearMin:130, nearMax:340, row:62};
const cxOf = b=>b.x+b.w/2;
function ovArea(A,B){ const w=Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x), h=Math.min(A.y+A.h,B.y+B.h)-Math.max(A.y,B.y); return w>0&&h>0?w*h:0; }
function ovX(A,B){ return Math.min(A.x+A.w,B.x+B.w)-Math.max(A.x,B.x); }
function gapX(A,B){ return Math.max(B.x-(A.x+A.w), A.x-(B.x+B.w)); }
function sameRow(a,b){ return Math.abs((a.box.y+a.box.h)-(b.box.y+b.box.h)) <= G.row; }
function relStatic(sc,a,p,b,c){
  const A=a.box, B=b.box, ax=cxOf(A), ab=A.y+A.h, bb=B.y+B.h;
  switch(p){
    case 'in': case 'inside': { const s=b.slot; return !!s && ax>s.x0 && ax<s.x1 && (A.y+A.h/2)>s.y0 && (A.y+A.h/2)<s.y1 && a.inside===b.id; }
    case 'outside': { return !!b.slot && b.meta.cont && a.inside!==b.id && gapX(A,B)>=10 && gapX(A,B)<=240 && sameRow(a,b) && a.z>=b.z-1000; }
    case 'on': { const m=b.meta; if(m.deck==null) return false; const dy=B.y+m.deck*B.h, x0=B.x+m.ux[0]*B.w, x1=B.x+m.ux[1]*B.w; return Math.abs(ab-dy)<=14 && ax>=x0 && ax<=x1; }
    case 'under': { const m=b.meta, u=B.y+(m.under!=null?m.under:1)*B.h; if(m.under==null) return false;
      const x0=B.x+(m.ux?m.ux[0]:0)*B.w, x1=B.x+(m.ux?m.ux[1]:1)*B.w; return A.y>=u-6 && A.y-bb<=200 && ax>x0 && ax<x1 && (ab<=bb+8); }
    case 'above': case 'over': return ab<=B.y-16 && B.y-ab<=240 && ovX(A,B)>0.3*Math.min(A.w,B.w);
    case 'below': case 'beneath': return A.y>=bb+14 && A.y-bb<=260 && ovX(A,B)>0.3*Math.min(A.w,B.w);
    case 'behind': return a.z<b.z && ovArea(A,B)>=0.28*A.w*A.h && !a.inside;
    case 'infront': return a.z>b.z && ovArea(A,B)>=0.28*A.w*A.h && !a.inside;
    case 'nextto': case 'beside': return sameRow(a,b) && ovX(A,B)<=2 && gapX(A,B)<=G.next && !a.inside;
    case 'near': return sameRow(a,b) && ovX(A,B)<=0 && gapX(A,B)>=G.nearMin && gapX(A,B)<=G.nearMax;
    case 'between': { if(!c) return false; const L=(B.x<c.box.x)?b:c, R=(L===b)?c:b;
      return sameRow(a,b)&&sameRow(a,c) && L.box.x+L.box.w<=A.x+10 && R.box.x>=A.x+A.w-10 && gapX(A,L.box)<=150 && gapX(A,R.box)<=150; }
    case 'among': { const others=(sc.among||[]).map(id=>sc.get(id)); if(others.length<3) return false;
      const near=others.filter(o=>gapX(A,o.box)<=210 && sameRow(a,o)); return near.length>=3 && near.some(o=>cxOf(o.box)<ax) && near.some(o=>cxOf(o.box)>ax); }
  }
  return false;
}
function relMove(sc,a,p,b){
  const mv=sc.mv; if(!mv||mv.who!==a.id) return false; const s=b.slot, B=b.box;
  const inSlot=(pt,s)=>s&&pt[0]>s.x0&&pt[0]<s.x1&&pt[1]>s.y0&&pt[1]<s.y1;
  if(p==='into') return mv.target===b.id && !a.inside && inSlot(mv.to,s);
  if(p==='out of') return mv.target===b.id && a.inside===b.id && !inSlot(mv.to,s);
  if(p==='onto'){ const m=b.meta; if(m.deck==null||mv.target!==b.id) return false; const dy=B.y+m.deck*B.h; return Math.abs(mv.to[1]-dy)<=16 && mv.to[0]>=B.x+m.ux[0]*B.w && mv.to[0]<=B.x+m.ux[1]*B.w; }
  return false;
}
const MOVE = ['into','onto','out of'];
function rel(sc,a,p,b,c){ return MOVE.includes(p) ? relMove(sc,a,p,b) : relStatic(sc,a,p,b,c); }

/* ---------- rendering ---------- */
function globalDefs(){
  // Символов картинок больше нет: каждая рисуется <image href=URL> на месте (см. шапку файла).
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="dgBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f1ff"/><stop offset="1" stop-color="#e3f1ff"/></linearGradient><marker id="dgAh" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1 L11 6 L1 11Z" fill="#5a2fc8"/></marker></defs></svg>';
}
let SUID=0;
function itemUse(it){
  const b=it.box, f = it.flip ? ` transform="translate(${2*b.x+b.w} 0) scale(-1 1)"` : '';
  const sh = (it.kind==='m'&&!it.inside&&!it.float) ? `<ellipse cx="${b.x+b.w/2}" cy="${b.y+b.h-3}" rx="${b.w*.36}" ry="8" fill="#1b0b3a" opacity=".28"/>` : '';
  return sh+`<image preserveAspectRatio="none" href="${IMG(it.key)}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"${f}/>`;
}
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function sceneSVG(sc,o){
  o=o||{}; const uid=++SUID; let defs='', layers=[];
  sc.items.forEach((it,i)=>{
    if(it.inside){ const c=sc.get(it.inside), s=c.slot, id=`cl${uid}_${i}`;
      defs+=`<clipPath id="${id}"><polygon points="${s.poly.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}"/></clipPath>`;
      layers.push({z:c.z+0.5,i,s:`<g clip-path="url(#${id})">${itemUse(it)}</g>`});
    } else layers.push({z:it.z,i,s:itemUse(it)});
  });
  layers.sort((a,b)=>a.z-b.z||a.i-b.i);
  let over='';
  const bx=id=>sc.get(id).box;
  (o.ring||[]).forEach(r=>{ const b=bx(r.id),p=10; over+=`<rect class="ring ${r.c||'a'}" x="${b.x-p}" y="${b.y-p}" width="${b.w+2*p}" height="${b.h+2*p}" rx="26"/>`; });
  (o.tags||[]).forEach(t=>{ const b=bx(t.id), txt=t.t, w=Math.max(120,txt.length*19+46), x=Math.min(VW-w-8,Math.max(8,b.x+b.w/2-w/2)), y=t.pos==='b'?Math.min(VH-58,b.y+b.h+10):Math.max(8,b.y-60);
    over+=`<g class="tag ${t.c||'a'}"><rect x="${x}" y="${y}" width="${w}" height="46" rx="23"/><text x="${x+w/2}" y="${y+32}" text-anchor="middle">${esc(txt)}</text></g>`; });
  if(sc.mv && o.arrow!==false){ const m=sc.mv, a=sc.get(m.who).box; const sx=m.from[0], sy=m.from[1], ex=m.to[0], ey=m.to[1], mx=(sx+ex)/2, my=Math.min(sy,ey)-(m.lift==null?70:m.lift);
    over+=`<path class="arrow" d="M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}" marker-end="url(#ah${uid})"/><circle class="spot" cx="${ex}" cy="${ey}" r="14"/>`;
    defs+=`<marker id="ah${uid}" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L11 6 L1 11Z" fill="#ffd23c" stroke="#7a4a00" stroke-width="1.2"/></marker>`; }
  let hot='';
  (o.hot||[]).forEach(h=>{ let r=h.rect||(()=>{const b=bx(h.id);return[b.x-6,b.y-6,b.w+12,b.h+12];})(); hot+=`<g class="hot" data-id="${h.id}" tabindex="0" role="button" aria-label="${esc(h.label||h.id)}"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="22"/></g>`; });
  const bg=BGN[sc.bg], z=MS[bg];
  return `<svg class="scene" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(o.alt||sc.alt||'Scene')}"><defs>${defs}</defs>
    <image preserveAspectRatio="none" href="${IMG(bg)}" x="0" y="0" width="${VW}" height="${VH}"/>${layers.map(l=>l.s).join('')}${over}${hot}</svg>`;
}

/* ===== Stage v5: situation pictures for every practice question =====
   pic = { bg, items:[...], widgets:[...], focus:[ids], rel:{a,p,b,c}? }
   item  = { id, m:'luna'|'dexter'|'spark'|'aizere', name?, x, h?, flip?, pose?, hold?:'phone', z? }
         | { id, p:'table', x, h|w|s?, flip?, on?:'id', under?:'id', at?:{of:'id',fx,fy}, dx?, dy?, y?, z?, air?:true }
   x = centre as a fraction of stage width (0..1). Items stand on the background's ground line unless y/on/at/air say otherwise.
   widget = { t:'clock', h, m, x, y, s? } | { t:'cal', ...} | { t:'line', ...} | { t:'daypart', v } | { t:'bubble', ps:[...], x, y, s? }
*/
const PICS=bundle.pics, PCAT=bundle.pcat;
const BGPAL = {classroom:468,livingroom:472,kitchen:482,street:480,park:478,station:472,beach:490,cafe:470,office:474,bedroom:476,forest:500,valley:500,sunset:500,sky:470,space:470,under:500,castle:500,ice:500};
Object.keys(ASSET.img).filter(k=>k.startsWith('bg_')).forEach(k=>{ BGN[k.slice(3)]=k; });
/* ---- real-world scale: heights in metres; the mascot is a ~1.15 m child ---- */
const MASC_H=170, PPM=MASC_H/1.15;
const RH={key:.12,coin:.05,ring:.04,pen:.15,pencil:.18,crayon:.09,ruler:.3,ticket:.08,card:.06,banknote:.08,envelope:.12,letter:.3,paper:.3,notebook:.22,book:.25,comic:.26,newspaper:.4,passport:.13,photo:.12,postcard:.1,map:.4,watch:.05,glasses:.05,headphones:.2,microphone:.2,toothbrush:.18,egg:.05,apple:.08,bread:.12,cheese:.08,sandwich:.08,cake:.2,popcorn:.25,cup:.1,plate:.22,knife:.25,kettle:.25,water:.15,milk_bottle:.22,medicine_bottle:.1,lightbulb:.12,magnifying_glass:.25,trophy:.3,gift:.25,football:.22,basketball:.24,ball:.3,tennis_racket:.68,hockey_stick:1.1,guitar:1.0,laptop:.3,thermometer:1.0,speech_bubble:.4,question_mark:.5,heart:.3,star:.3,arrow:.5,snowflake:.4,flag:.8,balloon:.9,umbrella:.9,scarf:.8,hat:.25,cap:.15,coat:.9,stethoscope:.5,dumbbell:.25,puzzle:.15,word_card:.15,music_note:.3,swim_ring:.6,gear:.4,chain:.4,tissue:.12,tray:.1,clipboard:.3,exam_paper:.3,gavel:.3,wrench:.3,globe:.45,school_bell:.2,lantern:.35,lamp:.5,radio:.25,chess_board:.4,puddle:.05,cone:.5,piggy_bank:.2,fuel_pump:1.5,towel:.7,blanket:.6,flowers:.4,plant:.5,spider:.15,wifi:.3,cigarette:.08,ghost:1.0,
 phone:.15,tv:.6,bag:.35,backpack:.45,briefcase:.3,suitcase:.65,basket:.35,box:.4,parcel:.35,picture_frame:.5,painting:.8,poster:.9,easel:1.6,baby:.6,toy:.3,rabbit:.3,bird:.2,fish:.3,dog:.55,cat:.3,horse:1.6,snowman:1.5,piano:1.3,stage:.5,shelf:1.8,board:1.0,whiteboard:1.1,sign:1.8,stop_sign:2.2,traffic_light:3.0,bus_stop:2.5,lamp_post:3.5,ticket_window:2.2,goal:2.4,campfire:.6,log:.5,
 chair:.9,armchair:.9,stove:.9,stairs:2.0,door:2.1,window:1.4,tent:1.6,tree:5,christmas_tree:2.5,playground:3,fence:1.2,wall:2.5,mill:6,igloo:2.2,
 desk:1.0,table:1.0,sofa:1.15,bed:1.3,bench:1.1,bicycle:1.2,car:1.7,taxi:1.7,boat:1.7,
 bus:3.2,train:4,plane:5,ship:8,house:6,building:15,bank:8,shop:5,school:8,cinema:9,hotel:10,museum:9,library:8,post_office:6,pharmacy:5,university:10,cafe:5,tower:25,bridge:6,tunnel:6,hill:10,mountain:40,lake:3,river:3,stream:2};
const DECOR={sun:96,moon:84,cloud:110,rain_cloud:120,storm_cloud:130,lightning:90,earth:100};   // sky objects: fixed on-screen size
const SCENERY=new Set(['hill','mountain','lake','river','stream','tower','building','ship','university','hotel','museum','library','cinema','school','bank','mill','bridge','tunnel','plane','train']);
const PCLASS_H = {t:64,s:104,m:160,l:200,h:300};
function pname(k){ return PCAT[k]&&PCAT[k].n || k; }
function propDims(k,o){
  const z=MS['p_'+k]; if(!z) throw new Error('unknown prop '+k);
  let w,h,far=0;
  if(o.h){ h=o.h; w=h*z[0]/z[1]; } else if(o.w){ w=o.w; h=w*z[1]/z[0]; }
  else {
    const mod=Math.max(.7,Math.min(1.3,o.s||1));
    if(DECOR[k]) h=DECOR[k]*mod;
    else {
      h=(RH[k]||.4)*PPM*mod;
      if(h<60) h=60*Math.pow(h/60,.6);                                   // tiny things stay recognisable
      const cap=SCENERY.has(k)?300:350, wcap=SCENERY.has(k)?460:400;
      let f=1; if(h>cap) f=cap/h; if(h*f*z[0]/z[1]>wcap) f=Math.min(f,wcap/(h*z[0]/z[1]));
      if(f<1){ far=Math.min(70,(1-f)*80); h*=f; }                        // bigger than the stage: push it into the background
    }
    w=h*z[0]/z[1];
  }
  return {w,h,far};
}
function mkPic(spec){
  const gy=BGPAL[spec.bg]||480, items=[], byId={};
  const add=(o)=>{ const it=o; byId[o.id]=it; items.push(it); return it; };
  // pass 1: free-standing items; pass 2: relative ones
  const rel=[], free=[];
  (spec.items||[]).forEach(s=>{ ((s.on||s.under||s.at||s.inside)?rel:free).push(s); });
  const build=(s)=>{
    let it;
    if(s.m){
      const key=MASC[s.m].poses[s.pose||'std'], sz=MS[key], h=Math.max(90,Math.min(MASC_H,s.h||MASC_H));
      it={id:s.id,kind:'m',m:s.m,key,name:MASC[s.m].name,tag:(s.name&&String(s.name).toLowerCase()===MASC[s.m].name.toLowerCase())?MASC[s.m].name:null,h,w:h*sz[0]/sz[1],flip:!!s.flip,hold:s.hold||null};
    } else {
      const d=propDims(s.p,s); it={id:s.id,kind:'o',p:s.p,key:'p_'+s.p,name:pname(s.p),w:d.w,h:d.h,far:d.far,flip:!!s.flip,meta:ART['p_'+s.p]||{},label:s.label||null};
    }
    it.fx=s.x==null?.5:s.x; it.cxs=it.fx*VW; it.b=(s.y!=null?s.y:gy-(it.far||0))+(s.dy||0); it.zs=s.z; it.air=!!s.air;
    return it;
  };
  free.forEach(s=>{ const it=build(s); it.cx=it.cxs+(s.dx||0); it.box={x:it.cx-it.w/2,y:it.b-it.h,w:it.w,h:it.h}; it.z=s.z==null?it.b:s.z; add(it); });
  rel.forEach(s=>{
    const it=build(s); const deckOf=(t)=>{ const c=PCAT[t.p||'']||{}; return c.deck==null?.2:c.deck; };
    if(s.on){ const t=byId[s.on]; if(!t) throw new Error('on: unknown '+s.on);
      const ux=(s.ox==null?.5:s.ox); it.cx=t.box.x+t.box.w*(PCAT[t.p||'']&&PCAT[t.p].ux?(PCAT[t.p].ux[0]+(PCAT[t.p].ux[1]-PCAT[t.p].ux[0])*ux):ux)+(s.dx||0);
      it.b=t.box.y+t.box.h*deckOf(t)+(s.dy||0); it.z=s.z==null?t.z+.5:s.z; }
    else if(s.under){ const t=byId[s.under]; if(!t) throw new Error('under: unknown '+s.under);
      it.cx=t.box.x+t.box.w*(s.ox==null?.5:s.ox)+(s.dx||0); it.b=(s.y!=null?s.y:gy)+(s.dy||0); it.z=s.z==null?t.z-.5:s.z; }
    else if(s.at){ const t=byId[s.at.of]; if(!t) throw new Error('at: unknown '+s.at.of);
      it.cx=t.box.x+t.box.w*s.at.fx+(s.dx||0); it.b=t.box.y+t.box.h*s.at.fy+it.h/2+(s.dy||0); it.z=s.z==null?t.z+.5:s.z; }
    else if(s.inside){ const t=byId[s.inside]; if(!t) throw new Error('inside: unknown '+s.inside);
      it.cx=t.box.x+t.box.w*(s.ox==null?.5:s.ox)+(s.dx||0); it.b=t.box.y+t.box.h*(s.fy==null?.8:s.fy)+(s.dy||0); it.z=s.z==null?t.z-.5:s.z; it.sunk=true; }
    it.box={x:it.cx-it.w/2,y:it.b-it.h,w:it.w,h:it.h}; add(it);
  });
  // held props attach after everything is placed
  items.filter(i=>i.kind==='m'&&i.hold).forEach(m=>{
    const k=m.hold, d0=propDims(k,{}), hh=Math.min(d0.h,64), d={w:hh*d0.w/d0.h,h:hh};
    const side=m.flip?-1:1; const hid=m.id+'_held';
    const it={id:hid,kind:'o',p:k,key:'p_'+k,name:pname(k),w:d.w,h:d.h,flip:false,meta:{},held:m.id};
    it.cx=m.box.x+m.box.w*(.5+side*.34); it.b=m.box.y+m.box.h*.74; it.box={x:it.cx-it.w/2,y:it.b-it.h,w:it.w,h:it.h}; it.z=m.z+.3; add(it);
  });
  return {bg:spec.bg,items,widgets:spec.widgets||[],focus:spec.focus||[],alt:spec.alt||'',pic:true,gy};
}

/* ---------- widgets (drawn in code, plush palette) ---------- */
const WC={cream:'#fff8ea',purple:'#7a4cc8',purple2:'#a98be6',teal:'#2fb6a8',gold:'#ffc83d',ink:'#2a1a4d',red:'#e8505b',wood:'#b9824b'};
function wClock(w,uid){
  const s=w.s||1, R=74*s, cx=w.x*VW, cy=w.y*VH; const h=(w.h%12)+(w.m||0)/60, m=w.m||0;
  const ah=(h/12)*360, am=(m/60)*360; let ticks='';
  for(let i=0;i<12;i++){ const a=i*30*Math.PI/180, r1=R*.82, r2=R*(i%3===0?.68:.74); ticks+=`<line x1="${(cx+Math.sin(a)*r1).toFixed(1)}" y1="${(cy-Math.cos(a)*r1).toFixed(1)}" x2="${(cx+Math.sin(a)*r2).toFixed(1)}" y2="${(cy-Math.cos(a)*r2).toFixed(1)}" stroke="${WC.purple}" stroke-width="${i%3===0?5:3}" stroke-linecap="round"/>`; }
  const nums=[[12,0],[3,90],[6,180],[9,270]].map(([n,a])=>{const r=R*.56, x=cx+Math.sin(a*Math.PI/180)*r, y=cy-Math.cos(a*Math.PI/180)*r+8*s; return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${22*s}" font-weight="800" fill="${WC.ink}">${n}</text>`;}).join('');
  const dig=w.digital?`<g><rect x="${cx-48*s}" y="${cy+R+10}" width="${96*s}" height="${30*s}" rx="${15*s}" fill="${WC.ink}"/><text x="${cx}" y="${cy+R+32*s}" text-anchor="middle" font-size="${20*s}" font-weight="800" fill="#bff7ee">${w.h%12===0?12:w.h%12}:${String(m).padStart(2,'0')}</text></g>`:'';
  return `<g class="wd clock" data-w="clock"><circle cx="${cx}" cy="${cy+5}" r="${R+12}" fill="#1b0b3a" opacity=".22"/><circle cx="${cx}" cy="${cy}" r="${R+10}" fill="${WC.purple}"/><circle cx="${cx}" cy="${cy}" r="${R+3}" fill="${WC.teal}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="${WC.cream}"/>${ticks}${nums}
   <g class="hand hh" style="transform-origin:${cx}px ${cy}px;--to:${ah}deg"><line x1="${cx}" y1="${cy+6*s}" x2="${cx}" y2="${cy-R*.46}" stroke="${WC.ink}" stroke-width="${8*s}" stroke-linecap="round"/></g>
   <g class="hand mh" style="transform-origin:${cx}px ${cy}px;--to:${am}deg"><line x1="${cx}" y1="${cy+8*s}" x2="${cx}" y2="${cy-R*.68}" stroke="${WC.purple}" stroke-width="${5.5*s}" stroke-linecap="round"/></g>
   <circle cx="${cx}" cy="${cy}" r="${6*s}" fill="${WC.gold}" stroke="${WC.ink}" stroke-width="2"/>${dig}</g>`;
}
const MONTHS={January:31,February:28,March:31,April:30,May:31,June:30,July:31,August:31,September:30,October:31,November:30,December:31};
const WDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function wCal(w){
  const s=w.s||1, cx=w.x*VW, cy=w.y*VH, W=210*s, H=190*s, x0=cx-W/2, y0=cy-H/2; let out=`<g class="wd cal" data-w="cal"><rect x="${x0+5}" y="${y0+8}" width="${W}" height="${H}" rx="${18*s}" fill="#1b0b3a" opacity=".22"/><rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${18*s}" fill="${WC.cream}" stroke="${WC.purple}" stroke-width="3"/><path d="M${x0} ${y0+36*s} V${y0+18*s} a${18*s} ${18*s} 0 0 1 ${18*s} -${18*s} H${x0+W-18*s} a${18*s} ${18*s} 0 0 1 ${18*s} ${18*s} V${y0+36*s}Z" fill="${WC.purple}"/>`;
  out+=`<circle cx="${x0+36*s}" cy="${y0-4*s}" r="${7*s}" fill="${WC.gold}"/><circle cx="${x0+W-36*s}" cy="${y0-4*s}" r="${7*s}" fill="${WC.gold}"/>`;
  const title=w.month?w.month:(w.weekday?'This week':'Calendar'); out+=`<text x="${cx}" y="${y0+27*s}" text-anchor="middle" font-size="${19*s}" font-weight="800" fill="#fff">${title}${w.year?' '+w.year:''}</text>`;
  if(w.month&&!w.weekOnly){ // month grid
    const dim=MONTHS[w.month]||30, start=w.start==null?3:w.start; const cw=W/7, rh=(H-58*s)/6;
    WDAYS.forEach((d,i)=>{ out+=`<text x="${x0+cw*i+cw/2}" y="${y0+52*s}" text-anchor="middle" font-size="${10*s}" font-weight="700" fill="${WC.purple2}">${d[0]}</text>`; });
    for(let d=1;d<=dim;d++){ const idx=start+d-1, r=Math.floor(idx/7), c=idx%7, x=x0+cw*c+cw/2, y=y0+64*s+rh*r+rh/2; const hot=(w.day===d)||(w.days&&w.days.includes(d));
      out+=hot?`<circle class="hotday" cx="${x}" cy="${y-3*s}" r="${11*s}" fill="${WC.red}"/><text x="${x}" y="${y+2*s}" text-anchor="middle" font-size="${12*s}" font-weight="800" fill="#fff">${d}</text>`:`<text x="${x}" y="${y+1*s}" text-anchor="middle" font-size="${11*s}" font-weight="600" fill="${WC.ink}">${d}</text>`; }
  } else { // week strip
    const cw=W/7; WDAYS.forEach((d,i)=>{ const hot=w.weekday&&d===w.weekday.slice(0,3); const x=x0+cw*i+cw/2, y=y0+H/2+14*s;
      out+=`<rect x="${x0+cw*i+3}" y="${y-38*s}" width="${cw-6}" height="${76*s}" rx="${9*s}" fill="${hot?WC.red:'#f1eaff'}"${hot?' class="hotday"':''}/><text x="${x}" y="${y-6*s}" text-anchor="middle" font-size="${13*s}" font-weight="800" fill="${hot?'#fff':WC.ink}">${d}</text>${w.weekdays&&w.weekdays.includes(d)?`<circle cx="${x}" cy="${y+18*s}" r="${6*s}" fill="${WC.teal}"/>`:''}`; }); }
  return out+'</g>';
}
function wLine(w){
  const s=w.s||1, cx=w.x*VW, cy=w.y*VH, W=(w.w||560)*s, x0=cx-W/2; const T=w.marks||[]; let out=`<g class="wd line" data-w="line"><rect x="${x0-18}" y="${cy-52*s}" width="${W+36}" height="${104*s}" rx="${22*s}" fill="${WC.cream}" opacity=".94" stroke="${WC.purple}" stroke-width="3"/>`;
  const span=w.span; if(span){ out+=`<rect class="spanbar" x="${x0+W*span[0]}" y="${cy-9*s}" width="${W*(span[1]-span[0])}" height="${18*s}" rx="${9*s}" fill="${WC.teal}"/>`; }
  out+=`<line x1="${x0}" y1="${cy}" x2="${x0+W}" y2="${cy}" stroke="${WC.purple}" stroke-width="${5*s}" stroke-linecap="round" marker-end="url(#dgAh)"/>`;
  T.forEach(t=>{ const x=x0+W*t.at; out+=`<circle cx="${x}" cy="${cy}" r="${t.big?12*s:8*s}" fill="${t.c||WC.gold}" stroke="${WC.ink}" stroke-width="2.5"/><text x="${x}" y="${cy+(t.up?-24*s:36*s)}" text-anchor="middle" font-size="${15*s}" font-weight="800" fill="${WC.ink}">${esc(t.l||'')}</text>`; });
  return out+'</g>';
}
function wDaypart(w){
  const s=w.s||1, cx=w.x*VW, cy=w.y*VH, W=170*s, H=120*s, x0=cx-W/2, y0=cy-H/2, v=w.v;
  const G={winter:['#e3f3ff','#a9d4ff'],summer:['#fff0a8','#ffb347'],spring:['#dcf7cc','#8fd37c'],autumn:['#ffd9a0','#e08a3c'],morning:['#ffd9a8','#ffb36b'],afternoon:['#bfe8ff','#7cc6ff'],evening:['#ff9ec0','#8b5fc7'],night:['#2c2a6b','#171447'],noon:['#d6f1ff','#8ad2ff'],midnight:['#2c2a6b','#171447']}[v]||['#cfe','#9dd'];
  const sp=(v==='night'||v==='midnight')?'moon':(v==='winter'?'snowflake':'sun'); const id='dp'+(++SUID);
  return `<g class="wd dpart" data-w="daypart"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G[0]}"/><stop offset="1" stop-color="${G[1]}"/></linearGradient><clipPath id="${id}c"><rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${20*s}"/></clipPath></defs>
   <rect x="${x0+4}" y="${y0+7}" width="${W}" height="${H}" rx="${20*s}" fill="#1b0b3a" opacity=".22"/><rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${20*s}" fill="url(#${id})"/>
   <g clip-path="url(#${id}c)"><image preserveAspectRatio="none" href="${IMG('p_'+sp)}" x="${x0+W*.5-34*s}" y="${y0+(v==='evening'?H*.45:v==='morning'?H*.42:H*.12)}" width="${68*s}" height="${68*s}"/><rect x="${x0}" y="${y0+H*.82}" width="${W}" height="${H*.2}" fill="#2e7d5b"/></g>
   <rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${20*s}" fill="none" stroke="#fff" stroke-width="3"/><text x="${cx}" y="${y0+H-8*s}" text-anchor="middle" font-size="${15*s}" font-weight="800" fill="#fff" stroke="#2a1a4d" stroke-width="3" paint-order="stroke">${esc(w.label||v)}</text></g>`;
}
function wBubble(w){
  const s=w.s||1, cx=w.x*VW, cy=w.y*VH, W=(w.w||150)*s, H=(w.h||120)*s, x0=cx-W/2, y0=cy-H/2, tail=w.tail==='l'?-1:1; const ps=w.ps||[]; const n=ps.length||1;
  let inner=''; ps.forEach((p,i)=>{ const z=MS['p_'+p]; const hh=Math.min(H*.72, 120*s), ww=hh*z[0]/z[1]; const x=x0+W*(i+.5)/n-Math.min(ww,W/n*.9)/2, k=Math.min(1,(W/n*.9)/ww); inner+=`<image preserveAspectRatio="none" href="${IMG('p_'+p)}" x="${x}" y="${cy-hh*k/2-4*s}" width="${ww*k}" height="${hh*k}"/>`; });
  return `<g class="wd bub" data-w="bubble"><path d="M${x0+W*.5-14*s} ${y0+H-2} L${cx+tail*W*.28} ${y0+H+26*s} L${x0+W*.5+16*s} ${y0+H-2}Z" fill="#fff" stroke="${WC.purple2}" stroke-width="3"/><rect x="${x0}" y="${y0}" width="${W}" height="${H}" rx="${28*s}" fill="#fff" stroke="${WC.purple2}" stroke-width="3"/>${inner}${w.mark?`<text x="${x0+W-14*s}" y="${y0+24*s}" text-anchor="end" font-size="${26*s}" font-weight="900" fill="${WC.red}">${esc(w.mark)}</text>`:''}</g>`;
}
function wRoute(w){ // dotted route with arrow: pts [[x,y],...] in fractions
  const p=w.pts.map(([x,y])=>[x*VW,y*VH]); let d='M'+p[0].join(' '); for(let i=1;i<p.length;i++){ const [x0,y0]=p[i-1],[x1,y1]=p[i]; d+=` Q${(x0+x1)/2} ${Math.min(y0,y1)-(w.lift==null?50:w.lift)} ${x1} ${y1}`; }
  return `<g class="wd route"><path d="${d}" fill="none" stroke="${WC.gold}" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 16" opacity=".95"/><path d="${d}" fill="none" stroke="${WC.ink}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 16" opacity=".35"/><path class="arrow" d="${d}" marker-end="url(#dgAh)" stroke-width="0" fill="none"/></g>`;
}
function widgetSVG(w){ switch(w.t){ case 'clock': return wClock(w); case 'cal': return wCal(w); case 'line': return wLine(w); case 'daypart': return wDaypart(w); case 'bubble': return wBubble(w); case 'route': return wRoute(w); } return ''; }

/* ---------- render a pic ---------- */
function picSVG(sc,o){
  o=o||{}; const uid=++SUID; let layers=[], defs='';
  sc.items.forEach((it,i)=>{ layers.push({z:it.z,i,s:picItem(it,uid)}); });
  layers.sort((a,b)=>a.z-b.z||a.i-b.i);
  const bgk=BGN[sc.bg]||'bg_forest';
  const wd=(sc.widgets||[]).map(widgetSVG).join('');
  let hot='';
  sc.items.filter(it=>!it.held).forEach(it=>{ const b=it.box; hot+=`<g class="hot" data-id="${it.id}" tabindex="0" role="button" aria-label="${esc(it.name)}"><rect x="${b.x-4}" y="${b.y-4}" width="${b.w+8}" height="${b.h+8}" rx="20"/></g>`; });
  const tags=sc.items.filter(it=>it.tag).map(it=>{ const b=it.box, w=Math.max(70,it.tag.length*15+34), x=Math.min(VW-w-6,Math.max(6,b.x+b.w/2-w/2)), y=Math.max(8,b.y-6); return `<g class="ntag"><rect x="${x}" y="${y-30}" width="${w}" height="34" rx="17"/><text x="${x+w/2}" y="${y-7}" text-anchor="middle">${esc(it.tag)}</text></g>`; }).join('');
  return `<svg class="scene pic" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(o.alt||sc.alt||'Picture')}"><defs>${defs}</defs><image preserveAspectRatio="none" href="${IMG(bgk)}" x="0" y="0" width="${VW}" height="${VH}"/><g class="lay">${layers.map(l=>l.s).join('')}</g>${wd}${tags}<g class="ov"></g>${hot}</svg>`;
}
function picItem(it,uid){
  const b=it.box, f=it.flip?` transform="translate(${2*b.x+b.w} 0) scale(-1 1)"`:'';
  const sh=(it.kind==='m'&&!it.air&&!it.sunk)||(it.kind==='o'&&it.h>110&&!it.air&&!it.held&&it.b>400)?`<ellipse class="shd" cx="${b.x+b.w/2}" cy="${b.y+b.h-3}" rx="${b.w*(it.kind==='m'?.34:.4)}" ry="${it.kind==='m'?8:7}" fill="#1b0b3a" opacity=".26"/>`:'';
  return `<g class="it ${it.kind==='m'?'mas':'obj'}" data-id="${it.id}" style="transform-origin:${b.x+b.w/2}px ${b.y+b.h}px">${sh}<image preserveAspectRatio="none" href="${IMG(it.key)}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"${f}/></g>`;
}

/* ---------- geometry check for authored relations (bounding boxes) ---------- */
function relPic(sc,a,p,b,c){
  const A=sc.items.find(i=>i.id===a), B=sc.items.find(i=>i.id===b), C=c&&sc.items.find(i=>i.id===c); if(!A||!B) return null;
  const x=A.box, y=B.box, ax=x.x+x.w/2, bx=y.x+y.w/2, ov=Math.min(x.x+x.w,y.x+y.w)-Math.max(x.x,y.x), gap=Math.max(y.x-(x.x+x.w),x.x-(y.x+y.w),0);
  switch(p){
    case 'on': return Math.abs((x.y+x.h)-(y.y+y.h*((PCAT[B.p]||{}).deck==null?.2:PCAT[B.p].deck)))<26 && ov>x.w*.3;
    case 'above': case 'over': return (x.y+x.h)<=y.y+12 && ov>0;
    case 'under': case 'below': return x.y>=y.y+y.h*.2 && ov>x.w*.5 && A.z<=B.z;
    case 'behind': return A.z<B.z && ov>0; case 'in front of': return A.z>B.z && ov>0;
    case 'next to': case 'beside': return gap<130 && Math.abs((x.y+x.h)-(y.y+y.h))<90;
    case 'near': return gap<340 && gap>0; case 'by': return gap<200;
    case 'between': { if(!C) return false; const L=Math.min(bx,C.box.x+C.box.w/2), R=Math.max(bx,C.box.x+C.box.w/2); return ax>L&&ax<R; }
    case 'opposite': return Math.abs(ax-bx)>320; case 'at': case 'in': case 'inside': return true;
  } return null;
}

/* ===== Scene library: every scene is built from real art; relations are validated by geometry ===== */
const M=(id,m,cx,b,h,o)=>Object.assign({id,m,cx,b,h},o||{});
const A=(id,art,cx,b,w,o)=>Object.assign({id,art,cx,b,w},o||{});
const SC = {};
const def=(id,bg,items,o)=>{ SC[id]=mkScene(Object.assign({bg,items},o||{})); SC[id].id=id; };

/* ---------- ENCHANTED FOREST (Aizere, Dexter) ---------- */
def('f_in','forest',[A('t','f_hollow',330,505,360), A('rock','f_rock',700,512,190), A('mush','f_mush',880,520,150), M('a','aizere',null,null,150,{inside:'t'})]);
def('f_out','forest',[A('tent','tent',690,512,340), A('rock','f_rock',150,514,150), M('a','aizere',330,508,190)]);
def('f_onrock','forest',[A('rock','f_rock',500,508,300), A('log','f_log',850,516,250), M('a','aizere',500,320,170,{z:900})]);
def('f_onlog','forest',[A('log','f_log',520,512,420), A('rock','f_rock',870,514,170), A('mush','f_mush',150,520,150), M('a','aizere',480,355,170,{z:900})]);
def('f_under','forest',[A('mush','f_mush',540,516,420), A('rock','f_rock',890,514,150), M('a','aizere',438,512,170)]);
def('f_over','forest',[A('log','f_log',500,512,400), A('mush','f_mush',160,520,140), M('d','dexter',500,268,200,{pose:'jump',float:1})]);
def('f_among','forest',[A('m1','f_mush',230,505,130), A('m2','f_mush',350,518,130), A('m3','f_mush',660,518,130), A('m4','f_mush',780,505,130), M('a','aizere',505,512,175)],{among:['m1','m2','m3','m4']});
def('f_intent','forest',[A('t','f_hollow',220,508,300), A('tent','tent',720,512,340), M('a','aizere',null,null,150,{inside:'tent'})]);
def('f_ontent','forest',[A('t','f_hollow',220,508,300), A('rock','f_rock',560,512,200), A('tent','tent',800,512,300), M('a','aizere',560,(512-153)+.17*153,160,{z:900})]);

/* ---------- SPACE (Luna) ---------- */
def('sp_above','space',[A('moon','s_moon',190,330,150,{float:1}), A('pl','s_planet',560,440,320,{float:1}), M('l','luna',560,205,150,{float:1})]);
def('sp_below','space',[A('sh','s_saucer',520,260,380,{float:1}), A('sat','s_sat',170,200,170,{float:1}), M('l','luna',520,500,185)]);
def('sp_in','space',[A('sh','s_saucer',520,440,440), A('moon','s_moon',150,300,150,{float:1}), M('l','luna',null,null,108,{inside:'sh'})]);
def('sp_front','space',[A('moon','s_moon',520,420,270,{float:1}), A('sat','s_sat',200,210,170,{float:1}), M('l','luna',520,500,190)]);
def('sp_behind','space',[A('pl','s_planet',470,470,380), A('sat','s_sat',850,220,160,{float:1}), M('l','luna',705,478,190,{z:300})]);
def('sp_next','space',[A('cr','s_crystal',640,500,95), A('sat','s_sat',250,230,170,{float:1}), M('l','luna',530,505,190)]);
def('sp_near','space',[A('sh','s_saucer',770,505,300), A('cr','s_crystal',90,505,80), M('l','luna',370,505,185)]);
def('sp_between','space',[A('cr','s_crystal',330,505,95), A('ast','s_aster',690,510,190), M('l','luna',510,508,185)]);

/* ---------- UNDERWATER (Spark) ---------- */
def('un_in','under',[A('sub','u_sub',520,350,460,{float:1}), A('chest','u_chest',160,520,150), M('s','spark',null,null,84,{inside:'sub'})]);
def('un_below','under',[A('sub','u_sub',520,255,400,{float:1}), A('jelly','u_jelly',130,330,110,{float:1}), M('s','spark',520,510,180)]);
def('un_front','under',[A('co','u_coral1',500,505,230), A('chest','u_chest',170,520,150), M('s','spark',500,525,180)]);
def('un_behind','under',[A('rock','u_rock',470,510,230), A('shell','u_shell',840,520,120), M('s','spark',590,500,190,{z:300})]);
def('un_next','under',[A('chest','u_chest',620,515,190), A('co','u_coral2',180,505,190), M('s','spark',455,520,185)]);
def('un_near','under',[A('sub','u_sub',770,520,330), A('co','u_coral2',90,510,160), M('s','spark',380,520,185)]);
def('un_between','under',[A('c1','u_coral1',280,515,190), A('c2','u_coral2',730,515,200), M('s','spark',505,520,185)]);
def('un_among','under',[A('w1','u_weed',200,512,110), A('w2','u_weed',350,520,110), A('w3','u_weed',690,520,110), A('w4','u_weed',830,512,110), M('s','spark',520,520,185)],{among:['w1','w2','w3','w4']});

/* ---------- CASTLE (Aizere) ---------- */
def('ca_next','castle',[A('bar','c_barrel',600,505,140), A('tw','c_tower',860,500,95), M('a','aizere',440,508,185)]);
def('ca_beside','castle',[A('cr','c_crate',660,510,210), A('pil','c_pillar',130,505,70), M('a','aizere',487,512,185)]);
def('ca_near','castle',[A('gate','c_gate',770,505,300), A('bar','c_barrel',120,510,120), M('a','aizere',400,512,185)]);
def('ca_between','castle',[A('bar','c_barrel',350,505,140), A('cr','c_crate',690,510,200), M('a','aizere',515,512,185)]);
def('ca_behind','castle',[A('bar','c_barrel',500,512,230), A('pil','c_pillar',860,505,70), M('a','aizere',590,505,185,{z:300})]);
def('ca_front','castle',[A('tw','c_tower',500,505,120), A('bar','c_barrel',190,510,130), M('a','aizere',500,528,185)]);
def('ca_on','castle',[A('cr','c_crate',520,512,260), A('bar','c_barrel',850,510,130), M('a','aizere',520,(512-230)+.12*230,175,{z:900})]);
def('ca_among','castle',[A('b1','c_barrel',200,505,115), A('b2','c_crate',360,512,140), A('b3','c_barrel',660,510,115), A('b4','c_crate',820,512,140), M('a','aizere',510,512,180)],{among:['b1','b2','b3','b4']});

/* ---------- ICE KINGDOM (Dexter) ---------- */
def('ic_in','ice',[A('ig','i_igloo',560,512,390), A('sn','i_snowman',170,520,150), M('d','dexter',null,null,150,{inside:'ig'})]);
def('ic_out','ice',[A('ig','i_igloo',640,512,390), A('bl','i_block',905,520,140), M('d','dexter',null,null,150,{inside:'ig'})],{mv:{who:'d',kind:'out of',target:'ig',from:[640,380],to:[300,470],lift:90}});
def('ic_into','ice',[A('ig','i_igloo',650,512,390), A('bl','i_block',910,520,140), M('d','dexter',250,512,190,{pose:'hip'})],{mv:{who:'d',target:'ig',from:[320,400],to:[654,440],lift:90}});
def('ic_onto','ice',[A('ig','i_igloo',860,512,300), A('bl','i_block',560,515,210), M('d','dexter',250,515,190)],{mv:{who:'d',target:'bl',from:[320,400],to:[560,515-210+.1*210],lift:90}});
def('ic_next','ice',[A('sn','i_snowman',640,520,150), A('pg','i_penguin',880,520,110), M('d','dexter',470,520,190,{pose:'hip'})]);
def('ic_between','ice',[A('sn','i_snowman',350,520,150), A('pg','i_penguin',690,520,120), M('d','dexter',520,520,190)]);
def('ic_behind','ice',[A('bl','i_block',480,520,250), A('sn','i_snowman',860,520,150), M('d','dexter',590,515,190,{z:300})]);
def('ic_on','ice',[A('bl','i_block',520,520,250), A('sp','i_spire',150,520,70), M('d','dexter',520,(520-250)+.1*250,175,{z:900})]);
def('ic_under','ice',[A('sn','i_snowman',200,520,150), M('d','dexter',600,520,190)]);

/* ---------- MOUNTAINS & SKY finale (all four mascots) ---------- */
def('fi_below','sunset',[A('bal','m_balloon',520,290,160,{float:1}), A('sign','m_sign',150,500,100), M('l','luna',520,505,185)]);
def('fi_in','valley',[A('cave','m_cave',560,505,380), A('sign','m_sign',210,505,110), M('s','spark',null,null,150,{inside:'cave'})]);
def('fi_out','valley',[A('cave','m_cave',300,505,380), A('sign','m_sign',760,505,110), M('s','spark',640,510,190)]);
def('fi_on','sunset',[A('rock','f_rock',500,508,270), A('sign','m_sign',860,505,100), M('d','dexter',500,(508-206)+.17*206,170,{z:900})]);
def('fi_front','valley',[A('rock','f_rock',500,508,260), A('sign','m_sign',150,505,100), M('a','aizere',500,530,185)]);
def('fi_over','sunset',[A('rock','f_rock',500,510,280), A('sign','m_sign',140,505,100), M('d','dexter',500,270,200,{pose:'jump',float:1})]);
def('fi_between','valley',[A('rock','f_rock',330,510,190), A('sign','m_sign',700,505,110), M('l','luna',510,512,185)]);
def('fi_beside','sunset',[A('rock','f_rock',650,510,200), A('bal','m_balloon',180,290,120,{float:1}), M('s','spark',440,512,185)]);

SC.f_among.amongName='the mushrooms'; SC.ca_among.amongName='the barrels and crates';

def('un_behindco','under',[A('co','u_coral1',500,505,230), A('chest','u_chest',170,520,150), M('s','spark',590,498,185,{z:300})]);

/* ===== Sentences and question building (all truth comes from geometry) ===== */
const cap = s=>s.charAt(0).toUpperCase()+s.slice(1);
function nameOf(sc,id){ return sc.get(id).name; }
function sentence(scId,a,p,b,c,verb){
  const sc=SC[scId], A=cap(nameOf(sc,a));
  let B = p==='among' && sc.amongName ? sc.amongName : nameOf(sc,b);
  if(c) B += ' and '+nameOf(sc,c);
  if(MOVE.includes(p)){ const v = verb || (p==='out of'?'coming':'going'); return `${A} is ${v} ${PH[p]} ${B}.`; }
  return `${A} is ${PH[p]} ${B}.`;
}
function trueSet(sc,a,b,c,pool){ return pool.filter(p=>rel(sc,sc.get(a),p,sc.get(b),c?sc.get(c):null)); }
function syns(p){ const out=new Set([p]); SYN.forEach(g=>{ if(g.includes(p)) g.forEach(x=>out.add(x)); }); if(p==='on'){out.add('above');out.add('over');} return out; }
function pickBad(sc,a,p,b,c,pool,n){
  const tr=trueSet(sc,a,b,c,MOVE.includes(p)?MOVE:Object.keys(PH)); const ban=new Set(); [p,...tr].forEach(t=>syns(t).forEach(x=>ban.add(x)));
  const cont=id=>{ const m=sc.get(id).meta; return !!(m&&m.cont); };
  const sensible=(x,id)=>{ if(['in','inside','into','out of','outside'].includes(x)&&!cont(id)) return false; if(x==='onto'&&!(sc.get(id).meta&&sc.get(id).meta.deck!=null)) return false; return true; };
  let cand=pool.filter(x=>!ban.has(x) && MOVE.includes(x)===MOVE.includes(p) && sensible(x,b)).filter(x=>x!=='between'||c).filter(x=>x!=='among'||p==='among')
    .map(x=>({p:x,b,c}));
  if(MOVE.includes(p)){ sc.items.filter(o=>o.id!==a&&o.id!==b).forEach(o=>MOVE.forEach(x=>{ if(sensible(x,o.id)&&!rel(sc,sc.get(a),x,o,null)) cand.push({p:x,b:o.id}); })); }
  return shuffle(cand).slice(0,n);
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }


/* ===== Schematic diagrams (SVG) for time, route and relation lessons ===== */
const DG = (()=>{
  const P={ink:'#1d1538',v:'#5a2fc8',v2:'#8a5cff',g:'#ffc83c',t:'#0b8f84',pk:'#e8458b',bl:'#2b7de9',soft:'#e9e2fb',line:'#9a8bd0',ok:'#17a86a'};
  const T=(x,y,s,o)=>{o=o||{};return `<text x="${x}" y="${y}" text-anchor="${o.a||'middle'}" font-size="${o.s||20}" font-weight="${o.w||700}" fill="${o.f||P.ink}" font-family="Inter,'Segoe UI',system-ui,sans-serif">${s}</text>`;};
  const svg=(inner,alt)=>`<svg class="diag" viewBox="0 0 720 260" role="img" aria-label="${alt}"><rect width="720" height="260" rx="18" fill="url(#dgBg)"/>${inner}</svg>`;
  const actor=(k,x,b,h)=>{const s=MS[k],w=h*s[0]/s[1];return `<image preserveAspectRatio="none" href="${IMG(k)}" x="${x-w/2}" y="${b-h}" width="${w}" height="${h}"/>`;};
  const arrow=(d,c,dash)=>`<path d="${d}" fill="none" stroke="${c||P.v}" stroke-width="6" stroke-linecap="round" ${dash?'stroke-dasharray="2 12"':''} marker-end="url(#dgAh)"/>`;
  const dot=(x,y,c,r)=>`<circle cx="${x}" cy="${y}" r="${r||11}" fill="${c||P.v}" stroke="#fff" stroke-width="3"/>`;
  const line=(y)=>`<line x1="40" y1="${y}" x2="676" y2="${y}" stroke="${P.line}" stroke-width="6" stroke-linecap="round"/><path d="M676 ${y-12}l18 12-18 12z" fill="${P.line}"/>`;
  const bar=(x1,x2,y,c,h)=>`<rect x="${x1}" y="${y-(h||14)/2}" width="${x2-x1}" height="${h||14}" rx="${(h||14)/2}" fill="${c}"/>`;
  const box=(x,y,w,h,f,s)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${f}" ${s?`stroke="${s}" stroke-width="3"`:''}/>`;
  const ground=(y)=>`<rect x="0" y="${y}" width="720" height="${260-y}" fill="#bfe9a8"/><rect x="0" y="${y}" width="720" height="8" fill="#9fd488"/>`;
  const house=(x,b,w,c)=>`<rect x="${x-w/2}" y="${b-w*0.7}" width="${w}" height="${w*0.7}" fill="${c||'#ffd9a8'}" stroke="#b26b2a" stroke-width="3"/><path d="M${x-w/2-8} ${b-w*0.7} L${x} ${b-w*1.15} L${x+w/2+8} ${b-w*0.7}Z" fill="#e8458b" stroke="#a02060" stroke-width="3"/><rect x="${x-w*0.1}" y="${b-w*0.38}" width="${w*0.2}" height="${w*0.38}" fill="#7a4a1f"/>`;
  const clock=(cx,cy,r,h,m,lab)=>{const a=(v,l)=>[cx+Math.sin(v)*l,cy-Math.cos(v)*l];const ha=((h%12)+m/60)/12*2*Math.PI,ma=m/60*2*Math.PI;const hh=a(ha,r*.5),mm=a(ma,r*.78);
    let t='';for(let i=0;i<12;i++){const p=a(i/12*2*Math.PI,r*.86),q=a(i/12*2*Math.PI,r*.96);t+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${P.ink}" stroke-width="3"/>`;}
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${P.v}" stroke-width="7"/>${t}<line x1="${cx}" y1="${cy}" x2="${hh[0]}" y2="${hh[1]}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${mm[0]}" y2="${mm[1]}" stroke="${P.pk}" stroke-width="5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" fill="${P.ink}"/>${T(cx,cy+r+34,lab,{s:22})}`;};
  const D={};
  D.tl_point=()=>svg(line(150)+dot(360,150,P.pk,16)+T(360,100,'at 7:30',{s:30,f:P.pk})+T(360,196,'AT = a point in time',{s:22})+T(150,120,'at noon',{s:20,f:P.ink})+T(150,176,'at night',{s:20})+T(580,120,'at midnight',{s:20})+T(580,176,'at the weekend (UK)',{s:18}),'at: a point in time');
  D.tl_day=()=>{const d=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];let s='';d.forEach((x,i)=>{const on=i===0;s+=box(48+i*91,70,80,70,on?P.v:'#fff',on?P.ink:P.line)+T(88+i*91,114,x,{s:24,f:on?'#fff':P.ink});});
    return svg(s+T(360,36,'ON = a day or a date',{s:24})+T(360,184,'on Monday · on Monday morning · on 5 May',{s:22,f:P.v})+T(360,226,'on my birthday · on Christmas Day',{s:19,w:600}),'on: a day');};
  D.tl_period=()=>{const m=['J','F','M','A','M','J','J','A','S','O','N','D'];let s='';m.forEach((x,i)=>{const on=i===9;s+=box(40+i*53,80,46,58,on?P.v:'#fff',on?P.ink:P.line)+T(63+i*53,118,x,{s:24,f:on?'#fff':P.ink});});
    return svg(s+T(360,40,'IN = a longer period',{s:24})+T(360,184,'in October · in 2025 · in summer',{s:22,f:P.v})+T(360,226,'in the morning · in the 21st century',{s:19,w:600}),'in: a period');};
  D.tl_since=()=>svg(line(140)+dot(130,140,P.pk,13)+T(130,100,'2022',{s:26,f:P.pk})+dot(580,140,P.g,13)+T(580,100,'now',{s:26})+arrow('M130 188 H560',P.v)+T(360,230,'since 2022 = from 2022 until now',{s:22,f:P.v}),'since: from a starting point until now');
  D.tl_for=()=>`${svg(line(140)+dot(150,140,P.line,10)+dot(570,140,P.line,10)+`<path d="M150 170 q0 22 22 22 H548 q22 0 22 -22" fill="none" stroke="${P.t}" stroke-width="6"/>`+T(360,226,'for three years = the length of time',{s:22,f:P.t})+T(360,100,'3 years',{s:30,f:P.t}),'for: the length of time')}`;
  D.tl_until=()=>svg(line(150)+bar(60,470,150,P.v2,18)+dot(470,150,P.pk,14)+T(470,104,'5 p.m.',{s:26,f:P.pk})+T(250,112,'work',{s:24})+T(360,214,'until 5 p.m. = it continues, then stops',{s:22,f:P.v})+`<path d="M470 130 v40" stroke="${P.pk}" stroke-width="5" stroke-dasharray="6 6"/>`,'until: the action continues up to a point');
  D.tl_by=()=>svg(line(150)+`<rect x="60" y="126" width="410" height="48" rx="10" fill="${P.ok}" opacity=".22"/>`+dot(300,150,P.ok,12)+T(300,112,'done',{s:22,f:P.ok})+dot(470,150,P.pk,14)+`<path d="M470 150 V84" stroke="${P.ink}" stroke-width="4"/><path d="M470 84 h50 l-12 14 12 14 h-50z" fill="${P.pk}"/>`+T(560,100,'Friday',{s:22})+T(360,222,'by Friday = on Friday at the latest',{s:22,f:P.v}),'by: a deadline');
  D.tl_before_after=()=>svg(line(140)+`<path d="M360 60 l10 22 24 3 -18 16 5 24 -21 -12 -21 12 5 -24 -18 -16 24 -3z" fill="${P.g}" stroke="${P.ink}" stroke-width="3"/>`+dot(360,140,P.pk,14)+bar(80,340,140,P.bl,10)+bar(380,640,140,P.t,10)+T(210,196,'BEFORE',{s:26,f:P.bl})+T(510,196,'AFTER',{s:26,f:P.t})+T(360,236,'before / after the event',{s:20,w:600}),'before and after an event');
  D.tl_during=()=>svg(line(160)+bar(120,600,160,P.soft,70)+T(360,128,'the film (2 hours)',{s:24,f:P.v})+dot(380,170,P.pk,14)+T(380,214,'the phone rang',{s:20,f:P.pk})+T(360,52,'during the film = at some time inside it',{s:23,f:P.v}),'during: inside a period');
  D.tl_from_to=()=>{let s='';['Mon','Tue','Wed','Thu','Fri'].forEach((x,i)=>{const on=true;s+=box(70+i*114,84,100,64,P.soft,P.v)+T(120+i*114,126,x,{s:24});});
    return svg(s+arrow('M70 190 H650',P.v)+T(120,64,'from',{s:22,f:P.pk})+T(576,64,'to',{s:22,f:P.pk})+T(360,236,'from Monday to Friday',{s:22,f:P.v}),'from ... to');};
  D.tl_clock=()=>svg(clock(190,110,76,7,10,'ten PAST seven')+clock(530,110,76,7,50,'ten TO eight')+T(360,70,'past →',{s:18,f:P.t})+T(360,150,'← to',{s:18,f:P.pk}),'past and to');
  /* path diagrams */
  const mover=(k,x,b,h)=>actor(k||'dexter',x,b,h||90);
  D.path_to=()=>svg(ground(196)+house(560,196,120)+mover('aizere',110,196,100)+arrow('M180 150 Q340 90 470 140',P.v)+T(360,236,'to the house = the destination',{s:22,f:P.v}),'to: destination');
  D.path_into_out=()=>svg(ground(206)+`<rect x="250" y="70" width="220" height="136" rx="14" fill="#ffe7c2" stroke="#b26b2a" stroke-width="5"/><rect x="266" y="86" width="188" height="120" fill="#7a4a1f" opacity=".25"/>`+mover('dexter',110,206,100)+arrow('M170 150 Q215 120 300 150',P.ok)+T(150,60,'INTO',{s:24,f:P.ok})+mover('luna',610,206,100)+arrow('M440 150 Q500 110 560 150',P.pk)+T(560,60,'OUT OF',{s:24,f:P.pk})+T(360,244,'into = going in · out of = coming out',{s:21}),'into and out of');
  D.path_onto_off=()=>svg(ground(206)+`<rect x="240" y="136" width="240" height="70" rx="10" fill="#b8ddff" stroke="${P.bl}" stroke-width="5"/>`+mover('spark',120,206,100)+arrow('M180 150 Q220 90 300 130',P.ok)+T(190,76,'ONTO',{s:24,f:P.ok})+mover('aizere',610,206,100)+arrow('M440 120 Q520 80 570 160',P.pk)+T(540,66,'OFF',{s:24,f:P.pk})+T(360,244,'onto = up to the top · off = away from the top',{s:20}),'onto and off');
  D.path_across=()=>svg(`<rect x="0" y="180" width="720" height="80" fill="#bfe9a8"/><rect x="0" y="100" width="720" height="80" fill="#7fc4ff"/><g stroke="#fff" stroke-width="4" opacity=".6" fill="none"><path d="M40 120 q20 -10 40 0 t40 0"/><path d="M300 150 q20 -10 40 0 t40 0"/></g>`+mover('luna',90,206,100)+arrow('M150 150 Q360 20 580 150',P.v)+T(360,52,'across the river = from one side to the other',{s:21,f:P.v}),'across');
  D.path_through=()=>svg(ground(206)+`<path d="M230 206 V120 a130 100 0 0 1 260 0 V206Z" fill="#9aa8d8"/><path d="M290 206 V140 a70 60 0 0 1 140 0 V206Z" fill="#2a2150"/>`+mover('dexter',100,206,100)+arrow('M160 170 H330 M390 170 H600',P.v)+T(360,38,'through the tunnel = inside it, from end to end',{s:21,f:P.v}),'through');
  D.path_along=()=>svg(`<rect y="0" width="720" height="260" fill="none"/>`+ground(150)+`<path d="M20 230 Q250 160 420 200 T710 170" fill="none" stroke="#d9b88a" stroke-width="40" stroke-linecap="round"/>`+mover('spark',150,205,90)+arrow('M220 190 Q360 170 480 190 T650 160',P.v,true)+T(360,50,'along the road = following its line',{s:22,f:P.v}),'along');
  D.path_towards=()=>svg(ground(206)+`<rect x="590" y="96" width="60" height="110" fill="#d6c4f5" stroke="${P.v}" stroke-width="4"/><path d="M580 96 L620 52 L660 96Z" fill="${P.pk}"/>`+mover('aizere',110,206,100)+arrow('M170 160 H350',P.v)+`<path d="M360 160 H560" stroke="${P.line}" stroke-width="6" stroke-dasharray="3 12" stroke-linecap="round"/>`+T(330,40,'towards the tower = in that direction, not arrived yet',{s:19,f:P.v}),'towards');
  D.path_past=()=>svg(ground(206)+house(360,206,130,'#cfe8ff')+`<text x="360" y="104" text-anchor="middle" font-size="18" font-weight="800" fill="${P.ink}">SHOP</text>`+mover('luna',100,206,100)+arrow('M150 232 H560',P.v)+T(360,52,'past the shop = going by it, not stopping',{s:21,f:P.v}),'past');
  D.path_around=()=>svg(ground(150)+`<ellipse cx="360" cy="150" rx="130" ry="60" fill="#7fc4ff" stroke="#fff" stroke-width="5"/>`+T(360,156,'lake',{s:22,f:'#fff'})+mover('dexter',130,215,90)+arrow('M180 215 Q360 270 540 215 Q640 190 620 130',P.v)+T(360,36,'around the lake = in a circle / on every side',{s:21,f:P.v}),'around');
  D.path_up_down=()=>svg(`<path d="M0 230 L250 90 L430 90 L720 230Z" fill="#bfe9a8" stroke="#8cc774" stroke-width="5"/>`+mover('spark',120,222,70)+arrow('M180 190 L270 124',P.ok)+T(150,100,'UP',{s:26,f:P.ok})+arrow('M450 120 L560 190',P.pk)+T(580,110,'DOWN',{s:26,f:P.pk})+T(360,50,'up / down the hill',{s:22}),'up and down');
  D.rel_of=()=>svg(`<circle cx="250" cy="130" r="80" fill="#ffd27a" stroke="#c98a00" stroke-width="5"/><path d="M250 130 L330 130 A80 80 0 0 0 306 73Z" fill="#fff" stroke="#c98a00" stroke-width="5"/><path d="M360 130 Q430 130 470 130" stroke="${P.v}" stroke-width="5" marker-end="url(#dgAh)" fill="none"/>`+`<path d="M476 150 L560 70 A100 100 0 0 1 596 150Z" transform="translate(0 6)" fill="#ffd27a" stroke="#c98a00" stroke-width="5"/>`+T(360,236,'a slice OF pizza · the top OF the page',{s:22,f:P.v})+T(360,40,'of = part, whole, contents',{s:22}),'of');
  D.rel_with=()=>svg(ground(206)+mover('aizere',200,206,110)+mover('dexter',320,206,110)+`<rect x="470" y="150" width="130" height="14" rx="7" fill="${P.g}" stroke="#c98a00" stroke-width="3" transform="rotate(-25 530 160)"/>`+T(260,60,'with a friend',{s:22,f:P.v})+T(530,100,'with a pen',{s:22,f:P.v})+T(360,246,'with = together · using',{s:21}),'with');
  return {html:(k)=>D[k]?D[k]():'', keys:Object.keys(D)};
})();

/* ===== App v4: learning path, lessons (screens), practice (fill-in-the-blank), reviews ===== */
const $=(s,r)=>(r||root).querySelector(s), $$=(s,r)=>Array.from((r||root).querySelectorAll(s));
const COURSE=JSON.parse(JSON.stringify(bundle.course)); // копия: движок вешает на уроки ссылки l.cat
const CATS=COURSE.cats, LES=[]; CATS.forEach((c,ci)=>c.lessons.forEach((l,li)=>{ l.cat=c; l.ci=ci; l.li=li; l.n=LES.length; LES.push(l); }));
CATS.forEach(c=>{ c.lessons.forEach(l=>l.practice.forEach((q,i)=>{ q._id=c.id+'/'+l.id+'/'+i; })); c.integrated.forEach((q,i)=>{ q._id=c.id+'/int/'+i; }); });
const LBY={}; LES.forEach(l=>LBY[l.id]=l); const CBY={}; CATS.forEach(c=>CBY[c.id]=c);
const LKEY=langKey;
// Прогресс — общий с аккаунтом (progress.js); читается перед каждым экраном (route) и перед записью итога.
let MEM=progress.read();
const save=()=>progress.write(MEM);
// Явный выбор на устройстве сильнее языка интерфейса: перевод — подсказка, ученик мог её выключить.
let LANG=(()=>{ try{ const v=LKEY&&localStorage.getItem(LKEY); if(v==='kk'||v==='ru'||v==='en') return v; }catch(e){} return lang==='kk'||lang==='ru'?lang:'en'; })();
const LANGS=[['en','English'],['kk','+ Қазақша'],['ru','+ Русский']];
const TRN={kk:'Қазақша түсіндірме',ru:'Объяснение на русском'};
const CATART={place:'bg_forest',time:'hd_time',movement:'hd_movement',manner:'hd_manner',cause:'hd_cause',relations:'hd_relations',patterns:'hd_patterns',advanced:'hd_advanced'};
const CATM={place:'aizere',time:'luna',movement:'dexter',manner:'spark',cause:'aizere',relations:'luna',patterns:'dexter',advanced:'spark'};
const IC={
 spk:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
 back:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 lock:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/></svg>',
 check:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 star:on=>`<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.4 1.3-6.6L2.5 9.4l6.6-.8z" fill="${on?'#ffc83c':'#e2daf5'}" stroke="${on?'#c98a00':'#cfc4ee'}" stroke-width="1.2"/></svg>`
};
function speak(t){ sayLesson(t); }
const canSpeak=()=>true; // Soniox есть всегда, запасной голос — внутри cfg.speak
const spkBtn=t=>canSpeak()?`<button class="speak" type="button" data-say="${esc(t)}" aria-label="Listen">${IC.spk}</button>`:'';
const tr=o=>(o&&LANG!=='en')?o[LANG]:'';
const trLine=o=>{ const v=tr(o); return v?`<span class="ls-trs" lang="${LANG}">${esc(v)}</span>`:''; };
const studied=l=>!!MEM.done[l.id];
const catStudied=c=>c.lessons.every(studied), allStudied=()=>LES.every(studied);
function injectArt(){ let css=''; for(const k in CATART){ const key=CATART[k]; css+=`.art-${k}{background-image:url("${IMG(key)}")}`; } root.insertAdjacentHTML('afterbegin',`<style>${css}</style>`); }
function mascot(m,h){ const k=MASC[m].poses.std, z=MS[k]; return `<svg class="mascot" viewBox="0 0 ${z[0]} ${z[1]}" style="height:${h}px;width:${Math.round(h*z[0]/z[1])}px" aria-hidden="true"><image preserveAspectRatio="none" href="${IMG(k)}" width="${z[0]}" height="${z[1]}"/></svg>`; }
function stars(n){ return `<span class="stars" aria-label="${n} of 3 stars">${[1,2,3].map(i=>IC.star(i<=n)).join('')}</span>`; }
const scoreOf=k=>MEM.score[k]||null;
const starsFor=p=>p>=0.9?3:p>=0.7?2:p>0?1:0;

/* ---------- shell ---------- */
function shell(tab,inner,cls){
  // Без логотипа и подвала: шапка и бренд — у приложения.
  $('#app').innerHTML=`<header class="top"><nav class="stages" aria-label="Sections"><a href="#/" class="${tab==='learn'?'on':''}" ${tab==='learn'?'aria-current="page"':''}><span class="num">1</span>Learn</a><a href="#/practice" class="${tab==='practice'?'on':''}" ${tab==='practice'?'aria-current="page"':''}><span class="num">2</span>Practice</a></nav></header>
   <main id="main" tabindex="-1" class="${cls||''}">${inner}</main>`;
}
const ACC=[['#874BF8','#fff'],['#0AC7FF','#141010'],['#00E641','#141010'],['#FF7D1E','#141010']];
const accS=ci=>{ const a=ACC[ci%4]; return `--acc:${a[0]};--acci:${a[1]}`; };
const bindSay=()=>$$('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
function langBar(rerender){
  return `<div class="ls-langbar"><div class="ls-seg" role="group" aria-label="Translation">${LANGS.map(([k,n])=>`<button data-tr="${k}" lang="${k}" aria-pressed="${LANG===k}">${n}</button>`).join('')}</div><span class="hint">The translation appears under each English part.</span></div>`;
}
function bindLang(rerender){ $$('[data-tr]').forEach(b=>b.onclick=()=>{ LANG=b.dataset.tr; try{ if(LKEY) localStorage.setItem(LKEY,LANG); }catch(e){} const y=scrollY; rerender(); scrollTo(0,y); const nb=$(`[data-tr="${LANG}"]`); if(nb) nb.focus({preventScroll:true}); }); }

/* ---------- Home: learning path ---------- */
function viewHome(){
  const n=LES.filter(studied).length;
  shell('learn',`<section class="hero art-place"><div class="hero-in"><p class="kick">Stage 1 · Learn</p><h1>English prepositions: the complete course</h1>
   <p>${CATS.length} categories, ${LES.length} short lessons. Read each lesson with pictures and translations, then practise.</p><div class="chip" aria-live="polite"><b>${n} of ${LES.length}</b> lessons studied<span class="chipbar"><i style="width:${Math.round(100*n/LES.length)}%"></i></span></div></div>${mascot('aizere',190)}</section><div class="ls-sheet pw-lang">${langBar()}</div>
   ${CATS.map((c,ci)=>`<section class="cat" id="cat-${c.id}" style="${accS(ci)}"><div class="cat-head art-${c.id}"><div><span class="catn">Category ${ci+1}</span><h2>${esc(c.title.en)}</h2><p>${esc(c.blurb.en)}</p>${LANG!=='en'?`<p class="cat-tr" lang="${LANG}">${esc(c.title[LANG])}. ${esc(c.blurb[LANG])}</p>`:''}</div></div>
    <div class="lgrid">${c.lessons.map((l,li)=>{ const d=studied(l), sc=scoreOf('L:'+l.id);
      return `<a class="lcard ${d?'done':''}" href="#/learn/${l.id}"><span class="lno">${ci+1}.${li+1}</span><div class="lbody"><h3>${esc(l.title.en)}</h3><p class="lp">${esc(l.preps)}</p>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(l.title[LANG])}</span>`:''}</div>${d?`<span class="badge">${IC.check}</span>`:''}</a>`; }).join('')}</div></section>`).join('')}
   <div class="goplay"><a class="btn primary big" href="#/practice">Stage 2 · Practice</a><span>${n<LES.length?'Each practice set opens after you read its lesson.':'Everything is open. Try the final review!'}</span></div>`);
  bindLang(viewHome);
}

/* ---------- blocks ---------- */
const nameFor=(sc,id)=>SC[sc].get(id).name;
function blockHTML(b){
  switch(b.t){
   case 'rule': return `<div class="blk rule"><h3>${esc(b.h.en)}</h3>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(b.h[LANG])}</span>`:''}<p>${esc(b.p.en)}</p>${tr(b.p)?`<div class="ls-tr" lang="${LANG}"><span class="trh">${TRN[LANG]}</span><p>${esc(b.p[LANG])}</p></div>`:''}
     ${b.pat?`<div class="ls-pat"><span>Pattern</span><strong>${esc(b.pat)}</strong></div>`:''}
     <div class="ls-exs">${(b.ex||[]).map(x=>`<div class="ex"><button class="ls-x" data-say="${esc(x.en)}" type="button"><span class="w">${esc(x.en)}</span>${IC.spk}</button>${trLine(x)}</div>`).join('')}</div>
     ${b.note?`<p class="ls-note"><span>Note</span>${esc(b.note.en)}</p>${tr(b.note)?`<div class="ls-tr" lang="${LANG}"><p>${esc(b.note[LANG])}</p></div>`:''}`:''}</div>`;
   case 'table': return `<div class="blk">${b.h?`<h3>${esc(b.h.en)}</h3>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(b.h[LANG])}</span>`:''}`:''}<div class="tblw"><table class="tbl"><thead><tr><th></th>${b.cols.map(c=>`<th>${esc(c.en)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r=>`<tr><th scope="row">${esc(r.label.en)}${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(r.label[LANG])}</span>`:''}</th>${r.cells.map(c=>`<td><button class="cell" data-say="${esc(c.en)}" type="button">${esc(c.en)}</button>${trLine(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
   case 'compare': return `<div class="blk"><h3>${esc(b.h.en)}</h3>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(b.h[LANG])}</span>`:''}<div class="cmp">${['a','b'].map(s=>`<div class="cmpc"><span class="cmpl">${esc(b[s].label)}</span><p>${esc(b[s].p.en)}</p>${trLine(b[s].p)}<button class="ls-x" data-say="${esc(b[s].ex.en)}" type="button"><span class="w">${esc(b[s].ex.en)}</span>${IC.spk}</button>${trLine(b[s].ex)}</div>`).join('')}</div></div>`;
   case 'scene': { b=Object.assign({},b); if(b.p==='among'&&String(b.b).includes('+')) b.b=SC[b.sc].among[0]; const sc=SC[b.sc]; const sent=sentence(b.sc,b.a,b.p,b.b,b.c,(b.verb)); const ring=[{id:b.a,c:'a'}]; if(b.p!=='among') ring.push({id:b.b,c:'b'});
     return `<figure class="fig">${sceneSVG(sc,{alt:sent,ring})}<figcaption><b>${PH[b.p]}</b> · ${esc(sent)} ${spkBtn(sent)}${b.cap?trLine(b.cap):''}</figcaption></figure>`; }
   case 'diagram': return `<figure class="fig diagf">${DG.html(b.key)}${b.cap?`<figcaption>${esc(b.cap.en)}${trLine(b.cap)}</figcaption>`:''}</figure>`;
   case 'list': return `<div class="blk"><h3>${esc(b.h.en)}</h3>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(b.h[LANG])}</span>`:''}<ul class="coll">${b.items.map(i=>`<li><button class="ls-x" data-say="${esc(i.ex.en)}" type="button"><b class="k">${esc(i.k)}</b><span class="w">${esc(i.ex.en)}</span>${IC.spk}</button>${trLine(i.ex)}</li>`).join('')}</ul></div>`;
   case 'note': return `<div class="blk"><p class="ls-note"><span>Note</span>${esc(b.p.en)}</p>${tr(b.p)?`<div class="ls-tr" lang="${LANG}"><p>${esc(b.p[LANG])}</p></div>`:''}</div>`;
  }
  return '';
}

/* ---------- Lesson (screens) ---------- */
function viewLesson(id,si){
  const l=LBY[id]; if(!l) return viewHome();
  const nS=l.screens.length, last=nS; // index nS = summary screen
  si=Math.max(0,Math.min(last,si||0));
  let body='';
  if(si<nS){ const s=l.screens[si]; body=`<h2 class="sh">${esc(s.h.en)}</h2>${LANG!=='en'?`<span class="ls-trs sh-tr" lang="${LANG}">${esc(s.h[LANG])}</span>`:''}${si===0?`<p class="ls-lead">${esc(l.lead.en)}</p>${LANG!=='en'?`<div class="ls-tr" lang="${LANG}"><span class="trh">${TRN[LANG]}</span><p>${esc(l.lead[LANG])}</p></div>`:''}`:''}${s.blocks.map(blockHTML).join('')}`; }
  else body=`<h2 class="sh">Common mistakes</h2>${LANG!=='en'?`<span class="ls-trs sh-tr" lang="${LANG}">${LANG==='kk'?'Жиі кететін қателер':'Частые ошибки'}</span>`:''}
    <ul class="ls-mis">${l.mistakes.map(m=>`<li><div class="ls-pair"><span class="bad"><span class="sr">Incorrect: </span>${esc(m.bad)}</span><span class="arr" aria-hidden="true">→</span><span class="good"><span class="sr">Correct: </span>${esc(m.good)}</span></div><p class="why">${esc(m.note.en)}</p>${trLine(m.note)}</li>`).join('')}</ul>
    <div class="memory"><span>Remember</span><p>${esc(l.memory.en)}</p>${trLine(l.memory)}</div>
    <details class="ls-src"><summary>Sources for teachers</summary><ul>${l.src.map(k=>{ const s=l.cat.sources[k]; return s?`<li><a href="${/^https?:\/\//i.test(s[1])?esc(s[1]):'#'}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`:''; }).join('')}</ul></details>`;
  const prevHref = si>0?`#/learn/${id}/${si-1}`:'#/'; // прототип вёл на итог ЧУЖОГО урока
  const nextLes = LES[l.n+1];
  const foot = si<last ? `<a class="btn ghost" href="${prevHref}">${si>0?'Previous':'All lessons'}</a><button class="btn primary" id="nextBtn">Next</button>`
     : `<a class="btn ghost" href="${prevHref}">Previous</a><span class="spacer"></span>${nextLes?`<a class="btn ghost" href="#/learn/${nextLes.id}">Next lesson</a>`:''}<a class="btn primary" href="#/practice/lesson/${id}">Practise this lesson</a>`;
  shell('learn',`<div class="lesson"><div class="ls-top"><a class="icon-btn" href="#/" aria-label="All lessons">${IC.back}</a><span class="crumb">${esc(l.cat.title.en)} · lesson ${l.li+1} of ${l.cat.lessons.length}</span></div>
   <header class="ls-head art-${l.cat.id}" style="${accS(CATS.indexOf(l.cat))}"><div><p class="ls-world">${esc(l.preps)}</p><h1>${esc(l.title.en)}</h1></div>${mascot(CATM[l.cat.id],150)}</header>
   <div class="ls-sheet">${langBar()}<div class="ls-pad"><div class="steps" role="img" aria-label="Screen ${si+1} of ${nS+1}">${Array.from({length:nS+1},(_,k)=>`<a class="stp ${k===si?'cur':''} ${k<si?'past':''}" href="#/learn/${id}/${k}" aria-label="Screen ${k+1}"></a>`).join('')}</div>${body}</div></div>
   <div class="ls-start">${foot}</div></div>`);
  bindLang(()=>viewLesson(id,si)); bindSay();
  const nb=$('#nextBtn'); if(nb) nb.onclick=()=>{ go(`#/learn/${id}/${si+1}`); };
  if(si===last){ if(!MEM.done[id]){ MEM.done[id]=1; save(); } }
  scrollTo(0,0);
}

/* ---------- Practice hub ---------- */
function viewPractice(){
  const n=LES.filter(studied).length, fin=scoreOf('F');
  shell('practice',`<section class="hero small"><div class="hero-in"><p class="kick">Stage 2 · Practice</p><h1>Choose the correct preposition</h1><p>Read the sentence, pick the missing word, get instant feedback. ${n===0?'Study a lesson first to open its practice.':''}</p></div></section><div class="ls-sheet pw-lang">${langBar()}</div>
   ${CATS.map((c,ci)=>{ const cs=catStudied(c), sc=scoreOf('C:'+c.id);
    return `<section class="pcat" style="${accS(ci)}"><div class="pcat-h"><h2>${ci+1}. ${esc(c.title.en)}</h2>${LANG!=='en'?`<span class="ls-trs" lang="${LANG}">${esc(c.title[LANG])}</span>`:''}${cs?`<a class="btn mini" href="#/practice/cat/${c.id}">Category review${sc?` · ${stars(sc.stars)}`:''}</a>`:`<span class="plock">${IC.lock} Review opens after all lessons</span>`}</div>
     <div class="plist">${c.lessons.map((l,li)=>{ const d=studied(l), s=scoreOf('L:'+l.id); return d?`<a class="prow" href="#/practice/lesson/${l.id}"><span class="lno">${ci+1}.${li+1}</span><span class="pt">${esc(l.title.en)}${LANG!=='en'?` <span class="ls-trs" lang="${LANG}">${esc(l.title[LANG])}</span>`:''}<small>${l.practice.length} questions</small></span>${s?stars(s.stars):'<span class="go">Start</span>'}</a>`
       :`<a class="prow locked" href="#/learn/${l.id}"><span class="lno">${ci+1}.${li+1}</span><span class="pt">${esc(l.title.en)}${LANG!=='en'?` <span class="ls-trs" lang="${LANG}">${esc(l.title[LANG])}</span>`:''}<small>Read the lesson first</small></span><span class="lk">${IC.lock}</span></a>`; }).join('')}</div></section>`; }).join('')}
   <section class="final"><div><h2>Final review</h2><p>${allStudied()?'A mixed set from the whole course.':'Opens when you have studied every lesson.'}</p></div>${allStudied()?`<a class="btn primary big" href="#/practice/final">Start final review${fin?` · ${stars(fin.stars)}`:''}</a>`:`<span class="plock">${IC.lock} ${n} of ${LES.length} studied</span>`}</section>`);
  bindLang(viewPractice);
}

/* ---------- Questions ---------- */
const fill=(s,a)=>a==='–'?s.replace(/ ?___ ?/,' ').replace(/ +/g,' ').replace(/ ([.,?!])/g,'$1'):s.replace('___',a);
function sceneQ(q){ // build a gap question from a validated picture
  q=Object.assign({},q); if(q.p==='among'&&String(q.b).includes('+')) q.b=SC[q.sc].among[0];
  const sc=SC[q.sc], pool=MOVE.includes(q.p)?MOVE:Object.keys(PH);
  const bad=pickBad(sc,q.a,q.p,q.b,q.c,pool,2).filter(x=>x.b===q.b);
  if(bad.length<2){ /* top up to 3 options with scene-validated false words (never a true or synonymous one) */
    const have=new Set([q.p,...bad.map(x=>x.p)]), ban=new Set(); [q.p,...trueSet(sc,q.a,q.b,q.c,pool)].forEach(t=>syns(t).forEach(x=>ban.add(x)));
    const extra=shuffle(pool.filter(x=>!ban.has(x)&&!have.has(x)&&(x!=='between'||q.c)&&(x!=='among'||q.p==='among')));
    while(bad.length<2&&extra.length) bad.push({p:extra.shift(),b:q.b,c:q.c}); }
  if(!rel(sc,sc.get(q.a),q.p,sc.get(q.b),q.c?sc.get(q.c):null)) throw new Error('scene fact false '+q.sc);
  const verb=MOVE.includes(q.p)?(q.p==='out of'?'coming':(q.verb||'going')):null;
  const B=(q.p==='among'&&sc.amongName)?sc.amongName:nameOf(sc,q.b)+(q.c?' and '+nameOf(sc,q.c):'');
  const stem=`${cap(nameOf(sc,q.a))} is ${verb?verb+' ':''}___ ${B}.`;
  const d=PDEF[q.p]; const why=d?{en:`${PH[q.p]}: ${d.def.en}`,kk:`${PH[q.p]} (${d.word.kk}): ${d.def.kk}`,ru:`${PH[q.p]} (${d.word.ru}): ${d.def.ru}`}:{en:PH[q.p],kk:PH[q.p],ru:PH[q.p]};
  return {type:'scene',lv:q.lv,scene:sc,ringA:q.a,ringB:q.p==='among'?null:q.b,stem,opts:[PH[q.p],...bad.map(x=>PH[x.p])],ans:PH[q.p],why,tr:null};
}
/* options are stored with the key first; shuffle once per question so the answer position is not predictable ('–' stays last) */
const shufO=a=>{ const s=shuffle(a); const i=s.indexOf('–'); if(i>=0){ s.splice(i,1); s.push('–'); } return s; };
function shufOpts(r){
  if(r.type==='compare'){ const a=r.opts[r.ans]; r.opts=shuffle(r.opts); r.ans=r.opts.indexOf(a); }
  else if(r.type==='passage'){ r.gaps.forEach(g=>{ g.opts=shufO(g.opts); }); }
  else if(r.opts) r.opts=shufO(r.opts);
  return r;
}
function normQ(q,lesson){
  // Прототип бросал исключение (нет сцены, ложный факт сцены) — и вся сессия не открывалась. Пропускаем вопрос.
  try{ let r=q.type==='scene'?sceneQ(q):JSON.parse(JSON.stringify(q)); r._id=q._id; r.lesson=lesson.id; r.cat=lesson.cat.id; return shufOpts(r); }
  catch(e){ try{ console.warn('prepositions: вопрос пропущен', q._id, e&&e.message); }catch(_){} return null; }
}
function sentenceOf(q){
  switch(q.type){ case 'gap': case 'scene': return fill(q.stem,q.ans); case 'dialogue': return q.lines.map(l=>fill(l,q.ans)).join(' ');
   case 'fix': return q.stem.replace(/\[[^\]]+\]/,q.ans); case 'compare': return q.opts[q.ans];
   case 'passage': { let t=q.text; q.gaps.forEach((g,i)=>{ t=t.replace(`___(${i+1})`,g.ans); }); return t; } }
  return '';
}
function trOf(q){ if(!q.tr||LANG==='en') return ''; const v=q.tr[LANG]; if(!v) return ''; if(Array.isArray(v)) return q.type==='compare'?v[q.ans]:v.join(' '); return v; }
const blankHTML=s=>esc(s).replace('___','<span class="blank">___</span>');
const optBtns=(opts,cls)=>`<div class="opts ${opts.length>3?'four':''}">${opts.map((o,k)=>`<button class="opt ${cls||''}" data-k="${k}" type="button"><span class="ol">${'ABCD'[k]}</span><span class="ov">${o==='–'?'– (no word)':esc(o)}</span></button>`).join('')}</div>`;
function picBox(q){ const sp=PICS[q._id]; if(!sp) return ''; let sc; try{ sc=mkPic(sp); }catch(e){ return ''; } return `<div class="stage pstage" data-qid="${q._id}">${picSVG(sc,{alt:sp.alt})}<div class="pcap" aria-live="polite"></div></div>`; }
const askTr=q=>tr(q.ask)?`<p class="ls-trs ask-tr" lang="${LANG}">${esc(q.ask[LANG])}</p>`:'<p class="ls-trs ask-tr" hidden></p>';
function qBody(q){
  switch(q.type){
   case 'gap': return picBox(q)+`<p class="stem">${blankHTML(q.stem)}</p>${optBtns(q.opts)}`;
   case 'scene': return `<div class="stage">${sceneSVG(q.scene,{alt:'Scene',ring:[{id:q.ringA,c:'a'}].concat(q.ringB?[{id:q.ringB,c:'b'}]:[])})}</div><p class="stem">${blankHTML(q.stem)}</p>${optBtns(q.opts)}`;
   case 'dialogue': return picBox(q)+`<div class="dlg">${q.lines.map((l,i)=>`<div class="bub ${i%2?'r':'l'}">${blankHTML(l)}</div>`).join('')}</div>${optBtns(q.opts)}`;
   case 'fix': return picBox(q)+`<p class="hintq">One preposition is wrong. Choose the correct one.</p><p class="stem">${esc(q.stem).replace(/\[([^\]]+)\]/,'<span class="wrongw">$1</span>')}</p>${optBtns(q.opts)}`;
   case 'compare': return picBox(q)+`<p class="hintq">${esc(q.ask.en)}</p>${askTr(q)}<div class="cmpopts">${q.opts.map((o,k)=>`<button class="opt wide" data-k="${k}" type="button"><span class="ol">${'AB'[k]}</span><span class="ov">${esc(o)}</span></button>`).join('')}</div>`;
   case 'passage': return picBox(q)+`<p class="hintq">Choose the correct word for each gap.</p><p class="passage">${esc(q.text).replace(/___\((\d)\)/g,(m,n)=>`<span class="pgap" data-g="${n}">${n}</span>`)}</p>${q.gaps.map((g,i)=>`<div class="pg" data-g="${i}"><span class="pgn">${i+1}</span>${g.opts.map((o,k)=>`<button class="opt small" data-g="${i}" data-k="${k}" type="button">${esc(o)}</button>`).join('')}</div>`).join('')}`;
  }
}
/* ---------- recorded sentence audio (practice only) ---------- */
const AUD=bundle.aud||{};
function fnv(s){ let x=0x811c9dc5; for(let i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,0x01000193)>>>0; } return ('00000000'+x.toString(16)).slice(-8); }
function audKeys(text){ const k=fnv(text); if(AUD[k]) return [k]; const ks=[]; for(let i=0;AUD[k+'_'+i];i++) ks.push(k+'_'+i); return ks; }
let CUR=null, PQ=0;
function audBtnState(on){ const b=$('#audbtn'); if(b) b.classList.toggle('on',!!on); }
function stopAud(){ PQ++; if(CUR){ stopAudio(); CUR=null; } audBtnState(false); }
function playAud(text){
  const ks=audKeys(text); if(!ks.length) return false; stopAud(); const my=PQ; let i=0; audBtnState(true);
  const done=()=>{ if(my===PQ){ CUR=null; audBtnState(false); } };
  // Записи — через общий <audio> приложения (cfg.playUrl): отдельный new Audio() на iPhone молчит без жеста.
  const next=()=>{ if(my!==PQ) return; if(i>=ks.length) return done();
    CUR=true; playUrl(AUD[ks[i++]],{ onEnd:(why)=>{ if(my!==PQ) return; if(why==='ended'&&i<ks.length) later(next,380); else done(); }, onFail:done }); };
  next(); return true;
}
const audBtn=t=>audKeys(t).length?`<button class="speak aud" id="audbtn" type="button" aria-label="Listen again" title="Listen again">${IC.spk}</button>`:'';
let S=null;
function startSession(key,title,qs,back,meta){
  if(!qs.length) return go('#/practice');
  S={key,title,qs,i:0,res:[],back,meta,locked:false}; renderQ();
}
function renderQ(){
  stopAud(); const q=S.qs[S.i], n=S.qs.length; S.locked=false;
  const lessonTitle=LBY[q.lesson]?LBY[q.lesson].title.en:(CBY[q.cat]?CBY[q.cat].title.en+': review':'');
  $('#app').innerHTML=`<header class="top game"><a class="icon-btn" href="${S.back}" aria-label="Back">${IC.back}</a><div class="gt"><b role="heading" aria-level="1">${esc(S.title)}</b><small>Question ${S.i+1} of ${n}</small></div><div class="ls-seg mini" role="group" aria-label="Translation">${LANGS.map(([k,nm])=>`<button data-tr="${k}" lang="${k}" aria-pressed="${LANG===k}">${k==='en'?'EN':k==='kk'?'ҚАЗ':'РУС'}</button>`).join('')}</div></header>
   <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${S.i}"><span style="width:${S.i/n*100}%"></span></div>
   <main id="main" tabindex="-1" class="gmain"><div class="qbox"><p class="qtag">${esc(lessonTitle)}${q.lv?` · level ${q.lv}`:''}</p>${qBody(q)}<div id="fb" class="fb" role="status" aria-live="polite"></div></div></main>`;
  $$('[data-tr]').forEach(b=>b.onclick=()=>{ LANG=b.dataset.tr; try{ if(LKEY) localStorage.setItem(LKEY,LANG); }catch(e){} if(S.locked){ showFb(q,S.lastOk); const at=$('.ask-tr'); if(at) at.outerHTML=askTr(q); } else renderQ(); $$('[data-tr]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.tr===LANG)); });
  bindQ(q); bindPic();
  const mn=$('#main'); if(mn) mn.focus({preventScroll:true}); /* keep keyboard / screen-reader focus inside the new question */
}
function bindPic(){
  const st=$('.pstage'); if(!st) return; const cap=$('.pcap',st);
  $$('.hot',st).forEach(h=>{ const go=()=>{ const id=h.dataset.id, g=$(`.it[data-id="${id}"]`,st); if(g){ g.classList.remove('tap'); void g.getBoundingClientRect(); g.classList.add('tap'); } cap.textContent=h.getAttribute('aria-label'); cap.classList.add('on'); clearTimeout(cap._t); cap._t=later(()=>cap.classList.remove('on'),1800); };
    h.addEventListener('click',go); h.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); });
}
function reactPic(ok){
  const st=$('.pstage'); if(!st) return; st.classList.add(ok?'is-ok':'is-no');
  $$('.it.mas',st).forEach((g,i)=>{ g.style.animationDelay=(i*90)+'ms'; g.classList.add(ok?'cheer':'oops'); });
  if(ok){ const ov=$('.ov',st); if(ov){ let b=''; for(let i=0;i<14;i++){ const a=i/14*6.283, r=70+Math.random()*90; b+=`<circle class="spk" cx="500" cy="270" r="${4+Math.random()*5}" style="--dx:${Math.cos(a)*r*2.2}px;--dy:${Math.sin(a)*r*1.1-40}px;animation-delay:${i*18}ms" fill="${['#ffc83d','#2fb6a8','#a98be6','#ff8f4a'][i%4]}"/>`; } ov.innerHTML=b; } }
}
function showFb(q,ok){
  const fb=$('#fb'); const full=sentenceOf(q), t=trOf(q);
  let why='';
  if(q.type==='passage') why=`<ul class="whys">${q.gaps.map((g,i)=>`<li><b>${i+1}. ${esc(g.ans)}</b> ${esc(g.why.en)}${tr(g.why)?`<span class="ls-trs" lang="${LANG}">${esc(g.why[LANG])}</span>`:''}</li>`).join('')}</ul>`;
  else why=`<p class="fbm">${esc(q.why.en)}</p>${tr(q.why)?`<p class="fbm tr" lang="${LANG}">${esc(q.why[LANG])}</p>`:''}`;
  const head = ok?'Correct!':(q.type==='compare'?'Not quite.':q.type==='passage'?'Not quite. See the answers:':`Not quite. The answer is <span class="answ">${esc(q.ans)}</span>.`);
  fb.className='fb '+(ok?'ok':'no');
  fb.innerHTML=`<div class="fbt"><b>${head}</b></div><div class="fbs"><span>${esc(full)}</span>${audBtn(full)}</div>${t?`<p class="fbm tr" lang="${LANG}">${esc(t)}</p>`:''}${why}<button class="btn primary" id="nxt">${S.i===S.qs.length-1?'See results':'Next'}</button>`;
  const ab=$('#audbtn'); if(ab) ab.onclick=()=>playAud(full);
  const nb=$('#nxt'); nb.onclick=nextQ; nb.focus({preventScroll:true}); fb.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function finishQ(q,ok){ onAnswer(ok); S.locked=true; S.lastOk=ok; reactPic(ok); S.res.push({lesson:q.lesson,cat:q.cat,ok}); showFb(q,ok); if(ok){ const full=sentenceOf(q), qq=q; later(()=>{ if(S&&S.locked&&S.qs[S.i]===qq) playAud(full); },420); } }
function bindQ(q){
  if(q.type==='passage'){
    const answered={}; let right=0;
    $$('.opt.small').forEach(b=>b.onclick=()=>{ const g=+b.dataset.g; if(answered[g]!=null) return; const k=+b.dataset.k, gp=q.gaps[g], ok=gp.opts[k]===gp.ans; answered[g]=k; if(ok) right++;
      $$(`.opt.small[data-g="${g}"]`).forEach((x,kk)=>{ x.disabled=true; if(gp.opts[kk]===gp.ans) x.classList.add('good'); else if(kk===k) x.classList.add('bad'); });
      const gl=$(`.pgap[data-g="${g+1}"]`); if(gl){ gl.textContent=gp.ans; gl.classList.add(ok?'good':'bad'); }
      if(Object.keys(answered).length===q.gaps.length) finishQ(q,right===q.gaps.length); });
    return; }
  $$('.opt').forEach(b=>b.onclick=()=>{ if(S.locked) return; const k=+b.dataset.k; const ok=q.type==='compare'?k===q.ans:q.opts[k]===q.ans;
    $$('.opt').forEach((x,kk)=>{ x.disabled=true; const right=q.type==='compare'?kk===q.ans:q.opts[kk]===q.ans; if(right) x.classList.add('good'); else if(kk===k) x.classList.add('bad'); });
    finishQ(q,ok); });
}
function nextQ(){ if(S.i<S.qs.length-1){ S.i++; renderQ(); scrollTo(0,0); } else endSession(); }
function endSession(){
  stopAud();
  MEM=progress.read();
  const n=S.res.length, ok=S.res.filter(r=>r.ok).length, p=ok/n, st=starsFor(p);
  const prev=MEM.score[S.key]; MEM.score[S.key]={best:Math.max(prev?prev.best:0,p),stars:Math.max(prev?prev.stars:0,st)}; save();
  const miss={}; S.res.filter(r=>!r.ok&&r.lesson).forEach(r=>{ miss[r.lesson]=(miss[r.lesson]||0)+1; });
  const ml=Object.keys(miss).sort((a,b)=>miss[b]-miss[a]).slice(0,5);
  const msg=st===3?'Excellent!':st===2?'Well done!':'Good try!';
  $('#app').innerHTML=`<header class="top game"><a class="icon-btn" href="${S.back}" aria-label="Back">${IC.back}</a><div class="gt"><b role="heading" aria-level="1">${esc(S.title)}</b><small>Results</small></div></header>
   <main id="main" tabindex="-1" class="endm"><div class="end"><span class="starsbig">${stars(st)}</span><h1>${msg}</h1><p class="score">${ok} of ${n} correct</p><div class="mm">${mascot(S.meta&&S.meta.m||'dexter',170)}</div>
   ${ml.length?`<div class="weak"><p>Review these lessons:</p>${ml.map(id=>`<a href="#/learn/${id}">${esc(LBY[id].title.en)} <small>${miss[id]} missed</small></a>`).join('')}</div>`:'<p class="allok">No mistakes. Great work!</p>'}
   <div class="navrow center"><button class="btn ghost" id="again">Try again</button><a class="btn primary" href="${S.back}">${S.meta&&S.meta.next?'Back to practice':'Continue'}</a></div></div></main>`;
  $('#again').onclick=()=>{ if(S.meta&&S.meta.rebuild) S.meta.rebuild(); };
  scrollTo(0,0);
}
/* session builders */
const lvSort=(a,b)=>(a.lv||0)-(b.lv||0);
function lessonSession(id){
  const l=LBY[id]; if(!l||!studied(l)) return go('#/practice');
  const qs=l.practice.map(q=>normQ(q,l)).filter(Boolean).sort(lvSort);
  startSession('L:'+id,l.title.en,qs,'#/practice',{m:CATM[l.cat.id],rebuild:()=>lessonSession(id),next:1});
}
const pickN=(a,n)=>shuffle(a).slice(0,n);
function catSession(id){
  const c=CBY[id]; if(!c||!catStudied(c)) return go('#/practice');
  let qs=[]; c.lessons.forEach(l=>{ const pool=l.practice.filter(q=>q.lv>=2&&q.type!=='scene'); qs=qs.concat(pickN(pool,2).map(q=>normQ(q,l)).filter(Boolean)); });
  qs=qs.concat(c.integrated.map(q=>normQ(q,{id:null,cat:c})).filter(Boolean));
  qs=shuffle(qs).sort(lvSort);
  startSession('C:'+id,c.title.en+': review',qs,'#/practice',{m:CATM[id],rebuild:()=>catSession(id),next:1});
}
function finalSession(){
  if(!allStudied()) return go('#/practice');
  let qs=[]; LES.forEach(l=>{ const pool=l.practice.filter(q=>q.lv>=2); qs=qs.concat(pickN(pool,2).map(q=>normQ(q,l)).filter(Boolean)); });
  CATS.forEach(c=>{ qs=qs.concat(pickN(c.integrated,2).map(q=>normQ(q,{id:null,cat:c})).filter(Boolean)); });
  qs=shuffle(qs);
  startSession('F','Final review',qs,'#/practice',{m:'dexter',rebuild:finalSession,next:1});
}

/* ---------- router ---------- */
function route(){
  const h=(HASH||'#/').slice(1).split('/').filter(Boolean);
  stopAudio(); stopAud(); MEM=progress.read();
  if(h[0]==='learn') viewLesson(h[1],+h[2]||0);
  else if(h[0]==='practice'&&h[1]==='lesson') lessonSession(h[2]);
  else if(h[0]==='practice'&&h[1]==='cat') catSession(h[2]);
  else if(h[0]==='practice'&&h[1]==='final') finalSession();
  else if(h[0]==='practice') viewPractice();
  else viewHome();
  if(h[0]!=='learn') scrollTo(0,0);
}
root.insertAdjacentHTML('afterbegin',globalDefs()); injectArt();
on(root,'click',e=>{ const a=e.target&&e.target.closest?e.target.closest('a[href^="#/"]'):null; if(!a||!root.contains(a)) return; e.preventDefault(); go(a.getAttribute('href')); });
route();
return {
  go,
  /** Для тестов: текущий адрес движка и собранная сессия вопросов. */
  snapshot: () => ({ hash: HASH, session: S }),
  destroy(){ dead=true; ac.abort(); for(const id of timers) clearTimeout(id); timers.clear(); stopAud(); stopAudio(); root.innerHTML=''; },
};



}
