
export async function legacyApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    let originHost: string | undefined;
    try { originHost = origin ? new URL(origin).host : undefined; }
    catch { return Response.json({ error: 'Origem não permitida.' }, { status: 403 }); }
    if (request.headers.get('sec-fetch-site') === 'cross-site' ||
        (originHost && originHost !== request.headers.get('host'))) {
      return Response.json({ error: 'Origem não permitida.' }, { status: 403 });
    }
  }
  const headers = new Headers();
  for (const key of ['content-type', 'cookie', 'sec-fetch-site']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const backend = new URL(process.env.LEGACY_API_ORIGIN || 'http://127.0.0.1:8000');
    const upstream = await fetch(new URL(url.pathname + url.search, backend), {
      method: request.method, headers, cache: 'no-store', redirect: 'manual',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(20_000),
    });
    const outgoing = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    for (const key of ['content-type', 'retry-after']) {
      const value = upstream.headers.get(key);
      if (value) outgoing.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append('set-cookie', cookie);
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json({ error: 'Sistema de reservas indisponível. Tente novamente.' }, { status: 503 });
  }
}
