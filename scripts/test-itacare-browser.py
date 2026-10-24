import sys,json,time
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.context.route('https://**',lambda r:r.abort())
  page.goto(base+'/',wait_until='domcontentloaded')
  more=page.locator('.discovery-more');assert more.get_attribute('target')=='_blank'
  assert page.locator('.discovery-card').count()==3
  assert page.locator('#praias-select').count()==0
  with page.expect_popup() as popup:more.click()
  guide=popup.value
  guide.wait_for_load_state('domcontentloaded')
  assert guide.url==base+'/itacare'
  assert guide.locator('.explore-destination').count()==9
  assert guide.locator('.explore-tour').count()==3
  assert 'Agosto e setembro' in guide.locator('#passeio-observacao-baleias').text_content()
  guide.wait_for_function("document.querySelector('#explore-cover').complete && document.querySelector('#explore-cover').naturalWidth>0")
  guide.locator('[data-explore-filter="cachoeira"]').click()
  assert guide.locator('.explore-destination:visible').count()==2
  guide.locator('[data-explore-filter="praia"]').click()
  assert guide.locator('.explore-destination:visible').count()==7
  guide.locator('#explore-search').fill('Jeribucacu')
  assert guide.locator('.explore-destination:visible').count()==1
  # The card advances manually without opening its album, and never auto-advances.
  shown=guide.locator('.explore-destination:visible')
  cover=shown.locator('.explore-photo-button');advance=shown.locator('[data-explore-card-next]')
  advance.scroll_into_view_if_needed()
  all_photos=json.loads(cover.get_attribute('data-explore-photos'))
  # Upcoming optimized photos must arrive before the user clicks.
  guide.wait_for_function("""photos=>photos.slice(1,3).every(photo=>performance.getEntriesByType('resource').some(r=>{const u=new URL(r.name);return u.searchParams.get('url')===photo.url&&u.searchParams.get('w')==='828'&&r.responseEnd>0}))""",arg=all_photos)
  guide.wait_for_timeout(100)
  guide.context.set_offline(True)
  started=time.monotonic()
  advance.click()
  assert not advance.is_disabled()
  guide.wait_for_function("document.querySelector('.explore-destination:not([hidden]) .explore-photo-button').dataset.exploreStart==='1'",timeout=500)
  assert time.monotonic()-started<.5
  assert cover.locator('img').evaluate('(i)=>i.complete && i.naturalWidth>0')
  advance.click()
  guide.wait_for_function("document.querySelector('.explore-destination:not([hidden]) .explore-photo-button').dataset.exploreStart==='2'",timeout=500)
  assert cover.locator('img').evaluate('(i)=>i.complete && i.naturalWidth>0')
  guide.context.set_offline(False)
  guide.wait_for_function("document.querySelector('.explore-destination:not([hidden]) .explore-photo-button').dataset.exploreStart==='2'")
  assert not guide.locator('#explore-album').evaluate('(d)=>d.open')
  selected=cover.locator('img').get_attribute('src')
  guide.wait_for_timeout(2200)
  assert cover.locator('img').get_attribute('src')==selected
  assert shown.locator('.explore-card-counter').inner_text().startswith('3 /')
  # Mouse motion on desktop; no new motion on mobile or with reduced motion.
  guide.emulate_media(reduced_motion='no-preference')
  cover.scroll_into_view_if_needed();guide.wait_for_timeout(150)
  box=cover.bounding_box();guide.mouse.move(box['x']+box['width']*.3,box['y']+box['height']*.5)
  guide.wait_for_timeout(100)
  guide.mouse.move(box['x']+box['width']*.7,box['y']+box['height']*.6)
  if width>=768:
   guide.wait_for_function("document.querySelector('.explore-destination:not([hidden]) .explore-photo-button').classList.contains('is-pointer-follow')")
   assert float(cover.evaluate("e=>e.style.getPropertyValue('--photo-pan-x')").replace('px',''))>0
  else:
   assert not cover.evaluate("e=>e.classList.contains('is-pointer-follow')")
  guide.emulate_media(reduced_motion='reduce')
  guide.wait_for_function("!document.querySelector('.explore-destination:not([hidden]) .explore-photo-button').classList.contains('is-pointer-follow')")
  guide.locator('.explore-destination:visible .explore-photo-button').click()
  assert guide.locator('#explore-album').evaluate('(d)=>d.open')
  first=guide.locator('#explore-album-image').get_attribute('src')
  guide.keyboard.press('ArrowRight')
  assert guide.locator('#explore-album-image').get_attribute('src')!=first
  guide.keyboard.press('Escape')
  assert not guide.locator('#explore-album').evaluate('(d)=>d.open')
  assert guide.locator('.explore-destination:visible .explore-photo-button').evaluate('(b)=>b===document.activeElement')
  guide.locator('#explore-search').fill('nenhum-local-teste')
  assert guide.locator('.explore-empty').is_visible()
  guide.locator('#explore-search').fill('')
  guide.locator('[data-explore-filter="todos"]').click()
  assert guide.locator('.explore-destination:visible').count()==9
  for a in guide.locator('.explore-tour-contact').all():assert a.get_attribute('href').startswith('https://wa.me/') and 'text=' in a.get_attribute('href')
  assert guide.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  guide.evaluate('window.scrollTo(0,0)');guide.screenshot(path=f'/tmp/itacare-{width}.png')
  page.locator('#praias').scroll_into_view_if_needed();page.screenshot(path=f'/tmp/itacare-home-{width}.png')
  guide.close();page.close()
  assert not errors,errors
  print(json.dumps({'width':width,'guide':'new tab, filters, search, albums, contact links and layout passed'}),flush=True)
 browser.close()
