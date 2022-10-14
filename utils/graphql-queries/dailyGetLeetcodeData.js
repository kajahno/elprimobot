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
