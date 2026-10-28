begin;
create table lotus_private.romance_products(
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 category text not null check(category in ('brindes','delicias','decoracao','lembrancas')),
 description text not null default '' check(length(description)<=2000),photo text not null default '' check(length(photo)<=1500),
 active boolean not null default false,max_quantity integer not null default 1 check(max_quantity between 1 and 20),
 photos_required integer not null default 0 check(photos_required between 0 and 6),exclusive_group text not null default '' check(length(exclusive_group)<=50),
 position integer not null default 1 check(position between 1 and 1000),revision integer not null default 1);
create table lotus_private.romance_variants(
 id uuid primary key default gen_random_uuid(),product_id uuid not null references lotus_private.romance_products(id),
 name text not null check(length(name) between 1 and 100),price bigint not null check(price between 0 and 100000000),
 stock integer check(stock between 0 and 100000),active boolean not null default true);
create index romance_variants_product_idx on lotus_private.romance_variants(product_id);
create table lotus_private.romance_orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),booking_id bigint not null unique references lotus_private.bookings(id),
 request_id uuid not null,payload jsonb not null,items jsonb not null,stay_total bigint not null,decoration_total bigint not null,total bigint not null,
 instructions text not null default '' check(length(instructions)<=2000),preference text not null check(preference in ('terreo','superior','sem_preferencia')),
 operational text not null default 'aguardando_confirmacao' check(operational in ('aguardando_confirmacao','confirmado','em_preparacao','preparado','concluido','cancelado')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),revision integer not null default 1,
 privacy_accepted_at timestamptz not null default now(),external_reference text not null default '' check(length(external_reference)<=120),
 external_checked_at timestamptz,unique(user_id,request_id));
create index romance_orders_booking_idx on lotus_private.romance_orders(booking_id);
create index romance_orders_user_idx on lotus_private.romance_orders(user_id,created_at desc);
create table lotus_private.romance_uploads(
 id uuid primary key, user_id uuid not null references auth.users(id),request_id uuid not null,
 path text not null unique,order_id uuid references lotus_private.romance_orders(id),created_at timestamptz not null default now());
create index romance_uploads_user_idx on lotus_private.romance_uploads(user_id,request_id);
create index romance_uploads_order_idx on lotus_private.romance_uploads(order_id);
alter table lotus_private.romance_products enable row level security;
alter table lotus_private.romance_variants enable row level security;
alter table lotus_private.romance_orders enable row level security;
alter table lotus_private.romance_uploads enable row level security;
revoke all on lotus_private.romance_products,lotus_private.romance_variants,lotus_private.romance_orders,lotus_private.romance_uploads from public,anon,authenticated;
create policy romance_products_private on lotus_private.romance_products as restrictive for all to anon,authenticated using(false) with check(false);
create policy romance_variants_private on lotus_private.romance_variants as restrictive for all to anon,authenticated using(false) with check(false);
create policy romance_orders_private on lotus_private.romance_orders as restrictive for all to anon,authenticated using(false) with check(false);
create policy romance_uploads_private on lotus_private.romance_uploads as restrictive for all to anon,authenticated using(false) with check(false);

create function lotus_private.romance_quote(d jsonb) returns jsonb
language plpgsql set search_path='' as $$
#variable_conflict use_column
declare plan jsonb; item jsonb; p lotus_private.romance_products;v lotus_private.romance_variants;qty integer;subtotal bigint:=0;required integer:=0;
 lines jsonb:='[]';seen uuid[]:='{}';groups text[]:='{}';product_qty jsonb:='{}';running integer;pid text;party jsonb;
begin
 party:=lotus_private.normalize_party(d->'party');
 if jsonb_array_length(party)<>1 then raise sqlstate 'PT400' using message='Escolha um quarto para esta experiência.';end if;
 if lower(lotus_private.period(d))<(now() at time zone 'America/Bahia')::date then raise sqlstate 'PT400' using message='Escolha uma data de entrada futura.';end if;
 if coalesce(d->>'preference','sem_preferencia') not in ('sem_preferencia','terreo','superior') then raise sqlstate 'PT400' using message='Preferência de andar inválida.';end if;
 if coalesce(d->>'preference','sem_preferencia')<>'sem_preferencia' and d->>'preference'<>d->>'floor' then raise sqlstate 'PT400' using message='Escolha uma oferta no andar solicitado.';end if;
 plan:=lotus_private.party_plan(d,lotus_private.text_value(d,'category_slug'));
 if not coalesce((plan->>'available')::boolean,false) then raise sqlstate 'PT409' using message='O quarto não está mais disponível. Consulte novamente.';end if;
 if plan->>'total' is null or coalesce((plan->>'example')::boolean,true) then raise sqlstate 'PT409' using message='A pousada precisa confirmar a tarifa deste período.';end if;
 if jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items')>24 then raise sqlstate 'PT400' using message='Confira os adicionais selecionados.';end if;
 for item in select value from jsonb_array_elements(d->'items') loop
  select * into v from lotus_private.romance_variants where id=(item->>'variant_id')::uuid and active;
  if not found or v.id=any(seen) then raise sqlstate 'PT400' using message='Variante inválida ou repetida.';end if;
  select * into p from lotus_private.romance_products where id=v.product_id and active;
  if not found then raise sqlstate 'PT409' using message='Um dos adicionais não está mais disponível.';end if;
  qty:=lotus_private.int_value(item,'quantity',1,20);pid:=p.id::text;
  running:=coalesce((product_qty->>pid)::integer,0)+qty;
  if running>p.max_quantity or (v.stock is not null and qty>v.stock) then raise sqlstate 'PT409' using message='Quantidade indisponível para '||p.name||'.';end if;
  if p.exclusive_group<>'' and not(product_qty ? pid) then
   if p.exclusive_group=any(groups) then raise sqlstate 'PT400' using message='Esses itens de decoração não podem ser combinados.';end if;
   groups:=array_append(groups,p.exclusive_group);
  end if;
  product_qty:=jsonb_set(product_qty,array[pid],to_jsonb(running));seen:=array_append(seen,v.id);
  subtotal:=subtotal+v.price*qty;required:=required+p.photos_required*qty;
  if subtotal>100000000 or required>6 then raise sqlstate 'PT400' using message='O pedido excede os limites de adicionais ou fotografias.';end if;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',p.id,'variant_id',v.id,'name',p.name,'category',p.category,'variant',v.name,'quantity',qty,'unit_price',v.price,'stock_tracked',v.stock is not null,'total',v.price*qty));
 end loop;
 return jsonb_build_object('stay_total',plan->'total','decoration_total',subtotal,'total',(plan->>'total')::bigint+subtotal,'items',lines,'photos_required',required,'nights',plan->'nights','taxes',0,'discounts',0);
end $$;
revoke all on function lotus_private.romance_quote(jsonb) from public,anon,authenticated;

create function lotus_private.romance_dispatch(op text,d jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare result jsonb;q jsonb;o lotus_private.romance_orders;upload lotus_private.romance_uploads;p lotus_private.romance_products;
 item jsonb;v jsonb;pid uuid;vid uuid;rid uuid;file_id uuid;bid bigint;cnt integer;expected integer;paths jsonb;data jsonb;uid uuid:=auth.uid();
begin
 if op='catalog' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'description',p.description,'photo',p.photo,'max_quantity',p.max_quantity,'photos_required',p.photos_required,'exclusive_group',p.exclusive_group,'variants',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price,'stock',v.stock) order by v.name),'[]') from lotus_private.romance_variants v where v.product_id=p.id and v.active and (v.stock is null or v.stock>0))) order by p.position,p.name),'[]') into result from lotus_private.romance_products p where p.active and p.photo<>'';
  return jsonb_build_object('products',result,'booking_source','lotus','payment_available',false,'hqbeds_connected',false);
 end if;
 if op='quote' then return lotus_private.romance_quote(d);end if;
 if op like 'admin_%' then
  if not lotus_private.is_admin() then raise sqlstate 'PT401' using message='Entre no painel para gerenciar a decoração.';end if;
  if op='admin_products' then
   select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('variants',(select coalesce(jsonb_agg(to_jsonb(v) order by v.name),'[]') from lotus_private.romance_variants v where v.product_id=p.id)) order by p.position,p.name),'[]') into result from lotus_private.romance_products p;
   return jsonb_build_object('products',result);
  elsif op='admin_save' then
   pid:=coalesce(nullif(d->>'id','')::uuid,gen_random_uuid());
   perform pg_advisory_xact_lock(hashtextextended('romance.product.'||pid,0));
   select * into p from lotus_private.romance_products where id=pid for update;
   if found and p.revision<>lotus_private.int_value(d,'revision',1,1000000) then raise sqlstate 'PT409' using message='Este produto foi alterado. Atualize antes de salvar.';end if;
   if jsonb_typeof(d->'variants') is distinct from 'array' or jsonb_array_length(d->'variants') not between 1 and 16 then raise sqlstate 'PT400' using message='Cadastre de uma a dezesseis variantes.';end if;
   if coalesce(d->>'category','') not in ('brindes','delicias','decoracao','lembrancas') or jsonb_typeof(d->'active') is distinct from 'boolean' then raise sqlstate 'PT400' using message='Confira categoria e situação do produto.';end if;
   if coalesce(d->>'photo','') !~ '^(/(img[^/]*|images|media)/[^<>]+\.(jpg|jpeg|png|webp)|https://asojfispuomhbfapqdmi\.supabase\.co/storage/v1/object/public/(lotus-site|lotus-showcase)/[0-9a-f-]+\.(jpg|jpeg|png|webp))$' and (d->>'active')::boolean then raise sqlstate 'PT400' using message='Envie uma fotografia real antes de ativar o produto.';end if;
   if length(coalesce(d->>'description',''))>2000 or length(coalesce(d->>'exclusive_group',''))>50 then raise sqlstate 'PT400' using message='Confira a descrição e a compatibilidade.';end if;
   insert into lotus_private.romance_products(id,name,category,description,photo,active,max_quantity,photos_required,exclusive_group,position)
   values(pid,lotus_private.text_value(d,'name',120),d->>'category',coalesce(d->>'description',''),coalesce(d->>'photo',''),(d->>'active')::boolean,lotus_private.int_value(d,'max_quantity',1,20),lotus_private.int_value(d,'photos_required',0,6),coalesce(d->>'exclusive_group',''),lotus_private.int_value(d,'position',1,1000))
   on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,photo=excluded.photo,active=excluded.active,max_quantity=excluded.max_quantity,photos_required=excluded.photos_required,exclusive_group=excluded.exclusive_group,position=excluded.position,revision=romance_products.revision+1;
   -- Missing variants are disabled rather than deleted; order snapshots stay immutable.
   update lotus_private.romance_variants set active=false where product_id=pid;
   paths:='[]';
   for v in select value from jsonb_array_elements(d->'variants') loop
    vid:=coalesce(nullif(v->>'id','')::uuid,gen_random_uuid());
    if paths @> jsonb_build_array(vid) then raise sqlstate 'PT400' using message='Variante repetida.';end if;paths:=paths||jsonb_build_array(vid);
    if exists(select 1 from lotus_private.romance_variants where id=vid and product_id<>pid) then raise sqlstate 'PT400' using message='Variante de outro produto.';end if;
    if jsonb_typeof(v->'active') is distinct from 'boolean' then raise sqlstate 'PT400' using message='Confira a situação da variante.';end if;
    insert into lotus_private.romance_variants(id,product_id,name,price,stock,active) values(vid,pid,lotus_private.text_value(v,'name',100),lotus_private.int_value(v,'price',0,100000000),case when v->>'stock' is null then null else lotus_private.int_value(v,'stock',0,100000) end,(v->>'active')::boolean)
    on conflict(id) do update set name=excluded.name,price=excluded.price,stock=excluded.stock,active=excluded.active;
   end loop;
   return jsonb_build_object('id',pid);
  elsif op in ('admin_purge_paths','admin_purge_finish') then
   select * into o from lotus_private.romance_orders where id=(d->>'id')::uuid for update;
   if not found then raise sqlstate 'PT404' using message='Pedido não encontrado.';end if;
   if o.operational not in ('concluido','cancelado') then raise sqlstate 'PT409' using message='Conclua ou cancele a preparação antes de excluir as fotos pessoais.';end if;
   if op='admin_purge_finish' then
    if exists(select 1 from lotus_private.romance_uploads u join storage.objects so on so.bucket_id='lotus-romance-private' and so.name=u.path where u.order_id=o.id) then raise sqlstate 'PT409' using message='Ainda há fotografias no armazenamento. Tente a exclusão novamente.';end if;
    delete from lotus_private.romance_uploads where order_id=o.id;
    return jsonb_build_object('ok',true);
   end if;
   return jsonb_build_object('paths',(select coalesce(jsonb_agg(path),'[]') from lotus_private.romance_uploads where order_id=o.id));
  elsif op='admin_orders' then
   select coalesce(jsonb_agg(to_jsonb(o)-'payload'-'user_id'||jsonb_build_object('guest',b.guest,'phone',b.phone,'start',b.start,'end',b."end",'booking_status',b.status,'room_name',case when b.room_assigned then r.name else 'A definir pela pousada' end,'floor',b.room_floor,'financial',case when coalesce(received.amount,0)>=o.total then 'recebido' when coalesce(received.amount,0)>0 then 'parcial' else 'aguardando' end,'received',coalesce(received.amount,0),'photos',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id)),'[]') from lotus_private.romance_uploads u where u.order_id=o.id)) order by b.start,o.created_at),'[]') into result from lotus_private.romance_orders o join lotus_private.bookings b on b.id=o.booking_id join lotus_private.rooms r on r.id=b.room_id left join lateral(select sum(amount) amount from lotus_private.receipts where booking_id=b.id and voided_at is null) received on true;
   return jsonb_build_object('orders',result);
  elsif op='admin_status' then
   select * into o from lotus_private.romance_orders where id=(d->>'id')::uuid for update;
   if not found then raise sqlstate 'PT404' using message='Pedido não encontrado.';end if;
   if o.revision<>lotus_private.int_value(d,'revision',1,1000000) then raise sqlstate 'PT409' using message='O pedido mudou. Atualize a lista.';end if;
   if coalesce(d->>'operational','') not in ('aguardando_confirmacao','confirmado','em_preparacao','preparado','concluido','cancelado') then raise sqlstate 'PT400' using message='Situação inválida.';end if;
   if o.operational='cancelado' and d->>'operational'<>'cancelado' then raise sqlstate 'PT409' using message='Crie uma nova reserva para uma experiência cancelada.';end if;
   if d->>'operational' in ('confirmado','em_preparacao','preparado','concluido') and not exists(select 1 from lotus_private.bookings where id=o.booking_id and status='confirmada') then raise sqlstate 'PT409' using message='Atribua o quarto e confirme a hospedagem antes de preparar a decoração.';end if;
   if d->>'operational'='cancelado' then update lotus_private.bookings set status='cancelada' where id=o.booking_id and status<>'cancelada';end if;
   update lotus_private.romance_orders set operational=d->>'operational',external_reference=left(coalesce(d->>'external_reference',external_reference),120),external_checked_at=case when coalesce(d->>'external_reference','')<>'' then now() else null end,revision=revision+1,updated_at=now() where id=o.id;
   return jsonb_build_object('ok',true);
  end if;
 end if;
 if op='file_access' and lotus_private.is_admin() then
  select * into upload from lotus_private.romance_uploads where id=(d->>'id')::uuid;
  if not found then raise sqlstate 'PT404' using message='Foto não encontrada.';end if;
  return jsonb_build_object('path',upload.path);
 end if;
 if not lotus_private.guest_session_valid() then raise sqlstate 'PT401' using message='Entre com Google para personalizar sua reserva.';end if;
 if op in ('upload_register','draft','book') then rid:=(d->>'request_id')::uuid;if rid is null then raise sqlstate 'PT400' using message='Atualize a experiência.';end if;end if;
 if op='upload_register' then
  perform pg_advisory_xact_lock(hashtextextended('romance.upload.'||uid,0));
  if exists(select 1 from lotus_private.romance_orders where user_id=uid and request_id=rid) then raise sqlstate 'PT409' using message='A reserva já foi enviada.';end if;
  if (select count(*) from lotus_private.romance_uploads where user_id=uid and order_id is null)>=6 then raise sqlstate 'PT400' using message='Remova uma foto pendente antes de enviar outra. Limite de seis fotos.';end if;
  if coalesce(d->>'extension','') not in ('jpg','png','webp') then raise sqlstate 'PT400' using message='Formato de foto inválido.';end if;
  file_id:=gen_random_uuid();
  insert into lotus_private.romance_uploads(id,user_id,request_id,path) values(file_id,uid,rid,uid||'/'||file_id||'.'||(d->>'extension')) returning * into upload;
  return jsonb_build_object('id',file_id,'path',upload.path);
 elsif op='upload_remove' then
  select * into upload from lotus_private.romance_uploads where id=(d->>'id')::uuid and user_id=uid and order_id is null for update;
  if not found then raise sqlstate 'PT404' using message='Foto não encontrada ou já vinculada à reserva.';end if;
  delete from lotus_private.romance_uploads where id=upload.id;
  return jsonb_build_object('ok',true);
 elsif op='file_access' then
  select * into upload from lotus_private.romance_uploads where id=(d->>'id')::uuid and user_id=uid;
  if not found then raise sqlstate 'PT404' using message='Foto não encontrada.';end if;
  return jsonb_build_object('path',upload.path);
 elsif op='draft' then
  select * into o from lotus_private.romance_orders where user_id=uid and request_id=rid;
  return jsonb_build_object('order',case when o.id is null then null else jsonb_build_object('id',o.id,'booking_id',o.booking_id,'total',o.total,'operational',o.operational) end,'orphan_photos',(select coalesce(jsonb_agg(jsonb_build_object('id',id)),'[]') from lotus_private.romance_uploads where user_id=uid and request_id<>rid and order_id is null),'photos',(select coalesce(jsonb_agg(jsonb_build_object('id',id)),'[]') from lotus_private.romance_uploads where user_id=uid and request_id=rid and order_id is null));
 elsif op='mine' then
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'booking_id',o.booking_id,'stay_total',o.stay_total,'decoration_total',o.decoration_total,'total',o.total,'items',o.items,'instructions',o.instructions,'operational',o.operational,'booking_status',b.status,'start',b.start,'end',b."end",'photos',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id)),'[]') from lotus_private.romance_uploads u where u.order_id=o.id)) order by o.created_at desc),'[]') into result from lotus_private.romance_orders o join lotus_private.bookings b on b.id=o.booking_id where o.user_id=uid;
  return jsonb_build_object('orders',result);
 elsif op='book' then
  perform pg_advisory_xact_lock(hashtextextended('romance.request.'||uid||rid,0));
  select * into o from lotus_private.romance_orders where user_id=uid and request_id=rid;
  if found then
   if o.payload<>d then raise sqlstate 'PT409' using message='Este envio já foi usado com outros dados. Consulte sua reserva antes de iniciar outra experiência.';end if;
   return jsonb_build_object('id',o.id,'booking_id',o.booking_id,'total',o.total,'status','pendente','replayed',true);
  end if;
  if coalesce(d->>'phone','') !~ '^[0-9()+ .-]{8,40}$' or length(regexp_replace(coalesce(d->>'phone',''),'[^0-9]','','g')) not between 10 and 15 then raise sqlstate 'PT400' using message='Informe um telefone válido com DDD.';end if;
  if d->'privacy_accepted'<>'true'::jsonb or d->'privacy_accepted' is null then raise sqlstate 'PT400' using message='Autorize o uso das fotos e instruções para preparar sua experiência.';end if;
  perform pg_advisory_xact_lock(hashtextextended('romance.catalog',0));
  perform 1 from lotus_private.romance_products order by id for update;
  perform 1 from lotus_private.romance_variants order by id for update;
  q:=lotus_private.romance_quote(d);
  if d->'expected_items' is distinct from q->'items' then raise sqlstate 'PT409' using message='Os adicionais mudaram. Revise o resumo antes de finalizar.';end if;
  if jsonb_array_length(q->'items')=0 then raise sqlstate 'PT400' using message='Selecione pelo menos um adicional disponível.';end if;
  if (q->>'total')::bigint<>lotus_private.int_value(d,'expected_total',0,100000000) then raise sqlstate 'PT409' using message='O valor mudou. Revise o resumo antes de finalizar.';end if;
  if jsonb_typeof(d->'photos') is distinct from 'array' or jsonb_array_length(d->'photos')<>(q->>'photos_required')::integer then raise sqlstate 'PT400' using message='Envie a quantidade de fotografias solicitada pelos itens selecionados.';end if;
  if length(coalesce(d->>'instructions',''))>2000 then raise sqlstate 'PT400' using message='Use até 2000 caracteres nas instruções.';end if;
  select count(distinct u.id) into cnt from lotus_private.romance_uploads u join storage.objects so on so.bucket_id='lotus-romance-private' and so.name=u.path where u.user_id=uid and u.request_id=rid and u.order_id is null and (so.metadata->>'size')::bigint between 1 and 3145728 and so.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp') and to_jsonb(u.id) in (select value from jsonb_array_elements(d->'photos'));
  if cnt<>jsonb_array_length(d->'photos') then raise sqlstate 'PT400' using message='Uma foto ainda não foi enviada ou não pertence a esta experiência.';end if;
  result:=lotus_private.party_guest_dispatch('book',(d-'expected_total')||jsonb_build_object('expected_total',q->'stay_total'));
  bid:=(result->>'id')::bigint;
  insert into lotus_private.romance_orders(user_id,booking_id,request_id,payload,items,stay_total,decoration_total,total,instructions,preference)
   values(uid,bid,rid,d,q->'items',(q->>'stay_total')::bigint,(q->>'decoration_total')::bigint,(q->>'total')::bigint,coalesce(d->>'instructions',''),coalesce(d->>'preference','sem_preferencia')) returning * into o;
  update lotus_private.bookings set total=o.total where id=bid;
  update lotus_private.romance_uploads set order_id=o.id where user_id=uid and request_id=rid and to_jsonb(id) in (select value from jsonb_array_elements(d->'photos'));
  for item in select value from jsonb_array_elements(q->'items') loop update lotus_private.romance_variants set stock=stock-(item->>'quantity')::integer where id=(item->>'variant_id')::uuid and stock is not null;end loop;
  return jsonb_build_object('id',o.id,'booking_id',bid,'total',o.total,'stay_total',o.stay_total,'decoration_total',o.decoration_total,'status','pendente');
 end if;
 raise sqlstate 'PT404' using message='Operação não encontrada.';
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then raise sqlstate 'PT400' using message='Confira os dados da experiência e tente novamente.';
end $$;
revoke all on function lotus_private.romance_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function lotus_private.romance_dispatch(text,jsonb) to anon,authenticated;
create function public.lotus_romance_api(p_operation text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select lotus_private.romance_dispatch(p_operation,p_data);$$;
revoke all on function public.lotus_romance_api(text,jsonb) from public;
grant execute on function public.lotus_romance_api(text,jsonb) to anon,authenticated;

create function lotus_private.romance_booking_cancel() returns trigger language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare o lotus_private.romance_orders;item jsonb;
begin
 if old.status='cancelada' and new.status<>'cancelada' and exists(select 1 from lotus_private.romance_orders where booking_id=old.id) then raise sqlstate 'PT409' using message='Uma experiência cancelada exige nova reserva.';end if;
 if new.status='cancelada' and old.status<>'cancelada' then
  select * into o from lotus_private.romance_orders where booking_id=new.id for update;
  if found and o.operational<>'cancelado' then
   for item in select value from jsonb_array_elements(o.items) loop update lotus_private.romance_variants set stock=stock+(item->>'quantity')::integer where id=(item->>'variant_id')::uuid and stock is not null and coalesce((item->>'stock_tracked')::boolean,false);end loop;
   update lotus_private.romance_orders set operational='cancelado',revision=revision+1,updated_at=now() where id=o.id;
  end if;
 end if;
 return new;
end $$;
revoke all on function lotus_private.romance_booking_cancel() from public,anon,authenticated;
create trigger romance_booking_cancel after update of status on lotus_private.bookings for each row execute function lotus_private.romance_booking_cancel();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('lotus-romance-private','lotus-romance-private',false,3145728,array['image/jpeg','image/png','image/webp']);
create function lotus_private.romance_storage_access(object_path text,writing boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select (not writing and lotus_private.is_admin()) or (lotus_private.guest_session_valid() and exists(select 1 from lotus_private.romance_uploads u where u.path=object_path and u.user_id=auth.uid() and (not writing or (u.order_id is null and u.created_at>now()-interval '24 hours'))));
$$;
revoke all on function lotus_private.romance_storage_access(text,boolean) from public,anon,authenticated;
grant execute on function lotus_private.romance_storage_access(text,boolean) to authenticated;
create policy romance_private_read on storage.objects for select to authenticated using(bucket_id='lotus-romance-private' and lotus_private.romance_storage_access(name,false));
create policy romance_private_upload on storage.objects for insert to authenticated with check(bucket_id='lotus-romance-private' and lotus_private.romance_storage_access(name,true));
create policy romance_private_remove on storage.objects for delete to authenticated using(bucket_id='lotus-romance-private' and lotus_private.romance_storage_access(name,true));
create function lotus_private.romance_can_purge(object_path text) returns boolean language sql stable security definer set search_path='' as $$select lotus_private.is_admin() and exists(select 1 from lotus_private.romance_uploads u join lotus_private.romance_orders o on o.id=u.order_id where u.path=object_path and o.operational in ('concluido','cancelado'));$$;
revoke all on function lotus_private.romance_can_purge(text) from public,anon,authenticated;
grant execute on function lotus_private.romance_can_purge(text) to authenticated;
create policy romance_private_retention on storage.objects for delete to authenticated using(bucket_id='lotus-romance-private' and lotus_private.romance_can_purge(name));
commit;
