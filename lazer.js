'use strict';
(() => {
 const section=document.querySelector('#area-de-lazer.leisure-experience');if(!section)return;
 const choices=[...section.querySelectorAll('[data-leisure]')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const tones={sinuca:'#e9efea',churrasqueira:'#eee5d8',piscina:'#efe5e2'};
 let opened=null;
 const mobile=matchMedia('(max-width:767px)'),panels=choices.map(choice=>document.getElementById(choice.getAttribute('aria-controls')));
 function placePanels(){panels.forEach((panel,index)=>{if(mobile.matches)choices[index].after(panel);else section.querySelector('.leisure-panels').append(panel);});}
 mobile.addEventListener('change',placePanels);placePanels();
 function preview(choice){
  choices.forEach(item=>item.classList.toggle('is-preview',item===choice));
  section.style.setProperty('--leisure-tone',choice?tones[choice.dataset.leisure]:'#f7f7f2');
 }
 function expand(choice){
  opened=opened===choice?null:choice;
  choices.forEach(item=>{
   const isOpen=item===opened,panel=document.getElementById(item.getAttribute('aria-controls'));
   item.setAttribute('aria-expanded',String(isOpen));panel.setAttribute('aria-hidden',String(!isOpen));panel.inert=!isOpen;
  });
  preview(opened);
 }
 choices.forEach(choice=>{
  choice.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')preview(choice);});
  choice.addEventListener('pointermove',event=>{
   if(event.pointerType==='touch'||reduced.matches)return;
   const rect=choice.getBoundingClientRect();
   choice.style.setProperty('--leisure-x',`${((event.clientX-rect.left)/rect.width-.5)*36}px`);
   choice.style.setProperty('--leisure-y',`${((event.clientY-rect.top)/rect.height-.5)*20}px`);
  });
  choice.addEventListener('pointerleave',()=>{choice.style.removeProperty('--leisure-x');choice.style.removeProperty('--leisure-y');preview(opened);});
  choice.addEventListener('focus',()=>preview(choice));
  choice.addEventListener('blur',()=>preview(opened));
  choice.addEventListener('click',()=>expand(choice));
 });
 section.querySelectorAll('[data-leisure-close]').forEach(button=>button.addEventListener('click',()=>{const previous=opened;expand(null);previous?.focus({preventScroll:true});}));
 section.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){const previous=opened;expand(null);previous.focus({preventScroll:true});}});
})();
