import 'dotenv/config';

export const config = {
  APP_ID: process.env.APP_ID || undefined,
  GUILD_ID: process.env.GUILD_ID || undefined,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
  PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
  LEETCODE_CHALLENGES_CHANNEL: process.env.LEETCODE_CHALLENGES_CHANNEL || undefined,
  STATS_CHANNEL: process.env.STATS_CHANNEL || undefined,
  BOTS: new Set((process.env.BOTS || 'elprimobot').split(',')),
  DAILY_MESSAGE_CRON: process.env.DAILY_MESSAGE_CRON || undefined,
  WEEKLY_MESSAGE_CRON: process.env.WEEKLY_MESSAGE_CRON || undefined,
  INACTIVITY_WEEKS_REMOVAL: parseInt(process.env.INACTIVITY_WEEKS_REMOVAL || '8', 10),
  INACTIVITY_WEEKS_DB_PATH: process.env.INACTIVITY_WEEKS_DB_PATH || undefined,
};
