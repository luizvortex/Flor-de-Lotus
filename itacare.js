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
 // The card advances only on an explicit arrow click; there is no autoplay.
 page.querySelectorAll('[data-explore-card-next]').forEach(next=>next.addEventListener('click',async()=>{
  const stage=next.closest('.explore-photo-stage'),open=stage.querySelector('[data-explore-photos]'),img=open.querySelector('img');
  let list;try{list=JSON.parse(open.dataset.explorePhotos);}catch{return;}
  if(list.length<2||next.disabled)return;
  const selected=(Number(open.dataset.exploreStart||0)+1)%list.length,photo=list[selected];
  const url=photo.url.startsWith('/')?`/_next/image?url=${encodeURIComponent(photo.url)}&w=1080&q=75`:photo.url;
  next.disabled=true;stage.setAttribute('aria-busy','true');
  try{
   const preload=new Image();preload.src=url;await preload.decode();
   img.src=url;img.alt=photo.alt;open.dataset.exploreStart=String(selected);
   stage.querySelector('.explore-card-counter').textContent=`${selected+1} / ${list.length}`;
   if(!reducedMotion.matches)img.animate([{opacity:.55},{opacity:1}],{duration:280,easing:'ease-out'});
   next.removeAttribute('title');
  }catch{next.title='Não foi possível carregar a foto. Tente novamente.';}
  finally{next.disabled=false;stage.removeAttribute('aria-busy');}
 }));
 const album=page.querySelector('#explore-album'),image=album.querySelector('#explore-album-image'),thumbs=album.querySelector('.explore-album-thumbs'),counter=album.querySelector('#explore-album-count');
 let photos=[],index=0,opener;
 function paint(){const photo=photos[index];image.src=photo.url;image.alt=photo.alt;counter.textContent=`${index+1} de ${photos.length} · ${photo.alt}`;thumbs.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===index)));album.querySelectorAll('[data-explore-prev],[data-explore-next]').forEach(b=>b.hidden=photos.length<2);}
 const advance=step=>{index=(index+step+photos.length)%photos.length;paint();};
 page.addEventListener('click',event=>{const button=event.target.closest('[data-explore-photos]');if(!button)return;
  try{photos=JSON.parse(button.dataset.explorePhotos);}catch{return;}
  if(!photos.length)return;opener=button;index=Math.min(Number(button.dataset.exploreStart||0),photos.length-1);album.querySelector('#explore-album-title').textContent=button.dataset.exploreTitle;
  thumbs.replaceChildren(...photos.map((photo,n)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Foto ${n+1}: ${photo.alt}`);const img=document.createElement('img');img.src=photo.url.startsWith('/')?`/_next/image?url=${encodeURIComponent(photo.url)}&w=256&q=75`:photo.url;img.alt='';img.loading='lazy';b.append(img);b.addEventListener('click',()=>{index=n;paint();});return b;}));
  paint();album.showModal();document.body.classList.add('explore-album-open');
 });
 album.querySelector('[data-explore-close]').addEventListener('click',()=>album.close());album.querySelector('[data-explore-prev]').addEventListener('click',()=>advance(-1));album.querySelector('[data-explore-next]').addEventListener('click',()=>advance(1));
 album.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1);}});
 album.addEventListener('close',()=>{document.body.classList.remove('explore-album-open');image.removeAttribute('src');opener?.focus({preventScroll:true});});
 album.addEventListener('click',event=>{if(event.target===album){const rect=album.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)album.close();}});
 // Deep links from the homepage stay visible even if a filter was selected earlier.
 function showLinkedDestination(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const linked=cards.find(c=>c.id===id);if(linked){category='todos';search.value='';filter();linked.scrollIntoView({block:'start'});}}
 window.addEventListener('hashchange',showLinkedDestination);if(location.hash)showLinkedDestination();
})();
