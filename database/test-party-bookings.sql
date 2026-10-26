-- Run after party-bookings.sql within BEGIN / ROLLBACK, never commit fixtures.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();starts date:=(now() at time zone 'America/Bahia')::date+650;
 payload jsonb; result jsonb; rows_before integer; book_id bigint; group_key uuid; room_id bigint;quote jsonb;
begin
 assert (lotus_private.normalize_party('[{"adults":1,"children_ages":[0,5,6,17]}]'::jsonb)->0->>'paying')::integer=3,'Only ages above five pay';
 assert (lotus_private.normalize_party('[{"adults":4,"children_ages":[5]}]')->0->>'capacity')::integer=5,'Free children still occupy capacity';
 begin perform lotus_private.normalize_party('[{"adults":1,"children_ages":[null]}]');raise exception 'Missing age accepted';exception when sqlstate 'PT400' then null;end;
 begin perform lotus_private.normalize_party('[{"adults":1,"children_ages":[18]}]');raise exception 'Adult age accepted as child';exception when sqlstate 'PT400' then null;end;
 begin perform lotus_private.normalize_party('[{"adults":0,"children_ages":[5]}]');raise exception 'Room without adult accepted';exception when sqlstate 'PT400' then null;end;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values(uid::text,uid,jsonb_build_object('sub',uid),'google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.rooms(name,type,capacity,price,active,floor)
 values('__party_a_'||uid,'casal',2,100,1,'terreo'),('__party_b_'||uid,'casal',2,100,1,'terreo');
 insert into lotus_private.occupancy_rates(floor,guests,amount) values('terreo',1,100),('terreo',2,180)
 on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 payload:=jsonb_build_object('category_slug','duplo','floor','terreo','start',starts,'end',starts+1,'party','[{"adults":1,"children_ages":[5]},{"adults":1,"children_ages":[6]}]'::jsonb,'guests',99,'guest','Synthetic party contract','phone','55000000000','expected_total',280);
 result:=public.lotus_rate_api('availability',payload);assert jsonb_array_length(result->'rooms')>0;
 select x into quote from jsonb_array_elements(result->'rooms') x where x->>'category_slug'='duplo';
 assert (quote->>'total')::integer=280,'Rate must exclude a five-year-old and include a six-year-old per room';
 begin perform public.lotus_guest_booking_api('book',payload||'{"expected_total":1}');raise exception 'Client price accepted';exception when sqlstate 'PT409' then null;end;
 result:=public.lotus_guest_booking_api('book',payload);group_key:=(result->>'group_id')::uuid;
 assert jsonb_array_length(result->'booking_ids')=2 and (result->>'total')::integer=280;
 assert (select count(*)=2 and count(distinct b.room_id)=2 and sum(b.total)=280 and sum(b.total_guests)=4 and sum(b.paying_guests)=3 and bool_and(not room_assigned) from lotus_private.bookings b where booking_group=group_key),'Two distinct stock holds and correct totals';
 result:=public.lotus_guest_booking_api('read');assert jsonb_array_length(result->'bookings')=2;
 assert result->'bookings'->0->>'room_name'='A definir pela pousada';
 assert (select count(*)=2 from jsonb_array_elements(result->'bookings') x where x->>'group_room_count'='2' and x->>'adults'='1');
 select count(*) into rows_before from lotus_private.bookings where guest='Synthetic party atomic failure';
 begin
  perform public.lotus_guest_booking_api('book',payload||jsonb_build_object('guest','Synthetic party atomic failure','phone','invalid-phone'));
  raise exception 'Expected invalid phone rejection';
 exception when sqlstate 'PT400' then null;end;
 assert (select count(*)=rows_before from lotus_private.bookings where guest='Synthetic party atomic failure');
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_guest_booking_api('book',payload);raise exception 'Anonymous group booking accepted';exception when sqlstate 'PT401' then null;end;
end $test$;
