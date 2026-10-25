-- Run inside a transaction and roll back, together with admin-booking-alerts.sql.
set local role anon;
do $$begin
 assert not has_table_privilege(current_user,'lotus_private.admin_booking_events','SELECT');
 assert not has_table_privilege(current_user,'lotus_private.admin_alert_settings','SELECT');
 begin perform public.lotus_admin_alert_api('read');raise exception 'Expected admin authorization';exception when sqlstate 'PT401' then null;end;
end $$;
reset role;
do $test$
declare u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();s1 uuid:=gen_random_uuid();s2 uuid:=gen_random_uuid();rid bigint;bid bigint;second_bid bigint;latest_bid bigint;result jsonb;starts date:=(now() at time zone 'America/Bahia')::date+500;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 (u1,'authenticated','authenticated',u1||'@example.invalid','{}','{}',now(),now()),(u2,'authenticated','authenticated',u2||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(s1,u1,now(),now()),(s2,u2,now(),now());
 insert into lotus_private.admin_users values(u1),(u2);
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('__admin_alert_'||u1,'casal',2,10000,1,'terreo') returning id into rid;
 insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total,room_floor) values(rid,'__guest_not_in_alert__','55000000000',starts,starts+1,2,'pendente',10000,'terreo') returning id into bid;
 assert (select count(*)=1 from lotus_private.admin_booking_events where booking_id=bid);
 assert (select status='awaiting_setup' and sent_at is null from lotus_private.admin_booking_deliveries where booking_id=bid);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u1,'role','authenticated','session_id',s1)::text,true);
 result:=public.lotus_admin_alert_api('read');assert (result->>'unread_count')::int=1;assert result::text not like '%__guest_not_in_alert__%';
 perform public.lotus_admin_alert_api('mark_read',jsonb_build_object('id',bid,'user_id',u2));
 result:=public.lotus_admin_alert_api('read');assert (result->>'unread_count')::int=0;
 assert (select status='pendente' from lotus_private.bookings where id=bid),'Read must not confirm the reservation';
 perform public.lotus_admin_alert_api('configure','{"whatsapp_recipient":"5573000000000"}');
 assert (public.lotus_admin_alert_api('read')->>'whatsapp_recipient')='5573000000000';
 begin perform public.lotus_admin_alert_api('configure','{"whatsapp_recipient":"bad"}');raise exception 'Expected phone validation';exception when sqlstate 'PT400' then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u2,'role','authenticated','session_id',s2)::text,true);
 assert (public.lotus_admin_alert_api('read')->>'unread_count')::int=1,'Unread state belongs to each administrator';
 update lotus_private.bookings set status='confirmada' where id=bid;
 assert (select count(*)=1 from lotus_private.admin_booking_events where booking_id=bid),'Status updates must not duplicate events';
 update lotus_private.bookings set status='cancelada' where id=bid;
 assert (public.lotus_admin_alert_api('read')->>'unread_count')::int=0;
 assert (select status='cancelled' from lotus_private.admin_booking_deliveries where booking_id=bid);
 insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total) values(rid,'Block','55000000000',starts+2,starts+3,1,'bloqueio',0) returning id into second_bid;
 assert not exists(select 1 from lotus_private.admin_booking_events where booking_id=second_bid);
 insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total) values(rid,'Synthetic request','55000000000',starts+4,starts+5,2,'pendente',10000) returning id into second_bid;
 insert into lotus_private.bookings(room_id,guest,phone,start,"end",guests,status,total) values(rid,'Synthetic request','55000000000',starts+6,starts+7,2,'pendente',10000) returning id into latest_bid;
 result:=public.lotus_admin_alert_api('read_all',jsonb_build_object('through',second_bid));assert (result->>'unread_count')::int=1,'Mark-all must preserve more recent unread requests';
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_admin_alert_api('read');raise exception 'Expected no anonymous access';exception when sqlstate 'PT401' then null;end;
end $test$;
