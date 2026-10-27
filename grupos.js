'use strict';
(() => {
 const $=selector=>document.querySelector(selector),{esc,html:roster,date,states}=window.excursionRoster;
 const form=$('#group-form'),roomState=new Map();let rooms=[],quote=null,draftVersion=0,availabilitySequence=0,availabilityKey='',user=null,sessionSequence=0,mineSequence=0,sending=false,requestId=null;
 const money=value=>(Number(value)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
 $('#group-start').value=today;$('#group-start').min=today;$('#group-end').value=tomorrow.toISOString().slice(0,10);$('#group-end').min=tomorrow.toISOString().slice(0,10);
 function message(text,error=false){const box=$('#group-message');box.hidden=!text;box.textContent=text;box.classList.toggle('error',error);}
 async function api(path,body){const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok){const error=Error(data.error||'Não foi possível concluir a solicitação.');error.status=response.status;throw error;}return data;}
 function invalidate(){draftVersion++;quote=null;requestId=null;$('#group-submit').hidden=true;$('#group-quote-summary').hidden=true;}
 function selectedRooms(){return rooms.filter(room=>roomState.get(room.id)?.selected);}
 function count(){const selected=selectedRooms();$('#group-counter').textContent=`${selected.reduce((sum,room)=>sum+roomState.get(room.id).count,0)} pessoas · ${selected.length} quartos`;}
 function peopleHTML(room,state){return Array.from({length:state.count},(_,index)=>{const person=state.people[index]||{name:'',age:null};state.people[index]=person;return `<div class="group-person"><label>Nome completo · pessoa ${index+1}<input data-person-name="${room.id}" data-person-index="${index}" value="${esc(person.name)}" maxlength="120" required autocomplete="off"></label><label>Tipo<select data-person-type="${room.id}" data-person-index="${index}"><option value="adult" ${person.age===null?'selected':''}>Adulto</option><option value="child" ${person.age!==null?'selected':''}>Criança</option></select></label>${person.age!==null?`<label>Idade na entrada<select data-person-age="${room.id}" data-person-index="${index}" required><option value="" disabled ${person.age===''?'selected':''}>Selecione</option>${Array.from({length:18},(_,age)=>`<option value="${age}" ${person.age===age?'selected':''}>${age} anos</option>`).join('')}</select></label>`:''}</div>`;}).join('');}
 function paintRooms(){
  $('#group-rooms').innerHTML=['terreo','superior'].map(floor=>{const rows=rooms.filter(room=>room.floor===floor);return `<div class="group-floor"><h3>${floor==='terreo'?'Térreo':'Piso superior'}</h3>${rows.length?`<div class="group-room-grid">${rows.map(room=>{const state=roomState.get(room.id);return `<article class="group-room ${state.selected?'is-selected':''} ${!room.available?'is-unavailable':''}"><label class="group-room-choice"><input type="checkbox" data-room-select="${room.id}" ${state.selected?'checked':''} ${!room.available&&!state.selected?'disabled':''}>Quarto ${esc(room.name)}</label><p class="group-room-meta">Até ${room.capacity} pessoas · ${room.available?'Disponível':'Indisponível no período'}</p>${state.selected?`<label class="group-room-count">Pessoas neste quarto<input type="number" min="1" max="${room.capacity}" value="${state.count}" data-room-count="${room.id}" required></label><div class="group-people">${peopleHTML(room,state)}</div>`:''}</article>`;}).join('')}</div>`:'<p>Nenhum quarto ativo neste andar.</p>'}</div>`;}).join('');count();
 }
 async function availability(){
  const start=$('#group-start'),end=$('#group-end');if(!start.reportValidity()||!end.reportValidity())return;
  if(end.value<=start.value){message('A saída deve ser depois da entrada.',true);return;}
  const sequence=++availabilitySequence,key=start.value+'|'+end.value;$('#group-availability').disabled=true;
  message('Consultando disponibilidade…');
  try{const data=await api('excursions/rooms?'+new URLSearchParams({start:start.value,end:end.value}));if(sequence!==availabilitySequence||key!==$('#group-start').value+'|'+$('#group-end').value)return;
   rooms=data.rooms||[];for(const room of rooms)if(!roomState.has(room.id))roomState.set(room.id,{selected:false,count:1,people:[]});
   availabilityKey=key;invalidate();paintRooms();message('Disponibilidade atualizada. Selecione os quartos do grupo.');
  }catch(error){message(error.message,true);}finally{$('#group-availability').disabled=false;}
 }
 function payload(){return {start:$('#group-start').value,end:$('#group-end').value,name:$('#group-name').value.trim(),guest:$('#group-leader').value.trim(),phone:$('#group-phone').value.trim(),rooms:selectedRooms().map(room=>{const state=roomState.get(room.id);return {room_id:room.id,people:state.people.slice(0,state.count).map(person=>({name:person.name.trim(),age:person.age}))};})};}
 form.addEventListener('input',event=>{
  if(event.target.dataset.personName){const state=roomState.get(Number(event.target.dataset.personName));state.people[Number(event.target.dataset.personIndex)].name=event.target.value;}
  invalidate();
 });
 form.addEventListener('change',event=>{
  const input=event.target;invalidate();
  if(input.dataset.roomSelect){roomState.get(Number(input.dataset.roomSelect)).selected=input.checked;paintRooms();}
  if(input.dataset.roomCount){const room=rooms.find(r=>r.id===Number(input.dataset.roomCount));if(!input.reportValidity())return;roomState.get(room.id).count=Number(input.value);paintRooms();}
  if(input.dataset.personType){const state=roomState.get(Number(input.dataset.personType));state.people[Number(input.dataset.personIndex)].age=input.value==='adult'?null:'';paintRooms();}
  if(input.dataset.personAge){roomState.get(Number(input.dataset.personAge)).people[Number(input.dataset.personIndex)].age=input.value===''?'':Number(input.value);}
  if(input.id==='group-start'&&input.value){const next=new Date(input.value+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);$('#group-end').min=next.toISOString().slice(0,10);}
 });
 $('#group-availability').onclick=availability;
 form.onsubmit=async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=payload();if(!data.rooms.length){message('Selecione pelo menos um quarto.',true);return;}
  if(data.rooms.length>18){message('Selecione até 18 quartos.',true);return;}
  if(availabilityKey!==data.start+'|'+data.end){message('Atualize a disponibilidade após mudar as datas.',true);return;}
  if(selectedRooms().some(room=>!room.available)){message('Desmarque os quartos sem disponibilidade para este período.',true);return;}
  const version=draftVersion;$('#group-quote').disabled=true;message('Conferindo o orçamento…');
  try{const result=await api('excursions/quote',data);if(version!==draftVersion)return;
   quote={data,total:result.total,version};requestId=crypto.randomUUID();
   const people=result.rooms.reduce((sum,room)=>sum+room.guests,0);
   $('#group-quote-summary').innerHTML=`<p>${result.nights} noite(s) · ${people} pessoas · ${result.rooms.length} quartos</p><p>Total da solicitação</p><strong class="group-quote-price">${esc(money(result.total))}</strong><p>Confira os nomes e a distribuição antes de enviar.</p>`;
   $('#group-quote-summary').hidden=false;$('#group-submit').hidden=false;message('Orçamento conferido. Envie para a pousada analisar.');
  }catch(error){message(error.message,true);}finally{$('#group-quote').disabled=false;}
 };
 $('#group-submit').onclick=async()=>{
  if(sending||!quote||quote.version!==draftVersion)return;
  if(!user){message('Entre com Google e clique em Já entrei, atualizar acesso antes de enviar.',true);$('.group-login').scrollIntoView({behavior:'smooth',block:'center'});return;}
  const controls=[...form.elements].map(element=>[element,element.disabled]);controls.forEach(([element])=>element.disabled=true);sending=true;message('Enviando solicitação do grupo…');
  try{const result=await api('excursions',{...quote.data,expected_total:quote.total,request_id:requestId});
   const receipt=document.createElement('section');receipt.className='group-box';receipt.innerHTML=`<h2>Solicitação do grupo recebida</h2><p><strong translate="no">${esc(result.name)}</strong> · ${result.guest_count} pessoas · ${result.room_count} quartos</p><p>Aguarde a confirmação da pousada. Consulte a distribuição e o andamento em Meus grupos e excursões.</p><a class="group-btn secondary" href="/grupos">Organizar outro grupo</a>`;form.before(receipt);form.hidden=true;await loadMine();receipt.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){message(error.message,true);if(error.status===401)refreshSession();}finally{sending=false;controls.forEach(([element,disabled])=>element.disabled=disabled);}
 };
 async function loadMine(){
  const sequence=++mineSequence;
  if(!user){$('#group-mine').hidden=true;$('#group-mine-list').innerHTML='';return;}
  try{const data=await api('excursions/mine');if(sequence!==mineSequence||!user)return;
   $('#group-mine').hidden=false;$('#group-mine-list').innerHTML=data.groups.length?data.groups.map(group=>`<details class="group-mine-card"><summary><span translate="no">${esc(group.name)}</span> · ${esc(states[group.status]||group.status)}</summary><p>${date(group.start)} a ${date(group.end)} · ${group.guest_count} pessoas · ${group.room_count} quartos</p>${roster(group)}${group.status==='confirmada'?`<button type="button" class="group-btn" data-group-print="${esc(group.id)}">Gerar lista de check-in</button>`:'<p class="group-print-status">A lista para check-in será liberada após a confirmação do grupo.</p>'}</details>`).join(''):'<p>Você ainda não enviou uma solicitação de grupo.</p>';
  }catch(error){if(sequence!==mineSequence)return;$('#group-mine').hidden=false;$('#group-mine-list').textContent=error.message;}
 }
 $('#group-refresh-mine').onclick=loadMine;
 $('#group-mine').onclick=async event=>{const button=event.target.closest('[data-group-print]');if(!button)return;try{await window.excursionRoster.print('/api/excursions/'+button.dataset.groupPrint+'/manifest');}catch(error){message(error.message,true);}};
 async function refreshSession(){
  const sequence=++sessionSequence;
  try{const response=await fetch('/api/guest/session',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível verificar sua conta.');const data=await response.json();if(sequence!==sessionSequence)return;user=data.user||null;
   $('#group-login-form').hidden=Boolean(user);$('#group-refresh-session').hidden=Boolean(user);$('#group-account').hidden=!user;
   $('#group-organizer-name').hidden=!user;$('#group-organizer-name').textContent=user?.name||'';
   $('#group-session-status').textContent=user?'Conta conectada. Você pode enviar a solicitação.':'Entre com Google para enviar e acompanhar seu grupo. O acesso abre em outra aba.';
   if(user&&!$('#group-leader').value)$('#group-leader').value=user.name||'';await loadMine();
  }catch(error){if(sequence!==sessionSequence)return;user=null;$('#group-login-form').hidden=true;$('#group-refresh-session').hidden=false;$('#group-account').hidden=true;$('#group-organizer-name').hidden=true;$('#group-organizer-name').textContent='';$('#group-session-status').textContent=error.message;await loadMine();}
 }
 $('#group-refresh-session').onclick=refreshSession;window.addEventListener('focus',()=>{if(!sending)refreshSession();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!sending)refreshSession();});
 refreshSession();availability();
})();
