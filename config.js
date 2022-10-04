
import 'dotenv/config';

export const config = {
    APP_ID: process.env.APP_ID || undefined,
    GUILD_ID: process.env.GUILD_ID || undefined,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
    PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
    LEETCODE_CHALLENGES_CHANNEL: process.env.LEETCODE_CHALLENGES_CHANNEL || undefined,
    DEV_PRIMOBOT_CHANNEL: process.env.DEV_PRIMOBOT_CHANNEL || undefined,
  };