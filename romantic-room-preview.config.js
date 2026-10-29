'use strict';
// Local assets only. Update this object when an approved stock/official photo is available.
window.romanticRoomPreviewConfig={
 id:'demo-romantic-room',type:'pending-user-image',aspectRatio:'16 / 9',
 notice:'Ilustração esquemática de referência. Não representa o quarto reservado.',
 image:null,fallback:'/images/romantic/room-layout-placeholder.svg',
 alt:'Prévia esquemática de um quarto, usada para posicionar os elementos decorativos.',
 stockCandidate:{source:'https://unsplash.com/photos/white-bed-linen-on-bed-5BV56SdvLmo',author:'Point3D Commercial Imaging Ltd.',license:'Unsplash License',licenseUrl:'https://unsplash.com/license',status:'superseded-by-user-provided-reference'},
 userReference:{image:'/images/romantic/user-room-reference.jpg',type:'demo',aspectRatio:'1920 / 764',source:'Imagem ilustrativa enviada pelo usuário na conversa; arquivo original recebido em ZIP e preservado sem recompressão.',layers:{champagne:{x:.783,y:.57,width:.032,rotation:0,scaleY:1},wine:{x:.843,y:.57,width:.032,rotation:0,scaleY:1},chocolates:{x:.41,y:.61,width:.105,rotation:-7,scaleY:.6},balloons:{x:.71,y:.30,width:.09,rotation:0,scaleY:1},petals:{x:.51,y:.64,width:.37,rotation:-6,scaleY:.5},flowers:{x:.80,y:.56,width:.065,rotation:0,scaleY:1},photos:{x:.66,y:.59,width:.08,rotation:-8,scaleY:.65},card:{x:.55,y:.62,width:.115,rotation:4,scaleY:.6}}},
 layers:{
  champagne:{asset:'/images/romantic/champagne.svg',assetWidth:240,assetHeight:550,names:['Espumante'],x:.783,y:.57,width:.032,rotation:0,zIndex:23},
  wine:{asset:'/images/romantic/wine.svg',assetWidth:240,assetHeight:550,names:['Vinho'],x:.843,y:.57,width:.032,rotation:0,zIndex:24},
  chocolates:{asset:'/images/romantic/chocolates.svg',assetWidth:400,assetHeight:240,names:['Bombons Ferrero Rocher','Bombons','Chocolates'],x:.41,y:.61,width:.105,rotation:-7,zIndex:25},
  balloons:{asset:'/images/romantic/balloons.svg',assetWidth:300,assetHeight:650,names:['Balões românticos'],x:.71,y:.30,width:.09,rotation:0,zIndex:5},
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
