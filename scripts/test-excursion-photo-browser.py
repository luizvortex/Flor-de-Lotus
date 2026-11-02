"""Real excursion photo + all homepage styles; isolated from live APIs and CMS."""
from pathlib import Path
from urllib.parse import urlparse,unquote
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'index.html').read_text()
head=re.search(r'<head>.*?</head>',source,re.S).group()
head=re.sub(r'<script\b[^>]*>.*?</script>','',head,flags=re.S)
head=head.replace('</head>','<link rel="stylesheet" href="/fishing.css"></head>')
section=re.search(r'<section id="grupos-excursoes".*?</section>',source,re.S).group()
html='<html lang="pt-BR">'+head+'<body class="home-page"><main><div class="group-experiences">'+section+'</div></main></body></html>'
def serve(route):
 url=urlparse(route.request.url)
 if url.hostname!='lotus.test':return route.abort()
 if url.path=='/':return route.fulfill(content_type='text/html',body=html)
 path=(root/unquote(url.path).lstrip('/')).resolve()
 if root in path.parents and path.is_file():return route.fulfill(path=str(path))
 return route.abort()
with sync_playwright() as p:
 engines=[('Chromium',p.chromium,'/usr/bin/chromium')]
 if Path(p.webkit.executable_path).exists():engines.append(('WebKit',p.webkit,None))
 for name,engine,executable in engines:
  browser=engine.launch(**({'executable_path':executable,'args':['--no-sandbox']} if executable else {}))
  page=browser.new_page(reduced_motion='reduce');page.route('**/*',serve)
  for width in [320,375,390,430,767,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.goto('http://lotus.test/',wait_until='networkidle')
   image=page.locator('.group-home-photo img');photo=page.locator('.group-home-photo');copy=page.locator('.group-home-copy')
   image.scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".group-home-photo img").naturalWidth===1280')
   assert image.is_visible() and image.bounding_box()['height']>100,(name,width)
   badge=photo.locator('figcaption')
   if width<768:
    assert not badge.is_visible(),(name,width,'mobile badge must be hidden')
    assert image.evaluate('(el)=>getComputedStyle(el).position')=='static'
    bounds=image.bounding_box();assert abs(bounds['height']/bounds['width']-961/1280)<.01
    assert bounds['y']+bounds['height']<=copy.bounding_box()['y']+1
    assert abs(photo.bounding_box()['height']-bounds['height'])<1
   else:
    assert image.evaluate('(el)=>getComputedStyle(el).position')=='absolute'
    assert badge.is_visible(),(name,width)
    box=badge.bounding_box();frame=photo.bounding_box()
    assert box['width']<=210 and box['height']<60,(width,box,badge.evaluate('(el)=>getComputedStyle(el).cssText'))
    assert abs(box['x']-frame['x']-16)<1
    assert abs(frame['y']+frame['height']-box['y']-box['height']-16)<1
    assert badge.evaluate('(el)=>getComputedStyle(el,"::before").fontSize')=='16px'

   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(name,width)
   if width in [390,1440]:photo.screenshot(path=str(root/f'work/excursion-photo-{width}.png'))
  browser.close();print(f'OK: {name}, real photo visible at 7 mobile/tablet/desktop sizes; mobile photo intact and badge hidden; desktop badge compact at bottom left.')
