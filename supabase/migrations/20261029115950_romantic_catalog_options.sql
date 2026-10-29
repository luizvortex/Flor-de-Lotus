begin;
-- Text-only product cards are permitted; supplied photos still use the existing validator.
do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('lotus_private.romance_dispatch(text,jsonb)'::regprocedure);
 definition:=replace(definition, $old$p where p.active and p.photo<>'';$old$, $new$p where p.active;$new$);
 definition:=replace(definition, $old$if coalesce(d->>'photo','') !~$old$, $new$if coalesce(d->>'photo','')<>'' and coalesce(d->>'photo','') !~$new$);
 execute definition;
end $patch$;
-- Initial reference prices expressly supplied/authorized by the owner. Never replace existing products.
do $seed$
declare item jsonb;pid uuid;variant text;
begin
 for item in select value from jsonb_array_elements('[
 {"name":"Espumante","category":"brindes","price":9500,"variants":["Brut","Rosé","Moscatel"],"photos":0,"max":2},
 {"name":"Vinho","category":"brindes","price":7500,"variants":["Tinto seco","Tinto suave","Tinto doce","Branco seco","Branco suave","Branco doce","Rosé"],"photos":0,"max":2},
 {"name":"Bombons Ferrero Rocher","category":"delicias","price":5500,"variants":["Padrão"],"photos":0,"max":5},
 {"name":"Decoração com pétalas","category":"decoracao","price":8000,"variants":["Padrão"],"photos":0,"max":1},
 {"name":"Balões românticos","category":"decoracao","price":6500,"variants":["Padrão"],"photos":0,"max":1},
 {"name":"Porta-retrato personalizado","category":"lembrancas","price":4500,"variants":["Uma fotografia"],"photos":1,"max":1}
 ]'::jsonb) loop
  if exists(select 1 from lotus_private.romance_products where lower(name)=lower(item->>'name')) then continue;end if;
  insert into lotus_private.romance_products(name,category,description,active,max_quantity,photos_required,position)
  values(item->>'name',item->>'category','Valor inicial de referência. Opções e disponibilidade sujeitas à confirmação da pousada.',true,(item->>'max')::integer,(item->>'photos')::integer,coalesce((select max(position)+1 from lotus_private.romance_products),1)) returning id into pid;
  for variant in select jsonb_array_elements_text(item->'variants') loop
   insert into lotus_private.romance_variants(product_id,name,price,stock,active) values(pid,variant,(item->>'price')::bigint,null,true);
  end loop;
 end loop;
end $seed$;
commit;
