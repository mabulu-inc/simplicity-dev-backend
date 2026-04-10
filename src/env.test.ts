import { afterEach, describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEnvFile } from './env.js';

describe('loadEnvFile', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true });
    dirs.length = 0;
  });

  function tmpEnv(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'dev-backend-env-'));
    dirs.push(dir);
    const p = join(dir, '.env');
    writeFileSync(p, content);
    return p;
  }

  it('loads key=value pairs into process.env', () => {
    const key = `TEST_ENV_${Date.now()}`;
    const path = tmpEnv(`${key}=hello`);
    loadEnvFile(path);
    expect(process.env[key]).toBe('hello');
    delete process.env[key];
  });

  it('does not override existing env vars', () => {
    const key = `TEST_ENV_EXISTING_${Date.now()}`;
    process.env[key] = 'original';
    const path = tmpEnv(`${key}=override`);
    loadEnvFile(path);
    expect(process.env[key]).toBe('original');
    delete process.env[key];
  });

  it('strips surrounding quotes', () => {
    const key1 = `TEST_DQ_${Date.now()}`;
    const key2 = `TEST_SQ_${Date.now()}`;
    const path = tmpEnv(`${key1}="double"\n${key2}='single'`);
    loadEnvFile(path);
    expect(process.env[key1]).toBe('double');
    expect(process.env[key2]).toBe('single');
    delete process.env[key1];
    delete process.env[key2];
  });

  it('skips comments and blank lines', () => {
    const key = `TEST_COMMENT_${Date.now()}`;
    const path = tmpEnv(`# comment\n\n${key}=yes`);
    loadEnvFile(path);
    expect(process.env[key]).toBe('yes');
    delete process.env[key];
  });

  it('warns on missing file without throwing', () => {
    expect(() => loadEnvFile('/nonexistent/.env')).not.toThrow();
  });
});
