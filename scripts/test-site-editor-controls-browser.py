"""Removed controls, intact publication and draft behavior, against isolated HTTP fixtures."""
import sys
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000});context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}]);page=context.new_page();page.route('https://**',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/admin',wait_until='domcontentloaded');page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="about"]').click()
 field=page.locator('[data-cms-field="about.title"]');field.wait_for()
 assert page.locator('[data-cms-action="history"],[data-cms-action="reload"]').count()==0
 field.fill('Publicação de teste isolado')
 page.locator('[data-tab="overview"]').click();page.locator('[data-tab="site"]').click();expect(field).to_have_value('Publicação de teste isolado')
 page.locator('[data-cms-action="save"]').click();expect(page.locator('[data-cms-status]')).to_contain_text('Publicado!')
 assert page.locator('[data-cms-action="preview"]').is_visible()
 public=context.new_page();public.route('https://**',lambda r:r.abort());public.goto(base+'/',wait_until='domcontentloaded');expect(public.locator('#sobre-a-pousada h2').first).to_have_text('Publicação de teste isolado');public.close()
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
 assert errors==[],errors
 browser.close();print('PASS: history/reload controls removed, navigation preserves drafts, publication updates public content, preview retained and responsive editor; isolated data only.')
