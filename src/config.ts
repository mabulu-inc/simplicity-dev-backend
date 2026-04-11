import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface RouteConfig {
  /** Absolute path to the handler module. */
  handler: string;
  /** Optional env file to load before importing this handler.
   *  Overrides values from the base envFile. Useful when handlers
   *  need different DATABASE_URL values. */
  envFile?: string;
  /** Optional authorizer module path. If set, the authorizer is
   *  called before the handler on every request. If it returns
   *  `{ isAuthorized: false }`, the request is rejected with 403. */
  authorizer?: string;
}

export interface Config {
  /** HTTP port. Default 4000. */
  port: number;
  /** Path to the base .env file. Default ".env.back-end". */
  envFile: string;
  /** Route → handler config. */
  routes: Record<string, RouteConfig>;
}

type RawRouteEntry = string | { handler: string; envFile?: string; authorizer?: string };

interface RawConfig {
  port?: number;
  envFile?: string;
  routes: Record<string, RawRouteEntry>;
}

/**
 * Load and validate the config file. Paths are resolved relative
 * to the config file's directory.
 */
export function loadConfig(configPath: string): Config {
  const absPath = resolve(configPath);
  const dir = dirname(absPath);

  let raw: RawConfig;
  try {
    raw = JSON.parse(readFileSync(absPath, 'utf-8')) as RawConfig;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read config ${absPath}: ${msg}`, { cause: err });
  }

  if (!raw.routes || typeof raw.routes !== 'object') {
    throw new Error('Config must have a "routes" object');
  }

  const routes: Record<string, RouteConfig> = {};
  for (const [path, entry] of Object.entries(raw.routes)) {
    if (typeof entry === 'string') {
      routes[path] = { handler: resolve(dir, entry) };
    } else {
      routes[path] = {
        handler: resolve(dir, entry.handler),
        envFile: entry.envFile ? resolve(dir, entry.envFile) : undefined,
        authorizer: entry.authorizer ? resolve(dir, entry.authorizer) : undefined,
      };
    }
  }

  return {
    port: raw.port ?? 4000,
    envFile: resolve(dir, raw.envFile ?? '.env.backend'),
    routes,
  };
}
