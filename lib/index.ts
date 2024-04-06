import 'dotenv/config';

import express, { Express, Request, Response } from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import schedule = require('node-schedule');
import { config } from './config';
import {
  VerifyDiscordRequest, postDailyMessages, postWeeklyMessages,
} from './utils';
import {
  Stats, getDiscordClient, Leetcode,
} from './api/index';
import {
  RANDOM_PROBLEM_COMMAND,
  PROBLEM_FROM_SET_COMMAND,
  InstallGuildCommands,
} from './commands';
import morganMiddleware from './middleware/morgan';
import logger from './logging';

import { IDiscordInteractionsRequestBody } from './types';

// Create an express app
const app: Express = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Handles incoming Discord interactions
 */
const discordInteractionsHandler = async (req: Request, res: Response) => {
  const { type, data }: IDiscordInteractionsRequestBody = (
    req.body as IDiscordInteractionsRequestBody);

  /**
     * Handle verification requests.
     * Required by Discord to verify the endpoint and validate the integration with the bot.
     */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  const leetcode = new Leetcode(await getDiscordClient());

  /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "random problem" guild command
    if (name === 'randomproblem') {
      const message = await leetcode.getRandomProblemMessage();
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: message,
      });
    }

    // "problemfromset" guild command
    if (name === 'problemfromset') {
      // Get the category passed
      const categoryId = data.options[0].value;
      const message = await leetcode.getRandomProblemFromCategoryMessage(categoryId);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: message,
      });
    }
  }
};

/**
 * App listener
 */
const appListener = async () => {
  logger.info(`Listening on port: ${PORT}`);
  await InstallGuildCommands(config.APP_ID, config.GUILD_ID, [
    RANDOM_PROBLEM_COMMAND,
    PROBLEM_FROM_SET_COMMAND,
  ]);
};

/**
 * Client commands that run recurrently (Crons) and blocking
 */
const runDaemon = () => {
  const daily = schedule.scheduleJob(config.DAILY_MESSAGE_CRON, postDailyMessages);
  logger.info(`daily cron has started and will next run at: ${daily.nextInvocation().toISOString()}`);

  const weekly = schedule.scheduleJob(config.WEEKLY_MESSAGE_CRON, postWeeklyMessages);
  logger.info(`weekly has started and will next run at: ${weekly.nextInvocation().toISOString()}`);

  const heartbeat = schedule.scheduleJob('0 * * * * *', () => {
    logger.info('heartbeat');
  });
  logger.info(`heartbeat will run next at: ${heartbeat.nextInvocation().toISOString()}`);

  app.use(morganMiddleware);

  /**
   * Interactions endpoint URL where Discord will send HTTP requests
   */
  app.post('/interactions', discordInteractionsHandler as (req: Request, res: Response) => void);

  app.listen(PORT, appListener as () => void);
};

// CLI definition
const y = yargs(hideBin(process.argv))
  .scriptName('elprimobot')
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .command(
    'leetcode-daily',
    'Sends leetcode daily problem to a Discord channel',
    async () => {},
    async () => {
      const client = await getDiscordClient();
      const leetcode = new Leetcode(client);
      await leetcode.postDailyChallenge();
      client.destroy();
    },
  )
  .command(
    'leetcode-weekly',
    'Sends leetcode weekly problem to a Discord channel',
    async () => {},
    async () => {
      const client = await getDiscordClient();
      const leetcode = new Leetcode(client);
      await leetcode.postWeeklyChallenge();
      client.destroy();
    },
  )
  .command(
    'leetcode-random',
    'Sends a random leetcode problem to a Discord channel',
    async () => {},
    async () => {
      const client = await getDiscordClient();
      const leetcode = new Leetcode(client);
      await leetcode.postRandomChallenge();
      client.destroy();
    },
  )
  .command(
    'stats-weekly',
    'Sends Discord users weekly chat activity stats',
    async () => {},
    async () => {
      const client = await getDiscordClient();
      const stats = new Stats(client);
      await stats.postWeeklyStats();
      logger.info('destroying client');
      client.destroy();
    },
  )
  .command(
    'daemon',
    'Runs the all the features in blocking mode',
    async () => {},
    () => {
      runDaemon();
    },
  );
y.parse(process.argv.slice(2));  // eslint-disable-line
