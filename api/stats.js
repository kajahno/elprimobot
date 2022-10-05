import { config } from './../config.js';
import { SnowflakeUtil, MessageEmbed } from "discord.js";

export class Stats {
    constructor(discordClient) {
        this.client = discordClient;
        this.stats = {};
    }

    initializeStats(prev_message) {
        /*
        This is a placeholder.
        We have some limitations on how many messages we can load per request
        we can have daily pulls, use the latest message as the last source of truth
        and update with new stats
        let stats = {
            username1: {
                messages: 5, 
                words: 20, 
                letters: 150
            }
        }
       */
        return {};
    }

    async _buildStats(channels, after) {
        let stats = this.initializeStats();

        for (let channel of channels) {
            if (channel.type !== 'GUILD_TEXT') {
                continue;
            }
            const messages = await channel.messages.fetch({ limit: 100, after: after })
            for (let message of messages.values()) {
                let username = message.author.username;
                let user_stats = stats[username] = stats[username] || {
                    posts: 0,
                    words: 0,
                    letters: 0
                };
                user_stats.posts++;
                user_stats.words += message.content.split(' ').length;
                user_stats.letters += message.content.length;
            }
        }


        return stats;
    }

    async postDailyStats() {
        let dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        let channels = await dominationGuild.channels.fetch();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // https://discord.com/developers/docs/reference#snowflakes
        let midnight = SnowflakeUtil.generate(today);
        let stats = await this._buildStats(channels.values(), midnight);
        console.log(stats);

        let postsValue = Object.keys(stats).map(username => `${username} (${stats[username].posts})`).join('\n');
        let wordsValue = Object.keys(stats).map(username => `${stats[username].words} (${stats[username].letters})`).join('\n');
        const dailyStats = new MessageEmbed()
            .setColor(0x0099FF).addFields(
                { name: 'user (posts)', value: postsValue, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: 'word (letters)', value: wordsValue, inline: true });

        const channel = channels.find(
            (channel) => channel.name === config.DEV_PRIMOBOT_CHANNEL
        );

        await channel.send({ content: "**Daily Stats**", embeds: [dailyStats] });
    }
}
