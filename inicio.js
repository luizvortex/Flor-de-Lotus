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
    document.addEventListener('pointerdown', () => { document.body.dataset.navInput = 'pointer'; }, { passive: true });
    document.addEventListener('keydown', () => { document.body.dataset.navInput = 'keyboard'; });
    const mobileMenu = window.matchMedia('(max-width: 767px)');
    mobileMenu.addEventListener('change', event => {
        if (!event.matches && menu.open) {
            menu.close();
            document.querySelector('.home-brand').focus({ preventScroll: true });
        }
    });
    menuToggle.addEventListener('click', event => {
        document.body.dataset.navInput = event.detail === 0 ? 'keyboard' : 'pointer';
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
    const dots = Array.from(document.querySelectorAll('.hero-dot'));
    const interval = 6500;
    const status = document.getElementById('hero-status');
    let index = 0;
    let motionPaused = reducedMotion.matches;
    let hovering = false;
    let focused = false;
    let timer;
    let remaining = interval;
    let startedAt = 0;
    let progress;
    function stopClock() {
        if (timer !== undefined) {
            window.clearTimeout(timer);
            timer = undefined;
            remaining = Math.max(0, remaining - (performance.now() - startedAt));
        }
        progress?.pause();
    }
    function resetProgress() {
        progress?.cancel();
        progress = undefined;
        if (!reducedMotion.matches) {
            progress = dots[index].querySelector('.hero-dot-fill').animate(
                [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
                { duration: interval, fill: 'both' }
            );
            progress.pause();
        }
    }
    function show(next, manual = false) {
        stopClock();
        const previous = index;
        index = (next + slides.length) % slides.length;
        slides[previous].classList.remove('is-active');
        slides[previous].setAttribute('aria-hidden', 'true');
        slides[index].classList.add('is-active');
        slides[index].removeAttribute('aria-hidden');
        dots.forEach((dot, i) => {
            dot.classList.toggle('is-active', i === index);
            if (i === index) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
        remaining = interval;
        resetProgress();
        if (manual) status.textContent = slides[index].getAttribute('aria-label');
        schedule();
    }
    function schedule() {
        stopClock();
        if (!motionPaused && !hovering && !focused && !document.hidden && !menu.open) {
            startedAt = performance.now();
            progress?.play();
            timer = window.setTimeout(() => { timer = undefined; show(index + 1); }, remaining);
        }
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
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
    reducedMotion.addEventListener('change', () => { stopClock(); motionPaused = reducedMotion.matches; remaining = interval; resetProgress(); schedule(); });
    resetProgress();
    schedule();
})();
