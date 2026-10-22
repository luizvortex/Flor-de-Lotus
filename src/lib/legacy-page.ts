import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Temporary compatibility layer. Only these checked-in templates can be read.
const pages: Record<string, string> = {
  index: 'index.html', reservas: 'reservas.html',
  admin: 'admin.html', avaliacoes: 'avaliacoes.html',
};
export async function legacyPage(name: string): Promise<Response> {
  const file = Object.hasOwn(pages, name) ? pages[name] : undefined;
  if (!file) return new Response('Página não encontrada', { status: 404 });
  const html = await readFile(path.join(process.cwd(), file), 'utf8');
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
