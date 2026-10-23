begin;
set local role anon;
do $$declare data jsonb;begin
 data:=public.lotus_policy_api('read');
 assert data->'policies'->>'checkin'='A partir das 14h.';
 assert not has_table_privilege(current_user,'lotus_private.property_policies','SELECT');
 begin perform public.lotus_policy_api('save',data); raise exception 'Expected anonymous denial'; exception when sqlstate 'PT401' then null; end;
end $$;
reset role;
do $$
declare uid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); data jsonb; saved jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid::text||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
 data:=public.lotus_policy_api('read');
 begin perform public.lotus_policy_api('save',data); raise exception 'Expected guest denial'; exception when sqlstate 'PT401' then null; end;
 insert into lotus_private.admin_users values(uid);
 data:=jsonb_set(data,'{policies,checkin}','"__policy_test__"');
 saved:=public.lotus_policy_api('save',data);
 assert (saved->>'revision')::bigint=(data->>'revision')::bigint+1;
 assert public.lotus_policy_api('read')->'policies'->>'checkin'='__policy_test__';
 begin perform public.lotus_policy_api('save',data); raise exception 'Expected stale revision rejection'; exception when sqlstate 'PT409' then null; end;
 begin perform public.lotus_policy_api('save',jsonb_set(saved,'{policies,pets}','null')); raise exception 'Expected type rejection'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_policy_api('save',jsonb_set(saved,'{policies,pets}',to_jsonb(repeat('x',1001)))); raise exception 'Expected length rejection'; exception when sqlstate 'PT400' then null; end;
 begin perform public.lotus_policy_api('save',jsonb_set(saved,'{policies,unknown}','"test"')); raise exception 'Expected unknown key rejection'; exception when sqlstate 'PT400' then null; end;
 saved:=public.lotus_policy_api('save',jsonb_set(saved,'{policies,pets}','""'));
 assert saved->'policies'->>'pets'='';
 delete from auth.sessions where id=sid;
 begin perform public.lotus_policy_api('save',saved); raise exception 'Expected revoked session denial'; exception when sqlstate 'PT401' then null; end;
end $$;
rollback;
