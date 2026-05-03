import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const target = new URL(`${API_BASE_URL}/${pathSegments.join('/')}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return target;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  const targetUrl = buildTargetUrl(context.params.path, request);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text();

    if (body.length > 0) {
      init.body = body;
    } else {
      headers.delete('content-type');
    }
  }

  try {
    const response = await fetch(targetUrl, init);
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
        message: 'Nao foi possivel conectar ao servico agora.',
      },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}
