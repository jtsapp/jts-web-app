// Фоновые звуковые сцены Скорочтения (ТЗ v1.2 §6) — синтез Web Audio из прототипа кабинета
// (data/jts-student-cabinet.html: функции amb* и AMB_SCENES), перенесённый дословно. У каждой сцены — постоянная
// подложка из шума, случайные события (шаги, птицы, щелчки камер) и сигнал в начале («тан-тан» аэропорта, свисток
// стадиона); b(E) рисует сцену и возвращает длительность сигнала — отсчёт 3-2-1 стартует после него.
//
// Синтез — первая версия по решению владельца 10.11.2026: работает сразу и без файлов. По ТЗ на платформе сцены
// станут записанными петлями (30–60 с) и отдельными сигналами — тогда меняется только этот модуль, интерфейс
// createAmbience остаётся.
//
// От прототипа отличается только обвязка: контекст свой у экрана, а не window.AMBC, — его создаёт и будит клик
// (wake), иначе iPhone молчит; кэш шумов — WeakMap по контексту, а не поле на объекте контекста; таймеры —
// снаружи (тест), закрытие экрана гасит всё (close). Смешивание с записью (mixer) — из srBegin прототипа:
// микрофон и сцена на 45 % идут в MediaStreamDestination, его поток пишет второй MediaRecorder.

const R = (a, b) => a + Math.random() * (b - a)
const NOISE = new WeakMap()

/* ---------- кирпичи звука: amb* прототипа дословно (минифицированы, как в исходнике) ---------- */
function ambEngine(ctx,out){const E={ctx,out,t0:ctx.currentTime+.05,tracks:[],src:[]};
 const rv=ctx.createConvolver(),len=Math.floor(ctx.sampleRate*2.6),ir=ctx.createBuffer(2,len,ctx.sampleRate);
 for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
 rv.buffer=ir;const wet=ctx.createGain();wet.gain.value=.32;rv.connect(wet);wet.connect(out);
 E.fx=ctx.createGain();E.fx.connect(out);E.fx.connect(rv);return E;}
function ambNoise(E,type){const c=E.ctx;let nb=NOISE.get(c);if(!nb){nb={};NOISE.set(c,nb);}if(nb[type])return nb[type];
 const sr=c.sampleRate,len=sr*4,X=Math.floor(sr*.25),b=c.createBuffer(1,len,sr),d=b.getChannelData(0),tmp=new Float32Array(len+X);
 let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
 for(let i=0;i<len+X;i++){const w=Math.random()*2-1;if(type==='white')tmp[i]=w*.5;
  else if(type==='pink'){b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;tmp[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}
  else{last=(last+.02*w)/1.02;tmp[i]=last*3.5;}}
 for(let i=0;i<len;i++)d[i]=i<X?tmp[i]*(i/X)+tmp[len+i]*(1-i/X):tmp[i]; /* бесшовная петля */
 return (nb[type]=b);}
function ambFilt(E,type,f,q){const n=E.ctx.createBiquadFilter();n.type=type;n.frequency.value=f;if(q!=null)n.Q.value=q;return n;}
function ambChain(E,first,nodes,dest){let p=first;nodes.forEach(n=>{p.connect(n);p=n;});p.connect(dest||E.out);return p;}
/* постоянная подложка из шума */
function ambBed(E,o){const c=E.ctx,s=c.createBufferSource();s.buffer=ambNoise(E,o.type||'pink');s.loop=true;
 const ch=[];if(o.hp)ch.push(ambFilt(E,'highpass',o.hp,.5));if(o.lp)ch.push(ambFilt(E,'lowpass',o.lp,.6));if(o.bp)ch.push(ambFilt(E,'bandpass',o.bp,o.q||.8));
 const g=c.createGain();g.gain.value=o.g;ch.push(g);
 if(o.lfo){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.lfo;lg.gain.value=o.g*(o.depth||.5);l.connect(lg);lg.connect(g.gain);l.start(E.t0);E.src.push(l);}
 if(o.sweep&&o.bp){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.sweep;lg.gain.value=o.bp*.45;l.connect(lg);lg.connect(ch.find(n=>n.type==='bandpass').frequency);l.start(E.t0);E.src.push(l);}
 if(o.pan!=null){const p=c.createStereoPanner();p.pan.value=o.pan;ch.push(p);}
 ambChain(E,s,ch,o.dest);s.start(E.t0,Math.random()*3);E.src.push(s);return g;}
/* повторяющееся случайное событие */
function ambTrack(E,every,fn,first){E.tracks.push({next:E.t0+(first!=null?first:R(every[0]*.3,every[1])),every,fn});}
function ambPump(E,until){for(const tr of E.tracks){let k=0;while(tr.next<until&&k++<400){try{tr.fn(tr.next);}catch(e){}tr.next+=R(tr.every[0],tr.every[1]);}}}
/* --- разовые звуки в момент t --- */
function ambEnv(E,t,g,a,d,dest){const n=E.ctx.createGain();n.gain.setValueAtTime(0,t);n.gain.linearRampToValueAtTime(g,t+a);n.gain.exponentialRampToValueAtTime(.0001,t+a+d);n.connect(dest||E.out);return n;}
function ambTone(E,t,o){const c=E.ctx,os=c.createOscillator();os.type=o.type||'sine';os.frequency.setValueAtTime(o.f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+(o.glide||o.d));
 let dst=ambEnv(E,t,o.g,o.a||.005,o.d,o.dest);if(o.lp){const f=ambFilt(E,'lowpass',o.lp,.7);f.connect(dst);dst=f;}if(o.pan!=null){const p=c.createStereoPanner();p.pan.value=o.pan;p.connect(dst);dst=p;}
 if(o.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vib;lg.gain.value=o.vd||o.f*.03;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+(o.a||.005)+o.d+.1);}
 os.connect(dst);os.start(t);os.stop(t+(o.a||.005)+o.d+.1);}
function ambBurst(E,t,o){const c=E.ctx,s=c.createBufferSource();s.buffer=ambNoise(E,o.type||'white');const ch=[];
 if(o.hp)ch.push(ambFilt(E,'highpass',o.hp,.7));if(o.lp)ch.push(ambFilt(E,'lowpass',o.lp,.7));if(o.bp)ch.push(ambFilt(E,'bandpass',o.bp,o.q||1));
 if(o.pan!=null){const p=c.createStereoPanner();p.pan.value=o.pan;ch.push(p);}
 const env=ambEnv(E,t,o.g,o.a||.002,o.d,o.dest);ambChain(E,s,ch,env);s.start(t,Math.random()*3);s.stop(t+(o.a||.002)+o.d+.05);}
/* колокольчик / гонг громкой связи */
function ambBell(E,t,f,g,d,bright){[[1,1,1],[2,.32,.6],[3,.12,.4],[4.2,.07,.25],[bright?5.4:2.76,bright?.1:.05,.3]].forEach(([m,a,k])=>ambTone(E,t,{f:f*m,g:g*a,d:(d||1.8)*k,a:.006,dest:E.fx}));}
function ambChime(E,t,notes,gap,g,d){notes.forEach((f,i)=>ambBell(E,t+i*gap,f,g,d));return notes.length*gap+(d||1.8)*.6;}
/* толпа / гул голосов: несколько полос шума с «речевой» модуляцией */
function ambMurmur(E,g,o){o=o||{};const n=o.n||5,lo=o.lo||280,hi=o.hi||1400,vs=[];
 for(let i=0;i<n;i++){vs.push(ambBed(E,{type:'pink',bp:lo*Math.pow(hi/lo,i/(n-1||1)),q:1.6,g:g/n*1.6,pan:R(-.6,.6),dest:o.rev?E.fx:E.out}));}
 ambTrack(E,[.09,.22],t=>vs.forEach(v=>v.gain.setTargetAtTime(g/n*R(.5,2.4),t,.07)),0);}
function ambRoom(E,g){ambBed(E,{type:'brown',lp:220,g:g});ambBed(E,{type:'pink',lp:900,hp:120,g:g*.25});}
function ambStep(E,t,g){ambBurst(E,t,{type:'brown',lp:500,g:g,d:.07,dest:E.fx});ambTone(E,t,{f:85,g:g*.5,d:.06});}
function ambSteps(E,g,every){ambTrack(E,every||[4,9],t=>{const n=Math.floor(R(3,7)),sp=R(.45,.6),gg=g*R(.5,1);for(let i=0;i<n;i++)ambStep(E,t+i*sp,gg*(1-Math.abs(i-n/2)/n));});}
function ambClink(E,t,g){[2600,3900,5300].forEach((f,i)=>ambTone(E,t,{f:f*R(.94,1.06),g:g/(i+1),d:.35/(i+1),pan:R(-.7,.7),dest:E.fx}));}
function ambBird(E,t,g){const sp=Math.floor(R(0,3)),pan=R(-.8,.8);
 if(sp===0){const n=Math.floor(R(3,7)),f=R(3000,4600);for(let i=0;i<n;i++)ambTone(E,t+i*.09,{f:f,f2:f*1.35,g:g,d:.06,glide:.05,pan});}
 else if(sp===1){ambTone(E,t,{f:R(2600,3200),f2:R(2000,2300),g:g,d:.28,a:.02,pan});ambTone(E,t+.38,{f:R(2600,3200),f2:R(2000,2300),g:g*.8,d:.24,a:.02,pan});}
 else{ambTone(E,t,{f:R(3200,4200),g:g*.8,d:.45,a:.03,vib:R(25,40),vd:500,pan});}}
function ambBirds(E,g,every){ambTrack(E,every||[.8,3],t=>ambBird(E,t,g));}
function ambGull(E,t,g){const pan=R(-.7,.7);for(let i=0;i<Math.floor(R(2,4));i++)ambTone(E,t+i*.32,{type:'sawtooth',f:1250,f2:780,g:g,d:.26,a:.03,lp:2200,vib:9,vd:40,pan});}
function ambWind(E,g){ambBed(E,{type:'pink',bp:520,q:.7,g:g,lfo:.09,depth:.6,sweep:.06});ambBed(E,{type:'brown',lp:300,g:g*.6,lfo:.05,depth:.4});}
function ambWave(E,t,g){const c=E.ctx,s=c.createBufferSource();s.buffer=ambNoise(E,'pink');const f=ambFilt(E,'lowpass',400,.5),gn=c.createGain(),p=c.createStereoPanner(),up=R(1.6,2.6),dn=R(2.8,4.2);
 p.pan.value=R(-.5,.5);gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g,t+up);gn.gain.exponentialRampToValueAtTime(.0001,t+up+dn);
 f.frequency.setValueAtTime(350,t);f.frequency.linearRampToValueAtTime(2600,t+up);f.frequency.linearRampToValueAtTime(500,t+up+dn);
 s.connect(f);f.connect(gn);gn.connect(p);p.connect(E.out);s.start(t,Math.random()*3);s.stop(t+up+dn+.1);}
function ambRain(E,g){ambBed(E,{type:'white',hp:1800,g:g*.35});ambBed(E,{type:'pink',lp:2600,hp:300,g:g});ambTrack(E,[.02,.09],t=>ambTone(E,t,{f:R(2200,4200),f2:R(900,1400),g:g*R(.05,.18),d:.03,pan:R(-.9,.9)}),0);}
function ambThunder(E,t,g){ambBurst(E,t,{type:'white',lp:2500,g:g*.5,d:.35});ambBurst(E,t+.05,{type:'brown',lp:260,g:g,a:.08,d:R(2.5,4)});ambBurst(E,t+R(.4,.9),{type:'brown',lp:180,g:g*.7,a:.3,d:2.5});}
function ambTraffic(E,g){ambBed(E,{type:'brown',lp:420,g:g,lfo:.07,depth:.35});
 ambTrack(E,[2.5,6],t=>{const c=E.ctx,s=c.createBufferSource();s.buffer=ambNoise(E,'pink');const f=ambFilt(E,'bandpass',300,.8),gn=c.createGain(),p=c.createStereoPanner(),d=R(2.5,4),dir=Math.random()<.5?-1:1;
  f.frequency.setValueAtTime(250,t);f.frequency.linearRampToValueAtTime(900,t+d*.5);f.frequency.linearRampToValueAtTime(220,t+d);gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g*1.4,t+d*.5);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
  p.pan.setValueAtTime(-.8*dir,t);p.pan.linearRampToValueAtTime(.8*dir,t+d);s.connect(f);f.connect(gn);gn.connect(p);p.connect(E.out);s.start(t,Math.random()*3);s.stop(t+d+.1);});}
function ambCarHorn(E,t,g){[415,523].forEach(f=>ambTone(E,t,{type:'square',f,g:g*.5,d:.32,a:.01,lp:1800}));}
function ambEngine2(E,g,f){ambBed(E,{type:'brown',lp:f||260,g:g,lfo:.3,depth:.12});const c=E.ctx,o=c.createOscillator(),gg=c.createGain(),lp=ambFilt(E,'lowpass',180,.7);o.type='sawtooth';o.frequency.value=48;gg.gain.value=g*.08;o.connect(lp);lp.connect(gg);gg.connect(E.out);o.start(E.t0);E.src.push(o);}
function ambClap(E,t,g){ambBurst(E,t,{type:'white',bp:R(1000,2600),q:1.2,g:g*R(1.6,4),d:.03,pan:R(-.9,.9)});}
function ambApplause(E,t,dur,g){const n=Math.floor(dur*45);for(let i=0;i<n;i++){const x=Math.random(),w=Math.sin(Math.PI*Math.min(1,x*1.25));ambClap(E,t+x*dur,g*w);}ambBurst(E,t,{type:'pink',bp:1500,q:.5,g:g*.25,a:dur*.3,d:dur*.8});return dur;}
function ambWhistle(E,t,g,d){ambTone(E,t,{f:2900,g:g,d:d||.7,a:.02,vib:32,vd:160});}
function ambCrackle(E,t,g){const n=Math.floor(R(1,6));for(let i=0;i<n;i++)ambBurst(E,t+i*R(.01,.05),{type:'white',hp:1200,g:g*R(.3,1),d:R(.003,.012),pan:R(-.4,.4)});}
function ambCricket(E,t,g){const f=R(4300,4800),pan=R(-.8,.8);for(let k=0;k<Math.floor(R(2,5));k++)for(let i=0;i<3;i++)ambTone(E,t+k*.35+i*.045,{f,g,d:.025,a:.004,pan});}
function ambKey(E,t,g){const n=Math.floor(R(4,14));for(let i=0;i<n;i++)ambBurst(E,t+i*R(.08,.2),{type:'white',hp:2500,g:g*R(.5,1),d:.012,pan:.35});}
function ambCamera(E,t,g){const pan=R(-.8,.8);ambBurst(E,t,{type:'white',hp:3000,g:g,d:.008,pan});ambBurst(E,t+.06,{type:'white',hp:2000,g:g*.8,d:.01,pan});ambBurst(E,t+.07,{type:'white',bp:5000,q:2,g:g*.25,d:.12,pan});}
function ambGavel(E,t,g,n){for(let i=0;i<(n||3);i++){const tt=t+i*.42;ambTone(E,tt,{f:190,f2:150,g:g,d:.18,dest:E.fx});ambTone(E,tt,{type:'triangle',f:560,g:g*.4,d:.07,dest:E.fx});ambBurst(E,tt,{type:'white',lp:3000,g:g*.5,d:.015,dest:E.fx});}return (n||3)*.42+.4;}
function ambPhoneRing(E,t,g,n){for(let k=0;k<(n||2);k++){const tt=t+k*2;[0,.6].forEach(o=>[400,450].forEach(f=>ambTone(E,tt+o,{f,g:g*.5,d:.4,a:.01})));}return (n||2)*2;}
function ambBeep(E,t,f,g,d){ambTone(E,t,{f,g,d:d||.12,a:.004});}
function ambKick(E,t,g){ambTone(E,t,{f:130,f2:42,g:g,d:.22,glide:.12});}
function ambHorn(E,t,g,d){[98,147,196].forEach((f,i)=>ambTone(E,t,{type:'sawtooth',f,g:g/(i+1.5),a:.35,d:d||2.6,lp:700,dest:E.fx}));return (d||2.6)+.5;}
function ambEagle(E,t,g){ambTone(E,t,{f:3100,f2:2100,g:g,d:.9,a:.05,vib:14,vd:120,pan:R(-.5,.5),dest:E.fx});}


/* ---------- сцены ---------- */
export const SCENES={
 airport:{ic:'✈️',n:['Аэропорт: гонг «тан-тан» и гул терминала','Әуежай: «тан-тан» гонгы және терминал гуілі','Airport: two-tone chime and terminal hum'],b(E){ambRoom(E,.09);ambMurmur(E,.16,{n:6,rev:true});ambSteps(E,.05,[3,7]);ambTrack(E,[6,13],t=>ambBurst(E,t,{type:'brown',lp:600,g:.035,a:.3,d:2.2,pan:R(-.6,.6)}));return ambChime(E,E.t0+.3,[784,659],.75,.2,2.4);}},
 plane:{ic:'🛫',n:['Салон самолёта: гул двигателей и «динь»','Ұшақ салоны: қозғалтқыш гуілі мен «дің»','Aircraft cabin: engine drone and seat-belt chime'],b(E){ambBed(E,{type:'brown',lp:320,g:.15});ambBed(E,{type:'pink',lp:1400,hp:200,g:.035});ambBed(E,{type:'white',hp:4000,g:.012});return ambChime(E,E.t0+.3,[1318,1046],.55,.16,1.6);}},
 station:{ic:'🚉',n:['Вокзал: перезвон и стук колёс','Вокзал: қоңырау мен дөңгелек дыбысы','Station: platform chime and trains'],b(E){ambRoom(E,.08);ambMurmur(E,.11,{n:5,rev:true});ambTrack(E,[1.1,1.4],t=>{ambBurst(E,t,{type:'brown',lp:500,g:.06,d:.08,dest:E.fx});ambBurst(E,t+.14,{type:'brown',lp:500,g:.05,d:.08,dest:E.fx});});ambBed(E,{type:'brown',lp:200,g:.06,lfo:.04,depth:.5});return ambChime(E,E.t0+.3,[523,659,784,1046],.32,.17,1.8);}},
 metro:{ic:'🚇',n:['Метро: сигнал дверей и гул поезда','Метро: есік сигналы мен пойыз гуілі','Metro: door chime and train rumble'],b(E){ambBed(E,{type:'brown',lp:280,g:.13,lfo:.12,depth:.3});ambBed(E,{type:'pink',bp:900,q:2,g:.03,sweep:.08});ambMurmur(E,.06,{n:4});return ambChime(E,E.t0+.3,[988,784,988],.28,.15,1.2);}},
 bus:{ic:'🚌',n:['Автобус: мотор и звонок остановки','Автобус: мотор мен аялдама қоңырауы','Bus: engine and stop bell'],b(E){ambEngine2(E,.12,240);ambMurmur(E,.05,{n:4});ambTrack(E,[9,16],t=>ambBurst(E,t,{type:'white',bp:2500,q:.7,g:.04,a:.02,d:.5}));ambBell(E,E.t0+.35,1568,.16,1.2,true);return 1.4;}},
 mall:{ic:'🛍️',n:['Торговый центр: сигнал и шум покупателей','Сауда орталығы: сигнал мен сатып алушылар','Mall: PA chime and shoppers'],b(E){ambRoom(E,.07);ambMurmur(E,.15,{n:6,rev:true});ambSteps(E,.04,[3,6]);ambTrack(E,[2.5,6],t=>ambTone(E,t,{type:'square',f:2700,g:.012,d:.08,lp:4000,pan:R(-.6,.6)}));return ambChime(E,E.t0+.3,[1046,880,698],.42,.17,2);}},
 cafe:{ic:'☕',n:['Кафе: посуда и разговоры','Кафе: ыдыс-аяқ пен әңгіме','Café: cups and chatter'],b(E){ambRoom(E,.06);ambMurmur(E,.13,{n:5});ambTrack(E,[1.2,4],t=>ambClink(E,t,.05));ambTrack(E,[12,22],t=>ambBurst(E,t,{type:'white',hp:3000,g:.03,a:.3,d:1.6}));ambBell(E,E.t0+.3,2093,.08,.6,true);ambBell(E,E.t0+.45,2637,.07,.6,true);return 1.2;}},
 school:{ic:'🏫',n:['Школа: перезвон и шум класса','Мектеп: қоңырау мен сынып шуы','School: PA chimes and class noise'],b(E){ambRoom(E,.06);ambMurmur(E,.12,{n:5,lo:400,hi:2000,rev:true});ambSteps(E,.04);return ambChime(E,E.t0+.3,[659,523,587,392],.42,.16,1.8);}},
 park:{ic:'🌳',n:['Парк: птицы и лёгкий ветер','Саябақ: құстар мен жеңіл жел','Park: birds and a light breeze'],b(E){ambWind(E,.05);ambBed(E,{type:'brown',lp:300,g:.04});ambBirds(E,.035);for(let i=0;i<4;i++)ambBird(E,E.t0+.2+i*.35,.045);return 1.2;}},
 zoo:{ic:'🦒',n:['Зоопарк: птицы и посетители','Хайуанаттар бағы: құстар мен келушілер','Zoo: birds and visitors'],b(E){ambWind(E,.04);ambMurmur(E,.09,{n:4,lo:500,hi:2200});ambBirds(E,.045,[.6,2.2]);ambTone(E,E.t0+.3,{type:'sawtooth',f:1700,f2:2400,g:.05,d:.25,lp:3500,vib:18,vd:200});ambTone(E,E.t0+.7,{type:'sawtooth',f:2300,f2:1500,g:.05,d:.3,lp:3500,vib:18,vd:200});return 1.3;}},
 beach:{ic:'🏖️',n:['Пляж: волны и чайки','Жағажай: толқын мен шағалалар','Beach: waves and gulls'],b(E){ambBed(E,{type:'pink',lp:900,g:.04});ambTrack(E,[3.5,6],t=>ambWave(E,t,.34),0);ambTrack(E,[6,14],t=>ambGull(E,t,.03));ambGull(E,E.t0+.4,.04);return 1.4;}},
 rain:{ic:'🌧️',n:['Дождь за окном','Терезенің сыртындағы жаңбыр','Rain outside the window'],b(E){ambRain(E,.12);ambRoom(E,.04);return 1;}},
 storm:{ic:'⛈️',n:['Гроза: ливень и гром','Найзағай: нөсер мен күн күркіреуі','Storm: heavy rain and thunder'],b(E){ambRain(E,.17);ambWind(E,.06);ambTrack(E,[8,15],t=>ambThunder(E,t,.3));ambThunder(E,E.t0+.2,.35);return 1.8;}},
 radio:{ic:'📻',n:['Радиостудия: заставка эфира','Радиостудия: эфир заставкасы','Radio studio: on-air jingle'],b(E){ambBed(E,{type:'pink',lp:5000,hp:2000,g:.006});[523,784,1046,1318,1568].forEach((f,i)=>ambBell(E,E.t0+.3+i*.11,f,.11,1.4,true));ambTone(E,E.t0+.3,{f:65,g:.18,d:1.2,a:.02});ambTone(E,E.t0+.85,{type:'triangle',f:262,g:.06,d:1.3,a:.05,dest:E.fx});return 1.7;}},
 cinema:{ic:'🎬',n:['Кинозал: зрители рассаживаются','Кинозал: көрермендер жайғасуда','Cinema: audience taking seats'],b(E){ambRoom(E,.06);ambMurmur(E,.1,{n:5,rev:true});ambTrack(E,[2,5],t=>ambBurst(E,t,{type:'white',bp:3000,q:.6,g:.02,a:.05,d:.35,pan:R(-.8,.8)}));return ambChime(E,E.t0+.3,[587,784,988],.36,.13,2);}},
 campfire:{ic:'🏕️',n:['Костёр: треск огня и сверчки','Алау: от сықыры мен шегірткелер','Campfire: crackling fire and crickets'],b(E){ambBed(E,{type:'brown',lp:400,g:.07,lfo:.2,depth:.4});ambTrack(E,[.05,.35],t=>ambCrackle(E,t,.09),0);ambTrack(E,[.6,1.8],t=>ambCricket(E,t,.012));for(let i=0;i<10;i++)ambCrackle(E,E.t0+.2+i*.07,.14);return 1.1;}},
 stadium:{ic:'🏟️',n:['Стадион: трибуны и свисток','Стадион: трибуна мен ысқырық','Stadium: crowd and whistle'],b(E){ambBed(E,{type:'pink',bp:650,q:.5,g:.18,lfo:.06,depth:.4});ambMurmur(E,.2,{n:6,lo:350,hi:1800});ambTrack(E,[7,14],t=>ambBurst(E,t,{type:'pink',bp:900,q:.5,g:.22,a:.6,d:2.5}));ambWhistle(E,E.t0+.3,.07,.9);return 1.5;}},
 hall:{ic:'🎤',n:['Зал: аплодисменты и тишина','Зал: қол шапалақ пен тыныштық','Hall: applause, then quiet'],b(E){ambRoom(E,.06);ambMurmur(E,.035,{n:4,rev:true});return ambApplause(E,E.t0+.2,3.2,.22)+.4;}},
 museum:{ic:'🏛️',n:['Музей: шаги и эхо залов','Мұражай: қадам мен залдар жаңғырығы','Museum: footsteps and echo'],b(E){ambRoom(E,.07);ambMurmur(E,.03,{n:4,rev:true});ambSteps(E,.06,[3,6]);ambBell(E,E.t0+.3,880,.09,2.2);return 1.4;}},
 library:{ic:'📚',n:['Библиотека: тихий зал и мягкий сигнал','Кітапхана: тыныш зал мен жұмсақ сигнал','Library: quiet room and soft chime'],b(E){ambRoom(E,.05);ambTrack(E,[3,8],t=>ambBurst(E,t,{type:'white',bp:2500,q:.8,g:.015,a:.05,d:.3,pan:R(-.6,.6)}));ambSteps(E,.025,[6,12]);return ambChime(E,E.t0+.3,[523,659,784],.4,.1,1.8);}},
 kitchen:{ic:'🍳',n:['Кухня: шипение сковороды','Ас үй: табаның шыжылы','Kitchen: sizzling pan'],b(E){ambBed(E,{type:'white',hp:2500,g:.05,lfo:.5,depth:.3});ambTrack(E,[.04,.25],t=>ambCrackle(E,t,.04),0);ambTrack(E,[3,7],t=>{for(let i=0;i<Math.floor(R(4,9));i++){ambBurst(E,t+i*.17,{type:'brown',lp:900,g:.07,d:.04});ambTone(E,t+i*.17,{f:180,g:.04,d:.05});}});ambTrack(E,[5,10],t=>ambClink(E,t,.04));ambBurst(E,E.t0+.2,{type:'white',hp:2000,g:.1,a:.05,d:1.2});return 1.1;}},
 office:{ic:'💼',n:['Офис: клавиатуры и телефон','Кеңсе: пернетақта мен телефон','Office: keyboards and a phone'],b(E){ambRoom(E,.07);ambBed(E,{type:'pink',lp:400,g:.03});ambMurmur(E,.04,{n:4});ambTrack(E,[1.5,4],t=>ambKey(E,t,.03));for(let k=0;k<2;k++)[0,.12,.24,.36].forEach((o,i)=>ambBeep(E,E.t0+.3+k*.9+o,i%2?1400:1200,.05,.1));return 2;}},
 clinic:{ic:'🏥',n:['Поликлиника: тихий холл и сигнал','Емхана: тыныш холл мен сигнал','Clinic: quiet hall and soft chime'],b(E){ambRoom(E,.06);ambMurmur(E,.05,{n:4,rev:true});ambSteps(E,.03,[5,10]);ambTrack(E,[9,16],t=>ambChime(E,t,[660,880],.35,.05,1.2));return ambChime(E,E.t0+.3,[660,880],.35,.12,1.6);}},
 ship:{ic:'🛳️',n:['Палуба: волны, чайки и гудок','Палуба: толқын, шағала және гудок','Ship deck: waves, gulls and horn'],b(E){ambEngine2(E,.1,200);ambWind(E,.05);ambTrack(E,[3,5],t=>ambWave(E,t,.12),1);ambTrack(E,[8,16],t=>ambGull(E,t,.025));return ambHorn(E,E.t0+.2,.16,2.4);}},
 mountain:{ic:'🏔️',n:['Горы: ветер и крик орла','Тау: жел мен бүркіт үні','Mountains: wind and an eagle'],b(E){ambWind(E,.11);ambTrack(E,[10,20],t=>ambEagle(E,t,.025));ambEagle(E,E.t0+.4,.035);return 1.5;}},
 phone:{ic:'📞',n:['Телефон: гудки и сигнал автоответчика','Телефон: гудок пен жауап беру сигналы','Phone: ringing and voicemail beep'],b(E){ambBed(E,{type:'white',hp:300,lp:3400,g:.006});const d=ambPhoneRing(E,E.t0+.2,.12,2);ambBeep(E,E.t0+.2+d+.1,1000,.1,.5);return d+.9;}},
 gym:{ic:'🏋️',n:['Спортзал: ритм музыки','Спортзал: музыка ырғағы','Gym: workout beat'],b(E){ambRoom(E,.05);ambTrack(E,[.48,.48],t=>{ambKick(E,t,.16);ambBurst(E,t+.24,{type:'white',hp:6000,g:.03,d:.04});},.1);ambWhistle(E,E.t0+.1,.05,.35);return 2.1;}},
 party:{ic:'🎉',n:['Праздник: гости, смех и хлопушка','Мереке: қонақтар мен жарылғыш','Party: guests and a popper'],b(E){ambRoom(E,.05);ambMurmur(E,.15,{n:6,lo:350,hi:2200});ambTrack(E,[2,5],t=>ambClink(E,t,.04));ambBurst(E,E.t0+.3,{type:'white',lp:4000,g:.25,d:.12});ambApplause(E,E.t0+.45,1.6,.07);return 2;}},
 space:{ic:'🛰️',n:['ЦУП: радиоэфир и сигналы','Ұшуды басқару: радиоэфир мен сигналдар','Mission control: radio and beeps'],b(E){ambRoom(E,.07);ambBed(E,{type:'white',bp:1800,q:.6,g:.012,lfo:.4,depth:.6});ambTrack(E,[3,7],t=>{for(let i=0;i<Math.floor(R(1,4));i++)ambBeep(E,t+i*.18,R(900,1600),.03,.08);});ambTrack(E,[8,15],t=>ambBeep(E,t,2525,.05,.25));ambBeep(E,E.t0+.3,2525,.08,.25);return 1;}},
 court:{ic:'⚖️',n:['Зал суда: молоток и тишина','Сот залы: балға мен тыныштық','Courtroom: gavel and silence'],b(E){ambRoom(E,.07);ambMurmur(E,.03,{n:4,rev:true});return ambGavel(E,E.t0+.3,.22,3);}},
 studio:{ic:'🎙️',n:['Студия: сигнал «в эфире»','Студия: «эфирде» сигналы','Studio: on-air beeps'],b(E){ambBed(E,{type:'brown',lp:180,g:.04});[0,.5,1].forEach((o,i)=>ambBeep(E,E.t0+.3+o,i<2?880:1760,.08,i<2?.12:.35));return 1.9;}},
 street:{ic:'🏙️',n:['Улица: машины и сигналы','Көше: көліктер мен сигналдар','Street: traffic and horns'],b(E){ambTraffic(E,.08);ambMurmur(E,.04,{n:4});ambTrack(E,[14,26],t=>ambCarHorn(E,t,.05));ambCarHorn(E,E.t0+.3,.07);ambCarHorn(E,E.t0+.75,.06);return 1.3;}},
 hotel:{ic:'🏨',n:['Холл отеля: звонок на ресепшн','Қонақ үй холлы: ресепшн қоңырауы','Hotel lobby: reception bell'],b(E){ambRoom(E,.06);ambMurmur(E,.06,{n:4,rev:true});ambSteps(E,.035,[4,9]);ambBell(E,E.t0+.3,2349,.13,1.4,true);return 1.3;}},
 car:{ic:'🚕',n:['Такси: мотор, дорога и поворотник','Такси: мотор, жол және бұрылыс белгісі','Taxi: engine, road and indicator'],b(E){ambEngine2(E,.09,220);ambBed(E,{type:'pink',lp:700,hp:80,g:.05,lfo:.08,depth:.3});ambTrack(E,[9,16],t=>{for(let i=0;i<8;i++){ambBurst(E,t+i*.45,{type:'white',hp:3000,g:.05,d:.012,pan:.4});ambTone(E,t+i*.45+.22,{f:900,g:.02,d:.02,pan:.4});}});ambBurst(E,E.t0+.2,{type:'brown',lp:300,g:.3,d:.25});ambTone(E,E.t0+.2,{f:70,g:.15,d:.2});for(let i=0;i<3;i++)ambBurst(E,E.t0+.9+i*.45,{type:'white',hp:3000,g:.06,d:.012,pan:.4});return 2.1;}},
 concert:{ic:'🎻',n:['Концертный зал: настройка оркестра','Концерт залы: оркестрдің бапталуы','Concert hall: orchestra tuning'],b(E){ambRoom(E,.06);ambMurmur(E,.06,{n:5,rev:true});const tune=t=>{const f=[220,293.7,329.6,440,659.3][Math.floor(R(0,5))];ambTone(E,t,{type:'sawtooth',f,g:.012,a:.4,d:R(1.2,2.4),lp:1800,vib:5,vd:f*.006,pan:R(-.7,.7),dest:E.fx});};ambTrack(E,[.6,1.6],tune);ambTone(E,E.t0+.3,{type:'sawtooth',f:440,g:.03,a:.3,d:2.2,lp:1600,vib:5,vd:2,dest:E.fx});ambTone(E,E.t0+.9,{type:'sawtooth',f:220,g:.02,a:.4,d:1.8,lp:1200,dest:E.fx});return 2.4;}},
 market:{ic:'🧺',n:['Базар: продавцы, покупатели, весы','Базар: сатушылар, сатып алушылар, таразы','Bazaar: sellers, shoppers, scales'],b(E){ambRoom(E,.05);ambMurmur(E,.17,{n:6,lo:300,hi:2000,rev:true});ambTraffic(E,.025);ambTrack(E,[1.5,4],t=>ambClink(E,t,.04));ambTrack(E,[2,5],t=>ambBurst(E,t,{type:'white',bp:3500,q:.7,g:.025,a:.03,d:.4,pan:R(-.8,.8)}));ambTrack(E,[6,12],t=>ambBeep(E,t,2400,.02,.08));for(let i=0;i<3;i++)ambBell(E,E.t0+.3+i*.22,1760,.07,.8,true);return 1.5;}},
 press:{ic:'📸',n:['Пресс-конференция: щелчки камер','Баспасөз мәслихаты: камера шықылы','Press conference: camera clicks'],b(E){ambRoom(E,.06);ambMurmur(E,.07,{n:5,rev:true});ambTrack(E,[.8,3],t=>ambCamera(E,t,.09));for(let i=0;i<8;i++)ambCamera(E,E.t0+.2+i*R(.08,.2),.13);return 1.7;}}
};

/** Сцена по ключу текста (`sound`); нет такой — null, текст звучит без фона. */
export const sceneOf = (key) => (key && Object.prototype.hasOwnProperty.call(SCENES, key) ? SCENES[key] : null)

/** Громкость ползунка (0–100) → усиление, как ambVolGain прототипа: тихий край мягче линейного. */
export const volumeGain = (v) => Math.pow(Math.max(0, Math.min(100, Number(v) || 0)) / 100, 1.3) * 1.8

/** Доля фона в записи ученика (ТЗ §7: «фон сцены на уровне 45 %»). */
export const REC_BG_LEVEL = 0.45

/**
 * @param {{ AudioContextCtor?: Function, volume?: number, timers?: { setTimeout, clearTimeout, setInterval, clearInterval } }} [opts]
 */
export function createAmbience({ AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext, volume = 45, timers = globalThis } = {}) {
  let A = null // { c, comp, vol }
  let cur = null // играющая сцена: { E, g, key, timer, stopAt, preview }
  let vol = volume
  // Шина записи: пока она есть, любая запущенная сцена идёт и в запись. Сцена стартует до отсчёта (её сигнал),
  // а запись — после него, поэтому шину подключают к уже звучащей сцене (route), а не только при start.
  let bus = null
  const later = new Set()
  const delay = (fn, ms) => {
    const id = timers.setTimeout(() => {
      later.delete(id)
      fn()
    }, ms)
    later.add(id)
  }

  function ctx() {
    if (A || !AudioContextCtor) return A
    try {
      const c = new AudioContextCtor()
      const comp = c.createDynamicsCompressor()
      const v = c.createGain()
      comp.threshold.value = -14
      comp.ratio.value = 4
      comp.connect(v)
      v.connect(c.destination)
      v.gain.value = volumeGain(vol)
      A = { c, comp, vol: v }
    } catch {
      A = null
    }
    return A
  }

  function stop(fade) {
    if (!cur) return
    const a = cur
    cur = null
    timers.clearInterval(a.timer)
    if (a.stopAt) timers.clearTimeout(a.stopAt)
    const c = a.E.ctx
    const f = fade == null ? 0.6 : fade
    try {
      a.g.gain.cancelScheduledValues(c.currentTime)
      a.g.gain.setValueAtTime(Math.max(0.0001, a.g.gain.value), c.currentTime)
      a.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + Math.max(0.03, f))
    } catch {
      /* узел уже отключён */
    }
    delay(() => {
      a.E.src.forEach((s) => {
        try {
          s.stop()
        } catch {
          /* источник уже остановлен */
        }
      })
      try {
        a.g.disconnect()
      } catch {
        /* уже отключён */
      }
    }, (f + 0.1) * 1000)
  }

  return {
    /** Создать и разбудить контекст — СИНХРОННО в клике (iPhone даёт звук только жесту). */
    wake() {
      const a = ctx()
      // iOS после микрофона оставляет контекст «interrupted», а не «suspended» — будим любой неработающий.
      if (a && a.c.state !== 'running') a.c.resume?.().catch?.(() => {})
      return !!a
    },
    /**
     * Запустить сцену; вернуть длительность сигнала в начале (с). rec — шина записи из mixer(): туда идёт
     * та же сцена, что в наушники. preview — секунд прослушивания, onPreviewEnd — когда оно кончилось само.
     */
    start(key, { rec = null, preview = 0, onPreviewEnd = null } = {}) {
      stop(0)
      const sc = sceneOf(key)
      const a = sc && ctx()
      if (!a) return 0
      const c = a.c
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, c.currentTime)
      g.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.8)
      g.connect(a.comp)
      if (rec || bus) g.connect(rec || bus)
      const E = ambEngine(c, g)
      let cue = 0
      try {
        cue = sc.b(E) || 0
      } catch {
        cue = 0
      }
      ambPump(E, c.currentTime + 1.2)
      const me = { E, g, key, preview: preview > 0, timer: timers.setInterval(() => ambPump(E, c.currentTime + 1.2), 300), stopAt: null }
      if (preview > 0)
        me.stopAt = timers.setTimeout(() => {
          if (cur !== me) return
          stop()
          onPreviewEnd?.()
        }, preview * 1000)
      cur = me
      return cue
    },
    stop,
    /** Вести сцену ещё и в запись (шина из mixer) или перестать (null). */
    route(b) {
      if (bus && cur && bus !== b) {
        try {
          cur.g.disconnect(bus)
        } catch {
          /* уже отключена */
        }
      }
      if (b && cur && b !== bus) {
        try {
          cur.g.connect(b)
        } catch {
          /* узел из другого контекста — запись будет без фона */
        }
      }
      bus = b || null
    },
    /** Что звучит: null | { key, preview }. */
    playing: () => (cur ? { key: cur.key, preview: cur.preview } : null),
    get volume() {
      return vol
    },
    setVolume(v) {
      vol = Math.max(0, Math.min(100, Number(v) || 0))
      if (A) A.vol.gain.setTargetAtTime(volumeGain(vol), A.c.currentTime, 0.05)
    },
    /**
     * Шина записи «голос + фон»: микрофон и сцена (на REC_BG_LEVEL) сводятся в один поток. null — браузер не
     * умеет MediaStreamDestination: тогда пишется только голос.
     * @param {MediaStream} stream  микрофон
     * @param {boolean} on  фон включён
     */
    mixer(stream, on) {
      const a = ctx()
      if (!a || !stream || typeof a.c.createMediaStreamDestination !== 'function') return null
      try {
        const dest = a.c.createMediaStreamDestination()
        const mic = a.c.createMediaStreamSource(stream)
        mic.connect(dest)
        const out = a.c.createGain()
        out.gain.value = on ? REC_BG_LEVEL : 0
        out.connect(dest)
        return {
          stream: dest.stream,
          bus: out,
          setOn(v) {
            try {
              out.gain.value = v ? REC_BG_LEVEL : 0
            } catch {
              /* шина уже отключена */
            }
          },
          release() {
            try {
              mic.disconnect()
              out.disconnect()
            } catch {
              /* уже отключены */
            }
          },
        }
      } catch {
        return null
      }
    },
    close() {
      bus = null
      stop(0)
      later.forEach((id) => timers.clearTimeout(id))
      later.clear()
      const a = A
      A = null
      try {
        a?.c.close()
      } catch {
        /* уже закрыт */
      }
    },
  }
}
