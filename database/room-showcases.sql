-- Marketing content is independent from physical-room inventory and bookings.
create table lotus_private.room_showcases (
 slug text primary key check (slug in ('duplo','triplo','familia')),
 position integer not null unique check(position between 1 and 3),
 title text not null check(length(btrim(title)) between 1 and 120),
 eyebrow text not null default '' check(length(eyebrow)<=80),
 description text not null check(length(btrim(description)) between 1 and 3000),
 photos jsonb not null check(jsonb_typeof(photos)='array' and jsonb_array_length(photos) between 3 and 12),
 features jsonb not null check(jsonb_typeof(features)='array' and jsonb_array_length(features) between 1 and 12),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table lotus_private.room_showcases enable row level security;
revoke all on lotus_private.room_showcases from public,anon,authenticated;
create policy lotus_no_direct_showcase_access on lotus_private.room_showcases as restrictive for all to anon,authenticated using(false) with check(false);

create function lotus_private.showcase_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; u text; k text; rec lotus_private.room_showcases;
 nm text; descr text; topic text; expected bigint;
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
 update lotus_private.room_showcases set title=nm,eyebrow=topic,description=descr,photos=d->'photos',features=d->'features',revision=revision+1,updated_at=now()
 where slug=k and revision=expected returning * into rec;
 if not found then
  if exists(select 1 from lotus_private.room_showcases where slug=k) then raise sqlstate 'PT409' using message='Este conteúdo foi alterado em outra janela. Reabra o editor antes de salvar.'; end if;
  raise sqlstate 'PT404' using message='Bloco não encontrado.';
 end if;
 return jsonb_build_object('showcase',to_jsonb(rec));
end;
$$;
revoke all on function lotus_private.showcase_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.showcase_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_showcase_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.showcase_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_showcase_api(text,jsonb) from public;
grant execute on function public.lotus_showcase_api(text,jsonb) to anon,authenticated;

-- Only authorized administrators may upload to this new public-photo bucket.
create function lotus_private.can_edit_showcases() returns boolean
language sql stable security definer set search_path='' as $$select lotus_private.is_admin();$$;
revoke all on function lotus_private.can_edit_showcases() from public,anon,authenticated;
grant execute on function lotus_private.can_edit_showcases() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lotus-showcase','lotus-showcase',true,3145728,array['image/jpeg','image/png','image/webp']);
create policy lotus_admin_upload_showcase_photos on storage.objects for insert to authenticated
with check(bucket_id='lotus-showcase' and (select lotus_private.can_edit_showcases()));

-- Preserve the site's existing descriptions, amenities and photographs.
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features) values('duplo',1,'Duplo Twin','','Perfeito para amigos ou casais que buscam praticidade. Este quarto oferece o conforto essencial com um toque de charme baiano, garantindo noites tranquilas após um longo dia de praia e passeios em Itacaré.','[{"url": "/img casal/casal.jpg", "alt": "Duplo Twin — foto 1"}, {"url": "/img casal/casal1.jpg", "alt": "Duplo Twin — foto 2"}, {"url": "/img casal/casal2.jpg", "alt": "Duplo Twin — foto 3"}]'::jsonb,'[{"icon": "wifi", "label": "Wi-Fi de alta velocidade"}, {"icon": "tv", "label": "Smart TV com acesso a streaming"}, {"icon": "snow", "label": "Ar-condicionado Split silencioso"}, {"icon": "door-open", "label": "Varanda privativa com rede"}]'::jsonb);
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features) values('triplo',2,'Quarto Triplo','','Acomodação espaçosa ideal para pequenos grupos ou famílias. Desfrute de um ambiente arejado e bem iluminado, decorado para proporcionar a máxima sensação de relaxamento e acolhimento.','[{"url": "/img Pousada/quartotriplo.jpg", "alt": "Quarto Triplo — foto 1"}, {"url": "/img casal/triplo.jpg", "alt": "Quarto Triplo — foto 2"}, {"url": "/img casal/triplo1.jpg", "alt": "Quarto Triplo — foto 3"}]'::jsonb,'[{"icon": "wifi", "label": "Wi-Fi de alta velocidade"}, {"icon": "tv", "label": "Smart TV de ecrã plano"}, {"icon": "snow", "label": "Ar-condicionado Split"}, {"icon": "cup-hot", "label": "Frigobar abastecido"}]'::jsonb);
insert into lotus_private.room_showcases(slug,position,title,eyebrow,description,photos,features) values('familia',3,'Quarto Família','','A melhor escolha para quem viaja com toda a família. Amplo espaço interno garantindo conforto para adultos e crianças, com todas as comodidades necessárias para se sentirem em casa.','[{"url": "/img Pousada/FlordeLotus8.jpg", "alt": "Quarto Família — foto 1"}, {"url": "/img Pousada/FlordeLotus8.jpg", "alt": "Quarto Família — foto 2"}, {"url": "/img Pousada/FlordeLotus8.jpg", "alt": "Quarto Família — foto 3"}]'::jsonb,'[{"icon": "wifi", "label": "Wi-Fi de alta velocidade"}, {"icon": "tv", "label": "Smart TV com canais infantis"}, {"icon": "snow", "label": "Ar-condicionado Split potente"}, {"icon": "shield-check", "label": "Cofre eletrônico"}]'::jsonb);
