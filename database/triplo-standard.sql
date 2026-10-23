-- Add the fourth editorial block; preserve existing content and booking inventory.
alter table lotus_private.room_showcases drop constraint room_showcases_slug_check;
alter table lotus_private.room_showcases add constraint room_showcases_slug_check check(slug in ('duplo','triplo','triplo-standard','familia'));
alter table lotus_private.room_showcases drop constraint room_showcases_position_check;
alter table lotus_private.room_showcases add constraint room_showcases_position_check check(position between 1 and 4);
update lotus_private.room_showcases set position=4 where slug='familia';
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features,details) values ('triplo-standard',3,'Quarto Triplo Standard','','Um refúgio acolhedor para compartilhar os dias em Itacaré. O Quarto Triplo Standard é uma opção para quem viaja em três e quer aproveitar a estadia com tranquilidade.','[{"url": "/img Pousada/quartotriplo.jpg", "alt": "Quarto Triplo Standard — foto 1"}, {"url": "/img casal/triplo.jpg", "alt": "Quarto Triplo Standard — foto 2"}, {"url": "/img casal/triplo1.jpg", "alt": "Quarto Triplo Standard — foto 3"}]'::jsonb,'[{"icon": "people", "label": "Acomodação para três pessoas"}]'::jsonb,'{}'::jsonb);
