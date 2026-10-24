// Never derive canonical links or OAuth redirects from an untrusted Host header.
export function siteOrigin(): string {
  try {
    const url = new URL(process.env.APP_URL || 'https://flor-de-lotus-three.vercel.app');
    if (url.protocol === 'https:' && !url.username && !url.password) return url.origin;
  } catch {}
  return 'https://flor-de-lotus-three.vercel.app';
}
