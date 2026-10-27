"""Administrative timeline: actual DOM and JavaScript, synthetic API records only."""
from pathlib import Path
from datetime import datetime,date,timedelta
from zoneinfo import ZoneInfo
from urllib.parse import urlparse
import json,re
from playwright.sync_api import expect
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
today=datetime.now(ZoneInfo('America/Bahia')).date()
def day(n):return (today+timedelta(days=n)).isoformat()
rooms=[dict(id=100+n,name=str(n),floor='superior' if 8<=n<=15 else 'terreo',capacity=5 if n in [15,19] else 2 if n in [16,17] else 4 if n==18 else 3,active=1,type='casal') for n in range(19,0,-1)]
rooms.append(dict(id=120,name='20',floor='terreo',capacity=2,active=0,type='casal'))
def booking(id,number,start,end,status='confirmada',guest=None,assigned=True):
 return dict(id=id,room_id=100+number,room_name=str(number),room_floor='superior' if 8<=number<=15 else 'terreo',room_assigned=assigned,status=status,guest=guest or 'Hóspede '+str(id),phone='73912345678',guests=2,total=20000,start=day(start),end=day(end))
bookings=[booking(1,1,0,3,guest='João & Maria'),booking(2,1,3,6,guest='Próxima entrada'),booking(3,2,1,4,'pendente','Pedido pendente',False),booking(4,3,-4,-1,guest='Estadia antiga'),booking(5,4,-3,35,guest='Estadia longa'),booking(6,5,0,3,'cancelada','Não deve aparecer'),booking(7,6,0,2,'bloqueio','Manutenção'),booking(8,20,-4,-2,guest='Histórico inativo'),booking(9,7,2,3,guest='<img src=x onerror=alert(1)>')]
# Five months ahead, with a booking on the fifth of that month.
future_month=(today.month-1+5)%12+1;future_year=today.year+(today.month-1+5)//12
future=date(future_year,future_month,5);future_key=future.strftime('%Y-%m')
bookings.append(dict(booking(10,15,0,2,guest='Reserva daqui a cinco meses'),start=future.isoformat(),end=(future+timedelta(days=3)).isoformat()))
ns['state'].update(rooms=rooms,bookings=bookings);original=ns['route'];reads=[]
def route(r):
 if urlparse(r.request.url).path=='/api/bookings/3/assignment':
  b=next(x for x in bookings if x['id']==3);new_room=next(x for x in rooms if x['id']==r.request.post_data_json['room_id']);b.update(room_id=new_room['id'],room_name=new_room['name'],room_assigned=True)
  return r.fulfill(json={'ok':True})
 if urlparse(r.request.url).path=='/api/admin':reads.append(True)
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.route('**/*',route)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install()
 page.goto('http://qa.test/admin');page.locator('[data-tab="calendar"]').click();page.locator('.calendar-booking').first.wait_for()
 form=page.locator('[data-calendar-filter]')
 assert form.locator('[name="start"]').input_value()==day(0)
 assert page.locator('.calendar-day-heading').first.get_attribute('aria-current')=='date'
 assert page.locator('.calendar-room-label[role="rowheader"] strong').all_text_contents()==[str(i) for i in range(1,20)]
 assert page.locator('[data-calendar-booking="1"]').get_attribute('style')=='grid-column:1 / span 3'
 assert page.locator('[data-calendar-booking="2"]').get_attribute('style')=='grid-column:4 / span 3','Adjacent check-out/check-in must not overlap'
 assert 'confirmed' in page.locator('[data-calendar-booking="1"]').get_attribute('class')
 assert 'pending' in page.locator('[data-calendar-booking="3"]').get_attribute('class') and 'provisional' in page.locator('[data-calendar-booking="3"]').get_attribute('class')
 assert 'blocked' in page.locator('[data-calendar-booking="7"]').get_attribute('class')
 assert page.locator('[data-calendar-booking="6"]').count()==0
 assert page.locator('[data-calendar-viewport] img').count()==0
 assert page.locator('[data-calendar-booking="5"]').get_attribute('style')=='grid-column:1 / span 14','Range clipping'
 # The provisional booking opens details and uses the existing owner assignment flow.
 page.locator('[data-calendar-booking="3"]').click();page.locator('[data-calendar-assign]').click()
 page.locator('#assignment-dialog select').select_option('116');page.locator('#assignment-dialog [type="submit"]').click()
 page.locator('#message').filter(has_text='Quarto definido').wait_for()
 assert 'provisional' not in page.locator('[data-calendar-booking="3"]').get_attribute('class')
 assert page.locator('[data-calendar-booking="3"]').locator('xpath=../..').locator('[role="rowheader"] strong').inner_text()=='16'
 # Historical reservations are red, while an ongoing stay remains green.
 form.locator('[name="start"]').fill(day(-5));form.locator('[name="end"]').fill(day(10));form.locator('[type="submit"]').click()
 assert 'ended' in page.locator('[data-calendar-booking="4"]').get_attribute('class')
 assert page.locator('[data-calendar-booking="8"]').count()==1,'Include inactive units with bookings in selected period'
 page.locator('[data-calendar-booking="1"]').click();page.locator('#calendar-booking-dialog').wait_for(state='visible')
 assert page.locator('#calendar-booking-dialog h3').inner_text()=='João & Maria';page.locator('[data-calendar-close]').click()
 page.locator('#calendar-month').fill(future_key);page.locator('#calendar-month').dispatch_event('change')
 assert form.locator('[name="start"]').input_value()==future.strftime('%Y-%m-01')
 assert page.locator('[data-calendar-booking="10"]').is_visible()
 # Refresh data without losing month, unfinished date edits or the scroll position.
 viewport=page.locator('[data-calendar-viewport]');viewport.evaluate('(el)=>{el.scrollLeft=500;el.scrollTop=200}')
 scroll=viewport.evaluate('(el)=>[el.scrollLeft,el.scrollTop]')
 form.locator('[name="end"]').fill((future+timedelta(days=5)).isoformat())
 new=dict(bookings[-1],id=11,room_id=116,room_name='16',guest='Nova reserva automática',status='pendente');bookings.append(new)
 page.evaluate("document.dispatchEvent(new Event('lotus:admin-refresh'))")
 page.locator('[data-calendar-booking="11"]').wait_for(state='attached')
 assert form.locator('[name="end"]').input_value()==(future+timedelta(days=5)).isoformat()
 assert page.locator('#calendar-month').input_value()==future_key
 assert viewport.evaluate('(el)=>[el.scrollLeft,el.scrollTop]')==scroll
 next(x for x in bookings if x['id']==11)['status']='confirmada'
 page.evaluate("document.dispatchEvent(new Event('lotus:admin-refresh'))")
 expect(page.locator('[data-calendar-booking="11"]')).to_have_class(re.compile('.*confirmed.*'))
 # Native filters, constraints, previous/next periods and today button.
 page.locator('#calendar-floor').select_option('superior');assert page.locator('[data-calendar-booking="11"]').count()==0
 assert page.locator('.calendar-room-label[role="rowheader"] strong').all_text_contents()==[str(i) for i in range(8,16)]
 page.locator('#calendar-floor').select_option('');page.locator('#calendar-room').select_option('115');assert page.locator('.calendar-room-label[role="rowheader"] strong').all_text_contents()==['15']
 page.locator('#calendar-room').select_option('')
 form.locator('[name="start"]').fill(day(0));form.locator('[name="end"]').fill(day(100));form.locator('[type="submit"]').click();assert '93 dias' in page.locator('[data-calendar-error]').inner_text()
 page.locator('[data-calendar-today]').click();assert form.locator('[name="start"]').input_value()==day(0)
 page.locator('[data-calendar-shift="1"]').click();assert form.locator('[name="start"]').input_value()==day(14)
 page.locator('[data-calendar-shift="-1"]').click();assert form.locator('[name="start"]').input_value()==day(0)
 # Actual existing polling interval picks up additions; no fixture is written to the database.
 bookings.append(booking(12,18,0,2,'pendente','Reserva recebida agora'))
 before=len(reads);page.clock.run_for(16000)
 page.locator('[data-calendar-booking="12"]').wait_for(state='attached');assert len(reads)>before
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
  viewport.evaluate('(el)=>el.scrollLeft=300')
  box=page.locator('.calendar-room-label[role="rowheader"]').first.bounding_box();outer=viewport.bounding_box();assert abs(box['x']-outer['x'])<3,'Sticky left apartment labels'
 page.screenshot(path=str(ns['ROOT']/'work/admin-calendar.png'),full_page=True)
 page.locator('#logout').click();page.locator('#login').wait_for(state='visible');assert page.locator('[data-calendar-root]').count()==0
 assert errors==[],errors
 browser.close();print('PASS: current day; 19 numeric rooms; month/date ranges five months ahead; guest names and colors; ended/ongoing/adjacent stays; cancelled exclusion; provisional stock; clipped spans; sticky labels; filters; automatic updates preserving edits and scroll; mobile.')
