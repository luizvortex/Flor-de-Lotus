'use strict';
(() => {
 const section=document.querySelector('#area-de-lazer.leisure-experience');if(!section)return;
 const choices=[...section.querySelectorAll('[data-leisure]')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const tones={sinuca:'#f0e8df',churrasqueira:'#eee5d9',piscina:'#f3eee7'};
 let opened=null;
 const stage=section.querySelector('.leisure-choices'),images=choices.map(choice=>choice.querySelector('.leisure-preview'));
 const layer=document.createElement('div');layer.className='leisure-image-layer';layer.setAttribute('aria-hidden','true');stage.prepend(layer);
 const mobile=matchMedia('(max-width:767px)'),panels=choices.map(choice=>document.getElementById(choice.getAttribute('aria-controls')));
 function placePanels(){images.forEach((image,index)=>{if(mobile.matches)choices[index].prepend(image);else layer.append(image);image.style.removeProperty('--leisure-x');image.style.removeProperty('--leisure-y');});panels.forEach((panel,index)=>{if(mobile.matches)choices[index].after(panel);else section.querySelector('.leisure-panels').append(panel);});preview(mobile.matches?opened:null);}
 mobile.addEventListener('change',placePanels);placePanels();
 function preview(choice){
  choices.forEach((item,index)=>{item.classList.toggle('is-preview',item===choice);images[index].classList.toggle('is-visible',item===choice);});
  if(choice&&!mobile.matches){const image=images[choices.indexOf(choice)];if(!image.style.getPropertyValue('--leisure-x')){const rect=choice.getBoundingClientRect(),bounds=stage.getBoundingClientRect();image.style.setProperty('--leisure-x',`${rect.left-bounds.left+rect.width/2-image.offsetWidth/2}px`);image.style.setProperty('--leisure-y',`${(bounds.height-image.offsetHeight)/2}px`);}}
  (section.closest('main')||section.parentElement).style.setProperty('--leisure-tone',choice?(tones[choice.dataset.leisure]||'#f3eee7'):'#f7f7f2');
 }
 function revealDescription(choice){
  if(mobile.matches||opened!==choice)return;
  const panel=document.getElementById(choice.getAttribute('aria-controls'));
  const content=panel.querySelector('.leisure-panel-content');
  // The desktop panels share one slot. Use its final position while the
  // accordion animates, so scrolling starts immediately on the click.
  const panelTop=section.querySelector('.leisure-panels').getBoundingClientRect().top;
  const contentTop=panelTop+parseFloat(getComputedStyle(content).marginTop);
  const height=content.getBoundingClientRect().height;
  const rect={top:contentTop,bottom:contentTop+height,height};
  const header=document.querySelector('.home-header'),top=(header?Math.max(0,header.getBoundingClientRect().bottom):0)+24;
  const bottom=window.innerHeight-24;
  let delta=0;
  if(rect.height>bottom-top||rect.top<top)delta=rect.top-top;
  else if(rect.bottom>bottom)delta=rect.bottom-bottom;
  if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:reduced.matches?'instant':'smooth'});
 }
 function expand(choice){
  opened=opened===choice?null:choice;
  choices.forEach(item=>{
   const isOpen=item===opened,panel=document.getElementById(item.getAttribute('aria-controls'));
   item.setAttribute('aria-expanded',String(isOpen));panel.setAttribute('aria-hidden',String(!isOpen));panel.inert=!isOpen;
  });
  preview(mobile.matches?opened:choices.find(item=>item.matches(':hover, :focus-visible'))||null);
  if(opened&&!mobile.matches)revealDescription(opened);
 }
 choices.forEach(choice=>{
  choice.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')preview(choice);});
  choice.addEventListener('pointermove',event=>{
   if(event.pointerType==='touch'||reduced.matches)return;
   if(mobile.matches)return;
   const rect=stage.getBoundingClientRect(),image=images[choices.indexOf(choice)],w=image.offsetWidth,h=image.offsetHeight;
   const x=Math.max(-w*.3,Math.min(rect.width-w*.7,event.clientX-rect.left-w/2));
   const y=Math.max(-h*.3,Math.min(rect.height-h*.7,event.clientY-rect.top-h/2));
   image.style.setProperty('--leisure-x',`${x}px`);image.style.setProperty('--leisure-y',`${y}px`);
  });
  choice.addEventListener('pointerleave',()=>preview(mobile.matches?opened:null));
  choice.addEventListener('focus',()=>{if(choice.matches(':focus-visible'))preview(choice);});
  choice.addEventListener('blur',()=>preview(mobile.matches?opened:null));
  choice.addEventListener('click',()=>expand(choice));
 });
 section.querySelectorAll('[data-leisure-close]').forEach(button=>button.addEventListener('click',()=>{const previous=opened;expand(null);previous?.focus({preventScroll:true});}));
 section.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){const previous=opened;expand(null);previous.focus({preventScroll:true});}});
})();
