import { legacyPage } from '../../lib/legacy-page';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ page: string }> }) {
  const { page } = await context.params;
  return legacyPage(page.replace(/\.html$/, ''));
}
// Preserve the legacy server's explicit HEAD rejection.
export function HEAD() { return new Response(null, { status: 405, headers: { Allow: 'GET' } }); }
