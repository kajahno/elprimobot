require("dotenv").config();

const CronJob = require("cron").CronJob;
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
    console.log("Ready!");

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
    .then( res => res.json())
    .then( data => {

        console.log(JSON.stringify(data))

        // == Send message to discord here ==

        // Find channel
        const channelName = "test-bot-ignore";
        console.log(client.isReady());
        const channel = client.channels.cache.find(
            (channel) => channel.name === channelName
        );

        const problemData = data.data.activeDailyCodingChallengeQuestion;
        console.log(problemData)

        let problemDifficulty = problemData.question.difficulty;
        problemDifficulty = "Hard"
        let problemDifficultyStr;
        if (problemDifficulty === "Easy"){
            problemDifficultyStr = "```yaml\n" + problemDifficulty + "\n```"
        }
        else if (problemDifficulty === "Medium"){
            problemDifficultyStr = "```apache\n" + problemDifficulty + "\n```"
        } else {
            problemDifficultyStr = "```diff\n-" + problemDifficulty + "\n```"
        }

        const message = new MessageEmbed()
            .setColor('#00FFFF')
            .setTitle(`${problemData.question.frontendQuestionId}. ${problemData.question.title}`)
            .setURL(`${leetcodeUrl}${problemData.link}`)
            .addFields(
                { name: 'Difficulty', value: problemDifficultyStr, inline: true },
                { name: 'Accuracy', value: "```" + Number.parseFloat(problemData.question.acRate).toFixed(2) + "```", inline: true },
            )
        channel.send({ content: "**Leetcode Daily**", embeds: [message] })

    });

});

// Login to Discord with your client's token
client.login();

// Main cron
// const job = new CronJob(
//   "*/5 * * * * *",
//   function () {
//     console.log("You will see this message every second");
//   },
//   null,
//   true,
//   null,
//   null,
//   null,
//   "0"
// );
