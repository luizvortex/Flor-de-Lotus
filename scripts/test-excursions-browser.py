"""Group planning and administrative manifests with synthetic HTTP fixtures."""
from pathlib import Path
from urllib.parse import urlparse
import copy
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
rooms=[dict(id=i,name=str(i),floor='terreo' if i<=9 or i==18 else 'superior',capacity=6 if i in [15,18] else 2 if i in [16,17] else 4,available=True) for i in range(1,19)]
groups=[];submitted=[];session={'user':{'name':'Synthetic organizer'},'google_enabled':True};original=ns['route']
def route(r):
 path=urlparse(r.request.url).path
 if path=='/grupos':return r.fulfill(body=(ns['ROOT']/'grupos.html').read_text(),content_type='text/html')
 if path=='/api/guest/session':return r.fulfill(json=session)
 if path=='/api/excursions/rooms':return r.fulfill(json={'rooms':rooms})
 if path=='/api/excursions/quote':
  data=r.request.post_data_json;return r.fulfill(json={'rooms':[dict(x,guests=len(x['people'])) for x in data['rooms']],'nights':1,'total':sum(sum(p['age'] is None or p['age']>6 for p in x['people']) for x in data['rooms'])*10000})
 if path=='/api/excursions' and r.request.method=='POST':
  data=r.request.post_data_json;submitted.append(data);g=dict(id=data['request_id'],name=data['name'],guest=data['guest'],phone=data['phone'],start=data['start'],end=data['end'],status='pendente',guest_count=sum(len(x['people']) for x in data['rooms']),room_count=len(data['rooms']),rooms=[dict(x,room_name=str(x['room_id']),floor=rooms[x['room_id']-1]['floor'],booking_id=i+900,status='pendente',room_assigned=True) for i,x in enumerate(data['rooms'])]);groups.append(g);return r.fulfill(status=201,json=g)
 if path in ['/api/excursions/mine','/api/admin-excursions']:return r.fulfill(json={'groups':groups})
 if path.startswith('/api/admin-excursions/'):
  if path.endswith('/confirm'):
   groups[0]['status']='confirmada'
   for room in groups[0]['rooms']:room['status']='confirmada'
   return r.fulfill(json=groups[0])
  if path.endswith('/manifest'):return r.fulfill(json=groups[0])
 if path.startswith('/api/excursions/') and path.endswith('/manifest'):return r.fulfill(json=groups[0])
 if path=='/api/reports':return r.fulfill(json={'start':'2026-01-01','end':'2026-10-26','operation_start':None,'stats':{'confirmed_bookings':2,'unique_rooms':2,'room_nights':2,'booking_total':20000,'received_total':10000},'bookings':[],'receipts':[]})
 if path in ['/api/reports/receipt','/api/reports/settings','/api/reports/void']:return r.fulfill(json={'ok':True})
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--unsafely-treat-insecure-origin-as-secure=http://qa.test']);context=browser.new_context(viewport={'width':1440,'height':1000});context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/grupos');page.locator('[data-room-select="18"]').wait_for();assert page.locator('[data-room-select]').count()==18
 page.locator('#group-name').fill('Synthetic excursion');page.locator('#group-phone').fill('55000000000')
 # Sixteen rooms with four occupants plus the two doubles = 68 potential places. Build a 60-person request.
 total=0
 for room in rooms:
  count=min(room['capacity'],60-total)
  if not count:break
  page.locator(f'[data-room-select="{room["id"]}"]').check();field=page.locator(f'[data-room-count="{room["id"]}"]');field.fill(str(count));field.press('Tab')
  for index in range(count):page.locator(f'[data-person-name="{room["id"]}"][data-person-index="{index}"]').fill(f'Person {room["id"]} {index}')
  total+=count
 assert total==60
 # A six-year-old still occupies one of the 60 places, while the quote excludes that child.
 page.locator('[data-person-type="1"][data-person-index="1"]').select_option('child');page.locator('[data-person-age="1"][data-person-index="1"]').select_option('6')
 assert '60 pessoas' in page.locator('#group-counter').inner_text();page.locator('#group-quote').click();page.locator('#group-submit').wait_for(state='visible');assert '5.900,00' in page.locator('#group-quote-summary').inner_text()
 # Changing a name invalidates the previous quote.
 page.locator('[data-person-name="1"][data-person-index="0"]').fill('<img src=x onerror=alert(1)>');assert page.locator('#group-submit').is_hidden();page.locator('#group-quote').click();page.locator('#group-submit').click();page.locator('#group-form').wait_for(state='hidden');assert len(submitted)==1
 assert submitted[0]['rooms'][0]['people'][1]['age']==6 and submitted[0]['expected_total']==590000
 assert any(rooms[x['room_id']-1]['floor']=='superior' for x in submitted[0]['rooms'])
 assert page.locator('[data-group-print]').count()==0
 assert page.locator('#group-mine img').count()==0,'Names must be escaped'
 assert page.evaluate("localStorage.length")==0,'Participant names must not be persisted in browser storage'
 # Confirmation makes the private printable list available.
 page.goto('http://qa.test/admin');page.locator('[data-tab="excursions"]').click();page.locator('[data-excursion-action="confirm"]').wait_for();page.once('dialog',lambda d:d.accept());page.locator('[data-excursion-action="confirm"]').click();page.locator('[data-excursion-action="manifest"]').wait_for()
 with page.expect_popup() as event:page.locator('[data-excursion-action="manifest"]').click()
 popup=event.value;popup.locator('#print-list').wait_for();assert 'Person 15' in popup.locator('body').inner_text();assert popup.locator('img').count()==0;popup.close()
 page.locator('[data-tab="reports"]').click();page.locator('[data-report-receipt]').wait_for();assert 'R$ 100,00' in page.locator('.stats').inner_text().replace('\u00a0',' ');assert 'R$ 200,00' in page.locator('.stats').inner_text().replace('\u00a0',' ')
 form=page.locator('[data-report-receipt]');form.locator('[name="booking_id"]').fill('900');form.locator('[name="amount"]').fill('50.25');form.locator('[type="submit"]').click();page.locator('#message').filter(has_text='Salvo com sucesso.').wait_for()
 page.goto('http://qa.test/grupos');page.locator('[data-group-print]').wait_for(state='attached');page.locator('.group-mine-card summary').click();page.locator('[data-group-print]').wait_for()
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
 page.screenshot(path=str(ns['ROOT']/'work/excursions-page.png'),full_page=True)
 assert errors==[],errors
 browser.close();print('PASS: 60 guests, mixed floors, child capacity/free rate, quote invalidation, atomic payload, escaped private roster, confirmation, printable list, separate financial totals and mobile widths.')
