require("dotenv").config();

const { time } = require("cron");
const { Client, Intents, MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");

const config = {
    APP_ID: process.env.APP_ID || undefined,
    GUILD_ID: process.env.GUILD_ID || undefined,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
    PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
};

// Globals
const LEETCODE_URL = "https://leetcode.com"

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const dailyGetLeetcodeData = async _ => {

    const data = {
        query: `
    query questionOfToday {
        activeDailyCodingChallengeQuestion {
          date
          userStatus
          link
          question {
            acRate
            difficulty
            freqBar
            frontendQuestionId: questionFrontendId
            isFavor
            paidOnly: isPaidOnly
            status
            title
            titleSlug
            hasVideoSolution
            hasSolution
            topicTags {
              name
              id
              slug
            }
          }
        }
      }`,
        variables: {}
    }

    const response = await fetch(`${LEETCODE_URL}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
        },
        compress: true,
    })

    if (response.status !== 200){
        console.error("could not fetch: ", response.status)
        return
    }
    return response.json()
}

const weeklyGetLeetcodeData = async _ => {

    const now = new Date();

    const data = {
        query: `
    query dailyCodingQuestionRecords($year: Int!, $month: Int!) {
        dailyCodingChallengeV2(year: $year, month: $month) {
            challenges {
            date
            userStatus
            link
            question {
                questionFrontendId
                title
                titleSlug
            }
            }
            weeklyChallenges {
            date
            userStatus
            link
            question {
                questionFrontendId
                title
                titleSlug
            }
            }
        }
    }`,
        variables: { year: now.getFullYear(), month: now.getMonth() + 1 }
    }

    const response = await fetch(`${LEETCODE_URL}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
        },
        compress: true,
    })

    if (response.status !== 200){
        console.error("could not fetch: ", response.status)
        return
    }
    return response.json()
}



// When the client is ready, run this code (only once)
client.once("ready", async () => {

    const dailyLeetcodeData = await dailyGetLeetcodeData();
    if (! dailyLeetcodeData ) {
        console.error("there's no data available")
        return
    }

    const dailyProblemData = dailyLeetcodeData.data.activeDailyCodingChallengeQuestion;
    console.log(dailyProblemData)

    const weeklyLeetcodeData = await weeklyGetLeetcodeData();
    if (! weeklyLeetcodeData ) {
        console.error("there's no data available")
        return
    }

    const weeklyProblemData = weeklyLeetcodeData.data.dailyCodingChallengeV2.weeklyChallenges;
    const lastWeeklyProblemData = weeklyProblemData[weeklyProblemData.length - 1];

    const oneDay = 24 * 60 * 60 * 1000; //this is a day expressed in milliseconds
    const now = new Date();
    const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
    const weeklyRemainingDays = Math.round(Math.abs((weeklyChangeDate - now)/oneDay));

    console.log(lastWeeklyProblemData);

    // Find channel
    const channelName = process.env.LEETCODE_CHALLENGES_CHANNEL || undefined;
    const channel = client.channels.cache.find(
        (channel) => channel.name === channelName
    );

    if (!channel){
        console.error(`could not find Discord channel: ${channelName}`)
        return
    }

    const dailyProblemMessage = new MessageEmbed()
        .setColor('#00FFFF')
        .setTitle(`${dailyProblemData.question.frontendQuestionId}. ${dailyProblemData.question.title}`)
        .setURL(`${LEETCODE_URL}${dailyProblemData.link}`)
        .addFields(
            { name: 'Difficulty', value: "```" + dailyProblemData.question.difficulty + "\n```", inline: true },
            { name: 'Success rate', value: "```" + Number.parseFloat(dailyProblemData.question.acRate).toFixed(2) + "```", inline: true },
        )

    await channel.send({ content: "**Leetcode Daily**", embeds: [dailyProblemMessage] })

    const weeklyProblemMessage = new MessageEmbed()
        .setColor('#FFBF00')
        .setTitle(`${lastWeeklyProblemData.question.questionFrontendId}. ${lastWeeklyProblemData.question.title}`)
        .setURL(`${LEETCODE_URL}${lastWeeklyProblemData.link}`)
        .setFooter({ text: 'Time to code 🔥👨‍💻🔥, ' + weeklyRemainingDays +' days remaining ' });

    await channel.send({ content: "**Leetcode Weekly**", embeds: [weeklyProblemMessage] })

    // Close the client websocket connection and unblock program
    client.destroy();

});


// Login to Discord with your client's token
client.login() // This leaves the app blocking because it opens a ws connection to Discord, call client.destroy() somewhere else to close it
