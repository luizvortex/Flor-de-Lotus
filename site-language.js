'use strict';
(() => {
  // Local translations for public pages; never load on admin or guest accounts.
  const languages = {
    pt: {label: 'Português', lang: 'pt-BR', flag: 'br', loading: 'Traduzindo…', error: 'Não foi possível carregar a tradução. Tente novamente.'},
    en: {label: 'English', lang: 'en', flag: 'gb', loading: 'Translating…', error: 'Translation could not be loaded. Please try again.'},
    he: {label: 'עברית', lang: 'he', flag: 'il', loading: 'מתרגם…', error: 'לא ניתן לטעון את התרגום. נסו שוב.'},
  };
  const flags = {
    br: '<rect width="28" height="20" rx="2" fill="#229e45"/><path d="m14 2 12 8-12 8L2 10Z" fill="#ffdf00"/><circle cx="14" cy="10" r="5" fill="#17479e"/><path d="M9.4 8.4a12 12 0 0 1 9 3.1" fill="none" stroke="#fff" stroke-width="1"/>',
    gb: '<rect width="28" height="20" rx="2" fill="#173b78"/><path d="m0 0 28 20M28 0 0 20" stroke="#fff" stroke-width="5"/><path d="m0 0 28 20M28 0 0 20" stroke="#c8102e" stroke-width="2"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="7"/><path d="M14 0v20M0 10h28" stroke="#c8102e" stroke-width="4"/>',
    il: '<rect width="28" height="20" rx="2" fill="#fff"/><path d="M0 4h28M0 16h28" stroke="#1764b4" stroke-width="2"/><path d="m14 6 3.5 6h-7Zm0 8-3.5-6h7Z" fill="none" stroke="#1764b4" stroke-width=".8"/>',
  };
  const flag = key => `<svg class="language-flag" viewBox="0 0 28 20" width="17" height="12" aria-hidden="true">${flags[languages[key].flag]}</svg>`;
  const storageKey = 'lotus-language';
  let current = 'pt', pending = false, dictionaryPromise, languageSequence = 0;
  let saved = 'pt';
  try { const value = localStorage.getItem(storageKey); if (Object.hasOwn(languages, value)) saved = value; } catch {}
  const selectors = [];
  const root = document.documentElement;
  const status = document.createElement('p');
  status.className = 'language-status notranslate'; status.translate = false;
  status.setAttribute('role', 'status'); status.hidden = true;
  document.body.append(status);
  function store(key) { try { localStorage.setItem(storageKey, key); } catch {} }
  // Retire cookies left by the former external translation widget.
  for (const domain of ['', `;domain=${location.hostname}`]) {
    document.cookie = `googtrans=;path=/;max-age=0${domain}`;
  }
  function setUI(key) {
    current = key;
    root.lang = languages[key].lang;
    root.dir = key === 'he' ? 'rtl' : 'ltr';
    selectors.forEach(menu => {
      menu.querySelector('[data-language-label]').innerHTML = `${flag(key)}<span lang="${languages[key].lang}" dir="auto">${languages[key].label}</span>`;
      menu.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === key)));
    });
  }
  function message(text, error = false) {
    status.textContent = text; status.hidden = !text;
    status.classList.toggle('is-error', error);
  }
  function closeMenus() { selectors.forEach(menu => { menu.open = false; }); }
  function createSelector(parent, className = '') {
    const menu = document.createElement('details');
    menu.className = `site-language notranslate ${className}`; menu.translate = false;
    menu.innerHTML = `<summary aria-label="Idioma / Language / שפה"><span data-language-label></span><svg class="language-chevron" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="language-options"><div class="language-choices" role="group" aria-label="Idioma / Language / שפה">${Object.keys(languages).map(key => `<button type="button" data-language="${key}" lang="${languages[key].lang}" aria-pressed="${key === current}">${flag(key)}<span dir="auto">${languages[key].label}</span><span class="language-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>`;
    menu.addEventListener('toggle', () => {
      if (menu.open) selectors.forEach(other => { if (other !== menu) other.open = false; });
    });
    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-language]');
      if (!button) return;
      closeMenus(); menu.querySelector('summary').focus({preventScroll: true});
      choose(button.dataset.language);
    });
    selectors.push(menu); parent.append(menu); return menu;
  }
  const homeNav = document.querySelector('.home-quick-nav');
  if (homeNav) {
    createSelector(homeNav, 'home-language');
    const mobileParent = document.querySelector('.home-menu-main');
    if (mobileParent) {
      const mobile = createSelector(mobileParent, 'mobile-language');
      mobileParent.querySelector('.home-menu-account')?.after(mobile);
    }
  } else {
    const header = document.querySelector('header');
    if (header) createSelector(header, 'public-language');
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-language')) closeMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const opened = selectors.find(menu => menu.open);
      if (opened) { event.preventDefault(); closeMenus(); opened.querySelector('summary').focus({preventScroll: true}); event.stopPropagation(); }
    }
  }, true);
  const textRecords = new WeakMap(), attributeRecords = new WeakMap();
  const normalize = value => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
  const ignored = 'script,style,textarea,svg,code,pre,.site-language,.language-status,[translate="no"],.notranslate,.rv-review-author h3,.rv-initials,[data-account-name],[data-account-email]';
  const attributes = ['aria-label','alt','placeholder','title'];
  let phrases = new Map(), reverse = new Map(), longPhrases = [], frame = 0;
  const observer = new MutationObserver(() => {
    if (current !== 'pt' && !frame) frame = requestAnimationFrame(() => { frame = 0; applyDocument(); });
  });
  const observe = () => observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  function loadDictionary() {
    if (!dictionaryPromise) dictionaryPromise = fetch('/site-translations.json?v=8', {signal:AbortSignal.timeout(15000)})
      .then(async response => {
        if (!response.ok) throw Error('Dictionary unavailable');
        const data = await response.json();
        if (data.version !== 1 || !data.phrases || Object.keys(data.phrases).length < 100) throw Error('Invalid dictionary');
        for (const [source, targets] of Object.entries(data.phrases)) {
          if (!Array.isArray(targets) || targets.length !== 2 || targets.some(text => typeof text !== 'string' || !text)) throw Error('Invalid translation');
          phrases.set(normalize(source), targets);
          targets.forEach(value => reverse.set(normalize(value), source));
        }
        longPhrases = [...phrases].filter(([source]) => source.length > 70);
      }).catch(error => { dictionaryPromise = undefined; throw error; });
    return dictionaryPromise;
  }
  const words = {
    'hóspede': ['guest','guests','אורח אחד','אורחים'], 'quarto': ['room','rooms','חדר אחד','חדרים'],
    'adulto': ['adult','adults','מבוגר אחד','מבוגרים'], 'criança': ['child','children','ילד אחד','ילדים'],
    'pessoa': ['person','people','אדם אחד','אנשים'], 'noite': ['night','nights','לילה אחד','לילות'],
    'dia': ['day','days','יום אחד','ימים'], 'ano': ['year','years','שנה אחת','שנים'],
    'foto': ['photo','photos','תמונה אחת','תמונות'], 'avaliação': ['review','reviews','חוות דעת אחת','חוות דעת'],
  };
  const templatePhrases = ['Opções para','Disponível para','Buscar','Selecionar','Entrada','Saída','Hóspedes','Andar','Quarto','Total','no total','de','a','Nota','Período','Idade da criança','no quarto','Foto anterior de','Próxima foto de','Ver fotos de','Ampliar fotos de','Destacar','foto','ano','anos','avaliações publicadas','avaliação publicada', 'Quarto Standard','Quarto Superior','Quarto Triplo Standard','Quarto Família','Piso superior','Térreo', 'jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro','domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const templates = new RegExp('(?<![\\p{L}\\p{N}])(?:'+templatePhrases.sort((a,b)=>b.length-a.length).map(escapeRegex).join('|')+')(?![\\p{L}\\p{N}])','giu');
  function translated(source) {
    if (current === 'pt') return source;
    const index = current === 'en' ? 0 : 1;
    let trimmed = source.trim(), key = normalize(trimmed), match = phrases.get(key);
    if (!match && reverse.has(key)) match = phrases.get(normalize(reverse.get(key)));
    let output = match?.[index];
    if (!output && trimmed.endsWith('…') && trimmed.length > 60) {
      const prefix = normalize(trimmed.slice(0,-1));
      const full = longPhrases.find(([original]) => original.startsWith(prefix));
      if (full) { const text=full[1][index]; output=text.length>trimmed.length?text.slice(0,trimmed.length).replace(/\s+\S*$/,'')+'…':text; }
    }
    if (!output) {
      output = trimmed;
      const months=['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
      const monthNames=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
      output=output.replace(/(\d{1,2}) de ([a-zç]+\.?)(?: de (\d{4}))?/gi,(original,day,month,year)=>{
        const m=Math.max(months.indexOf(month.toLowerCase()),monthNames.indexOf(month.toLowerCase()));
        if(m<0)return original;
        return new Intl.DateTimeFormat(current==='en'?'en-US':'he-IL',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(Date.UTC(Number(year)||2000,m,Number(day))));
      });
      output = output.replace(/Foto (\d+) de (\d+)/gi, (_, n, total) => current==='en'?`Photo ${n} of ${total}`:`תמונה ${n} מתוך ${total}`);
      output = output.replace(/Ver (\d+) fotos/gi, (_, n) => current==='en'?`See ${n} photos`:`צפייה ב־${n} תמונות`);
      output = output.replace(/(\d+)\s+(hóspedes|hóspede|quartos?|adultos?|crianças?|pessoas?|noites?|dias?|anos?|fotos?|avaliações|avaliação)(?:\(s\))?/gi, (original, count, unit) => {
        const singular = unit.toLowerCase().replace(/s$/,'').replace('hóspede','hóspede').replace('avaliaçõe','avaliação');
        const labels = words[singular]; if (!labels) return original;
        return current==='en'?`${count} ${labels[Number(count)===1?0:1]}`:Number(count)===1?labels[2]:`${count} ${labels[3]}`;
      });
      // Compose only known interface templates; unpublished editorial prose stays unchanged.
      if (/^(?:Opções para|Disponível para|Buscar|Selecionar|Entrada:|Saída:|Hóspedes:|Andar:|Quarto|Idade da criança|Foto|Próxima foto|Ver |Ampliar|Destacar|Nota|[0-9]|domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i.test(trimmed)) {
        output = output.replace(templates, value => phrases.get(normalize(value))?.[index] ?? value);
      }
      output = output.replace(/R\$\s*([0-9.]+,[0-9]{2})/g, (_, amount) => new Intl.NumberFormat(current==='en'?'en-US':'he-IL',{style:'currency',currency:'BRL'}).format(Number(amount.replace(/\./g,'').replace(',','.'))));
    }
    return source.slice(0,source.indexOf(trimmed)) + output + source.slice(source.indexOf(trimmed)+trimmed.length);
  }
  function translateText(node) {
    if (!node.data.trim() || node.parentElement?.closest(ignored)) return;
    let record = textRecords.get(node);
    if (!record || node.data !== record.last) record = {source:node.data,last:node.data};
    const value = translated(record.source); record.last=value; textRecords.set(node,record);
    if (node.data !== value) node.data=value;
  }
  function translateAttributes(element) {
    if (element.closest(ignored)) return;
    let records=attributeRecords.get(element); if (!records) { records=new Map(); attributeRecords.set(element,records); }
    for (const attribute of attributes) {
      if (!element.hasAttribute(attribute)) continue;
      const original=element.getAttribute(attribute);
      let record=records.get(attribute);
      if (!record || original!==record.last) record={source:original,last:original};
      const value=translated(record.source);record.last=value;records.set(attribute,record);
      if (original!==value) element.setAttribute(attribute,value);
    }
  }
  function applyDocument() {
    observer.disconnect();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateText(walker.currentNode);
    document.body.querySelectorAll('[aria-label],[alt],[placeholder],[title]').forEach(translateAttributes);
    if(document.querySelector('head title')?.firstChild) translateText(document.querySelector('head title').firstChild);
    observe();
  }
  async function choose(key) {
    if (!Object.hasOwn(languages,key) || (key===current&&!pending)) return;
    const sequence=++languageSequence;
    if (key==='pt') {
      pending=false;setUI('pt');applyDocument();store('pt');message('');
      selectors.forEach(menu=>menu.removeAttribute('aria-busy'));return;
    }
    pending=true;selectors.forEach(menu=>menu.setAttribute('aria-busy','true'));message(languages[key].loading);
    try {
      await loadDictionary();if(sequence!==languageSequence)return;
      setUI(key);applyDocument();store(key);message('');
    } catch {
      if(sequence===languageSequence)message(languages[current].error,true);
    } finally {
      if(sequence===languageSequence){pending=false;selectors.forEach(menu=>menu.removeAttribute('aria-busy'));}
    }
  }
  setUI('pt');observe();
  if (saved!=='pt') choose(saved);
})();
