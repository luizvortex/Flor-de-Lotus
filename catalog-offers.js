'use strict';
(() => {
 const section=document.querySelector('#catalog-offers');
 if(!section||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 section.classList.add('experience-entering');
 const reveal=()=>{section.classList.remove('experience-entering');section.classList.add('experience-revealed');observer.disconnect();};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))reveal();},{threshold:0,rootMargin:'0px 0px 60px 0px'});
 observer.observe(section);
 // Content stays readable even when a browser never delivers an intersection callback.
 setTimeout(reveal,3000);
})();
