import unittest, tempfile, threading, json, urllib.request, urllib.error, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server

class ReservationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        server.DB = Path(cls.temp.name)/'test.db'
        cls.password = server.secrets.token_urlsafe(24)
        server.PASSWORD_HASH = hashlib.scrypt(cls.password.encode(),salt=server.PASSWORD_SALT,n=16384,r=8,p=1)
        server.initialize()
        cls.http = server.ThreadingHTTPServer(('127.0.0.1',0), server.Handler)
        cls.url = 'http://127.0.0.1:'+str(cls.http.server_port)
        cls.thread = threading.Thread(target=cls.http.serve_forever,daemon=True)
        cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown();cls.http.server_close();cls.thread.join();cls.temp.cleanup()
    def setUp(self):
        with server.connect() as db:
            db.execute('DELETE FROM bookings');db.execute('DELETE FROM packages');db.execute('DELETE FROM rooms')
        status,data,headers=self.request('login',{'password':self.password})
        self.cookie=headers['Set-Cookie'].split(';')[0]
        self.assertEqual(status,200)
        self.room=self.request('rooms',{'name':'Quarto 01','type':'casal','capacity':2,'price':30000,'active':1},auth=True)[1]['id']
    def request(self,path,body=None,method=None,auth=False,headers=None):
        hs={'Content-Type':'application/json'}
        if auth: hs['Cookie']=self.cookie
        if headers: hs.update(headers)
        req=urllib.request.Request(self.url+'/api/'+path,data=json.dumps(body).encode() if body is not None else None,headers=hs,method=method or ('POST' if body is not None else 'GET'))
        try:r=urllib.request.urlopen(req,timeout=10)
        except urllib.error.HTTPError as e:r=e
        try: return r.status,json.loads(r.read()),r.headers
        finally: r.close()
    def booking(self,**overrides):
        return {'room_id':self.room,'guest':'Hóspede de teste','phone':'11999999999','start':'2035-12-26','end':'2035-12-30','guests':2,**overrides}
    def test_authentication_and_private_data(self):
        self.assertEqual(self.request('admin')[0],401)
        self.assertEqual(self.request('rooms',{},auth=False)[0],401)
        self.assertEqual(self.request('login',{'password':'incorrect'})[0],401)
        self.assertFalse(self.request('session')[1]['authenticated'])
        self.assertTrue(self.request('session',auth=True)[1]['authenticated'])
        self.request('bookings',self.booking())
        self.assertNotIn('bookings',self.request('catalog')[1])
        self.request('logout',{},auth=True)
        self.assertEqual(self.request('admin',auth=True)[0],401)
    def test_pending_blocks_cancel_frees_and_checkout_is_available(self):
        status,b,_=self.request('bookings',self.booking(status='confirmada',total=1))
        self.assertEqual(status,201);self.assertEqual(b['status'],'pendente');self.assertEqual(b['total'],120000)
        self.assertEqual(self.request('availability?start=2035-12-26&end=2035-12-30')[1]['rooms'],[])
        self.assertEqual(self.request('bookings',self.booking())[0],409)
        self.assertEqual(self.request('bookings',self.booking(start='2035-12-30',end='2035-12-31'))[0],201)
        self.assertEqual(self.request('bookings/'+str(b['id']),{'status':'cancelada'},method='PUT',auth=True)[0],200)
        self.assertEqual(len(self.request('availability?start=2035-12-26&end=2035-12-30')[1]['rooms']),1)
    def test_concurrent_requests_do_not_double_book(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes=list(pool.map(lambda _:self.request('bookings',self.booking())[0],range(2)))
        self.assertEqual(sorted(outcomes),[201,409])
    def test_package_price_validation_and_existing_price_snapshot(self):
        p={'name':'Réveillon','start':'2035-12-25','end':'2036-01-05','nights':4,'type':'casal','price':180000,'active':1}
        package=self.request('packages',p,auth=True)[1]['id']
        self.assertEqual(self.request('bookings',self.booking(package_id=package,end='2035-12-29'))[0],400)
        b=self.request('bookings',self.booking(package_id=package))[1]
        self.assertEqual(b['total'],180000)
        p['price']=220000
        self.assertEqual(self.request('packages/'+str(package),p,method='PUT',auth=True)[0],200)
        self.assertEqual(self.request('admin',auth=True)[1]['bookings'][0]['total'],180000)
    def test_blocks_capacity_dates_and_csrf(self):
        self.assertEqual(self.request('bookings',self.booking(guests=3))[0],400)
        self.assertEqual(self.request('bookings',self.booking(end='2035-12-26'))[0],400)
        self.assertEqual(self.request('bookings',self.booking(start='2020-01-01',end='2020-01-02'))[0],400)
        self.assertEqual(self.request('rooms',{},auth=True,headers={'Origin':'https://malicious.example'})[0],403)
        b=self.request('bookings',self.booking(status='bloqueio'),auth=True)[1]
        self.assertEqual(b['total'],0)
        self.assertEqual(self.request('bookings',self.booking())[0],409)
    def test_cancelled_reservation_cannot_be_reconfirmed_over_another(self):
        b=self.request('bookings',self.booking())[1]
        self.request('bookings/'+str(b['id']),{'status':'cancelada'},method='PUT',auth=True)
        self.request('bookings',self.booking())
        self.assertEqual(self.request('bookings/'+str(b['id']),{'status':'confirmada'},method='PUT',auth=True)[0],409)
    def test_database_persists_and_private_files_not_served(self):
        self.request('bookings',self.booking())
        server.initialize()
        self.assertEqual(len(self.request('admin',auth=True)[1]['bookings']),1)
        for path in ['/.local/lotus.db','/server.py','/.git/config','/%2e%2e/Flor-de-Lotus/server.py']:
            try:r=urllib.request.urlopen(self.url+path)
            except urllib.error.HTTPError as e:r=e
            self.assertEqual(r.status,404)
            r.close()
        req=urllib.request.Request(self.url+'/server.py',method='HEAD')
        with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
        self.assertEqual(error.exception.code,405)

if __name__=='__main__': unittest.main()
