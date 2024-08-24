import {
  Client, Guild, Message, MessageEmbed, TextChannel,
} from 'discord.js';
import fs from 'node:fs';
import { Console } from 'node:console';
import { Transform } from 'node:stream';
import { config } from '../config';
import logger from '../logging';
import {
  IDiscordUserStats, IDiscordUserStatsActivity,
  IDiscordUserStatsInactivity,
  ActiveStatsTable,
  InactiveStatsTable,
} from '../types';

// helper to get days ago
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const weeksAgo = (weeks: number): Date => daysAgo(weeks * 7);

const lastSeenInDays = (timestamp: number): number => (
  Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));

/**
   * Transform a javascript object into an ascii formatted table string.
   *
   * NodeJS already has a console.table function, so with this we use it but instead of stdout
   * we send the output to another stream.
   * Now because there's always an extra 'index' column included in the output, it's removed
   * by doing string manpulations. Not the most elegant, but once nodejs supports removing
   * this column we can do it this way.
   *
   * @param object Any javascript object (dict)
   * @returns string containing an ascii formatted table
   */
const getTableStrFromObj = (object: ActiveStatsTable[] | InactiveStatsTable[]) => {
  /* eslint-disable */
  const ts = new Transform({ transform(chunk, enc, cb) { cb(null, chunk); } });
  const dummyLogger = new Console({ stdout: ts });
  dummyLogger.table(object);

  let result = '';
  const tableStr = (ts.read() || '').toString();
  for (const row of tableStr.split(/[\r\n]+/)) {
    let r = row.replace(/[^┬]*┬/, '┌');
    r = r.replace(/^├─*┼/, '├');
    r = r.replace(/│[^│]*/, '');
    r = r.replace(/^└─*┴/, '└');
    r = r.replace(/'/g, ' ');
    result += `${r}\n`;
  }
  return result;
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
   * Loads the database that hold the inactivity information of all members
   */
  static _loadUserActivityDb = (): Map<string, IDiscordUserStatsInactivity> => {
    const activityDb = new Map<string, IDiscordUserStatsInactivity>();
    try {
      const data = fs.readFileSync(config.INACTIVITY_WEEKS_DB_PATH, 'utf8');
      for (const line of data.split('\n')) {
        const [username, timestamp] = line.split(';');
        if (username !== '') {
          activityDb.set(username, { username, lastActivity: parseInt(timestamp, 10) });
          logger.debug(activityDb.get(username));
        }
      }
      logger.info('succesfully loaded user activity database');
    } catch (err) {
      logger.error(`could not read user activity database: ${err}`);
    }
    return activityDb;
  };

  /**
   * Persists the database that hold the inactivity information of all members
   */
  static _refreshUserActivityDb = (stats: Map<string, IDiscordUserStats>) => {
    const activityDbContent = [];
    for (const [username, userStats] of stats) {
      activityDbContent.push(`${username};${userStats.lastActivity}`);
    }
    try {
      fs.writeFileSync(config.INACTIVITY_WEEKS_DB_PATH, activityDbContent.join('\n'));
      logger.debug('succesfully persisted on disk refreshed user activity database');
    } catch (err) {
      logger.error(`could not persist user activity database: ${err}`);
    }
  };

  /**
     * Initializes stats with the name of all the members
     * @param {GUILD} guild
     * @returns stats object with each username set with default stats
     */
  static _initStats = async (guild: Guild): Promise<Map<string, IDiscordUserStats>> => {
    const members = await guild.members.fetch();
    const stats = new Map<string, IDiscordUserStats>();
    const activityDb = Stats._loadUserActivityDb();

    for (const m of members.values()) {
      const userStats = {
        username: m.user.username,
        ...Stats._defaultStats(),
        // When a member has no activity, set last activity to now()
        lastActivity: activityDb.get(m.user.username)?.lastActivity || Date.now(),
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
    const activeUsers = [];
    const inactiveUsers = [];
    for (const [username, userStats] of stats) {
      if (config.BOTS.has(username)) {
        continue;
      }

      if (userStats.posts) {
        activeUsers.push(userStats);
      } else {
        inactiveUsers.push(userStats);
      }
    }

    activeUsers.sort((a: IDiscordUserStats, b: IDiscordUserStats) => b.posts - a.posts);
    inactiveUsers.sort(
      (a: IDiscordUserStats, b: IDiscordUserStats) => a.lastActivity - b.lastActivity,
    );

    return { activeUsers, inactiveUsers };
  };

  static _getInactiveMembersForRemoval = (
    inactiveMembers: Array<IDiscordUserStats>,
  ): Set<string> => {
    const membersForRemoval = new Set<string>();

    // Because now() is the number of milliseconds from Unix epoc till today,
    // we just need to substract the number of milliseconds equivalent to
    // NUM_WEEKS ago and we have a point in time in the past for comparison.
    // I'm not going to deal with the 24h gap in the day (for example we can say that
    // if it's in the same day it's considered active). If you get removed because
    // of this: sorry mate.
    //
    // Weeks to a timestamp in milliseconds: week * days * hours * mins * secs * millis
    const threeWeeksAgoTs = Date.now() - (
      config.INACTIVITY_WEEKS_REMOVAL * 7 * 24 * 60 * 60 * 1000);
    for (const inactiveMember of inactiveMembers) {
      const memberLastActivity = inactiveMember.lastActivity;
      if (memberLastActivity < threeWeeksAgoTs) {
        membersForRemoval.add(inactiveMember.username);
      }
    }
    return membersForRemoval;
  };

  /**
     * Evaluates user activity over the weeks
     * we rely on the latest weekly update from the bot
     * if none is found, we pardon everyone and start from scratch
     * @param {*} stats this weeks stats
     * @returns users inactity over the past few weeks
     */
  _processInactivityWeeks = async (stats: Map<string, IDiscordUserStats>):
  Promise<IDiscordUserStatsActivity> => {
    const activityFromStats = Stats._getActivityFromStats(stats);

    activityFromStats.inactiveUsersForRemoval = Stats._getInactiveMembersForRemoval(
      activityFromStats.inactiveUsers,
    );

    return activityFromStats;
  };

  _kickInactiveMembers = async (usernames: Set<string>) => {
    // { cache: false }

    if (!usernames.size){
      logger.info("No users to kick. Ignoring")
      return
    }

    const statsChannel = this._getStatsChannel();
    const members = await statsChannel.guild.members.fetch();
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
        const messageUser = message.author;
        const userStats = stats.get(messageUser.username) || Stats._defaultStats();
        userStats.posts++;
        userStats.words += message.content.split(' ').length;
        userStats.letters += message.content.length;
        // When a member has  activity, refresh the last activity timestamp
        userStats.lastActivity = Date.now();
        stats.set(messageUser.username, userStats);
      }
    }

    // Remove bots from stats
    for (const bot of config.BOTS) {
      stats.delete(bot);
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
    usersActivity: IDiscordUserStatsActivity,
  ) => {
    const activeStatsTable: ActiveStatsTable[] = usersActivity.activeUsers.map((u) => ({
      username: u.username,
      posts: u.posts,
    }));

    const message = new MessageEmbed()
      .setColor(0x0099FF).addFields(
        {
          name: 'Active users',
          value: '```' + getTableStrFromObj(activeStatsTable) + '```',
          inline: false,
        },
      );

    if (usersActivity.inactiveUsers.length) {
      const inactiveStatsTable: InactiveStatsTable[] = usersActivity.inactiveUsers.map((u) => ({
        username: u.username,
        lastSeenInDays: lastSeenInDays(u.lastActivity),
      })).filter((u) => u.lastSeenInDays > 0);

      if (inactiveStatsTable.length) {
        message.addFields({
          name: 'Inactive users',
          value: '```' + getTableStrFromObj(inactiveStatsTable) + '```',
          inline: false,
        });
      }
    }

    if (usersActivity.inactiveUsersForRemoval.size) {
      message.addFields({
        name: `removing due to ${config.INACTIVITY_WEEKS_REMOVAL}+ weeks of inactivity: `,
        value: [...usersActivity.inactiveUsersForRemoval].join(', '),
      });
    }

    const statsChannel = this._getStatsChannel();

    await statsChannel.send({ content: '**Weekly Stats**', embeds: [message] });
    logger.debug(`sent stats to channel ${config.STATS_CHANNEL}`);
  };

  /*
        Collects the last update per day for the last week
        and post the weekly stats
    */
  postWeeklyStats = async () => {
    const fromDate = weeksAgo(config.INACTIVITY_WEEKS_REMOVAL);
    const stats = await this._computeStatsFromDate(fromDate);
    const usersActivity = await this._processInactivityWeeks(stats);
    await this._kickInactiveMembers(usersActivity.inactiveUsersForRemoval)
    await this._sendStatsChannel(usersActivity);
    Stats._refreshUserActivityDb(stats);
  };
}
