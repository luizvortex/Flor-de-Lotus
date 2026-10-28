"""Compiled Next + isolated editorial/storage API. Synthetic images stay in memory."""
import copy,io,re,sys
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda r:r.abort())
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 data=context.request.get(base+'/api/site-content').json();original=copy.deepcopy(data['content'])
 assert data['content']['romance']['photos']==[] and not data['content']['romance']['visible']
 assert 'romance' not in data['content']['layout']['order'].split()
 # Old publications are upgraded in memory; surrounding published data remains intact.
 old=copy.deepcopy(original);del old['romance'];old['layout']['order']=old['layout']['order'].replace('rooms\n','rooms\nromance\n')
 for content in [old,dict(original,romance=dict(original['romance'],visible=True))]:
  for route in ['index','quartos']:
   response=context.request.post(base+'/api/site-preview',data={'content':content,'page':route})
   assert response.status==200,response.text()
   assert 'id="decoracao-romantica"' not in response.json()['html']
   if route=='index':
    for section in ['area-de-lazer','instagram','praias','avaliacoes','fale-conosco']:assert f'id="{section}"' in response.json()['html'],section
 assert context.request.get(base+'/api/site-content').json()['revision']==data['revision']
 page.goto(base+'/admin',wait_until='networkidle');page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="romance"]').click()
 expect(page.locator('[data-cms-field="romance.visible"]')).not_to_be_checked()
 for n,color in enumerate(['#4b5c51','#b3a18a','#9b776c']):
  page.locator('[data-list-add="romance.photos"]').click()
  details=page.locator(f'[data-cms-item="romance.photos.{n}"]')
  if details.get_attribute('open') is None:details.locator('summary').click()
  im=Image.new('RGB',(800,600),color);draw=ImageDraw.Draw(im);draw.rectangle((100,100,700,500),outline='white',width=10);draw.text((180,280),f'SYNTHETIC TEST IMAGE {n+1}',fill='white');buf=io.BytesIO();im.save(buf,format='PNG')
  page.locator(f'[data-cms-upload="romance.photos.{n}.url"]').set_input_files({'name':f'synthetic-{n}.png','mimeType':'image/png','buffer':buf.getvalue()})
  expect(page.locator(f'[data-cms-field="romance.photos.{n}.url"]')).not_to_have_value('')
  expect(page.locator('[data-cms-action="save"]')).to_be_enabled()
  page.locator(f'[data-cms-field="romance.photos.{n}.alt"]').fill(f'Imagem sintética de teste {n+1}')
 # Reversible crop and explicit choice of cover reuse the existing upload tools.
 field=page.locator('[data-cms-field="romance.photos.2.url"]');before=field.input_value()
 page.locator('[data-cms-crop="romance.photos.2.url"]').click()
 expect(page.locator('.cms-crop[open]')).to_be_visible()
 expect(page.locator('[data-crop-ratio]')).to_be_disabled()
 page.get_by_role('button',name='Aumentar zoom',exact=True).click()
 page.get_by_role('button',name='Aplicar enquadramento',exact=True).click()
 expect(field).not_to_have_value(before);expect(page.locator('[data-cms-action="save"]')).to_be_enabled()
 # Rendering may close list details; reopen the selected item.
 details=page.locator('[data-cms-item="romance.photos.2"]')
 if details.get_attribute('open') is None:details.locator('summary').click()
 page.locator('[data-list-primary="romance.photos"][data-index="2"]').click()
 expect(page.locator('[data-cms-item="romance.photos.0"] > summary')).to_contain_text('Imagem sintética de teste 3')
 page.locator('[data-cms-field="romance.visible"]').check()
 page.locator('[data-cms-action="preview"]').click();expect(page.locator('.cms-preview[open]')).to_be_visible()
 assert 'id="decoracao-romantica"' in page.locator('.cms-preview iframe').get_attribute('srcdoc')
 page.locator('.cms-preview .close').click()
 page.locator('[data-cms-action="save"]').click();expect(page.locator('[data-cms-status]')).to_contain_text('Publicado!')
 saved=context.request.get(base+'/api/site-content').json()
 for key in original:
  if key not in ['romance']:assert saved['content'][key]==original[key],key
 assert saved['content']['romance']['photos'][0]['alt']=='Imagem sintética de teste 3'
 # Page content, navigation, WhatsApp branding, modal focus and translations.
 page.goto(base+'/',wait_until='networkidle');expect(page.locator('.romance-section')).to_have_count(0)
 page.goto(base+'/quartos#decoracao-romantica',wait_until='networkidle')
 expect(page.locator('#romance-title')).to_have_text('Decoração romântica')
 expect(page.locator('.romance-gallery img').first).to_have_attribute('alt','Imagem sintética de teste 3')
 href=page.locator('.romance-cta').get_attribute('href')
 from urllib.parse import urlparse,parse_qs
 assert urlparse(href).path=='/'+str(original['branding']['whatsapp'])
 assert parse_qs(urlparse(href).query)['text']==[original['romance']['whatsappMessage']]
 assert page.locator('#rooms').evaluate('el=>el.nextElementSibling.id')=='decoracao-romantica'
 trigger=page.locator('[data-romance-photo="0"]');trigger.focus();page.keyboard.press('Enter')
 expect(page.locator('.romance-dialog[open]')).to_be_visible();expect(page.locator('[data-romance-status]')).to_have_text('Foto 1 de 3')
 page.keyboard.press('ArrowRight');expect(page.locator('[data-romance-status]')).to_have_text('Foto 2 de 3')
 page.keyboard.press('Escape');expect(trigger).to_be_focused()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('.romance-section').screenshot(path=f'work/romance-catalog-{width}.png')
 for lang,title in [('en','Romantic room decoration'),('he','עיצוב רומנטי לחדר'),('pt','Decoração romântica')]:
  page.locator('.site-language summary').first.click();page.locator(f'.site-language [data-language="{lang}"]').first.click()
  expect(page.locator('#romance-title')).to_have_text(title)
  expected={'en':'Ask us on WhatsApp','he':'פנו אלינו בוואטסאפ','pt':'Consultar pelo WhatsApp'}[lang]
  expect(page.locator('.romance-cta')).to_contain_text(expected)
  if lang=='he':expect(page.locator('html')).to_have_attribute('dir','rtl')
 context.request.put(base+'/api/site-content',data={'content':dict(saved['content'],romance=dict(saved['content']['romance'],visible=False)),'revision':saved['revision']})
 for route in ['/','/quartos','/reservas']:
  page.goto(base+route,wait_until='domcontentloaded');expect(page.locator('.romance-section')).to_have_count(0)
 assert not errors,errors
 browser.close();print('Romance: old content, empty gating, owner upload/crop/cover, preview/publication, room-only placement, responsive layouts, keyboard/focus, WhatsApp and EN/HE/PT passed.')
