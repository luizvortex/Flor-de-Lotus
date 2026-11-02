// Shared category matching used by the room catalogue and fishing introduction.
(() => {
 const categoryRules={duplo:{floor:'terreo',capacity:1},triplo:{floor:'superior',capacity:1},'triplo-standard':{floor:'terreo',capacity:3},'triplo-superior':{floor:'superior',capacity:3},familia:{floor:'terreo',capacity:5},'familia-superior':{floor:'superior',capacity:5}};
 const defaultSlug=r=>r.presentation_slug||r.showcase_slug||({familia:'familia',casal_mais_um:'triplo-standard'}[r.type]||'duplo');
 const categoryRooms=(row,rooms)=>{const rule=categoryRules[row.slug];return rooms.filter(r=>r.category_slug?r.category_slug===row.slug&&(!rule||!r.floor||r.floor===rule.floor):rule?r.floor===rule.floor&&r.capacity>=rule.capacity:defaultSlug(r)===row.slug);};
 window.lotusRoomCatalog={categoryRules,defaultSlug,categoryRooms};
})();
