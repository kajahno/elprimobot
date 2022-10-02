import 'dotenv/config';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import { Client, Intents, MessageEmbed } from "discord.js";


export const config = {
  APP_ID: process.env.APP_ID || undefined,
  GUILD_ID: process.env.GUILD_ID || undefined,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || undefined,
  PUBLIC_KEY: process.env.PUBLIC_KEY || undefined,
  LEETCODE_CHALLENGES_CHANNEL: process.env.LEETCODE_CHALLENGES_CHANNEL || undefined,
};

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Leetcode helpers

export const LEETCODE_URL = "https://leetcode.com";

export async function dailyGetLeetcodeData() {
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
      variables: {},
  };

  const response = await fetch(`${LEETCODE_URL}/graphql/`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate, br",
      },
      compress: true,
  });

  if (response.status !== 200) {
      console.error("could not fetch: ", response.status);
      return;
  }
  return response.json();
};

export async function weeklyGetLeetcodeData() {
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
      variables: { year: now.getFullYear(), month: now.getMonth() + 1 },
  };

  const response = await fetch(`${LEETCODE_URL}/graphql/`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate, br",
      },
      compress: true,
  });

  if (response.status !== 200) {
      console.error("could not fetch: ", response.status);
      return;
  }
  return response.json();
};


const discordClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
let DISCORD_CLIENT_READY = false;
export async function initializeDiscordClient() {
  // Login to Discord with your client's token
  discordClient.login() // This leaves the app blocking
      // because it opens a ws connection to Discord, 
      // call discordClient.destroy() somewhere else to close it (if required)

  // When the client is ready, run this code (only once)
  discordClient.once("ready", async () => {
      console.log("discord client is ready")
      DISCORD_CLIENT_READY = true;
  });
}

export async function postDailyLeetcodeMessage() {
  
  if (!DISCORD_CLIENT_READY){
    console.error("discord client is not ready")
    return
  }

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
  const weeklyRemainingDaysMessage = weeklyRemainingDays + (weeklyRemainingDays >= 2 ? " days" : " day");

  console.log(lastWeeklyProblemData);

  // Find channel
  const channelName = config.LEETCODE_CHALLENGES_CHANNEL || undefined;
  const channel = discordClient.channels.cache.find(
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
      .addFields({ name: 'Remaining time', value: `${weeklyRemainingDaysMessage}`, inline: false })
      .setFooter({ text: 'Time to code 🔥👨‍💻🔥' });

  await channel.send({ content: "**Leetcode Weekly**", embeds: [weeklyProblemMessage] })

}
