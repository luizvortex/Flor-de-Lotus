-- Shared administrative navigation preference; no public site content or guest data.
create table if not exists lotus_private.admin_ui_settings(
 singleton boolean primary key default true check(singleton),menu_order jsonb not null default '[]' check(jsonb_typeof(menu_order)='array'),revision integer not null default 0,updated_at timestamptz not null default now()
);
insert into lotus_private.admin_ui_settings(singleton) values(true) on conflict do nothing;
alter table lotus_private.admin_ui_settings enable row level security;
revoke all on lotus_private.admin_ui_settings from public,anon,authenticated;
drop policy if exists lotus_admin_ui_deny_direct on lotus_private.admin_ui_settings;
create policy lotus_admin_ui_deny_direct on lotus_private.admin_ui_settings as restrictive for all to anon,authenticated using(false) with check(false);
create or replace function lotus_private.admin_ui_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;wanted jsonb;expected bigint;allowed text[]:=array['overview','setup','site','experiences','reviews','rooms','showcases','policies','calendar','bookings','excursions','reports','rates','packages'];
begin
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para organizar o menu.';end if;
 if op='read' then
  select jsonb_build_object('order',menu_order,'revision',revision) into result from lotus_private.admin_ui_settings where singleton;return result;
 end if;
 if op<>'save' then raise sqlstate 'PT404' using message='Operação não encontrada.';end if;
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'order') is distinct from 'array' then raise sqlstate 'PT400' using message='Informe a ordem dos tópicos.';end if;
 wanted:=d->'order';
 if jsonb_array_length(wanted)<>cardinality(allowed) then raise sqlstate 'PT400' using message='Mantenha todos os tópicos no menu.';end if;
 if exists(select 1 from jsonb_array_elements(wanted) x where jsonb_typeof(x)<>'string' or not((x#>>'{}')=any(allowed))) or (select count(distinct x) from jsonb_array_elements(wanted) x)<>cardinality(allowed) then raise sqlstate 'PT400' using message='Há tópicos inválidos ou repetidos na ordem.';end if;
 expected:=lotus_private.int_value(d,'revision',0,2147483646);
 update lotus_private.admin_ui_settings set menu_order=wanted,revision=revision+1,updated_at=now() where singleton and revision=expected returning jsonb_build_object('order',menu_order,'revision',revision) into result;
 if not found then raise sqlstate 'PT409' using message='A ordem foi alterada em outra aba. Recarregue a ordem salva antes de editar novamente.';end if;
 return result;
end $$;
revoke all on function lotus_private.admin_ui_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.admin_ui_dispatch(text,jsonb) to authenticated;
create or replace function public.lotus_admin_ui_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.admin_ui_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_admin_ui_api(text,jsonb) from public,anon,authenticated;
grant execute on function public.lotus_admin_ui_api(text,jsonb) to authenticated;
