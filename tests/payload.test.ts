import { describe, expect, it, vi } from "vitest";

import { buildPayload } from "../src/payload";
import type { MailerQConfig } from "../src/types";

const baseConfig: MailerQConfig = { nodemailer: {} };

describe("buildPayload", () => {
  it("applies defaultFrom and defaultTo when the message omits them", () => {
    const config: MailerQConfig = {
      ...baseConfig,
      defaultFrom: "from@example.com",
      defaultTo: "to@example.com",
    };
    const payload = buildPayload(config, {
      subject: "Hi",
      htmlBody: "<p>hi</p>",
    });

    expect(payload.from).toBe("from@example.com");
    expect(payload.to).toBe("to@example.com");
  });

  it("prefers message from/to over config defaults", () => {
    const config: MailerQConfig = {
      ...baseConfig,
      defaultFrom: "default-from@example.com",
      defaultTo: "default-to@example.com",
    };
    const payload = buildPayload(config, {
      from: "msg-from@example.com",
      to: "msg-to@example.com",
      subject: "Hi",
    });

    expect(payload.from).toBe("msg-from@example.com");
    expect(payload.to).toBe("msg-to@example.com");
  });

  it("uses htmlBody when no template is provided", () => {
    const renderer = vi.fn();
    const payload = buildPayload(
      { ...baseConfig, renderer },
      { to: "to@example.com", subject: "Hi", htmlBody: "<p>raw</p>" },
    );

    expect(payload.html).toBe("<p>raw</p>");
    expect(renderer).not.toHaveBeenCalled();
  });

  it("invokes the renderer only when a templateFileName is present", () => {
    const renderer = vi.fn(() => "<p>rendered</p>");
    const payload = buildPayload(
      { ...baseConfig, renderer },
      {
        to: "to@example.com",
        subject: "Hi",
        templateFileName: "welcome",
        locals: { name: "Ada" },
      },
    );

    expect(renderer).toHaveBeenCalledWith("welcome", { name: "Ada" });
    expect(payload.html).toBe("<p>rendered</p>");
  });

  it("passes an empty locals object when locals are omitted", () => {
    const renderer = vi.fn(() => "<p>rendered</p>");
    buildPayload(
      { ...baseConfig, renderer },
      { to: "to@example.com", subject: "Hi", templateFileName: "welcome" },
    );

    expect(renderer).toHaveBeenCalledWith("welcome", {});
  });

  it("throws when no recipient is available", () => {
    expect(() =>
      buildPayload(baseConfig, { subject: "Hi", htmlBody: "<p>hi</p>" }),
    ).toThrow(/recipient is required/);
  });

  it("throws when subject is missing", () => {
    expect(() =>
      buildPayload(baseConfig, {
        to: "to@example.com",
        subject: "",
        htmlBody: "<p>hi</p>",
      }),
    ).toThrow(/subject/);
  });

  it("carries attachments through to the payload", () => {
    const attachments = [{ filename: "a.txt", content: "hello" }];
    const payload = buildPayload(baseConfig, {
      to: "to@example.com",
      subject: "Hi",
      attachments,
    });

    expect(payload.attachments).toBe(attachments);
  });
});
