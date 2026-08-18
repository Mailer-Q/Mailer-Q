# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`mailer-q` is a published npm package: a small, Redis-backed mailer queue that wraps [Nodemailer](https://nodemailer.com/) for sending and [BullMQ](https://github.com/taskforcesh/bullmq) for queueing (with `ioredis` as the Redis client). It is written in TypeScript under `src/` and compiled with `tsc` to `dist/` (CommonJS + `.d.ts`), which `package.json` declares via `main`/`types`. Only `dist/` is published (`files: ["dist"]`); `dist/` is gitignored and rebuilt on `prepublishOnly`.

## Commands

- **Build:** `npm run build` (`tsc` → `dist/`).
- **Test:** `npm test` (Vitest, run once) or `npm run test:watch`.
- **Lint:** `npm run lint` (`eslint . --ext .ts`, with `@typescript-eslint` + Prettier).
- **Publish:** version bumps are standalone commits (see git history). `prepublishOnly` builds first; `npm publish` ships `dist/`, `README.md`, `package.json`.

Tests mock `nodemailer` and `bullmq` (via `vi.mock`), so they need no real SMTP server or Redis. The exception is `tests/queue.integration.test.ts`, which runs against a real Redis + BullMQ (gated on `REDIS_HOST`; `yarn test:integration`).

## Architecture

`MailerQ(config)` (default export in `src/index.ts`) is a **factory** returning an instance `{ contents, processQueue, close }`. It is a breaking change from v2's `MailerQ().config(options)` chain — see the README upgrade note.

- The transporter and BullMQ queue are created **lazily and memoized** on the instance, then reused across sends. A shared `connection()` guard throws if `config.redis` is absent (used by both `getQueue()` and `processQueue()`).
- `contents(message)` builds the Nodemailer payload via the pure `buildPayload()` in `src/payload.ts` and returns a **fresh envelope** `{ payload, deliverNow, deliverLater }` that closes over that payload. No per-message state is stored on the instance — this is deliberate, to avoid the v2 shared-mutable-`messagePayload` race.
  - `deliverNow()` resolves with Nodemailer's `SentMessageInfo`.
  - `deliverLater()` is a **producer only**: it enqueues (via the BullMQ `Queue`) and resolves with the `Job`. BullMQ requires a job name, so it adds under `JOB_NAME`.
- `processQueue()` is the **consumer**: run once in a worker process, it creates and memoizes a BullMQ `Worker` and returns it (for `completed`/`failed` listeners). Keep producer (`deliverLater`) and consumer (`processQueue`) separate — do not re-merge them into one call, which was the v2 bug (per-call queues leaked Redis connections and resolved on the wrong job).
- `close()` closes the queue and transporter for graceful shutdown.

`buildPayload()` (`src/payload.ts`) applies `defaultFrom`/`defaultTo`, validates that a recipient and `subject` are present, and only invokes `config.renderer` when a `templateFileName` is given (otherwise falls back to `htmlBody`).

Renderers are pluggable and shipped as separate packages (`mailer-q-ejs`, `mailer-q-handlebars`, `mailer-q-pug`); a renderer is any `(templateFileName, locals) => htmlString` function passed as `config.renderer`. Their call sites use the v2 API and will need updating for the v3 factory shape.
