# MailerQ

MailerQ is a Redis-backed mailer queue system.

## Installation

```bash
npm install mailer-q --save
```

## Usage

- It is easiest to have MailerQ's configuration in another module:

config/mailers.js

```javascript
const MailerQ = require("mailer-q")();

const options = {
  //Options here
};

module.exports = MailerQ.config(options);
```

#### Available Options for MailerQ Configuration

- **nodemailer**: Configuration object for Nodemailer. An example is shown below but all options can be found in the Nodemailer documentation here: https://nodemailer.com/smtp/.
- **defaultFrom** (Optional): Set the default sender
- **defaultTo** (Optional): Set the default recipient (not common)
- **renderer** (Optional): Method to render email templates
- **sendAttempts** (Optional): Number of times MailerQ will attempt to send your mail. Defaults to 3.
- **redis** (Optional): Configuration options to configure Redis. These configuration options come from ioredis and you can find all options in their documentation here: https://github.com/luin/ioredis/blob/master/API.md.

Example:

```javascript
const config = {
  nodemailer: {
    host: "smtp.example.com",
    port: 587,
    auth: {
      user: "your username",
      pass: "your pass"
    }
  },
  defaultFrom: "Test Tester test@example.com",
  defaultTo: "recipient@test.com",
  sendAttempts: 5
};
```

#### Optional Renderers

- [EJS Renderer](https://github.com/mailer-q/mailer-q-ejs): Use the [EJS templating syntax](https://ejs.co/).
- [Handlebars Renderer](https://github.com/mailer-q/mailer-q-handlebars): Use the [Handlebars templating syntax](http://handlebarsjs.com/).
- [Pug Renderer](https://github.com/mailer-q/mailer-q-pug): Use the [Pug templating syntax](https://pugjs.org/api/getting-started.html).

#### Sending Mail

- The module has two methods - `deliverNow` and `deliverLater`.
- `deliverNow` will attempt to send the email message immediately, vs `deliverLater` will use Redis to queue this action up for a later time.
- `deliverNow` and `deliverLater` must be chained with `contents`, which sets up the content to be sent.

Example:

```javascript
const MailerQ = require("./config/mailers");

MailerQ.contents({
  from: "Test Sender sender@test.com",
  to: "recipient@example.com",
  subject: "Test message",
  htmlBody: "<h1>HTML message here!</h1>"
})
  .deliverNow()
  .then(() => {
    console.log("Message sent!");
  })
  .catch((err) => {
    console.log(err);
  });
```

#### Available Options for `.contents()`

- **subject**: Subject of message
- **from** (Optional): Email address of sender. Optional only if not using defaultFrom in the initial configuration.
- **to** (Optional): Email address of recipient. Optional only if not using defaultTo in the initial configuration.
- **templateFileName** (Optional): Name of file used as template (only use this if you're using a renderer plugin)
- **htmlBody** (Optional): HTML to send in email message
- **locals** (Optional): Object of local variables to be used in renderer (only use this if you're using a renderer plugin)
- **attachments** (Optional): Array of attachment objects as specified by Nodemailer: https://nodemailer.com/message/attachments/.
