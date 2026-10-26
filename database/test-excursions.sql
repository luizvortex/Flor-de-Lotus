-- Synthetic fixtures only. Run with excursions.sql and reports.sql inside BEGIN / ROLLBACK.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();other_uid uuid:=gen_random_uuid();other_sid uuid:=gen_random_uuid();eid uuid:=gen_random_uuid();rid1 bigint;rid2 bigint;starts date:=(now() at time zone 'America/Bahia')::date+850;payload jsonb;result jsonb;bid bigint;receipt_id uuid:=gen_random_uuid();
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now()),(other_uid,'authenticated','authenticated',other_uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values(uid::text,uid,jsonb_build_object('sub',uid),'google'),(other_uid::text,other_uid,jsonb_build_object('sub',other_uid),'google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now()),(other_sid,other_uid,now(),now());
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('__excursion_ground_'||uid,'quadruplo',4,100,1,'terreo') returning id into rid1;
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('__excursion_upper_'||uid,'familia',6,100,1,'superior') returning id into rid2;
 insert into lotus_private.occupancy_rates(floor,guests,amount) values('terreo',1,100),('terreo',2,200),('terreo',3,300),('terreo',4,400),('superior',1,150),('superior',2,250)
 on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false;
 perform set_config('request.jwt.claims','{}',true);
 payload:=jsonb_build_object('request_id',eid,'name','Synthetic excursion','guest','Synthetic organizer','phone','55000000000','start',starts,'end',starts+2,'rooms',jsonb_build_array(jsonb_build_object('room_id',rid1,'people','[{"name":"Adult Ground","age":null},{"name":"Free child","age":5}]'::jsonb),jsonb_build_object('room_id',rid2,'people','[{"name":"Adult Upper","age":null},{"name":"Paying child","age":6}]'::jsonb)),'expected_total',700);
 result:=public.lotus_excursion_api('quote',payload);assert (result->>'total')::integer=700,'Free child uses a bed, not a paying slot';
 begin perform public.lotus_excursion_api('create',payload);raise exception 'Anonymous create accepted';exception when sqlstate 'PT401' then null;end;
 begin perform public.lotus_excursion_api('admin');raise exception 'Anonymous admin accepted';exception when sqlstate 'PT401' then null;end;
 begin perform public.lotus_excursion_api('quote',jsonb_set(payload,'{rooms,0,people}','[{"name":"A","age":null},{"name":"B","age":null},{"name":"C","age":null},{"name":"D","age":null},{"name":"Child","age":5}]'));raise exception 'Free child over capacity accepted';exception when sqlstate 'PT400' then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 begin perform public.lotus_excursion_api('create',payload||'{"expected_total":1}');raise exception 'Tampered quote accepted';exception when sqlstate 'PT409' then null;end;
 result:=public.lotus_excursion_api('create',payload);assert result->>'status'='pendente' and (result->>'room_count')::integer=2 and (result->>'guest_count')::integer=4;
 assert (select count(*)=2 and sum(total)=700 and sum(paying_guests)=3 and sum(guests)=4 and bool_and(room_assigned) from lotus_private.bookings where excursion_id=eid);
 assert (select count(*)=2 from lotus_private.booking_guest_links l join lotus_private.bookings b on b.id=l.booking_id where b.excursion_id=eid),'Google links atomic';
 result:=public.lotus_excursion_api('create',payload);assert (select count(*)=2 from lotus_private.bookings where excursion_id=eid),'Retry idempotent';
 begin perform public.lotus_excursion_api('create',payload||jsonb_build_object('request_id',gen_random_uuid()));raise exception 'Overlap accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.lotus_excursion_api('manifest',jsonb_build_object('id',eid));raise exception 'Pending manifest accepted';exception when sqlstate 'PT409' then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated','session_id',other_sid)::text,true);
 result:=public.lotus_excursion_api('mine');assert jsonb_array_length(result->'groups')=0;
 begin perform public.lotus_excursion_api('manifest',jsonb_build_object('id',eid));raise exception 'Other organizer saw names';exception when sqlstate 'PT404' then null;end;
 begin perform public.lotus_report_api('read');raise exception 'Guest read report';exception when sqlstate 'PT401' then null;end;
 insert into lotus_private.admin_users(user_id) values(other_uid);
 result:=public.lotus_excursion_api('confirm',jsonb_build_object('id',eid));assert result->>'status'='confirmada';
 result:=public.lotus_excursion_api('manifest',jsonb_build_object('id',eid));assert jsonb_array_length(result->'rooms')=2;
 result:=public.lotus_report_api('read',jsonb_build_object('start',starts,'end',starts+2));assert (result->'stats'->>'booking_total')::bigint>=700;
 select id into bid from lotus_private.bookings where excursion_id=eid order by id limit 1;
 payload:=jsonb_build_object('id',receipt_id,'booking_id',bid,'amount',12345,'received_on',(now() at time zone 'America/Bahia')::date,'method','pix');
 result:=public.lotus_report_api('receipt',payload);result:=public.lotus_report_api('receipt',payload);assert (select count(*)=1 from lotus_private.receipts where id=receipt_id);
 result:=public.lotus_report_api('read');assert (result->'stats'->>'received_total')::bigint>=12345;
 begin perform public.lotus_report_api('receipt',payload||'{"amount":-1}');raise exception 'Negative payment accepted';exception when sqlstate 'PT400' then null;end;
 result:=public.lotus_report_api('void',jsonb_build_object('id',receipt_id));assert (select voided_at is not null from lotus_private.receipts where id=receipt_id);
 result:=public.lotus_report_api('settings',jsonb_build_object('operation_start',starts));
 result:=public.lotus_report_api('read');assert (result->>'start')::date=starts and (result->>'end')::date=starts,'Future operation start does not break default report';
 result:=public.lotus_report_api('settings','{"operation_start":""}');
 result:=public.lotus_excursion_api('cancel',jsonb_build_object('id',eid));assert result->>'status'='cancelada';
 assert not exists(select 1 from lotus_private.bookings where excursion_id=eid and status<>'cancelada');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 delete from auth.sessions where id=sid;
 begin perform public.lotus_excursion_api('mine');raise exception 'Revoked session saw names';exception when sqlstate 'PT401' then null;end;
end $test$;
