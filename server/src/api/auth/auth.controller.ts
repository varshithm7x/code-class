import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { Role } from '@prisma/client';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  try {
    console.log('Starting signup process for:', email);
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      throw new Error('JWT_SECRET is not configured');
    }

    // Validate role
    const upperRole = (role as string).toUpperCase();
    if (!Object.values(Role).includes(upperRole as Role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: upperRole as Role,
      },
    });
    console.log('User created successfully:', user.id);

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    console.log('JWT token generated successfully');

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Error in signup:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Error creating user', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ message: 'Error creating user', error: 'Unknown error occurred' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: '1d',
    });

    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
}; 