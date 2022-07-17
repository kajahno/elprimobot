require("dotenv").config();

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

const getLeetcodeData = async _ => {

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


// When the client is ready, run this code (only once)
client.once("ready", async () => {

    const leetcodeData = await getLeetcodeData();
    if (! leetcodeData ) {
        console.error("there's no data available")
        return
    }

    const problemData = leetcodeData.data.activeDailyCodingChallengeQuestion;
    console.log(problemData)

    // Find channel
    const channelName = process.env.DAILY_CHALLENGES_CHANNEL || undefined;
    const channel = client.channels.cache.find(
        (channel) => channel.name === channelName
    );

    if (!channel){
        console.error(`could not find Discord channel: ${channelName}`)
        return
    }

    const message = new MessageEmbed()
        .setColor('#00FFFF')
        .setTitle(`${problemData.question.frontendQuestionId}. ${problemData.question.title}`)
        .setURL(`${LEETCODE_URL}${problemData.link}`)
        .addFields(
            { name: 'Difficulty', value: "```" + problemData.question.difficulty + "\n```", inline: true },
            { name: 'Success rate', value: "```" + Number.parseFloat(problemData.question.acRate).toFixed(2) + "```", inline: true },
        )

    await channel.send({ content: "**Leetcode Daily**", embeds: [message] })

    // Close the client websocket connection and unblock program
    client.destroy();

});


// Login to Discord with your client's token
client.login() // This leaves the app blocking because it opens a ws connection to Discord, call client.destroy() somewhere else to close it
