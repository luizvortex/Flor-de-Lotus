'use strict';
(() => {
 const icons=window.roomAmenities.icons;
 const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dialog=document.createElement('dialog');dialog.id='showcase-editor';dialog.className='showcase-editor';
 dialog.innerHTML=`<div class="modal-head"><h2>Editar bloco do site</h2><button type="button" class="close" aria-label="Fechar editor" data-showcase-close>×</button></div><form id="showcase-form"><div class="fields"><div class="wide"><label for="showcase-title">Título do quarto</label><input id="showcase-title" name="title" maxlength="120" required></div><div class="wide"><label for="showcase-eyebrow">Tópico acima do título (opcional)</label><input id="showcase-eyebrow" name="eyebrow" maxlength="80" placeholder="Ex.: uma característica real da acomodação"></div><div class="wide"><label for="showcase-description">Descrição</label><textarea id="showcase-description" name="description" rows="5" maxlength="3000" required></textarea></div></div><div class="showcase-editor-heading"><h3>Fotos</h3><button type="button" class="btn secondary" id="showcase-add-photo">+ Adicionar foto</button></div><p class="hint">A primeira foto é o destaque. Duas aparecem ao lado; todas ficam em “Ver fotos”. JPG, PNG ou WebP, até 3 MB por foto.</p><div id="showcase-photos"></div><div class="showcase-editor-heading"><h3>Informações em “Ver fotos”</h3></div><p class="hint">Preencha somente informações confirmadas deste quarto. Nas listas, coloque uma comodidade por linha (até 12 itens por grupo).</p><div class="fields"><div class="wide"><label for="detail-beds">Camas (opcional)</label><input id="detail-beds" name="detail_beds" maxlength="120" placeholder="Ex.: 1 cama de casal"></div><div class="wide"><label for="detail-description">Descrição detalhada (opcional)</label><textarea id="detail-description" name="detail_description" rows="4" maxlength="1500"></textarea></div><div><label for="detail-bathroom">Banheiro privativo</label><textarea id="detail-bathroom" name="detail_bathroom" rows="5" maxlength="1800"></textarea></div><div><label for="detail-views">Vista</label><textarea id="detail-views" name="detail_views" rows="5" maxlength="1800"></textarea></div><div class="wide"><label for="detail-smoking">Política de fumantes (opcional)</label><input id="detail-smoking" name="detail_smoking" maxlength="120" placeholder="Ex.: Não é permitido fumar"></div></div><div class="showcase-editor-heading"><h3>Destaques com ícones</h3><button type="button" class="btn secondary" id="showcase-add-feature">+ Adicionar comodidade</button></div><p class="hint">Escolha até 16 destaques para as etiquetas ao lado do nome do quarto. Você pode remover todos.</p><div id="showcase-features"></div><div class="showcase-editor-heading"><h3>Comodidades do quarto</h3><button type="button" class="btn secondary" id="showcase-add-amenity">+ Adicionar comodidade</button></div><p class="hint">Até 32 itens, cada um com ícone e texto próprios. Selecione somente o que este quarto oferece.</p><div id="showcase-amenities"></div><p id="showcase-editor-error" class="error" role="alert"></p><div class="form-actions"><button type="button" class="btn secondary" data-showcase-close>Cancelar</button><button type="submit" class="btn" id="showcase-save">Salvar no site</button></div></form>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form');let current=null;let rows=[];let target;
 const error=message=>{dialog.querySelector('#showcase-editor-error').textContent=message;};
 const refreshSave=()=>{dialog.querySelector('#showcase-save').disabled=!current||current.pending>0||current.saving;};
 dialog.querySelectorAll('[data-showcase-close]').forEach(b=>b.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{current=null;});
 function renderPhotos(){
  if(!current)return;
  const session=current;
  const container=dialog.querySelector('#showcase-photos');
  container.innerHTML=session.draft.photos.map((photo,i)=>`<div class="showcase-photo-edit"><img src="${text(photo.url)}" alt="Prévia da foto ${i+1}"><div><label for="showcase-photo-${i}">Foto ${i+1}${i===0?' · destaque':''}</label><input type="file" id="showcase-photo-${i}" accept="image/jpeg,image/png,image/webp" data-upload="${i}" ${photo.uploading?'disabled':''}><label for="showcase-alt-${i}">Descrição da imagem</label><input id="showcase-alt-${i}" data-alt="${i}" value="${text(photo.alt)}" maxlength="180" required><span class="hint">${photo.uploading?'Enviando foto…':''}</span></div><div class="showcase-photo-actions"><button type="button" class="btn secondary" data-up-photo="${i}" ${i===0||session.pending?'disabled':''} aria-label="Mover foto ${i+1} para cima">↑</button><button type="button" class="btn danger" data-remove-photo="${i}" ${session.draft.photos.length<=3||session.pending?'disabled':''}>Remover</button></div></div>`).join('');
  dialog.querySelector('#showcase-add-photo').disabled=session.draft.photos.length>=12||session.pending>0;
  container.querySelectorAll('[data-alt]').forEach(input=>input.oninput=()=>{session.draft.photos[Number(input.dataset.alt)].alt=input.value;});
  container.querySelectorAll('[data-up-photo]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.upPhoto);[session.draft.photos[i-1],session.draft.photos[i]]=[session.draft.photos[i],session.draft.photos[i-1]];renderPhotos();});
  container.querySelectorAll('[data-remove-photo]').forEach(button=>button.onclick=()=>{session.draft.photos.splice(Number(button.dataset.removePhoto),1);renderPhotos();});
  container.querySelectorAll('[data-upload]').forEach(input=>input.onchange=async()=>{
   const file=input.files[0];if(!file)return;
   if(file.size>3*1024*1024){error('Use uma foto de até 3 MB.');input.value='';return;}
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)){error('Use JPG, PNG ou WebP.');input.value='';return;}
   const photo=session.draft.photos[Number(input.dataset.upload)];
   session.pending++;photo.uploading=true;error('');renderPhotos();refreshSave();
   try{
    const data=new FormData();data.append('photo',file);
    const response=await fetch('/api/showcase-upload',{method:'POST',body:data});const result=await response.json();
    if(!response.ok)throw Error(result.error||'Não foi possível enviar a foto.');
    photo.url=result.url;
   }catch(e){if(current===session)error(e.message);}finally{session.pending--;delete photo.uploading;if(current===session){renderPhotos();refreshSave();}}
  });
 }
 function renderFeatures(){
  if(!current)return;const features=current.draft.features;
  const container=dialog.querySelector('#showcase-features');
  container.innerHTML=features.map((feature,i)=>`<div class="showcase-feature-edit"><span class="room-icon-preview">${window.roomAmenities.icon(feature.icon)}</span><div><label for="showcase-icon-${i}">Ícone</label><select id="showcase-icon-${i}" data-icon="${i}">${Object.entries(icons).map(([value,label])=>`<option value="${value}" ${value===feature.icon?'selected':''}>${text(label)}</option>`).join('')}</select></div><div><label for="showcase-label-${i}">Texto da comodidade</label><input id="showcase-label-${i}" value="${text(feature.label)}" data-label="${i}" maxlength="100" required></div><button type="button" class="btn danger" data-remove-feature="${i}" aria-label="Remover comodidade ${i+1}">×</button></div>`).join('');
  dialog.querySelector('#showcase-add-feature').disabled=features.length>=16;
  container.querySelectorAll('[data-icon]').forEach(select=>select.onchange=()=>{features[Number(select.dataset.icon)].icon=select.value;select.closest('.showcase-feature-edit').querySelector('.room-icon-preview').innerHTML=window.roomAmenities.icon(select.value);});
  container.querySelectorAll('[data-label]').forEach(input=>input.oninput=()=>{features[Number(input.dataset.label)].label=input.value;});
  container.querySelectorAll('[data-remove-feature]').forEach(button=>button.onclick=()=>{features.splice(Number(button.dataset.removeFeature),1);renderFeatures();});
 }
 function renderAmenities(){
  if(!current)return;const items=current.draft.amenities,container=dialog.querySelector('#showcase-amenities');
  container.innerHTML=items.map((item,i)=>`<div class="showcase-feature-edit"><span class="room-icon-preview">${window.roomAmenities.icon(item.icon)}</span><div><label for="amenity-icon-${i}">Ícone</label><select id="amenity-icon-${i}" data-amenity-icon="${i}">${Object.entries(icons).map(([value,label])=>`<option value="${value}" ${value===item.icon?'selected':''}>${text(label)}</option>`).join('')}</select></div><div><label for="amenity-label-${i}">Texto da comodidade</label><input id="amenity-label-${i}" value="${text(item.label)}" data-amenity-label="${i}" maxlength="140" required></div><button type="button" class="btn danger" data-remove-amenity="${i}" aria-label="Remover comodidade ${i+1}">×</button></div>`).join('');
  dialog.querySelector('#showcase-add-amenity').disabled=items.length>=32;
  container.querySelectorAll('[data-amenity-icon]').forEach(select=>select.onchange=()=>{const i=Number(select.dataset.amenityIcon);items[i].icon=select.value;select.closest('.showcase-feature-edit').querySelector('.room-icon-preview').innerHTML=window.roomAmenities.icon(select.value);});
  container.querySelectorAll('[data-amenity-label]').forEach(input=>input.oninput=()=>{items[Number(input.dataset.amenityLabel)].label=input.value;});
  container.querySelectorAll('[data-remove-amenity]').forEach(button=>button.onclick=()=>{items.splice(Number(button.dataset.removeAmenity),1);renderAmenities();});
 }
 dialog.querySelector('#showcase-add-amenity').onclick=()=>{if(!current||current.draft.amenities.length>=32)return;current.draft.amenities.push({icon:'check2',label:''});renderAmenities();};
 function open(row){
  current={draft:structuredClone(row),pending:0,saving:false};current.draft.amenities=structuredClone(window.roomAmenities.amenitiesFor(row));form.reset();error('');
  form.elements.title.value=row.title;form.elements.eyebrow.value=row.eyebrow;form.elements.description.value=row.description;
  const details=row.details||{};
  ['beds','description','smoking'].forEach(key=>{form.elements['detail_'+key].value=details[key]||'';});
  ['bathroom','views'].forEach(key=>{form.elements['detail_'+key].value=(details[key]||[]).join('\n');});
  renderPhotos();renderFeatures();renderAmenities();refreshSave();dialog.showModal();
 }
 dialog.querySelector('#showcase-add-photo').onclick=()=>{if(!current||current.draft.photos.length>=12)return;current.draft.photos.push({...current.draft.photos[0],alt:`${form.elements.title.value} — foto ${current.draft.photos.length+1}`});renderPhotos();};
 dialog.querySelector('#showcase-add-feature').onclick=()=>{if(!current||current.draft.features.length>=16)return;current.draft.features.push({icon:'check2',label:''});renderFeatures();};
 form.onsubmit=async event=>{
  event.preventDefault();if(!current||current.pending)return;const session=current;session.saving=true;refreshSave();error('');
  try{
   const details={...(session.draft.details||{})};
   ['beds','description','smoking'].forEach(key=>{details[key]=form.elements['detail_'+key].value.trim();});
   ['bathroom','views'].forEach(key=>{const items=form.elements['detail_'+key].value.split('\n').map(v=>v.trim()).filter(Boolean);if(items.length>12||items.some(v=>v.length>140))throw Error('Use até 12 itens por lista e até 140 caracteres por item.');details[key]=items;});
   const data={amenities:session.draft.amenities,details,title:form.elements.title.value,eyebrow:form.elements.eyebrow.value,description:form.elements.description.value,revision:session.draft.revision,photos:session.draft.photos.map(({url,alt})=>({url,alt})),features:session.draft.features};
   await api('showcases/'+session.draft.slug,data,'PUT');dialog.close();if(document.querySelector('[data-tab="showcases"]').classList.contains('active'))await render(target);notify('Conteúdo salvo. As alterações já aparecem ao abrir o site.');
  }catch(e){if(current===session)error(e.message);}finally{session.saving=false;if(current===session)refreshSave();}
 };
 async function render(container){
  if(!document.querySelector('[data-tab="showcases"]').classList.contains('active'))return;
  target=container;container.innerHTML='<p class="sub">Carregando conteúdo do site…</p>';
  try{
   const result=await api('showcases');rows=result.showcases;
   // Do not replace the contents if the administrator switched tabs meanwhile.
   if(!document.querySelector('[data-tab="showcases"]').classList.contains('active'))return;
   container.innerHTML=`<div class="panel"><p class="sub">Edite fotos, descrições, destaques e comodidades de cada quarto. Todos os ícones da galeria estão disponíveis nos seletores. Os preços ficam em Diárias e temporadas; o estoque e os andares ficam em Quartos.</p><a href="/#quartos" target="_blank" rel="noopener" class="showcase-preview-link">Ver seção no site ↗</a></div><div class="cards">${rows.map(row=>`<article class="card"><img class="showcase-admin-preview" src="${text(row.photos[0].url)}" alt="${text(row.photos[0].alt)}"><div class="card-body"><p class="hint">${['duplo','triplo'].includes(row.slug)?'Página inicial e catálogo':'Catálogo de quartos'}</p><h2>${text(row.title)}</h2><p class="sub">${text(row.description)}</p><div class="showcase-admin-features">${row.features.map(feature=>`<span><span class="room-icon-preview">${window.roomAmenities.icon(feature.icon)}</span> ${text(feature.label)}</span>`).join('')}</div><button type="button" class="btn" data-edit-showcase="${text(row.slug)}">Editar conteúdo</button></div></article>`).join('')}</div>`;
   container.querySelectorAll('[data-edit-showcase]').forEach(button=>button.onclick=()=>open(rows.find(row=>row.slug===button.dataset.editShowcase)));
  }catch(e){container.textContent=e.message;}
 }
 window.showcaseEditor={render};
})();
