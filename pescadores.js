(() => {
 const contact=document.querySelector('#fishing-contact');
 contact?.addEventListener('submit',event=>{
  event.preventDefault();
  const name=contact.querySelector('#fishing-name');
  if(!name.value.trim()){name.setCustomValidity('Informe seu nome.');name.reportValidity();return;}
  if(!contact.reportValidity())return;
  const people=contact.querySelector('#fishing-people').value;
  const date=contact.querySelector('#fishing-date').value;
  const formattedDate=date.split('-').reverse().join('/');
  const url=new URL(contact.action);
  url.searchParams.set('text',`Oi, meu nome é ${name.value.trim()} e estou entrando em contato referente a um grupo de pescadores e gostaria de consultar a disponibilidade.\n\nQuantidade de pessoas: ${people}\nData da viagem: ${formattedDate}`);
  window.open(url.href,'_blank','noopener,noreferrer');
 });
 contact?.querySelector('#fishing-name').addEventListener('input',event=>event.target.setCustomValidity(''));
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
