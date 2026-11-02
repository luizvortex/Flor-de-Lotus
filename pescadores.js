(() => {
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
   if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
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
 buttons.forEach(button=>button.addEventListener('click',()=>{opener=button;show(Number(button.dataset.fishingPhoto));dialog.showModal();document.body.classList.add('photo-open');updateCarousel();}));
 dialog.querySelector('[data-photo-close]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-photo-prev]').addEventListener('click',()=>show(active-1));
 dialog.querySelector('[data-photo-next]').addEventListener('click',()=>show(active+1));
 dialog.querySelector('[data-photo-prev]').hidden=sources.length<2;dialog.querySelector('[data-photo-next]').hidden=sources.length<2;
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('photo-open');image.removeAttribute('src');opener?.focus();updateCarousel();});

 const carousel=document.querySelector('.fp-carousel'),wheel=carousel?.querySelector('[data-fishing-wheel]');
 if(!wheel)return;
 const tiles=[...wheel.querySelectorAll('.fp-wheel-photo')],toggle=carousel.querySelector('[data-wheel-toggle]'),wheelCaption=carousel.querySelector('[data-wheel-caption]');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let selected=9,paused=reduced.matches,hovering=false,visible=false,timer,animations=[],pointerPause;
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
  const sourceIndex=Number(tiles[selected].querySelector('button').dataset.fishingPhoto);
  wheelCaption.textContent=`${sourceIndex+1} / ${sources.length} · ${sources[sourceIndex].alt}`;
 }
 function advance(direction){const previous=tiles.map((_,index)=>slotOf(index));selected=(selected+direction+10)%10;render(previous);}
 function schedule(){
  clearTimeout(timer);
  toggle.textContent=paused?'Reproduzir':'Pausar';toggle.setAttribute('aria-pressed',String(paused));
  if(paused||hovering||!visible||document.hidden||dialog.open)return;
  timer=setTimeout(()=>{advance(-1);schedule();},3000);
 }
 updateCarousel=schedule;
 toggle.addEventListener('pointerdown',()=>{pointerPause=!paused;});
 toggle.addEventListener('click',()=>{paused=pointerPause??!paused;pointerPause=undefined;schedule();});
 carousel.querySelector('[data-wheel-prev]').addEventListener('click',()=>{paused=true;advance(1);schedule();});
 carousel.querySelector('[data-wheel-next]').addEventListener('click',()=>{paused=true;advance(-1);schedule();});
 // Keyboard focus stops autoplay until the visitor explicitly restarts it.
 carousel.addEventListener('focusin',()=>{paused=true;schedule();});
 carousel.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;schedule();}});
 carousel.addEventListener('pointerleave',()=>{hovering=false;schedule();});
 document.addEventListener('visibilitychange',schedule);
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;animations.forEach(animation=>animation.cancel());}schedule();});
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:0.15}).observe(wheel);}
 else {visible=true;}
 render();schedule();
})();
