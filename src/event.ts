import type { IncomingMessage } from 'node:http';
import { gunzipSync } from 'node:zlib';

/**
 * Build an API Gateway v2 (HTTP API) proxy event from an incoming
 * Node.js HTTP request.
 */
export async function buildEvent(
  req: IncomingMessage,
  path: string,
  query: string | undefined,
): Promise<Record<string, unknown>> {
  const body = await readBody(req);
  const method = req.method ?? 'GET';

  return {
    version: '2.0',
    headers: req.headers,
    method,
    queryStringParameters: parseQuery(query),
    isBase64Encoded: false,
    rawQueryString: query ?? '',
    requestContext: {
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: req.headers['user-agent'] ?? '',
      },
      requestId: crypto.randomUUID(),
      time: new Date().toISOString(),
    },
    rawPath: path,
    routeKey: `${method} ${path}`,
    body,
  };
}

function parseQuery(
  query: string | undefined,
): Record<string, string> | undefined {
  if (!query) return undefined;

  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) {
      params[decodeURIComponent(part)] = '';
    } else {
      params[decodeURIComponent(part.slice(0, eqIndex))] =
        decodeURIComponent(part.slice(eqIndex + 1));
    }
  }
  return params;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (req.headers['content-encoding'] === 'gzip') {
        resolve(buf.toString('base64'));
      } else {
        resolve(buf.toString());
      }
    });
  });
}

/**
 * Decompress a gzipped response body returned by a handler.
 */
export function decompressResponse(body: string): string {
  return gunzipSync(Buffer.from(body, 'base64')).toString();
}
