import sys,json
from playwright.sync_api import sync_playwright

base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce')
 page=context.new_page();errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://**',lambda route:route.abort())
 page.goto(base+'/',wait_until='domcontentloaded')
 section=page.locator('#sobre-a-pousada');section.scroll_into_view_if_needed()
 assert section.locator('h2').count()==1
 assert section.locator('.about-feature-list li').count()>=5
 assert section.locator('.about-feature-list li svg').count()==section.locator('.about-feature-list li').count()
 for selector in ['.foto-sobre-pousada','.about-photo-inset img']:
  section.locator(selector).scroll_into_view_if_needed()
  page.wait_for_function('(selector)=>{const i=document.querySelector(selector);return i.complete&&i.naturalWidth>0}',arg=selector)
 section.screenshot(path='/tmp/flor-about-desktop.png')
 for width in [320,390,767,768,1024,1440,1900]:
  page.set_viewport_size({'width':width,'height':1050})
  section.scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert section.locator('.about-rooms-link').bounding_box()['height']>=44
  photos=section.locator('.about-photos').bounding_box();inset=section.locator('.about-photo-inset').bounding_box()
  assert inset['y']>=photos['y']-1,('Inset overlaps copy',width)
  if width==390:section.screenshot(path='/tmp/flor-about-mobile.png')
 section.locator('.about-rooms-link').click()
 page.wait_for_function("() => location.hash==='#quartos'&&document.activeElement.id==='quartos'")
 assert not errors,errors
 context.close();browser.close()
 print('About section: photos, amenities, mobile layouts 320–1900px and room navigation passed.')
