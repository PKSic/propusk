import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { summarizeLessonAttendances, type AttendanceStatusValue } from '../services/attendanceCalculator.js';
import {
  findCoveringCertificatesMap,
  isMissedStatus,
  resolveAttendanceExcusedState,
} from '../services/certificateSync.js';
import { formatDateOnly, parseDateOnly } from '../utils/dateRange.js';

export const attendanceRouter = Router();

const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'HALF_ABSENT', 'UNMARKED']);

const upsertLessonAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.number().int().positive(),
        status: attendanceStatusEnum,
        isExcused: z.boolean().optional(),
      }),
    )
    .min(1, 'Список записей посещаемости не может быть пустым'),
});

const toggleExcusedSchema = z.object({
  isExcused: z.boolean(),
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
        certificate: {
          select: { id: true, type: true, reason: true, documentNumber: true },
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
        isExcused: r.isExcused,
        certificateId: r.certificateId,
        certificate: r.certificate,
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
    const dedupedMap = new Map<number, { status: AttendanceStatusValue; isExcused?: boolean }>();
    for (const r of body.records) {
      dedupedMap.set(r.studentId, { status: r.status, isExcused: r.isExcused });
    }

    const updatedRecords = await prisma.$transaction(async (tx) => {
      const [coveringMap, existingAttendances] = await Promise.all([
        findCoveringCertificatesMap(tx, studentIds, lesson.date),
        tx.attendance.findMany({
          where: { lessonId, studentId: { in: studentIds } },
          select: { studentId: true, isExcused: true, certificateId: true },
        }),
      ]);

      const previousMap = new Map(existingAttendances.map((a) => [a.studentId, a]));

      for (const [studentId, entry] of dedupedMap.entries()) {
        const prev = previousMap.get(studentId);
        const resolved = resolveAttendanceExcusedState({
          status: entry.status,
          explicitIsExcused: entry.isExcused,
          coveringCertificateId: coveringMap.get(studentId) ?? null,
          previousIsExcused: prev?.isExcused,
          previousCertificateId: prev?.certificateId,
        });

        await tx.attendance.upsert({
          where: {
            lessonId_studentId: { lessonId, studentId },
          },
          update: {
            status: entry.status,
            isExcused: resolved.isExcused,
            certificateId: resolved.certificateId,
          },
          create: {
            lessonId,
            studentId,
            status: entry.status,
            isExcused: resolved.isExcused,
            certificateId: resolved.certificateId,
          },
        });
      }

      return tx.attendance.findMany({
        where: { lessonId },
        include: {
          student: { select: { id: true, fullName: true, isActive: true } },
          certificate: { select: { id: true, type: true, reason: true, documentNumber: true } },
        },
        orderBy: { student: { fullName: 'asc' } },
      });
    });

    const summary = summarizeLessonAttendances(
      updatedRecords.map((r) => ({
        status: r.status as AttendanceStatusValue,
        isExcused: r.isExcused,
      })),
    );

    res.json({
      lessonId,
      ...summary,
      attendances: updatedRecords,
    });
  }),
);

/**
 * Переключение признака уважительного пропуска (уваж./неуваж.) для конкретной отметки.
 */
attendanceRouter.patch(
  '/:id/excused',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID записи посещаемости');
    }

    const body = toggleExcusedSchema.parse(req.body);

    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { lesson: { select: { date: true } } },
    });
    if (!existing) {
      throw new AppError(404, 'Запись посещаемости не найдена');
    }
    if (!isMissedStatus(existing.status as AttendanceStatusValue)) {
      throw new AppError(400, 'Отметку уважительной причины можно ставить только на пропуск');
    }

    const updated = await prisma.$transaction(async (tx) => {
      let certificateId: number | null = null;
      if (body.isExcused) {
        const covering = await findCoveringCertificatesMap(
          tx,
          [existing.studentId],
          existing.lesson.date,
        );
        certificateId = covering.get(existing.studentId) ?? null;
      }

      return tx.attendance.update({
        where: { id },
        data: {
          isExcused: body.isExcused,
          certificateId,
        },
        include: {
          student: { select: { id: true, fullName: true, isActive: true } },
          certificate: { select: { id: true, type: true, reason: true, documentNumber: true } },
        },
      });
    });

    res.json({ attendance: updated });
  }),
);
