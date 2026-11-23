export interface ScheduleLesson {
  lessonNumber: number;
  subjectName: string;
}

export interface DaySchedule {
  dayName: string;
  dayIndex: number; // 1 = Пн, 2 = Вт, 3 = Ср, 4 = Чт, 5 = Пт
  lessons: ScheduleLesson[];
}

export interface LessonTimeSlot {
  number: number;
  start: string;
  end: string;
  timeRange: string;
  startMinutes: number;
  endMinutes: number;
}

export const LESSON_TIME_SLOTS: LessonTimeSlot[] = [
  { number: 1, start: '08:30', end: '10:05', timeRange: '08:30–10:05', startMinutes: 8 * 60 + 30, endMinutes: 10 * 60 + 5 },
  { number: 2, start: '10:15', end: '11:50', timeRange: '10:15–11:50', startMinutes: 10 * 60 + 15, endMinutes: 11 * 60 + 50 },
  { number: 3, start: '12:20', end: '13:55', timeRange: '12:20–13:55', startMinutes: 12 * 60 + 20, endMinutes: 13 * 60 + 55 },
  { number: 4, start: '14:10', end: '15:45', timeRange: '14:10–15:45', startMinutes: 14 * 60 + 10, endMinutes: 15 * 60 + 45 },
  { number: 5, start: '15:55', end: '17:30', timeRange: '15:55–17:30', startMinutes: 15 * 60 + 55, endMinutes: 17 * 60 + 30 },
  { number: 6, start: '17:40', end: '19:15', timeRange: '17:40–19:15', startMinutes: 17 * 60 + 40, endMinutes: 19 * 60 + 15 },
];

export const SCHEDULE_WEEK_1: DaySchedule[] = [
  {
    dayName: 'Понедельник',
    dayIndex: 1,
    lessons: [
      { lessonNumber: 2, subjectName: 'ТПИР' },
      { lessonNumber: 3, subjectName: 'Администрирование ИР' },
    ],
  },
  {
    dayName: 'Вторник',
    dayIndex: 2,
    lessons: [
      { lessonNumber: 2, subjectName: 'БЖ' },
      { lessonNumber: 3, subjectName: 'ТПИР' },
      { lessonNumber: 4, subjectName: 'Проектирование веб' },
      { lessonNumber: 5, subjectName: 'Проектирование веб' },
    ],
  },
  {
    dayName: 'Среда',
    dayIndex: 3,
    lessons: [
      { lessonNumber: 2, subjectName: 'Администрирование ИР' },
      { lessonNumber: 3, subjectName: 'ОПД' },
      { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
      { lessonNumber: 5, subjectName: 'Разработка и оптимизация' },
    ],
  },
  {
    dayName: 'Четверг',
    dayIndex: 4,
    lessons: [],
  },
  {
    dayName: 'Пятница',
    dayIndex: 5,
    lessons: [
      { lessonNumber: 1, subjectName: 'Администрирование ИР' },
      { lessonNumber: 2, subjectName: 'Физра' },
      { lessonNumber: 3, subjectName: 'ТПИР' },
      { lessonNumber: 4, subjectName: 'Иностранный язык' },
    ],
  },
];

export const SCHEDULE_WEEK_2: DaySchedule[] = [
  {
    dayName: 'Понедельник',
    dayIndex: 1,
    lessons: [
      { lessonNumber: 1, subjectName: 'Проектирование веб' },
      { lessonNumber: 2, subjectName: 'ТПИР' },
      { lessonNumber: 3, subjectName: 'Администрирование ИР' },
      { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
    ],
  },
  {
    dayName: 'Вторник',
    dayIndex: 2,
    lessons: [
      { lessonNumber: 2, subjectName: 'БЖ' },
      { lessonNumber: 3, subjectName: 'ТПИР' },
      { lessonNumber: 4, subjectName: 'Проектирование веб' },
      { lessonNumber: 5, subjectName: 'Проектирование веб' },
    ],
  },
  {
    dayName: 'Среда',
    dayIndex: 3,
    lessons: [
      { lessonNumber: 2, subjectName: 'Администрирование ИР' },
      { lessonNumber: 3, subjectName: 'ОПД' },
      { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
      { lessonNumber: 5, subjectName: 'Разработка и оптимизация' },
    ],
  },
  {
    dayName: 'Четверг',
    dayIndex: 4,
    lessons: [],
  },
  {
    dayName: 'Пятница',
    dayIndex: 5,
    lessons: [
      { lessonNumber: 1, subjectName: 'БЖ' },
      { lessonNumber: 2, subjectName: 'Физра' },
      { lessonNumber: 3, subjectName: 'ТПИР' },
      { lessonNumber: 4, subjectName: 'Иностранный язык' },
    ],
  },
];

/**
 * Returns which week (1 or 2) corresponds to a given date string (YYYY-MM-DD).
 * Reference: 2026-11-23 is Monday of Week 1.
 */
export function getWeekNumberForDate(dateStr: string): 1 | 2 {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  const ref = new Date('2026-11-23T00:00:00.000Z');
  const diffDays = Math.floor((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  return (Math.abs(diffWeeks) % 2 === 0) ? 1 : 2;
}

export function getScheduleForDate(dateStr: string): ScheduleLesson[] {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  const dayIndex = d.getUTCDay(); // 0: Sun, 1: Mon, ...
  const weekNum = getWeekNumberForDate(dateStr);
  const weekSchedule = weekNum === 1 ? SCHEDULE_WEEK_1 : SCHEDULE_WEEK_2;
  const day = weekSchedule.find((s) => s.dayIndex === dayIndex);
  return day ? day.lessons : [];
}

/**
 * Returns the current time slot based on current hours and minutes.
 */
export function getCurrentTimeSlot(now = new Date()): {
  slot: LessonTimeSlot;
  isCurrentlyActive: boolean;
  statusLabel: string;
} {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if inside any active lesson
  for (const slot of LESSON_TIME_SLOTS) {
    if (currentMinutes >= slot.startMinutes && currentMinutes <= slot.endMinutes) {
      return {
        slot,
        isCurrentlyActive: true,
        statusLabel: `Сейчас идёт ${slot.number} пара (${slot.timeRange})`,
      };
    }
  }

  // If before 1st pair:
  if (currentMinutes < LESSON_TIME_SLOTS[0].startMinutes) {
    return {
      slot: LESSON_TIME_SLOTS[0],
      isCurrentlyActive: false,
      statusLabel: `Скоро начнётся 1 пара (${LESSON_TIME_SLOTS[0].timeRange})`,
    };
  }

  // If in between pairs:
  for (let i = 0; i < LESSON_TIME_SLOTS.length - 1; i++) {
    const prev = LESSON_TIME_SLOTS[i];
    const next = LESSON_TIME_SLOTS[i + 1];
    if (currentMinutes > prev.endMinutes && currentMinutes < next.startMinutes) {
      return {
        slot: next,
        isCurrentlyActive: false,
        statusLabel: `Перемена перед ${next.number} парой (${next.timeRange})`,
      };
    }
  }

  // After all pairs
  const lastSlot = LESSON_TIME_SLOTS[LESSON_TIME_SLOTS.length - 1];
  return {
    slot: lastSlot,
    isCurrentlyActive: false,
    statusLabel: `Пары завершены (последняя: ${lastSlot.number} пара, ${lastSlot.timeRange})`,
  };
}

/**
 * Intelligent selector: finds the best matching lesson for the given date and time.
 * If scheduled lessons exist for this date, chooses the one closest to current time.
 */
export function getAutoSelectedLesson(dateStr: string, now = new Date()): {
  lessonNumber: number;
  subjectName: string | null;
  statusLabel: string;
  isLive: boolean;
} {
  const currentSlotInfo = getCurrentTimeSlot(now);
  const scheduledLessons = getScheduleForDate(dateStr);

  if (scheduledLessons.length === 0) {
    return {
      lessonNumber: currentSlotInfo.slot.number,
      subjectName: null,
      statusLabel: currentSlotInfo.statusLabel,
      isLive: currentSlotInfo.isCurrentlyActive,
    };
  }

  // Find exact match if current slot matches one of scheduled lessons
  const exactMatch = scheduledLessons.find((l) => l.lessonNumber === currentSlotInfo.slot.number);
  if (exactMatch) {
    return {
      lessonNumber: exactMatch.lessonNumber,
      subjectName: exactMatch.subjectName,
      statusLabel: currentSlotInfo.statusLabel,
      isLive: currentSlotInfo.isCurrentlyActive,
    };
  }

  // If current slot isn't in schedule (e.g. pair 1 when schedule starts at pair 2),
  // pick the scheduled lesson closest to current slot number
  const currentNum = currentSlotInfo.slot.number;
  let best = scheduledLessons[0];
  let minDiff = Math.abs(best.lessonNumber - currentNum);

  for (const l of scheduledLessons) {
    const diff = Math.abs(l.lessonNumber - currentNum);
    if (diff < minDiff) {
      minDiff = diff;
      best = l;
    }
  }

  const slot = LESSON_TIME_SLOTS.find((s) => s.number === best.lessonNumber) || currentSlotInfo.slot;
  return {
    lessonNumber: best.lessonNumber,
    subjectName: best.subjectName,
    statusLabel: `${currentSlotInfo.statusLabel} • Выбрана пара ${best.lessonNumber} (${best.subjectName})`,
    isLive: currentSlotInfo.isCurrentlyActive && currentSlotInfo.slot.number === best.lessonNumber,
  };
}
