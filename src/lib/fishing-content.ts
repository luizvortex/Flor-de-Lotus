import type {SiteContent} from './site-content-schema';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const arrow='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const freezer='<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="3" width="20" height="25" rx="2"/><path d="M6 14h20M10 8v2m0 9v4M10 28v2m12-2v2M19 6v5m-2-3 4 2m-4 0 4-2"/></svg>';
export function renderFishing(content:SiteContent):string {
 const f=content.fishing,photos=f.photos as {url:string;alt:string}[];
 // No stock photos or borrowed imagery: only the owner's dedicated photo list.
 if(f.visible!==true||!photos.length)return '';
 const whatsapp=`https://wa.me/${content.branding.whatsapp}?text=${encodeURIComponent(String(f.whatsappMessage))}`;
 return `<section id="pescadores" class="fishing-section" aria-labelledby="fishing-title"><div class="fishing-inner"><div class="fishing-copy"><p class="fishing-eyebrow">02 / GRUPOS DE PESCA</p><h2 id="fishing-title">${esc(f.title)}</h2><p class="fishing-description">${esc(f.description)}</p><div class="fishing-highlight">${freezer}<p>${esc(f.highlight)}</p></div><p class="fishing-notice">${esc(f.notice)}</p><div class="fishing-actions"><a class="fishing-cta" href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer">${esc(f.buttonLabel)}${arrow}<span class="fishing-sr">(abre em nova aba)</span></a><a class="fishing-group-link" href="/grupos">${esc(f.groupLabel)}${arrow}</a></div></div><div class="fishing-gallery${photos.length===1?' fishing-single':''}" role="group" aria-label="Fotos dos pescadores e do freezer da pousada">${photos.map(p=>`<figure><img src="${esc(p.url)}" alt="${esc(p.alt)}" width="1200" height="900" loading="lazy">${photos.indexOf(p)===0?'<figcaption><strong>PESCA ESPORTIVA</strong><span>Conforto após a aventura</span></figcaption>':''}</figure>`).join('')}</div></div></section>`;
}
