'use strict';
(() => {
 const page=document.querySelector('.explore-page');if(!page)return;
 // A small pan and perspective tilt follow the mouse without moving the hit area.
 const desktopMotion=matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)'),reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 let motionTarget=null,motionFrame=0,mouseX=0,mouseY=0;
 const motionProperties=['--photo-pan-x','--photo-pan-y','--photo-rotate-x','--photo-rotate-y'];
 function resetMotion(){
  cancelAnimationFrame(motionFrame);motionFrame=0;
  if(motionTarget){motionTarget.classList.remove('is-pointer-follow');motionProperties.forEach(p=>motionTarget.style.removeProperty(p));motionTarget=null;}
 }
 function paintMotion(){
  motionFrame=0;if(!motionTarget)return;
  const rect=motionTarget.getBoundingClientRect();
  const x=Math.max(-1,Math.min(1,(mouseX-rect.left)/rect.width*2-1)),y=Math.max(-1,Math.min(1,(mouseY-rect.top)/rect.height*2-1));
  const hero=motionTarget.classList.contains('explore-hero');
  motionTarget.style.setProperty('--photo-pan-x',`${(x*(hero?16:10)).toFixed(2)}px`);
  motionTarget.style.setProperty('--photo-pan-y',`${(y*(hero?12:8)).toFixed(2)}px`);
  motionTarget.style.setProperty('--photo-rotate-x',`${(-y*(hero?1.2:2.5)).toFixed(2)}deg`);
  motionTarget.style.setProperty('--photo-rotate-y',`${(x*(hero?1.5:2.5)).toFixed(2)}deg`);
 }
 function followMouse(event){
  if(event.pointerType!=='mouse'||!desktopMotion.matches||reducedMotion.matches)return;
  const target=event.currentTarget;
  if(motionTarget!==target){resetMotion();motionTarget=target;target.classList.add('is-pointer-follow');}
  mouseX=event.clientX;mouseY=event.clientY;if(!motionFrame)motionFrame=requestAnimationFrame(paintMotion);
 }
 page.querySelectorAll('.explore-hero,.explore-photo-button').forEach(target=>{
  target.addEventListener('pointerenter',followMouse,{passive:true});target.addEventListener('pointermove',followMouse,{passive:true});
  target.addEventListener('pointerleave',resetMotion);target.addEventListener('pointercancel',resetMotion);
 });
 desktopMotion.addEventListener('change',resetMotion);reducedMotion.addEventListener('change',resetMotion);
 window.addEventListener('blur',resetMotion);window.addEventListener('resize',resetMotion);window.addEventListener('scroll',resetMotion,{passive:true});
 const cards=[...page.querySelectorAll('[data-explore-category]')],filters=[...page.querySelectorAll('[data-explore-filter]')],search=page.querySelector('#explore-search'),result=page.querySelector('[data-explore-result]');
 let category='todos';
 const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function filter(){const query=normalize(search.value);let count=0;cards.forEach(card=>{const visible=(category==='todos'||card.dataset.exploreCategory===category)&&normalize(card.dataset.exploreSearch).includes(query);card.hidden=!visible;if(visible)count++;});filters.forEach(b=>{const active=b.dataset.exploreFilter===category;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});result.textContent=`${count} ${count===1?'lugar encontrado':'lugares para descobrir'}`;page.querySelector('.explore-empty').hidden=count>0;}
 filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.exploreFilter;filter();}));search.addEventListener('input',filter);
 // Decode upcoming images before the click. A shared, bounded worker queue keeps
 // background work from competing with the cover or the image being requested.
 const photoCache=new Map(),photoQueue=[];let photoWorkers=0,photoClock=0;
 function trimPhotoCache(){for(const [width,limit] of [[828,24],[1200,4]]){const ready=[...photoCache.values()].filter(e=>e.ready&&e.width===width).sort((a,b)=>b.used-a.used);ready.slice(limit).forEach(e=>photoCache.delete(e.url));}}
 const photoUrl=(photo,width=828)=>photo.url.startsWith('/')?`/_next/image?url=${encodeURIComponent(photo.url)}&w=${width}&q=75`:photo.url;
 function runPhotoQueue(){
  photoQueue.sort((a,b)=>b.priority-a.priority);
  while(photoQueue.length&&(photoWorkers<3||(photoQueue[0].priority>=50&&photoWorkers<5))){
   const entry=photoQueue.shift();photoWorkers++;
   entry.image=new Image();entry.image.decoding='async';entry.image.fetchPriority=entry.priority>=50?'high':'low';entry.image.src=entry.url;
   entry.image.decode().then(()=>{entry.ready=true;entry.resolve(entry);trimPhotoCache();}).catch(error=>{photoCache.delete(entry.url);entry.reject(error);}).finally(()=>{photoWorkers--;runPhotoQueue();});
  }
 }
 function preparePhoto(photo,width=828,priority=0){
  const url=photoUrl(photo,width);let entry=photoCache.get(url);
  if(entry){entry.used=++photoClock;entry.priority=Math.max(entry.priority,priority);if(entry.image&&priority>=50)entry.image.fetchPriority='high';runPhotoQueue();return entry;}
  entry={url,width,priority,ready:false,image:null,used:++photoClock};entry.promise=new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject;});entry.promise.catch(()=>{});
  photoCache.set(url,entry);photoQueue.push(entry);runPhotoQueue();return entry;
 }
 const stageStates=new WeakMap();
 function stageState(stage){
  let state=stageStates.get(stage);if(state)return state;
  const open=stage.querySelector('[data-explore-photos]');let list;try{list=JSON.parse(open.dataset.explorePhotos);}catch{return null;}
  state={stage,open,img:open.querySelector('img'),list,target:Number(open.dataset.exploreStart||0),sequence:0};stageStates.set(stage,state);return state;
 }
 function warmStage(stage){
  const state=stageState(stage);if(!state||state.list.length<2)return;
  const next=(state.target+1)%state.list.length;
  preparePhoto(state.list[next],828,10);
  state.list.forEach((photo,n)=>{if(n!==next)preparePhoto(photo);});
 }
 const stages=[...page.querySelectorAll('.explore-photo-stage')];
 const warmObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){warmStage(entry.target);warmObserver.unobserve(entry.target);}});},{rootMargin:'700px 0px'});
 stages.forEach(stage=>{warmObserver.observe(stage);stage.addEventListener('pointerenter',()=>warmStage(stage),{passive:true});stage.addEventListener('touchstart',()=>warmStage(stage),{passive:true});stage.addEventListener('focusin',()=>warmStage(stage));});
 // Explicit clicks only: cached images commit immediately, with no disabled arrow
 // or busy cursor. Late responses cannot replace a newer selection.
 page.querySelectorAll('[data-explore-card-next]').forEach(next=>next.addEventListener('click',()=>{
  const state=stageState(next.closest('.explore-photo-stage'));if(!state||state.list.length<2)return;
  state.target=(state.target+1)%state.list.length;const selected=state.target,sequence=++state.sequence,photo=state.list[selected],entry=preparePhoto(photo,828,100);
  const commit=()=>{
   if(sequence!==state.sequence)return;
   state.img.src=entry.url;state.img.alt=photo.alt;state.open.dataset.exploreStart=String(selected);
   state.stage.querySelector('.explore-card-counter').textContent=`${selected+1} / ${state.list.length}`;
   if(!reducedMotion.matches){state.img.getAnimations().forEach(a=>{if(a.effect?.getKeyframes().some(k=>'opacity' in k))a.cancel();});state.img.animate([{opacity:.85},{opacity:1}],{duration:120,easing:'ease-out'});}
   next.removeAttribute('title');warmStage(state.stage);
  };
  if(entry.ready)commit();else entry.promise.then(commit).catch(()=>{if(sequence===state.sequence){state.target=Number(state.open.dataset.exploreStart||0);next.title='Não foi possível carregar a foto. Tente novamente.';}});
 }));
 const album=page.querySelector('#explore-album'),image=album.querySelector('#explore-album-image'),thumbs=album.querySelector('.explore-album-thumbs'),counter=album.querySelector('#explore-album-count');
 let photos=[],index=0,opener;
 let albumSequence=0;
 function paint(){
  const photo=photos[index],sequence=++albumSequence,small=preparePhoto(photo,828,100),large=preparePhoto(photo,1200,60);
  image.alt=photo.alt;
  const show=entry=>{if(sequence===albumSequence)image.src=entry.url;};
  if(large.ready)show(large);else if(small.ready)show(small);else small.promise.then(entry=>{if(!large.ready)show(entry);}).catch(()=>{});
  if(!large.ready)large.promise.then(show).catch(()=>{});
  counter.textContent=`${index+1} de ${photos.length} · ${photo.alt}`;thumbs.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===index)));
  album.querySelectorAll('[data-explore-prev],[data-explore-next]').forEach(b=>b.hidden=photos.length<2);
  for(const n of new Set([(index+1)%photos.length,(index-1+photos.length)%photos.length]))preparePhoto(photos[n],1200,20);
 }
 const advance=step=>{index=(index+step+photos.length)%photos.length;paint();};
 page.addEventListener('click',event=>{const button=event.target.closest('[data-explore-photos]');if(!button)return;
  try{photos=JSON.parse(button.dataset.explorePhotos);}catch{return;}
  if(!photos.length)return;opener=button;index=Math.min(Number(button.dataset.exploreStart||0),photos.length-1);album.querySelector('#explore-album-title').textContent=button.dataset.exploreTitle;
  thumbs.replaceChildren(...photos.map((photo,n)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Foto ${n+1}: ${photo.alt}`);const img=document.createElement('img');img.src=photo.url.startsWith('/')?`/_next/image?url=${encodeURIComponent(photo.url)}&w=256&q=75`:photo.url;img.alt='';img.loading='lazy';b.append(img);b.addEventListener('click',()=>{index=n;paint();});return b;}));
  paint();album.showModal();document.body.classList.add('explore-album-open');
 });
 album.querySelector('[data-explore-close]').addEventListener('click',()=>album.close());album.querySelector('[data-explore-prev]').addEventListener('click',()=>advance(-1));album.querySelector('[data-explore-next]').addEventListener('click',()=>advance(1));
 album.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1);}});
 album.addEventListener('close',()=>{document.body.classList.remove('explore-album-open');albumSequence++;image.removeAttribute('src');opener?.focus({preventScroll:true});});
 album.addEventListener('click',event=>{if(event.target===album){const rect=album.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)album.close();}});
 // Deep links from the homepage stay visible even if a filter was selected earlier.
 function showLinkedDestination(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const linked=cards.find(c=>c.id===id);if(linked){category='todos';search.value='';filter();linked.scrollIntoView({block:'start'});}}
 window.addEventListener('hashchange',showLinkedDestination);if(location.hash)showLinkedDestination();
})();
