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
  try {
    console.log('Manual submission check triggered...');
    await checkAllSubmissionsService();
    res.status(200).json({ message: 'Submission check completed successfully.' });
  } catch (error) {
    console.error('Error during manual submission check:', error);
    res.status(500).json({ message: 'Error during manual submission check', error });
  }
};

export const checkAssignmentSubmissions = async (req: Request, res: Response): Promise<void> => {
  const { assignmentId } = req.params;
  try {
    console.log(`Manual submission check triggered for assignment ${assignmentId}...`);
    await checkSubmissionsForAssignmentService(assignmentId);
    res.status(200).json({ message: 'Submission check completed successfully.' });
  } catch (error) {
    console.error(`Error during manual submission check for assignment ${assignmentId}:`, error);
    res.status(500).json({ message: 'Error during manual submission check', error });
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