# MailerQ

MailerQ is a Redis-backed mailer queue system.

## Installation

```bash
npm install mailer-q
```

## Usage

- It is easiest to have MailerQ's configuration in another module:

config/mailers.js

```javascript
const config = {
	//Options here
}

const MailerQ = require("mailer-q")(config);

module.exports = MailerQ;
```

#### Available Options for MailerQ Configuration

- **defaultFrom** (Optional): Set the default sender
- **defaultTo** (Optional): Set the default recipient (not common)
- **host**: Sending host
- **port**: Port from which to send email
- **auth** (Optional): User and pass for authentication
- **htmlBody** (Optional): HTML to send in email message
- **renderer** (Optional): Method to render email templates
- **redis** (Optional): Redis connection settings (more on this below)

Example:

```javascript
const config = {
    defaultFrom: "Test Tester test@example.com",
    defaultTo: "recipient@test.com",
    host: "smtp.example.com",
    port: 587,
    auth: {
        user: "your username",
        pass: "your pass"
    },
	htmlBody: "<h1>Hello World!</h1>"
}
```

#### Optional Renderers

- [EJS Renderer](https://github.com/arsood/mailer-q-ejs): Use the popular [EJS templating syntax](http://www.embeddedjs.com/).

#### Sending Mail

- The module has two methods - `deliverNow` and `deliverLater`.
- `deliverNow` will attempt to send the email message immediately, vs `deliverLater` will use Redis to queue this action up for a later time.
- `deliverNow` and `deliverLater` must be chained with `contents`, which sets up the content to be sent.

Example:

```javascript
const MailerQ = require("./config/mailers");

MailerQ
.contents({
	from: "Test Sender sender@test.com",
	to: "recipient@example.com",
	subject: "Test message"
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

- **from** (Optional): Email address of sender
- **to** (Optional): Email address of recipient
- **subject**: Subject of message
- **templateFileName** (Optional): Name of file used as template (only use this is you're using a renderer plugin)
- **locals** (Optional): Object of local variables to be used in renderer

#### Redis Connection Settings

- If you need to connect to Redis in a custom way, you can set an object in the configuration options like so:

```javascript
const config = {
	redis: {
		port: 1234,
		host: "10.0.5.1",
		auth: "password",
		db: 3 //If provided, select a non-default Redis db,
		options: {
			//See https://github.com/mranney/node_redis#rediscreateclient
		}
	}
}
```

- You can also configure Redis using a connection string:

```javascript
const config = {
	redis: "redis://example.com:1234?redis_option=value&redis_option=value"
}
```