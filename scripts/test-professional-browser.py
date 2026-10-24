import sys,json
from playwright.sync_api import sync_playwright

base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://**',lambda route:route.abort())
 page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="setup"]').click()
 page.get_by_text('Seu centro de configuração.').wait_for()
 assert not page.locator('#primary').is_visible()
 page.set_viewport_size({'width':390,'height':900})
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('[data-setup-editor]').first.click()
 field=page.locator('[data-cms-field="operations.contactEmail"]')
 field.fill('contato@example.invalid')
 page.wait_for_function("() => JSON.parse(localStorage.getItem('lotus-editor-draft-v1'))?.content.operations.contactEmail==='contato@example.invalid'")
 # Reloading never silently publishes or discards the draft.
 page.on('dialog',lambda dialog:dialog.accept())
 page.reload(wait_until='networkidle')
 page.locator('[data-tab="site"]').click()
 page.locator('[data-draft-restore]').click()
 page.locator('[data-cms-section="operations"]').click()
 assert field.input_value()=='contato@example.invalid'
 page.locator('[data-cms-action="save"]').click()
 page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 assert page.evaluate("localStorage.getItem('lotus-editor-draft-v1')") is None
 # Exercise the time inputs and serialized payload without changing real policies.
 policy_doc={'revision':1,'policies':{key:'' for key in ['checkin','checkout','pets','internet','parking','children','payments','cancellation','reservations','additional']}}
 policy_doc['policies'].update(checkin_time='14:00',checkout_time='12:00')
 def policy_request(route):
  if route.request.method=='PUT':
   payload=route.request.post_data_json
   assert payload['policies']['checkin_time']=='15:30'
   assert payload['policies']['checkout_time']=='12:00'
   assert payload['policies']['pets']=='Pets conforme condições da pousada.'
   policy_doc.update(revision=2,policies=payload['policies'])
  route.fulfill(json=policy_doc)
 page.route('**/api/policies',policy_request)
 page.locator('[data-tab="policies"]').click()
 page.locator('#policy-checkin-time').fill('15:30')
 page.locator('#policy-pets').fill('Pets conforme condições da pousada.')
 page.locator('#policies-form [type="submit"]').click()
 page.get_by_text('Políticas salvas. As informações já estão disponíveis na página de quartos.').wait_for()
 assert policy_doc['revision']==2
 page.goto(base+'/privacidade',wait_until='domcontentloaded')
 assert page.locator('a[href="mailto:contato@example.invalid"]').count()==1
 assert page.locator('h1').inner_text()=='Privacidade'
 assert page.locator('link[rel="canonical"]').get_attribute('href').endswith('/privacidade')
 assert page.locator('meta[property="og:image"]').count()==1
 page.goto(base+'/',wait_until='domcontentloaded')
 metadata=json.loads(page.locator('script[type="application/ld+json"]').inner_text())
 assert metadata['@type']=='LodgingBusiness'
 assert page.locator('.site-legal a[href="/privacidade"]').count()==1
 assert page.locator('.site-legal a[href="/condicoes"]').count()==1
 assert context.request.get(base+'/admin').headers.get('x-robots-tag')=='noindex, nofollow'
 robots=context.request.get(base+'/robots.txt');assert robots.status==200 and 'Disallow: /admin' in robots.text()
 sitemap=context.request.get(base+'/sitemap.xml');assert sitemap.status==200 and '/itacare</loc>' in sitemap.text()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for path in ['/privacidade','/condicoes']:
   page.goto(base+path,wait_until='networkidle')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(path,width)
 assert not errors,errors
 context.close();browser.close()
 print('Setup panel, draft recovery, publication, privacy, SEO and mobile layouts: passed.')
