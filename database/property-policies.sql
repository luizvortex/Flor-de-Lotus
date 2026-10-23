-- Public editorial policies, independent from booking rules and guest data.
create table lotus_private.property_policies (
 id boolean primary key default true check(id),
 content jsonb not null check(jsonb_typeof(content)='object'),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table lotus_private.property_policies enable row level security;
revoke all on lotus_private.property_policies from public,anon,authenticated;
create policy lotus_no_direct_policy_access on lotus_private.property_policies
 as restrictive for all to anon,authenticated using(false) with check(false);
insert into lotus_private.property_policies(content) values (
 '{"checkin":"A partir das 14h.","checkout":"Até as 12h.","pets":"Aceitamos animais de estimação de pequeno porte.","internet":"Wi-Fi disponível gratuitamente para os hóspedes.","parking":"Estacionamento rotativo gratuito.","children":"","payments":"Aceitamos todas as formas de pagamento.","cancellation":"","reservations":"As solicitações de reserva ficam pendentes até a confirmação pela equipe da pousada.","additional":""}'::jsonb
);
create function lotus_private.policy_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rec lotus_private.property_policies; k text; clean jsonb:='{}'::jsonb; expected bigint;
 allowed text[]:=array['checkin','checkout','pets','internet','parking','children','payments','cancellation','reservations','additional'];
begin
 if op='read' then
  select * into rec from lotus_private.property_policies where id;
  return jsonb_build_object('policies',rec.content,'revision',rec.revision);
 end if;
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para editar as políticas.'; end if;
 if op<>'save' then raise sqlstate 'PT404' using message='Operação não encontrada.'; end if;
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'policies') is distinct from 'object' then
  raise sqlstate 'PT400' using message='Informe as políticas da pousada.';
 end if;
 expected:=lotus_private.int_value(d,'revision',1,9007199254740991);
 if exists(select 1 from jsonb_object_keys(d->'policies') x where not(x=any(allowed))) then
  raise sqlstate 'PT400' using message='Campo de política inválido.';
 end if;
 foreach k in array allowed loop
  if jsonb_typeof(d->'policies'->k) is distinct from 'string' or length(d->'policies'->>k)>1000 then
   raise sqlstate 'PT400' using message='Preencha cada política com até 1.000 caracteres.';
  end if;
  clean:=clean||jsonb_build_object(k,btrim(d->'policies'->>k));
 end loop;
 update lotus_private.property_policies set content=clean,revision=revision+1,updated_at=now()
 where id and revision=expected returning * into rec;
 if not found then raise sqlstate 'PT409' using message='As políticas foram alteradas em outra janela. Recarregue antes de salvar.'; end if;
 return jsonb_build_object('policies',rec.content,'revision',rec.revision);
end;
$$;
revoke all on function lotus_private.policy_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.policy_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_policy_api(p_operation text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.policy_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_policy_api(text,jsonb) from public;
grant execute on function public.lotus_policy_api(text,jsonb) to anon,authenticated;
