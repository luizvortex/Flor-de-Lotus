begin;
set local role anon;
do $$declare data jsonb;begin
 data:=public.lotus_site_api('read');
 assert (data->>'revision')::bigint>=1;
 assert not has_table_privilege(current_user,'lotus_private.site_content','SELECT');
 begin perform public.lotus_site_api('save',data);raise exception 'Expected anonymous denial';exception when sqlstate 'PT401' then null;end;
 begin perform public.lotus_site_api('history');raise exception 'Expected history denial';exception when sqlstate 'PT401' then null;end;
end $$;
reset role;
do $$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();data jsonb;saved jsonb;initial jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid::text||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at)values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 data:=public.lotus_site_api('read');initial:=data;
 begin perform public.lotus_site_api('save',data);raise exception 'Expected non-admin denial';exception when sqlstate 'PT401' then null;end;
 insert into lotus_private.admin_users values(uid);
 data:=jsonb_set(data,'{content}','{"branding":{},"hero":{},"about":{},"gallery":{},"rooms":{},"leisure":{},"beaches":{},"reviews":{},"contact":{},"catalog":{},"layout":{}}');
 saved:=public.lotus_site_api('save',data);
 assert(saved->>'revision')::bigint=(data->>'revision')::bigint+1;
 begin perform public.lotus_site_api('save',data);raise exception 'Expected stale revision denial';exception when sqlstate 'PT409' then null;end;
 assert jsonb_array_length(public.lotus_site_api('history')->'versions')>=1;
 saved:=public.lotus_site_api('restore',jsonb_build_object('revision',saved->'revision','target',initial->'revision'));
 assert saved->'content'=initial->'content';
 assert lotus_private.can_edit_showcases();
 delete from auth.sessions where id=sid;
 assert not lotus_private.can_edit_showcases();
 begin perform public.lotus_site_api('save',saved);raise exception 'Expected revoked session denial';exception when sqlstate 'PT401' then null;end;
end $$;
rollback;
