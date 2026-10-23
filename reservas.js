'use strict';
(() => {
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let shareTimer;
 const shareDialog=$('#share-dialog'),shareInput=$('#share-url');
 const shareUrl=()=>{const url=new URL(location.href);url.hash='';return url.href;};
 function shared(){const status=$('#share-status');status.textContent='Link copiado! Envie para quem vai viajar com você.';status.hidden=false;clearTimeout(shareTimer);shareTimer=setTimeout(()=>{status.hidden=true;},4500);}
 function manualShare(){shareInput.value=shareUrl();$('#share-copy-status').textContent='';shareDialog.showModal();shareInput.focus();shareInput.select();}
 $('#share-site').onclick=async()=>{
  const button=$('#share-site');button.disabled=true;
  try{
   if(navigator.share){try{await navigator.share({title:'Pousada Flor de Lótus · Itacaré',url:shareUrl()});return;}catch(error){if(error.name==='AbortError')return;}}
   try{await navigator.clipboard.writeText(shareUrl());shared();}catch{manualShare();}
  }finally{button.disabled=false;}
 };
 $('#close-share').onclick=()=>shareDialog.close();
 $('#copy-share').onclick=async()=>{try{await navigator.clipboard.writeText(shareInput.value);shareDialog.close();shared();}catch{shareInput.focus();shareInput.select();$('#share-copy-status').textContent='Selecione e copie o link acima para compartilhar.';}};
 const plural=(n,singular,pluralForm)=>`${n} ${Number(n)===1?singular:pluralForm}`;
 const money=n=>(Number(n)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dateLabel=v=>v.split('-').reverse().join('/');
 const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const dp=k=>dateParts.find(p=>p.type===k).value,today=`${dp('year')}-${dp('month')}-${dp('day')}`;
 const nextDay=(value,days=1)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const defaultSlug=r=>r.presentation_slug||r.showcase_slug||({familia:'familia',casal_mais_um:'triplo-standard'}[r.type]||'duplo');
 const photoUrl=url=>typeof url==='string'&&!url.includes('..')&&(/^\/(img[^/]*|images)\/[^<>"\\]+\.(jpg|jpeg|png|webp)$/i.test(url)||/^https:\/\/asojfispuomhbfapqdmi\.supabase\.co\/storage\/v1\/object\/public\/lotus-showcase\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url));
 let showcases=[],inventory=[],packages=[],available=[],lastQuery=null,nights=0,sequence=0,controller,selection=null,detail=null,detailIndex=0;
 const photoIndices=new Map();
 async function api(path,body,signal){
  const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal,cache:'no-store'});
  const data=await response.json();if(!response.ok){const error=new Error(data.error||'Não foi possível concluir a consulta.');error.status=response.status;throw error;}return data;
 }
 function message(text,error=false){$('#message').textContent=text;$('#message').className=error?'error':'';}
 function query(){return {start:$('#checkin').value,end:$('#checkout').value,guests:Number($('#guests').value),package_id:$('#package').value||''};}
 function focusSearch(){ $('#search').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$('#checkin').focus({preventScroll:true}); }
 function rowsFor(row){return (lastQuery?available:inventory).filter(r=>defaultSlug(r)===row.slug).sort((a,b)=>(lastQuery?a.total:a.price)-(lastQuery?b.total:b.price));}
 function applyCatalog(data){
  inventory=Array.isArray(data.rooms)?data.rooms:[];
  showcases=(data.showcases||[]).filter(s=>typeof s.title==='string'&&Array.isArray(s.photos)&&s.photos.some(p=>photoUrl(p.url))).map(s=>({...s,photos:s.photos.filter(p=>photoUrl(p.url)),features:Array.isArray(s.features)?s.features:[]}));
  packages=(data.packages||[]).filter(p=>p.end>today);
  const selected=$('#package').value;$('#package').innerHTML='<option value="">Diárias padrão</option>'+packages.map(p=>`<option value="${p.id}">${esc(p.name)} · ${p.nights} noites</option>`).join('');
  if(packages.some(p=>String(p.id)===selected))$('#package').value=selected;
  if(showcases[0])$('#catalog-cover').src=showcases[0].photos[0].url;
  $('#special-packages').hidden=!packages.length;
  $('#packages').innerHTML=packages.map(p=>`<article class="package-card"><h3>${esc(p.name)}</h3><p>${p.nights+1} dias · ${p.nights} noites<br>${dateLabel(p.start)} a ${dateLabel(p.end)}</p><p>${money(p.price)} <small>/ pacote por quarto</small></p><button type="button" class="gold-button" data-package="${p.id}">Consultar pacote</button></article>`).join('');
 }
 function render(){
  $('#rooms').innerHTML=showcases.length?showcases.map(s=>{
   const rows=rowsFor(s),best=rows[0],price=best?(lastQuery?best.total:best.price):null;
   const label=lastQuery?(best?`${plural(rows.length,'opção disponível','opções disponíveis')} · até ${best.capacity} hóspedes`:'Sem disponibilidade nestas datas'):(s.eyebrow||'Acomodações Flor de Lótus');
   const cost=price!==null?money(price):(lastQuery?'Experimente outras datas.':'Escolha as datas para consultar os valores.');
   const index=(photoIndices.get(s.slug)||0)%s.photos.length;
   return `<article class="catalog-room" data-slug="${esc(s.slug)}"><div class="card-gallery"><button type="button" class="card-photo" data-details="${esc(s.slug)}" aria-label="Ver fotos de ${esc(s.title)}"><img src="${esc(s.photos[index].url)}" alt="${esc(s.photos[index].alt)}" width="700" height="460" loading="lazy"><span class="card-photo-label">Ver ${s.photos.length} fotos</span></button><button type="button" class="photo-arrow" data-photo-prev aria-label="Foto anterior de ${esc(s.title)}">‹</button><button type="button" class="photo-arrow" data-photo-next aria-label="Próxima foto de ${esc(s.title)}">›</button></div><div class="room-body"><h3>${esc(s.title)}</h3><p class="room-meta">${esc(label)}</p><ul class="room-features">${s.features.slice(0,4).map(f=>`<li><i class="bi bi-${/^[a-z0-9-]+$/.test(f.icon)?f.icon:'check2'}" aria-hidden="true"></i><span>${esc(f.label)}</span></li>`).join('')}</ul><p class="room-description">${esc(s.description?.length>145?s.description.slice(0,142)+'…':s.description)}</p><button type="button" class="text-button" data-details="${esc(s.slug)}">Mais detalhes e fotos</button><div class="room-cost"><small>${price!==null?(lastQuery?`Total para ${plural(nights,'noite','noites')}${rows.length>1?' · a partir de':''}`:'Diária por quarto · a partir de'):'Planeje sua estadia'}</small><p class="room-price ${price===null?'unquoted':''}">${esc(cost)}</p><button type="button" class="gold-button" ${lastQuery&&best?`data-options="${esc(s.slug)}"`:'data-search-focus'}>${lastQuery&&best?'Ver opções e reservar':lastQuery?'Consultar outras datas':'Escolher datas'}</button></div></div></article>`;
  }).join(''):'<p class="empty">Não foi possível carregar as acomodações. Atualize a consulta ou converse com a pousada.</p>';
  const priced=(lastQuery?available:inventory).map(r=>lastQuery?r.total:r.price).filter(n=>Number.isFinite(n)&&n>0);
  $('#from-price').hidden=!priced.length;$('#from-price').textContent=priced.length?`A partir de ${money(Math.min(...priced))}${lastQuery?' / estadia':' / noite'}`:'';
 }
 function invalidate(){sequence++;controller?.abort();$('#rooms').removeAttribute('aria-busy');lastQuery=null;available=[];selection=null;$('#result-count').textContent='Atualize a consulta para verificar estas datas e hóspedes.';message('');render();$('#search [type="submit"]').disabled=false;}
 async function search(silent=false){
  const q=query();if(!$('#search').reportValidity())return;
  if(q.end<=q.start){message('A saída deve ser depois da entrada.',true);return;}
  const request=++sequence;controller?.abort();controller=new AbortController();const button=$('#search [type="submit"]');button.disabled=true;
  if(!silent){message('Consultando disponibilidade…');$('#rooms').setAttribute('aria-busy','true');}
  try{
   const [catalog,data]=await Promise.all([api('catalog',null,controller.signal),api('availability?'+new URLSearchParams(q),null,controller.signal)]);
   if(request!==sequence)return;applyCatalog(catalog);lastQuery=q;available=data.rooms||[];nights=data.nights;render();
   $('#result-count').textContent=`${plural(available.length,'quarto disponível','quartos disponíveis')} · ${plural(nights,'noite','noites')} · ${plural(q.guests,'hóspede','hóspedes')}`;
   history.replaceState(null,'',location.pathname+'?'+new URLSearchParams(q));
   if(!silent)message(available.length?'Disponibilidade atualizada. Escolha uma acomodação abaixo.':'Não encontramos vagas para estas datas e hóspedes. Você pode conhecer as acomodações abaixo e consultar outro período.');
  }catch(e){if(request!==sequence||e.name==='AbortError')return;lastQuery=null;available=[];render();$('#result-count').textContent='Disponibilidade ainda não confirmada.';message(e.message,true);}
  finally{if(request===sequence){button.disabled=false;$('#rooms').removeAttribute('aria-busy');}}
 }
 function paintDetails(next){
  if(!detail)return;detailIndex=(next+detail.photos.length)%detail.photos.length;const photo=detail.photos[detailIndex];$('#details-image').src=photo.url;$('#details-image').alt=photo.alt;$('#details-counter').textContent=`${detailIndex+1} / ${detail.photos.length}`;
  $('#details-thumbs').querySelectorAll('button').forEach((b,i)=>{if(i===detailIndex)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
 }
 function detailOptions(){
  if(!detail)return;const rows=rowsFor(detail);
  $('#details-options').innerHTML=lastQuery&&rows.length?rows.map(r=>`<div class="room-option"><p><strong>${esc(r.name)}</strong><br>Até ${r.capacity} hóspedes · ${nights} noites<br>${money(r.total)} no total</p><button type="button" class="gold-button" data-book="${r.id}">Escolher este quarto</button></div>`).join(''):`<p class="room-meta">${lastQuery?'Sem disponibilidade neste período. Escolha outras datas para consultar.':'Selecione as datas e a quantidade de hóspedes para verificar as opções.'}</p><button type="button" class="gold-button" data-search-focus>Escolher datas</button>`;
 }
 function openDetails(slug){
  detail=showcases.find(s=>s.slug===slug);if(!detail)return;const d=detail.details||{};
  $('#details-title').textContent=detail.title;$('#details-description').textContent=d.description||detail.description;
  $('#details-facts').innerHTML=(d.beds?`<p>${esc(d.beds)}</p>`:'')+[['Banheiro',d.bathroom],['Vista',d.views],['Comodidades',d.amenities?.length?d.amenities:detail.features.map(f=>f.label)]].filter(([,items])=>items?.length).map(([title,items])=>`<section><h3>${title}</h3><ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section>`).join('')+(d.smoking?`<p class="room-meta">${esc(d.smoking)}</p>`:'');
  $('#details-thumbs').innerHTML=detail.photos.map((p,i)=>`<button type="button" data-detail-photo="${i}" aria-label="Ver foto ${i+1}"><img src="${esc(p.url)}" alt="" width="60" height="48"></button>`).join('');
  paintDetails(photoIndices.get(slug)||0);detailOptions();$('#room-details').showModal();
 }
 $('#rooms').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('[data-photo-prev],[data-photo-next]')){
   const card=button.closest('[data-slug]'),s=showcases.find(s=>s.slug===card.dataset.slug),index=((photoIndices.get(s.slug)||0)+(button.hasAttribute('data-photo-next')?1:-1)+s.photos.length)%s.photos.length;
   photoIndices.set(s.slug,index);const img=card.querySelector('.card-photo img');img.src=s.photos[index].url;img.alt=s.photos[index].alt;return;
  }
  if(button.hasAttribute('data-details')||button.hasAttribute('data-options'))openDetails(button.dataset.details||button.dataset.options);
  if(button.hasAttribute('data-search-focus'))focusSearch();
 });
 $('#room-details').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close-details'))$('#room-details').close();
  if(button.hasAttribute('data-detail-next'))paintDetails(detailIndex+1);
  if(button.hasAttribute('data-detail-prev'))paintDetails(detailIndex-1);
  if(button.hasAttribute('data-detail-photo'))paintDetails(Number(button.dataset.detailPhoto));
  if(button.hasAttribute('data-search-focus')){$('#room-details').close();focusSearch();}
  if(button.hasAttribute('data-book')&&lastQuery){
   const room=available.find(r=>r.id===Number(button.dataset.book));if(!room)return;
   selection={room:{...room},query:{...lastQuery}};$('#room-details').close();$('#booking-error').textContent='';$('#booking-form [type="submit"]').disabled=false;
   $('#booking-summary').textContent=`${room.name} · ${dateLabel(lastQuery.start)} a ${dateLabel(lastQuery.end)} · ${plural(lastQuery.guests,'hóspede','hóspedes')} · ${money(room.total)} no total.`;$('#booking-dialog').showModal();
  }
 });
 $('#room-details').addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();paintDetails(detailIndex+(event.key==='ArrowRight'?1:-1));}});
 $('#close-booking').onclick=()=>$('#booking-dialog').close();$('#booking-dialog').addEventListener('close',()=>{selection=null;});
 $('#booking-form').onsubmit=async event=>{
  event.preventDefault();if(!selection)return;const button=event.submitter;button.disabled=true;const selected=selection;
  try{
   const q=selected.query,result=await api('bookings',{room_id:selected.room.id,start:q.start,end:q.end,guests:q.guests,package_id:q.package_id?Number(q.package_id):null,guest:$('#guest').value,phone:$('#phone').value});
   $('#booking-dialog').close();event.target.reset();message(`Solicitação #${result.id} recebida! Total: ${money(result.total)}. As datas estão bloqueadas; aguarde o contato da pousada para confirmação e pagamento.`);await search(true);
  }catch(e){$('#booking-error').textContent=e.message;if(e.status===409){selection=null;await search(true);}}
  finally{button.disabled=!selection;}
 };
 $('#search').onsubmit=event=>{event.preventDefault();search();};$('#search').addEventListener('change',invalidate);
 $('#checkin').min=today;$('#checkout').min=nextDay(today);$('#checkin').addEventListener('change',()=>{if(!$('#checkin').value)return;$('#checkout').min=nextDay($('#checkin').value);if($('#checkout').value<=$('#checkin').value)$('#checkout').value=$('#checkout').min;});
 $('#refresh-rooms').onclick=()=>search();
 $('#packages').onclick=event=>{
  const button=event.target.closest('[data-package]');if(!button)return;const p=packages.find(p=>p.id===Number(button.dataset.package));if(!p)return;
  $('#package').value=p.id;$('#checkin').value=p.start<today?today:p.start;$('#checkout').value=nextDay($('#checkin').value,p.nights);$('#checkout').min=nextDay($('#checkin').value);$('#guests').value={solteiro:1,casal:2,casal_mais_um:3,familia:4}[p.type];search();focusSearch();
 };
 // Fill the URL search immediately; a slow catalog must not overwrite later edits.
 const params=new URLSearchParams(location.search),bootstrapSequence=sequence;
 for(const [key,id] of [['start','checkin'],['end','checkout'],['guests','guests']])if(params.has(key))$('#'+id).value=params.get(key);
 if($('#checkin').value)$('#checkout').min=nextDay($('#checkin').value);
 api('catalog').then(data=>{
  if(lastQuery)return;
  applyCatalog(data);if(!$('#rooms').hasAttribute('aria-busy'))render();
  if(sequence!==bootstrapSequence)return;
  if(params.get('package_id')&&packages.some(p=>String(p.id)===params.get('package_id')))$('#package').value=params.get('package_id');
  if($('#checkin').value&&$('#checkout').value)search();
 }).catch(()=>{
  if(sequence!==bootstrapSequence)return;
  message('Não foi possível conectar ao sistema de reservas. Tente novamente ou converse com a pousada.',true);$('#rooms').innerHTML='<p class="empty">As acomodações estarão disponíveis assim que a conexão for restabelecida.</p>';
 });
 setInterval(()=>{if(lastQuery&&!document.hidden&&!$('#search').contains(document.activeElement)&&!$('#booking-dialog').open&&!$('#room-details').open)search(true);},15000);
})();
