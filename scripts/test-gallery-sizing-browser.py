import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_cookies([{'name':'lotus_access','value':'admin-test','url':base}])
 page=context.new_page();page.route('https://**',lambda route:route.abort())
 page.goto(base+'/admin',wait_until='networkidle')
 page.locator('[data-tab="site"]').click();page.locator('[data-cms-section="gallery"]').click()
 page.locator('[data-cms-item="gallery.photos.0"] > summary').click()
 field='[data-cms-field="gallery.photos.0.url"]'
 for width,height in [(200,400),(400,100)]:
  previous=page.locator(field).input_value()
  page.evaluate('''async([w,h])=>{
   const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#cc0000';x.fillRect(0,0,w,h/2);x.fillStyle='#0000cc';x.fillRect(0,h/2,w,h/2);
   const blob=await new Promise(r=>c.toBlob(r,'image/png'));const d=new DataTransfer();d.items.add(new File([blob],'teste.png',{type:'image/png'}));
   const input=document.querySelector('[data-cms-upload="gallery.photos.0.url"]');input.files=d.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  }''',[width,height])
  page.wait_for_function('''old=>{const i=document.querySelector('[data-cms-field="gallery.photos.0.url"]');return i.value!==old&&!document.querySelector('[data-cms-action="save"]').disabled}''',arg=previous)
  result=page.evaluate('''async()=>{
   const url=document.querySelector('[data-cms-field="gallery.photos.0.url"]').value;
   const bitmap=await createImageBitmap(await(await fetch(url)).blob());const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const x=c.getContext('2d');x.drawImage(bitmap,0,0);
   const pixel=(px,py)=>Array.from(x.getImageData(px,py,1,1).data);
   return {w:c.width,h:c.height,background:pixel(1,1),top:pixel(Math.floor(c.width/2),2),bottom:pixel(Math.floor(c.width/2),c.height-3)};
  }''')
  assert result['w']*3==result['h']*4,result
  assert result['w']<=1600 and result['h']<=1200
  assert result['background'][0]>150 and result['background'][1]<50,result
  assert result['top'][0]>150 and result['bottom'][2]>150,result
 page.locator('[data-cms-action="save"]').click();page.get_by_text('Publicado! As alterações aparecem ao abrir ou atualizar o site.').wait_for()
 page.goto(base+'/',wait_until='domcontentloaded')
 assert page.locator('.pousada-gallery-slide img').first.evaluate("i=>getComputedStyle(i).objectFit")=='cover'
 for width in [390,1440,1900]:
  page.set_viewport_size({'width':width,'height':1000})
  frames=page.locator('.pousada-gallery-slide').all()[:3]
  boxes=[frame.bounding_box() for frame in frames]
  assert all(abs(box['height']-boxes[0]['height'])<1 and abs(box['y']-boxes[0]['y'])<1 for box in boxes),boxes
  assert abs(boxes[1]['x']-(boxes[0]['x']+boxes[0]['width']))<1,boxes
 context.close();browser.close()
 print('Portrait and panorama cropped to full 4:3 frames; equal heights, adjacent slides and publication passed.')
