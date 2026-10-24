// Real Next.js routes + browser editor against an isolated fake Supabase.
// Production Postgres permissions are separately tested with a rollback transaction.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
const defaults=JSON.parse(await readFile('src/lib/site-content-defaults.json','utf8'));
let document={content:structuredClone(defaults),revision:1};const history=[];const stored=new Map();
const mock=createServer(async(req,res)=>{
 const chunks=[];for await(const part of req)chunks.push(part);const bytes=Buffer.concat(chunks);
 const token=req.headers.authorization?.replace('Bearer ','');
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(value));};
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'PUT,GET,OPTIONS','Access-Control-Allow-Headers':'content-type,x-upsert'});res.end();return;}
 if(req.url.startsWith('/storage/v1/object/upload/sign/')){
  if(req.method==='POST'){assert.equal(token,'admin-test');return json(200,{url:req.url.replace('/storage/v1','')+'?token=signed-test'});}
  assert.equal(new URL(req.url,'http://localhost').searchParams.get('token'),'signed-test');stored.set(req.url.split('?')[0].split('/').pop(),{bytes,type:req.headers['content-type']});return json(200,{ok:true});
 }
 if(req.url.startsWith('/storage/v1/object/public/lotus-site/')){const item=stored.get(req.url.split('/').pop());if(!item)return json(404,{});res.writeHead(200,{'Content-Type':item.type,'Access-Control-Allow-Origin':'*'});res.end(item.bytes);return;}
 const data=bytes.length?JSON.parse(bytes):{};
 if(req.url.startsWith('/auth/v1/token'))return json(200,{access_token:data.email==='admin@example.invalid'?'admin-test':'guest-test',refresh_token:'refresh-test',expires_in:3600});
 if(req.url==='/auth/v1/logout?scope=local')return json(200,{});
 if(req.url==='/rest/v1/rpc/lotus_api')return json(200,{authenticated:token==='admin-test'});
 if(req.url==='/rest/v1/rpc/lotus_room_catalog_api')return json(200,{rooms:[],packages:[],bookings:[]});
 if(req.url==='/rest/v1/rpc/lotus_showcase_api')return json(200,{showcases:[]});
 if(req.url==='/rest/v1/rpc/lotus_policy_api')return json(200,{policies:{},revision:1});
 if(req.url==='/rest/v1/rpc/lotus_site_api'){
  const op=data.p_operation,d=data.p_data;
  if(op==='read')return json(200,document);
  if(token!=='admin-test')return json(401,{code:'PT401',message:'Entre no painel.'});
  if(op==='history')return json(200,{versions:history.map(v=>({revision:v.revision,published_at:new Date().toISOString()})).reverse()});
  if(d.revision!==document.revision)return json(409,{code:'PT409',message:'O site foi alterado em outra janela. Recarregue antes de publicar.'});
  const content=op==='restore'?history.find(v=>v.revision===d.target)?.content:d.content;
  history.push(structuredClone(document));document={content,revision:document.revision+1};return json(200,document);
 }
 return json(404,{});
});
mock.listen(0,'127.0.0.1');await once(mock,'listening');const backend=`http://127.0.0.1:${mock.address().port}`;
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,SUPABASE_URL:backend,LOTUS_BACKEND:'supabase',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
async function request(path,data,auth=true,method){return fetch(base+'/api/'+path,{method:method||(data?'POST':'GET'),headers:{...(auth?{Cookie:'lotus_access=admin-test'}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});}
try{
 for(let i=0;i<100;i++){if(app.exitCode!==null)throw Error('Next.js failed to start');try{if((await fetch(base+'/api/session',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 console.log('Editor integration server ready');
 if(process.argv.includes('--contact-only')){const browser=spawn('python',['scripts/test-contact-browser.py',base],{stdio:'inherit'});await once(browser,'exit');assert.equal(browser.exitCode,0);}else{
 assert.equal((await request('site-content',undefined,false)).status,401);
 assert.equal((await request('site-upload',{type:'video/mp4',size:100},false)).status,401);
 const legacyReviews=structuredClone(defaults);legacyReviews.reviews={visible:true,title:'Título personalizado',description:'Texto mantido',moreLabel:'Ver mais',items:defaults.reviews.items.slice(0,3).map(r=>({name:r.name,description:r.description,source:r.source,rating:5}))};
 const legacyReviewPreview=await request('site-preview',{content:legacyReviews,page:'avaliacoes'});assert.equal(legacyReviewPreview.status,200);const legacyHtml=(await legacyReviewPreview.json()).html;assert.ok(legacyHtml.includes('Rita'));assert.ok(legacyHtml.includes('Ramon'));
 for(const change of [c=>c.reviews.platforms[0].score='11',c=>c.reviews.platforms[0].scale=7,c=>c.reviews.items[0].description='',c=>c.reviews.items[0].date='2026-02-30',c=>c.reviews.items[0].sourceUrl='javascript:alert(1)']){const invalid=structuredClone(defaults);change(invalid);assert.equal((await request('site-preview',{content:invalid,page:'avaliacoes'})).status,400);}
 const emptyReviews=structuredClone(defaults);emptyReviews.reviews.items=[];const emptyPreview=await request('site-preview',{content:emptyReviews,page:'avaliacoes'});assert.equal(emptyPreview.status,200);assert.ok(!(await emptyPreview.json()).html.includes('data-review-source='));
 const oldContact=structuredClone(defaults);for(const key of ['eyebrow','description','formTitle','intro','buttonLabel','defaultMessage'])delete oldContact.contact[key];oldContact.contact.title='Converse com a pousada';const contactPreview=await request('site-preview',{content:oldContact});assert.equal(contactPreview.status,200);const contactHtml=(await contactPreview.json()).html;assert.ok(contactHtml.includes('Converse com a pousada'));assert.ok(contactHtml.includes('data-default-message='));
 const validation=await request('site-preview',{content:defaults});if(validation.status!==200)throw Error(JSON.stringify(await validation.json()));
 const read=await(await request('site-content')).json();assert.ok(read.content,read.error);assert.equal(read.content.hero.limit,5);assert.equal(read.sections.length,12);
 let invalid=structuredClone(defaults);invalid.hero.video='javascript:alert(1)';assert.equal((await request('site-content',{content:invalid,revision:1},true,'PUT')).status,400);
 invalid=structuredClone(defaults);invalid.gallery.photos=[];assert.equal((await request('site-content',{content:invalid,revision:1},true,'PUT')).status,400);
 invalid=structuredClone(defaults);invalid.layout.order='about\nabout';assert.equal((await request('site-content',{content:invalid,revision:1},true,'PUT')).status,400);
 assert.equal((await request('site-upload',{type:'text/html',size:100})).status,400);
 assert.equal((await request('site-upload',{type:'video/mp4',size:51*1024*1024})).status,400);
 const ticket=await(await request('site-upload',{type:'video/mp4',size:100})).json();assert.ok(ticket.uploadUrl.startsWith(backend+'/storage/v1/object/upload/sign/lotus-site/'));assert.ok(ticket.url.endsWith('.mp4'));
 const changed=structuredClone(defaults);changed.about.title='Minha pousada de teste';changed.gallery.photos=changed.gallery.photos.slice(0,2);changed.leisure.items[0].title='Sinuca de teste';changed.beaches.items[0].photos[0].alt='Praia de teste';changed.catalog.heading='Escolha seu descanso';changed.layout.blocks=[{id:'oferta-teste',visible:true,title:'Bloco de teste',description:'Texto <script>alert(1)</script>',image:'',alt:'',button:'Conheça',url:'/quartos',after:'about',tone:'areia',position:'direita'}];
 const before=JSON.stringify(document);
 const preview=await request('site-preview',{content:changed});assert.equal(preview.status,200);const previewHtml=(await preview.json()).html;assert.ok(previewHtml.includes('Minha pousada de teste'));assert.ok(previewHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.equal(JSON.stringify(document),before);
 assert.equal((await request('site-content',{content:changed,revision:1},true,'PUT')).status,200);
 assert.equal((await request('site-content',{content:changed,revision:1},true,'PUT')).status,409);
 const publicHtml=await(await fetch(base+'/')).text();assert.ok(publicHtml.includes('Minha pousada de teste'));assert.ok(publicHtml.includes('href="/itacare"'));assert.ok(!publicHtml.includes('id="praias-select"'));assert.ok(publicHtml.includes('extra-oferta-teste'));
 const guide=await(await fetch(base+'/itacare')).text();assert.ok(guide.includes('Praia de teste'));assert.ok(guide.includes('4 praias + cachoeira'));assert.ok(guide.includes('Jeribucaçu, Usina e Arruda'));assert.ok(guide.includes('Agosto e setembro'));
 const old=structuredClone(defaults);for(const key of ['eyebrow','description','moreLabel','cover','pageTitle','pageDescription','toursTitle','toursDescription','tours'])delete old.beaches[key];for(const item of old.beaches.items)for(const key of ['category','featured','description','highlights'])delete item[key];
 const oldPreview=await request('site-preview',{content:old,page:'itacare'});assert.equal(oldPreview.status,200);assert.ok((await oldPreview.json()).html.includes('Agosto e setembro'));
 const catalog=await(await fetch(base+'/quartos')).text();assert.ok(catalog.includes('Escolha seu descanso'));
 assert.equal((await request('site-restore',{revision:2,target:1})).status,200);assert.deepEqual(document.content,defaults);
 const contactBrowser=spawn('python',['scripts/test-contact-browser.py',base],{stdio:'inherit'});await once(contactBrowser,'exit');assert.equal(contactBrowser.exitCode,0);
 const exploreBrowser=spawn('python',['scripts/test-itacare-browser.py',base],{stdio:'inherit'});await once(exploreBrowser,'exit');assert.equal(exploreBrowser.exitCode,0);
 const reviewsBrowser=spawn('python',['scripts/test-reviews-browser.py',base],{stdio:'inherit'});await once(reviewsBrowser,'exit');assert.equal(reviewsBrowser.exitCode,0);
 document={content:structuredClone(defaults),revision:document.revision+1};
 const browser=spawn('python',['scripts/test-site-editor-browser.py',base],{stdio:'inherit'});await once(browser,'exit');assert.equal(browser.exitCode,0);
 const professionalBrowser=spawn('python',['scripts/test-professional-browser.py',base],{stdio:'inherit'});await once(professionalBrowser,'exit');assert.equal(professionalBrowser.exitCode,0);
 console.log('Site editor API, preview, uploads, publication, history and browser flow: passed.');
 }
}finally{app.kill('SIGTERM');mock.closeAllConnections();await new Promise(r=>mock.close(r));}
