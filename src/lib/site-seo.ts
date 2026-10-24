import type { CheerioAPI } from 'cheerio';
import type { SiteContent } from './site-content-schema';
import {siteOrigin} from './site-url';

export function applySiteSeo($: CheerioAPI, content: SiteContent, page: string) {
 const origin=siteOrigin(),brand=String(content.branding.title);
 const pages:Record<string,[string,string,string]>={
  index:['',`${brand} | Pousada na Praia da Concha, Itacaré`,String(content.branding.description)],
  quartos:['/quartos',`Quartos e disponibilidade | ${brand}`,'Conheça nossas acomodações em Itacaré, escolha as datas e consulte os valores e a disponibilidade para sua estadia.'],
  reservas:['/quartos',`Quartos e disponibilidade | ${brand}`,'Conheça nossas acomodações em Itacaré, escolha as datas e consulte os valores e a disponibilidade para sua estadia.'],
  itacare:['/itacare',`${content.beaches.pageTitle} | ${brand}`,String(content.beaches.pageDescription)],
  avaliacoes:['/avaliacoes',`Avaliações dos hóspedes | ${brand}`,String(content.reviews.pageDescription)],
  pacotes:['/pacotes',`Pacotes e datas especiais | ${brand}`,'Conheça os pacotes de hospedagem da Flor de Lótus e consulte as condições para suas datas em Itacaré.'],
  'minha-conta':['/minha-conta',`Minha conta | ${brand}`,'Acompanhe suas solicitações, reservas e histórico de estadias.'],
  privacidade:['/privacidade',`Privacidade | ${brand}`,'Saiba como os dados da sua conta, contatos e solicitações de reserva são utilizados pela pousada.'],
  condicoes:['/condicoes',`Condições da estadia | ${brand}`,'Consulte as informações de check-in, check-out e as políticas confirmadas pela pousada.'],
 };
 const item=pages[page];if(!item)return;
 const [path,title,description]=item,url=origin+path;
 $('title').text(title);
 const meta=(name:string,value:string,property=false)=>{
  const key=property?'property':'name',selector=`meta[${key}="${name}"]`;
  if(!$(selector).length)$('head').append($('<meta>').attr(key,name));
  $(selector).attr('content',value.replace(/\s+/g,' ').trim());
 };
 meta('description',description);$('link[rel="canonical"]').remove();$('head').append($('<link>').attr({rel:'canonical',href:url}));
 const image=new URL(String(page==='itacare'?content.beaches.cover:page==='quartos'||page==='reservas'?content.catalog.cover:content.hero.poster),origin).href;
 for(const [name,value] of Object.entries({'og:type':'website','og:locale':'pt_BR','og:site_name':brand,'og:title':title,'og:description':description,'og:url':url,'og:image':image,'og:image:alt':`Conheça a ${brand}, em Itacaré`}))meta(name,value,true);
 meta('twitter:card','summary_large_image');meta('twitter:title',title);meta('twitter:description',description);meta('twitter:image',image);
 if(page==='minha-conta')meta('robots','noindex, nofollow');
 if(page==='index'){
  const data={'@context':'https://schema.org','@type':'LodgingBusiness','@id':origin+'/#pousada',name:brand,url:origin,image,description:String(content.branding.description),telephone:'+'+content.branding.whatsapp,address:{'@type':'PostalAddress',streetAddress:String(content.branding.address).split('\n')[0],addressLocality:'Itacaré',addressRegion:'BA',addressCountry:'BR'},hasMap:String(content.branding.maps),sameAs:[content.branding.instagram,content.branding.facebook].filter(Boolean)};
  $('head').append($('<script type="application/ld+json">').text(JSON.stringify(data).replace(/</g,'\\u003c')));
 }
}
