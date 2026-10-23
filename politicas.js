'use strict';
(() => {
 const fields=[['checkin','Check-in','box-arrow-in-right'],['checkout','Check-out','box-arrow-right'],['pets','Animais de estimação','heart'],['internet','Internet','wifi'],['parking','Estacionamento','car-front'],['children','Crianças e camas extras','people'],['payments','Formas de pagamento','credit-card'],['cancellation','Cancelamento','calendar-x'],['reservations','Confirmação da reserva','calendar-check'],['additional','Outras informações','info-circle']];
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function request(body){
  const response=await fetch('/api/policies',{method:body?'PUT':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível carregar as políticas.');return data;
 }
 const grid=document.querySelector('#policy-grid');
 async function loadPublic(){
  grid.innerHTML='<p class="policy-status">Carregando informações da pousada…</p>';
  try{
   const data=await request(),visible=fields.filter(([key])=>typeof data.policies?.[key]==='string'&&data.policies[key].trim());
   grid.innerHTML=visible.length?visible.map(([key,title,icon])=>`<article class="policy-item"><h3><i class="bi bi-${icon}" aria-hidden="true"></i>${title}</h3><p>${esc(data.policies[key])}</p></article>`).join(''):'<p class="policy-status">Consulte a equipe da pousada para saber mais sobre as condições da sua estadia.</p>';
  }catch{
   grid.innerHTML='<div class="policy-status"><p>Não foi possível carregar as políticas agora.</p><button type="button" class="text-button" id="retry-policies">Tentar novamente</button> · <a href="/#fale-conosco">Fale com a pousada</a></div>';
   grid.querySelector('button').onclick=loadPublic;
  }
 }
 if(grid)loadPublic();
 let generation=0;
 window.policyEditor={async render(container){
  const current=++generation;
  const active=()=>current===generation&&document.querySelector('[data-tab="policies"]')?.classList.contains('active');
  container.innerHTML='<div class="panel"><p role="status">Carregando políticas…</p></div>';
  try{
   const data=await request();if(!active())return;
   container.innerHTML=`<div class="panel"><p class="sub">As informações salvas aparecem na página de quartos. Deixe um campo vazio para ocultá-lo. Escreva apenas condições confirmadas pela pousada.</p><a href="/quartos#politicas" target="_blank" rel="noopener">Ver políticas no site ↗</a><form id="policies-form"><div class="fields">${fields.map(([key,title])=>`<div><label for="policy-${key}">${title}</label><textarea id="policy-${key}" name="${key}" rows="4" maxlength="1000">${esc(data.policies?.[key]||'')}</textarea></div>`).join('')}</div><p class="hint">Até 1.000 caracteres por campo. As políticas informam os hóspedes; alterações nas tarifas, no calendário e nas reservas são feitas nas respectivas abas.</p><p id="policies-status" role="status" aria-live="polite"></p><div class="form-actions"><button type="button" class="btn secondary" id="reload-policies">Recarregar informações</button><button type="submit" class="btn">Salvar políticas no site</button></div></form></div>`;
   const form=container.querySelector('form'),status=form.querySelector('#policies-status');let revision=data.revision;
   form.querySelector('#reload-policies').onclick=()=>{if(!form.dataset.dirty||confirm('Descartar as alterações não salvas e carregar as políticas atuais?'))window.policyEditor.render(container);};
   form.oninput=()=>{form.dataset.dirty='true';status.textContent='Alterações ainda não salvas.';status.className='hint';};
   form.onsubmit=async event=>{
    event.preventDefault();const policies=Object.fromEntries(fields.map(([key])=>[key,form.elements.namedItem(key).value.trim()]));
    const controls=[...form.elements];controls.forEach(el=>el.disabled=true);status.textContent='Salvando…';status.className='hint';
    try{const saved=await request({revision,policies});revision=saved.revision;delete form.dataset.dirty;status.textContent='Políticas salvas. As informações já estão disponíveis na página de quartos.';status.className='success';}
    catch(error){status.textContent=error.message;status.className='error';}
    finally{controls.forEach(el=>el.disabled=false);}
   };
  }catch(error){if(!active())return;container.innerHTML=`<div class="panel"><p class="error" role="alert">${esc(error.message)}</p><button type="button" class="btn secondary">Tentar novamente</button></div>`;container.querySelector('button').onclick=()=>window.policyEditor.render(container);}
 }};
})();
