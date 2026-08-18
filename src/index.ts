import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

import {
  DEFAULT_QUEUE_NAME,
  DEFAULT_SEND_ATTEMPTS,
  JOB_NAME,
} from "./constants";
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
 * The transporter and queue are created lazily and reused across sends. The
 * queue is used strictly as a producer by `deliverLater`; call `processQueue`
 * once in a worker process to spin up the BullMQ worker that consumes it. Call
 * `close` for a graceful shutdown.
 */
const MailerQ = (config: MailerQConfig): MailerQInstance => {
  let transporter: Transporter | undefined;
  let queue: Queue<Mail.Options> | undefined;
  let worker: Worker<Mail.Options> | undefined;

  const getTransporter = (): Transporter => {
    if (!transporter) {
      transporter = nodemailer.createTransport(config.nodemailer);
    }
    return transporter;
  };

  // Producer and consumer both need a Redis connection; require it up front so
  // the failure is a clear config error rather than a connection timeout.
  const connection = () => {
    if (!config.redis) {
      throw new Error(
        "MailerQ: `deliverLater` and `processQueue` require a Redis config. None was found.",
      );
    }
    return config.redis;
  };

  const getQueue = (): Queue<Mail.Options> => {
    if (!queue) {
      queue = new Queue<Mail.Options>(config.queueName ?? DEFAULT_QUEUE_NAME, {
        connection: connection(),
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
        getQueue().add(JOB_NAME, payload, {
          attempts: config.sendAttempts ?? DEFAULT_SEND_ATTEMPTS,
          ...options,
        }),
    };
  };

  const processQueue = (): Worker<Mail.Options> => {
    const conn = connection();
    const t = getTransporter();
    if (!worker) {
      worker = new Worker<Mail.Options>(
        config.queueName ?? DEFAULT_QUEUE_NAME,
        (job) => t.sendMail(job.data),
        { connection: conn },
      );
    }
    return worker;
  };

  const close = async (): Promise<void> => {
    if (worker) {
      await worker.close();
    }
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
