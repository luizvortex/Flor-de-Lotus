"""Local proposal QA with a read-only snapshot of published editorial/catalog data.
No messages or bookings: every API request is intercepted and all writes are rejected.
Run work/render-fishing-preview.cjs first; public snapshots stay in ignored work/.
"""
import json
from pathlib import Path
from urllib.parse import urlparse,unquote,parse_qs
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
live=json.loads((root/'work/fishing-live.json').read_text())
photo_urls={p['url'] for p in live['content']['fishing']['photos']}
requests=[];fail_catalog=False

def serve(route):
 global fail_catalog
 u=urlparse(route.request.url);path=unquote(u.path)
 assert route.request.method=='GET','No writes during local QA'
 requests.append(path)
 if u.hostname!='lotus.test':return route.abort() # remote fishing photo remains original; network policy blocks its host
 if path=='/pescadores':return route.fulfill(content_type='text/html',path=str(root/'work/preview-fishing.html'))
 if path=='/grupos':
  source='work/preview-fishing-group.html' if parse_qs(u.query).get('origem')==['pescadores'] else 'grupos.html'
  return route.fulfill(content_type='text/html',path=str(root/source))
 if path=='/api/catalog':return route.fulfill(status=503,json={'error':'Teste de indisponibilidade'}) if fail_catalog else route.fulfill(json=live['catalog'])
 if path=='/api/policies':return route.fulfill(json=live['policies'])
 if path=='/api/guest/session':return route.fulfill(json={'user':None,'google_enabled':True})
 if path=='/api/excursions/rooms':return route.fulfill(json={'rooms':[]})
 file=root/path.lstrip('/')
 if file.is_file():
  mime={'.js':'application/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}.get(file.suffix,'application/octet-stream')
  return route.fulfill(path=str(file),content_type=mime)
 return route.abort()

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1050},reduced_motion='reduce')
 context.route('**/*',serve)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://lotus.test/pescadores',wait_until='networkidle')
 expect(page.locator('.fp-room-card')).to_have_count(3)
 assert page.locator('.fp-room-card h3').all_text_contents()==['Quarto Standard','Quarto Standard Superior','Quarto Família']
 assert page.locator('.fp-room-capacity').all_text_contents()==['Até 3 pessoas por quarto','Até 3 pessoas por quarto','Até 6 pessoas por quarto']
 assert 'Disponível' not in page.locator('#fishing-rooms').inner_text()
 for image in page.locator('.fp-room-card img').all():image.scroll_into_view_if_needed();assert image.evaluate('(el)=>el.naturalWidth>0')
 assert page.locator('.fp-testimonial blockquote p').inner_text() in [r['description'] for r in live['content']['reviews']['items'] if r['published']]
 assert page.locator('.fp-testimonial cite').inner_text() in [r['name'] for r in live['content']['reviews']['items'] if r['published']]
 assert page.locator('.site-language').count()==0
 assert page.locator('.fp-wheel-photo').count()==10
 assert set(page.locator('.fp-wheel img').evaluate_all('(els)=>els.map(el=>el.src)'))==photo_urls
 assert page.locator('.fp-plan').count()==0
 assert page.locator('#policy-grid article.policy-item').count()==sum(bool(str(live['policies']['policies'].get(k,'')).strip()) for k in ['checkin','checkout','pets','internet','parking','children','payments','cancellation','reservations','additional'])
 assert page.locator('#policy-grid details,#policy-grid summary').count()==0
 for item in page.locator('#policy-grid article.policy-item').all():expect(item.locator('p')).to_be_visible()
 for width in [360,390,430,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1050})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  page.locator('#dates-trigger').click();expect(page.locator('#dates-picker')).to_be_visible()
  box=page.locator('#dates-picker').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1,(width,box)
  page.keyboard.press('Escape')
  if width in [390,1440]:
   page.evaluate('scrollTo(0,0)');page.wait_for_timeout(300);page.screenshot(path=str(root/f'work/pescadores-proposta-{width}.png'),full_page=True)
   page.locator('#planejar-grupo').screenshot(path=str(root/f'work/pescadores-acomodacoes-{width}.png'))
 page.locator('#fishing-name').fill('  Ana Teste  ')
 page.locator('#fishing-people').fill('abc');assert page.locator('#fishing-people').input_value()==''
 page.locator('#fishing-people').fill('600');assert page.locator('#fishing-people').input_value()=='60'
 page.evaluate('window.open=(url)=>{window.testWhatsApp=url}')
 page.locator('#fishing-contact [type="submit"]').click();expect(page.locator('#dates-picker')).to_be_visible()
 days=page.locator('[data-day]:not([disabled])');days.first.click();page.locator('[data-day]:not([disabled])').nth(3).click();page.locator('#apply-dates').click()
 for invalid in ['0','61']:
  page.locator('#fishing-people').fill(invalid);page.locator('#fishing-contact [type="submit"]').click();assert page.evaluate('window.testWhatsApp') is None
 page.locator('#fishing-people').fill('60');page.locator('#fishing-contact [type="submit"]').click()
 msg=parse_qs(urlparse(page.evaluate('window.testWhatsApp')).query)['text'][0]
 assert 'Ana Teste' in msg and 'Quantidade de pessoas: 60' in msg and 'Check-in:' in msg and 'Check-out:' in msg
 start=page.locator('#checkin').input_value();end=page.locator('#checkout').input_value()
 from datetime import date
 nights=(date.fromisoformat(end)-date.fromisoformat(start)).days
 assert f'Estadia: {nights} noites' in msg
 # Save these conditions for the report; no window.open call reaches WhatsApp.
 (root/'work/fishing-qa-result.json').write_text(json.dumps({'checks':'PASS','nights':nights,'room_cards':3,'review':page.locator('.fp-testimonial cite').inner_text(),'source':'Booking.com','remote_photo_blocked':True,'widths':[360,390,430,768,1024,1440]},ensure_ascii=False))
 page.locator('.fp-room-actions a[href^="/grupos"]').click();expect(page.locator('#group-title')).to_have_text('Sua viagem de pesca, com a turma organizada.')
 assert page.locator('#group-form').count()==1 and page.locator('#group-login-form').get_attribute('action')=='/auth/google'
 page.goto('http://lotus.test/grupos');expect(page.locator('#group-title')).to_have_text('Boas viagens começam com boas companhias.')
 fail_catalog=True;page.goto('http://lotus.test/pescadores');expect(page.locator('[data-rooms-retry]')).to_be_visible()
 fail_catalog=False;page.locator('[data-rooms-retry]').click();expect(page.locator('.fp-room-card')).to_have_count(3)
 # Saved language still applies, without a selector outside the home.
 page.evaluate('localStorage.setItem("lotus-language","en")');page.reload();expect(page.locator('html')).to_have_attribute('lang','en')
 expect(page.locator('#plan-title')).to_contain_text('Comfort for every');assert page.locator('.site-language').count()==0
 assert not errors,errors
 browser.close()
print('PASS: real catalog capacities/photos, published review, always-visible policies, six widths, shared calendar, 1–60 people, WhatsApp text only, group origin/default, catalog retry and saved language; no writes.')
