import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();errors=[];tickets=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.on('request',lambda request:tickets.append(request.post_data_json) if request.url.endswith('/api/site-upload') else None)
 page.route('https://**',lambda route:route.abort())
 page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="site"]').click()
 page.locator('[data-cms-section="about"]').click()
 assert page.locator('[data-media-choice]').count()==0
 assert page.get_by_text('Usar uma imagem já presente no site').count()==0
 page.locator('[data-cms-upload="about.image"]').set_input_files('img Pousada/frentepousada.jpg')
 page.wait_for_function('''()=>document.querySelector('[data-cms-field="about.image"]').value.includes('/storage/v1/object/public/lotus-site/')''')
 page.wait_for_function('''()=>!document.querySelector('[data-cms-action="save"]').disabled''')
 tickets.clear()
 previous=page.locator('[data-cms-field="about.image"]').input_value()
 size=page.evaluate('''async()=>{
  const bytes=await(await fetch('/img%20Pousada/FlordeLotus2.png')).arrayBuffer();
  const file=new File([bytes,new Uint8Array(51*1024*1024)],'foto-grande.png',{type:'image/png'});
  const transfer=new DataTransfer();transfer.items.add(file);
  const input=document.querySelector('[data-cms-upload="about.image"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return file.size;
 }''')
 assert size>50*1024*1024
 page.wait_for_function('''previous=>{const value=document.querySelector('[data-cms-field="about.image"]').value;return value!==previous&&value.includes('/storage/v1/object/public/lotus-site/')}''',arg=previous,timeout=30000)
 assert tickets and tickets[-1]['size']<3*1024*1024
 assert tickets[-1]['type']=='image/webp'
 assert page.locator('[data-cms-action="save"]').is_enabled()
 page.locator('[data-cms-action="save"]').click()
 page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 page.goto(base+'/',wait_until='domcontentloaded')
 assert '/storage/v1/object/public/lotus-site/' in page.locator('.foto-sobre-pousada').get_attribute('src')
 assert not errors,errors
 context.close();browser.close()
 print('Original photo above 50 MB optimized, uploaded and published; existing-image selector removed: passed.')
