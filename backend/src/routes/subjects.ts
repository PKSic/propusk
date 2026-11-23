import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const subjectsRouter = Router();

const createSubjectSchema = z.object({
  name: z.string().trim().min(2, 'Название предмета должно содержать минимум 2 символа').max(150),
});

const updateSubjectSchema = z.object({
  name: z.string().trim().min(2, 'Название предмета должно содержать минимум 2 символа').max(150).optional(),
  isActive: z.boolean().optional(),
});

subjectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const subjects = await prisma.subject.findMany({
      where: includeArchived ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { lessons: true } },
      },
    });

    res.json({
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        lessonsCount: s._count.lessons,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  }),
);

subjectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSubjectSchema.parse(req.body);
    const subject = await prisma.subject.create({
      data: { name: body.name },
    });
    res.status(201).json({ subject: { ...subject, lessonsCount: 0 } });
  }),
);

subjectsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID предмета');
    }
    const body = updateSubjectSchema.parse(req.body);
    const subject = await prisma.subject.update({
      where: { id },
      data: body,
      include: { _count: { select: { lessons: true } } },
    });
    res.json({
      subject: {
        id: subject.id,
        name: subject.name,
        isActive: subject.isActive,
        lessonsCount: subject._count.lessons,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
      },
    });
  }),
);

subjectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID предмета');
    }

    const existing = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true } } },
    });
    if (!existing) {
      throw new AppError(404, 'Предмет не найден');
    }

    if (existing._count.lessons > 0 || req.query.archive === 'true') {
      const archived = await prisma.subject.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({
        deleted: false,
        archived: true,
        subject: archived,
        lessonsCount: existing._count.lessons,
      });
    }

    await prisma.subject.delete({ where: { id } });
    return res.json({ deleted: true, archived: false, id });
  }),
);
