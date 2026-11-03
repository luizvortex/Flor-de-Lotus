"""Shared footer and entry intro through real Next routes; external iframe isolated."""
import sys
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1];root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=1100));context.route('https://**',lambda r:r.fulfill(content_type='text/html',body='<html><body>External map fixture</body></html>') if '/maps/embed' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for path in ['/','/quartos','/pescadores','/itacare','/avaliacoes','/grupos','/pacotes','/privacidade','/condicoes','/experiencias/decoracao-romantica']:
  page.goto(base+path,wait_until='domcontentloaded')
  expect(page.locator('.lotus-footer')).to_have_count(1);expect(page.locator('.intro-screen')).to_have_count(1)
  assert 'intro-enabled' in page.locator('html').get_attribute('class')
  footer=page.locator('.lotus-footer');assert footer.locator('.lotus-footer-columns>section').count()==3
  assert footer.locator('a[href="mailto:contato@example.invalid"]').count()==1
  assert footer.locator('.lotus-footer-reserve,address').count()==0
  assert footer.locator('.lotus-footer-brand>a').count()==1
  iframe=footer.locator('iframe');assert iframe.get_attribute('loading')=='lazy';assert iframe.get_attribute('title');assert iframe.get_attribute('referrerpolicy')=='strict-origin-when-cross-origin'
  assert '0x5549d0040f6757ff' in iframe.get_attribute('src')
 # Deep incoming links keep their destination and still get the intro.
 page.goto(base+'/#quartos',wait_until='domcontentloaded');assert page.url.endswith('/#quartos');assert 'intro-enabled' in page.locator('html').get_attribute('class')
 page.wait_for_timeout(1700);assert 'intro-complete' in page.locator('html').get_attribute('class')
 page.locator('.lotus-footer-nav a[href="/quartos"]').click();page.wait_for_url(base+'/quartos');assert 'intro-enabled' not in (page.locator('html').get_attribute('class') or '')
 page.locator('.lotus-footer-nav a[href="/pescadores"]').click();page.wait_for_url(base+'/pescadores');assert 'intro-enabled' not in (page.locator('html').get_attribute('class') or '')
 # Same-origin links with noreferrer/new tabs also skip the entry animation.
 page.evaluate("const a=document.createElement('a');a.id='internal-test';a.href='/itacare';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open internal guide';document.body.append(a)")
 with context.expect_page() as popup:page.locator('#internal-test').click()
 tab=popup.value;tab.wait_for_load_state('domcontentloaded');assert 'intro-enabled' not in (tab.locator('html').get_attribute('class') or '');tab.close()
 page.reload(wait_until='domcontentloaded');assert 'intro-enabled' in page.locator('html').get_attribute('class')
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size(dict(width=width,height=1100));footer=page.locator('.lotus-footer');footer.scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  cols=footer.locator('.lotus-footer-columns>section').all();boxes=[col.bounding_box() for col in cols]
  if width>1050:
   assert max(b['y'] for b in boxes)-min(b['y'] for b in boxes)<1
   centers=[el.bounding_box()['y']+el.bounding_box()['height']/2 for el in footer.locator('.lotus-footer-column-content,.lotus-footer-map').all()]
   assert max(centers)-min(centers)<1
  if width<=700:assert boxes[0]['y']<boxes[1]['y']<boxes[2]['y']
  frame=footer.locator('iframe').bounding_box();assert frame['width']>=200 and 200<=frame['height']<=220
  footer.screenshot(path=str(root/f'work/footer-{width}.png'))
 page.locator('.lotus-footer iframe').dispatch_event('error');expect(page.locator('[data-map-error]')).to_be_visible()
 assert parse_qs(urlparse(page.locator('[data-map-error] a').get_attribute('href')).query)['destination'][0].lower().find('itacare')>=0
 page.goto(base+'/',wait_until='networkidle');page.locator('.home-language summary').click();page.locator('.home-language [data-language="en"]').click();expect(page.locator('#footer-contact-title')).to_have_text('GET IN TOUCH')
 reduced=browser.new_context(reduced_motion='reduce');reduced.route('https://**',lambda r:r.abort());rpage=reduced.new_page();rpage.goto(base+'/quartos',wait_until='domcontentloaded');assert 'intro-enabled' not in (rpage.locator('html').get_attribute('class') or '')
 assert not errors,errors
 browser.close();print('PASS: shared footer, responsive columns/map attributes, fallback/contact links, translations, direct/hash/external entry, internal links and new tabs, reduced motion.')
