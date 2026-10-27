'use strict';
(() => {
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const parse=value=>new Date(value+'T12:00:00Z');
 const add=(value,days)=>{const d=parse(value);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const distance=(first,last)=>Math.round((parse(last)-parse(first))/86400000);
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parse(value).getTime())&&parse(value).toISOString().slice(0,10)===value;
 const date=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(parse(value));
 const weekday=value=>new Intl.DateTimeFormat('pt-BR',{weekday:'short',timeZone:'UTC'}).format(parse(value)).replace('.','');
 const monthName=value=>new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(parse(value));
 const order=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
 let start='',end='',floor='',room='',data,host,options,defaultRange=true,previousToday='',selected=null;
 function tone(booking){if(booking.status==='bloqueio')return 'blocked';return booking.end<=options.today?'ended':booking.status==='confirmada'?'confirmed':'pending';}
 function status(booking){return {blocked:'Bloqueio de disponibilidade',ended:'Estadia encerrada',confirmed:'Reserva confirmada',pending:'Reserva pendente'}[tone(booking)];}
 function relevant(booking){return ['pendente','confirmada','bloqueio'].includes(booking.status)&&booking.start<=end&&booking.end>start;}
 function layout(){return `<section class="panel calendar-panel" data-calendar-root><div class="panel-head"><h2>Calendário de reservas</h2><button type="button" class="btn secondary" data-calendar-refresh>Atualizar</button></div><form class="reservation-calendar-filters" data-calendar-filter><label>Mês<input type="month" id="calendar-month" value="${start.slice(0,7)}"></label><label>De<input type="date" name="start" value="${start}" required></label><label>Até<input type="date" name="end" value="${end}" required></label><label>Andar<select id="calendar-floor"><option value="">Todos os andares</option><option value="terreo" ${floor==='terreo'?'selected':''}>Térreo / Standard</option><option value="superior" ${floor==='superior'?'selected':''}>Piso superior</option></select></label><label>Apartamento<select id="calendar-room"><option value="">Todos os apartamentos</option>${[...data.rooms].sort((a,b)=>order.compare(a.name,b.name)).map(r=>`<option value="${r.id}" ${String(r.id)===room?'selected':''}>${esc(r.name)}${r.active?'':' · inativo'}</option>`).join('')}</select></label><button type="submit" class="btn">Consultar período</button></form><p class="calendar-error" role="alert" data-calendar-error></p><div class="reservation-calendar-toolbar"><div><button type="button" class="btn secondary" data-calendar-shift="-1" aria-label="Período anterior">←</button> <button type="button" class="btn secondary" data-calendar-today>Hoje</button> <button type="button" class="btn secondary" data-calendar-shift="1" aria-label="Próximo período">→</button></div><p data-calendar-caption></p><small data-calendar-updated role="status"></small></div><div class="reservation-calendar-legend" aria-label="Legenda das reservas"><span class="calendar-key confirmed">Confirmada</span><span class="calendar-key pending">Pendente</span><span class="calendar-key ended">Estadia encerrada</span><span class="calendar-key blocked">Bloqueio</span></div><p class="hint">Clique no nome para ver a reserva. A saída libera o quarto para outra entrada no mesmo dia. Reservas canceladas não aparecem.</p><div class="reservation-calendar-viewport" tabindex="0" role="region" aria-label="Calendário por apartamento e data, com rolagem horizontal e vertical" data-calendar-viewport></div><p class="hint" data-calendar-provisional hidden>As reservas com quarto a definir aparecem com borda tracejada na unidade provisória. Use Definir quarto antes de confirmar.</p><dialog class="calendar-booking-dialog" id="calendar-booking-dialog" aria-labelledby="calendar-detail-title"></dialog></section>`;}
 function paint(){
  if(!host?.querySelector('[data-calendar-root]'))return;
  const days=Array.from({length:distance(start,end)+1},(_,index)=>add(start,index));
  const bookings=data.bookings.filter(relevant);
  const rooms=[...data.rooms].filter(r=>(r.active||bookings.some(b=>b.room_id===r.id))&&(!floor||r.floor===floor)&&(!room||String(r.id)===room)).sort((a,b)=>order.compare(a.name,b.name)||a.id-b.id);
  const viewport=host.querySelector('[data-calendar-viewport]'),left=viewport.scrollLeft,top=viewport.scrollTop;
  const focused=document.activeElement?.dataset.calendarBooking;
  const dayClass=value=>(value===options.today?' is-today':'')+([0,6].includes(parse(value).getUTCDay())?' is-weekend':'');
  viewport.innerHTML=`<div class="reservation-calendar-board" role="table" aria-label="Reservas de ${date(start)} a ${date(end)}" style="--calendar-days:${days.length}"><div class="reservation-calendar-row calendar-header" role="row"><div class="calendar-room-label calendar-corner" role="columnheader">Apartamento<small>Tipo / andar</small></div>${days.map(value=>`<div role="columnheader" class="calendar-day-heading${dayClass(value)}" ${value===options.today?'aria-current="date"':''}><small>${esc(weekday(value))}</small><strong>${value.slice(8)}</strong><span>${value.slice(5,7)}/${value.slice(0,4)}</span></div>`).join('')}</div>${rooms.map(r=>`<div class="reservation-calendar-row" role="row"><div class="calendar-room-label" role="rowheader"><strong>${esc(r.name)}</strong><small>${r.floor==='superior'?'Piso superior':r.floor==='terreo'?'Standard · Térreo':'Andar não definido'}${r.capacity>=5?' · Família':''}${r.active?'':' · inativo'}</small></div><div class="calendar-room-lane" role="cell" aria-colindex="2" aria-colspan="${days.length}" aria-label="Reservas do apartamento ${esc(r.name)}">${days.map((value,index)=>`<span class="calendar-slot${dayClass(value)}" style="grid-column:${index+1}" aria-hidden="true"></span>`).join('')}${bookings.filter(b=>b.room_id===r.id).map(b=>{
   const first=b.start<start?start:b.start,last=b.end>add(end,1)?add(end,1):b.end,column=distance(start,first)+1,span=distance(first,last);
   const provisional=b.room_assigned===false&&b.status!=='bloqueio';
   const label=`${b.guest} · ${status(b)} · Apartamento ${r.name} · ${date(b.start)} a ${date(b.end)}${provisional?' · Quarto a definir (unidade provisória)':''}`;
   return `<button type="button" class="calendar-booking ${tone(b)}${provisional?' provisional':''}" data-calendar-booking="${b.id}" style="grid-column:${column} / span ${span}" title="${esc(label)}" aria-label="${esc(label)}"><span>${esc(b.guest)}</span>${provisional?'<small>A definir</small>':''}</button>`;
  }).join('')}</div></div>`).join('')}</div>${rooms.length?'':'<p class="empty">Nenhum apartamento neste filtro.</p>'}`;
  viewport.scrollLeft=left;viewport.scrollTop=top;
  if(focused)viewport.querySelector(`[data-calendar-booking="${Number(focused)}"]`)?.focus({preventScroll:true});
  host.querySelector('[data-calendar-caption]').textContent=`${date(start)} a ${date(end)} · ${rooms.length} apartamentos`;
  host.querySelector('[data-calendar-updated]').textContent='Atualizado às '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Bahia'}).format(new Date())+' · Bahia · automático a cada 15 segundos';
  host.querySelector('[data-calendar-provisional]').hidden=!bookings.some(b=>b.room_assigned===false&&b.status!=='bloqueio');
 }
 function setRange(first,last){
  const error=host.querySelector('[data-calendar-error]');
  if(!valid(first)||!valid(last)||last<first){error.textContent='Informe um período válido, com a data final igual ou posterior à inicial.';return false;}
  if(distance(first,last)>92){error.textContent='Consulte até 93 dias por vez. Você pode escolher qualquer mês futuro ou passado.';return false;}
  start=first;end=last;error.textContent='';const form=host.querySelector('[data-calendar-filter]');form.elements.start.value=start;form.elements.end.value=end;host.querySelector('#calendar-month').value=start.slice(0,7);paint();return true;
 }
 function showBooking(id){
  const b=data.bookings.find(x=>x.id===id);if(!b)return;
  selected=id;const r=data.rooms.find(x=>x.id===b.room_id),dialog=host.querySelector('#calendar-booking-dialog');
  dialog.innerHTML=`<div class="panel-head"><h2 id="calendar-detail-title">Reserva #${b.id}</h2><button type="button" class="close" data-calendar-close aria-label="Fechar detalhes">×</button></div><p class="calendar-detail-status ${tone(b)}">${esc(status(b))}</p><h3>${esc(b.guest)}</h3><p>Apartamento ${esc(r?.name||'—')} · ${esc({terreo:'Térreo',superior:'Piso superior'}[b.room_floor]||'Andar não registrado')}${b.room_assigned===false?' · Unidade provisória, quarto a definir':''}</p><dl><div><dt>Entrada</dt><dd>${date(b.start)}</dd></div><div><dt>Saída</dt><dd>${date(b.end)}</dd></div><div><dt>Hóspedes</dt><dd>${b.total_guests??b.guests}</dd></div><div><dt>Contato</dt><dd>${esc(b.phone)}</dd></div></dl>${tone(b)==='ended'&&b.status==='pendente'?'<p class="hint">O período terminou, mas esta solicitação permaneceu pendente.</p>':''}<div class="calendar-detail-actions">${['pendente','confirmada'].includes(b.status)&&b.end>options.today?'<button type="button" class="btn secondary" data-calendar-assign>Definir quarto</button>':''}<button type="button" class="btn" data-go="bookings">Gerenciar reservas</button></div>`;
  dialog.showModal();
 }
 function mount(){
  host.innerHTML=layout();
  host.querySelector('[data-calendar-filter]').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;if(setRange(form.elements.start.value,form.elements.end.value))defaultRange=false;};
  host.querySelector('#calendar-month').onchange=event=>{if(!/^\d{4}-\d{2}$/.test(event.target.value))return;const first=event.target.value+'-01';if(!valid(first))return;const next=parse(first);next.setUTCMonth(next.getUTCMonth()+1);if(setRange(first,add(next.toISOString().slice(0,10),-1)))defaultRange=false;};
  host.querySelector('#calendar-floor').onchange=event=>{floor=event.target.value;paint();};
  host.querySelector('#calendar-room').onchange=event=>{room=event.target.value;paint();};
  host.querySelector('[data-calendar-root]').onclick=async event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.calendarBooking)return showBooking(Number(button.dataset.calendarBooking));
   if(button.hasAttribute('data-calendar-close'))return host.querySelector('#calendar-booking-dialog').close();
   if(button.hasAttribute('data-calendar-assign')){host.querySelector('#calendar-booking-dialog').close();return options.assign(selected);}
   if(button.dataset.calendarShift){const count=distance(start,end)+1,step=Number(button.dataset.calendarShift)*count;if(setRange(add(start,step),add(end,step)))defaultRange=false;}
   if(button.hasAttribute('data-calendar-today')){defaultRange=true;setRange(options.today,add(options.today,13));host.querySelector('[data-calendar-viewport]').scrollLeft=0;}
   if(button.hasAttribute('data-calendar-refresh')){button.disabled=true;try{await options.refresh();}catch(error){const target=host?.querySelector('[data-calendar-error]');if(target)target.textContent=error.message;}finally{button.disabled=false;}}
  };
 }
 function render(container,state,settings){
  host=container;data=state;options=settings;
  if(!start||(defaultRange&&previousToday!==options.today)){start=options.today;end=add(start,13);}previousToday=options.today;
  if(!host.querySelector('[data-calendar-root]'))mount();
  paint();
 }
 function clear(){host?.querySelector('#calendar-booking-dialog')?.close();if(host?.querySelector('[data-calendar-root]'))host.replaceChildren();host=null;start='';end='';floor='';room='';selected=null;data=null;}
 window.adminCalendar={render,clear};
})();
