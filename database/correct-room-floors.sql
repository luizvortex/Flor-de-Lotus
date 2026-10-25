-- User correction: 11 ground-floor rooms, 8 upper-floor rooms.
-- Only move provisional units 10 and 11; keep all other room fields and bookings.
begin;
do $floors$
begin
 perform 1 from lotus_private.rooms where name in ('10','11') for update;
 assert (select count(*) from lotus_private.rooms where name in ('10','11'))=2,'Review unit numbering first';
 assert not exists(select 1 from lotus_private.bookings b join lotus_private.rooms r on r.id=b.room_id where r.name in ('10','11') and b.status in ('pendente','confirmada') and b."end">(now() at time zone 'America/Bahia')::date),'Review existing reservations before changing these units';
 update lotus_private.rooms set floor='terreo' where name in ('10','11');
 assert (select count(*) from lotus_private.rooms)=19;
 assert (select count(*) from lotus_private.rooms where floor='terreo')=11;
 assert (select count(*) from lotus_private.rooms where floor='superior')=8;
end $floors$;
commit;
