'use strict';
(() => {
    const hero = document.querySelector('.home-hero');
    if (!hero) return;
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const header = document.querySelector('.home-header');
    const intro = document.querySelector('.intro-screen');
    const menu = document.getElementById('home-menu');
    const menuToggle = document.querySelector('.home-menu-toggle');
    const closeMenu = document.querySelector('.home-menu-close');
    intro.addEventListener('animationend', event => {
        if (event.animationName === 'intro-curtain') root.classList.add('intro-complete');
    });
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    menuToggle.addEventListener('click', () => {
        root.classList.add('intro-complete');
        menu.showModal();
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('home-menu-open');
        schedule();
    });
    closeMenu.addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('home-menu-open');
        schedule();
    });
    // Smooth in-page links use the current fixed header height. No Bootstrap
    // collapse behavior is needed for this full-screen dialog menu.
    document.querySelectorAll('.home-header a[href^="#"], .home-menu a[href^="#"], .hero-discover').forEach(link => {
        link.addEventListener('click', event => {
            const target = document.getElementById(link.hash.slice(1));
            if (!target) return;
            event.preventDefault();
            if (menu.open) menu.close();
            const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - header.offsetHeight);
            window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
            // Keep a navigable URL and move keyboard focus to the destination.
            history.replaceState(null, '', link.hash);
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        });
    });
    const slides = Array.from(document.querySelectorAll('.hero-frame'));
    const current = document.getElementById('hero-current');
    const pause = document.getElementById('hero-pause');
    const status = document.getElementById('hero-status');
    let index = 0;
    let userPaused = reducedMotion.matches;
    let hovering = false;
    let focused = false;
    let timer;
    function updatePause() {
        pause.setAttribute('aria-pressed', String(userPaused));
        pause.setAttribute('aria-label', userPaused ? 'Reproduzir carrossel' : 'Pausar carrossel');
    }
    function show(next, manual = false) {
        const previous = index;
        index = (next + slides.length) % slides.length;
        slides[previous].classList.remove('is-active');
        slides[previous].setAttribute('aria-hidden', 'true');
        slides[index].classList.add('is-active');
        slides[index].removeAttribute('aria-hidden');
        current.textContent = String(index + 1).padStart(2, '0');
        if (manual) status.textContent = slides[index].getAttribute('aria-label');
        schedule();
    }
    function schedule() {
        window.clearTimeout(timer);
        if (!userPaused && !hovering && !focused && !document.hidden && !menu.open) timer = window.setTimeout(() => show(index + 1), 6500);
    }
    document.getElementById('hero-prev').addEventListener('click', () => show(index - 1, true));
    document.getElementById('hero-next').addEventListener('click', () => show(index + 1, true));
    pause.addEventListener('click', () => { userPaused = !userPaused; updatePause(); schedule(); });
    hero.addEventListener('mouseenter', () => { hovering = true; schedule(); });
    hero.addEventListener('mouseleave', () => { hovering = false; schedule(); });
    hero.addEventListener('focusin', () => { focused = true; schedule(); });
    hero.addEventListener('focusout', event => {
        if (!hero.contains(event.relatedTarget)) { focused = false; schedule(); }
    });
    // Swipe is limited to horizontal gestures; vertical page scrolling remains native.
    let touch;
    hero.addEventListener('touchstart', event => { touch = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }, { passive: true });
    hero.addEventListener('touchend', event => {
        if (!touch) return;
        const x = event.changedTouches[0].clientX - touch.x;
        const y = event.changedTouches[0].clientY - touch.y;
        if (Math.abs(x) > 55 && Math.abs(x) > Math.abs(y) * 1.5) show(index + (x < 0 ? 1 : -1), true);
        touch = undefined;
    }, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', () => { userPaused = reducedMotion.matches; updatePause(); schedule(); });
    updatePause();
    schedule();
})();
