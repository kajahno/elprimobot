import "dotenv/config";

import { CronJob } from "cron";
import express from "express";
import {
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    ButtonStyleTypes,
} from "discord-interactions";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config } from "./config.js";
import {
    VerifyDiscordRequest, getRandomEmoji, DiscordRequest, postDailyMessages, postWeeklyMessages,
} from "./utils.js";
import { getShuffledOptions, getResult } from "./game.js";
import {
    Stats, getDiscordClient, Leetcode,
} from "./api/index.js";
import {
    CHALLENGE_COMMAND,
    TEST_COMMAND,
    RANDOM_PROBLEM_COMMAND,
    PROBLEM_FROM_SET_COMMAND,
    HasGuildCommands,
} from "./commands.js";
import morganMiddleware from "./middleware/morgan.js";
import logger from "./logging.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

/**
 * Client commands that run recurrently (Crons) and blocking
 */
const runDaemon = async () => {
    const daily = new CronJob(
        config.DAILY_MESSAGE_CRON,
        postDailyMessages,
        null, // onComplete
        true, // autostart
        null, // timeZone
        null, // context
        null, // runOnInit
        0, // utcOffset
    );
    logger.info(`daily cron has started and will next run at: ${daily.nextDate().toUTC(0).toISO()}`);

    const weekly = new CronJob(
        config.WEEKLY_MESSAGE_CRON,
        postWeeklyMessages,
        null, // onComplete
        true, // autostart
        null, // timeZone
        null, // context
        null, // runOnInit
        0, // utcOffset
    );
    logger.info(`weekly has started and will next run at: ${weekly.nextDate().toUTC(0).toISO()}`);

    app.use(morganMiddleware);

    const leetcode = new Leetcode(await getDiscordClient());

    /**
     * Interactions endpoint URL where Discord will send HTTP requests
     */
    app.post("/interactions", async (req, res) => {
        // Interaction type and data
        const { type, id, data } = req.body;

        /**
         * Handle verification requests
         */
        if (type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }

        /**
         * Handle slash command requests
         * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
         */
        if (type === InteractionType.APPLICATION_COMMAND) {
            const { name } = data;

            // "test" guild command
            if (name === "test") {
                // Send a message into the channel where command was triggered from
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        // Fetches a random emoji to send from a helper function
                        content: `hello world ${getRandomEmoji()}`,
                    },
                });
            }

            // "random problem" guild command
            if (name === "randomproblem") {
                const message = await leetcode.getRandomProblemMessage();
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: message,
                });
            }

            // "problemfromset" guild command
            if (name === "problemfromset") {
                logger.info(req.body);

                // Get the category passed
                const categoryId = req.body.data.options[0].value;
                const message = await leetcode.getRandomProblemFromCategoryMessage(categoryId);

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: message,
                });
            }

            // "challenge" guild command
            if (name === "challenge" && id) {
                const userId = req.body.member.user.id;
                // User's object choice
                const objectName = req.body.data.options[0].value;

                // Create active game using message ID as the game ID
                activeGames[id] = {
                    id: userId,
                    objectName,
                };

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Challenge from category for <@${userId}>`,
                        components: [
                            {
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type: MessageComponentTypes.BUTTON,
                                        // Append the game ID to use later on
                                        custom_id: `accept_button_${req.body.id}`,
                                        label: "Accept",
                                        style: ButtonStyleTypes.PRIMARY,
                                    },
                                ],
                            },
                        ],
                    },
                });
            }
        }

        /**
         * Handle requests from interactive components
         * See https://discord.com/developers/docs/interactions/message-components#responding-to-a-component-interaction
         */
        if (type === InteractionType.MESSAGE_COMPONENT) {
            // custom_id set in payload when sending message component
            const componentId = data.custom_id;

            if (componentId.startsWith("accept_button_")) {
                // get the associated game ID
                const gameId = componentId.replace("accept_button_", "");
                // Delete message with token in request body
                const endpoint = `webhooks/${config.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
                try {
                    await res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "What is your object of choice?",
                            // Indicates it'll be an ephemeral message
                            flags: InteractionResponseFlags.EPHEMERAL,
                            components: [
                                {
                                    type: MessageComponentTypes.ACTION_ROW,
                                    components: [
                                        {
                                            type: MessageComponentTypes.STRING_SELECT,
                                            // Append game ID
                                            custom_id: `select_choice_${gameId}`,
                                            options: getShuffledOptions(),
                                        },
                                    ],
                                },
                            ],
                        },
                    });
                    // Delete previous message
                    await DiscordRequest(endpoint, { method: "DELETE" });
                } catch (err) {
                    logger.error("Error sending message:", err);
                }
            } else if (componentId.startsWith("select_choice_")) {
                // get the associated game ID
                const gameId = componentId.replace("select_choice_", "");

                if (activeGames[gameId]) {
                    // Get user ID and object choice for responding user
                    const userId = req.body.member.user.id;
                    const objectName = data.values[0];
                    // Calculate result from helper function
                    const resultStr = getResult(activeGames[gameId], {
                        id: userId,
                        objectName,
                    });

                    // Remove game from storage
                    delete activeGames[gameId];
                    // Update message with token in request body
                    const endpoint = `webhooks/${config.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

                    try {
                        // Send results
                        await res.send({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: resultStr },
                        });
                        // Update ephemeral message
                        await DiscordRequest(endpoint, {
                            method: "PATCH",
                            body: {
                                content: `Nice choice ${getRandomEmoji()}`,
                                components: [],
                            },
                        });
                    } catch (err) {
                        logger.error("Error sending message:", err);
                    }
                }
            }
        }
    });

    app.listen(PORT, () => {
        logger.info(`Listening on port: ${PORT}`);

        // Check if guild commands from commands.js are installed (if not, install them)
        HasGuildCommands(config.APP_ID, config.GUILD_ID, [
            TEST_COMMAND,
            CHALLENGE_COMMAND,
            RANDOM_PROBLEM_COMMAND,
            PROBLEM_FROM_SET_COMMAND,
        ]);
    });
};

// CLI definition
const y = yargs(hideBin(process.argv));
y.scriptName("elprimobot");
y.option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
});
y.command({
    command: "leetcode-daily",
    description: "Sends leetcode daily problem to a Discord channel",
    handler: async () => {
        const client = await getDiscordClient();
        const leetcode = new Leetcode(client);
        await leetcode.postDailyChallenge();
        await client.destroy();
    },
});
y.command({
    command: "leetcode-weekly",
    description: "Sends leetcode weekly problem to a Discord channel",
    handler: async () => {
        const client = await getDiscordClient();
        const leetcode = new Leetcode(client);
        await leetcode.postWeeklyChallenge();
        await client.destroy();
    },
});
y.command({
    command: "leetcode-random",
    description: "Sends a random leetcode problem to a Discord channel",
    handler: async () => {
        const client = await getDiscordClient();
        const leetcode = new Leetcode(client);
        await leetcode.postRandomChallenge();
        await client.destroy();
    },
});
y.command({
    command: "stats-weekly",
    description: "Sends Discord users weekly chat activity stats",
    handler: async () => {
        const client = await getDiscordClient();
        const stats = new Stats(client);
        await stats.postWeeklyStats();
        logger.info("destroying client");
        await client.destroy();
    },
});
y.command({
    command: "daemon",
    description: "Runs the all the features in blocking mode",
    handler: async () => {
        await runDaemon();
    },
});

y.parse(process.argv.slice(2));
