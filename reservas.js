'use strict';
(() => {
 let guestAuthenticated=false,bookingSubmitting=false,loginWindow,loginTimer,loginStarted=0;
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.addEventListener('lotus:guest-session',event=>{
  guestAuthenticated=event.detail.authenticated;
  const submit=$('#booking-form [type="submit"]');submit.disabled=bookingSubmitting||!selection;submit.textContent=guestAuthenticated?'Solicitar reserva':'Entrar com Google e continuar';
  if(guestAuthenticated){stopLoginWatch();try{loginWindow?.close();}catch{}if($('#booking-login-dialog').open)$('#booking-login-dialog').close();}
  const note=$('[data-booking-account-note]');if(!note)return;
  if(event.detail.authenticated){note.textContent='Sua reserva ficará vinculada à conta Google. Acompanhe datas, status e avisos em Minha conta.';if(!$('#guest').value)$('#guest').value=event.detail.name;}
  else note.textContent='Entre com Google para registrar a solicitação na sua conta. Clique em Entrar com Google para continuar.';
  $('[data-booking-login]').hidden=guestAuthenticated;
 });
 function stopLoginWatch(){clearInterval(loginTimer);loginTimer=null;$('#booking-google-form [type="submit"]').disabled=false;}
 function loginStatus(text){$('[data-booking-login-status]').textContent=text;}
 function openBookingLogin(){
  if(!selection)return;
  loginStatus('Entre com Google. Em seguida, confira seus dados e clique em Solicitar reserva.');
  if(!$('#booking-login-dialog').open)$('#booking-login-dialog').showModal();
  document.dispatchEvent(new Event('lotus:refresh-guest-session'));
 }
 $('#booking-google-form').addEventListener('submit',event=>{
  if(!selection){event.preventDefault();return;}
  const w=500,h=Math.min(720,screen.availHeight||720);
  const left=Math.max(0,window.screenX+(window.outerWidth-w)/2),top=Math.max(0,window.screenY+(window.outerHeight-h)/2);
  try{loginWindow=window.open('','lotus-booking-google',`popup=yes,width=${w},height=${h},left=${left},top=${top}`);try{loginWindow?.sessionStorage.setItem('lotus-booking-login',String(Date.now()));}catch{}}catch{loginWindow=null;}
  event.currentTarget.target=loginWindow?'lotus-booking-google':'_blank';
  loginStarted=Date.now();stopLoginWatch();$('#booking-google-form [type="submit"]').disabled=true;
  loginStatus('Aguardando seu login na janela do Google. Se ela não abrir, use o link Minha conta abaixo.');
  loginTimer=setInterval(()=>{
   if(guestAuthenticated){stopLoginWatch();return;}
   document.dispatchEvent(new Event('lotus:refresh-guest-session'));
   let closed=false;try{closed=Boolean(loginWindow?.closed);}catch{}
   if(closed||Date.now()-loginStarted>300000){stopLoginWatch();loginStatus('Se você já entrou, clique em Já entrei, verificar acesso. Caso tenha cancelado, pode tentar novamente.');}
  },2000);
 });
 $('#booking-login-dialog').querySelectorAll('[data-close-booking-login]').forEach(button=>button.onclick=()=>$('#booking-login-dialog').close());
 $('#booking-login-dialog').addEventListener('close',()=>{stopLoginWatch();if($('#booking-dialog').open)$('#booking-form [type="submit"]').focus({preventScroll:true});});
 $('[data-booking-open-login]').onclick=openBookingLogin;
 $('#booking-form [type="submit"]').addEventListener('click',event=>{if(!guestAuthenticated){event.preventDefault();openBookingLogin();}});
 function checkReturnedLogin(){if(selection)document.dispatchEvent(new Event('lotus:refresh-guest-session'));}
 try{const channel=new BroadcastChannel('lotus-booking-login');channel.onmessage=()=>checkReturnedLogin();window.addEventListener('pagehide',()=>channel.close());}catch{}
 window.addEventListener('storage',event=>{if(event.key==='lotus-booking-login-complete')checkReturnedLogin();});
 document.addEventListener('lotus:guest-session-error',()=>{if($('#booking-login-dialog').open)loginStatus('Não foi possível verificar seu acesso. Tente novamente em Já entrei, verificar acesso.');});
 window.addEventListener('pagehide',stopLoginWatch);
 let shareTimer;
 const shareDialog=$('#share-dialog'),shareInput=$('#share-url');
 const shareUrl=()=>{const url=new URL(location.href);url.hash='';return url.href;};
 function shared(){const status=$('#share-status');status.textContent='Link copiado! Envie para quem vai viajar com você.';status.hidden=false;clearTimeout(shareTimer);shareTimer=setTimeout(()=>{status.hidden=true;},4500);}
 function manualShare(){shareInput.value=shareUrl();$('#share-copy-status').textContent='';shareDialog.showModal();shareInput.focus();shareInput.select();}
 $('#share-site').onclick=async()=>{
  const button=$('#share-site');button.disabled=true;
  try{
   if(navigator.share){try{await navigator.share({title:'Pousada Flor de Lótus · Itacaré',url:shareUrl()});return;}catch(error){if(error.name==='AbortError')return;}}
   try{await navigator.clipboard.writeText(shareUrl());shared();}catch{manualShare();}
  }finally{button.disabled=false;}
 };
 $('#close-share').onclick=()=>shareDialog.close();
 $('#copy-share').onclick=async()=>{try{await navigator.clipboard.writeText(shareInput.value);shareDialog.close();shared();}catch{shareInput.focus();shareInput.select();$('#share-copy-status').textContent='Selecione e copie o link acima para compartilhar.';}};
 const plural=(n,singular,pluralForm)=>`${n} ${Number(n)===1?singular:pluralForm}`;
 const money=n=>(Number(n)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dateLabel=v=>v.split('-').reverse().join('/');
 const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const dp=k=>dateParts.find(p=>p.type===k).value,today=`${dp('year')}-${dp('month')}-${dp('day')}`;
 const nextDay=(value,days=1)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const floorLabel=value=>({terreo:'Térreo',superior:'Piso superior'}[value]||'Andar a definir');
 const configuration=value=>({solteiro:'Single',casal:'Duplo',casal_mais_um:'Triplo',quadruplo:'Quádruplo',familia:'Família'}[value]||'Acomodação');
 const defaultSlug=r=>r.presentation_slug||r.showcase_slug||({familia:'familia',casal_mais_um:'triplo-standard'}[r.type]||'duplo');
 const photoUrl=url=>typeof url==='string'&&!url.includes('..')&&(/^\/(img[^/]*|images)\/[^<>"\\]+\.(jpg|jpeg|png|webp)$/i.test(url)||/^https:\/\/asojfispuomhbfapqdmi\.supabase\.co\/storage\/v1\/object\/public\/lotus-showcase\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url));
 let showcases=[],inventory=[],packages=[],available=[],lastQuery=null,nights=0,sequence=0,controller,selection=null,detail=null,detailIndex=0;
 const photoIndices=new Map();
 const reducedPhotos=matchMedia('(prefers-reduced-motion: reduce)'),mobilePhotos=matchMedia('(max-width:767px)');
 const transitions=new WeakMap();let carousels=[],warmObserver;
 const photoDelay=()=>mobilePhotos.matches?2000:3000;
 async function fadePhoto(image,photo){
  const previous=transitions.get(image);if(previous){previous.cancelled=true;previous.layer?.remove();}
  if(image.getAttribute('src')===photo.url){transitions.delete(image);image.alt=photo.alt;return;}
  const state={cancelled:false,layer:null};transitions.set(image,state);
  const layer=image.cloneNode(false);layer.removeAttribute('id');layer.loading='eager';layer.src=photo.url;layer.alt=photo.alt;
  try{await layer.decode();}catch{if(transitions.get(image)===state)transitions.delete(image);return;}
  if(state.cancelled||!image.isConnected)return;
  if(!reducedPhotos.matches){
   state.layer=layer;layer.classList.add('photo-transition');layer.setAttribute('aria-hidden','true');image.after(layer);
   try{await layer.animate([{opacity:0},{opacity:1}],{duration:550,easing:'ease-in-out',fill:'forwards'}).finished;}catch{}
  }
  if(!state.cancelled&&image.isConnected){image.src=photo.url;image.alt=photo.alt;}
  layer.remove();if(transitions.get(image)===state)transitions.delete(image);
 }
 function stepCard(card,step){
  const room=showcases.find(s=>s.slug===card.dataset.slug);if(!room)return;
  const index=((photoIndices.get(room.slug)||0)+step+room.photos.length)%room.photos.length;
  const next=room.photos[(index+1)%room.photos.length];if(next){const image=new Image();image.src=next.url;}
  photoIndices.set(room.slug,index);fadePhoto(card.querySelector('.card-photo img'),room.photos[index]);
  const carousel=carousels.find(c=>c.card===card);if(carousel)carousel.next=Date.now()+photoDelay();
 }
 function setupCarousels(){
  warmObserver?.disconnect();
  carousels=[...$('#rooms').querySelectorAll('.catalog-room')].map(card=>({card,next:Date.now()+photoDelay(),hover:false}));
  const warm=card=>{const room=showcases.find(s=>s.slug===card.dataset.slug);if(!room)return;const next=room.photos[((photoIndices.get(room.slug)||0)+1)%room.photos.length];if(next){const img=new Image();img.src=next.url;}};
  const observer=warmObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){warm(entry.target);observer.unobserve(entry.target);}},{rootMargin:'300px'});
  for(const carousel of carousels){observer.observe(carousel.card);
   const gallery=carousel.card.querySelector('.card-gallery');
   gallery.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')carousel.hover=true;});
   gallery.addEventListener('pointerleave',()=>{carousel.hover=false;carousel.next=Date.now()+photoDelay();});
   gallery.addEventListener('focusout',()=>{carousel.next=Date.now()+photoDelay();});
  }
 }
 setInterval(()=>{
  const now=Date.now(),blocked=document.hidden||reducedPhotos.matches||document.querySelector('dialog[open]');
  for(const carousel of carousels){
   const gallery=carousel.card.querySelector('.card-gallery'),rect=gallery.getBoundingClientRect();
   if(blocked||carousel.hover||gallery.contains(document.activeElement)||rect.bottom<=0||rect.top>=innerHeight){carousel.next=now+photoDelay();continue;}
   if(now>=carousel.next)stepCard(carousel.card,1);
  }
 },250);

 async function api(path,body,signal){
  const timeout=AbortSignal.timeout(15000);
  const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:signal?AbortSignal.any([signal,timeout]):timeout,cache:'no-store'}).catch(error=>{if(error.name==='TimeoutError')throw Error('A consulta demorou mais que o esperado. Tente novamente ou converse com a pousada pelo WhatsApp.');throw error;});
  const data=await response.json();if(!response.ok){const error=new Error(data.error||'Não foi possível concluir a consulta.');error.status=response.status;throw error;}return data;
 }
 function message(text,error=false){$('#message').textContent=text;$('#message').className=error?'error':'';}
 function query(){return {start:$('#checkin').value,end:$('#checkout').value,guests:Number($('#guests').value),package_id:$('#package').value||'',floor:$('#floor').value||''};}
 function focusSearch(){ $('#search').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$('#dates-trigger').focus({preventScroll:true});if($('#dates-trigger').getAttribute('aria-expanded')==='false')$('#dates-trigger').click(); }
 function categoryRooms(row,rooms){return rooms.filter(r=>row.slug==='duplo'?r.floor==='terreo':row.slug==='triplo'?r.floor==='superior':row.slug==='triplo-standard'?r.floor==='terreo'&&r.capacity>=3:row.slug==='familia'?r.capacity>=5:defaultSlug(r)===row.slug);}
 function rowsFor(row){return categoryRooms(row,lastQuery?available:inventory).sort((a,b)=>(lastQuery?a.total:a.price)-(lastQuery?b.total:b.price));}
 function applyCatalog(data){
  inventory=Array.isArray(data.rooms)?data.rooms:[];
  showcases=(data.showcases||[]).filter(s=>typeof s.title==='string'&&Array.isArray(s.photos)&&s.photos.some(p=>photoUrl(p.url))).map(s=>({...s,photos:s.photos.filter(p=>photoUrl(p.url)),features:Array.isArray(s.features)?s.features:[]}));

  packages=(data.packages||[]).filter(p=>p.end>today);
  if(!packages.some(p=>String(p.id)===$('#package').value))$('#package').value='';
  if(showcases[0]&&!$('#catalog-cover').dataset.cmsCover)$('#catalog-cover').src=showcases[0].photos[0].url;
  $('#special-packages').hidden=!packages.length;
  $('#more-packages').hidden=packages.length<=3;
  $('#packages').innerHTML=packages.slice(0,3).map(p=>`<article class="package-card"><h3>${esc(p.name)}</h3><p>${p.nights+1} dias · ${p.nights} noites<br>${dateLabel(p.start)} a ${dateLabel(p.end)}</p><p>${money(p.price)} <small>/ pacote por quarto</small></p><button type="button" class="gold-button" data-package="${p.id}">Consultar pacote</button></article>`).join('');
 }
 function inventoryFor(row){return categoryRooms(row,inventory).sort((a,b)=>a.price-b.price);}
 function unavailableReason(row){
  const rooms=inventoryFor(row),capacity=rooms.length?Math.max(...rooms.map(room=>room.capacity)):0;
  if(!rooms.length)return 'Esta categoria ainda não possui uma unidade ativa para reserva. Consulte a pousada.';
  if(lastQuery?.floor&&!rooms.some(room=>room.floor===lastQuery.floor))return `Não há unidades desta categoria cadastradas no ${floorLabel(lastQuery.floor).toLowerCase()}. Consulte outro andar ou converse com a pousada.`;
  if(lastQuery&&Number(lastQuery.guests)>capacity)return `Esta categoria está cadastrada para até ${plural(capacity,'hóspede','hóspedes')}. Ajuste a quantidade de pessoas ou consulte a pousada.`;
  return 'Sem disponibilidade para estas datas e hóspedes. Consulte outro período ou converse com a pousada.';
 }
 function whatsappLink(title,query=lastQuery,booking){
  const destination=document.body.dataset.contactWhatsapp;if(!/^\d{10,15}$/.test(destination||''))return '';
  const text=[booking?`Olá! Gostaria de acompanhar minha solicitação de reserva #${booking.id}.`:'Olá! Gostaria de consultar uma estadia na pousada.',`Acomodação: ${title}`,query?`Entrada: ${dateLabel(query.start)}\nSaída: ${dateLabel(query.end)}\nHóspedes: ${query.guests}${query.floor?'\nAndar: '+floorLabel(query.floor):''}`:'',booking?`Total da solicitação: ${money(booking.total)}. Aguardando confirmação da pousada.`:''].filter(Boolean).join('\n');
  return `https://wa.me/${destination}?${new URLSearchParams({text})}`;
 }
 function whatsappButton(title){const url=whatsappLink(title);return url?`<a class="text-button room-whatsapp" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Consultar a pousada no WhatsApp ↗</a>`:'';}
 function render(){
  const noAvailability=Boolean(lastQuery&&available.length===0);
  $('#no-availability').hidden=!noAvailability;
  $('.results-heading').hidden=noAvailability;

  $('#rooms').innerHTML=showcases.length?showcases.map(s=>{
   const rows=rowsFor(s),best=rows[0],reference=inventoryFor(s)[0],quoted=Boolean(lastQuery&&best&&Number.isFinite(best.total)),price=lastQuery?(quoted?best.total:null):reference?.price??null;
   const label=lastQuery?(best?`${plural(rows.length,'opção disponível','opções disponíveis')} · ${floorLabel(lastQuery.floor)}`:unavailableReason(s)):(s.eyebrow||'Acomodações Flor de Lótus');
   const cost=price!==null?`${lastQuery?(best?.quote_example?'Exemplo · ':''):'A partir de '}${money(price)}`:(lastQuery&&best?'Valor sob consulta.':lastQuery?'Experimente outras datas.':'Consulte os valores com a pousada.');
   const index=(photoIndices.get(s.slug)||0)%s.photos.length;
   return `<article class="catalog-room" data-slug="${esc(s.slug)}"><div class="card-gallery"><button type="button" class="card-photo" data-details="${esc(s.slug)}" aria-label="Ver fotos de ${esc(s.title)}"><img src="${esc(s.photos[index].url)}" alt="${esc(s.photos[index].alt)}" width="700" height="460" loading="lazy"><span class="card-photo-label">Ver ${s.photos.length} fotos</span></button><button type="button" class="photo-arrow" data-photo-prev aria-label="Foto anterior de ${esc(s.title)}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><button type="button" class="photo-arrow" data-photo-next aria-label="Próxima foto de ${esc(s.title)}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg></button></div><div class="room-body"><h3>${esc(s.title)}</h3><p class="room-meta">${esc(label)}</p><ul class="room-features">${s.features.slice(0,4).map(f=>`<li><i class="bi bi-${/^[a-z0-9-]+$/.test(f.icon)?f.icon:'check2'}" aria-hidden="true"></i><span>${esc(f.label)}</span></li>`).join('')}</ul><p class="room-description">${esc(s.description?.length>145?s.description.slice(0,142)+'…':s.description)}</p><button type="button" class="text-button" data-details="${esc(s.slug)}">Mais detalhes e fotos</button><div class="room-cost"><small>${price!==null?(quoted?`Total para ${plural(nights,'noite','noites')}${rows.length>1?' · a partir de':''}`:'Diária de referência por quarto · a partir de'):'Planeje sua estadia'}</small><p class="room-price ${price===null?'unquoted':''}">${esc(cost)}</p><button type="button" class="gold-button" ${lastQuery&&best?`data-options="${esc(s.slug)}"`:'data-search-focus'}>${lastQuery&&best?'Ver opções e reservar':lastQuery?'Consultar outras datas':'Escolher datas'}</button>${whatsappButton(s.title)}</div></div></article>`;
  }).join(''):'<p class="empty">Não foi possível carregar as acomodações. Atualize a consulta ou converse com a pousada.</p>';
  setupCarousels();
  const priced=(lastQuery?available:inventory).map(r=>lastQuery?r.total:r.price).filter(n=>Number.isFinite(n)&&n>0);
  $('#from-price').hidden=!priced.length;$('#from-price').textContent=priced.length?`A partir de ${money(Math.min(...priced))}${lastQuery?' / estadia':' / noite'}`:'';
 }
 function invalidate(){sequence++;controller?.abort();$('#rooms').removeAttribute('aria-busy');lastQuery=null;available=[];selection=null;$('#result-count').textContent='Escolha as datas, hóspedes e andar para consultar.';message('');render();$('#search [type="submit"]').disabled=false;}
 async function search(silent=false){
  document.dispatchEvent(new Event('lotus:search-updated'));
  const q=query();if(!$('#search').reportValidity())return;
  if(q.end<=q.start){message('A saída deve ser depois da entrada.',true);return;}
  const request=++sequence;controller?.abort();controller=new AbortController();const button=$('#search [type="submit"]');button.disabled=true;
  if(!silent){message('Consultando disponibilidade…');$('#rooms').setAttribute('aria-busy','true');}
  try{
   const [catalog,data]=await Promise.all([api('catalog',null,controller.signal),api('availability?'+new URLSearchParams(q),null,controller.signal)]);
   if(request!==sequence)return;applyCatalog(catalog);lastQuery=q;available=data.rooms||[];nights=data.nights;render();
   $('#result-count').textContent=`${plural(available.length,'quarto disponível','quartos disponíveis')} · ${plural(nights,'noite','noites')} · ${plural(q.guests,'hóspede','hóspedes')}${q.floor?' · '+floorLabel(q.floor):''}`;
   history.replaceState(null,'',location.pathname+'?'+new URLSearchParams(q));
   if(!available.length)message('');else if(!silent)message('Disponibilidade atualizada. Escolha uma acomodação abaixo.');
  }catch(e){if(request!==sequence||e.name==='AbortError')return;lastQuery=null;available=[];render();$('#result-count').textContent='Disponibilidade ainda não confirmada.';message(e.message,true);}
  finally{if(request===sequence){button.disabled=false;$('#rooms').removeAttribute('aria-busy');}}
 }
 function paintDetails(next){
  if(!detail)return;detailIndex=(next+detail.photos.length)%detail.photos.length;const photo=detail.photos[detailIndex];fadePhoto($('#details-image'),photo);$('#details-counter').textContent=`${detailIndex+1} / ${detail.photos.length}`;
  $('#details-thumbs').querySelectorAll('button').forEach((b,i)=>{if(i===detailIndex)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
 }
 function detailOptions(){
  if(!detail)return;const rows=rowsFor(detail);
  const best=rows[0],canBook=best&&Number.isFinite(best.total)&&!best.quote_example;
  $('#details-options').innerHTML=lastQuery&&canBook?`<div class="room-option"><p><strong>${esc(detail.title)} · ${esc(floorLabel(lastQuery.floor))}</strong><br>${plural(lastQuery.guests,'hóspede','hóspedes')} · ${plural(nights,'noite','noites')}<br>${money(best.total)} no total</p><button type="button" class="gold-button" data-book-category="${esc(detail.slug)}">Solicitar reserva</button></div>`:`<p class="room-meta">${lastQuery&&best?(best.quote_example?'Valor de exemplo. Consulte a pousada para confirmar o preço da estadia.':'Preço ainda não cadastrado para estas datas e quantidade de hóspedes. Consulte a pousada.'):lastQuery?esc(unavailableReason(detail)):'Selecione as datas, a quantidade de hóspedes e o andar para consultar.'}</p><button type="button" class="gold-button" data-search-focus>Escolher datas</button>${whatsappButton(detail.title)}`;

 }
 function openDetails(slug){
  detail=showcases.find(s=>s.slug===slug);if(!detail)return;const d=detail.details||{};
  $('#details-title').textContent=detail.title;$('#details-description').textContent=d.description||detail.description;
  $('#details-facts').innerHTML=(d.beds?`<p>${esc(d.beds)}</p>`:'')+[['Banheiro',d.bathroom],['Vista',d.views],['Comodidades',d.amenities?.length?d.amenities:detail.features.map(f=>f.label)]].filter(([,items])=>items?.length).map(([title,items])=>`<section><h3>${title}</h3><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')+(d.smoking?`<p class="room-meta">${esc(d.smoking)}</p>`:'');
  $('#details-thumbs').innerHTML=detail.photos.map((p,i)=>`<button type="button" data-detail-photo="${i}" aria-label="Ver foto ${i+1}"><img src="${esc(p.url)}" alt="" width="60" height="48"></button>`).join('');
  paintDetails(photoIndices.get(slug)||0);detailOptions();$('#room-details').showModal();
 }
 $('#rooms').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('[data-photo-prev],[data-photo-next]')){
   stepCard(button.closest('[data-slug]'),button.hasAttribute('data-photo-next')?1:-1);return;
  }
  if(button.hasAttribute('data-details')||button.hasAttribute('data-options'))openDetails(button.dataset.details||button.dataset.options);
  if(button.hasAttribute('data-search-focus'))focusSearch();
 });
 $('#room-details').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close-details'))$('#room-details').close();
  if(button.hasAttribute('data-detail-next'))paintDetails(detailIndex+1);
  if(button.hasAttribute('data-detail-prev'))paintDetails(detailIndex-1);
  if(button.hasAttribute('data-detail-photo'))paintDetails(Number(button.dataset.detailPhoto));
  if(button.hasAttribute('data-search-focus')){$('#room-details').close();focusSearch();}
  if(button.hasAttribute('data-book-category')&&lastQuery){
   const room=rowsFor(detail)[0];if(!room)return;
   selection={category:detail.slug,room:{...room,presentation:detail.title},query:{...lastQuery}};$('#room-details').close();$('#booking-error').textContent='';$('#booking-form [type="submit"]').disabled=false;
   $('#booking-summary').textContent=`${detail.title} · ${floorLabel(lastQuery.floor)} · ${dateLabel(lastQuery.start)} a ${dateLabel(lastQuery.end)} · ${plural(lastQuery.guests,'hóspede','hóspedes')} · ${money(room.total)} no total.`;$('#booking-dialog').showModal();if(!guestAuthenticated)openBookingLogin();else document.dispatchEvent(new Event('lotus:refresh-guest-session'));
  }
 });
 $('#room-details').addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();paintDetails(detailIndex+(event.key==='ArrowRight'?1:-1));}});
 $('#close-booking').onclick=()=>$('#booking-dialog').close();$('#booking-dialog').addEventListener('close',()=>{selection=null;});
 $('#booking-success').querySelectorAll('[data-close-success]').forEach(button=>button.onclick=()=>$('#booking-success').close());
 $('#booking-success').addEventListener('close',()=>$('#booking-receipt').focus({preventScroll:true}));
 $('#booking-form').onsubmit=async event=>{
  event.preventDefault();if(!selection)return;if(!guestAuthenticated){openBookingLogin();return;}if(bookingSubmitting)return;const button=event.submitter;bookingSubmitting=true;button.disabled=true;const selected=selection;
  try{
   const q=selected.query,result=await api('bookings',{category_slug:selected.category,expected_total:selected.room.total,floor:q.floor,start:q.start,end:q.end,guests:q.guests,package_id:q.package_id?Number(q.package_id):null,guest:$('#guest').value,phone:$('#phone').value});
   document.dispatchEvent(new Event('lotus:booking-created'));$('#booking-dialog').close();event.target.reset();
   const receipt=$('#booking-receipt');receipt.hidden=false;
   $('#booking-receipt-summary').textContent=`Solicitação #${result.id} · ${selected.room.presentation} · ${floorLabel(result.floor||selected.room.floor)} · ${dateLabel(q.start)} a ${dateLabel(q.end)} · ${plural(q.guests,'hóspede','hóspedes')} · Total: ${money(result.total)}.`;
   const contact=$('#booking-receipt-whatsapp'),url=whatsappLink(`${selected.room.presentation}`,{...q,floor:result.floor||selected.room.floor||q.floor},result);contact.hidden=!url;if(url)contact.href=url;
   $('#booking-success-summary').textContent=$('#booking-receipt-summary').textContent;
   const successContact=$('#booking-success-whatsapp');successContact.hidden=!url;if(url)successContact.href=url;
   $('#booking-success').showModal();
   message('Sua solicitação foi registrada na conta Google. Aguarde a confirmação da pousada.');await search(true);
  }catch(e){$('#booking-error').textContent=e.message;if(e.status===401){guestAuthenticated=false;openBookingLogin();}if(e.status===409){selection=null;await search(true);}}
  finally{bookingSubmitting=false;button.disabled=!selection;}
 };
  document.querySelector('[data-booking-refresh-login]').onclick=()=>{loginStatus('Verificando seu acesso…');document.dispatchEvent(new Event('lotus:refresh-guest-session'));};
 $('#search').onsubmit=event=>{event.preventDefault();search();};$('#search').addEventListener('change',event=>{if(event.target.matches('#checkin,#checkout'))$('#package').value='';invalidate();});
 $('#checkin').min=today;$('#checkout').min=nextDay(today);$('#checkin').addEventListener('change',()=>{if(!$('#checkin').value)return;$('#checkout').min=nextDay($('#checkin').value);if($('#checkout').value<=$('#checkin').value)$('#checkout').value=$('#checkout').min;});
 $('#refresh-rooms').onclick=()=>search();
 $('#choose-other-dates').onclick=focusSearch;
 $('#packages').onclick=event=>{
  const button=event.target.closest('[data-package]');if(!button)return;const p=packages.find(p=>p.id===Number(button.dataset.package));if(!p)return;
  $('#package').value='';$('#checkin').value=p.start<today?today:p.start;$('#checkout').value=nextDay($('#checkin').value,p.nights);$('#checkout').min=nextDay($('#checkin').value);$('#guests').value={solteiro:1,casal:2,casal_mais_um:3,quadruplo:4,familia:5}[p.type];search();focusSearch();
 };
 // Fill the URL search immediately; a slow catalog must not overwrite later edits.
 const params=new URLSearchParams(location.search),bootstrapSequence=sequence;
 if(!params.has('start'))$('#checkin').value=today;
 for(const [key,id] of [['start','checkin'],['end','checkout'],['guests','guests'],['floor','floor']])if(params.has(key))$('#'+id).value=params.get(key);
 if(!params.has('end'))$('#checkout').value=nextDay($('#checkin').value||today);
 if($('#checkin').value)$('#checkout').min=nextDay($('#checkin').value);
 api('catalog').then(data=>{
  if(lastQuery)return;
  applyCatalog(data);if(!$('#rooms').hasAttribute('aria-busy'))render();
  if(sequence!==bootstrapSequence)return;

  if($('#checkin').value&&$('#checkout').value&&$('#floor').value)search();
 }).catch(()=>{
  if(sequence!==bootstrapSequence)return;
  message('Não foi possível conectar ao sistema de reservas. Tente novamente ou converse com a pousada.',true);$('#rooms').innerHTML='<p class="empty">As acomodações estarão disponíveis assim que a conexão for restabelecida.</p>';
 });
 setInterval(()=>{if(lastQuery&&!document.hidden&&!$('#search').contains(document.activeElement)&&!$('#booking-dialog').open&&!$('#room-details').open)search(true);},15000);
})();
