'use strict';
(() => {
 let generation=0,busy=false,host;
 const {esc,date,states,html:roster}=window.excursionRoster;
 async function api(path,body){const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível atualizar os grupos.');return data;}
 async function render(container){
  host=container;const request=++generation;container.innerHTML='<div class="panel"><p>Carregando grupos e excursões…</p></div>';
  try{const data=await api('admin-excursions');if(request!==generation||!document.querySelector('[data-tab="excursions"]')?.classList.contains('active'))return;
   container.innerHTML=`<div class="booking-history-head"><h2>Grupos e excursões</h2><button type="button" class="btn secondary" data-excursion-refresh>Atualizar</button></div>${data.groups.length?data.groups.map(group=>`<section class="panel excursion-admin-card"><div class="panel-head"><h2 translate="no">${esc(group.name)}</h2><span class="badge ${esc(group.status)}">${esc(states[group.status]||group.status)}</span></div><p>${date(group.start)} a ${date(group.end)} · ${group.guest_count} pessoas · ${group.room_count} quartos</p><p>Responsável: <span translate="no">${esc(group.guest)} · ${esc(group.phone)}</span></p>${roster(group,true)}<div class="excursion-admin-actions">${group.status!=='cancelada'&&group.status!=='confirmada'?`<button type="button" class="btn" data-excursion-action="confirm" data-excursion-id="${esc(group.id)}">Confirmar grupo</button>`:''}${group.status==='confirmada'?`<button type="button" class="btn secondary" data-excursion-action="manifest" data-excursion-id="${esc(group.id)}">Gerar lista de check-in</button>`:''}${group.status!=='cancelada'?`<button type="button" class="btn danger" data-excursion-action="cancel" data-excursion-id="${esc(group.id)}">Cancelar grupo</button>`:''}</div></section>`).join(''):'<div class="panel"><p>Nenhuma solicitação de grupo por aqui.</p><a href="/grupos" target="_blank" rel="noopener">Ver página de grupos e excursões ↗</a></div>'}`;
  }catch(error){if(request===generation)container.innerHTML=`<div class="panel"><p role="alert">${esc(error.message)}</p><button class="btn secondary" type="button" data-excursion-refresh>Tentar novamente</button></div>`;}
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-excursion-action],[data-excursion-refresh]');if(!button||busy)return;
  if(button.hasAttribute('data-excursion-refresh')){render(host);return;}
  const action=button.dataset.excursionAction,id=button.dataset.excursionId;
  if(action==='manifest'){try{await window.excursionRoster.print('/api/admin-excursions/'+id+'/manifest');}catch(error){window.notify(error.message,true);}return;}
  if(!confirm(action==='confirm'?'Confirmar todas as reservas ativas deste grupo?':'Cancelar todas as reservas ativas deste grupo e liberar as datas?'))return;
  busy=true;button.disabled=true;
  try{await api('admin-excursions/'+id+'/'+action,{});busy=false;document.dispatchEvent(new Event('lotus:admin-refresh'));window.notify(action==='confirm'?'Grupo confirmado. A lista de check-in está disponível.':'Grupo cancelado. As datas foram liberadas.');}
  catch(error){window.notify(error.message,true);}finally{busy=false;button.disabled=false;}
 });
 window.excursionAdmin={render,get busy(){return busy;}};
})();
