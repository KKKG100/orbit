const $=id=>document.getElementById(id),TAU=Math.PI*2,G0=9.81,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(v,u='')=>{const a=Math.abs(v);return a>=1e9?(v/1e9).toFixed(2)+'G'+u:a>=1e6?(v/1e6).toFixed(2)+'M'+u:a>=1e4?(v/1e3).toFixed(1)+'k'+u:v.toFixed(0)+u};
function shade(h,a){const n=parseInt(h.slice(1),16),f=s=>cl(((n>>s)&255)+a,0,255);return`rgb(${f(16)},${f(8)},${f(0)})`}
// ---------- Celestial bodies (circular orbits on rails, patched-conic SOIs) ----------
const BODIES=[],BI={};
function mk(id,n,par,a,mu,R,atm,rho,H,c,th){const b={id,n,par,a,mu,R,atm,rho,H,c,th:th||0};BODIES.push(b);BI[id]=b}
mk('sol','Sol',null,0,1.1723e18,2.616e8,0,0,0,'#ffcf5a');
mk('ember','Ember','sol',5.26e9,1.8e11,2.5e5,0,0,0,'#b08060',1);
mk('terra','Terra','sol',1.36e10,3.5316e12,6e5,7e4,1.2,5600,'#3d7fd0',0);
mk('luna','Luna','terra',1.2e7,6.5e10,2e5,0,0,0,'#9a9a9a',2);
mk('rusta','Rusta','sol',2.07e10,3.0136e11,3.2e5,5e4,.15,4000,'#c0522e',4);
mk('jovo','Jovo','sol',6.84e10,2.8253e14,6e6,2e5,2,20000,'#6aa84f',1);
mk('titan','Titanis','jovo',2.7e7,8.2e11,3e5,0,0,0,'#c9b27a',3);
for(const b of BODIES){const p=BI[b.par];if(p){b.p=p;b.soi=b.a*Math.pow(b.mu/p.mu,.4);b.w=Math.sqrt(p.mu/b.a**3)}else{b.soi=Infinity;b.w=0}}
function bpos(b,ut){if(!b.p)return[0,0];const q=bpos(b.p,ut),t=b.th+b.w*ut;return[q[0]+b.a*Math.cos(t),q[1]+b.a*Math.sin(t)]}
function brel(b,ut){const t=b.th+b.w*ut,v=b.a*b.w;return[b.a*Math.cos(t),b.a*Math.sin(t),-v*Math.sin(t),v*Math.cos(t)]}
// ---------- Parts ----------
const PD=[
// id,name,type,w,h,dry,fuel,thrust(N),ispVac,ispAsl,color,torque
['nose','Aero Nose Cone','nose',1.25,.9,30,0,0,0,0,'#d44',0],
['chute','Parachute','chute',1.25,.4,100,0,0,0,0,'#e8e8e8',0],
['probe','Probe Core','pod',.9,.5,100,0,0,0,0,'#9a9aa6',6],
['mk1','Mk1 Command Pod','pod',1.25,1.6,800,0,0,0,0,'#cfd3dc',20],
['mk2','Mk2 Lander Can','pod',2.5,1.8,2000,0,0,0,0,'#e8dfc6',45],
['wheel','Reaction Wheel','misc',1.25,.4,100,0,0,0,0,'#777',35],
['fin','Fin Set','fin',1.25,1.2,60,0,0,0,0,'#bbb',8],
['legs','Landing Legs','legs',1.25,.8,150,0,0,0,0,'#888',0],
['dc1','TD-12 Decoupler','dec',1.25,.3,50,0,0,0,0,'#555',0],
['dc2','TD-25 Decoupler','dec',2.5,.4,100,0,0,0,0,'#555',0],
['t100','FL-T100 Tank','tank',1.25,1,62,500,0,0,0,'#e9e9ee',0],
['t200','FL-T200 Tank','tank',1.25,2,125,1000,0,0,0,'#e9e9ee',0],
['t400','FL-T400 Tank','tank',1.25,4,250,2000,0,0,0,'#e9e9ee',0],
['t800','FL-T800 Tank','tank',1.25,8,500,4000,0,0,0,'#e9e9ee',0],
['x200','Jumbo-S Tank','tank',2.5,2,250,2000,0,0,0,'#e8a23a',0],
['x400','Jumbo-M Tank','tank',2.5,4,500,4000,0,0,0,'#e8a23a',0],
['x800','Jumbo-L Tank','tank',2.5,8,1000,8000,0,0,0,'#e8a23a',0],
['spark','Spark','eng',.9,.6,100,0,20000,320,270,'#8a8f9c',0],
['terrier','Terrier (vac)','eng',1.25,1.2,500,0,60000,345,85,'#9aa',0],
['swivel','Swivel','eng',1.25,1.5,1500,0,200000,320,250,'#99a',0],
['reliant','Reliant','eng',1.25,1.6,1250,0,240000,310,265,'#aa9',0],
['poodle','Poodle (vac)','eng',2.5,2.2,1750,0,250000,350,90,'#a9a',0],
['mainsail','Mainsail','eng',2.5,3,6000,0,1500000,310,285,'#bbb',0],
['ion','Ion Drive','eng',.9,.5,250,0,2000,4200,4200,'#6bd',0],
['rt10','RT-10 Booster','srb',1.25,2.5,400,3200,250000,240,220,'#f2f2f2',0],
['bacc','BACC Booster','srb',2.5,4,1500,24000,300000,250,230,'#f2f2f2',0],
['xf','Crossfeed Line','xf',1.25,.2,20,0,0,0,0,'#c85',0]
].map(a=>({id:a[0],n:a[1],type:a[2],w:a[3],h:a[4],dry:a[5],fuel:a[6],thr:a[7],ispV:a[8],ispA:a[9],col:a[10],tq:a[11],cost:Math.round(a[5]*.4+a[6]*.1+a[7]*.01)+50}));
const PI={};PD.forEach(d=>PI[d.id]=d);
const STARTER=['chute','mk1','wheel','t200','terrier','dc1','t800','t800','t800','reliant'];

// ---------- rotation & terrain ----------
const ROT={ember:1e-5,terra:2.9089e-4,luna:0,rusta:1.4e-4,jovo:3e-4,titan:0,sol:0};BODIES.forEach(b=>b.rot=ROT[b.id]||0);
function terr(b,f){if(b.id=='jovo'||b.id=='sol')return 0;const A=Math.min(b.R*.004,2400);let m=1;
 if(b.id=='terra')m=cl((Math.abs(Math.atan2(Math.sin(f-Math.PI/2),Math.cos(f-Math.PI/2)))-.004)/.01,0,1);
 return m*A*(.5*Math.sin(5*f+1)+.3*Math.sin(17*f+2)+.2*Math.sin(41*f+3)+.02*Math.sin(300*f))}
