import nodemailer from "nodemailer";
import Queue from "bull";
import { MailerQConfig, MailerQMessage, MailerQMod } from "./types";
import { DEFAULT_QUEUE_NAME, DEFAULT_SEND_ATTEMPTS } from "./constants";

const MailerQ = (config: MailerQConfig) => {
  let mod = <MailerQMod>{};

  mod.contents = (message: MailerQMessage) => {
    const messagePayload = <MailerQMessage>{
      from: message.from || config.defaultFrom,
      to: message.to || config.defaultTo,
      subject: message.subject,
      html:
        config.renderer && message.templateFileName && message.locals
          ? config.renderer(message.templateFileName, message.locals)
          : message.htmlBody,
      attachments: message.attachments,
    };

    mod.messagePayload = messagePayload;

    return mod;
  };

  mod.deliverNow = () => {
    const transporter = nodemailer.createTransport(config.nodemailer);

    return new Promise((resolve, reject) => {
      transporter.sendMail(mod.messagePayload, (err) => {
        if (err) {
          return reject(err);
        }

        return resolve(true);
      });
    });
  };

  mod.deliverLater = () => {
    if (!config.redis) {
      throw new Error(
        "MailerQ: The deliverLater method requires Redis. No Redis config found."
      );
    }

    const queue = new Queue(config.queueName || DEFAULT_QUEUE_NAME, {
      redis: config.redis,
    });

    const transporter = nodemailer.createTransport(config.nodemailer);

    queue.add(mod.messagePayload, {
      attempts: config.sendAttempts || DEFAULT_SEND_ATTEMPTS,
    });

    return new Promise((resolve, reject) => {
      return queue.process((job) => {
        return transporter.sendMail(job.data, (err) => {
          if (err) {
            return reject(err);
          }

          return resolve(true);
        });
      });
    });
  };

  return mod;
};

export default MailerQ;
