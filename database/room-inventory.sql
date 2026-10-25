-- Physical units are independent stock. Apply once after room-catalog.sql and guest-bookings.sql.
-- Keeps booking ids, prices, guest links, exclusion constraints, RLS and Google checks.
alter table lotus_private.rooms add column if not exists floor text not null default 'nao_informado' check(floor in ('terreo','superior','nao_informado'));
alter table lotus_private.rooms add column if not exists family_enabled boolean not null default false;
alter table lotus_private.bookings add column if not exists room_floor text check(room_floor in ('terreo','superior','nao_informado'));
alter table lotus_private.rooms drop constraint if exists rooms_type_check;
alter table lotus_private.rooms add constraint rooms_type_check check(type in ('solteiro','casal','casal_mais_um','quadruplo','familia'));
alter table lotus_private.rooms drop constraint if exists rooms_check;
alter table lotus_private.rooms add constraint rooms_check check(capacity>=case type when 'casal' then 2 when 'casal_mais_um' then 3 when 'quadruplo' then 4 else 1 end);
alter table lotus_private.packages drop constraint if exists packages_type_check;
alter table lotus_private.packages add constraint packages_type_check check(type in ('solteiro','casal','casal_mais_um','quadruplo','familia'));

-- Extend the installed dispatcher in place, retaining its current auth and guest ownership logic.
do $patch$
declare fn text:=pg_get_functiondef('lotus_private.dispatch(text,jsonb)'::regprocedure);
begin
 if position('v_floor text' in fn)=0 then
  assert position('v_total bigint; result jsonb' in fn)>0,'Unexpected dispatcher version';
  fn:=replace(fn,'v_total bigint; result jsonb','v_floor text; v_family boolean; v_total bigint; result jsonb');
  fn:=replace(fn,$lit$('solteiro','casal','casal_mais_um','familia')$lit$,$lit$('solteiro','casal','casal_mais_um','quadruplo','familia')$lit$);
  fn:=replace(fn,$lit$when 'casal_mais_um' then 3 else 1 end$lit$,$lit$when 'casal_mais_um' then 3 when 'quadruplo' then 4 else 1 end$lit$);
  assert position($lit$dates := lotus_private.period(d);$lit$ in fn)>0,'Missing period validation';
  fn:=replace(fn,'dates := lotus_private.period(d);', $sql$
    if coalesce(d->>'floor','') not in ('','terreo','superior') then
      raise sqlstate 'PT400' using message='Selecione térreo, piso superior ou sem preferência.';
    end if;
    dates := lotus_private.period(d);$sql$);
  fn:=replace(fn,'where active=1 and capacity>=g order by id loop',$lit$where active=1 and capacity>=g and (coalesce(d->>'floor','')='' or floor=d->>'floor') order by id loop$lit$);
  assert position($lit$cap:=lotus_private.int_value(d,'capacity',1,20);$lit$ in fn)>0,'Missing capacity validation';
  fn:=replace(fn,$lit$cap:=lotus_private.int_value(d,'capacity',1,20);$lit$,$sql$
      cap:=lotus_private.int_value(d,'capacity',1,20);
      perform pg_advisory_xact_lock(hashtextextended('lotus.room.family',0));
      v_floor:=coalesce(d->>'floor',(select x.floor from lotus_private.rooms x where x.id=rid),'nao_informado');
      if v_floor not in ('terreo','superior','nao_informado') then raise sqlstate 'PT400' using message='Andar inválido.'; end if;
      if d ? 'family_enabled' and jsonb_typeof(d->'family_enabled') is distinct from 'boolean' then raise sqlstate 'PT400' using message='Confira a configuração família.'; end if;
      v_family:=coalesce((d->>'family_enabled')::boolean,(select x.family_enabled from lotus_private.rooms x where x.id=rid),false);
      if kind='familia' and not v_family then raise sqlstate 'PT400' using message='Marque esta unidade como apta para família antes de usar essa configuração.'; end if;
      if v_family and (select count(*) from lotus_private.rooms x where x.family_enabled and x.id is distinct from rid)>=2 then
        raise sqlstate 'PT400' using message='A pousada possui duas unidades aptas para família. Desmarque outra unidade antes de trocar.';
      end if;$sql$);
  fn:=replace(fn,'insert into lotus_private.rooms(name,type,capacity,price,active) values(nm,kind,cap,v_price,v_active)',
    'insert into lotus_private.rooms(name,type,capacity,price,active,floor,family_enabled) values(nm,kind,cap,v_price,v_active,v_floor,v_family)');
  fn:=replace(fn,'set name=nm,type=kind,capacity=cap,price=v_price,active=v_active where id=rid;',
    'set name=nm,type=kind,capacity=cap,price=v_price,active=v_active,floor=v_floor,family_enabled=v_family where id=rid;');
  assert position($lit$if pid is not null then perform 1 from lotus_private.packages where id=pid for share; end if;$lit$ in fn)>0,'Missing booking lock';
  fn:=replace(fn,'if pid is not null then perform 1 from lotus_private.packages where id=pid for share; end if;',$sql$
    if coalesce(d->>'floor','')<>'' and r.floor<>d->>'floor' then raise sqlstate 'PT409' using message='O andar desta unidade mudou. Atualize a consulta antes de reservar.'; end if;
    if pid is not null then perform 1 from lotus_private.packages where id=pid for share; end if;$sql$);
  fn:=replace(fn,'status,total,package_id)'||chr(10)||'      values(rid,v_guest,v_phone,lower(dates),upper(dates),g,st,v_total,pid)',
    'status,total,package_id,room_floor)'||chr(10)||'      values(rid,v_guest,v_phone,lower(dates),upper(dates),g,st,v_total,pid,r.floor)');
  fn:=replace(fn,$lit$jsonb_build_object('id',bid,'status',st,'total',v_total)$lit$,$lit$jsonb_build_object('id',bid,'status',st,'total',v_total,'floor',r.floor)$lit$);
  assert position('room_floor)' in fn)>0 and position('guest_session_valid()' in fn)>0,'Booking protections must remain installed';
  execute fn;
 end if;
 fn:=pg_get_functiondef('lotus_private.guest_booking_dispatch(text,jsonb)'::regprocedure);
 if position($lit$'floor',coalesce(b.room_floor,r.floor)$lit$ in fn)=0 then
  assert position($lit$'room_type',r.type,'presentation',s.title,$lit$ in fn)>0,'Unexpected guest reader';
  fn:=replace(fn,$lit$'room_type',r.type,'presentation',s.title,$lit$,$lit$'room_type',r.type,'presentation',s.title,'floor',coalesce(b.room_floor,r.floor),$lit$);execute fn;
 end if;
end $patch$;
