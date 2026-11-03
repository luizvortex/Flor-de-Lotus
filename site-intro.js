'use strict';
(() => {
 const root=document.documentElement,key='lotus-internal-navigation',now=Date.now();
 const nav=performance.getEntriesByType?.('navigation')?.[0]?.type||'navigate';
 let internal=false;
 try{
  const intents=JSON.parse(localStorage.getItem(key)||'[]').filter(item=>item&&typeof item.path==='string'&&Number.isFinite(item.time)&&now-item.time<8000&&now>=item.time);
  const match=intents.findIndex(item=>item.path===location.pathname);
  if(match>=0){internal=true;intents.splice(match,1);}
  localStorage.setItem(key,JSON.stringify(intents));
 }catch{}
 try{if(document.referrer&&new URL(document.referrer).origin===location.origin)internal=true;}catch{}
 if(nav==='reload')internal=false;
 if(nav==='back_forward')internal=true;
 if(!internal&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  root.classList.add('intro-enabled');
  setTimeout(()=>root.classList.add('intro-complete'),1600);
  document.addEventListener('animationend',event=>{if(event.animationName==='intro-curtain')root.classList.add('intro-complete');});
 }
 const remember=event=>{
  if(event.defaultPrevented||(event.type==='click'&&event.button!==0)||(event.type==='auxclick'&&event.button!==1))return;
  const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download'))return;
  try{
   const url=new URL(anchor.href,location.href);
   if(url.origin!==location.origin||!/^https?:$/.test(url.protocol)||/^\/(admin|minha-conta|api|auth)(\/|$)/.test(url.pathname))return;
   if(url.pathname===location.pathname&&url.search===location.search)return;
   const time=Date.now(),intents=JSON.parse(localStorage.getItem(key)||'[]').filter(item=>time-item.time<8000);
   // Store route and time only, never names, search parameters or guest data.
   intents.push({path:url.pathname,time});localStorage.setItem(key,JSON.stringify(intents.slice(-8)));
  }catch{}
 };
 document.addEventListener('click',remember,true);document.addEventListener('auxclick',remember,true);
 window.addEventListener('pageshow',event=>{if(event.persisted)root.classList.add('intro-complete');});
})();
