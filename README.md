# MailerQ

[![npm version](https://img.shields.io/npm/v/mailer-q.svg)](https://www.npmjs.com/package/mailer-q)
[![npm downloads](https://img.shields.io/npm/dm/mailer-q.svg)](https://www.npmjs.com/package/mailer-q)
[![CI](https://github.com/Mailer-Q/Mailer-Q/actions/workflows/ci.yml/badge.svg)](https://github.com/Mailer-Q/Mailer-Q/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![node](https://img.shields.io/node/v/mailer-q.svg)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/mailer-q.svg)](./LICENSE)

MailerQ is a small, Redis-backed mailer queue for Node.js, written in TypeScript. It wraps
[Nodemailer](https://nodemailer.com/) for sending and [Bull](https://github.com/OptimalBits/bull)
for queueing, so you can send mail immediately or enqueue it for a worker to deliver — with
pluggable template renderers and typed configuration.

## Installation

```bash
npm install mailer-q --save
```

## Usage

- It is easiest to keep MailerQ's configuration in its own module:

`config/mailers.js`

```javascript
const MailerQ = require("mailer-q").default;
// or, with ESM / TypeScript: import MailerQ from "mailer-q";

const options = {
  // Options here
};

module.exports = MailerQ(options);
```

### Available Options for MailerQ Configuration

- **nodemailer**: Configuration object for Nodemailer. An example is shown below but all options can be found in the Nodemailer documentation here: https://nodemailer.com/smtp/.
- **defaultFrom** (Optional): Set the default sender.
- **defaultTo** (Optional): Set the default recipient (not common).
- **renderer** (Optional): Method to render email templates.
- **sendAttempts** (Optional): Number of times MailerQ will attempt to send queued mail. Defaults to 3.
- **redis** (Optional): Redis connection options (from [ioredis](https://github.com/redis/ioredis)). Required for `deliverLater` and `processQueue`.
- **queueName** (Optional): Name of the Bull queue. Defaults to `"MailerQ SendEmail Process"`.

Example:

```javascript
const config = {
  nodemailer: {
    host: "smtp.example.com",
    port: 587,
    auth: {
      user: "your username",
      pass: "your pass",
    },
  },
  defaultFrom: "Test Tester <test@example.com>",
  defaultTo: "recipient@test.com",
  sendAttempts: 5,
  redis: { host: "127.0.0.1", port: 6379 },
};
```

### Optional Renderers

- [EJS Renderer](https://github.com/Mailer-Q/Mailer-Q-EJS): Use the [EJS templating syntax](https://ejs.co/).
- [Handlebars Renderer](https://github.com/Mailer-Q/Mailer-Q-Handlebars): Use the [Handlebars templating syntax](http://handlebarsjs.com/).
- [Pug Renderer](https://github.com/Mailer-Q/Mailer-Q-Pug): Use the [Pug templating syntax](https://pugjs.org/api/getting-started.html).

A renderer is any function `(templateFileName, locals) => htmlString`.

### Sending Mail

Build the message content with `contents()`, then chain either `deliverNow()` or
`deliverLater()`:

- `deliverNow()` sends immediately and resolves with Nodemailer's `info`.
- `deliverLater()` enqueues the message and resolves with the Bull `Job`. A worker then
  processes it (see [Processing the queue](#processing-the-queue)).

```javascript
const MailerQ = require("./config/mailers");

MailerQ.contents({
  from: "Test Sender <sender@test.com>",
  to: "recipient@example.com",
  subject: "Test message",
  htmlBody: "<h1>HTML message here!</h1>",
})
  .deliverNow()
  .then((info) => {
    console.log("Message sent!", info.messageId);
  })
  .catch((err) => {
    console.log(err);
  });
```

#### Available Options for `.contents()`

- **subject**: Subject of the message (required).
- **from** (Optional): Sender address. Optional only if `defaultFrom` is configured.
- **to** (Optional): Recipient address. Optional only if `defaultTo` is configured.
- **templateFileName** (Optional): Name of the template file (only with a renderer plugin).
- **htmlBody** (Optional): HTML to send. Used when no `templateFileName` is provided.
- **locals** (Optional): Variables passed to the renderer (only with a renderer plugin).
- **attachments** (Optional): Array of attachment objects per Nodemailer: https://nodemailer.com/message/attachments/.

### Processing the queue

`deliverLater()` only enqueues. Run `processQueue()` **once in a worker process** to
consume the queue and actually send the mail. It returns the underlying Bull queue so you
can listen for events:

```javascript
const MailerQ = require("./config/mailers");

const queue = MailerQ.processQueue();

queue.on("completed", (job) => console.log("Sent:", job.id));
queue.on("failed", (job, err) => console.error("Failed:", job.id, err));
```

### Shutting down

Call `close()` to gracefully close the queue and transporter connections (e.g. on process
shutdown):

```javascript
await MailerQ.close();
```

## Development

```bash
npm run build   # compile TypeScript to dist/
npm test        # run the Vitest suite
npm run lint    # eslint
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the notable changes in each release, including the
v2 → v3 breaking changes and how to migrate.
