-- Correct physical floor labels using room numbers, never generated IDs.
-- Room 19 remains inactive. No room, booking date, price or allocation is changed.
do $correction$
declare room_snapshot jsonb;booking_snapshot jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
 perform 1 from lotus_private.rooms where name in(select generate_series(1,19)::text) order by id for update;
 perform 1 from lotus_private.bookings where room_id in(select id from lotus_private.rooms where name in(select generate_series(1,19)::text)) order by id for update;
 assert (select count(*)=19 from lotus_private.rooms where name in(select generate_series(1,19)::text)),'Expected rooms 1 through 19';
 assert not exists(select 1 from lotus_private.bookings b join lotus_private.rooms r on r.id=b.room_id where not b.room_assigned and b.status in ('pendente','confirmada') and r.name in ('8','9','10','11','16','17','19') and b.room_floor is distinct from case when r.name::integer between 8 and 15 then 'superior' else 'terreo' end),'Reassign pending category stock before correcting physical floors';
 select jsonb_agg(to_jsonb(r)-'floor' order by r.id) into room_snapshot from lotus_private.rooms r;
 select jsonb_agg(to_jsonb(b)-'room_floor' order by b.id) into booking_snapshot from lotus_private.bookings b;
 update lotus_private.rooms set floor=case when name::integer between 8 and 15 then 'superior' else 'terreo' end where name in(select generate_series(1,19)::text);
 -- Group organizers chose physical units. Correct their live roster labels too.
 update lotus_private.bookings b set room_floor=r.floor from lotus_private.rooms r
 where b.room_id=r.id and r.name in(select generate_series(1,19)::text)
 and b.excursion_id is not null and b.room_assigned and b.status in ('pendente','confirmada') and b.room_floor is distinct from r.floor;
 assert (select jsonb_agg(to_jsonb(r)-'floor' order by r.id) from lotus_private.rooms r)=room_snapshot,'Preserve all other room settings';
 assert (select jsonb_agg(to_jsonb(b)-'room_floor' order by b.id) from lotus_private.bookings b) is not distinct from booking_snapshot,'Preserve bookings and quoted totals';
 assert (select floor='terreo' and active=0 from lotus_private.rooms where name='19'),'Room 19 must remain disabled';
 assert (select count(*)=10 from lotus_private.rooms where active=1 and floor='terreo' and name in(select generate_series(1,19)::text));
 assert (select count(*)=8 from lotus_private.rooms where active=1 and floor='superior' and name in(select generate_series(1,19)::text));
end $correction$;
