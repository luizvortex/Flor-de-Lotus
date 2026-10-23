import { cp, mkdir, readdir } from 'node:fs/promises';
// Explicit selection: never copy the repository, database, or server sources.
await mkdir('public/media', { recursive: true });
const files = ['media/abertura-piscina.mp4', 'media/abertura-piscina.jpg', 'galeria-pousada.css', 'galeria-pousada.js', 'conta.css', 'conta.js', 'tema.css', 'quartos.css', 'quartos.js', 'admin-showcases.js', 'admin-guest-bookings.js', 'politicas.js', 'pacotes.js', 'lazer.css', 'lazer.js', 'inicio.css', 'inicio.js', 'main.css', 'painel.css', 'main.js', 'admin.js', 'reservas.js', 'reservas.css', 'disponibilidade.js', 'disponibilidade.css'];
for (const entry of await readdir('.', { withFileTypes: true })) {
  if ((entry.isDirectory() && (entry.name === 'images' || entry.name.startsWith('img '))) ||
      (entry.isFile() && /\.(jpg|jpeg|png|ico|webp)$/i.test(entry.name))) files.push(entry.name);
}
for (const file of files) await cp(file, `public/${file}`, { recursive: true });
