'use strict';
(() => {
 const toggle=document.querySelector('[data-admin-alert-open]');if(!toggle)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const baseTitle=document.title;
 const dialog=document.createElement('dialog');dialog.className='admin-alert-dialog';
 dialog.innerHTML=`<div class="modal-head"><h2>Avisos de novas reservas</h2><button type="button" class="close" data-alert-close aria-label="Fechar avisos">×</button></div><p class="hint">Os avisos acompanham as novas solicitações a partir desta ativação. Marcar como lido não confirma nem cancela reservas.</p><div class="admin-alert-controls"><button type="button" class="btn secondary" data-alert-sound aria-pressed="false">Ativar som</button><button type="button" class="btn secondary" data-alert-notifications>Ativar notificações do navegador</button><button type="button" class="btn secondary" data-alert-refresh>Atualizar avisos</button></div><p class="hint" data-alert-device-status></p><p role="status" aria-live="polite" data-alert-status></p><div class="admin-alert-list-heading"><strong data-alert-unread>Nenhum aviso não lido</strong><button type="button" class="btn secondary" data-alert-read-all disabled>Marcar todos como lidos</button></div><div class="admin-alert-list" data-alert-list><p>Carregando avisos…</p></div><details class="admin-alert-whatsapp"><summary>Avisos pelo WhatsApp da equipe</summary><p class="hint" data-alert-whatsapp-status>Envio automático ainda não conectado.</p><form data-alert-phone-form><label for="admin-alert-phone">Número do gestor ou da equipe que receberá os avisos</label><input type="tel" id="admin-alert-phone" autocomplete="tel" inputmode="tel" maxlength="32" placeholder="55 + DDD + número"><button type="submit" class="btn secondary">Salvar destinatário</button></form><p class="hint">Salvar o número não ativa o envio. É necessário conectar a API oficial do WhatsApp Business, configurar o remetente e aprovar o modelo de mensagem. As novas solicitações ficam registradas para essa integração; nenhum WhatsApp é enviado nesta etapa. Não insira senhas ou tokens aqui.</p><a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">Como configurar a API do WhatsApp ↗</a></details><details><summary>Manter os avisos ativos</summary><p class="hint">Mantenha o painel aberto e logado, ative o som e permita as notificações neste navegador. No Chrome, você pode incluir o site em Configurações → Desempenho → Sempre manter estes sites ativos. Economia de energia, aba suspensa e computador em repouso podem interromper os avisos. Ao voltar, o contador será atualizado. Para receber com o computador desligado, será necessário ativar o WhatsApp no servidor.</p></details>`;
 document.body.append(dialog);
 const toast=document.createElement('aside');toast.className='admin-alert-toast';toast.hidden=true;toast.setAttribute('role','status');toast.innerHTML='<strong data-alert-toast-text></strong><button type="button" class="btn secondary" data-alert-toast-open>Ver avisos</button><button type="button" class="close" data-alert-toast-close aria-label="Dispensar aviso">×</button>';document.body.append(toast);
 const list=dialog.querySelector('[data-alert-list]'),status=dialog.querySelector('[data-alert-status]'),phone=dialog.querySelector('#admin-alert-phone');
 let active=false,generation=0,timer,requesting=false,busy=false,current=null,firstRead=true,listSignature='',recipientDirty=false,audio,soundWanted=false,toastTimer;
 try{soundWanted=localStorage.getItem('lotus-admin-alert-sound')==='true';}catch{}
 function deviceStatus(){
  const enabled=soundWanted&&audio?.state==='running';
  const button=dialog.querySelector('[data-alert-sound]');button.textContent=enabled?'Desativar som':'Ativar som';button.setAttribute('aria-pressed',String(Boolean(enabled)));
  const permission='Notification'in window?Notification.permission:'unsupported';
  dialog.querySelector('[data-alert-notifications]').textContent=permission==='granted'?'Notificações permitidas':permission==='denied'?'Notificações bloqueadas':permission==='unsupported'?'Navegador sem notificações':'Ativar notificações do navegador';
  dialog.querySelector('[data-alert-device-status]').textContent=`Som ${enabled?'ativado neste navegador':'desativado — clique em Ativar som para ouvir os avisos'}. ${permission==='granted'?'Notificações permitidas; dependem do navegador em execução.':permission==='denied'?'Libere as notificações nas configurações do navegador, se desejar.':'As notificações do sistema precisam da sua permissão.'}`;
 }
 function chime(){
  if(!soundWanted||audio?.state!=='running')return;
  [523.25,659.25,783.99].forEach((frequency,index)=>{const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*.14;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.075,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.27);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.3);});
 }
 dialog.querySelector('[data-alert-sound]').onclick=async()=>{
  try{
   if(soundWanted&&audio?.state==='running'){soundWanted=false;}else{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Este navegador não oferece áudio para avisos.');audio=audio||new Audio();await audio.resume();soundWanted=true;chime();}
   try{localStorage.setItem('lotus-admin-alert-sound',String(soundWanted));}catch{}deviceStatus();
  }catch(error){status.textContent=error.message;}
 };
 dialog.querySelector('[data-alert-notifications]').onclick=async()=>{
  try{if(!('Notification'in window)){status.textContent='Use um navegador com suporte a notificações.';return;}if(Notification.permission==='default')await Notification.requestPermission();deviceStatus();}catch{status.textContent='Não foi possível ativar as notificações. Confira as permissões do navegador.';}
 };
 async function api(body){
  const response=await fetch('/api/admin-alerts',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});
  const data=await response.json();if(!response.ok){const error=Error(data.error||'Não foi possível atualizar os avisos.');error.status=response.status;throw error;}return data;
 }
 function paint(data){
  current=data;const count=Number(data.unread_count)||0;document.title=(count?`(${count}) `:'')+baseTitle;
  const badge=toggle.querySelector('[data-admin-alert-count]');badge.textContent=String(count);badge.hidden=!count;toggle.setAttribute('aria-label',`${count} aviso${count===1?'':'s'} de novas reservas não lido${count===1?'':'s'}. Abrir avisos.`);
  dialog.querySelector('[data-alert-unread]').textContent=count?`${count} aviso${count===1?'':'s'} não lido${count===1?'':'s'}`:'Nenhum aviso não lido';
  dialog.querySelector('[data-alert-read-all]').disabled=!count||busy;
  if(!recipientDirty&&document.activeElement!==phone)phone.value=data.whatsapp_recipient||'';
  dialog.querySelector('[data-alert-whatsapp-status]').textContent=`Envio automático ainda não conectado.${data.whatsapp_waiting?` ${data.whatsapp_waiting} solicitação(ões) registrada(s) aguardam configuração do serviço.`:''}`;
  const signature=JSON.stringify(data.alerts||[]);
  if(signature!==listSignature){
   listSignature=signature;
   list.innerHTML=data.alerts?.length?data.alerts.map(item=>`<article class="admin-alert-item ${item.is_read?'is-read':''}"><div><strong>Solicitação #${esc(item.booking_id)}</strong><p>Unidade ${esc(item.room_name)} · ${esc({terreo:'Térreo',superior:'Piso superior'}[item.room_floor]||'Andar a definir')}<br>${esc(String(item.start).split('-').reverse().join('/'))} a ${esc(String(item.end).split('-').reverse().join('/'))} · ${esc(item.guests)} hóspede(s)</p><span>${item.is_read?'Lido':'Novo aviso'}</span></div><button type="button" class="btn secondary" data-alert-booking="${esc(item.booking_id)}">Ver reserva</button></article>`).join(''):'<p class="hint">As novas solicitações aparecerão aqui. As reservas anteriores continuam na aba Reservas.</p>';
  }
 }
 async function announce(data,token){
  const work=()=>{
   if(!active||token!==generation)return;
   const key='lotus-admin-alert-seen:'+data.viewer;let ids=[];try{ids=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(ids))ids=[];}catch{}
   const known=new Set(ids),fresh=(data.alerts||[]).filter(item=>!item.is_read&&!known.has(item.booking_id));
   const next=[...new Set([...(data.alerts||[]).map(item=>item.booking_id),...ids])].slice(0,200);
   try{localStorage.setItem(key,JSON.stringify(next));}catch{}
   if(firstRead){firstRead=false;return;}if(!fresh.length)return;
   toast.querySelector('[data-alert-toast-text]').textContent=fresh.length===1?`Nova solicitação de reserva #${fresh[0].booking_id}`:`${fresh.length} novas solicitações de reserva`;
   toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},10000);chime();
   if('Notification'in window&&Notification.permission==='granted'&&(!document.hasFocus()||document.hidden)){
    try{const notification=new Notification('Nova reserva na Flor de Lótus',{body:`${data.unread_count} solicitação(ões) não lida(s). Acesse o painel para conferir.`,icon:'/img%20Pousada/flordelotuslogo.png',tag:'lotus-admin-bookings'});notification.onclick=()=>{window.focus();open();notification.close();};}catch{status.textContent='Há novos avisos. Este navegador não conseguiu exibir a notificação do sistema.';}
   }
  };
  if(navigator.locks?.request)await navigator.locks.request('lotus-admin-alert-'+data.viewer,work);else work();
 }
 async function refresh(){
  if(!active||requesting)return;requesting=true;const token=generation;clearTimeout(timer);
  try{const data=await api();if(!active||token!==generation)return;paint(data);await announce(data,token);status.textContent='Avisos atualizados. O contador mostra solicitações ainda não lidas.';}
  catch(error){if(token!==generation)return;if(error.status===401){stop();return;}status.textContent='Não foi possível atualizar os avisos. Tente Atualizar avisos; os dados anteriores foram mantidos.';}
  finally{requesting=false;if(active&&token===generation)timer=setTimeout(refresh,document.hidden?15000:10000);}
 }
 function stop(){active=false;generation++;clearTimeout(timer);clearTimeout(toastTimer);toast.hidden=true;document.title=baseTitle;current=null;firstRead=true;listSignature='';list.innerHTML='';phone.value='';recipientDirty=false;if(dialog.open)dialog.close();toggle.querySelector('[data-admin-alert-count]').hidden=true;}
 async function mutate(body){if(busy)return;busy=true;try{const data=await api(body);if(active){if(body.operation==='configure')recipientDirty=false;paint(data);status.textContent=body.operation==='configure'?'Destinatário salvo. O envio automático depende da conexão com a API do WhatsApp.':'Avisos marcados como lidos. As reservas não foram alteradas.';}}catch(error){status.textContent=error.message;}finally{busy=false;if(current)dialog.querySelector('[data-alert-read-all]').disabled=!current.unread_count;}}
 function open(){if(!active)return;deviceStatus();if(!dialog.open)dialog.showModal();refresh();}
 toggle.onclick=open;dialog.querySelector('[data-alert-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-alert-refresh]').onclick=refresh;
 dialog.querySelector('[data-alert-read-all]').onclick=()=>mutate({operation:'read_all',through:Math.max(0,...(current?.alerts||[]).map(item=>Number(item.booking_id)))});
 list.onclick=async event=>{const button=event.target.closest('[data-alert-booking]');if(!button)return;await mutate({operation:'mark_read',id:Number(button.dataset.alertBooking)});dialog.close();document.querySelector('[data-tab="bookings"]').click();document.dispatchEvent(new Event('lotus:admin-refresh'));};
 phone.oninput=()=>{recipientDirty=true;phone.setCustomValidity('');};
 dialog.querySelector('[data-alert-phone-form]').onsubmit=event=>{event.preventDefault();const raw=phone.value.trim(),digits=raw.replace(/\D/g,'');phone.setCustomValidity(raw&&(!/^[+0-9\s().-]+$/.test(raw)||!/^\d{10,15}$/.test(digits))?'Informe país e DDD, com 10 a 15 dígitos.':'');if(!event.target.reportValidity())return;mutate({operation:'configure',whatsapp_recipient:digits});};
 toast.querySelector('[data-alert-toast-open]').onclick=()=>{toast.hidden=true;open();};toast.querySelector('[data-alert-toast-close]').onclick=()=>{toast.hidden=true;};
 document.addEventListener('lotus:admin-session',event=>{if(!event.detail.authenticated){stop();return;}if(!active){active=true;generation++;firstRead=true;deviceStatus();refresh();}});
 document.addEventListener('lotus:admin-alert-refresh',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',()=>{deviceStatus();refresh();});window.addEventListener('pagehide',()=>{clearTimeout(timer);});
})();
