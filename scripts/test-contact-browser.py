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
 assert form.locator('input[type="email"],input[type="tel"],#telefone').count()==0
 assert not form.locator('#mensagem').get_attribute('required')
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#nome').fill('NomeTeste & Família')
 dates=page.evaluate('''()=>{const today=document.querySelector('#contact-arrival').min;const add=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};return {past:add(-1),arrival:add(5),departure:add(8)}}''')
 form.locator('#contact-arrival').fill(dates['past'])
 form.locator('#contact-departure').fill(dates['departure'])
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-arrival').fill(dates['arrival'])
 form.locator('#contact-departure').fill(dates['arrival'])
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-departure').fill(dates['departure'])
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-guests').fill('0');form.locator('#contact-pet').select_option('nao')
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-guests').fill('2.5');form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-guests').fill('3');form.locator('#contact-pet').select_option('')
 form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==0
 form.locator('#contact-pet').select_option('nao')
 assert form.locator('#contact-pet-size').is_disabled()
 form.locator('button[type="submit"]').click()
 draft=page.evaluate("() => {const [url,target,options]=window.__contactOpens.at(-1);const u=new URL(url);return {host:u.host,path:u.pathname,text:u.searchParams.get('text'),target,options}}")
 assert draft['host']=='wa.me'
 assert draft['path']=='/'+page.locator('body').get_attribute('data-contact-whatsapp')
 assert 'NomeTeste & Família' in draft['text'] and 'E-mail:' not in draft['text']
 assert form.get_attribute('data-default-message') in draft['text']
 assert 'Meu telefone:' not in draft['text']
 assert 'Hóspedes: 3' in draft['text'] and 'Pet: Não' in draft['text']
 assert 'Entrada: '+'/'.join(reversed(dates['arrival'].split('-'))) in draft['text']
 assert 'Saída: '+'/'.join(reversed(dates['departure'].split('-'))) in draft['text']
 assert 'noopener' in draft['options'] and 'noreferrer' in draft['options']
 assert form.locator('[data-contact-status]').is_visible()
 assert form.locator('[data-contact-status] a').get_attribute('href').startswith('https://wa.me/')
 assert form.locator('#nome').input_value()=='NomeTeste & Família'
 form.locator('#mensagem').fill('Quero saber sobre datas & valores. Obrigado!')
 form.locator('button[type="submit"]').click()
 assert page.evaluate("new URL(window.__contactOpens.at(-1)[0]).searchParams.get('text').includes('datas & valores')")
 form.locator('#contact-pet').select_option('sim')
 assert form.locator('#contact-pet-size').is_visible() and form.locator('#contact-pet-size').is_enabled()
 before=page.evaluate('window.__contactOpens.length');form.locator('button[type="submit"]').click()
 assert page.evaluate('window.__contactOpens.length')==before
 form.locator('#contact-pet-size').select_option('sim');form.locator('button[type="submit"]').click()
 assert page.evaluate("new URL(window.__contactOpens.at(-1)[0]).searchParams.get('text').includes('Pet: Sim — pequeno porte')")
 form.locator('#contact-pet-size').select_option('nao');form.locator('button[type="submit"]').click()
 assert page.evaluate("new URL(window.__contactOpens.at(-1)[0]).searchParams.get('text').includes('outro porte (consultar a pousada)')")
 form.locator('#contact-pet').select_option('nao')
 assert form.locator('#contact-pet-size').is_hidden() and form.locator('#contact-pet-size').input_value()==''
 form.locator('button[type="submit"]').click()
 assert page.evaluate("new URL(window.__contactOpens.at(-1)[0]).searchParams.get('text').includes('Pet: Não')")
 form.locator('#contact-pet').select_option('sim');form.locator('#contact-pet-size').select_option('sim')
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  form.scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert form.locator('button[type="submit"]').bounding_box()['height']>=44
 page.locator('#fale-conosco').screenshot(path='/tmp/flor-contact-desktop.png')
 assert not outbound,outbound
 assert not errors,errors
 context.close();browser.close()
 print('Contact form: name and stay dates, no phone, optional message, guest count, conditional pet size, date validation, encoding, popup fallback and mobile passed.')
