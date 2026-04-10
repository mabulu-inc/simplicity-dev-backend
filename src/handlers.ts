import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadEnvFile } from './env.js';
import type { RouteConfig } from './config.js';

export type Handler = (event: Record<string, unknown>) => Promise<{
  statusCode: number;
  body?: string;
  headers?: Record<string, string>;
}>;

/**
 * Import all handler modules. For routes with a per-route envFile,
 * temporarily override process.env before importing so the handler's
 * module-level init (e.g. Pool creation) picks up the right values.
 */
export async function loadHandlers(
  routes: Record<string, RouteConfig>,
): Promise<Record<string, Handler>> {
  const handlers: Record<string, Handler> = {};

  for (const [path, route] of Object.entries(routes)) {
    // Snapshot env vars that the route's envFile might override
    const overrides = new Map<string, string | undefined>();

    if (route.envFile) {
      const keys = readEnvKeys(route.envFile);
      for (const key of keys) {
        overrides.set(key, process.env[key]);
        delete process.env[key];
      }
      loadEnvFile(route.envFile);
    }

    try {
      const mod = (await import(
        pathToFileURL(route.handler).href
      )) as Record<string, unknown>;

      const handler = mod.handler as Handler | undefined;
      if (typeof handler !== 'function') {
        console.error(
          `  ${path}: ${route.handler} does not export a handler function — skipping`,
        );
        continue;
      }
      handlers[path] = handler;
      console.log(`  ${path} → ${route.handler}`);
    } catch (err) {
      console.error(`  ${path}: failed to import ${route.handler}:`, err);
      continue;
    } finally {
      for (const [key, original] of overrides) {
        if (original === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = original;
        }
      }
    }
  }

  return handlers;
}

/**
 * Parse an env file to extract just the key names.
 */
function readEnvKeys(filePath: string): string[] {
  if (!existsSync(filePath)) return [];

  const keys: string[] = [];
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    keys.push(trimmed.slice(0, eqIndex).trim());
  }
  return keys;
}
