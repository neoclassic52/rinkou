/* RINKOU stage backdrops: five sectors that cross-fade as the mission advances. */
(function(root){
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const ZONES=[
  {start:0,code:'01',name:'NEBULA APPROACH',jp:'燐光の星雲'},
  {start:62,code:'02',name:'CRYSTAL RIFT',jp:'氷晶の裂け目'},
  {start:132,code:'03',name:'AURORA SEA',jp:'極光の海'},
  {start:204,code:'04',name:'LUMEN CORRIDOR',jp:'光の回廊'},
  {start:272,code:'05',name:'EVENT HORIZON',jp:'事象の地平'}
 ],FADE=5;
 function zoneAt(t){let z=0;for(let i=1;i<ZONES.length;i++)if(t>=ZONES[i].start)z=i;return z;}
 let seed=11;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
 const alpha=(hex,a)=>hex+Math.round(clamp(a,0,1)*255).toString(16).padStart(2,'0');
 const wrap=(v,m)=>((v%m)+m)%m;

 // Stable decor, generated once so every run flies through the same sky.
 const clouds=Array.from({length:11},()=>({x:rnd(),y:rnd(),r:.22+rnd()*.34,c:Math.floor(rnd()*4)}));
 const galaxy=Array.from({length:150},(_,i)=>({arm:i%2,u:rnd(),j:(rnd()-.5)*.35}));
 const crystals=Array.from({length:34},()=>{const n=6,pts=[];for(let i=0;i<n;i++){const a=i/n*TAU+(rnd()-.5)*.4,r=.55+rnd()*.45;pts.push([Math.cos(a)*r*.55,Math.sin(a)*r*1.5]);}return {x:rnd(),y:rnd(),z:.2+rnd()*1.1,size:12+rnd()*40,rot:rnd()*TAU,spin:(rnd()-.5)*.5,pts};});
 const ribbons=[{y:.16,amp:34,f:.006,sp:.5,len:150,c:0},{y:.3,amp:26,f:.009,sp:-.7,len:110,c:1},{y:.44,amp:20,f:.012,sp:.9,len:80,c:2}];
 const streaks=Array.from({length:44},()=>({a:rnd()*TAU,u:rnd(),w:.5+rnd()}));
 const infall=Array.from({length:110},()=>({a:rnd()*TAU,r:rnd(),sp:.5+rnd()}));
 const disk=Array.from({length:230},(_,k)=>({ring:k%8,a:k*2.39996,w:.6+rnd()*.8}));

 const cache=new Map();
 function tile(key,w,h,paint){let t=cache.get(key);if(t)return t;if(cache.size>8)cache.clear();t=document.createElement('canvas');t.width=Math.max(1,Math.round(w));t.height=Math.max(1,Math.round(h));paint(t.getContext('2d'),t.width,t.height);cache.set(key,t);return t;}
 function curtain(color){return tile('curtain'+color,4,160,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,alpha(color,0));g.addColorStop(.72,alpha(color,.5));g.addColorStop(.9,alpha('#ffffff',.75));g.addColorStop(1,alpha(color,0));c.fillStyle=g;c.fillRect(0,0,w,h);});}

 // 01 · Nebula: two parallax cloud tiles, a slowly turning spiral galaxy and drifting dust.
 function nebula(c,s,a){
  const {W,H}=s,cols=[s.accent,'#28d3c0','#7a5cff','#1c8f6a'];
  const far=tile('neb'+W+'x'+H+s.accent,W,H,(g,w,h)=>{for(const k of clouds)for(const dy of [-h,0,h]){const x=k.x*w,y=k.y*h+dy,r=k.r*Math.max(w,h)*.55,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,alpha(cols[k.c],.2));gr.addColorStop(.5,alpha(cols[k.c],.07));gr.addColorStop(1,alpha(cols[k.c],0));g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
   for(let i=0;i<260;i++){g.fillStyle=`rgba(210,255,230,${.05+Math.random()*.2})`;g.fillRect(Math.random()*w,Math.random()*h,1,1);}});
  c.globalAlpha=a;const o=wrap(s.scroll*.06,H);c.drawImage(far,0,o-H,W,H);c.drawImage(far,0,o,W,H);
  c.globalAlpha=a*.55;const o2=wrap(s.scroll*.16+H*.4,H);c.save();c.translate(W,0);c.scale(-1,1);c.drawImage(far,0,o2-H,W,H);c.drawImage(far,0,o2,W,H);c.restore();
  const gx=W*.78,gy=wrap(H*.3+s.scroll*.025,H*1.6)-H*.3,rot=s.t*.03;c.globalCompositeOperation='lighter';
  for(const d of galaxy){const r=d.u*Math.min(W,H)*.16,ang=rot+d.u*5.2+d.arm*Math.PI+d.j;c.globalAlpha=a*(1-d.u)*.55;c.fillStyle=d.u<.18?'#fff4dc':s.accent;c.fillRect(gx+Math.cos(ang)*r,gy+Math.sin(ang)*r*.42,1.6,1.6);}
  c.globalAlpha=a*.35;const core=c.createRadialGradient(gx,gy,0,gx,gy,40);core.addColorStop(0,'#fff6dc');core.addColorStop(1,'#fff6dc00');c.fillStyle=core;c.fillRect(gx-40,gy-40,80,80);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
 }
 // 02 · Crystal rift: god rays through a field of tumbling ice shards at three depths.
 function rift(c,s,a){
  const {W,H,t}=s;c.globalAlpha=a;const wash=c.createLinearGradient(0,0,0,H);wash.addColorStop(0,'#1b1548aa');wash.addColorStop(.6,'#0b0d2a55');wash.addColorStop(1,'#05081800');c.fillStyle=wash;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){const x=W*(.1+i*.28)+Math.sin(t*.2+i)*40,sp=W*.09+i*14;c.globalAlpha=a*(.05+.03*Math.sin(t*.7+i*2));const g=c.createLinearGradient(x,0,x+H*.35,H);g.addColorStop(0,'#cdbcff');g.addColorStop(1,'#cdbcff00');c.fillStyle=g;c.beginPath();c.moveTo(x-sp*.3,0);c.lineTo(x+sp*.3,0);c.lineTo(x+H*.35+sp,H);c.lineTo(x+H*.35-sp,H);c.fill();}
  c.globalCompositeOperation='source-over';
  const span=H*1.4;
  for(const k of crystals){const y=wrap(k.y*span+s.scroll*k.z*.55,span)-H*.2,x=k.x*W,sz=k.size*(.45+k.z*.7),rot=k.rot+t*k.spin;if(y<-sz*2||y>H+sz*2)continue;
   c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha=a*clamp(.25+k.z*.55,0,.9);
   c.fillStyle=k.z>1?'rgba(60,48,130,.28)':'rgba(34,28,86,.62)';c.strokeStyle=k.z>1?'#e2d8ff':'#9c8cf0';c.lineWidth=k.z>1?1.4:.9;
   c.beginPath();k.pts.forEach(([px,py],i)=>i?c.lineTo(px*sz,py*sz):c.moveTo(px*sz,py*sz));c.closePath();c.fill();c.stroke();
   c.globalAlpha*=.8;c.strokeStyle='#ffffff';c.lineWidth=.7;c.beginPath();c.moveTo(k.pts[0][0]*sz,k.pts[0][1]*sz);c.lineTo(0,0);c.lineTo(k.pts[3][0]*sz,k.pts[3][1]*sz);c.stroke();
   const tw=Math.sin(t*3+k.x*40);if(tw>.85){c.globalCompositeOperation='lighter';c.fillStyle='#ffffff';c.fillRect(k.pts[1][0]*sz-1,k.pts[1][1]*sz-5,2,10);c.fillRect(k.pts[1][0]*sz-5,k.pts[1][1]*sz-1,10,2);c.globalCompositeOperation='source-over';}
   c.restore();}
  c.globalAlpha=1;
 }
 // 03 · Aurora sea: a planet's night side below and three living curtains of light.
 function aurora(c,s,a){
  const {W,H,t}=s,cols=[s.accent,'#55f0d0','#b58cff'];c.globalAlpha=a;
  const wash=c.createLinearGradient(0,0,0,H);wash.addColorStop(0,'#03201c88');wash.addColorStop(1,'#02110f00');c.fillStyle=wash;c.fillRect(0,0,W,H);
  const R=Math.max(W,H)*1.05,cx=W*.5,cy=H+R*.87;
  c.save();c.beginPath();c.arc(cx,cy,R,0,TAU);c.clip();const pg=c.createRadialGradient(cx,cy-R,R*.1,cx,cy,R);pg.addColorStop(0,'#0e3b3a');pg.addColorStop(.25,'#06201f');pg.addColorStop(1,'#020a0a');c.fillStyle=pg;c.fillRect(0,cy-R,W,R);
  for(let i=0;i<6;i++){const y=cy-R+wrap(i*60+s.scroll*.05,360);c.globalAlpha=a*.13;c.fillStyle='#8ff5d9';c.beginPath();c.ellipse(cx+Math.sin(i*1.7)*W*.2,y,W*.5,5+i%3*3,0,0,TAU);c.fill();}
  c.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const x=(i*97.3)%W,y=cy-R+12+((i*53)%140);c.globalAlpha=a*(.25+.2*Math.sin(t*2+i));c.fillStyle='#ffe7a8';c.fillRect(x,y,1.5,1.5);}
  c.restore();
  c.globalCompositeOperation='lighter';c.globalAlpha=a*.22;c.strokeStyle=s.accent;c.lineWidth=18;c.beginPath();c.arc(cx,cy,R+6,Math.PI*1.1,Math.PI*1.9);c.stroke();c.globalAlpha=a*.45;c.lineWidth=1.5;c.strokeStyle='#e8fff6';c.beginPath();c.arc(cx,cy,R,Math.PI*1.1,Math.PI*1.9);c.stroke();
  for(const rb of ribbons){const img=curtain(cols[rb.c]),y0=H*rb.y;for(let x=-8;x<W+8;x+=7){const y=y0+Math.sin(x*rb.f+t*rb.sp)*rb.amp+Math.sin(x*rb.f*2.3-t*rb.sp*1.7)*rb.amp*.35,h=rb.len*(.65+.35*Math.sin(x*.011+t*1.3+rb.c));c.globalAlpha=a*(.35+.25*Math.sin(x*.02-t*2+rb.c));c.drawImage(img,x,y-h,8,h+10);}}
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
 }
 // 04 · Lumen corridor: a perspective light-floor, gates rushing past and warp streaks.
 function corridor(c,s,a){
  const {W,H,t}=s,hy=H*.07,vx=W*.5,col=s.accent,lanes=14,travel=s.scroll*.0045,ph=wrap(travel,1),base=Math.floor(travel);
  c.globalAlpha=a;const wash=c.createLinearGradient(0,hy,0,H);wash.addColorStop(0,alpha(col,.14));wash.addColorStop(.25,'#04120c55');wash.addColorStop(1,'#02080500');c.fillStyle=wash;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='lighter';
  for(let j=-9;j<=9;j++){c.globalAlpha=a*.17;c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.moveTo(vx+j*6,hy);c.lineTo(vx+j*W*.16,H*1.1);c.stroke();}
  for(let i=0;i<lanes;i++){const z=1+i+(1-ph),k=1.6/z,y=hy+(H-hy)*k;if(y>H+40)continue;const gate=(base+i)%4===0,fade=clamp(k*1.4,0,1);
   c.globalAlpha=a*fade*(gate?.45:.26);c.strokeStyle=col;c.lineWidth=gate?Math.max(1,3*k):1;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();
   if(gate){const half=W*.62*k+20,top=y-H*.55*k;c.strokeStyle=col;c.beginPath();c.moveTo(vx-half,y);c.lineTo(vx-half,top);c.lineTo(vx+half,top);c.lineTo(vx+half,y);c.globalAlpha=a*fade*.22;c.lineWidth=Math.max(4,22*k);c.stroke();c.globalAlpha=a*fade*.9;c.lineWidth=Math.max(1.2,6*k);c.stroke();
    c.globalAlpha=a*fade*.9;c.fillStyle='#ffffff';for(const side of [-1,1])for(let n=0;n<4;n++)c.fillRect(vx+side*half-2*k,y-(n+.5)*(y-top)/4,4*k+1,4*k+1);}}
  const R=Math.hypot(W,H);for(const st of streaks){const u=wrap(st.u+s.scroll*.0012*st.w,1),r=u*u*R,x=vx+Math.cos(st.a)*r,y=hy+Math.abs(Math.sin(st.a))*r;c.globalAlpha=a*u*.5;c.strokeStyle='#eafff6';c.lineWidth=u*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(st.a)*r*.18,y+Math.abs(Math.sin(st.a))*r*.18);c.stroke();}
  const hg=c.createRadialGradient(vx,hy,0,vx,hy,W*.5);hg.addColorStop(0,alpha('#ffffff',.3));hg.addColorStop(.2,alpha(col,.16));hg.addColorStop(1,alpha(col,0));c.globalAlpha=a*(.8+Math.sin(t*2)*.2);c.fillStyle=hg;c.fillRect(0,0,W,H*.5);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
 }
 // 05 · Event horizon: a black hole with a lensed accretion disk swallowing starlight.
 function horizon(c,s,a){
  const {W,H,t}=s,cx=W*.5,cy=H*.24,R=Math.min(W,H)*.085+20;
  c.globalAlpha=a;const wash=c.createRadialGradient(cx,cy,R,cx,cy,Math.max(W,H)*.9);wash.addColorStop(0,'#3a160c99');wash.addColorStop(.4,'#16060a55');wash.addColorStop(1,'#05020400');c.fillStyle=wash;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='lighter';
  const far=Math.max(W,H)*.85;for(const p of infall){const u=wrap(p.r-t*.045*p.sp,1),r=R*1.3+u*far,ang=p.a+t*.25*p.sp/(u+.15);c.globalAlpha=a*clamp(u*3,0,1)*clamp((1-u)*4,0,1)*.6;c.strokeStyle=u<.2?'#ffd29a':'#ffe9d0';c.lineWidth=1.2;c.beginPath();c.arc(cx,cy,r,ang,ang+.05+(1-u)*.12);c.stroke();}
  const glow=c.createRadialGradient(cx,cy,R*.9,cx,cy,R*5);glow.addColorStop(0,'#ffb07055');glow.addColorStop(.3,'#ff6a8a22');glow.addColorStop(1,'#ff6a8a00');c.globalAlpha=a;c.fillStyle=glow;c.fillRect(cx-R*5,cy-R*5,R*10,R*10);
  const diskPass=front=>{for(const d of disk){const rad=R*(1.35+d.ring*.2),ang=d.a+t*(1.3/(rad/R)),sn=Math.sin(ang);if(front?sn<0:sn>=0)continue;const x=cx+Math.cos(ang)*rad,y=cy+sn*rad*.24;c.globalAlpha=a*(front?.9:.45)*d.w;c.strokeStyle=d.ring<2?'#fff3d8':d.ring<5?'#ffbf72':'#ff6f9c';c.lineWidth=d.ring<3?2.2:1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x-sn*rad*.16,y+Math.cos(ang)*rad*.24*.16);c.stroke();}};
  // Continuous glowing band under the streaks: far half behind the hole, near half in front.
  const band=front=>{const a0=front?0:Math.PI,a1=front?Math.PI:TAU;c.globalAlpha=a*(front?.5:.3);c.strokeStyle='#ff9a5a';c.lineWidth=R*.55;c.beginPath();c.ellipse(cx,cy,R*2,R*.48,0,a0,a1);c.stroke();c.globalAlpha=a*(front?.75:.45);c.strokeStyle='#ffe2b4';c.lineWidth=R*.14;c.beginPath();c.ellipse(cx,cy,R*1.75,R*.42,0,a0,a1);c.stroke();};
  band(false);diskPass(false);
  c.globalAlpha=a*.4;c.strokeStyle='#ffc98a';c.lineWidth=3;c.beginPath();c.ellipse(cx,cy,R*1.55,R*1.22,0,Math.PI,TAU);c.stroke();
  c.globalCompositeOperation='source-over';c.globalAlpha=a;c.fillStyle='#000000';c.beginPath();c.arc(cx,cy,R,0,TAU);c.fill();
  c.globalCompositeOperation='lighter';c.strokeStyle='#ffe6b8';c.lineWidth=2;c.globalAlpha=a*(.8+Math.sin(t*3)*.2);c.beginPath();c.arc(cx,cy,R*1.06,0,TAU);c.stroke();c.lineWidth=9;c.globalAlpha=a*.18;c.stroke();
  band(true);diskPass(true);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
 }
 const painters=[nebula,rift,aurora,corridor,horizon];
 // s: {W,H,t,scroll,mission,accent,rage}
 function draw(c,s){
  if(!(s.W>0&&s.H>0))return;
  const z=zoneAt(s.mission),w=z?clamp((s.mission-ZONES[z].start)/FADE,0,1):1;
  c.save();if(z&&w<1)painters[z-1](c,s,1-w);painters[z](c,s,w);
  if(s.rage>0){const g=c.createRadialGradient(s.W/2,s.H*.3,0,s.W/2,s.H*.3,Math.max(s.W,s.H)*.8);g.addColorStop(0,`rgba(255,40,70,${s.rage*(.1+.05*Math.sin(s.t*6))})`);g.addColorStop(1,`rgba(120,0,30,${s.rage*.28})`);c.fillStyle=g;c.fillRect(0,0,s.W,s.H);}
  c.restore();
 }
 root.RinkouStage={ZONES,zoneAt,draw};
})(typeof window!=='undefined'?window:globalThis);
