-- Private operational reports; receipts are manual records, never automatic charges.
create table if not exists lotus_private.reporting_settings(
 singleton boolean primary key default true check(singleton),operation_start date
);
insert into lotus_private.reporting_settings(singleton) values(true) on conflict do nothing;
create table if not exists lotus_private.receipts(
 id uuid primary key,booking_id bigint references lotus_private.bookings(id) on delete restrict,
 amount bigint not null check(amount between 1 and 99999999999),received_on date not null,
 method text not null check(method in ('pix','dinheiro','cartao','transferencia','outro')),
 note text not null default '' check(length(note)<=300),created timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,voided_at timestamptz,voided_by uuid references auth.users(id) on delete set null
);
create index if not exists lotus_receipt_date_idx on lotus_private.receipts(received_on) where voided_at is null;
create index if not exists lotus_receipt_booking_idx on lotus_private.receipts(booking_id);
alter table lotus_private.reporting_settings enable row level security;
alter table lotus_private.receipts enable row level security;
revoke all on lotus_private.reporting_settings,lotus_private.receipts from public,anon,authenticated;
drop policy if exists lotus_report_deny_direct on lotus_private.reporting_settings;
create policy lotus_report_deny_direct on lotus_private.reporting_settings as restrictive for all to anon,authenticated using(false) with check(false);
drop policy if exists lotus_receipt_deny_direct on lotus_private.receipts;
create policy lotus_receipt_deny_direct on lotus_private.receipts as restrictive for all to anon,authenticated using(false) with check(false);
create or replace function lotus_private.report_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare first_day date;last_day date;operation_day date;rid uuid;bid bigint;value bigint;payment_method text;memo text;receipt lotus_private.receipts;stats jsonb;rows jsonb;payments jsonb;
begin
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para consultar os relatórios.';end if;
 if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message='Dados inválidos.';end if;
 if op='settings' then
  operation_day:=nullif(d->>'operation_start','')::date;
  update lotus_private.reporting_settings set operation_start=operation_day where singleton;
  return jsonb_build_object('operation_start',operation_day);
 end if;
 if op='receipt' then
  rid:=(d->>'id')::uuid;bid:=lotus_private.int_value(d,'booking_id');value:=lotus_private.int_value(d,'amount',1,99999999999);
  if rid is null or value not between 1 and 99999999999 then raise sqlstate 'PT400' using message='Informe um valor válido.';end if;
  first_day:=(d->>'received_on')::date;payment_method:=d->>'method';memo:=coalesce(d->>'note','');
  if first_day is null or first_day>(now() at time zone 'America/Bahia')::date or payment_method not in ('pix','dinheiro','cartao','transferencia','outro') or payment_method is null or length(memo)>300 then raise sqlstate 'PT400' using message='Confira a data, a forma de pagamento e a observação.';end if;
  perform 1 from lotus_private.bookings where id=bid and status<>'bloqueio' for key share;
  if not found then raise sqlstate 'PT404' using message='Reserva não encontrada.';end if;
  insert into lotus_private.receipts(id,booking_id,amount,received_on,method,note,created_by) values(rid,bid,value,first_day,payment_method,memo,auth.uid()) on conflict(id) do nothing;
  select * into receipt from lotus_private.receipts where id=rid;
  if receipt.booking_id<>bid or receipt.amount<>value or receipt.received_on<>first_day or receipt.method<>payment_method or receipt.note<>memo or receipt.voided_at is not null then raise sqlstate 'PT409' using message='Este lançamento já foi utilizado. Atualize o painel.';end if;
  return jsonb_build_object('id',rid);
 end if;
 if op='void' then
  update lotus_private.receipts set voided_at=coalesce(voided_at,now()),voided_by=coalesce(voided_by,auth.uid()) where id=(d->>'id')::uuid returning * into receipt;
  if not found then raise sqlstate 'PT404' using message='Recebimento não encontrado.';end if;
  return jsonb_build_object('id',receipt.id);
 end if;
 if op<>'read' then raise sqlstate 'PT404' using message='Operação não encontrada.';end if;
 select operation_start into operation_day from lotus_private.reporting_settings where singleton;
 first_day:=coalesce(nullif(d->>'start','')::date,operation_day,'1900-01-01'::date);
 last_day:=coalesce(nullif(d->>'end','')::date,greatest((now() at time zone 'America/Bahia')::date,operation_day));
 if operation_day is not null then first_day:=greatest(first_day,operation_day);end if;
 if first_day>last_day then raise sqlstate 'PT400' using message='A data final deve ser igual ou posterior ao início da operação e do período.';end if;
 select jsonb_build_object('confirmed_bookings',count(*),'unique_rooms',count(distinct room_id) filter(where room_assigned),'room_nights',coalesce(sum("end"-start),0),'booking_total',coalesce(sum(total),0)) into stats
 from lotus_private.bookings where status='confirmada' and start between first_day and last_day;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'room_name',room_name,'guest',guest,'start',start,'end',"end",'total',total) order by start,id),'[]') into rows
 from (select b.*,case when b.room_assigned then r.name else 'A definir pela pousada' end room_name from lotus_private.bookings b join lotus_private.rooms r on r.id=b.room_id where b.status='confirmada' and b.start between first_day and last_day) q;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'booking_id',p.booking_id,'guest',b.guest,'amount',p.amount,'received_on',p.received_on,'method',p.method,'note',p.note) order by p.received_on desc,p.created desc),'[]') into payments
 from lotus_private.receipts p left join lotus_private.bookings b on b.id=p.booking_id where p.voided_at is null and p.received_on between first_day and last_day;
 return jsonb_build_object('start',first_day,'end',last_day,'operation_start',operation_day,'stats',stats||jsonb_build_object('received_total',coalesce((select sum((x->>'amount')::bigint) from jsonb_array_elements(payments) x),0)),'bookings',rows,'receipts',payments);
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then raise sqlstate 'PT400' using message='Confira os valores e as datas informadas.';
end $$;
revoke all on function lotus_private.report_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.report_dispatch(text,jsonb) to authenticated;
create or replace function public.lotus_report_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.report_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_report_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.lotus_report_api(text,jsonb) to authenticated;
