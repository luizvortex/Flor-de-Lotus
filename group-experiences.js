'use strict';
(()=>{
 const root=document.querySelector('#group-experiences');
 if(!root||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}}),{threshold:0,rootMargin:'0px 0px 50px 0px'});
 const blocks=root.querySelectorAll('.group-home,.fishing-section');
 blocks.forEach(block=>{block.classList.add('group-reveal');observer.observe(block);});
 setTimeout(()=>{blocks.forEach(block=>block.classList.add('is-revealed'));observer.disconnect();},4000);
})();
