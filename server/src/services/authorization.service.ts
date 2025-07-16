import prisma from '@/lib/prisma';

export const checkTeacherAuthorization = async (userId: string, classId: string): Promise<boolean> => {
    const course = await prisma.class.findFirst({
        where: {
            id: classId,
            teacherId: userId
        },
        select: {
            id: true
        }
    });

    return course !== null;
};

export const checkTeacherAuthorizationForAssignment = async (userId: string, assignmentId: string): Promise<boolean> => {
    const assignment = await prisma.assignment.findFirst({
        where: {
            id: assignmentId,
            class: {
                teacherId: userId
            }
        },
        select: {
            id: true
        }
    });

    return assignment !== null;
};

export const checkAuthorizationForClass = async (userId: string, classId: string): Promise<boolean> => {
    const classRecord = await prisma.class.findFirst({
        where: {
            id: classId,
            OR: [{ teacherId: userId }, { students: { some: { userId } } }]
        },
        select: {
            id: true
        }
    });

    console.log('checkAuthorizationForClass', classRecord, userId, classId);

    return classRecord !== null;
};
