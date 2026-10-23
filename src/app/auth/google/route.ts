import { NextRequest } from 'next/server';
import { authOrigin, googleEnabled, guestClient, privateResponse, sameOrigin } from '../../../lib/guest-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateResponse({ error: 'Origem não permitida.' }, 403);
  const origin = authOrigin(request);
  const response = privateResponse({}, 303);
  response.headers.set('Location', `${origin}/?conta=indisponivel`);
  if (await googleEnabled() !== true) return response;
  const supabase = guestClient(request, response);
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback`, scopes: 'openid email profile', queryParams: { prompt: 'select_account' }, skipBrowserRedirect: true } });
  if (!error && data.url) response.headers.set('Location', data.url);
  return response;
}
