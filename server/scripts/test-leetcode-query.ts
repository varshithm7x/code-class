import axios from 'axios';

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const testLeetCodeQuery = async () => {
    const username = 'Die_hard-PROGRAmmer';
    const query = `
        query recentSubmissionList($username: String!, $limit: Int!) {
            recentSubmissionList(username: $username, limit: $limit) {
                titleSlug
                statusDisplay
                timestamp
                title
            }
        }
    `;

    try {
        console.log(`Fetching recent submissions for user: ${username}`);
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query,
            variables: {
                username,
                limit: 20
            }
        });

        console.log('\nRaw API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Print submissions in a more readable format
        const submissions = response.data.data.recentSubmissionList;
        console.log('\nRecent Submissions:');
        submissions.forEach((sub: any, index: number) => {
            console.log(`\n${index + 1}. Problem: ${sub.title}`);
            console.log(`   Slug: ${sub.titleSlug}`);
            console.log(`   Status: ${sub.statusDisplay}`);
            console.log(`   Timestamp: ${new Date(sub.timestamp * 1000).toLocaleString()}`);
        });

    } catch (error: any) {
        if (error.response) {
            console.error('Error Response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testLeetCodeQuery(); 