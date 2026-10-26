'use strict';
(() => {
 const paths={
 check2:'<path d="m5 12 4 4L20 5"/>',
 wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".8"/>',
 tv:'<rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 22h8m-4-4v4"/>',
 snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3.5 10l4-1-1-4m15 9-4 1 1 4M3.5 14l4 1-1 4m15-9-4-1 1-4"/>',
 'door-open':'<path d="M3 22h18M5 22V3h14v19M8 22V5l8-2v19"/><circle cx="13" cy="13" r=".6"/>',
 'cup-hot':'<path d="M4 9h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm13 1h2a3 3 0 0 1 0 6h-2M2 23h18M7 6V2m4 4V1m4 5V2"/>',
 breakfast:'<path d="M3 8h12v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm12 1h3a3 3 0 0 1 0 6h-3M1 22h21M6 5V2m4 3V1m4 4V2"/>',
 bath:'<path d="M2 13h20v3a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5Zm2 8v2m16-2v2M5 13V4a3 3 0 0 1 6 0v1m-3 0h6"/><path d="m10 8-.5 2m3-2 .5 2"/>',
 shower:'<path d="M5 22V5a4 4 0 0 1 8 0v1m-4 4a4 4 0 0 1 8 0Zm1 4v1m3-1v1m3-1v1m-6 3v1m3-1v1m3-1v1"/>',
 elevator:'<rect x="3" y="5" width="18" height="17" rx="1"/><path d="M12 5v17M7 10v7m-2-5 2-2 2 2m6 3 2 2 2-2m-2-5v7M8 2l2-2m4 0 2 2"/>',
 heating:'<path d="M3 7h18M3 17h18M6 21V3h3v18Zm6 0V3h3v18Zm6 0V3h3v18ZM1 10h2m18 4h2"/>',
 kettle:'<path d="M5 9h12l2 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 1L1 7m16 4h3a3 3 0 0 1 0 6h-2M7 6h8m-6-3h4m-2 0v3"/>',
 safe:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 6v3m0 6v3m-6-6h3m6 0h3M6 21v2m12-2v2"/>',
 minibar:'<path d="M6 3h12l-1 6a5 5 0 0 1-10 0Zm6 11v8m-5 0h10M7 7h10"/>',
 desk:'<path d="M2 10h20M4 10v12m16-12v12M15 10v7h5M6 8V3h9v5m-12 0h15"/>',
 wardrobe:'<rect x="3" y="2" width="18" height="19" rx="1"/><path d="M12 2v19M6 21v2m12-2v2M9 9v4m6-4v4"/>',
 paper:'<ellipse cx="16" cy="7" rx="5" ry="4"/><path d="M16 3H8a5 5 0 0 0-5 5v13h13V7m5 0v9a5 5 0 0 1-5 5M6 16h7"/>',
 toiletries:'<path d="M6 10h12v12H6Zm3-5h6v5M12 5V2h7v3M9 14h6m-4 4h2"/>',
 'no-smoking':'<path d="M2 16h17v4H2Zm17 0h3v4h-3M15 12V9c0-2-3-1-3-4V2m6 10V9c0-2-3-2-3-4M2 2l20 20"/>',
 'hair-dryer':'<path d="M4 6h13a5 5 0 0 1 0 10h-5l-1 7H7l1-8H4Zm15 1v8M1 7v7M22 8h2m-2 5h2"/>',
 towels:'<path d="M2 6h20M5 6v15h14V6M8 6v11h8V6M5 18h14"/>',
 toilet:'<path d="M5 3h12v8H5Zm2 8h14a8 8 0 0 1-8 8H8a5 5 0 0 1-5-5v-3m6 8-1 4h10l-1-5M8 6h2"/>',
 'shield-check':'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 7-7"/>',
 wind:'<path d="M2 7h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 0-3-3M2 17h10a3 3 0 1 1-3 3"/>',
 water:'<path d="M1 8c4-5 6 5 10 0s6 5 12 0M1 14c4-5 6 5 10 0s6 5 12 0M1 20c4-5 6 5 10 0s6 5 12 0"/>',
 'car-front':'<path d="m4 9 2-6h12l2 6M3 9h18v10H3Zm2 10v3m14-3v3M6 13h2m8 0h2"/>',
 people:'<circle cx="8" cy="6" r="3"/><circle cx="18" cy="8" r="2"/><path d="M1 22v-5a7 7 0 0 1 14 0v5m0-8a5 5 0 0 1 8 4v4"/>',
 'house-door':'<path d="m1 11 11-9 11 9M4 9v13h16V9M9 22v-9h6v9"/>',
 lamp:'<path d="M7 3h10l5 12H2Zm5 12v7m-5 0h10"/>',
 droplet:'<path d="M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14Z"/>',
 'thermometer-half':'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-6v9"/><circle cx="12" cy="18" r="1.5"/>',
 person:'<circle cx="12" cy="6" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 sun:'<circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 telephone:'<path d="m5 2 4 5-3 3a18 18 0 0 0 8 8l3-3 5 4c-2 8-10 3-15-2S-3 4 5 2Z"/>',
 tree:'<path d="M12 2 4 12h4l-6 7h20l-6-7h4ZM12 19v4"/>',
 bicycle:'<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-10 6 10H5m3-13h5m3 0h3l-3 13"/>',
 plug:'<path d="M8 2v6m8-6v6M5 8h14v5a7 7 0 0 1-14 0Zm7 12v4"/>',
 fan:'<circle cx="12" cy="12" r="2"/><path d="M11 10C3-1 18-2 14 10m0 2c13-3 9 11 0 2m-3 0c-4 12-14 0-1-1"/>',
 images:'<rect x="2" y="3" width="20" height="18" rx="1"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-5 6 7"/>'
 };
 const labels={check2:'Incluído / marca de seleção',wifi:'Wi-Fi grátis',tv:'TV de tela plana',snow:'Ar-condicionado','door-open':'Varanda / porta','cup-hot':'Café / bebidas',breakfast:'Café da manhã incluso',bath:'Banheiro privativo',shower:'Chuveiro',elevator:'Elevador / acesso aos andares',heating:'Aquecimento',kettle:'Chaleira / cafeteira',safe:'Cofre',minibar:'Frigobar',desk:'Escrivaninha',wardrobe:'Guarda-roupa / armário',paper:'Papel higiênico',toiletries:'Produtos de higiene grátis','no-smoking':'Quarto para não fumantes','hair-dryer':'Secador de cabelo',towels:'Toalhas',toilet:'Vaso sanitário','shield-check':'Segurança',wind:'Ventilação',water:'Piscina / água','car-front':'Estacionamento',people:'Família','house-door':'Acomodação',lamp:'Iluminação',droplet:'Água / banho','thermometer-half':'Temperatura',person:'Hóspede',sun:'Sol / lazer',telephone:'Telefone',tree:'Jardim',bicycle:'Bicicleta',plug:'Tomada',fan:'Ventilador'};
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function icon(key){return `<svg class="room-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[key]||paths.check2}</svg>`;}
 function infer(label){const value=normalize(label);return [['elevador','elevator'],['aquec','heating'],['ar-cond','snow'],['banheiro priv','bath'],['chaleira','kettle'],['cafeteira','kettle'],['chuveiro','shower'],['cofre','safe'],['frigobar','minibar'],['escrivan','desk'],['armario','wardrobe'],['guarda-roupa','wardrobe'],['papel higien','paper'],['produtos de','toiletries'],['fumante','no-smoking'],['secador','hair-dryer'],['toalha','towels'],['vaso sanitario','toilet'],['wifi','wifi'],['wi-fi','wifi'],['tv','tv'],['televis','tv'],['cafe da manha','breakfast']].find(([word])=>value.includes(word))?.[1]||'check2';}
 function unique(items){const seen=new Set();return items.filter(item=>{const key=normalize(item.label).trim();if(!key||seen.has(key))return false;seen.add(key);return true;});}
 function amenitiesFor(room){if(Array.isArray(room.amenities))return room.amenities;const d=room.details||{};return unique([...(d.amenities||[]),...(d.bathroom||[]),...(d.views||[])].map(label=>({icon:infer(label),label})).concat(room.features||[]));}
 function highlights(room){return unique((room.eyebrow?[{icon:'check2',label:room.eyebrow}]:[]).concat(room.features||[]));}
 function highlightHTML(room){return highlights(room).map(item=>`<li>${icon(item.icon)}<span>${escape(item.label)}</span></li>`).join('');}
 function amenitiesHTML(room){const items=amenitiesFor(room);return items.length?`<section class="room-amenities-list"><h4>Comodidades do quarto:</h4><ul>${items.map(item=>`<li>${icon(item.icon)}<span>${escape(item.label)}</span></li>`).join('')}</ul></section>`:'';}
 function upgrade(){document.querySelectorAll('[data-room-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.roomIcon);});}
 window.roomAmenities={icons:labels,icon,infer,amenitiesFor,highlightHTML,amenitiesHTML,upgrade};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',upgrade);else upgrade();
})();
