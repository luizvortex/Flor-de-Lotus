import { NextRequest } from 'next/server';
import { guestClient, privateResponse, sameOrigin } from '../../../../lib/guest-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const response = privateResponse({ ok: true });
  if (!sameOrigin(request)) return privateResponse({ error: 'Origem não permitida.' }, 403);
  const supabase = guestClient(request, response);
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return new Response(JSON.stringify({ error: 'Não foi possível sair. Tente novamente.' }), { status: 503, headers: response.headers });
  return response;
}
