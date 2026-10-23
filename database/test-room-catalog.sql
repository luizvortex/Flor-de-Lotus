begin;
set local role anon;
select jsonb_typeof(public.lotus_room_catalog_api('catalog')->'showcases')='array' as public_editorial_content;
do $$begin
 assert not has_table_privilege(current_user,'lotus_private.room_content_links','SELECT');
 begin perform public.lotus_room_catalog_api('admin'); raise exception 'Expected admin gate'; exception when sqlstate 'PT401' then null; end;
 begin perform public.lotus_room_catalog_api('save_room','{}'); raise exception 'Expected write gate'; exception when sqlstate 'PT401' then null; end;
 begin perform public.lotus_room_catalog_api('book','{}'); raise exception 'Expected operation gate'; exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
do $$
declare uid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); rid bigint; payload jsonb; result jsonb; starts date:=(now() at time zone 'America/Bahia')::date+30; found jsonb; booked jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid::text||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 begin perform public.lotus_room_catalog_api('save_room','{}'); raise exception 'Expected non-admin denial'; exception when sqlstate 'PT401' then null; end;
 insert into lotus_private.admin_users values(uid);
 payload:=jsonb_build_object('name','__catalog_contract_'||uid,'type','casal','capacity',2,'price',12345,'active',1,'showcase_slug','triplo');
 rid:=(public.lotus_room_catalog_api('save_room',payload)->>'id')::bigint;
 assert (select showcase_slug='triplo' from lotus_private.room_content_links where room_id=rid);
 begin
  perform public.lotus_room_catalog_api('save_room',payload||jsonb_build_object('id',rid,'price',99999,'showcase_slug','not-a-room'));
  raise exception 'Expected invalid presentation';
 exception when sqlstate 'PT400' then null; end;
 assert (select price=12345 from lotus_private.rooms where id=rid), 'Invalid mapping rolls back the price update';
 perform public.lotus_room_catalog_api('save_room',(payload-'showcase_slug')||jsonb_build_object('id',rid));
 assert (select showcase_slug='triplo' from lotus_private.room_content_links where room_id=rid), 'Older editor preserves mapping';
 perform set_config('request.jwt.claims','{}',true);
 payload:=jsonb_build_object('start',starts,'end',starts+2,'guests',2);
 result:=public.lotus_room_catalog_api('availability',payload);
 select value into found from jsonb_array_elements(result->'rooms') where (value->>'id')::bigint=rid;
 assert found->>'presentation_slug'='triplo'; assert (found->>'total')::integer=24690;
 booked:=public.lotus_api('book',payload||jsonb_build_object('room_id',rid,'guest','__catalog_contract_guest__','phone','55000000000'));
 assert booked->>'status'='pendente'; assert (booked->>'total')::integer=24690;
 result:=public.lotus_room_catalog_api('availability',payload);
 assert not exists(select 1 from jsonb_array_elements(result->'rooms') where (value->>'id')::bigint=rid), 'Pending reservation blocks the physical room';
 result:=public.lotus_room_catalog_api('catalog');
 assert not exists(select 1 from jsonb_array_elements(result->'rooms') value where value ? 'guest' or value ? 'phone'), 'Public catalog has no guest data';
end $$;
rollback;
