import { NextRequest } from 'next/server';
import { authOrigin, guestClient, privateResponse } from '../../../lib/guest-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const response = privateResponse({}, 303);
  response.headers.set('Location', `${authOrigin(request)}/minha-conta?conta=erro`);
  const code = request.nextUrl.searchParams.get('code');
  if (code && code.length < 2048 && !request.nextUrl.searchParams.has('error')) {
    const supabase = guestClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) response.headers.set('Location', `${authOrigin(request)}/minha-conta?conta=conectada`);
  }
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
