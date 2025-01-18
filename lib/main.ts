
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { argv } from 'node:process';

if (import.meta.main) {
  // CLI definition
  const y = yargs(hideBin(argv))
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
        // const client = await getDiscordClient();
        // const leetcode = new Leetcode(client);
        // await leetcode.postDailyChallenge();
        // client.destroy();
      },
    )
    .command(
      'leetcode-weekly',
      'Sends leetcode weekly problem to a Discord channel',
      async () => {},
      async () => {
        // const client = await getDiscordClient();
        // const leetcode = new Leetcode(client);
        // await leetcode.postWeeklyChallenge();
        // client.destroy();
      },
    )
    .command(
      'leetcode-random',
      'Sends a random leetcode problem to a Discord channel',
      async () => {},
      async () => {
        // const client = await getDiscordClient();
        // const leetcode = new Leetcode(client);
        // await leetcode.postRandomChallenge();
        // client.destroy();
      },
    )
    .command(
      'stats-weekly',
      'Sends Discord users weekly chat activity stats',
      async () => {},
      async () => {
        // const client = await getDiscordClient();
        // const stats = new Stats(client);
        // await stats.postWeeklyStats();
        // logger.info('destroying client');
        // client.destroy();
      },
    )
    .command(
      'daemon',
      'Runs the all the features in blocking mode',
      async () => {},
      () => {
        // runDaemon();
      },
    );
    y.parse(argv.slice(2));  // eslint-disable-line
}
