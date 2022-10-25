import { Client, Intents } from 'discord.js';

export class Discord {
    static instance = null;

    static getReadyInstance = async() => {
        if (Discord.instance !== null) {
            return discord;
        }
        console.log('getting new instance');
        
        const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
        
        // wait for the client to be ready
        await client.login()
        Discord.instance = client
        return Discord.instance;
    } 
}
