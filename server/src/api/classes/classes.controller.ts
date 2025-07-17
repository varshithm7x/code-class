import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import {
    checkAllSubmissions as checkAllSubmissionsService,
    checkSubmissionsForAssignment as checkSubmissionsForAssignmentService,
    checkClassSubmissionStatus as checkClassSubmissionStatusService
} from '../../services/submission.service';
import { checkTeacherAuthorization } from '../../services/authorization.service';

// Type for the class query result
type ClassWithRelations = {
    id: string;
    name: string;
    joinCode: string;
    teacherId: string;
    createdAt: Date;
    updatedAt: Date;
    students?: Array<{
        user: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    assignments?: Array<{
        id: string;
        title: string;
        description?: string;
        dueDate?: Date;
        classId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
};

export const getClasses = async (req: Request, res: Response): Promise<void> => {
    // @ts-expect-error: req.user is added by the protect middleware
    const { userId, role } = req.user;

    try {
        if (role === 'TEACHER') {
            const classes = await prisma.class.findMany({
                where: { teacherId: userId },
                include: {
                    students: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    },
                    assignments: true
                },
                orderBy: { createdAt: 'desc' }
            });

            const classesWithCounts = classes.map((cls: ClassWithRelations) => ({
                ...cls,
                studentCount: cls.students?.length || 0,
                assignmentCount: cls.assignments?.length || 0
            }));

            res.status(200).json(classesWithCounts);
        } else {
            const enrollments = await prisma.usersOnClasses.findMany({
                where: { userId },
                include: {
                    class: {
                        include: {
                            teacher: {
                                select: { id: true, name: true }
                            },
                            assignments: true
                        }
                    }
                }
            });

            const classes = enrollments.map((enrollment) => ({
                ...enrollment.class,
                teacherName: enrollment.class.teacher.name,
                assignmentCount: enrollment.class.assignments.length
            }));

            res.status(200).json(classes);
        }
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ message: 'Failed to fetch classes' });
    }
};

export const getClassById = async (req: Request, res: Response): Promise<void> => {
    const { classId } = req.params;
    // @ts-expect-error: req.user is added by the protect middleware
    const { userId, role } = req.user;

    try {
        const classData = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                teacher: {
                    select: { id: true, name: true, email: true }
                },
                students: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                leetcodeUsername: true,
                                leetcodeCookieStatus: true,
                                leetcodeTotalSolved: true,
                                leetcodeEasySolved: true,
                                leetcodeMediumSolved: true,
                                leetcodeHardSolved: true,
                                hackerrankUsername: true,
                                gfgUsername: true
                            }
                        }
                    }
                },
                assignments: {
                    include: {
                        problems: true
                    }
                }
            }
        });

        if (!classData) {
            res.status(404).json({ message: 'Class not found' });
            return;
        }

        // Check if user has access to this class
        if (role === 'TEACHER' && classData.teacherId !== userId) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        if (role === 'STUDENT') {
            const isEnrolled = await prisma.usersOnClasses.findUnique({
                where: {
                    userId_classId: {
                        userId,
                        classId
                    }
                }
            });

            if (!isEnrolled) {
                res.status(403).json({ message: 'Not enrolled in this class' });
                return;
            }
        }

        // Format the response
        const formattedClass = {
            ...classData,
            teacherName: classData.teacher.name,
            students: classData.students.map((s) => s.user)
        };

        res.status(200).json(formattedClass);
    } catch (error) {
        console.error('Error fetching class details:', error);
        res.status(500).json({ message: 'Failed to fetch class details' });
    }
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;
    // @ts-expect-error: req.user is added by the protect middleware
    const { userId, role } = req.user;

    try {
        if (role !== 'TEACHER') {
            res.status(403).json({ message: 'Only teachers can create classes' });
            return;
        }

        // Generate a random 6-character join code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const newClass = await prisma.class.create({
            data: {
                name,
                joinCode,
                teacherId: userId
            },
            include: {
                teacher: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json({
            ...newClass,
            teacherName: newClass.teacher.name
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ message: 'Failed to create class' });
    }
};

export const joinClass = async (req: Request, res: Response): Promise<void> => {
    const { joinCode } = req.body;
    // @ts-expect-error: req.user is added by the protect middleware
    const { userId, role } = req.user;

    try {
        if (role !== 'STUDENT') {
            res.status(403).json({ message: 'Only students can join classes' });
            return;
        }

        const classToJoin = await prisma.class.findUnique({
            where: { joinCode },
            include: {
                teacher: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!classToJoin) {
            res.status(404).json({ message: 'Invalid join code' });
            return;
        }

        // Check if student is already enrolled
        const existingEnrollment = await prisma.usersOnClasses.findUnique({
            where: {
                userId_classId: {
                    userId,
                    classId: classToJoin.id
                }
            }
        });

        if (existingEnrollment) {
            res.status(400).json({ message: 'Already enrolled in this class' });
            return;
        }

        // Create enrollment
        await prisma.usersOnClasses.create({
            data: {
                userId,
                classId: classToJoin.id
            }
        });

        // Get all assignments for this class and create submissions for the student
        const assignments = await prisma.assignment.findMany({
            where: { classId: classToJoin.id },
            include: { problems: true }
        });

        for (const assignment of assignments) {
            const submissions = assignment.problems.map((problem) => ({
                userId,
                problemId: problem.id
            }));

            await prisma.submission.createMany({
                data: submissions,
                skipDuplicates: true
            });
        }

        res.status(200).json({
            message: 'Successfully joined class',
            class: {
                ...classToJoin,
                teacherName: classToJoin.teacher.name
            }
        });
    } catch (error) {
        console.error('Error joining class:', error);
        res.status(500).json({ message: 'Failed to join class' });
    }
};

export const removeStudentFromClass = async (req: Request, res: Response): Promise<void> => {
    const { classId, studentId } = req.params;
    // @ts-expect-error: req.user is added by the protect middleware
    const { userId, role } = req.user;

    try {
        if (role !== 'TEACHER') {
            res.status(403).json({ message: 'Only teachers can remove students' });
            return;
        }

        // Verify teacher owns this class
        const classData = await prisma.class.findUnique({
            where: { id: classId }
        });

        if (!classData || classData.teacherId !== userId) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        // Remove student enrollment
        await prisma.usersOnClasses.delete({
            where: {
                userId_classId: {
                    userId: studentId,
                    classId
                }
            }
        });

        // Remove student's submissions for this class
        await prisma.submission.deleteMany({
            where: {
                userId: studentId,
                problem: {
                    assignment: {
                        classId
                    }
                }
            }
        });

        res.status(200).json({ message: 'Student removed successfully' });
    } catch (error) {
        console.error('Error removing student:', error);
        res.status(500).json({ message: 'Failed to remove student' });
    }
};

export const checkClassSubmissionStatus = async (req: Request, res: Response): Promise<void> => {
    const { classId } = req.params;
    // @ts-expect-error: req.user is added by the protect middleware
    const { role, id: userId } = req.user;

    try {
        const isTeacherAuthorized = await checkTeacherAuthorization(userId, classId);

        // Only teachers can check class submission status
        if (role !== 'TEACHER' || !isTeacherAuthorized) {
            res.status(403).json({ message: 'Only teachers can check class submission status' });
            return;
        }

        console.log(`📊 Checking submission status for class: ${classId}`);
        const statusReport = await checkClassSubmissionStatusService(classId);

        res.status(200).json({
            message: 'Class submission status check completed',
            data: statusReport
        });
    } catch (error) {
        console.error('Error checking class submission status:', error);
        res.status(500).json({
            message: 'Failed to check class submission status',
            error: (error as Error).message
        });
    }
};
