import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Room } from '../models/Room';
import { BedOccupancy } from '../models/BedOccupancy';
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

// GET /api/rooms - List all rooms with bed statuses and current occupants
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const rooms = await Room.find().sort({ number: 1 }).lean();

    // Fetch all active occupancies
    const activeOccupancies = await BedOccupancy.find({ status: 'ACTIVE' })
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .lean();

    const occupancyMap = new Map<string, any>();
    activeOccupancies.forEach((occ: any) => {
      occupancyMap.set(occ.bedId.toString(), occ);
    });

    const transformedRooms = rooms.map((room: any) => {
      let occupiedCount = 0;
      let availableCount = 0;

      const beds = (room.beds || []).map((bed: any) => {
        const occ = occupancyMap.get(bed._id.toString());
        const isOccupied = !!occ;
        if (isOccupied) occupiedCount++;
        else if (bed.status === 'AVAILABLE') availableCount++;

        return {
          id: bed._id.toString(),
          name: bed.name,
          status: isOccupied ? 'OCCUPIED' : bed.status,
          currentOccupant: occ
            ? {
                occupancyId: occ._id.toString(),
                tenantId: occ.tenantId?._id?.toString(),
                name: occ.tenantId?.userId?.name || 'Resident',
                email: occ.tenantId?.userId?.email || '',
                phone: occ.tenantId?.userId?.phone || '',
                checkInDate: occ.checkInDate,
                monthlyRent: occ.monthlyRent,
              }
            : null,
        };
      });

      return {
        id: room._id.toString(),
        number: room.number,
        floor: room.floor,
        type: room.type,
        hasAc: room.hasAc,
        baseRent: room.baseRent,
        totalBeds: beds.length,
        occupiedBeds: occupiedCount,
        availableBeds: availableCount,
        beds,
      };
    });

    return res.json({ rooms: transformedRooms });
  } catch (err: any) {
    console.error('Error fetching rooms:', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/available-beds - Get all beds currently free for assignment
router.get('/available-beds', authenticate, async (_req: Request, res: Response) => {
  try {
    const rooms = await Room.find().sort({ number: 1 }).lean();
    const activeOccupancies = await BedOccupancy.find({ status: 'ACTIVE' }).select('bedId').lean();
    const occupiedBedIds = new Set(activeOccupancies.map((o: any) => o.bedId.toString()));

    const availableBeds: any[] = [];
    rooms.forEach((room: any) => {
      (room.beds || []).forEach((bed: any) => {
        if (bed.status === 'AVAILABLE' && !occupiedBedIds.has(bed._id.toString())) {
          availableBeds.push({
            id: bed._id.toString(),
            name: bed.name,
            roomId: room._id.toString(),
            room: {
              id: room._id.toString(),
              number: room.number,
              floor: room.floor,
              type: room.type,
              hasAc: room.hasAc,
              baseRent: room.baseRent,
            },
          });
        }
      });
    });

    return res.json({ beds: availableBeds });
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

    const existing = await Room.findOne({ number });
    if (existing) {
      return res.status(409).json({ error: `Room number ${number} already exists` });
    }

    let defaultBeds = 2;
    if (type === 'SINGLE') defaultBeds = 1;
    else if (type === 'DOUBLE') defaultBeds = 2;
    else if (type === 'TRIPLE') defaultBeds = 3;
    else if (type === 'FOUR_SHARING') defaultBeds = 4;

    const count = bedCount || defaultBeds;
    const beds = Array.from({ length: count }, (_, idx) => ({
      _id: new mongoose.Types.ObjectId(),
      name: `Bed ${String.fromCharCode(65 + idx)}`,
      status: 'AVAILABLE',
    }));

    const room = await Room.create({
      number,
      floor,
      type,
      hasAc,
      baseRent,
      beds,
    });

    return res.status(201).json({
      message: 'Room created successfully',
      room: {
        id: room._id.toString(),
        number: room.number,
        floor: room.floor,
        type: room.type,
        hasAc: room.hasAc,
        baseRent: room.baseRent,
        beds: room.beds,
      },
    });
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

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const newBed = {
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      status: 'AVAILABLE' as const,
    };

    room.beds.push(newBed as any);
    await room.save();

    return res.status(201).json({ message: 'Bed added successfully', bed: newBed });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add bed' });
  }
});

export default router;
