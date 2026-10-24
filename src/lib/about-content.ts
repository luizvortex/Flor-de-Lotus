import type {CheerioAPI} from 'cheerio';
import type {SiteContent} from './site-content-schema';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const paths={
 wifi:'<path d="M3 8.5a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r=".7" fill="currentColor" stroke="none"/>',
 coffee:'<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 10h2a3 3 0 0 1 0 6h-2M3 22h17M7 3v3M11 2v4M15 3v3"/>',
 parking:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
 balcony:'<path d="M5 21V3h14v18M9 3v11M15 3v11M3 21h18M2 14h20M5 14v7M10 14v7M15 14v7M19 14v7"/>',
 pool:'<path d="M2 17c2-3 4 3 7 0s4 3 7 0 4 3 6 0M2 21c2-3 4 3 7 0s4 3 7 0 4 3 6 0M7 13V5a2 2 0 0 1 4 0M15 13V5a2 2 0 0 1 4 0M7 7h8M7 11h8"/>',
 snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M21 14l-4 1 1 4M6 19l1-4-4-1M18 5l-1 4 4 1"/>',
 leaf:'<path d="M20 3c-9-1-16 3-16 10a7 7 0 0 0 14 0c0-4 0-7 2-10ZM3 22 15 9"/>',
};
function icon(label:string){
 const normalized=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const key=/wi.?fi|internet/.test(normalized)?'wifi':/cafe|buffet/.test(normalized)?'coffee':/estacion|parking/.test(normalized)?'parking':/varanda|quarto|rede/.test(normalized)?'balcony':/piscina|churrasqueira|lazer/.test(normalized)?'pool':/split|ar.condicionado/.test(normalized)?'snow':'leaf';
 return `<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]}</svg>`;
}
export function applyAbout($:CheerioAPI,content:SiteContent){
 const a=content.about,section=$('#sobre-a-pousada');if(!section.length)return;
 section.find('#about-title').text(String(a.title));section.find('[data-about-eyebrow]').text(String(a.eyebrow));
 section.find('[data-about-lead]').text(String(a.lead)).prop('hidden',!a.lead);
 section.find('.about-description').html(String(a.description).split(/\n\s*\n/).filter(v=>v.trim()).map(v=>`<p>${esc(v.trim())}</p>`).join(''));
 section.find('.foto-sobre-pousada').attr({src:String(a.image),alt:String(a.alt)});
 const inset=section.find('.about-photo-inset');inset.prop('hidden',!a.secondaryImage);inset.find('img').attr('alt',String(a.secondaryAlt||''));if(a.secondaryImage)inset.find('img').attr('src',String(a.secondaryImage));else inset.find('img').removeAttr('src');inset.find('figcaption').text(String(a.caption||'')).prop('hidden',!a.caption);
 section.find('#about-features-title').text(String(a.featuresTitle));
 section.find('.about-feature-list').html(String(a.features).split('\n').map(v=>v.trim()).filter(Boolean).map(label=>`<li>${icon(label)}<span>${esc(label)}</span></li>`).join(''));
 section.find('[data-about-rooms-label]').text(String(a.buttonLabel));
 section.find('[data-about-location-label]').text(String(a.locationLabel));
 section.find('.about-location-link').attr('href',String(content.branding.maps));
}
