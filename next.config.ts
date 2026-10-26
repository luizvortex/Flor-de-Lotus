import type { NextConfig } from 'next';

const localSources=process.env.VERCEL==='1'?'':' http://127.0.0.1:* http://localhost:*';
const config: NextConfig = {
  poweredByHeader:false,
  images:{qualities:[75,90]},
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'SAMEORIGIN'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self)'},
    {key:'Content-Security-Policy',value:`default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://code.jquery.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:${localSources}; media-src 'self' blob: https://*.supabase.co${localSources}; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self' https://*.supabase.co${localSources}; frame-src 'self' https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self' https://asojfispuomhbfapqdmi.supabase.co https://accounts.google.com; frame-ancestors 'self'`},
  ]},{source:'/api/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source:'/auth/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}];},
  // The compatibility routes read these templates at runtime on Vercel.
  outputFileTracingIncludes: {
    '/*': ['./index.html', './reservas.html', './admin.html', './avaliacoes.html', './minha-conta.html', './pacotes.html', './itacare.html','./informacoes.html'],
  },
};
export default config;
