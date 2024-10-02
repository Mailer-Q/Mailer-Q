import Mail from "nodemailer/lib/mailer";
import type { RedisOptions } from "ioredis";

export type MailerQMod = {
  contents: (message: MailerQMessage) => MailerQMod;
  deliverNow: () => Promise<boolean>;
  deliverLater: () => Promise<boolean>;
  messagePayload: MailerQMessage;
};

export type MailerQConfig = {
  nodemailer: Mail.Options;
  defaultFrom?: string;
  defaultTo?: string;
  renderer?: MailerQRenderer;
  sendAttempts?: number;
  redis?: RedisOptions;
  queueName?: string;
};

export type MailerQRenderer = (
  templateFileName: string,
  locals: { [key: string]: any }
) => void;

export type MailerQMessage = {
  subject: string;
  from?: string;
  to?: string;
  templateFileName?: string;
  locals?: { [key: string]: any };
  htmlBody?: string;
  attachments?: Mail.Attachment[];
};
