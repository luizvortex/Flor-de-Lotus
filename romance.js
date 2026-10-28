'use strict';
(() => {
 const section=document.querySelector('.romance-section');
 if(!section)return;
 const photos=Array.from(section.querySelectorAll('[data-romance-photo]'));
 const dialog=section.querySelector('.romance-dialog'),image=dialog.querySelector('figure img'),caption=dialog.querySelector('figcaption'),status=dialog.querySelector('[data-romance-status]');
 let index=0,opener;
 function show(next){
  index=(next+photos.length)%photos.length;
  const source=photos[index].querySelector('img');
  image.src=source.getAttribute('src');image.alt=source.alt;caption.textContent=source.alt;
  status.textContent=`Foto ${index+1} de ${photos.length}`;
 }
 photos.forEach((button,i)=>button.addEventListener('click',()=>{opener=button;show(i);dialog.showModal();}));
 dialog.querySelector('[data-romance-close]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-romance-prev]').addEventListener('click',()=>show(index-1));
 dialog.querySelector('[data-romance-next]').addEventListener('click',()=>show(index+1));
 dialog.querySelectorAll('[data-romance-prev],[data-romance-next]').forEach(button=>button.hidden=photos.length<2);
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1));}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{image.removeAttribute('src');opener?.focus({preventScroll:true});});
})();
