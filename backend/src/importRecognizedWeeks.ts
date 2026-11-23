import { PrismaClient, AttendanceStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../data/attendance-db.json');

const prisma = new PrismaClient();

interface DayLessonDef {
  lessonNumber: number;
  subjectId: number;
}

const DAY_LESSONS: Record<string, DayLessonDef[]> = {
  // Week 1: 07.09.2026 - 11.09.2026 (Week 2 of schedule)
  '2026-09-07': [
    { lessonNumber: 1, subjectId: 4 }, // Проектирование веб
    { lessonNumber: 2, subjectId: 1 }, // ТПИР
    { lessonNumber: 3, subjectId: 2 }, // Администрирование ИР
    { lessonNumber: 4, subjectId: 6 }, // Разработка и оптимизация
  ],
  '2026-09-08': [
    { lessonNumber: 2, subjectId: 3 }, // БЖ
    { lessonNumber: 3, subjectId: 1 }, // ТПИР
    { lessonNumber: 4, subjectId: 4 }, // Проектирование веб
    { lessonNumber: 5, subjectId: 4 }, // Проектирование веб
  ],
  '2026-09-09': [
    { lessonNumber: 2, subjectId: 2 }, // Администрирование ИР
    { lessonNumber: 3, subjectId: 5 }, // ОПД
    { lessonNumber: 4, subjectId: 6 }, // Разработка и оптимизация
    { lessonNumber: 5, subjectId: 6 }, // Разработка и оптимизация
  ],
  '2026-09-11': [
    { lessonNumber: 1, subjectId: 3 }, // БЖ
    { lessonNumber: 2, subjectId: 7 }, // Физра
    { lessonNumber: 3, subjectId: 1 }, // ТПИР
    { lessonNumber: 4, subjectId: 8 }, // Иностранный язык
  ],

  // Week 2: 12.10.2026 - 16.10.2026 (Week 1 of schedule)
  '2026-10-12': [
    { lessonNumber: 2, subjectId: 1 }, // ТПИР
    { lessonNumber: 3, subjectId: 2 }, // Администрирование ИР
  ],
  '2026-10-13': [
    { lessonNumber: 2, subjectId: 3 }, // БЖ
    { lessonNumber: 3, subjectId: 1 }, // ТПИР
    { lessonNumber: 4, subjectId: 4 }, // Проектирование веб
    { lessonNumber: 5, subjectId: 4 }, // Проектирование веб
  ],
  '2026-10-14': [
    { lessonNumber: 2, subjectId: 2 }, // Администрирование ИР
    { lessonNumber: 3, subjectId: 5 }, // ОПД
    { lessonNumber: 4, subjectId: 6 }, // Разработка и оптимизация
    { lessonNumber: 5, subjectId: 6 }, // Разработка и оптимизация
  ],
  '2026-10-16': [
    { lessonNumber: 1, subjectId: 2 }, // Администрирование ИР
    { lessonNumber: 2, subjectId: 7 }, // Физра
    { lessonNumber: 3, subjectId: 1 }, // ТПИР
    { lessonNumber: 4, subjectId: 8 }, // Иностранный язык
  ],

  // Week 3: 19.10.2026 - 23.10.2026 (Week 2 of schedule)
  '2026-10-19': [
    { lessonNumber: 1, subjectId: 4 },
    { lessonNumber: 2, subjectId: 1 },
    { lessonNumber: 3, subjectId: 2 },
    { lessonNumber: 4, subjectId: 6 },
  ],
  '2026-10-20': [
    { lessonNumber: 2, subjectId: 3 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 4 },
    { lessonNumber: 5, subjectId: 4 },
  ],
  '2026-10-21': [
    { lessonNumber: 2, subjectId: 2 },
    { lessonNumber: 3, subjectId: 5 },
    { lessonNumber: 4, subjectId: 6 },
    { lessonNumber: 5, subjectId: 6 },
  ],
  '2026-10-23': [
    { lessonNumber: 1, subjectId: 3 },
    { lessonNumber: 2, subjectId: 7 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 8 },
  ],

  // Week 4: 26.10.2026 - 30.10.2026 (Week 1 of schedule)
  '2026-10-26': [
    { lessonNumber: 2, subjectId: 1 },
    { lessonNumber: 3, subjectId: 2 },
  ],
  '2026-10-27': [
    { lessonNumber: 2, subjectId: 3 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 4 },
    { lessonNumber: 5, subjectId: 4 },
  ],
  '2026-10-28': [
    { lessonNumber: 2, subjectId: 2 },
    { lessonNumber: 3, subjectId: 5 },
    { lessonNumber: 4, subjectId: 6 },
    { lessonNumber: 5, subjectId: 6 },
  ],
  '2026-10-30': [
    { lessonNumber: 1, subjectId: 2 },
    { lessonNumber: 2, subjectId: 7 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 8 },
  ],

  // Week 5: 02.11.2026 - 06.11.2026 (Week 2 of schedule)
  '2026-11-02': [
    { lessonNumber: 1, subjectId: 4 },
    { lessonNumber: 2, subjectId: 1 },
    { lessonNumber: 3, subjectId: 2 },
    { lessonNumber: 4, subjectId: 6 },
  ],
  '2026-11-03': [
    { lessonNumber: 2, subjectId: 3 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 4 },
    { lessonNumber: 5, subjectId: 4 },
  ],
  // 04.11 is a national holiday
  '2026-11-06': [
    { lessonNumber: 1, subjectId: 3 },
    { lessonNumber: 2, subjectId: 7 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 8 },
  ],

  // Week 6: 09.11.2026 - 13.11.2026 (Week 1 of schedule)
  '2026-11-09': [
    { lessonNumber: 2, subjectId: 1 },
    { lessonNumber: 3, subjectId: 2 },
  ],
  '2026-11-10': [
    { lessonNumber: 2, subjectId: 3 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 4 },
    { lessonNumber: 5, subjectId: 4 },
  ],
  '2026-11-11': [
    { lessonNumber: 2, subjectId: 2 },
    { lessonNumber: 3, subjectId: 5 },
    { lessonNumber: 4, subjectId: 6 },
    { lessonNumber: 5, subjectId: 6 },
  ],
  '2026-11-13': [
    { lessonNumber: 1, subjectId: 2 },
    { lessonNumber: 2, subjectId: 7 },
    { lessonNumber: 3, subjectId: 1 },
    { lessonNumber: 4, subjectId: 8 },
  ],
};

type StudentDayMarks = Record<number, (AttendanceStatus | 'ALL_2')[] | 'ALL_2'>;

const DAY_ABSENCES: Record<string, StudentDayMarks> = {
  // === WEEK 1: 07.09.2026 - 11.09.2026 (Photo 3) ===
  '2026-09-07': {
    1: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    2: 'ALL_2',
    4: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    16: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    17: 'ALL_2',
    18: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-09-08': {
    1: [AttendanceStatus.HALF_ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    2: 'ALL_2',
    3: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    15: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-09-09': {
    2: 'ALL_2',
    3: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    15: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-09-11': {
    2: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    15: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },

  // === WEEK 2: 12.10.2026 - 16.10.2026 (Photo 7) ===
  '2026-10-12': {
    2: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-13': {
    1: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT],
    2: 'ALL_2',
    3: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-14': {
    1: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    16: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    17: 'ALL_2',
    18: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    21: 'ALL_2',
    22: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-16': {
    2: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    3: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    4: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    5: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    6: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    7: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    8: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    9: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    11: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    14: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    15: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    18: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    19: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    20: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    21: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    22: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    24: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    25: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
  },

  // === WEEK 3: 19.10.2026 - 23.10.2026 (Photo 4) ===
  '2026-10-19': {
    2: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    13: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
    26: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
  },
  '2026-10-20': {
    2: 'ALL_2',
    3: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.HALF_ABSENT, AttendanceStatus.ABSENT],
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    8: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    18: [AttendanceStatus.ABSENT, AttendanceStatus.HALF_ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-21': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    18: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-23': {
    2: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },

  // === WEEK 4: 26.10.2026 - 30.10.2026 (Photo 8) ===
  '2026-10-26': {
    4: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    18: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    20: 'ALL_2',
    21: 'ALL_2',
    22: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
    26: 'ALL_2',
  },
  '2026-10-27': {
    1: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    2: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    3: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    4: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    5: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    6: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    7: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    8: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    11: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    14: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    15: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    16: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    17: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    18: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    20: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    21: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    22: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    23: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    24: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    25: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
  },
  '2026-10-28': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-10-30': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },

  // === WEEK 5: 02.11.2026 - 06.11.2026 (Photo 10) ===
  '2026-11-02': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-11-03': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-11-06': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT],
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    13: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },

  // === WEEK 6: 09.11.2026 - 13.11.2026 (Photo 9) ===
  '2026-11-09': {
    2: 'ALL_2',
    3: 'ALL_2',
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: 'ALL_2',
    20: [AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
    26: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT],
  },
  '2026-11-10': {
    2: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    3: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    4: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: 'ALL_2',
    18: [AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    20: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-11-11': {
    2: 'ALL_2',
    3: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: [AttendanceStatus.ABSENT, AttendanceStatus.HALF_ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    18: 'ALL_2',
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
  },
  '2026-11-13': {
    2: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT],
    4: 'ALL_2',
    5: 'ALL_2',
    6: 'ALL_2',
    7: 'ALL_2',
    8: 'ALL_2',
    9: 'ALL_2',
    11: 'ALL_2',
    14: 'ALL_2',
    15: 'ALL_2',
    17: [AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.ABSENT, AttendanceStatus.PRESENT],
    18: 'ALL_2',
    20: [AttendanceStatus.HALF_ABSENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT],
    21: 'ALL_2',
    22: 'ALL_2',
    23: 'ALL_2',
    24: 'ALL_2',
    25: 'ALL_2',
    26: 'ALL_2',
  },
};

async function main() {
  console.log('Connecting to PostgreSQL (Neon)...');
  await prisma.$connect();
  console.log('Connected!');

  const students = await prisma.student.findMany({ orderBy: { id: 'asc' } });
  console.log(`Found ${students.length} students in DB.`);

  let totalLessonsCreated = 0;
  let totalAttendancesUpdated = 0;

  let dbJson: any = { students: [], subjects: [], lessons: [], attendances: [] };
  if (fs.existsSync(DB_FILE)) {
    dbJson = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }

  for (const [dateStr, lessonDefs] of Object.entries(DAY_LESSONS)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    console.log(`Processing date: ${dateStr} (${lessonDefs.length} lessons)...`);

    const dayAbsences = DAY_ABSENCES[dateStr] || {};

    for (let idx = 0; idx < lessonDefs.length; idx++) {
      const def = lessonDefs[idx];

      const lesson = await prisma.lesson.upsert({
        where: {
          date_subjectId_lessonNumber: {
            date: dateObj,
            subjectId: def.subjectId,
            lessonNumber: def.lessonNumber,
          },
        },
        update: {},
        create: {
          date: dateObj,
          subjectId: def.subjectId,
          lessonNumber: def.lessonNumber,
        },
      });
      totalLessonsCreated++;

      let jsonLesson = dbJson.lessons.find(
        (l: any) => l.date === dateStr && l.subjectId === def.subjectId && l.lessonNumber === def.lessonNumber
      );
      if (!jsonLesson) {
        const nextId = dbJson.lessons.length > 0 ? Math.max(...dbJson.lessons.map((l: any) => l.id)) + 1 : 1;
        jsonLesson = {
          id: nextId,
          date: dateStr,
          subjectId: def.subjectId,
          lessonNumber: def.lessonNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbJson.lessons.push(jsonLesson);
      }

      for (const student of students) {
        if (!student.isActive) {
          continue;
        }

        let status: AttendanceStatus = AttendanceStatus.PRESENT;

        const studentMarks = dayAbsences[student.id];
        if (studentMarks === 'ALL_2') {
          status = AttendanceStatus.ABSENT;
        } else if (Array.isArray(studentMarks)) {
          const mark = studentMarks[idx];
          if (mark === 'ALL_2' || mark === AttendanceStatus.ABSENT) {
            status = AttendanceStatus.ABSENT;
          } else if (mark === AttendanceStatus.HALF_ABSENT) {
            status = AttendanceStatus.HALF_ABSENT;
          } else {
            status = AttendanceStatus.PRESENT;
          }
        }

        await prisma.attendance.upsert({
          where: {
            lessonId_studentId: {
              lessonId: lesson.id,
              studentId: student.id,
            },
          },
          update: { status },
          create: {
            lessonId: lesson.id,
            studentId: student.id,
            status,
          },
        });
        totalAttendancesUpdated++;

        let jsonAtt = dbJson.attendances.find(
          (a: any) => a.lessonId === jsonLesson.id && a.studentId === student.id
        );
        if (jsonAtt) {
          jsonAtt.status = status;
          jsonAtt.updatedAt = new Date().toISOString();
        } else {
          const nextAttId = dbJson.attendances.length > 0 ? Math.max(...dbJson.attendances.map((a: any) => a.id)) + 1 : 1;
          dbJson.attendances.push({
            id: nextAttId,
            lessonId: jsonLesson.id,
            studentId: student.id,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  console.log('Updating PostgreSQL sequence counters...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Lesson"', 'id'), coalesce(max(id), 1)) FROM "Lesson";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Attendance"', 'id'), coalesce(max(id), 1)) FROM "Attendance";`);

  fs.writeFileSync(DB_FILE, JSON.stringify(dbJson, null, 2), 'utf-8');
  console.log('Synchronized local attendance-db.json successfully.');

  console.log(`\nVerification & Update completed!`);
  console.log(`Total Lessons: ${await prisma.lesson.count()}`);
  console.log(`Total Attendances: ${await prisma.attendance.count()}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error during import:', e);
  process.exit(1);
});
