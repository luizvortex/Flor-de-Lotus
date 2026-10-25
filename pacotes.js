'use strict';
(() => {
 const container=document.querySelector('#all-packages');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>v.split('-').reverse().join('/');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 async function load(){
  try{
   const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();
   const packages=(data.packages||[]).filter(p=>p.active!==0&&p.end>today);
   container.innerHTML=packages.length?packages.map(p=>{
    const start=p.start<today?today:p.start,end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+p.nights);
    const query=new URLSearchParams({start,end:end.toISOString().slice(0,10),guests:({solteiro:1,casal:2,casal_mais_um:3,quadruplo:4,familia:5}[p.type]||1),package_id:p.id});
    return `<article class="package-card"><h2>${esc(p.name)}</h2><p>${p.nights+1} dias · ${p.nights} noites<br>${esc(date(p.start))} a ${esc(date(p.end))}</p><p>${esc((p.price/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}))} / pacote por quarto</p><a class="gold-button" href="/quartos?${esc(query)}">Consultar pacote</a></article>`;
   }).join(''):'<p>Não há pacotes disponíveis neste momento. Você pode consultar as diárias dos quartos.</p>';
  }catch{container.innerHTML='<p>Não foi possível carregar os pacotes.</p><button class="gold-button" type="button">Tentar novamente</button>';container.querySelector('button').onclick=load;}
 }
 load();
})();
