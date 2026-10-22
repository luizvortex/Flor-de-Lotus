-- Dedicated schema: no application tables or guest data in the exposed public schema.
create extension if not exists btree_gist with schema extensions;
create schema lotus_private;
revoke all on schema lotus_private from public;
grant usage on schema lotus_private to anon, authenticated;

create table lotus_private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table lotus_private.rooms (
  id bigint generated always as identity primary key,
  name text not null unique check (length(btrim(name)) between 1 and 120),
  type text not null check (type in ('solteiro','casal','casal_mais_um','familia')),
  capacity integer not null check (capacity between 1 and 20),
  price integer not null check (price between 1 and 100000000),
  active integer not null default 1 check (active in (0,1)),
  check (capacity >= case type when 'casal' then 2 when 'casal_mais_um' then 3 else 1 end)
);
create table lotus_private.packages (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  "start" date not null, "end" date not null,
  nights integer not null check (nights between 1 and 730),
  price integer not null check (price between 1 and 100000000),
  type text not null check (type in ('solteiro','casal','casal_mais_um','familia')),
  active integer not null default 1 check (active in (0,1)),
  check ("end" > "start" and nights <= "end" - "start")
);
create table lotus_private.bookings (
  id bigint generated always as identity primary key,
  room_id bigint not null references lotus_private.rooms(id),
  guest text not null check (length(btrim(guest)) between 1 and 120),
  phone text not null check (length(phone) <= 40 and length(regexp_replace(phone,'[^0-9]','','g')) >= 8),
  "start" date not null, "end" date not null,
  guests integer not null check (guests between 1 and 20),
  status text not null check (status in ('pendente','confirmada','cancelada','bloqueio')),
  total bigint not null check (total >= 0),
  package_id bigint references lotus_private.packages(id),
  created timestamptz not null default now(),
  check ("end" > "start" and "end" - "start" <= 730),
  constraint lotus_no_overlapping_nights exclude using gist
    (room_id extensions.gist_int8_ops with =, daterange("start", "end", '[)') with &&)
    where (status in ('pendente','confirmada','bloqueio'))
);
create index lotus_bookings_package_idx on lotus_private.bookings(package_id);
create index lotus_bookings_start_idx on lotus_private.bookings("start",id);
alter table lotus_private.admin_users enable row level security;
alter table lotus_private.rooms enable row level security;
alter table lotus_private.packages enable row level security;
alter table lotus_private.bookings enable row level security;
revoke all on all tables in schema lotus_private from public, anon, authenticated;
revoke all on all sequences in schema lotus_private from public, anon, authenticated;
create policy lotus_no_direct_admin_access on lotus_private.admin_users as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_room_access on lotus_private.rooms as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_package_access on lotus_private.packages as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_booking_access on lotus_private.bookings as restrictive for all to anon,authenticated using(false) with check(false);


create function lotus_private.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from lotus_private.admin_users a
    join auth.sessions s on s.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and s.id = nullif((select auth.jwt())->>'session_id','')::uuid
      and (s.not_after is null or s.not_after > now())
  );
$$;
create function lotus_private.text_value(d jsonb,k text,m integer default 120) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(d->>k);
begin
  if jsonb_typeof(d->k) is distinct from 'string' or v is null or length(v) not between 1 and m then
    raise sqlstate 'PT400' using message = 'Preencha corretamente: ' || k;
  end if;
  return v;
end;
$$;
create function lotus_private.int_value(d jsonb,k text,lo bigint default 1,hi bigint default 100000000) returns bigint
language plpgsql immutable set search_path = '' as $$
declare v bigint;
begin
  if jsonb_typeof(d->k) is distinct from 'number' or (d->>k) !~ '^[0-9]+$' then
    raise sqlstate 'PT400' using message = 'Valor inválido: ' || k;
  end if;
  v := (d->>k)::bigint;
  if v not between lo and hi then raise sqlstate 'PT400' using message = 'Valor inválido: ' || k; end if;
  return v;
exception when numeric_value_out_of_range then raise sqlstate 'PT400' using message = 'Valor inválido: ' || k;
end;
$$;
create function lotus_private.period(d jsonb,future boolean default true) returns daterange
language plpgsql stable set search_path = '' as $$
declare a date; b date;
begin
  if coalesce(d->>'start','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(d->>'end','') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise sqlstate 'PT400' using message = 'Selecione datas válidas.';
  end if;
  a := (d->>'start')::date; b := (d->>'end')::date;
  if b <= a or b-a > 730 or (future and a < (now() at time zone 'America/Bahia')::date) then
    raise sqlstate 'PT400' using message = 'Selecione saída após entrada, até 730 noites, sem entrada no passado.';
  end if;
  return daterange(a,b,'[)');
exception when datetime_field_overflow or invalid_datetime_format then
  raise sqlstate 'PT400' using message = 'Selecione datas válidas.';
end;
$$;
create function lotus_private.quote(r lotus_private.rooms, dates daterange, pid bigint) returns bigint
language plpgsql stable set search_path = '' as $$
declare p lotus_private.packages;
begin
  if pid is null then return r.price::bigint * (upper(dates)-lower(dates)); end if;
  select * into p from lotus_private.packages where id=pid and active=1;
  if not found or p.type<>r.type or lower(dates)<p."start" or upper(dates)>p."end" or upper(dates)-lower(dates)<>p.nights then
    raise sqlstate 'PT400' using message = 'O pacote não corresponde ao tipo do quarto, período ou número de noites.';
  end if;
  return p.price;
end;
$$;

-- The only privileged entry point. Authentication/authorization and validation
-- live here so a caller bypassing Next.js gets the same protections.
create function lotus_private.dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  admin boolean := lotus_private.is_admin();
  dates daterange; n integer; g integer; pid bigint; rid bigint; bid bigint;
  r lotus_private.rooms; p lotus_private.packages;
  nm text; kind text; st text; cap integer; v_price integer; v_active integer;
  v_total bigint; result jsonb := '[]'::jsonb; v_guest text; v_phone text;
begin
  if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message = 'Dados inválidos.'; end if;
  if op='session' then return jsonb_build_object('authenticated',admin); end if;
  if op not in ('catalog','availability','book') and not admin then
    raise sqlstate 'PT401' using message = 'Entre no painel para continuar.';
  end if;
  if op in ('catalog','admin') then
    result := jsonb_build_object(
      'rooms',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from lotus_private.rooms x where op='admin' or active=1),'[]'::jsonb),
      'packages',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from lotus_private.packages x where op='admin' or active=1),'[]'::jsonb));
    if op='admin' then
      result := result || jsonb_build_object('bookings',coalesce((select jsonb_agg(to_jsonb(x) order by x."start",x.id) from
        (select b.*,room.name as room_name from lotus_private.bookings b join lotus_private.rooms room on room.id=b.room_id) x),'[]'::jsonb));
    end if;
    return result;
  end if;
  if op in ('availability','book') then
    dates := lotus_private.period(d); n := upper(dates)-lower(dates);
    g := lotus_private.int_value(d,'guests',1,20);
    if d->>'package_id' is not null then pid := lotus_private.int_value(d,'package_id'); end if;
  end if;
  if op='availability' then
    for r in select * from lotus_private.rooms where active=1 and capacity>=g order by id loop
      if not exists(select 1 from lotus_private.bookings b where b.room_id=r.id and b.status<>'cancelada' and daterange(b."start",b."end",'[)') && dates) then
        begin
          v_total := lotus_private.quote(r,dates,pid);
          result := result || jsonb_build_array(to_jsonb(r)||jsonb_build_object('total',v_total));
        exception when sqlstate 'PT400' then
          if pid is null then raise; end if;
        end;
      end if;
    end loop;
    return jsonb_build_object('rooms',result,'nights',n);
  end if;
  if op in ('save_room','save_package') then
    nm:=lotus_private.text_value(d,'name'); kind:=lotus_private.text_value(d,'type');
    if kind not in ('solteiro','casal','casal_mais_um','familia') then raise sqlstate 'PT400' using message='Tipo de acomodação inválido.'; end if;
    v_price:=lotus_private.int_value(d,'price'); v_active:=lotus_private.int_value(d,'active',0,1);
    if d->>'id' is not null then rid:=lotus_private.int_value(d,'id'); end if;
    if op='save_room' then
      cap:=lotus_private.int_value(d,'capacity',1,20);
      if cap < (case kind when 'casal' then 2 when 'casal_mais_um' then 3 else 1 end) then
        raise sqlstate 'PT400' using message='Capacidade incompatível com o tipo de quarto.';
      end if;
      if rid is null then
        insert into lotus_private.rooms(name,type,capacity,price,active) values(nm,kind,cap,v_price,v_active) returning id into rid;
      else
        perform 1 from lotus_private.rooms where id=rid for update;
        if not found then raise sqlstate 'PT404' using message='Registro não encontrado.'; end if;
        if exists(select 1 from lotus_private.bookings where room_id=rid and status in ('pendente','confirmada') and "end">(now() at time zone 'America/Bahia')::date and guests>cap) then
          raise sqlstate 'PT400' using message='Há reservas com mais hóspedes que a nova capacidade.';
        end if;
        update lotus_private.rooms set name=nm,type=kind,capacity=cap,price=v_price,active=v_active where id=rid;
      end if;
    else
      dates:=lotus_private.period(d,false); n:=lotus_private.int_value(d,'nights',1,730);
      if n>upper(dates)-lower(dates) then raise sqlstate 'PT400' using message='O pacote precisa caber no período informado.'; end if;
      if rid is null then
        insert into lotus_private.packages(name,type,"start","end",nights,price,active) values(nm,kind,lower(dates),upper(dates),n,v_price,v_active) returning id into rid;
      else
        update lotus_private.packages set name=nm,type=kind,"start"=lower(dates),"end"=upper(dates),nights=n,price=v_price,active=v_active where id=rid;
        if not found then raise sqlstate 'PT404' using message='Registro não encontrado.'; end if;
      end if;
    end if;
    return jsonb_build_object('id',rid);
  end if;
  if op='book' then
    rid:=lotus_private.int_value(d,'room_id'); v_guest:=lotus_private.text_value(d,'guest'); v_phone:=lotus_private.text_value(d,'phone',40);
    if length(regexp_replace(v_phone,'[^0-9]','','g'))<8 then raise sqlstate 'PT400' using message='Informe um telefone válido.'; end if;
    st:=case when admin then coalesce(d->>'status','pendente') else 'pendente' end;
    if st not in ('pendente','confirmada','bloqueio') then raise sqlstate 'PT400' using message='Status inválido.'; end if;
    -- Serialize capacity/rate edits against bookings for this physical room.
    select * into r from lotus_private.rooms where id=rid and active=1 for update;
    if not found or r.capacity<g then raise sqlstate 'PT400' using message='Quarto indisponível ou capacidade insuficiente.'; end if;
    if pid is not null then perform 1 from lotus_private.packages where id=pid for share; end if;
    v_total:=case when st='bloqueio' then 0 else lotus_private.quote(r,dates,pid) end;
    insert into lotus_private.bookings(room_id,guest,phone,"start","end",guests,status,total,package_id)
      values(rid,v_guest,v_phone,lower(dates),upper(dates),g,st,v_total,pid) returning id into bid;
    return jsonb_build_object('id',bid,'status',st,'total',v_total);
  end if;
  if op='booking_status' then
    bid:=lotus_private.int_value(d,'id'); st:=lotus_private.text_value(d,'status');
    if st not in ('confirmada','cancelada') then raise sqlstate 'PT400' using message='Selecione confirmar ou cancelar.'; end if;
    update lotus_private.bookings set status=st where id=bid;
    if not found then raise sqlstate 'PT404' using message='Reserva não encontrada.'; end if;
    return jsonb_build_object('ok',true);
  end if;
  raise sqlstate 'PT404' using message='Operação não encontrada.';
exception
  when exclusion_violation then raise sqlstate 'PT409' using message='Este quarto acabou de ficar indisponível. Consulte novamente.';
  when unique_violation then raise sqlstate 'PT409' using message='Nome de quarto já cadastrado.';
  when check_violation or foreign_key_violation or invalid_text_representation or numeric_value_out_of_range then
    raise sqlstate 'PT400' using message='Dados inválidos. Confira os campos informados.';
end;
$$;

revoke all on all functions in schema lotus_private from public, anon, authenticated;
grant execute on function lotus_private.dispatch(text,jsonb) to anon, authenticated;
-- Thin unprivileged wrapper: the definer function stays outside exposed schemas.
create function public.lotus_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select lotus_private.dispatch(p_operation,p_data);
$$;
revoke all on function public.lotus_api(text,jsonb) from public;
grant execute on function public.lotus_api(text,jsonb) to anon, authenticated;
