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
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    compress: true,
  });

  if (response.status !== 200) {
    console.error('could not fetch: ', response.status);
    return;
  }

  return response.json();
}
