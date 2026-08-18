# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2026-08-18

### Changed

- Relicensed from ISC to MIT, and added the `LICENSE` file to the published package. The
  `3.0.0` release on npm still declared ISC; this is a metadata-only release with no code
  changes. (`3.0.1` was tagged but never published to npm, so this ships as `3.0.2`.)

## [3.0.0] - 2026-08-16

### Changed

- **BREAKING:** MailerQ is now created with a factory that takes the config directly,
  replacing the `MailerQ().config(options)` chain. Import the default export and call it
  with your options: `const MailerQ = require("mailer-q").default; MailerQ(options);`.
- **BREAKING:** `deliverLater()` is now a **producer only** — it enqueues a job and
  resolves with the Bull `Job`. Consuming the queue is handled separately by the new
  `processQueue()` method.
- **BREAKING:** `deliverNow()` and `deliverLater()` now resolve with Nodemailer's send
  `info` and the Bull `Job` respectively.
- **BREAKING:** `deliverLater()` and `processQueue()` throw if no `redis` config is
  present.
- Migrated the package to TypeScript. The library is compiled to `dist/` and now ships
  bundled type definitions (`.d.ts`).
- Bumped Nodemailer from 6 to 9, resolving two high-severity advisories (raw-option
  bypass and addressparser denial-of-service).

### Added

- `processQueue()` — run once in a worker process to consume the queue and send mail. It
  returns the underlying Bull queue so you can attach `completed`/`failed` listeners.
- `close()` — gracefully closes the queue and transporter connections for clean shutdown.
- GitHub Actions CI (lint, build, and test across Node 18/20/22) and a tag-triggered npm
  publish workflow.

### Fixed

- Eliminated the v2 shared-mutable-payload race: `contents()` now returns a fresh envelope
  per message instead of storing state on the instance.
- Fixed the v2 queue defect where per-call queues leaked Redis connections and could
  resolve on the wrong job.

## [2.0.2] - 2024

### Changed

- Documentation updates for the attachments feature.

## [2.0.1] - 2024

### Added

- Support for message attachments via Nodemailer.

## [2.0.0] - 2024

### Changed

- Configuration and delivery API refinements.

## [1.x] - earlier

- Initial releases (1.0.0 – 1.1.0): the original Redis-backed mailer queue wrapping
  Nodemailer and Bull.

[3.0.2]: https://github.com/Mailer-Q/Mailer-Q/releases/tag/v3.0.2
[3.0.0]: https://github.com/Mailer-Q/Mailer-Q/releases/tag/v3.0.0
[2.0.2]: https://github.com/Mailer-Q/Mailer-Q/releases/tag/v2.0.2
[2.0.0]: https://github.com/Mailer-Q/Mailer-Q/releases/tag/v2.0.0
