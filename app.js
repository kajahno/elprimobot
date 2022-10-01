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

let disable_leetcode = true;

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

    if (response.status !== 200) {
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

    if (response.status !== 200) {
        console.error("could not fetch: ", response.status)
        return
    }
    return response.json()
}

let post_daily_leetcode = async () => {
    if (disable_leetcode) {
        return;
    }
    const dailyLeetcodeData = await dailyGetLeetcodeData();
    if (!dailyLeetcodeData) {
        console.error("there's no data available")
        return
    }

    const dailyProblemData = dailyLeetcodeData.data.activeDailyCodingChallengeQuestion;
    console.log(dailyProblemData)

    const weeklyLeetcodeData = await weeklyGetLeetcodeData();
    if (!weeklyLeetcodeData) {
        console.error("there's no data available")
        return
    }

    const weeklyProblemData = weeklyLeetcodeData.data.dailyCodingChallengeV2.weeklyChallenges;
    const lastWeeklyProblemData = weeklyProblemData[weeklyProblemData.length - 1];

    const oneDay = 24 * 60 * 60 * 1000; //this is a day expressed in milliseconds
    const now = new Date();
    const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
    const weeklyRemainingDays = Math.round(Math.abs((weeklyChangeDate - now) / oneDay));
    const weeklyRemainingDaysMessage = weeklyRemainingDays + (weeklyRemainingDays >= 2 ? " days" : " day");

    console.log(lastWeeklyProblemData);

    // Find channel
    const channelName = process.env.LEETCODE_CHALLENGES_CHANNEL || undefined;
    const channel = client.channels.cache.find(
        (channel) => channel.name === channelName
    );

    if (!channel) {
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
        .addFields({ name: 'Remaining time', value: `${weeklyRemainingDaysMessage}`, inline: false })
        .setFooter({ text: 'Time to code 🔥👨‍💻🔥' });

    await channel.send({ content: "**Leetcode Weekly**", embeds: [weeklyProblemMessage] })

}

let get_inital_stats = (message) => {
    // let's just return an empty object, but eventually
    // we want to return the stats based on the latest update
    /*
   let stats = {
       username1: {
           messages: 5, 
           words: 20, 
           letters: 150
       }
   }
   */

    return {};
}

let post_stats = async () => {
    // Get Stats
    // Server Members
    let dominationGuild = client.guilds.resolve(config.GUILD_ID);
    // let members = await dominationGuild.members.fetch();
    // for (let [id, member] of dominationGuild.members.cache) {
    //     console.log(member.user.username);
    // }
    // Get Channels
    let channels = await dominationGuild.channels.fetch();
    // can we build this one based on time?
    // https://discord.js.org/#/docs/discord.js/main/typedef/Snowflake
    // number of milliseconds since Discord epoch
    // TODO: we might not need this message if we can calculate last X days
    let stat_message_id = '1025305892339589231';
    // we're going to use the #motivation channel for these updates
    // find last message with the stats
    // TODO: get the message and call this function
    let stats = get_inital_stats(null);
    let messages = [];
    for (let [id, channel] of channels) {
        // console.log(channel);
        if (channel.type === 'GUILD_TEXT') {
            // we don't think we'll have more than 5k messages since the last update
            messages.push(...await channel.messages.fetch({ limit: 5, after: stat_message_id }));
        }
    }

    for (let [id, message] of messages) {
        let username = message.author.username;
        let user_stats = stats[username] = stats[username] || {
            posts: 0,
            words: 0,
            letters: 0
        };
        user_stats.posts++;
        user_stats.words += message.content.split(' ').length;
        user_stats.letters += message.content.length;
    }
    console.log(stats)

    const dailyStats = new MessageEmbed()
        .setColor('#FFBF00')
        .setTitle("Today's Stats")
    dailyStats.addFields(
        ...[...Object.keys(stats).map(username => [
            { name: 'username', value: username, inline: true },
            { name: 'posts', value: `${stats[username].posts}`, inline: true },
            { name: 'words', value: stats[username].words.toString(), inline: true },
            { name: 'letters', value: stats[username].letters.toString() }
        ])]);


    // TODO: Change to MOTIVATION_CHANNEL
    const channelName = process.env.LEETCODE_CHALLENGES_CHANNEL || undefined;
    const channel = client.channels.cache.find(
        (channel) => channel.name === channelName
    );

    await channel.send({ content: "**Hello**", embeds: [dailyStats] });
}

// When the client is ready, run this code (only once)
client.once("ready", async () => {
    await post_daily_leetcode();
    await post_stats();

    // Close the client websocket connection and unblock program
    client.destroy();

});


// Login to Discord with your client's token
client.login() // This leaves the app blocking because it opens a ws connection to Discord, call client.destroy() somewhere else to close it
