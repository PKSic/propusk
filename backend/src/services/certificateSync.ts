import type { Prisma } from '@prisma/client';
import type { AttendanceStatusValue } from './attendanceCalculator.js';

export function isMissedStatus(status: AttendanceStatusValue): boolean {
  return status === 'ABSENT' || status === 'HALF_ABSENT';
}

/**
 * Возвращает карту studentId -> certificateId для студентов, у которых есть справка на указанную дату.
 */
export async function findCoveringCertificatesMap(
  tx: Prisma.TransactionClient,
  studentIds: number[],
  lessonDate: Date,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (studentIds.length === 0) return result;

  const certificates = await tx.certificate.findMany({
    where: {
      studentId: { in: studentIds },
      dateFrom: { lte: lessonDate },
      dateTo: { gte: lessonDate },
    },
    select: { id: true, studentId: true },
    orderBy: { id: 'desc' },
  });

  for (const cert of certificates) {
    if (!result.has(cert.studentId)) {
      result.set(cert.studentId, cert.id);
    }
  }
  return result;
}

/**
 * Вычисляет итоговые значения isExcused и certificateId для записи посещаемости при сохранении занятия.
 */
export function resolveAttendanceExcusedState(options: {
  status: AttendanceStatusValue;
  explicitIsExcused?: boolean;
  coveringCertificateId: number | null;
  previousIsExcused?: boolean;
  previousCertificateId?: number | null;
}): { isExcused: boolean; certificateId: number | null } {
  if (!isMissedStatus(options.status)) {
    return { isExcused: false, certificateId: null };
  }

  if (options.explicitIsExcused !== undefined) {
    return {
      isExcused: options.explicitIsExcused,
      certificateId: options.explicitIsExcused ? options.coveringCertificateId : null,
    };
  }

  if (options.coveringCertificateId !== null) {
    return {
      isExcused: true,
      certificateId: options.coveringCertificateId,
    };
  }

  // Если привязанной справки больше нет, но ранее запись была отмечена именно по справке, сбрасываем;
  // ручную отметку уважительности (где certificateId был null) сохраняем.
  if (options.previousCertificateId != null) {
    return { isExcused: false, certificateId: null };
  }

  return {
    isExcused: options.previousIsExcused ?? false,
    certificateId: null,
  };
}

/**
 * Синхронизирует отметки уважительности пропусков студента со всеми его актуальными справками
 * в заданном (или полном) диапазоне дат. Ручные отметки уважительности без справки сохраняются.
 */
export async function reconcileStudentCertificateAttendance(
  tx: Prisma.TransactionClient,
  studentId: number,
  range?: { from: Date; to: Date },
): Promise<number> {
  const [certificates, attendances] = await Promise.all([
    tx.certificate.findMany({
      where: { studentId },
      select: { id: true, dateFrom: true, dateTo: true },
      orderBy: { id: 'desc' },
    }),
    tx.attendance.findMany({
      where: {
        studentId,
        ...(range
          ? {
              lesson: {
                date: {
                  gte: range.from,
                  lte: range.to,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        isExcused: true,
        certificateId: true,
        lesson: { select: { date: true } },
      },
    }),
  ]);

  let updatedCount = 0;

  for (const att of attendances) {
    const lessonTime = att.lesson.date.getTime();
    const missed = isMissedStatus(att.status as AttendanceStatusValue);

    let nextIsExcused = att.isExcused;
    let nextCertificateId = att.certificateId;

    if (!missed) {
      nextIsExcused = false;
      nextCertificateId = null;
    } else {
      const covering = certificates.find(
        (c) => c.dateFrom.getTime() <= lessonTime && c.dateTo.getTime() >= lessonTime,
      );
      if (covering) {
        nextIsExcused = true;
        nextCertificateId = covering.id;
      } else if (att.certificateId !== null) {
        nextIsExcused = false;
        nextCertificateId = null;
      }
    }

    if (nextIsExcused !== att.isExcused || nextCertificateId !== att.certificateId) {
      await tx.attendance.update({
        where: { id: att.id },
        data: {
          isExcused: nextIsExcused,
          certificateId: nextCertificateId,
        },
      });
      updatedCount += 1;
    }
  }

  return updatedCount;
}
