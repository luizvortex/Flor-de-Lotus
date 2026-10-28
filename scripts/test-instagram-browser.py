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
 content['instagram']['photos']=content['gallery']['photos'][:3]
 content['instagram']['desktopDelay']=2;content['gallery']['desktopDelay']=30
 response=context.request.put(base+'/api/site-content',data={'content':content,'revision':data['revision']});assert response.status==200
 page.goto(base+'/',wait_until='networkidle')
 gallery=page.locator('#instagram .pousada-gallery');gallery.scroll_into_view_if_needed()
 assert gallery.locator('.pousada-gallery-slide:not([aria-hidden="true"])').count()==3
 assert gallery.locator('a').first.get_attribute('href')==content['branding']['instagram']
 assert gallery.locator('[aria-hidden="true"] a').first.get_attribute('tabindex')=='-1'
 track=gallery.locator('.pousada-gallery-track');original=page.locator('#galeria-pousada .pousada-gallery-track').evaluate('i=>i.style.transform')
 before=track.evaluate('i=>i.style.transform');gallery.locator('[data-gallery-next]').click()
 page.wait_for_timeout(1100)
 assert track.evaluate('i=>i.style.transform')!=before
 assert page.locator('#galeria-pousada .pousada-gallery-track').evaluate('i=>i.style.transform')==original
 assert gallery.locator('[data-gallery-status]').inner_text()=='Foto 2 de 3'
 page.wait_for_timeout(950);before=track.evaluate('i=>i.style.transform')
 page.wait_for_timeout(2200)
 assert track.evaluate('i=>i.style.transform')!=before
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  sizes=gallery.locator('.pousada-gallery-slide').evaluate_all('items=>items.slice(0,3).map(i=>({w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height}))')
  assert all(abs(size['w']/size['h']-4/3)<.02 for size in sizes)
 page.set_viewport_size({'width':1440,'height':1000});page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="instagram"]').click()
 assert page.locator('[data-cms-field="instagram.title"]').input_value()=='Conheça nosso Instagram'
 assert page.locator('[data-cms-item="instagram.photos.0"] > summary').inner_text().startswith('Foto 1 ·')
 page.locator('[data-cms-item="instagram.photos.0"] > summary').click()
 assert page.locator('[data-cms-upload="instagram.photos.0.url"]').count()==1
 assert page.locator('[data-cms-crop="instagram.photos.0.url"]').is_visible()
 page.locator('[data-cms-field="instagram.title"]').fill('Nosso Instagram de teste')
 page.locator('[data-cms-action="save"]').click();page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 page.goto(base+'/',wait_until='domcontentloaded');assert page.locator('#instagram-title').inner_text()=='Nosso Instagram de teste'
 browser.close();print('Instagram: legacy migration, section placement, editable content, photo ordering/framing, independent galleries, arrows, autoplay and mobile sizing passed.')
