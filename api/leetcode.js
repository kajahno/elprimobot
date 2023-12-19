import { MessageEmbed } from "discord.js";
import { dailyGetLeetcodeData, weeklyGetLeetcodeData, getProblemSet, URL } from "./leetcode/index.js";
import { config } from "../config.js";
import logger from "../logging.js";
import staticProblemSets from './leetcode/static/problemSets.json' assert { type: "json" };

// const childLogger = logger.child({ component: "discord client" });

export class Leetcode {
    client;

    channel;

    constructor(discordClient) {
        this.client = discordClient;
        this.leetcodeData = new LeetcodeData();
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
        Fetch the leetcode weekly challenge and send a message to the channel
    */
    _postWeeklyIntoChannel = async () => {
        const obj = await this.getWeeklyProblemMessage();
        if (!obj) {
            logger.error("Unable to fetch problem message");
            return;
        }

        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }

        await this.channel.send(obj);
    };

    /*
        Fetch the leetcode daily challenge and send a message to the channel
    */
    postDailyChallenge = async () => {
        const obj = await this.getDailyProblemMessage();
        if (!obj) {
            logger.error("Unable to fetch problem message");
            return;
        }

        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }
        await this.channel.send(obj);
    };

    /*
        Fetch the leetcode weekly challenge and send a message to the channel
    */
    postWeeklyChallenge = async () => {
        const {
            data: {
                dailyCodingChallengeV2:
            { weeklyChallenges },
            },
        } = await weeklyGetLeetcodeData();
        if (!weeklyChallenges) {
            logger.error("Unable to fetch weeklyGetLeetcodeData");
            return;
        }

        const lastWeeklyProblemData = weeklyChallenges[weeklyChallenges.length - 1];
        const oneDay = 24 * 60 * 60 * 1000; // this is a day expressed in milliseconds
        const now = new Date();
        const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
        const weeklyRemainingDays = Math.round(Math.abs((weeklyChangeDate - now) / oneDay));
        const remainingTimeMessage = weeklyRemainingDays + (weeklyRemainingDays >= 2 ? " days" : " day");

        const info = {
            ...lastWeeklyProblemData.question,
            link: lastWeeklyProblemData.link,
            remainingTimeMessage,
        };

        await this._postWeeklyIntoChannel(info);
    };

    /*
        Post a random problem from the problem set
    */
    postRandomChallenge = async () => {
        const obj = await this.getRandomProblemMessage();
        if (!obj) {
            logger.error("Unable to fetch problem message");
            return;
        }

        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }
        await this.channel.send(obj);
    }

    /*
        Builds a random problem object from the problem set
    */
    _getRandomProblem = async () => {
        const problemSet = await this.leetcodeData.getStaticProblemSet();

        if (!problemSet) {
            logger.error("Unable to get statidProblemSet data");
            return;
        }

        const randomProblem = problemSet[Math.floor(Math.random() * problemSet.length)];

        return {
            ...randomProblem,
            link: `/problems/${randomProblem.titleSlug}/`,
        };
    }

    /*
        Get random problem message embed
    */
    getRandomProblemMessage = async () => {
        const obj = await this._getRandomProblem();

        if (!obj) {
            logger.error("Unable to fetch problemSet");
            return;
        }

        return {
            content: "**Leetcode Random Problem**", // This is the first line of the message
            embeds: [
                await this._buildDetailedProblemMessage({...obj, color: this.MESSAGE_COLORS.RANDOM})
            ]
        }
    }

    /*
        Get daily problem message embed
    */
    getDailyProblemMessage = async () => {
        const obj = await this.leetcodeData.getDailyProblem();

        if (!obj) {
            logger.error("Unable to fetch the daily problem");
            return;
        }

        return {
            content: "**Leetcode Daily**", // This is the first line of the message
            embeds: [
                await this._buildDetailedProblemMessage({...obj, color: this.MESSAGE_COLORS.DAILY})
            ]
        }
    }

    /*
        Get weekly problem message embed
    */
    getWeeklyProblemMessage = async () => {
        const obj = await this.leetcodeData.getWeeklyProblem();

        if (!obj) {
            logger.error("Unable to fetch the daily problem");
            return;
        }

        return {
            content: "**Leetcode Weekly**", // This is the first line of the message
            embeds: [
                await this._buildSimplifiedProblemMessage({...obj, color: this.MESSAGE_COLORS.WEEKLY})
            ]
        }
    }

    /*
        Builds a discord Leetcode challenge detailed message
    */
    _buildDetailedProblemMessage = async (problem) => {
        return new MessageEmbed()
            .setColor(problem.color)
            .setTitle(`${problem.frontendQuestionId}. ${problem.title}`)
            .setURL(`${URL}${problem.link}`)
            .addFields(
                { name: "Difficulty", value: "```" + problem.difficulty + "\n```", inline: true },
                { name: "Success rate", value: "```" + Number.parseFloat(problem.acRate).toFixed(2) + "```", inline: true },
            );
    }

    /*
        Builds a discord Leetcode challenge simplified message
    */
    _buildSimplifiedProblemMessage = async (problem) => {
        return new MessageEmbed()
            .setColor(problem.color)
            .setTitle(`${problem.questionFrontendId}. ${problem.title}`)
            .setURL(`${URL}${problem.link}`)
            .addFields({ name: "Remaining time", value: `${problem.remainingTimeMessage}`, inline: false })
            .setFooter({ text: "Time to code 🔥👨‍💻🔥" });
    }
}


export class LeetcodeData {

    constructor() {}

    getProblemSetData = async () => {
        // TODO: find a way to memoize this. It takes too long.
        const { data: { problemsetQuestionList: { questions } } } = await getProblemSet();
        if (!questions) {
            logger.error("Unable to fetch problemsetQuestionList");
            return;
        }

        return questions
    };

    getDailyProblem = async () => {
        const { data: { activeDailyCodingChallengeQuestion } } = await dailyGetLeetcodeData();
        if (!activeDailyCodingChallengeQuestion) {
            logger.error("Unable to fetch dailyGetLeetcodeData");
            return;
        }
        return {
            ...activeDailyCodingChallengeQuestion.question,
            link: activeDailyCodingChallengeQuestion.link,
        };
    }

    getWeeklyProblem = async () => {
        const {
            data: {
                dailyCodingChallengeV2:
            { weeklyChallenges },
            },
        } = await weeklyGetLeetcodeData();
        if (!weeklyChallenges) {
            logger.error("Unable to fetch weeklyGetLeetcodeData");
            return;
        }

        const lastWeeklyProblemData = weeklyChallenges[weeklyChallenges.length - 1];
        const oneDay = 24 * 60 * 60 * 1000; // this is a day expressed in milliseconds
        const now = new Date();
        const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
        const weeklyRemainingDays = Math.round(Math.abs((weeklyChangeDate - now) / oneDay));
        const remainingTimeMessage = weeklyRemainingDays + (weeklyRemainingDays >= 2 ? " days" : " day");

        return {
            ...lastWeeklyProblemData.question,
            link: lastWeeklyProblemData.link,
            remainingTimeMessage,
        };
    }

    getStaticProblemSet = async () => {
        const { data: { problemsetQuestionList: { questions } } } = staticProblemSets;
        if (!questions) {
            logger.error("Unable to fetch problemsetQuestionList");
            return;
        }

        return questions
    };

    getProblemCategories = async () => {
        return [
            "Array",
            "Backtracking",
            "Binary Search",
            "Bit Manipulation",
            "Divide and Conquer",
            "Dynamic Programming",
            "Greedy",
            "Hash Table",
            "Heap (Priority Queue)",
            "Linked List",
            "Math",
            "Matrix",
            "Merge Sort",
            "Monotonic Stack",
            "Recursion",
            "Simulation",
            "Sliding Window",
            "Sorting",
            "Stack",
            "String Matching",
            "String",
            "Trie",
            "Two Pointers",
        ]
    };
}
