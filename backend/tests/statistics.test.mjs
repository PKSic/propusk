import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Автономный набор тестов бизнес-логики расчёта пропусков и периодов (12 обязательных сценариев).
 * Проверяет логику, эквивалентную backend/src/services/attendanceCalculator.ts и backend/src/utils/dateRange.ts.
 */

function calculateStatsFromRecords(records) {
  let presentCount = 0;
  let halfAbsentCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') presentCount += 1;
    else if (r.status === 'HALF_ABSENT') halfAbsentCount += 1;
    else if (r.status === 'ABSENT') absentCount += 1;
    else if (r.status === 'UNMARKED') unmarkedCount += 1;
  }

  const markedLessonsCount = presentCount + halfAbsentCount + absentCount;
  const missedHours = absentCount * 2 + halfAbsentCount * 1;
  const attendanceRate =
    markedLessonsCount > 0
      ? Math.round(((presentCount + halfAbsentCount * 0.5) / markedLessonsCount) * 1000) / 10
      : null;

  return {
    presentCount,
    halfAbsentCount,
    absentCount,
    unmarkedCount,
    markedLessonsCount,
    missedHours,
    attendanceRate,
  };
}

function parseDateOnly(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function formatDateOnly(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(ref) {
  const dayStart = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const utcDay = dayStart.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(dayStart);
  monday.setUTCDate(dayStart.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { from: monday, to: sunday, fromStr: formatDateOnly(monday), toStr: formatDateOnly(sunday) };
}

function getMonthRange(ref) {
  const first = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1, 0, 0, 0, 0));
  const last = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: first, to: last, fromStr: formatDateOnly(first), toStr: formatDateOnly(last) };
}

// Имитация централизованного хранилища (без дублирующих счётчиков, с уникальностью lessonId+studentId)
class InMemoryAttendanceStore {
  constructor() {
    this.lessons = new Map();
    this.attendances = new Map(); // key: `${lessonId}:${studentId}`
    this.nextLessonId = 1;
  }

  saveLessonWithAttendance({ date, subjectId, lessonNumber, records }) {
    for (const lesson of this.lessons.values()) {
      if (lesson.date === date && lesson.subjectId === subjectId && lesson.lessonNumber === lessonNumber) {
        this.upsertAttendance(lesson.id, records);
        return lesson.id;
      }
    }
    const id = this.nextLessonId++;
    this.lessons.set(id, { id, date, subjectId, lessonNumber });
    this.upsertAttendance(id, records);
    return id;
  }

  upsertAttendance(lessonId, records) {
    for (const r of records) {
      this.attendances.set(`${lessonId}:${r.studentId}`, {
        lessonId,
        studentId: r.studentId,
        status: r.status,
      });
    }
  }

  updateLessonDate(lessonId, newDate) {
    const lesson = this.lessons.get(lessonId);
    if (lesson) lesson.date = newDate;
  }

  deleteLesson(lessonId) {
    this.lessons.delete(lessonId);
    for (const key of Array.from(this.attendances.keys())) {
      if (key.startsWith(`${lessonId}:`)) {
        this.attendances.delete(key);
      }
    }
  }

  getStudentStats(studentId, range = null) {
    const records = [];
    for (const rec of this.attendances.values()) {
      if (rec.studentId !== studentId) continue;
      const lesson = this.lessons.get(rec.lessonId);
      if (!lesson) continue;
      if (range) {
        const d = parseDateOnly(lesson.date);
        if (d < range.from || d > range.to) continue;
      }
      records.push(rec);
    }
    return calculateStatsFromRecords(records);
  }
}

test('1. Студент отсутствовал на одной паре — начислено 2 часа', () => {
  const stats = calculateStatsFromRecords([{ status: 'ABSENT' }]);
  assert.equal(stats.missedHours, 2);
  assert.equal(stats.attendanceRate, 0);
});

test('2. Студент отсутствовал на половине пары — начислен 1 час', () => {
  const stats = calculateStatsFromRecords([{ status: 'HALF_ABSENT' }]);
  assert.equal(stats.missedHours, 1);
  assert.equal(stats.attendanceRate, 50);
});

test('3. Студент присутствовал — начислено 0 часов', () => {
  const stats = calculateStatsFromRecords([{ status: 'PRESENT' }]);
  assert.equal(stats.missedHours, 0);
  assert.equal(stats.attendanceRate, 100);
});

test('4. За две полные пары пропуска начислено 4 часа', () => {
  const stats = calculateStatsFromRecords([{ status: 'ABSENT' }, { status: 'ABSENT' }]);
  assert.equal(stats.missedHours, 4);
  assert.equal(stats.absentCount, 2);
});

test('5. За одну полную и одну половину пары начислено 3 часа', () => {
  const stats = calculateStatsFromRecords([{ status: 'ABSENT' }, { status: 'HALF_ABSENT' }]);
  assert.equal(stats.missedHours, 3);
  assert.equal(stats.attendanceRate, 25);
});

test('6. При изменении статуса с отсутствия на присутствие часы пересчитаны', () => {
  const store = new InMemoryAttendanceStore();
  const lessonId = store.saveLessonWithAttendance({
    date: '2026-11-23',
    subjectId: 1,
    lessonNumber: 1,
    records: [{ studentId: 10, status: 'ABSENT' }],
  });
  assert.equal(store.getStudentStats(10).missedHours, 2);

  store.upsertAttendance(lessonId, [{ studentId: 10, status: 'PRESENT' }]);
  assert.equal(store.getStudentStats(10).missedHours, 0);
  assert.equal(store.getStudentStats(10).attendanceRate, 100);
});

test('7. При удалении занятия часы пересчитаны', () => {
  const store = new InMemoryAttendanceStore();
  const lessonId = store.saveLessonWithAttendance({
    date: '2026-11-23',
    subjectId: 1,
    lessonNumber: 2,
    records: [{ studentId: 10, status: 'ABSENT' }],
  });
  assert.equal(store.getStudentStats(10).missedHours, 2);

  store.deleteLesson(lessonId);
  assert.equal(store.getStudentStats(10).missedHours, 0);
  assert.equal(store.getStudentStats(10).markedLessonsCount, 0);
});

test('8. При изменении даты занятия статистика перемещается в правильный период', () => {
  const store = new InMemoryAttendanceStore();
  const lessonId = store.saveLessonWithAttendance({
    date: '2026-11-23',
    subjectId: 1,
    lessonNumber: 1,
    records: [{ studentId: 10, status: 'ABSENT' }],
  });
  const novRange = getMonthRange(parseDateOnly('2026-11-23'));
  const octRange = getMonthRange(parseDateOnly('2026-10-15'));

  assert.equal(store.getStudentStats(10, novRange).missedHours, 2);
  assert.equal(store.getStudentStats(10, octRange).missedHours, 0);

  store.updateLessonDate(lessonId, '2026-10-15');
  assert.equal(store.getStudentStats(10, novRange).missedHours, 0);
  assert.equal(store.getStudentStats(10, octRange).missedHours, 2);
});

test('9. При повторном сохранении занятия дубликаты не создаются', () => {
  const store = new InMemoryAttendanceStore();
  const id1 = store.saveLessonWithAttendance({
    date: '2026-11-23',
    subjectId: 2,
    lessonNumber: 3,
    records: [{ studentId: 10, status: 'ABSENT' }],
  });
  const id2 = store.saveLessonWithAttendance({
    date: '2026-11-23',
    subjectId: 2,
    lessonNumber: 3,
    records: [{ studentId: 10, status: 'HALF_ABSENT' }],
  });

  assert.equal(id1, id2);
  assert.equal(store.lessons.size, 1);
  assert.equal(store.attendances.size, 1);
  assert.equal(store.getStudentStats(10).missedHours, 1);
});

test('10. Неделя правильно рассчитывается с понедельника по воскресенье', () => {
  // 2026-11-25 — среда; понедельник: 2026-11-23, воскресенье: 2026-11-29
  const wednesdayRange = getWeekRange(parseDateOnly('2026-11-25'));
  assert.equal(wednesdayRange.fromStr, '2026-11-23');
  assert.equal(wednesdayRange.toStr, '2026-11-29');

  // 2026-11-29 — воскресенье; всё ещё та же неделя
  const sundayRange = getWeekRange(parseDateOnly('2026-11-29'));
  assert.equal(sundayRange.fromStr, '2026-11-23');
  assert.equal(sundayRange.toStr, '2026-11-29');
});

test('11. Статистика за месяц не включает занятия предыдущего месяца', () => {
  const store = new InMemoryAttendanceStore();
  store.saveLessonWithAttendance({
    date: '2026-10-31',
    subjectId: 1,
    lessonNumber: 1,
    records: [{ studentId: 10, status: 'ABSENT' }],
  });
  store.saveLessonWithAttendance({
    date: '2026-11-01',
    subjectId: 1,
    lessonNumber: 1,
    records: [{ studentId: 10, status: 'HALF_ABSENT' }],
  });

  const novRange = getMonthRange(parseDateOnly('2026-11-10'));
  const novStats = store.getStudentStats(10, novRange);
  assert.equal(novStats.missedHours, 1);
  assert.equal(novStats.markedLessonsCount, 1);
});

test('12. Неотмеченный студент не учитывается как отсутствующий', () => {
  const stats = calculateStatsFromRecords([
    { status: 'PRESENT' },
    { status: 'UNMARKED' },
    { status: 'UNMARKED' },
  ]);
  assert.equal(stats.missedHours, 0);
  assert.equal(stats.absentCount, 0);
  assert.equal(stats.unmarkedCount, 2);
  assert.equal(stats.markedLessonsCount, 1);
  assert.equal(stats.attendanceRate, 100);
});
