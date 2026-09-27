/* RINKOU enemies: every species has its own flight path, bullet pattern and silhouette.
   The game passes an environment g = {W,H,player,diff,aim,shoot,hazard,spawn,kill,burst,phaseShift}. */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a);
 const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const COL={orange:'#ffad78',pink:'#ff86bd',gold:'#ffd36e',red:'#ff5f73',lilac:'#dc9dff',coral:'#ff9270',violet:'#b9a6ff'};
 const glow=(c,color,blur)=>{c.shadowColor=color;c.shadowBlur=blur;};
 const dot=(c,x,y,r,fill)=>{c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();};
 const fan=(g,x,y,angle,count,gap,speed,o)=>{for(let i=0;i<count;i++)g.shoot(x,y,angle+(i-(count-1)/2)*gap,speed,o);};
 const ring=(g,x,y,count,offset,speed,o)=>{for(let i=0;i<count;i++)g.shoot(x,y,offset+i/count*TAU,speed,o);};
 const inRange=(e,g)=>e.y>60&&e.y<g.player.y-70;

 const S={};
 // 蛍 — the rank and file: descends in flocks, abdomen pulsing, fires a fan at the player.
 S.scout={name:'HOTARU',jp:'蛍',info:'群れで降下し、扇状に撃つ',hp:18,r:16,score:100,color:'#ffc46b',
  init(e){e.speed=e.speed||rand(90,130);e.fire=rand(.7,1.9);},
  update(e,dt,g){e.y+=e.speed*dt;e.x=e.baseX+Math.sin(e.t*1.7+e.phase)*(e.wide||25);e.fire-=dt;
   if(e.fire<=0){if(inRange(e,g))fan(g,e.x,e.y+12,g.aim(e),g.diff>.65?5:3,.19,115+g.diff*55,{color:COL.orange});e.fire=1.85*(1-g.diff*.2);}},
  draw(c,e,t){const col=this.color,flap=Math.abs(Math.sin(t*28+e.phase));
   c.fillStyle=col+'38';for(const s of [-1,1]){c.beginPath();c.ellipse(s*11,-6,11,3+flap*4,s*.45,0,TAU);c.fill();}
   glow(c,col,10);c.fillStyle='#172a2c';c.strokeStyle=col;c.lineWidth=1.2;
   c.beginPath();c.moveTo(0,20);c.lineTo(8,6);c.lineTo(17,-2);c.lineTo(8,-3);c.lineTo(5,-12);c.lineTo(-5,-12);c.lineTo(-8,-3);c.lineTo(-17,-2);c.lineTo(-8,6);c.closePath();c.fill();c.stroke();
   const p=.7+Math.sin(t*6+e.phase)*.3;glow(c,col,18);dot(c,0,-14,4.5+p*2,`rgba(255,214,120,${.55+p*.45})`);dot(c,0,-14,2,'#fff8e0');c.shadowBlur=0;dot(c,0,9,2,'#ffe7b8');}};

 // 燕 — crosses the screen in a diving arc and snaps off needle volleys at the bottom of the swoop.
 S.swallow={name:'TSUBAME',jp:'燕',info:'画面を横切り、急降下で狙い撃つ',hp:16,r:15,score:120,color:'#ffb3d6',
  init(e,g){e.dir=e.dir||(e.x<g.W/2?1:-1);e.x0=e.dir>0?-50:g.W+50;e.x=e.x0;e.y=-80;e.dur=3.4;e.u=-(e.delay||0)/e.dur;e.depth=e.depth||rand(.42,.58);e.shots=0;e.heading=Math.PI/2;},
  update(e,dt,g){e.u+=dt/e.dur;if(e.u<0){e.y=-80;return;}const u=e.u,nx=e.x0+e.dir*(g.W+100)*u,ny=-50+Math.sin(Math.min(u,1)*Math.PI)*g.H*e.depth;e.heading=Math.atan2(ny-e.y,nx-e.x);e.x=nx;e.y=ny;
   if(e.shots===0&&u>.42||e.shots===1&&u>.6&&g.diff>.45){e.shots++;if(inRange(e,g))fan(g,e.x,e.y,g.aim(e),3,.14,205+g.diff*40,{color:COL.pink,shape:'needle'});}
   if(u>1.02)e.gone=true;},
  draw(c,e,t){const col=this.color,f=Math.sin(t*14+e.phase);c.rotate(e.heading);
   c.strokeStyle=col+'55';c.lineWidth=1;for(const s of [-1,1]){c.beginPath();c.moveTo(-16,s*(26+f*6));c.quadraticCurveTo(-34,s*(26+f*6),-52,s*(22+Math.sin(t*9)*5));c.stroke();}
   glow(c,col,12);c.fillStyle='#1b1a2c';c.strokeStyle=col;c.lineWidth=1.1;
   for(const s of [-1,1]){c.beginPath();c.moveTo(4,0);c.quadraticCurveTo(-2,s*(14+f*3),-16,s*(26+f*6));c.quadraticCurveTo(-6,s*10,-10,s*3);c.closePath();c.fill();c.stroke();}
   c.beginPath();c.moveTo(16,0);c.quadraticCurveTo(6,6,-8,3);c.lineTo(-24,9+f*2);c.lineTo(-13,0);c.lineTo(-24,-9-f*2);c.lineTo(-8,-3);c.quadraticCurveTo(6,-6,16,0);c.fill();c.stroke();
   c.fillStyle='#ffe6f2';c.beginPath();c.ellipse(4,0,7,2.4,0,0,TAU);c.fill();glow(c,col,14);dot(c,11,0,2,'#ffffff');c.shadowBlur=0;}};

 // 甲虫 — an armoured gunship: parks, splits its shell open and unloads a heavy fan.
 S.beetle={name:'KABUTO',jp:'甲虫',info:'装甲を開き、重い弾幕を放つ',hp:120,r:30,score:400,color:'#ffcf7a',big:true,
  init(e,g){e.targetY=rand(g.H*.16,g.H*.3);e.stay=rand(7.5,9);e.open=0;e.fire=1.5;e.vy=0;},
  update(e,dt,g){e.stay-=dt;if(e.stay>0)e.y+=(e.targetY-e.y)*Math.min(1,dt*1.1);else{e.vy+=dt*140;e.y+=e.vy*dt;}
   e.x=e.baseX+Math.sin(e.t*.6+e.phase)*40;e.fire-=dt;e.open=e.fire<.55?clamp(1-e.fire/.55,0,1):Math.max(0,e.open-dt*2.5);
   if(e.fire<=0){if(inRange(e,g)&&e.stay>0){const a=g.aim(e);fan(g,e.x,e.y+24,a,g.diff>.55?9:7,.15,115+g.diff*55,{color:COL.orange});if(g.diff>.25)fan(g,e.x,e.y+24,a,3,.27,82,{color:COL.gold,r:7,shape:'big'});}e.fire=1.3*(1-g.diff*.2);}},
  draw(c,e,t){const col=this.color,o=e.open;
   if(o>.02){c.globalCompositeOperation='lighter';for(const s of [-1,1]){const w=c.createLinearGradient(0,0,s*52,18);w.addColorStop(0,col+'bb');w.addColorStop(1,col+'00');c.fillStyle=w;c.beginPath();c.moveTo(s*6,-14);c.quadraticCurveTo(s*(38+o*14),-26*o-4,s*(46+o*16),10+o*8);c.quadraticCurveTo(s*24,20,s*6,6);c.fill();}c.globalCompositeOperation='source-over';}
   c.strokeStyle='#8a7248';c.lineWidth=2;for(const s of [-1,1])for(let i=0;i<3;i++){const k=Math.sin(t*6+i+s)*3;c.beginPath();c.moveTo(s*12,-8+i*10);c.lineTo(s*27,-12+i*13+k);c.lineTo(s*31,-4+i*14+k);c.stroke();}
   glow(c,col,12);c.fillStyle='#2a2238';c.strokeStyle=col;c.lineWidth=1.3;
   c.beginPath();c.moveTo(-8,20);c.quadraticCurveTo(0,34,8,20);c.closePath();c.fill();c.stroke();
   c.beginPath();c.moveTo(-3,28);c.quadraticCurveTo(-3,42,0,50);c.quadraticCurveTo(3,42,3,28);c.fill();c.stroke();c.beginPath();c.moveTo(0,45);c.lineTo(-8,54);c.moveTo(0,45);c.lineTo(8,54);c.stroke();
   const pn=c.createLinearGradient(0,4,0,22);pn.addColorStop(0,'#4d3f6c');pn.addColorStop(1,'#1b1628');c.fillStyle=pn;c.beginPath();c.moveTo(-16,6);c.quadraticCurveTo(0,1,16,6);c.lineTo(12,20);c.quadraticCurveTo(0,24,-12,20);c.closePath();c.fill();c.stroke();
   for(const s of [-1,1]){c.save();c.translate(s*1.5,-36);c.rotate(s*o*.5);const sh=c.createLinearGradient(0,0,s*24,40);sh.addColorStop(0,'#6a5890');sh.addColorStop(.5,'#2b2440');sh.addColorStop(1,'#15121f');c.fillStyle=sh;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(s*15,-3,s*23,12,s*21,34);c.quadraticCurveTo(s*14,44,0,42);c.closePath();c.fill();c.stroke();
    c.shadowBlur=0;c.fillStyle='#ffffff26';c.beginPath();c.ellipse(s*9,12,3.5,10,s*.2,0,TAU);c.fill();c.strokeStyle=col+'77';c.lineWidth=.8;c.beginPath();c.moveTo(s*5,8);c.quadraticCurveTo(s*15,18,s*14,36);c.stroke();c.restore();}
   glow(c,'#ff9d5c',10);dot(c,-4,24,1.8,'#ffd08a');dot(c,4,24,1.8,'#ffd08a');
   glow(c,col,20);dot(c,0,-14,2.5+o*4,`rgba(255,226,160,${.5+Math.sin(t*5)*.25+o*.25})`);c.shadowBlur=0;}};

 // 水母 — drifts in pulses; every contraction releases a slow ring of heavy bullets.
 S.jelly={name:'KURAGE',jp:'水母',info:'脈打つたび、全方位に弾を放つ',hp:48,r:22,score:220,color:'#dc9dff',
  init(e){e.cycle=rand(0,1);e.spin=rand(0,TAU);e.contract=0;},
  update(e,dt,g){const prev=e.cycle;e.cycle=(e.cycle+dt/2.5)%1;const k=e.cycle<.22?1-e.cycle/.22:0;e.contract=k;e.y+=(24+k*110)*dt;e.x=e.baseX+Math.sin(e.t*.7+e.phase)*42;
   if(e.cycle<prev&&inRange(e,g)){ring(g,e.x,e.y+6,g.diff>.5?12:10,e.spin,82+g.diff*28,{color:COL.lilac,r:6.5,shape:'big'});e.spin+=.26;}},
  draw(c,e,t){const col=this.color,k=e.contract;
   c.strokeStyle=col+'88';c.lineWidth=1.2;glow(c,col,6);for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*5,-4);for(let j=1;j<=6;j++)c.lineTo(i*5*(1+j*.06)+Math.sin(t*4+j*.9+i)*(2+j*.9),-4-j*7*(1-k*.3));c.stroke();}
   c.save();c.scale(1+k*.18,1-k*.2);const b=c.createRadialGradient(0,6,2,0,4,27);b.addColorStop(0,'#fff0ff');b.addColorStop(.35,col+'cc');b.addColorStop(1,'#6a3aa044');c.fillStyle=b;glow(c,col,18);
   c.beginPath();c.moveTo(-24,-2);c.bezierCurveTo(-24,18,-12,26,0,26);c.bezierCurveTo(12,26,24,18,24,-2);for(let i=0;i<6;i++){const x=24-i*8;c.quadraticCurveTo(x-4,-7-(i%2)*3,x-8,-2);}c.closePath();c.fill();
   c.shadowBlur=0;c.strokeStyle='#fff6ffaa';c.lineWidth=1;for(let i=0;i<4;i++){const a=i/4*TAU+t*.8;c.beginPath();c.arc(Math.cos(a)*8,10+Math.sin(a)*3,3.5,0,TAU);c.stroke();}
   for(let i=0;i<7;i++){const x=-21+i*7;dot(c,x,-1,1.3,i%2?'#ffffff':col);}c.restore();}};

 // 風車 — stops mid-screen, spins up and sprays a spiral, then tumbles away.
 S.spinner={name:'KAZAGURUMA',jp:'風車',info:'止まって回り、渦巻き弾を撒く',hp:95,r:26,score:450,color:'#ff9270',big:true,
  init(e,g){e.targetY=rand(g.H*.17,g.H*.33);e.state=0;e.ang=rand(0,TAU);e.vr=.6;e.hold=4.2;e.emit=0;e.dirSpin=Math.random()<.5?1:-1;e.vy=0;},
  update(e,dt,g){e.ang+=e.vr*e.dirSpin*dt;
   if(e.state===0){e.y+=(e.targetY-e.y)*Math.min(1,dt*2);if(Math.abs(e.targetY-e.y)<6)e.state=1;}
   else if(e.state===1){e.vr=Math.min(3.2,e.vr+dt*2.4);e.hold-=dt;e.emit-=dt;if(e.emit<=0&&e.vr>1.5){const arms=g.diff>.5?4:3;for(let i=0;i<arms;i++)g.shoot(e.x,e.y,e.ang+i*TAU/arms,118+g.diff*30,{color:COL.coral,shape:'needle'});e.emit=.13;}if(e.hold<=0)e.state=2;}
   else{e.vr=Math.max(.6,e.vr-dt*2);e.vy+=dt*220;e.y+=e.vy*dt;}},
  draw(c,e,t){const col=this.color,sp=clamp(e.vr/3.2,0,1);
   c.globalAlpha=.25+sp*.4;c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.arc(0,0,34+Math.sin(t*9)*2,0,TAU);c.stroke();c.globalAlpha=1;
   c.save();c.rotate(e.ang);glow(c,col,14);for(let i=0;i<4;i++){c.rotate(TAU/4);const b=c.createLinearGradient(0,0,32,0);b.addColorStop(0,'#4a2330');b.addColorStop(1,col);c.fillStyle=b;c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(14,-21,33,-8);c.quadraticCurveTo(22,-2,8,6);c.closePath();c.fill();c.stroke();}c.restore();
   dot(c,0,0,9,'#2b1418');c.strokeStyle='#ffd2c2';c.lineWidth=1.5;c.beginPath();c.arc(0,0,9,0,TAU);c.stroke();glow(c,col,16);dot(c,0,0,3.5+sp*2,'#fff1e8');c.shadowBlur=0;}};

 // 監視眼 — hovers at the top edge, tracks the player, draws a sight line and fires a beam.
 S.watcher={name:'MEDAMA',jp:'監視眼',info:'照準線のあと、光線で狙撃する',hp:64,r:22,score:380,color:'#ff5f73',
  init(e,g){e.targetY=rand(85,Math.max(110,g.H*.2));e.state=0;e.timer=.7;e.shots=0;e.look=Math.PI/2;e.blink=0;},
  update(e,dt,g){const a=g.aim(e);if(e.state!==2)e.look+=norm(a-e.look)*Math.min(1,dt*5);e.blink=Math.max(0,e.blink-dt*4);if(e.state!==2&&Math.random()<dt*.3)e.blink=1;
   if(e.state===0){e.y+=(e.targetY-e.y)*Math.min(1,dt*1.8);if(Math.abs(e.targetY-e.y)<8)e.state=1;}
   else if(e.state===1){e.x=e.baseX+Math.sin(e.t*.8)*30;e.timer-=dt;if(e.timer<=0){e.look=a;g.hazard({owner:e,angle:a,width:14,warn:.95,active:.45,color:COL.red});e.state=2;e.timer=1.6;}}
   else if(e.state===2){e.timer-=dt;e.charging=e.timer>.65;if(e.timer<=0){e.shots++;e.state=e.shots>=2?3:1;e.timer=.8;}}
   else{e.y-=150*dt;if(e.y<-70)e.gone=true;}},
  draw(c,e,t){const col=this.color,open=1-e.blink;
   glow(c,col,12);c.strokeStyle=col+'aa';c.lineWidth=1.4;for(let i=0;i<12;i++){const a=i/12*TAU+t*.4,l=27+Math.sin(t*3+i)*3;c.beginPath();c.moveTo(Math.cos(a)*20,Math.sin(a)*20);c.lineTo(Math.cos(a)*l,Math.sin(a)*l);c.stroke();}
   c.fillStyle='#2a0f18';c.strokeStyle=col;c.beginPath();c.arc(0,0,21,0,TAU);c.fill();c.stroke();c.shadowBlur=0;
   c.save();c.beginPath();c.ellipse(0,0,19,Math.max(1.2,13*open),0,0,TAU);c.clip();c.fillStyle='#ffe9ee';c.fillRect(-20,-15,40,30);
   const ix=Math.cos(e.look)*7,iy=Math.sin(e.look)*5,ir=c.createRadialGradient(ix,iy,1,ix,iy,9);ir.addColorStop(0,'#ffd1d6');ir.addColorStop(.5,col);ir.addColorStop(1,'#5a0d1c');c.fillStyle=ir;c.beginPath();c.arc(ix,iy,9,0,TAU);c.fill();
   dot(c,ix,iy,e.charging?5:3.5,'#14040a');dot(c,ix-2,iy-2,1.3,'#ffffff');c.restore();
   if(e.charging){glow(c,col,24);c.globalAlpha=.5+Math.sin(t*40)*.3;c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(0,0,25+Math.sin(t*20)*2,0,TAU);c.stroke();c.globalAlpha=1;c.shadowBlur=0;}}};

 // 鳳仙花 — a seed pod that swells and bursts; shooting it early only releases a few seeds.
 S.seed={name:'HOUSENKA',jp:'鳳仙花',info:'膨らんで弾ける。早めに撃ち落とせ',hp:26,r:17,score:150,color:'#ff6fd0',
  init(e){e.vy=rand(48,68);e.fuse=e.fuseMax=rand(4.4,5.4);},
  update(e,dt,g){e.y+=e.vy*dt;e.x=e.baseX+Math.sin(e.t*1.1+e.phase)*18;e.fuse-=dt;if(Math.hypot(e.x-g.player.x,e.y-g.player.y)<120)e.fuse=Math.min(e.fuse,.35);
   if(e.fuse<=0){e.gone=true;g.burst(e);const n=g.diff>.5?18:14;ring(g,e.x,e.y,n,rand(0,TAU),110+g.diff*30,{color:COL.pink});ring(g,e.x,e.y,n/2,rand(0,TAU),70,{color:COL.gold,r:6.5,shape:'big'});}},
  death(e,g){ring(g,e.x,e.y,6,rand(0,TAU),70,{color:COL.pink});},
  draw(c,e,t){const col=this.color,sw=1-e.fuse/e.fuseMax,k=1+sw*.45,blink=Math.sin(t*(6+sw*34))>0?1:.4;
   c.save();c.scale(k,k);c.fillStyle='#2f6b4a';for(const s of [-1,1]){c.beginPath();c.moveTo(0,-14);c.quadraticCurveTo(s*14,-27,s*18,-16);c.quadraticCurveTo(s*8,-13,0,-14);c.fill();}
   glow(c,col,10+sw*18);const b=c.createRadialGradient(0,3,2,0,2,18);b.addColorStop(0,'#ffe0f4');b.addColorStop(.4,'#8a2a6a');b.addColorStop(1,'#2a0c22');c.fillStyle=b;
   c.beginPath();c.moveTo(0,-15);c.bezierCurveTo(14,-12,15,10,0,18);c.bezierCurveTo(-15,10,-14,-12,0,-15);c.fill();
   c.strokeStyle=col;c.globalAlpha=blink;c.lineWidth=1.3;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*5,-12);c.quadraticCurveTo(i*11,2,i*3,16);c.stroke();}c.globalAlpha=1;c.restore();c.shadowBlur=0;}};

 // 光竜 — a long serpent: the body blocks shots, the head fires; destroy the head to blow the chain.
 S.serpent={name:'RYU',jp:'光竜',info:'長い胴が盾になる。頭を討てば全身が爆ぜる',hp:110,r:20,score:1500,color:'#ffb347',big:true,margin:420,
  init(e,g){e.dir=e.dir||1;e.hist=[];for(let i=0;i<90;i++)e.hist.push({x:e.x,y:e.y-i*4});e.fire=1.5;e.amp=Math.min(g.W*.3,260);e.heading=Math.PI/2;
   for(let i=1;i<=9;i++)g.spawn('segment',e.x,e.y-i*20,{leader:e,idx:i,tail:i===9});},
  update(e,dt,g){const nx=e.baseX+Math.sin(e.t*1.25+e.phase)*e.amp*e.dir,ny=e.y+92*dt;e.heading=Math.atan2(ny-e.y,nx-e.x);e.x=nx;e.y=ny;
   let h=e.hist[0],d=Math.hypot(e.x-h.x,e.y-h.y);while(d>=4){const k=4/d;h={x:h.x+(e.x-h.x)*k,y:h.y+(e.y-h.y)*k};e.hist.unshift(h);d-=4;}if(e.hist.length>90)e.hist.length=90;
   e.fire-=dt;if(e.fire<=0){if(inRange(e,g))fan(g,e.x,e.y+10,g.aim(e),3,.16,170+g.diff*30,{color:COL.gold,shape:'needle'});e.fire=1.6*(1-g.diff*.2);}},
  draw(c,e,t){const col=this.color;c.rotate(e.heading-Math.PI/2);
   c.strokeStyle=col+'aa';c.lineWidth=1.2;for(const k of [-1,1]){c.beginPath();c.moveTo(k*5,30);c.bezierCurveTo(k*20,32,k*30,6+Math.sin(t*4)*6,k*44,-14+Math.sin(t*3+k)*9);c.stroke();}
   c.fillStyle=col+'88';for(const k of [-1,1]){c.beginPath();c.moveTo(k*11,-6);c.lineTo(k*(24+Math.sin(t*5)*2),-20);c.lineTo(k*12,-14);c.fill();}
   glow(c,col,16);c.strokeStyle='#ffe2a8';c.lineWidth=2.2;c.lineCap='round';for(const k of [-1,1]){c.beginPath();c.moveTo(k*7,-12);c.quadraticCurveTo(k*12,-26,k*20,-38);c.stroke();c.beginPath();c.moveTo(k*14,-24);c.lineTo(k*22,-24);c.stroke();}c.lineCap='butt';
   const hd=c.createLinearGradient(0,-18,0,38);hd.addColorStop(0,'#6a3f12');hd.addColorStop(1,'#1f1206');c.fillStyle=hd;c.strokeStyle=col;c.lineWidth=1.4;
   c.beginPath();c.moveTo(0,38);c.quadraticCurveTo(7,36,8,26);c.quadraticCurveTo(10,16,14,8);c.quadraticCurveTo(16,-8,9,-18);c.lineTo(-9,-18);c.quadraticCurveTo(-16,-8,-14,8);c.quadraticCurveTo(-10,16,-8,26);c.quadraticCurveTo(-7,36,0,38);c.fill();c.stroke();
   c.strokeStyle=col+'77';c.lineWidth=.8;c.beginPath();c.moveTo(0,-14);c.lineTo(0,20);c.stroke();
   c.fillStyle=col+'aa';for(let i=0;i<3;i++){c.beginPath();c.moveTo(-3,-16-i*6);c.lineTo(0,-24-i*6);c.lineTo(3,-16-i*6);c.fill();}
   glow(c,'#ff5a3c',14);for(const k of [-1,1]){c.fillStyle='#ffe07a';c.beginPath();c.ellipse(k*8,6,2.2,4.2,-k*.5,0,TAU);c.fill();}dot(c,-2.5,33,1,'#ffcf80');dot(c,2.5,33,1,'#ffcf80');dot(c,0,40,2+Math.sin(t*9)*.8,'#fff2c0');c.shadowBlur=0;}};
 S.segment={hp:32,r:14,score:120,color:'#ffb347',hidden:true,margin:420,
  init(e){e.r=14-e.idx*.55;e.heading=Math.PI/2;},
  update(e,dt,g){const L=e.leader;if(L.gone){e.gone=true;return;}if(L.dead){if(e.dieIn===undefined)e.dieIn=e.idx*.07;e.dieIn-=dt;if(e.dieIn<=0)g.kill(e,true);return;}
   const p=L.hist[Math.min(L.hist.length-1,e.idx*5)],q=L.hist[Math.min(L.hist.length-1,e.idx*5+2)];e.x=p.x;e.y=p.y;if(p!==q)e.heading=Math.atan2(p.y-q.y,p.x-q.x);},
  draw(c,e,t){const col=this.color,s=e.r/14;c.rotate(e.heading-Math.PI/2);c.scale(s,s);
   c.fillStyle=col+'66';for(const k of [-1,1]){c.beginPath();c.moveTo(k*11,-2);c.lineTo(k*(21+Math.sin(t*6+e.idx)*3),-9);c.lineTo(k*12,4);c.fill();}
   glow(c,col,10);c.fillStyle='#3a2410';c.strokeStyle=col;c.lineWidth=1.2;c.beginPath();c.moveTo(0,12);c.lineTo(13,0);c.lineTo(0,-12);c.lineTo(-13,0);c.closePath();c.fill();c.stroke();dot(c,0,0,3,'#fff0c8');
   if(e.tail){c.fillStyle=col+'aa';const w=Math.sin(t*5)*4;c.beginPath();c.moveTo(0,-10);c.quadraticCurveTo(-14,-26,-6+w,-37);c.lineTo(0,-22);c.lineTo(6+w,-37);c.quadraticCurveTo(14,-26,0,-10);c.fill();}c.shadowBlur=0;}};

 // 氷華 — a spinning crystal that fires alternating crosses and shatters into homing shards.
 S.prism={name:'HYOUKA',jp:'氷華',info:'十字弾を撃ち、砕くと破片が襲う',hp:58,r:22,score:300,color:'#b9a6ff',
  init(e){e.rot=rand(0,TAU);e.fire=1.2;e.flip=0;},
  update(e,dt,g){e.y+=(e.y<g.H*.3?60:24)*dt;e.x=e.baseX+Math.sin(e.t*.5+e.phase)*30;e.rot+=dt*1.1;e.fire-=dt;
   if(e.fire<=0){if(inRange(e,g)){const n=g.diff>.5?6:4;ring(g,e.x,e.y,n,e.rot+(e.flip++%2)*Math.PI/n,125+g.diff*30,{color:COL.violet,shape:'needle'});}e.fire=1.05*(1-g.diff*.15);}},
  death(e,g){for(let i=0;i<3;i++){const a=Math.PI/2+(i-1)*.95;g.spawn('shard',e.x,e.y,{vx:Math.cos(a)*170,vy:Math.sin(a)*170-120});}},
  draw(c,e,t){const col=this.color,sh=Math.sin(e.rot*2),fx=sh*9;glow(c,col,16);c.save();c.rotate(e.rot*.35);
   c.fillStyle='#2b2450';c.strokeStyle=col;c.lineWidth=1.3;c.beginPath();c.moveTo(0,-27);c.lineTo(16,0);c.lineTo(0,27);c.lineTo(-16,0);c.closePath();c.fill();c.stroke();c.shadowBlur=0;
   c.fillStyle=`rgba(225,215,255,${.3+.3*Math.max(0,sh)})`;c.beginPath();c.moveTo(0,-27);c.lineTo(fx,0);c.lineTo(-16,0);c.closePath();c.fill();
   c.fillStyle=`rgba(150,120,255,${.3+.3*Math.max(0,-sh)})`;c.beginPath();c.moveTo(0,27);c.lineTo(fx,0);c.lineTo(16,0);c.closePath();c.fill();
   c.strokeStyle='#efeaff';c.lineWidth=.8;c.beginPath();c.moveTo(0,-27);c.lineTo(fx,0);c.lineTo(0,27);c.stroke();c.restore();
   glow(c,col,8);for(let i=0;i<3;i++){const a=e.rot*2+i*TAU/3;dot(c,Math.cos(a)*31,Math.sin(a)*12,1.8,'#f2eeff');}c.shadowBlur=0;}};
 S.shard={hp:10,r:9,score:60,color:'#b9a6ff',hidden:true,
  init(e){e.fire=.8;e.spin=rand(-8,8);},
  update(e,dt,g){if(e.t>.45&&e.t<2.2){const a=g.aim(e),sp=Math.hypot(e.vx,e.vy),cur=Math.atan2(e.vy,e.vx),na=cur+clamp(norm(a-cur),-2.2*dt,2.2*dt),ns=Math.min(260,sp+140*dt);e.vx=Math.cos(na)*ns;e.vy=Math.sin(na)*ns;}else if(e.t<=.45){e.vx*=1-dt*2;e.vy*=1-dt*2;}
   e.x+=e.vx*dt;e.y+=e.vy*dt;e.fire-=dt;if(e.fire<=0&&!e.fired){e.fired=true;if(inRange(e,g))g.shoot(e.x,e.y,g.aim(e),165,{color:COL.violet});}if(e.x<-60||e.x>g.W+60||e.y<-90)e.gone=true;},
  draw(c,e){glow(c,this.color,10);c.rotate(e.t*e.spin);c.fillStyle='#ddd4ff';c.beginPath();c.moveTo(0,-11);c.lineTo(6,0);c.lineTo(0,11);c.lineTo(-6,0);c.closePath();c.fill();c.shadowBlur=0;}};

 function create(type,x,y,extra,g){const s=S[type],hp=s.hp*(1+g.diff*.6);const e={type,x,y,baseX:x,t:0,hp,maxHp:hp,r:s.r,phase:rand(0,TAU),hit:0,...extra};if(s.init)s.init(e,g);return e;}
 function update(e,dt,g){e.t+=dt;e.hit=Math.max(0,e.hit-dt);S[e.type].update(e,dt,g);}
 function draw(c,e,t){c.save();c.translate(e.x,e.y);S[e.type].draw(c,e,t);c.restore();}

 // Formations: each spawns a group and returns the seconds until the next wave.
 const W8={
  scoutV(g){const f=g.field,span=f.right-f.left,n=5+(g.diff>.5?2:0);for(let i=0;i<n;i++)g.spawn('scout',f.left+span*(i+1)/(n+1),-40-Math.abs(i-(n-1)/2)*32);return 2.4;},
  scoutLine(g){const f=g.field,x=rand(f.left+60,f.right-60);for(let i=0;i<6;i++)g.spawn('scout',x,-40-i*48,{speed:125,wide:70});return 2.2;},
  swallowL(g){for(let i=0;i<5;i++)g.spawn('swallow',0,-80,{dir:1,delay:i*.3,depth:.5});return 2.8;},
  swallowR(g){for(let i=0;i<5;i++)g.spawn('swallow',g.W,-80,{dir:-1,delay:i*.3,depth:.5});return 2.8;},
  swallowX(g){for(let i=0;i<4;i++){g.spawn('swallow',0,-80,{dir:1,delay:i*.32,depth:.4});g.spawn('swallow',g.W,-80,{dir:-1,delay:i*.32+.16,depth:.58});}return 3.4;},
  beetle(g){const f=g.field;g.spawn('beetle',f.left+(f.right-f.left)*[.3,.5,.7][Math.floor(Math.random()*3)],-50);return 3;},
  beetlePair(g){const f=g.field,span=f.right-f.left;g.spawn('beetle',f.left+span*.27,-50);g.spawn('beetle',f.left+span*.73,-50);return 4.2;},
  jelly(g){const f=g.field;g.spawn('jelly',rand(f.left+60,f.right-60),-40);return 2.6;},
  jellyPair(g){const f=g.field,span=f.right-f.left;g.spawn('jelly',f.left+span*.3,-40);g.spawn('jelly',f.left+span*.7,-90);return 3.4;},
  spinner(g){const f=g.field;g.spawn('spinner',rand(f.left+span(f)*.35,f.left+span(f)*.65),-40);return 4.2;},
  spinnerPair(g){const f=g.field;g.spawn('spinner',f.left+span(f)*.25,-40);g.spawn('spinner',f.left+span(f)*.75,-40);return 5.2;},
  watcher(g){const f=g.field;g.spawn('watcher',rand(f.left+50,f.right-50),-40);return 2.4;},
  watcherPair(g){const f=g.field;g.spawn('watcher',f.left+span(f)*.2,-40);g.spawn('watcher',f.left+span(f)*.8,-40);return 3;},
  seedRain(g){const f=g.field;for(let i=0;i<4;i++)g.spawn('seed',f.left+span(f)*(.15+i*.23)+rand(-20,20),-40-i*55);return 3;},
  serpentL(g){g.spawn('serpent',g.W*.5,-40,{dir:1});return 5.5;},
  serpentR(g){g.spawn('serpent',g.W*.5,-40,{dir:-1});return 5.5;},
  prism(g){const f=g.field;g.spawn('prism',rand(f.left+60,f.right-60),-40);return 2.8;},
  prism2(g){const f=g.field;g.spawn('prism',f.left+span(f)*.3,-40);g.spawn('prism',f.left+span(f)*.7,-100);return 3.4;}
 };
 const span=f=>f.right-f.left;
 // Each sector cycles through its own mix, so the cast changes as the backdrop does.
 const SCRIPT=[
  ['scoutV','swallowL','scoutLine','jelly','swallowR','scoutV','beetle'],
  ['prism','scoutV','spinner','swallowL','prism2','beetle','swallowR','spinner','scoutLine'],
  ['jellyPair','serpentL','watcher','scoutV','serpentR','jellyPair','watcherPair','swallowX'],
  ['beetlePair','seedRain','serpentL','watcher','spinnerPair','swallowX','prism2','seedRain'],
  ['seedRain','beetlePair','serpentR','spinnerPair','jellyPair','watcherPair','swallowX','prism2','scoutV']
 ];
 function wave(name,g){return W8[name](g);}

 // ── 月影の番人 TSUKUYOMI: a crescent-moon sentinel mid-way through the mission. ──
 const Sentinel={name:'TSUKUYOMI',jp:'月影の番人',title:'MOONLIT SENTINEL',
  create(g){const s=clamp(g.W/760,.6,1.1);return {kind:'mid',x:g.W/2,y:-170,t:0,s,hp:5200,maxHp:5200,r:66*s,mode:0,attack:0,timer:2,sat:0,life:44,hit:0,leaving:false};},
  update(b,dt,g){b.t+=dt;b.hit=Math.max(0,b.hit-dt);b.life-=dt;b.sat+=dt*(b.mode===1?2.2:.8);
   if(b.leaving){b.y-=170*dt;return;}
   const ty=Math.min(g.H*.32,270);b.y+=(ty+Math.sin(b.t)*18-b.y)*Math.min(1,dt*1.3);b.x=g.W/2+Math.sin(b.t*.5)*Math.min(g.W*.26,230);
   if(b.y<ty-40)return;b.timer-=dt;if(b.timer>0)return;const s=b.s;
   if(b.mode===0){b.attack++;const side=b.attack%2?1:-1,hx=b.x+side*92*s,hy=b.y+50*s;for(let i=0;i<11;i++)g.shoot(hx,hy,Math.PI/2+side*.62-side*i*.12,150+g.diff*20,{color:COL.gold,shape:'needle'});if(b.attack%4===0)fan(g,b.x,b.y+20*s,g.aim(b),5,.11,195,{color:COL.pink});b.timer=.45;if(b.attack>=8){b.mode=1;b.attack=0;b.timer=.6;}}
   else if(b.mode===1){for(let i=0;i<6;i++){const a=b.sat+i*TAU/6;g.shoot(b.x+Math.cos(a)*122*s,b.y+Math.sin(a)*58*s,a+.45,112,{color:COL.lilac});}b.timer=.2;if(++b.attack>=24){b.mode=2;b.attack=0;b.timer=.6;}}
   else{b.attack++;ring(g,b.x,b.y+10*s,20,b.attack*.16,105+g.diff*20,{color:COL.pink});if(b.attack%2===0)fan(g,b.x,b.y+30*s,g.aim(b),5,.12,190,{color:COL.gold,r:7,shape:'big'});b.timer=.7;if(b.attack>=6){b.mode=0;b.attack=0;b.timer=.8;}}},
  hitTest(b,x,y,r){return (x-b.x)**2+(y-b.y-6*b.s)**2<(b.r+r)**2;},
  draw(c,b,t){const s=b.s,col='#dcc8ff';c.save();c.translate(b.x,b.y);c.scale(s,s);
   const halo=c.createRadialGradient(0,-30,60,0,-30,200);halo.addColorStop(0,'#bfa8ff22');halo.addColorStop(1,'#bfa8ff00');c.fillStyle=halo;c.fillRect(-200,-230,400,400);
   // orbiting moonlets (back half first)
   const moon=(front)=>{for(let i=0;i<6;i++){const a=b.sat+i*TAU/6,sn=Math.sin(a);if(front?sn<0:sn>=0)continue;glow(c,col,12);dot(c,Math.cos(a)*122,sn*58,front?7:5,front?'#f4eeff':'#8c7ac8');}};moon(false);
   // crescent: the outer disc minus an offset inner disc, horns pointing at the player
   // the moon's dark face (earthshine), then the lit crescent: outer disc minus an offset inner disc
   const dk=c.createRadialGradient(0,20,10,0,0,104);dk.addColorStop(0,'#1a1430');dk.addColorStop(1,'#2a2150');c.shadowBlur=0;c.globalAlpha=.88;c.fillStyle=dk;c.beginPath();c.arc(0,0,103,0,TAU);c.fill();c.globalAlpha=1;c.strokeStyle='#8c7ac855';c.lineWidth=1;c.stroke();
   c.save();c.beginPath();c.arc(0,0,104,0,TAU);c.clip();const cr=c.createLinearGradient(0,-104,0,50);cr.addColorStop(0,'#ffffff');cr.addColorStop(.3,'#d9ccff');cr.addColorStop(1,'#6d5ab0');c.fillStyle=cr;glow(c,col,26);
   c.beginPath();c.arc(0,0,104,0,TAU);c.moveTo(92,48);c.arc(0,48,92,TAU,0,true);c.fill();c.restore();
   c.strokeStyle='#ffffffcc';c.lineWidth=1.4;c.beginPath();c.arc(0,0,100,Math.PI*1.18,Math.PI*1.82);c.stroke();for(const k of [-1,1])dot(c,k*92,48,3,'#ffffff');
   // ribbons from the horns
   c.shadowBlur=0;c.strokeStyle='#cbb6ff88';c.lineWidth=2;for(const k of [-1,1]){c.beginPath();c.moveTo(k*92,50);c.bezierCurveTo(k*104,84,k*82+Math.sin(t*2)*10,114,k*92+Math.sin(t*2.4+k)*14,154);c.stroke();}
   // mask core in the hollow
   c.rotate(Math.sin(t*.8)*.08);glow(c,'#b89cff',26);const mk=c.createLinearGradient(0,-30,0,40);mk.addColorStop(0,'#ffffff');mk.addColorStop(1,'#c9baf0');c.fillStyle=mk;
   c.beginPath();c.moveTo(0,-30);c.bezierCurveTo(26,-28,28,14,0,40);c.bezierCurveTo(-28,14,-26,-28,0,-30);c.fill();c.shadowBlur=0;
   c.fillStyle='#1c1238';for(const k of [-1,1]){c.beginPath();c.ellipse(k*10,-2,8,2.6,k*.25,0,TAU);c.fill();}
   glow(c,'#ff7ab8',14);for(const k of [-1,1])dot(c,k*10,-2,1.8+Math.sin(t*4)*.6,'#ffc2e0');dot(c,0,-20,2.6,'#ff9ccc');c.shadowBlur=0;
   c.strokeStyle='#ffffff55';c.lineWidth=1;c.beginPath();c.arc(0,4,48+Math.sin(t*3)*3,0,TAU);c.stroke();
   c.rotate(-Math.sin(t*.8)*.08);moon(true);c.restore();}};

 // ── 黒曜星核 OBSIDIAN CORE: the giant final guardian with destructible gun pods and three phases. ──
 const PODS=[[-205,-6],[205,-6],[-122,62],[122,62]];
 const Core={name:'OBSIDIAN CORE',jp:'黒曜星核',title:'SECTOR GUARDIAN',
  create(g){const s=clamp(g.W/780,.55,1.15);return {kind:'core',x:g.W/2,y:-320,t:0,s,hp:16000,maxHp:16000,phase:1,open:0,rage:0,timer:2.5,attack:0,mode:0,emit:0,emit2:0,spin:0,hit:0,
   pods:PODS.map(([ox,oy],i)=>({ox,oy,x:0,y:0,r:27*s,hp:950,maxHp:950,dead:false,fire:1.2+i*.45,hit:0}))};},
  place(b){for(const p of b.pods){p.x=b.x+p.ox*b.s;p.y=b.y+p.oy*b.s;p.r=27*b.s;}b.core={x:b.x,y:b.y+8*b.s,r:44*b.s};},
  // Where a shot lands: the core, a live pod, or the armoured hull (absorbed).
  // The central hull below the eye counts as the core (reduced by armour); the wing roots only absorb.
  hitTest(b,x,y,r){for(const p of b.pods)if(!p.dead&&(x-p.x)**2+(y-p.y)**2<(p.r+r)**2)return {part:'pod',pod:p};if((x-b.core.x)**2+(y-b.core.y)**2<(b.core.r+r)**2)return {part:'core'};const s=b.s,ly=y-b.y;if(Math.abs(x-b.x)<(58-Math.max(0,ly-20)*.45)*s+r&&ly>-90*s&&ly<120*s)return {part:'core'};const dx=(x-b.x)/(255*s),dy=(y-b.y+42*s)/(52*s);return dx*dx+dy*dy<1?{part:'hull'}:null;},
  armor(b){return b.open>.6?1:.35;},
  update(b,dt,g){b.t+=dt;b.hit=Math.max(0,b.hit-dt);for(const p of b.pods)p.hit=Math.max(0,p.hit-dt);
   const ty=Math.min(g.H*.28,270),entering=b.y<ty-10,w=Math.min(g.W*(b.phase===3?.22:.15),b.phase===3?230:160);
   b.x=g.W/2+Math.sin(b.t*(b.phase===3?.7:.35))*w;b.y+=(ty+(b.phase===3?Math.sin(b.t*1.4)*28:0)-b.y)*Math.min(1,dt*(entering?.8:2));
   b.open+=((b.phase>=2?1:0)-b.open)*Math.min(1,dt*2);b.rage+=((b.phase===3?1:0)-b.rage)*Math.min(1,dt);this.place(b);
   if(entering||b.dying)return;
   const ratio=b.hp/b.maxHp;
   if(b.phase===1&&(ratio<=.66||b.pods.every(p=>p.dead))){b.phase=2;b.mode=0;b.timer=3.2;b.emit=.8;g.phaseShift(b,2);return;}
   if(b.phase===2&&ratio<=.33){b.phase=3;b.mode=0;b.timer=3.6;b.emit=.8;g.phaseShift(b,3);return;}
   for(const p of b.pods){if(p.dead)continue;p.fire-=dt;if(p.fire<=0){fan(g,p.x,p.y+12*b.s,g.aim(p),3,.13,175+g.diff*20,{color:COL.orange,shape:'needle'});p.fire=b.phase===1?1.5:2.2;}}
   const cx=b.core.x,cy=b.core.y;b.timer-=dt;b.emit-=dt;
   if(b.phase===1){if(b.timer<=0){b.attack++;if(b.attack%3){const n=17;for(let i=0;i<n;i++)g.shoot(cx,cy+30*b.s,Math.PI*.14+i/(n-1)*Math.PI*.72+Math.sin(b.t)*.1,135,{color:COL.orange});}else fan(g,cx,cy+30*b.s,g.aim({x:cx,y:cy}),7,.1,200,{color:COL.gold,r:7,shape:'big'});b.timer=.95;}}
   else if(b.phase===2){
    if(b.mode===0){if(b.emit<=0){b.spin+=.21;for(const k of [1,-1])for(let i=0;i<3;i++)g.shoot(cx,cy,k*b.spin+i*TAU/3,125,{color:k>0?COL.pink:COL.lilac,shape:'needle'});b.emit=.11;}
     if(b.timer<=0){b.mode=1;b.timer=3.8;b.emit=.9;for(const side of [-1,1]){const from=()=>({x:b.x+side*236*b.s,y:b.y+18*b.s});g.hazard({follow:from,angle:Math.PI/2-side*.8,a1:Math.PI/2+side*.5,warn:.95,active:2.3,width:16*b.s+8,color:COL.red});}}}
    else{if(b.emit<=0){ring(g,cx,cy,16,b.t,88,{color:COL.lilac,r:6.5,shape:'big'});b.emit=.8;}if(b.timer<=0){b.mode=0;b.timer=3.2;}}}
   else{
    if(b.mode===0){if(b.emit<=0){for(let i=0;i<2;i++)g.shoot(rand(g.W*.04,g.W*.96),-12,Math.PI/2+rand(-.12,.12),rand(170,250),{color:COL.gold,shape:'needle'});b.emit=.075;}b.emit2-=dt;if(b.emit2<=0){fan(g,cx,cy+30*b.s,g.aim({x:cx,y:cy}),5,.12,210,{color:COL.red,r:6.5,shape:'big'});b.emit2=.9;}if(b.timer<=0){b.mode=1;b.timer=3;b.attack=0;b.emit=0;}}
    else if(b.mode===1){if(b.emit<=0){b.attack++;ring(g,cx,cy,24,b.attack%2?TAU/48:0,55,{color:b.attack%2?COL.red:COL.pink,acc:170,max:270});b.emit=.45;}if(b.timer<=0){b.mode=2;b.timer=4.2;b.emit=.6;const base=b.t;for(let i=0;i<4;i++){const a0=base+i*Math.PI/2;g.hazard({follow:()=>({x:b.core.x,y:b.core.y}),angle:a0,a1:a0+1,warn:1,active:2.8,width:14*b.s+8,color:COL.red});}}}
    else{if(b.emit<=0){fan(g,cx,cy,g.aim({x:cx,y:cy}),3,.3,150,{color:COL.gold,r:7,shape:'big'});b.emit=.65;}if(b.timer<=0){b.mode=0;b.timer=3.6;}}}},
  draw(c,b,t,player){const s=b.s,rage=b.rage,open=b.open,hot=rage>.5?'#ff5f73':'#ff86bd',edge=rage>.5?'#ff7a7a':'#ffb3d6';
   c.save();c.translate(b.x,b.y);if(b.dying)c.translate(rand(-4,4),rand(-4,4));c.scale(s,s);
   const halo=c.createRadialGradient(0,0,30,0,0,320);halo.addColorStop(0,rage>.5?'#ff3a5a40':'#ff86bd30');halo.addColorStop(1,'#ff86bd00');c.fillStyle=halo;c.fillRect(-320,-320,640,640);
   // trailing light tendrils behind the hull
   c.globalCompositeOperation='lighter';for(let i=-3;i<=3;i++){c.strokeStyle=hot+'40';c.lineWidth=2;c.beginPath();c.moveTo(i*20,-110);c.bezierCurveTo(i*26+Math.sin(t*1.6+i)*16,-170,i*40+Math.sin(t*1.1+i)*30,-230,i*50+Math.sin(t*.9+i)*40,-300);c.stroke();}c.globalCompositeOperation='source-over';
   // wings
   for(const k of [-1,1]){c.save();c.scale(k,1);const wg=c.createLinearGradient(40,-90,270,40);wg.addColorStop(0,'#1d1626');wg.addColorStop(.6,'#0c0a12');wg.addColorStop(1,'#231428');c.fillStyle=wg;glow(c,edge,18);c.strokeStyle=edge;c.lineWidth=2;
    c.beginPath();c.moveTo(40,-44);c.lineTo(150,-98);c.lineTo(272,-72);c.lineTo(252,-20);c.lineTo(218,22);c.lineTo(162,30);c.lineTo(126,84);c.lineTo(62,64);c.lineTo(34,22);c.closePath();c.fill();c.stroke();c.shadowBlur=0;
    c.strokeStyle=edge+'66';c.lineWidth=1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(56+i*8,-30+i*20);c.lineTo(250-i*26,-66+i*28);c.stroke();}
    const pulse=(t*.6)%1;c.globalCompositeOperation='lighter';c.strokeStyle=hot;c.lineWidth=3;c.globalAlpha=1-pulse;c.beginPath();c.moveTo(40+pulse*230,-44-pulse*30);c.lineTo(52+pulse*230,-48-pulse*30);c.stroke();c.globalAlpha=1;c.globalCompositeOperation='source-over';
    c.restore();}
   // central cathedral hull and crown
   const hg=c.createLinearGradient(0,-140,0,130);hg.addColorStop(0,'#2d2238');hg.addColorStop(.5,'#110d18');hg.addColorStop(1,'#1d1224');c.fillStyle=hg;glow(c,edge,22);c.strokeStyle=edge;c.lineWidth=2.2;
   c.beginPath();c.moveTo(0,-136);c.lineTo(58,-82);c.lineTo(74,8);c.lineTo(44,98);c.lineTo(0,124);c.lineTo(-44,98);c.lineTo(-74,8);c.lineTo(-58,-82);c.closePath();c.fill();c.stroke();
   c.fillStyle='#120d1a';for(let i=-2;i<=2;i++){const h=i?30-Math.abs(i)*6:44;c.beginPath();c.moveTo(i*18-7,-104+Math.abs(i)*9);c.lineTo(i*20,-104-h+Math.abs(i)*9);c.lineTo(i*18+7,-104+Math.abs(i)*9);c.closePath();c.fill();c.stroke();}
   c.shadowBlur=0;
   // mandibles open with the armour
   for(const k of [-1,1]){c.fillStyle='#17101f';c.strokeStyle=edge;c.lineWidth=1.6;c.beginPath();c.moveTo(k*22,100);c.quadraticCurveTo(k*(40+open*16),130,k*(14+open*18),168);c.quadraticCurveTo(k*16,138,k*8,112);c.closePath();c.fill();c.stroke();}
   // rune ring
   c.save();c.rotate(t*.25);c.strokeStyle=hot+'55';c.lineWidth=1.2;c.setLineDash([10,14]);c.beginPath();c.arc(0,8,112,0,TAU);c.stroke();c.setLineDash([]);c.restore();
   // armour plates around the core
   const pr=48+open*36;for(let i=0;i<8;i++){const a=i/8*TAU+t*(.4+open*.8+rage*1.2);c.save();c.translate(Math.cos(a)*pr,8+Math.sin(a)*pr);c.rotate(a+Math.PI/2);c.fillStyle='#231a2e';c.strokeStyle=edge;c.lineWidth=1.3;c.beginPath();c.moveTo(-20+open*6,-7);c.lineTo(20-open*6,-7);c.lineTo(14,8);c.lineTo(-14,8);c.closePath();c.fill();c.stroke();c.restore();}
   // the eye
   const eyeR=40,ex=player?clamp((player.x-b.x)/s*.04,-10,10):0,ey=player?clamp((player.y-b.y)/s*.03,-4,12):0,k=b.hit>0?1:0;
   const ey1=c.createRadialGradient(0,8,4,0,8,eyeR);ey1.addColorStop(0,rage>.5?'#fff0f0':'#fffbe8');ey1.addColorStop(.35,rage>.5?'#ff5470':'#ffc16a');ey1.addColorStop(.8,rage>.5?'#7a0c24':'#8a3a28');ey1.addColorStop(1,'#1a0810');glow(c,rage>.5?'#ff4060':'#ffb36a',36+k*20);c.fillStyle=ey1;c.beginPath();c.arc(0,8,eyeR*(.85+open*.15),0,TAU);c.fill();c.shadowBlur=0;
   c.fillStyle='#16040a';c.beginPath();c.ellipse(ex,8+ey,4+open*3+rage*2,16+open*6,0,0,TAU);c.fill();dot(c,ex-8,ey-2,3,'#ffffffcc');
   if(open<.6){c.globalAlpha=(1-open/.6)*.85;c.strokeStyle='#ffd9ec';c.lineWidth=1;for(let i=0;i<6;i++){const a=i/6*TAU;c.beginPath();c.moveTo(Math.cos(a)*18,8+Math.sin(a)*18);c.lineTo(Math.cos(a+1)*18,8+Math.sin(a+1)*18);c.stroke();}c.globalAlpha=1;}
   c.restore();
   // gun pods drawn in world space so their hit circles match exactly
   for(const p of b.pods){c.save();c.translate(p.x,p.y);c.scale(s,s);if(p.dead){c.fillStyle='#120c16';c.strokeStyle='#5a3a4a';c.lineWidth=1.2;c.beginPath();c.arc(0,0,18,0,TAU);c.fill();c.stroke();if(Math.random()<.3){c.globalCompositeOperation='lighter';dot(c,rand(-10,10),rand(-10,10),rand(1,3),'#ffb070');}c.restore();continue;}
    glow(c,edge,16);const pg=c.createRadialGradient(-6,-6,2,0,0,27);pg.addColorStop(0,'#5a4466');pg.addColorStop(1,'#140e1a');c.fillStyle=pg;c.strokeStyle=edge;c.lineWidth=1.8;c.beginPath();c.arc(0,0,26,0,TAU);c.fill();c.stroke();
    c.rotate(t*2*(p.ox>0?1:-1));c.strokeStyle=hot;c.lineWidth=2;for(let i=0;i<3;i++){c.rotate(TAU/3);c.beginPath();c.arc(0,0,19,0,.9);c.stroke();}
    const hp=p.hp/p.maxHp;glow(c,hot,14+(p.hit>0?16:0));dot(c,0,0,7+(1-hp)*3,p.hit>0?'#ffffff':hot);c.restore();}
   c.shadowBlur=0;}};

 const api={COL,SPECIES:S,create,update,draw,wave,SCRIPT,Sentinel,Core,species:t=>S[t]};
 root.RinkouEnemies=api;
})(typeof window!=='undefined'?window:globalThis);
