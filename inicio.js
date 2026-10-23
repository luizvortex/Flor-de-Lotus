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
    const video=hero.querySelector('.home-hero-video');
    let heroVisible=true;
    function schedule(){
        if(!video)return;
        if(reducedMotion.matches||document.hidden||menu.open||!heroVisible){
            video.pause();
            if(reducedMotion.matches)video.classList.remove('is-playing');
            return;
        }
        video.muted=true;
        if(video.paused)video.play().then(()=>{if(!video.paused)video.classList.add('is-playing');}).catch(()=>{video.classList.remove('is-playing');});
        else if(video.readyState>=2)video.classList.add('is-playing');
    }
    if(video){
        video.addEventListener('playing',()=>video.classList.add('is-playing'));
        video.addEventListener('error',()=>video.classList.remove('is-playing'));
        video.querySelector('source')?.addEventListener('error',()=>video.classList.remove('is-playing'));
        new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;schedule();},{threshold:.05}).observe(hero);
        document.addEventListener('visibilitychange',schedule);
        reducedMotion.addEventListener('change',schedule);
        schedule();
    }
})();
