-- Editorial categories share the existing physical inventory, prices and exclusion constraint.
alter table lotus_private.room_showcases drop constraint room_showcases_slug_check;
alter table lotus_private.room_showcases add constraint room_showcases_slug_check check(slug in ('duplo','triplo','triplo-standard','triplo-superior','familia','familia-superior'));
alter table lotus_private.room_showcases drop constraint room_showcases_position_check;
alter table lotus_private.room_showcases add constraint room_showcases_position_check check(position between 1 and 6);
update lotus_private.room_showcases set position=5,revision=revision+1,updated_at=now() where slug='familia' and position<>5;
update lotus_private.room_showcases set title='Quarto Standard Superior',revision=revision+1,updated_at=now() where slug='triplo' and title='Quarto Superior';
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features,details,amenities)
 select 'triplo-superior',4,'Quarto Triplo Superior','','Uma opção para quem viaja em três e prefere o piso superior. Aproveite os dias em Itacaré com conforto e tranquilidade.',upper_room.photos,lower_room.features,lower_room.details,upper_room.amenities
 from lotus_private.room_showcases upper_room cross join lotus_private.room_showcases lower_room where upper_room.slug='triplo' and lower_room.slug='triplo-standard'
 on conflict(slug) do nothing;
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features,details,amenities)
 select 'familia-superior',6,'Quarto Família Superior','','Para viajar em família e se hospedar no piso superior. Organize sua estadia e aproveite Itacaré com tranquilidade.',photos,features,details,amenities from lotus_private.room_showcases where slug='familia'
 on conflict(slug) do nothing;
create or replace function lotus_private.category_matches(r lotus_private.rooms, slug text) returns boolean
language sql immutable set search_path='' as $$
 select case slug when 'duplo' then r.floor='terreo'
 when 'triplo' then r.floor='superior'
 when 'triplo-standard' then r.floor='terreo' and r.capacity>=3
 when 'triplo-superior' then r.floor='superior' and r.capacity>=3
 when 'familia' then r.floor='terreo' and r.capacity>=5
 when 'familia-superior' then r.floor='superior' and r.capacity>=5 else false end;
$$;
revoke all on function lotus_private.category_matches(lotus_private.rooms,text) from public,anon,authenticated;
-- Existing active upstairs family bookings keep their floor, units, quote and dates.
update lotus_private.bookings set requested_category='familia-superior' where requested_category='familia' and room_floor='superior' and status in ('pendente','confirmada');
