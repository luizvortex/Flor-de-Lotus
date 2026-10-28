"""Real compiled Next/editor, isolated document and storage, synthetic photos only."""
import copy,io,re,sys
from urllib.parse import urlparse,parse_qs
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 data=context.request.get(base+'/api/site-content').json();original=copy.deepcopy(data['content'])
 assert original['fishing']['photos']==[] and not original['fishing']['visible']
 assert 'fishing' in original['layout']['order'].split()
 old=copy.deepcopy(original);del old['fishing'];old['layout']['order']=old['layout']['order'].replace('fishing\n','')
 for content in [old,dict(original,fishing=dict(original['fishing'],visible=True))]:
  response=context.request.post(base+'/api/site-preview',data={'content':content,'page':'index'})
  assert response.status==200,response.text()
  html=response.json()['html'];assert 'id="pescadores"' not in html
  for section in ['quartos','grupos-excursoes','area-de-lazer','instagram','praias','avaliacoes','fale-conosco']:assert f'id="{section}"' in html,section
 assert context.request.get(base+'/api/site-content').json()['revision']==data['revision']
 page.goto(base+'/admin',wait_until='networkidle');page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="fishing"]').click()
 expect(page.locator('[data-cms-field="fishing.visible"]')).not_to_be_checked()
 for n,color in enumerate(['#355749','#b39b75','#7a8d85']):
  page.locator('[data-list-add="fishing.photos"]').click();details=page.locator(f'[data-cms-item="fishing.photos.{n}"]')
  if details.get_attribute('open') is None:details.locator('summary').click()
  im=Image.new('RGB',(800,600),color);draw=ImageDraw.Draw(im);draw.rectangle((100,100,700,500),outline='white',width=10);draw.text((160,280),f'SYNTHETIC FISHING TEST {n+1}',fill='white');buf=io.BytesIO();im.save(buf,format='PNG')
  page.locator(f'[data-cms-upload="fishing.photos.{n}.url"]').set_input_files({'name':f'synthetic-{n}.png','mimeType':'image/png','buffer':buf.getvalue()})
  expect(page.locator(f'[data-cms-field="fishing.photos.{n}.url"]')).not_to_have_value('');expect(page.locator('[data-cms-action="save"]')).to_be_enabled()
  page.locator(f'[data-cms-field="fishing.photos.{n}.alt"]').fill(f'Foto sintética para teste {n+1}')
 current=page.locator('[data-cms-field="fishing.photos.2.url"]').input_value()
 page.locator('[data-cms-crop="fishing.photos.2.url"]').click();expect(page.locator('.cms-crop[open]')).to_be_visible();expect(page.locator('[data-crop-ratio]')).to_be_disabled()
 page.get_by_role('button',name='Aplicar enquadramento',exact=True).click();expect(page.locator('[data-cms-field="fishing.photos.2.url"]')).not_to_have_value(current)
 expect(page.locator('[data-cms-action="save"]')).to_be_enabled()
 details=page.locator('[data-cms-item="fishing.photos.2"]')
 if details.get_attribute('open') is None:details.locator('summary').click()
 page.locator('[data-list-primary="fishing.photos"][data-index="2"]').click()
 expect(page.locator('[data-cms-item="fishing.photos.0"] > summary')).to_contain_text('Foto sintética para teste 3')
 page.locator('[data-cms-field="fishing.visible"]').check()
 page.locator('[data-cms-action="preview"]').click();expect(page.locator('.cms-preview[open]')).to_be_visible()
 html=page.locator('.cms-preview iframe').get_attribute('srcdoc');assert 'id="pescadores"' in html and 'href="/grupos"' in html
 assert context.request.get(base+'/api/site-content').json()['revision']==data['revision']
 page.locator('.cms-preview .close').click();page.locator('[data-cms-action="save"]').click();expect(page.locator('[data-cms-status]')).to_contain_text('Publicado!')
 saved=context.request.get(base+'/api/site-content').json()
 for key in original:
  if key!='fishing':assert saved['content'][key]==original[key],key
 page.goto(base+'/',wait_until='networkidle');expect(page.locator('#fishing-title')).to_have_text(original['fishing']['title'])
 expect(page.locator('.fishing-gallery img').first).to_have_attribute('alt','Foto sintética para teste 3')
 assert page.locator('#pescadores').evaluate('el=>el.previousElementSibling.id')=='grupos-excursoes'
 href=page.locator('.fishing-cta').get_attribute('href');assert urlparse(href).path=='/'+str(original['branding']['whatsapp'])
 assert parse_qs(urlparse(href).query)['text']==[original['fishing']['whatsappMessage']]
 # The link follows the shared WhatsApp configuration and owner-edited message.
 changed=copy.deepcopy(saved['content']);changed['branding']['whatsapp']='5573999999999';changed['fishing']['whatsappMessage']='Consulta de teste & grupo + pesca'
 preview=context.request.post(base+'/api/site-preview',data={'content':changed,'page':'index'});assert preview.status==200
 html=preview.json()['html'];assert 'wa.me/5573999999999?text=Consulta%20de%20teste%20%26%20grupo%20%2B%20pesca' in html
 # Layout order is independently configurable; published surrounding content is preserved.
 keys=changed['layout']['order'].split();keys.remove('fishing');keys.insert(keys.index('instagram')+1,'fishing');changed['layout']['order']='\n'.join(keys)
 html=context.request.post(base+'/api/site-preview',data={'content':changed,'page':'index'}).json()['html']
 assert html.index('id="instagram"')<html.index('id="pescadores"')<html.index('id="praias"')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.locator('#pescadores').scroll_into_view_if_needed()
  assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),width
  expect(page.locator('.fishing-cta')).to_be_visible();page.locator('#pescadores').screenshot(path=f'work/fishing-{width}.png')
 for lang,title,label in [('en','A welcoming place for you and your fishing group','Ask about accommodation for anglers'),('he','מקום שמקבל אתכם ואת קבוצת הדיג שלכם','בירור על אירוח לקבוצות דיג'),('pt',original['fishing']['title'],original['fishing']['buttonLabel'])]:
  page.locator('.site-language summary').first.click();page.locator(f'.site-language [data-language="{lang}"]').first.click()
  expect(page.locator('#fishing-title')).to_have_text(title);expect(page.locator('.fishing-cta')).to_contain_text(label)
  if lang=='he':
   expect(page.locator('html')).to_have_attribute('dir','rtl');assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
 page.locator('.fishing-group-link').focus();page.keyboard.press('Enter');expect(page).to_have_url(re.compile('/grupos$'));page.wait_for_load_state('networkidle')
 expect(page.locator('#group-form')).to_have_count(1)
 disabled=copy.deepcopy(saved['content']);disabled['fishing']['visible']=False
 assert context.request.put(base+'/api/site-content',data={'content':disabled,'revision':saved['revision']}).status==200
 page.goto(base+'/',wait_until='domcontentloaded');expect(page.locator('#pescadores')).to_have_count(0)
 assert not errors,errors
 browser.close();print('Fishing: legacy upgrade, hidden empty state, upload/crop/cover, preview/save, preserved content, configurable order/WhatsApp, group route, responsive layout, keyboard and EN/HE/PT passed.')
