-- Integration contract. All fixtures and changes roll back, including Auth rows.
begin;
do $$
declare
 uid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); rid bigint; pid bigint;
 b jsonb; c jsonb; r jsonb; base jsonb; room_data jsonb;
 claims text; bad jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(uid,'authenticated','authenticated',uid::text||'@example.invalid','{}','{}',now(),now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
 insert into lotus_private.admin_users values(uid);
 claims:=jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text;
 perform set_config('request.jwt.claims',claims,true);
 assert (public.lotus_api('session')->>'authenticated')::boolean, 'Admin session required';
 room_data:='{"name":"__contract_room__","type":"casal","capacity":2,"price":30000,"active":1}';
 rid:=(public.lotus_api('save_room',room_data)->>'id')::bigint;
 pid:=(public.lotus_api('save_package','{"name":"__contract_package__","type":"casal","start":"2035-12-25","end":"2036-01-05","nights":4,"price":180000,"active":1}')->>'id')::bigint;
 base:=jsonb_build_object('room_id',rid,'guest','Teste contrato','phone','11999999999','start','2035-12-26','end','2035-12-30','guests',2);
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.lotus_api('admin'); raise exception 'Expected authentication failure'; exception when sqlstate 'PT401' then null; end;
 begin perform public.lotus_api('save_room',room_data); raise exception 'Expected authentication failure'; exception when sqlstate 'PT401' then null; end;
 assert not (public.lotus_api('session')->>'authenticated')::boolean;
 assert not public.lotus_api('catalog') ? 'bookings', 'Guest data must stay private';
 b:=public.lotus_api('book',base||'{"status":"confirmada","total":1}'::jsonb);
 assert b->>'status'='pendente' and (b->>'total')::bigint=120000, 'Server calculates total and forces pending';
 r:=public.lotus_api('availability',base);
 assert not exists(select 1 from jsonb_array_elements(r->'rooms') x where (x->>'id')::bigint=rid), 'Pending blocks dates';
 begin perform public.lotus_api('book',base); raise exception 'Expected conflict'; exception when sqlstate 'PT409' then null; end;
 c:=public.lotus_api('book',base||'{"start":"2035-12-30","end":"2035-12-31"}'::jsonb);
 assert (c->>'id')::bigint>0, 'Checkout is exclusive';
 for bad in select value from jsonb_array_elements('[{"guests":3},{"guests":1.2},{"start":"2020-01-01","end":"2020-01-02"},{"end":"2035-12-26"},{"start":"2035-02-30"},{"phone":"bad"}]') loop
   begin perform public.lotus_api('book',base||bad); raise exception 'Expected invalid booking'; exception when sqlstate 'PT400' then null; end;
 end loop;
 perform set_config('request.jwt.claims',claims,true);
 perform public.lotus_api('booking_status',jsonb_build_object('id',b->'id','status','cancelada'));
 r:=public.lotus_api('availability',base);
 assert exists(select 1 from jsonb_array_elements(r->'rooms') x where (x->>'id')::bigint=rid), 'Cancellation frees dates';
 perform set_config('request.jwt.claims','{}',true);
 c:=public.lotus_api('book',base||jsonb_build_object('package_id',pid));
 assert (c->>'total')::bigint=180000, 'Package total';
 perform set_config('request.jwt.claims',claims,true);
 begin perform public.lotus_api('booking_status',jsonb_build_object('id',b->'id','status','confirmada')); raise exception 'Expected reconfirmation conflict'; exception when sqlstate 'PT409' then null; end;
 begin perform public.lotus_api('save_room',room_data||jsonb_build_object('id',rid,'type','solteiro','capacity',1)); raise exception 'Expected capacity protection'; exception when sqlstate 'PT400' then null; end;
 perform public.lotus_api('save_package',jsonb_build_object('id',pid,'name','__contract_package__','type','casal','start','2035-12-25','end','2036-01-05','nights',4,'price',220000,'active',1));
 assert (select total=180000 from lotus_private.bookings where id=(c->>'id')::bigint), 'Price snapshot preserved';
 perform public.lotus_api('booking_status',jsonb_build_object('id',c->'id','status','cancelada'));
 b:=public.lotus_api('book',base||'{"status":"bloqueio"}'::jsonb);
 assert b->>'status'='bloqueio' and (b->>'total')::bigint=0;
 -- Authorization must not trust user-editable metadata or an unsigned admin flag.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',gen_random_uuid(),'user_metadata',jsonb_build_object('admin',true))::text,true);
 assert not (public.lotus_api('session')->>'authenticated')::boolean, 'Revoked/missing session must fail';
 begin perform public.lotus_api('admin','{"admin":true}'); raise exception 'Expected auth failure'; exception when sqlstate 'PT401' then null; end;
end $$;
-- Exercise the real database roles as well as the function's business logic.
set local role anon;
select public.lotus_api('session') = '{"authenticated":false}'::jsonb as anonymous_session_denied;
do $$
begin
 assert not has_table_privilege(current_user,'lotus_private.bookings','SELECT'), 'No guest data grants';
 assert not has_table_privilege(current_user,'lotus_private.rooms','UPDATE'), 'No room write grants';
 begin perform public.lotus_api('admin'); raise exception 'Expected unauthorized'; exception when sqlstate 'PT401' then null; end;
end $$;
reset role;
rollback;
