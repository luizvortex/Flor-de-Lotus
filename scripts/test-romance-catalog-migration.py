"""Verify authorized initial catalog in a disposable local DB; never uses Supabase."""
import subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
container='lotus-romance-test';db='romance_catalog_'+str(int(time.time()))
base=(root/'work/romance-test-database.txt').read_text().strip()
command=['docker','--host=unix:///var/run/docker.sock','exec','-i',container]
def sql(body):
 r=subprocess.run(command+['psql','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],input=body,text=True,capture_output=True)
 assert r.returncode==0,r.stderr
 return r.stdout
subprocess.run(command+['createdb','-U','postgres','-T',base,db],check=True)
try:
 migration=(root/'supabase/migrations/20261029115950_romantic_catalog_options.sql').read_text()
 sql(migration)
 sql("""do $$ begin
 assert (select count(*)=6 from lotus_private.romance_products);
 assert (select count(*)=14 from lotus_private.romance_variants);
 assert jsonb_array_length(public.lotus_romance_api('catalog')->'products')=6;
 assert (select count(*)=3 from lotus_private.romance_variants v join lotus_private.romance_products p on p.id=v.product_id where p.name='Espumante' and v.price=9500);
 assert (select count(*)=7 from lotus_private.romance_variants v join lotus_private.romance_products p on p.id=v.product_id where p.name='Vinho' and v.price=7500);
 assert (select photos_required=1 from lotus_private.romance_products where name='Porta-retrato personalizado');
 assert not exists(select 1 from lotus_private.romance_orders);
 end $$; update lotus_private.romance_variants set price=12345 where product_id=(select id from lotus_private.romance_products where name='Espumante');""")
 sql(migration)
 sql("do $$ begin assert (select count(*)=6 from lotus_private.romance_products);assert (select count(*)=3 from lotus_private.romance_variants v join lotus_private.romance_products p on p.id=v.product_id where p.name='Espumante' and v.price=12345);end $$;")
 print('PASS: six products, fourteen variants, authorized prices, text-only public catalog, photo personalization and non-destructive repeat.')
finally:
 subprocess.run(command+['dropdb','-U','postgres','--force',db],check=True)
