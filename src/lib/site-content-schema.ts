import defaults from './site-content-defaults.json';
import {supabaseUrl} from './supabase-config';
export type Field = {key:string; label:string; type:'text'|'textarea'|'image'|'video'|'url'|'number'|'boolean'|'select'|'list'; max?:number; min?:number; step?:number; required?:boolean; options?:string[]; fields?:Field[]; hint?:string};
export type SiteContent = Record<string, Record<string, unknown>>;
const f=(key:string,label:string,type:Field['type']='text',extra:Partial<Field>={}):Field=>({key,label,type,...extra});
const visible=f('visible','Exibir esta seção','boolean');
const photoFields=[f('url','Imagem','image',{required:true}),f('alt','Descrição da imagem','text',{max:180,required:true})];
const title=f('title','Título','text',{max:180,required:true});
const description=f('description','Descrição','textarea',{max:6000});
export const siteSections:{key:string;label:string;hint:string;fields:Field[]}[]=[
 {key:'branding',label:'Identidade e contatos',hint:'Logo, endereço e links de contato usados no site e na página de quartos.',fields:[title,description,f('logo','Logo da pousada','image',{required:true}),f('whatsapp','WhatsApp com país e DDD (somente números)','text',{required:true,max:15}),f('address','Endereço','textarea',{max:500}),f('instagram','Instagram','url'),f('facebook','Facebook','url'),f('maps','Link “Como chegar” no Google Maps','url',{required:true}),f('mapEmbed','Link de incorporação do Google Maps','url',{required:true})]},
 {key:'hero',label:'Cabeçalho e vídeo',hint:'Envie MP4 (H.264) de até 50 MB. Ao trocar o vídeo principal, ele também será usado no celular. A imagem de capa aparece durante o carregamento.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('video','Vídeo principal','video',{required:true}),f('mobileVideo','Vídeo para celular (opcional)','video'),f('poster','Imagem de capa do vídeo','image',{required:true}),f('animation','Alternativa animada (WebP, opcional)','image',{hint:'Use uma animação do mesmo vídeo para celulares que bloqueiam a reprodução. A troca do vídeo limpa a animação antiga.'}),f('speed','Velocidade de reprodução','number',{min:.25,max:1.5,step:.05}),f('limit','Trecho inicial do vídeo em segundos (0 = vídeo inteiro)','number',{min:0,max:120,step:.1}),f('location','Local em destaque'),f('region','Cidade e estado'),f('button','Texto do convite para conhecer a pousada')]},
 {key:'about',label:'Sobre a pousada',hint:'Altere a foto, os textos e a lista de comodidades.',fields:[visible,title,description,f('image','Foto da pousada','image',{required:true}),f('alt','Descrição da foto','text',{max:180}),f('featuresTitle','Título das comodidades'),f('features','Comodidades (uma por linha)','textarea',{max:3000})]},
 {key:'gallery',label:'Carrossel da pousada',hint:'Adicione, remova e ordene as fotos. A primeira foto é a inicial.',fields:[visible,title,f('mobileDelay','Intervalo no celular (segundos)','number',{min:2,max:30,step:.5}),f('desktopDelay','Intervalo no computador (segundos)','number',{min:2,max:30,step:.5}),f('photos','Fotos','list',{min:1,max:30,fields:photoFields})]},
 {key:'rooms',label:'Apresentação dos quartos',hint:'Os textos desta seção ficam aqui. As fotos e descrições de cada acomodação continuam na aba “Conteúdo dos quartos”.',fields:[visible,title,description,f('ratesLabel','Botão de tarifas'),f('moreLabel','Botão para ver mais quartos')]},
 {key:'leisure',label:'Área de Lazer',hint:'Edite as experiências que mostram uma foto ao passar o mouse e os detalhes ao clicar.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('hint','Instrução abaixo das opções'),f('items','Experiências','list',{min:1,max:8,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('heading','Título dos detalhes'),description,f('image','Foto','image',{required:true}),f('alt','Descrição da foto')]})]},
 {key:'beaches',label:'Praias e passeios',hint:'A página inicial mostra os destinos em destaque. O botão Ver mais abre o guia completo, com todas as fotos e os passeios. Edite os roteiros e as informações de temporada aqui.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('moreLabel','Botão para abrir o guia'),f('cover','Capa do guia de Itacaré','image',{required:true}),f('pageTitle','Título do guia completo'),f('pageDescription','Introdução do guia','textarea',{max:3000}),f('toursTitle','Título dos passeios'),f('toursDescription','Introdução dos passeios','textarea',{max:3000}),f('items','Praias e cachoeiras','list',{min:1,max:20,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('subtitle','Subtítulo (opcional)','text',{max:250}),f('category','Categoria','select',{options:['praia','cachoeira']}),f('featured','Destacar na página inicial','boolean'),description,f('highlights','Tópicos (um por linha)','textarea',{max:1500}),f('photos','Fotos do destino','list',{min:1,max:12,fields:photoFields})]}),f('tours','Passeios','list',{min:0,max:12,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('subtitle','Subtítulo (opcional)','text',{max:250}),description,f('highlights','Tópicos (um por linha)','textarea',{max:1500}),f('season','Época ou temporada (opcional)'),f('kind','Tipo de passeio','select',{options:['trilha','baleias']}),f('photos','Fotos do passeio (opcional)','list',{min:0,max:12,fields:photoFields})]})]},
 {key:'reviews',label:'Avaliações em destaque',hint:'Transcreva apenas avaliações reais, preservando a autoria e a fonte.',fields:[visible,title,description,f('moreLabel','Botão para mais avaliações'),f('items','Avaliações','list',{min:1,max:12,fields:[f('name','Nome do hóspede','text',{required:true}),f('rating','Estrelas','number',{min:1,max:5,step:1}),description,f('source','Fonte da avaliação')]})]},
 {key:'contact',label:'Seção de contato',hint:'O endereço, as redes sociais e o mapa são definidos em “Identidade e contatos”.',fields:[visible,title,f('addressTitle','Título do endereço'),f('socialTitle','Título das redes sociais')]},
 {key:'catalog',label:'Página de quartos e reservas',hint:'Personalize a capa e os títulos da página de quartos. Tarifas, pacotes e políticas têm suas próprias abas.',fields:[f('cover','Foto da capa','image',{required:true}),title,f('eyebrow','Texto acima de “Escolha seu quarto”'),f('heading','Título da lista de quartos'),f('packagesTitle','Título dos pacotes'),f('packagesEyebrow','Subtítulo dos pacotes'),f('locationTitle','Título da localização'),f('locationEyebrow','Subtítulo da localização'),f('policiesTitle','Título das políticas'),f('policiesEyebrow','Subtítulo das políticas')]},
 {key:'layout',label:'Ordem e blocos extras',hint:'Reorganize as seções e crie blocos adicionais de texto, imagem e botão.',fields:[f('order','Ordem das seções (uma chave por linha)','textarea',{hint:'Use cada chave uma vez: about, gallery, rooms, leisure, beaches, reviews, contact.',required:true,max:200}),f('blocks','Blocos extras','list',{min:0,max:12,fields:[f('id','Identificador','text',{required:true,max:50}),visible,title,description,f('image','Foto (opcional)','image'),f('alt','Descrição da foto'),f('button','Texto do botão (opcional)'),f('url','Destino do botão','url'),f('after','Exibir após','select',{options:['about','gallery','rooms','leisure','beaches','reviews','contact']}),f('tone','Fundo','select',{options:['claro','areia']}),f('position','Posição da imagem','select',{options:['esquerda','direita']})]})]}
];
export const siteDefaults=defaults as SiteContent;
export function safeMedia(value:string,kind:'image'|'video'):boolean {
 if(!value)return true;
 if(value.includes('..')||/[<>"'\\\u0000-\u001f]/.test(value))return false;
 const ext=kind==='video'?'mp4|webm':'jpg|jpeg|png|webp';
 if(new RegExp(`^/(?:img[^/]*|images|media)/[^?#]+\\.(?:${ext})$`,'i').test(value))return true;
 try{const u=new URL(value);return u.origin===new URL(supabaseUrl).origin&&!u.username&&!u.password&&!u.search&&!u.hash&&new RegExp(`^/storage/v1/object/public/(?:lotus-site|lotus-showcase)/[0-9a-f-]{36}\\.(?:${ext})$`,'i').test(u.pathname);}catch{return false;}
}
export function safeLink(value:string):boolean {if(!value)return true;if(/^\/(?!\/)[^<>"'\\\s]*$/.test(value)||/^#[a-zA-Z0-9-]+$/.test(value))return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function upgradeExploreContent(input:SiteContent):SiteContent {
 const old=input.beaches;if(!old||typeof old!=='object'||Array.isArray(old))return input;
 const base=siteDefaults.beaches,section={...old};
 for(const key of ['eyebrow','description','moreLabel','cover','pageTitle','pageDescription','toursTitle','toursDescription','tours'])if(!Object.hasOwn(section,key))section[key]=structuredClone(base[key]);
 if(Array.isArray(old.items))section.items=old.items.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return item;
  const existing=item as Record<string,unknown>,fallback=(base.items as Record<string,unknown>[]).find(x=>x.id===existing.id),next={...existing};
  for(const key of ['description','highlights','category','featured','subtitle'])if(!Object.hasOwn(next,key))next[key]=fallback?.[key]??(key==='featured'?false:key==='category'?'praia':'');
  return next;
 });
 if(Array.isArray(section.tours))section.tours=section.tours.map(item=>item&&typeof item==='object'&&!Array.isArray(item)&&!Object.hasOwn(item,'subtitle')?{...item,subtitle:''}:item);
 return {...input,beaches:section};
}
export function validateSiteContent(input:unknown):SiteContent {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Conteúdo inválido.');
 input=upgradeExploreContent(input as SiteContent);
 const parse=(fields:Field[],obj:unknown,label:string):Record<string,unknown>=>{
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error(`Confira ${label}.`);
  const src=obj as Record<string,unknown>,out:Record<string,unknown>={};
  for(const field of fields){const value=src[field.key],name=`${label}: ${field.label}`;
   if(field.type==='boolean'){if(typeof value!=='boolean')throw Error(`Confira ${name}.`);out[field.key]=value;}
   else if(field.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<(field.min??0)||value>(field.max??100000)||(field.step===1&&!Number.isInteger(value)))throw Error(`Confira ${name}.`);out[field.key]=value;}
   else if(field.type==='list'){if(!Array.isArray(value)||value.length<(field.min??0)||value.length>(field.max??30))throw Error(`Confira a quantidade em ${name}.`);out[field.key]=value.map((v,i)=>parse(field.fields!,v,`${name} ${i+1}`));}
   else {if(typeof value!=='string'||value.length>(field.max??1000)||(field.required&&!value.trim()))throw Error(`Confira ${name}.`);const v=value.trim();if((field.type==='image'||field.type==='video')&&!safeMedia(v,field.type))throw Error(`Envie um arquivo pelo painel em ${name}.`);if(field.type==='url'&&!safeLink(v))throw Error(`Use um endereço https válido em ${name}.`);if(field.type==='select'&&!field.options!.includes(v))throw Error(`Confira ${name}.`);out[field.key]=v;}
  }return out;
 };
 const result:SiteContent={};for(const section of siteSections)result[section.key]=parse(section.fields,(input as SiteContent)[section.key],section.label);
 if(!/^\d{10,15}$/.test(String(result.branding.whatsapp)))throw Error('Informe o WhatsApp com país e DDD, somente números.');
 for(const key of ['maps','mapEmbed']){const u=new URL(String(result.branding[key]));if(u.protocol!=='https:'||!['www.google.com','maps.google.com','maps.app.goo.gl'].includes(u.hostname)||(key==='mapEmbed'&&!u.pathname.startsWith('/maps/embed')))throw Error('Use os links do Google Maps para localização e incorporação.');}
 const order=String(result.layout.order).split(/\s+/).filter(Boolean),expected=['about','gallery','rooms','leisure','beaches','reviews','contact'];
 if(order.length!==expected.length||new Set(order).size!==expected.length||!expected.every(k=>order.includes(k)))throw Error('A ordem precisa conter cada uma das sete chaves de seção, uma vez.');
 for(const items of [result.leisure.items,result.beaches.items,result.beaches.tours,result.layout.blocks]){const ids=(items as Record<string,unknown>[]).map(i=>String(i.id));if(ids.some(id=>!/^[-\p{Ll}0-9]{1,50}$/u.test(id))||new Set(ids).size!==ids.length)throw Error('Use identificadores únicos com letras minúsculas, números e hífen.');}
 return result;
}
