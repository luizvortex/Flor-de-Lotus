import {applyPublicShell} from '../../lib/public-shell';
import { getSiteContent } from '../../lib/site-content';
import { renderFishingPage } from '../../lib/fishing-page';
import { siteOrigin } from '../../lib/site-url';
export const dynamic = 'force-dynamic';
export async function GET() {
 const content = await getSiteContent();
 return new Response(applyPublicShell(renderFishingPage(content, siteOrigin()),content), {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
