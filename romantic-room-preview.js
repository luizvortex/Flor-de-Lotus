'use strict';
(()=>{
 const names={composition:'Sua composição',original:'Quarto original',petals:'Pétalas',flowers:'Arranjo de flores',photos:'Fotografias',card:'Cartão'};
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 let sequence=0;
 class RomanticRoomPreview{
  constructor(root,config){
   this.root=root;this.config=config;this.view='composition';this.compare=50;this.state={products:[],cart:[],photos:[],message:''};this.id='rrp-'+(++sequence);
   root.innerHTML='<div class="rrp-preview-head"><span>PRÉVIA DA SUA SURPRESA</span><button type="button" class="rrp-expand">Ampliar imagem ↗</button></div><div class="rrp-main-scene"></div><p class="rrp-view-status" role="status"></p><div class="rrp-gallery" role="group" aria-label="Visualizações da decoração"></div><blockquote class="rrp-message-preview" hidden></blockquote><p class="rrp-scope-note">A imagem acompanha os itens selecionados. Os detalhes da preparação final podem variar.</p><p class="rrp-caption">Imagem ilustrativa. A decoração final poderá variar.</p><p class="rrp-source-note"></p>';
   this.dialog=document.createElement('dialog');this.dialog.className='rrp-modal';this.dialog.setAttribute('aria-labelledby',this.id+'-title');this.dialog.innerHTML=`<header><h2 id="${this.id}-title">Sua composição</h2><button type="button" class="rrp-close" aria-label="Fechar prévia">×</button></header><div class="rrp-modal-scene"></div><blockquote class="rrp-message-preview" hidden></blockquote><p>Imagem ilustrativa. A decoração final poderá variar.</p>`;document.body.append(this.dialog);
   this.makeScene(root.querySelector('.rrp-main-scene'));this.makeScene(this.dialog.querySelector('.rrp-modal-scene'));
   const gallery=root.querySelector('.rrp-gallery');Object.entries(names).forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.dataset.rrpView=key;b.setAttribute('aria-pressed',String(key==='composition'));const icon=document.createElement('span');icon.className='rrp-thumb-scene';icon.style.aspectRatio=this.config.aspectRatio;icon.setAttribute('aria-hidden','true');const base=root.querySelector('.rrp-main-scene .rrp-base').cloneNode(true);base.alt='';base.onerror=()=>{if(base.getAttribute('src')!==this.config.fallback)base.src=this.config.fallback;};const miniLayers=root.querySelector('.rrp-main-scene .rrp-layers').cloneNode(true);miniLayers.querySelectorAll('[data-rrp-layer]').forEach(layer=>layer.dataset.rrpThumbView=key);icon.append(base,miniLayers);const text=document.createElement('span');text.textContent=label;b.append(icon,text);gallery.append(b);});
   root.querySelector('.rrp-expand').onclick=()=>{this.dialog.showModal();this.dialog.querySelector('.rrp-close').focus();};this.dialog.querySelector('.rrp-close').onclick=()=>this.dialog.close();
   root.addEventListener('click',event=>{const button=event.target.closest('[data-rrp-view]');if(button)this.setView(button.dataset.rrpView);});
   this.dialog.addEventListener('close',()=>root.querySelector('.rrp-expand').focus({preventScroll:true}));
   root.querySelector('.rrp-source-note').textContent=config.notice||(config.type.startsWith('pending')?'Imagem de referência indisponível. Exibindo ilustração esquemática.':'Imagem ilustrativa de referência; não representa um quarto confirmado.');
   this.update(this.state);
  }
  kind(product){if(product.photos_required>0)return 'photos';for(const [key,layer] of Object.entries(this.config.layers))if(layer.names.some(n=>normalize(n)===normalize(product.name)))return key;return null;}
  makeScene(parent){
   const stage=document.createElement('div');stage.className='rrp-stage';stage.style.aspectRatio=this.config.aspectRatio;
   const before=document.createElement('div');before.className='rrp-before';const after=document.createElement('div');after.className='rrp-after';
   [before,after].forEach(container=>{const image=document.createElement('img');image.className='rrp-base';image.src=this.config.image||this.config.fallback;image.alt=container===before?this.config.alt:'';image.width=1600;image.height=900;image.loading='lazy';image.onerror=()=>{if(image.getAttribute('src')!==this.config.fallback){image.src=this.config.fallback;this.root.querySelector('.rrp-source-note').textContent='Imagem de referência indisponível. Exibindo ilustração esquemática.';}};container.append(image);});
   const layers=document.createElement('div');layers.className='rrp-layers';after.append(layers);
   for(const [key,placement] of Object.entries(this.config.layers)){
    const layer=document.createElement('div');layer.className='rrp-layer rrp-layer-'+key;layer.dataset.rrpLayer=key;layer.style.left=placement.x*100+'%';layer.style.top=placement.y*100+'%';layer.style.width=placement.width*100+'%';layer.style.transform=`translate(-50%,-50%) rotate(${placement.rotation}deg) scaleY(${placement.scaleY||1})`;layer.style.zIndex=String(placement.zIndex);
    if(placement.asset){const img=document.createElement('img');img.src=placement.asset;img.alt='';img.width=placement.assetWidth||(key==='petals'?800:260);img.height=placement.assetHeight||(key==='petals'?300:370);layer.append(img);}
    else if(key==='photos'){const img=document.createElement('img');img.alt='Fotografia enviada para sua experiência';img.referrerPolicy='no-referrer';const text=document.createElement('span');text.textContent='Suas fotos';layer.append(img,text);}
    else{const text=document.createElement('span');text.className='rrp-card-message';layer.append(text);}
    layers.append(layer);
   }
   const divider=document.createElement('div');divider.className='rrp-divider';divider.setAttribute('aria-hidden','true');divider.innerHTML='<span>↔</span>';
   const labels=document.createElement('div');labels.className='rrp-scene-labels';labels.innerHTML='<span>Antes</span><span>Depois</span>';
   stage.append(before,after,divider,labels);parent.append(stage);
   const label=document.createElement('label');label.className='rrp-compare-label';label.textContent='Compare antes e depois';const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value='50';range.setAttribute('aria-label','Comparar quarto original e decoração');range.addEventListener('input',()=>this.setCompare(Number(range.value)));label.append(range);parent.append(label);
   divider.addEventListener('pointerdown',event=>{divider.setPointerCapture(event.pointerId);this.dragging=true;event.preventDefault();});divider.addEventListener('pointermove',event=>{if(!this.dragging)return;const box=stage.getBoundingClientRect();this.setCompare((event.clientX-box.left)/box.width*100);});['pointerup','pointercancel','lostpointercapture'].forEach(type=>divider.addEventListener(type,()=>{this.dragging=false;}));
  }
  setCompare(value){this.compare=Math.max(0,Math.min(100,Math.round(value)));[this.root,this.dialog].forEach(root=>{root.querySelectorAll('.rrp-stage').forEach(stage=>{stage.style.setProperty('--rrp-compare',this.compare+'%');stage.dataset.comparison=this.compare===0?'after':this.compare===100?'before':'split';});root.querySelectorAll('input[type=range]').forEach(range=>range.value=String(this.compare));});}
  setView(view){if(!Object.hasOwn(names,view))return;this.view=view;if(view!=='original'&&this.compare===100)this.setCompare(0);this.render();}
  update(state){
   const signature=cart=>JSON.stringify(cart.filter(([,quantity])=>quantity>0).slice().sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
   const changed=signature(state.cart)!==signature(this.state.cart);
   this.state=state;if(changed){this.view='composition';this.setCompare(0);}this.render();
  }
  render(){
   const selected=new Set();const quantities=new Map(this.state.cart);
   this.state.products.forEach(product=>{if(product.variants.some(v=>(quantities.get(v.id)||0)>0)){const kind=this.kind(product);if(kind)selected.add(kind);}});
   const demo=!['composition','original'].includes(this.view)&&!selected.has(this.view);
   this.root.querySelector('.rrp-view-status').textContent=demo?'Demonstração visual. Este elemento não foi incluído na sua solicitação.':this.view==='original'?'Quarto original, sem a simulação decorativa.':'Sua composição acompanha os itens selecionados.';
   this.root.querySelectorAll('[data-rrp-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rrpView===this.view)));
   [this.root,this.dialog].forEach(root=>root.querySelectorAll('[data-rrp-layer]').forEach(layer=>{
    const kind=layer.dataset.rrpLayer,mode=layer.dataset.rrpThumbView||this.view;const visible=mode==='composition'?selected.has(kind):mode===kind;layer.classList.toggle('is-visible',visible);layer.setAttribute('aria-hidden',String(!visible));
    if(kind==='champagne'||kind==='wine'){
     const product=this.state.products.find(p=>this.kind(p)===kind&&p.variants.some(v=>(quantities.get(v.id)||0)>0));
     const variant=normalize(product?.variants.find(v=>(quantities.get(v.id)||0)>0)?.name);
     const asset=kind==='champagne'?(variant?.includes('rose')?'champagne-rose':'champagne'):(variant?.includes('branco')?'wine-white':variant?.includes('rose')?'wine-rose':'wine');
     const image=layer.querySelector('img'),src='/images/romantic/'+asset+'.svg';if(image.getAttribute('src')!==src)image.src=src;
    }
    if(kind==='photos'){const img=layer.querySelector('img'),src=this.state.photos[0]?.url;img.hidden=!src;layer.querySelector('span').hidden=Boolean(src);if(src&&img.getAttribute('src')!==src)img.src=src;if(!src)img.removeAttribute('src');}
    if(kind==='card'){const text=layer.querySelector('span');text.textContent=this.state.message||'Uma mensagem especial';if(this.state.message)text.setAttribute('translate','no');else text.removeAttribute('translate');}
   }));
   [this.root,this.dialog].forEach(root=>{const message=root.querySelector('.rrp-message-preview');message.hidden=this.view!=='card'&&!selected.has('card');message.textContent=this.state.message||'Uma mensagem especial';if(this.state.message)message.setAttribute('translate','no');else message.removeAttribute('translate');});
   this.setCompare(this.compare);
  }
  clearPrivate(){this.update({...this.state,photos:[],message:''});}
 }
 window.RomanticRoomPreview=RomanticRoomPreview;
})();
