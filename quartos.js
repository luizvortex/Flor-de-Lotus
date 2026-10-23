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
  count.textContent=`${albumIndex+1} / ${activePhotos.length}`;
  count.setAttribute('aria-label',`Foto ${albumIndex+1} de ${activePhotos.length}`);
  rail.querySelectorAll('button').forEach((b,i)=>{if(i===albumIndex){b.setAttribute('aria-current','true');if(album.open){const left=b.offsetLeft-(rail.clientWidth-b.offsetWidth)/2;rail.scrollLeft=left;}}else b.removeAttribute('aria-current');});
 }
 function addFact(container,icon,label){
  const item=document.createElement('li'),symbol=document.createElement('i'),text=document.createElement('span');
  symbol.className='bi bi-'+(/^[a-z0-9-]+$/.test(icon)?icon:'check2');symbol.setAttribute('aria-hidden','true');text.textContent=label;
  item.append(symbol,text);container.append(item);
 }
 function paintDetails(room){
  const details=room.details||{};
  album.querySelector('[data-room-heading]').textContent=room.title;
  const highlights=album.querySelector('.showcase-album-highlights');highlights.replaceChildren();
  if(room.eyebrow)addFact(highlights,'bounding-box',room.eyebrow);
  if(details.bathroom?.length)addFact(highlights,'droplet','Banheiro privativo');
  const shortLabels={wifi:'Wi-Fi',tv:'Smart TV',snow:'Ar-condicionado','door-open':'Varanda com rede'};
  (room.features||[]).forEach(feature=>addFact(highlights,feature.icon,shortLabels[feature.icon]||feature.label));
  const beds=album.querySelector('[data-room-beds]');beds.textContent=details.beds||'';beds.hidden=!details.beds;
  album.querySelector('[data-room-description]').textContent=details.description||room.description||'';
  const groups=album.querySelector('[data-room-groups]');groups.replaceChildren();
  const sections=[['No seu banheiro privativo',details.bathroom],['Vista',details.views],['Comodidades do quarto',details.amenities]];
  if(!details.amenities?.length)sections[2][1]=(room.features||[]).map(feature=>feature.label);
  sections.forEach(([title,items])=>{
   if(!Array.isArray(items)||!items.length)return;
   const section=document.createElement('section'),heading=document.createElement('h4'),list=document.createElement('ul');
   section.className='showcase-album-facts';heading.textContent=title;
   items.forEach(label=>addFact(list,'check2',label));section.append(heading,list);groups.append(section);
  });
  const smoking=album.querySelector('[data-room-smoking]');smoking.replaceChildren();smoking.hidden=!details.smoking;
  if(details.smoking){const label=document.createElement('strong');label.textContent='Fumantes: ';smoking.append(label,document.createTextNode(details.smoking));}
 }
 function openAlbum(room,photos,index) {
  const title=room.title;
  paintDetails(room);
  activePhotos=photos;
  album.querySelector('h2').textContent=title;
  rail.replaceChildren(...photos.map((photo,i)=>{
   const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Ver foto ${i+1}`);
   const thumb=document.createElement('img');thumb.src=photo.url;thumb.alt='';button.append(thumb);
   button.addEventListener('click',()=>paintAlbum(i));return button;
  }));
  paintAlbum(index);album.showModal();album.scrollTop=0;album.querySelector('.showcase-album-body').scrollTop=0;document.body.classList.add('showcase-album-open');
 }
 album.querySelector('.showcase-album-close').addEventListener('click',()=>album.close());
 album.addEventListener('close',()=>document.body.classList.remove('showcase-album-open'));
 album.querySelector('[data-album-prev]').addEventListener('click',()=>paintAlbum(albumIndex-1));
 album.querySelector('[data-album-next]').addEventListener('click',()=>paintAlbum(albumIndex+1));
 album.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();paintAlbum(albumIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();paintAlbum(albumIndex+1);}});
 let touch;
 album.querySelector('.showcase-album-stage').addEventListener('touchstart',e=>{touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
 album.querySelector('.showcase-album-stage').addEventListener('touchend',e=>{if(!touch)return;const x=e.changedTouches[0].clientX-touch.x,y=e.changedTouches[0].clientY-touch.y;if(Math.abs(x)>50&&Math.abs(x)>Math.abs(y)*1.5)paintAlbum(albumIndex+(x<0?1:-1));touch=null;},{passive:true});
 // Scroll position drives the tilt; measure the untransformed article to avoid feedback.
 const galleries=Array.from(document.querySelectorAll('.room-showcase-gallery'));
 const scrollMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let scrollFrame=0;
 function alignGalleries(){
  scrollFrame=0;
  const height=window.innerHeight;
  const compact=window.innerWidth<=1000;
  galleries.forEach((gallery,index)=>{
   const article=gallery.closest('.room-showcase');
   const copy=article.querySelector('.showcase-copy');
   if(scrollMotion.matches){
    gallery.style.removeProperty('transform');
    copy.style.removeProperty('transform');copy.style.removeProperty('opacity');return;
   }
   const top=article.getBoundingClientRect().top;
   const progress=Math.max(0,Math.min(1,(height*.95-top)/(height*.63)));
   const remaining=1-progress;
   const textProgress=Math.max(0,Math.min(1,(height*.95-copy.getBoundingClientRect().top)/(height*.55)));
   const textRemaining=1-textProgress;
   const direction=index%2===0?1:-1;
   const distance=compact?24:Math.min(160,window.innerWidth*.12);
   copy.style.transform=textRemaining<.001?'none':`translateX(${direction*distance*textRemaining}px)`;
   copy.style.opacity=String(Math.min(1,textProgress*1.5));
   gallery.style.transform=remaining<.001?'none':`perspective(1200px) translateY(${(compact?20:36)*remaining}px) rotateY(${-6*remaining}deg) rotateZ(${(compact?2:4)*remaining}deg) scale(${1-.035*remaining})`;
  });
 }
 function requestAlignment(){if(!scrollFrame)scrollFrame=requestAnimationFrame(alignGalleries);}
 window.addEventListener('scroll',requestAlignment,{passive:true});
 window.addEventListener('resize',requestAlignment,{passive:true});
 scrollMotion.addEventListener('change',requestAlignment);
 // Keyboard and pointer controls stay steady while someone interacts with a photo.
 galleries.forEach(gallery=>gallery.addEventListener('focusin',()=>{gallery.style.transform='none';}));
 alignGalleries();
 document.querySelectorAll('.room-showcase-gallery').forEach(gallery=>{
  let photos;try{photos=JSON.parse(gallery.dataset.photos);}catch{return;}
  let room;try{room=JSON.parse(gallery.dataset.room);}catch{room={title:gallery.dataset.title,features:[]};}
  let index=0;
  const main=gallery.querySelector('.showcase-main-image');
  const thumbs=Array.from(gallery.querySelectorAll('.showcase-thumb'));
  const status=gallery.querySelector('.showcase-photo-status');
  function show(next, announce=true){
   index=(next+photos.length)%photos.length;main.src=photos[index].url;main.alt=photos[index].alt;
   thumbs.forEach((button,i)=>{const next=(index+i+1)%photos.length;button.dataset.photoIndex=next;button.setAttribute('aria-label',`Destacar ${photos[next].alt}`);const img=button.querySelector('img');img.src=photos[next].url;img.alt=photos[next].alt;});
   if(announce)status.textContent=`Foto ${index+1} de ${photos.length}`;
  }
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, hovered=false, timer;
  function schedule(){
   clearTimeout(timer);
   if(!visible||hovered||document.hidden||album.open||motion.matches||gallery.contains(document.activeElement))return;
   timer=setTimeout(()=>{show(index+1,false);schedule();},3000);
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.25});
  observer.observe(gallery);
  gallery.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;schedule();}});
  gallery.addEventListener('pointerleave',()=>{hovered=false;schedule();});
  gallery.addEventListener('focusin',schedule);
  gallery.addEventListener('focusout',()=>setTimeout(schedule,0));
  gallery.addEventListener('click',schedule);
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',schedule);
  new MutationObserver(schedule).observe(album,{attributes:true,attributeFilter:['open']});
  gallery.querySelector('.showcase-prev').addEventListener('click',()=>show(index-1));
  gallery.querySelector('.showcase-next').addEventListener('click',()=>show(index+1));
  thumbs.forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.photoIndex))));
  gallery.querySelector('.showcase-view-photos').addEventListener('click',()=>openAlbum(room,photos,index));
  gallery.querySelector('.showcase-main-open').addEventListener('click',()=>openAlbum(room,photos,index));
 });
})();
