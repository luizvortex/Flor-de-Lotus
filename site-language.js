'use strict';
(() => {
  // Only public editorial pages load this file; never the admin or guest account.
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
  let current = 'pt', pending = false, providerPromise;
  let saved = 'pt';
  try { const value = localStorage.getItem(storageKey); if (Object.hasOwn(languages, value)) saved = value; } catch {}
  const selectors = [];
  const root = document.documentElement;
  const status = document.createElement('p');
  status.className = 'language-status notranslate'; status.translate = false;
  status.setAttribute('role', 'status'); status.hidden = true;
  document.body.append(status);
  function store(key) { try { localStorage.setItem(storageKey, key); } catch {} }
  function cookie(key) {
    // Clear both host and dotted-host variants used by the provider. Never set a parent domain.
    for (const domain of ['', `;domain=${location.hostname}`]) {
      document.cookie = `googtrans=;path=/;max-age=0${domain}`;
      document.cookie = `googtrans=/pt/${key === 'he' ? 'iw' : key};path=/;SameSite=Lax${domain}${location.protocol === 'https:' ? ';Secure' : ''}`;
    }
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
    menu.innerHTML = `<summary aria-label="Idioma / Language / שפה"><span data-language-label></span><svg class="language-chevron" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="language-options"><div class="language-choices" role="group" aria-label="Idioma / Language / שפה">${Object.keys(languages).map(key => `<button type="button" data-language="${key}" lang="${languages[key].lang}" aria-pressed="${key === current}">${flag(key)}<span dir="auto">${languages[key].label}</span><span class="language-check" aria-hidden="true">✓</span></button>`).join('')}</div><a class="language-credit" href="https://translate.google.com/" target="_blank" rel="noopener noreferrer">Google Translate</a></div>`;
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
  function loadProvider() {
    if (providerPromise) return providerPromise;
    providerPromise = new Promise((resolve, reject) => {
      const host = document.createElement('div');
      host.id = 'lotus-google-translate'; host.className = 'language-provider';
      host.setAttribute('aria-hidden', 'true'); host.inert = true;
      document.body.append(host);
      let interval;
      const timer = setTimeout(() => finish(new Error('Translation timeout')), 20000);
      const script = document.createElement('script');
      function finish(error, combo) {
        clearTimeout(timer); clearInterval(interval);
        if (error) { script.remove(); host.remove(); providerPromise = undefined; reject(error); }
        else resolve(combo);
      }
      window.lotusTranslateReady = () => {
        try {
          new window.google.translate.TranslateElement({pageLanguage: 'pt', includedLanguages: 'en,iw,pt', autoDisplay: false}, host.id);
          interval = setInterval(() => {
            const combo = host.querySelector('select.goog-te-combo');
            if (combo && combo.options.length > 1) finish(null, combo);
          }, 100);
        } catch (error) { finish(error); }
      };
      script.src = 'https://translate.google.com/translate_a/element.js?cb=lotusTranslateReady';
      script.async = true;
      script.onerror = () => finish(new Error('Translation unavailable'));
      document.head.append(script);
    });
    return providerPromise;
  }
  async function choose(key) {
    if (!Object.hasOwn(languages, key) || pending || key === current) return;
    if (key === 'pt') {
      store('pt'); cookie('pt');
      // Restore the original Portuguese DOM, including dynamically rendered content.
      location.reload(); return;
    }
    pending = true;
    selectors.forEach(menu => menu.setAttribute('aria-busy', 'true'));
    message(languages[key].loading);
    cookie(key);
    try {
      const combo = await loadProvider();
      combo.value = key === 'he' ? 'iw' : key;
      if (!combo.value) throw new Error('Unsupported translation');
      combo.dispatchEvent(new Event('change', {bubbles: true}));
      store(key); setUI(key); message('');
    } catch {
      cookie(current); message(languages[key].error, true);
    } finally {
      pending = false;
      selectors.forEach(menu => menu.removeAttribute('aria-busy'));
    }
  }
  // Keep fixed navigation below the provider's own attribution/translation toolbar.
  const toolbarOffset = () => root.style.setProperty('--translation-toolbar-offset', `${Math.max(0, parseFloat(document.body.style.top) || 0)}px`);
  new MutationObserver(toolbarOffset).observe(document.body, {attributes: true, attributeFilter: ['style']});
  setUI('pt');
  if (saved !== 'pt') choose(saved);
  else cookie('pt');
})();
