import { cp, mkdir, readdir } from 'node:fs/promises';
// Explicit selection: never copy the repository, database, or server sources.
await mkdir('public', { recursive: true });
const files = ['main.css', 'painel.css', 'main.js', 'admin.js', 'reservas.js'];
for (const entry of await readdir('.', { withFileTypes: true })) {
  if ((entry.isDirectory() && (entry.name === 'images' || entry.name.startsWith('img '))) ||
      (entry.isFile() && /\.(jpg|jpeg|png|ico|webp)$/i.test(entry.name))) files.push(entry.name);
}
for (const file of files) await cp(file, `public/${file}`, { recursive: true });
