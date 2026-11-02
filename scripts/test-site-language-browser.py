"""Real local translation dictionary and browser interactions. No external translator."""
import subprocess
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
fishing_html=subprocess.check_output(['node','--input-type=module','-e',r'''
import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync('src/lib/fishing-page.ts','utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,'');const context={};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source),context);
console.log(context.renderFishingPage(JSON.parse(fs.readFileSync('src/lib/site-content-defaults.json','utf8')),'http://qa.test'));
'''],cwd=ROOT,text=True)

def route(request):
 u=urlparse(request.request.url)
 if u.hostname!='qa.test':return request.fulfill(status=200,body='')
 path=unquote(u.path)
 if path.startswith('/api/'):
  return request.fulfill(json={'user':None,'google_enabled':False,'rooms':[],'showcases':[],'packages':[]})
 templates={'/':'index.html','/quartos':'reservas.html','/grupos':'grupos.html','/itacare':'itacare.html','/pacotes':'pacotes.html','/avaliacoes':'avaliacoes.html'}
 if path in templates or path=='/pescadores':
  body=fishing_html if path=='/pescadores' else (ROOT/templates[path]).read_text()
  if 'src="/site-language.js"' not in body:body=body.replace('</head>','<link rel="stylesheet" href="/site-language.css"><script src="/site-language.js" defer></script></head>')
  return request.fulfill(body=body,content_type='text/html')
 file=(ROOT/path.lstrip('/')).resolve()
 if ROOT in file.parents and file.is_file():
  mime={'.js':'application/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}.get(file.suffix,'application/octet-stream')
  return request.fulfill(body=file.read_bytes(),content_type=mime)
 return request.fulfill(status=404,body='')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':950});context.route('**/*',route)
 page=context.new_page();errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if 'translate.google' in r.url else None)
 page.goto('http://qa.test/');page.wait_for_selector('.home-language summary')
 assert page.locator('html').get_attribute('lang')=='pt-BR'
 assert page.locator('.home-language [data-language-label]').inner_text()=='Português'
 original=page.locator('.home-hero-tagline').inner_text()
 original_about=page.locator('.about-description p').first.inner_text()
 summary=page.locator('.home-language summary');summary.click()
 assert page.locator('.home-language [data-language]').count()==4
 box=summary.bounding_box();contact=page.locator('.home-nav-links a').last.bounding_box();account=page.locator('.home-account').bounding_box()
 assert box['x']>contact['x']+contact['width'] and box['y']>account['y']
 page.keyboard.press('Escape');assert not page.locator('.home-language').evaluate('(el)=>el.open')
 summary.click();page.locator('.home-language [data-language="en"]').click()
 page.wait_for_function("document.documentElement.lang==='en'")
 assert page.locator('.home-hero-tagline').inner_text()=='Your retreat between the sea and nature.'
 assert page.locator('#about-title').inner_text()=='About the inn'
 assert page.locator('.about-description p').first.inner_text().startswith('Between the green garden')
 assert page.locator('.home-nav-links a').first.text_content()=='The inn'
 assert page.evaluate("localStorage.getItem('lotus-language')")=='en'
 assert page.locator('.language-credit').count()==0
 page.screenshot(path=str(ROOT/'work/language-native-english.png'))
 # Real selectors keep functioning after visible text and accessible names change.
 page.locator('#availability-dialog').evaluate('(el)=>el.showModal()')
 page.locator('#guests-trigger').click()
 assert page.locator('#party-room-list strong').first.inner_text()=='Adults'
 page.locator('[data-party-field="children"][data-party-step="1"]').first.click()
 page.wait_for_function("document.querySelector('.party-ages label').textContent.includes('Child')")
 assert 'Select an age' not in page.locator('.party-ages select').inner_text() # real UI uses Age at check-in
 assert 'Age at check-in' in page.locator('.party-ages select').inner_text()
 page.locator('[data-child-room="0"]').select_option('5')
 page.locator('#apply-guests').click()
 page.wait_for_function("document.querySelector('#guests-summary').textContent.includes('3 guests')")
 entry_before=page.locator('#checkin').input_value()
 page.locator('#availability-dialog').evaluate('(el)=>el.close()')
 # Hebrew is translated from the Portuguese originals, never from the English display.
 summary.click();page.locator('.home-language [data-language="he"]').click()
 page.wait_for_function("document.documentElement.lang==='he'")
 assert page.locator('.home-hero-tagline').inner_text()=='הפינה שלכם בין הים לטבע.'
 assert page.locator('#about-title').inner_text()=='על בית ההארחה'
 assert page.locator('html').get_attribute('dir')=='rtl'
 assert page.locator('#checkin').input_value()==entry_before
 assert page.evaluate('window.stayParty.get()')==[{'adults':2,'children_ages':[5]}]
 page.evaluate("const p=document.createElement('p');p.id='dynamic-localization';p.textContent='Café da manhã incluso';document.body.append(p)")
 page.wait_for_function("document.querySelector('#dynamic-localization').textContent==='ארוחת בוקר כלולה'")
 page.screenshot(path=str(ROOT/'work/language-native-hebrew.png'))
 summary.click();page.locator('.home-language [data-language="pt"]').click()
 page.wait_for_function("document.documentElement.lang==='pt-BR'")
 assert page.locator('.home-hero-tagline').inner_text()==original
 assert page.locator('.about-description p').first.inner_text()==original_about
 assert page.locator('#dynamic-localization').inner_text()=='Café da manhã incluso'
 assert page.locator('#checkin').input_value()==entry_before
 assert page.evaluate('window.stayParty.get()')==[{'adults':2,'children_ages':[5]}]
 # Preference is applied on other public pages using the real local dictionary.
 summary.click();page.locator('.home-language [data-language="en"]').click()
 page.goto('http://qa.test/quartos');page.wait_for_function("document.documentElement.lang==='en'")
 assert page.locator('.catalog-title h2').inner_text()=='Choose your room'
 assert page.locator('#floor option[value="terreo"]').inner_text()=='Ground floor'
 assert page.locator('.site-language,[data-language]').count()==0
 # All public subpages inherit the homepage choice, without creating any selector.
 for language in ['en','he','es']:
  page.goto('http://qa.test/');page.locator('.home-language summary').click();page.locator(f'.home-language [data-language="{language}"]').click()
  page.wait_for_function('(lang)=>document.documentElement.lang===lang',arg=language)
  for path in ['/quartos','/grupos','/pescadores','/itacare','/pacotes','/avaliacoes']:
   page.goto('http://qa.test'+path);page.wait_for_function('(lang)=>document.documentElement.lang===lang',arg=language)
   assert page.locator('.site-language,[data-language]').count()==0,(language,path)
   assert page.evaluate("localStorage.getItem('lotus-language')")==language
   assert page.locator('html').get_attribute('dir')==('rtl' if language=='he' else 'ltr')
 # Leave English selected for the existing mobile-home checks.
 page.goto('http://qa.test/');page.locator('.home-language summary').click();page.locator('.home-language [data-language="en"]').click()
 page.wait_for_function("document.documentElement.lang==='en'")
 page.goto('http://qa.test/');page.set_viewport_size({'width':390,'height':844})
 page.wait_for_function("document.documentElement.lang==='en'")
 page.locator('.home-menu-toggle').click();mobile=page.locator('.mobile-language summary');mobile.click()
 page.keyboard.press('Escape');assert page.locator('#home-menu').evaluate('(el)=>el.open')
 mobile.click();page.locator('.mobile-language [data-language="he"]').click()
 page.wait_for_function("document.documentElement.lang==='he'")
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#home-menu').screenshot(path=str(ROOT/'work/language-native-mobile.png'))
 assert external==[],external
 assert errors==[],errors
 browser.close()
 print('PASS: actual local English/Hebrew translations, original Portuguese restoration without reload, dynamic controls and text, preserved form values, RTL, mobile, keyboard, EN/HE/ES cross-page preference and selectors only on home. No translation service mocked or requested.')
