import { Client, Intents } from 'discord.js';

import logger from '../logging';

const childLogger = logger.child({ component: 'discord client' });

const instance: Client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES],
});

// Indicates that discord is in the process of creating a new connection
let initializing = false;

// Opens a new connection with discord if one doesn't exist
// Returns a Promise<Client>
// this promise resolves immediately if discord has been initialized and it's ready
// otherwise it will wait until the client is ready
export const getDiscordClient = async (): Promise<Client> => {
  // the caller could destroy the client at any moment
  // this handles gracefully whether it's ready or not
  if (instance.isReady()) {
    childLogger.debug('ready');
    return Promise.resolve(instance);
  }

  if (!initializing) {
    // handle concurrent calls
    initializing = true;
    childLogger.debug('logging in');
    await (instance as Client).login();
    initializing = false;
  }

  childLogger.debug('still initializing');
  return new Promise((resolve) => {
    (instance as Client).on('ready', () => {
      childLogger.debug('logged in');
      resolve(instance);
    });
  });
};
