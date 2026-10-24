-- Structured property times. Existing policies and reservations are preserved.
create or replace function lotus_private.property_time(kind text) returns time
language sql stable security invoker set search_path='' as $$
 select coalesce((select (content->>(kind||'_time'))::time from lotus_private.property_policies where id),case kind when 'checkout' then time '12:00' else time '14:00' end);
$$;
revoke all on function lotus_private.property_time(text) from public,anon,authenticated;
create or replace function lotus_private.policy_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rec lotus_private.property_policies; k text; clean jsonb:='{}'::jsonb; expected bigint;
 allowed text[]:=array['checkin','checkout','pets','internet','parking','children','payments','cancellation','reservations','additional'];
begin
 if op='read' then
  select * into rec from lotus_private.property_policies where id;
  return jsonb_build_object('policies',rec.content||jsonb_build_object('checkin_time',to_char(lotus_private.property_time('checkin'),'HH24:MI'),'checkout_time',to_char(lotus_private.property_time('checkout'),'HH24:MI')),'revision',rec.revision);
 end if;
 if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para editar as políticas.'; end if;
 if op<>'save' then raise sqlstate 'PT404' using message='Operação não encontrada.'; end if;
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'policies') is distinct from 'object' then
  raise sqlstate 'PT400' using message='Informe as políticas da pousada.';
 end if;
 expected:=lotus_private.int_value(d,'revision',1,9007199254740991);
 if exists(select 1 from jsonb_object_keys(d->'policies') x where not(x=any(allowed||array['checkin_time','checkout_time']))) then
  raise sqlstate 'PT400' using message='Campo de política inválido.';
 end if;
 foreach k in array allowed loop
  if jsonb_typeof(d->'policies'->k) is distinct from 'string' or length(d->'policies'->>k)>1000 then
   raise sqlstate 'PT400' using message='Preencha cada política com até 1.000 caracteres.';
  end if;
  clean:=clean||jsonb_build_object(k,btrim(d->'policies'->>k));
 end loop;
 select * into rec from lotus_private.property_policies where id for update;
 if rec.revision<>expected then raise sqlstate 'PT409' using message='As políticas foram alteradas em outra janela. Recarregue antes de salvar.'; end if;
 foreach k in array array['checkin_time','checkout_time'] loop
  if d->'policies' ? k and (jsonb_typeof(d->'policies'->k) is distinct from 'string' or (d->'policies'->>k) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
   raise sqlstate 'PT400' using message='Use horários válidos no formato HH:MM.';
  end if;
  clean:=clean||jsonb_build_object(k,coalesce(d->'policies'->>k,rec.content->>k,case k when 'checkin_time' then '14:00' else '12:00' end));
 end loop;
 -- Explicit time edits keep the displayed policy aligned with the reminders.
 if d->'policies' ? 'checkin_time' then clean:=clean||jsonb_build_object('checkin',rtrim('A partir das '||replace(clean->>'checkin_time',':','h')||'.'||E'\n'||regexp_replace(clean->>'checkin','^A partir das [0-9]{1,2}(h|:)[0-9]{0,2}\.[[:space:]]*','','i'), E'\n\r\t '));end if;
 if d->'policies' ? 'checkout_time' then clean:=clean||jsonb_build_object('checkout',rtrim('Até as '||replace(clean->>'checkout_time',':','h')||'.'||E'\n'||regexp_replace(clean->>'checkout','^Até as [0-9]{1,2}(h|:)[0-9]{0,2}\.[[:space:]]*','','i'), E'\n\r\t '));end if;
 update lotus_private.property_policies set content=clean,revision=revision+1,updated_at=now()
 where id and revision=expected returning * into rec;
 if not found then raise sqlstate 'PT409' using message='As políticas foram alteradas em outra janela. Recarregue antes de salvar.'; end if;
 return jsonb_build_object('policies',rec.content,'revision',rec.revision);
end;
$$;

-- Update the existing, permission-checked functions without changing their ACLs.
do $migration$
declare row record; definition text;
begin
 for row in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='lotus_private' and p.proname in ('refresh_guest_reminders','guest_booking_dispatch','guest_reminder_changed') loop
  definition:=pg_get_functiondef(row.oid);
  definition:=replace(definition,'time ''14:00''','lotus_private.property_time(''checkin'')');
  definition:=replace(definition,'time ''12:00''','lotus_private.property_time(''checkout'')');
  definition:=replace(definition,'''checkin_time'',''14:00'',''checkout_time'',''12:00''','''checkin_time'',to_char(lotus_private.property_time(''checkin''),''HH24:MI''),''checkout_time'',to_char(lotus_private.property_time(''checkout''),''HH24:MI'')');
  execute definition;
 end loop;
end $migration$;
create or replace function lotus_private.property_hours_changed() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if (old.content->>'checkin_time') is distinct from (new.content->>'checkin_time') then
  perform lotus_private.refresh_guest_reminders();
  update lotus_private.guest_reminder_deliveries d set status='cancelled'
  from lotus_private.guest_notifications n join lotus_private.bookings b on b.id=n.booking_id
  where d.notification_id=n.id and d.status in ('awaiting_setup','pending','failed')
   and n.checkin_at is distinct from (b.start+lotus_private.property_time('checkin')) at time zone 'America/Bahia';
 end if;
 return null;
end $$;
revoke all on function lotus_private.property_hours_changed() from public,anon,authenticated;
drop trigger if exists lotus_property_hours_changed on lotus_private.property_policies;
create trigger lotus_property_hours_changed after update of content on lotus_private.property_policies for each row execute function lotus_private.property_hours_changed();
