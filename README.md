# @smplcty/dev-backend

Local Lambda dev server. Reads a routes config, loads env vars, and
serves Lambda handlers over HTTP with API Gateway v2 event
translation.

## Install

```sh
pnpm dlx @smplcty/dev-backend
```

Or as a dev dependency:

```sh
pnpm add -D @smplcty/dev-backend
```

## Usage

```sh
dev-backend [config-path]
```

Default config path is `back-end.routes.json` in the current
directory.

## Config

`back-end.routes.json` — committed to your frontend repo:

```json
{
  "port": 4000,
  "envFile": ".env.back-end",
  "routes": {
    "/graphql": "../handle-graphql/dist/index.js",
    "/sign-in": {
      "handler": "../../mabulu-inc/sign-in/dist/index.js",
      "envFile": ".env.sign-in"
    },
    "/sign-in/verify": {
      "handler": "../../mabulu-inc/sign-in-verify/dist/index.js",
      "envFile": ".env.sign-in"
    },
    "/ai-insights": "../handle-ai-insights/dist/index.js"
  }
}
```

### Route formats

**String** — just a handler path. Uses the base `envFile`:

```json
"/graphql": "../handle-graphql/dist/index.js"
```

**Object** — handler path plus a per-route env file override:

```json
"/sign-in": {
  "handler": "../../mabulu-inc/sign-in/dist/index.js",
  "envFile": ".env.sign-in"
}
```

Per-route env files override the base env file's values for that
handler only. This solves the case where two handlers need different
`DATABASE_URL` values (e.g. graphql vs sign-in connect to different
databases).

All paths are resolved relative to the config file's location.

### Env files

`.env.back-end` — shared variables (gitignored):

```
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
LOG_LEVEL=debug
```

`.env.sign-in` — overrides for sign-in handlers (gitignored):

```
DATABASE_URL=postgresql://...different-db
```

Env files use standard `KEY=VALUE` format. Comments (`#`) and blank
lines are skipped. Surrounding quotes are stripped. Existing env vars
are not overridden.

## How it works

1. Loads the base env file into `process.env`.
2. For each route, if it has a per-route `envFile`, temporarily
   overrides the relevant env vars, imports the handler module
   (so module-level init like Pool creation uses the right values),
   then restores the originals.
3. Starts an HTTP server that translates incoming requests into
   API Gateway v2 proxy events and calls the matching handler.
4. CORS headers are set on all responses.

## License

MIT
