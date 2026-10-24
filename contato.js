'use strict';
(() => {
 const form=document.getElementById('whatsapp-form');if(!form)return;
 const name=form.querySelector('#nome'),phone=form.querySelector('#telefone'),message=form.querySelector('#mensagem');
 const status=form.querySelector('[data-contact-status]');
 function validate(){
  name.setCustomValidity(name.value.trim()?'':'Como podemos chamar você?');
  const value=phone.value.trim(),digits=value.replace(/\D/g,'');
  const valid=value.startsWith('+')?digits.length>=8&&digits.length<=15:/^\d{10,11}$/.test(digits)||/^55\d{10,11}$/.test(digits);
  phone.setCustomValidity(valid?'':'Informe o telefone com DDD. Para outro país, use + e o código do país.');
 }
 [name,phone,message].forEach(input=>input.addEventListener('input',()=>{
  name.setCustomValidity('');phone.setCustomValidity('');status.hidden=true;
 }));
 form.addEventListener('submit',event=>{
  event.preventDefault();validate();if(!form.reportValidity())return;
  const destination=document.body.dataset.contactWhatsapp;
  if(!/^\d{10,15}$/.test(destination||'')){
   status.textContent='Não foi possível abrir o contato agora. Tente novamente em instantes.';status.hidden=false;return;
  }
  const greeting=message.value.trim()||form.dataset.defaultMessage||'Gostaria de saber mais sobre a pousada.';
  const text=`Olá! Me chamo ${name.value.trim()}.\nMeu telefone: ${phone.value.trim()}.\n\n${greeting}`;
  const url=new URL(`https://wa.me/${destination}`);url.searchParams.set('text',text);
  // This opens a draft; sending is always confirmed by the visitor in WhatsApp.
  window.open(url.href,'_blank','noopener,noreferrer');
  status.replaceChildren(document.createTextNode('Sua conversa está pronta. Confirme o envio no WhatsApp. '));
  const retry=document.createElement('a');retry.href=url.href;retry.target='_blank';retry.rel='noopener noreferrer';retry.textContent='Se não abriu, continuar no WhatsApp';
  status.append(retry);status.hidden=false;
 });
})();
