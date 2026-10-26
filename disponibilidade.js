'use strict';
(() => {
 const dialog=document.getElementById('availability-dialog');if(!dialog)return;
 const form=dialog.querySelector('form'),start=form.elements.start,end=form.elements.end;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=key=>parts.find(p=>p.type===key).value,today=`${part('year')}-${part('month')}-${part('day')}`;
 const nextDay=value=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
 let opener;
 start.min=today;start.value=today;end.value=end.min=nextDay(today);
 start.addEventListener('change',()=>{if(!start.value)return;end.min=nextDay(start.value);if(end.value<=start.value)end.value=end.min;});
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-availability-open],a.showcase-rates[href="/quartos"]');if(!button)return;
  event.preventDefault();opener=button;dialog.querySelector('[role="alert"]').textContent='';if(!dialog.open)dialog.showModal();
 });
 dialog.querySelector('[data-availability-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  dialog.querySelectorAll('.stay-popover').forEach(panel=>{panel.hidden=true;});
  dialog.querySelectorAll('[aria-expanded]').forEach(button=>button.setAttribute('aria-expanded','false'));
  opener?.focus({preventScroll:true});
 });
 // Keep the native GET submission: it opens a new tab within the user's click
 // and carries start/end/guests/floor without relying on window.open or a timer.
 form.addEventListener('submit',event=>{
  if(!form.reportValidity()){event.preventDefault();return;}
  if(end.value<=start.value){event.preventDefault();dialog.querySelector('[role="alert"]').textContent='A saída deve ser depois da entrada.';return;}
  dialog.close();
 });
})();
