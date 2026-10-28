"""Browser -> compiled Next -> local REST/Storage adapters -> native PostgreSQL RPCs."""
import io,json,re,sys
from datetime import datetime,timedelta,timezone
from urllib.parse import urlparse
from PIL import Image
from playwright.sync_api import sync_playwright,expect
base,guest_cookie,other_cookie,variant,backend=sys.argv[1:]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',extra_http_headers={'Origin':base})
 context.add_cookies([{'name':'lotus_guest_auth','value':guest_cookie,'url':base}]);page=context.new_page();page.route('https://**',lambda route:route.abort());errors=[];payloads=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.on('request',lambda request:payloads.append(request.post_data_json) if request.url==base+'/api/romance/book' and request.method=='POST' else None)
 page.goto(base+'/quartos',wait_until='networkidle')
 expect(page.locator('.romance-cta')).to_have_attribute('target','_blank')
 with page.expect_popup() as opened:page.locator('.romance-cta').click()
 experience=opened.value;experience.wait_for_load_state('networkidle');expect(experience).to_have_url(base+'/experiencias/decoracao-romantica');experience.close()
 page.goto(base+'/experiencias/decoracao-romantica',wait_until='networkidle')
 expect(page.locator('#rx-title')).to_have_text('O amor merece um cenário inesquecível.')
 expect(page.locator('#rx-account-status')).to_contain_text('Conta conectada')
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),width
  page.screenshot(path=f'work/romance-experience-hero-{width}.png')
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('.rx-hero-actions a').first.click();expect(page.locator('#search')).to_be_visible()
 starts=(datetime.now(timezone.utc)+timedelta(days=20)).date().isoformat();ends=(datetime.now(timezone.utc)+timedelta(days=22)).date().isoformat()
 page.locator('#dates-trigger').click();page.locator(f'[data-day="{starts}"]:not([disabled])').first.click();page.locator(f'[data-day="{ends}"]:not([disabled])').first.click();page.locator('#apply-dates').click()
 page.locator('#rx-children').fill('1');page.locator('[data-rx-age]').select_option('5')
 page.locator('#rx-search-button').click();expect(page.locator('[data-rx-choose]').first).to_be_visible(timeout=20000)
 # Capacity includes the free child; a real rate is returned by the native DB routines.
 page.locator('[data-rx-choose]').first.focus();page.keyboard.press('Enter');expect(page.locator('[data-rx-room-card].is-selected')).to_have_count(1)
 quantity=page.locator(f'[data-rx-quantity="{variant}"]');quantity.fill('99');expect(page.locator('#rx-finish')).to_be_disabled();quantity.fill('0');page.locator(f'[data-rx-variant="{variant}"][data-rx-qty-step="1"]').click();expect(quantity).to_have_value('1')
 expect(page.locator('#rx-memories')).to_be_visible();expect(page.locator('#rx-quote-status')).to_contain_text('Valores conferidos',timeout=20000)
 expect(page.locator('.rx-grand-total')).to_contain_text('450,00')
 # Server rejects bytes disguised as a PNG, before creating any upload metadata.
 invalid=context.request.post(base+'/api/romance/upload',multipart={'request_id':'00000000-0000-4000-8000-000000000019','photo':{'name':'fake.png','mimeType':'image/png','buffer':b'<svg onload=alert(1)></svg>'}})
 assert invalid.status==415,invalid.text()
 im=Image.new('RGB',(800,600),'#e8d5ba');buf=io.BytesIO();im.save(buf,format='PNG')
 photo={'name':'private-synthetic.png','mimeType':'image/png','buffer':buf.getvalue()}
 page.locator('#rx-files').set_input_files(photo);expect(page.locator('[data-rx-remove]')).to_have_count(1,timeout=20000)
 expect(page.locator('[data-rx-remove]')).to_be_enabled(timeout=15000);page.locator('[data-rx-remove]').click();expect(page.locator('[data-rx-remove]')).to_have_count(0,timeout=20000)
 page.locator('#rx-files').set_input_files(photo);expect(page.locator('[data-rx-remove]')).to_have_count(1,timeout=20000)
 expect(page.locator('[data-rx-photo]')).to_have_attribute('src',re.compile('token='),timeout=10000)
 file_id=page.locator('[data-rx-photo]').get_attribute('data-rx-photo')
 page.locator('#rx-instructions').fill('<img src=x onerror=alert(1)> Instrução sintética privada')
 page.locator('#rx-guest').fill('Hóspede sintético');page.locator('#rx-phone').fill('73999999999');page.locator('#rx-consent').check()
 expect(page.locator('#rx-finish')).to_be_enabled(timeout=20000)
 for lang,heading in [('en','Love deserves an unforgettable setting.'),('es','El amor merece un escenario inolvidable.'),('he','לאהבה מגיעה תפאורה בלתי נשכחת.'),('pt','O amor merece um cenário inesquecível.')]:
  page.locator('.site-language summary').first.click();page.locator(f'[data-language="{lang}"]').first.click();expect(page.locator('#rx-title')).to_have_text(heading)
  expect(page.locator('#rx-guest')).to_have_value('Hóspede sintético')
  assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  if lang=='he':expect(page.locator('html')).to_have_attribute('dir','rtl')
 page.locator('#rx-finish').click();expect(page.locator('#rx-receipt')).to_be_visible(timeout=20000);expect(page.locator('#rx-receipt')).to_contain_text('Aguardando confirmação')
 assert len(payloads)==1
 payload=payloads[0];assert payload['expected_total']==45000 and payload['photos']==[file_id] and payload['party'][0]['children_ages']==[5]
 retry=context.request.post(base+'/api/romance/book',data=payload);assert retry.status==201,retry.text();assert retry.json()['replayed']
 changed=context.request.post(base+'/api/romance/book',data=dict(payload,phone='73888888888'));assert changed.status==409
 linked=context.request.get(base+'/api/guest/bookings').json();assert linked['bookings'][0]['romance']['decoration_total']==5000
 mine=context.request.get(base+'/api/romance/mine').json();assert len(mine['orders'])==1;order=mine['orders'][0]
 assert order['stay_total']==40000 and order['decoration_total']==5000 and order['booking_status']=='pendente'
 assert order['instructions']=='<img src=x onerror=alert(1)> Instrução sintética privada'
 # Another Google identity has no order or photograph access.
 other=browser.new_context(extra_http_headers={'Origin':base});other.add_cookies([{'name':'lotus_guest_auth','value':other_cookie,'url':base}])
 assert other.request.get(base+'/api/romance/mine').json()['orders']==[]
 assert other.request.get(base+'/api/romance/file?id='+file_id).status==404
 assert context.request.post(base+'/api/romance/remove',data={'id':file_id}).status==404
 # Owner can inspect private photos and keep accommodation/preparation/finance separate.
 admin=browser.new_context(viewport={'width':1440,'height':1000},extra_http_headers={'Origin':base});admin.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}]);owner=admin.new_page();owner.route('https://**',lambda route:route.abort())
 owner.goto(base+'/admin',wait_until='networkidle');owner.locator('[data-tab="bookings"]').click();expect(owner.locator('tr[data-booking-row] strong').filter(has_text='Decoração personalizada')).to_have_count(1)
 owner.locator('[data-open-romance]').first.click();expect(owner.locator('[data-ra-detail]')).to_have_count(1,timeout=20000);owner.locator('[data-ra-detail]').click();expect(owner.locator('.ra-instructions')).to_have_text(order['instructions'])
 owner.locator('[data-ra-photo]').click();expect(owner.locator('[data-ra-image]')).to_be_visible(timeout=10000)
 owner.locator('[data-ra-status] select').select_option('preparado');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('confirme a hospedagem',timeout=15000)
 owner.locator('[data-ra-close]').click();owner.locator('[data-assign]').first.click();owner.locator('#assignment-dialog [type="submit"]').click();expect(owner.locator('[data-confirm]')).to_have_count(1,timeout=15000);owner.locator('[data-confirm]').click();expect(owner.locator('[data-booking-status="confirmada"] tr[data-booking-row]')).to_have_count(1,timeout=15000)
 owner.locator('[data-open-romance]').first.click();expect(owner.locator('[data-ra-detail]')).to_have_count(1,timeout=15000);owner.locator('[data-ra-detail]').click();owner.locator('[data-ra-status] select').select_option('em_preparacao');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 owner.locator('[data-ra-view="products"]').click();owner.locator('[data-ra-edit]').first.click();owner.locator('[name="variant_price"]').fill('75,00');owner.locator('[data-ra-product] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 details=admin.request.get(base+'/api/romance/admin_orders').json()['orders'][0];assert details['decoration_total']==5000 and details['total']==45000 and details['operational']=='em_preparacao' and details['financial']=='aguardando'
 assert admin.request.post(base+'/api/romance/admin_remove_photos',data={'id':order['id']}).status==409
 owner.locator('[data-ra-view="orders"]').click();owner.locator('[data-ra-detail]').click();owner.locator('[data-ra-status] select').select_option('concluido');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 owner.locator('[data-ra-detail]').click();owner.once('dialog',lambda dialog:dialog.accept());owner.locator('[data-ra-purge]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Fotografias pessoais excluídas',timeout=15000)
 assert admin.request.get(base+'/api/romance/admin_file?id='+file_id).status==404
 retained=admin.request.get(base+'/api/romance/admin_orders').json()['orders'][0];assert retained['photos']==[] and retained['total']==45000 and retained['items']==details['items']
 assert not errors,errors
 other.close();admin.close();browser.close()
 print('PASS: new tab, hero, calendar, child capacity/pricing, native availability, product quantities, private upload/removal, secure photo access, four languages/RTL, finalization, retry, admin assignment/preparation and immutable prices.')
