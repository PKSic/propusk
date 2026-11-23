import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { summarizeLessonAttendances, type AttendanceStatusValue } from '../services/attendanceCalculator.js';
import { formatDateOnly, parseDateOnly } from '../utils/dateRange.js';

export const attendanceRouter = Router();

const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'HALF_ABSENT', 'UNMARKED']);

const upsertLessonAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: attendanceStatusEnum,
      }),
    )
    .min(1, 'Список записей посещаемости не может быть пустым'),
});

attendanceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lessonId = req.query.lessonId ? Number(req.query.lessonId) : undefined;
    const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
    const fromStr = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toStr = typeof req.query.to === 'string' ? req.query.to : undefined;

    const where: Record<string, unknown> = {};
    if (lessonId && Number.isInteger(lessonId)) where.lessonId = lessonId;
    if (studentId && Number.isInteger(studentId)) where.studentId = studentId;
    if (fromStr || toStr) {
      where.lesson = {
        date: {
          ...(fromStr ? { gte: parseDateOnly(fromStr) } : {}),
          ...(toStr ? { lte: parseDateOnly(toStr) } : {}),
        },
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, isActive: true } },
        lesson: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ lesson: { date: 'desc' } }, { student: { fullName: 'asc' } }],
    });

    res.json({
      records: records.map((r) => ({
        id: r.id,
        lessonId: r.lessonId,
        studentId: r.studentId,
        status: r.status,
        student: r.student,
        lesson: {
          id: r.lesson.id,
          date: formatDateOnly(r.lesson.date),
          lessonNumber: r.lesson.lessonNumber,
          subject: r.lesson.subject,
        },
      })),
    });
  }),
);

/**
 * Атомарное сохранение/обновление посещаемости занятия без создания дубликатов.
 */
attendanceRouter.put(
  '/lesson/:lessonId',
  asyncHandler(async (req, res) => {
    const lessonId = Number(req.params.lessonId);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      throw new AppError(400, 'Некорректный ID занятия');
    }

    const body = upsertLessonAttendanceSchema.parse(req.body);

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new AppError(404, 'Занятие не найдено');
    }

    const studentIds = [...new Set(body.records.map((r) => r.studentId))];
    const existingStudents = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true },
    });

    if (existingStudents.length !== studentIds.length) {
      throw new AppError(400, 'Один или несколько указанных студентов не существуют');
    }

    // Дедуплицируем входные записи по studentId (берём последнее значение)
    const dedupedMap = new Map<number, AttendanceStatusValue>();
    for (const r of body.records) {
      dedupedMap.set(r.studentId, r.status);
    }

    const updatedRecords = await prisma.$transaction(async (tx) => {
      for (const [studentId, status] of dedupedMap.entries()) {
        await tx.attendance.upsert({
          where: {
            lessonId_studentId: { lessonId, studentId },
          },
          update: { status },
          create: { lessonId, studentId, status },
        });
      }

      return tx.attendance.findMany({
        where: { lessonId },
        include: {
          student: { select: { id: true, fullName: true, isActive: true } },
        },
        orderBy: { student: { fullName: 'asc' } },
      });
    });

    const summary = summarizeLessonAttendances(
      updatedRecords.map((r) => ({ status: r.status as AttendanceStatusValue })),
    );

    res.json({
      lessonId,
      ...summary,
      attendances: updatedRecords,
    });
  }),
);
