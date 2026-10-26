"""Language-selector/browser contract. Provider mocked; no external translation requests."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
PROVIDER = r'''
window.google={translate:{TranslateElement:function(options,id){
 window.translationOptions=options;
 const select=document.createElement('select');select.className='goog-te-combo';
 select.innerHTML='<option value="">Select</option><option value="en">English</option><option value="iw">Hebrew</option>';
 select.addEventListener('change',()=>{
   const title=document.querySelector('.home-hero-tagline');
   if(title)title.textContent=select.value==='iw'?'המפלט שלכם בין הים לטבע.':'Your retreat between the sea and nature.';
 });
 document.getElementById(id).append(select);
}}};window.lotusTranslateReady();
'''
def route(request):
 u=urlparse(request.request.url)
 if u.hostname=='translate.google.com':return request.fulfill(body=PROVIDER,content_type='application/javascript')
 if u.hostname!='qa.test':return request.fulfill(status=200,body='')
 path=unquote(u.path)
 if path.startswith('/api/'):
  return request.fulfill(json={'user':None,'google_enabled':False,'rooms':[],'showcases':[],'packages':[]})
 if path in ['/','/quartos']:
  file=ROOT/('index.html' if path=='/' else 'reservas.html')
  body=file.read_text()
  if path=='/quartos':body=body.replace('</head>','<link rel="stylesheet" href="/site-language.css"><script src="/site-language.js" defer></script></head>')
  return request.fulfill(body=body,content_type='text/html')
 file=(ROOT/path.lstrip('/')).resolve()
 if ROOT in file.parents and file.is_file():
  mime={'.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}.get(file.suffix,'application/octet-stream')
  return request.fulfill(body=file.read_bytes(),content_type=mime)
 return request.fulfill(status=404,body='')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':950})
 context.route('**/*',route)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://qa.test/');page.wait_for_selector('.home-language summary')
 assert page.locator('html').get_attribute('lang')=='pt-BR'
 assert page.locator('.home-language [data-language-label]').inner_text()=='Português'
 assert page.locator('script[src*="translate.google.com"]').count()==0
 summary=page.locator('.home-language summary');summary.click()
 assert page.locator('.home-language [data-language]').count()==3
 box=summary.bounding_box();contact=page.locator('.home-nav-links a').last.bounding_box();account=page.locator('.home-account').bounding_box()
 assert box['x']>contact['x']+contact['width']
 assert box['y']>account['y']
 page.screenshot(path=str(ROOT/'work/language-desktop.png'))
 page.keyboard.press('Escape');assert not page.locator('.home-language').evaluate('(el)=>el.open')
 summary.click();page.locator('.home-language [data-language="en"]').click()
 page.wait_for_function("document.documentElement.lang==='en'")
 assert page.locator('.home-hero-tagline').inner_text()=='Your retreat between the sea and nature.'
 assert page.evaluate("localStorage.getItem('lotus-language')")=='en'
 assert page.evaluate('window.translationOptions.pageLanguage')=='pt'
 summary.click();page.locator('.home-language [data-language="he"]').click()
 page.wait_for_function("document.documentElement.dir==='rtl'")
 assert page.locator('html').get_attribute('lang')=='he'
 assert page.locator('.home-hero-tagline').inner_text()=='המפלט שלכם בין הים לטבע.'
 assert page.evaluate("localStorage.getItem('lotus-language')")=='he'
 page.evaluate("window.scrollTo(0,innerHeight+100)");page.wait_for_timeout(300)
 assert page.locator('.home-header').evaluate('(el)=>el.classList.contains("is-compact")')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(ROOT/'work/language-hebrew.png'))
 # Preference is applied on the next public page, and Portuguese restores original HTML.
 page.goto('http://qa.test/quartos');page.wait_for_function("document.documentElement.lang==='he'")
 page.locator('.public-language summary').click();page.locator('.public-language [data-language="pt"]').click()
 page.wait_for_function("document.documentElement.lang==='pt-BR'")
 assert page.evaluate("localStorage.getItem('lotus-language')")=='pt'
 page.goto('http://qa.test/');page.set_viewport_size({'width':390,'height':844})
 page.locator('.home-menu-toggle').click()
 mobile=page.locator('.mobile-language summary');assert mobile.is_visible();mobile.click()
 assert page.locator('.mobile-language [data-language="en"]').is_visible()
 page.keyboard.press('Escape')
 assert page.locator('#home-menu').evaluate('(el)=>el.open')
 mobile.click();page.locator('.mobile-language [data-language="en"]').click()
 page.wait_for_function("document.documentElement.lang==='en'")
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(ROOT/'work/language-mobile.png'))
 # Blocking the provider reports a recoverable failure instead of claiming a translation.
 failed=browser.new_context(viewport={'width':1440,'height':950});failed.route('**/*',route)
 failed.route('https://translate.google.com/**',lambda r:r.abort())
 broken=failed.new_page();broken.goto('http://qa.test/')
 broken.locator('.home-language summary').click();broken.locator('.home-language [data-language="en"]').click()
 broken.wait_for_selector('.language-status.is-error')
 assert broken.locator('html').get_attribute('lang')=='pt-BR'
 assert broken.evaluate("localStorage.getItem('lotus-language')") is None
 assert errors==[],errors
 browser.close()
 print('PASS: flags, header position, three languages, RTL, persistence, Portuguese restoration, mobile, keyboard, provider failure. External provider mocked.')
