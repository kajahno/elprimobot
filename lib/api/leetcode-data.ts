import {
  dailyGetLeetcodeData, weeklyGetLeetcodeData, getProblemSet, getProblemSetFromCategory,
} from './leetcode/index';
import logger from '../logging';
import { ILeetcodeProblem, ILeetcodeProblemCategory } from '../types';

export const getProblemSetData = async (
  limit: number,
  skip: number,
): Promise<ILeetcodeProblem[] | undefined> => {
  const challenges = (await getProblemSet(limit, skip))
    ?.data?.problemsetQuestionList?.questions;
  if (!challenges) {
    logger.error('Unable to fetch problemsetQuestionList');
    return;
  }
  return challenges;
};

export const getNumProblems = async (): Promise<number | undefined> => {
  const totalProblems = (await getProblemSet())?.data?.problemsetQuestionList?.total;
  if (!totalProblems) {
    logger.error('Unable to fetch problemsetQuestionList');
    return;
  }
  return totalProblems;
};

export const getRandomProblem = async (): Promise<ILeetcodeProblem | undefined> => {
  const totalProblems = await getNumProblems();

  const randomProblemIndex = Math.floor(Math.random() * totalProblems);

  const randomProblem = await getProblemSetData(
    1,
    Math.min(randomProblemIndex, totalProblems - 1),
  );
  if (!randomProblem) {
    logger.error('Unable to fetch problem with ID: ', randomProblemIndex);
    return;
  }

  return {
    ...randomProblem[0],
    link: `/problems/${randomProblem[0].titleSlug}/`,
  };
};

export const getRandomProblemFromCategory = async (category: string):
Promise<ILeetcodeProblem | undefined> => {
  const problems = (await getProblemSetFromCategory(category))?.questions;
  if (!problems) {
    logger.error('Unable to fetch problems from category: ', category);
    return;
  }

  const randomProblemIndex = Math.floor(Math.random() * problems.length);

  return {
    ...problems[randomProblemIndex],
    frontendQuestionId: problems[randomProblemIndex].questionFrontendId,
    link: `/problems/${problems[randomProblemIndex].titleSlug}/`,
  };
};

export const getDailyProblem = async (): Promise<ILeetcodeProblem | undefined> => {
  const activeDailyCodingChallengeQuestion = (await dailyGetLeetcodeData())
    ?.data?.activeDailyCodingChallengeQuestion;
  if (!activeDailyCodingChallengeQuestion) {
    logger.error('Unable to fetch dailyGetLeetcodeData');
    return;
  }
  return {
    ...activeDailyCodingChallengeQuestion.question,
    link: activeDailyCodingChallengeQuestion.link,
  };
};

export const getWeeklyProblem = async (): Promise<ILeetcodeProblem | undefined> => {
  const weeklyChallenges = (await weeklyGetLeetcodeData())
    ?.data?.dailyCodingChallengeV2?.weeklyChallenges;
  if (!weeklyChallenges) {
    logger.error('Unable to fetch weeklyGetLeetcodeData');
    return;
  }

  const lastWeeklyProblemData = weeklyChallenges[weeklyChallenges.length - 1];
  const oneDay = 24 * 60 * 60 * 1000; // this is a day expressed in milliseconds
  const now = new Date();
  const weeklyChangeDate = Date.parse(lastWeeklyProblemData.date) + oneDay * 7;
  const weeklyRemainingDays = Math.round(Math.abs((weeklyChangeDate - Number(now)) / oneDay));
  const remainingTimeMessage = weeklyRemainingDays + (weeklyRemainingDays >= 2 ? ' days' : ' day');

  return {
    ...lastWeeklyProblemData.question,
    link: lastWeeklyProblemData.link,
    remainingTimeMessage,
  };
};

export const getProblemCategories = () => ({
  array: 'Array',
  backtracking: 'Backtracking',
  'binary-search': 'Binary Search',
  'bit-manipulation': 'Bit Manipulation',
  'divide-and-conquer': 'Divide and Conquer',
  'dynamic-programming': 'Dynamic Programming',
  greedy: 'Greedy',
  'hash-table': 'Hash Table',
  'heap-priority-queue': 'Heap (Priority Queue)',
  'linked-list': 'Linked List',
  math: 'Math',
  matrix: 'Matrix',
  'merge-sort': 'Merge Sort',
  'monotonic-stack': 'Monotonic Stack',
  recursion: 'Recursion',
  simulation: 'Simulation',
  'sliding-window': 'Sliding Window',
  sorting: 'Sorting',
  stack: 'Stack',
  'string-matching': 'String Matching',
  string: 'String',
  trie: 'Trie',
  'two-pointers': 'Two Pointers',
});
