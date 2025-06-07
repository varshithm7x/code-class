"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';
const testLeetCodeQuery = () => __awaiter(void 0, void 0, void 0, function* () {
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
        const response = yield axios_1.default.post(LEETCODE_API_ENDPOINT, {
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
        submissions.forEach((sub, index) => {
            console.log(`\n${index + 1}. Problem: ${sub.title}`);
            console.log(`   Slug: ${sub.titleSlug}`);
            console.log(`   Status: ${sub.statusDisplay}`);
            console.log(`   Timestamp: ${new Date(sub.timestamp * 1000).toLocaleString()}`);
        });
    }
    catch (error) {
        if (error.response) {
            console.error('Error Response:', error.response.data);
        }
        else {
            console.error('Error:', error.message);
        }
    }
});
testLeetCodeQuery();
