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

  try {
    const classToJoin = await prisma.class.findUnique({
      where: { joinCode },
    });

    if (!classToJoin) {
      res.status(404).json({ message: 'Class not found' });
      return;
    }

    if (classToJoin.teacherId === userId) {
      res.status(400).json({ message: 'You cannot join your own class' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.usersOnClasses.create({
        data: {
          userId,
          classId: classToJoin.id,
        },
      });

      const assignmentsInClass = await tx.assignment.findMany({
        where: { classId: classToJoin.id },
        include: { problems: true },
      });

      if (assignmentsInClass.length > 0) {
        const problems = assignmentsInClass.flatMap(a => a.problems);
        
        if (problems.length > 0) {
          const submissions = problems.map(problem => ({
            userId,
            problemId: problem.id,
          }));

          await tx.submission.createMany({
            data: submissions,
          });
        }
      }
    });

    res.status(200).json({ message: 'Successfully joined class' });
  } catch (error) {
    res.status(500).json({ message: 'Error joining class', error });
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
      students: students.map((s) => s.user),
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).json({ message: 'Error fetching class details', error });
  }
}; 