-- User-approved initial prices: R$100 per paying guest, on both floors.
-- Preserve any real owner-entered prices and all seasonal overrides.
insert into lotus_private.occupancy_rates(floor,guests,amount,example)
select f,g,g*10000,false from unnest(array['terreo','superior']) f cross join generate_series(1,6) g
on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false,revision=occupancy_rates.revision+1
where occupancy_rates.example;

create or replace function lotus_private.party_starting_price(party jsonb,v_floor text) returns bigint
language plpgsql stable set search_path='' as $$
declare entry jsonb;amount integer;result bigint:=0;
begin
 for entry in select value from jsonb_array_elements(lotus_private.normalize_party(party)) loop
  select r.amount into amount from lotus_private.occupancy_rates r where r.floor=v_floor and r.guests=(entry->>'paying')::integer and r.start is null;
  if not found then return null;end if;
  result:=result+amount;
 end loop;
 return result;
end $$;
revoke all on function lotus_private.party_starting_price(jsonb,text) from public,anon,authenticated;
do $patch$
declare fn text:=pg_get_functiondef('lotus_private.party_rate_dispatch(text,jsonb)'::regprocedure);
begin
 if position('starting_rates' in fn)=0 then
  assert position($s$if op<>'availability' or not (d ? 'party')$s$ in fn)>0;
  fn:=replace(fn,$s$if op<>'availability' or not (d ? 'party')$s$,
   $s$if op='catalog' then return lotus_private.rate_dispatch(op,d)||jsonb_build_object('starting_rates',(select coalesce(jsonb_agg(jsonb_build_object('floor',r.floor,'guests',r.guests,'amount',r.amount)),'[]'::jsonb) from lotus_private.occupancy_rates r where r.start is null));end if;
 if op<>'availability' or not (d ? 'party')$s$);
  assert position($s$'quote_example',plan->'example','room_count'$s$ in fn)>0;
  fn:=replace(fn,$s$'quote_example',plan->'example','room_count'$s$,
   $s$'quote_example',plan->'example','starting_price',lotus_private.party_starting_price(d->'party',d->>'floor'),'room_count'$s$);
  execute fn;
 end if;
end $patch$;
