import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 base=sys.argv[1];context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda r:r.abort())
 page.goto(base+'/admin',wait_until='networkidle');page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="gallery"]').click()
 page.locator('[data-cms-item="gallery.photos.0"] > summary').click()
 field='[data-cms-field="gallery.photos.0.url"]';old=page.locator(field).input_value()
 page.evaluate('''()=>{const c=document.createElement('canvas');c.width=400;c.height=100;const x=c.getContext('2d');x.fillStyle='#f00';x.fillRect(0,0,133,100);x.fillStyle='#0f0';x.fillRect(133,0,134,100);x.fillStyle='#00f';x.fillRect(267,0,133,100);c.toBlob(b=>{const d=new DataTransfer();d.items.add(new File([b],'bands.png',{type:'image/png'}));const i=document.querySelector('[data-cms-upload="gallery.photos.0.url"]');i.files=d.files;i.dispatchEvent(new Event('change'));});}''')
 page.wait_for_function('old=>document.querySelector(\'[data-cms-field="gallery.photos.0.url"]\').value!==old',arg=old)
 page.locator('[data-cms-crop="gallery.photos.0.url"]').click();page.locator('.cms-crop[open]').wait_for()
 assert page.locator('[data-crop-ratio]').is_disabled()
 frame=page.locator('.cms-crop-frame');box=frame.bounding_box()
 page.mouse.move(box['x']+box['width']-10,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']-1000,box['y']+box['height']/2,steps=10);page.mouse.up()
 old=page.locator(field).input_value();page.get_by_role('button',name='Aplicar enquadramento',exact=True).click()
 page.wait_for_function('old=>document.querySelector(\'[data-cms-field="gallery.photos.0.url"]\').value!==old&&!document.querySelector(\'[data-cms-action="save"]\').disabled',arg=old)
 result=page.evaluate('''async()=>{const b=await createImageBitmap(await(await fetch(document.querySelector('[data-cms-field="gallery.photos.0.url"]').value)).blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const x=c.getContext('2d');x.drawImage(b,0,0);return {w:b.width,h:b.height,p:Array.from(x.getImageData(b.width/2,b.height/2,1,1).data)};}''')
 assert result['w']*3==result['h']*4 and result['p'][2]>200 and result['p'][0]<30,result
 old=page.locator(field).input_value();page.locator('[data-cms-crop="gallery.photos.0.url"]').click();page.locator('.cms-crop[open]').wait_for();page.keyboard.press('Escape');assert page.locator(field).input_value()==old
 # The original remains available for a second adjustment during this session.
 page.locator('[data-cms-crop="gallery.photos.0.url"]').click();page.locator('.cms-crop[open]').wait_for();frame.focus();page.keyboard.press('ArrowLeft');page.locator('[data-crop-zoom]').fill('1.5');page.get_by_role('button',name='Centralizar',exact=True).click();assert page.locator('[data-crop-zoom]').input_value()=='1';page.keyboard.press('Escape')
 page.locator('[data-cms-action="save"]').click();page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 page.reload(wait_until='networkidle');page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="gallery"]').click();page.locator('[data-cms-item="gallery.photos.0"] > summary').click()
 page.locator('[data-cms-crop="gallery.photos.0.url"]').click();page.locator('.cms-crop[open]').wait_for();assert page.locator('.cms-crop img').evaluate('i=>i.naturalWidth/i.naturalHeight')==4;page.keyboard.press('Escape')
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-cms-crop="gallery.photos.0.url"]').click();page.locator('.cms-crop[open]').wait_for();assert page.locator('.cms-crop').bounding_box()['width']<=390;page.keyboard.press('Escape')
 browser.close();print('Photo crop: drag selects right-hand content, exact 4:3, cancel, original reuse, keyboard, zoom, publication and mobile dialog passed.')
