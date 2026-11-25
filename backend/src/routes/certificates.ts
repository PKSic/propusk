import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { formatDateOnly, parseDateOnly } from '../utils/dateRange.js';
import { getMissedHoursForStatus, type AttendanceStatusValue } from '../services/attendanceCalculator.js';
import { reconcileStudentCertificateAttendance } from '../services/certificateSync.js';

export const certificatesRouter = Router();

const certificateTypeEnum = z.enum(['MEDICAL', 'EXEMPTION', 'FAMILY', 'OTHER']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATA_URL_IMAGE_REGEX = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_PHOTO_DATA_LENGTH = 2_500_000;

function parsePhotoPayload(raw: string | null | undefined): {
  provided: boolean;
  photoData: string | null;
  photoMimeType: string | null;
} {
  if (raw === undefined) {
    return { provided: false, photoData: null, photoMimeType: null };
  }
  if (raw === null || raw.trim() === '') {
    return { provided: true, photoData: null, photoMimeType: null };
  }
  const trimmed = raw.trim();
  if (trimmed.length > MAX_PHOTO_DATA_LENGTH) {
    throw new AppError(400, 'Фотография после сжатия слишком большая (макс. 1.8 МБ)');
  }
  const match = DATA_URL_IMAGE_REGEX.exec(trimmed);
  if (!match) {
    throw new AppError(400, 'Поддерживаются только изображения JPEG, PNG или WebP');
  }
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const base64Clean = match[2].replace(/\s+/g, '');
  return {
    provided: true,
    photoData: `data:${mimeType};base64,${base64Clean}`,
    photoMimeType: mimeType,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseValidatedDatePair(dateFromStr: string, dateToStr: string) {
  let from: Date;
  let to: Date;
  try {
    from = parseDateOnly(dateFromStr);
    to = parseDateOnly(dateToStr);
  } catch (err) {
    throw new AppError(400, err instanceof Error ? err.message : 'Некорректная дата');
  }
  if (from.getTime() > to.getTime()) {
    throw new AppError(400, 'Дата начала действия справки не может быть позже даты окончания');
  }
  return { from, to };
}

function serializeCertificate(c: {
  id: number;
  studentId: number;
  dateFrom: Date;
  dateTo: Date;
  reason: string;
  type: string;
  documentNumber: string | null;
  comment: string | null;
  photoMimeType: string | null;
  createdAt: Date;
  updatedAt: Date;
  student: { id: number; fullName: string; isActive: boolean };
  attendances?: Array<{ status: string }>;
}) {
  const coveredLessonsCount = c.attendances?.length ?? 0;
  const coveredHours = (c.attendances ?? []).reduce(
    (sum, a) => sum + getMissedHoursForStatus(a.status as AttendanceStatusValue),
    0,
  );
  return {
    id: c.id,
    studentId: c.studentId,
    dateFrom: formatDateOnly(c.dateFrom),
    dateTo: formatDateOnly(c.dateTo),
    reason: c.reason,
    type: c.type,
    documentNumber: c.documentNumber,
    comment: c.comment,
    hasPhoto: Boolean(c.photoMimeType),
    photoMimeType: c.photoMimeType,
    coveredLessonsCount,
    coveredHours,
    student: c.student,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const createCertificateSchema = z.object({
  studentId: z.number().int().positive('Выберите студента'),
  dateFrom: z.string().regex(DATE_REGEX, 'Ожидается дата начала в формате YYYY-MM-DD'),
  dateTo: z.string().regex(DATE_REGEX, 'Ожидается дата окончания в формате YYYY-MM-DD'),
  reason: z.string().trim().min(2, 'Причина должна содержать минимум 2 символа').max(500),
  type: certificateTypeEnum.optional().default('MEDICAL'),
  documentNumber: z.string().trim().max(100).optional().nullable(),
  comment: z.string().trim().max(1000).optional().nullable(),
  photoData: z.string().optional().nullable(),
});

const updateCertificateSchema = z.object({
  studentId: z.number().int().positive('Выберите студента').optional(),
  dateFrom: z.string().regex(DATE_REGEX, 'Ожидается дата начала в формате YYYY-MM-DD').optional(),
  dateTo: z.string().regex(DATE_REGEX, 'Ожидается дата окончания в формате YYYY-MM-DD').optional(),
  reason: z.string().trim().min(2, 'Причина должна содержать минимум 2 символа').max(500).optional(),
  type: certificateTypeEnum.optional(),
  documentNumber: z.string().trim().max(100).optional().nullable(),
  comment: z.string().trim().max(1000).optional().nullable(),
  photoData: z.string().optional().nullable(),
});

certificatesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const fromStr = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toStr = typeof req.query.to === 'string' ? req.query.to : undefined;

    const where: Record<string, unknown> = {};
    if (studentId && Number.isInteger(studentId)) where.studentId = studentId;
    if (type && certificateTypeEnum.safeParse(type).success) where.type = type;
    if (fromStr) where.dateTo = { gte: parseDateOnly(fromStr) };
    if (toStr) where.dateFrom = { lte: parseDateOnly(toStr) };
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      orderBy: [{ dateFrom: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        studentId: true,
        dateFrom: true,
        dateTo: true,
        reason: true,
        type: true,
        documentNumber: true,
        comment: true,
        photoMimeType: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { id: true, fullName: true, isActive: true } },
        attendances: { select: { status: true } },
      },
    });

    res.json({
      certificates: certificates.map(serializeCertificate),
    });
  }),
);

certificatesRouter.get(
  '/preview-impact',
  asyncHandler(async (req, res) => {
    const studentId = Number(req.query.studentId);
    const dateFromStr = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
    const dateToStr = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';

    if (!Number.isInteger(studentId) || studentId <= 0 || !DATE_REGEX.test(dateFromStr) || !DATE_REGEX.test(dateToStr)) {
      throw new AppError(400, 'Укажите корректного студента и диапазон дат');
    }

    const { from, to } = parseValidatedDatePair(dateFromStr, dateToStr);
    const absences = await prisma.attendance.findMany({
      where: {
        studentId,
        status: { in: ['ABSENT', 'HALF_ABSENT'] },
        lesson: { date: { gte: from, lte: to } },
      },
      select: { status: true },
    });

    const missedHours = absences.reduce(
      (sum, a) => sum + getMissedHoursForStatus(a.status as AttendanceStatusValue),
      0,
    );

    res.json({
      lessonsCount: absences.length,
      missedHours,
    });
  }),
);

certificatesRouter.get(
  '/:id/photo',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID справки');
    }

    const cert = await prisma.certificate.findUnique({
      where: { id },
      select: { photoData: true, photoMimeType: true },
    });

    if (!cert || !cert.photoData) {
      throw new AppError(404, 'Фотография к справке не прикреплена');
    }

    const match = DATA_URL_IMAGE_REGEX.exec(cert.photoData);
    if (!match) {
      throw new AppError(500, 'Повреждённый формат изображения');
    }

    const mimeType = cert.photoMimeType || match[1];
    const buffer = Buffer.from(match[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buffer);
  }),
);

certificatesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createCertificateSchema.parse(req.body);
    const { from, to } = parseValidatedDatePair(body.dateFrom, body.dateTo);
    const photo = parsePhotoPayload(body.photoData);

    const student = await prisma.student.findUnique({ where: { id: body.studentId } });
    if (!student) {
      throw new AppError(404, 'Указанный студент не найден');
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.certificate.create({
        data: {
          studentId: body.studentId,
          dateFrom: from,
          dateTo: to,
          reason: body.reason,
          type: body.type,
          documentNumber: normalizeOptionalText(body.documentNumber) ?? null,
          comment: normalizeOptionalText(body.comment) ?? null,
          photoData: photo.provided ? photo.photoData : null,
          photoMimeType: photo.provided ? photo.photoMimeType : null,
        },
      });

      const linkedUpdatedCount = await reconcileStudentCertificateAttendance(tx, body.studentId, {
        from,
        to,
      });

      const full = await tx.certificate.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          studentId: true,
          dateFrom: true,
          dateTo: true,
          reason: true,
          type: true,
          documentNumber: true,
          comment: true,
          photoMimeType: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { id: true, fullName: true, isActive: true } },
          attendances: { select: { status: true } },
        },
      });

      return { certificate: serializeCertificate(full), linkedUpdatedCount };
    });

    res.status(201).json(result);
  }),
);

certificatesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID справки');
    }

    const existing = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true, studentId: true, dateFrom: true, dateTo: true },
    });
    if (!existing) {
      throw new AppError(404, 'Справка не найдена');
    }

    const body = updateCertificateSchema.parse(req.body);
    const nextStudentId = body.studentId ?? existing.studentId;
    const nextFromStr = body.dateFrom ?? formatDateOnly(existing.dateFrom);
    const nextToStr = body.dateTo ?? formatDateOnly(existing.dateTo);
    const { from: nextFrom, to: nextTo } = parseValidatedDatePair(nextFromStr, nextToStr);
    const photo = parsePhotoPayload(body.photoData);

    if (body.studentId && body.studentId !== existing.studentId) {
      const student = await prisma.student.findUnique({ where: { id: body.studentId } });
      if (!student) {
        throw new AppError(404, 'Указанный студент не найден');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { id },
        data: {
          studentId: nextStudentId,
          dateFrom: nextFrom,
          dateTo: nextTo,
          ...(body.reason !== undefined ? { reason: body.reason } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.documentNumber !== undefined
            ? { documentNumber: normalizeOptionalText(body.documentNumber) ?? null }
            : {}),
          ...(body.comment !== undefined
            ? { comment: normalizeOptionalText(body.comment) ?? null }
            : {}),
          ...(photo.provided
            ? { photoData: photo.photoData, photoMimeType: photo.photoMimeType }
            : {}),
        },
      });

      let linkedUpdatedCount = 0;
      if (nextStudentId !== existing.studentId) {
        linkedUpdatedCount += await reconcileStudentCertificateAttendance(tx, existing.studentId, {
          from: existing.dateFrom,
          to: existing.dateTo,
        });
        linkedUpdatedCount += await reconcileStudentCertificateAttendance(tx, nextStudentId, {
          from: nextFrom,
          to: nextTo,
        });
      } else {
        const unionFrom =
          existing.dateFrom.getTime() < nextFrom.getTime() ? existing.dateFrom : nextFrom;
        const unionTo =
          existing.dateTo.getTime() > nextTo.getTime() ? existing.dateTo : nextTo;
        linkedUpdatedCount = await reconcileStudentCertificateAttendance(tx, nextStudentId, {
          from: unionFrom,
          to: unionTo,
        });
      }

      const full = await tx.certificate.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          studentId: true,
          dateFrom: true,
          dateTo: true,
          reason: true,
          type: true,
          documentNumber: true,
          comment: true,
          photoMimeType: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { id: true, fullName: true, isActive: true } },
          attendances: { select: { status: true } },
        },
      });

      return { certificate: serializeCertificate(full), linkedUpdatedCount };
    });

    res.json(result);
  }),
);

certificatesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'Некорректный ID справки');
    }

    const existing = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true, studentId: true, dateFrom: true, dateTo: true },
    });
    if (!existing) {
      throw new AppError(404, 'Справка не найдена');
    }

    await prisma.$transaction(async (tx) => {
      // Сначала явно сбрасываем привязку и уважительность у записей этой справки,
      // чтобы удаление не оставило устаревший isExcused = true, и затем перепроверяем на случай перекрывающихся справок.
      await tx.attendance.updateMany({
        where: { certificateId: id },
        data: { isExcused: false, certificateId: null },
      });

      await tx.certificate.delete({ where: { id } });

      await reconcileStudentCertificateAttendance(tx, existing.studentId, {
        from: existing.dateFrom,
        to: existing.dateTo,
      });
    });

    res.json({ deleted: true, id });
  }),
);
