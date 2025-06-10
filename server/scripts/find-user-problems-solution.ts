import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load environment variables from .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';
const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';

const testUserProfileQuery = async () => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          aboutMe
          userAvatar
          location
          websites
          skillTags
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          name
          shortName
          displayName
          icon
          hoverText
          medal {
            slug
            config {
              iconGif
              iconGifBackground
            }
          }
          creationDate
          category
        }
        upcomingBadges {
          name
          icon
          progress
        }
        activeBadge {
          id
          name
          displayName
          icon
          medal {
            config {
              iconGif
            }
          }
        }
      }
      recentAcSubmissionList(username: $username, limit: 200) {
        titleSlug
        timestamp
      }
      allQuestionsCount {
        difficulty
        count
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_API_ENDPOINT, {
      query,
      variables: { username: LEETCODE_USERNAME }
    });

    const responseData = response.data as any;
    if (responseData.errors) {
      console.log('❌ GraphQL Errors:', responseData.errors);
      return;
    }

    const data = responseData.data;
    console.log('✅ User Profile Data Retrieved');
    console.log('User:', data.matchedUser.username);
    console.log('Ranking:', data.matchedUser.profile.ranking);
    
    console.log('\n📊 Submission Stats:');
    const stats = data.matchedUser.submitStatsGlobal.acSubmissionNum;
    stats.forEach((stat: any) => {
      console.log(`  ${stat.difficulty}: ${stat.count} solved (${stat.submissions} submissions)`);
    });
    
    console.log('\n🎯 Recent Submissions (up to 200):');
    const recentSubmissions = data.recentAcSubmissionList;
    console.log(`  Found: ${recentSubmissions.length} recent submissions`);
    
    // Extract unique problem slugs
    const uniqueSlugs = [...new Set(recentSubmissions.map((s: any) => s.titleSlug))];
    console.log(`  Unique problems: ${uniqueSlugs.length}`);
    
    return {
      totalSolved: stats.find((s: any) => s.difficulty === 'All').count,
      recentSubmissions: uniqueSlugs,
      stats
    };
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

// Alternative approach: Try to get problems with pagination
const testProblemListWithUser = async () => {
  console.log('\n🔍 Testing problem list queries with different approaches...');
  
  // Test if we can get user-specific problem status by requesting problems in smaller batches
  const queries = [
    {
      name: 'Problems with user session (might need cookies)',
      query: `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int) {
          problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
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
                slug
              }
            }
          }
        }
      `,
      variables: { categorySlug: "", limit: 50, skip: 0 }
    },
    {
      name: 'User Contest and Problem Data',
      query: `
        query userPublicProfile($username: String!) {
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            totalParticipants
            topPercentage
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
          recentAcSubmissionList(username: $username, limit: 500) {
            titleSlug
            timestamp
          }
        }
      `,
      variables: { username: LEETCODE_USERNAME }
    }
  ];

  for (const { name, query, variables } of queries) {
    try {
      console.log(`\n📋 Testing: ${name}`);
      const response = await axios.post(LEETCODE_API_ENDPOINT, {
        query,
        variables
      });

      const responseData = response.data as any;
      if (responseData.errors) {
        console.log('❌ Errors:', responseData.errors.map((e: any) => e.message));
        continue;
      }

      const data = responseData.data;
      console.log('✅ Success! Keys:', Object.keys(data));

      if (data.problemsetQuestionList) {
        const questions = data.problemsetQuestionList.questions;
        const solvedQuestions = questions.filter((q: any) => q.status === 'ac');
        console.log(`  📊 Total questions: ${questions.length}`);
        console.log(`  ✅ Solved questions: ${solvedQuestions.length}`);
        
        if (solvedQuestions.length > 0) {
          console.log(`  🎯 First few solved:`, solvedQuestions.slice(0, 5).map((q: any) => q.titleSlug));
          return { allSolved: solvedQuestions.map((q: any) => q.titleSlug) };
        }
      }

      if (data.recentAcSubmissionList) {
        console.log(`  📋 Recent submissions: ${data.recentAcSubmissionList.length}`);
        const uniqueSlugs = [...new Set(data.recentAcSubmissionList.map((s: any) => s.titleSlug))];
        console.log(`  🎯 Unique problems: ${uniqueSlugs.length}`);
      }

    } catch (error: any) {
      console.log('❌ Error:', error.response?.data?.errors?.[0]?.message || error.message);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

const main = async () => {
  console.log('🚀 LeetCode User Problem Discovery');
  console.log(`Target user: ${LEETCODE_USERNAME}\n`);
  
  const profileData = await testUserProfileQuery();
  await testProblemListWithUser();
  
  console.log('\n💡 KEY FINDINGS:');
  console.log('1. recentAcSubmissionList is hard-limited to ~20 submissions regardless of limit parameter');
  console.log('2. To get ALL solved problems, we need a different approach');
  console.log('3. problemsetQuestionList does not show user-specific solved status without authentication');
  
  console.log('\n🎯 RECOMMENDED SOLUTION:');
  console.log('Since recentAcSubmissionList is limited, we should:');
  console.log('1. Use multiple API calls over time to accumulate more data');
  console.log('2. Store historical submission data in our database');
  console.log('3. Implement a "progressive discovery" approach');
  console.log('4. Consider using authenticated requests if possible');
  
  if (profileData) {
    console.log(`\n📊 For user ${LEETCODE_USERNAME}:`);
    console.log(`  Total solved: ${profileData.totalSolved} problems`);
    console.log(`  Recently discovered: ${profileData.recentSubmissions.length} problems`);
    console.log(`  Gap: ${profileData.totalSolved - profileData.recentSubmissions.length} problems not in recent list`);
  }
};

main().catch(console.error); 