import { MessageEmbed } from 'discord.js';
import discordClient, { isClientReady } from '../api/discord-client.js';
import { Stats } from '../api/stats.js';
import { config } from '../config.js';
import { weeklyGetLeetcodeData } from './graphql-queries/weeklyGetLeetcodeData.js';
import { dailyGetLeetcodeData } from './graphql-queries/dailyGetLeetcodeData.js';

const { LEETCODE_URL } = config;

// Leetcode helpers

const fetchLeetCodeData = async () => {
  if (!isClientReady) {
    console.error('discord client is not ready');
    return;
  }

  await new Stats(discordClient).postDailyStats();

  const dailyLeetcodeData = await dailyGetLeetcodeData();
  if (!dailyLeetcodeData) {
    console.error("there's no data available");
    return;
  }

  const dailyProblemData =
    dailyLeetcodeData.data.activeDailyCodingChallengeQuestion;

  const weeklyLeetcodeData = await weeklyGetLeetcodeData();
  if (!weeklyLeetcodeData) {
    console.error("there's no data available");
    return;
  }

  const weeklyProblemData =
    weeklyLeetcodeData.data.dailyCodingChallengeV2.weeklyChallenges;
  const lastWeeklyProblemData = weeklyProblemData[weeklyProblemData.length - 1];

  const oneDay = 24 * 60 * 60 * 1000; //this is a day expressed in milliseconds
  const now = new Date();
  const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
  const weeklyRemainingDays = Math.round(
    Math.abs((weeklyChangeDate - now) / oneDay)
  );
  const weeklyRemainingDaysMessage =
    weeklyRemainingDays + (weeklyRemainingDays >= 2 ? ' days' : ' day');

  return {
    weeklyRemainingDaysMessage,
    dailyProblemData,
    lastWeeklyProblemData,
  };
};

export async function generateDailyLeetcodeMessage() {
  // Find channel
  const {
    dailyProblemData,
    lastWeeklyProblemData,
    weeklyRemainingDaysMessage,
  } = await fetchLeetCodeData();

  const dailyProblemMessage = new MessageEmbed()
    .setColor('#00FFFF')
    .setTitle(
      `${dailyProblemData.question.frontendQuestionId}. ${dailyProblemData.question.title}`
    )
    .setURL(`${LEETCODE_URL}${dailyProblemData.link}`)
    .addFields(
      {
        name: 'Difficulty',
        value: '```' + dailyProblemData.question.difficulty + '\n```',
        inline: true,
      },
      {
        name: 'Success rate',
        value:
          '```' +
          Number.parseFloat(dailyProblemData.question.acRate).toFixed(2) +
          '```',
        inline: true,
      }
    );

  const weeklyProblemMessage = new MessageEmbed()
    .setColor('#FFBF00')
    .setTitle(
      `${lastWeeklyProblemData.question.questionFrontendId}. ${lastWeeklyProblemData.question.title}`
    )
    .setURL(`${LEETCODE_URL}${lastWeeklyProblemData.link}`)
    .addFields({
      name: 'Remaining time',
      value: `${weeklyRemainingDaysMessage}`,
      inline: false,
    })
    .setFooter({ text: 'Time to code 🔥👨‍💻🔥' });

  return { weeklyProblemMessage, dailyProblemMessage };
}

export async function postDailyLeetcodeMessage() {
  const { weeklyProblemMessage, dailyProblemMessage } =
    await generateDailyLeetcodeMessage();

  const channelName = config.LEETCODE_CHALLENGES_CHANNEL || undefined;

  const channel = discordClient.channels.cache.find(
    (channel) => channel.name === channelName
  );

  if (!channel) {
    console.error(`could not find Discord channel: ${channelName}`);
    return;
  }

  await channel.send({
    content: '**Leetcode Daily**',
    embeds: [dailyProblemMessage],
  });

  await channel.send({
    content: '**Leetcode Weekly**',
    embeds: [weeklyProblemMessage],
  });
}
