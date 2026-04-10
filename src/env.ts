import { readFileSync, existsSync } from 'node:fs';

/**
 * Parse a .env file and load its variables into process.env.
 * Does not override existing env vars.
 */
export function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    console.warn(`env file not found: ${filePath} — skipping`);
    return;
  }

  const content = readFileSync(filePath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Don't override existing env vars
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
