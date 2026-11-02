import { fishingGroupIntroduction } from '../../lib/group-origin';
import { legacyPage } from '../../lib/legacy-page';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ page: string }> }) {
  const { page } = await context.params;
  const name=page.replace(/\.html$/, '');
  const response=await legacyPage(name);
  if(name==='grupos'&&new URL(_request.url).searchParams.get('origem')==='pescadores')return new Response(fishingGroupIntroduction(await response.text()),{status:response.status,headers:response.headers});
  return response;
}
// Preserve the legacy server's explicit HEAD rejection.
export function HEAD() { return new Response(null, { status: 405, headers: { Allow: 'GET' } }); }
