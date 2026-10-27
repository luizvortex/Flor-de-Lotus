-- Owner explicitly reactivated room 19 after the physical floor correction.
do $$
begin
 assert (select count(*)=1 from lotus_private.rooms where name='19' and floor='terreo' and capacity=2),'Expected ground-floor room 19, capacity two';
 update lotus_private.rooms set active=1 where name='19';
end $$;
