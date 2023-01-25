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

    /**
     * @returns Default stats for a single user
     */

    static _defaultStats = () => ({ posts: 0, words: 0, letters: 0 });

    /**
     * Initializes stats with the name of all the members
     * @param {GUILD} guild
     * @returns stats object with each username set with default stats
     */
    static _initStats = async (guild) => {
        const members = await guild.members.fetch({ cache: false });
        const stats = {};

        for (const m of members.values()) {
            stats[m.user.username] = Stats._defaultStats();
        }

        return stats;
    };

    /**
     * @returns Default channel for stats update
     */
    _getStatsChannel = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.STATS_CHANNEL,
        );
    };

    /**
     * Separates active from inactive users
     * @returns [active, inactive]
     * active contains the set of users with some stats
     * inactive is a list of names without stats
     */
    static _getActivityFromStats = (stats) => {
        const active = [];
        const inactive = [];

        for (const user in stats) {
            if (config.BOTS.has(user)) {
                continue;
            }

            if (stats[user].posts) {
                active.push([user, stats[user]]);
            } else {
                inactive.push(user);
            }
        }

        active.sort((a, b) => b[1].posts - a[1].posts);
        inactive.sort((a, b) => a - b);

        return [active, inactive];
    };

    /**
     * Evaluates user activity over the weeks
     * we rely on the latest weekly update from the bot
     * if none is found, we pardon everyone and start from scratch
     * @param {*} stats this weeks stats
     * @returns users inactity over the past few weeks
     */
    _processInactivityWeeks = async (stats) => {
        // weekly update will be within the last 8 days
        const lastWeekAgo = getSnowflakeFromDay(-8);
        const statsChannel = await this._getStatsChannel();
        const messages = await statsChannel.messages.fetch({ limit: 1000, after: lastWeekAgo });

        // We want to avoid counting multiple weeks (e.g. if we sent the weekly update twice)
        // only consider the oldest weekly update within 8 days
        const lastWeekUpdate = [...messages.values()].find((m) => m.author.username === "elprimobot"
            && m.content.indexOf("Weekly") > -1);

        const [active, oneWeekInactive] = Stats._getActivityFromStats(stats);
        const activeThisWeek = new Set(active.map(([u]) => u));
        const getInactive = (field) => {
            const result = new Set();
            if (!field?.value) {
                return result;
            }

            const inactive = field.value.split(",").map(v => v.trim());
            for (const u of inactive) {
                const isNotABot = !config.BOTS.has(u);
                const inactiveThisWeek = !activeThisWeek.has(u);
                if (isNotABot && inactiveThisWeek) {
                    result.add(u);
                }
            }

            return result;
        };
        const inactiveMsg = [];
        if (oneWeekInactive.length) {
            inactiveMsg.push({
                name: "1 week inactivity: ", value: oneWeekInactive.join(", "),
            });
        }

        const prevEmbedUpdate = lastWeekUpdate?.embeds[0];
        if (!prevEmbedUpdate) {
            // when there is no previous weekly update, default to this week's inactivity
            return [
                active,
                inactiveMsg,
            ];
        }
        const prevOneWeekInactive = prevEmbedUpdate.fields[1];
        const twoWeeksInactive = getInactive(prevOneWeekInactive);
        if (twoWeeksInactive.size) {
            inactiveMsg.push({
                name: "2 weeks inactivity: ", value: [...twoWeeksInactive].join(", "),
            });
        }
        const prevTwoWeeks = prevEmbedUpdate.fields[2];
        const threeWeeksInactive = getInactive(prevTwoWeeks);
        const prevThreeWeeks = prevEmbedUpdate.fields[3];
        const manyWeeksInactive = getInactive(prevThreeWeeks);
        const threeWeeksOrMoreInactive = new Set([...threeWeeksInactive, ...manyWeeksInactive]);

        if (threeWeeksOrMoreInactive.size) {
            inactiveMsg.push({
                name: "removing due to 3+ weeks of inactivity: ", value: [...threeWeeksOrMoreInactive].join(", "),
            });

            await Stats._kickInactiveMembers(statsChannel.guild, threeWeeksOrMoreInactive);
        }

        return [
            active,
            inactiveMsg,
        ];
    };

    static _kickInactiveMembers = async (guild, usernames) => {
        const members = await guild.members.fetch({ cache: false });
        for (const guildMember of members.values()) {
            if (usernames.has(guildMember.user.username)) {
                await guildMember.kick();
            }
        }
    };

    /**
    * Compute all the message from a given date
    * this has to be a snowflake date
    * @returns stats for all the users
    */
    _computeStatsFromDate = async (snowflakeFromDate) => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        const channels = await dominationGuild.channels.fetch();
        const stats = await Stats._initStats(dominationGuild);

        for (const channel of channels.values()) {
            if (channel.type !== "GUILD_TEXT") {
                logger.debug(`skipping channel ${channel.name}, type: ${channel.type}`);
                continue;
            }
            // Discord limits the number of messages we can fetch at once
            // We will have to fetch all the messages until we reach the last 7 days
            // TODO: get back here
            // limit: int value should be less than or equal to 100.
            const numMessages = 100;
            const messages = await channel.messages.fetch({
                limit: numMessages,
                after: snowflakeFromDate,
            });

            logger.silly(`reading the most recent ${numMessages} from channel ${channel.name}`);
            for (const message of messages.values()) {
                const { username } = message.author;
                const userStats = stats[username] = stats[username] || Stats._defaultStats();
                userStats.posts++;
                userStats.words += message.content.split(" ").length;
                userStats.letters += message.content.length;
            }
        }
        return stats;
    };

    /**
     * Posts a stats update to the default stats channel
     * @param {*} activeStats Stats for active users
     * @param {*} inactiveMsg Inactivity message
     * @param {*} title title for the update
     */
    _sendStatsChannel = async (activeStats, inactiveMsg, title) => {
        logger.debug(`sending '${title}' stats to channel ${config.STATS_CHANNEL}`);
        if (!activeStats.length && !inactiveMsg) {
            // nothing to update
            return;
        }

        const postsValue = activeStats.map(([username, stats]) => `**${username}** **(** ${stats.posts} **|** ${stats.words} **|** ${stats.letters}** )**`)
            .join("\n");
        const message = new MessageEmbed()
            .setColor(0x0099FF).addFields(
                { name: "user (posts | words | letters)", value: postsValue, inline: true },
            );

        if (inactiveMsg && inactiveMsg.length) {
            message.addFields(...inactiveMsg);
        }

        const statsChannel = await this._getStatsChannel();
        logger.debug(message);
        await statsChannel.send({ content: title, embeds: [message] });
        logger.debug(`sent stats to channel ${config.STATS_CHANNEL}`);
    };

    /*
        Collects the last update per day for the last week
        and post the weekly stats
    */
    postWeeklyStats = async () => {
        const fromDate = getSnowflakeFromDay(-7);
        const stats = await this._computeStatsFromDate(fromDate);
        const [onlyActive, inactiveMsg] = await this._processInactivityWeeks(stats);
        await this._sendStatsChannel(onlyActive, inactiveMsg, "**Weekly Stats**");
    };
}
