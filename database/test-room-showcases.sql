-- Runs on the real schema; every edit and synthetic Auth fixture rolls back.
begin;
set local role anon;
select jsonb_array_length(public.lotus_showcase_api('read')->'showcases')=3 as three_public_showcases;
do $$begin
 assert not has_table_privilege(current_user,'lotus_private.room_showcases','UPDATE');
 begin perform public.lotus_showcase_api('save','{}'); raise exception 'Expected authentication failure'; exception when sqlstate 'PT401' then null; end;
end $$;
reset role;
do $$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();row_data jsonb;saved jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid::text||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 assert not lotus_private.can_edit_showcases(), 'Auth user alone is not an administrator';
 begin perform public.lotus_showcase_api('save','{}'); raise exception 'Expected admin restriction'; exception when sqlstate 'PT401' then null; end;
 insert into lotus_private.admin_users values(uid);
 assert lotus_private.can_edit_showcases(), 'Authorized administrator can upload';
 row_data:=public.lotus_showcase_api('read')->'showcases'->0;
 saved:=public.lotus_showcase_api('save',row_data||jsonb_build_object('title','__contract_showcase__'))->'showcase';
 assert saved->>'title'='__contract_showcase__';
 assert (saved->>'revision')::bigint=(row_data->>'revision')::bigint+1;
 assert saved->'description'=row_data->'description', 'Existing description preserved';
 assert saved->'details'=row_data->'details', 'Room facts preserved';
 begin perform public.lotus_showcase_api('save',row_data); raise exception 'Expected optimistic lock'; exception when sqlstate 'PT409' then null; end;
 begin perform public.lotus_showcase_api('save',saved||jsonb_build_object('photos',jsonb_build_array(jsonb_build_object('url','javascript:alert(1)','alt','Test'),saved->'photos'->1,saved->'photos'->2))); raise exception 'Expected URL rejection'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_showcase_api('save',saved||'{"features":[{"icon":"arbitrary-class","label":"bad"}]}'); raise exception 'Expected icon validation'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_showcase_api('save',saved||'{"photos":[]}'); raise exception 'Expected three photos minimum'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_showcase_api('save',saved||'{"details":{"bathroom":[true]}}'); raise exception 'Expected fact item validation'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_showcase_api('save',saved||'{"details":[]}'); raise exception 'Expected details object validation'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_showcase_api('save',saved||jsonb_build_object('details',jsonb_build_object('beds',repeat('x',121)))); raise exception 'Expected bed text limit'; exception when sqlstate 'PT400' then null; end;
 saved:=public.lotus_showcase_api('save',saved||'{"details":{"beds":"__contract_bed__","bathroom":["Chuveiro"],"views":[],"amenities":["TV"],"description":"__contract_description__","smoking":"Não fumar"}}')->'showcase';
 assert saved->'details'->>'beds'='__contract_bed__';
 assert saved->'photos'=row_data->'photos', 'Editing details never replaces photographs';
 saved:=public.lotus_showcase_api('save',saved-'details')->'showcase';
 assert saved->'details'->>'beds'='__contract_bed__', 'Older editors preserve the new details';
 perform set_config('request.jwt.claims','{}',true);
 assert not lotus_private.can_edit_showcases(), 'Missing session cannot upload';
end $$;
rollback;
