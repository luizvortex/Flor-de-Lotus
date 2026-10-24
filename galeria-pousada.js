'use strict';
(() => {
 const gallery=document.querySelector('.pousada-gallery');if(!gallery)return;
 const viewport=gallery.querySelector('.pousada-gallery-viewport');
 const track=gallery.querySelector('.pousada-gallery-track');
 const slides=Array.from(track.children),total=slides.length,clones=Math.min(3,slides.length);
 if(total<2)return;
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const status=gallery.querySelector('[data-gallery-status]');
 let index=clones,step=0,offset=0,timer,settleTimer,visible=false,moving=false;
 function clone(slide){const copy=slide.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.removeAttribute('aria-label');copy.querySelector('img').alt='';return copy;}
 track.prepend(...slides.slice(-clones).map(clone));track.append(...slides.slice(0,clones).map(clone));
 function paint(animate){track.style.transition=animate?'':'none';track.style.transform=`translateX(${offset-index*step}px)`;}
 function schedule(){
  clearTimeout(timer);
  if(!visible||document.hidden)return;
  timer=setTimeout(()=>{advance(1,false);schedule();},1000*(window.matchMedia('(max-width: 767px)').matches?Number(gallery.dataset.mobileDelay||2):Number(gallery.dataset.desktopDelay||3)));
 }
 function settle(){
  clearTimeout(settleTimer);moving=false;
  if(index>=clones+total){index-=total;paint(false);}
  if(index<clones){index+=total;paint(false);}
 }
 function advance(direction,announce=true){
  if(moving)return;
  moving=true;index+=direction;paint(!motion.matches);
  if(announce)status.textContent=`Foto ${((index-clones)%total+total)%total+1} de ${total}`;
  clearTimeout(settleTimer);settleTimer=setTimeout(settle,motion.matches?0:900);
 }
 function resize(){
  settle();
  const style=getComputedStyle(gallery);
  step=viewport.clientWidth/parseFloat(style.getPropertyValue('--gallery-visible'));
  offset=parseFloat(style.getPropertyValue('--gallery-center'))*(viewport.clientWidth-step)/2;
  paint(false);schedule();
 }
 track.addEventListener('transitionend',event=>{if(event.propertyName==='transform')settle();});
 new ResizeObserver(resize).observe(viewport);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.2}).observe(gallery);
 gallery.querySelector('[data-gallery-prev]').addEventListener('click',()=>{advance(-1);schedule();});
 gallery.querySelector('[data-gallery-next]').addEventListener('click',()=>{advance(1);schedule();});
 gallery.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowRight'?1:-1);schedule();}});
 let touch;
 viewport.addEventListener('touchstart',event=>{touch={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};clearTimeout(timer);},{passive:true});
 viewport.addEventListener('touchend',event=>{
  if(touch){const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)advance(dx<0?1:-1);touch=null;}schedule();
 },{passive:true});
 viewport.addEventListener('touchcancel',()=>{touch=null;schedule();},{passive:true});
 document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',()=>{resize();});
 resize();
})();
