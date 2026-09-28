(() => {
 'use strict';
 const $=id=>document.getElementById(id),canvas=$('game'),mainCtx=canvas.getContext('2d',{alpha:true}),audio=window.PulseAudio;
 // During the Lumen Corridor the play layer is drawn off-screen and re-projected so it recedes toward the horizon.
 const layer=document.createElement('canvas'),layerCtx=layer.getContext('2d');let ctx=mainCtx;
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const palette={spread:'#a0ff83',laser:'#69b7ff',enemy:'#91bbbd',bullet:'#ffad78',power:'#c0ffa0',bomb:'#ffd59b'};
 const POWER_INTERVAL=30,BOSS_START=330,MIDBOSS_AT=150,MAX_POWER=8,MAX_ENEMY_BULLETS=600;
 // Bosses soak spread volleys and take more from focused lasers, so both routes fight for similar lengths.
 const BOSS_DAMAGE={spread:.6,laser:1.25};
 const MUSIC_NOTE='ヘッドホン推奨 · SPREAD / LASER オリジナル６曲を収録';let launchRequest=0;
 audio.onMusicError=()=>toast('音源を読み込めなかったため、仮サウンドで再生しています。');
 const forms=window.RinkouForms,stage=window.RinkouStage,foes=window.RinkouEnemies,WEAPON_STEPS=forms.STEPS;
 let W=innerWidth,H=innerHeight,dpr=1,last=0,visualTime=0,mode='menu',route='spread',level=0,power=0,time=0,score=0,kills=0,combo=0,maxCombo=0,comboTime=0;
 let enemies=[],bullets=[],shots=[],pickups=[],particles=[],rings=[],floats=[],flashes=[],gems=[],hazards=[],ghosts=[],boss=null,midboss=null,player={x:0,y:0,tx:0,ty:0,lives:3,bombs:3,inv:0},keys=new Set();
 let shake=0,flash=0,bombLight=0,shootTimer=0,spawnTimer=0,nextPowerAt=POWER_INTERVAL,bombTimer=0,healTimer=0,announcementTime=0,bossWarning=false,midWarning=false,midDone=false,warnBand=0,waveIndex=0,zone=0,beamTargets=[],starOffset=0,backgroundSpeed=9,acceleration=0;
 let stats={shots:0,bombs:0,powerups:0},touches=new Map(),activeTouch=null,startedAt=0,tipTrail=[[],[]],lastHud=0,endingTimer=0,seen=new Set(),introTimer=0,gemSfx=0,clinkSfx=0,ghostTimer=0;
 let burst=0,slowmo=0,bigText=null,motion={vx:0,vy:0,bank:0,thrust:0},roll=0,env=null,depthTilt=0,tiltMoving=false,mouseAt=null;
 const DEPTH=.45; // medium tilt: the far edge of the field shrinks to 55% width
 // Visual-only projection; collisions and movement stay in flat play coordinates.
 const depthC=()=>DEPTH*depthTilt,invDepth=(c,dp)=>c<1e-4?dp:(1-Math.sqrt(Math.max(0,1-2*c*dp)))/c;
 function project(x,y){const c=depthC(),d=(H-y)/H,s=1-c*d;return {x:W/2+(x-W/2)*s,y:H-(d-c*d*d/2)*H,s};}
 function unproject(x,y){const c=depthC(),d=invDepth(c,(H-y)/H),s=1-c*d;return {x:W/2+(x-W/2)/s,y:H-d*H};}
 function blitDepth(){const c=depthC(),Wd=canvas.width,Hd=canvas.height,step=Math.max(2,Math.round(2*dpr)),fade=60*dpr;mainCtx.save();mainCtx.setTransform(1,0,0,1,0,0);
  for(let Y=0;Y<Hd;Y+=step){const h=Math.min(step,Hd-Y),d0=invDepth(c,(Hd-Y)/Hd),d1=invDepth(c,(Hd-Y-h)/Hd),sy1=Hd*(1-d1);let sy0=Hd*(1-d0);if(sy1<=0)continue;sy0=Math.max(0,sy0);if(sy1-sy0<=0)continue;const k=1-c*(d0+d1)/2;mainCtx.globalAlpha=Math.min(1,sy0/fade+.05);mainCtx.drawImage(layer,0,sy0,Wd,sy1-sy0,Wd/2*(1-k),Y,Wd*k,h);}
  mainCtx.restore();}
 const spectrumBars=Array.from(document.querySelectorAll('.equalizer i'));
 const stars=Array.from({length:190},()=>({x:Math.random(),y:Math.random(),z:rand(.25,1.6),p:rand(0,TAU)}));

 // Pre-rendered glow sprites: hundreds of bullets without per-bullet shadow blur.
 const SS=2,sprites=new Map();
 function bulletSprite(color,r,shape){const key=color+r+shape;let s=sprites.get(key);if(s)return s;const len=shape==='needle'?r*2.3:r,pad=r*1.9,w=Math.ceil((len+pad)*2),h=Math.ceil((r+pad)*2),cv=document.createElement('canvas');cv.width=w*SS;cv.height=h*SS;const c=cv.getContext('2d');c.scale(SS,SS);c.translate(w/2,h/2);c.shadowColor=color;c.shadowBlur=pad*1.1;c.fillStyle=color;c.beginPath();c.ellipse(0,0,len,r,0,0,TAU);c.fill();c.fill();c.shadowBlur=0;c.fillStyle='#fff8e6';c.beginPath();c.ellipse(0,0,len*.55,r*.45,0,0,TAU);c.fill();if(shape==='big'){c.strokeStyle='#ffffffb0';c.lineWidth=1;c.beginPath();c.arc(0,0,r*1.35,0,TAU);c.stroke();}s={cv,w,h};sprites.set(key,s);return s;}
 function glowSprite(color){const key='g'+color;let s=sprites.get(key);if(s)return s;s=document.createElement('canvas');s.width=s.height=128;const c=s.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.16,color);g.addColorStop(.5,color+'55');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,128,128);sprites.set(key,s);return s;}
 function drawGlow(x,y,r,color,a=1){if(r<=0||a<=0)return;ctx.globalAlpha=Math.min(1,a);ctx.drawImage(glowSprite(color),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}
 function drawSprite(s,x,y,angle){if(angle===undefined){ctx.drawImage(s.cv,x-s.w/2,y-s.h/2,s.w,s.h);return;}ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(s.cv,-s.w/2,-s.h/2,s.w,s.h);ctx.rotate(-angle);ctx.translate(-x,-y);}

 function resize(){const oldW=W,oldH=H;W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';layer.width=canvas.width;layer.height=canvas.height;ctx.setTransform(dpr,0,0,dpr,0,0);if(mode==='playing'||mode==='paused'){player.x*=W/oldW;player.tx*=W/oldW;player.y*=H/oldH;player.ty*=H/oldH;}player.x=clamp(player.x,24,W-24);player.y=clamp(player.y,150,H-105);}
 resize();addEventListener('resize',resize);document.querySelector('.space-art').classList.add('loaded');
 const field=()=>({left:W<800?26:W*.17,right:W<800?W-26:W*.83});
 function setRoute(value){if(mode!=='menu')return;route=value;const c=palette[route];document.documentElement.style.setProperty('--accent',c);document.body.dataset.route=route;document.querySelectorAll('.route').forEach(el=>el.classList.toggle('selected',el.querySelector('input').value===route));$('shipName').textContent=route==='spread'?'HOTARU':'KAGERO';$('shipLabel').querySelector('small').textContent=route==='spread'?'PHOSPHOR / SPREAD TYPE':'PHOSPHOR / LASER TYPE';updateTrack(false);}
 function updateTrack(play=true){$('musicCaption').textContent=mode==='menu'?'SOUND VISUALIZER / READY':`${route.toUpperCase()} ${WEAPON_STEPS[power].version} / TRACK ${level+1}`;document.querySelectorAll('.level-bars i').forEach((e,i)=>e.classList.toggle('active',i<=power));document.querySelector('.level-bars').setAttribute('aria-label',`${route.toUpperCase()} ${WEAPON_STEPS[power].version}、9段階中${power+1}`);updatePowerStatus();$('formName').textContent=route.toUpperCase()+' '+WEAPON_STEPS[power].version+' / '+forms.describe(route,power).name;if(play)audio.setTrack(route,level);}
 function updatePowerStatus(){const remain=Math.max(0,Math.ceil(nextPowerAt-time));$('powerStatus').textContent=mode==='menu'?'9段階の強化 / Pは30秒ごと':`${power===MAX_POWER?'MAX POWER':level===2?'最大強化まで P×'+(MAX_POWER-power):'次の曲まで P×'+(3-power%3)} · 次のP ${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;}
 function setVisible(id,yes){$(id).classList.toggle('hidden',!yes);}
 function announce(small,big,duration=2.5){if(bigText&&bigText.life>.3)return;$('announcement').querySelector('small').textContent=small;$('announcement').querySelector('strong').textContent=big;announcementTime=duration;$('announcement').classList.add('show');}
 function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2400);}
 // First sighting of each species gets a short dossier card.
 function introduce(type){const s=foes.species(type);if(!s||s.hidden||seen.has(type))return;seen.add(type);const el=$('enemyIntro');el.querySelector('b').textContent=s.name;el.querySelector('span').textContent=s.jp;el.querySelector('p').textContent=s.info;el.style.setProperty('--foe',s.color);el.classList.add('show');introTimer=3.4;}
 function setBossHud(def){$('bossHud').querySelector('span').textContent=`WARNING / ${def.name} · ${def.jp}`;$('bossHealth').style.width='100%';setVisible('bossHud',true);}
 function reset(){starOffset=0;backgroundSpeed=WEAPON_STEPS[0].travelSpeed;acceleration=0;time=0;lastHud=0;score=0;kills=0;combo=0;maxCombo=0;comboTime=0;level=0;power=0;waveIndex=0;zone=0;boss=null;midboss=null;bossWarning=false;midWarning=false;midDone=false;warnBand=0;enemies=[];bullets=[];shots=[];pickups=[];particles=[];rings=[];floats=[];flashes=[];gems=[];hazards=[];ghosts=[];tipTrail=[[],[]];beamTargets=[];seen.clear();introTimer=0;$('enemyIntro').classList.remove('show');touches.clear();activeTouch=null;keys.clear();shake=0;flash=0;bombLight=0;shootTimer=0;spawnTimer=1;nextPowerAt=POWER_INTERVAL;bombTimer=19;healTimer=43;endingTimer=0;stats={shots:0,bombs:0,powerups:0};player={x:W*.5,y:H*.76,tx:W*.5,ty:H*.76,lives:3,bombs:3,inv:2};motion={vx:0,vy:0,bank:0,thrust:0};roll=0;depthTilt=0;beamTips=[];burst=0;slowmo=0;bigText=null;mouseAt=null;env=makeEnv();$('bossHud').classList.add('hidden');}
 async function start(){
  if(mode==='playing'||mode==='starting')return;
  const request=++launchRequest,previousMode=mode;mode='starting';
  $('startButton').disabled=true;$('retryButton').disabled=true;$('soundNote').textContent='音源を読み込み中…';
  try{await audio.init();await audio.prepare(route,0);}
  catch{if(request===launchRequest){mode=previousMode;toast('音源を読み込めませんでした。通信を確認して、もう一度出撃してください。');}return;}
  finally{if(request===launchRequest){$('startButton').disabled=false;$('retryButton').disabled=false;$('soundNote').textContent=MUSIC_NOTE;}}
  if(request!==launchRequest)return;
  reset();mode='playing';startedAt=performance.now();$('startButton').disabled=false;document.body.classList.add('playing');['menu','shipLabel'].forEach(id=>setVisible(id,false));['hud','bombButton','pickupHint','pauseButton'].forEach(id=>setVisible(id,true));for(let id of ['pauseDialog','resultDialog'])if($(id).open)$(id).close();updateTrack();updateHud();announce('SECTOR 01 / '+stage.ZONES[0].jp,'FIRST LIGHT',2.4);audio.voice('start',{delay:.35,priority:2});}
 function home(){launchRequest++;window.RinkouEnding.stop();document.body.classList.remove('ending');$('endingSkip').classList.add('hidden');$('startButton').disabled=false;$('retryButton').disabled=false;$('soundNote').textContent=MUSIC_NOTE;audio.stop();audio.resume();mode='menu';level=0;power=0;acceleration=0;depthTilt=0;$('home').querySelector('small').textContent='01 / NEBULA SECTOR';document.body.classList.remove('playing');['menu','shipLabel'].forEach(id=>setVisible(id,true));['hud','bossHud','bombButton','pickupHint','pauseButton'].forEach(id=>setVisible(id,false));$('announcement').classList.remove('show');$('enemyIntro').classList.remove('show');for(let id of ['pauseDialog','resultDialog'])if($(id).open)$(id).close();enemies=[];bullets=[];shots=[];particles=[];pickups=[];rings=[];flashes=[];gems=[];hazards=[];ghosts=[];tipTrail=[[],[]];boss=null;midboss=null;keys.clear();updateTrack(false);}
 function pause(){if(mode!=='playing')return;mode='paused';audio.pause();keys.clear();touches.clear();activeTouch=null;$('pauseDialog').showModal();}
 function resume(){if(mode!=='paused')return;mode='playing';audio.resume();$('pauseDialog').close();last=performance.now();}
 // After the core falls, the ending cinematic plays to ending.mp3, then the result screen.
 async function startEnding(){if(mode!=='playing')return;mode='ending';document.body.classList.add('ending');['hud','bossHud','bombButton','pickupHint','pauseButton'].forEach(id=>setVisible(id,false));$('announcement').classList.remove('show');$('enemyIntro').classList.remove('show');$('endingSkip').classList.remove('hidden');
  await audio.prepareEnding();if(mode!=='ending')return;const played=audio.playEnding();
  window.RinkouEnding.start({route,power,forms,accent:palette[route],clock:played?()=>audio.ctx.currentTime-played.start:null});}
 function endEnding(){if(mode!=='ending')return;window.RinkouEnding.stop();document.body.classList.remove('ending');$('endingSkip').classList.add('hidden');mode='playing';finish(true,true);}
 function finish(win,afterEnding=false){if(mode!=='playing')return;mode='result';audio.stop();if(win&&!afterEnding)audio.sfx('clear');audio.voice(win?'clear':'gameover',{delay:win?.5:.2,priority:5});$('resultEyebrow').textContent=win?'MISSION COMPLETE':'SIGNAL LOST';$('resultTitle').textContent=win?'光は、消えない。':'もう一度、輝こう。';$('resultText').textContent=win?'黒曜星核を撃破。あなたの燐光が、闇を切り拓きました。':'Pアイテムで武器と音楽が進化。敵弾が迫ったら、ボムで道を拓こう。';$('finalScore').textContent=String(score).padStart(6,'0');$('killsResult').textContent=String(kills);$('comboResult').textContent=maxCombo+' ×';$('levelResult').textContent=WEAPON_STEPS[power].version;$('resultDialog').showModal();}
 function activeBoss(){return boss&&!boss.dead?boss:midboss&&!midboss.dead?midboss:null;}
 function updateHud(){$('score').textContent=String(score).padStart(6,'0');$('combo').textContent=combo>1?combo+' CHAIN':'';$('lives').textContent=Array.from({length:3},(_,i)=>i<player.lives?'◆':'◇').join(' ');$('bombCount').textContent=String(player.bombs).padStart(2,'0');$('bombButton').disabled=player.bombs===0;$('progress').style.width=Math.min(time/BOSS_START*100,100)+'%';const Z=stage.ZONES[zone];$('home').querySelector('small').textContent=Z.code+' / '+Z.name;$('sectorLabel').textContent=boss?'SECTOR 05 / CORE ENGAGEMENT':midboss?'SECTOR 03 / SENTINEL ENGAGEMENT':`SECTOR ${Z.code} / ${Z.name}`;const b=activeBoss();if(b)$('bossHealth').style.width=Math.max(0,b.hp/b.maxHp*100)+'%';updatePowerStatus();}

 function addParticles(x,y,color,n=22,power=1){n=reduced?Math.ceil(n*.4):n;for(let i=0;i<n&&particles.length<1100;i++){let angle=rand(0,TAU),speed=rand(30,270)*power;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.2,.9),max:.9,color,size:rand(1.1,3.5)*power});}}
 function ring(x,y,color,r=100,life=.6){rings.push({x,y,color,max:r,life,total:life});}
 function float(x,y,text,color=palette[route]){floats.push({x,y,text,color,life:1.3});}
 function explode(x,y,color,size=1){addParticles(x,y,color,Math.round(20*size),Math.min(size,2.6));addParticles(x,y,'#fff4e0',Math.round(7*size),Math.min(size,2.6)*.7);flashes.push({x,y,r:24*size+10,life:.32,max:.32,color});ring(x,y,color,36*size+18,.32+size*.08);}
 function spawnPickup(type,x,y){pickups.push({type,x,y,vy:68,r:17,life:18,p:rand(0,TAU)});}
 function collect(p){if(p.dead)return;p.dead=true;if(p.type==='bomb')audio.voice('bombget',{priority:2});else if(p.type==='heal')audio.voice('shieldget',{priority:2});addParticles(p.x,p.y,p.type==='bomb'?palette.bomb:palette[route],40,1.1);ring(player.x,player.y,palette[route],160,.7);
  if(p.type==='power'){if(power<MAX_POWER){const previousLevel=level;power++;acceleration=reduced?0:1;roll=reduced?0:1;stats.powerups++;level=Math.floor(power/3);const changed=level!==previousLevel;updateTrack(changed);audio.sfx(changed?'power':'upgrade');if(changed){audio.voice('evolution',{priority:3});if(level===2)audio.voice(route==='spread'?'phoenix':'goddess',{delay:1.05,priority:4});}else audio.voice(power===MAX_POWER?'maxpower':power%3===1?'speedup':'powerup',{priority:3});flash=changed?.12:.05;shake=changed?4:2;player.inv=Math.max(player.inv,1.3);if(changed)evolutionBurst();else announce(changed?`MUSIC CHANGE / TRACK ${level+1}`:'WEAPON UPGRADE / 曲はそのまま続く',`${route.toUpperCase()} ${WEAPON_STEPS[power].version} / ${forms.describe(route,power).name}`,changed?2.4:1.4);float(p.x,p.y,changed?'MUSIC + POWER UP':'POWER UP');}else{score+=2000;audio.sfx('pickup');float(p.x,p.y,'MAX POWER +2000');}}
  if(p.type==='bomb'){if(player.bombs<5){player.bombs++;float(p.x,p.y,'BOMB +1',palette.bomb);}else{score+=1000;float(p.x,p.y,'BOMB MAX +1000',palette.bomb);}}
  if(p.type==='heal'){if(player.lives<3){player.lives++;float(p.x,p.y,'SHIELD +1');}else{score+=1000;float(p.x,p.y,'SHIELD MAX +1000');}}updateHud();
 }
 // Cancelled bullets turn into score sparks that stream into the ship.
 function cancelBullets(){for(const b of bullets)if(gems.length<500)gems.push({x:b.x,y:b.y,vx:b.vx*.25+rand(-50,50),vy:b.vy*.25-rand(30,90),t:0});bullets=[];hazards=[];}
 function bomb(){if(mode!=='playing'||player.bombs<=0||endingTimer>0)return;player.bombs--;stats.bombs++;audio.voice('bomb',{priority:2});cancelBullets();shake=17;bombLight=1.15;flash=.48;player.inv=Math.max(player.inv,2.3);audio.sfx('bomb');ring(player.x,player.y,'#d4ffb8',Math.max(W,H)*1.25,1.2);ring(player.x,player.y,'#c4ffe2',Math.max(W,H)*.9,.95);addParticles(player.x,player.y,palette[route],160,2.4);
  for(const e of enemies)hurt(e,450);blastBosses();
  for(const p of pickups){p.x=player.x+rand(-25,25);p.y=player.y-45;}announce('PHOSPHOR BURST','光を、解き放て。',1.1);updateHud();}
 function blastBosses(){if(midboss&&!midboss.dead&&!midboss.leaving){midboss.hp-=520;midboss.hit=.2;if(midboss.hp<=0)killMid();}if(boss&&!boss.dead&&!boss.dying){for(const p of boss.pods)if(!p.dead){p.hp-=300;p.hit=.2;if(p.hp<=0)killPod(p);}boss.hp-=520;boss.hit=.2;if(boss.hp<=0)killBoss();}}
 // 2.0 / 3.0: a brief slow-motion flash, light rays and a shockwave that sweeps every on-screen enemy away.
 function evolutionBurst(){const Z=forms.describe(route,power);burst=1;slowmo=reduced?0:.4;bigText={top:`MUSIC CHANGE · TRACK ${level+1}`,text:route.toUpperCase()+' '+WEAPON_STEPS[power].version,sub:Z.name,life:1.6,max:1.6};
  cancelBullets();announcementTime=0;$('announcement').classList.remove('show');flash=.5;shake=18;bombLight=1.2;player.inv=Math.max(player.inv,2.2);
  ring(player.x,player.y,'#ffffff',Math.max(W,H)*1.3,1.1);ring(player.x,player.y,palette[route],Math.max(W,H)*1.05,.9);ring(player.x,player.y,palette[route],260,.5);addParticles(player.x,player.y,palette[route],150,2.6);addParticles(player.x,player.y,'#ffffff',60,2);
  for(const e of enemies)if(!e.dead&&e.y>-20&&e.y<H+40&&e.x>-40&&e.x<W+40)e.doomAt=time+dist(e,player)/1500;
  blastBosses();}
 function damage(){if(player.inv>0||mode!=='playing'||endingTimer>0)return;player.lives--;player.inv=2.8;combo=0;comboTime=0;shake=12;flash=.3;audio.sfx('damage');if(player.lives>0)audio.voice(player.lives===1?'lastshield':'shield',{priority:player.lives===1?3:2});addParticles(player.x,player.y,'#ffcc9c',48);ring(player.x,player.y,'#ffd49f',95,.5);bullets=bullets.filter(b=>dist(b,player)>140);updateHud();if(player.lives<=0)finish(false);}
 function hurt(e,d){if(e.dead)return;e.hp-=d;e.hit=.07;if(e.hp<=0)kill(e);}
 function kill(e){if(e.dead)return;e.dead=true;const sp=foes.species(e.type);kills++;combo++;comboTime=3;maxCombo=Math.max(maxCombo,combo);score+=sp.score*Math.min(5,1+Math.floor(combo/12));explode(e.x,e.y,sp.color,sp.big?1.7:e.type==='shard'?.6:1);audio.sfx(sp.big?'boom':'explosion');if(e.type==='serpent')float(e.x,e.y,'DRAGON SLAIN +'+sp.score,sp.color);else if(combo%10===0)float(e.x,e.y,combo+' CHAIN');if(sp.death)sp.death(e,env);if(e.drop)spawnPickup(e.drop,e.x,e.y);shake=Math.max(shake,sp.big?5:1.7);}
 function clink(x,y){addParticles(x,y,'#ffffff',2,.3);if(clinkSfx<=0){audio.sfx('clink');clinkSfx=.08;}}
 function hurtMid(d){const m=midboss;m.hp-=d*BOSS_DAMAGE[route];m.hit=.07;if(m.hp<=0)killMid();}
 function hurtCore(d){const a=foes.Core.armor(boss);boss.hp-=d*BOSS_DAMAGE[route]*a;boss.hit=.07;if(a<1&&Math.random()<.25)clink(boss.core.x+rand(-24,24),boss.core.y+rand(-24,24));if(boss.hp<=0)killBoss();}
 function hurtPod(p,d){p.hp-=d*BOSS_DAMAGE[route];p.hit=.07;if(p.hp<=0)killPod(p);}
 function spawnEnemy(type,x,y=-40,extra={}){const e=foes.create(type,x,y,extra,env);enemies.push(e);introduce(type);return e;}
 function difficulty(){return clamp(time/BOSS_START,0,1);}
 function addEnemyBullet(x,y,angle,speed,o={}){if(bullets.length>=MAX_ENEMY_BULLETS)return;bullets.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:o.r||5,color:o.color||palette.bullet,shape:o.shape||'orb',acc:o.acc||0,max:o.max||0});}
 function addHazard(o){const h={t:0,a0:o.angle,...o,x:0,y:0};const src=h.owner||(h.follow&&h.follow());if(src){h.x=src.x;h.y=src.y;}hazards.push(h);audio.sfx('charge');}
 function phaseShift(b,phase){cancelBullets();flash=.35;shake=14;bombLight=.6;audio.sfx('phase');ring(b.x,b.y,'#ff86bd',Math.max(W,H),1.2);addParticles(b.x,b.y,'#ffb3d6',90,2);announce(phase===2?'ARMOR PURGE / 装甲解放':'OVERDRIVE / 星核暴走',phase===2?'THE CORE AWAKENS':'FINAL RADIANCE',2.4);}
 function makeEnv(){return {W,H,player,diff:difficulty(),time,field:field(),aim:o=>Math.atan2(player.y-o.y,player.x-o.x),shoot:addEnemyBullet,hazard:addHazard,spawn:spawnEnemy,kill,burst:e=>{explode(e.x,e.y,foes.species(e.type).color,1.3);audio.sfx('explosion');},phaseShift};}

 function spawnMid(){midboss=foes.Sentinel.create(env);setBossHud(foes.Sentinel);announce('WARNING / 月影の番人','TSUKUYOMI',2.6);}
 function killMid(){const m=midboss;if(!m||m.dead)return;m.dead=true;midDone=true;score+=12000;kills++;cancelBullets();explode(m.x,m.y,'#dcc8ff',3.4);for(let i=0;i<6;i++)explode(m.x+rand(-100,100)*m.s,m.y+rand(-50,50)*m.s,'#ffd6f0',1.4);flash=.5;shake=16;bombLight=.8;audio.sfx('bomb');spawnPickup('bomb',m.x-34,m.y);spawnPickup('heal',m.x+34,m.y);announce('SENTINEL DOWN / +12000','月は、沈んだ。',2.2);setVisible('bossHud',false);midboss=null;}
 function spawnBoss(){audio.prepareEnding();enemies.forEach(e=>{if(e.y<0){e.dead=true;e.gone=true;}});boss=foes.Core.create(env);foes.Core.place(boss);setBossHud(foes.Core);announce('WARNING / 宙域の守護者','OBSIDIAN CORE',2.8);}
 function killPod(p){if(p.dead)return;p.dead=true;score+=3000;explode(p.x,p.y,'#ff86bd',2.2);audio.sfx('boom');shake=Math.max(shake,8);float(p.x,p.y,'PART DESTROYED +3000','#ffb3d6');}
 function killBoss(){if(!boss||boss.dead||boss.dying)return;boss.dying=true;score+=30000;kills++;cancelBullets();enemies.forEach(e=>kill(e));endingTimer=3.6;player.inv=10;shake=14;flash=.4;audio.sfx('boom');announce('CORE DESTROYED','RADIANCE REMAINS',3);}

 function formTime(){return reduced?0:visualTime;}
 function shipScale(){return Math.min(1,W/480)*(power===MAX_POWER?1.2:1);} // the final form flies 20% larger
 function shipTilt(){return (player.tx-player.x)*.003;}
 // Same transform as forms.draw: rotate by tilt, squash horizontally for bank / roll.
 function worldPort(p){const a=shipTilt(),k=shipScale(),lx=p.x*k*forms.squash(motion.bank,roll),ly=p.y*k;return {...p,x:player.x+lx*Math.cos(a)-ly*Math.sin(a),y:player.y+lx*Math.sin(a)+ly*Math.cos(a)};}
 // tx: where each beam meets the top of the screen. In goddess form the tips trail behind the ship, so the beams sweep like whips.
 let beamTips=[];
 function currentLasers(){return forms.laserBeams(power,formTime(),motion).map((p,i)=>{const w=worldPort(p);return {...w,width:p.width*shipScale(),tx:beamTips[i]??w.x};});}
 function updateBeamTips(dt){const beams=forms.laserBeams(power,formTime(),motion).map(worldPort),lag=route==='laser'&&power>=6&&!reduced;if(beamTips.length!==beams.length)beamTips=beams.map(b=>b.x);beams.forEach((b,i)=>{beamTips[i]=lag?beamTips[i]+(b.x-beamTips[i])*Math.min(1,dt*3):b.x;});}
 const BEAM_TOP=48,beamX=(b,y)=>b.x+(b.tx-b.x)*(b.y-y)/(b.y-BEAM_TOP);
 function fire(){const w=WEAPON_STEPS[power];stats.shots++;if(route==='spread'){for(const port of forms.spreadMuzzles(power,formTime(),motion)){const p=worldPort(port);shots.push({x:p.x,y:p.y,vx:Math.cos(p.angle)*800,vy:Math.sin(p.angle)*800,damage:w.damage,life:1.6,r:4+power*.18,origin:port.kind});if(port.kind!=='wing'||Math.random()<.3)flashes.push({x:p.x,y:p.y,r:9,life:.06,max:.06,color:palette.spread});}audio.sfx('shot',level);}}

 function movePlayer(dt){
  if(mouseAt&&tiltMoving){const u=unproject(mouseAt.x,mouseAt.y);player.tx=u.x;player.ty=u.y;}
  let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);if(dx||dy){let norm=Math.hypot(dx,dy);player.tx+=dx/norm*520*dt;player.ty+=dy/norm*520*dt;}player.tx=clamp(player.tx,22,W-22);player.ty=clamp(player.ty,160,H-105);
  const px=player.x,py=player.y;player.x+=(player.tx-player.x)*Math.min(1,dt*16);player.y+=(player.ty-player.y)*Math.min(1,dt*16);
  // Smoothed velocity drives banking, exhaust length and the escorts' lag.
  const k=Math.min(1,dt*10),kb=Math.min(1,dt*7),step=Math.max(dt,1e-4);motion.vx+=((player.x-px)/step-motion.vx)*k;motion.vy+=((player.y-py)/step-motion.vy)*k;
  if(reduced){motion.bank=0;motion.thrust=0;}else{motion.bank+=(clamp(motion.vx/650,-1,1)-motion.bank)*kb;motion.thrust+=(clamp(-motion.vy/550,-1,1)-motion.thrust)*kb;}
  roll=Math.max(0,roll-dt/.6);
  ghostTimer-=dt;if(!reduced&&Math.hypot(motion.vx,motion.vy)>520&&ghostTimer<=0){ghosts.push({x:player.x,y:player.y,bank:motion.bank,tilt:shipTilt(),life:.22});ghostTimer=.035;}
  // Wing-tip contrails drift back with the scrolling world, so the ship always reads as flying.
  const drift=dt*(150+backgroundSpeed*.6);for(const tr of tipTrail)for(const p of tr)p.y+=drift;
  forms.tips(route,power,formTime(),motion).forEach((p,i)=>{if(!tipTrail[i])tipTrail[i]=[];const w=worldPort(p);tipTrail[i].unshift({x:w.x,y:w.y});if(tipTrail[i].length>18)tipTrail[i].pop();});
  for(const e of forms.engines(route,power,formTime(),motion)){if(particles.length>=1100||Math.random()>(e.small?.35:.75+motion.thrust*.4))continue;const w=worldPort(e);particles.push({x:w.x+rand(-2,2),y:w.y,vx:rand(-20,20)-motion.vx*.1,vy:rand(160,280)*(1+Math.max(0,motion.thrust)*.6),life:rand(.12,.26),max:.26,color:palette[route],size:e.small?1:rand(1.2,2.2)});}
 }
 function updateGems(dt){gemSfx-=dt;for(const g of gems){g.t+=dt;if(g.t<.3){g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=1-dt*3;g.vy*=1-dt*3;continue;}const dx=player.x-g.x,dy=player.y-g.y,d=Math.hypot(dx,dy)||1,m=Math.min((350+g.t*1300)*dt,d);g.x+=dx/d*m;g.y+=dy/d*m;if(d<18){g.dead=true;score+=10;if(gemSfx<=0){audio.sfx('gem');gemSfx=.045;}}}gems=gems.filter(g=>!g.dead);}
 function ending(dt){endingTimer-=dt;if(boss&&boss.dying){boss.t+=dt;if(Math.random()<dt*14){const s=boss.s;explode(boss.x+rand(-240,240)*s,boss.y+rand(-100,110)*s,Math.random()<.5?'#ff86bd':'#ffd36e',rand(1,2.2));audio.sfx('explosion');shake=Math.max(shake,6);}
   if(endingTimer<.9&&!boss.dead){boss.dead=true;explode(boss.x,boss.y,'#fff0d0',6);ring(boss.x,boss.y,'#deffc4',W,1.8);ring(boss.x,boss.y,'#ffb3d6',W*.7,1.3);flash=.8;bombLight=1.5;shake=24;audio.sfx('bossdown');setVisible('bossHud',false);}}
  if(endingTimer<=0)startEnding();}

 function update(dt){time+=dt;player.inv=Math.max(0,player.inv-dt);if(comboTime>0){comboTime-=dt;if(comboTime<=0)combo=0;}
  movePlayer(dt);updateGems(dt);
  if(endingTimer>0){ending(dt);return;}
  env=makeEnv();
  shootTimer-=dt;if(shootTimer<=0){fire();shootTimer=route==='spread'?WEAPON_STEPS[power].interval:.12;}
  // Absolute mission-time schedule: collection, misses and boss phase never reset it.
  while(time+1e-7>=nextPowerAt){const x=clamp(player.x+rand(-70,70),40,W-40);spawnPickup('power',x,Math.max(155,H*.23));pickups[pickups.length-1].vy=Math.max(68,H*.12);nextPowerAt+=POWER_INTERVAL;}
  const z=stage.zoneAt(time);if(z!==zone){zone=z;waveIndex=0;const Z=stage.ZONES[z];announce(`SECTOR ${Z.code} / ${Z.jp}`,Z.name,2.6);audio.voice('sector',{delay:.4,priority:1});acceleration=reduced?0:1.4;audio.sfx('whoosh');}
  const holding=midboss&&!midboss.leaving;
  if(time<BOSS_START-4&&!holding){spawnTimer-=dt;if(spawnTimer<=0){if(enemies.length>30)spawnTimer=.5;else{const list=foes.SCRIPT[zone];spawnTimer=foes.wave(list[waveIndex++%list.length],env)*(1-difficulty()*.22);}}}
  bombTimer-=dt;if(bombTimer<=0){spawnPickup('bomb',rand(W*.2,W*.8),140);bombTimer=22;}
  healTimer-=dt;if(healTimer<=0){spawnPickup('heal',rand(W*.25,W*.75),140);healTimer=35;}
  if(!midDone&&!midWarning&&time>=MIDBOSS_AT-4){midWarning=true;warnBand=3.6;announce('接近する月影','SENTINEL APPROACHING',2);audio.alarm(3.8);audio.voice('warning',{delay:.5,priority:4});}
  if(!midDone&&!midboss&&time>=MIDBOSS_AT)spawnMid();
  if(midboss){foes.Sentinel.update(midboss,dt,env);if(midboss.life<=0&&!midboss.leaving){midboss.leaving=true;announce('番人は月影へ還った','SENTINEL ESCAPED',2);}if(midboss.leaving&&midboss.y<-230){midboss=null;midDone=true;setVisible('bossHud',false);}}
  if(time>=BOSS_START-5&&!bossWarning){bossWarning=true;warnBand=5;announce('接近する巨大反応','CORE APPROACHING',2);audio.alarm(5.2);audio.voice('warning',{delay:.5,priority:4});}if(time>=BOSS_START&&!boss)spawnBoss();
  if(boss&&!boss.dead)foes.Core.update(boss,dt,env);

  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
   for(const e of enemies){if(!e.dead&&e.y>-30&&(s.x-e.x)**2+(s.y-e.y)**2<(e.r+s.r)**2){hurt(e,s.damage);s.life=0;addParticles(s.x,s.y,palette[route],2,.35);break;}}
   if(s.life<=0)continue;
   if(midboss&&!midboss.dead&&!midboss.leaving&&foes.Sentinel.hitTest(midboss,s.x,s.y,s.r)){s.life=0;addParticles(s.x,s.y,palette[route],3,.4);hurtMid(s.damage);continue;}
   if(boss&&!boss.dead&&!boss.dying){const h=foes.Core.hitTest(boss,s.x,s.y,s.r);if(h){s.life=0;if(h.part==='core'){addParticles(s.x,s.y,palette[route],3,.4);hurtCore(s.damage);}else if(h.part==='pod'){addParticles(s.x,s.y,palette[route],3,.4);hurtPod(h.pod,s.damage);}else clink(s.x,s.y);}}}
  shots=shots.filter(s=>s.life>0&&s.y>-50&&s.x>-40&&s.x<W+40);
  beamTargets=[];updateBeamTips(dt);if(route==='laser'){
   const beams=currentLasers(),dps=WEAPON_STEPS[power].laserDps,load=t=>{let w=0;for(const b of beams)if(t.y<b.y&&Math.abs(t.x-beamX(b,t.y))<t.r+b.width)w+=b.weight;return w;};
   for(const e of enemies){if(e.dead||e.y<-20)continue;const w=load(e);if(w){beamTargets.push(e);if(Math.random()<.6)addParticles(e.x+rand(-4,4),e.y+e.r*.5,palette.laser,1,.4);hurt(e,w*dps*dt);}}
   if(midboss&&!midboss.dead&&!midboss.leaving){const t={x:midboss.x,y:midboss.y,r:midboss.r},w=load(t);if(w){beamTargets.push(t);hurtMid(w*dps*dt);}}
   if(boss&&!boss.dead&&!boss.dying){for(const p of boss.pods)if(!p.dead){const w=load(p);if(w){beamTargets.push(p);hurtPod(p,w*dps*dt);}}const w=load(boss.core);if(w&&!boss.dying){beamTargets.push(boss.core);hurtCore(w*dps*dt);}}
  }
  for(const e of enemies){if(e.dead)continue;if(e.doomAt!==undefined&&time>=e.doomAt){kill(e);continue;}foes.update(e,dt,env);if(e.gone){e.dead=true;continue;}if(e.y>-20&&dist(e,player)<e.r+8){damage();if(player.lives>0)hurt(e,25);}if(e.y>H+70+(foes.species(e.type).margin||0)){e.gone=true;e.dead=true;}}
  enemies=enemies.filter(e=>!e.dead);if(mode!=='playing')return;
  for(const b of bullets){if(b.acc){const sp=Math.hypot(b.vx,b.vy)||1,k=Math.min(b.max||400,sp+b.acc*dt)/sp;b.vx*=k;b.vy*=k;}b.x+=b.vx*dt;b.y+=b.vy*dt;if(dist(b,player)<b.r+7){damage();b.dead=true;}}
  if(mode!=='playing')return;bullets=bullets.filter(b=>!b.dead&&b.y<H+30&&b.y>-60&&b.x>-40&&b.x<W+40);
  for(const h of hazards){h.t+=dt;const src=h.owner||(h.follow&&h.follow());if(h.owner&&h.owner.dead){h.dead=true;continue;}if(src){h.x=src.x;h.y=src.y;}if(h.a1!==undefined)h.angle=h.a0+(h.a1-h.a0)*clamp((h.t-h.warn)/h.active,0,1);
   const live=h.t>h.warn&&h.t<h.warn+h.active;if(live&&!h.fired){h.fired=true;audio.sfx('beam');shake=Math.max(shake,3);}
   if(live){const dx=player.x-h.x,dy=player.y-h.y,ca=Math.cos(h.angle),sa=Math.sin(h.angle);if(dx*ca+dy*sa>0&&Math.abs(-dx*sa+dy*ca)<h.width*.5+3)damage();}
   if(h.t>h.warn+h.active+.25)h.dead=true;}
  hazards=hazards.filter(h=>!h.dead);if(mode!=='playing')return;
  for(const p of pickups){p.p+=dt*2;p.life-=dt;let d=dist(p,player);if(d<150){p.x+=(player.x-p.x)*dt*4;p.y+=(player.y-p.y)*dt*4;}else{p.y+=p.vy*dt;p.x+=Math.sin(p.p)*dt*16;}if(dist(p,player)<(majorPickup(p)?42:33))collect(p);if(p.y>H-100&&!p.dead){p.y=H-110;p.vy=0;}if(p.life<=0)p.dead=true;}
  pickups=pickups.filter(p=>!p.dead);
  if(boss&&!boss.dead&&!boss.dying&&foes.Core.hitTest(boss,player.x,player.y,4))damage();
  if(midboss&&!midboss.leaving&&foes.Sentinel.hitTest(midboss,player.x,player.y,4))damage();
  if(time-lastHud>.08){updateHud();lastHud=time;}
 }

 function glowLine(x1,y1,x2,y2,color,width=2,blur=12){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.stroke();ctx.shadowBlur=0;}
 function drawPlayer(x,y,size=1,tilt=0,demo=false){if(demo){const b=reduced?0:Math.sin(visualTime*.7)*.45;forms.draw(ctx,{route,power:0,time:visualTime,x,y,scale:size,tilt,reduced,bank:b,thrust:.3+Math.sin(visualTime*1.3)*.3});return;}const back=depthTilt;if(back>0){ctx.save();ctx.translate(x,y);ctx.scale(1+.06*back,1-.08*back);ctx.translate(-x,-y);}forms.draw(ctx,{route,power,time:visualTime,x,y,scale:size*shipScale(),tilt,reduced,bank:motion.bank,thrust:Math.min(1,motion.thrust+.55*back),roll,motion});if(back>0)ctx.restore();}
 function drawHazards(active){for(const h of hazards){const live=h.t>h.warn&&h.t<h.warn+h.active,L=Math.hypot(W,H)*1.3,x2=h.x+Math.cos(h.angle)*L,y2=h.y+Math.sin(h.angle)*L;
   if(!active&&h.t<=h.warn){const k=h.t/h.warn;ctx.save();ctx.globalAlpha=.3+.5*Math.abs(Math.sin(visualTime*18));ctx.strokeStyle=h.color;ctx.lineWidth=1+k*1.6;ctx.setLineDash([12,10]);ctx.lineDashOffset=-visualTime*70;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);ctx.globalCompositeOperation='lighter';drawGlow(h.x,h.y,10+k*28,h.color,.85);ctx.restore();}
   if(active&&live){const fade=clamp(Math.min((h.t-h.warn)/.08,(h.warn+h.active-h.t)/.15),0,1);ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.globalAlpha=fade*.3;ctx.strokeStyle=h.color;ctx.lineWidth=h.width*2.6;ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=fade*.9;ctx.lineWidth=h.width;ctx.stroke();ctx.strokeStyle='#fff4f6';ctx.lineWidth=h.width*.35;ctx.stroke();ctx.restore();ctx.globalCompositeOperation='lighter';drawGlow(h.x,h.y,h.width*2.6,h.color,fade);ctx.globalCompositeOperation='source-over';}}}
 function drawEvolution(){
  if(burst>0){const p=player,k=burst,R=Math.hypot(W,H)*(1.15-k*.55),col=palette[route];ctx.save();ctx.globalCompositeOperation='lighter';
   for(let i=0;i<32;i++){const a=i/32*TAU+visualTime*.4,w=.035+(i%3)*.012;ctx.globalAlpha=k*(i%2?.28:.45);ctx.fillStyle=i%4?col:'#ffffff';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a-w)*R,p.y+Math.sin(a-w)*R);ctx.lineTo(p.x+Math.cos(a+w)*R,p.y+Math.sin(a+w)*R);ctx.closePath();ctx.fill();}
   drawGlow(p.x,p.y,220*(1.4-k*.4),col,k);drawGlow(p.x,p.y,90,'#ffffff',k);ctx.restore();}
  if(bigText){const b=bigText,age=b.max-b.life,pop=Math.min(1,age/.18),s=.75+pop*.35+age*.08,alpha=Math.min(1,b.life/.45)*pop,col=palette[route],cx=W/2,cy=H*.52,big=Math.min(150,W*.2);
   ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=col;ctx.shadowBlur=40;
   ctx.fillStyle=col;ctx.font=`600 ${Math.round(big*.16)}px "Barlow Condensed",sans-serif`;ctx.fillText(b.top,cx,cy-big*.62);
   ctx.translate(cx,cy);ctx.scale(s,s);ctx.fillStyle='#ffffff';ctx.font=`900 ${Math.round(big*.62)}px "Barlow Condensed",sans-serif`;ctx.fillText(b.text,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
   ctx.shadowBlur=24;ctx.fillStyle=col;ctx.font=`700 ${Math.round(big*.2)}px "Noto Sans JP",sans-serif`;ctx.fillText(b.sub,cx,cy+big*.58);ctx.restore();}
 }
 // The P that will trigger 2.0 / 3.0 (collected at 1.6 or 2.6) is a larger, star-shaped EVO item.
 const majorPickup=p=>p.type==='power'&&power<MAX_POWER&&power%3===2;
 function drawEvoItem(p){const t=visualTime,col=palette[route],gold='#ffe08a';ctx.save();ctx.translate(p.x,p.y);
  ctx.globalCompositeOperation='lighter';drawGlow(0,0,60+Math.sin(t*5)*7,col,.55);drawGlow(0,0,30,gold,.65);
  ctx.globalAlpha=.2+.08*Math.sin(t*4);const pillar=ctx.createLinearGradient(0,-95,0,95);pillar.addColorStop(0,col+'00');pillar.addColorStop(.5,col);pillar.addColorStop(1,col+'00');ctx.fillStyle=pillar;ctx.fillRect(-6,-95,12,190);ctx.globalAlpha=1;
  for(let i=0;i<6;i++){const a=t*2.2+i*TAU/6;drawGlow(Math.cos(a)*38,Math.sin(a)*15,6,'#ffffff',.9);}
  ctx.globalCompositeOperation='source-over';ctx.shadowColor=gold;ctx.shadowBlur=22;ctx.lineWidth=2;
  for(const [k,rot,fill] of [[0,t*.9,'#3b2a0cee'],[1,-t*.9+Math.PI/4,'#0d2a1cee']]){ctx.save();ctx.rotate(rot);ctx.fillStyle=fill;ctx.strokeStyle=k?col:gold;ctx.beginPath();ctx.rect(-20,-20,40,40);ctx.fill();ctx.stroke();ctx.restore();}
  ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,15,0,TAU);ctx.stroke();
  ctx.fillStyle='#fffbe8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 17px "Barlow Condensed",sans-serif';ctx.fillText('EVO',0,1);
  ctx.shadowBlur=10;ctx.fillStyle=gold;ctx.font='700 12px "Barlow Condensed",sans-serif';ctx.fillText(power<3?'→ 2.0':'→ 3.0',0,36);ctx.restore();}
 function drawWarning(){if(warnBand<=0)return;const a=Math.min(1,warnBand)*(.6+.4*Math.sin(visualTime*10)),y=H*.56,h=44;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(255,60,90,.13)';ctx.fillRect(0,y-h/2,W,h);ctx.strokeStyle='#ff5f73';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y-h/2);ctx.lineTo(W,y-h/2);ctx.moveTo(0,y+h/2);ctx.lineTo(W,y+h/2);ctx.stroke();
  const off=(visualTime*80)%40;ctx.fillStyle='#ff5f7366';for(let x=-40+off;x<W+40;x+=40)for(const [top,dir] of [[y-h/2-11,1],[y+h/2+1,-1]]){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+14,top);ctx.lineTo(x+4,top+10);ctx.lineTo(x-10,top+10);ctx.fill();}
  ctx.font='700 28px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffd6dc';const txt='W A R N I N G',tw=ctx.measureText(txt).width+90,sc=(visualTime*110)%tw;for(let x=-tw+sc;x<W+tw;x+=tw)ctx.fillText(txt,x,y+1);ctx.restore();}
 function drawBackground(dt){
  const inFlight=mode==='playing'||mode==='paused'||mode==='result';
  const target=inFlight?WEAPON_STEPS[power].travelSpeed:9;
  backgroundSpeed+=(target-backgroundSpeed)*(1-Math.exp(-dt*2.7));
  acceleration=Math.max(0,acceleration-dt*1.4);
  starOffset+=dt*(reduced?Math.min(backgroundSpeed,38):backgroundSpeed);
  stage.draw(ctx,{W,H,t:visualTime,scroll:starOffset,mission:inFlight?time:0,accent:palette[route],rage:boss&&!boss.dead?boss.rage:0});
  const stretch=reduced?0:Math.max(0,backgroundSpeed-30)*.07;
  for(const s of stars){
   const y=(s.y*H+starOffset*s.z)%H,alpha=(.22+s.z*.23)*(1+Math.sin(visualTime+s.p)*.2);
   ctx.fillStyle=route==='laser'?`rgba(170,215,255,${alpha})`:`rgba(187,235,183,${alpha})`;
   const tail=s.z*(1+stretch*(s.z>1.1?1:.22)+acceleration*10);
   if(s.z>1.2){ctx.shadowColor=palette[route];ctx.shadowBlur=5;}
   ctx.fillRect(s.x*W,y,s.z*(s.z>1.2?1.3:1),tail);ctx.shadowBlur=0;
  }
  if(acceleration>0&&!reduced){const glow=ctx.createLinearGradient(0,0,W,0);glow.addColorStop(0,palette[route]+'29');glow.addColorStop(.17,palette[route]+'00');glow.addColorStop(.83,palette[route]+'00');glow.addColorStop(1,palette[route]+'29');ctx.save();ctx.globalAlpha=Math.min(1,acceleration);ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.restore();}
  if(mode==='menu'){const x=W<800?W*.83:W*.73,y=H*.43;ctx.save();ctx.globalAlpha=W<800?.27:.8;ctx.strokeStyle='#9ada9826';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+9,165,165,0,0,TAU);ctx.stroke();ctx.setLineDash([3,18]);ctx.beginPath();ctx.ellipse(x,y+9,200,200,0,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();drawPlayer(x+Math.sin(visualTime*.7)*18,y+Math.sin(visualTime*.8)*12,W<800?1.2:2.7,Math.sin(visualTime*.35)*.08,true);}}
 function draw(dt){ctx=mainCtx;if(mode==='ending'){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#020306';ctx.fillRect(0,0,W,H);window.RinkouEnding.draw(ctx,W,H);return;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);drawBackground(dt);if(mode==='menu'||mode==='starting')return;const warp=depthTilt>.002;if(warp){layerCtx.setTransform(1,0,0,1,0,0);layerCtx.clearRect(0,0,layer.width,layer.height);layerCtx.setTransform(dpr,0,0,dpr,0,0);ctx=layerCtx;}ctx.save();if(shake>0&&!reduced)ctx.translate(rand(-shake,shake),rand(-shake,shake));
  drawHazards(false);
  ctx.globalCompositeOperation='lighter';
  if(route==='laser'&&mode!=='result'&&endingTimer===0){ctx.save();for(const b of currentLasers()){const col=palette.laser;ctx.globalAlpha=.28;glowLine(b.x,b.y,b.tx,BEAM_TOP,col,b.width*2.2,18);ctx.globalAlpha=.78+Math.sin(visualTime*37)*.08;glowLine(b.x,b.y,b.tx,BEAM_TOP,col,b.width,15);glowLine(b.x,b.y,b.tx,BEAM_TOP,'#e8f6ff',Math.max(1.4,b.width*.25),6);}ctx.restore();for(const t of beamTargets)drawGlow(t.x+rand(-3,3),t.y+t.r*.4,16+Math.random()*10+WEAPON_STEPS[power].beam*.6,palette.laser,.85);}
  ctx.lineCap='round';for(const tr of tipTrail)for(let i=1;i<tr.length;i++){const k=1-i/tr.length;ctx.globalAlpha=k*.5;ctx.strokeStyle=palette[route];ctx.lineWidth=k*3.4;ctx.beginPath();ctx.moveTo(tr[i-1].x,tr[i-1].y);ctx.lineTo(tr[i].x,tr[i].y);ctx.stroke();}ctx.globalAlpha=1;ctx.lineCap='butt';
  for(const g of ghosts){ctx.globalAlpha=g.life/.22*.22;forms.draw(ctx,{route,power,time:visualTime,x:g.x,y:g.y,scale:shipScale(),tilt:g.tilt,reduced,bank:g.bank,motion});}ctx.globalAlpha=1;
  for(const s of shots){drawSprite(bulletSprite(palette.spread,Math.round(s.r*1.5)/2,'needle'),s.x,s.y,Math.atan2(s.vy,s.vx));}
  ctx.globalCompositeOperation='source-over';
  for(const e of enemies){foes.draw(ctx,e,visualTime);if(e.hit>0){ctx.globalCompositeOperation='lighter';drawGlow(e.x,e.y,e.r*1.5,'#ffffff',e.hit*7);ctx.globalCompositeOperation='source-over';}}
  if(midboss){foes.Sentinel.draw(ctx,midboss,visualTime);if(midboss.hit>0){ctx.globalCompositeOperation='lighter';drawGlow(midboss.x,midboss.y,50*midboss.s,'#ffffff',midboss.hit*5);ctx.globalCompositeOperation='source-over';}}
  if(boss&&!boss.dead){foes.Core.draw(ctx,boss,visualTime,player);if(boss.hit>0){ctx.globalCompositeOperation='lighter';drawGlow(boss.core.x,boss.core.y,boss.core.r*1.6,'#ffffff',boss.hit*6);ctx.globalCompositeOperation='source-over';}}
  for(const p of pickups){if(majorPickup(p)){drawEvoItem(p);continue;}ctx.save();ctx.translate(p.x,p.y);let col=p.type==='bomb'?palette.bomb:palette.power;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.strokeStyle=col;ctx.fillStyle='#0d251deb';ctx.lineWidth=1.5;ctx.rotate(Math.sin(p.p)*.12);ctx.beginPath();ctx.roundRect(-17,-17,34,34,8);ctx.fill();ctx.stroke();ctx.fillStyle=col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(p.type==='power'?'bold 15px':'bold 19px')+' sans-serif';ctx.fillText(p.type==='power'?'P'+(level+1):p.type==='bomb'?'B':'+',0,1);ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(0,0,25+Math.sin(p.p*2)*3,0,TAU);ctx.stroke();ctx.restore();}
  ctx.globalCompositeOperation='lighter';
  const gemSprite=bulletSprite(palette[route],2.2,'orb');for(const g of gems)drawSprite(gemSprite,g.x,g.y);
  for(const b of bullets){const s=bulletSprite(b.color,b.r,b.shape);if(b.shape==='needle')drawSprite(s,b.x,b.y,Math.atan2(b.vy,b.vx));else drawSprite(s,b.x,b.y);}
  drawHazards(true);ctx.globalCompositeOperation='source-over';
  if(player.lives>0&&(player.inv<=0||Math.sin(visualTime*22)>.05)){drawPlayer(player.x,player.y,1,shipTilt());if(player.inv>0){ctx.strokeStyle='#c9ffba55';ctx.lineWidth=1;ctx.beginPath();ctx.arc(player.x,player.y,43,0,TAU);ctx.stroke();}ctx.fillStyle='#f4ffeb';ctx.beginPath();ctx.arc(player.x,player.y,2,0,TAU);ctx.fill();}
  ctx.globalCompositeOperation='lighter';
  for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.028,p.y-p.vy*.028);ctx.stroke();}
  for(const f of flashes){const k=f.life/f.max;drawGlow(f.x,f.y,f.r*(1.6-k*.6),f.color,k);}
  for(const r of rings){let t=1-r.life/r.total;ctx.globalAlpha=(1-t)*.75;ctx.strokeStyle=r.color;ctx.lineWidth=(1-t)*5+1;ctx.shadowColor=r.color;ctx.shadowBlur=24;ctx.beginPath();ctx.arc(r.x,r.y,r.max*(1-(1-t)**2),0,TAU);ctx.stroke();}ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  for(const f of floats){ctx.globalAlpha=Math.min(1,f.life);ctx.fillStyle=f.color;ctx.textAlign='center';ctx.font='600 16px "Barlow Condensed",sans-serif';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.restore();
  if(warp){ctx=mainCtx;blitDepth();}
  drawWarning();drawEvolution();
  if(bombLight>0){let g=ctx.createRadialGradient(player.x,player.y,10,player.x,player.y,Math.max(W,H));g.addColorStop(0,`rgba(175,255,145,${Math.min(.24,bombLight*.23)})`);g.addColorStop(1,'#9dffad00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}if(flash>0){ctx.fillStyle=`rgba(210,255,194,${Math.min(flash,.38)})`;ctx.fillRect(0,0,W,H);}
 }
 function advance(dt){if(mode==='ending'){window.RinkouEnding.update(dt,W,H);if(window.RinkouEnding.done())endEnding();return;}if(mode!=='paused'){const real=dt;if(slowmo>0){slowmo-=real;dt*=.3;}burst=Math.max(0,burst-real*1.5);if(bigText){bigText.life-=real;if(bigText.life<=0)bigText=null;}visualTime+=dt;const tt=(mode==='playing'||mode==='result')&&zone===3?1:0,was=depthTilt;depthTilt+=(tt-depthTilt)*Math.min(1,dt*.9);if(Math.abs(tt-depthTilt)<.002)depthTilt=tt;tiltMoving=depthTilt!==was;shake=Math.max(0,shake-dt*27);flash=Math.max(0,flash-dt*.85);bombLight=Math.max(0,bombLight-dt);warnBand=Math.max(0,warnBand-dt);clinkSfx-=dt;if(introTimer>0){introTimer-=dt;if(introTimer<=0)$('enemyIntro').classList.remove('show');}if(mode==='playing')update(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*1.4;p.vy*=1-dt*1.4;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);for(const f of flashes)f.life-=dt;flashes=flashes.filter(f=>f.life>0);for(const g of ghosts)g.life-=dt;ghosts=ghosts.filter(g=>g.life>0);for(const f of floats){f.y-=dt*28;f.life-=dt;}floats=floats.filter(f=>f.life>0);if(announcementTime>0){announcementTime-=dt;if(announcementTime<=0)$('announcement').classList.remove('show');}}}
 function frame(now){const dt=Math.min((now-last)/1000||0,.034);last=now;advance(dt);
  draw(mode==='paused'?0:dt);const spectrum=audio.readSpectrum();spectrumBars.forEach((e,i)=>e.style.height=(2+(mode==='playing'?spectrum[i]*32:0))+'px');requestAnimationFrame(frame);
 }
 $('startButton').addEventListener('click',start);$('retryButton').addEventListener('click',start);$('returnButton').addEventListener('click',home);$('quitButton').addEventListener('click',home);$('resumeButton').addEventListener('click',resume);$('pauseButton').addEventListener('click',pause);$('bombButton').addEventListener('click',bomb);$('home').addEventListener('click',e=>{e.preventDefault();if(mode==='playing')pause();else if(mode!=='paused')home();});
 document.querySelectorAll('input[name=route]').forEach(input=>input.addEventListener('change',()=>setRoute(input.value)));
 $('soundToggle').addEventListener('click',async()=>{if(!audio.ready){try{await audio.init();if(mode==='playing')audio.setTrack(route,level);}catch{toast('このブラウザで音声を開始できません。');}return;}let muted=audio.toggle();$('soundLabel').textContent=muted?'SOUND OFF':'SOUND ON';$('soundToggle').setAttribute('aria-label',muted?'サウンドをオン':'サウンドをミュート');});
 $('volume').addEventListener('input',e=>{audio.setVolume(Number(e.target.value)/100);$('volumeValue').textContent=e.target.value+'%';});$('voiceVolume').addEventListener('input',e=>{audio.setVoiceVolume(Number(e.target.value)/100);$('voiceVolumeValue').textContent=e.target.value+'%';});
 $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('このブラウザでは全画面表示に対応していません。');}catch{toast('この画面では全画面表示を利用できません。');}});
 for(const id of ['pauseDialog','resultDialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();if(id==='pauseDialog')resume();else home();});
 canvas.addEventListener('contextmenu',e=>{e.preventDefault();bomb();});
 canvas.addEventListener('pointerdown',e=>{if(mode!=='playing')return;if(e.pointerType==='mouse')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,start:performance.now(),moved:false});if(activeTouch===null)activeTouch=e.pointerId;});
 canvas.addEventListener('pointermove',e=>{if(mode!=='playing')return;if(e.pointerType==='mouse'){mouseAt={x:e.clientX,y:e.clientY};const u=unproject(e.clientX,e.clientY);player.tx=u.x;player.ty=u.y;return;}let t=touches.get(e.pointerId);if(!t)return;e.preventDefault();if(Math.hypot(e.clientX-t.x,e.clientY-t.y)>10)t.moved=true;if(e.pointerId===activeTouch){const k=project(player.x,player.y).s;player.tx+=(e.clientX-t.lastX)/k;player.ty+=(e.clientY-t.lastY)/k;}t.lastX=e.clientX;t.lastY=e.clientY;});
 function endTouch(e,cancelled){let t=touches.get(e.pointerId);if(t&&!cancelled&&!t.moved&&performance.now()-t.start<240&&performance.now()-startedAt>450)bomb();touches.delete(e.pointerId);if(activeTouch===e.pointerId)activeTouch=touches.keys().next().value??null;}
 canvas.addEventListener('pointerup',e=>endTouch(e,false));canvas.addEventListener('pointercancel',e=>endTouch(e,true));
 addEventListener('pointerdown',()=>{if(mode==='ending'&&window.RinkouEnding.time>1.5)endEnding();});
 addEventListener('keydown',e=>{if(mode==='ending'){if(['Enter',' ','Escape'].includes(e.key)&&window.RinkouEnding.time>1.5){e.preventDefault();endEnding();}return;}if($('evolutionDialog').open)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)&&mode==='playing')e.preventDefault();if(e.repeat)return;if((e.key==='Escape'||e.key.toLowerCase()==='p')&&!$('resultDialog').open){if(mode==='playing')pause();else if(mode==='paused')resume();}if((e.key===' '||e.key.toLowerCase()==='b')&&mode==='playing')bomb();keys.add(e.key.length===1?e.key.toLowerCase():e.key);});addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));addEventListener('blur',()=>{keys.clear();if(mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
 if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'select_weapon_route',title:'Select weapon route',description:'Select spread or laser on the RINKOU title screen. Does not launch a mission.',inputSchema:{type:'object',properties:{route:{type:'string',enum:['spread','laser']}},required:['route'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!['spread','laser'].includes(input.route))throw Error('route must be spread or laser');if(mode!=='menu')throw Error('Return to title screen before changing weapon');const inputEl=document.querySelector(`input[value="${input.route}"]`);inputEl.checked=true;setRoute(input.route);return {route,screen:mode};}})).catch(()=>{});}catch{}}
 // Local verification hook (?debug): jump the mission clock, e.g. RinkouDebug.jump(145).
 if(/[?&]debug\b/.test(location.search))window.RinkouDebug={jump(t){time=t;nextPowerAt=Math.ceil(t/POWER_INTERVAL)*POWER_INTERVAL||POWER_INTERVAL;if(t>MIDBOSS_AT+2){midDone=true;if(midboss){midboss=null;setVisible('bossHud',false);}}},power(n){power=clamp(n,0,MAX_POWER);level=Math.floor(power/3);updateTrack(true);},state:()=>({mode,time,zone,depthTilt,evo:!!bigText,enemies:enemies.map(e=>e.type),bullets:bullets.length,hazards:hazards.length,boss:boss&&{hp:boss.hp,phase:boss.phase},midboss:midboss&&{hp:midboss.hp},score,lives:player.lives}),god(){player.lives=99;},evolve(){evolutionBurst();},endingAt(t,from=0){let sim=from;window.RinkouEnding.setClock(()=>sim);const step=1/30;while(sim<t){sim+=step;advance(step);}draw(0);return {t:window.RinkouEnding.time,mode};},ending(t=0){endingTimer=0;boss=null;mode='playing';startEnding().then(()=>window.RinkouEnding.seek(t));},run(sec,step=1/60){for(let i=0;i<sec/step;i++)advance(step);draw(step);return this.state();},hurtBoss(f){const b=activeBoss();if(b)b.hp=b.maxHp*f;}};
 setRoute('spread');requestAnimationFrame(frame);
})();
