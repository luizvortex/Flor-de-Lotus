"""Concurrent transactions in the dedicated local PostgreSQL container only."""
import concurrent.futures,json,subprocess,uuid,time
from pathlib import Path
CONTAINER='lotus-romance-test';DB='romance_races_'+str(int(time.time()))
base=Path('work/romance-test-database.txt').read_text().strip()
subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec',CONTAINER,'createdb','-U','postgres','-T',base,DB],check=True)
def literal(value):return "'"+str(value).replace("'","''")+"'"
def sql(script):
 return subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec','-i',CONTAINER,'psql','-U','postgres','-d',DB,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],input=script,text=True,capture_output=True)
for same_request in [True,False]:
 user,session,product,variant,request=[str(uuid.uuid4()) for _ in range(5)]
 setup=f"""begin;
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('{user}','authenticated','authenticated','{user}@example.invalid',now(),'{{}}','{{}}',now(),now());
 insert into auth.identities(provider_id,user_id,identity_data,provider) values('{user}','{user}','{{}}','google');
 insert into auth.sessions(id,user_id,created_at,updated_at) values('{session}','{user}',now(),now());
 insert into lotus_private.admin_users(user_id) values('{user}');
 select set_config('request.jwt.claims','{{"sub":"{user}","session_id":"{session}","role":"authenticated"}}',true);
 insert into lotus_private.rooms(name,type,capacity,price,active,floor) values('race-{user}-1','casal',2,20000,1,'terreo'),('race-{user}-2','casal',2,20000,1,'terreo');
 insert into lotus_private.occupancy_rates(floor,guests,amount) values('terreo',2,20000) on conflict(floor,guests) where start is null do update set amount=excluded.amount,example=false;
 select public.lotus_romance_api('admin_save',jsonb_build_object('id','{product}','name','Synthetic race item','category','delicias','photo','/img casal/casal.jpg','active',true,'max_quantity',1,'photos_required',0,'position',1,'variants',jsonb_build_array(jsonb_build_object('id','{variant}','name','Test','price',1000,'stock',1,'active',true))));
 delete from lotus_private.admin_users where user_id='{user}';
 select jsonb_build_object('start',(now() at time zone 'America/Bahia')::date+500,'end',(now() at time zone 'America/Bahia')::date+501,'floor','terreo','preference','sem_preferencia','category_slug','duplo','party',jsonb_build_array(jsonb_build_object('adults',2,'children_ages','[]'::jsonb)),'guests',2,'items',jsonb_build_array(jsonb_build_object('variant_id','{variant}','quantity',1)),'guest','Synthetic concurrent guest','phone','73999999999','photos','[]'::jsonb,'instructions','','privacy_accepted',true,'expected_total',21000,'expected_items',jsonb_build_array(jsonb_build_object('product_id','{product}','variant_id','{variant}','name','Synthetic race item','category','delicias','variant','Test','quantity',1,'unit_price',1000,'stock_tracked',true,'total',1000)));
 commit;"""
 result=sql(setup);assert result.returncode==0,result.stderr
 payload=json.loads([line for line in result.stdout.splitlines() if line.startswith('{')][-1])
 def worker(index):
  body=dict(payload,request_id=request if same_request or index==0 else str(uuid.uuid4()))
  claims=json.dumps({'sub':user,'session_id':session,'role':'authenticated'})
  return sql(f"begin;select set_config('request.jwt.claims',{literal(claims)},true);set local role authenticated;select public.lotus_romance_api('book',{literal(json.dumps(body))}::jsonb);select pg_sleep(0.2);commit;")
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(worker,[0,1]))
 if same_request:assert all(r.returncode==0 for r in results),[r.stderr for r in results]
 else:assert sum(r.returncode==0 for r in results)==1 and any('PT409' in r.stderr for r in results),[r.stderr for r in results]
 check=sql(f"select jsonb_build_object('orders',(select count(*) from lotus_private.romance_orders where user_id='{user}'),'stock',(select stock from lotus_private.romance_variants where id='{variant}'));")
 value=json.loads(check.stdout.strip());assert value=={'orders':1,'stock':0},value
 # Local synthetic rows are removed with this dedicated container; production is never accessed.
print('PASS: simultaneous identical requests produce one booking/order; competing requests cannot consume the same last stock unit.')

subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec',CONTAINER,'dropdb','-U','postgres','--force',DB],check=True)
