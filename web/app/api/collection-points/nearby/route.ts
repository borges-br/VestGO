import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

function copySearchParams(source: URLSearchParams, target: URLSearchParams) {
  source.forEach((value, key) => {
    target.set(key, value);
  });
}

export async function GET(request: NextRequest) {
  const targetUrl = new URL(`${API_BASE_URL}/collection-points`);
  copySearchParams(request.nextUrl.searchParams, targetUrl.searchParams);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    const responseHeaders = new Headers(response.headers);

    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'UPSTREAM_UNAVAILABLE',
        message: 'Nao foi possivel conectar ao backend.',
      },
      { status: 503 },
    );
  }
}
