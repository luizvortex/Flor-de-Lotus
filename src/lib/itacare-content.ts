import type { CheerioAPI } from 'cheerio';
import type { SiteContent } from './site-content-schema';
type Item=Record<string,unknown>;
type Photo={url:string;alt:string};
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Use Next's built-in local image optimizer for small cards; full albums retain originals.
const image=(url:unknown,width=1080)=>String(url).startsWith('/')?`/_next/image?url=${encodeURIComponent(String(url))}&w=${width}&q=75`:String(url);
const arrow='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const topics=(text:unknown)=>String(text??'').split('\n').filter(Boolean).slice(0,12).map(t=>`<li>${esc(t)}</li>`).join('');
const whale=`<div class="explore-whale-art" role="img" aria-label="Ilustração de uma cauda de baleia sobre o mar"><span>UM ENCONTRO COM O OCEANO</span><svg viewBox="0 0 360 250" fill="none" aria-hidden="true"><circle cx="180" cy="116" r="84" stroke="currentColor" stroke-width=".7" opacity=".3"/><path d="M180 178c-3-31-19-51-47-65-26-13-44-35-52-65 33 3 68 17 99 46 31-29 66-43 99-46-8 30-26 52-52 65-28 14-44 34-47 65Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M35 194c29-14 58-14 87 0s58 14 87 0 58-14 116 0M35 213c29-14 58-14 87 0s58 14 87 0 58-14 116 0" stroke="currentColor" stroke-width="1"/></svg><small>ITACARÉ · BAHIA</small></div>`;
function galleryButton(item:Item,photos:Photo[],className='explore-photo-button'):string {
 return `<div class="explore-photo-stage"><button type="button" class="${className}" data-explore-photos="${esc(JSON.stringify(photos))}" data-explore-title="${esc(item.title)}" data-explore-start="0" aria-label="Ver ${photos.length} fotos de ${esc(item.title)}"><img src="${esc(image(photos[0].url))}" alt="${esc(photos[0].alt)}" width="1080" height="810" loading="lazy" decoding="async"><span class="explore-photo-count">Ver ${photos.length} foto${photos.length===1?'':'s'}</span></button>${photos.length>1?`<span class="explore-card-counter" role="status" aria-live="polite">1 / ${photos.length}</span><button type="button" class="explore-card-next" data-explore-card-next aria-label="Próxima foto de ${esc(item.title)}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`:''}</div>`;
}
export function renderExplorePreview(content:SiteContent):string {
 const b=content.beaches,items=b.items as Item[],picks=[...items.filter(i=>i.featured),...items.filter(i=>!i.featured)].slice(0,3);
 return `<div class="discovery-inner"><div class="discovery-heading"><div><p class="explore-eyebrow">${esc(b.eyebrow)}</p><h2 id="topo-praias">${esc(b.title)}</h2></div><p>${esc(b.description)}</p></div><div class="discovery-cards">${picks.map((item,index)=>{const photo=(item.photos as Photo[])[0];return `<a class="discovery-card" href="/itacare#destino-${esc(item.id)}" target="_blank" rel="noopener"><div class="discovery-card-image"><img src="${esc(image(photo.url))}" alt="${esc(photo.alt)}" width="1080" height="810" loading="lazy" decoding="async"><span class="discovery-number">0${index+1}</span></div><div class="discovery-card-heading"><div><p>${item.category==='cachoeira'?'ÁGUA DOCE E NATUREZA':'ENTRE O MAR E A MATA'}</p><h3>${esc(item.title)}</h3></div>${arrow}</div></a>`;}).join('')}</div><div class="discovery-footer"><p>Praias, cachoeiras e passeios para viver Itacaré no seu ritmo.</p><a class="discovery-more" href="/itacare" target="_blank" rel="noopener">${esc(b.moreLabel)} ${arrow}<span class="visually-hidden"> (abre em nova aba)</span></a></div></div>`;
}
export function applyExplorePage($:CheerioAPI,content:SiteContent):void {
 const b=content.beaches;
 $('#explore-cover').attr('src',image(b.cover,1920));$('#explore-title').text(String(b.pageTitle));$('#explore-intro').text(String(b.pageDescription));
 $('meta[name="description"]').attr('content',String(b.pageDescription));
 $('#explore-tours-title').text(String(b.toursTitle));$('#explore-tours-intro').text(String(b.toursDescription));
 const contact=(title:string)=>`https://wa.me/${content.branding.whatsapp}?text=${encodeURIComponent(`Olá! Vou visitar Itacaré e gostaria de saber mais sobre ${title}. Podem me ajudar a planejar?`)}`;
 $('#explore-contact').attr('href',contact('os passeios e as praias da região'));
 const items=b.items as Item[];
 $('#explore-destinations').html(items.map(item=>{
  const photos=item.photos as Photo[];
  return `<article class="explore-destination" id="destino-${esc(item.id)}" data-explore-category="${esc(item.category)}" data-explore-search="${esc(`${item.title} ${item.description} ${item.highlights}`)}">${galleryButton(item,photos)}<div class="explore-destination-copy"><p class="explore-eyebrow">${item.category==='cachoeira'?'CACHOEIRA':'PRAIA'}</p><h3>${esc(item.title)}</h3><p class="explore-description">${esc(item.description)}</p><ul class="explore-topics">${topics(item.highlights)}</ul>${photos.length>1?`<div class="explore-small-photos" aria-label="Mais fotos de ${esc(item.title)}">${photos.slice(1,4).map((p,n)=>`<button type="button" data-explore-photos="${esc(JSON.stringify(photos))}" data-explore-title="${esc(item.title)}" data-explore-start="${n+1}" aria-label="Ampliar ${esc(p.alt)}"><img src="${esc(image(p.url,256))}" alt="${esc(p.alt)}" width="256" height="180" loading="lazy" decoding="async"></button>`).join('')}</div>`:''}</div></article>`;
 }).join(''));
 $('[data-explore-result]').text(`${items.length} lugares para descobrir`);
 const tours=b.tours as Item[];
 if(!tours.length){$('#passeios,.explore-shortcuts a[href="#passeios"]').attr('hidden','');}
 $('#explore-tour-list').html(tours.map((tour,index)=>{
  const photos=tour.photos as Photo[];
  return `<article class="explore-tour${index%2?' explore-tour-reverse':''}" id="passeio-${esc(tour.id)}"><div class="explore-tour-media">${photos.length?galleryButton(tour,photos):tour.kind==='baleias'?whale:'<div class="explore-whale-art"><span>TRILHAS, MAR E NOVAS PAISAGENS</span><span aria-hidden="true">↗</span><small>DESCUBRA ITACARÉ</small></div>'}</div><div class="explore-tour-copy"><p class="explore-eyebrow">EXPERIÊNCIA ${String(index+1).padStart(2,'0')}${tour.season?` <span class="explore-season">${esc(tour.season)}</span>`:''}</p><h3>${esc(tour.title)}</h3><p class="explore-description">${esc(tour.description)}</p><ul class="explore-tour-topics">${topics(tour.highlights)}</ul><a class="explore-tour-contact" href="${esc(contact(String(tour.title)))}" target="_blank" rel="noopener">Quero saber mais ${arrow}</a></div></article>`;
 }).join(''));
}
