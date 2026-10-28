'use strict';
(() => {
 const dialog=document.createElement('dialog');dialog.className='cms-crop';
 dialog.innerHTML=`<form method="dialog"><div class="modal-head"><h2>Ajustar enquadramento</h2><button class="close" value="cancel" aria-label="Cancelar enquadramento">×</button></div><p>Arraste a foto para escolher a parte que aparece. Use + e − ou a barra de zoom para aproximar e afastar.</p><label>Formato <select data-crop-ratio><option value="1.3333333333333333">Horizontal · 4:3</option><option value="1.7777777777777777">Panorâmico · 16:9</option><option value="1">Quadrado · 1:1</option><option value="0.75">Vertical · 3:4</option></select></label><div class="cms-crop-frame" tabindex="0" role="group" aria-label="Enquadramento da foto. Arraste ou use as setas do teclado."><img alt="Prévia do recorte" draggable="false"></div><label for="cms-crop-zoom">Zoom <output data-crop-percent for="cms-crop-zoom">100%</output></label><div class="cms-crop-zoom-controls"><button type="button" class="btn secondary" data-crop-minus aria-label="Diminuir zoom">−</button><input id="cms-crop-zoom" data-crop-zoom type="range" min="1" max="3" step="0.01" value="1"><button type="button" class="btn secondary" data-crop-plus aria-label="Aumentar zoom">+</button></div><p class="hint">O zoom mínimo mantém o quadro preenchido, sem faixas nas bordas.</p><p class="hint">Apenas a área dentro do quadro será salva. A alteração aparece no site depois de publicar.</p><div class="cms-crop-actions"><button type="button" class="btn secondary" data-crop-reset>Centralizar</button><button class="btn secondary" value="cancel">Cancelar</button><button class="btn" value="save">Aplicar enquadramento</button></div></form>`;
 document.body.append(dialog);
 let busy=false;
 window.lotusCrop=async(source,path)=>{
  if(busy)return null;busy=true;
  let objectURL;
  try{
   const blob=source instanceof Blob?source:await(async()=>{const response=await fetch(source);if(!response.ok)throw Error('Não foi possível abrir a foto.');return response.blob();})();
   objectURL=URL.createObjectURL(blob);const img=dialog.querySelector('img');img.src=objectURL;await img.decode();
   const frame=dialog.querySelector('.cms-crop-frame'),zoom=dialog.querySelector('[data-crop-zoom]'),format=dialog.querySelector('[data-crop-ratio]');
   const gallery=/^(gallery|instagram|romance|fishing)\.photos\./.test(path);
   let ratio=gallery?4/3:/cover|poster/.test(path)?16/9:path==='about.image'?3/4:4/3;
   format.value=String(ratio);format.disabled=gallery;zoom.value='1';let x=.5,y=.5,drag=null,lastGeometry;
   function geometry(){const w=frame.clientWidth,h=w/ratio,s=Math.max(w/img.naturalWidth,h/img.naturalHeight)*Number(zoom.value);return {w,h,iw:img.naturalWidth*s,ih:img.naturalHeight*s};}
   function paint(){dialog.querySelector('[data-crop-percent]').value=Math.round(Number(zoom.value)*100)+'%';dialog.querySelector('[data-crop-minus]').disabled=Number(zoom.value)<=1;dialog.querySelector('[data-crop-plus]').disabled=Number(zoom.value)>=3;if(!frame.clientWidth)return;frame.style.aspectRatio=String(ratio);const g=geometry();lastGeometry=g;img.style.width=g.iw+'px';img.style.height=g.ih+'px';img.style.left=-(g.iw-g.w)*x+'px';img.style.top=-(g.ih-g.h)*y+'px';}
   function reset(){x=y=.5;zoom.value='1';paint();}
   function changeZoom(delta){zoom.value=String(Math.max(1,Math.min(3,Math.round((Number(zoom.value)+delta)*100)/100)));paint();}
   dialog.querySelector('[data-crop-minus]').onclick=()=>changeZoom(-.1);dialog.querySelector('[data-crop-plus]').onclick=()=>changeZoom(.1);
   zoom.oninput=paint;format.onchange=()=>{ratio=Number(format.value);reset();};dialog.querySelector('[data-crop-reset]').onclick=reset;
   frame.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();frame.focus();frame.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:x,oy:y};};
   frame.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const g=geometry();x=g.iw>g.w?Math.max(0,Math.min(1,drag.ox-(e.clientX-drag.x)/(g.iw-g.w))):.5;y=g.ih>g.h?Math.max(0,Math.min(1,drag.oy-(e.clientY-drag.y)/(g.ih-g.h))):.5;paint();};
   frame.onpointerup=frame.onpointercancel=()=>{drag=null;};
   frame.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();x=Math.max(0,Math.min(1,x+(e.key==='ArrowLeft'?.025:e.key==='ArrowRight'?-.025:0)));y=Math.max(0,Math.min(1,y+(e.key==='ArrowUp'?.025:e.key==='ArrowDown'?-.025:0)));paint();};
   dialog.returnValue='';dialog.showModal();paint();const observer=new ResizeObserver(paint);observer.observe(frame);
   await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));observer.disconnect();
   if(dialog.returnValue!=='save')return null;
   const g=lastGeometry,sw=img.naturalWidth*g.w/g.iw,sh=sw/ratio;
   const canvas=document.createElement('canvas');const scale=Math.min(1,(gallery?1600:1920)/Math.max(sw,sh));
   // Integer units keep the gallery exactly 4:3 at every resolution.
   if(gallery){const u=Math.max(1,Math.floor(Math.min(sw/4,sh/3,400)));canvas.width=u*4;canvas.height=u*3;}else{canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));}
   canvas.getContext('2d').drawImage(img,(img.naturalWidth-sw)*x,(img.naturalHeight-sh)*y,sw,sh,0,0,canvas.width,canvas.height);
   const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));if(!result)throw Error('Não foi possível preparar o recorte.');
   return new File([result],'foto-enquadrada.webp',{type:result.type});
  }catch(error){throw Error(error.message||'Não foi possível abrir a foto. Tente enviá-la novamente pelo dispositivo.');}
  finally{dialog.querySelector('img').removeAttribute('src');if(objectURL)URL.revokeObjectURL(objectURL);busy=false;}
 };
})();
