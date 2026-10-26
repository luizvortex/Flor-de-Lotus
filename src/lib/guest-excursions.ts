import {NextRequest} from 'next/server';
import {guestClient,privateResponse} from './guest-auth';
export async function guestExcursionOperation(request:NextRequest,operation:'create'|'mine'|'manifest',data:Record<string,unknown>={}){
 const response=privateResponse();const supabase=guestClient(request,response);
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:response.headers});
 try{
  const {data:identity,error}=await supabase.auth.getUser();
  if(error||!identity.user?.identities?.some(i=>i.provider==='google'))return reply({error:'Entre com Google para acessar seus grupos.'},error&&(!error.status||error.status>=500)?503:401);
  const {data:result,error:failure}=await supabase.rpc('lotus_excursion_api',{p_operation:operation,p_data:data});
  if(failure){const match=/^PT(400|401|403|404|409)$/.exec(failure.code||'');return reply({error:match?failure.message:'Não foi possível concluir a solicitação do grupo.'},match?Number(match[1]):503);}
  return reply(result,operation==='create'?201:200);
 }catch{return reply({error:'Não foi possível conectar aos grupos. Tente novamente.'},503);}
}
