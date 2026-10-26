-- New quotes: ages 0–5 free, ages 6–17 paying. All occupy capacity. Existing booking totals are preserved.
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
   if age::numeric>5 then paying:=paying+1;end if;
  end loop;
  -- Confirmed policy: every child counts toward room capacity, including free ages 0–5.
  occupied:=adults+jsonb_array_length(ages);
  result:=result||jsonb_build_array(jsonb_build_object('adults',adults,'children_ages',ages,'total',adults+jsonb_array_length(ages),'paying',paying,'capacity',occupied));
 end loop;
 return result;
end $$;
revoke all on function lotus_private.normalize_party(jsonb) from public,anon,authenticated;
