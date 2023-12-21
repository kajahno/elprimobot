import "dotenv/config";

import { CronJob } from "cron";
import express from "express";
import {
    InteractionType,
    InteractionResponseType,
} from "discord-interactions";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config } from "./config.js";
import {
    VerifyDiscordRequest, postDailyMessages, postWeeklyMessages,
} from "./utils.js";
import {
    Stats, getDiscordClient, Leetcode,
} from "./api/index.js";
import {
    RANDOM_PROBLEM_COMMAND,
    PROBLEM_FROM_SET_COMMAND,
    InstallGuildCommands,
} from "./commands.js";
import morganMiddleware from "./middleware/morgan.js";
import logger from "./logging.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

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
        const { type, data } = req.body;

        /**
         * Handle verification requests.
         * Required by Discord to verify the endpoint and validate the integration with the bot.
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
                // Get the category passed
                const categoryId = data.options[0].value;
                const message = await leetcode.getRandomProblemFromCategoryMessage(categoryId);

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: message,
                });
            }
        }
    });

    app.listen(PORT, () => {
        logger.info(`Listening on port: ${PORT}`);
        InstallGuildCommands(config.APP_ID, config.GUILD_ID, [
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
