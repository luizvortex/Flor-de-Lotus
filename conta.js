'use strict';
(() => {
 const dialog=document.getElementById('guest-account');
 if(!dialog){
  const refreshHeader=()=>fetch('/api/guest/session',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{
   document.querySelectorAll('[data-guest-account]').forEach(link=>{const img=link.querySelector('img');if(img)paintAvatar(img,result.user?.avatar_url);link.classList.toggle('has-guest-profile',Boolean(result.user));});
   document.dispatchEvent(new CustomEvent('lotus:guest-session',{detail:{authenticated:Boolean(result.user),name:result.user?.name||''}}));
  }).catch(()=>{});
  document.querySelectorAll('[data-guest-account]').forEach(link=>link.addEventListener('click',()=>{const menu=document.getElementById('home-menu');if(menu?.open)menu.close();}));
  refreshHeader();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHeader();});
  const state=new URL(location.href).searchParams.get('conta');if(state)location.replace('/minha-conta?'+new URLSearchParams({conta:state}));
  return;
 }
 const triggers=document.querySelectorAll('[data-guest-account]');
 const loading=dialog.querySelector('[data-account-loading]');
 const login=dialog.querySelector('[data-account-login]');
 const profile=dialog.querySelector('[data-account-profile]');
 const message=dialog.querySelector('[data-account-message]');
 const google=dialog.querySelector('[data-google-login]');
 const avatar=dialog.querySelector('[data-account-avatar]');
 const reservations=document.createElement('section');reservations.className='guest-reservations';reservations.setAttribute('aria-label','Suas reservas e avisos');profile.append(reservations);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Bahia'}).format(new Date(value+'T12:00:00Z'));
 const money=value=>(Number(value)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const states={pendente:'Aguardando confirmação',confirmada:'Confirmada',cancelada:'Cancelada'};
 let requestId=0, pendingSession,bookingRequest;
 function bookingCard(booking){
  const completed=new Date(booking.checkout_at||booking.end+'T12:00:00-03:00').getTime()<=accountNow&&booking.status==='confirmada';
  return `<article class="guest-booking"><div class="guest-booking-heading"><div><span class="guest-booking-number">Reserva #${esc(booking.id)}</span><h4>${esc(booking.presentation||booking.room_name)}</h4></div><span class="guest-booking-status ${esc(booking.status)}">${completed?'Estadia concluída':esc(states[booking.status]||booking.status)}</span></div><dl><div><dt>Entrada</dt><dd>${esc(date(booking.start))}<small>A partir das ${esc(checkinTime.replace(':','h'))} · horário da Bahia</small></dd></div><div><dt>Saída</dt><dd>${esc(date(booking.end))}<small>Até as ${esc(checkoutTime.replace(':','h'))} · horário da Bahia</small></dd></div><div><dt>Estadia</dt><dd>${esc(booking.nights)} noite(s) · ${esc(booking.guests)} hóspede(s)</dd></div><div><dt>Quarto</dt><dd>${esc(booking.room_name)}</dd></div><div><dt>Hóspede</dt><dd>${esc(booking.guest)}</dd></div><div><dt>Contato</dt><dd>${esc(booking.phone)}</dd></div><div><dt>Total da reserva</dt><dd>${esc(money(booking.total))}</dd></div>${booking.package_name?`<div><dt>Tarifa</dt><dd>${esc(booking.package_name)}</dd></div>`:''}</dl>${booking.status==='pendente'?'<p class="guest-booking-note">Aguarde a confirmação da equipe da pousada. Sua solicitação já bloqueia essas datas.</p>':''}<a class="guest-booking-contact" href="/#fale-conosco">Falar com a pousada sobre esta reserva</a></article>`;
 }
 let accountNow,checkinTime='14:00',checkoutTime='12:00';
 async function loadBookings(id){
  bookingRequest?.abort();const controller=new AbortController();bookingRequest=controller;
  reservations.innerHTML='<p role="status">Carregando suas reservas…</p>';
  try{
   const response=await fetch('/api/guest/bookings',{cache:'no-store',signal:controller.signal}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Não foi possível carregar suas reservas.');
   if(id!==requestId||controller.signal.aborted)return;
   checkinTime=data.checkin_time||'14:00';checkoutTime=data.checkout_time||'12:00';
   accountNow=new Date(data.now||data.today+'T00:00:00-03:00').getTime();
   const isUpcoming=b=>new Date(b.checkout_at||b.end+'T12:00:00-03:00').getTime()>accountNow;
   const bookings=data.bookings||[],upcoming=bookings.filter(b=>b.status!=='cancelada'&&isUpcoming(b)).sort((a,b)=>a.start.localeCompare(b.start)),history=bookings.filter(b=>b.status==='cancelada'||!isUpcoming(b));
   const notifications=data.notifications||[],unread=notifications.filter(n=>!n.read_at).length;
   const notices=notifications.length?`<section class="guest-notifications" aria-label="Lembretes da estadia"><h3>Avisos ${unread?`<span>${unread} novo(s)</span>`:''}</h3>${notifications.map(n=>`<article class="guest-notification ${n.read_at?'is-read':''}"><strong>${n.kind==='one_day'?'Seu check-in está próximo':'Prepare-se para sua viagem'}</strong><p>Reserva #${esc(n.booking_id)} · Check-in em ${esc(new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bahia'}).format(new Date(n.checkin_at)))} (Bahia).</p>${!n.read_at?`<button type="button" data-read-notification="${esc(n.id)}">Marcar como lido</button>`:'<small>Lido</small>'}</article>`).join('')}</section>`:'';
   reservations.innerHTML=`${notices}<div class="guest-reservation-title"><h3>Próximas estadias</h3><button type="button" data-refresh-bookings>Atualizar</button></div>${upcoming.length?upcoming.map(bookingCard).join(''):'<div class="guest-reservations-empty"><p>Você ainda não tem uma reserva futura vinculada a esta conta.</p><a href="/quartos">Escolher meu quarto</a></div>'}<details class="guest-history" ${history.length?'open':''}><summary>Histórico de reservas <span>(${history.length})</span></summary>${history.length?history.map(bookingCard).join(''):'<p>Nenhuma estadia anterior ou reserva cancelada nesta conta.</p>'}</details><p class="guest-booking-help">Fez uma reserva sem entrar com Google ou diretamente com a pousada? Peça à equipe para vinculá-la ao e-mail desta conta.</p><p class="guest-booking-help">Lembretes na conta: 10 dias e 24 horas antes do check-in, para reservas confirmadas.</p>`;
   reservations.querySelector('[data-refresh-bookings]').onclick=()=>loadBookings(requestId);
   reservations.querySelectorAll('[data-read-notification]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;
    try{const r=await fetch('/api/guest/bookings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(button.dataset.readNotification)})});if(!r.ok)throw Error('Não foi possível atualizar o aviso.');await loadBookings(requestId);}catch(e){message.textContent=e.message;button.disabled=false;}
   });
  }catch(e){if(e.name==='AbortError'||id!==requestId)return;reservations.innerHTML=`<p role="alert">${esc(e.message)}</p><button type="button" data-retry-bookings>Tentar novamente</button>`;reservations.querySelector('button').onclick=()=>loadBookings(requestId);}
 }

 function session(){
  if(!pendingSession)pendingSession=fetch('/api/guest/session',{cache:'no-store'}).then(async response=>{
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível consultar sua conta. Tente novamente.');return result;
  }).finally(()=>{pendingSession=null;});
  return pendingSession;
 }
 function paintAvatar(img,url){
  img.hidden=true;img.removeAttribute('src');
  if(!url)return;
  try{const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.googleusercontent.com'))return;}catch{return;}
  img.onerror=()=>{img.hidden=true;};img.onload=()=>{img.hidden=false;};img.src=url;
 }
 function showUser(user){
  triggers.forEach(button=>{
   const img=button.querySelector('img');if(img)paintAvatar(img,user?.avatar_url);
   button.classList.toggle('has-guest-profile',Boolean(user));
  });
  login.hidden=Boolean(user);profile.hidden=!user;dialog.classList.toggle('has-reservation-profile',Boolean(user));reservations.innerHTML='';
  document.dispatchEvent(new CustomEvent('lotus:guest-session',{detail:{authenticated:Boolean(user),name:user?.name||''}}));
  if(!user)return;
  dialog.querySelector('[data-account-name]').textContent=user.name;
  dialog.querySelector('[data-account-email]').textContent=user.email;
  paintAvatar(avatar,user.avatar_url);
 }
 async function load(){
  const id=++requestId;
  loading.hidden=false;login.hidden=true;profile.hidden=true;message.textContent='';
  try{
   const result=await session();
   if(id!==requestId)return;
   showUser(result.user);if(result.user)await loadBookings(id);google.disabled=result.google_enabled!==true;
   if(!result.user&&result.google_enabled!==true)message.textContent=result.google_enabled===false?'O login com Google estará disponível em breve.':'Não foi possível conectar ao serviço de login. Tente novamente em instantes.';
  }catch(e){if(id===requestId){message.textContent=e.message;login.hidden=false;google.disabled=true;}}
  finally{if(id===requestId)loading.hidden=true;}
 }
 dialog.querySelector('[data-account-logout]').addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;message.textContent='';
  try{
   const response=await fetch('/api/guest/logout',{method:'POST'});
   if(!response.ok)throw Error('Não foi possível sair. Tente novamente.');
   showUser(null);await load();
  }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
 });
 setInterval(()=>{if(!profile.hidden&&!document.hidden)loadBookings(requestId);},60000);
 document.addEventListener('lotus:booking-created',()=>{if(!profile.hidden)loadBookings(requestId);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();else bookingRequest?.abort();});
 const url=new URL(location.href),state=url.searchParams.get('conta');
 load().then(()=>{
  if(state==='erro'||state==='indisponivel')message.textContent=state==='erro'?'O login não foi concluído. Tente novamente.':'O login com Google ainda não está disponível.';
 });
 if(state){url.searchParams.delete('conta');history.replaceState(null,'',url.pathname+url.search+url.hash);}
})();
