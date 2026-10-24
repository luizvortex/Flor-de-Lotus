import sys, json
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**',lambda r:r.abort())
 page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="site"]').click()
 page.locator('[data-cms-section="about"]').click()
 page.locator('[data-cms-field="about.title"]').fill('Pousada editada pelo painel')
 # Real signed URL upload flow into isolated Storage, followed by publication.
 page.locator('[data-cms-upload="about.image"]').set_input_files('img Pousada/frentepousada.jpg')
 page.wait_for_function("document.querySelector('[data-cms-field=\"about.image\"]')?.value.includes('/storage/v1/object/public/lotus-site/')")
 page.locator('[data-cms-action="preview"]').click()
 page.locator('.cms-preview[open]').wait_for()
 page.frame_locator('.cms-preview iframe').locator('#sobre-a-pousada h2').first.wait_for()
 assert 'Pousada editada pelo painel' in page.frame_locator('.cms-preview iframe').locator('#sobre-a-pousada h2').first.inner_text()
 page.locator('.cms-preview .close').click()
 page.locator('[data-cms-action="save"]').click()
 page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 public=context.new_page();public.route('https://**',lambda r:r.abort());public.goto(base+'/',wait_until='networkidle')
 assert public.locator('#sobre-a-pousada h2').first.inner_text()=='Pousada editada pelo painel'
 assert '/storage/v1/object/public/lotus-site/' in public.locator('.foto-sobre-pousada').get_attribute('src')
 assert public.locator('.foto-sobre-pousada').evaluate('(i)=>i.complete && i.naturalWidth>0')
 # Gallery: two photos are supported; reordering retains the change when navigating.
 page.locator('[data-cms-section="gallery"]').click()
 page.locator('.cms-list-item summary').first.click()
 page.locator('[data-list-move="gallery.photos"][data-direction="1"]').first.click()
 page.locator('[data-cms-section="layout"]').click()
 page.locator('[data-order-index="0"][data-direction="1"]').click()
 page.locator('[data-list-add="layout.blocks"]').click()
 if not page.locator('.cms-list-item').first.evaluate('(el)=>el.open'):page.locator('.cms-list-item summary').first.click()
 assert page.locator('[data-cms-field="layout.blocks.0.title"]').is_visible()
 # A draft survives the polling interval and navigation away/back.
 page.locator('[data-cms-section="about"]').click()
 page.locator('[data-cms-field="about.title"]').fill('Rascunho não publicado')
 page.wait_for_timeout(16000)
 assert page.locator('[data-cms-field="about.title"]').input_value()=='Rascunho não publicado'
 page.locator('[data-tab="overview"]').click();page.locator('[data-tab="site"]').click()
 assert page.locator('[data-cms-field="about.title"]').input_value()=='Rascunho não publicado'
 # Discard instead of publishing the intentionally incomplete block.
 page.on('dialog',lambda d:d.accept())
 page.locator('[data-cms-action="reload"]').click()
 page.wait_for_function("document.querySelector('[data-cms-field=\"about.title\"]')?.value==='Pousada editada pelo painel'")
 # Replace the hero video through the same upload interface, including an automatic cover.
 page.locator('[data-cms-section="hero"]').click()
 page.locator('[data-cms-upload="hero.video"]').set_input_files('media/jardim-loop-5s-mobile.mp4')
 page.wait_for_function("document.querySelector('[data-cms-field=\"hero.video\"]')?.value.includes('/storage/v1/object/public/lotus-site/')")
 assert page.locator('[data-cms-field="hero.mobileVideo"]').input_value()==''
 assert page.locator('[data-cms-field="hero.animation"]').input_value()==''
 assert '/storage/v1/object/public/lotus-site/' in page.locator('[data-cms-field="hero.poster"]').input_value()
 page.locator('[data-cms-action="save"]').click()
 page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 public.reload(wait_until='networkidle')
 assert '/storage/v1/object/public/lotus-site/' in public.locator('.home-hero-video source').last.get_attribute('src')
 page.locator('[data-cms-section="about"]').click()
 # Responsive editor.
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/site-editor-mobile.png',full_page=True)
 assert not errors,errors
 print(json.dumps({'editor':'upload, preview, publish, draft preservation and mobile passed'}),flush=True)
 browser.close()
