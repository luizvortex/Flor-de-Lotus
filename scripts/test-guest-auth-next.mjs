// Real Next.js routes + official Supabase SDK; Google/Auth HTTP service simulated.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
let guestRows=[],guestReads=0;
let enabled = true, challenge, exchanged = 0, revoked = false, unsafeAvatar = false;
const id = '00000000-0000-4000-8000-000000000017';
const payload = Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000), role: 'authenticated' })).toString('base64url');
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${payload}.mock-signature`;
const user = () => ({ id, aud: 'authenticated', role: 'authenticated', email: 'guest@example.invalid', created_at: new Date().toISOString(), app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, identities: [{ id, identity_id: id, user_id: id, provider: 'google', identity_data: { full_name: 'Hóspede de teste', avatar_url: unsafeAvatar ? 'https://malicious.invalid/photo.jpg' : 'https://lh3.googleusercontent.com/mock-avatar' } }] });
const mock = createServer(async (req, res) => {
 let raw='';for await(const chunk of req)raw+=chunk;
 const body=raw?JSON.parse(raw):{};
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(req.url==='/rest/v1/rpc/lotus_guest_booking_api'){
  if(req.headers.authorization!==`Bearer ${token}`||revoked)return send(401,{code:'PT401',message:'Entre com Google.'});
  if(body.p_operation==='read'){guestReads++;return send(200,{today:'2026-10-23',bookings:guestRows,notifications:[]});}
  if(body.p_operation==='book'){guestRows=[{id:101,status:'pendente',total:42000}];return send(200,guestRows[0]);}
  if(body.p_operation==='read_notification')return send(200,{ok:true});
  return send(401,{code:'PT401',message:'Entre no painel.'});
 }
 if(req.url==='/auth/v1/settings')return send(200,{ external:{google:enabled} });
 if(['/rest/v1/rpc/lotus_api','/rest/v1/rpc/lotus_room_catalog_api'].includes(req.url)){assert(!req.headers.authorization);return body.p_operation==='session'?send(200,{authenticated:false}):send(401,{code:'PT401',message:'Entre no painel.'});}
 if(req.url==='/rest/v1/rpc/lotus_showcase_api')return send(404,{});
 if(req.url.startsWith('/auth/v1/token?grant_type=pkce')){
  exchanged++;
  if(body.auth_code!=='valid-code'||!body.code_verifier||createHash('sha256').update(body.code_verifier).digest('base64url')!==challenge)return send(400,{error_code:'bad_code_verifier',msg:'Invalid verifier'});
  return send(200,{access_token:token,refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user:user()});
 }
 if(req.url==='/auth/v1/user')return req.headers.authorization===`Bearer ${token}`&&!revoked?send(200,user()):send(401,{error_code:'bad_jwt',msg:'Invalid session'});
 if(req.url.startsWith('/auth/v1/logout')){revoked=true;return send(200,{});}
 return send(404,{});
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');
const base='http://127.0.0.1:3116';
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3116'],{env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,LOTUS_BACKEND:'supabase',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});
const jar=new Map();
const cookies=()=>Array.from(jar,([k,v])=>`${k}=${v}`).join('; ');
const absorb=r=>{for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}};
const call=(path,options={})=>fetch(base+path,{redirect:'manual',...options,headers:{Cookie:cookies(),...options.headers}});
const start=()=>call('/auth/google',{method:'POST',headers:{Origin:base}});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await call('/api/guest/session')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
 let r=await call('/api/guest/bookings');assert.equal(r.status,401);
 r=await call('/api/guest/session');assert.deepEqual(await r.json(),{google_enabled:true,user:null});assert.match(r.headers.get('Cache-Control'),/private.*no-store/);
 r=await call('/auth/google',{method:'POST',headers:{Origin:'https://malicious.invalid'}});assert.equal(r.status,403);
 enabled=false;r=await start();assert.equal(r.status,303);assert.match(r.headers.get('Location'),/conta=indisponivel/);assert.equal(r.headers.getSetCookie().length,0);enabled=true;
 r=await start();assert.equal(r.status,303);absorb(r);
 const authorize=new URL(r.headers.get('Location'));assert.equal(authorize.pathname,'/auth/v1/authorize');assert.equal(authorize.searchParams.get('provider'),'google');assert.equal(authorize.searchParams.get('code_challenge_method'),'s256');
 challenge=authorize.searchParams.get('code_challenge');assert(challenge);assert.equal(authorize.searchParams.get('redirect_to'),base+'/auth/callback');
 assert(r.headers.getSetCookie().some(c=>/lotus_guest_auth-code-verifier/.test(c)&&/HttpOnly/i.test(c)&&/SameSite=lax/i.test(c)&&/Secure/i.test(c)));
 r=await fetch(base+'/auth/callback?code=valid-code',{redirect:'manual'});assert.match(r.headers.get('Location'),/conta=erro/);
 r=await call('/auth/callback?code=valid-code&next=https://malicious.invalid');assert.match(r.headers.get('Location'),new RegExp('^'+base.replaceAll('.','\\.')+'/minha-conta\\?conta=conectada$'));absorb(r);
 assert(r.headers.getSetCookie().some(c=>c.startsWith('lotus_guest_auth=')&&/HttpOnly/i.test(c)));assert(!r.headers.getSetCookie().some(c=>c.startsWith('lotus_access=')));
 r=await call('/api/guest/session');let result=await r.json();assert.equal(result.user.name,'Hóspede de teste');assert.equal(result.user.email,'guest@example.invalid');assert.equal(result.user.avatar_url,'https://lh3.googleusercontent.com/mock-avatar');assert(!JSON.stringify(result).includes(token));
 unsafeAvatar=true;r=await call('/api/guest/session');assert.equal((await r.json()).user.avatar_url,null);unsafeAvatar=false;
 r=await call('/api/guest/bookings');assert.equal(r.status,200);assert.deepEqual((await r.json()).bookings,[]);assert.match(r.headers.get('Cache-Control'),/private.*no-store/);
 r=await call('/api/bookings',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({room_id:1,start:'2027-02-10',end:'2027-02-12',guests:2,guest:'Hóspede de teste',phone:'55000000000',user_id:'ignored'})});assert.equal(r.status,201);assert.equal((await r.json()).status,'pendente');
 r=await call('/api/guest/bookings');assert.equal((await r.json()).bookings[0].id,101);assert(guestReads>=2);
 r=await call('/api/guest/bookings',{method:'PATCH',headers:{Origin:'https://malicious.invalid','Content-Type':'application/json'},body:'{"id":1}'});assert.equal(r.status,403);
 r=await call('/api/guest/bookings',{method:'PATCH',headers:{Origin:base,'Content-Type':'application/json'},body:'{"id":1}'});assert.equal(r.status,200);
 r=await call('/api/guest/bookings',{method:'PATCH',headers:{Origin:base,'Content-Type':'application/json'},body:'{"id":-1}'});assert.equal(r.status,400);
 r=await call('/api/bookings/101/account',{method:'PUT',headers:{Origin:base,'Content-Type':'application/json'},body:'{"email":"guest@example.invalid"}'});assert.equal(r.status,401);
 r=await call('/api/admin');assert.equal(r.status,401);
 r=await call('/api/guest/logout',{method:'POST',headers:{Origin:'https://malicious.invalid'}});assert.equal(r.status,403);assert(!revoked);
 r=await call('/api/guest/logout',{method:'POST',headers:{Origin:base}});assert.equal(r.status,200);absorb(r);assert(revoked);assert(r.headers.getSetCookie().some(c=>/Max-Age=0/i.test(c)));
 r=await call('/api/guest/session');assert.equal((await r.json()).user,null);
 r=await call('/api/guest/bookings');assert.equal(r.status,401);
 r=await call('/auth/callback?error=access_denied&error_description=untrusted');assert.match(r.headers.get('Location'),/conta=erro/);assert(!r.headers.get('Location').includes('untrusted'));
 assert(exchanged>=1);console.log('Guest OAuth and bookings: PKCE, cookies, ownership adapter, booking link, notifications, logout, CSRF and admin isolation passed (mock Auth HTTP).');
}finally{if(app.exitCode===null){app.kill();await once(app,'exit');}await new Promise(r=>mock.close(r));}
