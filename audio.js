/* RINKOU: recorded SPREAD / LASER music, with local synthesis for fallback and sound effects. */
(() => {
 'use strict';
 const scores = {
  spread:[
   {name:'燐光前半１',bpm:128,root:48,scale:[0,3,7,10],lead:[12,7,10,7,15,12,7,10,12,19,15,10,14,12,7,10]},
   {name:'燐光前半２',bpm:142,root:51,scale:[0,4,7,11],lead:[12,16,19,23,19,16,14,19,24,23,19,16,21,19,16,14]},
   {name:'燐光前半３',bpm:156,root:50,scale:[0,4,7,9],lead:[24,19,21,24,28,24,21,19,16,19,24,28,26,24,21,19]}
  ],
  laser:[
   {name:'燐光後半１',bpm:124,root:45,scale:[0,3,7,10],lead:[0,12,7,15,0,10,7,12,3,15,10,19,7,14,10,12]},
   {name:'燐光後半２',bpm:144,root:41,scale:[0,3,7,8],lead:[12,19,24,15,19,27,24,19,20,15,24,19,27,24,19,15]},
   {name:'燐光後半３',bpm:160,root:40,scale:[0,4,7,11],lead:[24,28,31,28,26,23,19,23,24,31,35,31,28,26,23,19]}
  ]
 };
 // Announcer lines (Higgsfield Seed Audio, voice "Xenia", echo baked in).
 const VOICES=['start','speedup','powerup','evolution','phoenix','goddess','maxpower','bomb','warning','sector','shield','lastshield','clear','gameover','bombget','shieldget'];
 // Recorded effects (sfx/se_*.wav): game sound name -> [file, gain]. Anything without a file uses the synth below.
 const SFX={shot:['shot',.2],explosion:['explosion_s',.5],boom:['explosion_l',.8],power:['levelup',.9],upgrade:['powerup',.6],pickup:['item',.55],bomb:['bomb',.9],damage:['damage',.8],warning:['warning',1.1],clear:['clear',.8],clink:['clink',.45],charge:['charge',.45],beam:['beam',.6],whoosh:['sector',.55],gem:['gem',.3],phase:['phase',.85],bossdown:['boss_down',1]};
 const SFX_GAP={explosion:.03,boom:.05,clink:.06};
 const A={ready:false,sfxBuffers:new Map(),sfxLast:{},laserSrc:null,voiceVolume:.9,voiceBuffers:new Map(),voiceUntil:0,voicePriority:0,voiceSource:null,muted:false,volume:.65,route:'spread',level:0,playing:false,custom:{},timer:null,ctx:null,scores,
  buffers:new Map(),musicSources:[],trackRequest:0,spectrum:new Float32Array(24),
  async init(){
   if(this.ctx&&this.configReady){await this.ctx.resume();return;}
   if(!this.ctx){
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=this.volume*.52;
   const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=16;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
   this.analyser=c.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.78;this.analyser.minDecibels=-85;this.analyser.maxDecibels=-20;
   this.frequencyData=new Uint8Array(this.analyser.frequencyBinCount);
   const binHz=c.sampleRate/this.analyser.fftSize,maxHz=Math.min(16000,c.sampleRate/2);
   this.spectrumBands=Array.from({length:24},(_,i)=>{const start=Math.max(1,Math.floor(40*(maxHz/40)**(i/24)/binHz)),end=Math.max(start+1,Math.ceil(40*(maxHz/40)**((i+1)/24)/binHz));return [Math.min(start,this.frequencyData.length-1),Math.min(end,this.frequencyData.length)];});
   // Analyse the final mix so bars respond to both music and effects, including volume/mute.
   this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(c.destination);this.fx=c.createGain();this.fx.gain.value=.65;this.fx.connect(this.master);this.voiceBus=c.createGain();this.voiceBus.gain.value=this.voiceVolume;this.voiceBus.connect(this.master);
   this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const n=this.noise.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;
   }
   await this.ctx.resume();
   if(window.RinkouMusicConfig)this.custom=window.RinkouMusicConfig;
   else if(location.protocol!=='file:'){this.custom=await fetch('music.json').then(r=>{if(!r.ok)throw Error('Music configuration unavailable');return r.json();});}
   this.configReady=true;this.ready=true;this.loadVoices();this.loadSfx();
  },
  loadSfx(){
   if(this.sfxRequested)return;this.sfxRequested=true;const embedded=window.RinkouSfxConfig;
   if(!embedded&&location.protocol==='file:')return;
   for(const file of new Set(Object.values(SFX).map(v=>v[0]))){const src=embedded?.[file]||`sfx/se_${file}.wav`;fetch(src).then(r=>{if(!r.ok)throw Error('sfx');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(buf=>this.sfxBuffers.set(file,buf)).catch(()=>{});}
  },
  loadVoices(){
   if(this.voicesRequested)return;this.voicesRequested=true;const embedded=window.RinkouVoiceConfig;
   if(!embedded&&location.protocol==='file:')return;
   for(const name of VOICES){const src=embedded?.[name]||`voice/vo_${name}.mp3`;fetch(src).then(r=>{if(!r.ok)throw Error('voice');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(buf=>this.voiceBuffers.set(name,buf)).catch(()=>{});}
  },
  // A higher-priority line cuts off the current one; equal or lower lines are skipped while it plays.
  voice(name,{delay=0,priority=1}={}){
   if(!this.ready||this.ctx.state!=='running')return;const buf=this.voiceBuffers.get(name);if(!buf)return;
   const c=this.ctx,t=c.currentTime+delay;
   if(t<this.voiceUntil-.12){
    // Important lines (power-ups) wait for a short line to finish instead of being dropped.
    if(priority<=this.voicePriority){if(priority>=3&&this.voiceUntil-c.currentTime<2.5)this.voice(name,{delay:this.voiceUntil-c.currentTime+.05,priority:this.voicePriority+.5});return;}
    try{this.voiceSource.stop(t);}catch{}}
   const s=c.createBufferSource();s.buffer=buf;s.connect(this.voiceBus);s.start(t);s.onended=()=>s.disconnect();
   this.voiceSource=s;this.voicePriority=priority;this.voiceUntil=t+buf.duration;
   // Duck the music a little so the line reads over it, then let it swell back.
   if(this.bus){const g=this.bus.gain;g.cancelScheduledValues(t);const lv=this.musicLevel||.72;g.setTargetAtTime(lv*.7,t,.05);g.setTargetAtTime(lv,t+Math.max(.35,buf.duration-.6),.3);}
  },
  setVoiceVolume(v){this.voiceVolume=Math.max(0,Math.min(1,v));if(this.voiceBus)this.voiceBus.gain.setTargetAtTime(this.voiceVolume,this.ctx.currentTime,.03);},
  readSpectrum(){
   if(!this.analyser||!this.playing||this.muted||this.volume===0||this.ctx.state!=='running'){this.spectrum.fill(0);return this.spectrum;}
   this.analyser.getByteFrequencyData(this.frequencyData);
   for(let i=0;i<this.spectrum.length;i++){const [start,end]=this.spectrumBands[i];let sum=0;for(let j=start;j<end;j++)sum+=this.frequencyData[j];this.spectrum[i]=(sum/((end-start)*255))**1.5;}
   return this.spectrum;
  },
  tone(freq,time,duration,gain=.1,type='triangle',bus=this.bus,slide=0){
   if(!this.ctx||!bus)return;const c=this.ctx,o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),time);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),time+duration);v.gain.setValueAtTime(0,time);v.gain.linearRampToValueAtTime(gain,time+.006);v.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(v);v.connect(bus);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();v.disconnect();};
  },
  noiseHit(time,duration,gain,cutoff,bus=this.bus){if(!this.ctx||!bus)return;let c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=cutoff;g.gain.setValueAtTime(gain,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(f);f.connect(g);g.connect(bus);s.start(time);s.stop(time+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};},
  trackFiles(route,level){const track=this.custom?.[route]?.[level];return track?.file?[track.file,track.loopFile||track.file]:[];},
  loadBuffer(file){
   if(this.buffers.has(file))return this.buffers.get(file).promise;
   const entry={buffer:null};this.buffers.set(file,entry);
   entry.promise=(async()=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
    try{const response=await fetch(file,{signal:controller.signal});if(!response.ok)throw Error('Music unavailable');const bytes=await response.arrayBuffer();entry.buffer=await this.ctx.decodeAudioData(bytes);return entry.buffer;}
    catch(error){if(this.buffers.get(file)===entry)this.buffers.delete(file);throw error;}
    finally{clearTimeout(timeout);}
   })();return entry.promise;
  },
  prepare(route,level){if(!this.ready)return Promise.resolve([]);return Promise.all(this.trackFiles(route,level).map(file=>this.loadBuffer(file)));},
  setTrack(route,level){
   this.route=route;this.level=level;if(!this.ready)return Promise.resolve();
   const request=++this.trackRequest,files=this.trackFiles(route,level);this.playing=true;
   const begin=buffers=>{
    if(request!==this.trackRequest||!this.playing)return;
    this.clearMusic();this.musicLevel=.72*(this.custom?.[route]?.[level]?.gain||1);this.bus=this.ctx.createGain();this.bus.gain.value=this.musicLevel;this.bus.connect(this.master);this.step=0;this.next=this.ctx.currentTime+.06;
    if(buffers){
     const start=this.ctx.currentTime+.025,hasIntro=files[0]!==files[1];
     const source=(buffer,when,loop)=>{
      const node=this.ctx.createBufferSource();node.buffer=buffer;node.loop=loop;node.connect(this.bus);this.musicSources.push(node);
      node.onended=()=>{node.disconnect();node.buffer=null;this.musicSources=this.musicSources.filter(s=>s!==node);if(!loop&&request===this.trackRequest)this.buffers.delete(files[0]);};
      node.start(when);return node;
     };
     // Both sources use the same audio clock: the loop starts exactly at the intro's end.
     if(hasIntro)source(buffers[0],start,false);
     source(buffers[1],start+(hasIntro?buffers[0].duration:0),true);
    }else this.startSynth();
    // Retain only this tier and the next; future music is ready before the next major upgrade.
    const keep=new Set([...files,...this.trackFiles(route,level+1)]);
    for(const file of this.buffers.keys())if(!keep.has(file))this.buffers.delete(file);
    this.prepare(route,level+1).catch(()=>{});
   };
   if(!files.length){begin(null);return Promise.resolve();}
   const cached=files.map(file=>this.buffers.get(file)?.buffer);
   if(cached.every(Boolean)){begin(cached);return Promise.resolve();}
   // Keep the preceding music audible if the next tier still needs to load.
   return this.prepare(route,level).then(begin).catch(()=>{if(request!==this.trackRequest||!this.playing)return;begin(null);this.onMusicError?.();});
  },
  startSynth(){if(this.timer)clearInterval(this.timer);this.next=this.ctx.currentTime+.05;this.timer=setInterval(()=>this.schedule(),25);this.schedule();},
  schedule(){if(!this.playing||this.ctx.state!=='running')return;let track=scores[this.route][this.level],sixteenth=60/track.bpm/4;if(this.next<this.ctx.currentTime-.2)this.next=this.ctx.currentTime+.03;while(this.next<this.ctx.currentTime+.12){this.noteStep(this.step++,this.next,track,sixteenth);this.next+=sixteenth;}},
  noteStep(step,t,s,d){let p=step%16,bar=Math.floor(step/16)%4,chord=[0,-5,-3,-7][bar],hz=m=>440*2**((m-69)/12),lvl=this.level;
   if(p%4===0){this.tone(150,t,.17,.55,'sine',this.bus,42);this.noiseHit(t,.022,.14,2500);}
   if(p===4||p===12){this.noiseHit(t,.12,.2,1400);this.tone(190,t,.09,.1,'triangle');}
   if(p%2===0||lvl===2)this.noiseHit(t,.035,p%4===2?.12:.055,6800);
   if(p%2===0)this.tone(hz(s.root-12+chord+(p===14?7:0)),t,d*1.7,.24,this.route==='laser'?'sawtooth':'triangle');
   const melody=s.lead[(p+bar*4)%16]+s.root+chord;
   if(lvl>0||p%2===0){this.tone(hz(melody),t,d*1.45,.11,this.route==='laser'?'triangle':'square');this.tone(hz(melody),t+d*1.5,d*1.8,.028,'triangle');}
   if(p===0)s.scale.slice(0,3).forEach((n,i)=>this.tone(hz(s.root+12+chord+n),t+i*.007,d*12,.038,'sine'));
   if(lvl===2&&p%4===2)this.tone(hz(s.root+24+s.scale[p%4]),t,d*.8,.06,'sine');
  },
  sfx(kind,level=0){if(!this.ready||this.ctx.state!=='running')return;const t=this.ctx.currentTime,b=this.fx;
   const rec=SFX[kind],buf=rec&&this.sfxBuffers.get(rec[0]);
   if(buf){const gap=SFX_GAP[kind]||0;if(gap&&t-(this.sfxLast[kind]??-1)<gap)return;this.sfxLast[kind]=t;const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=buf;if(kind==='shot')s.playbackRate.value=1+level*.05;g.gain.value=rec[1];s.connect(g);g.connect(b);s.start(t);s.onended=()=>{s.disconnect();g.disconnect();};return;}
   if(kind==='shot')this.tone(1000+level*150,t,.055,.024,'triangle',b,330);
   if(kind==='laser')this.tone(180+level*50,t,.09,.026,'sawtooth',b,100);
   if(kind==='hit')this.noiseHit(t,.035,.05,2200,b);
   if(kind==='explosion'){this.tone(90,t,.23,.28,'sine',b,24);this.noiseHit(t,.2,.23,400,b);}
   if(kind==='power'){[0,4,7,12,16,19,24].forEach((n,i)=>this.tone(330*2**(n/12),t+i*.042,.32,.14,'triangle',b));this.noiseHit(t,.55,.11,1800,b);}
   if(kind==='pickup')[660,880,1320].forEach((f,i)=>this.tone(f,t+i*.065,.2,.12,'sine',b));
   if(kind==='upgrade')[660,830,990].forEach((f,i)=>this.tone(f,t+i*.045,.17,.09,'triangle',b));
   if(kind==='bomb'){this.tone(70,t,.9,.7,'sine',b,20);this.noiseHit(t,1.1,.52,180,b);[130,195,260,390].forEach((f,i)=>this.tone(f,t+i*.045,.8,.12,'sawtooth',b));}
   if(kind==='damage'){this.tone(210,t,.32,.21,'sawtooth',b,55);this.noiseHit(t,.22,.2,600,b);}
   if(kind==='warning')[0,.2,.4].forEach(d=>this.tone(220,t+d,.11,.14,'square',b));
   if(kind==='boom'){this.tone(62,t,.55,.42,'sine',b,18);this.noiseHit(t,.5,.32,220,b);this.tone(150,t,.3,.12,'sawtooth',b,40);}
   if(kind==='clink'){this.tone(2600,t,.04,.035,'square',b,1900);this.noiseHit(t,.03,.05,5200,b);}
   if(kind==='charge')this.tone(260,t,.9,.06,'sawtooth',b,1500);
   if(kind==='beam'){this.noiseHit(t,.55,.18,700,b);this.tone(95,t,.55,.18,'sawtooth',b,55);}
   if(kind==='whoosh'){this.noiseHit(t,1.3,.14,260,b);this.tone(180,t,1.2,.06,'sine',b,960);}
   if(kind==='gem')this.tone(1500+Math.random()*700,t,.05,.022,'sine',b);
   if(kind==='clear')[0,4,7,12,16,19,24].forEach((n,i)=>this.tone(261.63*2**(n/12),t+i*.13,1,.14,'triangle',b));
  },
  clearMusic(){if(this.timer){clearInterval(this.timer);this.timer=null;}for(const source of this.musicSources){source.stop(this.ctx.currentTime+.06);}this.musicSources=[];if(this.bus&&this.ctx){const old=this.bus;old.gain.cancelScheduledValues(this.ctx.currentTime);old.gain.setTargetAtTime(.0001,this.ctx.currentTime,.012);setTimeout(()=>old.disconnect(),250);this.bus=null;}},
  stopMusic(){this.trackRequest++;this.clearMusic();},
  // Ending theme: decoded ahead of time (kept outside the per-tier cache) and played once.
  prepareEnding(){if(this.endingBuffer)return Promise.resolve(this.endingBuffer);if(this.endingPromise)return this.endingPromise;const file=this.custom?.ending?.[0]?.file;if(!this.ready||!file)return Promise.resolve(null);
   this.endingPromise=fetch(file).then(r=>{if(!r.ok)throw Error('ending');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(buf=>this.endingBuffer=buf).catch(()=>{this.endingPromise=null;return null;});return this.endingPromise;},
  playEnding(){this.stopMusic();this.stopAlarm();this.playing=true;const buf=this.endingBuffer;if(!buf||!this.ctx)return null;const c=this.ctx,t=c.currentTime+.05;
   this.bus=c.createGain();this.bus.gain.value=.8;this.bus.connect(this.master);const s=c.createBufferSource();s.buffer=buf;s.connect(this.bus);s.start(t);this.musicSources.push(s);s.onended=()=>{s.disconnect();this.musicSources=this.musicSources.filter(x=>x!==s);};return {start:t,duration:buf.duration};},
  stop(){this.playing=false;this.stopMusic();this.stopAlarm();},
  // The recorded alarm is a long siren: play it only for the warning band, then fade it out.
  alarm(seconds){if(!this.ready||this.ctx.state!=='running')return;const buf=this.sfxBuffers.get('warning');if(!buf){this.sfx('warning');return;}this.stopAlarm();const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),g=c.createGain(),end=t+Math.min(seconds,buf.duration);s.buffer=buf;g.gain.setValueAtTime(SFX.warning[1],t);g.gain.setValueAtTime(SFX.warning[1],end-.5);g.gain.linearRampToValueAtTime(0,end);s.connect(g);g.connect(this.master);s.start(t);s.stop(end+.05);if(this.bus){const mg=this.bus.gain,lv=this.musicLevel||.72;mg.cancelScheduledValues(t);mg.setTargetAtTime(lv*.55,t,.08);mg.setTargetAtTime(lv,end-.3,.3);};s.onended=()=>{s.disconnect();g.disconnect();if(this.alarmSrc===s)this.alarmSrc=null;};this.alarmSrc=s;},
  stopAlarm(){if(this.alarmSrc){try{this.alarmSrc.stop();}catch{}this.alarmSrc=null;}},
  pause(){if(this.ctx)this.ctx.suspend();},
  resume(){if(this.ctx){this.next=this.ctx.currentTime+.05;this.ctx.resume();}},
  setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume*.52,this.ctx.currentTime,.03);},
  toggle(){this.muted=!this.muted;this.setVolume(this.volume);return this.muted;}
 };
 window.PulseAudio=A;
})();
