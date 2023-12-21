import { MessageEmbed } from "discord.js";
import { URL } from "./leetcode/index.js";
import {
    getDailyProblem, getWeeklyProblem, getRandomProblem,
    getProblemCategories, getRandomProblemFromCategory,
} from "./leetcode-data.js";
import { config } from "../config.js";
import logger from "../logging.js";

// const childLogger = logger.child({ component: "discord client" });

export class Leetcode {
    client;

    channel;

    constructor(discordClient) {
        this.client = discordClient;
        this.MESSAGE_COLORS = {
            DAILY: "#00FFFF",
            WEEKLY: "#FFBF00",
            RANDOM: "#4CAF50",
        };
    }

    _getLeetCodeChannel = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.LEETCODE_CHALLENGES_CHANNEL,
        );
    };

    /*
        Post a MessageEmbed into the leetcode channel
    */
    _postMessageIntoChannel = async (message) => {
        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }
        await this.channel.send(message);
    };

    /*
        Fetch the leetcode daily challenge and send a message to the channel
    */
    postDailyChallenge = async () => {
        const dailyMessage = await this.getDailyProblemMessage();
        if (!dailyMessage) {
            logger.error("Unable to fetch daily challenge message");
            return;
        }
        await this._postMessageIntoChannel(dailyMessage);
    };

    /*
        Fetch the leetcode weekly challenge and send a message to the channel
    */
    postWeeklyChallenge = async () => {
        const weeklyMessage = await this.getWeeklyProblemMessage();
        if (!weeklyMessage) {
            logger.error("Unable to fetch weekly challenge message");
            return;
        }
        await this._postMessageIntoChannel(weeklyMessage);
    };

    /*
        Post a random problem from the problem set
    */
    postRandomChallenge = async () => {
        const randomProblemMessage = await this.getRandomProblemMessage();
        if (!randomProblemMessage) {
            logger.error("Unable to fetch problem message");
            return;
        }
        await this._postMessageIntoChannel(randomProblemMessage);
    };

    /*
        Get random problem message embed
    */
    getRandomProblemMessage = async () => {
        const randomProblemObj = await getRandomProblem();

        if (!randomProblemObj) {
            logger.error("Unable to fetch problemSet");
            return;
        }

        return {
            content: "**Leetcode Random Problem**", // This is the first line of the message
            embeds: [
                await Leetcode.buildDetailedProblemMessage(
                    { ...randomProblemObj, color: this.MESSAGE_COLORS.RANDOM },
                ),
            ],
        };
    };

    /*
        Get random problem from category message embed
    */
    getRandomProblemFromCategoryMessage = async (category) => {
        const randomProblemObj = await getRandomProblemFromCategory(category);

        if (!randomProblemObj) {
            logger.error("Unable to fetch problemSet");
            return;
        }

        const categories = await getProblemCategories();

        return {
            content: `**Leetcode Random ${categories[category]} challenge**`, // This is the first line of the message
            embeds: [
                await Leetcode.buildDetailedProblemMessage(
                    { ...randomProblemObj, color: this.MESSAGE_COLORS.RANDOM },
                ),
            ],
        };
    };

    /*
        Get daily problem message embed
    */
    getDailyProblemMessage = async () => {
        const dailyProblemObj = await getDailyProblem();

        if (!dailyProblemObj) {
            logger.error("Unable to fetch the daily problem");
            return;
        }

        return {
            content: "**Leetcode Daily**", // This is the first line of the message
            embeds: [
                await Leetcode.buildDetailedProblemMessage(
                    { ...dailyProblemObj, color: this.MESSAGE_COLORS.DAILY },
                ),
            ],
        };
    };

    /*
        Get weekly problem message embed
    */
    getWeeklyProblemMessage = async () => {
        const weeklyProblemObj = await getWeeklyProblem();

        if (!weeklyProblemObj) {
            logger.error("Unable to fetch the daily problem");
            return;
        }

        return {
            content: "**Leetcode Weekly**", // This is the first line of the message
            embeds: [
                await Leetcode.buildSimplifiedProblemMessage(
                    { ...weeklyProblemObj, color: this.MESSAGE_COLORS.WEEKLY },
                ),
            ],
        };
    };

    /*
        Builds a discord Leetcode challenge detailed message
    */
    static buildDetailedProblemMessage = async (problem) => new MessageEmbed()
        .setColor(problem.color)
        .setTitle(`${problem.frontendQuestionId}. ${problem.title}`)
        .setURL(`${URL}${problem.link}`)
        .addFields(
            { name: "Difficulty", value: "```" + problem.difficulty + "\n```", inline: true },
            { name: "Success rate", value: "```" + Number.parseFloat(problem.acRate).toFixed(2) + "```", inline: true },
        );

    /*
        Builds a discord Leetcode challenge simplified message
    */
    static buildSimplifiedProblemMessage = async (problem) => new MessageEmbed()
        .setColor(problem.color)
        .setTitle(`${problem.questionFrontendId}. ${problem.title}`)
        .setURL(`${URL}${problem.link}`)
        .addFields({ name: "Remaining time", value: `${problem.remainingTimeMessage}`, inline: false })
        .setFooter({ text: "Time to code 🔥👨‍💻🔥" });
}
