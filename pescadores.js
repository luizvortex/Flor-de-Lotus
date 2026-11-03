(() => {
 const roomsPanel=document.querySelector('#fishing-rooms');
 if(roomsPanel){
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safePhoto=value=>typeof value==='string'&&!value.includes('..')&&(/^\/(img[^/]*|images)\/[^<>"\\]+\.(jpg|jpeg|png|webp)$/i.test(value)||/^https:\/\/asojfispuomhbfapqdmi\.supabase\.co\/storage\/v1\/object\/public\/lotus-showcase\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value));
  async function loadRooms(){
   roomsPanel.innerHTML='<p class="fp-room-status">Carregando acomodações do catálogo…</p>';
   try{
    const response=await fetch('/api/catalog',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();
    const data=await response.json();if(!Array.isArray(data.rooms)||!Array.isArray(data.showcases))throw Error();
    const inventory=data.rooms.filter(r=>r.active!==false&&r.active!==0);
    const selected=['duplo','triplo','familia'].map(slug=>data.showcases.find(s=>s.slug===slug)).filter(Boolean).map(row=>({row,units:window.lotusRoomCatalog.categoryRooms(row,inventory)})).filter(({row,units})=>units.length&&safePhoto(row.photos?.[0]?.url)&&units.every(u=>Number.isInteger(u.capacity)&&u.capacity>0));
    if(!selected.length)throw Error();
    // Editorial category capacities confirmed by the owner for this introduction.
    const categoryCapacity={duplo:3,triplo:3,familia:5};
    roomsPanel.innerHTML=selected.map(({row})=>{
     const description=String(row.description||'');
     const short=description.length>160?description.slice(0,160).replace(/\s+\S*$/,'')+'…':description;
     return `<article class="fp-room-card"><img src="${esc(row.photos[0].url)}" alt="${esc(row.photos[0].alt||row.title)}" loading="lazy" width="600" height="450"><div><h3>${esc(row.title)}</h3><p class="fp-room-capacity">Até ${categoryCapacity[row.slug]} pessoas por quarto</p><p>${esc(short)}</p></div></article>`;
    }).join('');
   }catch{roomsPanel.innerHTML='<p class="fp-room-status">Não foi possível carregar as acomodações. <button type="button" data-rooms-retry>Tentar novamente</button></p>';roomsPanel.querySelector('[data-rooms-retry]').addEventListener('click',loadRooms);}
  }
  loadRooms();
 }
 const header=document.querySelector('.fp-header');
 if(header){
  let frame=0;
  const paintHeader=()=>{header.classList.toggle('is-compact',window.scrollY>40);frame=0;};
  window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(paintHeader);},{passive:true});
  window.addEventListener('pageshow',paintHeader);
  paintHeader();
 }

 const contact=document.querySelector('#fishing-contact');
 const peopleInput=contact?.querySelector('#fishing-people');
 peopleInput?.addEventListener('input',()=>{
  peopleInput.value=peopleInput.value.replace(/[^0-9]/g,'').slice(0,2);
  peopleInput.setCustomValidity('');
 });
 contact?.addEventListener('submit',event=>{
  event.preventDefault();
  const name=contact.querySelector('#fishing-name');
  if(!name.value.trim()){name.setCustomValidity('Informe seu nome.');name.reportValidity();return;}
  const entry=contact.querySelector('#checkin').value,exit=contact.querySelector('#checkout').value;
  if(!entry||!exit||exit<=entry){
   contact.querySelector('#fishing-stay-summary').textContent='Escolha a data de entrada e a data de saída.';
   const trigger=contact.querySelector('#dates-trigger');
   if(trigger.getAttribute('aria-expanded')!=='true')setTimeout(()=>trigger.click(),0);
   return;
  }
  peopleInput.setCustomValidity(/^([1-9]|[1-5][0-9]|60)$/.test(peopleInput.value)?'':'Informe de 1 a 60 pessoas.');
  if(!contact.reportValidity())return;
  const people=contact.querySelector('#fishing-people').value;
  const format=value=>value.split('-').reverse().join('/');
  const nights=Math.round((new Date(exit+'T12:00:00Z')-new Date(entry+'T12:00:00Z'))/86400000);
  const url=new URL(contact.action);
  url.searchParams.set('text',`Oi, meu nome é ${name.value.trim()} e estou entrando em contato referente a um grupo de pescadores e gostaria de consultar a disponibilidade.\n\nQuantidade de pessoas: ${people}\nCheck-in: ${format(entry)}\nCheck-out: ${format(exit)}\nEstadia: ${nights} ${nights===1?'noite':'noites'}`);
  window.open(url.href,'_blank','noopener,noreferrer');
 });
 contact?.querySelector('#fishing-name').addEventListener('input',event=>event.target.setCustomValidity(''));
 contact?.addEventListener('lotus:dates-applied',()=>{
  const entry=contact.querySelector('#checkin').value,exit=contact.querySelector('#checkout').value;
  const nights=Math.round((new Date(exit+'T12:00:00Z')-new Date(entry+'T12:00:00Z'))/86400000);
  contact.querySelector('#fishing-stay-summary').textContent=`${nights} ${nights===1?'noite':'noites'}`;
 });
 const buttons=[...document.querySelectorAll('[data-fishing-photo]')],dialog=document.querySelector('.fp-lightbox');
 if(!buttons.length||!dialog)return;
 // The wheel repeats registered photos when needed; the lightbox lists each original only once.
 const sources=[];
 buttons.forEach(button=>{sources[Number(button.dataset.fishingPhoto)]=button.querySelector('img');});
 const image=dialog.querySelector('[data-photo-large]'),caption=dialog.querySelector('[data-photo-caption]');
 let active=0,opener,updateCarousel=()=>{};
 function show(index){active=(index+sources.length)%sources.length;const source=sources[active];image.src=source.src;image.alt=source.alt;caption.textContent=`${active+1} / ${sources.length} · ${source.alt}`;}
 buttons.forEach(button=>button.addEventListener('click',event=>{dialog.classList.toggle('photo-pointer-open',event.detail>0);opener=button;show(Number(button.dataset.fishingPhoto));dialog.showModal();document.body.classList.add('photo-open');updateCarousel();}));
 dialog.querySelector('[data-photo-close]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-photo-prev]').addEventListener('click',()=>show(active-1));
 dialog.querySelector('[data-photo-next]').addEventListener('click',()=>show(active+1));
 dialog.querySelector('[data-photo-prev]').hidden=sources.length<2;dialog.querySelector('[data-photo-next]').hidden=sources.length<2;
 dialog.addEventListener('keydown',event=>{if(event.key==='Tab')dialog.classList.remove('photo-pointer-open');if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('photo-open');image.removeAttribute('src');opener?.focus();updateCarousel();});

 const carousel=document.querySelector('.fp-carousel'),wheel=carousel?.querySelector('[data-fishing-wheel]');
 if(!wheel)return;
 const tiles=[...wheel.querySelectorAll('.fp-wheel-photo')];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),desktopCarousel=matchMedia('(min-width:768px)');
 let selected=9,paused=reduced.matches,hovering=false,visible=false,timer,animations=[];
 const slotOf=index=>(index-selected+19)%10;
 function position(slot){
  if(slot===9)return {left:'50%',top:'50%',width:'44%'};
  const angle=(slot*40-90)*Math.PI/180;
  return {left:`${50+37*Math.cos(angle)}%`,top:`${50+37*Math.sin(angle)}%`,width:`${10+slot*1.5}%`};
 }
 function path(from,to){
  const start=position(from),end=position(to);
  // Sample the circular path so orbiting photos travel along the ring, upright.
  return Array.from({length:13},(_,i)=>{
   const progress=i/12;
   if(from===9||to===9)return Object.fromEntries(['left','top','width'].map(key=>[key,`${parseFloat(start[key])+(parseFloat(end[key])-parseFloat(start[key]))*progress}%`]));
   return position(from+(to-from)*progress);
  });
 }
 function render(previous){
  animations.forEach(animation=>animation.cancel());animations=[];
  tiles.forEach((tile,index)=>{
   const slot=slotOf(index),button=tile.querySelector('button');
   tile.dataset.wheelSlot=String(slot);Object.assign(tile.style,position(slot));
   if(slot===9)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
   if(previous&&!reduced.matches&&tile.animate)animations.push(tile.animate(path(previous[index],slot),{duration:800,easing:'cubic-bezier(.4,0,.2,1)'}));
  });
 }
 function advance(direction){const previous=tiles.map((_,index)=>slotOf(index));selected=(selected+direction+10)%10;render(previous);}
 function schedule(){
  clearTimeout(timer);
  if(paused||!visible||document.hidden||dialog.open||(!desktopCarousel.matches&&(hovering||carousel.matches(':focus-within'))))return;
  timer=setTimeout(()=>{advance(-1);schedule();},2000);
 }
 updateCarousel=schedule;
 carousel.querySelector('[data-wheel-prev]').addEventListener('click',()=>{advance(1);schedule();});
 carousel.querySelector('[data-wheel-next]').addEventListener('click',()=>{advance(-1);schedule();});
 // Desktop keeps moving under the pointer; opening the lightbox pauses it.
 carousel.addEventListener('focusin',()=>{if(!desktopCarousel.matches)schedule();});
 carousel.addEventListener('focusout',()=>{if(!desktopCarousel.matches)requestAnimationFrame(schedule);});
 carousel.addEventListener('pointerenter',event=>{if(!desktopCarousel.matches&&event.pointerType==='mouse'){hovering=true;schedule();}});
 carousel.addEventListener('pointerleave',()=>{hovering=false;if(!desktopCarousel.matches)schedule();});
 desktopCarousel.addEventListener('change',schedule);
 document.addEventListener('visibilitychange',schedule);
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;animations.forEach(animation=>animation.cancel());}schedule();});
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:0.15}).observe(wheel);}
 else {visible=true;}
 render();schedule();
})();
