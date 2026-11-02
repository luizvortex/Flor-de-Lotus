'use strict';
(() => {
 document.querySelectorAll('[data-discovery-photos]').forEach(stage=>{
  const photos=JSON.parse(stage.dataset.discoveryPhotos),image=stage.querySelector('img'),counter=stage.querySelector('.explore-card-counter');
  let target=0,sequence=0;
  stage.querySelectorAll('[data-explore-card-prev],[data-explore-card-next]').forEach(button=>button.addEventListener('click',()=>{
   target=(target+(button.hasAttribute('data-explore-card-prev')?-1:1)+photos.length)%photos.length;
   const selected=target,request=++sequence,photo=photos[selected],next=new Image();
   next.onload=()=>{if(request!==sequence)return;image.src=next.src;image.alt=photo.alt;counter.textContent=`${selected+1} / ${photos.length}`;button.removeAttribute('title');};
   next.onerror=()=>{if(request===sequence){target=Number(counter.textContent.split('/')[0])-1;button.title='Não foi possível carregar a foto. Tente novamente.';}};
   next.src=photo.url.startsWith('/')?`/_next/image?url=${encodeURIComponent(photo.url)}&w=1080&q=75`:photo.url;
  }));
 });
})();
