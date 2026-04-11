import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('loads a minimal config with string routes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dev-backend-test-'));
    const configPath = join(dir, 'routes.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        routes: { '/graphql': './handler.js' },
      }),
    );

    const config = loadConfig(configPath);

    expect(config.port).toBe(4000);
    expect(config.envFile).toBe(join(dir, '.env.backend'));
    expect(config.routes['/graphql']?.handler).toBe(join(dir, 'handler.js'));
    expect(config.routes['/graphql']?.envFile).toBeUndefined();

    rmSync(dir, { recursive: true });
  });

  it('loads object routes with envFile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dev-backend-test-'));
    const configPath = join(dir, 'routes.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        port: 5000,
        envFile: '.env.custom',
        routes: {
          '/api': {
            handler: '../api/dist/index.js',
            envFile: '.env.api',
          },
        },
      }),
    );

    const config = loadConfig(configPath);

    expect(config.port).toBe(5000);
    expect(config.envFile).toBe(join(dir, '.env.custom'));
    expect(config.routes['/api']?.envFile).toBe(join(dir, '.env.api'));

    rmSync(dir, { recursive: true });
  });

  it('throws on missing routes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dev-backend-test-'));
    const configPath = join(dir, 'routes.json');
    writeFileSync(configPath, JSON.stringify({}));

    expect(() => loadConfig(configPath)).toThrow('routes');

    rmSync(dir, { recursive: true });
  });

  it('throws on missing file', () => {
    expect(() => loadConfig('/nonexistent/routes.json')).toThrow('Failed to read');
  });
});
