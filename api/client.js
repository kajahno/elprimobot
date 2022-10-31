import { Client, Intents } from "discord.js";

const instance = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] });

// Indicates that discord is in the process of creating a new connection
let initializing = false;

// Opens a new connection with discord if one doesn't exist
// Returns a Promise<Client>
// this promise resolves immediately if discord has been initialized and it's ready
// otherwise it will wait until the client is ready
export const getDiscordClient = () => {
    // the caller could destroy the client at any moment
    // this handles gracefully whether it's ready or not
    if (instance.isReady()) {
        return Promise.resolve(instance);
    }

    if (!initializing) {
        // handle concurrent calls
        initializing = true;
        instance.login().then(() => {
            initializing = false;
        });
    }

    return new Promise((resolve) => {
        instance.on("ready", () => {
            resolve(instance);
        });
    });
};
