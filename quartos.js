'use strict';
(() => {
 const album = document.getElementById('showcase-album');
 if (!album) return;
 let activePhotos = [], albumIndex = 0;
 const image = album.querySelector('.showcase-album-image');
 const count = album.querySelector('.showcase-album-count');
 const rail = album.querySelector('.showcase-album-thumbs');
 function paintAlbum(next) {
  albumIndex=(next+activePhotos.length)%activePhotos.length;
  image.src=activePhotos[albumIndex].url;image.alt=activePhotos[albumIndex].alt;
  count.textContent=`${albumIndex+1} de ${activePhotos.length} fotos`;
  rail.querySelectorAll('button').forEach((b,i)=>{if(i===albumIndex)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
 }
 function openAlbum(title,photos,index) {
  activePhotos=photos;
  album.querySelector('h2').textContent=title;
  rail.replaceChildren(...photos.map((photo,i)=>{
   const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Ver foto ${i+1}`);
   const thumb=document.createElement('img');thumb.src=photo.url;thumb.alt='';button.append(thumb);
   button.addEventListener('click',()=>paintAlbum(i));return button;
  }));
  paintAlbum(index);album.showModal();document.body.classList.add('showcase-album-open');
 }
 album.querySelector('.showcase-album-close').addEventListener('click',()=>album.close());
 album.addEventListener('close',()=>document.body.classList.remove('showcase-album-open'));
 album.querySelector('[data-album-prev]').addEventListener('click',()=>paintAlbum(albumIndex-1));
 album.querySelector('[data-album-next]').addEventListener('click',()=>paintAlbum(albumIndex+1));
 album.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();paintAlbum(albumIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();paintAlbum(albumIndex+1);}});
 let touch;
 album.querySelector('.showcase-album-stage').addEventListener('touchstart',e=>{touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
 album.querySelector('.showcase-album-stage').addEventListener('touchend',e=>{if(!touch)return;const x=e.changedTouches[0].clientX-touch.x,y=e.changedTouches[0].clientY-touch.y;if(Math.abs(x)>50&&Math.abs(x)>Math.abs(y)*1.5)paintAlbum(albumIndex+(x<0?1:-1));touch=null;},{passive:true});
 document.querySelectorAll('.room-showcase-gallery').forEach(gallery=>{
  let photos;try{photos=JSON.parse(gallery.dataset.photos);}catch{return;}
  let index=0;
  const main=gallery.querySelector('.showcase-main-image');
  const thumbs=Array.from(gallery.querySelectorAll('.showcase-thumb'));
  const status=gallery.querySelector('.showcase-photo-status');
  function show(next){
   index=(next+photos.length)%photos.length;main.src=photos[index].url;main.alt=photos[index].alt;
   thumbs.forEach((button,i)=>{const next=(index+i+1)%photos.length;button.dataset.photoIndex=next;button.setAttribute('aria-label',`Destacar ${photos[next].alt}`);const img=button.querySelector('img');img.src=photos[next].url;img.alt=photos[next].alt;});
   status.textContent=`Foto ${index+1} de ${photos.length}`;
  }
  gallery.querySelector('.showcase-prev').addEventListener('click',()=>show(index-1));
  gallery.querySelector('.showcase-next').addEventListener('click',()=>show(index+1));
  thumbs.forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.photoIndex))));
  gallery.querySelector('.showcase-view-photos').addEventListener('click',()=>openAlbum(gallery.dataset.title,photos,index));
  gallery.querySelector('.showcase-main-open').addEventListener('click',()=>openAlbum(gallery.dataset.title,photos,index));
 });
})();
