import { prisma } from '../lib/prisma.js';
import {
  calculateStatsFromRecords,
  getMissedHoursForStatus,
  summarizeLessonAttendances,
  type AttendanceStatusValue,
} from './attendanceCalculator.js';
import {
  formatDateOnly,
  getCustomRange,
  getMonthRange,
  getTodayRange,
  getWeekRange,
  type DateRange,
} from '../utils/dateRange.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getDashboardStatistics(referenceDate: Date = new Date()) {
  const weekRange = getWeekRange(referenceDate);
  const monthRange = getMonthRange(referenceDate);

  const [
    totalStudents,
    lessonsThisMonth,
    weekAttendances,
    monthAttendances,
    recentLessonsRaw,
    activeStudents,
    chartLessonsRaw,
  ] = await Promise.all([
    prisma.student.count({ where: { isActive: true } }),
    prisma.lesson.count({
      where: {
        date: { gte: monthRange.from, lte: monthRange.to },
      },
    }),
    prisma.attendance.findMany({
      where: {
        lesson: { date: { gte: weekRange.from, lte: weekRange.to } },
      },
      select: { status: true, isExcused: true },
    }),
    prisma.attendance.findMany({
      where: {
        lesson: { date: { gte: monthRange.from, lte: monthRange.to } },
      },
      select: { status: true, isExcused: true },
    }),
    prisma.lesson.findMany({
      take: 5,
      orderBy: [{ date: 'desc' }, { lessonNumber: 'desc' }, { id: 'desc' }],
      include: {
        subject: { select: { id: true, name: true } },
        attendances: { select: { status: true, isExcused: true } },
      },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      include: {
        attendances: {
          include: {
            lesson: { select: { date: true } },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: {
        date: {
          gte: new Date(
            Date.UTC(
              referenceDate.getUTCFullYear(),
              referenceDate.getUTCMonth(),
              referenceDate.getUTCDate() - 29,
            ),
          ),
          lte: monthRange.to,
        },
      },
      orderBy: [{ date: 'asc' }, { lessonNumber: 'asc' }],
      include: {
        attendances: { select: { status: true, isExcused: true } },
      },
    }),
  ]);

  const weekSummary = calculateStatsFromRecords(
    weekAttendances.map((a) => ({
      status: a.status as AttendanceStatusValue,
      isExcused: a.isExcused,
    })),
  );

  const monthSummary = calculateStatsFromRecords(
    monthAttendances.map((a) => ({
      status: a.status as AttendanceStatusValue,
      isExcused: a.isExcused,
    })),
  );

  const missedHoursThisWeek = weekSummary.missedHours;
  const missedHoursThisMonth = monthSummary.missedHours;

  const recentLessons = recentLessonsRaw.map((lesson) => {
    const summary = summarizeLessonAttendances(
      lesson.attendances.map((a) => ({
        status: a.status as AttendanceStatusValue,
        isExcused: a.isExcused,
      })),
    );
    return {
      id: lesson.id,
      date: formatDateOnly(lesson.date),
      lessonNumber: lesson.lessonNumber,
      subject: lesson.subject,
      ...summary,
    };
  });

  const topAbsentees = activeStudents
    .map((student) => {
      const allStats = calculateStatsFromRecords(
        student.attendances.map((a) => ({
          status: a.status as AttendanceStatusValue,
          isExcused: a.isExcused,
        })),
      );
      const monthStats = calculateStatsFromRecords(
        student.attendances
          .filter(
            (a) =>
              a.lesson.date >= monthRange.from && a.lesson.date <= monthRange.to,
          )
          .map((a) => ({
            status: a.status as AttendanceStatusValue,
            isExcused: a.isExcused,
          })),
      );
      return {
        id: student.id,
        fullName: student.fullName,
        missedHours: allStats.missedHours,
        excusedMissedHours: allStats.excusedMissedHours,
        unexcusedMissedHours: allStats.unexcusedMissedHours,
        missedHoursThisMonth: monthStats.missedHours,
        absentCount: allStats.absentCount,
        halfAbsentCount: allStats.halfAbsentCount,
        attendanceRate: allStats.attendanceRate,
      };
    })
    .sort((a, b) => b.missedHours - a.missedHours || a.fullName.localeCompare(b.fullName, 'ru'))
    .slice(0, 8);

  const dailyMap = new Map<
    string,
    {
      date: string;
      missedHours: number;
      excusedMissedHours: number;
      unexcusedMissedHours: number;
      presentCount: number;
      absentCount: number;
      halfAbsentCount: number;
    }
  >();

  for (const lesson of chartLessonsRaw) {
    const dateKey = formatDateOnly(lesson.date);
    const existing = dailyMap.get(dateKey) ?? {
      date: dateKey,
      missedHours: 0,
      excusedMissedHours: 0,
      unexcusedMissedHours: 0,
      presentCount: 0,
      absentCount: 0,
      halfAbsentCount: 0,
    };
    const summary = summarizeLessonAttendances(
      lesson.attendances.map((a) => ({
        status: a.status as AttendanceStatusValue,
        isExcused: a.isExcused,
      })),
    );
    existing.missedHours += summary.missedHours;
    existing.excusedMissedHours += summary.excusedMissedHours;
    existing.unexcusedMissedHours += summary.unexcusedMissedHours;
    existing.presentCount += summary.presentCount;
    existing.absentCount += summary.absentCount;
    existing.halfAbsentCount += summary.halfAbsentCount;
    dailyMap.set(dateKey, existing);
  }

  const dailyChart = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    kpi: {
      totalStudents,
      lessonsThisMonth,
      missedHoursThisWeek,
      excusedHoursThisWeek: weekSummary.excusedMissedHours,
      unexcusedHoursThisWeek: weekSummary.unexcusedMissedHours,
      missedHoursThisMonth,
      excusedHoursThisMonth: monthSummary.excusedMissedHours,
      unexcusedHoursThisMonth: monthSummary.unexcusedMissedHours,
      weekRange: { from: weekRange.fromStr, to: weekRange.toStr },
      monthRange: { from: monthRange.fromStr, to: monthRange.toStr },
    },
    recentLessons,
    topAbsentees,
    dailyChart,
  };
}

export async function getStudentStatistics(
  studentId: number,
  customFrom?: string,
  customTo?: string,
  referenceDate: Date = new Date(),
) {
  const [student, certificates] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        attendances: {
          include: {
            lesson: {
              include: {
                subject: { select: { id: true, name: true } },
              },
            },
            certificate: {
              select: {
                id: true,
                type: true,
                reason: true,
                dateFrom: true,
                dateTo: true,
                documentNumber: true,
              },
            },
          },
          orderBy: [
            { lesson: { date: 'desc' } },
            { lesson: { lessonNumber: 'desc' } },
          ],
        },
      },
    }),
    prisma.certificate.findMany({
      where: { studentId },
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
      },
    }),
  ]);

  if (!student) {
    throw new AppError(404, 'Студент не найден');
  }

  const todayRange = getTodayRange(referenceDate);
  const weekRange = getWeekRange(referenceDate);
  const monthRange = getMonthRange(referenceDate);
  let customRange: DateRange | null = null;
  if (customFrom && customTo) {
    customRange = getCustomRange(customFrom, customTo);
  }

  const filterByRange = (range: DateRange) =>
    student.attendances
      .filter((a) => a.lesson.date >= range.from && a.lesson.date <= range.to)
      .map((a) => ({
        status: a.status as AttendanceStatusValue,
        isExcused: a.isExcused,
      }));

  const todayStats = calculateStatsFromRecords(filterByRange(todayRange));
  const weekStats = calculateStatsFromRecords(filterByRange(weekRange));
  const monthStats = calculateStatsFromRecords(filterByRange(monthRange));
  const allStats = calculateStatsFromRecords(
    student.attendances.map((a) => ({
      status: a.status as AttendanceStatusValue,
      isExcused: a.isExcused,
    })),
  );
  const customStats = customRange
    ? calculateStatsFromRecords(filterByRange(customRange))
    : null;

  const history = student.attendances.map((a) => ({
    id: a.id,
    lessonId: a.lessonId,
    date: formatDateOnly(a.lesson.date),
    lessonNumber: a.lesson.lessonNumber,
    subject: a.lesson.subject,
    status: a.status as AttendanceStatusValue,
    isExcused: a.isExcused,
    certificateId: a.certificateId,
    certificate: a.certificate
      ? {
          id: a.certificate.id,
          type: a.certificate.type,
          reason: a.certificate.reason,
          dateFrom: formatDateOnly(a.certificate.dateFrom),
          dateTo: formatDateOnly(a.certificate.dateTo),
          documentNumber: a.certificate.documentNumber,
        }
      : null,
    missedHours: getMissedHoursForStatus(a.status as AttendanceStatusValue),
  }));

  const absencesHistory = history.filter(
    (item) => item.status === 'ABSENT' || item.status === 'HALF_ABSENT',
  );

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      isActive: student.isActive,
      createdAt: student.createdAt,
    },
    periods: {
      today: { range: { from: todayRange.fromStr, to: todayRange.toStr }, ...todayStats },
      week: { range: { from: weekRange.fromStr, to: weekRange.toStr }, ...weekStats },
      month: { range: { from: monthRange.fromStr, to: monthRange.toStr }, ...monthStats },
      all: allStats,
      custom: customRange && customStats
        ? { range: { from: customRange.fromStr, to: customRange.toStr }, ...customStats }
        : null,
    },
    history,
    absencesHistory,
    certificates: certificates.map((c) => ({
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
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  };
}

export async function getPeriodStatistics(range: DateRange) {
  const [lessons, students] = await Promise.all([
    prisma.lesson.findMany({
      where: { date: { gte: range.from, lte: range.to } },
      orderBy: [{ date: 'asc' }, { lessonNumber: 'asc' }],
      include: {
        subject: { select: { id: true, name: true } },
        attendances: {
          include: { student: { select: { id: true, fullName: true, isActive: true } } },
        },
      },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  const allRecords = lessons.flatMap((l) =>
    l.attendances.map((a) => ({
      status: a.status as AttendanceStatusValue,
      isExcused: a.isExcused,
    })),
  );
  const overall = calculateStatsFromRecords(allRecords);

  const byStudent = students.map((student) => {
    const records = lessons.flatMap((l) =>
      l.attendances
        .filter((a) => a.studentId === student.id)
        .map((a) => ({
          status: a.status as AttendanceStatusValue,
          isExcused: a.isExcused,
        })),
    );
    return {
      studentId: student.id,
      fullName: student.fullName,
      ...calculateStatsFromRecords(records),
    };
  });

  return {
    range: { from: range.fromStr, to: range.toStr },
    lessonsCount: lessons.length,
    overall,
    byStudent,
  };
}
