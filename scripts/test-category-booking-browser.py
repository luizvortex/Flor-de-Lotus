from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'work').mkdir(exist_ok=True)
rooms=[dict(id=1,name='1',type='casal',price=10000,active=1,capacity=4,floor='terreo',presentation_slug='duplo'),dict(id=15,name='15',type='casal',price=12000,active=1,capacity=6,floor='superior',presentation_slug='duplo')]
photo={'url':'/img casal/casal.jpg','alt':'Quarto'}
showcases=[dict(slug=s,title=t,description='Quarto da pousada',photos=[photo]*3,features=[]) for s,t in [('duplo','Quarto Standard'),('triplo','Quarto Superior'),('triplo-standard','Quarto Triplo Standard'),('familia','Quarto Família')]]
state=dict(rooms=rooms,packages=[],bookings=[dict(id=101,room_id=15,room_name='15',room_floor='superior',room_assigned=False,requested_category='familia',status='pendente',guest='Teste',phone='55000000000',guests=6,start='2026-11-10',end='2026-11-11',total=12000,created='2026-10-26T10:00:00Z')],showcases=showcases)
payloads=[]
def route(r):
 from urllib.parse import urlparse,parse_qs,unquote
 u=urlparse(r.request.url);path=u.path
 if path.startswith('/api/'):
  key=path[5:];data={}
  if key=='catalog':data=dict(rooms=rooms,packages=[],showcases=showcases)
  elif key=='availability':
   q=parse_qs(u.query);data={'nights':1,'rooms':[dict(x,total=x['price'],quote_example=False) for x in rooms if x['floor']==q['floor'][0] and x['capacity']>=int(q['guests'][0])]}
  elif key=='guest/session':data={'google_enabled':True,'user':{'name':'Teste'}}
  elif key=='bookings':payloads.append(r.request.post_data_json);data={'id':101,'status':'pendente','total':12000,'floor':'superior'}
  elif key=='session':data={'authenticated':True}
  elif key=='admin':data=state
  elif key=='rates':data={'rates':[dict(id=1,floor='terreo',guests=1,amount=10000,example=True,revision=1,start=None,end=None)]}
  elif key.endswith('/assignment'):
   payloads.append(r.request.post_data_json);state['bookings'][0]['room_assigned']=True;data={'ok':True}
  elif key=='policies':data={}
  return r.fulfill(status=200,json=data)
 if u.hostname!='qa.test':return r.abort()
 p=ROOT/unquote(path).lstrip('/')
 if path in ['/quartos','/reservas']:p=ROOT/'reservas.html'
 if path=='/admin':p=ROOT/'admin.html'
 if p.is_file():
  mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}.get(p.suffix,'application/octet-stream')
  return r.fulfill(body=p.read_bytes(),content_type=mime)
 r.fulfill(status=404,body='')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context();context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/quartos');page.wait_for_selector('[data-slug="familia"]')
 assert page.locator('.catalog-room').count()==4
 assert page.locator('select#package').count()==0
 assert page.locator('#floor').get_attribute('required') is not None
 assert page.locator('#floor').input_value()==''
 assert page.locator('#floor option[value=""]').is_disabled()
 # Date range picker: two months, pending selection, keyboard and responsive bounds.
 from datetime import date,timedelta
 start_date=date.fromisoformat(page.locator('#checkin').input_value())+timedelta(days=2)
 end_date=start_date+timedelta(days=2)
 page.locator('#dates-trigger').click()
 assert page.locator('.calendar-month').count()==2
 page.locator('#dates-picker').screenshot(path=str(ROOT/'work/stay-calendar.png'))
 page.locator(f'[data-day="{start_date}"]:not([disabled])').click()
 assert page.locator('#apply-dates').is_disabled()
 page.locator(f'[data-day="{end_date}"]:not([disabled])').click()
 assert '2 noites' in page.locator('#apply-dates').inner_text()
 page.locator('#apply-dates').click()
 assert page.locator('#checkin').input_value()==str(start_date)
 assert page.locator('#checkout').input_value()==str(end_date)
 assert page.locator('#dates-picker').is_hidden()
 page.locator('#dates-trigger').click();page.keyboard.press('Escape')
 assert page.locator('#dates-trigger').evaluate('(el)=>el===document.activeElement')

 for width in [320,390,1024,1440]:
  page.set_viewport_size({'width':width,'height':950})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow at {width}'
  page.locator('#dates-trigger').click()
  rect=page.locator('#dates-picker').bounding_box()
  assert rect['x']>=0 and rect['x']+rect['width']<=width+1,f'calendar overflow at {width}'
  page.keyboard.press('Escape')
 page.locator('#floor').select_option('superior');page.locator('#guests-trigger').click();page.locator('#guests').fill('6');page.locator('#apply-guests').click();page.locator('#search [type="submit"]').click()
 page.wait_for_selector('[data-options="familia"]');page.locator('[data-options="familia"]').click();page.locator('[data-book-category="familia"]').click()
 assert 'Unidade' not in page.locator('#booking-summary').inner_text()
 page.locator('#guest').fill('Teste de fluxo');page.locator('#phone').fill('65999999999');page.locator('#booking-form [type="submit"]').click();page.wait_for_selector('#booking-success[open]')
 assert payloads[0]['category_slug']=='familia' and 'room_id' not in payloads[0]
 assert 'unidade' not in page.locator('#booking-receipt-summary').inner_text().lower()
 page.goto('http://qa.test/admin');page.wait_for_selector('[data-tab="rates"]');page.locator('[data-tab="rates"]').click();page.wait_for_selector('[data-base="superior:6"]')
 assert page.locator('[data-base]').count()==12
 page.locator('[data-base="terreo:1"]').click();assert page.locator('#rate-dialog input[name="amount"]').input_value()=='100';page.locator('#rate-dialog [data-close]').click()
 page.locator('[data-tab="bookings"]').click();assert page.locator('[data-confirm="101"]').count()==0;page.locator('[data-assign="101"]').click();page.locator('#assignment-dialog [type="submit"]').click();page.wait_for_selector('[data-confirm="101"]')
 assert payloads[-1]['room_id']==15
 assert not errors,errors
 print('PASS: four categories, mandatory floor, no tariff selector, responsive layout, category request, rates editor, owner assignment and confirmation gate. No JavaScript errors.')
 browser.close()
