"""Isolated renderer + real CSS/JS; synthetic photos, no live API or CMS writes."""
import json, subprocess
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[1]
renderer=r'''
import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync('src/lib/fishing-page.ts','utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,'');
const context={};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source),context);
const photos=Array.from({length:10},(_,i)=>({url:`/fixture-${i}.svg`,alt:`Foto de teste ${i+1}`}));
const base={branding:{title:'Flor de Lótus',logo:'/img Pousada/flordelotuslogo.png',whatsapp:'5573000000000'},fishing:{visible:true,title:'A pescaria termina. As boas histórias continuam.',photos}};
const result={};for(const [key,list] of [['ten',photos],['one',[photos[0]]],['empty',[]]])result[key]=context.renderFishingPage({...base,fishing:{...base.fishing,photos:list}},'http://lotus.test');
console.log(JSON.stringify(result));
'''
pages=json.loads(subprocess.check_output(['node','--input-type=module','-e',renderer],cwd=root,text=True))
files={name:root/name for name in ['pescadores.css','pescadores.js','stay-picker.css','stay-picker.js','site-language.css','site-language.js','site-translations.json','property-policies.css','politicas.js','img Pousada/flordelotuslogo.png']}

def serve(route):
    url=urlparse(route.request.url);path=unquote(url.path).lstrip('/')
    if url.hostname!='lotus.test':return route.abort()
    if path in pages:return route.fulfill(content_type='text/html',body=pages[path])
    if path.startswith('fixture-'):
        n=int(path.split('-')[1].split('.')[0]);color=['#254039','#9b613e','#476c88','#82724c','#75494b'][n%5]
        return route.fulfill(content_type='image/svg+xml',body=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="{color}"/><rect x="20" y="20" width="760" height="560" stroke="#d4bd91" fill="none" stroke-width="5"/><text x="400" y="330" text-anchor="middle" fill="white" font-size="100">{n+1:02}</text></svg>')
    if path=='api/policies':return route.fulfill(content_type='application/json',body='{"policies":{}}')
    if path in files:return route.fulfill(path=str(files[path]))
    return route.abort()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1100})
    context.route('**/*',serve)
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.install()
    page.goto('http://lotus.test/ten',wait_until='networkidle')
    wheel=page.locator('.fp-wheel');wheel.scroll_into_view_if_needed();page.mouse.move(0,0)
    page.wait_for_timeout(100)
    center=lambda:page.locator('[data-wheel-slot="9"] button')
    assert center().get_attribute('data-fishing-photo')=='9'
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.fast_forward(1900)
    assert center().get_attribute('data-fishing-photo')=='9'
    page.clock.fast_forward(250)
    assert center().get_attribute('data-fishing-photo')=='8'
    assert page.locator('[data-fishing-photo="9"]').locator('..').get_attribute('data-wheel-slot')=='0'
    for _ in range(9):page.clock.fast_forward(2100)
    assert center().get_attribute('data-fishing-photo')=='9'
    center().hover();page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.fast_forward(2100);assert center().get_attribute('data-fishing-photo')=='8'
    page.clock.fast_forward(2100);assert center().get_attribute('data-fishing-photo')=='7'
    page.locator('[data-wheel-prev]').click();page.locator('[data-wheel-prev]').click()
    assert center().get_attribute('data-fishing-photo')=='9'
    assert page.locator('[data-wheel-toggle],[data-wheel-caption]').count()==0
    assert page.locator('.fp-wheel-photo button>span').count()==0
    page.locator('[data-wheel-next]').click();assert center().get_attribute('data-fishing-photo')=='8'
    page.locator('[data-wheel-prev]').click();assert center().get_attribute('data-fishing-photo')=='9'
    page.locator('[data-wheel-next]').click();assert center().get_attribute('data-fishing-photo')=='8'
    center().focus();wheel.scroll_into_view_if_needed();page.wait_for_timeout(100)
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.fast_forward(2100);assert center().get_attribute('data-fishing-photo')=='7'
    page.locator('[data-wheel-prev]').click();assert center().get_attribute('data-fishing-photo')=='8'
    center().click();expect(page.locator('.fp-lightbox')).to_be_visible()
    assert page.locator('.fp-close').evaluate('(el)=>getComputedStyle(el).outlineStyle')=='none'
    expect(page.locator('[data-photo-large]')).to_have_attribute('alt','Foto de teste 9')
    page.keyboard.press('ArrowRight');expect(page.locator('[data-photo-large]')).to_have_attribute('alt','Foto de teste 10')
    page.clock.fast_forward(5000);assert center().get_attribute('data-fishing-photo')=='8'
    page.keyboard.press('Escape');expect(page.locator('.fp-lightbox')).not_to_be_visible()
    expect(center()).to_be_focused()
    page.keyboard.press('Enter');expect(page.locator('.fp-lightbox')).to_be_visible()
    assert page.locator('.fp-close').evaluate('(el)=>getComputedStyle(el).outlineStyle')!='none'
    page.keyboard.press('Escape');expect(page.locator('.fp-lightbox')).not_to_be_visible()
    page.clock.fast_forward(2100);assert center().get_attribute('data-fishing-photo')!='8'
    page.emulate_media(reduced_motion='reduce')
    # All ten slots stay distinct, increase in size and fit within the wheel on mobile and desktop.
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':1100});wheel.scroll_into_view_if_needed();page.clock.fast_forward(1000)
        bounds=wheel.bounding_box();sizes=[];boxes=[]
        for slot in range(10):
            box=page.locator(f'[data-wheel-slot="{slot}"]').bounding_box();sizes.append(box['width']);boxes.append(box)
            assert box['x']>=bounds['x']-1 and box['x']+box['width']<=bounds['x']+bounds['width']+1,(width,slot)
            assert box['y']>=bounds['y']-1 and box['y']+box['height']<=bounds['y']+bounds['height']+1,(width,slot)
        for i,a in enumerate(boxes):
            for b in boxes[i+1:]:
                assert a['x']+a['width']<=b['x']+1 or b['x']+b['width']<=a['x']+1 or a['y']+a['height']<=b['y']+1 or b['y']+b['height']<=a['y']+1,(width,i)
        assert all(a<b for a,b in zip(sizes,sizes[1:])),(width,sizes)
        expected_center=.44
        assert abs(sizes[9]/bounds['width']-expected_center)<.01,(width,sizes)
        if width<=600:
            assert abs(sizes[8]/bounds['width']-.22)<.01
            assert not page.locator('.fp-cover figcaption').is_visible()
            assert page.locator('#memories-title').evaluate('(el)=>getComputedStyle(el).fontSize')=='28px'
            assert page.locator('#plan-title').evaluate('(el)=>getComputedStyle(el).fontSize')=='28px'
            assert page.locator('[data-wheel-next]').bounding_box()['width']==32
            assert page.locator('.fp-header-arrow>svg').is_visible()
            assert not page.locator('.fp-header-arrow-text').is_visible()
            assert page.locator('.fp-header-arrow').evaluate('(el)=>getComputedStyle(el).marginLeft')=='6px'
        else:
            assert page.locator('[data-wheel-next]').bounding_box()['width']>=44
            assert not page.locator('.fp-header-arrow>svg').is_visible()
            assert page.locator('.fp-header-arrow-text').is_visible()
            caption=page.locator('.fp-cover figcaption').bounding_box();cover=page.locator('.fp-cover').bounding_box()
            assert caption['width']<cover['width']*.5
            assert caption['height']<100
        assert page.locator('.fp-action-arrow').count()==4
        assert page.locator('.fp-action-arrow').first.get_attribute('stroke-width')=='1.2'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
        assert page.locator('button[aria-current="true"]').count()==1
        (root/'work').mkdir(exist_ok=True);wheel.screenshot(path=str(root/f'work/fishing-wheel-{width}.png'))
    # The contact flow still validates and sends the selected dates and people to WhatsApp.
    page.locator('#fishing-name').fill('Zilter');page.locator('#fishing-people').fill('60')
    page.locator('#dates-trigger').click();days=page.locator('[data-day]:not([disabled])');days.first.click()
    page.locator('[data-day]:not([disabled])').nth(2).click();page.locator('#apply-dates').click()
    assert page.locator('#checkin').input_value()<page.locator('#checkout').input_value()
    page.evaluate("window.open=(url)=>{window.sentWhatsApp=url}")
    page.locator('#fishing-contact button[type="submit"]').click()
    assert 'Quantidade+de+pessoas%3A+60' in page.evaluate('window.sentWhatsApp')
    assert 'Check-in' in page.evaluate('window.sentWhatsApp')
    # One registered photo fills ten positions but stays a single photo in the lightbox.
    page.goto('http://lotus.test/one',wait_until='networkidle');wheel.scroll_into_view_if_needed()
    page.locator('[data-wheel-slot="9"] button').click()
    expect(page.locator('[data-photo-caption]')).to_contain_text('1 / 1')
    expect(page.locator('[data-photo-next]')).to_be_hidden()
    page.goto('http://lotus.test/empty',wait_until='networkidle');expect(page.locator('.fp-wheel')).to_have_count(0)
    # Reduced motion defaults to paused; manual next still changes the central photo.
    reduced=context.new_page();reduced.emulate_media(reduced_motion='reduce');reduced.clock.install()
    reduced.goto('http://lotus.test/ten',wait_until='networkidle');reduced.locator('.fp-wheel').scroll_into_view_if_needed()
    expect(reduced.locator('[data-wheel-toggle]')).to_have_count(0)
    reduced.clock.fast_forward(9000)
    assert reduced.locator('[data-wheel-slot="9"] button').get_attribute('data-fishing-photo')=='9'
    reduced.locator('[data-wheel-next]').click()
    assert reduced.locator('[data-wheel-slot="9"] button').get_attribute('data-fishing-photo')=='8'
    assert not errors,errors
    browser.close()
print('OK: 2s cycle and full loop, arrows-only controls, manual navigation, keyboard/lightbox, mobile sizes, contact/calendar, one/zero photos and reduced motion.')
