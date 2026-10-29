'use strict';
(() => {
 function finishBookingLogin(user){
  if(!user||new URLSearchParams(location.search).get('conta')!=='conectada')return;
  try{const started=Number(sessionStorage.getItem('lotus-booking-login'));if(!started||Date.now()-started>600000)return;sessionStorage.removeItem('lotus-booking-login');}catch{return;}
  // Only notify that login finished. The booking tab verifies the server session itself.
  try{const channel=new BroadcastChannel('lotus-booking-login');channel.postMessage('complete');channel.close();}catch{}
  try{localStorage.setItem('lotus-booking-login-complete',String(Date.now()));}catch{}
  window.close();
 }
 const dialog=document.getElementById('guest-account');
 if(!dialog){
  let headerRequest;
  const refreshHeader=()=>headerRequest||(headerRequest=fetch('/api/guest/session',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{
   document.querySelectorAll('[data-guest-account]').forEach(link=>{const img=link.querySelector('img');if(img)paintAvatar(img,result.user?.avatar_url);link.classList.toggle('has-guest-profile',Boolean(result.user));});
   document.dispatchEvent(new CustomEvent('lotus:guest-session',{detail:{authenticated:Boolean(result.user),name:result.user?.name||'',google_enabled:result.google_enabled}}));
  }).catch(()=>{document.dispatchEvent(new Event('lotus:guest-session-error'));}).finally(()=>{headerRequest=null;}));
  document.querySelectorAll('[data-guest-account]').forEach(link=>link.addEventListener('click',()=>{const menu=document.getElementById('home-menu');if(menu?.open)menu.close();}));
  refreshHeader();window.addEventListener('focus',refreshHeader);document.addEventListener('lotus:refresh-guest-session',refreshHeader);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHeader();});
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
 function bookingWhatsapp(booking){
  const destination=document.body.dataset.contactWhatsapp;
  if(!/^\d{10,15}$/.test(destination||''))return '';
  const floor={terreo:'Térreo',superior:'Piso superior'}[booking.floor];
  const text=[
   `Olá! Gostaria de falar sobre a reserva #${booking.id}.`,
   `Status: ${states[booking.status]||booking.status}`,
   `Hóspede: ${booking.guest}`,
   `Contato: ${booking.phone}`,
   `Acomodação: ${booking.presentation||booking.room_name}`,
   `Quarto: ${booking.room_name}`,
   floor?`Andar: ${floor}`:'',
   `Entrada: ${date(booking.start)}, a partir das ${checkinTime.replace(':','h')} (Bahia)`,
   `Saída: ${date(booking.end)}, até as ${checkoutTime.replace(':','h')} (Bahia)`,
   `Estadia: ${booking.nights} noite(s) · ${booking.guests} hóspede(s)`,
   booking.adults!==null&&booking.adults!==undefined?`Composição: ${booking.adults} adulto(s) e ${(booking.children_ages||[]).length} criança(s)${booking.children_ages?.length?' · idades: '+booking.children_ages.map(age=>age+' anos').join(', '):''}`:'',
   booking.group_room_count>1?`Quarto ${booking.group_room_index} de ${booking.group_room_count} da solicitação`:'',
   booking.package_name?`Pacote: ${booking.package_name}`:'',
   `Total da reserva: ${money(booking.total)}`
  ].filter(Boolean).join('\n');
  return `https://wa.me/${destination}?${new URLSearchParams({text})}`;
 }
 function bookingCard(booking){
  const contact=bookingWhatsapp(booking);
  const completed=new Date(booking.checkout_at||booking.end+'T12:00:00-03:00').getTime()<=accountNow&&booking.status==='confirmada';
  return `<article class="guest-booking"><div class="guest-booking-heading"><div><span class="guest-booking-number">Reserva #${esc(booking.id)}</span><h4>${esc(booking.presentation||booking.room_name)}</h4></div><span class="guest-booking-status ${esc(booking.status)}">${completed?'Estadia concluída':esc(states[booking.status]||booking.status)}</span></div><dl><div><dt>Entrada</dt><dd>${esc(date(booking.start))}<small>A partir das ${esc(checkinTime.replace(':','h'))} · horário da Bahia</small></dd></div><div><dt>Saída</dt><dd>${esc(date(booking.end))}<small>Até as ${esc(checkoutTime.replace(':','h'))} · horário da Bahia</small></dd></div><div><dt>Estadia</dt><dd>${esc(booking.nights)} noite(s) · ${esc(booking.guests)} hóspede(s)${booking.adults!==null&&booking.adults!==undefined?`<small>${esc(booking.adults)} adulto(s) · ${(booking.children_ages||[]).length} criança(s)${booking.children_ages?.length?' · idades: '+booking.children_ages.map(a=>esc(a)+' anos').join(', '):''}</small>`:''}${booking.group_room_count>1?`<small>Quarto ${esc(booking.group_room_index)} de ${esc(booking.group_room_count)} da sua solicitação</small>`:''}</dd></div><div><dt>Quarto</dt><dd>${esc(booking.room_name)}${booking.floor&&booking.floor!=='nao_informado'?`<small>${esc({terreo:'Térreo',superior:'Piso superior'}[booking.floor]||'')}</small>`:''}</dd></div><div><dt>Hóspede</dt><dd>${esc(booking.guest)}</dd></div><div><dt>Contato</dt><dd>${esc(booking.phone)}</dd></div><div><dt>Total da reserva</dt><dd>${esc(money(booking.total))}${booking.romance?`<small>Hospedagem: ${esc(money(booking.romance.stay_total))} · Decoração personalizada: ${esc(money(booking.romance.decoration_total))}</small>`:''}</dd></div>${booking.package_name?`<div><dt>Tarifa</dt><dd>${esc(booking.package_name)}</dd></div>`:''}</dl>${booking.romance?`<p><button type="button" class="guest-decoration-open" data-decoration-booking="${esc(booking.id)}">Ver decoração personalizada</button></p>`:''}${booking.status==='pendente'?'<p class="guest-booking-note">Aguarde a confirmação da equipe da pousada. Sua solicitação já bloqueia essas datas.</p>':''}${contact?`<a class="guest-booking-contact" href="${esc(contact)}" target="_blank" rel="noopener noreferrer">Falar com a pousada sobre esta reserva</a>`:''}</article>`;
 }
 let accountBookings=[],decorationController,decorationTrigger;
 const decoration=document.createElement('dialog');decoration.className='guest-decoration-dialog';decoration.setAttribute('aria-labelledby','guest-decoration-title');document.body.append(decoration);
 function clearDecoration(){decorationController?.abort();decorationController=null;decoration.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));decoration.innerHTML='';}
 decoration.onclose=()=>{clearDecoration();if(decorationTrigger?.isConnected)decorationTrigger.focus({preventScroll:true});};
 decoration.onkeydown=event=>{if(event.key!=='Tab')return;const buttons=[...decoration.querySelectorAll('button:not([disabled]),a[href]')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
 const operationStates={aguardando_confirmacao:'Aguardando confirmação',confirmado:'Confirmado',em_preparacao:'Em preparação',preparado:'Preparado',concluido:'Concluído',cancelado:'Cancelado'};
 async function openDecoration(booking,trigger){
  clearDecoration();decorationTrigger=trigger;const controller=new AbortController();decorationController=controller;
  decoration.innerHTML='<button type="button" class="guest-decoration-close" aria-label="Fechar" autofocus>×</button><h2 id="guest-decoration-title">Decoração personalizada</h2><div data-decoration-content role="status">Carregando os detalhes da sua surpresa…</div>';
  decoration.querySelector('.guest-decoration-close').onclick=()=>decoration.close();if(!decoration.open)decoration.showModal();
  const content=decoration.querySelector('[data-decoration-content]');
  async function read(path){const response=await fetch(path,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])}),result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível carregar os detalhes da decoração.');return result;}
  try{
   const result=await read('/api/romance/mine'),order=(result.orders||[]).find(o=>String(o.booking_id)===String(booking.id));
   if(!order)throw Error('Não encontramos a decoração vinculada a esta reserva.');if(controller.signal.aborted)return;
   content.removeAttribute('role');
   content.innerHTML=`<p class="guest-decoration-number">Reserva #${esc(booking.id)}</p><section><h3>Sua hospedagem</h3><p>${esc(booking.presentation||booking.room_name)} · ${esc(booking.room_name)}</p><p>${esc(date(booking.start))} → ${esc(date(booking.end))}</p><p>${esc(booking.guests)} hóspede(s)${booking.adults!=null?` · ${esc(booking.adults)} adulto(s) · ${(booking.children_ages||[]).length} criança(s)`:''}</p><p>${esc({terreo:'Térreo',superior:'Piso superior'}[booking.floor]||'')}</p><p>${esc(states[booking.status]||booking.status)}</p></section><section><h3>Itens solicitados</h3><p>Esta lista registra suas escolhas, não indica que a preparação já foi concluída.</p><ul class="guest-decoration-items">${(order.items||[]).map(item=>`<li><span aria-hidden="true">✓</span><div><strong>${esc(item.name)}</strong><p>${esc(item.variant)} · Quantidade: ${esc(item.quantity)}</p><small>${money(item.unit_price)} por unidade</small></div><strong>${money(item.total)}</strong></li>`).join('')}</ul></section><section><h3>Mensagem e instruções</h3><p class="guest-decoration-notes" translate="no">${esc(order.instructions||'Nenhuma mensagem ou instrução adicional.')}</p></section><section><h3>Fotografias enviadas</h3><div class="guest-decoration-photos">${(order.photos||[]).map((photo,i)=>`<figure><img data-decoration-photo="${esc(photo.id)}" alt="Fotografia pessoal ${i+1}" width="180" height="140" referrerpolicy="no-referrer"><figcaption>Fotografia ${i+1}</figcaption></figure>`).join('')||'<p>Nenhuma fotografia enviada.</p>'}</div></section><section><h3>Valores e preparação</h3><dl><dt>Hospedagem</dt><dd>${money(order.stay_total)}</dd><dt>Decoração personalizada</dt><dd>${money(order.decoration_total)}</dd><dt>Total da reserva</dt><dd>${money(order.total)}</dd><dt>Status da decoração</dt><dd>${esc(operationStates[order.operational]||order.operational)}</dd></dl><p>As fotos e instruções são acessíveis somente à sua conta e à equipe responsável pela preparação.</p></section>`;
   await Promise.all((order.photos||[]).map(async photo=>{const img=[...content.querySelectorAll('[data-decoration-photo]')].find(el=>el.dataset.decorationPhoto===String(photo.id));try{const data=await read('/api/romance/file?id='+encodeURIComponent(photo.id));if(!controller.signal.aborted&&img?.isConnected){img.onerror=()=>{img.replaceWith(document.createTextNode('Não foi possível carregar esta fotografia.'));};img.src=data.url;}}catch{if(!controller.signal.aborted&&img?.isConnected)img.replaceWith(document.createTextNode('Não foi possível carregar esta fotografia.'));}}));
  }catch(e){if(controller.signal.aborted)return;content.setAttribute('role','alert');content.innerHTML=`<p>${esc(e.message)}</p><button type="button" data-decoration-retry>Tentar novamente</button>`;content.querySelector('button').onclick=()=>openDecoration(booking,trigger);}
 }
 reservations.addEventListener('click',event=>{const trigger=event.target.closest('[data-decoration-booking]');if(!trigger)return;const booking=accountBookings.find(b=>String(b.id)===trigger.dataset.decorationBooking);if(booking?.romance)openDecoration(booking,trigger);});
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
   const bookings=data.bookings||[];accountBookings=bookings;const upcoming=bookings.filter(b=>b.status!=='cancelada'&&isUpcoming(b)).sort((a,b)=>a.start.localeCompare(b.start)),history=bookings.filter(b=>b.status==='cancelada'||!isUpcoming(b));
   const notifications=data.notifications||[],unread=notifications.filter(n=>!n.read_at).length;
   const notices=notifications.length?`<section class="guest-notifications" aria-label="Lembretes da estadia"><h3>Avisos ${unread?`<span>${unread} novo(s)</span>`:''}</h3>${notifications.map(n=>`<article class="guest-notification ${n.read_at?'is-read':''}"><strong>${n.kind==='one_day'?'Seu check-in está próximo':'Prepare-se para sua viagem'}</strong><p>Reserva #${esc(n.booking_id)} · Check-in em ${esc(new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bahia'}).format(new Date(n.checkin_at)))} (Bahia).</p>${!n.read_at?`<button type="button" data-read-notification="${esc(n.id)}">Marcar como lido</button>`:'<small>Lido</small>'}</article>`).join('')}</section>`:'';
   reservations.innerHTML=`${notices}<div class="guest-reservation-title"><h3>Próximas estadias</h3><button type="button" data-refresh-bookings>Atualizar</button></div>${upcoming.length?upcoming.map(bookingCard).join(''):'<div class="guest-reservations-empty"><p>Você ainda não tem uma reserva futura vinculada a esta conta.</p><a href="/quartos">Escolher meu quarto</a></div>'}<details class="guest-history" ${history.length?'open':''}><summary>Histórico de reservas <span>(${history.length})</span></summary>${history.length?history.map(bookingCard).join(''):'<p>Nenhuma estadia anterior ou reserva cancelada nesta conta.</p>'}</details><p class="guest-booking-help">As reservas feitas pelo site aparecem automaticamente na conta Google usada na solicitação.</p><p class="guest-booking-help">Lembretes na conta: 10 dias e 24 horas antes do check-in, para reservas confirmadas.</p>`;
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
  if(decoration.open)decoration.close();clearDecoration();accountBookings=[];
  triggers.forEach(button=>{
   const img=button.querySelector('img');if(img)paintAvatar(img,user?.avatar_url);
   button.classList.toggle('has-guest-profile',Boolean(user));
  });
  login.hidden=Boolean(user);profile.hidden=!user;dialog.classList.toggle('has-reservation-profile',Boolean(user));reservations.innerHTML='';
  document.dispatchEvent(new CustomEvent('lotus:guest-session',{detail:{authenticated:Boolean(user),name:user?.name||''}}));
  if(!user)return;
  finishBookingLogin(user);
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
