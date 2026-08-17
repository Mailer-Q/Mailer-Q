import { describe, expect, it } from "vitest";

import MailerQ from "../src/index";
import type { MailerQConfig } from "../src/types";

/**
 * End-to-end queue test against a REAL Redis and REAL Bull (the unit tests in
 * queue.test.ts mock both). Nodemailer runs with `jsonTransport`, so no SMTP
 * server is needed — sends resolve locally with the message as JSON.
 *
 * Skipped unless REDIS_HOST is set, so the default `yarn test` run stays green
 * without infrastructure. To run it:
 *
 *   docker run --rm -d -p 6379:6379 redis:7
 *   REDIS_HOST=127.0.0.1 yarn test
 *
 * (or `yarn test:integration`, which sets REDIS_HOST for you).
 */
const redisHost = process.env.REDIS_HOST;
const describeIntegration = redisHost ? describe : describe.skip;

// jsonTransport isn't part of the SMTP options the config type narrows to, so
// cast it through the accepted transport type for this no-SMTP test transport.
const jsonTransport = {
  jsonTransport: true,
} as unknown as MailerQConfig["nodemailer"];

describeIntegration("MailerQ queue (integration: real Redis + Bull)", () => {
  const redis = {
    host: redisHost ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
  };

  it("delivers a queued message end to end via deliverLater + processQueue", async () => {
    const mailer = MailerQ({
      nodemailer: jsonTransport,
      redis,
      // Unique queue name per run so leftover jobs can't bleed between runs.
      queueName: `mailer-q-itest-${Date.now()}`,
      sendAttempts: 1,
    });

    const queue = mailer.processQueue();

    const completed = new Promise<{ jobId: string; result: SendInfo }>(
      (resolve, reject) => {
        queue.on("completed", (job, result) =>
          resolve({ jobId: String(job.id), result: result as SendInfo }),
        );
        queue.on("failed", (_job, err) => reject(err));
      },
    );

    const job = await mailer
      .contents({
        from: "sender@example.com",
        to: "recipient@example.com",
        subject: "Integration test",
        htmlBody: "<p>hello</p>",
      })
      .deliverLater();

    const { jobId, result } = await completed;

    // The consumer processed the exact job the producer enqueued.
    expect(jobId).toBe(String(job.id));
    // jsonTransport resolves with a real messageId and the message as JSON.
    expect(result.messageId).toBeTruthy();
    const message = JSON.parse(result.message) as { subject: string };
    expect(message.subject).toBe("Integration test");
    expect(result.message).toContain("recipient@example.com");

    await queue.obliterate({ force: true });
    await mailer.close();
  }, 20000);
});

// Minimal shape of nodemailer's jsonTransport SentMessageInfo, after Bull's
// JSON round-trip through Redis.
interface SendInfo {
  messageId: string;
  message: string;
}
