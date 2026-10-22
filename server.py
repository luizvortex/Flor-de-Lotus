"""Servidor da pousada: python3 server.py. Consulte README.md."""
import os, json, sqlite3, secrets, hashlib, hmac, time
from datetime import date, timedelta
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('LOTUS_DB', str(ROOT / '.local' / 'lotus.db')))
TYPES = {'solteiro': 1, 'casal': 2, 'casal_mais_um': 3, 'familia': 6}
SESSIONS = {}
ATTEMPTS = {}
PASSWORD_SALT = secrets.token_bytes(32)
PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
PASSWORD_HASH = hashlib.scrypt(PASSWORD.encode(), salt=PASSWORD_SALT, n=16384, r=8, p=1) if PASSWORD else None

def connect():
    db = sqlite3.connect(DB, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db

def initialize():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS rooms(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, price INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS packages(id INTEGER PRIMARY KEY, name TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL, nights INTEGER NOT NULL, price INTEGER NOT NULL, type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY, room_id INTEGER NOT NULL REFERENCES rooms(id), guest TEXT NOT NULL, phone TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL, guests INTEGER NOT NULL, status TEXT NOT NULL, total INTEGER NOT NULL, package_id INTEGER REFERENCES packages(id), created TEXT DEFAULT CURRENT_TIMESTAMP);
        ''')
    os.chmod(DB, 0o600)

def text(data, key, limit=120):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ValueError('Preencha corretamente: ' + key)
    return value.strip()

def number(data, key, minimum=1, maximum=100000000):
    value = data.get(key)
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError('Valor inválido: ' + key)
    return value

def period(data, future=True):
    start, end = text(data, 'start', 10), text(data, 'end', 10)
    a, b = date.fromisoformat(start), date.fromisoformat(end)
    if a.isoformat() != start or b.isoformat() != end or b <= a or (future and a < date.today()) or (b-a).days > 730:
        raise ValueError('Selecione datas válidas: saída após entrada, até 730 noites, sem entrada no passado.')
    return start, end, (b-a).days

def free(db, room, start, end, exclude=0):
    return not db.execute("SELECT 1 FROM bookings WHERE room_id=? AND id!=? AND status IN ('pendente','confirmada','bloqueio') AND start < ? AND end > ?", (room, exclude, end, start)).fetchone()

def quote(db, room, start, end, nights, package_id):
    if not package_id:
        return room['price'] * nights
    p = db.execute('SELECT * FROM packages WHERE id=? AND active=1', (package_id,)).fetchone()
    if not p or p['type'] != room['type'] or start < p['start'] or end > p['end'] or nights != p['nights']:
        raise ValueError('O pacote não corresponde ao tipo do quarto, período ou número de noites.')
    return p['price']

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, fmt, *args):
        pass  # Não registrar dados pessoais nem tokens em URLs.
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)
    def authenticated(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie', ''))
        except Exception: return False
        token = cookie.get('lotus_session')
        return bool(token and SESSIONS.get(token.value, 0) > time.time())
    def do_GET(self):
        path = urlsplit(self.path).path
        if path.startswith('/api/'):
            return self.api('GET')
        # Só servir arquivos públicos; nunca banco, fontes Python ou arquivos ocultos.
        from urllib.parse import unquote
        target = (ROOT / unquote(path).lstrip('/')).resolve()
        if ROOT not in target.parents or any(p.startswith('.') for p in target.relative_to(ROOT).parts) or target.suffix.lower() not in {'.html','.css','.js','.jpg','.jpeg','.png','.svg','.ico','.webp'}:
            if path == '/': self.path = '/index.html'
            else: return self.send_error(404)
        return super().do_GET()
    def do_HEAD(self): self.send_error(405)
    def do_POST(self): self.api('POST')
    def do_PUT(self): self.api('PUT')
    def do_DELETE(self): self.api('DELETE')
    def api(self, method):
        try:
            self.run_api(method)
        except (ValueError, TypeError, KeyError) as e:
            self.send_json(400, {'error': str(e) if isinstance(e, ValueError) else 'Dados inválidos.'})
        except sqlite3.IntegrityError:
            self.send_json(409, {'error': 'Nome de quarto já cadastrado ou registro associado a uma reserva.'})
        except sqlite3.Error:
            self.send_json(503, {'error': 'Banco indisponível. Tente novamente.'})
    def run_api(self, method):
        url = urlsplit(self.path)
        path = url.path
        data = {}
        if method != 'GET':
            if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                return self.send_json(403, {'error': 'Origem não permitida.'})
            origin = self.headers.get('Origin')
            if origin and urlsplit(origin).netloc != self.headers.get('Host'):
                return self.send_json(403, {'error': 'Origem não permitida.'})
            if self.headers.get_content_type() != 'application/json':
                return self.send_json(415, {'error': 'Use application/json.'})
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 16384: raise ValueError('Requisição inválida.')
            try: data = json.loads(self.rfile.read(size))
            except (json.JSONDecodeError, UnicodeDecodeError): raise ValueError('JSON inválido.')
            if not isinstance(data, dict): raise ValueError('Dados inválidos.')
        if path == '/api/login' and method == 'POST':
            if not PASSWORD_HASH:
                return self.send_json(503, {'error': 'Configure ADMIN_PASSWORD no servidor antes de acessar o painel.'})
            ip = self.client_address[0]
            ATTEMPTS[ip] = [t for t in ATTEMPTS.get(ip, []) if t > time.time()-900]
            if len(ATTEMPTS[ip]) >= 10: return self.send_json(429, {'error': 'Muitas tentativas. Aguarde 15 minutos.'})
            candidate = text(data, 'password', 256)
            hashed = hashlib.scrypt(candidate.encode(), salt=PASSWORD_SALT, n=16384, r=8, p=1)
            if not hmac.compare_digest(hashed, PASSWORD_HASH):
                ATTEMPTS[ip].append(time.time())
                return self.send_json(401, {'error': 'Senha incorreta.'})
            ATTEMPTS.pop(ip, None)
            token = secrets.token_urlsafe(32)
            SESSIONS[token] = time.time()+28800
            self.send_response(200)
            secure = '; Secure' if os.environ.get('COOKIE_SECURE') == '1' else ''
            self.send_header('Set-Cookie', f'lotus_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800{secure}')
            self.send_header('Content-Type','application/json')
            self.send_header('Cache-Control','no-store')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        if path == '/api/session' and method == 'GET': return self.send_json(200, {'authenticated': self.authenticated()})
        admin = self.authenticated()
        public = method == 'GET' and path in ('/api/catalog','/api/availability') or method == 'POST' and path == '/api/bookings'
        if not public and not admin: return self.send_json(401, {'error': 'Entre no painel para continuar.'})
        if path == '/api/logout' and method == 'POST':
            cookie = SimpleCookie(self.headers.get('Cookie',''))
            if cookie.get('lotus_session'): SESSIONS.pop(cookie['lotus_session'].value,None)
            return self.send_json(200, {'ok': True})
        with connect() as db:
            if method == 'GET':
                if path in ('/api/catalog','/api/admin'):
                    result = {table: [dict(r) for r in db.execute('SELECT * FROM '+table+(' WHERE active=1' if path.endswith('catalog') else '')+' ORDER BY id')] for table in ('rooms','packages')}
                    if path.endswith('admin'): result['bookings'] = [dict(r) for r in db.execute('SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id=b.room_id ORDER BY b.start,b.id')]
                    return self.send_json(200, result)
                if path == '/api/availability':
                    q = {k:v[0] for k,v in parse_qs(url.query).items()}
                    start,end,nights=period(q)
                    guests=int(q.get('guests',1))
                    if not 1 <= guests <= 20: raise ValueError('Número de hóspedes inválido.')
                    package_id=int(q.get('package_id') or 0)
                    rooms=[]
                    for r in db.execute('SELECT * FROM rooms WHERE active=1 AND capacity>=?',(guests,)):
                        if free(db,r['id'],start,end):
                            try: total=quote(db,r,start,end,nights,package_id)
                            except ValueError:
                                if package_id: continue
                                raise
                            rooms.append({**dict(r),'total':total})
                    return self.send_json(200,{'rooms':rooms,'nights':nights})
            parts=path.strip('/').split('/')
            entity=parts[1] if len(parts)>1 else ''
            record_id=int(parts[2]) if len(parts)==3 else None
            if entity in ('rooms','packages') and admin and method in ('POST','PUT'):
                name=text(data,'name')
                kind=text(data,'type')
                if kind not in TYPES: raise ValueError('Tipo de acomodação inválido.')
                price=number(data,'price',1)
                active=number(data,'active',0,1)
                if entity=='rooms':
                    capacity=number(data,'capacity',1,20)
                    if capacity < TYPES[kind] and kind != 'familia': raise ValueError('Capacidade incompatível com o tipo de quarto.')
                    values=(name,kind,capacity,price,active)
                    cols='name,type,capacity,price,active'
                else:
                    start,end,_=period(data,False)
                    nights=number(data,'nights',1,730)
                    if nights > (date.fromisoformat(end)-date.fromisoformat(start)).days: raise ValueError('O pacote precisa caber no período informado.')
                    values=(name,start,end,nights,price,kind,active)
                    cols='name,start,end,nights,price,type,active'
                if record_id:
                    if not db.execute('SELECT 1 FROM '+entity+' WHERE id=?',(record_id,)).fetchone(): return self.send_json(404,{'error':'Registro não encontrado.'})
                    if entity=='rooms':
                        booked=db.execute("SELECT MAX(guests) FROM bookings WHERE room_id=? AND status IN ('pendente','confirmada') AND end>?",(record_id,date.today().isoformat())).fetchone()[0]
                        if booked and capacity < booked: raise ValueError('Há reservas com mais hóspedes que a nova capacidade.')
                    db.execute('UPDATE '+entity+' SET '+','.join(c+'=?' for c in cols.split(','))+' WHERE id=?',values+(record_id,))
                else:
                    record_id=db.execute('INSERT INTO '+entity+' ('+cols+') VALUES ('+','.join('?' for _ in values)+')',values).lastrowid
                return self.send_json(200,{'id':record_id})
            if entity=='bookings' and method=='POST' and record_id is None:
                start,end,nights=period(data)
                room_id=number(data,'room_id')
                guests=number(data,'guests',1,20)
                guest=text(data,'guest')
                phone=text(data,'phone',40)
                if sum(c.isdigit() for c in phone)<8: raise ValueError('Informe um telefone válido.')
                status=data.get('status','pendente') if admin else 'pendente'
                if status not in ('pendente','confirmada','bloqueio'): raise ValueError('Status inválido.')
                package_id=data.get('package_id') or None
                if package_id is not None and (type(package_id) is not int or package_id<1): raise ValueError('Pacote inválido.')
                db.execute('BEGIN IMMEDIATE')
                room=db.execute('SELECT * FROM rooms WHERE id=? AND active=1',(room_id,)).fetchone()
                if not room or room['capacity']<guests: raise ValueError('Quarto indisponível ou capacidade insuficiente.')
                if not free(db,room_id,start,end): return self.send_json(409,{'error':'Este quarto acabou de ficar indisponível. Consulte novamente.'})
                total=0 if status=='bloqueio' else quote(db,room,start,end,nights,package_id)
                rid=db.execute('INSERT INTO bookings(room_id,guest,phone,start,end,guests,status,total,package_id) VALUES(?,?,?,?,?,?,?,?,?)',(room_id,guest,phone,start,end,guests,status,total,package_id)).lastrowid
                db.commit()
                return self.send_json(201,{'id':rid,'status':status,'total':total})
            if entity=='bookings' and record_id and method=='PUT' and admin:
                status=data.get('status')
                if status not in ('confirmada','cancelada'): raise ValueError('Selecione confirmar ou cancelar.')
                db.execute('BEGIN IMMEDIATE')
                b=db.execute('SELECT * FROM bookings WHERE id=?',(record_id,)).fetchone()
                if not b: return self.send_json(404,{'error':'Reserva não encontrada.'})
                if status=='confirmada' and not free(db,b['room_id'],b['start'],b['end'],record_id): return self.send_json(409,{'error':'As datas já estão ocupadas por outra reserva.'})
                db.execute('UPDATE bookings SET status=? WHERE id=?',(status,record_id))
                db.commit()
                return self.send_json(200,{'ok':True})
            self.send_json(404,{'error':'Operação não encontrada.'})

if __name__ == '__main__':
    initialize()
    print('Flor de Lótus: servidor na porta '+os.environ.get('PORT','8000'), flush=True)
    ThreadingHTTPServer((os.environ.get('HOST','0.0.0.0'),int(os.environ.get('PORT','8000'))),Handler).serve_forever()
