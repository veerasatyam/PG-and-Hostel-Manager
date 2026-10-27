import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { authenticate, requireOwner } from '../middleware/auth';

const router = Router();

const createRoomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  floor: z.number().int().default(1),
  type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING']).default('DOUBLE'),
  hasAc: z.boolean().default(false),
  baseRent: z.number().positive('Base rent must be greater than 0'),
  bedCount: z.number().int().min(1).max(10).optional(),
});

// GET /api/rooms - List all rooms with bed details and current occupants
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        beds: {
          include: {
            occupancies: {
              where: { status: 'ACTIVE' },
              include: {
                tenant: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, phone: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    const transformedRooms = rooms.map((room) => ({
      ...room,
      totalBeds: room.beds.length,
      occupiedBeds: room.beds.filter((b) => b.occupancies.length > 0).length,
      availableBeds: room.beds.filter((b) => b.occupancies.length === 0 && b.status === 'AVAILABLE').length,
      beds: room.beds.map((b) => {
        const activeOcc = b.occupancies[0];
        return {
          id: b.id,
          name: b.name,
          status: activeOcc ? 'OCCUPIED' : b.status,
          currentOccupant: activeOcc
            ? {
                occupancyId: activeOcc.id,
                tenantId: activeOcc.tenantId,
                name: activeOcc.tenant.user.name,
                email: activeOcc.tenant.user.email,
                phone: activeOcc.tenant.user.phone,
                checkInDate: activeOcc.checkInDate,
                monthlyRent: activeOcc.monthlyRent,
              }
            : null,
        };
      }),
    }));

    return res.json({ rooms: transformedRooms });
  } catch (err: any) {
    console.error('Error fetching rooms:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/available-beds - Get all beds currently free
router.get('/available-beds', authenticate, async (_req: Request, res: Response) => {
  try {
    const beds = await prisma.bed.findMany({
      where: {
        status: 'AVAILABLE',
        occupancies: {
          none: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        room: true,
      },
      orderBy: [{ room: { number: 'asc' } }, { name: 'asc' }],
    });

    return res.json({ beds });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch available beds' });
  }
});

// POST /api/rooms - Create a room (Owner only)
router.post('/', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const parseResult = createRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { number, floor, type, hasAc, baseRent, bedCount } = parseResult.data;

    // Check if room number already exists
    const existing = await prisma.room.findUnique({ where: { number } });
    if (existing) {
      return res.status(409).json({ error: `Room number ${number} already exists` });
    }

    // Default bed count based on type if not explicitly supplied
    let defaultBeds = 2;
    if (type === 'SINGLE') defaultBeds = 1;
    else if (type === 'DOUBLE') defaultBeds = 2;
    else if (type === 'TRIPLE') defaultBeds = 3;
    else if (type === 'FOUR_SHARING') defaultBeds = 4;

    const count = bedCount || defaultBeds;

    const room = await prisma.room.create({
      data: {
        number,
        floor,
        type,
        hasAc,
        baseRent,
        beds: {
          create: Array.from({ length: count }, (_, idx) => ({
            name: `Bed ${String.fromCharCode(65 + idx)}`, // Bed A, Bed B, etc.
            status: 'AVAILABLE',
          })),
        },
      },
      include: {
        beds: true,
      },
    });

    return res.status(201).json({ message: 'Room created successfully', room });
  } catch (err: any) {
    console.error('Error creating room:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// POST /api/rooms/:id/beds - Add bed to existing room (Owner only)
router.post('/:id/beds', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Valid bed name is required' });
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const bed = await prisma.bed.create({
      data: {
        name,
        roomId: id,
        status: 'AVAILABLE',
      },
    });

    return res.status(201).json({ message: 'Bed added successfully', bed });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add bed' });
  }
});

export default router;
