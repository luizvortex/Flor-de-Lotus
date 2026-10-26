-- Run after initial-occupancy-starting-prices.sql within BEGIN/ROLLBACK.
do $test$
declare payload jsonb;result jsonb;offer jsonb;starts date:=(now() at time zone 'America/Bahia')::date+620;
begin
 assert (select count(*)=12 from lotus_private.occupancy_rates where start is null and not example and amount=guests*10000),'Six initial occupancy prices on each floor';
 assert jsonb_array_length(public.lotus_rate_api('catalog')->'starting_rates')=12;
 payload:=jsonb_build_object('start',starts,'end',starts+2,'floor','terreo','party','[{"adults":1,"children_ages":[6]}]'::jsonb);
 result:=public.lotus_rate_api('availability',payload);
 select x into offer from jsonb_array_elements(result->'rooms') x where x->>'category_slug'='duplo';
 assert (offer->>'starting_price')::integer=10000 and (offer->>'total')::integer=20000 and not (offer->>'quote_example')::boolean,'A free child counts in capacity but does not increase the starting or quoted price';
 payload:=payload||jsonb_build_object('party','[{"adults":3,"children_ages":[6]}]'::jsonb);
 result:=public.lotus_rate_api('availability',payload);
 select x into offer from jsonb_array_elements(result->'rooms') x where x->>'category_slug'='duplo';
 assert (offer->>'starting_price')::integer=30000 and (offer->>'total')::integer=60000;
 update lotus_private.occupancy_rates set amount=15000 where floor='terreo' and guests=1 and start is null;
 assert lotus_private.party_starting_price('[{"adults":1,"children_ages":[6]}]','terreo')=15000,'Owner changes are reflected dynamically';
end $test$;
