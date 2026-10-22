import { legacyPage } from '../lib/legacy-page';
export const dynamic = 'force-dynamic';
export function GET() { return legacyPage('index'); }
