"""Booking status panels and numeric room ordering; synthetic records only."""
from pathlib import Path
from urllib.parse import urlparse
import re
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
rooms=[dict(id=i,name=str(i),floor='terreo',capacity=4,price=10000,active=1,type='casal') for i in range(1,19)]
def booking(id,status,name,room_id,start='2027-01-10',assigned=True):
 return dict(id=id,status=status,guest=f'Guest {id}',phone='00000000000',guests=2,room_name=name,room_id=room_id,room_floor='terreo',room_assigned=assigned,total=20000,start=start,end=start[:-2]+str(int(start[-2:])+1).zfill(2))
bookings=[booking(201,'pendente','A definir',1,'2027-01-01',False),booking(202,'pendente','3',3,'2027-01-03'),booking(401,'confirmada','10',10),booking(402,'confirmada','2',2),booking(403,'confirmada','Quarto 1',1),booking(404,'confirmada','18',18),booking(405,'confirmada','02',2,'2027-02-01'),booking(301,'cancelada','4',4),booking(501,'bloqueio','7',7,'2027-01-05')]
ns['rooms']=rooms;ns['state'].update(rooms=rooms,bookings=bookings)
original=ns['route']
def route(r):
 path=urlparse(r.request.url).path
 match=re.fullmatch('/api/bookings/(\\d+)(/assignment)?',path)
 if match and r.request.method=='PUT':
  row=next(b for b in bookings if b['id']==int(match[1]));data=r.request.post_data_json
  if match[2]:
   room=next(x for x in rooms if x['id']==data['room_id']);row.update(room_id=room['id'],room_name=room['name'],room_assigned=True)
  else:row['status']=data['status']
  return r.fulfill(json={'ok':True})
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1100});page.route('**/*',route);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/admin');page.locator('[data-tab="bookings"]').click()
 panels=page.locator('[data-booking-status]')
 assert panels.evaluate_all('(els)=>els.map(el=>el.dataset.bookingStatus)')==['pendente','confirmada','cancelada']
 def group(status):return page.locator('[data-booking-status="'+status+'"]')
 def row_ids(status):return group(status).locator(':scope > .table-wrap [data-booking-row]').evaluate_all('(els)=>els.map(el=>Number(el.dataset.bookingRow))')
 assert row_ids('pendente')==[201,202]
 assert row_ids('confirmada')==[403,402,405,401,404]
 assert row_ids('cancelada')==[301]
 assert group('confirmada').locator('.booking-status-count').inner_text()=='5'
 # Each panel's master checkbox affects only its own table; global master includes all reservations.
 group('pendente').locator('[data-booking-select-all]').check()
 assert page.locator('[data-booking-select]:checked').count()==2
 group('cancelada').locator('[data-booking-select-all]').check()
 assert page.locator('[data-booking-select]:checked').count()==3
 group('pendente').locator('[data-booking-select-all]').uncheck()
 assert page.locator('[data-booking-select]:checked').count()==1
 assert group('cancelada').locator('[data-booking-select]').is_checked()
 page.locator('.booking-bulk [data-booking-select-all]').check()
 assert page.locator('[data-booking-select]:checked').count()==8
 page.locator('[data-booking-clear]').click()
 assert page.locator('[data-link-guest]').count()==0
 page.screenshot(path=str(ns['ROOT']/'work/booking-status-panels.png'))
 # Reassigning a confirmed reservation immediately moves it to the correct numeric position.
 page.locator('[data-assign="404"]').click();page.locator('#assignment-dialog select').select_option('4');page.locator('#assignment-dialog [type="submit"]').click()
 page.wait_for_function("document.querySelector('#message').textContent.includes('Quarto definido')")
 assert row_ids('confirmada')==[403,402,405,404,401]
 assert group('confirmada').locator('[data-booking-row="404"] td').nth(2).inner_text().startswith('4')
 # Confirmation and cancellation move the same reservation to the right panel after refresh.
 page.locator('[data-booking-select][value="202"]').check();page.locator('[data-confirm="202"]').click()
 page.wait_for_function("document.querySelector('[data-booking-status=confirmada] [data-booking-row=\"202\"]')!==null")
 assert row_ids('pendente')==[201]
 assert row_ids('confirmada')==[403,402,405,202,404,401]
 assert group('confirmada').locator('[data-booking-select][value="202"]').is_checked()
 page.once('dialog',lambda dialog:dialog.accept());page.locator('[data-cancel="202"]').click()
 page.wait_for_function("document.querySelector('[data-booking-status=cancelada] [data-booking-row=\"202\"]')!==null")
 assert 202 not in row_ids('confirmada') and 202 in row_ids('cancelada')
 # Stock blocks remain separately labelled and cancellable, without being listed as confirmed reservations.
 assert 501 not in row_ids('confirmada')
 page.locator('.booking-blocks summary').click();page.once('dialog',lambda dialog:dialog.accept());page.locator('[data-cancel="501"]').click()
 page.wait_for_function("document.querySelector('[data-booking-status=cancelada] [data-booking-row=\"501\"]')!==null")
 assert page.locator('.booking-blocks').count()==0
 for width in [320,390,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)+': '+str(page.evaluate('document.documentElement.scrollWidth'))
 bookings.clear();page.locator('#refresh').click()
 page.wait_for_function("document.querySelectorAll('[data-booking-row]').length===0")
 assert panels.count()==3 and panels.locator('.empty').count()==3
 assert page.locator('.booking-bulk [data-booking-select-all]').is_disabled()
 assert errors==[],errors
 browser.close();print('PASS: three status panels, numeric rooms 1/2/10/18, same-room date order, per-panel/global selection, reassignment, status transitions, stock blocks, empty and mobile states.')
