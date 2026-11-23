import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { calculateStatsFromRecords, type AttendanceStatusValue } from '../services/attendanceCalculator.js';
import { getMonthRange, getWeekRange } from '../utils/dateRange.js';

export const studentsRouter = Router();

const createStudentSchema = z.object({
  fullName: z.string().trim().min(2, 'ФИО должно содержать минимум 2 символа').max(150),
});

const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2, 'ФИО должно содержать минимум 2 символа').max(150).optional(),
  isActive: z.boolean().optional(),
});

studentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'name_asc';

    const weekRange = getWeekRange();
    const monthRange = getMonthRange();

    const students = await prisma.student.findMany({
      where: {
        ...(includeArchived ? {} : { isActive: true }),
        ...(search
          ? { fullName: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        attendances: {
          include: {
            lesson: { select: { date: true } },
          },
        },
      },
    });

    const enriched = students.map((s) => {
      const allStats = calculateStatsFromRecords(
        s.attendances.map((a) => ({ status: a.status as AttendanceStatusValue })),
      );
      const weekStats = calculateStatsFromRecords(
        s.attendances
          .filter((a) => a.lesson.date >= weekRange.from && a.lesson.date <= weekRange.to)
          .map((a) => ({ status: a.status as AttendanceStatusValue })),
      );
      const monthStats = calculateStatsFromRecords(
        s.attendances
          .filter((a) => a.lesson.date >= monthRange.from && a.lesson.date <= monthRange.to)
          .map((a) => ({ status: a.status as AttendanceStatusValue })),
      );

      return {
        id: s.id,
        fullName: s.fullName,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        stats: {
          ...allStats,
          weekMissedHours: weekStats.missedHours,
          monthMissedHours: monthStats.missedHours,
        },
      };
    });

    enriched.sort((a, b) => {
      switch (sort) {
        case 'name_desc':
          return b.fullName.localeCompare(a.fullName, 'ru');
        case 'missed_desc':
          return b.stats.missedHours - a.stats.missedHours || a.fullName.localeCompare(b.fullName, 'ru');
        case 'missed_asc':
          return a.stats.missedHours - b.stats.missedHours || a.fullName.localeCompare(b.fullName, 'ru');
        case 'rate_asc':
          return (a.stats.attendanceRate ?? 101) - (b.stats.attendanceRate ?? 101);
        case 'name_asc':
        default:
          return a.fullName.localeCompare(b.fullName, 'ru');
      }
    });

    res.json({ students: enriched });
  }),
);

studentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createStudentSchema.parse(req.body);
    const student = await prisma.student.create({
      data: { fullName: body.fullName },
    });
    res.status(201).json({ student });
  }),
);

studentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID студента');
    }
    const body = updateStudentSchema.parse(req.body);
    const student = await prisma.student.update({
      where: { id },
      data: body,
    });
    res.json({ student });
  }),
);

studentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID студента');
    }
    const permanent = req.query.permanent === 'true';

    const existing = await prisma.student.findUnique({
      where: { id },
      include: { _count: { select: { attendances: true } } },
    });
    if (!existing) {
      throw new AppError(404, 'Студент не найден');
    }

    if (permanent) {
      await prisma.student.delete({ where: { id } });
      return res.json({ deleted: true, archived: false, id });
    }

    // По умолчанию архивируем, чтобы сохранить целостность истории посещаемости
    const archived = await prisma.student.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json({
      deleted: false,
      archived: true,
      student: archived,
      preservedRecords: existing._count.attendances,
    });
  }),
);
