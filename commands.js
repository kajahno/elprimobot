import { DiscordRequest } from "./utils.js";
import { getProblemCategories } from "./api/index.js";
import logger from "./logging.js";

// Installs a command
export async function InstallGuildCommand(appId, guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
    // install command
    try {
        await DiscordRequest(endpoint, { method: "POST", body: command });
        logger.info(`Installed "${command.name}"`);
    } catch (err) {
        logger.error(err);
    }
}

export async function UninstallGuildCommand(appId, guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
    // install command
    try {
        const res = await DiscordRequest(endpoint, { method: "GET" });
        const data = await res.json();
        const commands = data.filter((c) => c.name === command.name);
        if (commands.length > 0) {
            await DiscordRequest(`${endpoint}/${commands[0].id}`, { method: "DELETE" });
            logger.info(`Deleted "${command.name}"`);
        } else {
            logger.info(`Command "${command.name}" not found. Nothing to delete.`);
        }
    } catch (err) {
        logger.error(err);
    }
}

export async function UninstallGuildCommands(appId, guildId, commands) {
    if (guildId === "" || appId === "") return;

    commands.forEach((c) => UninstallGuildCommand(appId, guildId, c));
}

export async function InstallGuildCommands(appId, guildId, commands) {
    if (guildId === "" || appId === "") return;

    commands.forEach((c) => InstallGuildCommand(appId, guildId, c));
}

// Get the challenge categories from api/leetcode-data.js
export async function challengeCategoriesCommandChoices() {
    return Object.entries(await getProblemCategories()).map(([key, value]) => ({
        name: value,
        value: key,
    }));
}

export const RANDOM_PROBLEM_COMMAND = {
    name: "randomproblem",
    description: "Get a random leetcode problem",
    type: 1,
};

export const PROBLEM_FROM_SET_COMMAND = {
    name: "problemfromset",
    description: "Get a leetcode problem from a category",
    options: [
        {
            type: 3,
            name: "category",
            description: "Pick your category",
            required: true,
            choices: (await challengeCategoriesCommandChoices()),
        },
    ],
    type: 1,
};
