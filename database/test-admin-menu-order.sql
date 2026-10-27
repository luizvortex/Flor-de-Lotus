-- Synthetic admin and settings changes must be rolled back.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();current jsonb;result jsonb;items jsonb:='["calendar","bookings","overview","setup","site","experiences","reviews","rooms","showcases","policies","excursions","reports","rates","packages"]';oldrev integer;
begin
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_admin_ui_api('read');raise exception 'Anonymous menu access accepted';exception when sqlstate 'PT401' then null;end;
 insert into auth.users(id,aud,role,email,created_at,updated_at) values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 begin perform public.lotus_admin_ui_api('read');raise exception 'Nonadmin access accepted';exception when sqlstate 'PT401' then null;end;
 insert into lotus_private.admin_users(user_id) values(uid);
 current:=public.lotus_admin_ui_api('read');oldrev:=(current->>'revision')::integer;
 result:=public.lotus_admin_ui_api('save',jsonb_build_object('order',items,'revision',oldrev));assert result->'order'=items and (result->>'revision')::integer=oldrev+1;
 begin perform public.lotus_admin_ui_api('save',jsonb_build_object('order',items,'revision',oldrev));raise exception 'Stale overwrite accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.lotus_admin_ui_api('save',jsonb_build_object('order',jsonb_set(items,'{0}','"bookings"'),'revision',oldrev+1));raise exception 'Duplicate accepted';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_admin_ui_api('save',jsonb_build_object('order',jsonb_set(items,'{0}','"<script>"'),'revision',oldrev+1));raise exception 'Unknown item accepted';exception when sqlstate 'PT400' then null;end;
 begin perform public.lotus_admin_ui_api('save',jsonb_build_object('order','[]'::jsonb,'revision',oldrev+1));raise exception 'Missing menu accepted';exception when sqlstate 'PT400' then null;end;
 delete from auth.sessions where id=sid;
 begin perform public.lotus_admin_ui_api('read');raise exception 'Revoked admin read accepted';exception when sqlstate 'PT401' then null;end;
end $test$;
