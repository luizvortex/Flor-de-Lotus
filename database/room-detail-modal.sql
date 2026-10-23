-- Room details taken from the Booking screenshots supplied by the owner.
-- The family block keeps its existing facts; no bed configuration is inferred.
alter table lotus_private.room_showcases add column details jsonb not null default '{}'::jsonb
 check(jsonb_typeof(details)='object' and octet_length(details::text)<=12000);

create function lotus_private.validate_showcase_details(d jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare k text; item jsonb; result jsonb := '{}'::jsonb; value text;
begin
 if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message='Detalhes do quarto inválidos.'; end if;
 for k in select unnest(array['beds','description','smoking']) loop
  if d ? k and jsonb_typeof(d->k) is distinct from 'string' then raise sqlstate 'PT400' using message='Preencha corretamente os detalhes do quarto.'; end if;
  value:=btrim(coalesce(d->>k,''));
  if length(value)>(case when k='description' then 1500 else 120 end) then raise sqlstate 'PT400' using message='Texto dos detalhes muito longo.'; end if;
  result:=result||jsonb_build_object(k,value);
 end loop;
 for k in select unnest(array['bathroom','views','amenities']) loop
  if d ? k then
   if jsonb_typeof(d->k) is distinct from 'array' then raise sqlstate 'PT400' using message='Informe as comodidades em uma lista.'; end if;
   if jsonb_array_length(d->k)>12 then raise sqlstate 'PT400' using message='Use até 12 itens por grupo.'; end if;
   for item in select e.element from jsonb_array_elements(d->k) as e(element) loop
    if jsonb_typeof(item) is distinct from 'string' or length(btrim(item#>>'{}')) not between 1 and 140 then raise sqlstate 'PT400' using message='Cada comodidade deve ter entre 1 e 140 caracteres.'; end if;
   end loop;
  end if;
  result:=result||jsonb_build_object(k,coalesce(d->k,'[]'::jsonb));
 end loop;
 return result;
end;
$$;
revoke all on function lotus_private.validate_showcase_details(jsonb) from public,anon,authenticated;

create or replace function lotus_private.showcase_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; u text; k text; rec lotus_private.room_showcases;
 nm text; descr text; topic text; expected bigint; extra jsonb;
begin
 if op='read' then
  return jsonb_build_object('showcases',coalesce((select jsonb_agg(to_jsonb(x) order by x.position) from lotus_private.room_showcases x),'[]'::jsonb));
 end if;
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para editar o site.'; end if;
 if op<>'save' then raise sqlstate 'PT404' using message='Operação não encontrada.'; end if;
 if jsonb_typeof(d) is distinct from 'object' then raise sqlstate 'PT400' using message='Dados inválidos.'; end if;
 k:=lotus_private.text_value(d,'slug');
 nm:=lotus_private.text_value(d,'title'); descr:=lotus_private.text_value(d,'description',3000);
 topic:=coalesce(d->>'eyebrow','');
 if jsonb_typeof(d->'eyebrow') is distinct from 'string' or length(topic)>80 then raise sqlstate 'PT400' using message='Preencha corretamente o tópico.'; end if;
 expected:=lotus_private.int_value(d,'revision',1,9007199254740991);
 if jsonb_typeof(d->'photos') is distinct from 'array' then raise sqlstate 'PT400' using message='Informe as fotos do quarto.'; end if;
 if jsonb_array_length(d->'photos') not between 3 and 12 then raise sqlstate 'PT400' using message='Mantenha entre 3 e 12 fotos.'; end if;
 for item in select value from jsonb_array_elements(d->'photos') loop
  if jsonb_typeof(item) is distinct from 'object' then raise sqlstate 'PT400' using message='Foto inválida.'; end if;
  u:=lotus_private.text_value(item,'url',1000);
  perform lotus_private.text_value(item,'alt',180);
  if position('..' in u)>0 or not (
   u ~* '^/(img[^/]*|images)/[^<>"\\]+\.(jpg|jpeg|png|webp)$'
   or u ~ '^https://asojfispuomhbfapqdmi\.supabase\.co/storage/v1/object/public/lotus-showcase/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ) then raise sqlstate 'PT400' using message='Use uma foto enviada pelo painel ou uma imagem existente da pousada.'; end if;
 end loop;
 if jsonb_typeof(d->'features') is distinct from 'array' then raise sqlstate 'PT400' using message='Informe as comodidades.'; end if;
 if jsonb_array_length(d->'features') not between 1 and 12 then raise sqlstate 'PT400' using message='Informe entre 1 e 12 comodidades.'; end if;
 for item in select value from jsonb_array_elements(d->'features') loop
  perform lotus_private.text_value(item,'label',100);
  u:=lotus_private.text_value(item,'icon',30);
  if u<>all(array['wifi','tv','snow','door-open','cup-hot','shield-check','wind','water','car-front','people','house-door','lamp','safe','droplet','thermometer-half','person','check2','sun','telephone','tree','bicycle','plug','fan']) then
   raise sqlstate 'PT400' using message='Escolha um ícone disponível no painel.';
  end if;
 end loop;
 if d ? 'details' then extra:=lotus_private.validate_showcase_details(d->'details'); end if;
 update lotus_private.room_showcases set title=nm,eyebrow=topic,description=descr,photos=d->'photos',features=d->'features',details=coalesce(extra,details),revision=revision+1,updated_at=now()
 where slug=k and revision=expected returning * into rec;
 if not found then
  if exists(select 1 from lotus_private.room_showcases where slug=k) then raise sqlstate 'PT409' using message='Este conteúdo foi alterado em outra janela. Reabra o editor antes de salvar.'; end if;
  raise sqlstate 'PT404' using message='Bloco não encontrado.';
 end if;
 return jsonb_build_object('showcase',to_jsonb(rec));
end;
$$;
update lotus_private.room_showcases set title='Quarto Duplo Standard',description='Aconchego para desacelerar depois de um dia em Itacaré. São 17 m² com cama de casal, banheiro privativo e varanda com vista para o jardim — um convite ao descanso.',details=lotus_private.validate_showcase_details('{"beds": "1 cama de casal", "description": "A acomodação oferece produtos de banho gratuitos e banheiro privativo com chuveiro. A varanda tem vista para o jardim, e o quarto conta com ar-condicionado e TV de tela plana.", "bathroom": ["Produtos de banho gratuitos", "Chuveiro", "Banheiro privativo", "Toalhas", "Papel higiênico"], "views": ["Vista para o jardim"], "amenities": ["Varanda", "Ar-condicionado", "Roupa de cama", "TV de tela plana"], "smoking": "Não é permitido fumar"}'::jsonb),revision=revision+1,updated_at=now() where slug='duplo';
update lotus_private.room_showcases set title='Quarto Duplo Superior',description='Seu descanso com o charme de Itacaré. Em 17 m², a cama de casal, o banheiro privativo e a varanda com vista para o jardim compõem um ambiente acolhedor para aproveitar a estadia.',details=lotus_private.validate_showcase_details('{"beds": "1 cama de casal", "description": "A acomodação oferece produtos de banho gratuitos e banheiro privativo com chuveiro. A varanda tem vista para o jardim, e o quarto conta com ar-condicionado e TV de tela plana.", "bathroom": ["Produtos de banho gratuitos", "Chuveiro", "Banheiro privativo", "Toalhas", "Papel higiênico"], "views": ["Vista para o jardim"], "amenities": ["Varanda", "Ar-condicionado", "Roupa de cama", "TV de tela plana"], "smoking": "Não é permitido fumar"}'::jsonb),revision=revision+1,updated_at=now() where slug='triplo';
