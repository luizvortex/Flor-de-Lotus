'use strict';
(() => {
 const form=document.getElementById('search'),panel=document.getElementById('guests-picker');if(!form||!panel)return;
 const totalInput=document.getElementById('guests'),partyInput=document.getElementById('party');
 const params=new URLSearchParams(location.search);let rooms=[{adults:2,children_ages:[]}];
 try{const raw=params.get('party');if(raw){const value=JSON.parse(raw);if(Array.isArray(value)&&value.length>=1&&value.length<=18&&value.every(r=>Number.isInteger(r.adults)&&r.adults>=1&&r.adults<=6&&Array.isArray(r.children_ages)&&r.children_ages.length<=6&&r.children_ages.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<=17)))rooms=value;}else if(params.has('guests')){const n=Number(params.get('guests'));if(Number.isInteger(n)&&n>=1&&n<=6)rooms=[{adults:n,children_ages:[]}];}}catch{}

 const count=()=>rooms.reduce((n,r)=>n+r.adults+r.children_ages.length,0);
 const label=()=>`${count()} ${count()===1?'hóspede':'hóspedes'}, ${rooms.length} ${rooms.length===1?'quarto':'quartos'}`;
 function sync(){totalInput.value=count();partyInput.value=JSON.stringify(rooms);document.getElementById('guests-summary').textContent=label();document.getElementById('apply-guests').textContent=`Buscar · ${label().replace(', ',' · ')}`;}
 function row(index,field,title,hint,value,min,max){return `<div class="party-row"><div><strong>${title}</strong><small>${hint}</small></div><div class="party-counter"><button type="button" data-party-room="${index}" data-party-field="${field}" data-party-step="-1" aria-label="Diminuir ${title.toLowerCase()}${field==='rooms'?'':` no quarto ${index+1}`}" ${value<=min?'disabled':''}>−</button><output aria-live="polite">${value}</output><button type="button" data-party-room="${index}" data-party-field="${field}" data-party-step="1" aria-label="Aumentar ${title.toLowerCase()}${field==='rooms'?'':` no quarto ${index+1}`}" ${value>=max?'disabled':''}>+</button></div></div>`;}
 function paint(){
  document.getElementById('party-error').textContent='';
  document.getElementById('party-room-list').innerHTML=rooms.map((r,i)=>`${rooms.length>1?`<h4>Quarto ${i+1}</h4>`:''}${row(i,'adults','Adultos','A partir de 18 anos',r.adults,1,6-r.children_ages.length)}${row(i,'children','Crianças','De 0 a 17 anos',r.children_ages.length,0,6-r.adults)}${r.children_ages.length?`<div class="party-ages">${r.children_ages.map((age,j)=>`<label>Idade da criança ${j+1}<select required data-child-room="${i}" data-child-index="${j}" aria-label="Idade da criança ${j+1} no quarto ${i+1}"><option value="" ${age===null?'selected':''} disabled>Idade na entrada</option>${Array.from({length:18},(_,n)=>`<option value="${n}" ${age===n?'selected':''}>${n===0?'Menos de 1 ano':`${n} ${n===1?'ano':'anos'}`}</option>`).join('')}</select></label>`).join('')}</div>`:''}`).join('')+row(0,'rooms','Quartos','De quantos quartos você precisa?',rooms.length,1,18);
  sync();
 }
 panel.addEventListener('click',event=>{
  const button=event.target.closest('[data-party-step]');if(!button)return;
  const index=Number(button.dataset.partyRoom),field=button.dataset.partyField,step=Number(button.dataset.partyStep);
  if(field==='rooms'){const n=Math.min(18,Math.max(1,rooms.length+step));while(rooms.length<n)rooms.push({adults:1,children_ages:[]});rooms.length=n;}
  else if(field==='adults')rooms[index].adults=Math.min(6,Math.max(1,rooms[index].adults+step));
  else if(step>0&&rooms[index].children_ages.length<6)rooms[index].children_ages.push(null);else if(step<0)rooms[index].children_ages.pop();
  paint();const replacement=panel.querySelector(`[data-party-room="${index}"][data-party-field="${field}"][data-party-step="${step}"]:not([disabled])`);(replacement||panel.querySelector(`[data-party-room="${index}"][data-party-field="${field}"][data-party-step="${-step}"]:not([disabled])`))?.focus({preventScroll:true});form.dispatchEvent(new Event('change',{bubbles:true}));
 });
 panel.addEventListener('change',event=>{const select=event.target.closest('[data-child-room]');if(select){rooms[Number(select.dataset.childRoom)].children_ages[Number(select.dataset.childIndex)]=select.value===''?null:Number(select.value);sync();}});
 function validate(){
  const error=document.getElementById('party-error');error.textContent='';
  if(rooms.some(r=>r.adults+r.children_ages.length>6)){error.textContent='Cada quarto acomoda até 6 pessoas, incluindo crianças. Ajuste a composição ou adicione outro quarto.';panel.hidden=false;document.getElementById('guests-trigger').setAttribute('aria-expanded','true');return false;}
  const incomplete=panel.querySelector('select:invalid');if(incomplete){panel.hidden=false;document.getElementById('guests-trigger').setAttribute('aria-expanded','true');incomplete.reportValidity();return false;}return true;
 }
 document.getElementById('apply-guests').onclick=()=>{if(!validate())return;sync();panel.hidden=true;const trigger=document.getElementById('guests-trigger');trigger.setAttribute('aria-expanded','false');trigger.focus();};
 form.addEventListener('invalid',event=>{if(panel.contains(event.target)){panel.hidden=false;document.getElementById('guests-trigger').setAttribute('aria-expanded','true');}},true);
 window.stayParty={setSingleAdults:n=>{rooms=[{adults:Math.min(6,Math.max(1,Number(n))),children_ages:[]}];paint();},get:()=>structuredClone(rooms),count,label,sync,validate};paint();
})();
