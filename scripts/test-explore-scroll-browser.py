import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='no-preference')
  page.route('https://**',lambda route:route.abort())
  page.goto(base+'/itacare',wait_until='domcontentloaded')
  page.evaluate('''()=>{window.__discoverScroll=[];const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){if(this.id==='guia')window.__discoverScroll.push(options.behavior);return original.call(this,options)}}''')
  page.locator('.explore-discover').click()
  assert page.evaluate("window.__discoverScroll.at(-1)")=='smooth'
  page.wait_for_function("()=>location.hash==='#guia'&&Math.abs(document.querySelector('#guia').getBoundingClientRect().top-72)<3")
  assert page.evaluate("document.activeElement.id")=='guia'
  page.emulate_media(reduced_motion='reduce');page.evaluate('window.scrollTo(0,0)')
  page.locator('.explore-discover').click()
  assert page.evaluate("window.__discoverScroll.at(-1)")=='instant'
  assert page.url.endswith('/itacare#guia')
  page.close()
 browser.close()
 print('Discover button: smooth scroll, heading offset, keyboard focus and reduced motion on desktop/mobile passed.')
