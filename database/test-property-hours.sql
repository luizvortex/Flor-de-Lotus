begin;

set local role anon;
do $$begin
 assert public.lotus_policy_api('read')->'policies'->>'checkin_time'='14:00';
 assert not has_function_privilege(current_user,'lotus_private.property_time(text)','EXECUTE');
 begin perform public.lotus_policy_api('save','{}');raise exception 'Expected denial';exception when sqlstate 'PT401' then null;end;
end $$;
reset role;
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();doc jsonb;old_doc jsonb;rid bigint;bid bigint;starts date:=(now() at time zone 'America/Bahia')::date+35;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values(uid::text,uid,jsonb_build_object('sub',uid,'email',uid||'@example.invalid'),'google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.admin_users values(uid);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 insert into lotus_private.rooms(name,type,capacity,price,active) values('__hours_contract_'||uid,'casal',2,20000,1) returning id into rid;
 insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total) values(rid,'Hours contract','55000000000',starts,starts+2,2,'confirmada',40000) returning id into bid;
 insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,uid);
 doc:=public.lotus_policy_api('read');old_doc:=doc;
 doc:=public.lotus_policy_api('save',jsonb_set(doc,'{policies,checkin_time}','"15:30"'));
 assert doc->'policies'->>'checkin'='A partir das 15h30.';
 assert lotus_private.property_time('checkin')=time '15:30';
 assert exists(select 1 from lotus_private.guest_notifications where booking_id=bid and (checkin_at at time zone 'America/Bahia')::time=time '15:30');
 assert not exists(select 1 from lotus_private.guest_reminder_deliveries d join lotus_private.guest_notifications n on n.id=d.notification_id where n.booking_id=bid and (n.checkin_at at time zone 'America/Bahia')::time=time '14:00' and d.status<>'cancelled');
 assert public.lotus_guest_booking_api('read')->>'checkin_time'='15:30';
 doc:=public.lotus_policy_api('save',jsonb_set(doc,'{policies,checkin}',to_jsonb(E'A partir das 15h30.\nApresente um documento.'::text)));
 assert doc->'policies'->>'checkin'=E'A partir das 15h30.\nApresente um documento.';
 doc:=public.lotus_policy_api('save',doc);
 assert doc->'policies'->>'checkin'=E'A partir das 15h30.\nApresente um documento.';
 begin perform public.lotus_policy_api('save',jsonb_set(doc,'{policies,checkout_time}','"25:00"'));raise exception 'Expected bad time';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_policy_api('save',old_doc);raise exception 'Expected stale revision';exception when sqlstate 'PT409' then null;end;
end $test$;
select 'property hours, reminder rescheduling, auth and revision tests passed' as result;

rollback;

