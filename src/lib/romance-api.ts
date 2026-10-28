import {NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {guestClient,privateResponse,sameOrigin} from './guest-auth';
import {safeMedia} from './site-content-schema';
import {supabaseUrl,supabaseKey} from './supabase-config';
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
async function bytes(request:NextRequest,limit:number){const reader=request.body?.getReader();if(!reader)throw new Failure(400,'Dados inválidos.');let size=0;const parts:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Failure(413,'O arquivo ou pedido excede o limite permitido.');}parts.push(value);}return Buffer.concat(parts);}
export async function romanceApi(request:NextRequest,operation:string){
 const response=privateResponse();response.headers.set('Referrer-Policy','no-referrer');
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:response.headers});
 try{
  if(request.method!=='GET'&&!sameOrigin(request))throw new Failure(403,'Origem não permitida.');
  const methods:Record<string,string>={catalog:'GET',quote:'POST',book:'POST',draft:'POST',mine:'GET',upload:'POST',remove:'POST',file:'GET',admin_products:'GET',admin_save:'POST',admin_orders:'GET',admin_status:'POST',admin_file:'GET',admin_remove_photos:'POST'};
  if(methods[operation]!==request.method)throw new Failure(404,'Operação não encontrada.');
  const admin=operation.startsWith('admin_');
  const token=admin?request.cookies.get('lotus_access')?.value:undefined;
  if(admin&&!token)throw new Failure(401,'Entre no painel para gerenciar a decoração.');
  const timedFetch:typeof fetch=(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(15000)});
  const client=admin?createClient(supabaseUrl,supabaseKey,{global:{fetch:timedFetch,headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}}):['catalog','quote'].includes(operation)?createClient(supabaseUrl,supabaseKey,{global:{fetch:timedFetch},auth:{persistSession:false,autoRefreshToken:false}}):guestClient(request,response);
  if(!admin&&!['catalog','quote'].includes(operation)){
   const {data,error}=await client.auth.getUser();
   if(error||!data.user?.identities?.some(i=>i.provider==='google'))throw new Failure(401,'Entre com Google para personalizar sua reserva.');
  }
  const rpc=async(op:string,data:Record<string,unknown>={})=>{const {data:result,error}=await client.rpc('lotus_romance_api',{p_operation:op,p_data:data});if(error){const match=/^PT(400|401|403|404|409)$/.exec(error.code||'');throw new Failure(match?Number(match[1]):503,match?error.message:'Não foi possível concluir a experiência. Tente novamente.');}return result;};
  if(operation==='upload'){
   const type=request.headers.get('content-type')||'';if(!type.startsWith('multipart/form-data;'))throw new Failure(415,'Envie uma fotografia.');
   const buffer=await bytes(request,3145728+65536),form=await new Response(new Uint8Array(buffer),{headers:{'Content-Type':type}}).formData();
   const file=form.get('photo'),requestId=String(form.get('request_id')||'');
   if(!(file instanceof File)||!file.size||file.size>3145728)throw new Failure(400,'Envie uma foto de até 3 MB.');
   const content=Buffer.from(await file.arrayBuffer());
   const mime=content.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg':content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP'?'image/webp':'';
   if(!mime||mime!==file.type)throw new Failure(415,'Use fotografias JPG, PNG ou WebP.');
   const registered=await rpc('upload_register',{request_id:requestId,extension:mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp'});
   const {error}=await client.storage.from('lotus-romance-private').upload(registered.path,content,{contentType:mime,upsert:false});
   if(error){await rpc('upload_remove',{id:registered.id});throw new Failure(503,'Não foi possível enviar a fotografia. Tente novamente.');}
   return reply({id:registered.id},201);
  }
  let data:Record<string,unknown>={};
  if(request.method!=='GET'){
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new Failure(415,'Use application/json.');
   try{data=JSON.parse((await bytes(request,65536)).toString('utf8'));}catch(e){if(e instanceof Failure)throw e;throw new Failure(400,'Pedido inválido.');}
   if(!data||typeof data!=='object'||Array.isArray(data))throw new Failure(400,'Pedido inválido.');
  }
  if(operation==='admin_remove_photos'){
   const pending=await rpc('admin_purge_paths',{id:data.id});
   if(pending.paths.length){const {error}=await client.storage.from('lotus-romance-private').remove(pending.paths);if(error)throw new Failure(503,'Não foi possível excluir todas as fotos. Tente novamente.');}
   return reply(await rpc('admin_purge_finish',{id:data.id}));
  }
  if(['file','admin_file','remove'].includes(operation)){
   const id=operation==='remove'?data.id:request.nextUrl.searchParams.get('id');
   const file=await rpc('file_access',{id});
   if(operation==='remove'){
    const {error}=await client.storage.from('lotus-romance-private').remove([file.path]);if(error)throw new Failure(503,'Não foi possível remover a foto.');
    return reply(await rpc('upload_remove',{id}));
   }
   const {data:signed,error}=await client.storage.from('lotus-romance-private').createSignedUrl(file.path,120);
   if(error||!signed)throw new Failure(503,'Não foi possível abrir a fotografia.');
   return reply({url:signed.signedUrl,expires_in:120});
  }
  if(operation==='admin_save'&&data.photo&&(!safeMedia(String(data.photo),'image')))throw new Failure(400,'Envie uma fotografia pelo painel.');
  return reply(await rpc(operation,data),operation==='book'?201:200);
 }catch(error){return reply({error:error instanceof Failure?error.message:'Não foi possível conectar à experiência. Tente novamente.'},error instanceof Failure?error.status:503);}
}
