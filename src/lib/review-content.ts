import type { CheerioAPI } from 'cheerio';
import type { SiteContent } from './site-content-schema';

type Review=Record<string,unknown>;
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const external=(value:unknown):string=>{try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};
const arrow='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const displayScore=(value:unknown)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(Number(String(value).replace(',','.')));
const validScore=(value:unknown,scale:unknown)=>typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value.replace(',','.')))&&Number(value.replace(',','.'))>=0&&Number(value.replace(',','.'))<=Number(scale);
const date=(value:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value))?String(value).split('-').reverse().join('/'):'';
const sourceKey=(source:unknown)=>{const value=String(source??'').trim();return /booking/i.test(value)?'booking':/google/i.test(value)?'google':value.toLocaleLowerCase('pt-BR');};
const sourceLabel=(source:unknown)=>sourceKey(source)==='booking'?'Booking.com':sourceKey(source)==='google'?'Google':String(source||'Depoimento');
const published=(content:SiteContent)=>(content.reviews.items as Review[]).filter(item=>item.published!==false);
function initials(value:unknown):string {const words=String(value??'').trim().split(/\s+/).filter(Boolean);return words.length?`${words[0][0]}${words.length>1?words[words.length-1][0]:''}`.toLocaleUpperCase('pt-BR'):'';}
function reviewCard(item:Review,index:number,preview=false):string {
 const body=String(item.description??''),long=body.length>280;
 let excerpt=body.slice(0,260);if(excerpt.lastIndexOf(' ')>200)excerpt=excerpt.slice(0,excerpt.lastIndexOf(' '));
 const url=external(item.sourceUrl),when=date(item.date),score=validScore(item.score,item.scale)?`<span class="rv-review-score" aria-label="Nota ${esc(displayScore(item.score))} de ${esc(item.scale)}">${esc(displayScore(item.score))}<small> / ${esc(item.scale)}</small></span>`:'';
 return `<article class="rv-review-card${preview?' rv-preview-card':''}" ${preview?'':`data-review-source="${esc(sourceKey(item.source))}" data-review-search="${esc(`${item.name} ${body} ${item.source}`)}"${index>=6?' hidden':''}`}>
  <div class="rv-review-author"><span class="rv-initials" aria-hidden="true">${esc(initials(item.name))}</span><div><h3>${esc(item.name)}</h3>${when?`<time datetime="${esc(item.date)}">${esc(when)}</time>`:''}</div>${score}</div>
  <div class="rv-review-body">${long?`<details class="rv-long-review"><summary><span class="rv-excerpt">${esc(excerpt)}…</span><span class="rv-read-label"><span class="rv-read-closed">Ler avaliação completa</span><span class="rv-read-open">Mostrar menos</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></span></summary><blockquote><p>${esc(body)}</p></blockquote></details>`:`<blockquote><p>${esc(body)}</p></blockquote>`}</div>
  <div class="rv-review-footer"><span class="rv-source"><span class="rv-source-dot" aria-hidden="true"></span>${esc(sourceLabel(item.source))}</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Conferir avaliação de ${esc(item.name)} na plataforma original">Ver na fonte ${arrow}</a>`:''}</div>
 </article>`;
}
function platformCards(content:SiteContent):string {
 const rows=(content.reviews.platforms as Review[]||[]).filter(row=>validScore(row.score,row.scale)||external(row.url));
 return rows.map(row=>{const url=external(row.url),when=date(row.updated),known=validScore(row.score,row.scale);return `<article class="rv-platform-card"><div class="rv-platform-name"><span>${esc(row.label)}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg></div>${known?`<p class="rv-platform-score">${esc(displayScore(row.score))}<span> / ${esc(row.scale)}</span></p>`:'<p class="rv-platform-no-score">Conheça as avaliações</p>'}${Number(row.count)>0?`<p class="rv-platform-count">${Number(row.count).toLocaleString('pt-BR')} avaliações na plataforma</p>`:''}<p class="rv-platform-date">${when?`Consulta em <time datetime="${esc(row.updated)}">${esc(when)}</time>`:'Data de atualização não informada'}</p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Conferir na plataforma ${arrow}</a>`:''}</article>`;}).join('');
}
export function renderReviewsPreview(content:SiteContent):string {
 const section=content.reviews,items=published(content),chosen=[...items.filter(item=>item.featured),...items.filter(item=>!item.featured)].slice(0,3);
 return `<div class="guest-reviews-inner"><div class="guest-reviews-heading"><div><p class="rv-eyebrow">${esc(section.eyebrow||'MEMÓRIAS DE QUEM JÁ ESTEVE AQUI')}</p><h2>${esc(section.title)}</h2></div><p>${esc(section.description)}</p></div>${chosen.length?`<div class="guest-reviews-grid">${chosen.map((item,index)=>reviewCard(item,index,true)).join('')}</div>`:'<p class="rv-empty">Em breve, novas histórias de quem passou por aqui.</p>'}<div class="guest-reviews-bottom"><p>Pequenos detalhes que ficam na memória.</p><a class="rv-button-outline" href="/avaliacoes">${esc(section.moreLabel||'Ver todas as avaliações')} ${arrow}</a></div></div>`;
}
export function applyReviewsPage($:CheerioAPI,content:SiteContent):void {
 const section=content.reviews,items=published(content),sources=[...new Map(items.map(item=>[sourceKey(item.source),sourceLabel(item.source)])).entries()];
 $('#rv-title').text(String(section.pageTitle||section.title));$('#rv-intro').text(String(section.pageDescription||section.description));$('#rv-eyebrow').text(String(section.eyebrow||'HISTÓRIAS QUE FAZEM PARTE DA POUSADA'));
 $('meta[name="description"]').attr('content',String(section.pageDescription||section.description));
 const cards=platformCards(content);$('#rv-platforms').html(cards);if(!cards)$('#rv-summary').attr('hidden','');
 $('#rv-filters').html(`<button type="button" class="is-active" data-review-filter="todos" aria-pressed="true">Todas</button>${sources.map(([key,label])=>`<button type="button" data-review-filter="${esc(key)}" aria-pressed="false">${esc(label)}</button>`).join('')}`);
 $('#rv-cards').html(items.map((item,index)=>reviewCard(item,index)).join(''));$('#rv-results').text(`${items.length} ${items.length===1?'avaliação publicada':'avaliações publicadas'}`);
 $('#rv-more').attr('hidden',items.length>6?null:'');
 if(!items.length)$('#rv-empty').removeAttr('hidden').text('Ainda não há avaliações publicadas. Acompanhe as próximas histórias dos nossos hóspedes.');
 const platformLinks=(section.platforms as Review[]||[]).filter(p=>external(p.url));
 if(platformLinks.length){$('#rv-source-links').html(platformLinks.map(p=>`<a class="rv-source-link" href="${esc(external(p.url))}" target="_blank" rel="noopener noreferrer">Ver avaliações na ${esc(p.label)} ${arrow}</a>`).join(''));}else $('#rv-source-links').attr('hidden','');
}
