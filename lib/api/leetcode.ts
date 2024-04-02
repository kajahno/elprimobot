import {
  Client, MessageEmbed, MessageOptions, TextChannel,
} from 'discord.js';
import { URL } from './leetcode/index.js';
import {
  getDailyProblem, getWeeklyProblem, getRandomProblem,
  getProblemCategories, getRandomProblemFromCategory,
} from './leetcode-data.js';
import { config } from '../config';
import logger from '../logging';
import { ILeetcodeProblem } from '../types.js';

// const childLogger = logger.child({ component: "discord client" });

enum MessageColors {
  DAILY = '#00FFFF',
  WEEKLY = '#FFBF00',
  RANDOM = '#4CAF50',
}

export class Leetcode {
  client: Client;

  channel: TextChannel;

  messageColors: typeof MessageColors = MessageColors;

  constructor(discordClient: Client) {
    this.client = discordClient;
  }

  _getLeetCodeChannel = (): TextChannel => {
    const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
    return dominationGuild.channels.cache.find(
      (channel) => channel.name === config.LEETCODE_CHALLENGES_CHANNEL,
    ) as TextChannel;
  };

  /*
        Post a MessageEmbed into the leetcode channel
    */
  _postMessageIntoChannel = async (message: MessageOptions) => {
    if (!this.channel) {
      this.channel = this._getLeetCodeChannel();
    }
    await this.channel.send(message);
  };

  /*
        Fetch the leetcode daily challenge and send a message to the channel
    */
  postDailyChallenge = async () => {
    const dailyMessage = await this.getDailyProblemMessage();
    if (!dailyMessage) {
      logger.error('Unable to fetch daily challenge message');
      return;
    }
    await this._postMessageIntoChannel(dailyMessage);
  };

  /*
        Fetch the leetcode weekly challenge and send a message to the channel
    */
  postWeeklyChallenge = async () => {
    const weeklyMessage = await this.getWeeklyProblemMessage();
    if (!weeklyMessage) {
      logger.error('Unable to fetch weekly challenge message');
      return;
    }
    await this._postMessageIntoChannel(weeklyMessage);
  };

  /*
        Post a random problem from the problem set
    */
  postRandomChallenge = async () => {
    const randomProblemMessage = await this.getRandomProblemMessage();
    if (!randomProblemMessage) {
      logger.error('Unable to fetch problem message');
      return;
    }
    await this._postMessageIntoChannel(randomProblemMessage);
  };

  /*
        Get random problem message embed
    */
  getRandomProblemMessage = async (): Promise<MessageOptions> => {
    const randomProblemObj = await getRandomProblem();

    if (!randomProblemObj) {
      logger.error('Unable to fetch problemSet');
      return;
    }

    return {
      content: '**Leetcode Random Problem**', // This is the first line of the message
      embeds: [
        Leetcode.buildDetailedProblemMessage(
          { ...randomProblemObj, color: this.messageColors.RANDOM },
        ),
      ],
    };
  };

  /*
        Get random problem from category message embed
    */
  getRandomProblemFromCategoryMessage = async (category: string): Promise<MessageOptions> => {
    const randomProblemObj = await getRandomProblemFromCategory(category);

    if (!randomProblemObj) {
      logger.error('Unable to fetch problemSet');
      return;
    }

    const categories = getProblemCategories();

    return {
      content: `**Leetcode Random ${categories[category]} challenge**`, // This is the first line of the message
      embeds: [
        Leetcode.buildDetailedProblemMessage(
          { ...randomProblemObj, color: this.messageColors.RANDOM },
        ),
      ],
    };
  };

  /*
        Get daily problem message embed
    */
  getDailyProblemMessage = async (): Promise<MessageOptions> => {
    const dailyProblemObj = await getDailyProblem();

    if (!dailyProblemObj) {
      logger.error('Unable to fetch the daily problem');
      return;
    }

    return {
      content: '**Leetcode Daily**', // This is the first line of the message
      embeds: [
        Leetcode.buildDetailedProblemMessage(
          { ...dailyProblemObj, color: this.messageColors.DAILY },
        ),
      ],
    };
  };

  /*
        Get weekly problem message embed
    */
  getWeeklyProblemMessage = async (): Promise<MessageOptions> => {
    const weeklyProblemObj = await getWeeklyProblem();

    if (!weeklyProblemObj) {
      logger.error('Unable to fetch the daily problem');
      return;
    }

    return {
      content: '**Leetcode Weekly**', // This is the first line of the message
      embeds: [
        Leetcode.buildSimplifiedProblemMessage(
          { ...weeklyProblemObj, color: this.messageColors.WEEKLY },
        ),
      ],
    };
  };

  /*
        Builds a discord Leetcode challenge detailed message
    */
  static buildDetailedProblemMessage = (problem: ILeetcodeProblem) => new MessageEmbed()
    .setColor(problem.color)
    .setTitle(`${problem.frontendQuestionId}. ${problem.title}`)
    .setURL(`${URL}${problem.link}`)
    .addFields(
      { name: 'Difficulty', value: '```' + problem.difficulty + '\n```', inline: true },
      { name: 'Success rate', value: '```' + Number.parseFloat(problem.acRate as unknown as string).toFixed(2) + '```', inline: true },
    );

  /*
        Builds a discord Leetcode challenge simplified message
    */
  static buildSimplifiedProblemMessage = (problem: ILeetcodeProblem) => new MessageEmbed()
    .setColor(problem.color)
    .setTitle(`${problem.questionFrontendId}. ${problem.title}`)
    .setURL(`${URL}${problem.link}`)
    .addFields({ name: 'Remaining time', value: `${problem.remainingTimeMessage}`, inline: false })
    .setFooter({ text: 'Time to code 🔥👨‍💻🔥' });
}
