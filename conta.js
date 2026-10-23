'use strict';
(() => {
 const dialog=document.getElementById('guest-account');
 if(!dialog)return;
 const triggers=document.querySelectorAll('[data-guest-account]');
 const loading=dialog.querySelector('[data-account-loading]');
 const login=dialog.querySelector('[data-account-login]');
 const profile=dialog.querySelector('[data-account-profile]');
 const message=dialog.querySelector('[data-account-message]');
 const google=dialog.querySelector('[data-google-login]');
 const avatar=dialog.querySelector('[data-account-avatar]');
 let requestId=0, pendingSession, opener;
 function session(){
  if(!pendingSession)pendingSession=fetch('/api/guest/session',{cache:'no-store'}).then(async response=>{
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível consultar sua conta. Tente novamente.');return result;
  }).finally(()=>{pendingSession=null;});
  return pendingSession;
 }
 function paintAvatar(img,url){
  img.hidden=true;img.removeAttribute('src');
  if(!url)return;
  try{const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.googleusercontent.com'))return;}catch{return;}
  img.onerror=()=>{img.hidden=true;};img.onload=()=>{img.hidden=false;};img.src=url;
 }
 function showUser(user){
  triggers.forEach(button=>{
   const img=button.querySelector('img');if(img)paintAvatar(img,user?.avatar_url);
   button.classList.toggle('has-guest-profile',Boolean(user));
  });
  login.hidden=Boolean(user);profile.hidden=!user;
  if(!user)return;
  dialog.querySelector('[data-account-name]').textContent=user.name;
  dialog.querySelector('[data-account-email]').textContent=user.email;
  paintAvatar(avatar,user.avatar_url);
 }
 async function load(){
  const id=++requestId;
  loading.hidden=false;login.hidden=true;profile.hidden=true;message.textContent='';
  try{
   const result=await session();
   if(id!==requestId)return;
   showUser(result.user);google.disabled=result.google_enabled!==true;
   if(!result.user&&result.google_enabled!==true)message.textContent=result.google_enabled===false?'O login com Google estará disponível em breve.':'Não foi possível conectar ao serviço de login. Tente novamente em instantes.';
  }catch(e){if(id===requestId){message.textContent=e.message;login.hidden=false;google.disabled=true;}}
  finally{if(id===requestId)loading.hidden=true;}
 }
 triggers.forEach(button=>button.addEventListener('click',()=>{
  opener=button;
  const menu=document.getElementById('home-menu');if(menu?.open)menu.close();
  dialog.showModal();document.body.classList.add('guest-account-open');load();
 }));
 dialog.querySelector('[data-account-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  document.body.classList.remove('guest-account-open');
  if(opener?.closest('#home-menu'))document.querySelector('.home-menu-toggle')?.focus({preventScroll:true});
 });
 dialog.querySelector('[data-account-logout]').addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;message.textContent='';
  try{
   const response=await fetch('/api/guest/logout',{method:'POST'});
   if(!response.ok)throw Error('Não foi possível sair. Tente novamente.');
   showUser(null);await load();
  }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
 });
 // Read the validated profile once; neither tokens nor email are stored in localStorage.
 session().then(result=>{if(result?.user)showUser(result.user);}).catch(()=>{});
 const url=new URL(location.href),state=url.searchParams.get('conta');
 if(state){
  triggers[0]?.click();
  if(state==='erro'||state==='indisponivel'){
   message.textContent=state==='erro'?'O login não foi concluído. Abra sua conta e tente novamente.':'O login com Google ainda não está disponível.';
  }
  url.searchParams.delete('conta');history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
})();
