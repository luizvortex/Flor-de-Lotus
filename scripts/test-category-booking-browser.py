from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'work').mkdir(exist_ok=True)
rooms=[dict(id=1,name='1',type='casal',price=10000,active=1,capacity=4,floor='terreo',presentation_slug='duplo'),dict(id=15,name='15',type='casal',price=12000,active=1,capacity=6,floor='superior',presentation_slug='duplo')]
photo={'url':'/img casal/casal.jpg','alt':'Quarto'}
showcases=[dict(slug=s,title=t,description='Quarto da pousada',photos=[photo]*3,features=[{'icon':'breakfast','label':'Café da manhã incluso'},{'icon':'wifi','label':'Wi-Fi grátis'}],eyebrow='17 m²',revision=1,details={'beds':'1 cama de casal','description':'Descrição da acomodação','bathroom':['Banheiro privativo'],'amenities':['Toalhas']},amenities=[{'icon':'bath','label':'Banheiro privativo'},{'icon':'shower','label':'Chuveiro'}]) for s,t in [('duplo','Quarto Standard'),('triplo','Quarto Superior'),('triplo-standard','Quarto Triplo Standard'),('familia','Quarto Família')]]
state=dict(rooms=rooms,packages=[],bookings=[dict(id=101,room_id=15,room_name='15',room_floor='superior',room_assigned=False,requested_category='familia',status='pendente',guest='Teste',phone='55000000000',guests=6,start='2026-11-10',end='2026-11-11',total=12000,created='2026-10-26T10:00:00Z')],showcases=showcases)
payloads=[]
sold_out=False
fail_availability=False
missing_price=False
def route(r):
 from urllib.parse import urlparse,parse_qs,unquote
 u=urlparse(r.request.url);path=u.path
 if path.startswith('/api/'):
  key=path[5:];data={}
  if key=='catalog':data=dict(rooms=rooms,packages=[],showcases=showcases,starting_rates=[dict(floor=f,guests=g,amount=g*10000) for f in ['terreo','superior'] for g in range(1,7)])
  elif key=='availability':
   if fail_availability:return r.fulfill(status=503,json={'error':'Consulta temporariamente indisponível.'})
   if sold_out:return r.fulfill(status=200,json={'rooms':[],'nights':1})
   q=parse_qs(u.query)
   party=json.loads(q.get('party',['[]'])[0]);base=10000*sum(r['adults']+sum(a>5 for a in r['children_ages']) for r in party) if party else int(q['guests'][0])*10000
   from datetime import date
   nights=(date.fromisoformat(q['end'][0])-date.fromisoformat(q['start'][0])).days
   data={'nights':nights,'rooms':[dict(x,total=None if missing_price else base*nights,starting_price=base,quote_example=False) for x in rooms if x['floor']==q['floor'][0] and x['capacity']>=int(q['guests'][0])]}
  elif key=='guest/session':data={'google_enabled':True,'user':{'name':'Teste'}}
  elif key=='bookings':payloads.append(r.request.post_data_json);data={'id':101,'status':'pendente','total':r.request.post_data_json['expected_total'],'floor':'superior'}
  elif key=='session':data={'authenticated':True}
  elif key=='admin':data=state
  elif key=='showcases':data={'showcases':showcases}
  elif key.startswith('showcases/'):
   body=r.request.post_data_json;row=next(x for x in showcases if x['slug']==key.split('/')[1]);row.update(body);row['revision']+=1;payloads.append(body);data={'showcase':row}
  elif key=='rates':data={'rates':[dict(id=1,floor='terreo',guests=1,amount=10000,example=True,revision=1,start=None,end=None)]}
  elif key.endswith('/assignment'):
   payloads.append(r.request.post_data_json);state['bookings'][0]['room_assigned']=True;data={'ok':True}
  elif key=='policies':data={}
  return r.fulfill(status=200,json=data)
 if u.hostname!='qa.test':return r.abort()
 if path.endswith(('.mp4','.webm','.mov')):return r.fulfill(status=204,body='')
 p=ROOT/unquote(path).lstrip('/')
 if path in ['/quartos','/reservas']:p=ROOT/'reservas.html'
 if path=='/admin':p=ROOT/'admin.html'
 if path=='/':p=ROOT/'index.html'
 if p.is_file():
  mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}.get(p.suffix,'application/octet-stream')
  body=p.read_bytes()
  if path=='/':
   import re,html
   body=re.sub(r'data-room="[^"]*"',lambda m:'data-room="'+html.escape(json.dumps(showcases[0]),quote=True)+'"',body.decode(),count=1).encode()
  return r.fulfill(body=body,content_type=mime)
 r.fulfill(status=404,body='')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context();context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/quartos');page.wait_for_selector('[data-slug="familia"]')
 assert page.locator('.catalog-room').count()==4
 assert page.locator('select#package').count()==0
 assert page.locator('[data-slug="duplo"] .room-cost small').inner_text()=='A partir de'
 assert '100,00' in page.locator('[data-slug="duplo"] .room-price').inner_text()
 assert '100,00' in page.locator('[data-slug="familia"] .room-price').inner_text()
 assert page.locator('#floor').get_attribute('required') is not None
 assert page.locator('#floor').input_value()==''
 assert page.locator('#floor option[value=""]').is_disabled()
 # Pointer focus has no ring, but Tab focus stays visibly highlighted.
 page.locator('#floor').click();page.keyboard.press('Escape')
 assert page.locator('#floor').evaluate('(el)=>getComputedStyle(el).outlineStyle')=='none'
 assert page.locator('#floor').evaluate('(el)=>getComputedStyle(el).boxShadow')=='none'
 page.keyboard.press('Tab')
 assert page.evaluate('document.documentElement.dataset.focusInput')=='keyboard'
 assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')=='solid'
 assert page.evaluate('getComputedStyle(document.activeElement).outlineWidth')=='2px'
 # Gallery matches the reference and includes editable icon badges and amenities.
 page.locator('[data-details="duplo"]').first.click()
 assert page.locator('#details-highlights').get_by_text('Café da manhã incluso').is_visible()
 assert page.locator('#details-facts .room-icon').count()==2
 assert page.locator('#details-thumbs button').count()==3
 page.locator('[data-detail-next]').click();assert '2 / 3' in page.locator('#details-counter').inner_text()
 page.locator('#details-thumbs button').first.click();assert '1 / 3' in page.locator('#details-counter').inner_text()
 assert 'Opções de refeições' not in page.locator('#room-details').inner_text()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':950})
  rect=page.locator('#room-details').bounding_box()
  assert rect['x']>=0 and rect['x']+rect['width']<=width+1
  assert page.locator('.room-modal-body').evaluate('(el)=>el.scrollWidth<=el.clientWidth')
 page.locator('#room-details').screenshot(path=str(ROOT/'work/room-modal-reference.png'))
 page.keyboard.press('Escape')
 # Children require their ages and room count expands a separate composition.
 page.locator('#guests-trigger').click()
 page.locator('#guests-picker').screenshot(path=str(ROOT/'work/party-selector.png'))
 page.locator('[data-party-field="children"][data-party-step="1"]').click()
 assert page.locator('[data-child-room="0"]').get_attribute('required') is not None
 page.locator('[data-child-room="0"]').select_option('6')
 page.locator('[data-party-field="rooms"][data-party-step="1"]').click()
 assert len(page.evaluate('window.stayParty.get()'))==2
 assert '2 quartos' in page.locator('#guests-summary').inner_text()
 page.locator('[data-party-field="rooms"][data-party-step="-1"]').click()
 page.locator('[data-party-field="children"][data-party-step="-1"]').click()
 page.locator('#apply-guests').click()
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
 page.locator('#floor').select_option('superior');page.locator('#guests-trigger').click();[page.locator('[data-party-room="0"][data-party-field="adults"][data-party-step="1"]').click() for _ in range(4)];page.locator('#apply-guests').click();page.locator('#search [type="submit"]').click()
 page.wait_for_selector('[data-options="familia"]');assert page.locator('.catalog-room').count()==1;page.locator('[data-options="familia"]').click();page.locator('[data-book-category="familia"]').click()
 assert 'Unidade' not in page.locator('#booking-summary').inner_text()
 page.locator('#guest').fill('Teste de fluxo');page.locator('#phone').fill('65999999999');page.locator('#booking-form [type="submit"]').click();page.wait_for_selector('#booking-success[open]')
 assert payloads[0]['category_slug']=='familia' and 'room_id' not in payloads[0]
 assert payloads[0]['party']==[{'adults':6,'children_ages':[]}]
 assert 'unidade' not in page.locator('#booking-receipt-summary').inner_text().lower()
 # Empty inventory uses the centered notification, with a working calendar CTA.
 page.locator('#booking-success [data-close-success]').first.click()
 missing_price=True
 page.locator('#search [type="submit"]').click()
 page.wait_for_selector('[data-options="familia"]')
 page.locator('[data-options="familia"]').click()
 assert page.locator('#details-options .starting-price small').inner_text()=='A partir de'
 assert '600,00' in page.locator('#details-options .starting-price p').inner_text()
 assert 'Preço ainda não cadastrado' not in page.locator('#details-options').inner_text()
 page.locator('#room-details [data-close-details]').click()
 missing_price=False
 sold_out=True
 page.locator('#search [type="submit"]').click()
 page.wait_for_selector('#no-availability:not([hidden])')
 assert page.locator('.results-heading').is_hidden()
 assert page.locator('#message').inner_text()==''
 assert page.locator('.catalog-room').count()==0
 for width in [320,1440]:
  page.set_viewport_size({'width':width,'height':950})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#choose-other-dates').click()
 assert page.locator('#dates-picker').is_visible()
 page.keyboard.press('Escape')
 fail_availability=True
 page.locator('#search [type="submit"]').click()
 page.wait_for_selector('#message.error')
 assert page.locator('#no-availability').is_hidden()
 # Home tariffs open the same picker and a new tab with all filters.
 sold_out=False;fail_availability=False
 page.goto('http://qa.test/',wait_until='domcontentloaded',timeout=60000)
 page.locator('.showcase-view-photos').first.hover()
 page.locator('.showcase-view-photos').first.click()
 page.wait_for_selector('#showcase-album[open]')
 assert page.locator('.showcase-album-highlights').get_by_text('Café da manhã incluso').is_visible()
 assert page.locator('.showcase-album-thumbs button').count()==3
 page.locator('[data-album-next]').click();assert '2 / 3' in page.locator('.showcase-album-count').inner_text()
 page.keyboard.press('Escape')
 thumbnail=page.locator('.showcase-thumb').first
 expected_photo=int(thumbnail.get_attribute('data-photo-index'))+1
 thumbnail.click()
 assert page.locator('#showcase-album').is_visible()
 assert page.locator('.showcase-album-count').inner_text().startswith(str(expected_photo)+' /')
 page.keyboard.press('Escape')
 page.locator('.showcase-more .showcase-rates').first.click()
 assert page.locator('#availability-dialog').is_visible()
 assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')=='none'
 assert page.locator('#floor').input_value()==''
 assert not page.locator('#search').evaluate('(form)=>form.checkValidity()')
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':950})
  rect=page.locator('#availability-dialog').bounding_box()
  assert rect['x']>=0 and rect['x']+rect['width']<=width+1
  page.locator('#dates-trigger').click()
  assert page.locator('#dates-picker').is_visible()
  assert page.locator('#availability-dialog').evaluate('(el)=>el.scrollWidth<=el.clientWidth')
  page.keyboard.press('Escape')
  assert page.locator('#availability-dialog').is_visible()
 page.locator('#floor').select_option('superior')
 page.locator('#guests-trigger').click();[page.locator('[data-party-room="0"][data-party-field="adults"][data-party-step="1"]').click() for _ in range(4)];page.locator('#apply-guests').click()
 # At six adults there is no capacity for an additional child.
 page.locator('#guests-trigger').click()
 assert page.locator('[data-party-field="children"][data-party-step="1"]').is_disabled()
 for _ in range(5):page.locator('[data-party-room="0"][data-party-field="adults"][data-party-step="-1"]').click()
 page.locator('[data-party-field="children"][data-party-step="1"]').click()
 page.locator('[data-child-room="0"]').select_option('6')
 page.locator('#apply-guests').click()
 expected_start=page.locator('#checkin').input_value();expected_end=page.locator('#checkout').input_value()
 with context.expect_page() as new_tab:
  page.locator('#search [type="submit"]').click()
 filtered=new_tab.value;filtered.wait_for_load_state()
 from urllib.parse import urlparse,parse_qs
 query=parse_qs(urlparse(filtered.url).query)
 assert query['start']==[expected_start] and query['end']==[expected_end] and query['guests']==['2'] and query['floor']==['superior']
 assert json.loads(query['party'][0])==[{'adults':1,'children_ages':[6]}]
 filtered.wait_for_selector('[data-options="triplo"]')
 assert filtered.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')==['triplo']
 assert filtered.locator('#floor').input_value()=='superior'
 assert filtered.locator('#guests').input_value()=='2'
 assert filtered.evaluate('window.stayParty.get()')==[{'adults':1,'children_ages':[6]}]
 assert page.url=='http://qa.test/' and page.locator('#availability-dialog').is_hidden()
 filtered.close()
 page.goto('http://qa.test/admin');page.wait_for_selector('[data-tab="rates"]');page.locator('[data-tab="rates"]').click();page.wait_for_selector('[data-base="superior:6"]')
 assert page.locator('[data-base]').count()==12
 page.locator('[data-base="superior:6"]').click()
 assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')=='none'
 page.keyboard.press('Tab')
 assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')=='solid'
 page.locator('#rate-dialog [data-close]').click()
 page.locator('[data-base="terreo:1"]').click();assert page.locator('#rate-dialog input[name="amount"]').input_value()=='100';page.locator('#rate-dialog [data-close]').click()
 # The owner can add/remove each amenity and choose every reference icon.
 page.locator('[data-tab="showcases"]').click()
 page.locator('[data-edit-showcase="duplo"]').click()
 options=page.locator('#showcase-icon-0 option').evaluate_all('(els)=>els.map(x=>x.value)')
 assert set(['elevator','heating','kettle','bath','shower','safe','minibar','desk','wardrobe','paper','toiletries','no-smoking','hair-dryer','towels','tv','toilet','wifi','breakfast']).issubset(options)
 page.locator('#showcase-add-amenity').click()
 page.locator('[data-amenity-icon]').last.select_option('hair-dryer')
 page.locator('[data-amenity-label]').last.fill('Secador de cabelo')
 page.locator('[data-remove-amenity]').first.click()
 page.locator('#showcase-save').click()
 page.wait_for_selector('#showcase-editor:not([open])',state='attached')
 saved=payloads[-1]
 assert any(x['icon']=='hair-dryer' for x in saved['amenities'])
 assert not any(x['icon']=='bath' for x in saved['amenities'])
 page.goto('http://qa.test/quartos')
 page.locator('[data-details="duplo"]').first.click()
 assert page.locator('#details-facts').get_by_text('Secador de cabelo').is_visible()
 assert 'Banheiro privativo' not in page.locator('#details-facts').inner_text()
 page.keyboard.press('Escape')
 page.locator('[data-details="triplo"]').first.click()
 assert 'Secador de cabelo' not in page.locator('#details-facts').inner_text()
 page.keyboard.press('Escape')
 page.goto('http://qa.test/admin')
 page.locator('[data-tab="bookings"]').click();assert page.locator('[data-confirm="101"]').count()==0;page.locator('[data-assign="101"]').click();page.locator('#assignment-dialog [type="submit"]').click();page.wait_for_selector('[data-confirm="101"]')
 assert payloads[-1]['room_id']==15
 assert not errors,errors
 print('PASS: four categories, mandatory floor, no tariff selector, responsive layout, category request, rates editor, owner assignment and confirmation gate. No JavaScript errors.')
 browser.close()
