import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, transportClose, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(async () => ({ messageId: "abc-123" }));
  const transportClose = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail, close: transportClose }));
  return { sendMail, transportClose, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import MailerQ from "../src/index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deliverNow", () => {
  it("sends the built payload and resolves with nodemailer info", async () => {
    const mailer = MailerQ({ nodemailer: {} });
    const info = await mailer
      .contents({ to: "to@example.com", subject: "Hi", htmlBody: "<p>hi</p>" })
      .deliverNow();

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: "to@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
    });
    expect(info).toEqual({ messageId: "abc-123" });
  });

  it("reuses a single transporter across multiple sends", async () => {
    const mailer = MailerQ({ nodemailer: {} });
    await mailer.contents({ to: "a@example.com", subject: "A" }).deliverNow();
    await mailer.contents({ to: "b@example.com", subject: "B" }).deliverNow();

    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("keeps concurrent envelopes independent (no shared-state race)", async () => {
    const mailer = MailerQ({ nodemailer: {} });
    const a = mailer.contents({ to: "a@example.com", subject: "A" });
    const b = mailer.contents({ to: "b@example.com", subject: "B" });

    // Build b before sending a; a must still send its own payload.
    await a.deliverNow();
    await b.deliverNow();

    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "a@example.com" });
    expect(sendMail.mock.calls[1][0]).toMatchObject({ to: "b@example.com" });
  });

  it("close() closes the transporter", async () => {
    const mailer = MailerQ({ nodemailer: {} });
    await mailer.contents({ to: "a@example.com", subject: "A" }).deliverNow();
    await mailer.close();

    expect(transportClose).toHaveBeenCalledTimes(1);
  });
});
