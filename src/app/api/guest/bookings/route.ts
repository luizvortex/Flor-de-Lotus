import { NextRequest } from 'next/server';
import { guestBookingOperation } from '../../../../lib/guest-bookings';
import { privateResponse, sameOrigin } from '../../../../lib/guest-auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  return guestBookingOperation(request, 'read');
}
export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return privateResponse({ error: 'Origem não permitida.' }, 403);
  // Marking a notification read never changes a booking or its status.
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return privateResponse({ error: 'Use application/json.' }, 415);
  const reader = request.body?.getReader();
  if (!reader) return privateResponse({ error: 'Dados inválidos.' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 1024) { await reader.cancel(); return privateResponse({ error: 'Dados inválidos.' }, 413); }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  let data;
  try { data = JSON.parse(text); } catch { return privateResponse({ error: 'Dados inválidos.' }, 400); }
  if (!data || !Number.isSafeInteger(data.id) || data.id < 1) return privateResponse({ error: 'Aviso inválido.' }, 400);
  return guestBookingOperation(request, 'read_notification', { id: data.id });
}
