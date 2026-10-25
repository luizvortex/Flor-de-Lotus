import sys
from playwright.sync_api import sync_playwright
base,backend=sys.argv[1:3]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000});context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 context.add_init_script('''window.__tones=0;window.__notices=[];window.Notification=class {static permission='default';static async requestPermission(){this.permission='granted';return 'granted';}constructor(title,options){window.__notices.push({title,options});}close(){}};window.AudioContext=class {state='suspended';currentTime=0;destination={};async resume(){this.state='running';}createOscillator(){return {frequency:{value:0},connect(){},start(){window.__tones++;},stop(){}}}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}};document.hasFocus=()=>false;''')
 page=context.new_page();errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**',lambda r:(external.append(r.request.url) if 'wa.me' in r.request.url or 'graph.facebook.com' in r.request.url else None,r.abort()))
 def arrival(number):
  assert context.request.post(backend+'/__test__/new-alert',data={'id':number}).ok
  page.evaluate("document.dispatchEvent(new Event('lotus:admin-alert-refresh'))")
 page.goto(base+'/admin',wait_until='networkidle');assert not page.title().startswith('(')
 page.locator('[data-admin-alert-open]').click();page.locator('[data-alert-sound]').click()
 assert page.evaluate('window.__tones')==3
 page.locator('[data-alert-notifications]').click();assert page.evaluate('Notification.permission')=='granted'
 arrival(101);page.wait_for_function("()=>document.title.startsWith('(1)')")
 assert page.locator('[data-admin-alert-count]').inner_text()=='1'
 assert page.locator('.admin-alert-toast').is_visible()
 page.wait_for_function('()=>window.__tones===6&&window.__notices.length===1')
 arrival(102);page.wait_for_function("()=>document.title.startsWith('(2)')")
 page.wait_for_function('()=>window.__tones===9&&window.__notices.length===2')
 page.locator('[data-alert-read-all]').click();page.wait_for_function("()=>!document.title.startsWith('(')")
 assert 'Nenhum aviso' in page.locator('[data-alert-unread]').inner_text()
 page.locator('.admin-alert-whatsapp summary').click();page.locator('#admin-alert-phone').fill('+55 (73) 99999-9999');page.locator('[data-alert-phone-form] button').click()
 page.get_by_text('Destinatário salvo. O envio automático depende da conexão com a API do WhatsApp.').wait_for()
 assert page.locator('#admin-alert-phone').input_value()=='5573999999999'
 assert 'ainda não conectado' in page.locator('[data-alert-whatsapp-status]').inner_text()
 page.locator('[data-alert-close]').click()
 # Polling alerts must not replace an editor draft.
 page.locator('[data-tab="site"]').click();page.locator('[data-cms-field="hero.title"]').fill('Rascunho preservado')
 arrival(103);page.wait_for_function("()=>document.title.startsWith('(1)')")
 assert page.locator('[data-cms-field="hero.title"]').input_value()=='Rascunho preservado'
 page.reload(wait_until='networkidle');page.wait_for_function("()=>document.title.startsWith('(1)')")
 assert page.evaluate('window.__tones')==0
 page.locator('[data-admin-alert-open]').click();assert page.locator('#admin-alert-phone').input_value()=='5573999999999'
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':900});box=page.locator('.admin-alert-dialog').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1
 assert not errors,errors
 assert not external,external
 page.locator('[data-alert-close]').click();page.locator('#logout').click();page.wait_for_function("()=>!document.querySelector('#login').hidden")
 assert not page.title().startswith('(')
 browser.close();print('Admin alerts: tab count, unread/read, audible chime, permission-based browser notice, private recipient, no WhatsApp send, editor preservation, reload/logout and mobile layout passed.')
