/* Sound room on the title screen: the six stage themes (their main recordings, no loop parts) and the ending. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),audio=window.PulseAudio,dialog=$('soundRoom'),list=$('soundRoomList'),bars=$('soundRoomBars');
 // [route, tier, display title, when it plays, colour]
 const ORDER=[['spread',0,'HOTARU 1.0 — FIRST LIGHT','SPREAD · 1.0〜1.6','#a0ff83'],['spread',1,'HOTARU 2.0 — SWARM','SPREAD · 2.0〜2.6','#a0ff83'],['spread',2,'HOTARU 3.0 — EMERALD PHOENIX','SPREAD · 3.0〜3.6','#a0ff83'],
  ['laser',0,'KAGERO 1.0 — BLUE MIRAGE','LASER · 1.0〜1.6','#69b7ff'],['laser',1,'KAGERO 2.0 — PARALLEL RAYS','LASER · 2.0〜2.6','#69b7ff'],['laser',2,'KAGERO 3.0 — AZURE GODDESS','LASER · 3.0〜3.6','#69b7ff'],['ending',0,'RINKOU — AFTERGLOW','ENDING','#ffd59b']];
 const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'-:--';
 let tracks=[],current=-1,raf=null;
 for(let i=0;i<40;i++)bars.appendChild(document.createElement('i'));
 const barEls=[...bars.children];

 function render(){
  list.replaceChildren(...tracks.map((t,i)=>{const li=document.createElement('li');li.style.setProperty('--c',t.color);
   li.innerHTML=`<button class="sr-row" type="button"><span class="sr-no">${String(i+1).padStart(2,'0')}</span><span class="sr-title"><b></b><small></small></span><span class="sr-time">-:--</span><span class="sr-icon" aria-hidden="true">▶</span></button><span class="sr-progress"><i></i></span>`;
   li.querySelector('b').textContent=t.name;li.querySelector('small').textContent=t.sub;li.querySelector('button').setAttribute('aria-label',`${t.name}を再生`);
   li.querySelector('button').addEventListener('click',()=>toggle(i));
   // Read only the length up front; the recording itself streams when played.
   const probe=new Audio();probe.preload='metadata';probe.onloadedmetadata=()=>{t.duration=probe.duration;li.querySelector('.sr-time').textContent=fmt(probe.duration);probe.removeAttribute('src');};probe.src=t.file;
   return li;}));
 }
 function mark(){[...list.children].forEach((li,i)=>{const on=i===current,playing=on&&audio.previewPlaying();li.classList.toggle('active',on);li.querySelector('.sr-icon').textContent=playing?'❚❚':'▶';li.querySelector('button').setAttribute('aria-pressed',String(on&&playing));});}
 async function play(i){current=i;mark();const row=list.children[i];row.classList.add('loading');
  try{await audio.previewPlay(tracks[i].file,()=>{if(i+1<tracks.length)play(i+1);else{current=-1;mark();}});}catch{row.querySelector('.sr-time').textContent='再生できません';}
  row.classList.remove('loading');mark();}
 function toggle(i){if(i===current){audio.previewToggle();mark();}else play(i);}
 function frame(){if(!dialog.open){raf=null;return;}
  const el=audio.previewEl;if(el&&current>=0){const li=list.children[current],d=el.duration||tracks[current].duration;li.querySelector('.sr-progress i').style.width=(d?el.currentTime/d*100:0)+'%';li.querySelector('.sr-time').textContent=fmt(el.currentTime)+' / '+fmt(d);}
  const s=audio.readSpectrum(),n=s.length;barEls.forEach((b,k)=>{b.style.height=Math.min(52,3+(s[Math.floor(k/barEls.length*n)]||0)*80)+"px";});
  raf=requestAnimationFrame(frame);}
 async function open(){
  try{await audio.init();}catch{}
  tracks=ORDER.map(([route,i,name,sub,color])=>{const t=audio.custom?.[route]?.[i];return t&&t.file?{name,file:t.file,sub,color}:null;}).filter(Boolean);
  current=-1;render();dialog.showModal();if(raf===null)raf=requestAnimationFrame(frame);
 }
 $('soundRoomButton').addEventListener('click',open);
 // Stop at once when closing (the dialog's close event can arrive late), and again on close for Esc.
 const halt=()=>{audio.previewStop();current=-1;};
 $('soundRoomClose').addEventListener('click',()=>{halt();dialog.close();});dialog.addEventListener('cancel',halt);
 dialog.addEventListener('close',()=>{audio.previewStop();current=-1;if(raf!==null)cancelAnimationFrame(raf);raf=null;$('soundRoomButton').focus();});
})();
