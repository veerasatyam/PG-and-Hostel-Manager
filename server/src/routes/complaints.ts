import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db';
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

    const whereClause: any = {};
    if (status) {
      whereClause.status = status as string;
    }
    if (category) {
      whereClause.category = category as string;
    }

    // Role-based scope
    if (req.user?.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!tenant) {
        return res.json({ complaints: [] });
      }
      whereClause.tenantId = tenant.id;
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        tenant: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            occupancies: {
              where: { status: 'ACTIVE' },
              include: { bed: { include: { room: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = complaints.map((c) => {
      const activeStay = c.tenant.occupancies[0];
      return {
        id: c.id,
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
          id: c.tenant.id,
          name: c.tenant.user.name,
          email: c.tenant.user.email,
          phone: c.tenant.user.phone,
          roomNumber: activeStay?.bed.room.number || 'N/A',
          bedName: activeStay?.bed.name || 'N/A',
        },
      };
    });

    return res.json({ complaints: formatted });
  } catch (err: any) {
    console.error('Error fetching complaints:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// POST /api/complaints - Raise a new complaint (Tenant or Owner on behalf of tenant)
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
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant) {
        return res.status(403).json({ error: 'Tenant profile not found for this user' });
      }
      tenantId = userTenant.id;
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { title, description, category, priority } = parseResult.data;

    const complaint = await prisma.complaint.create({
      data: {
        tenantId,
        title,
        description,
        category,
        priority,
        status: 'OPEN',
      },
      include: {
        tenant: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Complaint raised successfully',
      complaint,
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

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        resolutionNotes,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
      include: {
        tenant: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    return res.json({
      message: `Complaint status updated to ${status}`,
      complaint: updated,
    });
  } catch (err: any) {
    console.error('Error updating complaint:', err);
    return res.status(500).json({ error: 'Failed to update complaint' });
  }
});

export default router;
