// Compiled Next -> isolated REST/Auth/Storage adapters -> real PostgreSQL/native booking SQL.
// Runs only against the dedicated Docker container. No production credentials or data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const container='lotus-romance-test',db='romance_e2e_'+Date.now();
async function command(args,input=''){const child=spawn('docker',['--host=unix:///var/run/docker.sock',...args],{stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>err+=c);child.stdin.end(input);await once(child,'exit');if(child.exitCode)throw Error(err);return out;}
await command(['exec',container,'createdb','-U','postgres','-T',(await readFile('work/romance-test-database.txt','utf8')).trim(),db]);
await command(['exec','-i',container,'psql','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],await readFile('supabase/migrations/20261029115950_romantic_catalog_options.sql','utf8'));
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
async function sql(statement,claims={},role='postgres'){const script=`begin;select set_config('request.jwt.claims',${literal(JSON.stringify(claims))},true);set local role ${role};${statement};commit;`;const out=await command(['exec','-i',container,'psql','-U','postgres','-d',db,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],script);const lines=out.trim().split('\n').filter(line=>line.startsWith('{')||line.startsWith('['));return JSON.parse(lines.at(-1)||'{}');}
const uid=randomUUID(),sid=randomUUID(),adminId=randomUUID(),adminSid=randomUUID(),otherId=randomUUID(),otherSid=randomUUID(),productId=randomUUID(),variantId=randomUUID();
const claim=(id,session)=>({sub:id,session_id:session,role:'authenticated'});
const guestClaim=claim(uid,sid),adminClaim=claim(adminId,adminSid),otherClaim=claim(otherId,otherSid);
const users=new Map();
for(const [id,session,token] of [[uid,sid,'guest'],[adminId,adminSid,'admin-test'],[otherId,otherSid,'other']]){
 const user={id,aud:'authenticated',role:'authenticated',email:id+'@example.invalid',created_at:new Date().toISOString(),app_metadata:{provider:'google',providers:['google']},user_metadata:{full_name:'Hóspede sintético'},identities:[{id,user_id:id,provider:'google',identity_data:{full_name:'Hóspede sintético'}}]};
 const jwt=token==='admin-test'?token:Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({...claim(id,session),exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})).toString('base64url')+'.test';
 users.set(jwt,{user,claims:claim(id,session)});
 await sql(`insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(${literal(id)},'authenticated','authenticated',${literal(user.email)},now(),'{}','{}',now(),now());insert into auth.sessions(id,user_id,created_at,updated_at) values(${literal(session)},${literal(id)},now(),now());insert into auth.identities(provider_id,user_id,identity_data,provider) values(${literal(id)},${literal(id)},'{}','google')`);
}
await sql(`insert into lotus_private.admin_users(user_id) values(${literal(adminId)});insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('Synthetic lower','casal',3,20000,1,'terreo'),('Synthetic upper','casal',3,20000,1,'superior');insert into lotus_private.occupancy_rates(floor,guests,amount) select floor,guests,guests*10000 from unnest(array['terreo','superior']) floor cross join generate_series(1,6) guests on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false`);
const fixtureProduct={id:productId,name:'Porta-retrato sintético',category:'lembrancas',description:'Produto exclusivamente de teste',photo:'/img casal/casal.jpg',active:true,max_quantity:2,photos_required:1,exclusive_group:'',position:1,variants:[{id:variantId,name:'Uma fotografia',price:5000,stock:3,active:true}]};
await sql(`select public.lotus_romance_api('admin_save',${literal(JSON.stringify(fixtureProduct))}::jsonb)`,adminClaim,'authenticated');
const defaults=JSON.parse(await readFile('src/lib/site-content-defaults.json','utf8'));defaults.romance.visible=true;defaults.romance.photos=[{url:'/media/romance-synthetic-test.svg',alt:'Imagem sintética para teste de layout'}];
// The schema accepts raster only: a tiny PNG fixture is served from public/media, never committed.
await mkdir('public/media',{recursive:true});const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0YQAAAAASUVORK5CYII=','base64');
await writeFile('public/media/romance-synthetic-test.png',png);defaults.romance.photos[0].url='/media/romance-synthetic-test.png';
const objects=new Map(),signatures=new Map();let published={content:defaults,revision:1};
const mock=createServer(async(req,res)=>{
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 try{
  const chunks=[];for await(const part of req)chunks.push(part);const body=Buffer.concat(chunks);const token=req.headers.authorization?.replace('Bearer ','');const actor=users.get(token);const claims=actor?.claims||{};const role=actor?'authenticated':'anon';const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'content-type,authorization,apikey,x-upsert,x-client-info'});res.end();return;}
  if(path==='/auth/v1/user')return json(actor?200:401,actor?actor.user:{message:'Invalid token'});
  if(path==='/auth/v1/settings')return json(200,{external:{google:true}});
  if(path==='/auth/v1/logout')return json(200,{});
  if(path.startsWith('/rest/v1/rpc/')){
   const name=path.split('/').pop();if(!/^lotus_[a-z_]+$/.test(name))return json(404,{});const data=JSON.parse(body||'{}');
   if(name==='lotus_site_api')return json(200,published);
   if(name==='lotus_policy_api')return json(200,{policies:{},revision:1});
   const params=name==='lotus_assignment_api'?`${literal(JSON.stringify(data.p_data))}::jsonb`:`${literal(data.p_operation)},${literal(JSON.stringify(data.p_data||{}))}::jsonb`;
   return json(200,await sql(`select public.${name}(${params})`,claims,role));
  }
  if(path.startsWith('/storage/v1/object/public/lotus-romance-private'))return json(403,{error:'Private bucket'});
  if(path.startsWith('/storage/v1/object/sign/')){
   const key=decodeURIComponent(path.slice('/storage/v1/object/sign/'.length));
   if(req.method==='POST'){
    const bucket=key.split('/')[0],name=key.slice(bucket.length+1);const row=await sql(`select coalesce(jsonb_agg(name),'[]') from storage.objects where bucket_id=${literal(bucket)} and name=${literal(name)}`,claims,role);
    if(!row.length)return json(403,{message:'Not authorized'});const signature=randomUUID();signatures.set(signature,{key,expires:Date.now()+120000});return json(200,{signedURL:'/object/sign/'+key+'?token='+signature});
   }
   const signed=signatures.get(new URL(req.url,'http://localhost').searchParams.get('token'));if(!signed||signed.key!==key||signed.expires<Date.now()||!objects.has(key))return json(403,{error:'Expired'});
   const object=objects.get(key),downloadName=new URL(req.url,'http://localhost').searchParams.get('download');res.writeHead(200,{'Content-Type':object.type,'Cache-Control':'private,no-store',...(downloadName?{'Content-Disposition':'attachment; filename="'+downloadName.replace(/[^a-zA-Z0-9.-]/g,'')+'"'}:{})});res.end(object.bytes);return;
  }
  if(path.startsWith('/storage/v1/object/')){
   const key=decodeURIComponent(path.slice('/storage/v1/object/'.length)),bucket=key.split('/')[0],name=key.slice(bucket.length+1);
   if(req.method==='POST'){
    await sql(`insert into storage.objects(bucket_id,name,owner,metadata) values(${literal(bucket)},${literal(name)},${literal(claims.sub||'00000000-0000-0000-0000-000000000000')},${literal(JSON.stringify({size:body.length,mimetype:req.headers['content-type']}))}::jsonb)`,claims,role);
    objects.set(key,{bytes:body,type:req.headers['content-type']});return json(200,{Key:key,Id:randomUUID()});
   }
   if(req.method==='DELETE'){
    const data=JSON.parse(body);for(const prefix of data.prefixes){const deleted=await sql(`with gone as(delete from storage.objects where bucket_id=${literal(bucket)} and name=${literal(prefix)} returning name) select coalesce(jsonb_agg(name),'[]') from gone`,claims,role);if(deleted.length)objects.delete(bucket+'/'+prefix);}
    return json(200,[]);
   }
  }
  return json(404,{message:'Not found'});
 }catch(error){const text=String(error.message),match=/ERROR:\s+(PT\d+|42501|23505|23514):\s*([^\n]+)/.exec(text);json(match?.[1]?.startsWith('PT')?Number(match[1].slice(2)):400,{code:match?.[1]||'TEST_FAILURE',message:match?.[2]||text.slice(0,300)});}
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');const backend=`http://127.0.0.1:${mock.address().port}`;
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,SUPABASE_URL:backend,LOTUS_BACKEND:'supabase',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
const [guestToken]=[...users].find(([,v])=>v.user.id===uid),[otherToken]=[...users].find(([,v])=>v.user.id===otherId);
const cookie=token=>'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:users.get(token).user})).toString('base64url');
try{
 for(let i=0;i<100;i++){if(app.exitCode!==null)throw Error('Next failed to start');try{if((await fetch(base+'/api/romance/catalog')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,150));}
 assert.equal((await fetch(base+'/api/romance/admin_orders')).status,401);
 assert.equal((await fetch(base+'/api/romance/book',{method:'POST',headers:{Origin:'https://malicious.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
 const browser=spawn('python3',['scripts/test-romance-flow-browser.py',base,cookie(guestToken),cookie(otherToken),variantId,backend],{stdio:'inherit'});await once(browser,'exit');assert.equal(browser.exitCode,0);
 const counts=await sql("select jsonb_build_object('orders',(select count(*) from lotus_private.romance_orders),'bookings',(select count(*) from lotus_private.bookings),'private_bucket',(select not public from storage.buckets where id='lotus-romance-private'))");
 assert.equal(counts.orders,1);assert.equal(counts.bookings,1);assert.equal(counts.private_bucket,true);
 console.log('PASS: compiled Next, real native reservation SQL, private Storage policies, owner/admin separation, one linked order and pending booking. No production writes.');
}finally{await unlink('public/media/romance-synthetic-test.png').catch(()=>{});app.kill('SIGTERM');mock.closeAllConnections();await new Promise(resolve=>mock.close(resolve));await command(['exec',container,'dropdb','-U','postgres','--force',db]);}
