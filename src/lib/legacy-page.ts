import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getShowcases, renderShowcases } from './room-showcases';

// Temporary compatibility layer. Only these checked-in templates can be read.
const pages: Record<string, string> = {
  index: 'index.html', reservas: 'reservas.html', quartos: 'reservas.html',
  pacotes: 'pacotes.html',
  'minha-conta': 'minha-conta.html',
  admin: 'admin.html', avaliacoes: 'avaliacoes.html',
};
export async function legacyPage(name: string): Promise<Response> {
  const file = Object.hasOwn(pages, name) ? pages[name] : undefined;
  if (!file) return new Response('Página não encontrada', { status: 404 });
  let html = await readFile(path.join(process.cwd(), file), 'utf8');
  if (name === 'index') {
    const content = renderShowcases((await getShowcases()).filter(row => ['duplo', 'triplo'].includes(row.slug)));
    html = html.replace(/<!--ROOM_SHOWCASES_START-->[\s\S]*?<!--ROOM_SHOWCASES_END-->/, () => `<!--ROOM_SHOWCASES_START-->${content}<!--ROOM_SHOWCASES_END-->`);
  }
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
