require("dotenv").config();

const { Client, Intents, MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");

const config = {
    APP_ID: process.env.APP_ID || undefined,
    GUILD_ID: process.env.GUILD_ID || undefined,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
    PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
};

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once("ready", () => {

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

    const leetcodeUrl = "https://leetcode.com"
    fetch(`${leetcodeUrl}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
        },
        compress: true,
    })
        .then(res => {
            if (!res.ok) {
                throw res.error;
            }
            return res.json()
        })
        .then(data => {

            console.log(JSON.stringify(data))

            // == Send message to discord here ==

            // Find channel
            const channelName = process.env.DAILY_CHALLENGES_CHANNEL || undefined;
            const channel = client.channels.cache.find(
                (channel) => channel.name === channelName
            );

            const problemData = data.data.activeDailyCodingChallengeQuestion;
            console.log(problemData)

            const message = new MessageEmbed()
                .setColor('#00FFFF')
                .setTitle(`${problemData.question.frontendQuestionId}. ${problemData.question.title}`)
                .setURL(`${leetcodeUrl}${problemData.link}`)
                .addFields(
                    { name: 'Difficulty', value: "```" + problemData.question.difficulty + "\n```", inline: true },
                    { name: 'Success rate', value: "```" + Number.parseFloat(problemData.question.acRate).toFixed(2) + "```", inline: true },
                )
            channel.send({ content: "**Leetcode Daily**", embeds: [message] })
                .then(() => {
                    // Close the client websocket connection and unblock program
                    client.destroy();
                })

        })
        .catch(error => {
            console.error("Could not fetch: ", error)
        })
});


// Login to Discord with your client's token
client.login() // This leaves the app blocking because it opens a ws connection to Discord, call client.destroy() somewhere else
