/**
 * Slack App Setting
 * Enable Socket Mode
 * Enable Event Subscriptions
 * OAuth & Permissions: app_mentions:read, chat:write
 * @slack/bolt requires at least NodeJs version 12.13.0
 */
const { App } = require("@slack/bolt");
require("dotenv").config();
const { openAIApi, OpenAICommand } = require("./OpenAICommand");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Socket Mode doesn't listen on a port, but in case you want your app to respond to OAuth,
  // you still need to listen on some port!
  port: process.env.PORT || 3000,
});
const openAICommand = new OpenAICommand(openAIApi);

app.event("app_mention", async ({ event, say }) => {
  try {
    const answer = await openAICommand.createCompletion(event.text);
    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${event.user}> ${answer}`,
          },
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
});

app.command("/gen_image", async ({ command, ack, say }) => {
  try {
    await ack(); // Acknowledge command request
    const base64Str = await openAICommand.generateImage(command.text);
    const buffer = Buffer.from(base64Str, "base64");

    const filesUploadRes = await app.client.files.upload({
      file: buffer,
      filename: "image.png",
      filetype: "auto",
      title: command.text,
      initial_comment: `<@${command.user_id}> ${command.text}`,
    });

    const sharedPublicUrlRes = await app.client.files.sharedPublicURL({
      file: filesUploadRes.file.id,
    });

    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${command.user_id}> ${command.text}`,
          },
        },
        {
          type: "image",
          title: {
            type: "plain_text",
            text: command.text,
            emoji: true,
          },
          image_url: sharedPublicUrlRes.file.permalink_public,
          alt_text: "generated from OpenAI",
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running!");
})();
