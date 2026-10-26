-- Editable highlights and amenity icons, independent for every presentation.
alter table lotus_private.room_showcases add column if not exists amenities jsonb
 check(amenities is null or (jsonb_typeof(amenities)='array' and jsonb_array_length(amenities)<=32));
alter table lotus_private.room_showcases drop constraint if exists room_showcases_features_check;
alter table lotus_private.room_showcases add constraint room_showcases_features_check
 check(jsonb_typeof(features)='array' and jsonb_array_length(features) between 0 and 16);
create or replace function lotus_private.validate_room_icon_items(items jsonb,maximum integer) returns jsonb
language plpgsql immutable set search_path='' as $$
declare item jsonb; label text; chosen text;
begin
 if jsonb_typeof(items) is distinct from 'array' then raise sqlstate 'PT400' using message='Informe a lista de comodidades.';end if;
 if jsonb_array_length(items)>maximum then raise sqlstate 'PT400' using message='Há comodidades demais nesta lista.';end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' then raise sqlstate 'PT400' using message='Comodidade inválida.';end if;
  label:=lotus_private.text_value(item,'label',140);chosen:=lotus_private.text_value(item,'icon',30);
  if chosen<>all(array['check2','wifi','tv','snow','door-open','cup-hot','breakfast','bath','shower','elevator','heating','kettle','safe','minibar','desk','wardrobe','paper','toiletries','no-smoking','hair-dryer','towels','toilet','shield-check','wind','water','car-front','people','house-door','lamp','droplet','thermometer-half','person','sun','telephone','tree','bicycle','plug','fan']) then raise sqlstate 'PT400' using message='Escolha um ícone disponível no painel.';end if;
 end loop;
 return items;
end $$;
revoke all on function lotus_private.validate_room_icon_items(jsonb,integer) from public,anon,authenticated;
do $patch$
declare fn text:=pg_get_functiondef('lotus_private.showcase_dispatch(text,jsonb)'::regprocedure);
begin
 if position('v_amenities' in fn)=0 then
  assert position('extra jsonb;' in fn)>0,'Review showcase dispatcher before patching';
  fn:=replace(fn,'extra jsonb;','extra jsonb; v_amenities jsonb;');
  fn:=replace(fn,'not between 1 and 12','not between 0 and 16');
  fn:=replace(fn,'Informe entre 1 e 12 comodidades.','Use até 16 destaques.');
  fn:=regexp_replace(fn,$rx$if u<>all\(array\[[^
]+\]\)$rx$,$icons$if u<>all(array['check2','wifi','tv','snow','door-open','cup-hot','breakfast','bath','shower','elevator','heating','kettle','safe','minibar','desk','wardrobe','paper','toiletries','no-smoking','hair-dryer','towels','toilet','shield-check','wind','water','car-front','people','house-door','lamp','droplet','thermometer-half','person','sun','telephone','tree','bicycle','plug','fan'])$icons$);
  assert position('hair-dryer' in fn)>0,'Icon palette patch failed';
  assert position('if d ? ''details'' then extra:=lotus_private.validate_showcase_details(d->''details''); end if;' in fn)>0;
  fn:=replace(fn,'if d ? ''details'' then extra:=lotus_private.validate_showcase_details(d->''details''); end if;',
   $s$if d ? 'details' then extra:=lotus_private.validate_showcase_details(d->'details'); end if;
 if d ? 'amenities' then v_amenities:=lotus_private.validate_room_icon_items(d->'amenities',32);end if;$s$);
  assert position('details=coalesce(extra,details),revision=revision+1' in fn)>0;
  fn:=replace(fn,'details=coalesce(extra,details),revision=revision+1',
   $s$amenities=case when d ? 'amenities' then v_amenities else amenities end,details=coalesce(extra,details),revision=revision+1$s$);
  execute fn;
 end if;
end $patch$;
-- One-time additions explicitly confirmed by the property. Retain all other facts.
with revised as (
 select slug,features
 || case when exists(select 1 from jsonb_array_elements(features) f where f->>'icon'='breakfast' or lower(f->>'label') like '%café da manhã%') then '[]'::jsonb else '[{"icon":"breakfast","label":"Café da manhã incluso"}]'::jsonb end
 || case when jsonb_array_length(coalesce(details->'bathroom','[]'))>0 and not exists(select 1 from jsonb_array_elements(features) f where lower(f->>'label') like '%banheiro privativo%') then '[{"icon":"bath","label":"Banheiro privativo"}]'::jsonb else '[]'::jsonb end as updated_features
 from lotus_private.room_showcases
)
update lotus_private.room_showcases s set features=r.updated_features,revision=s.revision+1,updated_at=now()
from revised r where s.slug=r.slug and s.features is distinct from r.updated_features;
