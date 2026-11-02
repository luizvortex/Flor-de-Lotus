import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000});base=sys.argv[1]
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda r:r.abort())
 page.goto(base+'/',wait_until='domcontentloaded')
 assert page.locator('#instagram-title').inner_text()=='Conheça nosso Instagram'
 assert page.locator('#instagram .pousada-gallery').count()==0
 assert page.locator('#instagram .instagram-background').get_attribute('src')
 assert page.locator('#instagram .instagram-photo').count()==2
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  feature=page.locator('#instagram .instagram-feature');feature.scroll_into_view_if_needed()
  assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  assert page.locator('#instagram .instagram-link').is_visible()
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('#instagram').screenshot(path='work/instagram-desktop.png')
 page.set_viewport_size({'width':390,'height':1000})
 page.locator('#instagram').screenshot(path='work/instagram-mobile.png')
 page.set_viewport_size({'width':1440,'height':1000})
 data=context.request.get(base+'/api/site-content').json();content=data['content']
 # Old publications receive the new section without losing their custom order.
 import copy
 old=copy.deepcopy(content);del old['instagram'];old['layout']['order']=old['layout']['order'].replace('instagram\n','')
 preview=context.request.post(base+'/api/site-preview',data={'content':old,'page':'index'});assert preview.status==200
 html=preview.json()['html'];assert html.index('id="area-de-lazer"')<html.index('id="instagram"')<html.index('id="praias"')
 # Legacy custom artwork is preserved when the three new fields are absent.
 legacy=copy.deepcopy(content)
 legacy['instagram']['photos']=list(reversed(content['gallery']['photos'][:3]))
 for key in ['backgroundImage','firstImage','secondImage']:legacy['instagram'].pop(key,None)
 preview=context.request.post(base+'/api/site-preview',data={'content':legacy,'page':'index'})
 assert preview.status==200
 assert 'class="instagram-background" src="'+legacy['instagram']['photos'][0]['url']+'"' in preview.json()['html']
 page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="instagram"]').click()
 assert page.locator('[data-list-add="instagram.photos"]').count()==0
 assert page.locator('[data-cms-item^="instagram.photos"]').count()==0
 assert page.locator('[data-cms-field="instagram.desktopDelay"]').count()==0
 from PIL import Image
 from io import BytesIO
 uploads={}
 for index,key in enumerate(['backgroundImage','firstImage','secondImage']):
  buf=BytesIO();Image.new('RGB',(120,150),['red','green','blue'][index]).save(buf,format='PNG')
  field='instagram.'+key
  page.locator(f'[data-cms-upload="{field}"]').set_input_files({'name':key+'.png','mimeType':'image/png','buffer':buf.getvalue()})
  page.wait_for_function("field=>document.querySelector('[data-cms-field=\"'+field+'\"]').value.includes('/lotus-site/')",arg=field)
  page.wait_for_function("!document.querySelector('[data-cms-action=save]').disabled")
  uploads[key]=page.locator(f'[data-cms-field="{field}"]').input_value()
 page.locator('[data-cms-action="save"]').click();page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 page.goto(base+'/',wait_until='domcontentloaded')
 assert page.locator('.instagram-background').get_attribute('src')==uploads['backgroundImage']
 assert page.locator('.instagram-photo img').nth(0).get_attribute('src')==uploads['firstImage']
 assert page.locator('.instagram-photo img').nth(1).get_attribute('src')==uploads['secondImage']
 assert page.locator('#instagram .pousada-gallery').count()==0
 stored=context.request.get(base+'/api/site-content').json()['content']['instagram']
 for key,url in uploads.items():assert stored[key]==url
 browser.close();print('PASS: fixed Instagram container, legacy artwork preserved, three image uploads and publication, no gallery or add controls, responsive layout.')
