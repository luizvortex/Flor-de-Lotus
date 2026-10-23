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
    const desktopHeader = window.matchMedia('(min-width: 768px)');
    const quickNav = header.querySelector('.home-quick-nav');
    const booking = header.querySelector('.home-booking');
    const account = header.querySelector('.home-account');
    // Move the original controls so their listeners and signed-in avatar stay intact.
    const bookingSlot = document.createComment('booking-home');
    const accountSlot = document.createComment('account-home');
    booking.before(bookingSlot); account.before(accountSlot);
    function setCompact(compact) {
        if (header.classList.contains('is-compact') === compact) return;
        const focused = document.activeElement;
        const restoreFocus = booking.contains(focused) || account.contains(focused);
        if (compact) { quickNav.prepend(booking); quickNav.append(account); }
        else { bookingSlot.after(booking); accountSlot.after(account); }
        header.classList.toggle('is-compact', compact);
        if (restoreFocus) focused.focus({ preventScroll: true });
    }
    let scrollFrame = 0;
    let lastHeroProgress = -1;
    let lastHeroDesktop;
    function paintScroll() {
        scrollFrame = 0;
        const rect = hero.getBoundingClientRect();
        header.classList.toggle('is-scrolled', window.scrollY > 40);
        // Fixed expanded-header boundary avoids a resize loop when its height changes.
        setCompact(desktopHeader.matches && rect.bottom <= 142);
        const progress = reducedMotion.matches ? 0 : Math.max(0, Math.min(1, -rect.top / rect.height));
        if (progress !== lastHeroProgress || desktopHeader.matches !== lastHeroDesktop) {
            const travel = desktopHeader.matches ? .16 : .09;
            hero.style.setProperty('--hero-scroll-y', `${(progress * rect.height * travel).toFixed(2)}px`);
            hero.style.setProperty('--hero-scroll-scale', (1 + progress * (desktopHeader.matches ? .075 : .04)).toFixed(4));
            hero.classList.toggle('is-scroll-active', progress > 0 && progress < 1);
            lastHeroProgress = progress;
            lastHeroDesktop = desktopHeader.matches;
        }
    }
    const onScroll = () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    desktopHeader.addEventListener('change', onScroll);
    window.addEventListener('load', onScroll);
    reducedMotion.addEventListener('change', onScroll);
    paintScroll();
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
            const destinationHeader = desktopHeader.matches && target !== hero ? 64 : header.offsetHeight;
            const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - destinationHeader);
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
        video.defaultPlaybackRate=.65;
        video.playbackRate=.65;
        video.addEventListener('playing',()=>video.classList.add('is-playing'));
        video.addEventListener('error',()=>video.classList.remove('is-playing'));
        video.querySelector('source')?.addEventListener('error',()=>video.classList.remove('is-playing'));
        new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;schedule();},{threshold:.05}).observe(hero);
        document.addEventListener('visibilitychange',schedule);
        reducedMotion.addEventListener('change',schedule);
        schedule();
    }
})();
