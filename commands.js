import { getRPSChoices } from "./game.js";
import { capitalize, DiscordRequest } from "./utils.js";
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
            const installedNames = data.map((c) => c.name);
            // This is just matching on the name, so it's not good for updates
            if (!installedNames.includes(command.name)) {
                logger.info(`Installing "${command.name}"`);
                InstallGuildCommand(appId, guildId, command);
            } else {
                logger.info(`"${command.name}" command already installed`);
            }
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

// Simple test command
export const TEST_COMMAND = {
    name: "test",
    description: "Basic guild command",
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
