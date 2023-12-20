import { getRPSChoices } from "./game.js";
import { capitalize, DiscordRequest } from "./utils.js";
import { getProblemCategories } from "./api/index.js";
import logger from "./logging.js";

// Installs a command
export async function InstallGuildCommand(appId, guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
    // install command
    try {
        await DiscordRequest(endpoint, { method: "POST", body: command });
    } catch (err) {
        logger.error(err);
    }
}

// Checks for a command
async function HasGuildCommand(appId, guildId, command) {
    // API endpoint to get and post guild commands
    const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

    try {
        const res = await DiscordRequest(endpoint, { method: "GET" });
        const data = await res.json();
        if (data) {
            InstallGuildCommand(appId, guildId, command);
            logger.info(`Installing "${command.name}"`);
        }
    } catch (err) {
        logger.error(err);
    }
}

export async function HasGuildCommands(appId, guildId, commands) {
    if (guildId === "" || appId === "") return;

    commands.forEach((c) => HasGuildCommand(appId, guildId, c));
}

// Get the game choices from game.js
function createCommandChoices() {
    const choices = getRPSChoices();
    const commandChoices = [];

    choices.forEach((choice) => {
        commandChoices.push({
            name: capitalize(choice),
            value: choice.toLowerCase(),
        });
    });

    return commandChoices;
}

// Get the challenge categories from api/leetcode-data.js
export async function challengeCategoriesCommandChoices() {
    const commandChoices = [];
    for (const [key, value] of Object.entries(await getProblemCategories())) {
        commandChoices.push({
            name: key,
            value,
        });
    }
    return commandChoices;
}

// Simple test command
export const TEST_COMMAND = {
    name: "test",
    description: "Basic guild command",
    type: 1,
};

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

// Command containing options
export const CHALLENGE_COMMAND = {
    name: "challenge",
    description: "Challenge to a match of rock paper scissors",
    options: [
        {
            type: 3,
            name: "object",
            description: "Pick your object",
            required: true,
            choices: createCommandChoices(),
        },
    ],
    type: 1,
};
