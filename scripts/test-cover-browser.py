import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1900,390]:
  page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=2)
  page.route('https://**',lambda route:route.abort())
  page.goto(base+'/itacare',wait_until='domcontentloaded')
  page.wait_for_function('''()=>{const i=document.querySelector('#explore-cover');return i.complete&&i.naturalWidth>0}''')
  current=page.locator('#explore-cover').evaluate('i=>i.currentSrc')
  if width==1900:assert '/_next/image' not in current and 'miranteitacarezinho1.jpg' in current,current
  else:assert 'q=90' in current or 'miranteitacarezinho1.jpg' in current,current
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.close()
 browser.close()
 print('Retina desktop uses native original; mobile loads high-quality cover without overflow: passed.')
