export type AttendanceStatusValue = 'PRESENT' | 'ABSENT' | 'HALF_ABSENT' | 'UNMARKED';

export interface AttendanceRecordLike {
  status: AttendanceStatusValue;
  isExcused?: boolean;
}

export interface StudentAttendanceStats {
  presentCount: number;
  halfAbsentCount: number;
  absentCount: number;
  unmarkedCount: number;
  markedLessonsCount: number;
  missedHours: number;
  excusedMissedHours: number;
  unexcusedMissedHours: number;
  attendanceRate: number | null;
}

export interface LessonAttendanceSummary {
  presentCount: number;
  absentCount: number;
  halfAbsentCount: number;
  unmarkedCount: number;
  missedHours: number;
  excusedMissedHours: number;
  unexcusedMissedHours: number;
}

/**
 * Правила расчёта пропущенных часов:
 * - ABSENT (Отсутствовал) = 2 часа
 * - HALF_ABSENT (Половина пары) = 1 час
 * - PRESENT (Присутствовал) = 0 часов
 * - UNMARKED (Не отмечен) = 0 часов (не учитывается как пропуск и исключается из процента посещаемости)
 */
export function getMissedHoursForStatus(status: AttendanceStatusValue): number {
  switch (status) {
    case 'ABSENT':
      return 2;
    case 'HALF_ABSENT':
      return 1;
    case 'PRESENT':
    case 'UNMARKED':
    default:
      return 0;
  }
}

/**
 * Централизованный расчёт статистики студента по массиву записей посещаемости.
 * Формула: Пропущенные часы = (Полные пропуски × 2) + (Половины пар × 1),
 * с разбивкой на уважительные (isExcused = true) и неуважительные (isExcused = false).
 * Процент посещаемости рассчитывается по фактически отмеченным занятиям:
 * ((Присутствия + 0.5 × Половины пар) / Отмеченные пары) × 100.
 */
export function calculateStatsFromRecords(
  records: readonly AttendanceRecordLike[],
): StudentAttendanceStats {
  let presentCount = 0;
  let halfAbsentCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;
  let excusedMissedHours = 0;
  let unexcusedMissedHours = 0;

  for (const record of records) {
    let recordHours = 0;
    switch (record.status) {
      case 'PRESENT':
        presentCount += 1;
        break;
      case 'HALF_ABSENT':
        halfAbsentCount += 1;
        recordHours = 1;
        break;
      case 'ABSENT':
        absentCount += 1;
        recordHours = 2;
        break;
      case 'UNMARKED':
        unmarkedCount += 1;
        break;
    }

    if (recordHours > 0) {
      if (record.isExcused) {
        excusedMissedHours += recordHours;
      } else {
        unexcusedMissedHours += recordHours;
      }
    }
  }

  const markedLessonsCount = presentCount + halfAbsentCount + absentCount;
  const missedHours = excusedMissedHours + unexcusedMissedHours;

  let attendanceRate: number | null = null;
  if (markedLessonsCount > 0) {
    const attendedEquivalent = presentCount + halfAbsentCount * 0.5;
    attendanceRate = Math.round((attendedEquivalent / markedLessonsCount) * 1000) / 10;
  }

  return {
    presentCount,
    halfAbsentCount,
    absentCount,
    unmarkedCount,
    markedLessonsCount,
    missedHours,
    excusedMissedHours,
    unexcusedMissedHours,
    attendanceRate,
  };
}

export function summarizeLessonAttendances(
  records: readonly AttendanceRecordLike[],
): LessonAttendanceSummary {
  const stats = calculateStatsFromRecords(records);
  return {
    presentCount: stats.presentCount,
    absentCount: stats.absentCount,
    halfAbsentCount: stats.halfAbsentCount,
    unmarkedCount: stats.unmarkedCount,
    missedHours: stats.missedHours,
    excusedMissedHours: stats.excusedMissedHours,
    unexcusedMissedHours: stats.unexcusedMissedHours,
  };
}
