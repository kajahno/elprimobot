import { config } from './../config.js';
import { SnowflakeUtil, MessageEmbed } from "discord.js";

const removeParentheses = word => word.replace(/\(|\)/g, '');
export class Stats {
    constructor(discordClient) {
        this.client = discordClient;
        this.stats = {};
    }

    /*
        Returns a snowflake which represents the time x days in the past
        https://discord.com/developers/docs/reference#snowflakes
    */
    _getSnowflakeFromDay = days => {
        let d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + days);
        return SnowflakeUtil.generate(d);
    }

    _getStatsChannel = async () => {
        let dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.STATS_CHANNEL
        );
    }

    _computeWeeklyStats = async () => {
        let sevenDaysAgo = this._getSnowflakeFromDay(-7);
        let statsChannel = await this._getStatsChannel();

        let messages = await statsChannel.messages.fetch({ limit: 100, after: sevenDaysAgo });
        let collectedDays = new Set();
        let stats = {};

        for (let message of messages.values()) {
            let isBot = message.author.username === 'elprimobot';
            let isDaily = message.content.indexOf('Daily') > -1;
            let day = new Date(message.createdTimestamp);
            let key = `${day.getDay()}/${day.getMonth()}/${day.getFullYear()}`;
            // we only take the latest stat posted for the bot that day
            if (!isBot || !isDaily || collectedDays.has(key)) {
                continue;
            }
            collectedDays.add(key);

            let fields = message.embeds[0].fields;
            let firstColumn = fields[0].value.split('\n');
            let secondColumn = fields[2].value.split('\n');
            let i = 0;
            while (i < firstColumn.length) {
                let [username, posts] = firstColumn[i].split(' ');
                let [words, letters] = secondColumn[i].split(' ');
                stats[username] = stats[username] || { posts: 0, words: 0, letters: 0 };
                stats[username].posts += Number(removeParentheses(posts));
                stats[username].words += Number(words);
                stats[username].letters += Number(removeParentheses(letters));
                i++;
            }
        }

        return stats;
    }

    _computeDailyStats = async () => {
        let dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        let channels = await dominationGuild.channels.fetch();
        let after = this._getSnowflakeFromDay(-1);
        let stats = {};

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

    _sendStatsChannel = async (stats, title) => {
        if (!stats || !Object.keys(stats).length) {
            // nothing to update
            return;
        }
        let postsValue = Object.keys(stats).map(username => `${username} (${stats[username].posts})`).join('\n');
        let wordsValue = Object.keys(stats).map(username => `${stats[username].words} (${stats[username].letters})`).join('\n');
        const dailyStats = new MessageEmbed()
            .setColor(0x0099FF).addFields(
                { name: 'user (posts)', value: postsValue, inline: true },
                // Add a blank field to the embed
                // https://discordjs.guide/popular-topics/embeds.html#embed-preview
                { name: '\u200B', value: '\u200B', inline: true },
                { name: 'word (letters)', value: wordsValue, inline: true });

        let statsChannel = await this._getStatsChannel();
        await statsChannel.send({ content: title, embeds: [dailyStats] });
    }

    /*
        Collects all the messages in the last 24 hours and posts daily stats
    */
    postDailyStats = async () => {
        let stats = await this._computeDailyStats();
        await this._sendStatsChannel(stats, "**Daily Stats**");
    }

    /*
        Collects the last update per day for the last week
        and post the weekly stats
    */
    postWeeklyStats = async () => {
        let stats = await this._computeWeeklyStats();
        await this._sendStatsChannel(stats, "**Weekly Stats**");
    }
}
