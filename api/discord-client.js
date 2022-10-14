import { Client, Intents } from 'discord.js';

export let isClientReady = false;

const discordClient = new Client({ intents: [Intents.FLAGS.GUILDS] });

discordClient.once('ready', async () => {
  isClientReady = true;
});
discordClient.login();

export default discordClient;
