import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for path in ['/avaliacoes','/']:
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
  page.route('https://**',lambda route:route.abort())
  page.goto(base+path,wait_until='domcontentloaded')
  print('Checking glow on '+path,flush=True)
  card=page.locator('.rv-review-card').first;card.hover(position={'x':60,'y':70})
  box=card.bounding_box()
  page.wait_for_timeout(200)
  page.wait_for_function("()=>document.querySelector('.rv-review-card.has-cursor-glow')!==null")
  first=card.evaluate("e=>e.style.getPropertyValue('--glow-x')")
  page.mouse.move(box['x']+110,box['y']+100)
  page.wait_for_function("old=>document.querySelector('.rv-review-card.has-cursor-glow').style.getPropertyValue('--glow-x')!==old",arg=first)
  assert card.evaluate("e=>getComputedStyle(e,'::before').pointerEvents")=='none'
  assert card.evaluate("e=>getComputedStyle(e,'::before').backgroundImage.includes('radial-gradient')")
  page.mouse.move(3,3)
  assert page.locator('.has-cursor-glow').count()==0
  assert card.evaluate("e=>getComputedStyle(e,'::before').opacity")=='0'
  card.hover();page.emulate_media(reduced_motion='reduce')
  page.wait_for_function("()=>document.querySelectorAll('.has-cursor-glow').length===0")
  assert card.evaluate("e=>getComputedStyle(e,'::before').content")=='none'
  page.emulate_media(reduced_motion='no-preference');page.set_viewport_size({'width':390,'height':900})
  card.scroll_into_view_if_needed();card.hover()
  assert page.locator('.has-cursor-glow').count()==0
  page.close()
 browser.close()
 print('Review glow follows mouse, clears on leave, preserves clicks and stays off on mobile/reduced motion: passed.')
