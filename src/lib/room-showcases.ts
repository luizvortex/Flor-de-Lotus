import { showcaseDefaults, type Showcase } from './showcase-defaults';
import { supabaseKey, supabaseUrl } from './supabase-config';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function safeShowcasePhoto(url: string): boolean {
  return !url.includes('..') && (/^\/(img[^/]*|images)\/[^<>"\\]+\.(jpg|jpeg|png|webp)$/i.test(url) || /^https:\/\/asojfispuomhbfapqdmi\.supabase\.co\/storage\/v1\/object\/public\/lotus-showcase\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url));
}
export async function getShowcases(): Promise<Showcase[]> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/lotus_showcase_api`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(2500),
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_operation: 'read', p_data: {} }),
    });
    if (!response.ok) return showcaseDefaults;
    const result = await response.json() as { showcases?: Showcase[] };
    if (!Array.isArray(result.showcases) || result.showcases.length !== 3) return showcaseDefaults;
    if (!result.showcases.every(row => showcaseDefaults.some(d => d.slug === row.slug) && typeof row.title === 'string' && typeof row.description === 'string' && Array.isArray(row.photos) && row.photos.length >= 3 && row.photos.every(p => typeof p.url === 'string' && safeShowcasePhoto(p.url)) && Array.isArray(row.features) && row.features.every(f => /^[a-z0-9-]+$/.test(f.icon) && typeof f.label === 'string'))) return showcaseDefaults;
    return result.showcases;
  } catch { return showcaseDefaults; }
}
const arrow = (direction: 'left'|'right') => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${direction === 'left' ? 'm13 5-7 7 7 7M6 12h13' : 'm11 5 7 7-7 7M18 12H5'}"/></svg>`;
export function renderShowcases(rows: Showcase[]): string {
  return rows.map(row => `<article class="room-showcase" aria-labelledby="room-title-${escape(row.slug)}">
    <div class="room-showcase-gallery" data-title="${escape(row.title)}" data-room="${escape(JSON.stringify({ title: row.title, eyebrow: row.eyebrow, description: row.description, features: row.features, details: row.details || {} }))}" data-photos="${escape(JSON.stringify(row.photos))}">
      <div class="showcase-main">
        <button type="button" class="showcase-main-open" aria-label="Ampliar fotos de ${escape(row.title)}"><img class="showcase-main-image" src="${escape(row.photos[0].url)}" alt="${escape(row.photos[0].alt)}" loading="lazy" width="900" height="700"></button>
        <button type="button" class="showcase-view-photos"><i class="bi bi-images" aria-hidden="true"></i> Ver ${row.photos.length} fotos</button>
        <button type="button" class="showcase-arrow showcase-prev" aria-label="Foto anterior de ${escape(row.title)}">${arrow('left')}</button>
        <button type="button" class="showcase-arrow showcase-next" aria-label="Próxima foto de ${escape(row.title)}">${arrow('right')}</button>
      </div>
      <div class="showcase-thumbs">${row.photos.slice(1,3).map((photo,i) => `<button type="button" class="showcase-thumb" data-photo-index="${i+1}" aria-label="Destacar ${escape(photo.alt)}"><img src="${escape(photo.url)}" alt="${escape(photo.alt)}" loading="lazy" width="300" height="350"></button>`).join('')}</div>
      <span class="visually-hidden showcase-photo-status" aria-live="polite"></span>
    </div>
    <div class="showcase-copy">${row.eyebrow ? `<p class="showcase-eyebrow">${escape(row.eyebrow)}</p>` : ''}<h3 id="room-title-${escape(row.slug)}">${escape(row.title)}</h3>
      <p class="showcase-description">${escape(row.description)}</p>
      <ul class="showcase-features" aria-label="Comodidades">${row.features.map(feature => `<li><i class="bi bi-${escape(feature.icon)}" aria-hidden="true"></i><span>${escape(feature.label)}</span></li>`).join('')}</ul>
      <a class="showcase-rates" href="/reservas">Ver tarifas</a>
    </div>
  </article>`).join('\n');
}
