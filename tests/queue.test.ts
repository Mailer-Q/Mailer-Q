import { beforeEach, describe, expect, it, vi } from "vitest";

const { QueueMock, WorkerMock, add, queueClose, workerClose } = vi.hoisted(
  () => {
    const add = vi.fn(async () => ({ id: "job-1" }));
    const queueClose = vi.fn(async () => undefined);
    const workerClose = vi.fn(async () => undefined);
    const QueueMock = vi.fn(() => ({ add, close: queueClose }));
    const WorkerMock = vi.fn(() => ({ close: workerClose }));
    return { QueueMock, WorkerMock, add, queueClose, workerClose };
  },
);

vi.mock("bullmq", () => ({ Queue: QueueMock, Worker: WorkerMock }));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn(), close: vi.fn() })),
  },
}));

import MailerQ from "../src/index";
import { DEFAULT_QUEUE_NAME, JOB_NAME } from "../src/constants";

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
    const [name, payload, options] = add.mock.calls[0];
    expect(name).toBe(JOB_NAME);
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

    expect(QueueMock).toHaveBeenCalledWith("custom-queue", {
      connection: redis,
    });
    expect(add.mock.calls[0][2]).toMatchObject({ attempts: 7 });
  });

  it("uses the default queue name when none is configured", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await mailer
      .contents({ to: "to@example.com", subject: "Hi" })
      .deliverLater();

    expect(QueueMock).toHaveBeenCalledWith(DEFAULT_QUEUE_NAME, {
      connection: redis,
    });
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
  it("starts a worker exactly once and returns it", () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    const worker = mailer.processQueue();

    expect(WorkerMock).toHaveBeenCalledTimes(1);
    // (queueName, processor, { connection })
    const [name, processor, options] = WorkerMock.mock.calls[0];
    expect(name).toBe(DEFAULT_QUEUE_NAME);
    expect(typeof processor).toBe("function");
    expect(options).toMatchObject({ connection: redis });
    expect(worker).toBeDefined();
  });

  it("reuses a single worker across calls", () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    mailer.processQueue();
    mailer.processQueue();

    expect(WorkerMock).toHaveBeenCalledTimes(1);
  });

  it("throws when no redis config is provided", () => {
    const mailer = MailerQ({ nodemailer: {} });
    expect(() => mailer.processQueue()).toThrow(/require a Redis config/);
    expect(WorkerMock).not.toHaveBeenCalled();
  });
});

describe("close", () => {
  it("closes the queue when one was created", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await mailer.contents({ to: "a@example.com", subject: "A" }).deliverLater();
    await mailer.close();

    expect(queueClose).toHaveBeenCalledTimes(1);
  });

  it("closes the worker when one was created", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    mailer.processQueue();
    await mailer.close();

    expect(workerClose).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when nothing was ever created", async () => {
    const mailer = MailerQ({ nodemailer: {}, redis });
    await expect(mailer.close()).resolves.toBeUndefined();
    expect(queueClose).not.toHaveBeenCalled();
    expect(workerClose).not.toHaveBeenCalled();
  });
});
