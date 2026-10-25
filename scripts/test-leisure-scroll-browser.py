import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1366,390]:
  page=browser.new_page(viewport={'width':width,'height':650},reduced_motion='no-preference')
  page.route('https://**',lambda r:r.abort());page.goto(sys.argv[1]+'/',wait_until='networkidle')
  page.evaluate('''()=>{window.__reveals=[];window.__record=false;const original=window.scrollTo.bind(window);window.scrollTo=options=>{if(window.__record)window.__reveals.push({top:options.top,time:performance.now()-window.__clicked});original(options)};}''')
  def open_choice(key):
   page.evaluate('''key=>{window.__record=false;const choice=document.querySelector('[data-leisure="'+key+'"]');window.scrollTo({top:window.scrollY+choice.getBoundingClientRect().top-220,behavior:'instant'});window.__reveals=[];window.__start=scrollY;window.__clicked=performance.now();window.__record=true;choice.click();}''',key)
  for key in ['sinuca','churrasqueira','piscina']:
   open_choice(key)
   if width>767:
    page.wait_for_function('()=>window.__reveals.length>0')
    assert page.evaluate('window.__reveals[0].time')<150
    page.wait_for_function('()=>window.__reveals.at(-1).time>=1100')
    samples=page.evaluate('window.__reveals');start=page.evaluate('window.__start');end=samples[-1]['top']
    assert len(samples)>10 and abs(end-start)>20
    early=[s for s in samples if s['time']<=300]
    assert early and abs(early[-1]['top']-start)<abs(end-start)*.25
    assert all(b['top']>=a['top']-.5 for a,b in zip(samples,samples[1:]))
    page.wait_for_function('''key=>{const panel=document.getElementById(document.querySelector('[data-leisure="'+key+'"]').getAttribute('aria-controls'));const rect=panel.querySelector('.leisure-panel-content').getBoundingClientRect();return rect.bottom<=window.innerHeight-22&&rect.top>=document.querySelector('.home-header').getBoundingClientRect().bottom;}''',arg=key)
   else:
    page.wait_for_timeout(1200);assert page.evaluate('window.__reveals.length')==0
   page.evaluate('''key=>{document.querySelector('[data-leisure="'+key+'"]').click();window.__reveals=[];}''',key)
   page.wait_for_timeout(650);assert page.evaluate('window.__reveals.length')==0
  if width>767:
   open_choice('sinuca');page.wait_for_function('()=>window.__reveals.length>2')
   page.evaluate("window.dispatchEvent(new WheelEvent('wheel',{deltaY:30}))")
   count=page.evaluate('window.__reveals.length');page.wait_for_timeout(300);assert page.evaluate('window.__reveals.length')==count
   page.evaluate("document.querySelector('[data-leisure=sinuca]').click()")
   page.emulate_media(reduced_motion='reduce');open_choice('sinuca')
   assert page.evaluate('window.__reveals.length')==1
  page.close()
 browser.close();print('Leisure scrolling: immediate start, 1.1-second eased motion, visible descriptions, interruption, no scroll on close/mobile and reduced motion passed.')
