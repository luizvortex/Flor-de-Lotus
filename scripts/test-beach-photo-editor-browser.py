"""Destination photo editing against compiled Next and isolated CMS/Storage fixtures."""
import sys,io,copy
from PIL import Image
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 unauth=browser.new_context();assert unauth.request.get(base+'/api/site-content').status==401;unauth.close()
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 original=context.request.get(base+'/api/site-content').json()
 page.goto(base+'/admin#praias-passeios',wait_until='networkidle')
 expect(page.locator('[data-tab="site"]')).to_have_class('active')
 expect(page.locator('[data-cms-section="beaches"]')).to_be_visible()
 expect(page.locator('[data-beach-group="destinations"]')).to_have_attribute('aria-pressed','true')
 expect(page.locator('[data-beach-photos]')).to_have_count(len(original['content']['beaches']['items']))
 index=1;path=f'beaches.items.{index}.photos';field=path+'.0.url';alt=path+'.0.alt'
 page.locator(f'[data-beach-photos="{index}"]').click()
 expect(page.locator(f'[data-cms-upload="{field}"]')).to_be_visible()
 assert page.locator(f'[data-cms-item="beaches.items.{index}"]').evaluate('(el)=>el.open')
 assert page.locator(f'[data-cms-item="{path}.0"]').evaluate('(el)=>el.open')
 im=Image.new('RGB',(640,480),'#357d99');buf=io.BytesIO();im.save(buf,format='PNG')
 page.locator(f'[data-cms-upload="{field}"]').set_input_files({'name':'synthetic-beach.png','mimeType':'image/png','buffer':buf.getvalue()})
 expect(page.locator(f'[data-cms-field="{field}"]')).not_to_have_value(original['content']['beaches']['items'][index]['photos'][0]['url'])
 page.locator(f'[data-cms-field="{alt}"]').fill('Nova foto sintética da praia')
 upload_url=page.locator(f'[data-cms-field="{field}"]').input_value();assert '/storage/v1/object/public/lotus-site/' in upload_url
 expect(page.locator(f'[data-cms-crop="{field}"]')).to_be_visible()
 # Existing primary-photo ordering is directly available for beach albums too.
 if not page.locator(f'[data-cms-item="{path}.1"]').evaluate('(el)=>el.open'):page.locator(f'[data-cms-item="{path}.1"] > summary').click()
 page.locator(f'[data-list-primary="{path}"][data-index="1"]').click()
 if not page.locator(f'[data-cms-item="{path}.1"]').evaluate('(el)=>el.open'):page.locator(f'[data-cms-item="{path}.1"] > summary').click()
 page.locator(f'[data-list-primary="{path}"][data-index="1"]').click()
 expect(page.locator(f'[data-cms-field="{field}"]')).to_have_value(upload_url)
 # Add/remove remain drafts until the explicit publish action.
 count=len(original['content']['beaches']['items'][index]['photos'])
 page.locator(f'[data-list-add="{path}"]').click();expect(page.locator(f'[data-cms-item="{path}.{count}"]')).to_be_attached()
 page.locator(f'[data-cms-item="{path}.{count}"] > summary').click();page.once('dialog',lambda d:d.accept())
 page.locator(f'[data-list-remove="{path}"][data-index="{count}"]').click();expect(page.locator(f'[data-cms-item="{path}.{count}"]')).to_have_count(0)
 assert context.request.get(base+'/api/site-content').json()['revision']==original['revision']
 page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="about"]').click()
 expect(page.locator('[data-open-beach-content]')).to_be_visible();page.locator('[data-open-beach-content]').click()
 expect(page.locator('[data-tab="site"]')).to_have_class('active')
 assert page.locator('.sidebar [data-tab="experiences"]').count()==0
 page.locator(f'[data-beach-photos="{index}"]').click();expect(page.locator(f'[data-cms-field="{alt}"]')).to_have_value('Nova foto sintética da praia')
 page.locator('[data-cms-action="preview"]').click();expect(page.locator('.cms-preview[open]')).to_be_visible()
 assert 'Nova foto sintética da praia' in page.locator('.cms-preview iframe').get_attribute('srcdoc');page.locator('.cms-preview .close').click()
 page.locator('[data-cms-action="save"]').click();expect(page.locator('[data-cms-status]')).to_contain_text('Publicado!')
 saved=context.request.get(base+'/api/site-content').json();assert saved['revision']==original['revision']+1
 assert saved['content']['beaches']['items'][index]['photos'][0]['url']==upload_url
 assert saved['content']['beaches']['items'][index]['photos'][0]['alt']=='Nova foto sintética da praia'
 for key in original['content']:
  if key!='beaches':assert saved['content'][key]==original['content'][key],key
 public=context.new_page();public.route('https://**',lambda r:r.abort())
 public.goto(base+'/itacare',wait_until='domcontentloaded');expect(public.locator('#destino-praia-da-concha .explore-photo-button img')).to_have_attribute('alt','Nova foto sintética da praia')
 public.goto(base+'/',wait_until='domcontentloaded');expect(public.locator('a[href="/itacare#destino-praia-da-concha"] img')).to_have_attribute('alt','Nova foto sintética da praia');public.close()
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.locator('[data-beach-group="destinations"]').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  page.locator(f'[data-beach-photos="{index}"]').click();expect(page.locator(f'[data-cms-upload="{field}"]')).to_be_visible()
 assert not errors,errors
 browser.close();print('PASS: direct beach-photo entry, site-editor shortcut, upload, primary ordering, add/remove, draft preservation, preview, publish/reload and public home/guide update; private API denied without admin; isolated CMS only.')
