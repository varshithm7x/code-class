import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load environment variables from .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

// Test usernames
const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';

// Test different GraphQL queries to see which gives us more data
const testQueries = {
  // Current approach - limited to recent submissions
  recentAcSubmissionList: {
    query: `
      query recentAcSubmissionList($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
          timestamp
        }
      }
    `,
    variables: { username: LEETCODE_USERNAME, limit: 2000 }
  },

  // Alternative 1: User profile with submission stats
  userSolvedProblems: {
    query: `
      query userProfileQuestions($username: String!) {
        allQuestionsCount {
          difficulty
          count
        }
        matchedUser(username: $username) {
          problemsSolvedBeatsStats {
            difficulty
            percentage
          }
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          profile {
            realName
            aboutMe
            school
            websites
            countryName
            company
            ranking
          }
        }
      }
    `,
    variables: { username: LEETCODE_USERNAME }
  },

  // Alternative 2: Question list with user's solved status
  problemsetQuestionList: {
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
      }
    `,
    variables: {
      categorySlug: "",
      skip: 0,
      limit: 3000, // Get many problems to check status
      filters: {}
    }
  },

  // Alternative 3: User's submissions with pagination
  userSubmissionList: {
    query: `
      query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String, $username: String!) {
        submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug, username: $username) {
          lastKey
          hasNext
          submissions {
            id
            statusDisplay
            lang
            runtime
            timestamp
            url
            isPending
            memory
            submissionComment {
              comment
              flagType
            }
            hasNotes
            notes
            flagType
            topicTags {
              id
              name
              slug
            }
            runtimeDisplay
            memoryDisplay
            title
            titleSlug
            status
          }
        }
      }
    `,
    variables: {
      offset: 0,
      limit: 50,
      lastKey: null,
      questionSlug: "",
      username: LEETCODE_USERNAME
    }
  },

  // Alternative 4: User contest and submission data
  userContestRanking: {
    query: `
      query userContestRanking($username: String!) {
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
          badge {
            name
          }
        }
        userContestRankingHistory(username: $username) {
          attended
          trendDirection
          problemsSolved
          totalProblems
          finishTimeInSeconds
          rating
          ranking
          contest {
            title
            startTime
          }
        }
        recentAcSubmissionList(username: $username, limit: 2000) {
          titleSlug
          timestamp
        }
      }
    `,
    variables: { username: LEETCODE_USERNAME }
  }
};

const runQuery = async (name: string, queryData: any) => {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`Variables:`, JSON.stringify(queryData.variables, null, 2));
    
    const response = await axios.post(LEETCODE_API_ENDPOINT, {
      query: queryData.query,
      variables: queryData.variables
    });

    const responseData = response.data as any;
    if (responseData.errors) {
      console.log(`❌ GraphQL Errors:`, responseData.errors);
      return null;
    }

    const data = responseData.data;
    console.log(`✅ Success! Data keys:`, Object.keys(data));
    
    // Analyze the data structure
    if (data.recentAcSubmissionList) {
      console.log(`   Recent AC Submissions: ${data.recentAcSubmissionList.length} found`);
      if (data.recentAcSubmissionList.length > 0) {
        console.log(`   First few submissions:`, data.recentAcSubmissionList.slice(0, 3));
      }
    }
    
    if (data.problemsetQuestionList) {
      const questions = data.problemsetQuestionList.questions;
      const solvedQuestions = questions.filter((q: any) => q.status === 'ac');
      console.log(`   Total questions: ${questions.length}`);
      console.log(`   Solved questions: ${solvedQuestions.length}`);
      if (solvedQuestions.length > 0) {
        console.log(`   First few solved:`, solvedQuestions.slice(0, 3).map((q: any) => q.titleSlug));
      }
    }
    
    if (data.submissionList) {
      const submissions = data.submissionList.submissions;
      const acceptedSubmissions = submissions.filter((s: any) => s.statusDisplay === 'Accepted');
      console.log(`   Total submissions: ${submissions.length}`);
      console.log(`   Accepted submissions: ${acceptedSubmissions.length}`);
      console.log(`   Has next page: ${data.submissionList.hasNext}`);
      if (acceptedSubmissions.length > 0) {
        console.log(`   First few accepted:`, acceptedSubmissions.slice(0, 3).map((s: any) => s.titleSlug));
      }
    }
    
    if (data.matchedUser) {
      console.log(`   User profile found: ${data.matchedUser.profile?.realName || 'Anonymous'}`);
      if (data.matchedUser.submitStatsGlobal) {
        const stats = data.matchedUser.submitStatsGlobal.acSubmissionNum;
        const totalSolved = stats.reduce((sum: number, stat: any) => sum + stat.count, 0);
        console.log(`   Total solved problems: ${totalSolved}`);
        console.log(`   Breakdown:`, stats);
      }
    }
    
    if (data.userContestRanking) {
      console.log(`   Contest ranking: ${data.userContestRanking.globalRanking}`);
      console.log(`   Contests attended: ${data.userContestRanking.attendedContestsCount}`);
    }
    
    return data;
  } catch (error: any) {
    if (error.response) {
      console.log(`❌ HTTP Error ${error.response.status}:`, error.response.data);
    } else {
      console.log(`❌ Network Error:`, error.message);
    }
    return null;
  }
};

const main = async () => {
  console.log('🚀 Starting Enhanced LeetCode API Test');
  console.log(`Testing with username: ${LEETCODE_USERNAME}`);
  
  // Test all queries
  for (const [name, queryData] of Object.entries(testQueries)) {
    await runQuery(name, queryData);
    
    // Add delay between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Summary and Recommendations:');
  console.log('1. recentAcSubmissionList: Limited to ~20 recent submissions');
  console.log('2. problemsetQuestionList: Can get ALL problems with user status (solved/unsolved)');
  console.log('3. submissionList: Might work for authenticated users only');
  console.log('4. userContestRanking: Good for contest data + recent submissions');
  
  console.log('\n💡 Best Approach:');
  console.log('Use problemsetQuestionList to get ALL problems with solved status');
  console.log('This gives us complete coverage, not just recent submissions');
};

main().catch(console.error); 