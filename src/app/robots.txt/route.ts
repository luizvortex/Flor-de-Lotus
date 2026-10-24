import {siteOrigin} from '../../lib/site-url';
export function GET(){return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /minha-conta\nDisallow: /api/\nDisallow: /auth/\nSitemap: ${siteOrigin()}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});}
