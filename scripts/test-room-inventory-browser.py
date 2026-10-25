import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000});base=sys.argv[1]
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base},{'name':'lotus_guest_auth','value':sys.argv[2],'url':base}])
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**',lambda r:r.abort())
 page.route('**/api/guest/session',lambda r:r.fulfill(json={'google_enabled':True,'user':{'name':'Hóspede de teste'}}))
 page.goto(base+'/quartos',wait_until='networkidle')
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.startsWith('19 quartos')")
 page.locator('#floor').select_option('terreo');page.locator('#search [type="submit"]').click()
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.startsWith('11 quartos')")
 assert 'Térreo' in page.locator('#result-count').inner_text()
 page.locator('[data-options="duplo"]').click()
 assert page.locator('[data-book]').count()==11
 assert page.locator('#details-options').get_by_text('Unidade 1 · Térreo',exact=True).count()==1
 page.locator('[data-book="1"]').click();page.locator('#guest').fill('Hóspede de teste');page.locator('#phone').fill('55000000000')
 page.locator('#booking-form [type="submit"]').click();page.locator('#booking-success[open]').wait_for()
 assert 'Térreo' in page.locator('#booking-success-summary').inner_text()
 page.locator('#booking-success [data-close-success]').last.click()
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.startsWith('10 quartos')")
 page.locator('[data-options="duplo"]').click();assert page.locator('[data-book]').count()==10;assert page.locator('[data-book="1"]').count()==0
 page.locator('[data-close-details]').click();page.locator('#floor').select_option('superior');page.locator('#search [type="submit"]').click()
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.startsWith('8 quartos')")
 page.goto(base+'/admin',wait_until='networkidle');page.locator('[data-tab="rooms"]').click()
 assert page.locator('[data-edit-room]').count()==19
 page.locator('[data-edit-room="19"]').click()
 assert page.locator('#f-floor').input_value()=='superior'
 page.locator('#f-type').select_option('quadruplo');assert page.locator('#f-capacity').input_value()=='4'
 page.locator('#f-floor').select_option('terreo');page.locator('#f-price').fill('260')
 page.locator('#editor-form [type="submit"]').click();page.wait_for_function("()=>!document.querySelector('#editor').open")
 page.goto(base+'/quartos?guests=3&floor=terreo',wait_until='networkidle')
 page.wait_for_function("()=>document.querySelector('#result-count').textContent.startsWith('1 quarto')")
 page.locator('[data-options="duplo"]').click()
 assert page.locator('[data-book]').count()==1
 assert 'Unidade 19 · Térreo' in page.locator('#details-options').inner_text()
 assert 'Quádruplo' in page.locator('#details-options').inner_text() and '260,00' in page.locator('#details-options').inner_text()
 page.locator('[data-close-details]').click()
 for width in [320,390,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),width
 assert not errors,errors
 browser.close();print('19 physical rooms: floor filters, independent stock after booking, receipt floor, owner editing configuration/floor/rate, triple search and responsive layout passed through Next APIs with isolated backend.')
