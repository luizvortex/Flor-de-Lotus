"""Run the existing reservation contract through a production Next.js server.
Uses a temporary database and a generated test password; never opens .local/.
"""
import os
import subprocess
import sys
import time
import unittest
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tests'))
from test_reservations import ReservationTests


class NextReservationTests(ReservationTests):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = dict(os.environ, LEGACY_API_ORIGIN=cls.url, LOTUS_BACKEND='legacy', NEXT_TELEMETRY_DISABLED='1')
        cls.next = subprocess.Popen(
            ['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3107'],
            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.url = 'http://127.0.0.1:3107'
        try:
            for _ in range(100):
                if cls.next.poll() is not None:
                    raise RuntimeError('Next.js encerrou antes de iniciar')
                try:
                    with urllib.request.urlopen(cls.url + '/api/catalog', timeout=1) as response:
                        if response.status == 200:
                            return
                except OSError:
                    time.sleep(.1)
            raise RuntimeError('Next.js não iniciou')
        except BaseException:
            cls.next.terminate(); cls.next.wait()
            super().tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.next.terminate(); cls.next.wait(timeout=10)
        super().tearDownClass()

    def test_pages_and_private_files(self):
        for page in ['/', '/reservas', '/quartos', '/quartos.html', '/admin', '/avaliacoes', '/index.html', '/reservas.html', '/admin.html', '/avaliacoes.html']:
            with urllib.request.urlopen(self.url + page) as response:
                self.assertEqual(response.status, 200)
                self.assertIn('<html lang="pt-BR">', response.read().decode())
        for page in ['/server.py', '/AGENTS.md', '/.local/lotus.db', '/package.json']:
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(self.url + page)
            self.assertEqual(error.exception.code, 404)


if __name__ == '__main__':
    unittest.main(defaultTest='NextReservationTests', verbosity=2)
