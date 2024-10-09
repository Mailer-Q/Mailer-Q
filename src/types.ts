import Mail from "nodemailer/lib/mailer";
import type { RedisOptions } from "ioredis";

export type MailerQMod = {
  contents: (message: MailerQMessage) => MailerQMod;
  deliverNow: () => Promise<boolean>;
  deliverLater: () => Promise<boolean>;
  messagePayload: Mail.Options;
};

export type MailerQConfig = {
  nodemailer: any;
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

export type MailerQMessage = Mail.Options & {
  templateFileName?: string;
  locals?: { [key: string]: any };
  htmlBody?: string;
};
