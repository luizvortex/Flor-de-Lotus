import sys,json
from playwright.sync_api import sync_playwright

base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 page=context.new_page();errors=[];outbound=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://**',lambda route:route.abort())
 # Observe the URL without opening or sending a real WhatsApp message.
 page.add_init_script("window.__contactOpens=[];window.open=(...args)=>{window.__contactOpens.push(args);return null}")
 page.on('request',lambda request:outbound.append(request.url) if 'NomeTeste' in request.url or '73123456789' in request.url else None)
 page.goto(base+'/',wait_until='domcontentloaded')
 form=page.locator('#whatsapp-form');form.scroll_into_view_if_needed()
 assert form.locator('input[type="email"]').count()==0
 assert not form.locator('#mensagem').get_attribute('required')
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#nome').fill('NomeTeste & Família')
 form.locator('#telefone').fill('12345')
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#telefone').fill('(73) 12345-6789')
 form.locator('button[type="submit"]').click()
 draft=page.evaluate("() => {const [url,target,options]=window.__contactOpens.at(-1);const u=new URL(url);return {host:u.host,path:u.pathname,text:u.searchParams.get('text'),target,options}}")
 assert draft['host']=='wa.me'
 assert draft['path']=='/'+page.locator('body').get_attribute('data-contact-whatsapp')
 assert 'NomeTeste & Família' in draft['text'] and 'E-mail:' not in draft['text']
 assert form.get_attribute('data-default-message') in draft['text']
 assert 'noopener' in draft['options'] and 'noreferrer' in draft['options']
 assert form.locator('[data-contact-status]').is_visible()
 assert form.locator('[data-contact-status] a').get_attribute('href').startswith('https://wa.me/')
 assert form.locator('#nome').input_value()=='NomeTeste & Família'
 form.locator('#telefone').fill('+351 912 345 678')
 form.locator('#mensagem').fill('Quero saber sobre datas & valores. Obrigado!')
 form.locator('button[type="submit"]').click()
 assert page.evaluate("new URL(window.__contactOpens.at(-1)[0]).searchParams.get('text').includes('datas & valores')")
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  form.scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert form.locator('button[type="submit"]').bounding_box()['height']>=44
 page.locator('#fale-conosco').screenshot(path='/tmp/flor-contact-desktop.png')
 assert not outbound,outbound
 assert not errors,errors
 context.close();browser.close()
 print('Contact form: name/phone only, optional message, validation, encoding, popup fallback and mobile passed.')
