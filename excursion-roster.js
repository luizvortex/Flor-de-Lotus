'use strict';
(() => {
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const floor=value=>({terreo:'Térreo',superior:'Piso superior'}[value]||value);
 const states={pendente:'Pendente',confirmada:'Confirmada',cancelada:'Cancelada',parcial:'Confirmação parcial'};
 const date=value=>String(value||'').split('-').reverse().join('/');
 function html(group,admin=false){return `<div class="group-roster"><table><thead><tr><th>Quarto / andar</th><th>Hóspedes</th><th>Status</th></tr></thead><tbody>${group.rooms.map(room=>`<tr><td><strong>Quarto ${esc(room.room_name)}</strong><br>${esc(floor(room.floor))}${admin&&room.status!=='cancelada'?`<br><button class="btn secondary" data-assign="${room.booking_id}" type="button">Definir quarto</button>`:''}</td><td><ol>${room.people.map(person=>`<li><span translate="no">${esc(person.name)}</span>${person.age!==null?` <small>· criança, ${esc(person.age)} anos</small>`:''}</li>`).join('')}</ol></td><td><span class="badge ${esc(room.status)}">${esc(states[room.status]||room.status)}</span></td></tr>`).join('')}</tbody></table></div>`;}
 async function print(url){
  const preview=window.open('','_blank');if(!preview)throw Error('Permita a abertura da lista em uma nova aba.');
  preview.document.title='Preparando lista de check-in';preview.document.body.textContent='Preparando lista…';
  try{
   const response=await fetch(url,{cache:'no-store'}),group=await response.json();if(!response.ok)throw Error(group.error||'Não foi possível gerar a lista.');
   if(preview.closed)return;
   preview.document.open();preview.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Lista de check-in · ${esc(group.name)}</title><meta name="robots" content="noindex,nofollow"><style>body{font:14px/1.5 Arial,sans-serif;color:#172b24;margin:32px}h1{font-size:26px}h2{font-size:20px}table{border-collapse:collapse;width:100%}td,th{padding:12px;border:1px solid #ccc;text-align:left;vertical-align:top}th{background:#f3f3ed}ol{margin:0;padding-left:20px}li{padding:3px}tr{break-inside:avoid}button{padding:12px 20px;margin-bottom:20px;cursor:pointer}small{font-size:11px}@media print{button{display:none}body{margin:0}thead{display:table-header-group}}</style></head><body><button id="print-list" type="button">Imprimir / salvar PDF</button><p>Pousada Flor de Lótus · Itacaré, Bahia</p><h1>Lista para check-in</h1><h2>${esc(group.name)}</h2><p>${date(group.start)} a ${date(group.end)} · ${group.guest_count} pessoas · ${group.room_count} quartos<br>Responsável: ${esc(group.guest)} · ${esc(group.phone)}</p>${html(group)}<p><small>Distribuição confirmada pela pousada. Relação destinada à organização do check-in.</small></p></body></html>`);preview.document.close();preview.opener=null;
   preview.document.getElementById('print-list').onclick=()=>preview.print();
  }catch(error){preview.close();throw error;}
 }
 window.excursionRoster={html,print,esc,date,states};
})();
