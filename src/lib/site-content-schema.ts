import defaults from './site-content-defaults.json';
import {supabaseUrl} from './supabase-config';
export type Field = {hidden?:boolean; key:string; label:string; type:'text'|'textarea'|'image'|'video'|'url'|'number'|'boolean'|'select'|'list'|'date'; max?:number; min?:number; step?:number; required?:boolean; options?:string[]; fields?:Field[]; hint?:string};
export type SiteContent = Record<string, Record<string, unknown>>;
const f=(key:string,label:string,type:Field['type']='text',extra:Partial<Field>={}):Field=>({key,label,type,...extra});
const visible=f('visible','Exibir esta seção','boolean');
const photoFields=[f('url','Imagem','image',{required:true}),f('alt','Descrição da imagem','text',{max:180,required:true})];
const title=f('title','Título','text',{max:180,required:true});
const description=f('description','Descrição','textarea',{max:6000});
export const siteSections:{key:string;label:string;hint:string;fields:Field[]}[]=[
 {key:'branding',label:'Identidade e contatos',hint:'Logo, endereço e links de contato usados no site e na página de quartos.',fields:[title,description,f('logo','Logo da pousada','image',{required:true}),f('whatsapp','WhatsApp com país e DDD (somente números)','text',{required:true,max:15}),f('address','Endereço','textarea',{max:500}),f('instagram','Instagram','url'),f('facebook','Facebook','url'),f('maps','Link “Como chegar” no Google Maps','url',{required:true}),f('mapEmbed','Link de incorporação do Google Maps','url',{required:true})]},
 {key:'operations',label:'Configuração e pendências',hint:'Dados públicos e conferências manuais. Não insira senhas, tokens ou chaves de API. As integrações externas precisam ser ativadas nos respectivos serviços.',fields:[f('contactEmail','E-mail para contato e privacidade (opcional)','text',{max:254}),f('legalName','Nome empresarial / responsável pela pousada (opcional)','text',{max:180}),f('privacyExtra','Informações adicionais de privacidade','textarea',{max:6000}),f('bookingEngineUrl','Link oficial do motor de reservas Silbeck (referência para configuração)','url',{hint:'Salvar este link não sincroniza calendários nem altera o caminho de reserva do site.'}),f('silbeckChecked','Conferi a integração ou estabeleci a atualização manual das reservas externas','boolean'),f('bookingFlowChecked','Concluí e conferi uma solicitação real com Google, no site e no painel','boolean'),f('backupsChecked','Conferi a disponibilidade de backups e o procedimento de restauração','boolean')]},
 {key:'hero',label:'Cabeçalho e vídeo',hint:'Envie MP4 (H.264) de até 50 MB. Ao trocar o vídeo principal, ele também será usado no celular. A imagem de capa aparece durante o carregamento.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('video','Vídeo principal','video',{required:true}),f('mobileVideo','Vídeo para celular (opcional)','video'),f('poster','Imagem de capa do vídeo','image',{required:true}),f('animation','Alternativa animada (WebP, opcional)','image',{hint:'Use uma animação do mesmo vídeo para celulares que bloqueiam a reprodução. A troca do vídeo limpa a animação antiga.'}),f('speed','Velocidade de reprodução','number',{min:.25,max:1.5,step:.05}),f('limit','Trecho inicial do vídeo em segundos (0 = vídeo inteiro)','number',{min:0,max:120,step:.1}),f('location','Local em destaque'),f('region','Cidade e estado'),f('button','Texto do convite para conhecer a pousada')]},
 {key:'about',label:'Sobre a pousada',hint:'Edite as duas fotos, os textos, os botões e as comodidades. Use uma linha em branco para separar parágrafos; os ícones acompanham o texto das comodidades.',fields:[visible,title,f('eyebrow','Texto acima do título','text',{max:100}),f('lead','Frase de destaque (opcional)','text',{max:200}),description,f('image','Foto principal da pousada','image',{required:true}),f('alt','Descrição da foto principal','text',{max:180}),f('secondaryImage','Foto sobreposta (opcional)','image'),f('secondaryAlt','Descrição da foto sobreposta','text',{max:180}),f('caption','Legenda da foto sobreposta (opcional)','text',{max:150}),f('buttonLabel','Botão para os quartos','text',{required:true,max:80}),f('locationLabel','Link de localização','text',{required:true,max:80}),f('featuresTitle','Título das comodidades'),f('features','Comodidades (uma por linha)','textarea',{max:3000})]},
 {key:'gallery',label:'Carrossel da pousada',hint:'Adicione, remova e ordene as fotos. A primeira foto é a inicial.',fields:[visible,title,f('mobileDelay','Intervalo no celular (segundos)','number',{min:2,max:30,step:.5}),f('desktopDelay','Intervalo no computador (segundos)','number',{min:2,max:30,step:.5}),f('photos','Fotos','list',{min:1,max:30,fields:photoFields})]},
 {key:'rooms',label:'Apresentação dos quartos',hint:'Os textos desta seção ficam aqui. As fotos e descrições de cada acomodação continuam na aba “Conteúdo dos quartos”.',fields:[visible,title,description,f('moreLabel','Texto do botão de tarifas')]},
 {key:'fishing',label:'Pescadores e grupos de pesca',hint:'Cadastre somente fotos reais dos grupos de pescadores e do freezer da pousada. A primeira foto é a principal. A seção fica oculta até haver fotos e a exibição ser ativada. O WhatsApp vem de Identidade e contatos; Organizar meu grupo leva à página de excursões existente.',fields:[visible,title,f('eyebrow','Subtítulo','text',{max:120}),description,f('highlight','Destaque do freezer','text',{required:true,max:180}),f('notice','Observação sobre disponibilidade e condições de uso','textarea',{required:true,max:600}),f('buttonLabel','Texto do botão do WhatsApp','text',{required:true,max:80}),f('groupLabel','Texto do link para grupos','text',{required:true,max:80}),f('whatsappMessage','Mensagem da consulta pelo WhatsApp','textarea',{required:true,max:1000}),f('photos','Fotos reais dos pescadores e do freezer','list',{min:0,max:8,fields:photoFields})]},
 {key:'romance',label:'Decoração romântica',hint:'Use somente fotos reais da decoração oferecida pela pousada. A primeira foto é a principal nas duas páginas. A apresentação só aparece quando houver fotos e a exibição estiver ativada. Edite também os textos da página de quartos e da consulta pelo WhatsApp.',fields:[visible,title,f('eyebrow','Texto acima do título','text',{max:100}),description,f('buttonLabel','Botão na página inicial','text',{required:true,max:80}),f('pageTitle','Título na página de quartos','text',{required:true,max:180}),f('pageDescription','Descrição na página de quartos','textarea',{max:3000}),f('notice','Observação sobre consulta de valores e disponibilidade','textarea',{required:true,max:600}),f('whatsappLabel','Texto do botão do WhatsApp','text',{required:true,max:80}),f('whatsappMessage','Mensagem da consulta pelo WhatsApp','textarea',{required:true,max:1000}),f('photos','Fotos reais da decoração','list',{min:0,max:12,fields:photoFields})]},
 {key:'leisure',label:'Área de Lazer',hint:'Edite as experiências que mostram uma foto ao passar o mouse e os detalhes ao clicar.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('hint','Instrução abaixo das opções'),f('items','Experiências','list',{min:1,max:8,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('heading','Título dos detalhes'),description,f('image','Foto','image',{required:true}),f('alt','Descrição da foto')]})]},
 {key:'instagram',label:'Instagram da pousada',hint:'Envie as fotos publicadas no Instagram e escolha a ordem. A faixa usa o mesmo estilo do carrossel da pousada. O link do perfil fica em Identidade e contatos. As fotos são cadastradas aqui, sem sincronização automática.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('buttonLabel','Texto do link para o Instagram'),f('mobileDelay','Intervalo no celular (segundos)','number',{min:2,max:30,step:.5}),f('desktopDelay','Intervalo no computador (segundos)','number',{min:2,max:30,step:.5}),f('photos','Fotos do Instagram','list',{min:0,max:30,fields:photoFields})]},
 {key:'beaches',label:'Praias e passeios',hint:'A página inicial mostra os destinos em destaque. O botão Ver mais abre o guia completo, com todas as fotos e os passeios. Edite os roteiros e as informações de temporada aqui.',fields:[visible,title,f('eyebrow','Texto acima do título'),description,f('moreLabel','Botão para abrir o guia'),f('cover','Capa do guia de Itacaré','image',{required:true}),f('pageTitle','Título do guia completo'),f('pageDescription','Introdução do guia','textarea',{max:3000}),f('toursTitle','Título dos passeios'),f('toursDescription','Introdução dos passeios','textarea',{max:3000}),f('items','Praias e cachoeiras','list',{min:1,max:20,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('subtitle','Subtítulo (opcional)','text',{max:250}),f('category','Categoria','select',{options:['praia','cachoeira']}),f('featured','Destacar na página inicial','boolean'),description,f('highlights','Tópicos (um por linha)','textarea',{max:1500}),f('photos','Fotos do destino','list',{min:1,max:12,fields:photoFields})]}),f('tours','Passeios','list',{min:0,max:12,fields:[f('id','Identificador','text',{max:50,required:true}),title,f('subtitle','Subtítulo (opcional)','text',{max:250}),description,f('highlights','Tópicos (um por linha)','textarea',{max:1500}),f('season','Época ou temporada (opcional)'),f('kind','Tipo de passeio','select',{options:['trilha','baleias']}),f('photos','Fotos do passeio (opcional)','list',{min:0,max:12,fields:photoFields})]})]},
 {key:'reviews',label:'Avaliações',hint:'Preserve os relatos reais e a autoria. As três avaliações publicadas marcadas como destaque aparecem primeiro na página inicial. As notas das plataformas são informadas manualmente, com escala, fonte e data próprias; não são calculadas a partir dos depoimentos.',fields:[f('schemaVersion','Versão do conteúdo','number',{min:1,max:1,step:1}),visible,title,description,f('moreLabel','Botão para mais avaliações'),f('eyebrow','Texto acima do título'),f('pageTitle','Título da página completa'),f('pageDescription','Introdução da página completa','textarea',{max:3000}),f('platforms','Notas das plataformas','list',{min:0,max:6,fields:[f('id','Identificador','text',{required:true,max:50}),f('label','Nome da plataforma','text',{required:true,max:80}),f('score','Nota geral da plataforma','text',{required:true,max:5,hint:'Informe a nota exibida no perfil da pousada, sem calcular uma média dos depoimentos cadastrados.'}),f('scale','Escala da nota (5 ou 10)','number',{min:5,max:10,step:5}),f('count','Quantidade de avaliações (0 = não informado)','number',{min:0,max:1000000,step:1}),f('updated','Data em que a nota foi conferida (opcional)','date',{max:10}),f('url','Link do perfil da pousada na plataforma (opcional)','url')]}),f('items','Depoimentos','list',{min:0,max:60,fields:[f('id','Identificador','text',{required:true,max:50}),f('name','Nome do hóspede','text',{required:true,max:120}),f('description','Texto da avaliação','textarea',{required:true,max:6000}),f('source','Plataforma de origem','text',{required:true,max:80}),f('sourceUrl','Link da avaliação original (opcional)','url'),f('date','Data original da avaliação (opcional)','date',{max:10}),f('score','Nota individual (opcional)','text',{max:5,hint:'Deixe em branco quando a avaliação original não informar uma nota.'}),f('scale','Escala da nota (5 ou 10)','number',{min:5,max:10,step:5}),f('featured','Destacar na página inicial','boolean'),f('published','Exibir esta avaliação','boolean')]})]},
 {key:'contact',label:'Seção de contato',hint:'O contato pede apenas nome e telefone; a mensagem é opcional. O endereço, as redes sociais, o mapa e o WhatsApp são definidos em “Identidade e contatos”.',fields:[visible,title,f('eyebrow','Texto acima do título','text',{max:100}),f('description','Subtítulo','textarea',{max:500}),f('formTitle','Título do formulário','text',{max:120}),f('intro','Introdução do formulário','textarea',{max:500}),f('buttonLabel','Texto do botão do WhatsApp','text',{max:80,required:true}),f('defaultMessage','Mensagem pronta quando o visitante não escrever nada','textarea',{max:500,required:true}),f('addressTitle','Título do endereço'),f('socialTitle','Título das redes sociais')]},
 {key:'catalog',label:'Página de quartos e reservas',hint:'Personalize a capa e os títulos da página de quartos. Tarifas, pacotes e políticas têm suas próprias abas.',fields:[f('cover','Foto da capa','image',{required:true}),title,f('eyebrow','Texto acima de “Escolha seu quarto”'),f('heading','Título da lista de quartos'),f('packagesTitle','Título dos pacotes'),f('packagesEyebrow','Subtítulo dos pacotes'),f('locationTitle','Título da localização'),f('locationEyebrow','Subtítulo da localização'),f('policiesTitle','Título das políticas'),f('policiesEyebrow','Subtítulo das políticas')]},
 {key:'layout',label:'Ordem e blocos extras',hint:'Reorganize as seções e crie blocos adicionais de texto, imagem e botão.',fields:[f('order','Ordem das seções (uma chave por linha)','textarea',{hint:'Use cada chave uma vez: about, gallery, rooms, fishing, leisure, romance, instagram, beaches, reviews, contact.',required:true,max:200}),f('blocks','Blocos extras','list',{min:0,max:12,fields:[f('id','Identificador','text',{required:true,max:50}),visible,title,description,f('image','Foto (opcional)','image'),f('alt','Descrição da foto'),f('button','Texto do botão (opcional)'),f('url','Destino do botão','url'),f('after','Exibir após','select',{options:['about','gallery','rooms','fishing','leisure','romance','instagram','beaches','reviews','contact']}),f('tone','Fundo','select',{options:['claro','areia']}),f('position','Posição da imagem','select',{options:['esquerda','direita']})]})]}
];
// Keep an optimized source beside each crop so future edits are reversible.
const withPhotoSources=(fields:Field[]):Field[]=>fields.flatMap(field=>{
 const next=field.fields?{...field,fields:withPhotoSources(field.fields)}:field;
 return field.type==='image'?[next,f(field.key+'Source','Foto de origem','image',{hidden:true})]:[next];
});
for(const section of siteSections)section.fields=withPhotoSources(section.fields);
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
export function upgradeReviewContent(input:SiteContent):SiteContent {
 const old=input.reviews;if(!old||typeof old!=='object'||Array.isArray(old)||Object.hasOwn(old,'schemaVersion'))return input;
 const base=siteDefaults.reviews,section={...old};
 for(const key of ['schemaVersion','eyebrow','pageTitle','pageDescription','platforms'])section[key]=Object.hasOwn(old,key)?old[key]:structuredClone(base[key]);
 if(Array.isArray(old.items)){
  const normalize=(s:unknown)=>String(s??'').replace(/\s+/g,' ').trim();
  const imported=old.items.map((item,index)=>{
   if(!item||typeof item!=='object'||Array.isArray(item))return item;
   const previous=item as Record<string,unknown>,match=(base.items as Record<string,unknown>[]).find(r=>normalize(r.name)===normalize(previous.name)&&normalize(r.description)===normalize(previous.description));
   return {...previous,id:previous.id??match?.id??`old-home-${index+1}`,sourceUrl:previous.sourceUrl??'',date:previous.date??'',score:previous.score??'',scale:previous.scale??(/booking/i.test(String(previous.source))?10:5),featured:previous.featured??index<3,published:previous.published??true};
  });
  const originals=(base.items as Record<string,unknown>[]).filter(r=>String(r.id).startsWith('legacy-')&&!imported.some(i=>i&&normalize(i.name)===normalize(r.name)&&normalize(i.description)===normalize(r.description)));
  section.items=[...imported,...structuredClone(originals)];
 }
 return {...input,reviews:section};
}
export function validateSiteContent(input:unknown):SiteContent {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Conteúdo inválido.');
 input=upgradeReviewContent(upgradeExploreContent(input as SiteContent));
 if((input as SiteContent).contact&&typeof (input as SiteContent).contact==='object'&&!Array.isArray((input as SiteContent).contact)){const contact={...(input as SiteContent).contact};for(const key of ['eyebrow','description','formTitle','intro','buttonLabel','defaultMessage'])if(!Object.hasOwn(contact,key))contact[key]=structuredClone(siteDefaults.contact[key]);if(contact.intro==='Deixe seu nome e telefone. A gente continua a conversa pelo WhatsApp.')contact.intro=siteDefaults.contact.intro;input={...(input as SiteContent),contact};}
 if((input as SiteContent).about&&typeof (input as SiteContent).about==='object'&&!Array.isArray((input as SiteContent).about)){const about={...(input as SiteContent).about};for(const key of ['eyebrow','lead','secondaryImage','secondaryAlt','caption','buttonLabel','locationLabel'])if(!Object.hasOwn(about,key))about[key]=structuredClone(siteDefaults.about[key]);input={...(input as SiteContent),about};}
 if(!Object.hasOwn(input as object,'instagram'))input={...(input as SiteContent),instagram:structuredClone(siteDefaults.instagram)};
 const oldLayout=(input as SiteContent).layout;
 if(oldLayout&&typeof oldLayout.order==='string'&&!oldLayout.order.split(/\s+/).includes('instagram')){
  const order=oldLayout.order.split(/\s+/).filter(Boolean),index=order.indexOf('leisure');
  if(index>=0){order.splice(index+1,0,'instagram');input={...(input as SiteContent),layout:{...oldLayout,order:order.join('\n')}};}
 }
 if(!Object.hasOwn(input as object,'romance'))input={...(input as SiteContent),romance:structuredClone(siteDefaults.romance)};
 const romanceLayout=(input as SiteContent).layout;
 if(romanceLayout&&typeof romanceLayout.order==='string'&&!romanceLayout.order.split(/\s+/).includes('romance')){
  const order=romanceLayout.order.split(/\s+/).filter(Boolean),index=order.indexOf('rooms');
  if(index>=0){order.splice(index+1,0,'romance');input={...(input as SiteContent),layout:{...romanceLayout,order:order.join('\n')}};}
 }
 if(!Object.hasOwn(input as object,'fishing'))input={...(input as SiteContent),fishing:structuredClone(siteDefaults.fishing)};
 const fishingLayout=(input as SiteContent).layout;
 if(fishingLayout&&typeof fishingLayout.order==='string'&&!fishingLayout.order.split(/\s+/).includes('fishing')){
  const order=fishingLayout.order.split(/\s+/).filter(Boolean),index=order.indexOf('rooms');
  if(index>=0){order.splice(index+1,0,'fishing');input={...(input as SiteContent),layout:{...fishingLayout,order:order.join('\n')}};}
 }
 if(!Object.hasOwn(input as object,'operations'))input={...(input as SiteContent),operations:structuredClone(siteDefaults.operations)};
 const parse=(fields:Field[],obj:unknown,label:string):Record<string,unknown>=>{
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error(`Confira ${label}.`);
  const src=obj as Record<string,unknown>,out:Record<string,unknown>={};
  for(const field of fields){const value=field.hidden&&!Object.hasOwn(src,field.key)?'':src[field.key],name=`${label}: ${field.label}`;
   if(field.type==='boolean'){if(typeof value!=='boolean')throw Error(`Confira ${name}.`);out[field.key]=value;}
   else if(field.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<(field.min??0)||value>(field.max??100000)||(field.step===1&&!Number.isInteger(value)))throw Error(`Confira ${name}.`);out[field.key]=value;}
   else if(field.type==='list'){if(!Array.isArray(value)||value.length<(field.min??0)||value.length>(field.max??30))throw Error(`Confira a quantidade em ${name}.`);out[field.key]=value.map((v,i)=>parse(field.fields!,v,`${name} ${i+1}`));}
   else {if(typeof value!=='string'||value.length>(field.max??1000)||(field.required&&!value.trim()))throw Error(`Confira ${name}.`);const v=value.trim();if((field.type==='image'||field.type==='video')&&!safeMedia(v,field.type))throw Error(`Envie um arquivo pelo painel em ${name}.`);if(field.type==='url'&&!safeLink(v))throw Error(`Use um endereço https válido em ${name}.`);if(field.type==='date'&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))throw Error(`Confira a data em ${name}.`);if(field.type==='select'&&!field.options!.includes(v))throw Error(`Confira ${name}.`);out[field.key]=v;}
  }return out;
 };
 const result:SiteContent={};for(const section of siteSections)result[section.key]=parse(section.fields,(input as SiteContent)[section.key],section.label);
 if(result.operations.contactEmail&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(result.operations.contactEmail)))throw Error('Informe um e-mail de contato válido.');
 if(!/^\d{10,15}$/.test(String(result.branding.whatsapp)))throw Error('Informe o WhatsApp com país e DDD, somente números.');
 for(const key of ['maps','mapEmbed']){const u=new URL(String(result.branding[key]));if(u.protocol!=='https:'||!['www.google.com','maps.google.com','maps.app.goo.gl'].includes(u.hostname)||(key==='mapEmbed'&&!u.pathname.startsWith('/maps/embed')))throw Error('Use os links do Google Maps para localização e incorporação.');}
 const order=String(result.layout.order).split(/\s+/).filter(Boolean),expected=['about','gallery','rooms','fishing','leisure','romance','instagram','beaches','reviews','contact'];
 if(order.length!==expected.length||new Set(order).size!==expected.length||!expected.every(k=>order.includes(k)))throw Error('A ordem precisa conter cada uma das dez chaves de seção, uma vez.');
 for(const items of [result.leisure.items,result.beaches.items,result.beaches.tours,result.reviews.items,result.reviews.platforms,result.layout.blocks]){const ids=(items as Record<string,unknown>[]).map(i=>String(i.id));if(ids.some(id=>!/^[-\p{Ll}0-9]{1,50}$/u.test(id))||new Set(ids).size!==ids.length)throw Error('Use identificadores únicos com letras minúsculas, números e hífen.');}
 for(const row of [...result.reviews.items as Record<string,unknown>[],...result.reviews.platforms as Record<string,unknown>[]]){
  if(![5,10].includes(Number(row.scale)))throw Error('Use escala 5 ou 10 nas avaliações.');
  if(String(row.score).trim()){
   const value=String(row.score).replace(',','.');
   if(!/^\d{1,2}(\.\d{1,2})?$/.test(value)||Number(value)>Number(row.scale))throw Error('A nota precisa estar entre 0 e a escala da plataforma.');
   row.score=value;
  }
  for(const key of ['url','sourceUrl'])if(row[key]&&!String(row[key]).startsWith('https://'))throw Error('Use um link https para conferir a avaliação na plataforma.');
 }
 return result;
}
