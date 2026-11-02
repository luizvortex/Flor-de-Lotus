(() => {
 const contact=document.querySelector('#fishing-contact');
 const peopleInput=contact?.querySelector('#fishing-people');
 peopleInput?.addEventListener('input',()=>{
  peopleInput.value=peopleInput.value.replace(/[^0-9]/g,'').slice(0,2);
  peopleInput.setCustomValidity('');
 });
 contact?.addEventListener('submit',event=>{
  event.preventDefault();
  const name=contact.querySelector('#fishing-name');
  if(!name.value.trim()){name.setCustomValidity('Informe seu nome.');name.reportValidity();return;}
  const entry=contact.querySelector('#checkin').value,exit=contact.querySelector('#checkout').value;
  if(!entry||!exit||exit<=entry){
   contact.querySelector('#fishing-stay-summary').textContent='Escolha a data de entrada e a data de saída.';
   const trigger=contact.querySelector('#dates-trigger');
   if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
   return;
  }
  peopleInput.setCustomValidity(/^([1-9]|[1-5][0-9]|60)$/.test(peopleInput.value)?'':'Informe de 1 a 60 pessoas.');
  if(!contact.reportValidity())return;
  const people=contact.querySelector('#fishing-people').value;
  const format=value=>value.split('-').reverse().join('/');
  const nights=Math.round((new Date(exit+'T12:00:00Z')-new Date(entry+'T12:00:00Z'))/86400000);
  const url=new URL(contact.action);
  url.searchParams.set('text',`Oi, meu nome é ${name.value.trim()} e estou entrando em contato referente a um grupo de pescadores e gostaria de consultar a disponibilidade.\n\nQuantidade de pessoas: ${people}\nCheck-in: ${format(entry)}\nCheck-out: ${format(exit)}\nEstadia: ${nights} ${nights===1?'noite':'noites'}`);
  window.open(url.href,'_blank','noopener,noreferrer');
 });
 contact?.querySelector('#fishing-name').addEventListener('input',event=>event.target.setCustomValidity(''));
 contact?.addEventListener('lotus:dates-applied',()=>{
  const entry=contact.querySelector('#checkin').value,exit=contact.querySelector('#checkout').value;
  const nights=Math.round((new Date(exit+'T12:00:00Z')-new Date(entry+'T12:00:00Z'))/86400000);
  contact.querySelector('#fishing-stay-summary').textContent=`${nights} ${nights===1?'noite':'noites'}`;
 });
 const buttons=[...document.querySelectorAll('[data-fishing-photo]')],dialog=document.querySelector('.fp-lightbox');
 if(!buttons.length||!dialog)return;
 const image=dialog.querySelector('[data-photo-large]'),caption=dialog.querySelector('[data-photo-caption]');
 let active=0,opener;
 function show(index){active=(index+buttons.length)%buttons.length;const source=buttons[active].querySelector('img');image.src=source.src;image.alt=source.alt;caption.textContent=`${active+1} / ${buttons.length} · ${source.alt}`;}
 buttons.forEach((button,index)=>button.addEventListener('click',()=>{opener=button;show(index);dialog.showModal();document.body.classList.add('photo-open');}));
 dialog.querySelector('[data-photo-close]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-photo-prev]').addEventListener('click',()=>show(active-1));
 dialog.querySelector('[data-photo-next]').addEventListener('click',()=>show(active+1));
 dialog.querySelector('[data-photo-prev]').hidden=buttons.length<2;dialog.querySelector('[data-photo-next]').hidden=buttons.length<2;
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('photo-open');image.removeAttribute('src');opener?.focus();});
})();
