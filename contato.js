'use strict';
(() => {
 const form=document.getElementById('whatsapp-form');if(!form)return;
 const name=form.querySelector('#nome'),arrival=form.querySelector('#contact-arrival'),departure=form.querySelector('#contact-departure'),message=form.querySelector('#mensagem');
 const status=form.querySelector('[data-contact-status]');
 const guests=form.querySelector('#contact-guests'),pet=form.querySelector('#contact-pet'),petSize=form.querySelector('#contact-pet-size');
 function syncPet(){
  const withPet=pet.value==='sim';
  form.querySelector('[data-contact-pet-size]').hidden=!withPet;
  petSize.disabled=!withPet;petSize.required=withPet;
  if(!withPet)petSize.value='';
 }
 pet.addEventListener('change',syncPet);syncPet();
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=key=>parts.find(p=>p.type===key).value,today=`${part('year')}-${part('month')}-${part('day')}`;
 const nextDay=value=>{const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);};
 const displayDate=value=>value.split('-').reverse().join('/');
 arrival.min=today;departure.min=nextDay(today);
 function validate(){
  name.setCustomValidity(name.value.trim()?'':'Como podemos chamar você?');
  arrival.setCustomValidity(arrival.value&&arrival.value<today?'Escolha uma data de entrada a partir de hoje.':'');
  guests.setCustomValidity(guests.value&&(!Number.isSafeInteger(Number(guests.value))||Number(guests.value)<1)?'Informe a quantidade de pessoas, em número inteiro a partir de 1.':'');
  departure.setCustomValidity(arrival.value&&departure.value&&departure.value<=arrival.value?'A saída deve ser depois da entrada.':'');
 }
 [name,arrival,departure,guests,pet,petSize,message].forEach(input=>input.addEventListener('input',()=>{
  name.setCustomValidity('');arrival.setCustomValidity('');departure.setCustomValidity('');guests.setCustomValidity('');status.hidden=true;
  departure.min=nextDay(arrival.value||today);
 }));
 form.addEventListener('submit',event=>{
  event.preventDefault();validate();if(!form.reportValidity())return;
  const destination=document.body.dataset.contactWhatsapp;
  if(!/^\d{10,15}$/.test(destination||'')){
   status.textContent='Não foi possível abrir o contato agora. Tente novamente em instantes.';status.hidden=false;return;
  }
  const greeting=message.value.trim()||form.dataset.defaultMessage||'Gostaria de saber mais sobre a pousada.';
  const petDescription=pet.value==='sim'?`Sim — ${petSize.value==='sim'?'pequeno porte':'outro porte (consultar a pousada)'}`:'Não';
  const text=`Olá! Me chamo ${name.value.trim()}.\nGostaria de consultar uma estadia de ${displayDate(arrival.value)} a ${displayDate(departure.value)}.\nEntrada: ${displayDate(arrival.value)}\nSaída: ${displayDate(departure.value)}\nHóspedes: ${guests.value}\nPet: ${petDescription}\n\n${greeting}`;
  const url=new URL(`https://wa.me/${destination}`);url.searchParams.set('text',text);
  // This opens a draft; sending is always confirmed by the visitor in WhatsApp.
  window.open(url.href,'_blank','noopener,noreferrer');
  status.replaceChildren(document.createTextNode('Sua conversa está pronta. Confirme o envio no WhatsApp. '));
  const retry=document.createElement('a');retry.href=url.href;retry.target='_blank';retry.rel='noopener noreferrer';retry.textContent='Se não abriu, continuar no WhatsApp';
  status.append(retry);status.hidden=false;
 });
})();
