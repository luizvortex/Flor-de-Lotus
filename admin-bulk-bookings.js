'use strict';
(() => {
 const selected=new Set();let rows=[],callbacks={},busy=false;
 const toolbar=()=>`<div class="booking-bulk"><p data-bulk-count role="status">0 reservas selecionadas</p><div class="booking-bulk-actions"><button type="button" class="btn" data-booking-bulk="confirm" disabled>Confirmar selecionadas</button><button type="button" class="btn danger" data-booking-bulk="delete" disabled>Excluir selecionadas</button><button type="button" class="btn secondary" data-booking-clear disabled>Limpar seleção</button></div><p class="hint">Confirme pendentes com quarto definido. Para excluir, cancele a reserva antes. Até 100 reservas por ação.</p></div>`;
 const eligible=action=>rows.filter(b=>selected.has(b.id)&&(action==='confirm'?b.status==='pendente'&&b.room_assigned!==false:b.status==='cancelada'));
 function sync(){
  const host=document.querySelector('.booking-bulk');if(!host)return;
  document.querySelectorAll('[data-booking-select]').forEach(input=>{input.checked=selected.has(Number(input.value));input.disabled=busy;input.closest('tr').classList.toggle('booking-selected',input.checked);});
  const all=document.querySelector('[data-booking-select-all]');
  if(all){all.checked=rows.length>0&&selected.size===rows.length;all.indeterminate=selected.size>0&&selected.size<rows.length;all.disabled=busy||!rows.length;}
  host.querySelector('[data-bulk-count]').textContent=`${selected.size} reserva${selected.size===1?'':'s'} selecionada${selected.size===1?'':'s'}`;
  host.setAttribute('aria-busy',String(busy));
  host.querySelectorAll('[data-booking-bulk]').forEach(button=>{
   const count=eligible(button.dataset.bookingBulk).length;
   button.disabled=busy||count===0||count>100;
   button.textContent=`${button.dataset.bookingBulk==='confirm'?'Confirmar':'Excluir'} selecionadas${count?' ('+count+')':''}`;
  });
  host.querySelector('[data-booking-clear]').disabled=busy||!selected.size;
  document.querySelectorAll('#content [data-confirm],#content [data-cancel],#content [data-assign],#content #refresh').forEach(button=>{
   if(busy&&!button.hasAttribute('data-bulk-disabled')){button.dataset.bulkDisabled=String(button.disabled);button.disabled=true;}
   else if(!busy&&button.hasAttribute('data-bulk-disabled')){button.disabled=button.dataset.bulkDisabled==='true';delete button.dataset.bulkDisabled;}
  });
 }
 function mount(bookings,handlers){rows=bookings;callbacks=handlers;const existing=new Set(rows.map(b=>b.id));for(const id of selected)if(!existing.has(id))selected.delete(id);sync();}
 document.addEventListener('change',event=>{
  if(busy)return;
  if(event.target.matches('[data-booking-select]')){
   const id=Number(event.target.value);if(event.target.checked)selected.add(id);else selected.delete(id);sync();
  }else if(event.target.matches('[data-booking-select-all]')){
   selected.clear();if(event.target.checked)rows.forEach(b=>selected.add(b.id));sync();
  }
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-booking-bulk],[data-booking-clear]');if(!button||busy)return;
  if(button.hasAttribute('data-booking-clear')){selected.clear();sync();return;}
  const action=button.dataset.bookingBulk,ids=eligible(action).map(b=>b.id);
  if(!ids.length||ids.length>100)return;
  const question=action==='delete'?`Excluir definitivamente ${ids.length} reserva(s) cancelada(s)? Elas sairão do histórico e da área do hóspede. Esta ação não pode ser desfeita.`:`Confirmar ${ids.length} reserva(s) selecionada(s) com quarto definido?`;
  if(!window.confirm(question))return;
  busy=true;sync();let completed=false;
  try{
   const response=await fetch('/api/bookings/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,ids})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível concluir a ação.');
   completed=true;ids.forEach(id=>selected.delete(id));
   await callbacks.refresh();
   callbacks.notify(`${result.count} reserva(s) ${action==='delete'?'excluída(s)':'confirmada(s)'}.`);
  }catch(error){callbacks.notify(completed?'A ação foi concluída, mas não foi possível atualizar a lista. Clique em Atualizar.':error.message,true);}
  finally{busy=false;sync();}
 });
 window.adminBookingBulk={toolbar,mount,clear(){selected.clear();},get busy(){return busy;}};
})();
