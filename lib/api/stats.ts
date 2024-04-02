import {
  Client, EmbedField, Guild, Message, MessageEmbed, TextChannel,
} from 'discord.js';
import { config } from '../config';
import logger from '../logging';
import { IDiscordUserStats, IDiscordUserStatsActivity, IDiscordUserStatsActivityMessage } from '../types';

// helper to get days ago
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export class Stats {
  client: Client;

  stats: Set<IDiscordUserStats>;

  constructor(discordClient: Client) {
    this.client = discordClient;
    this.stats = new Set<IDiscordUserStats>();
  }

  /**
     * @returns Default stats for a single user
     */

  static _defaultStats = (): IDiscordUserStats => ({ posts: 0, words: 0, letters: 0 });

  /**
     * Initializes stats with the name of all the members
     * @param {GUILD} guild
     * @returns stats object with each username set with default stats
     */
  static _initStats = async (guild: Guild): Promise<Map<string, IDiscordUserStats>> => {
    // { cache: false }
    const members = await guild.members.fetch();
    const stats = new Map<string, IDiscordUserStats>();

    for (const m of members.values()) {
      const userStats = {
        username: m.user.username,
        ...Stats._defaultStats(),
      };
      stats.set(m.user.username, userStats);
    }

    return stats;
  };

  /**
     * @returns Default channel for stats update
     */
  _getStatsChannel = (): TextChannel => {
    const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
    return dominationGuild.channels.cache.find(
      (channel) => channel.name === config.STATS_CHANNEL,
    ) as TextChannel;
  };

  /**
     * Separates active from inactive users
     * @returns [active, inactive]
     * active contains the set of users with some stats
     * inactive is a list of names without stats
     */
  static _getActivityFromStats = (
    stats: Map<string, IDiscordUserStats>,
  ):
  IDiscordUserStatsActivity => {
    const active = [];
    const inactive = [];
    for (const [username, userStats] of stats) {
      if (config.BOTS.has(username)) {
        continue;
      }

      if (userStats.posts) {
        active.push(userStats);
      } else {
        inactive.push(username);
      }
    }

    active.sort((a: IDiscordUserStats, b: IDiscordUserStats) => b.posts - a.posts);
    inactive.sort((a: IDiscordUserStats, b: IDiscordUserStats) => a.posts - b.posts);

    return { active, inactive };
  };

  /**
     * Evaluates user activity over the weeks
     * we rely on the latest weekly update from the bot
     * if none is found, we pardon everyone and start from scratch
     * @param {*} stats this weeks stats
     * @returns users inactity over the past few weeks
     */
  _processInactivityWeeks = async (stats: Map<string, IDiscordUserStats>):
  Promise<IDiscordUserStatsActivityMessage> => {
    // weekly update will be within the last 8 days
    const fromDate = daysAgo(8);
    const statsChannel = this._getStatsChannel();
    const messages = await Stats._getChannelMessages(statsChannel, fromDate);

    // We want to avoid counting multiple weeks (e.g. if we sent the weekly update twice)
    // only consider the oldest weekly update within 8 days
    const lastWeekUpdate = [...messages.values()].find((m) => m.author.username === 'elprimobot'
            && m.content.indexOf('Weekly') > -1);

    const activityFromStats = Stats._getActivityFromStats(stats);
    const activeThisWeek = new Set();
    for (const userStats of activityFromStats.active) {
      activeThisWeek.add(userStats.username);
    }

    const getInactive = (field: EmbedField): Set<string> => {
      const result = new Set<string>();
      if (!field?.value) {
        return result;
      }

      const inactive = field.value.split(',').map((v) => v.trim());
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
    if (activityFromStats.inactive.length) {
      inactiveMsg.push({
        name: '1 week inactivity: ', value: activityFromStats.inactive.join(', '),
      });
    }

    const prevEmbedUpdate = lastWeekUpdate?.embeds[0];
    if (!prevEmbedUpdate) {
      // when there is no previous weekly update, default to this week's inactivity
      return {
        activeUsers: activityFromStats.active,
        inactivityMessages: inactiveMsg as EmbedField[],
      };
    }
    const prevOneWeekInactive = prevEmbedUpdate.fields[1];
    const twoWeeksInactive = getInactive(prevOneWeekInactive);
    if (twoWeeksInactive.size) {
      inactiveMsg.push({
        name: '2 weeks inactivity: ', value: [...twoWeeksInactive].join(', '),
      });
    }
    const prevTwoWeeks = prevEmbedUpdate.fields[2];
    const threeWeeksInactive = getInactive(prevTwoWeeks);
    const prevThreeWeeks = prevEmbedUpdate.fields[3];
    const manyWeeksInactive = getInactive(prevThreeWeeks);
    const threeWeeksOrMoreInactive = new Set([...threeWeeksInactive, ...manyWeeksInactive]);

    if (threeWeeksOrMoreInactive.size) {
      inactiveMsg.push({
        name: 'removing due to 3+ weeks of inactivity: ', value: [...threeWeeksOrMoreInactive].join(', '),
      });

      await Stats._kickInactiveMembers(statsChannel.guild, threeWeeksOrMoreInactive);
    }

    return {
      activeUsers: activityFromStats.active,
      inactivityMessages: inactiveMsg as EmbedField[],
    };
  };

  static _kickInactiveMembers = async (guild: Guild, usernames: Set<string>) => {
    // { cache: false }
    const members = await guild.members.fetch();
    for (const guildMember of members.values()) {
      if (usernames.has(guildMember.user.username)) {
        await guildMember.kick();
      }
    }
  };

  /*
    * Discord limits the number of messages we can fetch at once
    * This function fetches messages in chunks of 100
    * until we reach the fromDate
    *
    * @param {Discord.Channel} channel
    * @param {Date} fromDate
    * @returns {Array<Discord.Message>}
    */
  static _getChannelMessages = async (channel: TextChannel, fromDate: Date): Promise<Message[]> => {
    const messages: Message[] = [];
    let lastMessageId: string = null;
    let done = false;
    while (!done) {
      const options = { limit: 100, before: lastMessageId };
      if (lastMessageId) {
        options.before = lastMessageId;
      }
      const fetchedMessages = await channel.messages.fetch(options);

      if (fetchedMessages.size === 0) {
        done = true;
      } else {
        lastMessageId = fetchedMessages.last().id;
        for (const message of fetchedMessages.values()) {
          if (message.createdTimestamp < fromDate.getTime()) {
            done = true;
            break;
          }
          messages.push(message);
        }
      }
    }
    return messages;
  };

  /**
    * Compute all the message from a given date
    * this has to be a snowflake date
    * @returns stats for all the users
    */
  _computeStatsFromDate = async (fromDate: Date): Promise<Map<string, IDiscordUserStats>> => {
    const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
    const channels = await dominationGuild.channels.fetch();
    const stats = await Stats._initStats(dominationGuild);

    for (const channel of channels.values()) {
      if (channel.type !== 'GUILD_TEXT') {
        logger.debug(`skipping channel ${channel.name}, type: ${channel.type}`);
        continue;
      }

      const messages = await Stats._getChannelMessages(channel, fromDate);

      logger.debug(`processing ${messages.length} messages from channel ${channel.name}`);

      for (const message of messages) {
        const messageUser = (message).author;
        const userStats = stats.get(messageUser.username) || Stats._defaultStats();
        userStats.posts++;
        userStats.words += message.content.split(' ').length;
        userStats.letters += message.content.length;
        stats.set(messageUser.username, userStats);
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
  _sendStatsChannel = async (
    activeStats: IDiscordUserStats[],
    inactiveMsg: EmbedField[],
    title: string,
  ) => {
    if (!activeStats.length && !inactiveMsg) {
      // nothing to update
      return;
    }

    let postsValue = '';
    for (const userStats of activeStats) {
      postsValue += `**${userStats.username}** **(** ${userStats.posts} **|** ${userStats.words} **|** ${userStats.letters}** )**\n`;
    }

    const message = new MessageEmbed()
      .setColor(0x0099FF).addFields(
        { name: 'user (posts | words | letters)', value: postsValue, inline: true },
      );

    if (inactiveMsg && inactiveMsg.length) {
      message.addFields(...inactiveMsg);
    }

    const statsChannel = this._getStatsChannel();

    await statsChannel.send({ content: title, embeds: [message] });
    logger.debug(`sent stats to channel ${config.STATS_CHANNEL}`);
  };

  /*
        Collects the last update per day for the last week
        and post the weekly stats
    */
  postWeeklyStats = async () => {
    const fromDate = daysAgo(7);
    const stats = await this._computeStatsFromDate(fromDate);
    const usersActivityMessage = await this._processInactivityWeeks(stats);
    await this._sendStatsChannel(usersActivityMessage.activeUsers, usersActivityMessage.inactivityMessages, '**Weekly Stats**');
  };
}
