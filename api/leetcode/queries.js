import fetch from "node-fetch";
import logger from "../../logging.js";

const headers = {
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip, deflate, br",
};

export const URL = "https://leetcode.com";

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

    const response = await fetch(`${URL}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers,
        compress: true,
    });

    if (response.status !== 200) {
        logger.error("could not fetch: ", response.status);
        return;
    }
    return response.json();
}

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

    const response = await fetch(`${URL}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers,
        compress: true,
    });

    if (response.status !== 200) {
        logger.error("could not fetch: ", response.status);
        return;
    }

    return response.json();
}

export async function getProblemSet() {
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
        variables: { categorySlug: "all-code-essentials", limit: 10, skip: 0, filters: {} },
    };

    const response = await fetch(`${URL}/graphql/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers,
        compress: true,
    });

    if (response.status !== 200) {
        logger.error("could not fetch: ", response.status);
        return;
    }

    return response.json();
}
