import type { NextConfig } from 'next';

const config: NextConfig = {
  // The compatibility routes read these templates at runtime on Vercel.
  outputFileTracingIncludes: {
    '/*': ['./index.html', './reservas.html', './admin.html', './avaliacoes.html'],
  },
};
export default config;
