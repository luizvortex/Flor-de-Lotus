"""Administrative bulk UI, synthetic API fixtures; no real bookings altered."""
from pathlib import Path
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
bookings=[dict(id=101+i,guest=f'Synthetic guest {i}',phone='00000000000',guests=2,room_id=1,room_name='1',room_floor='terreo',start='2027-01-01',end='2027-01-02',total=20000,status=status,room_assigned=i!=4) for i,status in enumerate(['pendente','pendente','cancelada','cancelada','pendente'])]
ns['state']['bookings']=bookings
calls=[];reject=False
original=ns['route']
def route(r):
 if r.request.url.endswith('/api/bookings/bulk'):
  payload=r.request.post_data_json;calls.append(payload)
  if reject:return r.fulfill(status=409,json={'error':'A reserva mudou. Atualize a lista.'})
  ids=payload['ids']
  if payload['action']=='confirm':
   for b in bookings:
    if b['id'] in ids:b['status']='confirmada'
  else:bookings[:]=[b for b in bookings if b['id'] not in ids]
  return r.fulfill(json={'ok':True,'count':len(ids),'action':payload['action']})
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});page.route('**/*',route);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/admin');page.locator('[data-tab="bookings"]').click()
 assert page.locator('[data-booking-select]').count()==5
 confirm=page.locator('[data-booking-bulk="confirm"]');delete=page.locator('[data-booking-bulk="delete"]')
 assert confirm.is_disabled() and delete.is_disabled()
 page.locator('[data-booking-select][value="101"]').check()
 assert page.locator('[data-booking-select-all]').evaluate('(el)=>el.indeterminate')
 assert '(1)' in confirm.inner_text()
 # Auto-refresh preserves an explicit selection, without selecting newly appearing rows.
 page.evaluate("document.dispatchEvent(new Event('lotus:admin-refresh'))")
 page.wait_for_timeout(200);assert page.locator('[data-booking-select][value="101"]').is_checked()
 page.locator('[data-booking-select-all]').check()
 assert '5 reservas selecionadas' in page.locator('[data-bulk-count]').inner_text()
 assert '(2)' in confirm.inner_text() and '(2)' in delete.inner_text()
 page.once('dialog',lambda dialog:dialog.dismiss());delete.click();assert calls==[]
 page.once('dialog',lambda dialog:dialog.accept());confirm.click()
 page.wait_for_function("document.querySelector('#message').textContent.includes('2 reserva(s) confirmada(s)')")
 assert calls[-1]=={'action':'confirm','ids':[101,102]}
 assert bookings[-1]['status']=='pendente' and bookings[-1]['room_assigned']==False
 assert confirm.is_disabled()
 # Deletion only submits cancelled reservations, even with active ones selected.
 page.screenshot(path=str(ns['ROOT']/'work/bulk-bookings-desktop.png'))
 page.once('dialog',lambda dialog:dialog.accept());delete.click()
 page.wait_for_function("document.querySelector('#message').textContent.includes('2 reserva(s) excluída(s)')")
 assert calls[-1]=={'action':'delete','ids':[103,104]}
 assert page.locator('[data-booking-select]').count()==3
 page.locator('[data-booking-clear]').click();assert '0 reservas' in page.locator('[data-bulk-count]').inner_text()
 # A stale-selection conflict preserves selection and reports the backend failure.
 bookings[0]['status']='pendente';page.evaluate("document.dispatchEvent(new Event('lotus:admin-refresh'))");page.wait_for_timeout(200)
 page.locator('[data-booking-select][value="101"]').check();reject=True
 page.once('dialog',lambda dialog:dialog.accept());confirm.click()
 page.wait_for_function("document.querySelector('#message').textContent.includes('A reserva mudou')")
 assert page.locator('[data-booking-select][value="101"]').is_checked()
 assert bookings[0]['status']=='pendente'
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert confirm.is_visible();page.locator('.booking-bulk').screenshot(path=str(ns['ROOT']/'work/bulk-bookings-mobile.png'))
 assert errors==[],errors
 browser.close()
 print('PASS: selection, select-all/mixed, refresh, confirmation eligibility, deletion eligibility, cancel dialog, conflict, mobile. Synthetic fixtures only.')
