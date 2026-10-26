-- Price per ROOM/night for the selected number of people, with seasonal overrides.
create table if not exists lotus_private.occupancy_rates (
 id bigint generated always as identity primary key,
 floor text not null check(floor in ('terreo','superior')),
 guests integer not null check(guests between 1 and 6),
 amount integer not null check(amount between 1 and 100000000),
 start date, "end" date,
 example boolean not null default false,
 revision integer not null default 1,
 check((start is null and "end" is null) or (start is not null and "end">start))
);
create unique index if not exists lotus_rate_base on lotus_private.occupancy_rates(floor,guests) where start is null;
do $$begin
 if not exists(select 1 from pg_constraint where conname='lotus_rate_seasons_no_overlap') then
  alter table lotus_private.occupancy_rates add constraint lotus_rate_seasons_no_overlap exclude using gist
   (floor with =, guests with =, daterange(start,"end",'[)') with &&) where (start is not null);
 end if;
end $$;
alter table lotus_private.occupancy_rates enable row level security;
revoke all on lotus_private.occupancy_rates from public,anon,authenticated;
drop policy if exists lotus_no_direct_rate_access on lotus_private.occupancy_rates;
create policy lotus_no_direct_rate_access on lotus_private.occupancy_rates as restrictive for all to anon,authenticated using(false) with check(false);
-- Explicit examples requested by the owner of the development task. Not bookable.
insert into lotus_private.occupancy_rates(floor,guests,amount,example) values('terreo',1,10000,true),('superior',1,12000,true) on conflict do nothing;

create or replace function lotus_private.occupancy_quote(v_floor text,g integer,dates daterange) returns jsonb
language plpgsql stable set search_path='' as $$
declare night date; rate lotus_private.occupancy_rates; total bigint:=0; demo boolean:=false;
begin
 for night in select x::date from generate_series(lower(dates)::timestamp,(upper(dates)-1)::timestamp,interval '1 day') x loop
  select * into rate from lotus_private.occupancy_rates p where p.floor=v_floor and p.guests=g
   and (p.start is null or (p.start<=night and p."end">night)) order by p.start nulls last limit 1;
  if not found then return jsonb_build_object('total',null,'example',false);end if;
  total:=total+rate.amount;demo:=demo or rate.example;
 end loop;
 return jsonb_build_object('total',total,'example',demo);
end $$;
revoke all on function lotus_private.occupancy_quote(text,integer,daterange) from public,anon,authenticated;
create or replace function lotus_private.rate_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rid bigint; v_amount integer; g integer; f text; starts date; ends date; v_revision integer; result jsonb; item jsonb; quoted jsonb; items jsonb:='[]'; dates daterange;
begin
 if op in ('read','save','delete') then
  if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para editar valores.';end if;
  perform pg_advisory_xact_lock(hashtextextended('lotus.category.holds',0));
  if op='save' then
   f:=d->>'floor';g:=lotus_private.int_value(d,'guests',1,6);v_amount:=lotus_private.int_value(d,'amount',1,100000000);
   if f is null or f not in ('terreo','superior') then raise sqlstate 'PT400' using message='Selecione o andar.';end if;
   starts:=nullif(d->>'start','')::date;ends:=nullif(d->>'end','')::date;
   if (starts is null)<>(ends is null) or ends<=starts then raise sqlstate 'PT400' using message='Confira o período da temporada.';end if;
   if jsonb_typeof(d->'example') is distinct from 'boolean' then raise sqlstate 'PT400' using message='Informe se é um exemplo.';end if;
   if d->>'id' is not null then
    rid:=lotus_private.int_value(d,'id');v_revision:=lotus_private.int_value(d,'revision');
    update lotus_private.occupancy_rates set floor=f,guests=g,amount=v_amount,start=starts,"end"=ends,example=(d->>'example')::boolean,revision=occupancy_rates.revision+1 where id=rid and occupancy_rates.revision=v_revision;
    if not found then raise sqlstate 'PT409' using message='O preço foi alterado. Atualize o painel.';end if;
   else
    insert into lotus_private.occupancy_rates(floor,guests,amount,start,"end",example) values(f,g,v_amount,starts,ends,(d->>'example')::boolean);
   end if;
  elsif op='delete' then
   rid:=lotus_private.int_value(d,'id');v_revision:=lotus_private.int_value(d,'revision');
   delete from lotus_private.occupancy_rates where id=rid and occupancy_rates.revision=v_revision;
   if not found then raise sqlstate 'PT409' using message='O preço foi alterado. Atualize o painel.';end if;
  end if;
  return jsonb_build_object('rates',(select coalesce(jsonb_agg(to_jsonb(r) order by floor,guests,start nulls first),'[]') from lotus_private.occupancy_rates r));
 elsif op='availability' then
  if coalesce(d->>'floor','') not in ('terreo','superior') then raise sqlstate 'PT400' using message='Selecione térreo ou piso superior.';end if;
  dates:=lotus_private.period(d);g:=lotus_private.int_value(d,'guests',1,6);
  -- Package selection is intentionally absent from the guest filter.
  result:=lotus_private.room_catalog_dispatch('availability',d-'package_id');
  quoted:=lotus_private.occupancy_quote(d->>'floor',g,dates);
  for item in select value from jsonb_array_elements(result->'rooms') loop
   items:=items||jsonb_build_array(item||jsonb_build_object('total',quoted->'total','quote_example',quoted->'example'));
  end loop;
  return jsonb_set(result,'{rooms}',items);
 elsif op='catalog' then
  result:=lotus_private.room_catalog_dispatch('catalog',d);
  for item in select value from jsonb_array_elements(result->'rooms') loop
   items:=items||jsonb_build_array(item||jsonb_build_object('price',(select min(amount) from lotus_private.occupancy_rates where floor=item->>'floor')));
  end loop;
  return jsonb_set(result,'{rooms}',items)||jsonb_build_object('price_notice','Valores a partir da menor diária cadastrada. Variam conforme datas, quantidade de hóspedes e andar. A reserva depende da confirmação da pousada.');
 end if;
 raise sqlstate 'PT404' using message='Operação não encontrada.';
exception when exclusion_violation or unique_violation then raise sqlstate 'PT409' using message='Já existe um preço para esse andar, quantidade de hóspedes e período.';
 when invalid_datetime_format or datetime_field_overflow or check_violation then raise sqlstate 'PT400' using message='Confira os valores e as datas.';
end $$;
revoke all on function lotus_private.rate_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.rate_dispatch(text,jsonb) to anon,authenticated;
create or replace function public.lotus_rate_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.rate_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_rate_api(text,jsonb) from public;
grant execute on function public.lotus_rate_api(text,jsonb) to anon,authenticated;
