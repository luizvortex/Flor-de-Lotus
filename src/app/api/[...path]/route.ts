import { NextRequest } from 'next/server';
import { supabaseApi } from '../../../lib/supabase-api';
import { legacyApi } from '../../../lib/legacy-api';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function handle(request: NextRequest) {
  return process.env.LOTUS_BACKEND === 'legacy' && process.env.VERCEL !== '1'
    ? legacyApi(request) : supabaseApi(request);
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
