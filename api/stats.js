import { SnowflakeUtil, MessageEmbed } from "discord.js";
import { config } from "../config.js";

const removeParentheses = (word) => word.replace(/\(|\)/g, "");
export class Stats {
    constructor(discordClient) {
        this.client = discordClient;
        this.stats = {};
    }

    /*
        Returns a snowflake which represents the time x days in the past
        https://discord.com/developers/docs/reference#snowflakes
    */
    static _getSnowflakeFromDay = (days) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + days);
        return SnowflakeUtil.generate(d);
    };

    _getStatsChannel = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.STATS_CHANNEL,
        );
    };

    _computeWeeklyStats = async () => {
        const sevenDaysAgo = Stats._getSnowflakeFromDay(-7);
        const statsChannel = await this._getStatsChannel();

        const messages = await statsChannel.messages.fetch({ limit: 100, after: sevenDaysAgo });
        const collectedDays = new Set();
        const stats = {};

        for (const message of messages.values()) {
            const isBot = message.author.username === "elprimobot";
            const isDaily = message.content.indexOf("Daily") > -1;
            const day = new Date(message.createdTimestamp);
            const key = `${day.getDay()}/${day.getMonth()}/${day.getFullYear()}`;
            // we only take the latest stat posted for the bot that day
            if (!isBot || !isDaily || collectedDays.has(key)) {
                continue;
            }
            collectedDays.add(key);

            const { fields } = message.embeds[0];
            if (!fields[0]?.value || !fields[2]?.value) continue;

            const firstColumn = fields[0].value.split("\n");
            const secondColumn = fields[2].value.split("\n");
            let i = 0;
            while (i < firstColumn.length) {
                const [username, posts] = firstColumn[i].split(" ");
                const [words, letters] = secondColumn[i].split(" ");
                stats[username] = stats[username] || { posts: 0, words: 0, letters: 0 };
                stats[username].posts += Number(removeParentheses(posts));
                stats[username].words += Number(words);
                stats[username].letters += Number(removeParentheses(letters));
                i++;
            }
        }

        return stats;
    };

    _computeDailyStats = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        const channels = await dominationGuild.channels.fetch();
        const after = Stats._getSnowflakeFromDay(-1);
        const stats = {};

        for (const channel of channels.values()) {
            if (channel.type !== "GUILD_TEXT") {
                continue;
            }
            const messages = await channel.messages.fetch({ limit: 100, after });
            for (const message of messages.values()) {
                const { username } = message.author;
                const userStats = stats[username] = stats[username] || {
                    posts: 0,
                    words: 0,
                    letters: 0,
                };
                userStats.posts++;
                userStats.words += message.content.split(" ").length;
                userStats.letters += message.content.length;
            }
        }

        return stats;
    };

    _sendStatsChannel = async (stats, title) => {
        if (!stats || !Object.keys(stats).length) {
            // nothing to update
            return;
        }
        const postsValue = Object.keys(stats).map((username) => `${username} (${stats[username].posts})`).join("\n");
        const wordsValue = Object.keys(stats).map((username) => `${stats[username].words} (${stats[username].letters})`).join("\n");
        const dailyStats = new MessageEmbed()
            .setColor(0x0099FF).addFields(
                { name: "user (posts)", value: postsValue, inline: true },
                // Add a blank field to the embed
                // https://discordjs.guide/popular-topics/embeds.html#embed-preview
                { name: "\u200B", value: "\u200B", inline: true },
                { name: "word (letters)", value: wordsValue, inline: true },
            );

        const statsChannel = await this._getStatsChannel();
        await statsChannel.send({ content: title, embeds: [dailyStats] });
    };

    /*
        Collects all the messages in the last 24 hours and posts daily stats
    */
    postDailyStats = async () => {
        const stats = await this._computeDailyStats();
        await this._sendStatsChannel(stats, "**Daily Stats**");
    };

    /*
        Collects the last update per day for the last week
        and post the weekly stats
    */
    postWeeklyStats = async () => {
        const stats = await this._computeWeeklyStats();
        await this._sendStatsChannel(stats, "**Weekly Stats**");
    };
}
