import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { customAlphabet } from 'nanoid';
import { Prisma } from '@prisma/client';

// Generate a unique 6-character code for joining a class
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export const createClass = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  // @ts-ignore
  const teacherId = req.user.userId;

  try {
    const newClass = await prisma.class.create({
      data: {
        name,
        joinCode: nanoid(),
        teacherId,
      },
    });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: 'Error creating class', error });
  }
};

export const joinClass = async (req: Request, res: Response): Promise<void> => {
  const { joinCode } = req.body;
  // @ts-ignore
  const { userId } = req.user;

  console.log(`[DEBUG] Student ${userId} attempting to join class with code: ${joinCode}`);

  try {
    const classToJoin = await prisma.class.findUnique({
      where: { joinCode },
    });

    if (!classToJoin) {
      console.log(`[DEBUG] Class not found for join code: ${joinCode}`);
      res.status(404).json({ message: 'Class not found' });
      return;
    }

    console.log(`[DEBUG] Found class: ${classToJoin.id} (${classToJoin.name})`);

    if (classToJoin.teacherId === userId) {
      console.log(`[DEBUG] User ${userId} attempted to join their own class`);
      res.status(400).json({ message: 'You cannot join your own class' });
      return;
    }

    // Check if student is already in the class
    const existingEnrollment = await prisma.usersOnClasses.findUnique({
      where: {
        userId_classId: {
          userId,
          classId: classToJoin.id,
        },
      },
    });

    if (existingEnrollment) {
      console.log(`[DEBUG] User ${userId} is already enrolled in class ${classToJoin.id}`);
      res.status(400).json({ message: 'You are already enrolled in this class' });
      return;
    }

    console.log(`[DEBUG] Starting transaction to enroll user ${userId} in class ${classToJoin.id}`);

    await prisma.$transaction(async (tx) => {
      // Add student to class
      await tx.usersOnClasses.create({
        data: {
          userId,
          classId: classToJoin.id,
        },
      });

      console.log(`[DEBUG] User ${userId} successfully added to class ${classToJoin.id}`);

      // Get all assignments in the class
      const assignmentsInClass = await tx.assignment.findMany({
        where: { classId: classToJoin.id },
        include: { problems: true },
      });

      console.log(`[DEBUG] Found ${assignmentsInClass.length} assignments in class ${classToJoin.id}`);

      if (assignmentsInClass.length > 0) {
        const problems = assignmentsInClass.flatMap(a => a.problems);
        
        console.log(`[DEBUG] Found ${problems.length} total problems across all assignments`);
        
        if (problems.length > 0) {
          const submissions = problems.map(problem => ({
            userId,
            problemId: problem.id,
          }));

          await tx.submission.createMany({
            data: submissions,
          });

          console.log(`[DEBUG] Created ${submissions.length} submission records for user ${userId}`);
        }
      }
    });

    console.log(`[DEBUG] Successfully completed enrollment for user ${userId} in class ${classToJoin.id}`);
    res.status(200).json({ message: 'Successfully joined class' });
  } catch (error: any) {
    console.error('--- DETAILED ERROR LOG: JOIN CLASS ---');
    console.error('User ID:', userId);
    console.error('Join Code:', joinCode);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
      console.error('Prisma Meta:', error.meta);
    }
    console.error('Full Error Object:', JSON.stringify(error, null, 2));
    console.error('--- END DETAILED ERROR LOG ---');
    
    res.status(500).json({ 
      message: 'Error joining class', 
      error: {
        name: error.name,
        message: error.message,
        ...(error instanceof Prisma.PrismaClientKnownRequestError && { code: error.code, meta: error.meta }),
      } 
    });
  }
};

export const getClasses = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const { userId, role } = req.user;

  try {
    const whereClause: Prisma.ClassWhereInput =
      role === 'TEACHER'
        ? { teacherId: userId }
        : { students: { some: { userId } } };

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: { name: true },
        },
        _count: {
          select: {
            students: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedClasses = (classes as any[]).map(
      ({ _count, teacher, ...rest }) => ({
        ...rest,
        studentCount: _count.students,
        assignmentCount: _count.assignments,
        teacherName: teacher.name,
      })
    );

    res.status(200).json(formattedClasses);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Error fetching classes', error });
  }
};

export const getClassAssignments = async (req: Request, res: Response): Promise<void> => {
  const { classId } = req.params;

  try {
    const assignments = await prisma.assignment.findMany({
      where: { classId },
      select: {
        id: true,
        classId: true,
        title: true,
        description: true,
        assignDate: true,
        dueDate: true,
        problems: true,
      },
      orderBy: {
        assignDate: 'desc',
      },
    });
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments', error });
  }
};

export const getClassDetails = async (req: Request, res: Response): Promise<void> => {
  const { classId } = req.params;

  try {
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: true,
        students: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!classInfo) {
      res.status(404).json({ message: 'Class not found' });
      return;
    }

    const { teacher, students, ...classData } = classInfo;

    const result = {
      ...classData,
      teacherName: teacher.name,
      students: students.map(({ user }) => {
        let platformCount = 0;
        if (user.hackerrankUsername) platformCount++;
        if (user.gfgUsername) platformCount++;
        if (user.leetcodeUsername) platformCount++;
        
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          platformCount,
        };
      }),
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).json({ message: 'Error fetching class details', error });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  const { classId } = req.params;
  // @ts-ignore
  const { userId, role } = req.user;

  if (role !== 'TEACHER') {
    res.status(403).json({ message: 'Only teachers can delete classes.' });
    return;
  }

  try {
    const classToDelete = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classToDelete) {
      res.status(404).json({ message: 'Class not found.' });
      return;
    }

    if (classToDelete.teacherId !== userId) {
      res.status(403).json({ message: 'You are not authorized to delete this class.' });
      return;
    }

    // Use a transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Manually delete related data in the correct order to avoid foreign key constraints

      // 1. Find all assignments in the class
      const assignments = await tx.assignment.findMany({
        where: { classId: classId },
        include: { problems: true }
      });

      const assignmentIds = assignments.map(a => a.id);
      const problemIds = assignments.flatMap(a => a.problems.map(p => p.id));

      // 2. Delete all submissions for the problems in those assignments
      if (problemIds.length > 0) {
        await tx.submission.deleteMany({
          where: { problemId: { in: problemIds } }
        });
      }

      // 3. Delete all problems in those assignments
      if (assignmentIds.length > 0) {
        await tx.problem.deleteMany({
          where: { assignmentId: { in: assignmentIds } }
        });
      }

      // 4. Delete all assignments in the class
      if (assignmentIds.length > 0) {
        await tx.assignment.deleteMany({
          where: { id: { in: assignmentIds } }
        });
      }

      // 5. Delete all student enrollments (UsersOnClasses)
      await tx.usersOnClasses.deleteMany({
        where: { classId: classId }
      });

      // 6. Finally, delete the class itself
      await tx.class.delete({
        where: { id: classId }
      });
    });

    res.status(200).json({ message: 'Class and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Error deleting class', error });
  }
}; 