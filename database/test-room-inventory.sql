-- Run inside a transaction and roll back; never commit these synthetic reservations.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();room_a bigint;room_b bigint;period jsonb;payload jsonb;booking jsonb;before_count integer;after_count integer;rec record;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.admin_users values(uid);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 select id into room_a from lotus_private.rooms where name='18';select id into room_b from lotus_private.rooms where name='19';
 period:=jsonb_build_object('start',(now() at time zone 'America/Bahia')::date+400,'end',(now() at time zone 'America/Bahia')::date+402,'guests',2,'floor','superior');
 before_count:=jsonb_array_length(public.lotus_room_catalog_api('availability',period)->'rooms');assert before_count=10;
 payload:=period||jsonb_build_object('room_id',room_a,'guest','Synthetic inventory contract','phone','55000000000');
 booking:=public.lotus_api('book',payload);
 assert booking->>'floor'='superior';
 after_count:=jsonb_array_length(public.lotus_room_catalog_api('availability',period)->'rooms');assert after_count=before_count-1,'Only one physical unit must be blocked';
 assert exists(select 1 from jsonb_array_elements(public.lotus_room_catalog_api('availability',period)->'rooms') x where (x->>'id')::bigint=room_b),'The second unit stays available';
 assert jsonb_array_length(public.lotus_room_catalog_api('availability',period||'{"floor":"terreo"}'::jsonb)->'rooms')=9,'Ground floor inventory is independent';
 begin perform public.lotus_api('book',payload);raise exception 'Expected same-unit conflict';exception when sqlstate 'PT409' then null;end;
 perform public.lotus_api('book',payload||jsonb_build_object('room_id',room_b));
 begin perform public.lotus_api('book',payload||jsonb_build_object('floor','terreo'));raise exception 'Expected floor mismatch';exception when sqlstate 'PT409' then null;end;
 select * into rec from lotus_private.rooms where id=room_b;
 payload:=jsonb_build_object('id',room_b,'name',rec.name,'type','quadruplo','capacity',4,'price',rec.price,'active',1,'floor','superior','family_enabled',false);
 perform public.lotus_room_catalog_api('save_room',payload);
 assert (select type='quadruplo' and capacity=4 from lotus_private.rooms where id=room_b);
 perform public.lotus_room_catalog_api('save_room',payload||'{"type":"familia","capacity":5,"family_enabled":true}'::jsonb);
 select * into rec from lotus_private.rooms where id=room_a;
 payload:=jsonb_build_object('id',room_a,'name',rec.name,'type','casal','capacity',2,'price',rec.price,'active',1,'floor','superior','family_enabled',true);
 perform public.lotus_room_catalog_api('save_room',payload);
 select * into rec from lotus_private.rooms where name='17';
 begin perform public.lotus_room_catalog_api('save_room',payload||jsonb_build_object('id',rec.id,'name',rec.name));raise exception 'Expected two-family-unit limit';exception when sqlstate 'PT400' then null;end;
 perform public.lotus_room_catalog_api('save_room',payload||'{"floor":"terreo"}'::jsonb);
 assert (select room_floor='superior' from lotus_private.bookings where id=(booking->>'id')::bigint),'Booking retains its original floor';
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_api('book',period||jsonb_build_object('room_id',room_a));raise exception 'Expected Google/admin auth gate';exception when sqlstate 'PT401' then null;end;
 begin perform public.lotus_room_catalog_api('availability',period||'{"floor":"cobertura"}'::jsonb);raise exception 'Expected invalid floor rejection';exception when sqlstate 'PT400' then null;end;
end $test$;
