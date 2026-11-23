import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { summarizeLessonAttendances, type AttendanceStatusValue } from '../services/attendanceCalculator.js';
import { formatDateOnly, parseDateOnly } from '../utils/dateRange.js';

export const lessonsRouter = Router();

const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'HALF_ABSENT', 'UNMARKED']);

const createLessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ожидается дата в формате YYYY-MM-DD'),
  subjectId: z.number().int().positive(),
  lessonNumber: z.number().int().min(1, 'Номер пары от 1 до 8').max(8, 'Номер пары от 1 до 8'),
  records: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: attendanceStatusEnum,
      }),
    )
    .optional(),
});

const updateLessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ожидается дата в формате YYYY-MM-DD').optional(),
  subjectId: z.number().int().positive().optional(),
  lessonNumber: z.number().int().min(1).max(8).optional(),
});

lessonsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const fromStr = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toStr = typeof req.query.to === 'string' ? req.query.to : undefined;
    const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
    const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
    const lessonNumber = req.query.lessonNumber ? Number(req.query.lessonNumber) : undefined;

    const where: Record<string, unknown> = {};

    if (dateStr) {
      where.date = parseDateOnly(dateStr);
    } else if (fromStr || toStr) {
      where.date = {
        ...(fromStr ? { gte: parseDateOnly(fromStr) } : {}),
        ...(toStr ? { lte: parseDateOnly(toStr) } : {}),
      };
    }

    if (subjectId && Number.isInteger(subjectId)) {
      where.subjectId = subjectId;
    }

    if (lessonNumber && Number.isInteger(lessonNumber)) {
      where.lessonNumber = lessonNumber;
    }

    if (studentId && Number.isInteger(studentId)) {
      where.attendances = {
        some: { studentId },
      };
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [{ date: 'desc' }, { lessonNumber: 'desc' }, { id: 'desc' }],
      include: {
        subject: { select: { id: true, name: true, isActive: true } },
        attendances: {
          select: { studentId: true, status: true },
        },
      },
    });

    res.json({
      lessons: lessons.map((lesson) => {
        const summary = summarizeLessonAttendances(
          lesson.attendances.map((a) => ({ status: a.status as AttendanceStatusValue })),
        );
        return {
          id: lesson.id,
          date: formatDateOnly(lesson.date),
          subjectId: lesson.subjectId,
          lessonNumber: lesson.lessonNumber,
          subject: lesson.subject,
          ...summary,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        };
      }),
    });
  }),
);

lessonsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createLessonSchema.parse(req.body);
    const parsedDate = parseDateOnly(body.date);

    const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
    if (!subject) {
      throw new AppError(404, 'Указанный предмет не найден');
    }

    const existing = await prisma.lesson.findUnique({
      where: {
        date_subjectId_lessonNumber: {
          date: parsedDate,
          subjectId: body.subjectId,
          lessonNumber: body.lessonNumber,
        },
      },
    });

    if (existing) {
      throw new AppError(
        409,
        'Занятие с такой датой, предметом и номером пары уже существует',
        { existingLessonId: existing.id },
      );
    }

    if (body.records && body.records.length > 0) {
      const studentIds = [...new Set(body.records.map((r) => r.studentId))];
      const foundStudents = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      });
      if (foundStudents.length !== studentIds.length) {
        throw new AppError(400, 'Один или несколько указанных студентов не найдены');
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          date: parsedDate,
          subjectId: body.subjectId,
          lessonNumber: body.lessonNumber,
        },
      });

      if (body.records && body.records.length > 0) {
        await tx.attendance.createMany({
          data: body.records.map((r) => ({
            lessonId: lesson.id,
            studentId: r.studentId,
            status: r.status,
          })),
        });
      }

      return tx.lesson.findUniqueOrThrow({
        where: { id: lesson.id },
        include: {
          subject: { select: { id: true, name: true } },
          attendances: {
            include: { student: { select: { id: true, fullName: true, isActive: true } } },
          },
        },
      });
    });

    res.status(201).json({
      lesson: {
        id: created.id,
        date: formatDateOnly(created.date),
        subjectId: created.subjectId,
        lessonNumber: created.lessonNumber,
        subject: created.subject,
        attendances: created.attendances,
      },
    });
  }),
);

lessonsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID занятия');
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, isActive: true } },
        attendances: {
          include: {
            student: { select: { id: true, fullName: true, isActive: true } },
          },
          orderBy: { student: { fullName: 'asc' } },
        },
      },
    });

    if (!lesson) {
      throw new AppError(404, 'Занятие не найдено');
    }

    const summary = summarizeLessonAttendances(
      lesson.attendances.map((a) => ({ status: a.status as AttendanceStatusValue })),
    );

    res.json({
      lesson: {
        id: lesson.id,
        date: formatDateOnly(lesson.date),
        subjectId: lesson.subjectId,
        lessonNumber: lesson.lessonNumber,
        subject: lesson.subject,
        ...summary,
        attendances: lesson.attendances,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      },
    });
  }),
);

lessonsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID занятия');
    }

    const body = updateLessonSchema.parse(req.body);
    const existing = await prisma.lesson.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Занятие не найдено');
    }

    const nextDate = body.date ? parseDateOnly(body.date) : existing.date;
    const nextSubjectId = body.subjectId ?? existing.subjectId;
    const nextLessonNumber = body.lessonNumber ?? existing.lessonNumber;

    if (body.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
      if (!subject) {
        throw new AppError(404, 'Указанный предмет не найден');
      }
    }

    const duplicate = await prisma.lesson.findUnique({
      where: {
        date_subjectId_lessonNumber: {
          date: nextDate,
          subjectId: nextSubjectId,
          lessonNumber: nextLessonNumber,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new AppError(
        409,
        'Другое занятие с такой датой, предметом и номером пары уже существует',
        { existingLessonId: duplicate.id },
      );
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        date: nextDate,
        subjectId: nextSubjectId,
        lessonNumber: nextLessonNumber,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    res.json({
      lesson: {
        id: updated.id,
        date: formatDateOnly(updated.date),
        subjectId: updated.subjectId,
        lessonNumber: updated.lessonNumber,
        subject: updated.subject,
      },
    });
  }),
);

lessonsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID занятия');
    }

    const existing = await prisma.lesson.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'Занятие не найдено');
    }

    await prisma.lesson.delete({ where: { id } });
    res.json({ deleted: true, id });
  }),
);
