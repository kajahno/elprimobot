import fetch from 'node-fetch';
import logger from '../../logging';
import {
  ILeetcodeDailyChallenge, ILeetcodeProblemSetFromCategory,
  ILeetcodeProblemSetQuestionList, ILeetcodeWeeklyChallenges,
} from '../../types';

const headers = {
  'Content-Type': 'application/json',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-GB,en;q=0.5',
  Accept: '*/*',
  'Sec-Fetch-Mode': 'cors',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  Connection: 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Site': 'same-origin',
  Origin: 'https://leetcode.com',
  'Sec-GPC': '1',
  TE: 'trailers',
  Referer: 'https://leetcode.com/problemset/',
};

export const URL = 'https://leetcode.com';

export async function dailyGetLeetcodeData(): Promise<ILeetcodeDailyChallenge> {
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

  const response = await fetch(`${URL}/graphql/`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
    compress: true,
  });

  if (response.status !== 200) {
    logger.error(`could not fetch: ${response.status} (${response.statusText})`);
    return;
  }
  return response.json() as Promise<ILeetcodeDailyChallenge>;
}

export async function weeklyGetLeetcodeData(): Promise<ILeetcodeWeeklyChallenges> {
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

  const response = await fetch(`${URL}/graphql/`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
    compress: true,
  });

  if (response.status !== 200) {
    logger.error(`could not fetch: ${response.status} (${response.statusText})`);
    return;
  }

  return response.json() as Promise<ILeetcodeWeeklyChallenges>;
}

export async function getProblemSet(
  limit: number = 1,
  skip: number = 0,
): Promise<ILeetcodeProblemSetQuestionList> {
  if (limit < 1) {
    logger.error('limit must be greater than 0');
    return;
  }
  const data = {
    query: `
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                problemsetQuestionList: questionList(
                categorySlug: $categorySlug
                limit: $limit
                skip: $skip
                filters: $filters
                ) {
                total: totalNum
                questions: data {
                    acRate
                    difficulty
                    freqBar
                    frontendQuestionId: questionFrontendId
                    isFavor
                    paidOnly: isPaidOnly
                    status
                    title
                    titleSlug
                    topicTags {
                    name
                    id
                    slug
                    }
                    hasSolution
                    hasVideoSolution
                }
                }
            }`,
    variables: {
      categorySlug: 'all-code-essentials', limit, skip, filters: {},
    },
  };

  const response = await fetch(`${URL}/graphql/`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers,
    compress: true,
  });

  if (response.status !== 200) {
    logger.error(`could not fetch: ${response.status} (${response.statusText})`);
    return;
  }

  return response.json() as Promise<ILeetcodeProblemSetQuestionList>;
}

export async function getProblemSetFromCategory(category: string):
Promise<ILeetcodeProblemSetFromCategory> {
  const response = await fetch(`${URL}/problems/tag-data/question-tags/${category}/`, {
    method: 'GET',
    headers,
  });

  if (response.status !== 200) {
    logger.error(`could not fetch: ${response.status} (${response.statusText})`);
    return;
  }

  return response.json() as Promise<ILeetcodeProblemSetFromCategory>;
}
