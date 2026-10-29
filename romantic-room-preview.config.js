'use strict';
// Local assets only. Update this object when an approved stock/official photo is available.
window.romanticRoomPreviewConfig={
 id:'demo-romantic-room',type:'pending-user-image',aspectRatio:'16 / 9',
 notice:'Ilustração esquemática de referência. Não representa o quarto reservado.',
 image:null,fallback:'/images/romantic/room-layout-placeholder.svg',
 alt:'Prévia esquemática de um quarto, usada para posicionar os elementos decorativos.',
 stockCandidate:{source:'https://unsplash.com/photos/white-bed-linen-on-bed-5BV56SdvLmo',author:'Point3D Commercial Imaging Ltd.',license:'Unsplash License',licenseUrl:'https://unsplash.com/license',status:'superseded-by-user-provided-reference'},
 userReference:{image:'/images/romantic/user-room-reference.jpg',type:'demo',aspectRatio:'1920 / 764',source:'Imagem ilustrativa enviada pelo usuário na conversa; arquivo original recebido em ZIP e preservado sem recompressão.',layers:{petals:{x:.51,y:.64,width:.37,rotation:-6,scaleY:.5},flowers:{x:.80,y:.56,width:.065,rotation:0,scaleY:1},photos:{x:.66,y:.59,width:.08,rotation:-8,scaleY:.65},card:{x:.55,y:.62,width:.115,rotation:4,scaleY:.6}}},
 layers:{
  petals:{asset:'/images/romantic/petals.svg',names:['Decoração com pétalas','Pétalas de rosas'],x:.50,y:.72,width:.57,rotation:0,zIndex:10},
  flowers:{asset:'/images/romantic/flowers.svg',names:['Arranjo de flores'],x:.85,y:.43,width:.11,rotation:0,zIndex:20},
  photos:{asset:null,names:['Fotografias do casal','Porta-retrato personalizado'],x:.60,y:.66,width:.105,rotation:-8,zIndex:30},
  card:{asset:null,names:['Cartão personalizado'],x:.73,y:.78,width:.17,rotation:8,zIndex:40}
 }
};
// Active, user-supplied illustrative reference. Layer placement is calibrated for this photo.
window.romanticRoomPreviewConfig.activeProfile='userReference';
if(window.romanticRoomPreviewConfig.activeProfile==='userReference'){
 const config=window.romanticRoomPreviewConfig,profile=config.userReference;
 config.image=profile.image;config.type=profile.type;config.aspectRatio=profile.aspectRatio;config.alt='Imagem ilustrativa de quarto com cama clara e vista para o mar.';config.notice='Imagem fornecida como referência ilustrativa; não representa um quarto confirmado.';
 Object.entries(profile.layers).forEach(([key,placement])=>Object.assign(config.layers[key],placement));
}
