"""Visual calibration of all four layers against the user-supplied original; no backend writes."""
from pathlib import Path
from urllib.parse import urlparse,unquote
import mimetypes
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
def route(request):
 u=urlparse(request.request.url)
 if u.hostname!='reference.test':return request.abort()
 if u.path=='/':return request.fulfill(body='<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="romance-page"><div id="preview" style="max-width:1100px;margin:auto;padding:16px"></div></body></html>',content_type='text/html')
 file=(root/unquote(u.path).lstrip('/')).resolve()
 if root not in file.parents or not file.is_file():return request.fulfill(status=404,body='')
 return request.fulfill(body=file.read_bytes(),content_type=mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce');context.route('**/*',route)
 page=context.new_page();page.goto('http://reference.test/')
 page.add_style_tag(content='\n'.join((root/'romance-experience.css').read_text().splitlines()[1:]));page.add_style_tag(content=(root/'romantic-room-preview.css').read_text());page.add_script_tag(url='/romantic-room-preview.config.js');page.add_script_tag(url='/romantic-room-preview.js')
 page.evaluate('''()=>{
 const config=window.romanticRoomPreviewConfig;
 const view=new RomanticRoomPreview(document.querySelector('#preview'),config);
 const product=(name,id,photos_required=0)=>({name,photos_required,variants:[{id}]});
 view.update({products:[product('Decoração com pétalas','p'),product('Arranjo de flores','f'),product('Porta-retrato personalizado','m',1),product('Cartão personalizado','c')],cart:[['p',1],['f',1],['m',1],['c',1]],photos:[{url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0YQAAAAASUVORK5CYII='}],message:'Nosso momento especial'});view.setCompare(0);
 }''')
 expect(page.locator('.rrp-main-scene .is-visible')).to_have_count(4)
 expect(page.locator('.rrp-main-scene .rrp-base').first).to_have_attribute('src','/images/romantic/user-room-reference.jpg')
 for width in [360,375,390,430,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('#preview').screenshot(path=str(root/f'work/romance-reference-calibrated-{width}.png'))
 page.locator('.rrp-expand').click();expect(page.locator('.rrp-modal')).to_be_visible();expect(page.locator('.rrp-modal .is-visible')).to_have_count(4);page.keyboard.press('Escape');expect(page.locator('.rrp-expand')).to_be_focused()
 browser.close()
 print('PASS: original JPEG, four layers, seven viewport widths, modal state and focus; no production or database access.')
