import { handleAuthRequest } from '@kodibox/auth';
import { authRequestOptions, getAuth } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function handle(request: Request): Promise<Response> {
  return handleAuthRequest(getAuth(), request, authRequestOptions());
}

export const GET = handle;
export const POST = handle;
