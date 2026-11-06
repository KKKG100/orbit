const express=require('express'),http=require('http'),{WebSocketServer}=require('ws');
const app=express();app.use(express.static('public'));
const srv=http.createServer(app),wss=new WebSocketServer({server:srv});
let ut=0,warp=1,nid=1;const P=new Map();
const send=(w,m)=>w.readyState===1&&w.send(JSON.stringify(m));
const all=(m,ex)=>wss.clients.forEach(c=>c!==ex&&send(c,m));
setInterval(()=>{ut+=0.25*warp;all({t:'sync',ut,warp,n:P.size})},250);
wss.on('connection',ws=>{
  const id=nid++;
  ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}
    if(m.t==='join'){const name=String(m.name||'Pilot').slice(0,16);let p=P.get(id);
      if(p){p.name=name;all({t:'join',p},ws);return}
      p={id,name,ship:null,v:null};P.set(id,p);
      send(ws,{t:'welcome',id,ut,warp,players:[...P.values()].filter(q=>q.id!==id)});all({t:'join',p},ws);return}
    const p=P.get(id);if(!p)return;
    if(m.t==='ship'){p.ship=m.ship;all({t:'ship',id,ship:m.ship},ws)}
    else if(m.t==='state'){p.v=m.v;all({t:'state',id,v:m.v},ws)}
    else if(m.t==='chat')all({t:'chat',name:p.name,text:String(m.text).slice(0,200)});
    else if(m.t==='warp')warp=Math.max(1,Math.min(1e5,+m.w||1));
  });
  ws.on('close',()=>{P.delete(id);all({t:'leave',id})});
});
srv.listen(process.env.PORT||3000,()=>console.log('Orbital Frontier running'));
