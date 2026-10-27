"""Public room-card filtering using synthetic inventory/availability, no bookings created."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs,urlencode
import json
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
original=ns['route'];sold_out=False
requests=[]
def route(r):
 u=urlparse(r.request.url)
 if u.path=='/api/availability':
  q=parse_qs(u.query);requests.append(q)
  categories=['duplo','triplo-standard','familia'] if q['floor']==['terreo'] else ['triplo','familia']
  # Include broad offers; the UI must keep five/six-person parties in Família.
  offers=[dict(category_slug=slug,floor=q['floor'][0],total=60000,starting_price=60000,room_count=len(json.loads(q['party'][0]))) for slug in categories]
  return r.fulfill(json={'rooms':[] if sold_out else offers,'nights':1})
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.route('**/*',route);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/quartos');page.wait_for_selector('.catalog-room')
 assert page.locator('.catalog-room').count()==4
 def search(floor,party):
  params={'start':'2027-01-10','end':'2027-01-11','floor':floor,'guests':sum(r['adults']+len(r['children_ages']) for r in party),'party':json.dumps(party)}
  page.goto('http://qa.test/quartos?'+urlencode(params))
  page.wait_for_function("document.querySelector('#result-count').textContent.startsWith('Opções para')")
  return page.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')
 assert search('terreo',[{'adults':2,'children_ages':[]}])==['duplo','triplo-standard']
 assert search('superior',[{'adults':2,'children_ages':[]}])==['triplo']
 page.locator('#rooms').screenshot(path=str(ns['ROOT']/'work/filtered-superior.png'))
 for floor in ['terreo','superior']:
  for size in [1,2,3,4]:
   assert 'familia' not in search(floor,[{'adults':size,'children_ages':[]}])
  assert search(floor,[{'adults':5,'children_ages':[]}])==['familia']
  assert 'familia' not in search(floor,[{'adults':3,'children_ages':[5]}])
  assert search(floor,[{'adults':6,'children_ages':[]}])==['familia']
  assert search(floor,[{'adults':4,'children_ages':[5]}])==['familia'],'Free child occupies a bed'
 # Six people in two rooms can use the normal categories: capacity is per room.
 assert search('terreo',[{'adults':3,'children_ages':[]},{'adults':3,'children_ages':[]}])==['duplo','triplo-standard']
 sold_out=True
 assert search('terreo',[{'adults':2,'children_ages':[]}])==[]
 assert page.locator('#no-availability').is_visible()
 assert page.locator('#message').inner_text()==''
 sold_out=False
 page.locator('#floor').select_option('superior')
 assert page.locator('.catalog-room').count()==4,'Editing filters invalidates the previous results'
 page.locator('#search [type="submit"]').click()
 page.wait_for_function("document.querySelector('#result-count').textContent.startsWith('Opções para')")
 assert page.locator('.catalog-room').evaluate_all('(els)=>els.map(el=>el.dataset.slug)')==['triplo']
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert errors==[],errors
 browser.close()
 print('PASS: initial catalogue; both floors; five/six occupants; children count toward capacity; multiple rooms; empty result; refilter; responsive layout.')
