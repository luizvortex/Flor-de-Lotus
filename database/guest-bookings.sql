-- Ownership is explicit: names and phone numbers never grant access to bookings.
create table lotus_private.booking_guest_links (
 booking_id bigint primary key references lotus_private.bookings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 linked_at timestamptz not null default now()
);
create index lotus_guest_booking_owner_idx on lotus_private.booking_guest_links(user_id,booking_id);
alter table lotus_private.booking_guest_links enable row level security;
revoke all on lotus_private.booking_guest_links from public,anon,authenticated;
create policy lotus_no_direct_guest_booking_access on lotus_private.booking_guest_links as restrictive for all to anon,authenticated using(false) with check(false);
create table lotus_private.guest_notifications (
 id bigint generated always as identity primary key,
 booking_id bigint not null references lotus_private.bookings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('ten_days','one_day')),
 checkin_at timestamptz not null,
 due_at timestamptz not null,
 read_at timestamptz,
 unique(booking_id,user_id,kind,checkin_at)
);
create index lotus_guest_notifications_owner_idx on lotus_private.guest_notifications(user_id,due_at);
alter table lotus_private.guest_notifications enable row level security;
revoke all on lotus_private.guest_notifications from public,anon,authenticated;
create policy lotus_no_direct_guest_notification_access on lotus_private.guest_notifications as restrictive for all to anon,authenticated using(false) with check(false);
create function lotus_private.guest_session_valid() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=(select auth.uid()) and u.deleted_at is null and u.email_confirmed_at is not null
 and s.id=nullif((select auth.jwt())->>'session_id','')::uuid
 and (s.not_after is null or s.not_after>now())
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'));
$$;
revoke all on function lotus_private.guest_session_valid() from public,anon,authenticated;
-- The property confirmed a 14:00 check-in, in Bahia's local time.
create function lotus_private.refresh_guest_reminders() returns void
language sql security definer set search_path='' as $$
 insert into lotus_private.guest_notifications(booking_id,user_id,kind,checkin_at,due_at)
 select b.id,l.user_id,t.kind,t.arrival,t.arrival-t.advance
 from lotus_private.bookings b join lotus_private.booking_guest_links l on l.booking_id=b.id
 cross join lateral (values
  ('ten_days',(b.start+time '14:00') at time zone 'America/Bahia',interval '10 days'),
  ('one_day',(b.start+time '14:00') at time zone 'America/Bahia',interval '24 hours')
 ) t(kind,arrival,advance)
 where b.status='confirmada' and t.arrival>now() and t.arrival-t.advance>=b.created
 on conflict(booking_id,user_id,kind,checkin_at) do nothing;
$$;
revoke all on function lotus_private.refresh_guest_reminders() from public,anon,authenticated;
create function lotus_private.guest_booking_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; uid uuid; bid bigint; v_email text; data jsonb; arrival timestamptz;
begin
 if op='link' then
  if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para vincular uma conta.'; end if;
  bid:=lotus_private.int_value(d,'booking_id');v_email:=lower(btrim(lotus_private.text_value(d,'email',254)));
  perform 1 from lotus_private.bookings where id=bid and status<>'bloqueio' for update;
  if not found then raise sqlstate 'PT404' using message='Reserva não encontrada.'; end if;
  select u.id into uid from auth.users u where lower(u.email)=v_email and u.email_confirmed_at is not null and u.deleted_at is null
   and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google');
  if uid is null then raise sqlstate 'PT400' using message='Peça ao hóspede para entrar com essa conta Google no site antes de vincular.'; end if;
  insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,uid)
  on conflict(booking_id) do update set user_id=excluded.user_id,linked_at=now();
  perform lotus_private.refresh_guest_reminders();
  return jsonb_build_object('ok',true);
 end if;
 if not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com sua conta Google para consultar suas reservas.'; end if;
 uid:=auth.uid();
 if op='book' then
  -- Force a guest booking even if this Google identity is also an administrator.
  data:=d-'id'-'user_id'-'owner_id'-'status';data:=data||jsonb_build_object('status','pendente');
  result:=lotus_private.dispatch('book',data);
  bid:=(result->>'id')::bigint;
  insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,uid);
  return result;
 elsif op='read' then
  perform lotus_private.refresh_guest_reminders();
  result:=jsonb_build_object('today',(now() at time zone 'America/Bahia')::date,'now',now(),'checkin_time','14:00','checkout_time','12:00','timezone','America/Bahia');
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'room_name',r.name,'room_type',r.type,'presentation',s.title,
    'start',b.start,'end',b.end,'nights',b.end-b.start,'guests',b.guests,'guest',b.guest,'phone',b.phone,
    'status',b.status,'total',b.total,'package_name',p.name,'created',b.created,
    'checkin_at',(b.start+time '14:00') at time zone 'America/Bahia','checkout_at',(b.end+time '12:00') at time zone 'America/Bahia'
   ) order by b.start desc,b.id desc),'[]'::jsonb) into data
  from lotus_private.booking_guest_links l join lotus_private.bookings b on b.id=l.booking_id
  join lotus_private.rooms r on r.id=b.room_id left join lotus_private.room_content_links c on c.room_id=r.id
  left join lotus_private.room_showcases s on s.slug=c.showcase_slug
  left join lotus_private.packages p on p.id=b.package_id
  where l.user_id=uid and b.status<>'bloqueio';
  result:=result||jsonb_build_object('bookings',data);
  select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'booking_id',n.booking_id,'kind',n.kind,'due_at',n.due_at,'read_at',n.read_at,'checkin_at',n.checkin_at) order by n.due_at desc),'[]'::jsonb) into data
  from lotus_private.guest_notifications n join lotus_private.bookings b on b.id=n.booking_id
  join lotus_private.booking_guest_links l on l.booking_id=b.id and l.user_id=n.user_id
  where n.user_id=uid and b.status='confirmada' and n.due_at<=now() and n.checkin_at>now()
  and n.checkin_at=(b.start+time '14:00') at time zone 'America/Bahia';
  return result||jsonb_build_object('notifications',data);
 elsif op='read_notification' then
  bid:=lotus_private.int_value(d,'id');
  update lotus_private.guest_notifications set read_at=coalesce(read_at,now()) where id=bid and user_id=uid and exists(select 1 from lotus_private.booking_guest_links l where l.booking_id=guest_notifications.booking_id and l.user_id=uid);
  if not found then raise sqlstate 'PT404' using message='Aviso não encontrado.'; end if;
  return jsonb_build_object('ok',true);
 end if;
 raise sqlstate 'PT404' using message='Operação não encontrada.';
end $$;
revoke all on function lotus_private.guest_booking_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.guest_booking_dispatch(text,jsonb) to authenticated;
create function public.lotus_guest_booking_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.guest_booking_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_guest_booking_api(text,jsonb) from public,anon;
grant execute on function public.lotus_guest_booking_api(text,jsonb) to authenticated;
-- Provider connections are not configured yet. Preserve scheduled work without
-- claiming that any email/WhatsApp message was sent.
create table lotus_private.guest_reminder_deliveries (
 notification_id bigint not null references lotus_private.guest_notifications(id) on delete cascade,
 channel text not null check(channel in ('email','whatsapp')),
 status text not null default 'awaiting_setup' check(status in ('awaiting_setup','pending','sent','cancelled','failed')),
 provider_id text,
 sent_at timestamptz,
 primary key(notification_id,channel)
);
alter table lotus_private.guest_reminder_deliveries enable row level security;
revoke all on lotus_private.guest_reminder_deliveries from public,anon,authenticated;
create policy lotus_no_direct_reminder_delivery_access on lotus_private.guest_reminder_deliveries as restrictive for all to anon,authenticated using(false) with check(false);
create function lotus_private.guest_reminder_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform lotus_private.refresh_guest_reminders();
 update lotus_private.guest_reminder_deliveries d set status='cancelled'
 from lotus_private.guest_notifications n join lotus_private.bookings b on b.id=n.booking_id
 where d.notification_id=n.id and d.status in ('awaiting_setup','pending','failed') and (
  b.status<>'confirmada' or n.checkin_at is distinct from (b.start+time '14:00') at time zone 'America/Bahia'
  or not exists(select 1 from lotus_private.booking_guest_links l where l.booking_id=b.id and l.user_id=n.user_id)
 );
 return null;
end $$;
revoke all on function lotus_private.guest_reminder_changed() from public,anon,authenticated;
create function lotus_private.guest_reminder_enqueued() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into lotus_private.guest_reminder_deliveries(notification_id,channel) values(new.id,'email'),(new.id,'whatsapp');
 return null;
end $$;
revoke all on function lotus_private.guest_reminder_enqueued() from public,anon,authenticated;
create trigger lotus_guest_reminder_enqueue after insert on lotus_private.guest_notifications for each row execute function lotus_private.guest_reminder_enqueued();
create trigger lotus_guest_reminders_after_booking after insert or update of status,start on lotus_private.bookings for each row execute function lotus_private.guest_reminder_changed();
create trigger lotus_guest_reminders_after_link after insert or update on lotus_private.booking_guest_links for each row execute function lotus_private.guest_reminder_changed();
