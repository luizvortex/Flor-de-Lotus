-- Run after room-amenity-icons.sql in BEGIN/ROLLBACK. Synthetic admin only.
do $test$
declare uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();rec lotus_private.room_showcases;payload jsonb;result jsonb;
begin
 select * into rec from lotus_private.room_showcases where slug='duplo';
 assert exists(select 1 from jsonb_array_elements(rec.features) x where x->>'icon'='breakfast');
 begin perform public.lotus_showcase_api('save',jsonb_build_object('slug','duplo','amenities','[]'::jsonb));raise exception 'Anonymous amenity edit accepted';exception when sqlstate 'PT401' then null;end;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(uid,'authenticated','authenticated',uid||'@example.invalid',now(),'{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());insert into lotus_private.admin_users values(uid);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 payload:=jsonb_build_object('slug',rec.slug,'title',rec.title,'description',rec.description,'eyebrow',rec.eyebrow,'photos',rec.photos,'details',rec.details,'features','[]'::jsonb,'revision',rec.revision,'amenities','[{"icon":"elevator","label":"Andares acessíveis por elevador"},{"icon":"hair-dryer","label":"Secador de cabelo"},{"icon":"toilet","label":"Vaso sanitário"}]'::jsonb);
 result:=public.lotus_showcase_api('save',payload);
 assert jsonb_array_length(result->'showcase'->'features')=0,'All highlights can be removed';
 assert result->'showcase'->'amenities'=payload->'amenities';
 assert result->'showcase'->'photos'=rec.photos,'Photos must be preserved';
 begin perform public.lotus_showcase_api('save',payload);raise exception 'Stale edit accepted';exception when sqlstate 'PT409' then null;end;
 payload:=payload||jsonb_build_object('revision',result->'showcase'->'revision','amenities','[{"icon":"invalid<script>","label":"Invalid"}]'::jsonb);
 begin perform public.lotus_showcase_api('save',payload);raise exception 'Unknown icon accepted';exception when sqlstate 'PT400' then null;end;
 payload:=(payload-'amenities')||jsonb_build_object('revision',result->'showcase'->'revision');
 result:=public.lotus_showcase_api('save',payload);
 assert jsonb_array_length(result->'showcase'->'amenities')=3,'Older editors must preserve the chosen amenities';
 payload:=payload||jsonb_build_object('revision',result->'showcase'->'revision','amenities','[]'::jsonb);
 result:=public.lotus_showcase_api('save',payload);
 assert jsonb_array_length(result->'showcase'->'amenities')=0,'Empty amenities must stay empty instead of restoring old facts';
end $test$;
