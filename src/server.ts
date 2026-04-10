import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { buildEvent, decompressResponse } from './event.js';
import type { Handler } from './handlers.js';

/**
 * Start the HTTP server that routes requests to Lambda handlers.
 */
export function startServer(
  handlers: Record<string, Handler>,
  port: number,
): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/';
    const [rawPath, query] = url.replace('//', '/').split('?') as [string, string | undefined];

    console.log(`${req.method} ${rawPath}${query ? `?${query}` : ''}`);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const handler = handlers[rawPath];
    if (!handler) {
      setCorsHeaders(res);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: `No handler for ${rawPath}` }));
      return;
    }

    try {
      const event = await buildEvent(req, rawPath, query);
      const response = await handler(event);

      setCorsHeaders(res);
      res.statusCode = response.statusCode;
      res.setHeader('Content-Type', 'application/json');

      let body = response.body ?? '';
      if (response.headers?.['Content-Encoding'] === 'gzip') {
        body = decompressResponse(body);
      }

      res.end(body);
    } catch (err) {
      console.error(`Error handling ${rawPath}:`, err);
      setCorsHeaders(res);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Internal server error' }));
    }
  });

  server.listen(port, () => {
    console.log(`\ndev-backend listening on http://localhost:${port}/`);
  });
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
