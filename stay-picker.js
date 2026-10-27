'use strict';
(() => {
 const $=s=>document.querySelector(s),form=$('#search')||$('#group-form');if(!form)return;
 const entry=$('#checkin')||$('#group-start'),exit=$('#checkout')||$('#group-end'),guests=$('#guests'),calendar=$('#dates-picker'),guestPanel=$('#guests-picker');
 const localParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=k=>localParts.find(p=>p.type===k).value,today=`${part('year')}-${part('month')}-${part('day')}`;
 const date=v=>new Date(v+'T12:00:00Z'),iso=d=>d.toISOString().slice(0,10),add=(v,n)=>{const d=date(v);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
 const monthStart=v=>v.slice(0,7)+'-01',shiftMonth=(v,n)=>{const d=date(v);d.setUTCMonth(d.getUTCMonth()+n,1);return iso(d);};
 const short=v=>new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short',timeZone:'UTC'}).format(date(v));
 const full=v=>new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date(v));
 let view=monthStart(entry.value||today),start=entry.value,end=exit.value,selectingEnd=false;
 const nights=()=>start&&end?Math.round((date(end)-date(start))/86400000):0;
 function sync(){
  $('#dates-summary').textContent=entry.value&&exit.value?`${short(entry.value)} - ${short(exit.value)}`:'Escolha as datas';
  if(!guests)return;
  if(window.stayParty){window.stayParty.sync();return;}
  const n=Number(guests.value);$('#guests-summary').textContent=`${n||1} ${n===1?'hóspede':'hóspedes'}, 1 quarto`;
  form.querySelector('[data-guests-step="-1"]').disabled=n<=1;form.querySelector('[data-guests-step="1"]').disabled=n>=6;
 }
 function close(panel,focus=false){if(!panel)return;panel.hidden=true;const button=panel===calendar?$('#dates-trigger'):$('#guests-trigger');button.setAttribute('aria-expanded','false');if(focus)button.focus();}
 function open(panel){
  close(panel===calendar?guestPanel:calendar);panel.hidden=false;
  (panel===calendar?$('#dates-trigger'):$('#guests-trigger')).setAttribute('aria-expanded','true');
  if(panel===calendar){start=entry.value;end=exit.value;selectingEnd=false;view=monthStart(start||today);render();calendar.querySelector('[data-day]:not([disabled])')?.focus({preventScroll:true});}
  else guestPanel.querySelector('[data-party-step="1"],[data-guests-step="1"]').focus({preventScroll:true});
 }
 function render(){
  const minimum=monthStart(today);calendar.querySelector('[data-calendar-prev]').disabled=view<=minimum;
  $('#calendar-instruction').textContent=selectingEnd?'Escolha a saída':'Escolha a entrada';
  $('#calendar-months').innerHTML=[0,1].map(offset=>{
   const first=shiftMonth(view,offset),d=date(first),last=date(shiftMonth(first,1));last.setUTCDate(0);
   const heading=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(d).replace(' de ', ', ');
   const dayStart=add(first,-d.getUTCDay());
   return `<section class="calendar-month" aria-label="${heading}"><h3>${heading}</h3><div class="calendar-weekdays" aria-hidden="true">${['dom.','seg.','ter.','qua.','qui.','sex.','sáb.'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-days">${Array.from({length:42},(_,i)=>{
    const value=add(dayStart,i),outside=value.slice(0,7)!==first.slice(0,7),disabled=outside||value<today;
    const rangeEnd=end,inRange=start&&rangeEnd&&value>start&&value<rangeEnd;
    const chosen=value===start||value===end;
    return `<button type="button" data-day="${value}" class="${outside?'outside ':''}${chosen?'selected ':''}${inRange?'in-range ':''}" ${disabled?'disabled':''} aria-label="${full(value)}${value===start?', entrada':''}${value===end?', saída':''}" aria-pressed="${Boolean(chosen)}" ${value===today?'aria-current="date"':''}>${date(value).getUTCDate()}</button>`;
   }).join('')}</div></section>`;
  }).join('');
  $('#apply-dates').disabled=!start||!end||nights()<1;
  $('#apply-dates').textContent=nights()>0?`Buscar ${nights()} ${nights()===1?'noite':'noites'}`:'Selecione a saída';
  $('#calendar-range-status').textContent=start?(end?`${short(start)} - ${short(end)}`:`Entrada: ${short(start)}`):'';
 }
 $('#dates-trigger').onclick=()=>calendar.hidden?open(calendar):close(calendar);
 if(guestPanel)$('#guests-trigger').onclick=()=>guestPanel.hidden?open(guestPanel):close(guestPanel);
 calendar.querySelector('[data-calendar-prev]').onclick=()=>{view=shiftMonth(view,-1);render();};
 calendar.querySelector('[data-calendar-next]').onclick=()=>{view=shiftMonth(view,1);render();};
 $('#calendar-months').onclick=event=>{
  const button=event.target.closest('[data-day]');if(!button||button.disabled)return;const value=button.dataset.day;
  if(!selectingEnd||value<=start){start=value;end='';selectingEnd=true;}else{end=value;selectingEnd=false;}render();
  calendar.querySelector(`[data-day="${value}"]:not([disabled])`)?.focus({preventScroll:true});
 };
 $('#calendar-months').onkeydown=event=>{
  const button=event.target.closest('[data-day]');if(!button)return;
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];if(!step)return;event.preventDefault();
  const value=add(button.dataset.day,step);if(value<today)return;
  if(value<view)view=monthStart(value);else if(value>=shiftMonth(view,2))view=shiftMonth(monthStart(value),-1);
  // Keep keyboard navigation visible when the second month is hidden on mobile.
  if(matchMedia('(max-width:600px)').matches&&monthStart(value)!==view)view=monthStart(value);
  render();calendar.querySelector(`[data-day="${value}"]:not([disabled])`)?.focus();
 };
 $('#apply-dates').onclick=()=>{if(!start||!end||nights()<1)return;entry.value=start;exit.value=end;exit.min=add(start,1);entry.dispatchEvent(new Event('change',{bubbles:true}));exit.dispatchEvent(new Event('change',{bubbles:true}));sync();close(calendar,true);form.dispatchEvent(new Event('lotus:dates-applied'));};
 if(guestPanel)guestPanel.addEventListener('click',event=>{const b=event.target.closest('[data-guests-step]');if(!b)return;guests.value=Math.min(6,Math.max(1,Number(guests.value||1)+Number(b.dataset.guestsStep)));guests.dispatchEvent(new Event('change',{bubbles:true}));});
 if(guestPanel&&!window.stayParty)$('#apply-guests').onclick=()=>{if(!guests.reportValidity())return;sync();close(guestPanel,true);};
 form.addEventListener('change',sync);form.addEventListener('input',sync);
 document.addEventListener('lotus:search-updated',sync);
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.dates-control'))close(calendar);if(!event.target.closest('.guests-control'))close(guestPanel);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!calendar.hidden){event.preventDefault();close(calendar,true);}if(guestPanel&&!guestPanel.hidden){event.preventDefault();close(guestPanel,true);}}});
 // Close a panel once keyboard focus leaves its complete control.
 form.addEventListener('focusout',event=>{const control=event.target.closest('.stay-control');if(control&&event.relatedTarget&&!control.contains(event.relatedTarget)){const panel=control.querySelector('.stay-popover');if(panel)close(panel);}});
 form.addEventListener('submit',()=>{close(calendar);close(guestPanel);});sync();
})();
