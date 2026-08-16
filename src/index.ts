import Queue from "bull";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

import { DEFAULT_QUEUE_NAME, DEFAULT_SEND_ATTEMPTS } from "./constants";
import { buildPayload } from "./payload";
import type {
  Envelope,
  MailerQConfig,
  MailerQInstance,
  MailerQMessage,
} from "./types";

/**
 * Create a MailerQ instance bound to a configuration.
 *
 * The transporter and queue are created lazily and reused across sends, and the
 * queue is used strictly as a producer by `deliverLater`; call `processQueue`
 * once in a worker process to consume it. Call `close` for a graceful shutdown.
 */
const MailerQ = (config: MailerQConfig): MailerQInstance => {
  let transporter: Transporter | undefined;
  let queue: Queue.Queue<Mail.Options> | undefined;

  const getTransporter = (): Transporter => {
    if (!transporter) {
      transporter = nodemailer.createTransport(config.nodemailer);
    }
    return transporter;
  };

  const getQueue = (): Queue.Queue<Mail.Options> => {
    if (!config.redis) {
      throw new Error(
        "MailerQ: `deliverLater` and `processQueue` require a Redis config. None was found.",
      );
    }
    if (!queue) {
      queue = new Queue<Mail.Options>(config.queueName ?? DEFAULT_QUEUE_NAME, {
        redis: config.redis,
      });
    }
    return queue;
  };

  const contents = (message: MailerQMessage): Envelope => {
    const payload = buildPayload(config, message);

    return {
      payload,
      deliverNow: () => getTransporter().sendMail(payload),
      deliverLater: (options) =>
        getQueue().add(payload, {
          attempts: config.sendAttempts ?? DEFAULT_SEND_ATTEMPTS,
          ...options,
        }),
    };
  };

  const processQueue = (): Queue.Queue<Mail.Options> => {
    const q = getQueue();
    const t = getTransporter();
    q.process((job) => t.sendMail(job.data));
    return q;
  };

  const close = async (): Promise<void> => {
    if (queue) {
      await queue.close();
    }
    if (transporter) {
      transporter.close();
    }
  };

  return { contents, processQueue, close };
};

export default MailerQ;
export type {
  Envelope,
  MailerQConfig,
  MailerQInstance,
  MailerQMessage,
  MailerQLocals,
  MailerQRenderer,
} from "./types";
