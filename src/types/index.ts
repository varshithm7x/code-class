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
  createdAt: string;
  updatedAt: string;
}

export interface StudentAssignment extends Assignment {
  status: 'completed' | 'pending' | 'overdue';
}

export interface Submission {
  studentId: string;
  studentName: string;
  completed: boolean;
  submissionTime: string | null;
  leetcodeUsername?: string | null;
  hackerrankUsername?: string | null;
  gfgUsername?: string | null;
}

export interface ProblemWithSubmissions extends Problem {
  submissions: Submission[];
}

export interface AssignmentWithSubmissions extends Assignment {
  problems: ProblemWithSubmissions[];
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
