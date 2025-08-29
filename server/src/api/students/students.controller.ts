import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const getStudentProfile = async (req: Request, res: Response): Promise<void> => {
    const { studentId } = req.params;

    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId, role: 'STUDENT' },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                leetcodeUsername: true,
                leetcodeCookieStatus: true,
                leetcodeTotalSolved: true,
                leetcodeEasySolved: true,
                leetcodeMediumSolved: true,
                leetcodeHardSolved: true,
                submissions: {
                    select: {
                        completed: true,
                        submissionTime: true,
                        problem: {
                            select: {
                                id: true,
                                title: true,
                                difficulty: true,
                                platform: true,
                                assignment: {
                                    select: {
                                        id: true,
                                        title: true,
                                        dueDate: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        problem: {
                           assignment: {
                               createdAt: 'desc'
                           }
                        }
                    }
                }
            }
        });

        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }

        res.status(200).json(student);
    } catch (error) {
        console.error("Error fetching student profile:", error);
        res.status(500).json({ message: 'Error fetching student profile' });
    }
}; 