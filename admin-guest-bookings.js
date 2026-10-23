'use strict';
(() => {
 const dialog=document.createElement('dialog');dialog.id='guest-link-dialog';dialog.setAttribute('aria-labelledby','guest-link-title');
 dialog.innerHTML='<div class="modal-head"><h2 id="guest-link-title">Vincular reserva à conta Google</h2><button type="button" class="close" data-link-close aria-label="Fechar">×</button></div><p id="guest-link-summary"></p><p class="hint">O hóspede precisa entrar uma vez com Google no site. Confira o e-mail com ele: essa conta poderá ver os detalhes e receber os avisos da reserva.</p><form id="guest-link-form"><label for="guest-link-email">E-mail da conta Google do hóspede</label><input id="guest-link-email" type="email" required maxlength="254" autocomplete="off"><p id="guest-link-error" class="error" role="alert"></p><div class="form-actions"><button type="button" class="btn secondary" data-link-close>Cancelar</button><button type="submit" class="btn">Salvar vínculo</button></div></form>';
 document.body.append(dialog);let bookingId;
 dialog.querySelectorAll('[data-link-close]').forEach(button=>button.onclick=()=>dialog.close());
 document.querySelector('#content').addEventListener('click',event=>{
  const button=event.target.closest('[data-link-guest]');if(!button)return;
  bookingId=Number(button.dataset.linkGuest);dialog.querySelector('form').reset();dialog.querySelector('#guest-link-error').textContent='';dialog.querySelector('#guest-link-summary').textContent='Reserva #'+bookingId;dialog.showModal();
 });
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{const response=await fetch('/api/bookings/'+bookingId+'/account',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:dialog.querySelector('input').value.trim()})}),data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível vincular a conta.');dialog.close();const message=document.querySelector('#message');message.className='success';message.textContent='Reserva vinculada. O hóspede já pode consultá-la em Minha conta.';}
  catch(error){dialog.querySelector('#guest-link-error').textContent=error.message;}finally{button.disabled=false;}
 };
})();
