import {NextRequest} from 'next/server';
import {romanceApi} from '../../../../lib/romance-api';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function handle(request:NextRequest,context:{params:Promise<{operation:string}>}){return romanceApi(request,(await context.params).operation);}
export {handle as GET,handle as POST};
