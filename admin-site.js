'use strict';
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=null,active='hero',pending=0,saving=false,dirty=false,container,notice='',noticeError=false,beachGroup='overview',reviewGroup='overview';
 const disclosure=new Map();
 const cropSources=new Map();
 function rememberSource(url,file){cropSources.set(url,file);while(cropSources.size>3)cropSources.delete(cropSources.keys().next().value);}
 const draftKey='lotus-editor-draft-v1';let draftAvailable=null,draftTimer;
 function readDraft(){try{const value=JSON.parse(localStorage.getItem(draftKey)||'null');return value&&value.content&&Number.isSafeInteger(value.revision)?value:null;}catch{return null;}}
 function clearDraft(){clearTimeout(draftTimer);try{localStorage.removeItem(draftKey);}catch{}draftAvailable=null;}
 function saveDraft(){clearTimeout(draftTimer);if(!dirty||!state)return;try{localStorage.setItem(draftKey,JSON.stringify({content:state.content,revision:state.revision,updated:new Date().toISOString()}));}catch{updateStatus('Não foi possível guardar o rascunho neste navegador. Mantenha esta aba aberta até publicar.',true);}}
 function queueDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,450);}
 const editorActive=()=>Boolean(document.querySelector('[data-tab="site"].active,[data-tab="experiences"].active,[data-tab="reviews"].active'));
 const preview=document.createElement('dialog');preview.className='cms-preview';preview.innerHTML='<div class="modal-head"><h2>Pré-visualização</h2><div><button type="button" class="btn secondary" data-preview-size="desktop">Computador</button> <button type="button" class="btn secondary" data-preview-size="mobile">Celular</button> <button type="button" class="close" aria-label="Fechar pré-visualização">×</button></div></div><p class="hint">Prévia visual das alterações ainda não publicadas. Os formulários estão desativados aqui.</p><iframe title="Prévia do site" sandbox="allow-same-origin"></iframe>';document.body.append(preview);
 preview.querySelector('.close').onclick=()=>preview.close();preview.querySelectorAll('[data-preview-size]').forEach(b=>b.onclick=()=>preview.classList.toggle('is-mobile',b.dataset.previewSize==='mobile'));
 const get=path=>path.split('.').reduce((v,k)=>v?.[k],state.content);
 const set=(path,value)=>{const parts=path.split('.'),key=parts.pop();parts.reduce((v,k)=>v[k],state.content)[key]=value;dirty=true;queueDraft();updateStatus('Alterações ainda não publicadas. Rascunho guardado automaticamente neste navegador.');};
 function updateStatus(message,error=false){notice=message;noticeError=error;const el=container?.querySelector('[data-cms-status]');if(el){el.textContent=message;el.className=error?'error':'hint';}refreshButtons();}
 function refreshButtons(){container?.querySelectorAll('[data-cms-action]').forEach(b=>b.disabled=pending>0||saving);container?.querySelectorAll('[data-cms-field],[data-cms-section],[data-beach-group],[data-whale-photos],[data-review-group]').forEach(el=>el.disabled=saving);container?.querySelectorAll('[data-cms-upload],[data-cms-crop]').forEach(el=>el.disabled=saving||pending>0);}
 async function request(path,body,method='POST'){
  const response=await fetch('/api/'+path,{method:body?method:'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível concluir a operação.');return data;
 }

 function fieldsHTML(fields,path){return fields.map(field=>{
  const name=path+'.'+field.key,value=get(name),id='cms-'+name.replaceAll('.','-'),attrs=`data-cms-field="${esc(name)}" id="${id}"`,required=field.required?'required':'',max=field.max||1000;
  if(field.hidden||['id','schemaVersion'].includes(field.key))return '';
  if(name==='layout.order')return `<div class="wide"><h3>Ordem das seções</h3>${value.split(/\s+/).filter(Boolean).map((key,i,keys)=>`<div class="cms-order-row"><span>${esc(state.sections.find(s=>s.key===key)?.label||key)}</span><div><button type="button" class="btn secondary" data-order-index="${i}" data-direction="-1" ${i===0?'disabled':''}>↑ Subir</button> <button type="button" class="btn secondary" data-order-index="${i}" data-direction="1" ${i===keys.length-1?'disabled':''}>↓ Descer</button></div></div>`).join('')}</div>`;
  if(field.type==='list')return `<div class="cms-list wide"><div class="cms-list-heading"><h3>${esc(field.label)}</h3><button type="button" class="btn secondary" data-list-add="${esc(name)}" ${(value.length>=field.max||pending)?'disabled':''}>+ Adicionar</button></div>${!value.length&&field.fields?.some(f=>f.key==='url')?'<p class="cms-empty-photos">Nenhuma foto adicionada. Use <strong>+ Adicionar</strong> para enviar uma foto do seu dispositivo. A primeira será a capa.</p>':''}<div>${value.map((item,i)=>`<details class="cms-list-item" data-cms-item="${esc(name+'.'+i)}" ${value.length===1?'open':''}><summary>${/^(gallery|instagram)\.photos$/.test(name)?'Foto '+(i+1)+' · ':''}${esc(item.title||item.name||item.label||item.alt||field.label+' '+(i+1))}</summary><div class="cms-item-tools"><button type="button" class="btn secondary" data-list-move="${esc(name)}" data-index="${i}" data-direction="-1" ${i===0||pending?'disabled':''}>↑ Subir</button><button type="button" class="btn secondary" data-list-move="${esc(name)}" data-index="${i}" data-direction="1" ${i===value.length-1||pending?'disabled':''}>↓ Descer</button><button type="button" class="btn danger" data-list-remove="${esc(name)}" data-index="${i}" ${value.length<=field.min||pending?'disabled':''}>Remover</button></div><div class="fields">${fieldsHTML(field.fields,name+'.'+i)}</div></details>`).join('')}</div></div>`;
  if(field.type==='boolean')return `<div class="wide cms-check"><label><input ${attrs} type="checkbox" ${value?'checked':''}> ${esc(field.label)}</label></div>`;
  let control='';
  if(field.type==='image'||field.type==='video'){
   const video=field.type==='video';
   control=`<div class="cms-media">${value?(video?`<video src="${esc(value)}" controls muted playsinline preload="metadata"></video>`:`<img src="${esc(value)}" alt="Prévia de ${esc(field.label)}" loading="lazy">`):'<span class="hint">Nenhum arquivo selecionado</span>'}<div><label class="cms-upload-label" for="${id}-upload">Enviar ${video?'vídeo':'imagem'}</label><input id="${id}-upload" type="file" data-cms-upload="${esc(name)}" data-kind="${field.type}" accept="${video?'video/mp4,video/webm':'image/jpeg,image/png,image/webp'}"><p class="hint">${video?'MP4 ou WebM, até 50 MB.':'JPG, PNG ou WebP. A foto é otimizada automaticamente antes do envio.'}</p>${/^(gallery|instagram)\.photos\./.test(name)?'<p class="hint">Formato automático 4:3, até 1600 × 1200 px. A foto preenche todo o quadro, sem faixas. Use Ajustar enquadramento para escolher o recorte.</p>':''}</div></div><input ${attrs} type="hidden" value="${esc(value)}">${!video&&value?`<button type="button" class="btn secondary" data-cms-crop="${esc(name)}">Ajustar enquadramento</button>`:''}${!field.required?`<button type="button" class="btn secondary" data-media-clear="${esc(name)}">Remover arquivo</button>`:''}`;
  }else if(field.type==='textarea')control=`<textarea ${attrs} rows="${field.key==='description'?5:4}" maxlength="${max}" ${required}>${esc(value)}</textarea>`;
  else if(field.type==='select')control=`<select ${attrs}>${field.options.map(option=>`<option value="${esc(option)}" ${value===option?'selected':''}>${esc(state.sections.find(s=>s.key===option)?.label||option)}</option>`).join('')}</select>`;
  else control=`<input ${attrs} type="${field.type==='number'?'number':field.type==='date'?'date':'text'}" value="${esc(value)}" ${required} ${field.type==='number'?`min="${field.min}" max="${field.max}" step="${field.step||1}"`:`maxlength="${max}"`}>`;
  return `<div class="${['textarea','image','video'].includes(field.type)?'wide':''}"><label for="${id}">${esc(field.label)}</label>${control}${field.hint?`<p class="hint">${esc(field.hint)}</p>`:''}</div>`;
 }).join('');}
 function fieldFor(path){const parts=path.split('.'),section=parts.shift();let field,fields=state.sections.find(s=>s.key===section).fields;for(const key of parts){if(/^\d+$/.test(key))continue;field=fields.find(f=>f.key===key);fields=field?.fields||[];}return field;}
 const newItem=fields=>Object.fromEntries(fields.map(f=>[f.key,f.key==='id'?'bloco-'+Date.now().toString(36):f.type==='boolean'?true:f.type==='list'?Array.from({length:f.min||0},()=>newItem(f.fields)):f.type==='number'?(f.min??1):f.type==='select'?f.options[0]:'']));
 async function signedUpload(file,onProgress){
  const ticket=await request('site-upload',{type:file.type,size:file.size});
  await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',ticket.uploadUrl);xhr.setRequestHeader('Content-Type',file.type);xhr.setRequestHeader('x-upsert','false');xhr.timeout=180000;xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(100*e.loaded/e.total));};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('Não foi possível enviar o arquivo. Tente novamente.'));xhr.onerror=()=>reject(Error('Falha de conexão ao enviar o arquivo.'));xhr.ontimeout=()=>reject(Error('O envio demorou demais. Tente novamente.'));xhr.send(file);});return ticket.url;
 }
 async function optimizeImage(file,gallery=false){
  // Keep small animated WebP intact; oversized static photos can be resized.
  if(file.type==='image/webp'&&!gallery&&file.size<=3*1024*1024)return file;
  if(file.type==='image/webp'){
   const header=new Uint8Array(await file.slice(0,32).arrayBuffer());
   if(String.fromCharCode(...header.slice(12,16))==='VP8X'&&(header[20]&2)){if(file.size<=3*1024*1024)return file;throw Error('Esta imagem é um WebP animado muito grande. Use uma foto JPG, PNG ou WebP estática.');}
  }
  const url=URL.createObjectURL(file),image=new Image();
  try{
   image.src=url;try{await image.decode();}catch{throw Error('Não foi possível abrir esta imagem. Tente exportá-la como JPG, PNG ou WebP.');}
   if(!image.naturalWidth||!image.naturalHeight)throw Error('A imagem está vazia ou danificada.');
   const units=Math.max(1,Math.floor(Math.min(400,Math.min(image.naturalWidth/4,image.naturalHeight/3))));
   const width=gallery?units*4:image.naturalWidth,height=gallery?units*3:image.naturalHeight;
   let ratio=gallery?1:Math.min(1,1920/Math.max(width,height));
   const canvas=document.createElement('canvas');
   for(let attempt=0;attempt<5;attempt++){
    if(gallery){const size=Math.max(1,Math.floor(units*ratio));canvas.width=size*4;canvas.height=size*3;}else{canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));}
    const context=canvas.getContext('2d');if(!context)throw Error('Não foi possível preparar a imagem neste navegador.');
    if(gallery){const scale=Math.max(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);}else context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',Math.max(.65,.88-attempt*.05)));
    if(blob&&blob.size<=3*1024*1024){
     if(!gallery&&file.size<=3*1024*1024&&file.size<blob.size)return file;
     return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+(blob.type==='image/webp'?'webp':'png'),{type:blob.type});
    }
    ratio*=.75;
   }
   throw Error('Não foi possível otimizar esta imagem. Tente exportá-la como JPG e enviar novamente.');
  }finally{image.src='';URL.revokeObjectURL(url);}
 }
 async function capturePoster(file){
  const url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('Escolha uma capa para o vídeo.'));},12000);const cleanup=()=>clearTimeout(timer);
   video.onloadeddata=()=>{try{const canvas=document.createElement('canvas');const scale=Math.min(1,1920/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{cleanup();blob?resolve(new File([blob],'capa-video.jpg',{type:'image/jpeg'})):reject(Error('Escolha uma capa para o vídeo.'));},'image/jpeg',.9);}catch(error){cleanup();reject(error);}};
   video.onerror=()=>{cleanup();reject(Error('Escolha uma capa para o vídeo.'));};video.src=url;
  });}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 }
 function render(){
  if(!container||!editorActive())return;
  const section=state.sections.find(s=>s.key===active)||state.sections[0];active=section.key;
  container.querySelectorAll('[data-cms-item]').forEach(el=>disclosure.set(el.dataset.cmsItem,el.open));
  const dedicatedTab=document.querySelector('[data-tab="experiences"].active,[data-tab="reviews"].active')?.dataset.tab;
  const dedicated=Boolean(dedicatedTab),dedicatedSection=dedicatedTab==='reviews'?'reviews':'beaches';
  const beachTabs=active==='beaches'?`<div class="cms-beach-tabs" role="group" aria-label="Editar praias e passeios">${[['overview','Capa e apresentação'],['destinations','Praias e cachoeiras'],['tours','Passeios']].map(([key,label])=>`<button type="button" class="${beachGroup===key?'active':''}" data-beach-group="${key}" aria-pressed="${beachGroup===key}">${label}</button>`).join('')}</div>`:'';
  const whale=active==='beaches'?state.content.beaches.tours.findIndex(t=>t.kind==='baleias'):-1;
  const beachHelp=active==='beaches'?`<div class="cms-beach-help"><a href="/itacare" target="_blank" rel="noopener">Abrir guia de Itacaré ↗</a>${whale>=0?'<button type="button" class="btn secondary" data-whale-photos>Editar fotos do passeio das baleias</button>':''}</div>`:'';
  const reviewTabs=active==='reviews'?`<div class="cms-beach-tabs" role="group" aria-label="Editar avaliações">${[['overview','Apresentação'],['platforms','Notas das plataformas'],['items','Depoimentos']].map(([key,label])=>`<button type="button" class="${reviewGroup===key?'active':''}" data-review-group="${key}" aria-pressed="${reviewGroup===key}">${label}</button>`).join('')}</div><p class="hint">Notas e relatos são cadastrados pela pousada. Informe a fonte e a data reais quando disponíveis. Este painel não sincroniza automaticamente com Google ou Booking.</p><p><a href="/avaliacoes" target="_blank" rel="noopener">Abrir página de avaliações ↗</a></p>`:'';
  const visibleFields=active==='reviews'?section.fields.filter(f=>reviewGroup==='items'?f.key==='items':reviewGroup==='platforms'?f.key==='platforms':!['items','platforms'].includes(f.key)):active!=='beaches'?section.fields:section.fields.filter(f=>beachGroup==='destinations'?f.key==='items':beachGroup==='tours'?f.key==='tours':!['items','tours'].includes(f.key));

  container.innerHTML=`<div class="cms-toolbar panel"><div><strong>Conteúdo do site</strong><p class="hint" data-cms-status role="status" aria-live="polite">${esc(notice||(dirty?'Alterações ainda não publicadas.':'Versão publicada '+state.revision+'. Edite e pré-visualize antes de publicar.'))}</p></div><div class="cms-actions"><button class="btn secondary" type="button" data-cms-action="preview">Pré-visualizar</button><button class="btn" type="button" data-cms-action="save">Publicar alterações</button></div></div><div class="cms-layout"><nav class="cms-nav" aria-label="Seções do site">${state.sections.filter(s=>!dedicated||s.key===dedicatedSection).map(s=>`<button type="button" data-cms-section="${s.key}" class="${s.key===active?'active':''}" aria-current="${s.key===active?'page':'false'}">${esc(s.label)}</button>`).join('')}<a href="/" target="_blank" rel="noopener">Abrir site ↗</a><button type="button" data-cms-action="history">Histórico de publicações</button><button type="button" data-cms-action="reload">Descartar alterações e recarregar</button></nav><section class="panel cms-editor"><h2>${esc(section.label)}</h2><p class="sub">${esc(section.hint)}</p>${beachHelp}${beachTabs}${reviewTabs}<form id="cms-form"><div class="fields">${fieldsHTML(visibleFields,section.key)}</div></form>${active==='rooms'?'<p><button type="button" class="btn secondary" data-open-room-content>Editar fotos e descrições dos quartos →</button></p>':''}</section></div>`;
  if(draftAvailable&&!dirty){const same=draftAvailable.revision===state.revision;container.insertAdjacentHTML('afterbegin',`<div class="cms-draft-notice" role="status"><strong>Há um rascunho salvo neste navegador.</strong><p>${same?'Você pode recuperar suas alterações e continuar editando.':'A publicação mudou desde este rascunho. Baixe uma cópia para recuperar os textos sem sobrescrever a versão atual.'}</p>${same?'<button type="button" class="btn" data-draft-restore>Recuperar rascunho</button>':''}<button type="button" class="btn secondary" data-draft-download>Baixar cópia</button><button type="button" class="btn secondary" data-draft-discard>Descartar rascunho</button></div>`);}
  if(dirty)queueDraft();
  container.querySelectorAll('[data-cms-item]').forEach(el=>{if(disclosure.has(el.dataset.cmsItem))el.open=disclosure.get(el.dataset.cmsItem);});
  container.querySelectorAll('[data-cms-field]').forEach(input=>input.addEventListener('input',()=>{const field=fieldFor(input.dataset.cmsField);set(input.dataset.cmsField,field.type==='boolean'?input.checked:field.type==='number'?Number(input.value):input.value);}));

  container.querySelectorAll('[data-cms-upload]').forEach(input=>input.onchange=async()=>{
   let file=input.files[0];if(!file)return;const original=file;const kind=input.dataset.kind,path=input.dataset.cmsUpload;
   if(kind==='image'&&!['image/jpeg','image/png','image/webp'].includes(file.type)){
    const extension=file.name.split('.').pop().toLowerCase(),type={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[extension];
    if(type)file=new File([file],file.name,{type});
   }
   if(!file.size||!(kind==='video'?['video/mp4','video/webm']:['image/jpeg','image/png','image/webp']).includes(file.type)||(kind==='video'&&file.size>50*1024*1024)){updateStatus(kind==='video'?'Use vídeo MP4 ou WebM de até 50 MB.':'Use uma foto JPG, PNG ou WebP válida.',true);input.value='';return;}
   pending++;input.disabled=true;refreshButtons();
   try{if(kind==='image'){updateStatus('Preparando e otimizando a foto…');file=await optimizeImage(file,/^(gallery|instagram)\.photos\./.test(path));}const url=await signedUpload(file,n=>updateStatus(`Enviando arquivo… ${n}%`));set(path,url);if(kind==='image'){const sourceURL=/^(gallery|instagram)\.photos\./.test(path)?await signedUpload(await optimizeImage(original,false),()=>{}):url;set(path+'Source',sourceURL);rememberSource(url,original);}
    if(path==='hero.video'){set('hero.mobileVideo','');set('hero.animation','');try{const poster=await capturePoster(file);set('hero.poster',await signedUpload(poster,()=>{}));}catch{updateStatus('Vídeo enviado. Selecione uma imagem de capa antes de publicar.');}}
    if(path==='hero.mobileVideo')set('hero.animation','');
    updateStatus(kind==='video'&&file.size>8*1024*1024?'Vídeo enviado. Este arquivo é pesado: recomendamos uma versão otimizada antes de publicar.':'Arquivo enviado. Publique as alterações para exibi-lo no site.');
   }catch(error){updateStatus(error.message,true);}finally{pending--;render();}
  });
  container.querySelector('form').onsubmit=event=>event.preventDefault();if(noticeError)container.querySelector('[data-cms-status]').className='error';refreshButtons();
 }
 async function load(target){container=target;container.innerHTML='<div class="panel" role="status">Carregando editor do site…</div>';try{const result=await request('site-content');state=result;dirty=false;notice='';noticeError=false;draftAvailable=readDraft();render();}catch(error){if(!editorActive())return;container.innerHTML=`<div class="panel"><p class="error" role="alert">${esc(error.message)}</p><button class="btn secondary" type="button" data-retry-cms>Tentar novamente</button></div>`;}}
 document.querySelector('#content').addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-retry-cms'))return load(document.querySelector('#content'));
  if(!state||!editorActive())return;
  if(button.hasAttribute('data-draft-restore')){if(draftAvailable?.revision!==state.revision)return;state.content=structuredClone(draftAvailable.content);draftAvailable=null;dirty=true;render();updateStatus('Rascunho recuperado. Revise e pré-visualize antes de publicar.');return;}
  if(button.hasAttribute('data-draft-discard')){clearDraft();render();return;}
  if(button.hasAttribute('data-draft-download')){if(!draftAvailable)return;const url=URL.createObjectURL(new Blob([JSON.stringify(draftAvailable.content,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rascunho-flor-de-lotus.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  if(button.dataset.reviewGroup){if(saving||pending)return;reviewGroup=button.dataset.reviewGroup;render();return;}
  if(button.dataset.beachGroup){if(saving||pending)return;beachGroup=button.dataset.beachGroup;render();return;}
  if(button.hasAttribute('data-whale-photos')){
   if(saving||pending)return;beachGroup='tours';render();
   const index=state.content.beaches.tours.findIndex(t=>t.kind==='baleias');
   const item=container.querySelector(`[data-cms-item="beaches.tours.${index}"]`);
   if(item){item.open=true;item.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
   return;
  }
  if(button.dataset.cmsSection){active=button.dataset.cmsSection;render();return;}
  if(button.hasAttribute('data-open-room-content')){document.querySelector('[data-tab="showcases"]').click();return;}
  if(pending||saving)return;
  if(button.dataset.cmsCrop){
   const path=button.dataset.cmsCrop,current=get(path),source=cropSources.get(current)||get(path+'Source')||current;
   pending++;refreshButtons();
   try{const cropped=await window.lotusCrop(source,path);if(cropped){updateStatus('Enviando enquadramento…');const file=await optimizeImage(cropped,/^(gallery|instagram)\.photos\./.test(path));const url=await signedUpload(file,n=>updateStatus(`Enviando enquadramento… ${n}%`));rememberSource(url,source);if(!get(path+'Source'))set(path+'Source',current);set(path,url);updateStatus('Enquadramento salvo no rascunho. Publique para atualizar o site.');}}
   catch(error){updateStatus(error.message,true);}finally{pending--;render();}return;
  }
  if(button.hasAttribute('data-order-index')){const keys=String(state.content.layout.order).split(/\s+/).filter(Boolean),i=Number(button.dataset.orderIndex),j=i+Number(button.dataset.direction);if(j>=0&&j<keys.length){[keys[i],keys[j]]=[keys[j],keys[i]];set('layout.order',keys.join('\n'));render();}return;}
  if(button.dataset.mediaClear){const path=button.dataset.mediaClear;set(path,'');if(fieldFor(path).type==='image')set(path+'Source','');render();return;}
  if(button.dataset.listAdd){const path=button.dataset.listAdd,field=fieldFor(path),list=get(path);if(list.length<field.max){const item=newItem(field.fields);if(Object.hasOwn(item,'alt')){const parent=get(path.split('.').slice(0,-1).join('.'));item.alt=parent?.title||'Foto da pousada';}list.push(item);dirty=true;render();}return;}
  if(button.dataset.listRemove){const path=button.dataset.listRemove,list=get(path),field=fieldFor(path);if(list.length>field.min&&confirm('Remover este item? A mudança só aparecerá no site ao publicar.')){list.splice(Number(button.dataset.index),1);dirty=true;render();}return;}
  if(button.dataset.listMove){const list=get(button.dataset.listMove),i=Number(button.dataset.index),j=i+Number(button.dataset.direction);if(j>=0&&j<list.length){[list[i],list[j]]=[list[j],list[i]];dirty=true;render();}return;}
  const action=button.dataset.cmsAction;
  if(action==='reload'){if(!dirty||confirm('Descartar as alterações não publicadas?')){clearDraft();load(container);}return;}
  if(!action)return;
  saving=true;refreshButtons();
  try{
   if(action==='save'){updateStatus('Publicando alterações…');const saved=await request('site-content',{content:state.content,revision:state.revision},'PUT');state.content=saved.content;state.revision=saved.revision;dirty=false;clearDraft();render();updateStatus('Publicado! As alterações aparecem ao abrir ou atualizar o site.');}
   if(action==='preview'){updateStatus('Preparando prévia…');const result=await request('site-preview',{content:state.content,page:active==='reviews'?'avaliacoes':active==='catalog'?'quartos':active==='beaches'?'itacare':'index'});preview.querySelector('iframe').srcdoc=result.html.replace('<head>','<head><base href="'+location.origin+'/">');preview.showModal();updateStatus(dirty?'Prévia pronta. As alterações ainda não foram publicadas.':'Prévia da versão publicada.');}
   if(action==='history'){const data=await request('site-history');if(!data.versions.length){updateStatus('O histórico aparecerá após a primeira publicação.');return;}const choices=data.versions.map(v=>`${v.revision} — ${new Date(v.published_at).toLocaleString('pt-BR')}`).join('\n');const target=prompt('Qual versão deseja restaurar? Digite o número.\n'+choices);if(target&&data.versions.some(v=>v.revision===Number(target))&&confirm('Publicar esta versão anterior? A versão atual será guardada no histórico.')){const saved=await request('site-restore',{target:Number(target),revision:state.revision});state.content=saved.content;state.revision=saved.revision;dirty=false;clearDraft();render();updateStatus('Versão anterior restaurada e publicada.');}}
  }catch(error){updateStatus(error.message,true);}finally{saving=false;refreshButtons();}
 });
 window.addEventListener('beforeunload',event=>{if(dirty||pending){event.preventDefault();event.returnValue='';}});
 window.addEventListener('pagehide',saveDraft);
 window.siteEditor={clear(){saveDraft();state=null;dirty=false;container=null;},render(target,section){container=target;if(section)active=section;if(state)render();else load(target);}};
})();
