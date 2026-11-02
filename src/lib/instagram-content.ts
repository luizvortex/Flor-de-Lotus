import type {SiteContent} from './site-content-schema';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const icon='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>';
export function renderInstagram(content:SiteContent):string {
 const data=content.instagram,url=String(content.branding.instagram||'');
 const cover={url:data.backgroundImage};
 const visual=[{url:data.firstImage},{url:data.secondImage}];
 return `<section id="instagram" class="instagram-section" aria-labelledby="instagram-title"><div class="instagram-feature">${cover?`<img class="instagram-background" src="${esc(cover.url)}" alt="" width="1600" height="1000" loading="lazy">`:''}<div class="instagram-heading"><p class="instagram-eyebrow">${esc(data.eyebrow)}</p><h2 id="instagram-title">${esc(data.title)}</h2><p>${esc(data.description)}</p>${url?`<a class="instagram-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon}${esc(data.buttonLabel)}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg><span class="visually-hidden"> (abre em nova aba)</span></a>`:''}</div>${visual.length?`<div class="instagram-artwork" aria-hidden="true">${visual.map(photo=>`<div class="instagram-photo"><img src="${esc(photo.url)}" alt="" width="600" height="750" loading="lazy"></div>`).join('')}<span class="instagram-artwork-icon">${icon}</span></div>`:''}</div></section>`;
}
