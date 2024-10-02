import nodemailer from "nodemailer";
import Queue from "bull";
import { MailerQConfig, MailerQMessage, MailerQMod } from "./types";

const MailerQ = (config: MailerQConfig) => {
  let mod = <MailerQMod>{};

  mod.contents = (message: MailerQMessage) => {
    const messagePayload = {
      from: message.from || config.defaultFrom,
      to: message.to || config.defaultTo,
      subject: message.subject,
      html:
        config.renderer && message.templateFileName
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

        return resolve();
      });
    });
  };

  mod.deliverLater = () => {
    let redisConfig;

    if (config.redis) {
      redisConfig = {
        redis: config.redis,
      };
    }

    const queue = new Queue("MailerQ SendEmail Process", redisConfig);
    const transporter = nodemailer.createTransport(config.nodemailer);

    queue.add(mod.messagePayload, {
      attempts: config.sendAttempts || 3,
    });

    return new Promise((resolve, reject) => {
      return queue.process((job) => {
        return transporter.sendMail(job.data, (err) => {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
      });
    });
  };

  return mod;
};

export default MailerQ;
