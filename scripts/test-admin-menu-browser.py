"""Persistent navigation ordering with synthetic server-side settings."""
from pathlib import Path
from urllib.parse import urlparse
import copy
from playwright.sync_api import expect
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
defaults=['overview','setup','site','experiences','reviews','rooms','showcases','policies','calendar','bookings','excursions','reports','rates','packages']
saved={'order':['bookings','calendar']+[key for key in defaults if key not in ['bookings','calendar']],'revision':1};writes=[];original=ns['route']
def route(r):
 if urlparse(r.request.url).path=='/api/admin-menu':
  if r.request.method=='PUT':
   data=r.request.post_data_json
   if data['revision']!=saved['revision']:return r.fulfill(status=409,json={'error':'A ordem foi alterada em outra aba. Recarregue a ordem salva.'})
   assert sorted(data['order'])==sorted(defaults);writes.append(data);saved.update(order=data['order'],revision=saved['revision']+1)
  return r.fulfill(json=saved)
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.route('**/*',route);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/admin');opener=page.locator('[data-admin-menu-open]');opener.wait_for(state='visible')
 nav=page.locator('.sidebar nav[aria-label="Administração"]')
 expect(nav.locator('[data-tab]').first).to_have_attribute('data-tab','bookings')
 assert nav.locator('.admin-menu-rank').all_text_contents()==[str(n) for n in range(1,15)]
 opener.click();dialog=page.locator('.admin-menu-dialog');assert dialog.is_visible()
 assert dialog.locator('[data-menu-move="bookings"][data-step="-1"]').is_disabled()
 dialog.locator('[data-menu-move="calendar"][data-step="-1"]').click()
 assert dialog.locator('[data-menu-position]').first.get_attribute('data-menu-position')=='calendar'
 position=dialog.locator('[data-menu-position="rooms"]');position.fill('1');position.press('Tab')
 assert dialog.locator('[data-menu-position]').first.get_attribute('data-menu-position')=='rooms'
 dialog.locator('[data-menu-save]').click();expect(dialog.locator('[data-menu-message]')).to_have_text('Ordem salva para o painel.')
 expect(nav.locator('[data-tab]').first).to_have_attribute('data-tab','rooms')
 assert writes[-1]['order'][:3]==['rooms','calendar','bookings']
 dialog.locator('[data-menu-close]').click();nav.locator('[data-tab="rooms"]').click();assert page.locator('#page-title').inner_text()=='Cada quarto, uma experiência.'
 # New browser context reads the saved order, without relying on browser storage.
 second=browser.new_context(viewport={'width':390,'height':900});second.route('**/*',route);mobile=second.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto('http://qa.test/admin')
 mobile_nav=mobile.locator('.sidebar nav[aria-label="Administração"]');expect(mobile_nav.locator('[data-tab]').first).to_have_attribute('data-tab','rooms')
 mobile.locator('[data-admin-menu-open]').click();mobile_dialog=mobile.locator('.admin-menu-dialog')
 # Cancelled draft changes do not reorder the actual sidebar.
 mobile_dialog.locator('[data-menu-default]').click();mobile_dialog.locator('[data-menu-close]').click();assert mobile_nav.locator('[data-tab]').first.get_attribute('data-tab')=='rooms'
 mobile.locator('[data-admin-menu-open]').click();saved['revision']+=1
 mobile_dialog.locator('[data-menu-move="calendar"][data-step="-1"]').click();mobile_dialog.locator('[data-menu-save]').click()
 expect(mobile_dialog.locator('[data-menu-message]')).to_contain_text('outra aba')
 mobile_dialog.locator('[data-menu-reload]').click();expect(mobile_dialog.locator('[data-menu-message]')).to_have_text('Ordem salva carregada.')
 for width in [320,390,768,1440]:
  mobile.set_viewport_size({'width':width,'height':1000});assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
  assert mobile_dialog.evaluate('(el)=>el.scrollWidth<=el.clientWidth'),str(width)
 mobile_dialog.screenshot(path=str(ns['ROOT']/'work/admin-menu-order.png'))
 mobile_dialog.locator('[data-menu-close]').click();mobile.locator('#logout').click();mobile.locator('#login').wait_for(state='visible');assert mobile.locator('[data-admin-menu-open]').is_hidden()
 assert errors==[],errors
 browser.close();print('PASS: saved server order, numeric positions, up/down boundaries, preserved navigation handlers, cross-browser persistence, cancel/default drafts, conflict reload, responsive dialog and logout.')
