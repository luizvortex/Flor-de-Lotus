"""Triplo Standard upload/retry/save against synthetic APIs; no real photo changes."""
from pathlib import Path
from urllib.parse import urlparse
from io import BytesIO
import os
from PIL import Image
source=Path(__file__).with_name('test-category-booking-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-category-booking-browser.py'))};exec(source,ns)
original=ns['route'];uploads=[];fail=False
room_before=ns['json'].loads(ns['json'].dumps(next(row for row in ns['showcases'] if row['slug']=='triplo-standard')))
new_url='/img casal/casal1.jpg'
def route(r):
 if urlparse(r.request.url).path=='/api/showcase-upload':
  uploads.append(r.request.post_data_buffer)
  if fail:return r.fulfill(status=503,json={'error':'Falha de conexão de teste.'})
  return r.fulfill(json={'url':new_url})
 return original(r)
buf=BytesIO();Image.frombytes('RGB',(1200,1200),os.urandom(1200*1200*3)).save(buf,format='PNG')
assert len(buf.getvalue())>3*1024*1024
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.route('**/*',route);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/admin');page.locator('[data-tab="showcases"]').click()
 page.locator('[data-edit-showcase="triplo-standard"]').click()
 assert page.locator('#detail-bathroom,#detail-views').count()==0
 photo=page.locator('.showcase-photo-edit').nth(2)
 old=photo.locator('img').get_attribute('src')
 fail=True
 photo.locator('[data-upload]').set_input_files({'name':'large.png','mimeType':'image/png','buffer':buf.getvalue()})
 page.wait_for_function("document.querySelectorAll('.showcase-photo-edit')[2].textContent.includes('Falha de conexão de teste.')")
 assert photo.locator('img').get_attribute('src')==old
 assert page.locator('#showcase-save').is_enabled()
 fail=False
 photo.locator('[data-upload]').set_input_files({'name':'large.png','mimeType':'image/png','buffer':buf.getvalue()})
 page.wait_for_function("document.querySelectorAll('.showcase-photo-edit')[2].textContent.includes('large.png enviada.')")
 assert photo.locator('img').get_attribute('src')==new_url
 assert len(uploads)==2 and all(len(body)<3*1024*1024 for body in uploads)
 page.locator('#showcase-save').click();page.wait_for_selector('#showcase-editor',state='hidden')
 saved=ns['payloads'][-1]
 assert saved['photos'][2]['url']==new_url
 assert saved['details']['bathroom']==room_before['details']['bathroom']
 assert saved['details'].get('views')==room_before['details'].get('views')
 assert saved['amenities']==room_before['amenities']
 assert next(row for row in ns['showcases'] if row['slug']=='triplo-standard')['photos'][2]['url']==new_url
 page.locator('[data-edit-showcase="triplo-standard"]').click()
 assert photo.locator('img').get_attribute('src')==new_url
 assert not errors,errors
 browser.close()
 print('PASS: large Triplo Standard photo optimized, failure shown beside photo, retry, save and reopen persisted photo.')
