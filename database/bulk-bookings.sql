-- Atomic administrative actions; never deletes active reservations.
create or replace function lotus_private.bulk_bookings(d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ids bigint[];bid bigint;affected integer;action text;
begin
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para continuar.';end if;
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'ids') is distinct from 'array' then
  raise sqlstate 'PT400' using message='Selecione as reservas.';end if;
 if jsonb_array_length(d->'ids') not between 1 and 100 then
  raise sqlstate 'PT400' using message='Selecione de 1 a 100 reservas por ação.';end if;
 if exists(select 1 from jsonb_array_elements(d->'ids') x where jsonb_typeof(x)<>'number' or x::text !~ '^[1-9][0-9]{0,8}$') then
  raise sqlstate 'PT400' using message='Seleção de reservas inválida.';end if;
 select array_agg(distinct (x::text)::bigint order by (x::text)::bigint) into ids from jsonb_array_elements(d->'ids') x;
 if cardinality(ids)<>jsonb_array_length(d->'ids') then raise sqlstate 'PT400' using message='Há reservas repetidas na seleção.';end if;
 action:=d->>'action';
 if action is null or action not in ('confirm','delete') then raise sqlstate 'PT400' using message='Ação inválida.';end if;
 -- A stable lock order prevents two batches from locking the same rows in reverse.
 perform 1 from lotus_private.bookings where id=any(ids) order by id for update;
 get diagnostics affected=row_count;
 if affected<>cardinality(ids) then raise sqlstate 'PT409' using message='Uma reserva foi removida. Atualize a lista e selecione novamente.';end if;
 if action='confirm' then
  if exists(select 1 from lotus_private.bookings where id=any(ids) and (status<>'pendente' or not room_assigned)) then
   raise sqlstate 'PT409' using message='Confirme somente reservas pendentes com quarto definido. Atualize a lista.';end if;
  foreach bid in array ids loop
   perform lotus_private.dispatch('booking_status',jsonb_build_object('id',bid,'status','confirmada'));
  end loop;
 else
  if exists(select 1 from lotus_private.bookings where id=any(ids) and status<>'cancelada') then
   raise sqlstate 'PT409' using message='Cancele as reservas antes de excluir. Atualize a lista.';end if;
  delete from lotus_private.bookings where id=any(ids);
 end if;
 return jsonb_build_object('ok',true,'count',cardinality(ids),'action',action);
end $$;
revoke all on function lotus_private.bulk_bookings(jsonb) from public,anon,authenticated;
grant execute on function lotus_private.bulk_bookings(jsonb) to authenticated;
create or replace function public.lotus_bulk_booking_api(p_data jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.bulk_bookings(p_data);$$;
revoke all on function public.lotus_bulk_booking_api(jsonb) from public,anon,authenticated;
grant execute on function public.lotus_bulk_booking_api(jsonb) to authenticated;
