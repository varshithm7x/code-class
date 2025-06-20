export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER';
  hackerrankUsername?: string;
  hackerrankCookieStatus?: string; // LINKED, EXPIRED, NOT_LINKED
  leetcodeUsername?: string;
  gfgUsername?: string;
  // Enhanced LeetCode Integration fields
  leetcodeCookieStatus?: string; // LINKED, EXPIRED, NOT_LINKED
  leetcodeTotalSolved?: number;
  leetcodeEasySolved?: number;
  leetcodeMediumSolved?: number;
  leetcodeHardSolved?: number;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  joinCode: string;
  createdAt: string;
  studentCount?: number;
  assignmentCount?: number;
  assignments?: Assignment[];
  announcements?: Announcement[];
}

export interface ClassWithStudents extends Class {
  students: Student[];
}

export interface Student extends User {
  completedCount?: number;
  avgSubmissionTime?: string;
  platformCount?: number; // Number of platforms linked
}

export interface StudentProfile extends Student {
  submissions: {
    completed: boolean;
    submissionTime: string | null;
    problem: {
      id: string;
      title: string;
      difficulty: string;
      platform: string;
      assignment: {
        id: string;
        title: string;
      }
    }
  }[];
}

export enum Platform {
  LeetCode = 'LeetCode',
  HackerRank = 'HackerRank',
  GeeksforGeeks = 'GeeksforGeeks',
  Other = 'Other',
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export interface Problem {
  id: string;
  assignmentId: string;
  title: string;
  url: string;
  platform: Platform;
  difficulty: Difficulty;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  assignDate: string;
  dueDate: string;
  problems: Problem[];
  lastSubmissionCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment extends Assignment {
  progress: {
    totalStudents: number;
    totalProblems: number;
    completedSubmissions: number;
    averageCompletion: number;
  };
}

export interface StudentAssignment extends Assignment {
  status: 'completed' | 'pending' | 'overdue';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  completed: boolean;
  manuallyMarked: boolean;
  submissionTime?: string;
  leetcodeUsername?: string | null;
  hackerrankUsername?: string | null;
  gfgUsername?: string | null;
}

export interface ProblemWithSubmissions extends Problem {
  submissions: Submission[];
}

export interface ProblemWithUserSubmission extends Problem {
  completed: boolean;
  manuallyMarked: boolean;
  submissionTime?: string;
}

export interface StudentAssignmentDetails extends Assignment {
  problems: ProblemWithUserSubmission[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface StudentJudge0Status {
  id: string;
  name: string;
  email: string;
  judge0KeyStatus: string;
  judge0QuotaUsed: number;
  judge0LastReset: string | null;
  hasKey: boolean;
  isSharedWithClass: boolean;
  poolStatus: string | null;
  dailyUsage: number;
  dailyLimit: number;
  lastUsed: string | null;
}

export interface ClassJudge0Status {
  classId: string;
  className: string;
  students: StudentJudge0Status[];
  statistics: {
    totalStudents: number;
    studentsWithKeys: number;
    studentsSharing: number;
    totalDailyQuota: number;
    totalUsedQuota: number;
    availableQuota: number;
    keyProvisionPercentage: number;
    sharingPercentage: number;
  };
}

export interface CompletionData {
  date: string;
  completionRate: number;
}

export interface PlatformData {
  platform: string;
  count: number;
}

export interface DifficultyData {
  difficulty: string;
  count: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  completedCount: number;
  avgSubmissionTime: string;
  // Enhanced LeetCode fields
  leetcodeUsername?: string;
  leetcodeCookieStatus?: string;
  leetcodeTotalSolved?: number;
  leetcodeEasySolved?: number;
  leetcodeMediumSolved?: number;
  leetcodeHardSolved?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: 'teacher' | 'student') => Promise<void>;
  logout: () => void;
  updateProfile: (data: {
    hackerrankUsername?: string;
    leetcodeUsername?: string;
    gfgUsername?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export interface PracticeQuestion {
  id: number;
  title: string;
  url: string;
  isPremium: boolean;
  acceptance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frequency: string;
  topics: string[];
  company: string;
}

export interface QuestionStats {
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface CompanyData {
  name: string;
  questions: PracticeQuestion[];
}

export interface Announcement {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

// Teacher view - only shows automatic completion
export interface TeacherSubmission {
  id: string;
  userId: string;
  completed: boolean; // Only automatic completion
  submissionTime?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Student view - includes manual marking
export interface StudentSubmission {
  id: string;
  completed: boolean; // Automatic completion
  manuallyMarked: boolean; // Manual self-reporting (student only)
  submissionTime?: string;
}

// Teacher problem view
export interface ProblemWithTeacherSubmissions extends Problem {
  submissions: TeacherSubmission[];
}

// Teacher assignment view
export interface AssignmentWithSubmissions extends Assignment {
  problems: ProblemWithTeacherSubmissions[];
  class: {
    id: string;
    name: string;
    students: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  };
}

// Student assignment view
export interface StudentAssignmentDetails extends Assignment {
  problems: ProblemWithUserSubmission[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}
