import { load } from 'cheerio';
import {applyReviewsPage,renderReviewsPreview} from './review-content';
import {applyExplorePage,renderExplorePreview} from './itacare-content';
import { siteDefaults, validateSiteContent, type SiteContent } from './site-content-schema';
import { supabaseUrl, supabaseKey } from './supabase-config';
import {unstable_cache,revalidateTag} from 'next/cache';
import {applySiteSeo} from './site-seo';
import {applyInformation} from './site-information';
import {applyAbout} from './about-content';
export async function getSiteDocument():Promise<{content:SiteContent;revision:number}> {
 const response=await fetch(`${supabaseUrl}/rest/v1/rpc/lotus_site_api`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(4000),headers:{apikey:supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({p_operation:'read',p_data:{}})});
 if(!response.ok)throw Error('Não foi possível carregar o conteúdo do site.');
 const data=await response.json();return{content:validateSiteContent(data.content??siteDefaults),revision:Number(data.revision)};
}
let lastPublished:SiteContent|undefined;
const publishedContent=unstable_cache(async()=>{
 const content=(await getSiteDocument()).content;lastPublished=content;return content;
},['lotus-published-content-v2',supabaseUrl],{revalidate:60,tags:['lotus-content']});
export function rememberPublishedContent(content:SiteContent){lastPublished=content;revalidateTag('lotus-content',{expire:0});}
export async function getSiteContent():Promise<SiteContent>{
 try{const content=validateSiteContent(await publishedContent());lastPublished=content;return content;}
 catch{console.error('[lotus] Falha ao carregar conteúdo editorial; usando última versão disponível.');return lastPublished??siteDefaults;}
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Item=Record<string,unknown>;
export function renderSiteContent(html:string,content:SiteContent,page:string):string {
 const $=load(html),c=content;
 $('head').append('<link rel="stylesheet" href="/site-content.css">');
 const text=(selector:string,value:unknown)=>{$(selector).text(String(value??''));};
 const img=(selector:string,url:unknown,alt?:unknown)=>{$(selector).attr('src',String(url));if(alt!==undefined)$(selector).attr('alt',String(alt));};
 const link=(selector:string,url:unknown)=>{$(selector).attr('href',String(url));};
 const b=c.branding;
 $('link[rel="icon"],link[rel="shortcut icon"]').remove();
 $('head').append($('<link>').attr({rel:'icon',href:String(b.logo)}));
 $('title').text(page==='index'?String(b.title):`${$('title').text().split('|')[0].trim()} | ${b.title}`);
 if(!$('meta[name="description"]').length)$('head').append('<meta name="description">');
 $('meta[name="description"]').attr('content',String(b.description));
 applySiteSeo($,c,page);applyInformation($,c,page);
 $('img').each((_,el)=>{if(/flordelotuslogo\.png/.test($(el).attr('src')??''))$(el).attr('src',String(b.logo));});
 $('a[href*="wa.me/"]').attr('href',`https://wa.me/${b.whatsapp}`);
 $('body').attr('data-contact-whatsapp',String(b.whatsapp));
 for(const network of ['instagram','facebook']){const a=$(`a[href*="${network}.com"]`);if(b[network])a.attr('href',String(b[network]));else a.closest('li').attr('hidden','');}
 $('.home-menu-address').text(String(b.address)).attr('style','white-space:pre-line');
 $('.catalog-location iframe,#fale-conosco iframe').attr('src',String(b.mapEmbed));
 link('.catalog-location .gold-button',b.maps);
 $('.catalog-location .location-copy > p:not(.eyebrow),.info-localizacao p:first-child,footer > p').text(String(b.address)).attr('style','white-space:pre-line');
 const k=c.catalog;
 img('#catalog-cover',k.cover);$('#catalog-cover').attr('data-cms-cover','true');text('.catalog-hero h1',k.title);text('.catalog-title h2',k.heading);text('.catalog-title .eyebrow',k.eyebrow);
 text('#special-packages h2',k.packagesTitle);text('#special-packages > .eyebrow',k.packagesEyebrow);text('#location-title',k.locationTitle);text('.location-copy .eyebrow',k.locationEyebrow);text('#policies-title',k.policiesTitle);text('#politicas > .eyebrow',k.policiesEyebrow);
 if(page==='avaliacoes')applyReviewsPage($,c);
 if(page==='itacare')applyExplorePage($,c);
 if(page!=='index')return $.html();
 $('head').append('<link rel="stylesheet" href="/itacare.css">');
 const hero=c.hero;
 text('.home-hero-copy h1',hero.title);text('.home-hero-eyebrow',hero.eyebrow);text('.home-hero-tagline',hero.description);
 img('.home-hero-poster',hero.poster);const video=$('.home-hero-video');video.attr('poster',String(hero.poster)).attr('data-speed',String(hero.speed)).attr('data-limit',String(hero.limit)).attr('data-animation',String(hero.animation));
 video.find('source').remove();if(hero.mobileVideo)video.append(`<source src="${esc(hero.mobileVideo)}" media="(max-width: 767px)" type="${String(hero.mobileVideo).endsWith('.webm')?'video/webm':'video/mp4'}">`);
 video.append(`<source src="${esc(hero.video)}" type="${String(hero.video).endsWith('.webm')?'video/webm':'video/mp4'}">`);
 $('.hero-location').html(`${esc(hero.location)}<br><span>${esc(hero.region)}</span>`);$('.hero-discover').html(`${esc(hero.button)}<span aria-hidden="true">↓</span>`);
 applyAbout($,c);
 const gallery=c.gallery;const photos=gallery.photos as Item[];text('#galeria-pousada-title',gallery.title);
 $('.pousada-gallery').toggleClass('is-single',photos.length===1).attr('data-mobile-delay',String(gallery.mobileDelay)).attr('data-desktop-delay',String(gallery.desktopDelay));
 $('.pousada-gallery-track').html(photos.map((p,i)=>`<figure class="pousada-gallery-slide" role="group" aria-roledescription="slide" aria-label="Foto ${i+1} de ${photos.length}"><img src="${esc(p.url)}" alt="${esc(p.alt)}" width="800" height="600" loading="lazy"></figure>`).join(''));
 if(photos.length===1)$('.pousada-gallery-arrow').attr('hidden','');
 text('.showcase-heading h2',c.rooms.title);text('.showcase-heading p',c.rooms.description);text('.showcase-copy .showcase-rates',c.rooms.ratesLabel);text('.showcase-more .showcase-rates',c.rooms.moreLabel);
 const leisure=c.leisure;text('#leisure-title',leisure.title);text('.leisure-heading .leisure-eyebrow',leisure.eyebrow);text('.leisure-heading > p:last-child',leisure.description);text('.leisure-hint',leisure.hint);
 const close='<button type="button" data-leisure-close aria-label="Fechar detalhes"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>';
 $('.leisure-choices').html((leisure.items as Item[]).map(i=>`<button type="button" class="leisure-choice" data-leisure="${esc(i.id)}" aria-expanded="false" aria-controls="leisure-panel-${esc(i.id)}"><img class="leisure-preview" src="${esc(i.image)}" alt="${esc(i.alt)}" width="600" height="650" loading="lazy"><span class="leisure-name">${esc(i.title)}</span><span class="leisure-indicator" aria-hidden="true">+</span></button>`).join(''));
 $('.leisure-panels').html((leisure.items as Item[]).map(i=>`<div id="leisure-panel-${esc(i.id)}" class="leisure-panel" role="region" aria-label="Sobre ${esc(i.title)}" aria-hidden="true" inert><div class="leisure-panel-clip"><div class="leisure-panel-content"><div><p class="leisure-eyebrow">${esc(i.title)}</p><h3>${esc(i.heading)}</h3></div><p class="cms-paragraph">${esc(i.description)}</p>${close}</div></div></div>`).join(''));
 $('#praias').removeClass('pt-5 pb-5').addClass('discovery-preview').attr('aria-labelledby','topo-praias').html(renderExplorePreview(c));
 $('head').append('<link rel="stylesheet" href="/reviews.css">');
 $('#avaliacoes').removeClass('pt-5 pb-5').addClass('guest-reviews').html(renderReviewsPreview(c));
 text('#contact-title',c.contact.title);text('.contact-eyebrow',c.contact.eyebrow);text('[data-contact-description]',c.contact.description);text('[data-contact-form-title]',c.contact.formTitle);text('[data-contact-intro]',c.contact.intro);text('[data-contact-button]',c.contact.buttonLabel);
 text('[data-contact-address-title]',c.contact.addressTitle);text('[data-contact-social-title]',c.contact.socialTitle);text('.contact-address',b.address);
 $('#whatsapp-form').attr('data-default-message',String(c.contact.defaultMessage)).attr('action',`https://wa.me/${b.whatsapp}`);link('[data-contact-maps]',b.maps);
 const ids:Record<string,string>={hero:'inicio',about:'sobre-a-pousada',gallery:'galeria-pousada',rooms:'quartos',leisure:'area-de-lazer',beaches:'praias',reviews:'avaliacoes',contact:'fale-conosco'};
 for(const [key,id] of Object.entries(ids)){if(c[key].visible===false){$('#'+id).attr('hidden','').attr('data-cms-hidden','true');$(`.home-header a[href="#${id}"],.home-menu a[href="#${id}"]`).attr('hidden','');}}
 const sections=new Map(Object.entries(ids).filter(([key])=>key!=='hero').map(([key,id])=>[key,$('#'+id).remove()]));
 let anchor=$('#inicio') as ReturnType<typeof $>;
 for(const key of String(c.layout.order).split(/\s+/).filter(Boolean)){
  const node=sections.get(key);if(!node)continue;anchor.after(node);anchor=node;
  for(const block of (c.layout.blocks as Item[]).filter(b=>b.after===key&&b.visible)){
   const newBlock=$(`<section id="extra-${esc(block.id)}" class="cms-block cms-tone-${esc(block.tone)} cms-image-${esc(block.position)}"><div class="cms-block-inner">${block.image?`<img src="${esc(block.image)}" alt="${esc(block.alt)}" loading="lazy" width="900" height="650">`:''}<div><h2>${esc(block.title)}</h2><p class="cms-paragraph">${esc(block.description)}</p>${block.button&&block.url?`<a class="showcase-rates" href="${esc(block.url)}">${esc(block.button)}</a>`:''}</div></div></section>`);anchor.after(newBlock);anchor=newBlock;
  }
 }
 return $.html();
}
