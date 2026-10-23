-- Keep administrative entries, require Google for all public database booking calls.
do $$declare definition text; old text; replacement text;begin
 definition:=pg_get_functiondef('lotus_private.dispatch(text,jsonb)'::regprocedure);
 old:=$old$  if op='book' then
$old$;
 replacement:=$new$  if op='book' then
    if not admin and not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com Google para finalizar sua reserva.'; end if;
$new$;
 if position(old in definition)=0 then raise exception 'Booking branch not found';end if;
 definition:=replace(definition,old,replacement);
 old:=$old$    return jsonb_build_object('id',bid,'status',st,'total',v_total);$old$;
 replacement:=$new$    if not admin then
      insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,auth.uid()) on conflict(booking_id) do nothing;
    end if;
    return jsonb_build_object('id',bid,'status',st,'total',v_total);$new$;
 if position(old in definition)=0 then raise exception 'Booking result not found';end if;
 execute replace(definition,old,replacement);
 definition:=pg_get_functiondef('lotus_private.guest_booking_dispatch(text,jsonb)'::regprocedure);
 old:='insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,uid);';
 if position(old in definition)=0 then raise exception 'Guest ownership branch not found';end if;
 execute replace(definition,old,'insert into lotus_private.booking_guest_links(booking_id,user_id) values(bid,uid) on conflict(booking_id) do nothing;');
end $$;
