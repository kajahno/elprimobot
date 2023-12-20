import { dailyGetLeetcodeData, weeklyGetLeetcodeData, getProblemSet } from "./leetcode/index.js";
import logger from "../logging.js";
import staticProblemSets from './leetcode/static/problemSets.json' assert { type: "json" };

export class LeetcodeData {

    constructor() {}

    getProblemSetData = async (limit, skip) => {
        const { data: { problemsetQuestionList: { questions } } } = await getProblemSet(limit, skip);
        if (!questions) {
            logger.error("Unable to fetch problemsetQuestionList");
            return;
        }
        return questions
    };

    getNumProblems = async () => {
        const { data: { problemsetQuestionList: { total } } } = await getProblemSet();
        if (!total) {
            logger.error("Unable to fetch problemsetQuestionList");
            return;
        }
        return total;
    }

    getRandomProblem = async () => {
        const totalProblems = await this.getNumProblems();

        const randomProblemIndex = Math.floor(Math.random() * totalProblems);

        const randomProblem = await this.getProblemSetData(1, Math.min(randomProblemIndex, totalProblems - 1));
        if (!randomProblem) {
            logger.error("Unable to fetch problem with ID: ", randomProblemIndex);
            return;
        }

        return {
            ...randomProblem[0],
            link: `/problems/${randomProblem[0].titleSlug}/`,
        };
    }

    getDailyProblem = async () => {
        const { data: { activeDailyCodingChallengeQuestion } } = await dailyGetLeetcodeData();
        if (!activeDailyCodingChallengeQuestion) {
            logger.error("Unable to fetch dailyGetLeetcodeData");
            return;
        }
        return {
            ...activeDailyCodingChallengeQuestion.question,
            link: activeDailyCodingChallengeQuestion.link,
        };
    }

    getWeeklyProblem = async () => {
        const weeklyChallenges = (await weeklyGetLeetcodeData())?.data?.dailyCodingChallengeV2?.weeklyChallenges;
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

        return {
            ...lastWeeklyProblemData.question,
            link: lastWeeklyProblemData.link,
            remainingTimeMessage,
        };
    }

    getProblemCategories = async () => {
        return [
            "Array",
            "Backtracking",
            "Binary Search",
            "Bit Manipulation",
            "Divide and Conquer",
            "Dynamic Programming",
            "Greedy",
            "Hash Table",
            "Heap (Priority Queue)",
            "Linked List",
            "Math",
            "Matrix",
            "Merge Sort",
            "Monotonic Stack",
            "Recursion",
            "Simulation",
            "Sliding Window",
            "Sorting",
            "Stack",
            "String Matching",
            "String",
            "Trie",
            "Two Pointers",
        ]
    };
}
