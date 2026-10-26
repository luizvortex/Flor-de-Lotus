-- Party data is authoritative: total people and paying people are distinct.
alter table lotus_private.bookings add column if not exists party_adults integer;
alter table lotus_private.bookings add column if not exists children_ages jsonb;
alter table lotus_private.bookings add column if not exists total_guests integer;
alter table lotus_private.bookings add column if not exists paying_guests integer;
alter table lotus_private.bookings add column if not exists booking_group uuid;
alter table lotus_private.bookings add column if not exists group_room_index integer;
alter table lotus_private.bookings add column if not exists group_room_count integer;
create index if not exists lotus_booking_group_idx on lotus_private.bookings(booking_group) where booking_group is not null;
create or replace function lotus_private.normalize_party(party jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare room jsonb; age jsonb; adults integer; paying integer; occupied integer; result jsonb:='[]'; ages jsonb;
begin
 if jsonb_typeof(party) is distinct from 'array' then raise sqlstate 'PT400' using message='Informe os hóspedes de cada quarto.';end if;
 if jsonb_array_length(party) not between 1 and 18 then raise sqlstate 'PT400' using message='Escolha entre 1 e 18 quartos.';end if;
 for room in select value from jsonb_array_elements(party) loop
  if jsonb_typeof(room) is distinct from 'object' then raise sqlstate 'PT400' using message='Confira os hóspedes de cada quarto.';end if;
  adults:=lotus_private.int_value(room,'adults',1,6);ages:=room->'children_ages';paying:=adults;
  if jsonb_typeof(ages) is distinct from 'array' then raise sqlstate 'PT400' using message='Informe a idade de cada criança na entrada.';end if;
  if jsonb_array_length(ages)>6 then raise sqlstate 'PT400' using message='Informe até seis crianças por quarto.';end if;
  for age in select value from jsonb_array_elements(ages) loop
   if jsonb_typeof(age) is distinct from 'number' then raise sqlstate 'PT400' using message='Informe a idade de cada criança na entrada.';end if;
   if age::numeric not between 0 and 17 or age::numeric<>trunc(age::numeric) then raise sqlstate 'PT400' using message='A idade das crianças deve ser de 0 a 17 anos.';end if;
   if age::numeric>6 then paying:=paying+1;end if;
  end loop;
  -- Confirmed policy: every child counts toward room capacity, including free ages 0–6.
  occupied:=adults+jsonb_array_length(ages);
  result:=result||jsonb_build_array(jsonb_build_object('adults',adults,'children_ages',ages,'total',adults+jsonb_array_length(ages),'paying',paying,'capacity',occupied));
 end loop;
 return result;
end $$;
revoke all on function lotus_private.normalize_party(jsonb) from public,anon,authenticated;
create or replace function lotus_private.party_plan(d jsonb,category text) returns jsonb
language plpgsql volatile set search_path='' as $$
declare party jsonb:=lotus_private.normalize_party(d->'party'); entry record; picked lotus_private.rooms; ids bigint[]:='{}'; plan jsonb:='[]'; quoted jsonb;
 dates daterange:=lotus_private.period(d);total bigint:=0;demo boolean:=false;missing boolean:=false;
begin
 if coalesce(d->>'floor','') not in ('terreo','superior') then raise sqlstate 'PT400' using message='Selecione térreo ou piso superior.';end if;
 -- Largest party first preserves the scarce six-person units for those who need them.
 for entry in select value as room,ordinality as position from jsonb_array_elements(party) with ordinality order by (value->>'capacity')::integer desc,ordinality loop
  select r.* into picked from lotus_private.rooms r where r.active=1 and r.floor=d->>'floor'
   and r.capacity>=(entry.room->>'capacity')::integer and lotus_private.category_matches(r,category) and not r.id=any(ids)
   and not exists(select 1 from lotus_private.bookings b where b.room_id=r.id and b.status<>'cancelada' and daterange(b.start,b."end",'[)')&&dates)
   order by r.capacity,r.id limit 1;
  if not found then return jsonb_build_object('available',false);end if;
  ids:=array_append(ids,picked.id);
  quoted:=lotus_private.occupancy_quote(picked.floor,(entry.room->>'paying')::integer,dates);
  if quoted->>'total' is null then missing:=true;else total:=total+(quoted->>'total')::bigint;end if;
  demo:=demo or (quoted->>'example')::boolean;
  plan:=plan||jsonb_build_array(entry.room||jsonb_build_object('room_id',picked.id,'position',entry.position,'quoted_total',quoted->'total'));
 end loop;
 return jsonb_build_object('available',true,'rooms',plan,'total',case when missing then null else total end,'example',demo,'nights',upper(dates)-lower(dates));
end $$;
revoke all on function lotus_private.party_plan(jsonb,text) from public,anon,authenticated;
create or replace function lotus_private.party_rate_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare category record; plan jsonb; offers jsonb:='[]'; party jsonb;
begin
 if op<>'availability' or not (d ? 'party') then return lotus_private.rate_dispatch(op,d);end if;
 party:=lotus_private.normalize_party(d->'party');
 for category in select slug from lotus_private.room_showcases loop
  plan:=lotus_private.party_plan(d,category.slug);
  if (plan->>'available')::boolean then
   offers:=offers||jsonb_build_array(jsonb_build_object('category_slug',category.slug,'presentation_slug',category.slug,'floor',d->>'floor','total',plan->'total','quote_example',plan->'example','room_count',jsonb_array_length(party)));
  end if;
 end loop;
 return jsonb_build_object('rooms',offers,'nights',upper(lotus_private.period(d))-lower(lotus_private.period(d)),'room_count',jsonb_array_length(party));
end $$;
revoke all on function lotus_private.party_rate_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.party_rate_dispatch(text,jsonb) to anon,authenticated;
create or replace function public.lotus_rate_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.party_rate_dispatch(p_operation,p_data);$$;
create or replace function lotus_private.party_guest_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare plan jsonb; room jsonb; result jsonb; item jsonb; metadata jsonb; items jsonb:='[]'; bid bigint; ids jsonb:='[]'; group_id uuid; expected bigint; category text;
begin
 if op='book' and d ? 'party' then
  if not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com Google para reservar.';end if;
  category:=lotus_private.text_value(d,'category_slug');
  if not exists(select 1 from lotus_private.room_showcases where slug=category) then raise sqlstate 'PT400' using message='Categoria inválida.';end if;
  perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
  -- Lock candidate units against rate/capacity edits and administrative reservations.
  perform 1 from lotus_private.rooms r where r.active=1 and r.floor=d->>'floor' and lotus_private.category_matches(r,category) order by r.id for update;
  plan:=lotus_private.party_plan(d,category);
  if not (plan->>'available')::boolean then raise sqlstate 'PT409' using message='Não há quartos suficientes para esta composição. Atualize a consulta.';end if;
  if plan->>'total' is null or (plan->>'example')::boolean then raise sqlstate 'PT400' using message='Consulte a pousada para confirmar os preços desta composição e período.';end if;
  expected:=lotus_private.int_value(d,'expected_total');
  if expected<>(plan->>'total')::bigint then raise sqlstate 'PT409' using message='O valor mudou. Atualize a consulta.';end if;
  group_id:=gen_random_uuid();
  for room in select value from jsonb_array_elements(plan->'rooms') loop
   result:=lotus_private.guest_booking_dispatch('book',(d-'party'-'room_id'-'package_id'-'status'-'expected_total')||jsonb_build_object('room_id',room->'room_id','guests',room->'capacity'));
   bid:=(result->>'id')::bigint;
   update lotus_private.bookings set room_assigned=false,requested_category=category,total=(room->>'quoted_total')::bigint,
    party_adults=(room->>'adults')::integer,children_ages=room->'children_ages',total_guests=(room->>'total')::integer,paying_guests=(room->>'paying')::integer,
    booking_group=group_id,group_room_index=(room->>'position')::integer,group_room_count=jsonb_array_length(plan->'rooms') where id=bid;
   ids:=ids||jsonb_build_array(bid);
  end loop;
  return jsonb_build_object('id',ids->0,'booking_ids',ids,'group_id',group_id,'room_count',jsonb_array_length(ids),'total',expected,'status','pendente','floor',d->>'floor','room_assigned',false);
 end if;
 result:=lotus_private.category_guest_dispatch(op,d);
 if op='read' then
  for item in select value from jsonb_array_elements(result->'bookings') loop
   select jsonb_build_object('adults',b.party_adults,'children_ages',b.children_ages,'guests',b.total_guests,'paying_guests',b.paying_guests,'booking_group',b.booking_group,'group_room_index',b.group_room_index,'group_room_count',b.group_room_count)
    into metadata from lotus_private.bookings b where b.id=(item->>'id')::bigint and b.party_adults is not null;
   items:=items||jsonb_build_array(item||coalesce(metadata,'{}'));
  end loop;
  result:=jsonb_set(result,'{bookings}',items);
 end if;
 return result;
exception when exclusion_violation then raise sqlstate 'PT409' using message='Um dos quartos acabou de ficar indisponível. Atualize a consulta.';
end $$;
revoke all on function lotus_private.party_guest_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.party_guest_dispatch(text,jsonb) to authenticated;
create or replace function public.lotus_guest_booking_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.party_guest_dispatch(p_operation,p_data);$$;
