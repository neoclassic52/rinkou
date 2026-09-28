/* RINKOU ending: a 75-second cinematic timed to ending.mp3.
   The planet behind the core awakens and swallows every shot; the final form gives itself up to destroy it,
   leaving one small light that fades before the title. Time comes from the audio clock when music plays. */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a);
 const win=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
 const DURATION=75.1,IMPACT=44.6,BLAST=50;
 const LINES=[[2,7.6,'……まだ、終わっていない。'],[13,19.2,'攻撃が、届かない――'],[23.6,30.6,'残された光を、すべて。'],[56.5,63.5,'そして、小さな光だけが残った。']];
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const mix=(a,b,k)=>{const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(lerp(v,B[i],clamp(k,0,1))).toString(16).padStart(2,'0')).join('');};

 const sprites=new Map();
 function glowSprite(color){let s=sprites.get(color);if(s)return s;s=document.createElement('canvas');s.width=s.height=128;const c=s.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.16,color);g.addColorStop(.5,color+'55');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,128,128);sprites.set(color,s);return s;}
 function glow(c,x,y,r,color,a=1){if(r<=0||a<=0)return;c.globalAlpha=Math.min(1,a);c.drawImage(glowSprite(color),x-r,y-r,r*2,r*2);}

 let S=null;
 // Fixed cracks so the planet always breaks the same way.
 const cracks=Array.from({length:10},(_,i)=>{let a=i/10*TAU+Math.sin(i*7.3)*.25;const pts=[[0,0]];let r=0;for(let k=0;k<6;k++){r+=.2+Math.abs(Math.sin(i*3.1+k*1.7))*.18;a+=Math.sin(i*5+k*2.3)*.28;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}return pts;});
 const disk=Array.from({length:170},(_,k)=>({ring:k%8,a:k*2.39996,w:.6+((k*37)%10)/12}));

 function start(o){
  S={route:o.route,power:o.power,forms:o.forms,accent:o.accent,clock:o.clock||null,wall:performance.now(),t:0,last:0,
   stars:Array.from({length:230},()=>({x:Math.random(),y:Math.random(),z:rand(.3,1.5),p:rand(0,TAU)})),
   debris:Array.from({length:28},()=>{const a=rand(0,TAU),sp=rand(8,46);return {x:0,y:0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,rot:rand(0,TAU),vr:rand(-1.2,1.2),size:rand(6,20)};}),
   shots:[],motes:[],infall:[],trail:[],frags:[],rings:[],sparks:[],flash:0,shake:0,impacted:false,blasted:false,emit:0};
 }
 const time=()=>S.clock?S.clock():(performance.now()-S.wall)/1000;
 const done=()=>!!S&&S.t>=DURATION;
 function seek(t){if(!S)return;if(S.clock){const now=S.clock();const base=S.clock;S.clock=()=>base()-now+t;}else S.wall=performance.now()-t*1000;}

 function layout(W,H){
  const t=S.t,m=Math.min(W,H),R=m*.12*(1+win(8,20,t)*.25+win(20,32,t)*.18),P={x:W/2,y:H*.3};
  // The ship idles, trembles as the pull grows, then dives into the planet.
  const bx=W/2+Math.sin(t*.7)*W*.06*(1-win(20,26,t)),by=H*.64+Math.sin(t*1.3)*6-win(20,32,t)*H*.05;
  const tremble=win(20,26,t)*(1-win(30,32,t))*3,k=clamp((t-32)/(IMPACT-32),0,1),dive=k*k*k;
  const ship={x:lerp(bx,P.x,dive)+rand(-tremble,tremble),y:lerp(by,P.y,dive)+rand(-tremble,tremble),scale:Math.min(1.35,W/420)*lerp(1,.45,dive),dive:k,visible:t<IMPACT};
  return {t,W,H,m,R,P,ship};
 }
 function update(dt,W,H){
  if(!S)return;S.t=time();const L=layout(W,H),{t,P,R,ship}=L,col=S.accent;
  S.flash=Math.max(0,S.flash-dt*.9);S.shake=Math.max(0,S.shake-dt*18);
  for(const d of S.debris){d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;if(t>18){const dx=-d.x,dy=-d.y,r=Math.hypot(dx,dy)||1,pull=win(18,30,t)*240;d.vx+=dx/r*pull*dt;d.vy+=dy/r*pull*dt;}}
  // 10-19 s: every shot is drawn into the planet and swallowed.
  if(t>10&&t<19&&ship.visible){S.emit-=dt;if(S.emit<=0){S.emit=S.route==='spread'?.08:.05;const n=S.route==='spread'?5:1;for(let i=0;i<n;i++){const a=Math.atan2(P.y-ship.y,P.x-ship.x)+(i-(n-1)/2)*.12+rand(-.02,.02),sp=S.route==='spread'?640:900;S.shots.push({x:ship.x,y:ship.y-20,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,orbit:false,life:1});}}}
  const capture=Math.min(R*1.8,Math.hypot(ship.x-P.x,ship.y-P.y)*.42);for(const s of S.shots){const dx=s.x-P.x,dy=s.y-P.y,r=Math.hypot(dx,dy);if(!s.orbit&&r<capture){s.orbit=true;s.ang=Math.atan2(dy,dx);s.r=r;s.dir=Math.random()<.5?1:-1;}
   if(s.orbit){s.r-=dt*Math.max(R*1.4,s.r*1.2);s.ang+=s.dir*dt*(4+R*2/Math.max(8,s.r));s.x=P.x+Math.cos(s.ang)*s.r;s.y=P.y+Math.sin(s.ang)*s.r*.45;s.life=clamp((s.r-R*.9)/(R*.8),0,1);}else{s.x+=s.vx*dt;s.y+=s.vy*dt;}}
  S.shots=S.shots.filter(s=>s.life>0.02);
  // 20-45 s: starlight streams into the planet.
  if(t>19&&t<BLAST){const rate=win(19,26,t)*40;for(let i=0;i<rate*dt*3;i++){const a=rand(0,TAU),r=Math.hypot(W,H)*.7;S.infall.push({ang:a,r,sp:rand(.6,1.2)});}}
  for(const p of S.infall){p.r-=dt*(120+26*R/Math.max(R,p.r)*10)*p.sp;p.ang+=dt*1.2*(R*3/Math.max(R,p.r))*p.sp;}
  S.infall=S.infall.filter(p=>p.r>R*.95&&t<BLAST+1);
  // 24-32 s: light gathers into the ship.
  if(t>24&&t<33&&ship.visible){for(let i=0;i<dt*130;i++){const a=rand(0,TAU),r=rand(120,320);S.motes.push({x:ship.x+Math.cos(a)*r,y:ship.y+Math.sin(a)*r,life:1});}}
  for(const m of S.motes){const dx=ship.x-m.x,dy=ship.y-m.y,d=Math.hypot(dx,dy)||1,v=Math.min(d,(260+(1-m.life)*900)*dt);m.x+=dx/d*v;m.y+=dy/d*v;m.life-=dt*.9;if(d<10)m.life=0;}
  S.motes=S.motes.filter(m=>m.life>0);
  if(t>32&&ship.visible){S.trail.unshift({x:ship.x,y:ship.y});if(S.trail.length>60)S.trail.pop();S.shake=Math.max(S.shake,win(36,IMPACT,t)*8);}else if(S.trail.length&&t>IMPACT)S.trail.pop();
  if(!S.impacted&&t>=IMPACT){S.impacted=true;S.flash=1.2;S.shake=26;for(let i=0;i<140;i++){const a=rand(0,TAU),sp=rand(80,520);S.sparks.push({x:P.x,y:P.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.6,1.6),color:Math.random()<.5?col:'#ffffff'});}S.rings.push({r:R,v:R*6,life:1.2,total:1.2,color:'#ffffff'});}
  if(!S.blasted&&t>=BLAST){S.blasted=true;S.flash=.9;S.shake=40;
   for(let i=0;i<46;i++){const a=rand(0,TAU),sp=rand(60,520),n=5+Math.floor(rand(0,3)),pts=[];for(let k=0;k<n;k++){const q=k/n*TAU,rr=rand(.5,1);pts.push([Math.cos(q)*rr,Math.sin(q)*rr]);}S.frags.push({x:P.x+Math.cos(a)*R*.6,y:P.y+Math.sin(a)*R*.3,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.7,rot:rand(0,TAU),vr:rand(-3,3),size:rand(8,30)*(R/70),pts,life:1});}
   for(const [k,c] of [[1,'#ffffff'],[.7,'#ffb070'],[.45,col]])S.rings.push({r:R*.5,v:Math.max(W,H)*1.1*k,life:2.2,total:2.2,color:c});
   for(let i=0;i<260;i++){const a=rand(0,TAU),sp=rand(60,900);S.sparks.push({x:P.x,y:P.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.8,2.6),color:['#ffffff','#ffb070','#ff5a78',col][i%4]});}}
  for(const f of S.frags){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=1-dt*.25;f.vy*=1-dt*.25;f.rot+=f.vr*dt;f.life-=dt*.16;}S.frags=S.frags.filter(f=>f.life>0);
  for(const s of S.sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=1-dt*1.2;s.vy*=1-dt*1.2;s.life-=dt;}S.sparks=S.sparks.filter(s=>s.life>0);
  for(const r of S.rings){r.r+=r.v*dt;r.life-=dt;}S.rings=S.rings.filter(r=>r.life>0);
 }

 function planet(c,L,alpha){
  const {P,R,t}=L,x=P.x,y=P.y,aw=win(8,12,t),eye=win(8.6,12.5,t)*(1-win(IMPACT,IMPACT+1.2,t)),crack=win(45.4,BLAST,t),pulse=1+Math.sin(t*(2+aw*3))*.04*(1+aw);
  const hot=mix('#ffb070','#ff3a52',aw),outer=mix('#ff6f9c','#b0102c',aw);
  c.save();c.globalAlpha=alpha;
  const g=c.createRadialGradient(x,y,R*.9,x,y,R*5.5*pulse);g.addColorStop(0,hot+'77');g.addColorStop(.3,outer+'33');g.addColorStop(1,outer+'00');c.fillStyle=g;c.fillRect(x-R*6,y-R*6,R*12,R*12);
  c.globalCompositeOperation='lighter';
  const band=front=>{const a0=front?0:Math.PI,a1=front?Math.PI:TAU;c.globalAlpha=alpha*(front?.55:.35);c.strokeStyle=hot;c.lineWidth=R*.55;c.beginPath();c.ellipse(x,y,R*2*pulse,R*.48*pulse,0,a0,a1);c.stroke();c.globalAlpha=alpha*(front?.8:.5);c.strokeStyle=mix('#ffe2b4','#ffb0a0',aw);c.lineWidth=R*.14;c.beginPath();c.ellipse(x,y,R*1.75*pulse,R*.42*pulse,0,a0,a1);c.stroke();};
  const parts=front=>{for(const d of disk){const rad=R*(1.35+d.ring*.2),ang=d.a+t*(1.3+aw*1.5)/(rad/R),sn=Math.sin(ang);if(front?sn<0:sn>=0)continue;const px=x+Math.cos(ang)*rad,py=y+sn*rad*.24;c.globalAlpha=alpha*(front?.9:.45)*d.w;c.strokeStyle=d.ring<2?'#fff3d8':d.ring<5?hot:outer;c.lineWidth=d.ring<3?2.4:1.6;c.beginPath();c.moveTo(px,py);c.lineTo(px-sn*rad*.16,py+Math.cos(ang)*rad*.24*.16);c.stroke();}};
  band(false);parts(false);
  c.globalCompositeOperation='source-over';c.globalAlpha=alpha;c.fillStyle='#000000';c.beginPath();c.arc(x,y,R,0,TAU);c.fill();
  // The awakened planet opens a single burning eye.
  if(eye>.01){c.save();c.beginPath();c.arc(x,y,R*.98,0,TAU);c.clip();const ew=R*.78,eh=R*.62*eye;c.beginPath();c.moveTo(x-ew,y);c.quadraticCurveTo(x,y-eh*1.6,x+ew,y);c.quadraticCurveTo(x,y+eh*1.6,x-ew,y);c.closePath();
   const ig=c.createRadialGradient(x,y,2,x,y,ew);ig.addColorStop(0,'#fff0d0');ig.addColorStop(.25,'#ff6a3a');ig.addColorStop(.7,'#9a0c22');ig.addColorStop(1,'#2a0008');c.fillStyle=ig;c.shadowColor='#ff3048';c.shadowBlur=30;c.fill();c.shadowBlur=0;
   c.fillStyle='#050002';c.beginPath();c.ellipse(x,y,R*.07+R*.05*(1-eye),R*.46*eye,0,0,TAU);c.fill();c.fillStyle='#ffffffcc';c.beginPath();c.arc(x-R*.2,y-R*.12*eye,R*.05,0,TAU);c.fill();c.restore();}
  c.globalCompositeOperation='lighter';c.strokeStyle=mix('#ffe6b8','#ffd0c0',aw);c.lineWidth=2.4;c.globalAlpha=alpha*(.8+Math.sin(t*3)*.2);c.beginPath();c.arc(x,y,R*1.06,0,TAU);c.stroke();c.lineWidth=10;c.globalAlpha=alpha*.2;c.stroke();
  band(true);parts(true);
  // Cracks spread from the impact point, spilling light.
  if(crack>0){c.globalAlpha=alpha;c.lineJoin='round';for(const pts of cracks){const n=Math.max(1,Math.ceil(crack*(pts.length-1)));c.beginPath();c.moveTo(x,y);for(let k=1;k<=n;k++)c.lineTo(x+pts[k][0]*R*1.25,y+pts[k][1]*R*1.25*.8);c.strokeStyle='#ffffff';c.lineWidth=2+crack*3;c.shadowColor='#ffb070';c.shadowBlur=20;c.stroke();c.lineWidth=8+crack*10;c.globalAlpha=alpha*.25;c.stroke();c.globalAlpha=alpha;}c.shadowBlur=0;glow(c,x,y,R*(1+crack*2.5),'#fff0d0',crack*.9);}
  c.restore();
 }
 function text(c,W,H,str,y,size,alpha,font,color='#f4fbff',shadow='#ffffff'){c.save();c.globalAlpha=alpha;c.textAlign='center';c.textBaseline='middle';c.font=`${font} ${size}px ${font.includes('900')?'"Barlow Condensed"':'"Noto Sans JP"'},sans-serif`;if('letterSpacing' in c)c.letterSpacing=Math.round(size*.12)+'px';c.shadowColor=shadow;c.shadowBlur=size*.8;c.fillStyle=color;c.fillText(str,W/2,y);c.restore();}

 function draw(c,W,H){
  if(!S)return;const L=layout(W,H),{t,P,R,ship,m}=L,col=S.accent;
  c.save();c.fillStyle='#020306';c.fillRect(0,0,W,H);
  if(S.shake>0)c.translate(rand(-S.shake,S.shake),rand(-S.shake,S.shake));
  // Sky: warm and red while the planet lives, deep and quiet afterwards.
  const calm=win(BLAST+2,60,t),sky=c.createRadialGradient(P.x,P.y,0,P.x,P.y,Math.max(W,H));sky.addColorStop(0,mix(mix('#3a160c','#4a0612',win(8,14,t)),'#0a1022',calm));sky.addColorStop(1,mix('#050204','#02040a',calm));c.fillStyle=sky;c.fillRect(-50,-50,W+100,H+100);
  const pull=win(20,44,t)*(1-win(BLAST,BLAST+1,t));
  for(const s of S.stars){let x=s.x*W,y=((s.y*H+t*8*s.z)%H+H)%H;x=lerp(x,P.x,pull*.18*s.z);y=lerp(y,P.y,pull*.18*s.z);const a=(.25+s.z*.3)*(1+Math.sin(t*1.5+s.p)*.3);c.globalAlpha=Math.min(1,a);c.fillStyle=calm>.5?'#cfe2ff':'#ffe6d6';c.fillRect(x,y,s.z*1.1,s.z*1.1+pull*s.z*6);}
  c.globalAlpha=1;
  // The defeated core's debris drifts, then is drawn in.
  const cx=W/2,cy=H*.27;for(const d of S.debris){const a=clamp(1-t/30,0,1);if(a<=0)break;c.save();c.globalAlpha=a;c.translate(cx+d.x,cy+d.y);c.rotate(d.rot);c.fillStyle='#1a1224';c.strokeStyle='#ff86bd';c.lineWidth=1.2;c.beginPath();c.moveTo(-d.size,0);c.lineTo(0,-d.size*.6);c.lineTo(d.size*.8,d.size*.2);c.lineTo(-d.size*.2,d.size*.6);c.closePath();c.fill();c.stroke();c.restore();}
  // Infalling starlight.
  c.globalCompositeOperation='lighter';for(const p of S.infall){const x=P.x+Math.cos(p.ang)*p.r,y=P.y+Math.sin(p.ang)*p.r*.7,x2=P.x+Math.cos(p.ang-.05)*(p.r+26),y2=P.y+Math.sin(p.ang-.05)*(p.r+26)*.7;c.globalAlpha=.55;c.strokeStyle='#ffe0c8';c.lineWidth=1.2;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  if(t<BLAST+.4)planet(c,L,1-win(BLAST,BLAST+.4,t));
  c.globalCompositeOperation='lighter';
  // Shots (and the laser) curl into the planet and vanish.
  if(S.route==='laser'&&t>10&&t<19&&ship.visible){const a=Math.atan2(P.y-ship.y,P.x-ship.x),cap=Math.min(R*1.8,Math.hypot(ship.x-P.x,ship.y-P.y)*.42),ex=P.x-Math.cos(a)*cap,ey=P.y-Math.sin(a)*cap;c.globalAlpha=.35;c.strokeStyle=col;c.lineWidth=26;c.beginPath();c.moveTo(ship.x,ship.y-20);c.lineTo(ex,ey);c.stroke();c.globalAlpha=.9;c.lineWidth=9;c.stroke();c.strokeStyle='#ffffff';c.lineWidth=3;c.stroke();
   c.globalAlpha=.8;c.strokeStyle=col;c.lineWidth=5;c.beginPath();for(let i=0;i<=40;i++){const u=i/40,r=lerp(cap,R*.95,u),q=a+Math.PI+u*5.5+t*6;const px=P.x+Math.cos(q)*r,py=P.y+Math.sin(q)*r*.45;i?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}
  for(const s of S.shots){glow(c,s.x,s.y,10,col,s.life);c.globalAlpha=s.life;c.fillStyle='#ffffff';c.fillRect(s.x-1.5,s.y-1.5,3,3);}
  for(const mo of S.motes){glow(c,mo.x,mo.y,9+(1-mo.life)*8,col,mo.life);glow(c,mo.x,mo.y,3,'#ffffff',mo.life);}
  // The dive: a burning trail behind the ship.
  if(S.trail.length>1){c.lineCap='round';for(let i=1;i<S.trail.length;i++){const k=1-i/S.trail.length;c.globalAlpha=k*.8;c.strokeStyle=i<6?'#ffffff':col;c.lineWidth=k*(18+ship.dive*30);c.beginPath();c.moveTo(S.trail[i-1].x,S.trail[i-1].y);c.lineTo(S.trail[i].x,S.trail[i].y);c.stroke();}}
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  if(ship.visible){const charge=win(24,32,t),white=win(31,IMPACT,t);c.globalCompositeOperation='lighter';glow(c,ship.x,ship.y,(70+charge*120+white*140)*ship.scale,col,.35+charge*.5);glow(c,ship.x,ship.y,(30+white*90)*ship.scale,'#ffffff',white);c.globalCompositeOperation='source-over';c.globalAlpha=1;
   S.forms.draw(c,{route:S.route,power:S.power,time:t,x:ship.x,y:ship.y,scale:ship.scale,bank:Math.cos(t*.7)*.35*(1-win(20,26,t)),thrust:.4+ship.dive*.6,motion:{vx:Math.cos(t*.7)*120,vy:-ship.dive*400}});
   if(white>0){c.globalCompositeOperation='lighter';glow(c,ship.x,ship.y,60*ship.scale+white*50,'#ffffff',white*.9);c.globalCompositeOperation='source-over';}}
  c.globalCompositeOperation='lighter';
  for(const f of S.frags){c.save();c.globalAlpha=clamp(f.life,0,1);c.translate(f.x,f.y);c.rotate(f.rot);c.fillStyle='#2a1410';c.strokeStyle='#ffc890';c.lineWidth=2.2;c.beginPath();f.pts.forEach(([px,py],i)=>i?c.lineTo(px*f.size,py*f.size):c.moveTo(px*f.size,py*f.size));c.closePath();c.globalCompositeOperation='source-over';c.fill();c.globalCompositeOperation='lighter';c.stroke();c.restore();}
  for(const s of S.sparks){c.globalAlpha=clamp(s.life,0,1);c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.x-s.vx*.03,s.y-s.vy*.03);c.stroke();}
  for(const r of S.rings){const k=r.life/r.total;c.globalAlpha=k*.8;c.strokeStyle=r.color;c.lineWidth=2+k*8;c.beginPath();c.arc(P.x,P.y,r.r,0,TAU);c.stroke();}
  // After the blast: a lingering glow, then the single small light.
  if(t>BLAST){const cloud=1-win(BLAST+1,58,t);glow(c,P.x,P.y,m*.55*cloud+10,'#ffb070',cloud*.55);glow(c,P.x,P.y,m*.22*cloud+10,'#ffffff',cloud*.5);
   if(t>54){const appear=win(54,57,t),fade=1-win(64,71,t),flick=fade<1?(.6+.4*Math.sin(t*23)*Math.sin(t*7.3)):1,a=appear*fade*flick,lx=W/2+Math.sin(t*.5)*W*.05,ly=lerp(P.y,H*.47,win(54,66,t))+Math.sin(t*.9)*8;
    glow(c,lx,ly,70*a+4,col,a*.7);glow(c,lx,ly,22*a+2,'#ffffff',a);for(let i=0;i<6;i++){const q=t*1.3+i*TAU/6,rr=26+Math.sin(t*2+i)*6;glow(c,lx+Math.cos(q)*rr,ly+Math.sin(q)*rr*.6,4,col,a*.5);}}}
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  if(S.flash>0){c.fillStyle=`rgba(255,250,240,${Math.min(1,S.flash)})`;c.fillRect(-50,-50,W+100,H+100);}
  c.restore();
  // Captions and the closing title are drawn steady (no shake).
  const cap=Math.min(26,W*.05);for(const [a,b,str] of LINES){const al=win(a,a+1,t)*(1-win(b-1,b,t));if(al>0)text(c,W,H,str,H*.9,cap,al,'500');}
  const ti=win(68.5,70.5,t)*(1-win(73,74.8,t));if(ti>0){const big=Math.min(120,W*.16);text(c,W,H,'RINKOU',H*.46,big,ti,'900',S.accent==='#69b7ff'?'#e0f0ff':'#e6ffe0',col);text(c,W,H,'燐 光',H*.46+big*.72,big*.3,ti,'500',col,col);}
  const out=win(74.4,DURATION,t);if(out>0){c.fillStyle=`rgba(0,0,0,${out})`;c.fillRect(0,0,W,H);}
 }
 function stop(){S=null;}
 root.RinkouEnding={DURATION,start,update,draw,done,seek,stop,setClock(fn){if(S)S.clock=fn;},get time(){return S?time():0;}};
})(typeof window!=='undefined'?window:globalThis);
