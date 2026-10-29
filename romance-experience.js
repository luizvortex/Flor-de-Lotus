'use strict';
(()=>{
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>Number.isSafeInteger(v)?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v/100):'A consultar';
 const categoryNames={brindes:'Bebidas',delicias:'Pequenas delícias',decoracao:'Um quarto apaixonante',lembrancas:'Nossas lembranças'};
 const statuses={aguardando_confirmacao:'Aguardando confirmação',pendente:'Aguardando confirmação',confirmado:'Confirmado',confirmada:'Confirmado',em_preparacao:'Em preparação',preparado:'Preparado',concluido:'Concluído',cancelado:'Cancelado',cancelada:'Cancelado'};
 const floorNames={terreo:'Térreo',superior:'Piso superior',sem_preferencia:'Sem preferência'};
 let requestId;try{requestId=sessionStorage.getItem('lotus-romance-request');if(!/^[0-9a-f-]{36}$/.test(requestId||'')){requestId=crypto.randomUUID();sessionStorage.setItem('lotus-romance-request',requestId);}}catch{requestId=crypto.randomUUID();}
 let catalog=[],showcases=[],rooms=[],selection=null,party=null,query=null,quote=null,cart=new Map(),photos=[],authenticated=false,accountKey='',busy=false,finished=false,quoteSequence=0,searchSequence=0,quoteTimer;
 let activeStep=1,catalogLoading=false;
 async function api(operation,data){const response=await fetch('/api/romance/'+operation,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Não foi possível concluir a experiência.'),{status:response.status});return result;}
 function error(message){$('#rx-error').textContent=message;if(activeStep===3||!message)$('#rx-upload-status').textContent=message;}
 function payload(){return {...query,category_slug:selection?.slug,floor:selection?.floor,preference:$('#rx-preference').value,party,items:[...cart].filter(([,q])=>q>0).map(([variant_id,quantity])=>({variant_id,quantity})).sort((a,b)=>a.variant_id.localeCompare(b.variant_id))};}
 function selectedPhotoCount(){let count=0;for(const product of catalog)for(const variant of product.variants)count+=(cart.get(variant.id)||0)*(product.photos_required||0);return count;}
 function updateFiles(){const required=selectedPhotoCount();$('#rx-dropzone').hidden=required===0&&photos.length===0;$('#rx-photo-instructions').hidden=required===0&&photos.length===0;$('#rx-photo-optional').hidden=required>0||photos.length>0;$('#rx-photo-count').textContent=required?`${photos.length} / ${required} fotos`:'Você retirou os itens que usam fotografias. Remova as fotos enviadas para continuar sem elas.';$('#rx-files').disabled=!authenticated||busy||photos.length>=required;}
 function summary(){
  updateFiles();document.querySelectorAll('[data-rx-remove],[data-rx-orphan]').forEach(button=>button.disabled=busy||finished);let estimate=0;const lines=[];
  for(const product of catalog)for(const variant of product.variants){const quantity=cart.get(variant.id)||0;if(quantity){const checked=quote?.items.find(i=>i.variant_id===variant.id),unit=checked?.unit_price??variant.price;estimate+=unit*quantity;lines.push(`<li>${esc(product.name)} · ${esc(variant.name)} × ${quantity} — ${money(unit*quantity)}</li>`);}}
  const finalQuote=quote?.total,base=quote?.stay_total??selection?.total;if($('#rx-compact-total'))$('#rx-compact-total').textContent=selection?money(finalQuote??(Number.isSafeInteger(base)?base+estimate:null)):'';
  $('#rx-summary-content').innerHTML=selection?`<dl><dt>Hospedagem</dt><dd>${esc(selection.title)}</dd><dt>Entrada / Saída</dt><dd>${esc(query.start)} → ${esc(query.end)}</dd><dt>Noites</dt><dd>${quote?.nights??Math.round((new Date(query.end+'T12:00:00Z')-new Date(query.start+'T12:00:00Z'))/86400000)}</dd><dt>Hóspedes</dt><dd>${party[0].adults+party[0].children_ages.length}</dd><dt>Andar da oferta</dt><dd>${esc(floorNames[selection.floor])}</dd><dt>Preferência de andar</dt><dd>${esc(floorNames[$('#rx-preference').value])}</dd><dt>Valor da hospedagem</dt><dd>${money(base)}</dd></dl><p>Decoração</p><ul>${lines.join('')||'<li>Escolha seus adicionais.</li>'}</ul><dl><dt>Subtotal dos adicionais</dt><dd>${money(quote?.decoration_total??estimate)}</dd>${quote?`<dt>Taxas / descontos</dt><dd>${money(quote.taxes)} / ${money(quote.discounts)}</dd>`:''}</dl><div class="rx-grand-total">${money(finalQuote??(Number.isSafeInteger(base)?base+estimate:null))}</div>`:'<p>Escolha uma hospedagem e personalize sua surpresa.</p>';
  updatePresentation(lines,finalQuote??(Number.isSafeInteger(base)?base+estimate:null),base,quote?.decoration_total??estimate);
  $('#rx-finish').disabled=busy||finished||!authenticated||!selection||!quote||!cart.size||photos.length!==selectedPhotoCount()||!$('#rx-consent').checked||[...document.querySelectorAll('[data-rx-quantity]')].some(input=>!input.checkValidity());
 }
 const stageIds=['hospedagem','personalizar','rx-memories','rx-contact'],stageLabels=['Hospedagem','Sua surpresa','Fotografias','Revisão'];
 function instructions(){const message=$('#rx-message').value.trim(),photoNotes=$('#rx-instructions').value.trim();return [message?'Mensagem especial:\n'+message:'',photoNotes?'Instruções das fotografias:\n'+photoNotes:''].filter(Boolean).join('\n\n');}
 function goStep(number){activeStep=number;updateProgress();const target=$('#'+stageIds[number-1]);target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 function updateProgress(){
  const complete=[Boolean(selection),Boolean(selection&&cart.size&&quote),Boolean(selection&&cart.size&&photos.length===selectedPhotoCount()),finished];
  document.querySelectorAll('[data-rx-step]').forEach(button=>{const number=Number(button.dataset.rxStep);button.dataset.complete=String(complete[number-1]);if(complete[number-1])button.setAttribute('aria-describedby','rx-completed-label');else button.removeAttribute('aria-describedby');if(number===activeStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');button.querySelector('[data-rx-step-mark]').textContent=complete[number-1]?'✓':String(number);});
  const label=`Etapa ${activeStep} de 4 — ${stageLabels[activeStep-1]}`;
  $('#rx-progress-label').textContent=label;$('#rx-mobile-step').textContent=label;$('#rx-progress-count').textContent=activeStep+' / 4';$('.rx-progress').style.setProperty('--rx-progress',((activeStep-1)/3*100)+'%');$('.rx-progress-track').setAttribute('aria-valuenow',String(activeStep));
  $('#rx-continue').textContent=activeStep===4?'Revisar solicitação':'Continuar';$('#rx-continue').disabled=busy||finished;
 }
 function updatePresentation(lines,total,stay,extras){
  updateProgress();$('#rx-mobile-total').textContent=selection?money(total):'Escolha sua hospedagem';
  const edit=(n)=>`<button type="button" class="rx-review-edit" data-rx-go="${n}">Editar</button>`;
  $('#rx-review').innerHTML=`<article><header><h3>Sua hospedagem</h3>${edit(1)}</header>${selection?`<p>${esc(selection.title)} · ${esc(floorNames[selection.floor])}</p><p>${esc(query.start)} → ${esc(query.end)} · ${party[0].adults+party[0].children_ages.length} hóspedes</p>`:'<p>Escolha uma hospedagem disponível.</p>'}</article><article><header><h3>Sua surpresa</h3>${edit(2)}</header><ul>${lines.join('')||'<li>Escolha seus adicionais.</li>'}</ul>${$('#rx-message').value?`<blockquote translate="no">${esc($('#rx-message').value)}</blockquote>`:''}</article><article><header><h3>Suas memórias</h3>${edit(3)}</header><p>${photos.length} / ${selectedPhotoCount()} fotos</p>${photos.length?'':'<p>Sem fotografias enviadas.</p>'}<div class="rx-review-photos">${photos.map((photo,i)=>{const src=$(`[data-rx-photo="${photo.id}"]`)?.getAttribute('src');return src?`<img data-rx-review-photo="${esc(photo.id)}" src="${esc(src)}" alt="Fotografia pessoal ${i+1}" width="72" height="72" referrerpolicy="no-referrer" loading="lazy">`:'';}).join('')}</div>${$('#rx-instructions').value?`<p translate="no">${esc($('#rx-instructions').value)}</p>`:''}</article><article><h3>Resumo financeiro</h3><dl><dt>Hospedagem</dt><dd>${selection?money(stay):'A consultar'}</dd><dt>Decoração</dt><dd>${money(extras)}</dd></dl><p><strong>${selection?money(total):'A consultar'}</strong></p><p>A solicitação ficará aguardando confirmação da pousada. Nenhum pagamento será cobrado nesta página.</p></article>`;
 }
 $('#rx-review').addEventListener('error',async event=>{const image=event.target;if(!image.matches?.('[data-rx-review-photo]')||image.dataset.refreshed)return;image.dataset.refreshed='true';try{const url=await photoUrl(image.dataset.rxReviewPhoto);if(image.isConnected)image.src=url;}catch{}},true);
 document.addEventListener('click',event=>{const button=event.target.closest('[data-rx-step],[data-rx-go]');if(button)goStep(Number(button.dataset.rxStep||button.dataset.rxGo));});
 $('#rx-continue').onclick=()=>{
  if(activeStep===1&&!selection){$('#search').reportValidity();$('#rx-search-status').textContent='Consulte a disponibilidade e escolha um quarto para continuar.';goStep(1);return;}
  if(activeStep===2&&!cart.size){error('Escolha seus adicionais.');return;}
  if(activeStep===3&&photos.length!==selectedPhotoCount()){error('Confira as fotos e a autorização de uso.');return;}
  if(activeStep===4){$('#rx-summary-details').open=true;$('.rx-summary').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#rx-finish').focus({preventScroll:true});return;}
  goStep(activeStep===2&&selectedPhotoCount()===0&&photos.length===0?4:activeStep+1);
 };
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length){activeStep=stageIds.indexOf(visible[0].target.id)+1;updateProgress();}},{rootMargin:'-15% 0px -55% 0px'});stageIds.forEach(id=>observer.observe($('#'+id)));}
 ['rx-message','rx-instructions','rx-guest','rx-phone'].forEach(id=>$('#'+id).addEventListener('input',summary));
 async function price(){
  clearTimeout(quoteTimer);quote=null;const sequence=++quoteSequence;summary();if(!selection)return;
  $('#rx-quote-status').textContent='Validando valores e disponibilidade…';
  try{const result=await api('quote',payload());if(sequence!==quoteSequence)return;quote=result;$('#rx-quote-status').textContent='Valores conferidos. A disponibilidade será verificada novamente ao enviar.';error('');}
  catch(e){if(sequence===quoteSequence){$('#rx-quote-status').textContent=e.message;quote=null;}}
  if(sequence===quoteSequence)summary();
 }
 function categoryFits(slug,count,floor){
  const standard=['duplo','triplo'],triple=['triplo-standard','triplo-superior'],family=['familia','familia-superior'];
  const allowed=count<=2?standard:count===3?triple:count>=5?family:[];
  const upstairs=['triplo','triplo-superior','familia-superior'].includes(slug);
  return allowed.includes(slug)&&(floor==='sem_preferencia'||(floor==='superior')===upstairs);
 }
 function filterCategories(){
  const count=Number($('#rx-adults').value)+Number($('#rx-children').value),floor=$('#rx-preference').value,select=$('#rx-category'),previous=select.value;
  select.innerHTML='<option value="">Todas as categorias</option>'+showcases.filter(s=>categoryFits(s.slug,count,floor)).map(s=>`<option value="${esc(s.slug)}">${esc(s.title)}</option>`).join('');
  if([...select.options].some(o=>o.value===previous))select.value=previous;
 }
 function invalidate(){selection=null;quote=null;query=null;party=null;quoteSequence++;searchSequence++;$('#rx-rooms').innerHTML='';$('#rx-search-status').textContent='Consulte novamente para atualizar a hospedagem.';$('#rx-quote-status').textContent='';summary();}
 function ages(){const number=Number($('#rx-children').value),previous=[...document.querySelectorAll('[data-rx-age]')].map(input=>input.value);$('#rx-ages').innerHTML=Array.from({length:Math.min(5,Math.max(0,number||0))},(_,i)=>`<label>Idade da criança ${i+1}<select data-rx-age required><option value="">Selecione</option>${Array.from({length:18},(_,a)=>`<option value="${a}" ${previous[i]===String(a)?'selected':''}>${a}</option>`).join('')}</select></label>`).join('');}
 $('#search').addEventListener('invalid',event=>{if(['checkin','checkout'].includes(event.target.id)){event.preventDefault();if($('#dates-picker').hidden)$('#dates-trigger').click();$('#rx-search-status').textContent='Escolha entrada e saída válidas.';}},true);
 $('#rx-children').addEventListener('input',ages);
 $('#search').addEventListener('input',()=>{filterCategories();invalidate();});$('#search').addEventListener('change',()=>{filterCategories();invalidate();});
 $('#search').onsubmit=async event=>{
  event.preventDefault();if(busy||!$('#search').reportValidity())return;
  const adults=Number($('#rx-adults').value),children=[...document.querySelectorAll('[data-rx-age]')].map(input=>Number(input.value));
  if(adults+children.length>6){$('#rx-search-status').textContent='Consulte a pousada para acomodar mais pessoas no mesmo quarto.';return;}
  const start=$('#checkin').value,end=$('#checkout').value;if(!start||!end||end<=start){$('#rx-search-status').textContent='Escolha entrada e saída válidas.';return;}
  const requestParty=[{adults,children_ages:children}],preference=$('#rx-preference').value,floors=preference==='sem_preferencia'?['terreo','superior']:[preference],sequence=++searchSequence;
  selection=null;quote=null;quoteSequence++;summary();$('#rx-search-button').disabled=true;$('#rx-search-status').textContent='Consultando quartos…';
  try{
   const result=await Promise.all(floors.map(async floor=>{const params=new URLSearchParams({start,end,floor,guests:String(adults+children.length),party:JSON.stringify(requestParty)});const response=await fetch('/api/availability?'+params,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível consultar os quartos.');return (data.rooms||[]).map(room=>({...room,floor}));}));
   if(sequence!==searchSequence)return;
   const wanted=$('#rx-category').value;
   rooms=result.flat().filter(room=>categoryFits(room.slug||room.presentation_slug,adults+children.length,preference)&&Number.isSafeInteger(room.total)&&!room.quote_example&&(!wanted||wanted===(room.slug||room.presentation_slug))&&(!String(room.slug||room.presentation_slug).startsWith('familia')||adults+children.length>=5)).map(room=>{const slug=room.slug||room.presentation_slug,showcase=showcases.find(s=>s.slug===slug);return {...room,slug,title:showcase?.title||room.name,description:showcase?.description||'',photo:showcase?.photos?.[0],features:showcase?.features||[],capacity:room.capacity||adults+children.length};});
   party=requestParty;query={start,end,guests:adults+children.length};
   $('#rx-rooms').innerHTML=rooms.map((room,i)=>`<article class="romance-product-card" data-rx-room-card="${i}">${room.photo?`<div class="romance-image-wrapper"><img class="romance-image" src="${esc(room.photo.url)}" alt="${esc(room.photo.alt)}" width="800" height="600" loading="lazy"></div>`:''}<div class="rx-card-copy"><h3>${esc(room.title)}</h3><p>${esc(floorNames[room.floor])} · ${room.capacity} pessoas</p><p>${esc(room.description)}</p>${room.features.length?`<ul class="rx-room-features">${room.features.slice(0,3).map(f=>`<li>${esc(typeof f==='string'?f:f.label||f.text||'')}</li>`).join('')}</ul>`:''}<p class="rx-availability-label">Disponível para o período consultado</p><p>${money(room.total)} · <span>Período completo</span></p><button class="romance-primary-button" type="button" data-rx-choose="${i}">Escolher este quarto</button></div></article>`).join('');
   $('#rx-search-status').textContent=rooms.length?'Escolha uma hospedagem disponível.':'Não encontramos disponibilidade para essas datas e hóspedes.';
  }catch(e){if(sequence===searchSequence)$('#rx-search-status').textContent=e.message;}
  finally{$('#rx-search-button').disabled=false;}
 };
 $('#rx-rooms').onclick=event=>{const button=event.target.closest('[data-rx-choose]');if(!button||busy)return;selection=rooms[Number(button.dataset.rxChoose)];document.querySelectorAll('[data-rx-room-card]').forEach((card,i)=>{card.classList.toggle('is-selected',i===Number(button.dataset.rxChoose));const trigger=card.querySelector('button');trigger.textContent=i===Number(button.dataset.rxChoose)?'✓ Quarto selecionado':'Escolher este quarto';trigger.setAttribute('aria-pressed',String(i===Number(button.dataset.rxChoose)));});price();goStep(2);};
 function paintProducts(){
  $('#rx-products').innerHTML=Object.entries(categoryNames).map(([category,title])=>{const products=catalog.filter(p=>p.category===category&&p.variants.length);return products.length?`<h3 class="rx-category-title">${title}</h3><div class="rx-product-grid">${products.map(p=>`<article class="romance-product-card" data-rx-product="${p.id}">${p.photo?`<div class="romance-image-wrapper"><img class="romance-image" src="${esc(p.photo)}" alt="${esc(p.name)}" width="800" height="600" loading="lazy"></div>`:''}<details class="rx-product-options" ${p.variants.some(v=>(cart.get(v.id)||0)>0)?'open':''}><summary><span><strong>${esc(p.name)}</strong><span class="rx-product-from">A partir de ${money(Math.min(...p.variants.map(v=>v.price)))}</span></span><span class="rx-product-toggle" aria-hidden="true">＋</span></summary><div class="rx-card-copy"><p>${esc(p.description)}</p>${p.photos_required?`<p><span>${p.photos_required} fotos</span> <span>por unidade</span></p>`:''}<div class="rx-style-row"><div class="rx-variant-choices" role="radiogroup" aria-label="${esc(p.name)}">${p.variants.map(v=>`<label class="rx-variant-choice"><input type="radio" name="rx-style-${p.id}" value="${v.id}" data-rx-style ${p.variants.length===1||(cart.get(v.id)||0)>0?'checked':''}><span>${esc(v.name)}</span></label>`).join('')}</div>${p.variants.map(v=>`<div data-rx-variant-controls="${v.id}" ${p.variants.length===1||(cart.get(v.id)||0)>0?'':'hidden'}><div class="rx-quantity-heading"><label for="rx-quantity-${v.id}">Quantidade</label><small>${money(v.price)}</small></div><div class="rx-quantity" role="group" aria-label="${esc(p.name)} · ${esc(v.name)}"><button type="button" class="rx-secondary-button" data-rx-qty-step="-1" data-rx-variant="${v.id}" aria-label="Diminuir quantidade">−</button><input id="rx-quantity-${v.id}" type="number" min="0" max="${Math.min(p.max_quantity,v.stock??p.max_quantity)}" value="${cart.get(v.id)||0}" data-rx-quantity="${v.id}" aria-label="Quantidade: ${esc(p.name)} · ${esc(v.name)}"><button type="button" class="rx-secondary-button" data-rx-qty-step="1" data-rx-variant="${v.id}" aria-label="Aumentar quantidade">+</button></div></div>`).join('')}</div></div></details></article>`).join('')}</div>`:'';}).join('');
 }
 $('#rx-products').onclick=event=>{const button=event.target.closest('[data-rx-qty-step]');if(!button||busy||finished)return;const input=$('#rx-quantity-'+button.dataset.rxVariant);input.value=Math.min(Number(input.max),Math.max(0,Number(input.value||0)+Number(button.dataset.rxQtyStep)));input.dispatchEvent(new Event('input',{bubbles:true}));};
 $('#rx-products').oninput=event=>{const input=event.target.closest('[data-rx-quantity]');if(!input)return;const qty=Number(input.value);quote=null;quoteSequence++;if(!input.checkValidity()||!Number.isInteger(qty)){error('Confira as quantidades dos adicionais.');$('#rx-finish').disabled=true;return;}if(qty)cart.set(input.dataset.rxQuantity,qty);else cart.delete(input.dataset.rxQuantity);const card=input.closest('article');card.classList.toggle('is-selected',[...card.querySelectorAll('input')].some(i=>Number(i.value)>0));summary();clearTimeout(quoteTimer);quoteTimer=setTimeout(price,350);};
 $('#rx-products').onchange=event=>{
  const radio=event.target.closest('[data-rx-style]');if(!radio||busy||finished)return;
  const card=radio.closest('article'),inputs=[...card.querySelectorAll('[data-rx-quantity]')],quantity=Math.max(1,...inputs.map(i=>Number(i.value)||0));
  inputs.forEach(i=>{cart.delete(i.dataset.rxQuantity);i.value='0';});
  card.querySelectorAll('[data-rx-variant-controls]').forEach(group=>{group.hidden=group.dataset.rxVariantControls!==radio.value;});
  const input=$('#rx-quantity-'+radio.value);input.value=Math.min(quantity,Number(input.max));input.dispatchEvent(new Event('input',{bubbles:true}));
 };
 async function photoUrl(id){return (await api('file?id='+encodeURIComponent(id))).url;}
 async function paintPhotos(){
  $('#rx-photos').innerHTML=photos.map((photo,i)=>`<figure><img alt="Fotografia pessoal ${i+1}" data-rx-photo="${esc(photo.id)}" width="200" height="200" referrerpolicy="no-referrer"><button type="button" class="rx-secondary-button" ${busy?'disabled':''} data-rx-remove="${esc(photo.id)}">Remover foto ${i+1}</button></figure>`).join('');
  await Promise.all(photos.map(async photo=>{try{const image=$(`[data-rx-photo="${photo.id}"]`);if(image)image.src=await photoUrl(photo.id);}catch(e){error(e.message);}}));updateFiles();summary();
 }
 async function uploadFiles(files){
  if(busy)return;if(!authenticated){error('Entre com Google para enviar suas fotografias.');return;}const required=selectedPhotoCount();
  if(files.length+photos.length>Math.min(6,required)){error('Envie somente a quantidade de fotos solicitada pelos itens selecionados.');return;}
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||!f.size||f.size>3145728)){error('Use fotografias JPG, PNG ou WebP de até 3 MB.');return;}
  busy=true;summary();error('');
  try{for(const file of files){const form=new FormData();form.set('photo',file);form.set('request_id',requestId);const response=await fetch('/api/romance/upload',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível enviar a foto.');photos.push(result);}await paintPhotos();}catch(e){error(e.message);await paintPhotos();}finally{busy=false;summary();}
 }
 $('#rx-files').onchange=async event=>{await uploadFiles([...event.target.files]);event.target.value='';};
 const dropzone=$('#rx-dropzone');
 ['dragenter','dragover'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.add('is-dragging');}));
 ['dragleave','drop'].forEach(name=>dropzone.addEventListener(name,event=>{event.preventDefault();dropzone.classList.remove('is-dragging');}));
 dropzone.addEventListener('drop',event=>{if(event.dataTransfer?.files.length)uploadFiles([...event.dataTransfer.files]);});
 $('#rx-photos').onclick=async event=>{const button=event.target.closest('[data-rx-remove]');if(!button||busy)return;busy=true;summary();try{await api('remove',{id:button.dataset.rxRemove});photos=photos.filter(p=>p.id!==button.dataset.rxRemove);await paintPhotos();}catch(e){error(e.message);}finally{busy=false;summary();}};
 document.addEventListener('click',async event=>{const button=event.target.closest('[data-rx-orphan]');if(!button||busy)return;busy=true;try{await api('remove',{id:button.dataset.rxOrphan});await account();}catch(e){error(e.message);}finally{busy=false;summary();}});
 $('#rx-consent').onchange=summary;
 $('#rx-phone').oninput=event=>{const digits=event.target.value.replace(/\D/g,'').slice(0,11);event.target.value=digits.length>10?digits.replace(/^(\d{2})(\d)(\d{4})(\d{0,4}).*$/,'($1) $2 $3-$4'):digits.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*$/,'($1) $2-$3');};
 async function account(){
  try{const response=await fetch('/api/guest/session',{cache:'no-store'}),result=await response.json();authenticated=Boolean(result.user);const nextAccount=result.user?.email||'';if(accountKey&&accountKey!==nextAccount){photos=[];$('#rx-photos').innerHTML='';$('#rx-guest').value='';$('#rx-phone').value='';$('#rx-instructions').value='';$('#rx-message').value='';$('#rx-consent').checked=false;$('#rx-mine>div').innerHTML='';}accountKey=nextAccount;$('#rx-account-status').textContent=authenticated?'Conta conectada. Você pode enviar sua solicitação.':'Entre com Google para finalizar sua experiência.';$('#rx-google').hidden=authenticated;$('#rx-refresh-account').hidden=authenticated;
   if(authenticated){if(!$('#rx-guest').value)$('#rx-guest').value=result.user.name||'';const draft=await api('draft',{request_id:requestId});if(draft.order){receipt(draft.order);return;}photos=draft.photos||[];let orphans=$('#rx-orphans');if(!orphans){orphans=document.createElement('div');orphans.id='rx-orphans';$('#rx-contact').append(orphans);}orphans.innerHTML=(draft.orphan_photos||[]).length?'<p>Fotos de outra experiência não enviada. Remova-as se não precisar mais delas.</p>'+draft.orphan_photos.map((p,i)=>`<button type="button" class="rx-secondary-button" data-rx-orphan="${p.id}">Remover foto pendente ${i+1}</button>`).join(''):'';await paintPhotos();const mine=await api('mine');$('#rx-mine').hidden=!mine.orders.length;$('#rx-mine>div').innerHTML=mine.orders.map(o=>`<article class="rx-mine-order"><h3>Reserva #${o.booking_id}</h3><p>${esc(o.start)} → ${esc(o.end)}</p><p>${esc(statuses[o.operational]||o.operational)} · ${esc(statuses[o.booking_status]||o.booking_status)}</p><p>${money(o.total)}</p><ul>${o.items.map(i=>`<li>${esc(i.name)} · ${esc(i.variant)} × ${i.quantity}</li>`).join('')}</ul><p translate="no">${esc(o.instructions)}</p></article>`).join('');}
   else{photos=[];$('#rx-photos').innerHTML='';$('#rx-mine').hidden=true;$('#rx-mine>div').innerHTML='';if($('#rx-orphans'))$('#rx-orphans').innerHTML='';}
  }catch(e){if(e.status===401){authenticated=false;photos=[];$('#rx-photos').innerHTML='';$('#rx-mine>div').innerHTML='';$('#rx-mine').hidden=true;}error(e.message);}summary();
 }
 function receipt(result){finished=true;quote=null;const target=$('#rx-receipt');target.hidden=false;target.innerHTML=`<h2>Sua surpresa começou.</h2><p>Reserva #${esc(result.booking_id)}</p><p>Aguardando confirmação da pousada.</p><p>${money(result.total)}</p><p>Nenhum pagamento foi cobrado. A equipe irá conferir a hospedagem e combinar os próximos passos.</p><a href="/minha-conta" target="_blank" rel="noopener">Acompanhar em Minha conta</a><p><button type="button" class="rx-secondary-button" id="rx-new">Iniciar outra experiência</button></p>`;$('#rx-new').onclick=()=>{try{sessionStorage.removeItem('lotus-romance-request');}catch{}location.reload();};target.focus();summary();}
 $('#rx-finish').onclick=async()=>{
  if(busy||finished||!selection||!quote)return;
  if(!$('#rx-guest').value.trim()||$('#rx-guest').value.length>120||$('#rx-phone').value.replace(/\D/g,'').length<10){error('Preencha seu nome e um telefone válido.');$('#rx-contact').scrollIntoView();return;}
  if(!$('#rx-consent').checked||photos.length!==selectedPhotoCount()){error('Confira as fotos e a autorização de uso.');return;}
  if(instructions().length>2000){error('Reduza a mensagem e as instruções para continuar.');return;}
  busy=true;summary();error('');
  try{const checked=await api('quote',payload());if(checked.total!==quote.total){quote=checked;error('O valor mudou. Revise o resumo e clique novamente para enviar.');return;}const result=await api('book',{...payload(),request_id:requestId,guest:$('#rx-guest').value.trim(),phone:$('#rx-phone').value,expected_total:quote.total,expected_items:quote.items,photos:photos.map(p=>p.id),instructions:instructions(),privacy_accepted:true});receipt(result);}
  catch(e){error(e.message);$('#rx-quote-status').textContent='A solicitação não foi confirmada nesta tela. Você pode tentar novamente com o mesmo envio, sem duplicar a reserva.';}
  finally{busy=false;summary();}
 };
 $('#rx-refresh-account').onclick=account;window.addEventListener('focus',()=>{if(!busy&&!finished)account();});
 document.querySelectorAll('.rx-hero-actions a').forEach(a=>a.onclick=event=>{event.preventDefault();$(a.getAttribute('href')).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
 if(matchMedia('(max-width:800px)').matches)$('#rx-summary-details').open=false;
 async function loadCatalog(){
  if(catalogLoading)return;catalogLoading=true;$('#rx-retry-catalog').hidden=true;$('#rx-products').setAttribute('aria-busy','true');$('#rx-catalog-status').textContent='Carregando opções…';
  try{const result=await api('catalog');catalog=result.products.filter(p=>p.variants?.length);paintProducts();$('#rx-catalog-status').textContent=catalog.length?'':'As opções de decoração estão sendo preparadas. Consulte a pousada para conhecer as possibilidades.';$('#rx-retry-catalog').hidden=Boolean(catalog.length);}
  catch(e){$('#rx-catalog-status').textContent='Não foi possível carregar as opções. Tente novamente.';$('#rx-retry-catalog').hidden=false;}
  finally{catalogLoading=false;$('#rx-products').setAttribute('aria-busy','false');summary();}
 }
 $('#rx-retry-catalog').onclick=loadCatalog;
 async function start(){
  try{const response=await fetch('/api/catalog',{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível carregar os quartos.');showcases=data.showcases||[];filterCategories();}catch(e){$('#rx-search-status').textContent=e.message;}
  await loadCatalog();
  await account();summary();
 }
 start();
})();
