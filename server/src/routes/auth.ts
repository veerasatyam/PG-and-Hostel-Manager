import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { BedOccupancy } from '../models/BedOccupancy';
import { Room } from '../models/Room';
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
    });

    let tenantProfile = null;
    if (role === 'TENANT') {
      tenantProfile = await Tenant.create({
        userId: user._id,
        emergencyContact,
        idProofNumber,
      });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenantProfile ? tenantProfile._id.toString() : undefined,
    });

    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: tenantProfile ? tenantProfile._id.toString() : undefined,
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let tenantProfile = null;
    let activeStay = null;

    if (user.role === 'TENANT') {
      tenantProfile = await Tenant.findOne({ userId: user._id });
      if (tenantProfile) {
        const occ = await BedOccupancy.findOne({ tenantId: tenantProfile._id, status: 'ACTIVE' }).populate('roomId');
        if (occ && occ.roomId) {
          const room: any = occ.roomId;
          const bed = room.beds?.find((b: any) => b._id.toString() === occ.bedId.toString());
          activeStay = {
            occupancyId: occ._id.toString(),
            roomId: room._id.toString(),
            roomNumber: room.number,
            bedId: occ.bedId.toString(),
            bedName: bed?.name || 'Bed',
            monthlyRent: occ.monthlyRent,
            checkInDate: occ.checkInDate,
            securityDeposit: occ.securityDeposit,
          };
        }
      }
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenantProfile ? tenantProfile._id.toString() : undefined,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: tenantProfile ? tenantProfile._id.toString() : undefined,
        activeStay,
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
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let tenantProfile = null;
    let activeStay = null;

    if (user.role === 'TENANT') {
      tenantProfile = await Tenant.findOne({ userId: user._id });
      if (tenantProfile) {
        const occ = await BedOccupancy.findOne({ tenantId: tenantProfile._id, status: 'ACTIVE' }).populate('roomId');
        if (occ && occ.roomId) {
          const room: any = occ.roomId;
          const bed = room.beds?.find((b: any) => b._id.toString() === occ.bedId.toString());
          activeStay = {
            occupancyId: occ._id.toString(),
            roomId: room._id.toString(),
            roomNumber: room.number,
            bedId: occ.bedId.toString(),
            bedName: bed?.name || 'Bed',
            monthlyRent: occ.monthlyRent,
            checkInDate: occ.checkInDate,
            securityDeposit: occ.securityDeposit,
          };
        }
      }
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenantId: tenantProfile ? tenantProfile._id.toString() : undefined,
        activeStay,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

export default router;
