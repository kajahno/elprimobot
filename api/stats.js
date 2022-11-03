import { SnowflakeUtil, MessageEmbed } from "discord.js";
import { config } from "../config.js";
import logger from "../logging.js";

/*
    Returns a snowflake which represents the time x days in the past
    https://discord.com/developers/docs/reference#snowflakes
*/
const getSnowflakeFromDay = (days) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return SnowflakeUtil.generate(d);
};

export class Stats {
    constructor(discordClient) {
        this.client = discordClient;
        this.stats = {};
    }

    static _defaultStats = () => ({ posts: 0, words: 0, letters: 0 });

    static _initStats = async (guild) => {
        const members = await guild.members.fetch({ cache: false });
        const stats = {};

        for (const m of members.values()) {
            stats[m.user.username] = Stats._defaultStats();
        }

        return stats;
    };

    _getStatsChannel = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.STATS_CHANNEL,
        );
    };

    _computeWeeklyStats = async () => {
        const sevenDaysAgo = getSnowflakeFromDay(-7);
        const statsChannel = await this._getStatsChannel();
        const stats = await Stats._initStats(statsChannel.guild);

        const messages = await statsChannel.messages.fetch({ limit: 100, after: sevenDaysAgo });
        const collectedDays = new Set();

        logger.debug("getting weekly stats from channels");

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
            const rows = fields[0].value.split("\n");
            for (let row of rows) {
                // "[firstName] [lastName] (5 | 50 | 2500)"
                // remove any bold
                row = row.replaceAll("*", "");
                let [username, values] = row.split("(");
                if (!username || !values) {
                    // we couldn"t parse
                    break;
                }
                // clean input
                username = username.trim();
                values = values.replaceAll(" ", "").replaceAll(")", "");

                const [posts, words, letters] = values.split("|");
                if (Number.isNaN(Number(posts))
                    || Number.isNaN(Number(words))
                    || Number.isNaN(Number(letters))) {
                    // we couldn't parse
                    break;
                }
                stats[username] = stats[username] || Stats._defaultStats();
                stats[username].posts += Number(posts);
                stats[username].words += Number(words);
                stats[username].letters += Number(letters);
            }
        }
        logger.debug("done getting weekly stats from channels");
        return stats;
    };

    _computeDailyStats = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        const channels = await dominationGuild.channels.fetch();
        const stats = await Stats._initStats(dominationGuild);

        logger.debug("getting daily stats from channels");

        const oneDayAgo = getSnowflakeFromDay(-1);

        for (const channel of channels.values()) {
            if (channel.type !== "GUILD_TEXT") {
                logger.debug(`skipping channel ${channel.name}, type: ${channel.type}`);
                continue;
            }
            const numMessages = 100;
            const messages = await channel.messages.fetch({
                limit: numMessages,
                after: oneDayAgo,
            });

            logger.silly(`reading the most recent ${numMessages} from channel ${channel.name}`);
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

        logger.debug("done getting daily stats from channels");
        return stats;
    };

    _sendStatsChannel = async (serverStats, title) => {
        logger.debug(`sending '${title}' stats to channel ${config.STATS_CHANNEL}`);
        if (!serverStats || !Object.keys(serverStats).length) {
            // nothing to update
            return;
        }
        const inactive = [];
        const active = [];
        // eslint-disable-next-line guard-for-in
        for (const user in serverStats) {
            if (config.BOTS.has(user)) {
                logger.debug(`ignoring bot user ${user}`);
                continue;
            }

            if (serverStats[user].posts) {
                active.push([user, serverStats[user]]);
            } else {
                inactive.push(user);
            }
        }
        active.sort((a, b) => b[1].posts - a[1].posts);
        inactive.sort((a, b) => a - b);

        const postsValue = active.map(([username, stats]) => `**${username}** **(** ${stats.posts} **|** ${stats.words} **|** ${stats.letters}** )**`)
            .join("\n");
        const message = new MessageEmbed()
            .setColor(0x0099FF).addFields(
                { name: "user (posts | words | letters)", value: postsValue, inline: true },
            );

        if (inactive.length) {
            message.addField("zero activity: ", inactive.join(", "));
        }

        const statsChannel = await this._getStatsChannel();
        await statsChannel.send({ content: title, embeds: [message] });
        logger.debug(`sent stats to channel ${config.STATS_CHANNEL}`);
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
