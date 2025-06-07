"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables from .env file in the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Add your problem links here
const LEETCODE_PROBLEM_SLUG = 'two-sum'; // e.g., 'two-sum', 'intersection-of-two-arrays'
const GFG_PROBLEM_URL = 'https://practice.geeksforgeeks.org/problems/subset-sums/0'; // e.g., 'https://practice.geeksforgeeks.org/problems/two-sum/1'
// --- Usernames to test ---
const GFG_USERNAME = 'technophyle';
const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';
// --- Do not edit below this line ---
// This is a simplified, non-operational mock of the real services for path resolution.
// The real services will be dynamically imported.
const mockSubmissionService = {
    checkLeetCode: (username, slug) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`(Mock) Checking LeetCode for ${username} on ${slug}`);
        return false;
    }),
    checkGfg: (username, url) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`(Mock) Checking GFG for ${username} on ${url}`);
        return false;
    })
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('--- Starting Submission Checker Test Script ---');
    try {
        // Dynamically import the actual service to bypass pathing issues in a script context
        const submissionService = yield Promise.resolve().then(() => __importStar(require('../src/services/submission.service')));
        // --- Test LeetCode ---
        console.log(`\n[TESTING LEETCODE]`);
        console.log(`Username: ${LEETCODE_USERNAME}`);
        console.log(`Problem Slug: ${LEETCODE_PROBLEM_SLUG}`);
        if (LEETCODE_USERNAME && LEETCODE_PROBLEM_SLUG) {
            // @ts-ignore - Ignoring since these are now private functions but we still want to test them directly
            const solvedSlugs = yield submissionService.getAllLeetCodeSolvedSlugs(LEETCODE_USERNAME);
            const isLeetCodeSolved = solvedSlugs.has(LEETCODE_PROBLEM_SLUG);
            console.log(`>>> LeetCode - Is Solved: ${isLeetCodeSolved}\n`);
        }
        else {
            console.log('Skipping LeetCode check, username or problem slug not provided.');
        }
        // --- Test GFG ---
        console.log(`\n[TESTING GFG]`);
        console.log(`Username: ${GFG_USERNAME}`);
        console.log(`Problem URL: ${GFG_PROBLEM_URL}`);
        if (GFG_USERNAME && GFG_PROBLEM_URL) {
            // @ts-ignore - Ignoring since these are now private functions but we still want to test them directly
            const gfgSolvedSlugs = yield submissionService.getAllGfgSolvedSlugs(GFG_USERNAME);
            // @ts-ignore
            const targetGfgSlug = submissionService.getGfgProblemSlug(GFG_PROBLEM_URL);
            const isGfgSolved = gfgSolvedSlugs.has(targetGfgSlug);
            console.log(`>>> GFG - Is Solved: ${isGfgSolved}\n`);
        }
        else {
            console.log('Skipping GFG check, username or problem URL not provided.');
        }
    }
    catch (error) {
        console.error('\n--- AN ERROR OCCURRED ---');
        console.error('Failed to run test script:', error);
    }
    finally {
        console.log('--- Test Script Finished ---');
    }
});
main();
