'use strict';
(() => {
 const page=document.querySelector('.explore-page');if(!page)return;
 const cards=[...page.querySelectorAll('[data-explore-category]')],filters=[...page.querySelectorAll('[data-explore-filter]')],search=page.querySelector('#explore-search'),result=page.querySelector('[data-explore-result]');
 let category='todos';
 const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 function filter(){const query=normalize(search.value);let count=0;cards.forEach(card=>{const visible=(category==='todos'||card.dataset.exploreCategory===category)&&normalize(card.dataset.exploreSearch).includes(query);card.hidden=!visible;if(visible)count++;});filters.forEach(b=>{const active=b.dataset.exploreFilter===category;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});result.textContent=`${count} ${count===1?'lugar encontrado':'lugares para descobrir'}`;page.querySelector('.explore-empty').hidden=count>0;}
 filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.exploreFilter;filter();}));search.addEventListener('input',filter);
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
