import { cp, mkdir, readdir } from 'node:fs/promises';
// Explicit selection: never copy the repository, database, or server sources.
await mkdir('public/media', { recursive: true });
const files = ['grupos.js','grupos.css','excursion-roster.js','admin-excursions.js', 'admin-reports.js','site-translations.json','admin-bulk-bookings.js','site-language.js','site-language.css','room-amenities.js','room-modal.css','focus-mode.js','stay-party.js','stay-picker.css','stay-picker.js','admin-rates.js','admin-alerts.js','admin-crop.js','sobre.css','contato.css','contato.js','informacoes.css','admin-setup.js','reviews.css', 'reviews.js', 'itacare.css', 'itacare.js', 'admin-site.js', 'site-content.css', 'media/jardim-otimizado.webp', 'media/jardim-otimizado-desktop.mp4', 'media/jardim-otimizado-mobile.mp4', 'media/jardim-final.jpg', 'galeria-pousada.css', 'galeria-pousada.js', 'conta.css', 'conta.js', 'tema.css', 'quartos.css', 'quartos.js', 'admin-showcases.js', 'politicas.js', 'pacotes.js', 'lazer.css', 'lazer.js', 'inicio.css', 'inicio.js', 'main.css', 'painel.css', 'main.js', 'admin.js', 'reservas.js', 'reservas.css', 'disponibilidade.js', 'disponibilidade.css'];
for (const entry of await readdir('.', { withFileTypes: true })) {
  if ((entry.isDirectory() && (entry.name === 'images' || entry.name.startsWith('img '))) ||
      (entry.isFile() && /\.(jpg|jpeg|png|ico|webp)$/i.test(entry.name))) files.push(entry.name);
}
for (const file of files) await cp(file, `public/${file}`, { recursive: true });
