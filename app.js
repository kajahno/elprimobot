require("dotenv").config();

const CronJob = require("cron").CronJob;

const { Client, Intents } = require('discord.js');

const config = {
  APP_ID: process.env.APP_ID || undefined,
  GUILD_ID: process.env.GUILD_ID || undefined,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
  PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
};


// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');

    // Find channel
    const channelName = "test-bot-ignore"
    console.log(client.isReady())
    const channel = client.channels.cache.find(channel => channel.name === channelName)
    channel.send("Hello mates! Time to dominate now 🔥")

});

// Login to Discord with your client's token
client.login();

// Main cron
const job = new CronJob(
  "*/5 * * * * *",
  function () {
    console.log("You will see this message every second");
  },
  null,
  true,
  null,
  null,
  null,
  "0"
);
