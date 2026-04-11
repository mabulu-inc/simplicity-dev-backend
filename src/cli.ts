#!/usr/bin/env node

import { loadConfig } from './config.js';
import { loadEnvFile } from './env.js';
import { loadHandlers } from './handlers.js';
import { startServer } from './server.js';

const configPath = process.argv[2] ?? 'backend.routes.json';

console.log(`Loading config from ${configPath}`);
const config = loadConfig(configPath);

console.log(`Loading env from ${config.envFile}`);
loadEnvFile(config.envFile);

console.log('Loading handlers:');
const handlers = await loadHandlers(config.routes);

if (Object.keys(handlers).length === 0) {
  console.error('No handlers loaded — exiting');
  process.exit(1);
}

startServer(handlers, config.port);
