import sys,json
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.route('https://**',lambda r:r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/avaliacoes',wait_until='networkidle')
 assert page.locator('[data-review-source]').count()==17
 assert page.locator('[data-review-source]:visible').count()==6
 page.locator('#rv-more').click();assert page.locator('[data-review-source]:visible').count()==12
 page.locator('#rv-more').click();assert page.locator('[data-review-source]:visible').count()==17
 assert not page.locator('#rv-more').is_visible()
 page.locator('#rv-search').fill('Helio');assert page.locator('[data-review-source]:visible').count()>=1
 page.locator('#rv-search').fill('naoexiste1234');assert page.locator('#rv-empty').is_visible()
 page.locator('#rv-search').fill('')
 assert 'Data de atualização não informada' in page.locator('#rv-platforms').inner_text()
 assert page.locator('.rv-platform-count').count()==0
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':900});page.evaluate('window.scrollTo(0,0)')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/reviews-{width}.png')
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page.set_viewport_size({'width':1440,'height':1000})
 page.goto(base+'/admin#avaliacoes',wait_until='networkidle')
 assert page.locator('[data-tab="reviews"]').evaluate('b=>b.classList.contains("active")')
 page.locator('[data-cms-field="reviews.pageTitle"]').fill('Histórias publicadas pelo painel')
 page.locator('[data-review-group="platforms"]').click();page.locator('[data-list-add="reviews.platforms"]').click()
 block=page.locator('[data-cms-item="reviews.platforms.1"]');block.locator('summary').first.click()
 assert page.locator('[data-cms-field="reviews.platforms.1.count"]').input_value()=='0'
 for key,value in {'label':'Google','score':'4,8','scale':'5','count':'12','updated':'2026-01-15','url':'https://www.google.com/maps'}.items():page.locator(f'[data-cms-field="reviews.platforms.1.{key}"]').fill(value)
 page.locator('[data-review-group="items"]').click()
 # Hide the original first highlight and add an explicitly sourced manual review.
 first=page.locator('[data-cms-item="reviews.items.0"]');first.locator('summary').first.click()
 page.locator('[data-cms-field="reviews.items.0.published"]').uncheck()
 page.locator('[data-list-add="reviews.items"]').click()
 new=page.locator('[data-cms-item="reviews.items.17"]');new.locator('summary').first.click()
 for key,value in {'name':'Hóspede de teste','description':'Relato de teste preservado na mesma fonte de conteúdo.','source':'Google','sourceUrl':'https://www.google.com/maps','date':'2026-01-10','score':'4.8','scale':'5'}.items():page.locator(f'[data-cms-field="reviews.items.17.{key}"]').fill(value)
 page.wait_for_timeout(16000)
 assert page.locator('[data-cms-field="reviews.items.17.name"]').input_value()=='Hóspede de teste'
 page.locator('[data-cms-action="preview"]').click();page.locator('.cms-preview[open]').wait_for()
 assert page.frame_locator('.cms-preview iframe').locator('#rv-title').inner_text()=='Histórias publicadas pelo painel'
 page.locator('.cms-preview .close').click()
 page.locator('[data-cms-action="save"]').click();page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 public=context.new_page();public.goto(base+'/avaliacoes',wait_until='networkidle')
 assert public.locator('#rv-title').inner_text()=='Histórias publicadas pelo painel'
 assert public.locator('.rv-platform-card').count()==2
 public.locator('[data-review-filter="google"]').click()
 assert public.locator('[data-review-source]:visible').count()==1
 assert 'Hóspede de teste' in public.locator('[data-review-source]:visible').inner_text()
 assert '4,8' in public.locator('[data-review-source]:visible .rv-review-score').inner_text()
 public.locator('[data-review-filter="todos"]').click();public.locator('#rv-search').fill('Ramon')
 assert public.locator('[data-review-source]:visible').count()==0
 public.goto(base+'/',wait_until='domcontentloaded')
 assert public.locator('.guest-reviews-grid .rv-review-card').count()==3
 assert 'Ramon' not in public.locator('.guest-reviews-grid').inner_text()
 # Phone view of the dedicated administrative section.
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print(json.dumps({'reviews':'public, source scales, search, load more, admin, preview, publication, hidden, draft and mobile passed'}),flush=True)
 browser.close()
