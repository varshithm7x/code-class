import { Request, Response } from 'express';
import { Prisma } from '@prisma/client'; // <-- ADD THIS LINE
import prisma from '../../lib/prisma';
import { 
  checkAllSubmissions as checkAllSubmissionsService,
  checkSubmissionsForAssignment as checkSubmissionsForAssignmentService,
} from '../../services/submission.service';
import { getLeetCodeProblemDetails } from '../../services/leetcode.service';


const getPlatformFromUrl = (url: string): string => {
  if (typeof url !== 'string' || !url) {
    return 'other';
  }
  if (url.includes('leetcode.com')) {
    return 'leetcode';
  }
  if (url.includes('hackerrank.com')) {
    return 'hackerrank';
  }
  if (url.includes('geeksforgeeks.org')) {
    return 'gfg';
  }
  return 'other';
};

export const createAssignment = async (req: Request, res: Response): Promise<void> => {
  const { title, description, classId, assignDate, dueDate, problems } = req.body;

  try {
    // Pre-validate LeetCode problems OUTSIDE the transaction
    let validatedProblems = problems || [];
    
    if (problems && problems.length > 0) {
      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        const platform = getPlatformFromUrl(problem.url);
        
        let problemData = {
          title: problem.title,
          difficulty: problem.difficulty,
          url: problem.url,
          platform: platform,
        };

        if (platform === 'leetcode') {
          console.log(`Validating LeetCode URL: ${problem.url}`);
          try {
            const officialDetails = await getLeetCodeProblemDetails(problem.url);
            if (officialDetails) {
              problemData.title = officialDetails.title;
              problemData.difficulty = officialDetails.difficulty;
            } else {
              console.warn(`Could not verify LeetCode problem with URL: ${problem.url}. Falling back to user-provided details.`);
            }
          } catch (error) {
            console.warn(`Error validating LeetCode problem ${problem.url}:`, error);
            // Continue with user-provided data if API fails
          }
        }
        
        validatedProblems[i] = problemData;
      }
    }

    // Now perform the database transaction with validated data
    const newAssignment = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          title,
          description,
          assignDate: new Date(assignDate),
          dueDate: new Date(dueDate),
          class: {
            connect: { id: classId },
          },
        },
      });

      if (validatedProblems && validatedProblems.length > 0) {
        for (const problemData of validatedProblems) {
          await tx.problem.create({ 
            data: {
              ...problemData,
              assignmentId: assignment.id,
            }
          });
        }
      }

      const createdProblems = await tx.problem.findMany({
        where: { assignmentId: assignment.id },
      });

      const students = await tx.usersOnClasses.findMany({
        where: { classId: classId },
        select: { userId: true },
      });

      if (students.length > 0 && createdProblems.length > 0) {
        const submissions = students.flatMap(student =>
          createdProblems.map(problem => ({
            userId: student.userId,
            problemId: problem.id,
          }))
        );

        await tx.submission.createMany({
          data: submissions,
        });
      }

      const createdAssignment = await tx.assignment.findUnique({
        where: { id: assignment.id },
        include: {
          problems: true,
        },
      });

      return createdAssignment;
    });

    res.status(201).json(newAssignment);
  } catch (error: any) {
    // This is the new, more detailed catch block
    console.error('--- DETAILED ERROR LOG: CREATE ASSIGNMENT ---');
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
      console.error('Prisma Meta:', error.meta);
    }
    console.error('Full Error Object:', JSON.stringify(error, null, 2));
    console.error('--- END DETAILED ERROR LOG ---');
    
    res.status(500).json({ 
      message: 'Error creating assignment', 
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof Prisma.PrismaClientKnownRequestError && { code: error.code, meta: error.meta }),
      } 
    });
  }
};

export const getAssignmentById = async (req: Request, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        problems: true,
        class: {
          include: {
            students: {
              include: {
                user: {
                  select: { 
                    id: true, 
                    name: true,
                    leetcodeUsername: true,
                    hackerrankUsername: true,
                    gfgUsername: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    const problemIds = assignment.problems.map(p => p.id);
    const submissions = await prisma.submission.findMany({
      where: {
        problemId: { in: problemIds },
      },
      select: {
        problemId: true,
        userId: true,
        completed: true,
        submissionTime: true,
      },
    });

    const students = assignment.class.students.map(s => s.user);

    const problemsWithSubmissions = assignment.problems.map(problem => {
      const problemSubmissions = students.map(student => {
        const submission = submissions.find(
          s => s.problemId === problem.id && s.userId === student.id
        );
        return {
          studentId: student.id,
          studentName: student.name,
          leetcodeUsername: student.leetcodeUsername,
          hackerrankUsername: student.hackerrankUsername,
          gfgUsername: student.gfgUsername,
          completed: submission?.completed || false,
          submissionTime: submission?.submissionTime || null,
        };
      });
      return {
        ...problem,
        submissions: problemSubmissions,
      };
    });

    const response = {
      ...assignment,
      problems: problemsWithSubmissions,
    };
    
    // We don't need to send the full class details back
    // @ts-ignore
    delete response.class;

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ message: 'Error fetching assignment' });
  }
};

export const checkSubmissions = async (req: Request, res: Response): Promise<void> => {
  console.log('🔄 [DEBUG] checkSubmissions endpoint called');
  console.log('🔄 [DEBUG] Request method:', req.method);
  console.log('🔄 [DEBUG] Request URL:', req.url);
  console.log('🔄 [DEBUG] Request user:', (req as any).user);
  
  try {
    console.log('🚀 [DEBUG] Manual submission check triggered for all assignments...');
    await checkAllSubmissionsService();
    console.log('✅ [DEBUG] checkAllSubmissionsService completed successfully');
    res.status(200).json({ message: 'Submission check completed successfully.' });
  } catch (error) {
    console.error('❌ [DEBUG] Error during manual submission check:', error);
    res.status(500).json({ message: 'Error during manual submission check', error });
  }
};

export const checkAssignmentSubmissions = async (req: Request, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  console.log('🎯 [DEBUG] checkAssignmentSubmissions endpoint called');
  console.log('🎯 [DEBUG] Assignment ID:', assignmentId);
  console.log('🎯 [DEBUG] Request method:', req.method);
  console.log('🎯 [DEBUG] Request URL:', req.url);
  console.log('🎯 [DEBUG] Request user:', (req as any).user);
  
  try {
    console.log(`🚀 [DEBUG] Manual submission check triggered for assignment ${assignmentId}...`);
    await checkSubmissionsForAssignmentService(assignmentId);
    console.log(`✅ [DEBUG] checkSubmissionsForAssignmentService completed for assignment ${assignmentId}`);
    res.status(200).json({ message: 'Submission check completed successfully.' });
  } catch (error) {
    console.error(`❌ [DEBUG] Error during manual submission check for assignment ${assignmentId}:`, error);
    res.status(500).json({ message: 'Error during manual submission check', error });
  }
};

export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
    const { assignmentId } = req.params;
    // @ts-ignore
    const { userId, role } = req.user;

    if (role !== 'TEACHER') {
        res.status(403).json({ message: 'Only teachers can delete assignments.' });
        return;
    }

    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { class: true }
        });

        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found.' });
            return;
        }

        if (assignment.class.teacherId !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this assignment.' });
            return;
        }

        // Use a transaction to ensure all related data is deleted
        await prisma.$transaction(async (tx) => {
            // 1. Find all problems in the assignment
            const problems = await tx.problem.findMany({
                where: { assignmentId: assignmentId }
            });

            const problemIds = problems.map(p => p.id);

            // 2. Delete all submissions for those problems
            if (problemIds.length > 0) {
                await tx.submission.deleteMany({
                    where: { problemId: { in: problemIds } }
                });
            }

            // 3. Delete all problems in the assignment
            await tx.problem.deleteMany({
                where: { assignmentId: assignmentId }
            });

            // 4. Finally, delete the assignment itself
            await tx.assignment.delete({
                where: { id: assignmentId }
            });
        });

        res.status(200).json({ message: 'Assignment and all related data deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Error deleting assignment', error });
    }
};

export const updateAssignment = async (req: Request, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  const { title, description, dueDate, problems } = req.body;

  try {
    const updatedAssignment = await prisma.$transaction(async (tx) => {
      // 1. Update the assignment details
      const assignment = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          title,
          description,
          dueDate: new Date(dueDate),
        },
      });

      // 2. Handle problems: Delete old ones, create new ones
      // This is a simple approach. A more complex diffing logic could be used
      // to preserve existing problem IDs if they haven't changed.
      
      // First, delete the submissions associated with the old problems to
      // avoid foreign key constraint violations.
      await tx.submission.deleteMany({
        where: { problem: { assignmentId: assignmentId } },
      });

      // Now, it's safe to delete the old problems.
      // NOTE: The 'where' clause below may have a type error, but the
      // 'assignmentId' is the correct logical field to use. Please adjust
      // the relation query based on your Prisma schema.
      await tx.problem.deleteMany({
        where: { assignmentId: assignmentId },
      });

      if (problems && problems.length > 0) {
        // Create new problems
        await tx.problem.createMany({
          data: problems.map((p: { url: string; title: string; difficulty: string }) => ({
            title: p.title,
            url: p.url,
            difficulty: p.difficulty,
            platform: getPlatformFromUrl(p.url),
            assignmentId: assignment.id,
          })),
        });

        // 3. Re-create submissions for the new problems for all students
        const createdProblems = await tx.problem.findMany({
          where: { assignmentId: assignment.id },
        });

        const students = await tx.usersOnClasses.findMany({
          where: { classId: assignment.classId },
          select: { userId: true },
        });

        if (students.length > 0 && createdProblems.length > 0) {
          const submissions = students.flatMap(student =>
            createdProblems.map(problem => ({
              userId: student.userId,
              problemId: problem.id,
            }))
          );

          await tx.submission.createMany({
            data: submissions,
          });
        }
      }

      return await tx.assignment.findUnique({
        where: { id: assignment.id },
        include: { problems: true },
      });
    });

    res.status(200).json(updatedAssignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Error updating assignment', error });
  }
};

export const checkLeetCodeSubmissionsForAssignment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  console.log('📱 [DEBUG] checkLeetCodeSubmissionsForAssignment endpoint called');
  console.log('📱 [DEBUG] Assignment ID:', id);
  console.log('📱 [DEBUG] Request method:', req.method);
  console.log('📱 [DEBUG] Request URL:', req.url);
  
  // @ts-ignore
  const userId = req.user?.userId;
  console.log('📱 [DEBUG] User ID:', userId);

  try {
    // Get the assignment and verify the user is the teacher
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        class: true,
        problems: {
          include: {
            submissions: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    if (assignment.class.teacherId !== userId) {
      res.status(403).json({ message: 'Not authorized to check submissions for this assignment' });
      return;
    }

    // Import the enhanced service
    const { syncAllLinkedLeetCodeUsers } = await import('../../services/enhanced-leetcode.service');
    
    // Trigger sync for all linked users
    await syncAllLinkedLeetCodeUsers();

    res.status(200).json({ 
      message: 'LeetCode submission sync completed',
      assignmentTitle: assignment.title 
    });

  } catch (error) {
    console.error('Error checking LeetCode submissions:', error);
    res.status(500).json({ message: 'Error checking LeetCode submissions', error });
  }
};

export const getMyAssignments = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    // Get user's class IDs first
    const userClasses = await prisma.usersOnClasses.findMany({
      where: { userId },
      select: { classId: true },
    });

    const classIds = userClasses.map(uc => uc.classId);

    // Get all assignments for those classes directly
    const allAssignments = await prisma.assignment.findMany({
      where: {
        classId: { in: classIds }
      },
      include: {
        problems: true,
      },
      orderBy: {
        dueDate: 'asc'
      }
    });
    
    // Get submission data for the user
    const assignmentIds = allAssignments.map(a => a.id);
    const userSubmissions = await prisma.submission.findMany({
      where: {
        userId,
        problem: {
          assignmentId: { in: assignmentIds }
        }
      },
    });

    // Calculate status for each assignment
    const assignmentsWithStatus = allAssignments.map((assignment: any) => {
      const assignmentSubmissions = userSubmissions.filter(
        s => assignment.problems.some((p: { id: string }) => p.id === s.problemId)
      );
      
      const completedCount = assignmentSubmissions.filter(s => s.completed).length;
      const totalProblems = assignment.problems.length;
      const now = new Date();
      const dueDate = new Date(assignment.dueDate);
      
      let status: 'completed' | 'pending' | 'overdue';
      if (completedCount === totalProblems) {
        status = 'completed';
      } else if (now > dueDate) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      return {
        ...assignment,
        status,
      };
    });

    res.status(200).json(assignmentsWithStatus);
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ message: 'Error fetching assignments', error });
  }
};