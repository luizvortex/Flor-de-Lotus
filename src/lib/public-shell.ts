import {load} from 'cheerio';
import type {SiteContent} from './site-content-schema';
import {renderSiteFooter} from './site-footer';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function applyPublicShell(html:string,content:SiteContent):string{
 const $=load(html);
 $('body>footer,main>footer').remove();
 $('body').append(renderSiteFooter(content));
 if(!$('link[href="/site-footer.css"]').length)$('head').append('<link rel="stylesheet" href="/site-footer.css"><script src="/site-footer.js" defer></script>');
 if(!$('link[href="/site-intro.css"]').length)$('head').prepend('<link rel="stylesheet" href="/site-intro.css">');
 if(!$('script[src="/site-intro.js"]').length)$('head').append('<script src="/site-intro.js"></script>');
 if(!$('.intro-screen').length)$('body').prepend(`<div class="intro-screen" aria-hidden="true"><div class="intro-signature"><span>Itacaré</span><img src="${esc(content.branding.logo)}" alt="" width="200" height="84"><span>Bahia · Brasil</span></div></div>`);
 return $.html();
}
