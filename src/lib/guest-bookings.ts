import { NextRequest } from 'next/server';
import { guestClient, privateResponse } from './guest-auth';

export function hasGuestSession(request: NextRequest) {
  return request.cookies.getAll().some(({ name, value }) => value && /^lotus_guest_auth(?:\.\d+)?$/.test(name));
}
export async function guestBookingOperation(request: NextRequest, operation: 'read' | 'book' | 'read_notification', data: Record<string, unknown> = {}) {
  const response = privateResponse();
  const supabase = guestClient(request, response);
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: response.headers });
  try {
    const { data: identity, error: authError } = await supabase.auth.getUser();
    if (authError || !identity.user?.identities?.some(i => i.provider === 'google')) {
      return reply({ error: 'Entre com sua conta Google para consultar suas reservas.' }, authError && (!authError.status || authError.status >= 500) ? 503 : 401);
    }
    const { data: result, error } = await supabase.rpc('lotus_guest_booking_api', { p_operation: operation, p_data: data });
    if (error) {
      const match = /^PT(400|401|403|404|409)$/.exec(error.code || '');
      return reply({ error: match ? error.message : 'Não foi possível consultar suas reservas. Tente novamente.' }, match ? Number(match[1]) : 503);
    }
    return reply(result, operation === 'book' ? 201 : 200);
  } catch { return reply({ error: 'Não foi possível conectar às suas reservas. Tente novamente.' }, 503); }
}
