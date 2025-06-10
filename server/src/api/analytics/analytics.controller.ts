import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

interface LeaderboardEntry {
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

interface CompletionData {
  date: string;
  completionRate: number;
}

interface PlatformData {
  platform: string;
  count: number;
}

interface DifficultyData {
  difficulty: string;
  count: number;
}

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, sortBy } = req.query;
    const normalizedSortBy = sortBy || 'assignments'; // Default to assignments if not specified
    console.log(`📊 [DEBUG] Fetching leaderboard - classId: ${classId}, sortBy: ${sortBy} (normalized: ${normalizedSortBy})`);

    // Get all students with their submission statistics and LeetCode data
    let students;
    
    if (classId && typeof classId === 'string') {
      // Class-specific leaderboard
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          classes: {
            some: {
              classId: classId
            }
          }
        },
        select: {
          id: true,
          name: true,
          leetcodeUsername: true,
          leetcodeCookieStatus: true,
          leetcodeTotalSolved: true,
          leetcodeEasySolved: true,
          leetcodeMediumSolved: true,
          leetcodeHardSolved: true,
          submissions: {
            where: {
              completed: true,
              problem: {
                assignmentId: {
                  in: (await prisma.assignment.findMany({
                    where: { classId: classId },
                    select: { id: true }
                  })).map(a => a.id)
                }
              }
            },
            include: {
              problem: {
                include: {
                  assignment: true
                }
              }
            }
          }
        }
      });
    } else {
      // Global leaderboard
      students = await prisma.user.findMany({
        where: {
          role: 'STUDENT'
        },
        select: {
          id: true,
          name: true,
          leetcodeUsername: true,
          leetcodeCookieStatus: true,
          leetcodeTotalSolved: true,
          leetcodeEasySolved: true,
          leetcodeMediumSolved: true,
          leetcodeHardSolved: true,
          submissions: {
            where: {
              completed: true
            },
            include: {
              problem: {
                include: {
                  assignment: true
                }
              }
            }
          }
        }
      });
    }

    // Calculate leaderboard statistics
    const leaderboardData = students.map((student: any) => {
      const completedCount = student.submissions.length;
      
      // Calculate average submission time (time between assignment creation and submission)
      let avgSubmissionTimeMinutes = 0;
      if (student.submissions.length > 0) {
        const totalMinutes = student.submissions.reduce((total: number, submission: any) => {
          if (!submission.submissionTime || !submission.problem.assignment) return total;
          
          const assignDate = new Date(submission.problem.assignment.assignDate);
          const submitDate = new Date(submission.submissionTime);
          const diffMinutes = Math.max(0, (submitDate.getTime() - assignDate.getTime()) / (1000 * 60));
          
          return total + diffMinutes;
        }, 0);
        
        avgSubmissionTimeMinutes = totalMinutes / student.submissions.length;
      }

      // Convert minutes to hours:minutes format
      const hours = Math.floor(avgSubmissionTimeMinutes / 60);
      const minutes = Math.round(avgSubmissionTimeMinutes % 60);
      const avgSubmissionTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      return {
        id: student.id,
        name: student.name,
        completedCount,
        avgSubmissionTime,
        avgSubmissionTimeMinutes, // For sorting purposes
        // Include LeetCode data
        leetcodeUsername: student.leetcodeUsername,
        leetcodeCookieStatus: student.leetcodeCookieStatus,
        leetcodeTotalSolved: student.leetcodeTotalSolved,
        leetcodeEasySolved: student.leetcodeEasySolved,
        leetcodeMediumSolved: student.leetcodeMediumSolved,
        leetcodeHardSolved: student.leetcodeHardSolved,
      };
    });

    // Filter based on sort criteria - for LeetCode sort, only show students with completed assignments
    // For assignment progress, show all students including those with 0 completed assignments
    const filteredData = normalizedSortBy === 'leetcode' 
      ? leaderboardData.filter((student: any) => student.completedCount > 0)
      : leaderboardData; // Show all students for assignment progress

    // Sort based on the requested criteria
    if (normalizedSortBy === 'leetcode') {
      // Sort by LeetCode total solved (descending), then by assignments (descending), then by time (ascending)
      filteredData.sort((a: any, b: any) => {
        const aLeetCode = a.leetcodeTotalSolved || 0;
        const bLeetCode = b.leetcodeTotalSolved || 0;
        
        if (bLeetCode !== aLeetCode) {
          return bLeetCode - aLeetCode;
        }
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return a.avgSubmissionTimeMinutes - b.avgSubmissionTimeMinutes;
      });
      console.log(`📊 [DEBUG] Sorted leaderboard by LeetCode performance`);
    } else {
      // Default: Sort by completed count (descending), then by average submission time (ascending)
      filteredData.sort((a: any, b: any) => {
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        // For students with 0 completed assignments, sort by name alphabetically
        if (a.completedCount === 0 && b.completedCount === 0) {
          return a.name.localeCompare(b.name);
        }
        return a.avgSubmissionTimeMinutes - b.avgSubmissionTimeMinutes;
      });
      console.log(`📊 [DEBUG] Sorted leaderboard by assignment completion`);
    }

    // Add ranks and include LeetCode data
    const leaderboard: LeaderboardEntry[] = filteredData.map((student: any, index: number) => ({
      id: student.id,
      rank: index + 1,
      name: student.name,
      completedCount: student.completedCount,
      avgSubmissionTime: student.avgSubmissionTime,
      // Include LeetCode fields
      leetcodeUsername: student.leetcodeUsername,
      leetcodeCookieStatus: student.leetcodeCookieStatus,
      leetcodeTotalSolved: student.leetcodeTotalSolved,
      leetcodeEasySolved: student.leetcodeEasySolved,
      leetcodeMediumSolved: student.leetcodeMediumSolved,
      leetcodeHardSolved: student.leetcodeHardSolved,
    }));

    console.log(`📊 [DEBUG] Returning leaderboard with ${leaderboard.length} entries`);
    res.json(leaderboard);
  } catch (error) {
    console.error('❌ [DEBUG] Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard', error });
  }
};

export const getClassCompletionData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    // Get all assignments for the class
    const assignments = await prisma.assignment.findMany({
      where: { classId },
      orderBy: { assignDate: 'asc' }
    });

    // Get students in the class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: true
      }
    });

    const studentCount = classData?.students.length || 0;

    // Get completion data for each assignment
    const completionData: CompletionData[] = [];
    
    for (const assignment of assignments) {
      // Get problems for this assignment
      const problems = await prisma.problem.findMany({
        where: { assignmentId: assignment.id }
      });
      
      const problemIds = problems.map(p => p.id);
      
      const completedSubmissions = await prisma.submission.count({
        where: {
          problemId: { in: problemIds },
          completed: true
        }
      });

      const totalProblems = problems.length;
      const completionRate = studentCount > 0 && totalProblems > 0 
        ? (completedSubmissions / (studentCount * totalProblems)) * 100 
        : 0;

      completionData.push({
        date: assignment.assignDate.toISOString().split('T')[0],
        completionRate: Math.round(completionRate * 100) / 100
      });
    }

    res.json(completionData);
  } catch (error) {
    console.error('Error fetching completion data:', error);
    res.status(500).json({ message: 'Error fetching completion data', error });
  }
};

export const getPlatformData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    // Get all assignments for the class
    const assignments = await prisma.assignment.findMany({
      where: { classId },
      select: { id: true }
    });

    const assignmentIds = assignments.map(a => a.id);

    // Get platform counts for problems in these assignments
    const platformCounts = await prisma.problem.groupBy({
      by: ['platform'],
      where: {
        assignmentId: { in: assignmentIds }
      },
      _count: {
        platform: true
      }
    });

    const platformData: PlatformData[] = platformCounts.map((item: any) => ({
      platform: item.platform,
      count: item._count.platform
    }));

    res.json(platformData);
  } catch (error) {
    console.error('Error fetching platform data:', error);
    res.status(500).json({ message: 'Error fetching platform data', error });
  }
};

export const getDifficultyData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    // Get all assignments for the class
    const assignments = await prisma.assignment.findMany({
      where: { classId },
      select: { id: true }
    });

    const assignmentIds = assignments.map(a => a.id);

    // Get difficulty counts for problems in these assignments
    const difficultyCounts = await prisma.problem.groupBy({
      by: ['difficulty'],
      where: {
        assignmentId: { in: assignmentIds },
        difficulty: {
          not: null
        }
      },
      _count: {
        difficulty: true
      }
    });

    const difficultyData: DifficultyData[] = difficultyCounts.map((item: any) => ({
      difficulty: item.difficulty || 'Unknown',
      count: item._count.difficulty
    }));

    res.json(difficultyData);
  } catch (error) {
    console.error('Error fetching difficulty data:', error);
    res.status(500).json({ message: 'Error fetching difficulty data', error });
  }
}; 