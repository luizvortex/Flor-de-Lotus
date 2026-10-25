import sys,json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1366,'height':900});page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**',lambda r:r.abort())
 authenticated=False;booked=False;conflict=False;fail=False;payloads=[]
 photo={'url':'/img casal/casal.jpg','alt':'Quarto de teste'}
 rooms=[{'id':5,'name':'Standard 1','type':'solteiro','price':10000,'active':1,'capacity':1,'presentation_slug':'duplo'},{'id':6,'name':'Superior 2','type':'casal','price':20000,'active':1,'capacity':2,'presentation_slug':'triplo'}]
 showcases=[{'slug':slug,'title':title,'description':'Acomodação de teste','photos':[photo]*3,'features':[]} for slug,title in [('duplo','Quarto Standard'),('triplo','Quarto Superior')]]
 def api(route):
  nonlocal_dummy=None
  global booked
  path=route.request.url.split('/api/')[1].split('?')[0]
  if path=='catalog':data={'rooms':rooms,'showcases':showcases,'packages':[]}
  elif path=='guest/session':data={'google_enabled':True,'user':{'name':'Hóspede de teste'} if authenticated else None}
  elif path=='availability':
   if fail:return route.fulfill(status=503,json={'error':'Sistema temporariamente indisponível. Tente novamente.'})
   from urllib.parse import urlparse,parse_qs
   q=parse_qs(urlparse(route.request.url).query);g=int(q['guests'][0]);data={'nights':1,'rooms':[dict(r,total=r['price']) for r in rooms if r['capacity']>=g and not (booked and r['id']==6)]}
  elif path=='bookings':
   payloads.append(route.request.post_data_json)
   if conflict:return route.fulfill(status=409,json={'error':'Estas datas acabaram de ser reservadas. Consulte outras opções.'})
   assert authenticated;booked=True;data={'id':101,'total':20000,'status':'pendente'}
  else:return route.continue_()
  route.fulfill(json=data)
 context.route('**/api/**',api)
 auth_requests=[]
 context.route('**/auth/google',lambda r:(auth_requests.append(r.request.method),r.fulfill(content_type='text/html',body='<html><body>Login Google simulado</body></html>')))
 page.goto(sys.argv[1]+'/quartos',wait_until='networkidle')
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.includes('quarto disponível')")
 standard=page.locator('[data-slug="duplo"]')
 assert '100,00' in standard.locator('.room-price').inner_text()
 assert 'Diária de referência' in standard.inner_text() and 'até 1 hóspede' in standard.inner_text()
 assert standard.locator('.room-whatsapp').get_attribute('href').startswith('https://wa.me/')
 assert page.locator('#checkin').input_value() and page.locator('#checkout').input_value()
 page.locator('[data-options="triplo"]').click();page.locator('[data-book="6"]').click()
 assert page.locator('#booking-login-dialog[open]').is_visible()
 for width in [390,1366]:
  page.set_viewport_size({'width':width,'height':900})
  box=page.locator('#booking-login-dialog').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1
 assert page.locator('#booking-login-dialog').evaluate('i=>i.contains(document.activeElement)')
 assert not payloads
 page.locator('[data-close-booking-login]').last.click()
 assert page.locator('#booking-form [type="submit"]').is_enabled()
 page.locator('#guest').fill('Nome preservado');page.locator('#phone').fill('55000000000')
 page.locator('#booking-form [type="submit"]').click()
 assert page.locator('#booking-login-dialog[open]').is_visible() and not payloads
 with page.expect_popup() as opened:
  page.locator('#booking-google-form button').click()
 popup=opened.value;popup.wait_for_url('**/auth/google')
 assert auth_requests==['POST']
 popup.close()
 page.get_by_text('Se você já entrou, clique em Já entrei, verificar acesso. Caso tenha cancelado, pode tentar novamente.').wait_for()
 assert not payloads and page.locator('#booking-google-form button').is_enabled()
 with page.expect_popup() as reopened:
  page.locator('#booking-google-form button').click()
 popup=reopened.value;popup.wait_for_url('**/auth/google')
 assert auth_requests==['POST','POST']
 assert popup.evaluate("sessionStorage.getItem('lotus-booking-login')")
 authenticated=True
 with popup.expect_event('close'):
  popup.goto(sys.argv[1]+'/minha-conta?conta=conectada',wait_until='commit')
 page.wait_for_function("()=>!document.querySelector('#booking-login-dialog').open")
 assert page.locator('#guest').input_value()=='Nome preservado'
 assert page.locator('#phone').input_value()=='55000000000'
 assert page.locator('#booking-dialog').is_visible() and not payloads

 assert page.locator('[data-booking-login]').is_hidden()
 page.locator('#guest').fill('Hóspede de teste');page.locator('#phone').fill('55000000000')
 page.locator('#booking-form [type="submit"]').click();page.locator('#booking-receipt').wait_for()
 assert 'Solicitação #101' in page.locator('#booking-receipt').inner_text()
 page.locator('#booking-success[open]').wait_for()
 assert page.locator('#booking-dialog').is_hidden()
 assert 'Solicitação #101' in page.locator('#booking-success-summary').inner_text()
 assert 'aguarde' in page.locator('#booking-success-note').inner_text().lower()
 assert page.locator('#booking-success a[href="/minha-conta"]').count()==1
 assert page.locator('#booking-success').evaluate('i=>i.contains(document.activeElement)')
 for width in [390,1366]:
  page.set_viewport_size({'width':width,'height':900})
  box=page.locator('#booking-success').bounding_box()
  assert box['x']>=0 and box['x']+box['width']<=width+1
  assert abs(box['x']+box['width']/2-width/2)<2
 page.locator('#booking-success [data-close-success]').last.click()
 assert page.locator('#booking-success').is_hidden()
 assert page.locator('#booking-receipt').is_visible()

 assert 'aguard' in page.locator('#message').inner_text().lower() or 'solicitação' in page.locator('#message').inner_text().lower()
 assert payloads[0]['room_id']==6 and payloads[0]['guests']==2
 from urllib.parse import urlparse,parse_qs
 text=parse_qs(urlparse(page.locator('#booking-receipt-whatsapp').get_attribute('href')).query)['text'][0]
 assert '#101' in text and 'Hóspedes: 2' in text and '200,00' in text
 assert page.locator('#booking-receipt a[href="/minha-conta"]').count()==1
 # A conflicting booking must not show a success receipt for the failed request.
 booked=False;conflict=True;page.reload(wait_until='networkidle')
 page.locator('[data-options="triplo"]').click();page.locator('[data-book="6"]').click()
 page.locator('#guest').fill('Hóspede de teste');page.locator('#phone').fill('55000000000');page.locator('#booking-form [type="submit"]').click()
 page.get_by_text('Estas datas acabaram de ser reservadas. Consulte outras opções.').wait_for()
 assert page.locator('#booking-receipt').is_hidden()
 assert page.locator('#booking-success').is_hidden()
 page.locator('#close-booking').click();fail=True;page.locator('#refresh-rooms').click()
 page.get_by_text('Sistema temporariamente indisponível. Tente novamente.').wait_for()
 assert page.locator('#search [type="submit"]').is_enabled()
 for width in [390,1366]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
 assert not errors,errors
 browser.close();print('Booking flow: Standard reference price and capacity reason, automatic availability, Google login refresh, successful request/receipt/WhatsApp, conflicts, failures and responsive layout passed (isolated browser fixtures).')
