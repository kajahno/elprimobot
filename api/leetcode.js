import { MessageEmbed } from "discord.js";
import { dailyGetLeetcodeData, weeklyGetLeetcodeData, URL } from "./leetcode/index.js";
import { config } from "../config.js";
import logger from "../logging.js";

// const childLogger = logger.child({ component: "discord client" });

export class Leetcode {
    client;

    channel;

    constructor(discordClient) {
        this.client = discordClient;
    }

    _getLeetCodeChannel = async () => {
        const dominationGuild = this.client.guilds.resolve(config.GUILD_ID);
        return dominationGuild.channels.cache.find(
            (channel) => channel.name === config.LEETCODE_CHALLENGES_CHANNEL,
        );
    };

    _postDailyIntoChannel = async ({
        frontendQuestionId, title, link, difficulty, acRate,
    }) => {
        const message = new MessageEmbed()
            .setColor("#00FFFF")
            .setTitle(`${frontendQuestionId}. ${title}`)
            .setURL(`${URL}${link}`)
            .addFields(
                { name: "Difficulty", value: "```" + difficulty + "\n```", inline: true },
                { name: "Success rate", value: "```" + Number.parseFloat(acRate).toFixed(2) + "```", inline: true },
            );

        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }

        await this.channel.send({ content: "**Leetcode Daily**", embeds: [message] });
    };

    _postWeeklyIntoChannel = async ({
        questionFrontendId, title, link, remainingTimeMessage,
    }) => {
        const weeklyProblemMessage = new MessageEmbed()
            .setColor("#FFBF00")
            .setTitle(`${questionFrontendId}. ${title}`)
            .setURL(`${URL}${link}`)
            .addFields({ name: "Remaining time", value: `${remainingTimeMessage}`, inline: false })
            .setFooter({ text: "Time to code 🔥👨‍💻🔥" });

        if (!this.channel) {
            this.channel = await this._getLeetCodeChannel();
        }

        await this.channel.send({ content: "**Leetcode Weekly**", embeds: [weeklyProblemMessage] });
    };

    /*
        Fetch the leetcode daily challenge and send a message to the channel
    */
    postDailyChallenge = async () => {
        const { data: { activeDailyCodingChallengeQuestion } } = await dailyGetLeetcodeData();
        if (!activeDailyCodingChallengeQuestion) {
            logger.error("Unable to fetch dailyGetLeetcodeData");
            return;
        }

        const info = {
            ...activeDailyCodingChallengeQuestion.question,
            link: activeDailyCodingChallengeQuestion.link,
        };

        await this._postDailyIntoChannel(info);
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
}
