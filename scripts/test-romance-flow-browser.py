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
 # All public templates share the transparent header asset; no changes to admin/home behavior.
 for selector in ['.rx-page-header','.rx-nav']:
  expect(page.locator(selector)).to_have_css('background-color','rgba(0, 0, 0, 0)')
 expect(page.locator('.rx-page-header')).to_have_css('position','absolute')
 header_page=context.new_page();header_page.route('https://**',lambda route:route.abort())
 for path,selector in [('/quartos','.catalog-top'),('/grupos','.account-page-header'),('/pacotes','.account-page-header'),('/minha-conta','.account-page-header'),('/itacare','.explore-header'),('/avaliacoes','.rv-header'),('/privacidade','.information-header'),('/condicoes','.information-header')]:
  header_page.goto(base+path,wait_until='domcontentloaded');expect(header_page.locator('link[href="/public-header.css"]')).to_have_count(1);expect(header_page.locator(selector)).to_have_css('background-color','rgba(0, 0, 0, 0)')
  for width in [360,768,1440]:
   header_page.set_viewport_size({'width':width,'height':1000});assert header_page.locator(selector).is_visible()
 header_page.close()

 def step(number):
  page.locator(f'[data-rx-step="{number}"]').click()
  expect(page.locator('.rx-steps > .rx-step:visible')).to_have_count(1)
 def finish_attempt():
  step(4);page.locator('#rx-continue').click()
 expect(page.locator('#hospedagem')).to_be_visible();expect(page.locator('#personalizar')).to_be_hidden();expect(page.locator('#rx-final-review')).not_to_be_visible()
 page.locator('#rx-continue').click();expect(page.locator('#rx-search-button')).to_be_focused();assert len(payloads)==0
 # Catalog failures/empty states remain recoverable in their own step.
 page.route('**/api/romance/catalog',lambda route:route.fulfill(status=503,json={'error':'synthetic outage'}));page.reload(wait_until='networkidle');step(2);expect(page.locator('#rx-retry-catalog')).to_be_visible();expect(page.locator('#rx-products')).to_have_attribute('aria-busy','false')
 page.unroute('**/api/romance/catalog');page.locator('#rx-retry-catalog').click();expect(page.locator('.rx-product-options')).to_have_count(7,timeout=20000)
 page.route('**/api/romance/catalog',lambda route:route.fulfill(json={'products':[]}));page.reload(wait_until='networkidle');step(2);expect(page.locator('#rx-catalog-status')).to_contain_text('sendo preparadas');page.unroute('**/api/romance/catalog');page.locator('#rx-retry-catalog').click();expect(page.locator('.rx-product-options')).to_have_count(7,timeout=20000)
 expect(page.locator('#romantic-room-preview,[data-rrp-layer],input[type=range]')).to_have_count(0)
 expect(page.locator('#rx-selected-gallery')).to_contain_text('Sua surpresa começa')
 visitor=browser.new_context(extra_http_headers={'Origin':base});guest=visitor.new_page();guest.route('https://**',lambda route:route.abort());guest.goto(base+'/experiencias/decoracao-romantica',wait_until='networkidle');guest.locator('[data-rx-step="2"]').click();guest.locator('.rx-product-options').filter(has=guest.get_by_text('Vinho',exact=True)).locator('summary').click();guest.locator('.rx-product-options').filter(has=guest.get_by_text('Vinho',exact=True)).locator('[data-rx-style]').first.check();guest.locator('#rx-message').fill('Mensagem antes do login');guest.locator('[data-rx-step="4"]').click();expect(guest.locator('#rx-google')).to_be_visible();expect(guest.locator('#rx-message')).to_have_value('Mensagem antes do login');assert visitor.request.post(base+'/api/romance/draft',data={'request_id':'00000000-0000-4000-8000-000000000001'}).status==401;visitor.close()
 step(1)
 for width in [360,375,390,430,768,1024,1600]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=f'work/romance-experience-hero-{width}.png')
 page.set_viewport_size({'width':1440,'height':1000});page.locator('.rx-hero-actions a').first.click();expect(page.locator('#search')).to_be_visible()
 starts=(datetime.now(timezone.utc)+timedelta(days=20)).date().isoformat();ends=(datetime.now(timezone.utc)+timedelta(days=22)).date().isoformat()
 page.locator('#dates-trigger').click();page.locator(f'[data-day="{starts}"]:not([disabled])').first.click();page.locator(f'[data-day="{ends}"]:not([disabled])').first.click();page.locator('#apply-dates').click()
 page.locator('#rx-children').fill('1');page.locator('[data-rx-age]').select_option('5');page.locator('#rx-search-button').click();expect(page.locator('[data-rx-choose]').first).to_be_visible(timeout=20000)
 page.locator('[data-rx-choose]').first.focus();page.keyboard.press('Enter');expect(page.locator('[data-rx-room-card].is-selected')).to_have_count(1);expect(page.locator('#hospedagem')).to_be_visible();expect(page.locator('#personalizar')).to_be_hidden()
 page.locator('#rx-continue').click();expect(page.locator('#personalizar')).to_be_visible();expect(page.locator('#hospedagem')).to_be_hidden()
 wine=page.locator('.rx-product-options').filter(has=page.get_by_text('Vinho',exact=True));wine.locator('summary').click();wine.locator('[data-rx-style]').first.check();expect(page.locator('.rx-grand-total')).to_contain_text('475,00',timeout=20000);wine.locator('[data-rx-style]').nth(1).check();wine.locator('[data-rx-quantity]').nth(1).fill('2');wine.locator('[data-rx-style]').nth(2).check();expect(wine.locator('[data-rx-quantity]').nth(1)).to_have_value('0');expect(wine.locator('[data-rx-quantity]').nth(2)).to_have_value('2');expect(page.locator('.rx-grand-total')).to_contain_text('550,00',timeout=20000)
 page.locator('#rx-message').fill('Uma surpresa especial');expect(page.locator('#rx-message-preview')).to_have_text('Uma surpresa especial')
 for width in [360,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1');page.locator('#personalizar').screenshot(path=f'work/romance-wizard-surprise-{width}.png')
 page.locator('#rx-continue').click();expect(page.locator('#rx-memories')).to_be_visible();expect(page.locator('#rx-photo-optional')).to_be_visible();page.locator('#rx-continue').click();expect(page.locator('#rx-contact')).to_be_visible()
 page.locator('#rx-consent').check();page.locator('#rx-continue').click();expect(page.locator('#rx-phone')).to_be_focused();page.locator('#rx-phone').fill('739999');page.locator('#rx-continue').click();expect(page.locator('#rx-phone')).to_be_focused();page.locator('#rx-phone').fill('73999999999')
 page.locator('#rx-guest').fill('   ');page.locator('#rx-continue').click();expect(page.locator('#rx-guest')).to_be_focused();page.locator('#rx-guest').fill('Hóspede sintético');page.locator('#rx-consent').uncheck();page.locator('#rx-continue').click();expect(page.locator('#rx-consent')).to_be_focused();page.locator('#rx-consent').check();assert len(payloads)==0
 step(2);expect(wine.locator('[data-rx-quantity]').nth(2)).to_have_value('2');expect(page.locator('#rx-message')).to_have_value('Uma surpresa especial')
 page.locator('[data-rx-remove-item]').click();expect(page.locator('[data-rx-selected]')).to_have_count(0)
 frame=page.locator('.rx-product-options').filter(has=page.locator(f'[data-rx-quantity="{variant}"]'));frame.locator('summary').click();quantity=page.locator(f'[data-rx-quantity="{variant}"]');quantity.fill('99');finish_attempt();expect(quantity).to_be_focused();quantity.fill('1');expect(page.locator('.rx-grand-total')).to_contain_text('450,00',timeout=20000)
 page.locator('#rx-continue').click();expect(page.locator('#rx-memories')).to_be_visible();page.locator('#rx-continue').click();expect(page.locator('#rx-files')).to_be_focused();expect(page.locator('#rx-validation-note')).to_contain_text('fotografias exigidas');assert len(payloads)==0
 invalid=context.request.post(base+'/api/romance/upload',multipart={'request_id':'00000000-0000-4000-8000-000000000019','photo':{'name':'fake.png','mimeType':'image/png','buffer':b'<svg onload=alert(1)></svg>'}});assert invalid.status==415
 im=Image.new('RGB',(800,600),'#e8d5ba');buf=io.BytesIO();im.save(buf,format='PNG');photo={'name':'private-synthetic.png','mimeType':'image/png','buffer':buf.getvalue()}
 page.locator('#rx-files').set_input_files({'name':'invalid.txt','mimeType':'text/plain','buffer':b'invalid'});expect(page.locator('#rx-upload-status')).to_contain_text('JPG')
 transfer=page.evaluate_handle('(bytes)=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],"private-synthetic.png",{type:"image/png"}));return data;}',list(buf.getvalue()))
 page.dispatch_event('#rx-dropzone','dragenter',{'dataTransfer':transfer});expect(page.locator('#rx-dropzone')).to_have_class(re.compile('is-dragging'));page.dispatch_event('#rx-dropzone','drop',{'dataTransfer':transfer});expect(page.locator('[data-rx-remove]')).to_have_count(1,timeout=20000);expect(page.locator('[data-rx-remove]')).to_be_enabled(timeout=15000);page.locator('[data-rx-remove]').click();expect(page.locator('[data-rx-remove]')).to_have_count(0,timeout=20000)
 page.locator('#rx-files').set_input_files(photo);expect(page.locator('[data-rx-photo]')).to_have_attribute('src',re.compile('token='),timeout=15000)
 step(2);quantity.fill('0');wine.locator('[data-rx-quantity]').nth(2).fill('1');finish_attempt();expect(page.locator('#rx-photos')).to_be_focused();page.locator('[data-rx-remove]').click();expect(page.locator('#rx-dropzone')).to_be_hidden(timeout=15000)
 step(2);wine.locator('[data-rx-quantity]').nth(2).fill('0');quantity.fill('1');page.locator('#rx-continue').click();page.locator('#rx-files').set_input_files(photo);expect(page.locator('[data-rx-photo]')).to_have_attribute('src',re.compile('token='),timeout=15000)
 file_id=page.locator('[data-rx-photo]').get_attribute('data-rx-photo');page.locator('#rx-instructions').fill('<img src=x onerror=alert(1)> Instrução sintética privada')
 page.locator('#rx-back').click();expect(page.locator('#personalizar')).to_be_visible();page.locator('#rx-message').fill('Surpresa <svg onload=alert(1)> para você');page.locator('#rx-back').click();expect(page.locator('[data-rx-room-card].is-selected')).to_have_count(1);expect(page.locator('#rx-message')).to_have_value('Surpresa <svg onload=alert(1)> para você')
 step(4);expect(page.locator('#rx-review blockquote')).to_have_text('Surpresa <svg onload=alert(1)> para você');expect(page.locator('#rx-final-review')).not_to_be_visible();expect(page.locator('#rx-phone')).to_have_value(re.compile('73'))
 for lang,heading in [('en','Love deserves an unforgettable setting.'),('es','El amor merece un escenario inolvidable.'),('he','לאהבה מגיעה תפאורה בלתי נשכחת.'),('pt','O amor merece um cenário inesquecível.')]:
  page.locator('.site-language summary').first.click();page.locator(f'[data-language="{lang}"]').first.click();expect(page.locator('#rx-title')).to_have_text(heading);expect(page.locator('#rx-guest')).to_have_value('Hóspede sintético');assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  if lang=='he':expect(page.locator('html')).to_have_attribute('dir','rtl')
 for width in [360,375,390,430,768,1024,1600]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1');page.locator('#rx-contact').screenshot(path=f'work/romance-wizard-review-{width}.png')
 page.set_viewport_size({'width':1440,'height':1000});page.locator('#rx-continue').click();final=page.locator('#rx-final-review');expect(final).to_be_visible();expect(final).to_contain_text('450,00');assert len(payloads)==0
 page.keyboard.press('Escape');expect(final).not_to_be_visible();expect(page.locator('#rx-contact')).to_be_visible();page.locator('#rx-continue').click()
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});final.screenshot(path=f'work/romance-final-review-dialog-{width}.png')
 page.locator('#rx-finish').click();expect(final).not_to_be_visible();modal=page.get_by_role('dialog',name='Sua surpresa começou.');expect(modal).to_be_visible(timeout=20000);expect(modal).to_contain_text('Aguardando confirmação');expect(modal.locator('a')).to_have_attribute('href','/minha-conta');expect(modal.locator('.rx-receipt-close')).to_be_focused()
 page.keyboard.press('Shift+Tab');expect(modal.locator('#rx-new')).to_be_focused();page.keyboard.press('Tab');expect(modal.locator('.rx-receipt-close')).to_be_focused()
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});box=modal.bounding_box();assert abs(box['x']+box['width']/2-width/2)<2;assert box['height']<=970;assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1');modal.screenshot(path=f'work/romance-receipt-dialog-{width}.png')
 page.keyboard.press('Escape');expect(modal).not_to_be_visible();expect(page.locator('[data-rx-step="4"]')).to_be_focused()
 assert len(payloads)==1
 payload=payloads[0];assert payload['expected_total']==45000 and payload['photos']==[file_id] and payload['party'][0]['children_ages']==[5]
 retry=context.request.post(base+'/api/romance/book',data=payload);assert retry.status==201,retry.text();assert retry.json()['replayed']
 changed=context.request.post(base+'/api/romance/book',data=dict(payload,phone='73888888888'));assert changed.status==409
 linked=context.request.get(base+'/api/guest/bookings').json();assert linked['bookings'][0]['romance']['decoration_total']==5000
 mine=context.request.get(base+'/api/romance/mine').json();assert len(mine['orders'])==1;order=mine['orders'][0]
 assert order['stay_total']==40000 and order['decoration_total']==5000 and order['booking_status']=='pendente'
 assert order['instructions']=='Mensagem especial:\nSurpresa <svg onload=alert(1)> para você\n\nInstruções das fotografias:\n<img src=x onerror=alert(1)> Instrução sintética privada'
 # My account opens only the matching private order, without leaving the page.
 account=context.new_page();account.route('https://**',lambda route:route.abort());account.goto(base+'/minha-conta',wait_until='networkidle');account.get_by_role('button',name='Ver decoração personalizada').click()
 details=account.get_by_role('dialog',name='Decoração personalizada');expect(details).to_be_visible();expect(details.locator('.guest-decoration-items')).to_contain_text('Porta-retrato sintético');expect(details.locator('.guest-decoration-items')).to_contain_text('Uma fotografia');expect(details.locator('.guest-decoration-notes')).to_contain_text('Surpresa <svg onload=alert(1)> para você');expect(details.locator('.guest-decoration-notes svg')).to_have_count(0);expect(details.locator('[data-decoration-photo]')).to_have_attribute('src',re.compile('token='),timeout=15000);expect(details).to_contain_text('450,00');expect(details).to_contain_text('Aguardando confirmação');assert account.url==base+'/minha-conta'
 for width in [360,390,768,1440]:
  account.set_viewport_size({'width':width,'height':1000});assert account.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1');details.screenshot(path=f'work/account-decoration-checklist-{width}.png')
 account.keyboard.press('Escape');expect(details).not_to_be_visible();expect(details.locator('img')).to_have_count(0);expect(account.get_by_role('button',name='Ver decoração personalizada')).to_be_focused()
 account.route('**/api/romance/mine',lambda route:route.fulfill(status=503,json={'error':'Falha sintética'}));account.get_by_role('button',name='Ver decoração personalizada').click();expect(details.get_by_role('button',name='Tentar novamente')).to_be_visible();account.unroute('**/api/romance/mine');details.get_by_role('button',name='Tentar novamente').click();expect(details.locator('.guest-decoration-items')).to_contain_text('Porta-retrato sintético');details.locator('.guest-decoration-close').click();account.close()
 # Another Google identity has no order or photograph access.
 other=browser.new_context(extra_http_headers={'Origin':base});other.add_cookies([{'name':'lotus_guest_auth','value':other_cookie,'url':base}])
 assert other.request.get(base+'/api/romance/mine').json()['orders']==[]
 assert other.request.get(base+'/api/romance/file?id='+file_id).status==404
 assert context.request.post(base+'/api/romance/remove',data={'id':file_id}).status==404
 # Owner can inspect private photos and keep accommodation/preparation/finance separate.
 admin=browser.new_context(viewport={'width':1440,'height':1000},extra_http_headers={'Origin':base});admin.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}]);owner=admin.new_page();owner.route('https://**',lambda route:route.abort())
 owner.goto(base+'/admin',wait_until='networkidle');owner.locator('[data-romance-view="products"]').click();expect(owner.locator('[data-ra-new]')).to_be_visible(timeout=15000);owner.locator('[data-ra-close]').click();owner.locator('[data-tab="bookings"]').click();expect(owner.locator('tr[data-booking-row] strong').filter(has_text='Decoração personalizada')).to_have_count(1)
 owner.locator('[data-open-romance]:not([data-romance-view])').first.click();expect(owner.locator('[data-ra-detail]')).to_have_count(1,timeout=20000);owner.locator('[data-ra-detail]').click();expect(owner.locator('.ra-instructions')).to_have_text(order['instructions'])
 owner.locator('[data-ra-photo]').click();expect(owner.locator('[data-ra-image]')).to_be_visible(timeout=10000)
 owner.locator('[data-ra-status] select').select_option('preparado');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('confirme a hospedagem',timeout=15000)
 owner.locator('[data-ra-close]').click();owner.locator('[data-assign]').first.click();owner.locator('#assignment-dialog [type="submit"]').click();expect(owner.locator('[data-confirm]')).to_have_count(1,timeout=15000);owner.locator('[data-confirm]').click();expect(owner.locator('[data-booking-status="confirmada"] tr[data-booking-row]')).to_have_count(1,timeout=15000)
 owner.locator('[data-open-romance]:not([data-romance-view])').first.click();expect(owner.locator('[data-ra-detail]')).to_have_count(1,timeout=15000);owner.locator('[data-ra-detail]').click();owner.locator('[data-ra-status] select').select_option('em_preparacao');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 owner.locator('[data-ra-view="products"]').click();owner.locator('.ra-product').filter(has_text='Porta-retrato sintético').locator('[data-ra-edit]').click();owner.locator('[name="variant_price"]').fill('75,00');owner.locator('[data-ra-product] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 details=admin.request.get(base+'/api/romance/admin_orders').json()['orders'][0];assert details['decoration_total']==5000 and details['total']==45000 and details['operational']=='em_preparacao' and details['financial']=='aguardando'
 assert admin.request.post(base+'/api/romance/admin_remove_photos',data={'id':order['id']}).status==409
 owner.locator('[data-ra-view="orders"]').click();owner.locator('[data-ra-detail]').click();owner.locator('[data-ra-status] select').select_option('concluido');owner.locator('[data-ra-status] [type="submit"]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Alteração salva',timeout=15000)
 owner.locator('[data-ra-detail]').click();owner.once('dialog',lambda dialog:dialog.accept());owner.locator('[data-ra-purge]').click();expect(owner.locator('[data-ra-message]')).to_contain_text('Fotografias pessoais excluídas',timeout=15000)
 assert admin.request.get(base+'/api/romance/admin_file?id='+file_id).status==404
 retained=admin.request.get(base+'/api/romance/admin_orders').json()['orders'][0];assert retained['photos']==[] and retained['total']==45000 and retained['items']==details['items']
 assert not errors,errors
 other.close();admin.close();browser.close()
 print('PASS: new tab, hero, calendar, child capacity/pricing, native availability, product quantities, private upload/removal, secure photo access, four languages/RTL, finalization, retry, admin assignment/preparation and immutable prices.')
