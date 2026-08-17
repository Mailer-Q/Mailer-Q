import type Mail from "nodemailer/lib/mailer";

import type { MailerQConfig, MailerQMessage } from "./types";

/**
 * Build a Nodemailer message payload from a message and the instance config.
 *
 * Pure and side-effect free — this is where defaults are applied, the renderer
 * is (conditionally) invoked, and required fields are validated.
 */
export function buildPayload(
  config: MailerQConfig,
  message: MailerQMessage,
): Mail.Options {
  const from = message.from ?? config.defaultFrom;
  const to = message.to ?? config.defaultTo;

  if (!to) {
    throw new Error(
      "MailerQ: a recipient is required. Set `to` on the message or `defaultTo` in config.",
    );
  }

  if (!message.subject) {
    throw new Error("MailerQ: a `subject` is required.");
  }

  // Only invoke the renderer when a template is actually provided; otherwise
  // fall back to the raw HTML body. This avoids calling the renderer with an
  // undefined template file name.
  const html =
    config.renderer && message.templateFileName
      ? config.renderer(message.templateFileName, message.locals ?? {})
      : message.htmlBody;

  return {
    from,
    to,
    subject: message.subject,
    html,
    attachments: message.attachments,
  };
}
