import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseKey, supabaseUrl } from './supabase-config';
import {siteOrigin} from './site-url';

// A separate cookie namespace keeps guest OAuth independent of admin access.
export function guestClient(request: NextRequest, response: NextResponse) {
  const jar = new Map(request.cookies.getAll().map(c => [c.name, c.value]));
  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: { name: 'lotus_guest_auth', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000) }) },
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll(cookies, headers) {
        for (const { name, value, options } of cookies) {
          jar.set(name, value);
          response.cookies.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', ...(name.includes('code-verifier') && value ? { maxAge: 600 } : {}) });
        }
        for (const [name, value] of Object.entries(headers || {})) response.headers.set(name, value);
      },
    },
  });
}
export function privateResponse(data: unknown = {}, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie' } });
}
export function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try { return new URL(request.headers.get('origin') || '').host === request.headers.get('host'); }
  catch { return false; }
}
export async function googleEnabled(): Promise<boolean | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, { cache: 'no-store', headers: { apikey: supabaseKey }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const settings = await response.json();
    return settings.external?.google === true;
  } catch { return null; }
}
export function authOrigin(request: NextRequest): string {
  // Production callbacks always use the canonical URL, never forwarded headers.
  const host = request.headers.get('host') || '';
  if (process.env.VERCEL !== '1' && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)) return `http://${host}`;
  return siteOrigin();
}
export function googleAvatar(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')) ? url.href : null;
  } catch { return null; }
}
