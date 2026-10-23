import { NextRequest } from 'next/server';
import { googleAvatar, googleEnabled, guestClient, privateResponse } from '../../../../lib/guest-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const response = privateResponse();
  const supabase = guestClient(request, response);
  const [{ data, error }, enabled] = await Promise.all([supabase.auth.getUser(), googleEnabled()]);
  if (error && (!error.status || error.status >= 500)) {
    return new Response(JSON.stringify({ error: 'Não foi possível consultar sua conta. Tente novamente.' }), { status: 503, headers: response.headers });
  }
  const user = !error ? data.user : null;
  // Profile fields are presentation only; they never grant administrative access.
  const identity = user?.identities?.find(i => i.provider === 'google');
  const profile = identity?.identity_data;
  const result = { google_enabled: enabled, user: user && identity ? {
    name: String(profile?.full_name || profile?.name || user.user_metadata?.full_name || 'Visitante').slice(0,120),
    email: user.email || '',
    avatar_url: googleAvatar(profile?.avatar_url || profile?.picture || user.user_metadata?.avatar_url),
  } : null };
  return new Response(JSON.stringify(result), response);
}
