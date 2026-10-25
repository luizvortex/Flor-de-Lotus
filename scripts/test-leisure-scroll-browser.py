import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1366,390]:
  page=browser.new_page(viewport={'width':width,'height':650},reduced_motion='no-preference')
  page.route('https://**',lambda r:r.abort());page.goto(sys.argv[1]+'/',wait_until='networkidle')
  page.evaluate('''()=>{window.__reveals=[];const original=window.scrollBy.bind(window);window.scrollBy=options=>{window.__reveals.push(options);original(options)};}''')
  for key in ['sinuca','churrasqueira','piscina']:
   page.evaluate('''key=>{const choice=document.querySelector('[data-leisure="'+key+'"]');window.scrollTo({top:window.scrollY+choice.getBoundingClientRect().top-220,behavior:'instant'});choice.click();}''',key)
   if width>767:
    page.wait_for_function('()=>window.__reveals.length>0')
    assert page.evaluate('window.__reveals.at(-1).behavior')=='smooth'
    page.wait_for_function('''key=>{const panel=document.getElementById(document.querySelector('[data-leisure="'+key+'"]').getAttribute('aria-controls'));const rect=panel.querySelector('.leisure-panel-content').getBoundingClientRect();return rect.bottom<=window.innerHeight-22&&rect.top>=document.querySelector('.home-header').getBoundingClientRect().bottom;}''',arg=key)
   else:
    page.wait_for_timeout(800);assert page.evaluate('window.__reveals.length')==0
   page.evaluate('''key=>{document.querySelector('[data-leisure="'+key+'"]').click();window.__reveals=[];}''',key)
   page.wait_for_timeout(650);assert page.evaluate('window.__reveals.length')==0
  if width>767:
   page.emulate_media(reduced_motion='reduce')
   page.evaluate('''()=>{const choice=document.querySelector('[data-leisure="sinuca"]');window.scrollTo({top:scrollY+choice.getBoundingClientRect().top-220,behavior:'instant'});choice.click();}''')
   page.wait_for_function('()=>window.__reveals.length>0');assert page.evaluate('window.__reveals.at(-1).behavior')=='instant'
  page.close()
 browser.close();print('Leisure descriptions: desktop smooth visibility for all three choices; no scroll on close or mobile; reduced motion respected.')
