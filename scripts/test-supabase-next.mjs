// Tests the real Next.js HTTP adapter against a local fake Auth/PostgREST API.
// Database rules are independently exercised by database/test-reservations.sql.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

let revoked = false;
let adminSignIns = 0;
const received = [];
const mock = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};
  const token = req.headers.authorization?.replace('Bearer ', '');
  received.push({ path: req.url, method: req.method, data, token });
  const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (req.url.startsWith('/auth/v1/token')) {
    if (data.refresh_token === 'refresh-admin') return json(200, { access_token: 'access-admin', refresh_token: 'refresh-admin', expires_in: 3600 });
    if (data.password !== 'test-password-only') return json(400, { code: 'invalid_credentials' });
    const access = data.email === 'admin@example.invalid' ? (++adminSignIns === 1 ? 'access-admin' : 'access-check') : 'access-other';
    return json(200, { access_token: access, refresh_token: 'refresh-admin', expires_in: 3600 });
  }
  if (req.url.startsWith('/auth/v1/logout')) { if (token === 'access-admin') revoked = true; return json(200, {}); }
  if (req.url.startsWith('/auth/v1/user')) return json(200, { email: 'admin@example.invalid' });
  if (req.url !== '/rest/v1/rpc/lotus_api') return json(404, {});
  if (token === 'expired') return json(401, { code: 'PGRST303' });
  const admin = token === 'access-admin' && !revoked;
  if (data.p_operation === 'session') return json(200, { authenticated: admin });
  if (data.p_operation === 'catalog') return json(200, { rooms: [], packages: [] });
  if (data.p_operation === 'book') return json(200, { id: 1, status: 'pendente', total: 120000 });
  if (!admin) return json(401, { code: 'PT401', message: 'Entre no painel para continuar.' });
  return json(200, { rooms: [], packages: [], bookings: [] });
});
mock.listen(0, '127.0.0.1'); await once(mock, 'listening');
const backend = `http://127.0.0.1:${mock.address().port}`;
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3108'], {
  env: { ...process.env, LOTUS_BACKEND: 'supabase', SUPABASE_URL: backend, NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore',
});
const base = 'http://127.0.0.1:3108';
const request = (path, data, extra = {}) => fetch(base + '/api/' + path, {
  method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...extra.headers },
  ...(data ? { body: JSON.stringify(data) } : {}), ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'headers')),
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw Error('Next.js failed to start');
    try { const r = await fetch(base); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready);
  let r = await request('catalog'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { rooms: [], packages: [] });
  r = await request('admin'); assert.equal(r.status, 401);
  r = await request('session'); assert.deepEqual(await r.json(), { authenticated: false });
  r = await request('login', { email: 'admin@example.invalid', password: 'wrong' }); assert.equal(r.status, 401);
  const before = received.length;
  r = await request('login', { email: 'admin@example.invalid', password: 'test-password-only' }, { headers: { Origin: 'https://malicious.invalid' } });
  assert.equal(r.status, 403); assert.equal(received.length, before);
  r = await request('login', { email: 'other@example.invalid', password: 'test-password-only' }); assert.equal(r.status, 403);
  r = await request('login', { email: 'admin@example.invalid', password: 'test-password-only' }); assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  const setCookies = r.headers.getSetCookie();
  assert.equal(setCookies.length, 2);
  for (const cookie of setCookies) { assert.match(cookie, /httponly/i); assert.match(cookie, /samesite=strict/i); assert.match(cookie, /secure/i); }
  const cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  r = await request('admin', undefined, { headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  r = await request('session', undefined, { headers: { Cookie: 'lotus_access=expired; lotus_refresh=refresh-admin' } });
  assert.equal(r.status, 200); assert.equal((await r.json()).authenticated, true); assert.equal(r.headers.getSetCookie().length, 2);
  r = await request('bookings', { id: 999, total: 1 }); assert.equal(r.status, 201);
  const booking = received.findLast(x => x.data.p_operation === 'book'); assert.equal(booking.data.p_data.id, undefined); assert.equal(booking.token, undefined);
  r = await request('account', { current_password: 'wrong', password: 'new-password-only' }, { method: 'PUT', headers: { Cookie: cookies } });
  assert.equal(r.status, 401);
  r = await request('account', { current_password: 'test-password-only', email: 'owner@example.invalid', password: 'new-password-only' }, { method: 'PUT', headers: { Cookie: cookies } });
  assert.equal(r.status, 200);
  const update = received.findLast(x => x.path.startsWith('/auth/v1/user') && x.method === 'PUT');
  assert.deepEqual(update.data, { email: 'owner@example.invalid', password: 'new-password-only' });
  assert.match(update.path, /redirect_to=/);
  r = await request('bookings', { guest: 'x'.repeat(17000) }); assert.equal(r.status, 413);
  r = await fetch(base + '/api/bookings', { method: 'POST', body: '{}' }); assert.equal(r.status, 415);
  r = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[' }); assert.equal(r.status, 400);
  r = await request('logout', {}, { headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  assert(r.headers.getSetCookie().every(c => /max-age=0/i.test(c)));
  r = await request('session', undefined, { headers: { Cookie: 'lotus_access=access-admin' } }); assert.equal((await r.json()).authenticated, false);
  console.log('Next.js/Supabase adapter: 16 scenarios passed (mock HTTP; real database contract tested separately).');
} finally {
  app.kill(); await once(app, 'exit'); await new Promise(resolve => mock.close(resolve));
}
