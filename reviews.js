'use strict';
(() => {
 const page=document.querySelector('.reviews-page');if(!page)return;
 const cards=[...page.querySelectorAll('[data-review-source]')],filters=[...page.querySelectorAll('[data-review-filter]')],input=page.querySelector('#rv-search'),more=page.querySelector('#rv-more'),result=page.querySelector('#rv-results'),empty=page.querySelector('#rv-empty');
 let source='todos',limit=6;
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function render(){
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
