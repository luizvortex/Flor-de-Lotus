'use strict';
(() => {
 const hoverCards=[...document.querySelectorAll('.rv-review-card')];
 const desktopGlow=matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)'),reduceGlow=matchMedia('(prefers-reduced-motion:reduce)');
 let glowCard=null,glowFrame=0,glowX=0,glowY=0;
 function clearGlow(){cancelAnimationFrame(glowFrame);glowFrame=0;if(glowCard){glowCard.classList.remove('has-cursor-glow');glowCard.style.removeProperty('--glow-x');glowCard.style.removeProperty('--glow-y');glowCard=null;}}
 function paintGlow(){glowFrame=0;if(!glowCard||glowCard.hidden||!desktopGlow.matches||reduceGlow.matches){clearGlow();return;}const rect=glowCard.getBoundingClientRect();glowCard.style.setProperty('--glow-x',`${(glowX-rect.left).toFixed(1)}px`);glowCard.style.setProperty('--glow-y',`${(glowY-rect.top).toFixed(1)}px`);glowCard.classList.add('has-cursor-glow');}
 function followGlow(event){if(event.pointerType!=='mouse'||!desktopGlow.matches||reduceGlow.matches)return;if(glowCard!==event.currentTarget){clearGlow();glowCard=event.currentTarget;}glowX=event.clientX;glowY=event.clientY;if(!glowFrame)glowFrame=requestAnimationFrame(paintGlow);}
 hoverCards.forEach(card=>{card.addEventListener('pointerenter',followGlow,{passive:true});card.addEventListener('pointermove',followGlow,{passive:true});card.addEventListener('pointerleave',clearGlow);card.addEventListener('pointercancel',clearGlow);});
 desktopGlow.addEventListener('change',clearGlow);reduceGlow.addEventListener('change',clearGlow);window.addEventListener('blur',clearGlow);window.addEventListener('scroll',()=>{if(!glowCard)return;const r=glowCard.getBoundingClientRect();if(glowX<r.left||glowX>r.right||glowY<r.top||glowY>r.bottom)clearGlow();else if(!glowFrame)glowFrame=requestAnimationFrame(paintGlow);},{passive:true});window.addEventListener('resize',clearGlow,{passive:true});document.addEventListener('visibilitychange',clearGlow);
 const page=document.querySelector('.reviews-page');if(!page)return;
 const cards=[...page.querySelectorAll('[data-review-source]')],filters=[...page.querySelectorAll('[data-review-filter]')],input=page.querySelector('#rv-search'),more=page.querySelector('#rv-more'),result=page.querySelector('#rv-results'),empty=page.querySelector('#rv-empty');
 let source='todos',limit=6;
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function render(){
  clearGlow();
  const term=normalize(input.value),matches=cards.filter(card=>(source==='todos'||card.dataset.reviewSource===source)&&normalize(card.dataset.reviewSearch).includes(term));
  cards.forEach(card=>{card.hidden=true;});matches.slice(0,limit).forEach(card=>{card.hidden=false;});
  filters.forEach(button=>{const active=button.dataset.reviewFilter===source;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
  const visible=Math.min(limit,matches.length);result.textContent=matches.length?`Mostrando ${visible} de ${matches.length} ${matches.length===1?'avaliação':'avaliações'}`:'Nenhuma avaliação encontrada';more.hidden=visible>=matches.length;empty.hidden=matches.length>0;
 }
 filters.forEach(button=>button.addEventListener('click',()=>{source=button.dataset.reviewFilter;limit=6;render();}));
 input.addEventListener('input',()=>{limit=6;render();});
 more.addEventListener('click',()=>{const previous=cards.filter(card=>!card.hidden).length;limit+=6;render();const next=cards.filter(card=>!card.hidden)[previous];if(next){next.setAttribute('tabindex','-1');next.focus({preventScroll:true});}});
 render();
})();
