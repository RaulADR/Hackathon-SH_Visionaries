# Beacon

Beacon is a production incident deck built with **TanStack Start**. It is a
complete example of file-based routing, validated search, route loaders, typed
server functions, full-document SSR, streamed data, explicit server-only
boundaries, per-route SSR modes, and a Nitro Node.js deployment.

The data layer is an in-memory seeded store. It resets when the server process
restarts; it is intentionally not a database-backed application.

## Requirements

- Node.js 22+ (the current Nitro release candidate prefers 22.22+)
- npm

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build and Node server:

```bash
npm run typecheck
npm run build
npm start            # node .output/server/index.mjs
```

Set `PORT` to change the listening port. The Nitro build is self-contained in
`.output/`, so deployment only needs Node.js and that directory.

## Routes and SSR strategy

| Route | SSR mode | Why |
| --- | --- | --- |
| `/` | `ssr: true` | Public overview. The full document and loader data are useful on first paint. |
| `/signals/` | `ssr: 'data-only'` | The board loader runs on the server, but the board UI is hydrated on the client. |
| `/signals/$signalId` | `ssr: true` | Operators open this from a pager. The critical record is server-rendered; the digest streams in. |
| `/signals/new` | `ssr: true` | The form shell is server-rendered; submission runs through the POST server function with the same schema. |
| `/lab` | `ssr: false` | The loader reads `localStorage` and the component paints an animated canvas, so there is no meaningful server render. The document shell still comes from the server. |
| `/api/health` | Server route | Public JSON health probe. |
| `/api/signals` | Server route | Validated, read-only JSON feed for status pages and bots. |

## How the pieces fit

```text
src/
  routes/
    __root.tsx                 full-document shell, navigation, error/404 UI
    index.tsx                  server-rendered overview
    signals/index.tsx          data-only board with validated search params
    signals/$signalId.tsx      detail page, deferred digest, live analysis stream
    signals/new.tsx            create form using a POST server function
    lab.tsx                    client-only canvas/localStorage route
    api/health.ts              public health endpoint
    api/signals.ts             public validated JSON feed
  components/ui.tsx            shared presentational components
  lib/signals.ts               Zod schemas and shared types (safe for both sides)
  server/
    store.server.ts            server-only seed data and domain logic
    signals.functions.ts       typed server functions and validators
  router.tsx                   router construction
  start.ts                     request middleware, including CSRF protection
  server.ts                    explicit streaming SSR entry point
```

### Validated search params

The board uses `validateSearch: signalSearchSchema` with Zod. Invalid values are
normalized by the schema and the server responds with a `307` redirect to the
canonical search, for example:

```text
/signals?page=999&severity=bogus
  -> /signals?page=1&sort=newest
```

The loader receives the parsed, typed search object through `loaderDeps`.

### Typed server functions

`src/server/signals.functions.ts` contains every app-facing server operation:

- `fetchOverview`
- `fetchSignals`
- `fetchSignal`
- `fetchSignalDigest`
- `streamSignalAnalysis`
- `submitSignal`
- `setSignalStatus`

Each function has a Zod validator and inferred input/output types. The browser
only imports these functions, never the store.

### Server-only boundary

`src/server/store.server.ts` starts with:

```ts
import '@tanstack/react-start/server-only'
```

The Start build treats that module as server-only. Domain logic and seed data
cannot accidentally be bundled into the client. Shared schemas and pure types
live in `src/lib/signals.ts` so both sides can import them safely.

### Streaming

Streaming is demonstrated in two independent ways:

1. **Deferred loader data.** The detail loader awaits the critical signal record,
   then starts `fetchSignalDigest` without awaiting it. TanStack Start streams
   that promise into the document and `<Await>` resolves it on the client.
2. **Typed async-generator server function.** `streamSignalAnalysis` returns
   `AsyncGenerator<AnalysisChunk>`. The detail page consumes it with `for await`
   and renders tokens, metadata, and the final message as they arrive.

`src/server.ts` makes the streaming entry point explicit:

```ts
const startHandler = createStartHandler(defaultStreamHandler)
export default createServerEntry({
  fetch(request, opts) {
    return startHandler(request, opts)
  },
})
```

### CSRF boundary

`src/start.ts` applies `createCsrfMiddleware` to server-function RPC endpoints.
Public page requests and the JSON API routes keep their normal semantics.

## Verification

```bash
npm run typecheck
npm run build
npm start
```

Useful checks while the server is running:

```text
GET /api/health
GET /api/signals?severity=critical&pageSize=4
GET /api/signals?severity=bogus          -> 400 with Zod issues
GET /signals/unknown-record              -> 404
GET /signals?page=999                    -> 307 canonical redirect
```

The detail page also exposes **Run analysis** (typed async-generator stream) and
**Update status** (POST server function). The new-signal form exercises the
same Zod schema in the browser and at the server boundary.
