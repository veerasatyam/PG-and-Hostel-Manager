import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, signToken } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OWNER', 'TENANT']).default('TENANT'),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  idProofNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { name, email, password, role, phone, emergencyContact, idProofNumber } = parseResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        ...(role === 'TENANT'
          ? {
              tenant: {
                create: {
                  emergencyContact,
                  idProofNumber,
                },
              },
            }
          : {}),
      },
      include: {
        tenant: true,
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: user.tenant?.id,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          include: {
            occupancies: {
              where: { status: 'ACTIVE' },
              include: {
                bed: {
                  include: {
                    room: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const activeOccupancy = user.tenant?.occupancies?.[0];

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: user.tenant?.id,
        activeStay: activeOccupancy
          ? {
              occupancyId: activeOccupancy.id,
              roomNumber: activeOccupancy.bed.room.number,
              bedName: activeOccupancy.bed.name,
              monthlyRent: activeOccupancy.monthlyRent,
              checkInDate: activeOccupancy.checkInDate,
              securityDeposit: activeOccupancy.securityDeposit,
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        tenant: {
          include: {
            occupancies: {
              where: { status: 'ACTIVE' },
              include: {
                bed: {
                  include: {
                    room: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activeOccupancy = user.tenant?.occupancies?.[0];

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: user.tenant?.id,
        activeStay: activeOccupancy
          ? {
              occupancyId: activeOccupancy.id,
              roomNumber: activeOccupancy.bed.room.number,
              bedName: activeOccupancy.bed.name,
              monthlyRent: activeOccupancy.monthlyRent,
              checkInDate: activeOccupancy.checkInDate,
              securityDeposit: activeOccupancy.securityDeposit,
            }
          : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error retrieving user' });
  }
});

export default router;
