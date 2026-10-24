'use strict';
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=null,active='hero',pending=0,saving=false,dirty=false,container,notice='',noticeError=false;
 const preview=document.createElement('dialog');preview.className='cms-preview';preview.innerHTML='<div class="modal-head"><h2>Pré-visualização</h2><div><button type="button" class="btn secondary" data-preview-size="desktop">Computador</button> <button type="button" class="btn secondary" data-preview-size="mobile">Celular</button> <button type="button" class="close" aria-label="Fechar pré-visualização">×</button></div></div><p class="hint">Prévia visual das alterações ainda não publicadas. Os formulários estão desativados aqui.</p><iframe title="Prévia do site" sandbox="allow-same-origin"></iframe>';document.body.append(preview);
 preview.querySelector('.close').onclick=()=>preview.close();preview.querySelectorAll('[data-preview-size]').forEach(b=>b.onclick=()=>preview.classList.toggle('is-mobile',b.dataset.previewSize==='mobile'));
 const get=path=>path.split('.').reduce((v,k)=>v?.[k],state.content);
 const set=(path,value)=>{const parts=path.split('.'),key=parts.pop();parts.reduce((v,k)=>v[k],state.content)[key]=value;dirty=true;updateStatus('Alterações ainda não publicadas.');};
 function updateStatus(message,error=false){notice=message;noticeError=error;const el=container?.querySelector('[data-cms-status]');if(el){el.textContent=message;el.className=error?'error':'hint';}refreshButtons();}
 function refreshButtons(){container?.querySelectorAll('[data-cms-action]').forEach(b=>b.disabled=pending>0||saving);container?.querySelectorAll('[data-cms-field],[data-cms-section]').forEach(el=>el.disabled=saving);container?.querySelectorAll('[data-cms-upload],[data-media-choice]').forEach(el=>el.disabled=saving||pending>0);}
 async function request(path,body,method='POST'){
  const response=await fetch('/api/'+path,{method:body?method:'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível concluir a operação.');return data;
 }
 function library(){const urls=new Set();const walk=v=>{if(typeof v==='string'&&/\.(jpe?g|png|webp)$/i.test(v))urls.add(v);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};walk(state.content);return [...urls];}
 function fieldsHTML(fields,path){return fields.map(field=>{
  const name=path+'.'+field.key,value=get(name),id='cms-'+name.replaceAll('.','-'),attrs=`data-cms-field="${esc(name)}" id="${id}"`,required=field.required?'required':'',max=field.max||1000;
  if(field.key==='id')return '';
  if(name==='layout.order')return `<div class="wide"><h3>Ordem das seções</h3>${value.split(/\s+/).filter(Boolean).map((key,i,keys)=>`<div class="cms-order-row"><span>${esc(state.sections.find(s=>s.key===key)?.label||key)}</span><div><button type="button" class="btn secondary" data-order-index="${i}" data-direction="-1" ${i===0?'disabled':''}>↑ Subir</button> <button type="button" class="btn secondary" data-order-index="${i}" data-direction="1" ${i===keys.length-1?'disabled':''}>↓ Descer</button></div></div>`).join('')}</div>`;
  if(field.type==='list')return `<div class="cms-list wide"><div class="cms-list-heading"><h3>${esc(field.label)}</h3><button type="button" class="btn secondary" data-list-add="${esc(name)}" ${(value.length>=field.max||pending)?'disabled':''}>+ Adicionar</button></div><div>${value.map((item,i)=>`<details class="cms-list-item" ${value.length===1?'open':''}><summary>${esc(item.title||item.name||item.alt||field.label+' '+(i+1))}</summary><div class="cms-item-tools"><button type="button" class="btn secondary" data-list-move="${esc(name)}" data-index="${i}" data-direction="-1" ${i===0||pending?'disabled':''}>↑ Subir</button><button type="button" class="btn secondary" data-list-move="${esc(name)}" data-index="${i}" data-direction="1" ${i===value.length-1||pending?'disabled':''}>↓ Descer</button><button type="button" class="btn danger" data-list-remove="${esc(name)}" data-index="${i}" ${value.length<=field.min||pending?'disabled':''}>Remover</button></div><div class="fields">${fieldsHTML(field.fields,name+'.'+i)}</div></details>`).join('')}</div></div>`;
  if(field.type==='boolean')return `<div class="wide cms-check"><label><input ${attrs} type="checkbox" ${value?'checked':''}> ${esc(field.label)}</label></div>`;
  let control='';
  if(field.type==='image'||field.type==='video'){
   const video=field.type==='video';
   control=`<div class="cms-media">${value?(video?`<video src="${esc(value)}" controls muted playsinline preload="metadata"></video>`:`<img src="${esc(value)}" alt="Prévia de ${esc(field.label)}" loading="lazy">`):'<span class="hint">Nenhum arquivo selecionado</span>'}<div><label class="cms-upload-label" for="${id}-upload">Enviar ${video?'vídeo':'imagem'}</label><input id="${id}-upload" type="file" data-cms-upload="${esc(name)}" data-kind="${field.type}" accept="${video?'video/mp4,video/webm':'image/jpeg,image/png,image/webp'}"><p class="hint">${video?'MP4 ou WebM, até 50 MB.':'JPG, PNG ou WebP, até 3 MB.'}</p>${!video?`<label for="${id}-choice">Usar uma imagem já presente no site</label><select id="${id}-choice" data-media-choice="${esc(name)}"><option value="">Selecionar imagem…</option>${library().map(url=>`<option value="${esc(url)}">${esc(decodeURI(url.split('/').pop()))}</option>`).join('')}</select>`:''}</div></div><input ${attrs} type="hidden" value="${esc(value)}">${!field.required?`<button type="button" class="btn secondary" data-media-clear="${esc(name)}">Remover arquivo</button>`:''}`;
  }else if(field.type==='textarea')control=`<textarea ${attrs} rows="${field.key==='description'?5:4}" maxlength="${max}" ${required}>${esc(value)}</textarea>`;
  else if(field.type==='select')control=`<select ${attrs}>${field.options.map(option=>`<option value="${esc(option)}" ${value===option?'selected':''}>${esc(state.sections.find(s=>s.key===option)?.label||option)}</option>`).join('')}</select>`;
  else control=`<input ${attrs} type="${field.type==='number'?'number':'text'}" value="${esc(value)}" ${required} ${field.type==='number'?`min="${field.min}" max="${field.max}" step="${field.step||1}"`:`maxlength="${max}"`}>`;
  return `<div class="${['textarea','image','video'].includes(field.type)?'wide':''}"><label for="${id}">${esc(field.label)}</label>${control}${field.hint?`<p class="hint">${esc(field.hint)}</p>`:''}</div>`;
 }).join('');}
 function fieldFor(path){const parts=path.split('.'),section=parts.shift();let field,fields=state.sections.find(s=>s.key===section).fields;for(const key of parts){if(/^\d+$/.test(key))continue;field=fields.find(f=>f.key===key);fields=field?.fields||[];}return field;}
 const newItem=fields=>Object.fromEntries(fields.map(f=>[f.key,f.key==='id'?'bloco-'+Date.now().toString(36):f.type==='boolean'?true:f.type==='list'?Array.from({length:f.min||0},()=>newItem(f.fields)):f.type==='number'?f.min||1:f.type==='select'?f.options[0]:'']));
 async function signedUpload(file,onProgress){
  const ticket=await request('site-upload',{type:file.type,size:file.size});
  await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',ticket.uploadUrl);xhr.setRequestHeader('Content-Type',file.type);xhr.setRequestHeader('x-upsert','false');xhr.timeout=180000;xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(100*e.loaded/e.total));};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('Não foi possível enviar o arquivo. Tente novamente.'));xhr.onerror=()=>reject(Error('Falha de conexão ao enviar o arquivo.'));xhr.ontimeout=()=>reject(Error('O envio demorou demais. Tente novamente.'));xhr.send(file);});return ticket.url;
 }
 async function capturePoster(file){
  const url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('Escolha uma capa para o vídeo.'));},12000);const cleanup=()=>clearTimeout(timer);
   video.onloadeddata=()=>{try{const canvas=document.createElement('canvas');const scale=Math.min(1,1920/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{cleanup();blob?resolve(new File([blob],'capa-video.jpg',{type:'image/jpeg'})):reject(Error('Escolha uma capa para o vídeo.'));},'image/jpeg',.9);}catch(error){cleanup();reject(error);}};
   video.onerror=()=>{cleanup();reject(Error('Escolha uma capa para o vídeo.'));};video.src=url;
  });}finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 }
 function render(){
  if(!container||!document.querySelector('[data-tab="site"]')?.classList.contains('active'))return;
  const section=state.sections.find(s=>s.key===active)||state.sections[0];active=section.key;
  container.innerHTML=`<div class="cms-toolbar panel"><div><strong>Conteúdo do site</strong><p class="hint" data-cms-status role="status" aria-live="polite">${esc(notice||(dirty?'Alterações ainda não publicadas.':'Versão publicada '+state.revision+'. Edite e pré-visualize antes de publicar.'))}</p></div><div class="cms-actions"><button class="btn secondary" type="button" data-cms-action="preview">Pré-visualizar</button><button class="btn" type="button" data-cms-action="save">Publicar alterações</button></div></div><div class="cms-layout"><nav class="cms-nav" aria-label="Seções do site">${state.sections.map(s=>`<button type="button" data-cms-section="${s.key}" class="${s.key===active?'active':''}" aria-current="${s.key===active?'page':'false'}">${esc(s.label)}</button>`).join('')}<a href="/" target="_blank" rel="noopener">Abrir site ↗</a><button type="button" data-cms-action="history">Histórico de publicações</button><button type="button" data-cms-action="reload">Descartar alterações e recarregar</button></nav><section class="panel cms-editor"><h2>${esc(section.label)}</h2><p class="sub">${esc(section.hint)}</p><form id="cms-form"><div class="fields">${fieldsHTML(section.fields,section.key)}</div></form>${active==='rooms'?'<p><button type="button" class="btn secondary" data-open-room-content>Editar fotos e descrições dos quartos →</button></p>':''}</section></div>`;
  container.querySelectorAll('[data-cms-field]').forEach(input=>input.addEventListener('input',()=>{const field=fieldFor(input.dataset.cmsField);set(input.dataset.cmsField,field.type==='boolean'?input.checked:field.type==='number'?Number(input.value):input.value);}));
  container.querySelectorAll('[data-media-choice]').forEach(select=>select.onchange=()=>{if(select.value){set(select.dataset.mediaChoice,select.value);render();}});
  container.querySelectorAll('[data-cms-upload]').forEach(input=>input.onchange=async()=>{
   const file=input.files[0];if(!file)return;const kind=input.dataset.kind,path=input.dataset.cmsUpload;
   if(!((kind==='video'?['video/mp4','video/webm']:['image/jpeg','image/png','image/webp']).includes(file.type))||file.size>(kind==='video'?50:3)*1024*1024){updateStatus('Use fotos JPG, PNG ou WebP de até 3 MB ou vídeos MP4/WebM de até 50 MB.',true);return;}
   pending++;input.disabled=true;refreshButtons();
   try{const url=await signedUpload(file,n=>updateStatus(`Enviando arquivo… ${n}%`));set(path,url);
    if(path==='hero.video'){set('hero.mobileVideo','');set('hero.animation','');try{const poster=await capturePoster(file);set('hero.poster',await signedUpload(poster,()=>{}));}catch{updateStatus('Vídeo enviado. Selecione uma imagem de capa antes de publicar.');}}
    if(path==='hero.mobileVideo')set('hero.animation','');
    updateStatus('Arquivo enviado. Publique as alterações para exibi-lo no site.');
   }catch(error){updateStatus(error.message,true);}finally{pending--;render();}
  });
  container.querySelector('form').onsubmit=event=>event.preventDefault();if(noticeError)container.querySelector('[data-cms-status]').className='error';refreshButtons();
 }
 async function load(target){container=target;container.innerHTML='<div class="panel" role="status">Carregando editor do site…</div>';try{const result=await request('site-content');state=result;dirty=false;notice='';noticeError=false;render();}catch(error){if(!document.querySelector('[data-tab="site"]')?.classList.contains('active'))return;container.innerHTML=`<div class="panel"><p class="error" role="alert">${esc(error.message)}</p><button class="btn secondary" type="button" data-retry-cms>Tentar novamente</button></div>`;}}
 document.querySelector('#content').addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-retry-cms'))return load(document.querySelector('#content'));
  if(!state||!document.querySelector('[data-tab="site"]')?.classList.contains('active'))return;
  if(button.dataset.cmsSection){active=button.dataset.cmsSection;render();return;}
  if(button.hasAttribute('data-open-room-content')){document.querySelector('[data-tab="showcases"]').click();return;}
  if(pending||saving)return;
  if(button.hasAttribute('data-order-index')){const keys=String(state.content.layout.order).split(/\s+/).filter(Boolean),i=Number(button.dataset.orderIndex),j=i+Number(button.dataset.direction);if(j>=0&&j<keys.length){[keys[i],keys[j]]=[keys[j],keys[i]];set('layout.order',keys.join('\n'));render();}return;}
  if(button.dataset.mediaClear){set(button.dataset.mediaClear,'');render();return;}
  if(button.dataset.listAdd){const path=button.dataset.listAdd,field=fieldFor(path),list=get(path);if(list.length<field.max){list.push(newItem(field.fields));dirty=true;render();}return;}
  if(button.dataset.listRemove){const path=button.dataset.listRemove,list=get(path),field=fieldFor(path);if(list.length>field.min&&confirm('Remover este item? A mudança só aparecerá no site ao publicar.')){list.splice(Number(button.dataset.index),1);dirty=true;render();}return;}
  if(button.dataset.listMove){const list=get(button.dataset.listMove),i=Number(button.dataset.index),j=i+Number(button.dataset.direction);if(j>=0&&j<list.length){[list[i],list[j]]=[list[j],list[i]];dirty=true;render();}return;}
  const action=button.dataset.cmsAction;
  if(action==='reload'){if(!dirty||confirm('Descartar as alterações não publicadas?'))load(container);return;}
  if(!action)return;
  saving=true;refreshButtons();
  try{
   if(action==='save'){updateStatus('Publicando alterações…');const saved=await request('site-content',{content:state.content,revision:state.revision},'PUT');state.content=saved.content;state.revision=saved.revision;dirty=false;render();updateStatus('Publicado! As alterações aparecem ao abrir ou atualizar o site.');}
   if(action==='preview'){updateStatus('Preparando prévia…');const result=await request('site-preview',{content:state.content,page:active==='catalog'?'quartos':active==='beaches'?'itacare':'index'});preview.querySelector('iframe').srcdoc=result.html.replace('<head>','<head><base href="'+location.origin+'/">');preview.showModal();updateStatus(dirty?'Prévia pronta. As alterações ainda não foram publicadas.':'Prévia da versão publicada.');}
   if(action==='history'){const data=await request('site-history');if(!data.versions.length){updateStatus('O histórico aparecerá após a primeira publicação.');return;}const choices=data.versions.map(v=>`${v.revision} — ${new Date(v.published_at).toLocaleString('pt-BR')}`).join('\n');const target=prompt('Qual versão deseja restaurar? Digite o número.\n'+choices);if(target&&data.versions.some(v=>v.revision===Number(target))&&confirm('Publicar esta versão anterior? A versão atual será guardada no histórico.')){const saved=await request('site-restore',{target:Number(target),revision:state.revision});state.content=saved.content;state.revision=saved.revision;dirty=false;render();updateStatus('Versão anterior restaurada e publicada.');}}
  }catch(error){updateStatus(error.message,true);}finally{saving=false;refreshButtons();}
 });
 window.addEventListener('beforeunload',event=>{if(dirty||pending){event.preventDefault();event.returnValue='';}});
 window.siteEditor={render(target){container=target;if(state)render();else load(target);}};
})();
