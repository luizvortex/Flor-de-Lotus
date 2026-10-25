-- Private notifications for new pending booking requests, independent of guest reminders.
create table lotus_private.admin_booking_events (
 booking_id bigint primary key references lotus_private.bookings(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table lotus_private.admin_booking_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 booking_id bigint not null references lotus_private.admin_booking_events(booking_id) on delete cascade,
 read_at timestamptz not null default now(),primary key(user_id,booking_id)
);
create index admin_booking_reads_booking_idx on lotus_private.admin_booking_reads(booking_id);
create table lotus_private.admin_booking_deliveries (
 booking_id bigint primary key references lotus_private.admin_booking_events(booking_id) on delete cascade,
 channel text not null default 'whatsapp' check(channel='whatsapp'),
 status text not null default 'awaiting_setup' check(status in ('awaiting_setup','pending','sent','failed','cancelled')),
 created_at timestamptz not null default now(),sent_at timestamptz
);
create index admin_booking_deliveries_waiting_idx on lotus_private.admin_booking_deliveries(booking_id) where status='awaiting_setup';
create table lotus_private.admin_alert_settings (
 id boolean primary key default true check(id),whatsapp_recipient text not null default '' check(whatsapp_recipient='' or whatsapp_recipient ~ '^[0-9]{10,15}$')
);
insert into lotus_private.admin_alert_settings(id) values(true);
alter table lotus_private.admin_booking_events enable row level security;
alter table lotus_private.admin_booking_reads enable row level security;
alter table lotus_private.admin_booking_deliveries enable row level security;
alter table lotus_private.admin_alert_settings enable row level security;
revoke all on lotus_private.admin_booking_events,lotus_private.admin_booking_reads,lotus_private.admin_booking_deliveries,lotus_private.admin_alert_settings from public,anon,authenticated;
create policy lotus_no_direct_admin_event_access on lotus_private.admin_booking_events as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_admin_read_access on lotus_private.admin_booking_reads as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_admin_delivery_access on lotus_private.admin_booking_deliveries as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_admin_alert_settings on lotus_private.admin_alert_settings as restrictive for all to anon,authenticated using(false) with check(false);

create function lotus_private.enqueue_admin_booking_alert() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status='pendente' then
   insert into lotus_private.admin_booking_events(booking_id) values(new.id) on conflict do nothing;
   insert into lotus_private.admin_booking_deliveries(booking_id) values(new.id) on conflict do nothing;
  end if;
 elsif new.status='cancelada' then
  update lotus_private.admin_booking_deliveries set status='cancelled' where booking_id=new.id and status<>'sent';
 end if;
 return new;
end $$;
revoke all on function lotus_private.enqueue_admin_booking_alert() from public,anon,authenticated;
create trigger lotus_admin_booking_insert after insert on lotus_private.bookings for each row execute function lotus_private.enqueue_admin_booking_alert();
create trigger lotus_admin_booking_cancel after update of status on lotus_private.bookings for each row when(new.status='cancelada') execute function lotus_private.enqueue_admin_booking_alert();

create function lotus_private.admin_alert_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();bid bigint;recipient text;result jsonb;
begin
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para acompanhar os avisos.'; end if;
 if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message='Dados inválidos.'; end if;
 if op='mark_read' then
  bid:=lotus_private.int_value(d,'id');
  if not exists(select 1 from lotus_private.admin_booking_events where booking_id=bid) then raise sqlstate 'PT404' using message='Aviso não encontrado.';end if;
  insert into lotus_private.admin_booking_reads(user_id,booking_id) values(uid,bid) on conflict do nothing;
 elsif op='read_all' then
  bid:=lotus_private.int_value(d,'through',0,9007199254740991);
  insert into lotus_private.admin_booking_reads(user_id,booking_id)
  select uid,booking_id from lotus_private.admin_booking_events where booking_id<=bid on conflict do nothing;
 elsif op='configure' then
  if jsonb_typeof(d->'whatsapp_recipient') is distinct from 'string' then raise sqlstate 'PT400' using message='Informe um número válido.';end if;
  recipient:=d->>'whatsapp_recipient';
  if recipient<>'' and recipient !~ '^[0-9]{10,15}$' then raise sqlstate 'PT400' using message='Use país e DDD, somente números (10 a 15 dígitos).';end if;
  update lotus_private.admin_alert_settings set whatsapp_recipient=recipient where id;
 elsif op<>'read' then raise sqlstate 'PT404' using message='Operação não encontrada.';
 end if;
 select jsonb_build_object('viewer',uid,
  'unread_count',(select count(*) from lotus_private.admin_booking_events e join lotus_private.bookings b on b.id=e.booking_id where b.status<>'cancelada' and not exists(select 1 from lotus_private.admin_booking_reads r where r.user_id=uid and r.booking_id=e.booking_id)),
  'alerts',coalesce((select jsonb_agg(x order by x.booking_id desc) from (
   select e.booking_id,e.created_at,b.start,b."end",b.guests,b.total,b.status,r.name as room_name,b.room_floor,
    exists(select 1 from lotus_private.admin_booking_reads seen where seen.user_id=uid and seen.booking_id=e.booking_id) as is_read
   from lotus_private.admin_booking_events e join lotus_private.bookings b on b.id=e.booking_id join lotus_private.rooms r on r.id=b.room_id
   where b.status<>'cancelada' order by e.booking_id desc limit 30
  ) x),'[]'::jsonb),
  'whatsapp_recipient',(select whatsapp_recipient from lotus_private.admin_alert_settings where id),
  'whatsapp_status','awaiting_setup',
  'whatsapp_waiting',(select count(*) from lotus_private.admin_booking_deliveries where status='awaiting_setup')
 ) into result;
 return result;
end $$;
revoke all on function lotus_private.admin_alert_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.admin_alert_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_admin_alert_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.admin_alert_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_admin_alert_api(text,jsonb) from public;
grant execute on function public.lotus_admin_alert_api(text,jsonb) to anon,authenticated;
