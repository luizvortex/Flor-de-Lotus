// Tests the real Next.js HTTP adapter against a local fake Auth/PostgREST API.
// Database rules are independently exercised by database/test-reservations.sql.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
let showcaseTitle = 'Duplo Twin';
let policyData = { policies: {checkin:'A partir das 14h.'}, revision:1 };


let revoked = false;
let adminSignIns = 0;
const received = [];
const mock = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const data = body && !req.url.startsWith('/storage/') ? JSON.parse(body) : {};
  const token = req.headers.authorization?.replace('Bearer ', '');
  received.push({ path: req.url, method: req.method, data, token });
  const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (req.url.startsWith('/auth/v1/token')) {
    if (data.refresh_token === 'refresh-admin') return json(200, { access_token: 'access-admin', refresh_token: 'refresh-admin', expires_in: 3600 });
    if (data.password !== 'test-password-only') return json(400, { code: 'invalid_credentials' });
    const access = ['admin@example.invalid','zilterpacheoni17@gmail.com'].includes(data.email) ? (++adminSignIns === 1 ? 'access-admin' : 'access-check') : 'access-other';
    return json(200, { access_token: access, refresh_token: 'refresh-admin', expires_in: 3600 });
  }
  if (req.url.startsWith('/auth/v1/logout')) { if (token === 'access-admin') revoked = true; return json(200, {}); }
  if (req.url.startsWith('/auth/v1/user')) return json(200, { email: 'admin@example.invalid' });
  if (req.url.startsWith('/storage/v1/object/lotus-showcase/')) return json(token === 'access-admin' ? 200 : 403, {});
  if (req.url === '/rest/v1/rpc/lotus_assignment_api') {
    if (token !== 'access-admin' || revoked) return json(401,{code:'PT401'});
    return json(200,{ok:true});
  }
  if (req.url === '/rest/v1/rpc/lotus_rate_api') {
    if (data.p_operation === 'catalog') return json(200,{rooms:[],packages:[]});
    if (data.p_operation === 'availability') return json(200,{rooms:[],nights:1});
    if (token !== 'access-admin' || revoked) return json(401,{code:'PT401'});
    return json(200,{rates:[]});
  }
  if (req.url === '/rest/v1/rpc/lotus_guest_booking_api') {
    if (token !== 'access-admin' || revoked) return json(401, { code:'PT401', message:'Entre no painel.' });
    assert.equal(data.p_operation,'link'); return json(200,{ok:true});
  }
  if (req.url === '/rest/v1/rpc/lotus_policy_api') {
    if (data.p_operation === 'read') return json(200, policyData);
    if (token !== 'access-admin' || revoked) return json(401, { code: 'PT401' });
    policyData = { policies:data.p_data.policies, revision:policyData.revision+1 }; return json(200, policyData);
  }
  if (req.url === '/rest/v1/rpc/lotus_showcase_api') {
    if (data.p_operation === 'read') return json(200, { showcases: [{ slug: 'duplo', title: showcaseTitle, photos: [] }] });
    if (token !== 'access-admin') return json(401, { code: 'PT401' });
    showcaseTitle = data.p_data.title; return json(200, { ok: true });
  }
  if (!['/rest/v1/rpc/lotus_api', '/rest/v1/rpc/lotus_room_catalog_api'].includes(req.url)) return json(404, {});
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
  r = await request('rates'); assert.equal(r.status,401);
  r = await request('bookings/101/assignment',{room_id:5},{method:'PUT'});assert.equal(r.status,401);
  r = await request('session'); assert.deepEqual(await r.json(), { authenticated: false });
  r = await request('login', { email: 'admin@example.invalid', password: 'wrong' }); assert.equal(r.status, 401);
  const before = received.length;
  r = await request('login', { email: 'admin@example.invalid', password: 'test-password-only' }, { headers: { Origin: 'https://malicious.invalid' } });
  assert.equal(r.status, 403); assert.equal(received.length, before);
  r = await request('login', { email: 'other@example.invalid', password: 'test-password-only' }); assert.equal(r.status, 403);
  r = await request('login', { email: 'admin', password: 'test-password-only' }); assert.equal(r.status, 200);
  assert.equal(received.findLast(x => x.path.startsWith('/auth/v1/token') && x.data.email).data.email, 'zilterpacheoni17@gmail.com');
  assert.deepEqual(await r.json(), { ok: true });
  const setCookies = r.headers.getSetCookie();
  assert.equal(setCookies.length, 2);
  for (const cookie of setCookies) { assert.match(cookie, /httponly/i); assert.match(cookie, /samesite=strict/i); assert.match(cookie, /secure/i); }
  const cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  r = await request('admin', undefined, { headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  r = await request('rates',undefined,{headers:{Cookie:cookies}});assert.equal(r.status,200);
  r = await request('rates',{floor:'superior',guests:3,amount:25000,example:false},{headers:{Cookie:cookies}});assert.equal(r.status,200);
  assert.equal(received.findLast(x=>x.path==='/rest/v1/rpc/lotus_rate_api').data.p_data.amount,25000);
  r = await request('availability?start=2026-11-10&end=2026-11-11&guests=3&floor=superior');assert.equal(r.status,200);
  const quoteRequest=received.findLast(x=>x.data.p_operation==='availability');assert.equal(quoteRequest.path,'/rest/v1/rpc/lotus_rate_api');assert.equal(quoteRequest.data.p_data.guests,3);assert.equal(quoteRequest.data.p_data.floor,'superior');
  r = await request('bookings/101/assignment',{room_id:15},{method:'PUT',headers:{Cookie:cookies}});assert.equal(r.status,200);
  assert.deepEqual(received.findLast(x=>x.path==='/rest/v1/rpc/lotus_assignment_api').data,{p_data:{booking_id:101,room_id:15}});

  r = await request('rooms', { name: 'Quarto de teste', type: 'casal', capacity: 2, price: 10000, active: 1, showcase_slug: 'triplo' }, { headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  const roomSave = received.findLast(x => x.data.p_operation === 'save_room');
  assert.equal(roomSave.path, '/rest/v1/rpc/lotus_room_catalog_api'); assert.equal(roomSave.data.p_data.showcase_slug, 'triplo');
  r = await request('bookings/101/account', { email:'guest@example.invalid' }, { method:'PUT' }); assert.equal(r.status,401);
  r = await request('bookings/101/account', { email:'guest@example.invalid' }, { method:'PUT', headers:{Cookie:cookies} }); assert.equal(r.status,200);
  const accountLink=received.findLast(x=>x.path==='/rest/v1/rpc/lotus_guest_booking_api');assert.equal(accountLink.data.p_data.booking_id,101);assert.equal(accountLink.data.p_data.email,'guest@example.invalid');
  r = await request('session', undefined, { headers: { Cookie: 'lotus_access=expired; lotus_refresh=refresh-admin' } });
  assert.equal(r.status, 200); assert.equal((await r.json()).authenticated, true); assert.equal(r.headers.getSetCookie().length, 2);
  r = await request('bookings', { id: 999, total: 1 }); assert.equal(r.status, 401);
  r = await request('bookings', { id:999,total:1,status:'pendente' }, {headers:{Cookie:cookies}}); assert.equal(r.status,201);
  const booking = received.findLast(x => x.data.p_operation === 'book'); assert.equal(booking.data.p_data.id, undefined); assert.equal(booking.token, 'access-admin');
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
  r = await request('showcases'); assert.equal(r.status, 200);
  r = await request('showcases/duplo', { title: 'Novo título' }, { method: 'PUT' }); assert.equal(r.status, 401);
  r = await request('showcases/duplo', { title: 'Novo título', details: { beds: '1 cama de casal', bathroom: ['Chuveiro'] } }, { method: 'PUT', headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  assert.deepEqual(received.findLast(x => x.data.p_operation === 'save').data.p_data.details, { beds: '1 cama de casal', bathroom: ['Chuveiro'] });
  r = await request('showcases'); assert.equal((await r.json()).showcases[0].title, 'Novo título');
  r = await request('policies'); assert.equal(r.status, 200); assert.equal((await r.json()).policies.checkin, 'A partir das 14h.');
  r = await request('policies', { policies:{checkin:'15h'}, revision:1 }, { method:'PUT' }); assert.equal(r.status, 401);
  r = await request('policies', { policies:{checkin:'15h'}, revision:1 }, { method:'PUT', headers:{ Cookie:cookies, Origin:'https://malicious.invalid' } }); assert.equal(r.status, 403);
  r = await request('policies', { policies:{checkin:'15h'}, revision:1 }, { method:'PUT', headers:{ Cookie:cookies } }); assert.equal(r.status, 200); assert.equal((await r.json()).revision, 2);
  assert.equal(received.findLast(x => x.path === '/rest/v1/rpc/lotus_policy_api').data.p_operation, 'save');
  r = await request('policies'); assert.equal((await r.json()).policies.checkin, '15h');
  const upload = async (contents, type, authenticated = true) => {
    const form = new FormData(); form.append('photo', new Blob([contents], { type }), 'foto.jpg');
    return fetch(base + '/api/showcase-upload', { method: 'POST', body: form, headers: authenticated ? { Cookie: cookies } : {} });
  };
  r = await upload('not-a-photo', 'image/jpeg', false); assert.equal(r.status, 401);
  r = await upload('not-a-photo', 'image/jpeg'); assert.equal(r.status, 415);
  r = await upload(new Uint8Array([255,216,255,224,0,0,0,0]), 'image/jpeg'); assert.equal(r.status, 201);
  assert.match((await r.json()).url, /\/lotus-showcase\/[0-9a-f-]+\.jpg$/);
  assert.equal(received.findLast(x => x.path.startsWith('/storage/')).token, 'access-admin');
  r = await request('login', { email: 'admin', password:'wrong' }); assert.equal(r.status, 401);
  assert.equal(received.findLast(x => x.path.startsWith('/auth/v1/token') && x.data.email).data.email, 'zilterpacheoni17@gmail.com');
  r = await request('logout', {}, { headers: { Cookie: cookies } }); assert.equal(r.status, 200);
  assert(r.headers.getSetCookie().every(c => /max-age=0/i.test(c)));
  r = await request('session', undefined, { headers: { Cookie: 'lotus_access=access-admin' } }); assert.equal((await r.json()).authenticated, false);
  console.log('Next.js/Supabase adapter: 34 scenarios passed (mock HTTP; real database contract tested separately).');
} finally {
  app.kill(); await once(app, 'exit'); await new Promise(resolve => mock.close(resolve));
}
