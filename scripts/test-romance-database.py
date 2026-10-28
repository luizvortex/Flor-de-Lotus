"""Runs only in the dedicated Docker container: never connects to Supabase/production."""
import subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
container='lotus-romance-test'
database='romance_test_'+str(int(time.time()))
def sql(text):
 result=subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
 if result.returncode:raise RuntimeError(result.stderr)
 return result.stdout
# The name is dedicated to this test container, which has no network or exposed port.
subprocess.run(['docker','--host=unix:///var/run/docker.sock','exec',container,'createdb','-U','postgres',database],check=True)
files=['scripts/romance-local-bootstrap.sql','database/lotus-schema.sql','database/room-showcases.sql','database/room-detail-modal.sql','database/room-amenity-icons.sql','database/triplo-standard.sql','database/guest-bookings.sql','database/require-google-booking.sql','database/room-catalog.sql','database/room-inventory.sql','database/occupancy-rates.sql','database/category-bookings.sql','database/party-bookings.sql','database/children-free-through-five.sql','database/property-policies.sql','database/property-hours.sql','database/excursions.sql','database/reports.sql','database/six-room-categories.sql','supabase/migrations/20261028164135_romantic_experience.sql']
for file in files:
 print('Loading',file,flush=True)
 sql((root/file).read_text())
print(sql((root/'database/test-romantic-experience.sql').read_text()))

(root/'work').mkdir(exist_ok=True)
(root/'work/romance-test-database.txt').write_text(database)
print('Verified local database:',database)
