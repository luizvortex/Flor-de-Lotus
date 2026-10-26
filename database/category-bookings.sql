-- Guest selects a category and floor. A provisional stock hold is private;
-- only the owner makes the final assignment. Existing bookings remain assigned.
alter table lotus_private.bookings add column if not exists room_assigned boolean not null default true;
alter table lotus_private.bookings add column if not exists requested_category text;
create or replace function lotus_private.category_matches(r lotus_private.rooms, slug text) returns boolean
language sql immutable set search_path='' as $$
 select case slug when 'duplo' then r.floor='terreo'
 when 'triplo' then r.floor='superior'
 when 'triplo-standard' then r.floor='terreo' and r.capacity>=3
 when 'familia' then r.capacity>=5 else false end;
$$;
revoke all on function lotus_private.category_matches(lotus_private.rooms,text) from public,anon,authenticated;
create or replace function lotus_private.category_guest_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; item jsonb; items jsonb:='[]'; chosen lotus_private.rooms; dates daterange;
 g integer; pid bigint; quoted bigint; expected bigint; category text; bid bigint; candidate jsonb; guest_quote jsonb;
begin
 if op='book' and not (d ? 'category_slug') then raise sqlstate 'PT400' using message='Atualize a página e selecione a categoria e o andar para reservar.';end if;
 if op='book' and d ? 'category_slug' then
  if not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com Google para reservar.'; end if;
  if coalesce(d->>'floor','') not in ('terreo','superior') then raise sqlstate 'PT400' using message='Selecione térreo ou piso superior.';end if;
  dates:=lotus_private.period(d);g:=lotus_private.int_value(d,'guests',1,20);
  category:=lotus_private.text_value(d,'category_slug');
  if not exists(select 1 from lotus_private.room_showcases where slug=category) then raise sqlstate 'PT400' using message='Categoria inválida.';end if;
  expected:=lotus_private.int_value(d,'expected_total');
  perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
  guest_quote:=lotus_private.occupancy_quote(d->>'floor',g,dates);
  if guest_quote->>'total' is null or (guest_quote->>'example')::boolean then raise sqlstate 'PT400' using message='A pousada precisa cadastrar o valor deste período e quantidade de hóspedes. Consulte a equipe.';end if;
  if (guest_quote->>'total')::bigint<>expected then raise sqlstate 'PT409' using message='O valor mudou. Atualize a consulta.';end if;
  if d->>'package_id' is not null then pid:=lotus_private.int_value(d,'package_id');end if;
  -- Serialize category holds with each other; the physical exclusion constraint
  -- remains authoritative against legacy/admin bookings and assignment races.
  perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
  for chosen in select r.* from lotus_private.rooms r where r.active=1 and r.floor=d->>'floor' and r.capacity>=g
   and lotus_private.category_matches(r,category) order by r.capacity,r.id for update loop
   if exists(select 1 from lotus_private.bookings b where b.room_id=chosen.id and b.status<>'cancelada' and daterange(b.start,b."end",'[)')&&dates) then continue;end if;
   begin
    candidate:=(d-'room_id'-'category_slug'-'expected_total'-'package_id')||jsonb_build_object('room_id',chosen.id);
    result:=lotus_private.guest_booking_dispatch('book',candidate);
    bid:=(result->>'id')::bigint;
    update lotus_private.bookings set room_assigned=false,requested_category=category,total=expected where id=bid;
    return result||jsonb_build_object('room_assigned',false,'total',expected);
   exception when sqlstate 'PT409' then continue;end;
  end loop;
  raise sqlstate 'PT409' using message='A disponibilidade ou o valor mudou. Atualize a consulta.';
 end if;
 result:=lotus_private.guest_booking_dispatch(op,d);
 if op='read' then
  for item in select value from jsonb_array_elements(result->'bookings') loop
   -- Fetch only metadata belonging to the already authenticated result.
   select jsonb_build_object('room_assigned',b.room_assigned,'category',b.requested_category) into candidate from lotus_private.bookings b where b.id=(item->>'id')::bigint;
   if candidate->>'category' is not null then
    item:=item||jsonb_build_object('presentation',(select title from lotus_private.room_showcases where slug=candidate->>'category'));
   end if;
   if candidate->>'room_assigned'='false' then item:=item||jsonb_build_object('room_name','A definir pela pousada');end if;
   items:=items||jsonb_build_array(item||jsonb_build_object('room_assigned',candidate->'room_assigned'));
  end loop;
  result:=jsonb_set(result,'{bookings}',items);
 end if;
 return result;
end $$;
revoke all on function lotus_private.category_guest_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.category_guest_dispatch(text,jsonb) to authenticated;
create or replace function public.lotus_guest_booking_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.category_guest_dispatch(p_operation,p_data);$$;

create or replace function lotus_private.assign_booking(d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b lotus_private.bookings; r lotus_private.rooms; rid bigint; bid bigint;
begin
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para definir o quarto.';end if;
 bid:=lotus_private.int_value(d,'booking_id');rid:=lotus_private.int_value(d,'room_id');
 perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
 select * into r from lotus_private.rooms where id=rid and active=1 for update;
 if not found then raise sqlstate 'PT400' using message='Selecione um quarto ativo.';end if;
 select * into b from lotus_private.bookings where id=bid for update;
 if not found or b.status not in ('pendente','confirmada') then raise sqlstate 'PT400' using message='Reserva indisponível para atribuição.';end if;
 if r.floor<>b.room_floor or r.capacity<b.guests or (b.requested_category is not null and not lotus_private.category_matches(r,b.requested_category)) then
  raise sqlstate 'PT400' using message='Escolha um quarto compatível com o andar, categoria e hóspedes da reserva.';end if;
 if exists(select 1 from lotus_private.bookings x where x.id<>bid and x.room_id=rid and x.status<>'cancelada' and daterange(x.start,x."end",'[)')&&daterange(b.start,b."end",'[)')) then
  raise sqlstate 'PT409' using message='Esse quarto não está disponível no período.';end if;
 update lotus_private.bookings set room_id=rid,room_assigned=true where id=bid;
 return jsonb_build_object('ok',true);
exception when exclusion_violation then raise sqlstate 'PT409' using message='Esse quarto acabou de ficar indisponível.';
end $$;
revoke all on function lotus_private.assign_booking(jsonb) from public,anon,authenticated;
grant execute on function lotus_private.assign_booking(jsonb) to authenticated;
create or replace function public.lotus_assignment_api(p_data jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.assign_booking(p_data);$$;
revoke all on function public.lotus_assignment_api(jsonb) from public,anon;
grant execute on function public.lotus_assignment_api(jsonb) to authenticated;
-- Require the owner's final assignment before confirmation, without changing
-- existing authentication, cancellation, pricing or overbooking protections.
do $patch$
declare fn text:=pg_get_functiondef('lotus_private.dispatch(text,jsonb)'::regprocedure);
begin
 if position('Defina o quarto antes de confirmar' in fn)=0 then
  assert position('update lotus_private.bookings set status=st where id=bid;' in fn)>0;
  fn:=replace(fn,'update lotus_private.bookings set status=st where id=bid;',
   $s$perform 1 from lotus_private.bookings where id=bid for update;
    if st='confirmada' and exists(select 1 from lotus_private.bookings where id=bid and not room_assigned) then
     raise sqlstate 'PT400' using message='Defina o quarto antes de confirmar a reserva.';end if;
    update lotus_private.bookings set status=st where id=bid;$s$);
  execute fn;
 end if;
end $patch$;
