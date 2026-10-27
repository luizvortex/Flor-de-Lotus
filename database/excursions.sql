-- Physical room allocation is explicit in the excursion flow only.
create table if not exists lotus_private.excursions(
 id uuid primary key,user_id uuid references auth.users(id) on delete set null,
 name text not null check(length(btrim(name)) between 1 and 120),request_hash text not null,
 created timestamptz not null default now()
);
create index if not exists lotus_excursion_owner_idx on lotus_private.excursions(user_id,created);
alter table lotus_private.bookings add column if not exists excursion_id uuid references lotus_private.excursions(id);
create index if not exists lotus_excursion_bookings_idx on lotus_private.bookings(excursion_id) where excursion_id is not null;
create table if not exists lotus_private.excursion_members(
 booking_id bigint primary key references lotus_private.bookings(id) on delete cascade,
 people jsonb not null check(jsonb_typeof(people)='array' and jsonb_array_length(people) between 1 and 6)
);
alter table lotus_private.excursions enable row level security;
alter table lotus_private.excursion_members enable row level security;
revoke all on lotus_private.excursions,lotus_private.excursion_members from public,anon,authenticated;
drop policy if exists lotus_excursion_deny_direct on lotus_private.excursions;
create policy lotus_excursion_deny_direct on lotus_private.excursions as restrictive for all to anon,authenticated using(false) with check(false);
drop policy if exists lotus_excursion_members_deny_direct on lotus_private.excursion_members;
create policy lotus_excursion_members_deny_direct on lotus_private.excursion_members as restrictive for all to anon,authenticated using(false) with check(false);

create or replace function lotus_private.excursion_plan(d jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare dates daterange:=lotus_private.period(d);row jsonb;person jsonb;people jsonb;ages jsonb;adults integer;party jsonb;
 r lotus_private.rooms;ids bigint[]:='{}';rid bigint;quoted jsonb;total bigint:=0;plan jsonb:='[]';age jsonb;
begin
 if jsonb_typeof(d->'rooms') is distinct from 'array' then raise sqlstate 'PT400' using message='Escolha os quartos do grupo.';end if;
 if jsonb_array_length(d->'rooms') not between 1 and 19 then raise sqlstate 'PT400' using message='Selecione entre 1 e 19 quartos.';end if;
 for row in select value from jsonb_array_elements(d->'rooms') loop
  rid:=lotus_private.int_value(row,'room_id');
  if rid=any(ids) then raise sqlstate 'PT400' using message='Um quarto foi informado mais de uma vez.';end if;
  ids:=array_append(ids,rid);
  select * into r from lotus_private.rooms where id=rid and active=1 and floor in ('terreo','superior');
  if not found then raise sqlstate 'PT409' using message='Um quarto não está disponível para grupos. Atualize a consulta.';end if;
  if jsonb_typeof(row->'people') is distinct from 'array' then raise sqlstate 'PT400' using message='Informe os nomes dos hóspedes em cada quarto.';end if;
  if jsonb_array_length(row->'people') not between 1 and least(r.capacity,6) then raise sqlstate 'PT400' using message='A quantidade de hóspedes excede a capacidade de um quarto.';end if;
  people:='[]';ages:='[]';adults:=0;
  for person in select value from jsonb_array_elements(row->'people') loop
   if jsonb_typeof(person) is distinct from 'object' or not(person?'age') then raise sqlstate 'PT400' using message='Confira os dados dos hóspedes.';end if;
   age:=person->'age';
   if jsonb_typeof(age)='null' then adults:=adults+1;
   elsif jsonb_typeof(age)='number' then
    if age::numeric not between 0 and 17 or trunc(age::numeric)<>age::numeric then raise sqlstate 'PT400' using message='A idade da criança deve ser de 0 a 17 anos.';end if;
    ages:=ages||jsonb_build_array(age);
   else raise sqlstate 'PT400' using message='Informe a idade das crianças.';end if;
   people:=people||jsonb_build_array(jsonb_build_object('name',lotus_private.text_value(person,'name',120),'age',age));
  end loop;
  party:=lotus_private.normalize_party(jsonb_build_array(jsonb_build_object('adults',adults,'children_ages',ages)))->0;
  if exists(select 1 from lotus_private.bookings b where b.room_id=rid and b.status<>'cancelada' and daterange(b.start,b."end",'[)')&&dates) then
   raise sqlstate 'PT409' using message='Um dos quartos está ocupado nestas datas. Atualize a disponibilidade.';end if;
  quoted:=lotus_private.occupancy_quote(r.floor,(party->>'paying')::integer,dates);
  if quoted->>'total' is null or coalesce((quoted->>'example')::boolean,false) then raise sqlstate 'PT400' using message='Consulte a pousada: falta uma tarifa válida para estas datas e hóspedes.';end if;
  total:=total+(quoted->>'total')::bigint;
  plan:=plan||jsonb_build_array(jsonb_build_object('room_id',rid,'room_name',r.name,'floor',r.floor,'people',people,'adults',adults,'children_ages',ages,'guests',party->'total','paying_guests',party->'paying','total',quoted->'total'));
 end loop;
 return jsonb_build_object('rooms',plan,'total',total,'nights',upper(dates)-lower(dates));
end $$;
revoke all on function lotus_private.excursion_plan(jsonb) from public,anon,authenticated;

create or replace function lotus_private.excursion_document(eid uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('id',e.id,'name',e.name,'created',e.created,
  'guest',(array_agg(b.guest order by b.id))[1],'phone',(array_agg(b.phone order by b.id))[1],
  'start',min(b.start),'end',max(b."end"),'total',coalesce(sum(b.total) filter(where b.status<>'cancelada'),0),
  'room_count',count(*) filter(where b.status<>'cancelada'),'guest_count',coalesce(sum(b.guests) filter(where b.status<>'cancelada'),0),
  'status',case when count(*) filter(where b.status<>'cancelada')=0 then 'cancelada'
   when bool_and(b.status='confirmada') filter(where b.status<>'cancelada') then 'confirmada'
   when bool_or(b.status='confirmada') filter(where b.status<>'cancelada') then 'parcial' else 'pendente' end,
  'rooms',jsonb_agg(jsonb_build_object('booking_id',b.id,'room_id',r.id,'room_name',r.name,'floor',b.room_floor,'status',b.status,'room_assigned',b.room_assigned,'total',b.total,'people',coalesce(m.people,'[]')) order by nullif(substring(r.name from '[0-9]+'),'')::numeric nulls last,r.name,b.id))
 from lotus_private.excursions e join lotus_private.bookings b on b.excursion_id=e.id join lotus_private.rooms r on r.id=b.room_id
 left join lotus_private.excursion_members m on m.booking_id=b.id where e.id=eid group by e.id;
$$;
revoke all on function lotus_private.excursion_document(uuid) from public,anon,authenticated;

create or replace function lotus_private.excursion_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare dates daterange;result jsonb;plan jsonb;row jsonb;eid uuid;record lotus_private.excursions;bid bigint;ids bigint[];position integer:=0;expected bigint;vguest text;vphone text;vname text;
begin
 if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message='Dados inválidos.';end if;
 if op='rooms' then
  dates:=lotus_private.period(d);
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'floor',r.floor,'capacity',least(r.capacity,6),'available',not exists(select 1 from lotus_private.bookings b where b.room_id=r.id and b.status<>'cancelada' and daterange(b.start,b."end",'[)')&&dates)) order by nullif(substring(r.name from '[0-9]+'),'')::numeric nulls last,r.name,r.id),'[]') into result
   from lotus_private.rooms r where r.active=1 and r.floor in ('terreo','superior');
  return jsonb_build_object('rooms',result);
 end if;
 if op='quote' then return lotus_private.excursion_plan(d);end if;
 if op='create' then
  if not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com Google para solicitar a excursão.';end if;
  eid:=(d->>'request_id')::uuid;if eid is null then raise sqlstate 'PT400' using message='Confira a solicitação do grupo.';end if;
  perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
  select * into record from lotus_private.excursions where id=eid;
  if found then
   if record.user_id is distinct from auth.uid() or record.request_hash<>md5(d::text) then raise sqlstate 'PT409' using message='Esta solicitação já foi utilizada. Atualize a página.';end if;
   return lotus_private.excursion_document(eid);
  end if;
  vname:=lotus_private.text_value(d,'name',120);vguest:=lotus_private.text_value(d,'guest',120);vphone:=lotus_private.text_value(d,'phone',40);
  if length(regexp_replace(vphone,'[^0-9]','','g'))<8 then raise sqlstate 'PT400' using message='Informe um telefone válido.';end if;
  if jsonb_typeof(d->'rooms') is distinct from 'array' then raise sqlstate 'PT400' using message='Escolha os quartos.';end if;
  if jsonb_array_length(d->'rooms') not between 1 and 19 then raise sqlstate 'PT400' using message='Selecione entre 1 e 19 quartos.';end if;
  select array_agg((value->>'room_id')::bigint order by (value->>'room_id')::bigint) into ids from jsonb_array_elements(d->'rooms');
  perform 1 from lotus_private.rooms where id=any(ids) order by id for update;
  plan:=lotus_private.excursion_plan(d);
  if coalesce(d->>'expected_total','') !~ '^[0-9]{1,15}$' then raise sqlstate 'PT400' using message='Confira o orçamento antes de enviar.';end if;
  expected:=(d->>'expected_total')::bigint;
  if expected<>(plan->>'total')::bigint then raise sqlstate 'PT409' using message='O valor mudou. Confira o orçamento novamente.';end if;
  insert into lotus_private.excursions(id,user_id,name,request_hash) values(eid,auth.uid(),vname,md5(d::text));
  for row in select value from jsonb_array_elements(plan->'rooms') loop
   position:=position+1;
   result:=lotus_private.guest_booking_dispatch('book',jsonb_build_object('room_id',row->'room_id','floor',row->'floor','guest',vguest,'phone',vphone,'start',d->'start','end',d->'end','guests',row->'guests'));
   bid:=(result->>'id')::bigint;
   update lotus_private.bookings set total=(row->>'total')::bigint,room_assigned=true,requested_category=null,
    party_adults=(row->>'adults')::integer,children_ages=row->'children_ages',total_guests=(row->>'guests')::integer,paying_guests=(row->>'paying_guests')::integer,
    excursion_id=eid,booking_group=eid,group_room_index=position,group_room_count=jsonb_array_length(plan->'rooms') where id=bid;
   insert into lotus_private.excursion_members(booking_id,people) values(bid,row->'people');
  end loop;
  return lotus_private.excursion_document(eid);
 end if;
 if op in ('admin','confirm','cancel') and not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para gerenciar excursões.';end if;
 if op in ('mine','manifest') and not lotus_private.is_admin() and not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com sua conta Google.';end if;
 if op in ('admin','mine') then
  select coalesce(jsonb_agg(lotus_private.excursion_document(e.id) order by e.created desc),'[]') into result from lotus_private.excursions e
   where (op='admin' or e.user_id=auth.uid()) and exists(select 1 from lotus_private.bookings b where b.excursion_id=e.id);
  return jsonb_build_object('groups',result);
 end if;
 if op in ('confirm','cancel','manifest') then
  eid:=(d->>'id')::uuid;
  select * into record from lotus_private.excursions where id=eid for update;
  if not found or (not lotus_private.is_admin() and record.user_id is distinct from auth.uid()) then raise sqlstate 'PT404' using message='Grupo não encontrado.';end if;
  perform 1 from lotus_private.bookings where excursion_id=eid order by id for update;
  if op in ('confirm','cancel') then
   if op='confirm' and not exists(select 1 from lotus_private.bookings where excursion_id=eid and status<>'cancelada') then raise sqlstate 'PT409' using message='Este grupo foi cancelado.';end if;
   if op='confirm' and exists(select 1 from lotus_private.bookings where excursion_id=eid and status<>'cancelada' and not room_assigned) then raise sqlstate 'PT409' using message='Defina todos os quartos antes de confirmar.';end if;
   for bid in select b.id from lotus_private.bookings b where b.excursion_id=eid and b.status<>'cancelada' and (op='cancel' or b.status='pendente') order by b.id loop
    perform lotus_private.dispatch('booking_status',jsonb_build_object('id',bid,'status',case when op='confirm' then 'confirmada' else 'cancelada' end));
   end loop;
  end if;
  result:=lotus_private.excursion_document(eid);
  if op='manifest' then
   if result->>'status' is distinct from 'confirmada' then raise sqlstate 'PT409' using message='A lista de check-in fica disponível após a confirmação do grupo.';end if;
   result:=jsonb_set(result,'{rooms}',(select jsonb_agg(x) from jsonb_array_elements(result->'rooms') x where x->>'status'='confirmada'));
  end if;
  return result;
 end if;
 raise sqlstate 'PT404' using message='Operação não encontrada.';
exception
 when invalid_text_representation or numeric_value_out_of_range then raise sqlstate 'PT400' using message='Confira os dados do grupo.';
 when exclusion_violation or deadlock_detected then raise sqlstate 'PT409' using message='A disponibilidade mudou. Atualize a consulta antes de enviar.';
end $$;
revoke all on function lotus_private.excursion_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.excursion_dispatch(text,jsonb) to anon,authenticated;
create or replace function public.lotus_excursion_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.excursion_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_excursion_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.lotus_excursion_api(text,jsonb) to anon,authenticated;
