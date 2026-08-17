import type { Job, JobOptions, Queue } from "bull";
import type { RedisOptions } from "ioredis";
import type { SentMessageInfo, Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/** Local variables passed through to a template renderer. */
export type MailerQLocals = Record<string, unknown>;

/**
 * A renderer turns a template file plus locals into an HTML string. Provided by
 * the optional renderer plugins (mailer-q-ejs / -handlebars / -pug).
 */
export type MailerQRenderer = (
  templateFileName: string,
  locals: MailerQLocals,
) => string;

export interface MailerQConfig {
  /** Nodemailer transport options (see https://nodemailer.com/smtp/). */
  nodemailer: SMTPTransport | SMTPTransport.Options | string;
  /** Default sender used when a message omits `from`. */
  defaultFrom?: string;
  /** Default recipient used when a message omits `to`. */
  defaultTo?: string;
  /** Optional template renderer. */
  renderer?: MailerQRenderer;
  /** Retry attempts for queued sends. Defaults to DEFAULT_SEND_ATTEMPTS. */
  sendAttempts?: number;
  /** Redis connection options. Required for `deliverLater` / `processQueue`. */
  redis?: RedisOptions;
  /** Bull queue name. Defaults to DEFAULT_QUEUE_NAME. */
  queueName?: string;
}

export interface MailerQMessage {
  from?: string;
  to?: string | string[];
  subject: string;
  /** Raw HTML body. Used when no `templateFileName` is provided. */
  htmlBody?: string;
  /** Template file name, passed to `config.renderer`. */
  templateFileName?: string;
  /** Local variables, passed to `config.renderer`. */
  locals?: MailerQLocals;
  /** Attachments per Nodemailer (https://nodemailer.com/message/attachments/). */
  attachments?: Mail.Options["attachments"];
}

/** A message whose content is built and bound, ready to deliver. */
export interface Envelope {
  /** The built Nodemailer payload. */
  readonly payload: Mail.Options;
  /** Send immediately; resolves with Nodemailer's send info. */
  deliverNow: () => Promise<SentMessageInfo>;
  /** Enqueue for a worker to process later; resolves with the Bull job. */
  deliverLater: (options?: JobOptions) => Promise<Job<Mail.Options>>;
}

export interface MailerQInstance {
  /** Build a deliverable envelope from a message. */
  contents: (message: MailerQMessage) => Envelope;
  /**
   * Start processing queued messages. Run once in a worker process; returns the
   * underlying Bull queue so callers can attach `completed`/`failed` listeners.
   */
  processQueue: () => Queue<Mail.Options>;
  /** Gracefully close the queue and transporter connections. */
  close: () => Promise<void>;
}

export type { SentMessageInfo, Transporter };
