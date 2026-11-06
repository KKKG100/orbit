'use strict';
const cv=$('c'),g=cv.getContext('2d'),pv=$('pv'),pg=pv.getContext('2d'),ng=$('nav').getContext('2d');
let mode='build',view='flight',stack=[],S=null,stages=[],stageNo=0,ut=0,warp=1,wi=0,ws=null,myId=0,online=1;
let thr=0,sas=true,sasMode=0,zoom=6,mapS=1e-5,focus='terra',pts=[],tt=0,lastSend=0,lastHud=0;
const keys={},remotes={},WL=[1,2,5,10,50,100,1e3,1e4,1e5],SM=['Hold','Prograde','Retrograde','Radial out','Radial in'];
const stars=Array.from({length:350},()=>[Math.random(),Math.random(),Math.random()*1.3+.3]);
const send=m=>ws&&ws.readyState==1&&ws.send(JSON.stringify(m));
function note(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(tt);tt=setTimeout(()=>e.style.opacity=0,2500)}
function rs(){cv.width=innerWidth;cv.height=innerHeight;pv.width=pv.clientWidth;pv.height=pv.clientHeight;refresh()}addEventListener('resize',rs);
const mkP=ids=>ids.map(id=>({d:PI[id],f:PI[id].fuel,on:false,dep:false,fl:0}));
// ---------- stack drawing (shared by builder, flight, remote ships) ----------
function drawStack(c,P,s,col){let L=0;for(const p of P)L+=p.d.h;let y=-L/2*s,dep=0;
 for(const p of P){const d=p.d,w=d.w*s,h=d.h*s,x=-w/2;
  if(p.fl>0){const fl=d.w*s*2.4*p.fl*(.85+Math.random()*.3)*(d.type=='srb'?1.4:1),gr=c.createLinearGradient(0,y+h,0,y+h+fl);
   gr.addColorStop(0,'#fff');gr.addColorStop(.25,'#ffd45a');gr.addColorStop(.6,'rgba(255,110,20,.7)');gr.addColorStop(1,'rgba(255,60,0,0)');
   c.fillStyle=gr;c.beginPath();c.moveTo(-w*.3,y+h);c.lineTo(w*.3,y+h);c.lineTo(0,y+h+fl);c.fill()}
  if(p.dep)dep=1;
  const gr=c.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,shade(d.col,-55));gr.addColorStop(.3,shade(d.col,35));gr.addColorStop(.7,shade(d.col,-10));gr.addColorStop(1,shade(d.col,-65));
  c.fillStyle=gr;c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=Math.max(.5,s*.03);c.beginPath();
  if(d.type=='nose'){c.moveTo(0,y);c.quadraticCurveTo(x+w*.05,y+h*.55,x,y+h);c.lineTo(x+w,y+h);c.quadraticCurveTo(x+w*.95,y+h*.55,0,y)}
  else if(d.type=='pod'){c.moveTo(x+w*.3,y);c.lineTo(x+w*.7,y);c.lineTo(x+w,y+h);c.lineTo(x,y+h)}
  else if(d.type=='eng'){c.moveTo(x+w*.25,y);c.lineTo(x+w*.75,y);c.lineTo(x+w*.95,y+h);c.lineTo(x+w*.05,y+h)}
  else c.rect(x,y,w,h);
  c.fill();c.stroke();
  if(d.type=='pod'){c.fillStyle='#69b7ff';c.beginPath();c.ellipse(0,y+h*.45,w*.14,h*.14,0,0,TAU);c.fill()}
  if(d.type=='tank'){c.fillStyle=col||'#4aa3ff';c.fillRect(x,y+h*.45,w,h*.1)}
  if(d.type=='srb'){c.fillStyle='#c33';c.fillRect(x,y+h*.1,w,h*.08)}
  if(d.type=='fin'){c.fillStyle=shade(d.col,-30);for(const k of[-1,1]){c.beginPath();c.moveTo(k*w/2,y);c.lineTo(k*(w/2+h*.7),y+h*1.4);c.lineTo(k*w/2,y+h);c.fill();c.stroke()}}
  if(d.type=='legs'){c.strokeStyle='#999';c.lineWidth=Math.max(1,s*.06);for(const k of[-1,1]){c.beginPath();c.moveTo(k*w/2,y);c.lineTo(k*w*1.1,y+h*1.3);c.stroke()}}
  y+=h}
 if(dep){c.fillStyle='rgba(255,120,60,.85)';c.beginPath();c.ellipse(0,-L/2*s-s*5,s*5,s*3,0,Math.PI,TAU);c.fill();c.strokeStyle='#ccc';c.lineWidth=1;for(const k of[-4,0,4]){c.beginPath();c.moveTo(k*s,-L/2*s-s*5);c.lineTo(0,-L/2*s);c.stroke()}}}
// ---------- builder ----------
function buildUI(){const cats={pod:'Command',nose:'Aero',chute:'Recovery',misc:'Control',fin:'Control',legs:'Landing',tank:'Fuel',eng:'Engines',srb:'Boosters',dec:'Staging'},by={};
 PD.forEach(d=>(by[cats[d.type]]??=[]).push(d));
 $('plist').innerHTML=Object.entries(by).map(([k,a])=>`<h3>${k}</h3>`+a.map(d=>`<button data-id="${d.id}"><b>${d.n}</b><small>${d.dry+d.fuel} kg${d.thr?' · '+d.thr/1000+' kN':''}${d.fuel?' · '+d.fuel+' kg fuel':''} · ✦${d.cost}</small></button>`).join('')).join('');
 $('plist').onclick=e=>{const b=e.target.closest('button');if(b){stack.push(PI[b.dataset.id]);refresh()}};
 $('stackl').onclick=e=>{const i=e.target.closest('div')?.dataset.i;if(i!=null){stack.splice(+i,1);refresh()}};
 $('bclear').onclick=()=>{stack=[];refresh()};$('bstart').onclick=()=>{stack=STARTER.map(i=>PI[i]);refresh()};$('blaunch').onclick=launch;
 $('pname').value=localStorage.pn||'Pilot'+(Math.random()*900+100|0);$('pname').onchange=()=>{localStorage.pn=$('pname').value;send({t:'join',name:$('pname').value})};
 stack=STARTER.map(i=>PI[i])}
function calcDv(P){const n=P.length,ds=[];P.forEach((p,i)=>p.d.type=='dec'&&ds.push(i));ds.reverse();let hi=n-1,t=0;
 for(const lo0 of[...ds,-1]){let m0=0,f=0,isp=0;for(let i=0;i<=hi;i++)m0+=P[i].d.dry+P[i].f;
  for(let i=lo0+1;i<=hi;i++){f+=P[i].f;if(!isp&&P[i].d.thr)isp=P[i].d.ispV}
  if(isp&&m0>f)t+=isp*G0*Math.log(m0/(m0-f));hi=lo0}return t}
function refresh(){if(!$('build')||mode!='build')return;const P=mkP(stack.map(d=>d.id)),m=P.reduce((a,p)=>a+p.d.dry+p.f,0),dry=P.reduce((a,p)=>a+p.d.dry,0);
 let lastDec=-1;P.forEach((p,i)=>p.d.type=='dec'&&(lastDec=i));const F=P.slice(lastDec+1).reduce((a,p)=>a+p.d.thr,0);
 $('sinfo').innerHTML=`Parts ${P.length} · Cost ✦${stack.reduce((a,d)=>a+d.cost,0)}<br>Mass ${(m/1000).toFixed(2)} t (dry ${(dry/1000).toFixed(2)} t)<br>TWR (Terra) ${(F/(m*G0)).toFixed(2)}<br>Δv (vac) ${calcDv(P).toFixed(0)} m/s<br>Stages ${P.filter(p=>p.d.type=='dec').length+1}`;
 $('stackl').innerHTML=stack.map((d,i)=>`<div data-i="${i}"><span>${d.n}</span><span>✕</span></div>`).join('');
 pg.clearRect(0,0,pv.width,pv.height);if(!P.length)return;const L=P.reduce((a,p)=>a+p.d.h,0),s=Math.min(36,pv.height*.8/L);
 pg.save();pg.translate(pv.width/2,pv.height/2);drawStack(pg,P,s,$('vcol').value);pg.restore()}
$('vcol').oninput=refresh;
// ---------- launch / staging ----------
function launch(){if(!stack.some(d=>d.type=='pod'))return note('Add a command pod first!');
 const P=mkP(stack.map(d=>d.id)),b=BI.terra,L=P.reduce((a,p)=>a+p.d.h,0);
 S={P,b,x:0,y:b.R+L/2,vx:0,vy:0,h:Math.PI/2,w:0,landed:true,dead:false,name:$('vname').value||'Vessel',col:$('vcol').value,L,hold:Math.PI/2,F:0};
 stages=[];for(let i=P.length-1;i>=0;i--)if(['dec','eng','srb','chute'].includes(P[i].d.type))stages.push(i);
 stageNo=0;thr=0;pts=[];mode='fly';view='flight';zoom=6;$('build').hidden=true;$('hud').hidden=false;sendShip();note('Press SPACE to ignite · Shift = throttle up')}
function sendShip(){send({t:'ship',ship:{name:S.name,col:S.col,parts:S.P.map(p=>p.d.id)}})}
function stage(){if(stageNo>=stages.length)return note('No more stages');const i=stages[stageNo++],p=S.P[i];if(!p)return;
 if(p.d.type=='eng'||p.d.type=='srb'){p.on=true;if(p.d.type=='eng'&&thr==0)thr=1}
 else if(p.d.type=='chute'){p.dep=true;note('Parachute deployed')}
 else if(p.d.type=='dec'){S.P.length=i+1;S.L=S.P.reduce((a,q)=>a+q.d.h,0);S.vx+=Math.cos(S.h)*.6;S.vy+=Math.sin(S.h)*.6;note('Stage separated')}
 sendShip()}
// ---------- orbital math ----------
function prop(o,dt){const mu=o.b.mu,r0=Math.hypot(o.x,o.y),n=Math.min(500,Math.max(1,Math.ceil(Math.abs(dt)/(.02*Math.sqrt(r0**3/mu))))),h=dt/n;
 for(let i=0;i<n;i++){let r=Math.hypot(o.x,o.y),k=mu/(r*r*r);o.vx-=o.x*k*h/2;o.vy-=o.y*k*h/2;o.x+=o.vx*h;o.y+=o.vy*h;r=Math.hypot(o.x,o.y);k=mu/(r*r*r);o.vx-=o.x*k*h/2;o.vy-=o.y*k*h/2}}
function orb(b,x,y,vx,vy){const mu=b.mu,r=Math.hypot(x,y),v2=vx*vx+vy*vy,hh=x*vy-y*vx,rv=x*vx+y*vy,ex=((v2-mu/r)*x-rv*vx)/mu,ey=((v2-mu/r)*y-rv*vy)/mu,e=Math.hypot(ex,ey),a=-mu/(2*(v2/2-mu/r)),p=hh*hh/mu;
 return{e,a,p,w:Math.atan2(ey,ex),pe:p/(1+e),ap:e<1?p/(1-e):Infinity,T:e<1?TAU*Math.sqrt(a**3/mu):Infinity}}
function checkSOI(o){const b=o.b;
 if(b.p&&Math.hypot(o.x,o.y)>b.soi){const q=brel(b,ut);o.x+=q[0];o.y+=q[1];o.vx+=q[2];o.vy+=q[3];o.b=b.p;pts=[];if(o===S)note('Entering '+b.p.n+' sphere of influence');return}
 for(const c of BODIES)if(c.p===b){const q=brel(c,ut);if(Math.hypot(o.x-q[0],o.y-q[1])<c.soi){o.x-=q[0];o.y-=q[1];o.vx-=q[2];o.vy-=q[3];o.b=c;pts=[];if(o===S)note('Entering '+c.n+' sphere of influence');return}}}
// ---------- flight physics ----------
const mass=()=>S.P.reduce((a,p)=>a+p.d.dry+p.f,0),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function sasTarget(){const up=Math.atan2(S.y,S.x),v=Math.atan2(S.vy,S.vx),fast=Math.hypot(S.vx,S.vy)>1;
 return sasMode==1&&fast?v:sasMode==2&&fast?v+Math.PI:sasMode==3?up:sasMode==4?up+Math.PI:S.hold}
function phys(dt){const b=S.b,r=Math.hypot(S.x,S.y),ux=S.x/r,uy=S.y/r,alt=r-b.R,rho=b.atm&&alt<b.atm?b.rho*Math.exp(-alt/b.H):0,pr=b.rho?rho/b.rho:0;
 let F=0,tq=0,maxW=0,chute=0,nose=0;const dx=Math.cos(S.h),dy=Math.sin(S.h);
 for(let i=0;i<S.P.length;i++){const p=S.P[i],d=p.d;p.fl=0;tq+=d.tq;maxW=Math.max(maxW,d.w);if(d.type=='chute'&&p.dep&&rho>.02)chute=1;if(d.type=='nose')nose=1;
  if(p.on&&d.thr){const t=d.type=='srb'?1:thr;if(t<=0)continue;const isp=d.ispV+(d.ispA-d.ispV)*pr,need=d.thr*t/(d.ispV*G0)*dt;let src=null;
   if(d.type=='srb')src=p;else for(let j=i-1;j>=0;j--){const q=S.P[j];if(q.d.type=='dec')break;if(q.d.fuel&&q.f>0){src=q;break}}
   if(!src||src.f<=0)continue;const u=Math.min(1,src.f/need);src.f-=need*u;F+=d.thr*t*u*(isp/d.ispV);p.fl=t*u}}
 S.F=F;const m=mass(),gr=b.mu/(r*r);
 if(S.landed){if(F/m>gr)S.landed=false;else{S.vx=S.vy=0;S.w=0;return}}
 let ax=-gr*ux+F/m*dx,ay=-gr*uy+F/m*dy;
 if(rho>0){const v=Math.hypot(S.vx,S.vy),cda=.3*Math.PI*maxW*maxW/4*(nose?.7:1)+chute*150,k=.5*rho*v*cda/m;ax-=k*S.vx;ay-=k*S.vy}
 const amax=tq*1000/(m*S.L*S.L/12+1),inp=(keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0);let al=0;
 if(inp){al=inp*amax}else if(sas)al=cl(.9*wrap(sasTarget()-S.h)-1.6*S.w,-amax,amax);
 S.w+=al*dt;S.h+=S.w*dt;if(inp)S.hold=S.h;
 S.vx+=ax*dt;S.vy+=ay*dt;S.x+=S.vx*dt;S.y+=S.vy*dt;
 const r2=Math.hypot(S.x,S.y),rc=b.R+S.L/2;
 if(r2<rc){const sp=Math.hypot(S.vx,S.vy),tol=9+(S.P.some(p=>p.d.type=='legs')?6:0);
  if(sp>tol||b.id=='jovo'){boom();return}S.x*=rc/r2;S.y*=rc/r2;S.vx=S.vy=0;S.w=0;S.landed=true;note('Landed on '+b.n+'!')}}
function boom(){S.dead=true;note('Vessel destroyed — press R to rebuild');
 for(let i=0;i<140;i++){const a=Math.random()*TAU,v=Math.random()*60;pts.push({x:S.x,y:S.y,vx:S.vx+Math.cos(a)*v,vy:S.vy+Math.sin(a)*v,t:0,max:1+Math.random()*2.5,c:i%3?'#ff9a2a':'#ddd',z:3+Math.random()*6})}
 send({t:'state',v:{dead:1}})}
const canRails=()=>{if(!S||S.dead)return true;const alt=Math.hypot(S.x,S.y)-S.b.R;return S.F<=0&&thr==0&&(S.landed||alt>(S.b.atm||0))};
function setWarp(i){wi=cl(i,0,WL.length-1);const w=WL[wi];if(w>1&&!canRails()){wi=0;return note('Cannot warp now (thrusting or in atmosphere)')}warp=w;send({t:'warp',w})}
// ---------- main loop ----------
let last=performance.now();
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;ut+=dt*warp;
 if(mode=='fly'&&S){
  if(!S.dead){
   if(keys.ShiftLeft)thr=Math.min(1,thr+dt*.6);if(keys.ControlLeft)thr=Math.max(0,thr-dt*.6);
   if(warp>1&&!canRails()){warp=1;wi=0;send({t:'warp',w:1})}
   if(warp>1){if(!S.landed)prop(S,dt*warp);S.F=0;S.P.forEach(p=>p.fl=0)}
   else{const n=Math.ceil(dt*120);for(let i=0;i<n&&!S.dead;i++)phys(dt/n)}
   if(!S.dead){checkSOI(S);
    if(S.F>0&&warp==1)for(let i=0;i<3;i++){const dx=Math.cos(S.h),dy=Math.sin(S.h),sp=30+Math.random()*30;pts.push({x:S.x-dx*(S.L/2+1),y:S.y-dy*(S.L/2+1),vx:S.vx-dx*sp+(Math.random()-.5)*5,vy:S.vy-dy*sp+(Math.random()-.5)*5,t:0,max:.6+Math.random()*.8,c:'rgba(255,170,70,.7)',z:2+Math.random()*3})}}}
  for(const p of pts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t+=dt}pts=pts.filter(p=>p.t<p.max);
  if(t-lastSend>100){lastSend=t;send({t:'state',v:S.dead?{dead:1}:{b:S.b.id,x:S.x,y:S.y,vx:S.vx,vy:S.vy,h:S.h,ut,l:S.landed?1:0,fl:S.F>0?1:0}})}
  view=='flight'?drawFlight():drawMap();if(t-lastHud>100){lastHud=t;hud()}
 }else{drawBackdrop()}
 requestAnimationFrame(loop)}
// ---------- rendering ----------
function drawStars(a,rot){g.fillStyle='#fff';for(const s of stars){g.globalAlpha=a*s[2]/1.6;const x=((s[0]*cv.width-rot*300)%cv.width+cv.width)%cv.width;g.fillRect(x,s[1]*cv.height,s[2],s[2])}g.globalAlpha=1}
function drawBackdrop(){g.fillStyle='#05070f';g.fillRect(0,0,cv.width,cv.height);drawStars(1,ut*.001)}
function drawFlight(){const b=S.b,W=cv.width,H=cv.height,s=zoom,cx=W/2,cy=H*.55,r=Math.hypot(S.x,S.y),up=Math.atan2(S.y,S.x),alt=r-b.R,fr=b.atm?cl(1-alt/b.atm,0,1):0;
 const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,`rgb(${8+20*fr|0},${12+70*fr|0},${30+160*fr|0})`);sky.addColorStop(1,`rgb(${8+130*fr|0},${12+160*fr|0},${30+200*fr|0})`);
 g.fillStyle=sky;g.fillRect(0,0,W,H);drawStars(1-fr,up);
 const a=Math.PI/2-up,ca=Math.cos(a),sa=Math.sin(a),sc=(wx,wy)=>{const dx=wx-S.x,dy=wy-S.y;return[cx+(dx*ca-dy*sa)*s,cy-(dx*sa+dy*ca)*s]};
 const Rs=b.R*s,top=cy+r*s,gc=g.createLinearGradient(0,cy+alt*s,0,cy+alt*s+400);gc.addColorStop(0,shade(b.c,-10));gc.addColorStop(1,shade(b.c,-90));
 g.fillStyle=gc;g.beginPath();
 if(Rs<3e4)g.arc(cx,top,Rs,0,TAU);else{const dp=Math.asin(Math.min(1,W*.8/Rs));for(let i=-40;i<=40;i++){const f=i/40*dp;g.lineTo(cx+Rs*Math.sin(f),top-Rs*Math.cos(f))}g.lineTo(cx+W,H+99);g.lineTo(cx-W,H+99)}
 g.fill();if(b.atm&&fr>0&&Rs<3e4){g.strokeStyle='rgba(120,180,255,.4)';g.lineWidth=3;g.beginPath();g.arc(cx,top,Rs+b.atm*s,0,TAU);g.stroke()}
 if(b.id=='terra'&&Math.abs((Math.PI/2-up)*Rs)<W){const f=Math.PI/2-up;g.save();g.translate(cx-Rs*Math.sin(f),top-Rs*Math.cos(f));g.rotate(-f);g.fillStyle='#555';g.fillRect(-25*s,-1.5*s,50*s,1.5*s);g.fillStyle='#999';g.fillRect(-14*s,-14*s,2*s,14*s);g.restore()}
 for(const p of pts){const q=sc(p.x,p.y),k=1-p.t/p.max;g.globalAlpha=k;g.fillStyle=p.c;g.beginPath();g.arc(q[0],q[1],Math.max(1,p.z*k*Math.min(s,3)/2),0,TAU);g.fill()}g.globalAlpha=1;
 const ma=bpos(S.b,ut);
 for(const id in remotes){const rm=remotes[id],q=rpos(rm);if(!q||!rm.P)continue;const ra=q.ax-(ma[0]+S.x),rb=q.ay-(ma[1]+S.y);if(Math.hypot(ra,rb)>30000)continue;
  const x=cx+(ra*ca-rb*sa)*s,y=cy-(ra*sa+rb*ca)*s,hs=rm.v.h+a;g.save();g.translate(x,y);g.rotate(Math.PI/2-hs);
  if(s*20>8)drawStack(g,rm.P,s,rm.col);else{g.fillStyle=rm.col;g.fillRect(-3,-6,6,12)}g.restore();g.fillStyle='#cfe';g.font='12px sans-serif';g.fillText(rm.name+' · '+fmt(Math.hypot(ra,rb),'m'),x+12,y-12)}
 if(!S.dead){g.save();g.translate(cx,cy);const hs=S.h+a;g.rotate(Math.PI/2-hs);
  if(s*S.L>14)drawStack(g,S.P,s,S.col);else{g.fillStyle=S.col;g.beginPath();g.moveTo(0,-9);g.lineTo(5,6);g.lineTo(-5,6);g.fill()}g.restore()}}
function ring(x,y,r,col,w=1){if(r>3e5)return;g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke()}
function drawMap(){const W=cv.width,H=cv.height,s=mapS;g.fillStyle='#04060d';g.fillRect(0,0,W,H);drawStars(.8,0);
 const sa=S.dead?[0,0]:(()=>{const p=bpos(S.b,ut);return[p[0]+S.x,p[1]+S.y]})(),fp=focus=='ship'?sa:bpos(BI[focus],ut),T=(x,y)=>[W/2+(x-fp[0])*s,H/2-(y-fp[1])*s];
 g.font='12px sans-serif';
 for(const b of BODIES)if(b.p){const c=T(...bpos(b.p,ut));ring(c[0],c[1],b.a*s,'rgba(120,160,255,.22)')}
 for(const b of BODIES){const c=T(...bpos(b,ut)),pr=Math.max(b.R*s,3);
  if(b.id=='sol'){const gl=g.createRadialGradient(c[0],c[1],pr*.2,c[0],c[1],pr*3);gl.addColorStop(0,'rgba(255,220,120,.9)');gl.addColorStop(1,'rgba(255,180,50,0)');g.fillStyle=gl;g.beginPath();g.arc(c[0],c[1],pr*3,0,TAU);g.fill()}
  const gr=g.createRadialGradient(c[0]-pr*.3,c[1]-pr*.3,pr*.1,c[0],c[1],pr);gr.addColorStop(0,shade(b.c,50));gr.addColorStop(1,shade(b.c,-70));g.fillStyle=gr;g.beginPath();g.arc(c[0],c[1],pr,0,TAU);g.fill();
  if(b.atm&&pr>6)ring(c[0],c[1],(b.R+b.atm)*s,'rgba(120,180,255,.5)',2);if(b.p)ring(c[0],c[1],b.soi*s,'rgba(255,255,255,.15)');
  g.fillStyle='#bcd';g.fillText(b.n,c[0]+pr+5,c[1]-5)}
 const ship=(o,col,name)=>{const p=bpos(o.b,ut),e=orb(o.b,o.x,o.y,o.vx,o.vy),c=T(...p);g.strokeStyle=col;g.lineWidth=1.5;g.beginPath();
  const lim=e.e>=1?Math.acos(-1/e.e)*.98:Math.PI;let on=0;
  for(let i=0;i<=240;i++){const nu=-lim+2*lim*i/240,rr=e.p/(1+e.e*Math.cos(nu));if(!(rr>0)||rr>o.b.soi){on=0;continue}const q=T(p[0]+rr*Math.cos(nu+e.w),p[1]+rr*Math.sin(nu+e.w));on?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);on=1}g.stroke();
  const m=T(p[0]+o.x,p[1]+o.y);g.fillStyle=col;g.beginPath();g.arc(m[0],m[1],4,0,TAU);g.fill();g.fillText(name,m[0]+8,m[1]+4);return{e,p}};
 for(const id in remotes){const q=rpos(remotes[id]);if(q)ship(q.o,remotes[id].col,remotes[id].name)}
 if(!S.dead){const{e,p}=ship(S,'#7dff9a',S.name);for(const[nu,l]of[[0,'Pe'],[Math.PI,'Ap']]){if(l=='Ap'&&e.e>=1)continue;const rr=e.p/(1+e.e*Math.cos(nu)),q=T(p[0]+rr*Math.cos(nu+e.w),p[1]+rr*Math.sin(nu+e.w));g.fillStyle='#ffd45a';g.fillText(l+' '+fmt(rr-S.b.R,'m'),q[0]+6,q[1]-6);g.fillRect(q[0]-2,q[1]-2,4,4)}}
 g.fillStyle='#8ab';g.fillText('MAP · focus: '+focus+' (F) · wheel zoom · M to return',W/2-110,24)}
function fitMap(){const b=BI[focus],W=Math.min(cv.width,cv.height)*.45;let ext=focus=='ship'&&!S.dead?Math.max(Math.hypot(S.x,S.y)*3,1):b.id=='sol'?8e10:isFinite(b.soi)?b.soi*1.1:1e9;if(focus=='ship'&&!S.dead){const o=orb(S.b,S.x,S.y,S.vx,S.vy);if(o.ap<1e12)ext=o.ap*1.3}mapS=W/ext}
// ---------- remote players ----------
function addR(p){const r=remotes[p.id]=remotes[p.id]||{};r.name=p.name;if(p.ship)setShip(r,p.ship);if(p.v)r.v=p.v}
function setShip(r,sh){r.col=sh.col;r.P=mkP(sh.parts)}
function rpos(r){const v=r.v;if(!v||v.dead||!v.b)return null;const o={b:BI[v.b],x:v.x,y:v.y,vx:v.vx,vy:v.vy};if(!v.l)prop(o,cl(ut-v.ut,-1e6,1e6));
 if(r.P)r.P.forEach(p=>p.fl=v.fl&&p.d.thr?1:0);const p=bpos(o.b,ut);return{o,ax:p[0]+o.x,ay:p[1]+o.y}}
function connect(){ws=new WebSocket((location.protocol=='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>send({t:'join',name:$('pname').value});
 ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.t=='welcome'){myId=m.id;ut=m.ut;warp=m.warp;m.players.forEach(addR)}
  else if(m.t=='sync'){ut=m.ut;if(m.warp!=warp){warp=m.warp;wi=Math.max(0,WL.indexOf(warp))}online=m.n}
  else if(m.t=='join')addR(m.p);else if(m.t=='leave')delete remotes[m.id];
  else if(m.t=='ship'){remotes[m.id]=remotes[m.id]||{name:'?'};setShip(remotes[m.id],m.ship)}
  else if(m.t=='state'){(remotes[m.id]=remotes[m.id]||{name:'?'}).v=m.v}
  else if(m.t=='chat'){const d=document.createElement('div');d.textContent=m.name+': '+m.text;$('log').appendChild(d);while($('log').children.length>7)$('log').firstChild.remove()}
  $('online').innerHTML='Online: '+online+'<br>'+Object.values(remotes).map(r=>'• '+r.name).join('<br>')};
 ws.onclose=()=>{setTimeout(connect,3000)}}
// ---------- HUD ----------
const fT=s=>{s=Math.floor(s);return`Day ${s/86400|0} ${String(s/3600%24|0).padStart(2,0)}:${String(s/60%60|0).padStart(2,0)}:${String(s%60).padStart(2,0)}`};
function hud(){const b=S.b,r=Math.hypot(S.x,S.y),alt=r-b.R,sp=Math.hypot(S.vx,S.vy),o=orb(b,S.x,S.y,S.vx,S.vy),m=mass(),vr=(S.x*S.vx+S.y*S.vy)/r;
 let fu=0,fm=0;S.P.forEach(p=>{if(p.d.fuel){fu+=p.f;fm+=p.d.fuel}});
 $('tel').innerHTML=`<b>${S.name}</b> · ${b.n}${S.landed?' · LANDED':''}<br>ALT ${fmt(alt,'m')}<br>SPD ${sp.toFixed(1)} m/s<br>V↕ ${vr.toFixed(1)} m/s<br>AP ${o.ap==Infinity?'—':fmt(o.ap-b.R,'m')}<br>PE ${fmt(o.pe-b.R,'m')}<br>ECC ${o.e.toFixed(3)} · T ${o.T==Infinity?'—':fmt(o.T,'s')}<br>MASS ${(m/1000).toFixed(2)} t · TWR ${(S.F/(m*b.mu/(r*r))).toFixed(2)}<br>FUEL ${fm?(fu/fm*100).toFixed(0):0}%<br>SAS ${sas?'ON · '+SM[sasMode]:'OFF'}`;
 const nx=stages[stageNo]!=null&&S.P[stages[stageNo]];
 $('top').innerHTML=`${fT(ut)}<br>WARP ×${warp}<br>Next stage: ${nx?nx.d.n:'—'}<br>Online: ${online}`;$('thrb').style.height=thr*100+'%';
 const W=130,c=W/2,R=58,up=Math.atan2(S.y,S.x);ng.clearRect(0,0,W,W);ng.save();ng.translate(c,c);ng.beginPath();ng.arc(0,0,R,0,TAU);ng.clip();ng.rotate(-(up-S.h));
 ng.fillStyle='#3a86d8';ng.fillRect(-R,-R,2*R,R);ng.fillStyle='#8a5a30';ng.fillRect(-R,0,2*R,R);ng.fillStyle='#fff';ng.fillRect(-R,-1,2*R,2);ng.restore();
 const d=Math.atan2(S.vy,S.vx)-S.h;if(sp>.5)for(const[k,col]of[[0,'#7dff4a'],[Math.PI,'#ffcc33']]){const px=c-.7*R*Math.sin(d+k),py=c-.7*R*Math.cos(d+k);ng.strokeStyle=col;ng.lineWidth=2;ng.beginPath();ng.arc(px,py,6,0,TAU);ng.stroke();if(!k){ng.moveTo(px,py-6);ng.lineTo(px,py-11);ng.stroke()}else{ng.moveTo(px-4,py-4);ng.lineTo(px+4,py+4);ng.moveTo(px+4,py-4);ng.lineTo(px-4,py+4);ng.stroke()}}
 ng.strokeStyle='#ff9a2a';ng.lineWidth=3;ng.beginPath();ng.moveTo(c-14,c);ng.lineTo(c-4,c);ng.lineTo(c,c-6);ng.lineTo(c+4,c);ng.lineTo(c+14,c);ng.stroke();ng.strokeStyle='#9bd';ng.lineWidth=2;ng.beginPath();ng.arc(c,c,R,0,TAU);ng.stroke()}
// ---------- input ----------
addEventListener('keydown',e=>{if(e.target.tagName=='INPUT'){if(e.code=='Enter'&&e.target.id=='ci'){const t=e.target.value.trim();if(t)send({t:'chat',text:t});e.target.value='';e.target.blur()}return}
 keys[e.code]=1;if(mode!='fly')return;const k=e.code;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(k))e.preventDefault();
 if(k=='Enter'){$('ci').focus();e.preventDefault()}
 else if(k=='Space'&&!S.dead)stage();else if(k=='KeyT'){sas=!sas;S.hold=S.h}else if(k=='KeyY'){sasMode=(sasMode+1)%SM.length;sas=true;S.hold=S.h}
 else if(k=='KeyZ')thr=1;else if(k=='KeyX')thr=0;else if(k=='Period')setWarp(wi+1);else if(k=='Comma')setWarp(wi-1);
 else if(k=='KeyH')$('help').hidden=!$('help').hidden;
 else if(k=='KeyM'&&!S.dead){view=view=='flight'?'map':'flight';if(view=='map'){focus=S.b.id;fitMap()}}
 else if(k=='KeyF'&&view=='map'){const l=[...BODIES.map(b=>b.id),'ship'];focus=l[(l.indexOf(focus)+1)%l.length];fitMap()}
 else if(k=='KeyR'){if(S.dead||confirm('Abandon vessel and return to the hangar?')){send({t:'state',v:{dead:1}});mode='build';S=null;warp=1;$('hud').hidden=true;$('build').hidden=false;rs()}}});
addEventListener('keyup',e=>keys[e.code]=0);
addEventListener('wheel',e=>{if(mode!='fly')return;const f=Math.pow(1.12,-Math.sign(e.deltaY));if(view=='map')mapS*=f;else zoom=cl(zoom*f,5e-5,60)},{passive:true});
buildUI();rs();connect();requestAnimationFrame(loop);
