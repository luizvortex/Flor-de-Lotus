"""Published default reviews plus synthetic rooms; no production writes."""
from pathlib import Path
import json,subprocess
from urllib.parse import urlparse
source=Path(__file__).with_name('test-fishing-wheel-browser.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(Path(__file__).with_name('test-fishing-wheel-browser.py'))};exec(source,ns)
root=ns['root'];renderer=ns['renderer'].replace("const base={branding:","const real=JSON.parse(fs.readFileSync('src/lib/site-content-defaults.json','utf8'));real.reviews.items=real.reviews.items.filter(r=>r.published).slice(0,3);const base={reviews:real.reviews,branding:")
renderer=renderer.replace('console.log(JSON.stringify(result));',"result.noReviews=context.renderFishingPage({...base,reviews:{visible:false,items:[]}},'http://lotus.test');result.oneReview=context.renderFishingPage({...base,reviews:{...real.reviews,items:real.reviews.items.slice(0,1)}},'http://lotus.test');console.log(JSON.stringify(result));")
ns['pages'].update(json.loads(subprocess.check_output(['node','--input-type=module','-e',renderer],cwd=root,text=True)));original=ns['serve']
rooms=[dict(id=1,floor='terreo',capacity=3,active=1),dict(id=2,floor='superior',capacity=3,active=1),dict(id=3,floor='terreo',capacity=5,active=1)]
showcases=[dict(slug=slug,title=title,description='Quarto de teste',photos=[dict(url='/img casal/casal.jpg',alt='Quarto de teste')]) for slug,title in [('duplo','Quarto Standard'),('triplo','Quarto Superior'),('familia','Quarto Família')]]
def serve(r):
 path=urlparse(r.request.url).path
 if path=='/api/catalog':return r.fulfill(json=dict(rooms=rooms,showcases=showcases))
 if path=='/room-catalog.js':return r.fulfill(path=str(root/'room-catalog.js'))
 if path=='/img%20casal/casal.jpg':return r.fulfill(path=str(root/'img casal/casal.jpg'))
 return original(r)
with ns['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport=dict(width=1440,height=1100));page.route('**/*',serve);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("window.roomMotions=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.fp-room-card'))window.roomMotions.push(options.delay);return original.call(this,frames,options);};")
 page.clock.install();page.goto('http://lotus.test/ten',wait_until='networkidle');page.wait_for_selector('.fp-room-card',state='attached')
 assert page.locator('.fp-room-card').count()==3
 assert page.locator('.fp-room-card[data-room-pending]').count()==3
 assert page.locator('.fp-room-card').evaluate_all('(cards)=>cards.every(card=>getComputedStyle(card).opacity==="0")')
 assert page.evaluate("document.querySelector('.fp-how').nextElementSibling.id")=='planejar-grupo'
 assert page.evaluate("document.querySelector('.fp-accommodations').nextElementSibling.matches('.fp-testimonial')")
 assert page.locator('[data-review-slide]').count()==3
 def selected():return page.locator('[data-review-slide][aria-hidden="false"]')
 first=selected().locator('cite').inner_text();assert first=='Ramon'
 page.clock.fast_forward(6000);assert selected().locator('cite').inner_text()==first
 assert page.evaluate('window.roomMotions')==[]
 page.locator('#planejar-grupo').scroll_into_view_if_needed();page.wait_for_function('window.roomMotions.length===3');assert page.evaluate('window.roomMotions')==[0,180,360]
 page.wait_for_function("document.querySelectorAll('.fp-room-card[data-room-pending]').length===0")
 assert page.locator('.fp-room-card').evaluate_all('(cards)=>cards.every(card=>getComputedStyle(card).opacity==="1")')
 section=page.locator('[data-testimonials]');section.scroll_into_view_if_needed();page.wait_for_timeout(100)
 assert section.locator('.fp-eyebrow').bounding_box()['y']<selected().locator('cite').bounding_box()['y']<selected().locator('blockquote').bounding_box()['y']
 page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");page.clock.fast_forward(2900);assert selected().locator('cite').inner_text()==first
 page.clock.fast_forward(200);assert selected().locator('cite').inner_text()!=first
 page.locator('[data-review-toggle]').click();paused=selected().locator('cite').inner_text();assert page.locator('[data-review-toggle]').inner_text()=='Continuar';page.clock.fast_forward(6500);assert selected().locator('cite').inner_text()==paused
 page.locator('[data-review-toggle]').click();page.clock.fast_forward(3100);assert selected().locator('cite').inner_text()!=paused
 page.locator('[data-review-index="1"]').click();assert page.locator('[data-review-index="1"]').get_attribute('aria-current')=='true'
 page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(100);before=selected().locator('cite').inner_text();page.clock.fast_forward(6500);assert selected().locator('cite').inner_text()==before
 for width in [320,390,768,1440]:
  page.set_viewport_size(dict(width=width,height=1100));section.scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');section.screenshot(path=str(root/f'work/fishing-reviews-{width}.png'));assert len(page.evaluate('window.roomMotions'))==3
 page.emulate_media(reduced_motion='reduce');page.goto('http://lotus.test/ten',wait_until='networkidle');section.scroll_into_view_if_needed();page.clock.fast_forward(6500);assert selected().locator('cite').inner_text()==first
 page.locator('#planejar-grupo').scroll_into_view_if_needed();assert page.evaluate('window.roomMotions')==[]
 assert page.locator('.fp-room-card[data-room-pending]').count()==0
 page.locator('[data-review-index="1"]').click();assert selected().locator('cite').inner_text()!=first
 page.goto('http://lotus.test/oneReview');assert page.locator('[data-review-slide]').count()==1;assert page.locator('[data-review-toggle]').count()==0
 page.goto('http://lotus.test/noReviews');assert section.count()==0
 assert not errors,errors
 browser.close();print('PASS: genuine reviews, author placement, 3s visible-only rotation, pause/manual controls, room sequence/order, mobile and reduced motion.')
