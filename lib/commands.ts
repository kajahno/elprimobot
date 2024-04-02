import { RequestInit } from 'node-fetch';
import { DiscordRequest } from './utils';
import { getProblemCategories } from './api/index';
import logger from './logging';
import { IDiscordGuildCommandDefinition } from './types';

// Installs a command
export async function InstallGuildCommand(appId, guildId, command: IDiscordGuildCommandDefinition) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  // install command
  try {
    await DiscordRequest(endpoint, { method: 'POST', body: command as unknown as string } as RequestInit);
    logger.info(`Installed "${command.name}"`);
  } catch (err) {
    logger.error(err);
  }
}

export async function UninstallGuildCommand(
  appId: string,
  guildId: string,
  command: IDiscordGuildCommandDefinition,
) {
  // API endpoint to get and post guild commands
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  // uninstall command
  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const data = await res.json() as Array<IDiscordGuildCommandDefinition>;
    const commands = data.filter((c) => c.name === command.name);
    if (commands.length > 0) {
      await DiscordRequest(`${endpoint}/${commands[0].id}`, { method: 'DELETE' });
      logger.info(`Deleted "${command.name}"`);
    } else {
      logger.info(`Command "${command.name}" not found. Nothing to delete.`);
    }
  } catch (err) {
    logger.error(err);
  }
}

export async function UninstallGuildCommands(
  appId: string,
  guildId: string,
  commands: Array<IDiscordGuildCommandDefinition>,
) {
  if (guildId === '' || appId === '') return;
  for (const c of commands) {
    await UninstallGuildCommand(appId, guildId, c);
  }
}

export async function InstallGuildCommands(
  appId: string,
  guildId: string,
  commands: Array<IDiscordGuildCommandDefinition>,
) {
  if (guildId === '' || appId === '') return;
  for (const c of commands) {
    await InstallGuildCommand(appId, guildId, c);
  }
}

// Get the challenge categories from api/leetcode-data.js
export function challengeCategoriesCommandChoices() {
  return Object.entries(getProblemCategories()).map(([key, value]) => ({
    name: value,
    value: key,
  }));
}

export const RANDOM_PROBLEM_COMMAND: IDiscordGuildCommandDefinition = {
  name: 'randomproblem',
  description: 'Get a random leetcode problem',
  type: 1,
};

export const PROBLEM_FROM_SET_COMMAND: IDiscordGuildCommandDefinition = {
  name: 'problemfromset',
  description: 'Get a leetcode problem from a category',
  options: [
    {
      type: 3,
      name: 'category',
      description: 'Pick your category',
      required: true,
      choices: challengeCategoriesCommandChoices(),
    },
  ],
  type: 1,
};
