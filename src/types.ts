import Mail from "nodemailer/lib/mailer";

export type MailerQMod = {
  config: any;
  contents: any;
  deliverNow: any;
  deliverLater: any;
  messagePayload: any;
};

export type MailerQConfig = {
  nodemailer: Mail.Options;
  defaultFrom?: string;
  defaultTo?: string;
  renderer?: MailerQRenderer;
  sendAttempts?: number;
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
  locals?: any;
  htmlBody?: string;
  attachments?: Mail.Attachment[];
};
