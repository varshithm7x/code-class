export interface LeetCodeGraphQLResponse<T> {
    data: T;
}

export interface LeetCodeUserSolvedProblems {
    allQuestionsCount: {
        difficulty: string;
        count: number;
    }[];
    matchedUser: {
        problemsSolvedBeatsStats: {
            difficulty: string;
            percentage: number;
        }[];
        submitStatsGlobal: {
            acSubmissionNum: {
                difficulty: string;
                count: number;
                submissions: number;
            }[];
        };
    };
}

export interface SubmissionListData {
    submissionList: {
        submissions: {
            statusDisplay: string;
        }[];
    };
}

export interface LeetCodeRecentACResponse {
    recentAcSubmissionList: {
        titleSlug: string;
    }[];
}

export interface LeetCodeQuestionData {
    question: {
        title: string;
        difficulty: string;
        titleSlug: string;
    };
}

export interface GfgAPIResponse {
    error?: string;
    solvedStats: {
        school: { questions: { questionUrl: string }[] };
        basic: { questions: { questionUrl: string }[] };
        easy: { questions: { questionUrl: string }[] };
        medium: { questions: { questionUrl: string }[] };
        hard: { questions: { questionUrl: string }[] };
    };
} 