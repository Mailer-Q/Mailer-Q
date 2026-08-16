import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  QueueMock,
  add,
  process: processFn,
  queueClose,
} = vi.hoisted(() => {
  const add = vi.fn(async () => ({ id: "job-1" }));
  const processFn = vi.fn();
  const queueClose = vi.fn(async () => undefined);
  const QueueMock = vi.fn(() => ({
    add,
    process: processFn,
    close: queueClose,
  }));
  return { QueueMock, add, process: processFn, queueClose };
});

vi.mock("bull", () => ({ default: QueueMock }));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn(), close: vi.fn() })),
  },
}));

import MailerQ from "../src/index";
import { DEFAULT_QUEUE_NAME } from "../src/constants";

const redis = { host: "127.0.0.1", port: 6379 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deliverLater", () => {
  it("enqueues the payload with the default attempts and resolves with the job", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    const job = await mailer
      .contents({ to: "to@example.com", subject: "Hi", htmlBody: "<p>hi</p>" })
      .deliverLater();

    expect(add).toHaveBeenCalledTimes(1);
    const [payload, options] = add.mock.calls[0];
    expect(payload).toMatchObject({ to: "to@example.com", subject: "Hi" });
    expect(options).toMatchObject({ attempts: 3 });
    expect(job).toEqual({ id: "job-1" });
  });

  it("honors config.sendAttempts and a custom queue name", async () => {
    const mailer = MailerQ({
      nodemailer: {},
      redis,
      sendAttempts: 7,
      queueName: "custom-queue",
    });
    await mailer
      .contents({ to: "to@example.com", subject: "Hi" })
      .deliverLater();

    expect(QueueMock).toHaveBeenCalledWith("custom-queue", { redis });
    expect(add.mock.calls[0][1]).toMatchObject({ attempts: 7 });
  });

  it("uses the default queue name when none is configured", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await mailer
      .contents({ to: "to@example.com", subject: "Hi" })
      .deliverLater();

    expect(QueueMock).toHaveBeenCalledWith(DEFAULT_QUEUE_NAME, { redis });
  });

  it("reuses a single queue instance across enqueues", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await mailer.contents({ to: "a@example.com", subject: "A" }).deliverLater();
    await mailer.contents({ to: "b@example.com", subject: "B" }).deliverLater();

    expect(QueueMock).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when no redis config is provided", () => {
    const mailer = MailerQ({ nodemailer: {} });
    const envelope = mailer.contents({ to: "to@example.com", subject: "Hi" });

    expect(() => envelope.deliverLater()).toThrow(/require a Redis config/);
    expect(QueueMock).not.toHaveBeenCalled();
  });
});

describe("processQueue", () => {
  it("registers a processor exactly once and returns the queue", () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    const queue = mailer.processQueue();

    expect(processFn).toHaveBeenCalledTimes(1);
    expect(queue).toBeDefined();
  });

  it("throws when no redis config is provided", () => {
    const mailer = MailerQ({ nodemailer: {} });
    expect(() => mailer.processQueue()).toThrow(/require a Redis config/);
  });
});

describe("close", () => {
  it("closes the queue when one was created", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await mailer.contents({ to: "a@example.com", subject: "A" }).deliverLater();
    await mailer.close();

    expect(queueClose).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when nothing was ever created", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await expect(mailer.close()).resolves.toBeUndefined();
    expect(queueClose).not.toHaveBeenCalled();
  });
});
