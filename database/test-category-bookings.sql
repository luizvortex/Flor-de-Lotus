-- Apply category-bookings.sql first. Run this file in a rollback transaction.
do $test$
declare uid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); rid bigint; second_id bigint;
 starts date:=(now() at time zone 'America/Bahia')::date+600; payload jsonb; result jsonb; bid bigint; held bigint; total bigint; rate_id bigint; rate_revision integer;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values(uid::text,uid,jsonb_build_object('sub',uid,'email',uid||'@example.invalid'),'google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('__category_a_'||uid,'casal',6,123,1,'terreo') returning id into rid;
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('__category_b_'||uid,'casal',6,123,1,'terreo') returning id into second_id;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 insert into lotus_private.occupancy_rates(floor,guests,amount) values('terreo',6,123) on conflict (floor,guests) where start is null do update set amount=123,example=false;
 payload:=jsonb_build_object('category_slug','familia','floor','terreo','expected_total',246,'start',starts,'end',starts+2,'guests',6,'guest','Synthetic category booking','phone','55000000000','room_id',55);
 begin perform public.lotus_guest_booking_api('book',payload||'{"floor":""}');raise exception 'Expected floor required';exception when sqlstate 'PT400' then null;end;
 result:=public.lotus_guest_booking_api('book',payload);bid:=(result->>'id')::bigint;
 select room_id,b.total into held,total from lotus_private.bookings b where id=bid;
 assert held=rid and total=246,'Client room ID must be ignored; server holds compatible inventory';
 assert exists(select 1 from lotus_private.bookings where id=bid and not room_assigned and requested_category='familia' and status='pendente');
 result:=public.lotus_guest_booking_api('read');assert result->'bookings'->0->>'room_name'='A definir pela pousada';
 begin perform public.lotus_assignment_api(jsonb_build_object('booking_id',bid,'room_id',second_id));raise exception 'Expected owner-only assignment';exception when sqlstate 'PT401' then null;end;
 insert into lotus_private.admin_users values(uid);
 select id,revision into rate_id,rate_revision from lotus_private.occupancy_rates where floor='terreo' and guests=6 and start is null;
 perform public.lotus_rate_api('save',jsonb_build_object('id',rate_id,'revision',rate_revision,'floor','terreo','guests',6,'amount',123,'example',false));
 begin perform public.lotus_rate_api('save',jsonb_build_object('id',rate_id,'revision',rate_revision,'floor','terreo','guests',6,'amount',123,'example',false));raise exception 'Expected stale price edit rejection';exception when sqlstate 'PT409' then null;end;
 -- Owner edits one base price with revision checks and a seasonal override.
 result:=public.lotus_rate_api('save',jsonb_build_object('floor','superior','guests',6,'amount',777,'start',starts,'end',starts+1,'example',false));
 assert (lotus_private.occupancy_quote('superior',6,daterange(starts,starts+1,'[)'))->>'total')::bigint=777;
 begin perform public.lotus_rate_api('save',jsonb_build_object('floor','superior','guests',6,'amount',888,'start',starts,'end',starts+1,'example',false));raise exception 'Expected season overlap rejection';exception when sqlstate 'PT409' then null;end;
 begin perform public.lotus_api('booking_status',jsonb_build_object('id',bid,'status','confirmada'));raise exception 'Expected assignment before confirmation';exception when sqlstate 'PT400' then null;end;
 perform public.lotus_assignment_api(jsonb_build_object('booking_id',bid,'room_id',second_id));
 assert exists(select 1 from lotus_private.bookings where id=bid and room_assigned and room_id=second_id and lotus_private.bookings.total=246);
 perform public.lotus_api('booking_status',jsonb_build_object('id',bid,'status','confirmada'));
 -- A second request uses the other physical unit; a third must not overbook.
 delete from lotus_private.admin_users where user_id=uid;
 result:=public.lotus_guest_booking_api('book',payload);
 begin perform public.lotus_guest_booking_api('book',payload);raise exception 'Expected stock exhaustion at the quoted rate';exception when sqlstate 'PT409' then null;end;
 insert into lotus_private.admin_users values(uid);
 begin perform public.lotus_assignment_api(jsonb_build_object('booking_id',bid,'room_id',rid));raise exception 'Expected occupied-unit rejection';exception when sqlstate 'PT409' then null;end;
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_guest_booking_api('book',payload);raise exception 'Expected Google session requirement';exception when sqlstate 'PT401' then null;end;
end $test$;
