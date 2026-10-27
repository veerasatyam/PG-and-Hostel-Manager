import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Complaint } from '../models/Complaint';
import { Tenant } from '../models/Tenant';
import { BedOccupancy } from '../models/BedOccupancy';
import { Room } from '../models/Room';
import { authenticate, requireOwner } from '../middleware/auth';

const router = Router();

const createComplaintSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'CLEANING', 'WIFI', 'FURNITURE', 'OTHER']).default('OTHER'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']),
  resolutionNotes: z.string().optional(),
});

// GET /api/complaints - List complaints
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;

    const query: any = {};
    if (status) query.status = status as string;
    if (category) query.category = category as string;

    if (req.user?.role === 'TENANT') {
      const tenant = await Tenant.findOne({ userId: req.user.id });
      if (!tenant) return res.json({ complaints: [] });
      query.tenantId = tenant._id;
    }

    const complaints = await Complaint.find(query)
      .populate({
        path: 'tenantId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Map tenant occupancies to get room numbers
    const tenantIds = complaints.map((c: any) => c.tenantId?._id).filter(Boolean);
    const activeOccs = await BedOccupancy.find({
      tenantId: { $in: tenantIds },
      status: 'ACTIVE',
    })
      .populate('roomId', 'number beds')
      .lean();

    const stayMap = new Map<string, any>();
    activeOccs.forEach((occ: any) => {
      const room = occ.roomId as any;
      const bed = room?.beds?.find((b: any) => b._id.toString() === occ.bedId.toString());
      stayMap.set(occ.tenantId.toString(), {
        roomNumber: room?.number || 'N/A',
        bedName: bed?.name || 'Bed',
      });
    });

    const formatted = complaints.map((c: any) => {
      const stay = stayMap.get(c.tenantId?._id?.toString()) || { roomNumber: 'N/A', bedName: 'N/A' };
      return {
        id: c._id.toString(),
        title: c.title,
        description: c.description,
        category: c.category,
        priority: c.priority,
        status: c.status,
        resolutionNotes: c.resolutionNotes,
        resolvedAt: c.resolvedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        tenant: {
          id: c.tenantId?._id?.toString(),
          name: c.tenantId?.userId?.name || 'Resident',
          email: c.tenantId?.userId?.email || '',
          phone: c.tenantId?.userId?.phone || '',
          roomNumber: stay.roomNumber,
          bedName: stay.bedName,
        },
      };
    });

    return res.json({ complaints: formatted });
  } catch (err: any) {
    console.error('Error fetching complaints:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// POST /api/complaints - Raise a new complaint
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const parseResult = createComplaintSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    let tenantId = req.body.tenantId;

    if (req.user?.role === 'TENANT') {
      const tenant = await Tenant.findOne({ userId: req.user.id });
      if (!tenant) {
        return res.status(403).json({ error: 'Tenant record not found for current session' });
      }
      tenantId = tenant._id;
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant identification required' });
    }

    const { title, description, category, priority } = parseResult.data;

    const complaint = await Complaint.create({
      tenantId,
      title,
      description,
      category,
      priority,
      status: 'OPEN',
    });

    return res.status(201).json({
      message: 'Work order ticket created successfully',
      complaint: {
        id: complaint._id.toString(),
        title: complaint.title,
        status: complaint.status,
      },
    });
  } catch (err: any) {
    console.error('Error creating complaint:', err);
    return res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// PATCH /api/complaints/:id/status - Update complaint status (Owner only)
router.patch('/:id/status', authenticate, requireOwner, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = updateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { status, resolutionNotes } = parseResult.data;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    complaint.status = status;
    complaint.resolutionNotes = resolutionNotes;
    if (status === 'RESOLVED') {
      complaint.resolvedAt = new Date();
    }
    await complaint.save();

    return res.json({
      message: `Work order status updated to ${status}`,
      complaint: {
        id: complaint._id.toString(),
        status: complaint.status,
        resolutionNotes: complaint.resolutionNotes,
      },
    });
  } catch (err: any) {
    console.error('Error updating complaint:', err);
    return res.status(500).json({ error: 'Failed to update complaint' });
  }
});

export default router;
