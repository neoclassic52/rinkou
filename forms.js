/* Shared animation geometry: the visible wings, palms and escorts are also weapon origins. */
(function(root){
 'use strict';
 const COLORS={spread:'#a0ff83',laser:'#69b7ff'},TAU=Math.PI*2;
 const STEPS=[
  {version:'1.0',count:3,damage:10,interval:.14,spread:.105,beam:6,laserDps:83,drones:0},
  {version:'1.3',count:3,damage:11,interval:.132,spread:.11,beam:8,laserDps:99,drones:0},
  {version:'1.6',count:3,damage:12,interval:.124,spread:.115,beam:10,laserDps:118,drones:0},
  {version:'2.0',count:5,damage:13,interval:.12,spread:.12,beam:13,laserDps:150,drones:1},
  {version:'2.3',count:5,damage:14,interval:.113,spread:.125,beam:16,laserDps:176,drones:2},
  {version:'2.6',count:5,damage:15,interval:.106,spread:.13,beam:19,laserDps:205,drones:3},
  {version:'3.0',count:11,damage:17,interval:.102,spread:.085,beam:23,laserDps:245,drones:0},
  {version:'3.3',count:13,damage:18.5,interval:.096,spread:.08,beam:27,laserDps:285,drones:0},
  {version:'3.6',count:15,damage:20,interval:.09,spread:.075,beam:31,laserDps:330,drones:0}
 ];
 const MAX_FORM=STEPS.length-1;
 // Glow quality: 1 = soft blurred glow; 0 = no per-shape blur (the game adds a cheap aura sprite instead).
 let Q=1;const setQuality=q=>{Q=q;};
 // Visual travel speed for every minor upgrade; combat and item timing stay separate.
 const travelSpeeds=[38,52,70,92,120,155,195,245,305];
 STEPS.forEach((step,i)=>{step.travelSpeed=travelSpeeds[i];});
 const STILL={vx:0,vy:0,bank:0,thrust:0},clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 // motion: smoothed ship velocity; escorts trail behind it and the airframe banks into turns.
 function pose(route,power,time=0,motion=STILL){
  const stage=Math.floor(power/3),minor=power%3,w=STEPS[power],drones=[],m=motion||STILL;
  for(let side of [-1,1])for(let i=0;i<w.drones;i++){const lag=(i+1)*.03;drones.push({x:side*(52+i*32)-clamp((m.vx||0)*lag,-30,30),y:8+i*9+Math.sin(time*3-i*.8)*3-clamp((m.vy||0)*lag,-24,24),side});}
  return {route,power,stage,minor,drones,span:[80,112,144][minor],wingAngle:-.25+Math.sin(time*3.7)*.24,arms:64*[1,1.35,1.7][minor],skirt:65*[1,1.35,1.7][minor],skirtWidth:[35,48,61][minor],time,bank:clamp(m.bank||0,-1,1),thrust:clamp(m.thrust||0,-1,1)};
 }
 // The wing leading a turn sweeps back and foreshortens; the trailing wing reaches out.
 const wingAngle=(p,side)=>p.wingAngle+side*p.bank*.28,wingSpan=(p,side)=>p.span*(1-side*p.bank*.14);
 function wingPoint(p,side,u){
  // Cubic leading edge, transformed with exactly the same wing angle as the renderer.
  const v=1-u,x=(3*v*v*u*.32+3*v*u*u*.7+u*u*u)*wingSpan(p,side),y=3*v*v*u*-34+3*v*u*u*-28+u*u*u*-12,a=wingAngle(p,side);
  return {x:side*(11+x*Math.cos(a)-y*Math.sin(a)),y:-7+x*Math.sin(a)+y*Math.cos(a)};
 }
 function handPoint(p,side){return {x:side*p.arms*(1-side*p.bank*.12),y:-19+Math.sin(p.time*2.2+side*.3)*3+side*p.bank*7};}
 function spreadMuzzles(power,time=0,motion){
  const p=pose('spread',power,time,motion),w=STEPS[power],ports=[];
  if(p.stage===2){
   const half=(w.count-1)/2;
   for(let i=-half;i<=half;i++){const point=i===0?{x:0,y:-47}:wingPoint(p,Math.sign(i),.17+.8*Math.abs(i)/half);ports.push({...point,angle:-Math.PI/2+i*w.spread,kind:i?'wing':'core'});}
  }else{
   for(let i=0;i<w.count;i++)ports.push({x:(i-(w.count-1)/2)*5,y:-31,angle:-Math.PI/2+(i-(w.count-1)/2)*w.spread,kind:'core'});
   for(const d of p.drones)ports.push({x:d.x,y:d.y-15,angle:-Math.PI/2+d.side*.055,kind:'escort'});
  }
  return ports;
 }
 function laserBeams(power,time=0,motion){
  const p=pose('laser',power,time,motion),w=STEPS[power],beams=[{x:0,y:p.stage===2?-14:-31,width:w.beam,weight:1,kind:'core'}];
  if(p.stage===1)for(const d of p.drones)beams.push({x:d.x,y:d.y-15,width:Math.max(2,w.beam*.23),weight:.1,kind:'escort'});
  if(p.stage===2)for(let side of [-1,1])beams.push({...handPoint(p,side),width:w.beam*.35,weight:.22,kind:'hand'});
  return beams;
 }
 function describe(route,power){
  const p=pose(route,power),w=STEPS[power],name=p.stage===0?'燐光の機体':p.stage===1?'子機編隊':route==='spread'?'翠光の火の鳥':'蒼光の女神';
  const shape=p.stage===0?['基本形態','翼端の光を強化','翼端と後光を強化'][p.minor]:p.stage===1?`左右に${w.drones}機ずつ・合計${w.drones*2}機の子機`:route==='spread'?`羽ばたく翼・翼の長さ ${[100,140,180][p.minor]}%`:`両腕とスカートの長さ ${[100,135,170][p.minor]}%`;
  const attack=route==='spread'?`${spreadMuzzles(power).length}発を同時発射 · 毎秒${(1/w.interval).toFixed(1)}回 · １発の威力 ${w.damage}`:`主レーザーの太さ ${w.beam} · 毎秒の威力 ${w.laserDps}${p.stage===1?' ＋ 子機レーザー'+w.drones*2+'本':p.stage===2?' ＋ 両手のレーザー２本':''}`;
  return {name,shape,attack,music:`楽曲 ${p.stage+1} / ${p.stage===0?'出撃時':p.stage===1?'2.0到達時に切り替え':'3.0到達時に切り替え'}`};
 }
 function line(c,x1,y1,x2,y2,color,width=1,blur=8){c.strokeStyle=color;c.lineWidth=width;c.shadowColor=color;c.shadowBlur=Q*(blur);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 function dot(c,x,y,r,color,blur=12){c.fillStyle=color;c.shadowColor=color;c.shadowBlur=Q*(blur);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
 function ship(c,route,minor,time,small=false,bank=0,thrust=0){
  const col=COLORS[route],blue=route==='laser',wing=40+minor*4,wl=wing*(1+bank*.18),wr=wing*(1-bank*.18);
  c.save();c.shadowColor=col;c.shadowBlur=Q*(small?7:14);
  const flame=c.createLinearGradient(0,23,0,small?65:91);flame.addColorStop(0,col+'99');flame.addColorStop(1,col+'00');c.fillStyle=flame;
  for(let side of [-1,1]){const len=(68+Math.sin(time*19+side)*12)*(1+thrust*.45)*(1-side*bank*.22);c.beginPath();c.moveTo(side*12-5,21);c.lineTo(side*12+5,21);c.lineTo(side*12,len);c.closePath();c.fill();}
  if(!small){c.fillStyle='#ffffffaa';for(let side of [-1,1]){c.beginPath();c.moveTo(side*12-2,21);c.lineTo(side*12+2,21);c.lineTo(side*12,21+(22+Math.sin(time*31+side)*5)*(1+thrust*.5));c.closePath();c.fill();}}
  const g=c.createLinearGradient(-wl,0,wr,0);g.addColorStop(0,blue?'#185078':'#245b28');g.addColorStop(.28,col);g.addColorStop(.5,blue?'#d9f5ff':'#e0ffc5');g.addColorStop(.72,col);g.addColorStop(1,blue?'#174374':'#24612b');c.fillStyle=g;
  c.beginPath();c.moveTo(0,-39);c.bezierCurveTo(8,-18,8,-8,16,-2);c.lineTo(wr,24);c.lineTo(18,19);c.lineTo(13,31);c.lineTo(0,21);c.lineTo(-13,31);c.lineTo(-18,19);c.lineTo(-wl,24);c.lineTo(-16,-2);c.bezierCurveTo(-8,-8,-8,-18,0,-39);c.fill();
  c.fillStyle=blue?'#103458':'#22432a';c.shadowBlur=0;c.beginPath();c.moveTo(0,-27);c.lineTo(6,1);c.lineTo(0,13);c.lineTo(-6,1);c.fill();line(c,bank*2.5,-23,bank*2.5,4,'#efffff',2,5);
  for(let side of [-1,1]){const w=side>0?wr:wl;for(let i=0;i<4+minor;i++)line(c,side*(12+i*3),i*3,side*(22+i*3),16+i,col,.7,2);if(minor)dot(c,side*(w-5),19,1.5+minor,col,10);}
  // Canards flex with the turn and a sensor light sweeps across the nose.
  if(!small){for(let side of [-1,1]){const k=side*bank;line(c,side*6,-16,side*(15-k*3),-9+k*4,col,1.4,6);}dot(c,Math.sin(time*2.4)*4,-30,1.4,'#ffffff',8);}
  c.restore();
 }
 function phoenix(c,p){
  const col=COLORS.spread,t=p.time;
  c.save();
  // Five flame-like tail feathers, each moving at its own phase.
  for(let i=-2;i<=2;i++){
   const sway=Math.sin(t*3+i*.8)*(7+Math.abs(i)*2)-p.bank*12,length=(76+p.minor*9-Math.abs(i)*10)*(1+Math.max(0,p.thrust)*.22);
   const g=c.createLinearGradient(0,10,0,length);g.addColorStop(0,'#ccffad');g.addColorStop(.45,'#70ff7799');g.addColorStop(1,'#46ee7900');c.fillStyle=g;c.shadowColor=col;c.shadowBlur=Q*(12);
   c.beginPath();c.moveTo(i*4,10);c.bezierCurveTo(i*12+8,40,i*13+sway+8,length-5,i*16+sway,length);c.bezierCurveTo(i*11+sway-7,length-12,i*9-7,34,i*4-3,15);c.fill();
  }
  // Final form: peacock-eye streamers hang beneath the wings and ripple as the bird flies.
  if(p.power===MAX_FORM){const curves=[];for(let side of [-1,1])for(let k=0;k<4;k++){
   const root=wingPoint(p,side,.3+k*.2),x0=root.x,y0=root.y+16,len=(118+k*16)*(1+Math.max(0,p.thrust)*.2),ph=t*2.6+k*.9+side;
   curves.push([x0,y0,x0+side*(4+k*4)+Math.sin(ph+1.3)*14,y0+len*.5,x0+side*(14+k*12)-p.bank*18+Math.sin(ph)*10,y0+len,ph]);}
   peacocks(c,curves,t);}
  for(let side of [-1,1]){
   const span=wingSpan(p,side);c.save();c.translate(side*11,-7);c.scale(side,1);c.rotate(wingAngle(p,side));
   const g=c.createLinearGradient(0,0,span,20);g.addColorStop(0,'#eaffd1');g.addColorStop(.4,'#91ff71');g.addColorStop(1,'#4bd779');c.fillStyle=g;c.strokeStyle='#c7ffa9';c.lineWidth=.8;c.shadowColor=col;c.shadowBlur=Q*(16);
   c.beginPath();c.moveTo(0,0);c.bezierCurveTo(span*.32,-34,span*.7,-28,span,-12);
   for(let j=10;j>=1;j--){const u=j/10;c.lineTo(span*u+4,5+Math.sin(u*Math.PI)*29);c.quadraticCurveTo(span*(u-.03),7+Math.sin(u*Math.PI)*10,span*(u-.065),-1+Math.sin(u*Math.PI)*8);}
   c.quadraticCurveTo(4,24,0,0);c.fill();c.stroke();
   c.shadowBlur=Q*(5);for(const odd of [1,0]){c.strokeStyle=odd?'#e4ffc7aa':'#216c4988';c.beginPath();for(let j=odd?1:2;j<=10;j+=2){const u=j/10;c.moveTo(6+u*span*.42,-5-u*9);c.quadraticCurveTo(u*span*.85,-4+Math.sin(u*Math.PI)*14,u*span+2,5+Math.sin(u*Math.PI)*29);}c.stroke();}
   c.restore();
  }
  c.shadowColor=col;c.shadowBlur=Q*(18);const body=c.createLinearGradient(-12,0,12,0);body.addColorStop(0,'#36975c');body.addColorStop(.5,'#ecffd2');body.addColorStop(1,'#62ee7a');c.fillStyle=body;
  c.beginPath();c.moveTo(0,-43);c.bezierCurveTo(13,-32,10,-17,16,-7);c.bezierCurveTo(12,7,9,19,0,34);c.bezierCurveTo(-9,19,-12,7,-16,-7);c.bezierCurveTo(-10,-17,-13,-32,0,-43);c.fill();
  c.fillStyle='#eaffc8';c.beginPath();c.moveTo(-4,-40);c.lineTo(0,-54);c.lineTo(5,-40);c.fill();
  for(let side of [-1,1]){line(c,side*3,-43,side*12,-49,col,1.4,8);dot(c,side*4,-33,1.4,'#ffffff',4);line(c,side*4,-13,side*8,14,'#79d871',1,2);}
  line(c,0,-25,0,16,'#f7ffe8',1.5,8);
  const ports=spreadMuzzles(p.power,p.time).filter(v=>v.kind==='wing');c.shadowBlur=0;for(const [r,fill] of [[4.5,'#b8ff9a55'],[1.8,'#eaffe1']]){c.fillStyle=fill;c.beginPath();for(const q of ports){c.moveTo(q.x+r,q.y);c.arc(q.x,q.y,r,0,TAU);}c.fill();}
  c.restore();
 }
 // A point on a quadratic curve plus its heading, for laying ornaments along streamers.
 function qpt(x0,y0,cx,cy,x1,y1,u){const v=1-u;return {x:v*v*x0+2*v*u*cx+u*u*x1,y:v*v*y0+2*v*u*cy+u*u*y1,a:Math.atan2(2*v*(cy-y0)+2*u*(y1-cy),2*v*(cx-x0)+2*u*(x1-cx))};}
 // Teardrop eye (tip upstream) added to the current path, placed at q, turned along the streamer and scaled.
 function eyePath(c,q,sc,oy,rx,ry){const a=q.a-Math.PI/2,ca=Math.cos(a)*sc,sa=Math.sin(a)*sc,P=(x,y)=>[q.x+x*ca-y*sa,q.y+x*sa+y*ca];
  const m=P(0,oy-ry),c1=P(rx*1.3,oy-ry*.3),c2=P(rx,oy+ry),e=P(0,oy+ry),c3=P(-rx,oy+ry),c4=P(-rx*1.3,oy-ry*.3);
  c.moveTo(...m);c.bezierCurveTo(...c1,...c2,...e);c.bezierCurveTo(...c3,...c4,...m);}
 // Peacock streamers, drawn in a handful of batched layers (shaft glow, shaft, highlight, barbs, then each eye ring).
 function peacocks(c,curves,t){
  c.save();c.shadowBlur=0;c.lineCap='round';
  const shafts=(w,color)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();for(const [x0,y0,cx,cy,x1,y1] of curves){c.moveTo(x0,y0);c.quadraticCurveTo(cx,cy,x1,y1);}c.stroke();};
  shafts(10,'#ff8a4a40');shafts(4,'#ff7a3c');shafts(1.2,'#fff0c8aa');
  c.strokeStyle='#9dffb466';c.lineWidth=.7;c.beginPath();
  for(const [x0,y0,cx,cy,x1,y1,ph] of curves)for(let i=2;i<14;i++){const q=qpt(x0,y0,cx,cy,x1,y1,i/14),n=q.a+Math.PI/2,l=4+i*.5+Math.sin(t*5+i+ph)*2;c.moveTo(q.x-Math.cos(n)*l,q.y-Math.sin(n)*l);c.lineTo(q.x+Math.cos(n)*l,q.y+Math.sin(n)*l);}
  c.stroke();
  const eyes=[];for(const [x0,y0,cx,cy,x1,y1] of curves)for(const [u,sc] of [[.42,.62],[.7,.8],[1,1.05]])eyes.push([qpt(x0,y0,cx,cy,x1,y1,u),sc]);
  for(const [rx,ry,oy,fill] of [[11.5,16,0,'#6dffb030'],[8.5,12,0,'#6dffb0'],[6,8.5,1.5,'#2fd0d8'],[3.6,5,3,'#1b3a8f']]){c.fillStyle=fill;c.beginPath();for(const [q,sc] of eyes)eyePath(c,q,sc,oy,rx,ry);c.fill();}
  c.fillStyle='#ffffff';c.beginPath();for(const [q,sc] of eyes){const a=q.a-Math.PI/2,x=q.x+(-1*Math.cos(a)-1*Math.sin(a))*sc,y=q.y+(-1*Math.sin(a)+1*Math.cos(a))*sc;c.moveTo(x+1.3*sc,y);c.arc(x,y,1.3*sc,0,TAU);}c.fill();
  c.restore();}
 function goddess(c,p){
  const col=COLORS.laser,t=p.time,sw=p.skirtWidth,hem=p.skirt*(1+Math.max(0,p.thrust)*.12),drift=-p.bank*11,final=p.power===MAX_FORM;
  c.save();c.shadowColor=col;c.shadowBlur=Q*(16);
  // Hair streams behind the shoulders; translucent sleeves hang from the open arms.
  c.fillStyle='#379af0aa';for(let side of [-1,1]){c.beginPath();c.moveTo(side*4,-45);c.bezierCurveTo(side*24,-34,side*16+drift*.4,5,side*(24+Math.sin(t*2)*5)+drift,35);c.bezierCurveTo(side*6,16,side*7,-9,side*4,-31);c.fill();}
  // Final form: a pleated, jewel-studded cape spreads from the shoulders to the hands like great wings.
  if(final)for(let side of [-1,1]){
   const hand=handPoint(p,side),sx=side*9,sy=-22,ex=side*(sw+34)+drift*1.3,ey=hem+14,kx=side*p.arms*1.28+drift*.6,ky=hem*.3,N=16,pts=[];
   for(let k=0;k<=N;k++){const u=k/N,v=1-u,f=Math.sin(u*Math.PI);pts.push({x:v*v*hand.x+2*v*u*kx+u*u*ex+side*Math.sin(t*3.1+k*.55)*5*f,y:v*v*hand.y+2*v*u*ky+u*u*ey+Math.cos(t*2.6+k*.5)*5*f+(k%2?6:0)*(.4+.6*u)});}
   const cg=c.createRadialGradient(sx,sy,6,sx,sy,p.arms*1.5);cg.addColorStop(0,'#ffffffdd');cg.addColorStop(.5,'#cfe6ffaa');cg.addColorStop(1,'#8fb6ff55');
   c.shadowColor='#b8d8ff';c.shadowBlur=Q*(20);for(const odd of [0,1]){c.fillStyle=odd?cg:'#e9f3ffb0';c.beginPath();for(let k=odd;k<N;k+=2){c.moveTo(sx,sy);c.lineTo(pts[k].x,pts[k].y);c.lineTo(pts[k+1].x,pts[k+1].y);c.closePath();}c.fill();}
   c.shadowBlur=0;c.strokeStyle='#ffffffcc';c.lineWidth=1;c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke();
   c.strokeStyle='#7fa6e699';c.lineWidth=.6;c.beginPath();for(let k=1;k<N;k++){c.moveTo(sx,sy);c.lineTo(pts[k].x,pts[k].y);}c.stroke();
   const sq=[];for(let k=1;k<N;k++)for(const f of [.45,.68,.88]){const tw=Math.sin(t*7+k*1.9+f*11);if(tw>.35)sq.push(sx+(pts[k].x-sx)*f,sy+(pts[k].y-sy)*f,.8+tw*1.2);}
   for(const [r,fill] of [[2.8,'#dff0ff50'],[1,'#ffffff']]){c.fillStyle=fill;c.beginPath();for(let i=0;i<sq.length;i+=3){c.moveTo(sq[i]+sq[i+2]*r,sq[i+1]);c.arc(sq[i],sq[i+1],sq[i+2]*r,0,TAU);}c.fill();}
   c.shadowColor=col;c.shadowBlur=Q*(16);}
  for(let side of [-1,1]){
   const hand=handPoint(p,side),flutter=Math.sin(t*3+side)*7;
   if(!final){const sleeve=c.createLinearGradient(0,-20,0,42);sleeve.addColorStop(0,'#b9eaffbb');sleeve.addColorStop(1,'#2d8cfc16');c.fillStyle=sleeve;c.strokeStyle='#93d9ff99';c.lineWidth=.7;
   c.beginPath();c.moveTo(side*10,-20);c.quadraticCurveTo(side*p.arms*.58,-10,hand.x,hand.y);c.bezierCurveTo(side*p.arms*.78,10+flutter,side*p.arms*.61,43+flutter,side*14,21);c.bezierCurveTo(side*24,11,side*20,-7,side*10,-20);c.fill();c.stroke();
   for(let n=1;n<=3;n++){c.beginPath();c.moveTo(side*(12+n*4),-15);c.quadraticCurveTo(side*p.arms*(.36+n*.11),21+flutter,side*p.arms*(.54+n*.1),12+flutter);c.stroke();}}
   c.strokeStyle='#d5f1ff';c.lineWidth=5.5;c.lineCap='round';c.beginPath();c.moveTo(side*10,-19);c.quadraticCurveTo(side*p.arms*.5,-9,hand.x-side*4,hand.y);c.stroke();
   dot(c,hand.x,hand.y,3.5,'#e6faff',12);for(let n=0;n<3;n++)line(c,hand.x+side*(n-1)*2,hand.y-2,hand.x+side*(n-1)*2.4,hand.y-7-n*.7,'#c3eaff',1,3);
  }
  const skirt=c.createLinearGradient(-sw,5,sw,hem);skirt.addColorStop(0,'#2d71cd');skirt.addColorStop(.38,'#a1dfff');skirt.addColorStop(.54,'#e5f6ff');skirt.addColorStop(.75,'#64b6ff');skirt.addColorStop(1,'#2874d988');c.fillStyle=skirt;c.strokeStyle='#b4e8ff';c.lineWidth=.9;
  c.beginPath();c.moveTo(-9,4);c.bezierCurveTo(-14,30,-sw+Math.sin(t*3)*5+drift*.5,hem*.72,-sw+drift,hem-4);
  for(let i=0;i<=8;i++){const x=-sw+2*sw*i/8+drift,y=hem+Math.sin(t*3.2+i*.95)*6;c.quadraticCurveTo(x-sw/9,y-8,x,y);}
  c.bezierCurveTo(sw+Math.sin(t*2.8)*5+drift*.5,hem*.65,14,29,9,4);c.closePath();c.fill();c.stroke();
  for(let i=-3;i<=3;i++){const sway=Math.sin(t*3+i*.8)*5;c.strokeStyle=i%2?'#d6f3ff99':'#2c75cba0';c.lineWidth=i===0?1.4:.8;c.beginPath();c.moveTo(i*2,9);c.bezierCurveTo(i*4+sway,hem*.32,i*sw/4-sway+drift*.5,hem*.65,i*sw/3.4+drift,hem+Math.sin(t*3.2+(i+4)*.95)*4-3);c.stroke();}
  // Rear view: shoulder blades, a back seam and streaming hair, with no face or chest gem.
  c.fillStyle='#c2eaff';c.beginPath();c.moveTo(-6,-29);c.lineTo(-14,-18);c.quadraticCurveTo(-13,-9,-7,1);c.lineTo(-11,10);c.quadraticCurveTo(0,15,11,10);c.lineTo(7,1);c.quadraticCurveTo(13,-9,14,-18);c.lineTo(6,-29);c.fill();
  for(let side of [-1,1]){c.strokeStyle='#5d9bd5';c.lineWidth=.8;c.beginPath();c.moveTo(side*11,-20);c.quadraticCurveTo(side*5,-17,side*7,-10);c.stroke();}
  line(c,0,-9,0,8,'#467bb8',.8,0);line(c,-9,6,9,6,'#f5fcff',2,6);
  // A small bow and two ribbons trail from the back of the waist.
  c.fillStyle='#d8f5ff';for(let side of [-1,1]){c.beginPath();c.moveTo(0,7);c.quadraticCurveTo(side*19,-1,side*15,12);c.quadraticCurveTo(side*6,15,0,7);c.fill();c.beginPath();c.moveTo(side*3,9);c.bezierCurveTo(side*19,23,side*8+Math.sin(t*3+side)*9+drift*.5,41,side*24+Math.sin(t*3)*6+drift*1.2,54);c.lineTo(side*17+Math.sin(t*3)*6+drift*1.2,49);c.bezierCurveTo(side*3+Math.sin(t*3+side)*9,33,side*12,25,side*1,10);c.fill();}
  // The entire back of the head is hair; layered locks cover the nape and upper back.
  const hair=c.createLinearGradient(-12,-45,17,15);hair.addColorStop(0,'#2667b5');hair.addColorStop(.38,'#8ccfff');hair.addColorStop(.6,'#408aca');hair.addColorStop(1,'#163e79');c.fillStyle=hair;c.shadowBlur=Q*(8);
  const sway=Math.sin(t*2.6)*4+drift*.35;
  c.beginPath();c.moveTo(0,-49);c.bezierCurveTo(-12,-49,-13,-38,-9,-28);c.bezierCurveTo(-10,-9,-18+sway,1,-11+sway,15);c.quadraticCurveTo(-7+sway,10,-4+sway,7);c.quadraticCurveTo(2+sway,20,8+sway,11);c.bezierCurveTo(17+sway,3,9,-15,9,-29);c.bezierCurveTo(14,-41,11,-49,0,-49);c.fill();
  for(let i=-2;i<=2;i++){c.strokeStyle=i%2?'#c1eaffaa':'#2868b5';c.lineWidth=.8;c.beginPath();c.moveTo(i*2.6,-46+Math.abs(i));c.bezierCurveTo(i*4,-30,i*2+sway,-9,i*4+sway,8+Math.sin(t*2+i)*3);c.stroke();}
  c.strokeStyle='#bfeaff';c.lineWidth=1.5;c.shadowBlur=Q*(14);c.beginPath();c.ellipse(0,-56,15,5,0,0,TAU);c.stroke();
  for(let i=-1;i<=1;i++){line(c,i*7,-51,i*8,-57-Math.abs(i)*2,'#f0faff',1.2,8);}
  c.restore();
 }
 // Horizontal squash shared by the renderer and every weapon port: bank foreshortening and barrel roll.
 const squash=(bank=0,roll=0)=>Math.cos(roll*TAU)*(1-Math.abs(bank)*.18);
 function draw(c,{route,power=0,time=0,x=0,y=0,scale=1,tilt=0,reduced=false,bank=0,thrust=0,roll=0,motion=null}){
  const p=pose(route,power,reduced?0:time,{...(motion||STILL),bank,thrust}),col=COLORS[route];c.save();c.translate(x,y);c.rotate(tilt);c.scale(scale*squash(bank,roll),scale);c.globalCompositeOperation='source-over';
  if(p.stage===2){if(route==='spread')phoenix(c,p);else goddess(c,p);}
  else{
   for(const d of p.drones){line(c,d.x*.4,6,d.x,d.y,col+'25',.6,0);c.save();c.translate(d.x,d.y);c.scale(.35,.4);ship(c,route,0,p.time,true);c.restore();dot(c,d.x,d.y-16,1.5,'#e6fff4',7);}
   ship(c,route,p.stage===0?p.minor:2,p.time,false,p.bank,p.thrust);
  }
  c.restore();return p;
 }
 // Wing tips (for light contrails) and exhausts (for engine sparks), in ship-local coordinates.
 function tips(route,power,time=0,motion){const p=pose(route,power,time,motion);if(p.stage===2)return route==='spread'?[wingPoint(p,-1,1),wingPoint(p,1,1)]:[handPoint(p,-1),handPoint(p,1)];const w=40+(p.stage===0?p.minor:2)*4;return [{x:-w*(1+p.bank*.18),y:24},{x:w*(1-p.bank*.18),y:24}];}
 function engines(route,power,time=0,motion){const p=pose(route,power,time,motion);if(p.stage===2)return route==='spread'?[{x:0,y:30}]:[{x:0,y:p.skirt*.9}];return [{x:-12,y:24},{x:12,y:24},...p.drones.map(d=>({x:d.x,y:d.y+10,small:true}))];}
 const api={setQuality,get quality(){return Q;},STEPS,COLORS,pose,wingPoint,handPoint,spreadMuzzles,laserBeams,describe,draw,squash,tips,engines};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RinkouForms=api;
})(typeof window!=='undefined'?window:globalThis);
