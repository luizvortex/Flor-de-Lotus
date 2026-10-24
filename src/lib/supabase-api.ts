import { NextRequest, NextResponse } from 'next/server';
import { guestBookingOperation, hasGuestSession } from './guest-bookings';
import { randomUUID } from 'node:crypto';
import {siteDefaults,siteSections,validateSiteContent} from './site-content-schema';
import {getSiteDocument} from './site-content';
import {legacyPage} from './legacy-page';
import { supabaseKey, supabaseUrl } from './supabase-config';

const ACCESS = 'lotus_access';
const REFRESH = 'lotus_refresh';
const COOKIE = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
type Json = Record<string, unknown>;
type Tokens = { access_token: string; refresh_token: string; expires_in: number };
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function call(path: string, method: string, data?: Json, token?: string): Promise<Json> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: { apikey: supabaseKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    const code = String(result.code || '');
    if (/^PT(400|401|403|404|409)$/.test(code)) throw new ApiError(Number(code.slice(2)), String(result.message));
    if (response.status === 429) throw new ApiError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
    if (response.status === 401 || response.status === 403 || code === 'invalid_credentials') {
      throw new ApiError(401, 'E-mail ou senha incorretos, ou sessão encerrada.');
    }
    if (path.startsWith('/auth/') && response.status === 422) {
      throw new ApiError(400, 'Não foi possível atualizar o acesso. Confira os dados e os requisitos da senha.');
    }
    throw new ApiError(503, 'Sistema de reservas indisponível. Tente novamente.');
  }
  return result;
}
function rpc(operation: string, data: Json, token?: string) {
  const endpoint = ['catalog', 'availability', 'admin', 'save_room'].includes(operation) ? 'lotus_room_catalog_api' : 'lotus_api';
  return call(`/rest/v1/rpc/${endpoint}`, 'POST', { p_operation: operation, p_data: data }, token);
}
function setTokens(response: NextResponse, tokens: Tokens) {
  // Keep access cookie briefly beyond JWT expiry so refresh happens only after
  // expiry, rather than rotating a refresh token on every parallel request.
  response.cookies.set(ACCESS, tokens.access_token, { ...COOKIE, maxAge: Math.min(tokens.expires_in + 300, 28800) });
  response.cookies.set(REFRESH, tokens.refresh_token, { ...COOKIE, maxAge: 28800 });
}
function clearTokens(response: NextResponse) {
  for (const name of [ACCESS, REFRESH]) response.cookies.set(name, '', { ...COOKIE, maxAge: 0 });
}
function requiredText(data: Json, key: string, max: number): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ApiError(400, `Preencha corretamente: ${key}`);
  return value;
}
async function readBytes(request: NextRequest, limit: number): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Dados inválidos.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new ApiError(413, 'Requisição muito grande.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function body(request: NextRequest, limit = 16384): Promise<Json> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ApiError(415, 'Use application/json.');
  const bytes = await readBytes(request, limit);
  try {
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Json;
  } catch { throw new ApiError(400, 'JSON inválido.'); }
}
async function uploadShowcasePhoto(request: NextRequest, token: string): Promise<Json> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data;')) throw new ApiError(415, 'Envie uma foto pelo formulário.');
  const bytes = await readBytes(request, 3 * 1024 * 1024 + 65536);
  let form: FormData;
  try { form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': contentType } }).formData(); }
  catch { throw new ApiError(400, 'Arquivo inválido.'); }
  const file = form.get('photo');
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new ApiError(400, 'Use uma foto de até 3 MB.');
  const image = Buffer.from(await file.arrayBuffer());
  const type = image.subarray(0,3).equals(Buffer.from([255,216,255])) ? 'image/jpeg' : image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : image.toString('ascii',0,4) === 'RIFF' && image.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : '';
  if (!type || file.type !== type) throw new ApiError(415, 'Formato inválido. Use JPG, PNG ou WebP.');
  const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
  const name = `${randomUUID()}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/lotus-showcase/${name}`, {
    method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, 'Content-Type': type, 'Cache-Control': 'max-age=31536000' },
    body: image, signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ApiError(response.status === 401 || response.status === 403 ? 403 : 503, 'Não foi possível enviar a foto. Verifique sua sessão e tente novamente.');
  return { url: `${supabaseUrl}/storage/v1/object/public/lotus-showcase/${name}` };
}

export async function supabaseApi(request: NextRequest): Promise<Response> {
  let rotated: Tokens | undefined;
  let token = request.cookies.get(ACCESS)?.value;
  let clear = false;
  const finish = (data: Json, status = 200) => {
    const response = NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if (clear) clearTokens(response);
    else if (rotated) setTokens(response, rotated);
    return response;
  };
  try {
    const method = request.method;
    const path = request.nextUrl.pathname.slice('/api/'.length);
    if (method !== 'GET') {
      const origin = request.headers.get('origin');
      let originHost: string | undefined;
      try { originHost = origin ? new URL(origin).host : undefined; } catch { throw new ApiError(403, 'Origem não permitida.'); }
      if (request.headers.get('sec-fetch-site') === 'cross-site' || (originHost && originHost !== request.headers.get('host'))) {
        throw new ApiError(403, 'Origem não permitida.');
      }
    }
    const isUpload = path === 'showcase-upload' && method === 'POST';
    const data = method === 'GET' || isUpload ? {} : await body(request, path === 'policies' ? 65536 : ['site-content','site-preview'].includes(path) ? 200000 : 16384);
    if (path === 'login' && method === 'POST') {
      const login = requiredText(data, 'email', 254).trim();
      const email = login.toLowerCase() === 'admin' ? (process.env.ADMIN_LOGIN_EMAIL || 'zilterpacheoni17@gmail.com') : login;
      const password = requiredText(data, 'password', 256);
      const tokens = await call('/auth/v1/token?grant_type=password', 'POST', { email, password }) as unknown as Tokens;
      const session = await rpc('session', {}, tokens.access_token);
      if (!session.authenticated) {
        await call('/auth/v1/logout?scope=local', 'POST', {}, tokens.access_token);
        throw new ApiError(403, 'Esta conta não tem acesso à administração da pousada.');
      }
      rotated = tokens;
      return finish({ ok: true });
    }
    if (path === 'bookings' && method === 'POST' && !Object.hasOwn(data, 'status')) {
      if (!hasGuestSession(request)) throw new ApiError(401, 'Entre com Google para finalizar sua reserva.');
      delete data.id;
      return await guestBookingOperation(request, 'book', data);
    }
    // The database verifies both the JWT identity and a live Auth session.
    // JWT expiry is handled via refresh, without trusting unverified claims.
    let session: Json;
    try { session = await rpc('session', {}, token); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      session = { authenticated: false };
      token = undefined;
    }
    const refresh = request.cookies.get(REFRESH)?.value;
    if (!session.authenticated && refresh) {
      try {
        rotated = await call('/auth/v1/token?grant_type=refresh_token', 'POST', { refresh_token: refresh }) as unknown as Tokens;
        token = rotated.access_token;
        session = await rpc('session', {}, token);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status >= 500 || error.status === 429) throw error;
        clear = true; token = undefined; session = { authenticated: false };
      }
    }
    if (!session.authenticated) token = undefined;
    if (path === 'session' && method === 'GET') return finish({ authenticated: Boolean(session.authenticated) });
    if (path === 'logout' && method === 'POST') {
      if (token) await call('/auth/v1/logout?scope=local', 'POST', {}, token);
      clear = true;
      return finish({ ok: true });
    }
    if (isUpload) {
      if (!token) throw new ApiError(401, 'Entre no painel para enviar fotos.');
      return finish(await uploadShowcasePhoto(request, token), 201);
    }
    if (['site-content','site-preview','site-upload','site-history','site-restore'].includes(path)) {
      if(!token)throw new ApiError(401,'Entre no painel para editar o site.');
      if(path==='site-content'&&method==='GET')return finish({...await getSiteDocument(),sections:siteSections});
      if((path==='site-content'&&method==='PUT')||(path==='site-preview'&&method==='POST')){
        let content;
        try{content=validateSiteContent(data.content);}catch(error){throw new ApiError(400,(error as Error).message);}
        if(path==='site-preview'){
          const pageName=data.page==='avaliacoes'?'avaliacoes':data.page==='quartos'?'quartos':data.page==='itacare'?'itacare':'index';
          return finish({html:await(await legacyPage(pageName,content)).text()});
        }
        return finish(await call('/rest/v1/rpc/lotus_site_api','POST',{p_operation:'save',p_data:{content,revision:data.revision}},token));
      }
      if(path==='site-history'&&method==='GET')return finish(await call('/rest/v1/rpc/lotus_site_api','POST',{p_operation:'history',p_data:{}},token));
      if(path==='site-restore'&&method==='POST'){
        const saved=await call('/rest/v1/rpc/lotus_site_api','POST',{p_operation:'restore',p_data:data},token);
        return finish({...saved,content:validateSiteContent(saved.content??siteDefaults)});
      }
      if(path==='site-upload'&&method==='POST'){
        const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
        const type=String(data.type),size=data.size;
        if(!Object.hasOwn(types,type)||typeof size!=='number'||!Number.isInteger(size)||size<=0||size>(type.startsWith('video/')?50:3)*1024*1024)throw new ApiError(400,'Use fotos de até 3 MB ou vídeos MP4/WebM de até 50 MB.');
        const filename=`${randomUUID()}.${types[type]}`;
        const signed=await call(`/storage/v1/object/upload/sign/lotus-site/${filename}`,'POST',{},token);
        const signedPath=String(signed.url);
        const upload=new URL(signedPath.startsWith('/object/')?`${supabaseUrl}/storage/v1${signedPath}`:signedPath,supabaseUrl);
        if(upload.origin!==new URL(supabaseUrl).origin||!upload.pathname.startsWith('/storage/v1/object/upload/sign/lotus-site/'))throw new ApiError(503,'Não foi possível preparar o envio.');
        return finish({uploadUrl:upload.href,url:`${supabaseUrl}/storage/v1/object/public/lotus-site/${filename}`});
      }
      throw new ApiError(404,'Operação não encontrada.');
    }
    if (path === 'policies' && (method === 'GET' || method === 'PUT')) {
      if (method === 'PUT' && !token) throw new ApiError(401, 'Entre no painel para editar as políticas.');
      return finish(await call('/rest/v1/rpc/lotus_policy_api', 'POST', { p_operation: method === 'GET' ? 'read' : 'save', p_data: data }, token));
    }
    if (path === 'showcases' && method === 'GET') {
      return finish(await call('/rest/v1/rpc/lotus_showcase_api', 'POST', { p_operation: 'read', p_data: {} }, token));
    }
    const showcaseMatch = /^showcases\/(duplo|triplo|triplo-standard|familia)$/.exec(path);
    if (showcaseMatch && method === 'PUT') {
      if (!token) throw new ApiError(401, 'Entre no painel para editar o site.');
      data.slug = showcaseMatch[1];
      return finish(await call('/rest/v1/rpc/lotus_showcase_api', 'POST', { p_operation: 'save', p_data: data }, token));
    }
    if (path === 'account' && method === 'GET') {
      if (!token) throw new ApiError(401, 'Entre no painel para continuar.');
      const user = await call('/auth/v1/user', 'GET', undefined, token);
      return finish({ email: user.email, pending_email: user.new_email || null });
    }
    if (path === 'account' && method === 'PUT') {
      if (!token) throw new ApiError(401, 'Entre no painel para continuar.');
      const currentPassword = requiredText(data, 'current_password', 256);
      const user = await call('/auth/v1/user', 'GET', undefined, token);
      // Require current credentials for access changes and revoke this auxiliary
      // verification session immediately after reauthentication.
      const verified = await call('/auth/v1/token?grant_type=password', 'POST', { email: user.email, password: currentPassword }) as unknown as Tokens;
      await call('/auth/v1/logout?scope=local', 'POST', {}, verified.access_token);
      const changes: Json = {};
      if (data.email) changes.email = requiredText(data, 'email', 254).trim();
      if (data.password) {
        const password = requiredText(data, 'password', 256);
        if (password.length < 12) throw new ApiError(400, 'Use uma senha com pelo menos 12 caracteres.');
        changes.password = password;
      }
      if (!Object.keys(changes).length) throw new ApiError(400, 'Informe o novo e-mail ou a nova senha.');
      const redirect = encodeURIComponent(`${process.env.APP_URL || 'https://flor-de-lotus-three.vercel.app'}/admin`);
      await call(`/auth/v1/user?redirect_to=${redirect}`, 'PUT', changes, token);
      return finish({ ok: true, message: changes.email ? 'Alteração solicitada. Confirme a troca pelos e-mails enviados pelo Supabase.' : 'Senha atualizada.' });
    }
    let operation: string | undefined;
    if (method === 'GET' && ['catalog', 'admin', 'availability'].includes(path)) operation = path;
    if (operation === 'availability') {
      const params = request.nextUrl.searchParams;
      data.start = params.get('start'); data.end = params.get('end');
      data.guests = params.has('guests') ? Number(params.get('guests')) : 1;
      data.package_id = params.get('package_id') ? Number(params.get('package_id')) : null;
    }
    const guestLink = /^bookings\/([1-9][0-9]*)\/account$/.exec(path);
    if (guestLink && method === 'PUT') {
      if (!token) throw new ApiError(401, 'Entre no painel para vincular uma conta.');
      return finish(await call('/rest/v1/rpc/lotus_guest_booking_api', 'POST', { p_operation: 'link', p_data: { booking_id: Number(guestLink[1]), email: requiredText(data, 'email', 254) } }, token));
    }
    const match = /^(rooms|packages|bookings)(?:\/([1-9][0-9]*))?$/.exec(path);
    if (match && ((method === 'POST' && !match[2]) || (method === 'PUT' && match[2]))) {
      // Never accept a client-supplied record id on creation.
      delete data.id;
      if (match[2]) data.id = Number(match[2]);
      operation = match[1] === 'rooms' ? 'save_room' : match[1] === 'packages' ? 'save_package' : method === 'POST' ? 'book' : 'booking_status';
    }
    if (!operation) throw new ApiError(404, 'Operação não encontrada.');
    if (operation === 'book' && (!token || !Object.hasOwn(data, 'status')) && hasGuestSession(request)) return await guestBookingOperation(request, 'book', data);
    const result = await rpc(operation, data, token);
    return finish(result, operation === 'book' ? 201 : 200);
  } catch (error) {
    if (error instanceof ApiError) return finish({ error: error.message }, error.status);
    return finish({ error: 'Sistema de reservas indisponível. Tente novamente.' }, 503);
  }
}
