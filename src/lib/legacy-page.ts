import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {getSiteContent,renderSiteContent} from './site-content';
import type {SiteContent} from './site-content-schema';
import { getShowcases, renderShowcases } from './room-showcases';

// Temporary compatibility layer. Only these checked-in templates can be read.
const pages: Record<string, string> = {
  index: 'index.html', reservas: 'reservas.html', quartos: 'reservas.html',
  grupos: 'grupos.html', pacotes: 'pacotes.html', itacare: 'itacare.html',
  'minha-conta': 'minha-conta.html',
  admin: 'admin.html', avaliacoes: 'avaliacoes.html',
  privacidade:'informacoes.html',condicoes:'informacoes.html',
};
export async function legacyPage(name: string, preview?:SiteContent): Promise<Response> {
  const file = Object.hasOwn(pages, name) ? pages[name] : undefined;
  if (!file) return new Response('Página não encontrada', { status: 404 });
  let html = await readFile(path.join(process.cwd(), file), 'utf8');
  const contentPromise=name==='admin'?undefined:preview?Promise.resolve(preview):getSiteContent();
  if (name === 'index') {
    const content = renderShowcases((await getShowcases()).filter(row => ['duplo', 'triplo'].includes(row.slug)));
    html = html.replace(/<!--ROOM_SHOWCASES_START-->[\s\S]*?<!--ROOM_SHOWCASES_END-->/, () => `<!--ROOM_SHOWCASES_START-->${content}<!--ROOM_SHOWCASES_END-->`);
  }
  if(contentPromise)html=renderSiteContent(html,await contentPromise,name);
  if (!['admin','minha-conta'].includes(name) && !html.includes('src="/site-language.js"')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/site-language.css"><script src="/site-language.js" defer></script></head>');
  }
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(['admin','minha-conta'].includes(name)?{'X-Robots-Tag':'noindex, nofollow'}:{}),
  } });
}
