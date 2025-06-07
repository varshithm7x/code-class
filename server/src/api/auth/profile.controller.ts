import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hackerrankUsername: true,
        gfgUsername: true,
        leetcodeUsername: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  // @ts-ignore
  const userId = req.user.userId;
  const { hackerrankUsername, gfgUsername, leetcodeUsername } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        hackerrankUsername,
        gfgUsername,
        leetcodeUsername,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
}; 