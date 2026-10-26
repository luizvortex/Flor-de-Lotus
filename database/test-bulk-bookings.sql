-- Run inside BEGIN/ROLLBACK; synthetic fixtures only, including a synthetic session.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();rid bigint;ids bigint[]:='{}';bid bigint;result jsonb;i integer;
begin
 begin perform public.lotus_bulk_booking_api('{"action":"delete","ids":[1]}');raise exception 'Unauthenticated batch accepted';exception when sqlstate 'PT401' then null;end;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 begin perform public.lotus_bulk_booking_api('{"action":"confirm","ids":[1]}');raise exception 'Non-admin accepted';exception when sqlstate 'PT401' then null;end;
 insert into lotus_private.admin_users values(uid);
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('BULK-QA-'||uid,'solteiro',2,10000,1,'terreo') returning id into rid;
 for i in 1..5 loop
  insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total,room_assigned,room_floor)
   values(rid,'Synthetic bulk QA','00000000000',date '2095-01-01'+i*2,date '2095-01-02'+i*2,1,case when i<=2 then 'cancelada' else 'pendente' end,10000,i<>5,'terreo') returning id into bid;
  ids:=array_append(ids,bid);
 end loop;
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',jsonb_build_array(ids[1],ids[3])));raise exception 'Active deletion accepted';exception when sqlstate 'PT409' then null;end;
 assert exists(select 1 from lotus_private.bookings where id=ids[1]),'No partial delete';
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','confirm','ids',jsonb_build_array(ids[3],ids[5])));raise exception 'Unassigned confirmation accepted';exception when sqlstate 'PT409' then null;end;
 assert (select status='pendente' from lotus_private.bookings where id=ids[3]),'No partial confirm';
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','confirm','ids',jsonb_build_array(ids[3],ids[1])));raise exception 'Cancelled confirmation accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',jsonb_build_array(ids[1],999999999)));raise exception 'Missing booking accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',jsonb_build_array(ids[1],ids[1])));raise exception 'Duplicate IDs accepted';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_bulk_booking_api('{"action":"delete","ids":[]}');raise exception 'Empty accepted';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_bulk_booking_api('{"action":"delete","ids":["1"]}');raise exception 'String ID accepted';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',(select jsonb_agg(x) from generate_series(1,101) x)));raise exception 'Oversized batch accepted';exception when sqlstate 'PT400' then null;end;
 result:=public.lotus_bulk_booking_api(jsonb_build_object('action','confirm','ids',jsonb_build_array(ids[3],ids[4])));
 assert (result->>'count')::integer=2;
 assert (select count(*)=2 from lotus_private.bookings where id=any(ids[3:4]) and status='confirmada' and total=10000),'Confirm preserves price';
 insert into lotus_private.booking_guest_links(booking_id,user_id) values(ids[1],uid);
 result:=public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',to_jsonb(ids[1:2])));
 assert (result->>'count')::integer=2;
 assert not exists(select 1 from lotus_private.bookings where id=any(ids[1:2]));
 assert not exists(select 1 from lotus_private.booking_guest_links where booking_id=ids[1]),'Guest link cascades';
 assert exists(select 1 from lotus_private.bookings where id=ids[5]),'Unselected booking preserved';
 delete from auth.sessions where id=sid;
 begin perform public.lotus_bulk_booking_api(jsonb_build_object('action','delete','ids',jsonb_build_array(ids[5])));raise exception 'Revoked session accepted';exception when sqlstate 'PT401' then null;end;
end $test$;
