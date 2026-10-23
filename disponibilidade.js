'use strict';
(() => {
 const dialog=document.getElementById('availability-dialog');if(!dialog)return;
 const form=dialog.querySelector('form'),start=form.elements.start,end=form.elements.end,guests=form.elements.guests;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=key=>parts.find(p=>p.type===key).value,today=`${part('year')}-${part('month')}-${part('day')}`;
 const nextDay=value=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
 let opener,pending;
 const submit=form.querySelector('[type="submit"]');
 const reset=()=>{submit.disabled=false;submit.textContent='Ver disponibilidade';};
 start.min=today;start.value=today;end.value=end.min=nextDay(today);
 start.addEventListener('change',()=>{if(!start.value)return;end.min=nextDay(start.value);if(end.value<=start.value)end.value=end.min;});
 document.querySelectorAll('[data-availability-open]').forEach(button=>button.addEventListener('click',event=>{
  event.preventDefault();opener=button;dialog.querySelector('[role="alert"]').textContent='';dialog.showModal();
 }));
 dialog.querySelector('[data-availability-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{pending?.abort();pending=null;reset();opener?.focus({preventScroll:true});});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const error=dialog.querySelector('[role="alert"]'),button=form.querySelector('[type="submit"]');
  error.textContent='';if(end.value<=start.value){error.textContent='A saída deve ser depois da entrada.';return;}
  const query=new URLSearchParams({start:start.value,end:end.value,guests:guests.value});
  pending?.abort();const controller=new AbortController();pending=controller;
  const timeout=setTimeout(()=>controller.abort(),15000);button.disabled=true;button.textContent='Consultando…';
  try{
   const response=await fetch('/api/availability?'+query,{signal:controller.signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível consultar as datas.');
   if(dialog.open&&pending===controller)location.assign('/quartos?'+query);
  }catch(e){if(dialog.open&&pending===controller)error.textContent=e.name==='AbortError'?'A consulta demorou mais que o esperado. Tente novamente.':e.message;}
  finally{clearTimeout(timeout);if(pending===controller){pending=null;reset();}}
 });
})();
