'use strict';
(() => {
 document.querySelectorAll('[data-footer-map]').forEach(container=>{
  const iframe=container.querySelector('iframe'),message=container.querySelector('[data-map-error]');
  iframe?.addEventListener('error',()=>{message.hidden=false;container.dataset.mapState='unavailable';});
  iframe?.addEventListener('load',()=>{message.hidden=true;container.dataset.mapState='loaded';});
 });
})();
