-- Editorial site content; independent of inventory, guests and reservations.
create table lotus_private.site_content (
 id boolean primary key default true check(id),
 content jsonb,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 check(content is null or (jsonb_typeof(content)='object' and octet_length(content::text)<=200000))
);
create table lotus_private.site_content_history (
 revision bigint primary key, content jsonb, published_at timestamptz not null
);
alter table lotus_private.site_content enable row level security;
alter table lotus_private.site_content_history enable row level security;
revoke all on lotus_private.site_content,lotus_private.site_content_history from public,anon,authenticated;
create policy lotus_no_direct_site_access on lotus_private.site_content as restrictive for all to anon,authenticated using(false) with check(false);
create policy lotus_no_direct_site_history on lotus_private.site_content_history as restrictive for all to anon,authenticated using(false) with check(false);
insert into lotus_private.site_content(id) values(true);
create function lotus_private.site_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rec lotus_private.site_content; clean jsonb; expected bigint; target bigint;
begin
 if op='read' then
  select * into rec from lotus_private.site_content where id;
  return jsonb_build_object('content',rec.content,'revision',rec.revision);
 end if;
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para editar o site.'; end if;
 if op='history' then
  return jsonb_build_object('versions',coalesce((select jsonb_agg(to_jsonb(x)) from (select revision,published_at from lotus_private.site_content_history order by revision desc limit 30)x),'[]'::jsonb));
 end if;
 if op not in ('save','restore') then raise sqlstate 'PT404' using message='Operação não encontrada.'; end if;
 expected:=lotus_private.int_value(d,'revision',1,9007199254740991);
 if op='save' then
  clean:=d->'content';
  if jsonb_typeof(clean) is distinct from 'object' or octet_length(clean::text)>200000
   or not(clean ?& array['branding','hero','about','gallery','rooms','leisure','beaches','reviews','contact','catalog','layout']) then
   raise sqlstate 'PT400' using message='Conteúdo do site inválido.';
  end if;
 else
  target:=lotus_private.int_value(d,'target',1,9007199254740991);
  select content into clean from lotus_private.site_content_history where revision=target;
  if not found then raise sqlstate 'PT404' using message='Versão não encontrada.'; end if;
 end if;
 select * into rec from lotus_private.site_content where id for update;
 if rec.revision<>expected then raise sqlstate 'PT409' using message='O site foi alterado em outra janela. Recarregue antes de publicar.'; end if;
 insert into lotus_private.site_content_history(revision,content,published_at) values(rec.revision,rec.content,rec.updated_at);
 update lotus_private.site_content set content=clean,revision=revision+1,updated_at=now() where id returning * into rec;
 delete from lotus_private.site_content_history where revision<rec.revision-30;
 return jsonb_build_object('content',rec.content,'revision',rec.revision);
end;
$$;
revoke all on function lotus_private.site_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.site_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_site_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.site_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_site_api(text,jsonb) from public;
grant execute on function public.lotus_site_api(text,jsonb) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
 'lotus-site','lotus-site',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
);
create policy lotus_admin_upload_site_media on storage.objects for insert to authenticated
 with check(bucket_id='lotus-site' and (select lotus_private.can_edit_showcases()));
