-- Keep editorial content separate from physical inventory, prices and bookings.
create table lotus_private.room_content_links (
 room_id bigint primary key references lotus_private.rooms(id) on delete cascade,
 showcase_slug text not null references lotus_private.room_showcases(slug)
);
create index room_content_links_showcase_idx on lotus_private.room_content_links(showcase_slug);
alter table lotus_private.room_content_links enable row level security;
revoke all on lotus_private.room_content_links from public,anon,authenticated;
create policy lotus_no_direct_room_content_access on lotus_private.room_content_links
 as restrictive for all to anon,authenticated using(false) with check(false);

create function lotus_private.room_catalog_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rid bigint; v_slug text;
begin
 if op not in ('catalog','availability','admin','save_room') then
  raise sqlstate 'PT404' using message='Operação não encontrada.';
 end if;
 -- Existing dispatcher enforces admin/session, date, rate and inventory rules.
 result:=lotus_private.dispatch(op,d);
 if op='save_room' then
  if d ? 'showcase_slug' then
   if jsonb_typeof(d->'showcase_slug') is distinct from 'string' then
    raise sqlstate 'PT400' using message='Escolha a apresentação do quarto.';
   end if;
   rid:=(result->>'id')::bigint; v_slug:=d->>'showcase_slug';
   if v_slug='' then delete from lotus_private.room_content_links where room_id=rid;
   else
    if not exists(select 1 from lotus_private.room_showcases where room_showcases.slug=v_slug) then
     raise sqlstate 'PT400' using message='Apresentação de quarto inválida.';
    end if;
    insert into lotus_private.room_content_links(room_id,showcase_slug) values(rid,v_slug)
    on conflict(room_id) do update set showcase_slug=excluded.showcase_slug;
   end if;
  end if;
  return result;
 end if;
 result:=jsonb_set(result,'{rooms}',coalesce((
  select jsonb_agg(item.value||jsonb_build_object(
   'showcase_slug',link.showcase_slug,
   'presentation_slug',coalesce(link.showcase_slug,case item.value->>'type'
    when 'familia' then 'familia' when 'casal_mais_um' then 'triplo-standard' else 'duplo' end)
  ) order by item.ordinality)
  from jsonb_array_elements(result->'rooms') with ordinality as item(value,ordinality)
  left join lotus_private.room_content_links link on link.room_id=(item.value->>'id')::bigint
 ),'[]'::jsonb));
 if op in ('catalog','admin') then
  result:=result||lotus_private.showcase_dispatch('read','{}'::jsonb);
 end if;
 return result;
end $$;
revoke all on function lotus_private.room_catalog_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.room_catalog_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_room_catalog_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.room_catalog_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_room_catalog_api(text,jsonb) from public;
grant execute on function public.lotus_room_catalog_api(text,jsonb) to anon,authenticated;

-- Rename only the unchanged default headings; preserve any administrator edits.
update lotus_private.room_showcases set title=case slug when 'duplo' then 'Quarto Standard' else 'Quarto Superior' end,
 revision=revision+1,updated_at=now()
 where (slug='duplo' and title='Quarto Duplo Standard') or (slug='triplo' and title='Quarto Duplo Superior');
