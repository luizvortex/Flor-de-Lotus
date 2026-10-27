-- Run migration + this contract inside BEGIN / ROLLBACK. Synthetic bookings only.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();payload jsonb;offers jsonb;result jsonb;bid bigint;rid bigint;starts date:=(now() at time zone 'America/Bahia')::date+900;row lotus_private.rooms;
begin
 assert (select array_agg(slug order by position)=array['duplo','triplo','triplo-standard','triplo-superior','familia','familia-superior'] from lotus_private.room_showcases),'Six categories in occupancy/floor order';
 for row in select * from lotus_private.rooms where name in ('1','8','15','19') loop
  assert lotus_private.category_matches(row,'triplo-superior')=(row.floor='superior' and row.capacity>=3);
  assert lotus_private.category_matches(row,'familia-superior')=(row.floor='superior' and row.capacity>=5);
  assert lotus_private.category_matches(row,'familia')=(row.floor='terreo' and row.capacity>=5);
 end loop;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values(uid::text,uid,jsonb_build_object('sub',uid),'google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.occupancy_rates(floor,guests,amount) values('superior',3,300),('superior',5,500),('terreo',5,500) on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 payload:=jsonb_build_object('category_slug','triplo-superior','floor','superior','start',starts,'end',starts+1,'party','[{"adults":3,"children_ages":[]}]'::jsonb,'guest','Synthetic six-category contract','phone','55000000000','expected_total',300);
 offers:=public.lotus_rate_api('availability',payload);
 assert exists(select 1 from jsonb_array_elements(offers->'rooms') x where x->>'category_slug'='triplo-superior');
 assert not exists(select 1 from jsonb_array_elements(offers->'rooms') x where x->>'category_slug' in ('duplo','triplo-standard','familia')),'Only upstairs categories for upstairs query';
 result:=public.lotus_guest_booking_api('book',payload);bid:=(result->>'id')::bigint;
 select room_id into rid from lotus_private.bookings where id=bid;
 assert (select requested_category='triplo-superior' and room_floor='superior' and not room_assigned and total=300 from lotus_private.bookings where id=bid);
 assert exists(select 1 from lotus_private.booking_guest_links where booking_id=bid);
 offers:=public.lotus_room_catalog_api('availability',payload||'{"guests":3}');
 assert not exists(select 1 from jsonb_array_elements(offers->'rooms') x where (x->>'id')::bigint=rid),'The same physical stock is blocked across categories';
 payload:=payload||jsonb_build_object('category_slug','familia-superior','party','[{"adults":5,"children_ages":[]}]'::jsonb,'expected_total',500,'start',starts+3,'end',starts+4);
 result:=public.lotus_guest_booking_api('book',payload);bid:=(result->>'id')::bigint;
 assert (select b.requested_category='familia-superior' and b.room_floor='superior' and r.floor='superior' and r.capacity>=5 from lotus_private.bookings b join lotus_private.rooms r on r.id=b.room_id where b.id=bid);
 begin perform public.lotus_guest_booking_api('book',payload||'{"category_slug":"familia"}');raise exception 'Ground family category accepted upstairs';exception when sqlstate 'PT409' then null;end;
 result:=public.lotus_guest_booking_api('book',payload||'{"category_slug":"familia","floor":"terreo"}');bid:=(result->>'id')::bigint;
 assert (select b.room_floor='terreo' and r.floor='terreo' and r.capacity>=5 from lotus_private.bookings b join lotus_private.rooms r on r.id=b.room_id where b.id=bid);
end $test$;
