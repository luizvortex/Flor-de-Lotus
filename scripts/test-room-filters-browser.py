"""Room filters and booking payloads using synthetic APIs, without production requests."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs,urlencode
import json
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
ns['showcases'].reverse()
original=ns['route'];sold_out=False;unavailable_categories=set()
requests=[]
def route(r):
 u=urlparse(r.request.url)
 if u.path=='/api/bookings':
  payload=r.request.post_data_json;ns['payloads'].append(payload)
  return r.fulfill(json={'id':101,'status':'pendente','total':payload['expected_total'],'floor':payload['floor']})
 if u.path=='/api/availability':
  q=parse_qs(u.query);requests.append(q)
  categories=[row['slug'] for row in ns['showcases'] if q['floor']==['sem_preferencia'] or (row['slug'] in ['duplo','triplo-standard','familia'])==(q['floor']==['terreo'])]
  categories=[slug for slug in categories if slug not in unavailable_categories]
  # Broad offers deliberately exercise the UI's four-person Family boundary.
  offers=[dict(category_slug=slug,floor='terreo' if slug in ['duplo','triplo-standard','familia'] else 'superior',total=60000,starting_price=60000,room_count=len(json.loads(q['party'][0]))) for slug in categories]
  return r.fulfill(json={'rooms':[] if sold_out else offers,'nights':1})
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000});context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/quartos');page.wait_for_selector('.catalog-room')
 assert page.locator('.catalog-room').count()==6
 assert page.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')==['duplo','triplo','triplo-standard','triplo-superior','familia','familia-superior']
 def search(floor,party):
  params={'start':'2027-01-10','end':'2027-01-11','floor':floor,'guests':sum(r['adults']+len(r['children_ages']) for r in party),'party':json.dumps(party)}
  page.goto('http://qa.test/quartos?'+urlencode(params))
  page.wait_for_function("document.querySelector('#result-count').textContent.startsWith('Opções para')")
  return page.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')
 assert search('terreo',[{'adults':2,'children_ages':[]}])==['duplo']
 assert search('superior',[{'adults':2,'children_ages':[]}])==['triplo']
 page.locator('#rooms').screenshot(path=str(ns['ROOT']/'work/filtered-superior.png'))
 for floor in ['terreo','superior','sem_preferencia']:
  families=['familia','familia-superior'] if floor=='sem_preferencia' else ['familia' if floor=='terreo' else 'familia-superior']
  standard=['duplo','triplo'] if floor=='sem_preferencia' else (['duplo'] if floor=='terreo' else ['triplo'])
  triples=['triplo-standard','triplo-superior'] if floor=='sem_preferencia' else (['triplo-standard'] if floor=='terreo' else ['triplo-superior'])
  for size in [1,2]:
   assert search(floor,[{'adults':size,'children_ages':[]}])==standard
  assert search(floor,[{'adults':3,'children_ages':[]}])==triples
  for size in [4,5]:
   assert search(floor,[{'adults':size,'children_ages':[]}])==families,(floor,size)
  assert search(floor,[{'adults':2,'children_ages':[5]}])==triples
  assert search(floor,[{'adults':3,'children_ages':[5]}])==families,'Free child is the fourth occupant'
  assert search(floor,[{'adults':1,'children_ages':[0,5,17]}])==families
  assert search(floor,[{'adults':4,'children_ages':[5]}])==families
 assert search('sem_preferencia',[{'adults':2,'children_ages':[]}])==['duplo','triplo']
 assert 'Sem preferência' in page.locator('#result-count').inner_text()
 # Both a small party and a four-person family bind the selected offer's real floor.
 for size,options in [(2,[('duplo','terreo','Térreo'),('triplo','superior','Piso superior')]),(4,[('familia','terreo','Térreo'),('familia-superior','superior','Piso superior')])]:
  search('sem_preferencia',[{'adults':size,'children_ages':[]}])
  if size==4:page.locator('#rooms').screenshot(path=str(ns['ROOT']/'work/filtered-four-person-family.png'))
  for slug,floor,label in options:
   page.locator(f'[data-options="{slug}"]').click()
   assert label in page.locator('#details-options').inner_text()
   page.locator(f'[data-book-category="{slug}"]').click()
   assert label in page.locator('#booking-summary').inner_text()
   assert 'Sem preferência' not in page.locator('#booking-summary').inner_text()
   page.locator('#guest').fill('Teste sintético');page.locator('#phone').fill('65999999999')
   page.locator('#booking-form [type="submit"]').click();page.wait_for_selector('#booking-success[open]')
   assert ns['payloads'][-1]['floor']==floor
   assert ns['payloads'][-1]['category_slug']==slug
   assert ns['payloads'][-1]['party']==[{'adults':size,'children_ages':[]}]
   assert ns['payloads'][-1]['expected_total']==60000
   assert label in page.locator('#booking-receipt-summary').inner_text()
   page.locator('#booking-success [data-close-success]').first.click()
   page.wait_for_function("!document.querySelector('#search [type=submit]').disabled")
   assert page.locator('#floor').input_value()=='sem_preferencia'
 # Total across rooms never changes the per-room category boundary.
 assert search('sem_preferencia',[{'adults':2,'children_ages':[]},{'adults':2,'children_ages':[]}])==['duplo','triplo']
 assert search('sem_preferencia',[{'adults':4,'children_ages':[]},{'adults':2,'children_ages':[]}])==['familia','familia-superior']
 # Only return available families; never fall back to an incompatible Standard.
 unavailable_categories={'familia'}
 assert search('sem_preferencia',[{'adults':4,'children_ages':[]}])==['familia-superior']
 unavailable_categories={'familia','familia-superior'}
 assert search('sem_preferencia',[{'adults':4,'children_ages':[]}])==[]
 assert page.locator('#no-availability').is_visible()
 unavailable_categories=set()
 assert search('sem_preferencia',[{'adults':3,'children_ages':[]},{'adults':3,'children_ages':[]}])==['triplo-standard','triplo-superior']
 # Home popup keeps the no-preference option and party composition in its native GET/new tab.
 page.goto('http://qa.test/')
 page.locator('.showcase-copy > .showcase-rates').first.click()
 assert page.locator('#floor option:not([disabled])').all_text_contents()==['Sem preferência','Térreo','Piso superior']
 page.locator('#floor').select_option('sem_preferencia')
 page.locator('#guests-trigger').click()
 for _ in range(2):page.locator('[data-party-room="0"][data-party-field="adults"][data-party-step="1"]').click()
 page.locator('#apply-guests').click()
 expected_party=page.evaluate('window.stayParty.get()')
 with page.expect_popup() as popup:
  page.locator('#search [type="submit"]').click()
 target=popup.value;target.wait_for_load_state()
 forwarded=parse_qs(urlparse(target.url).query)
 assert forwarded['floor']==['sem_preferencia']
 assert json.loads(forwarded['party'][0])==expected_party
 target.wait_for_function("document.querySelectorAll('.catalog-room').length===2")
 assert target.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')==['familia','familia-superior']
 assert target.locator('#floor').input_value()=='sem_preferencia'
 target.close()
 # Six people in two rooms can use the normal categories: capacity is per room.
 assert search('terreo',[{'adults':3,'children_ages':[]},{'adults':3,'children_ages':[]}])==['triplo-standard']
 sold_out=True
 assert search('sem_preferencia',[{'adults':2,'children_ages':[]}])==[]
 assert page.locator('#no-availability').is_visible()
 assert page.locator('#message').inner_text()==''
 sold_out=False
 page.locator('#floor').select_option('superior')
 assert page.locator('.catalog-room').count()==6,'Editing filters invalidates the previous results'
 page.locator('#search [type="submit"]').click()
 page.wait_for_function("document.querySelector('#result-count').textContent.startsWith('Opções para')")
 assert page.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')==['triplo']
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert errors==[],errors
 browser.close()
 print('PASS: no-preference redirect and both-floor booking payloads; initial catalogue; both floors; four/five occupants; children count toward capacity; multiple rooms; empty result; refilter; responsive layout.')
