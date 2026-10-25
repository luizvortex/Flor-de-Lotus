-- One-time, user-authorized inventory setup. Keep all existing reservations and prices.
-- Temporary numbering: 1..11 ground floor; 12..19 upper floor. Owner can edit it.
do $setup$
declare baseline integer; unit integer;
begin
 lock table lotus_private.rooms in share row exclusive mode;
 assert (select count(*) from lotus_private.rooms)<=19,'Inventory already exceeds requested count';
 assert not exists(select 1 from lotus_private.rooms where name !~ '^([1-9]|1[0-9])$'),'Review existing unit numbering first';
 assert not exists(select 1 from lotus_private.bookings where status in ('pendente','confirmada') and "end">(now() at time zone 'America/Bahia')::date and guests>2),'Existing guests exceed the requested double configuration';
 select price into baseline from lotus_private.rooms where type='casal' and active=1 order by id limit 1;
 assert baseline is not null,'Set a double-room tariff before provisioning more units';
 update lotus_private.rooms set type='casal',capacity=2,family_enabled=false,floor=case when name::integer<=11 then 'terreo' else 'superior' end;
 for unit in 1..19 loop
  insert into lotus_private.rooms(name,type,capacity,price,active,floor,family_enabled)
  values(unit::text,'casal',2,baseline,1,case when unit<=11 then 'terreo' else 'superior' end,false)
  on conflict(name) do nothing;
 end loop;
 insert into lotus_private.room_content_links(room_id,showcase_slug)
 select id,'duplo' from lotus_private.rooms on conflict(room_id) do update set showcase_slug=excluded.showcase_slug;
 -- Backfill historical bookings only when their floor has never been recorded.
 update lotus_private.bookings b set room_floor=r.floor from lotus_private.rooms r where b.room_id=r.id and b.room_floor is null;
 assert (select count(*) from lotus_private.rooms)=19;
 assert (select count(*) from lotus_private.rooms where floor='terreo')=11;
end $setup$;
