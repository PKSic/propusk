import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'attendance-db.json');

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_ABSENT' | 'UNMARKED';

export interface StudentRecord {
  id: number;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRecord {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonRecord {
  id: number;
  date: string; // YYYY-MM-DD
  subjectId: number;
  lessonNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: number;
  lessonId: number;
  studentId: number;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  lessonNumber: number;
  subjectName: string;
}

export const WEEK_1_SCHEDULE: Record<number, ScheduleItem[]> = {
  1: [ // Понедельник
    { lessonNumber: 2, subjectName: 'ТПИР' },
    { lessonNumber: 3, subjectName: 'Администрирование ИР' },
  ],
  2: [ // Вторник
    { lessonNumber: 2, subjectName: 'БЖ' },
    { lessonNumber: 3, subjectName: 'ТПИР' },
    { lessonNumber: 4, subjectName: 'Проектирование веб' },
    { lessonNumber: 5, subjectName: 'Проектирование веб' },
  ],
  3: [ // Среда
    { lessonNumber: 2, subjectName: 'Администрирование ИР' },
    { lessonNumber: 3, subjectName: 'ОПД' },
    { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
    { lessonNumber: 5, subjectName: 'Разработка и оптимизация' },
  ],
  4: [], // Четверг
  5: [ // Пятница
    { lessonNumber: 1, subjectName: 'Администрирование ИР' },
    { lessonNumber: 2, subjectName: 'Физра' },
    { lessonNumber: 3, subjectName: 'ТПИР' },
    { lessonNumber: 4, subjectName: 'Иностранный язык' },
  ],
};

export const WEEK_2_SCHEDULE: Record<number, ScheduleItem[]> = {
  1: [ // Понедельник
    { lessonNumber: 1, subjectName: 'Проектирование веб' },
    { lessonNumber: 2, subjectName: 'ТПИР' },
    { lessonNumber: 3, subjectName: 'Администрирование ИР' },
    { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
  ],
  2: [ // Вторник
    { lessonNumber: 2, subjectName: 'БЖ' },
    { lessonNumber: 3, subjectName: 'ТПИР' },
    { lessonNumber: 4, subjectName: 'Проектирование веб' },
    { lessonNumber: 5, subjectName: 'Проектирование веб' },
  ],
  3: [ // Среда
    { lessonNumber: 2, subjectName: 'Администрирование ИР' },
    { lessonNumber: 3, subjectName: 'ОПД' },
    { lessonNumber: 4, subjectName: 'Разработка и оптимизация' },
    { lessonNumber: 5, subjectName: 'Разработка и оптимизация' },
  ],
  4: [], // Четверг
  5: [ // Пятница
    { lessonNumber: 1, subjectName: 'БЖ' },
    { lessonNumber: 2, subjectName: 'Физра' },
    { lessonNumber: 3, subjectName: 'ТПИР' },
    { lessonNumber: 4, subjectName: 'Иностранный язык' },
  ],
};

interface DatabaseSchema {
  curator?: string;
  groupName?: string;
  students: StudentRecord[];
  subjects: SubjectRecord[];
  lessons: LessonRecord[];
  attendances: AttendanceRecord[];
  nextIds: {
    student: number;
    subject: number;
    lesson: number;
    attendance: number;
  };
}

export function generateInitialData(): DatabaseSchema {
  const studentsList: Array<{ fullName: string; isActive: boolean }> = [
    { fullName: 'Ананьев Владимир Сергеевич', isActive: true },
    { fullName: 'Велиев Эмин Эйюбович', isActive: true },
    { fullName: 'Волохина Виктория Викторовна', isActive: true },
    { fullName: 'Гамора Ярослав Станиславович', isActive: true },
    { fullName: 'Гусев Андрей Александрович', isActive: true },
    { fullName: 'Дворникова Маргарита Михайловна', isActive: true },
    { fullName: 'Дорошкова Анастасия Сергеевна', isActive: true },
    { fullName: 'Кабанов Виктор Юрьевич', isActive: true },
    { fullName: 'Латифов Мурад Тапдыг оглы', isActive: true },
    { fullName: 'Максимов Николай Михайлович', isActive: true },
    { fullName: 'Мамонова Анастасия Валерьевна', isActive: true },
    { fullName: 'Мураткалиева Камила Рафаэльевна', isActive: false },
    { fullName: 'Нигметов Амир Дмитриевич', isActive: true },
    { fullName: 'Подгурский Станислав Владимирович', isActive: true },
    { fullName: 'Раджабов Магомед-Загир Исламович', isActive: true },
    { fullName: 'Самойленко Ярослав Владимирович', isActive: true },
    { fullName: 'Степанова Дарья Васильевна', isActive: true },
    { fullName: 'Сухоруков Сергей Николаевич', isActive: true },
    { fullName: 'Сысуев Даниил Андреевич', isActive: true },
    { fullName: 'Тампищева Альбина Александровна', isActive: true },
    { fullName: 'Тихонов Ярослав Михайлович', isActive: true },
    { fullName: 'Хажеев Алим Ренатович', isActive: true },
    { fullName: 'Халилов Рамиль Алахвердиевич', isActive: true },
    { fullName: 'Черкасов Владимир Вадимович', isActive: true },
    { fullName: 'Чудинов Валериан Максимович', isActive: true },
    { fullName: 'Шишлянникова Анна Викторовна', isActive: true },
  ];

  const now = new Date().toISOString();
  const students: StudentRecord[] = studentsList.map((item, idx) => ({
    id: idx + 1,
    fullName: item.fullName,
    isActive: item.isActive,
    createdAt: now,
    updatedAt: now,
  }));

  const subjectNames = [
    'ТПИР',
    'Администрирование ИР',
    'БЖ',
    'Проектирование веб',
    'ОПД',
    'Разработка и оптимизация',
    'Физра',
    'Иностранный язык',
  ];

  const subjects: SubjectRecord[] = subjectNames.map((name, idx) => ({
    id: idx + 1,
    name,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  const subjectMap = new Map<string, number>();
  for (const s of subjects) {
    subjectMap.set(s.name, s.id);
  }

  const lessons: LessonRecord[] = [];
  const attendances: AttendanceRecord[] = [];
  let lessonId = 1;
  let attendanceId = 1;

  // Let's generate lessons for the past 4 weeks (Nov 2 to Nov 23)
  // 2026-11-23 is Monday (Week 1)
  // 2026-11-16 is Monday (Week 2)
  // 2026-11-09 is Monday (Week 1)
  // 2026-11-02 is Monday (Week 2)
  const today = new Date();
  for (let daysAgo = 22; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    if (dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 4) continue; // Skip weekends and Thursday

    // Calculate which week: Nov 23 (daysAgo=0) is Week 1
    // Number of 7-day intervals ago from Nov 23:
    const weeksAgo = Math.floor(daysAgo / 7);
    const isWeek1 = weeksAgo % 2 === 0;
    const schedule = isWeek1 ? WEEK_1_SCHEDULE[dayOfWeek] : WEEK_2_SCHEDULE[dayOfWeek];
    if (!schedule || schedule.length === 0) continue;

    const dateStr = d.toISOString().slice(0, 10);

    for (const item of schedule) {
      const subjectId = subjectMap.get(item.subjectName) || 1;
      lessons.push({
        id: lessonId,
        date: dateStr,
        subjectId,
        lessonNumber: item.lessonNumber,
        createdAt: d.toISOString(),
        updatedAt: d.toISOString(),
      });

      for (const st of students) {
        if (!st.isActive && daysAgo < 12) {
          // Excluded student was not attending recent pairs
          continue;
        }

        let status: AttendanceStatus = 'PRESENT';
        const rand = (st.id * 19 + lessonId * 31 + item.lessonNumber * 13) % 100;
        if (rand < 78) {
          status = 'PRESENT';
        } else if (rand < 89) {
          status = 'HALF_ABSENT';
        } else if (rand < 97) {
          status = 'ABSENT';
        } else {
          status = 'UNMARKED';
        }

        attendances.push({
          id: attendanceId++,
          lessonId,
          studentId: st.id,
          status,
          createdAt: d.toISOString(),
          updatedAt: d.toISOString(),
        });
      }
      lessonId++;
    }
  }

  return {
    curator: 'Гаврилова Анна Олеговна',
    groupName: 'ВЕБ-32К',
    students,
    subjects,
    lessons,
    attendances,
    nextIds: {
      student: students.length + 1,
      subject: subjects.length + 1,
      lesson: lessonId,
      attendance: attendanceId,
    },
  };
}

class JsonDatabase {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.subjects && parsed.subjects.some((s: any) => s.name === 'ТПИР')) {
          this.data = parsed;
        } else {
          this.data = generateInitialData();
          this.save();
        }
      } catch {
        this.data = generateInitialData();
        this.save();
      }
    } else {
      this.data = generateInitialData();
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save DB file', e);
    }
  }

  // --- Student methods ---
  readonly student = {
    count: async (args?: { where?: any }): Promise<number> => {
      let list = this.data.students;
      if (args?.where?.isActive !== undefined) {
        list = list.filter((s) => s.isActive === args.where.isActive);
      }
      return list.length;
    },

    findMany: async (args?: { where?: any; include?: any; orderBy?: any }): Promise<any[]> => {
      let list = [...this.data.students];
      const where = args?.where;
      if (where) {
        if (where.isActive !== undefined) {
          list = list.filter((s) => s.isActive === where.isActive);
        }
        if (where.fullName?.contains) {
          const q = where.fullName.contains.toLowerCase();
          list = list.filter((s) => s.fullName.toLowerCase().includes(q));
        }
        if (where.id?.in) {
          const ids = new Set(where.id.in);
          list = list.filter((s) => ids.has(s.id));
        }
      }

      if (args?.orderBy?.fullName) {
        list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
      }

      return list.map((s) => {
        const res: any = {
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        };
        if (args?.include?.attendances) {
          res.attendances = this.data.attendances
            .filter((a) => a.studentId === s.id)
            .map((a) => {
              const lesson = this.data.lessons.find((l) => l.id === a.lessonId);
              return {
                ...a,
                lesson: lesson
                  ? {
                      ...lesson,
                      date: new Date(lesson.date + 'T00:00:00.000Z'),
                    }
                  : null,
              };
            });
        }
        if (args?.include?._count?.select?.attendances) {
          res._count = {
            attendances: this.data.attendances.filter((a) => a.studentId === s.id).length,
          };
        }
        return res;
      });
    },

    findUnique: async (args: { where: { id: number }; include?: any }): Promise<any | null> => {
      const s = this.data.students.find((item) => item.id === args.where.id);
      if (!s) return null;
      const res: any = {
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      };
      if (args.include?.attendances) {
        res.attendances = this.data.attendances
          .filter((a) => a.studentId === s.id)
          .map((a) => {
            const lesson = this.data.lessons.find((l) => l.id === a.lessonId);
            const subject = lesson ? this.data.subjects.find((sub) => sub.id === lesson.subjectId) : null;
            return {
              ...a,
              lesson: lesson
                ? {
                    ...lesson,
                    date: new Date(lesson.date + 'T00:00:00.000Z'),
                    subject: subject ? { id: subject.id, name: subject.name } : null,
                  }
                : null,
            };
          });
      }
      if (args.include?._count?.select?.attendances) {
        res._count = {
          attendances: this.data.attendances.filter((a) => a.studentId === s.id).length,
        };
      }
      return res;
    },

    create: async (args: { data: { fullName: string; isActive?: boolean } }): Promise<any> => {
      const now = new Date().toISOString();
      const newStudent: StudentRecord = {
        id: this.data.nextIds.student++,
        fullName: args.data.fullName,
        isActive: args.data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      this.data.students.push(newStudent);
      this.save();
      return {
        ...newStudent,
        createdAt: new Date(newStudent.createdAt),
        updatedAt: new Date(newStudent.updatedAt),
      };
    },

    update: async (args: { where: { id: number }; data: Partial<StudentRecord> }): Promise<any> => {
      const s = this.data.students.find((item) => item.id === args.where.id);
      if (!s) throw new Error('Student not found');
      if (args.data.fullName !== undefined) s.fullName = args.data.fullName;
      if (args.data.isActive !== undefined) s.isActive = args.data.isActive;
      s.updatedAt = new Date().toISOString();
      this.save();
      return {
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      };
    },

    delete: async (args: { where: { id: number } }): Promise<any> => {
      const idx = this.data.students.findIndex((item) => item.id === args.where.id);
      if (idx === -1) throw new Error('Student not found');
      const [deleted] = this.data.students.splice(idx, 1);
      this.data.attendances = this.data.attendances.filter((a) => a.studentId !== deleted.id);
      this.save();
      return deleted;
    },
  };

  // --- Subject methods ---
  readonly subject = {
    findMany: async (args?: { where?: any; orderBy?: any; include?: any }): Promise<any[]> => {
      let list = [...this.data.subjects];
      if (args?.where?.isActive !== undefined) {
        list = list.filter((s) => s.isActive === args.where.isActive);
      }
      if (args?.orderBy?.name === 'asc') {
        list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      }
      return list.map((s) => {
        const res: any = {
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        };
        if (args?.include?._count?.select?.lessons) {
          res._count = {
            lessons: this.data.lessons.filter((l) => l.subjectId === s.id).length,
          };
        }
        return res;
      });
    },

    findUnique: async (args: { where: { id: number }; include?: any }): Promise<any | null> => {
      const s = this.data.subjects.find((item) => item.id === args.where.id);
      if (!s) return null;
      const res: any = {
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      };
      if (args.include?._count?.select?.lessons) {
        res._count = {
          lessons: this.data.lessons.filter((l) => l.subjectId === s.id).length,
        };
      }
      return res;
    },

    create: async (args: { data: { name: string } }): Promise<any> => {
      const now = new Date().toISOString();
      const newSubject: SubjectRecord = {
        id: this.data.nextIds.subject++,
        name: args.data.name,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.data.subjects.push(newSubject);
      this.save();
      return {
        ...newSubject,
        createdAt: new Date(newSubject.createdAt),
        updatedAt: new Date(newSubject.updatedAt),
      };
    },

    update: async (args: { where: { id: number }; data: Partial<SubjectRecord>; include?: any }): Promise<any> => {
      const s = this.data.subjects.find((item) => item.id === args.where.id);
      if (!s) throw new Error('Subject not found');
      if (args.data.name !== undefined) s.name = args.data.name;
      if (args.data.isActive !== undefined) s.isActive = args.data.isActive;
      s.updatedAt = new Date().toISOString();
      this.save();
      const res: any = {
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      };
      if (args.include?._count?.select?.lessons) {
        res._count = {
          lessons: this.data.lessons.filter((l) => l.subjectId === s.id).length,
        };
      }
      return res;
    },

    delete: async (args: { where: { id: number } }): Promise<any> => {
      const idx = this.data.subjects.findIndex((item) => item.id === args.where.id);
      if (idx === -1) throw new Error('Subject not found');
      const [deleted] = this.data.subjects.splice(idx, 1);
      this.save();
      return deleted;
    },
  };

  // --- Lesson methods ---
  readonly lesson = {
    count: async (args?: { where?: any }): Promise<number> => {
      let list = this.data.lessons;
      const where = args?.where;
      if (where?.date?.gte || where?.date?.lte) {
        list = list.filter((l) => {
          const lDate = new Date(l.date + 'T00:00:00.000Z');
          if (where.date.gte && lDate < where.date.gte) return false;
          if (where.date.lte && lDate > where.date.lte) return false;
          return true;
        });
      }
      return list.length;
    },

    findMany: async (args?: { take?: number; where?: any; orderBy?: any; include?: any }): Promise<any[]> => {
      let list = [...this.data.lessons];
      const where = args?.where;
      if (where) {
        if (where.date instanceof Date) {
          const dStr = where.date.toISOString().slice(0, 10);
          list = list.filter((l) => l.date === dStr);
        } else if (where.date?.gte || where.date?.lte) {
          list = list.filter((l) => {
            const lDate = new Date(l.date + 'T00:00:00.000Z');
            if (where.date.gte && lDate < where.date.gte) return false;
            if (where.date.lte && lDate > where.date.lte) return false;
            return true;
          });
        }
        if (where.subjectId) {
          list = list.filter((l) => l.subjectId === where.subjectId);
        }
        if (where.lessonNumber) {
          list = list.filter((l) => l.lessonNumber === where.lessonNumber);
        }
        if (where.attendances?.some?.studentId) {
          const sId = where.attendances.some.studentId;
          const allowedLessonIds = new Set(
            this.data.attendances.filter((a) => a.studentId === sId).map((a) => a.lessonId),
          );
          list = list.filter((l) => allowedLessonIds.has(l.id));
        }
      }

      if (args?.orderBy) {
        const orderArr = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        list.sort((a, b) => {
          for (const rule of orderArr) {
            if (rule.date) {
              const diff = a.date.localeCompare(b.date);
              if (diff !== 0) return rule.date === 'desc' ? -diff : diff;
            }
            if (rule.lessonNumber) {
              const diff = a.lessonNumber - b.lessonNumber;
              if (diff !== 0) return rule.lessonNumber === 'desc' ? -diff : diff;
            }
            if (rule.id) {
              const diff = a.id - b.id;
              if (diff !== 0) return rule.id === 'desc' ? -diff : diff;
            }
          }
          return 0;
        });
      }

      if (args?.take && args.take > 0) {
        list = list.slice(0, args.take);
      }

      return list.map((l) => {
        const res: any = {
          ...l,
          date: new Date(l.date + 'T00:00:00.000Z'),
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        };
        if (args?.include?.subject) {
          const sub = this.data.subjects.find((s) => s.id === l.subjectId);
          res.subject = sub ? { id: sub.id, name: sub.name, isActive: sub.isActive } : null;
        }
        if (args?.include?.attendances) {
          let atts = this.data.attendances.filter((a) => a.lessonId === l.id);
          if (args.include.attendances.include?.student) {
            atts = atts.map((a) => {
              const st = this.data.students.find((s) => s.id === a.studentId);
              return {
                ...a,
                student: st ? { id: st.id, fullName: st.fullName, isActive: st.isActive } : null,
              };
            });
          }
          if (args.include.attendances.select) {
            atts = atts.map((a) => {
              const sel: any = {};
              for (const k of Object.keys(args.include.attendances.select)) {
                sel[k] = (a as any)[k];
              }
              return sel;
            });
          }
          res.attendances = atts;
        }
        return res;
      });
    },

    findUnique: async (args: { where: any; include?: any }): Promise<any | null> => {
      let l: LessonRecord | undefined;
      if (args.where.id) {
        l = this.data.lessons.find((item) => item.id === args.where.id);
      } else if (args.where.date_subjectId_lessonNumber) {
        const { date, subjectId, lessonNumber } = args.where.date_subjectId_lessonNumber;
        const dStr = date instanceof Date ? date.toISOString().slice(0, 10) : date;
        l = this.data.lessons.find(
          (item) => item.date === dStr && item.subjectId === subjectId && item.lessonNumber === lessonNumber,
        );
      }
      if (!l) return null;

      const res: any = {
        ...l,
        date: new Date(l.date + 'T00:00:00.000Z'),
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      };
      if (args.include?.subject) {
        const sub = this.data.subjects.find((s) => s.id === l.subjectId);
        res.subject = sub ? { id: sub.id, name: sub.name, isActive: sub.isActive } : null;
      }
      if (args.include?.attendances) {
        let atts = this.data.attendances.filter((a) => a.lessonId === l.id);
        if (args.include.attendances.include?.student) {
          atts = atts.map((a) => {
            const st = this.data.students.find((s) => s.id === a.studentId);
            return {
              ...a,
              student: st ? { id: st.id, fullName: st.fullName, isActive: st.isActive } : null,
            };
          });
        }
        if (args.include.attendances.orderBy?.student?.fullName) {
          atts.sort((a: any, b: any) => (a.student?.fullName || '').localeCompare(b.student?.fullName || '', 'ru'));
        }
        res.attendances = atts;
      }
      return res;
    },

    findUniqueOrThrow: async (args: { where: any; include?: any }): Promise<any> => {
      const res = await (this as any).lesson.findUnique(args);
      if (!res) throw new Error('Lesson not found');
      return res;
    },

    create: async (args: { data: { date: Date | string; subjectId: number; lessonNumber: number } }): Promise<any> => {
      const now = new Date().toISOString();
      const dStr = args.data.date instanceof Date ? args.data.date.toISOString().slice(0, 10) : args.data.date;
      const newLesson: LessonRecord = {
        id: this.data.nextIds.lesson++,
        date: dStr,
        subjectId: args.data.subjectId,
        lessonNumber: args.data.lessonNumber,
        createdAt: now,
        updatedAt: now,
      };
      this.data.lessons.push(newLesson);
      this.save();
      return {
        ...newLesson,
        date: new Date(newLesson.date + 'T00:00:00.000Z'),
        createdAt: new Date(newLesson.createdAt),
        updatedAt: new Date(newLesson.updatedAt),
      };
    },

    update: async (args: { where: { id: number }; data: Partial<LessonRecord> & { date?: Date | string }; include?: any }): Promise<any> => {
      const l = this.data.lessons.find((item) => item.id === args.where.id);
      if (!l) throw new Error('Lesson not found');
      if (args.data.date !== undefined) {
        l.date = (args.data.date as any) instanceof Date ? (args.data.date as any).toISOString().slice(0, 10) : String(args.data.date);
      }
      if (args.data.subjectId !== undefined) l.subjectId = args.data.subjectId;
      if (args.data.lessonNumber !== undefined) l.lessonNumber = args.data.lessonNumber;
      l.updatedAt = new Date().toISOString();
      this.save();
      const res: any = {
        ...l,
        date: new Date(l.date + 'T00:00:00.000Z'),
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      };
      if (args.include?.subject) {
        const sub = this.data.subjects.find((s) => s.id === l.subjectId);
        res.subject = sub ? { id: sub.id, name: sub.name } : null;
      }
      return res;
    },

    delete: async (args: { where: { id: number } }): Promise<any> => {
      const idx = this.data.lessons.findIndex((item) => item.id === args.where.id);
      if (idx === -1) throw new Error('Lesson not found');
      const [deleted] = this.data.lessons.splice(idx, 1);
      this.data.attendances = this.data.attendances.filter((a) => a.lessonId !== deleted.id);
      this.save();
      return deleted;
    },
  };

  // --- Attendance methods ---
  readonly attendance = {
    findMany: async (args?: { where?: any; select?: any; include?: any; orderBy?: any }): Promise<any[]> => {
      let list = [...this.data.attendances];
      const where = args?.where;
      if (where) {
        if (where.lessonId) list = list.filter((a) => a.lessonId === where.lessonId);
        if (where.studentId) list = list.filter((a) => a.studentId === where.studentId);
        if (where.lesson?.date?.gte || where.lesson?.date?.lte) {
          list = list.filter((a) => {
            const l = this.data.lessons.find((les) => les.id === a.lessonId);
            if (!l) return false;
            const lDate = new Date(l.date + 'T00:00:00.000Z');
            if (where.lesson.date.gte && lDate < where.lesson.date.gte) return false;
            if (where.lesson.date.lte && lDate > where.lesson.date.lte) return false;
            return true;
          });
        }
      }

      if (args?.select) {
        return list.map((a) => {
          const sel: any = {};
          for (const k of Object.keys(args.select)) {
            sel[k] = (a as any)[k];
          }
          return sel;
        });
      }

      return list.map((a) => {
        const res: any = {
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        };
        if (args?.include?.student) {
          const st = this.data.students.find((s) => s.id === a.studentId);
          res.student = st ? { id: st.id, fullName: st.fullName, isActive: st.isActive } : null;
        }
        if (args?.include?.lesson) {
          const l = this.data.lessons.find((les) => les.id === a.lessonId);
          const sub = l ? this.data.subjects.find((s) => s.id === l.subjectId) : null;
          res.lesson = l
            ? {
                ...l,
                date: new Date(l.date + 'T00:00:00.000Z'),
                subject: sub ? { id: sub.id, name: sub.name } : null,
              }
            : null;
        }
        return res;
      });
    },

    createMany: async (args: { data: Array<{ lessonId: number; studentId: number; status: AttendanceStatus }> }): Promise<any> => {
      const now = new Date().toISOString();
      for (const item of args.data) {
        this.data.attendances.push({
          id: this.data.nextIds.attendance++,
          lessonId: item.lessonId,
          studentId: item.studentId,
          status: item.status,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.save();
      return { count: args.data.length };
    },

    upsert: async (args: {
      where: { lessonId_studentId: { lessonId: number; studentId: number } };
      update: { status: AttendanceStatus };
      create: { lessonId: number; studentId: number; status: AttendanceStatus };
    }): Promise<any> => {
      const { lessonId, studentId } = args.where.lessonId_studentId;
      let rec = this.data.attendances.find((a) => a.lessonId === lessonId && a.studentId === studentId);
      const now = new Date().toISOString();
      if (rec) {
        rec.status = args.update.status;
        rec.updatedAt = now;
      } else {
        rec = {
          id: this.data.nextIds.attendance++,
          lessonId,
          studentId,
          status: args.create.status,
          createdAt: now,
          updatedAt: now,
        };
        this.data.attendances.push(rec);
      }
      this.save();
      return {
        ...rec,
        createdAt: new Date(rec.createdAt),
        updatedAt: new Date(rec.updatedAt),
      };
    },
  };

  async $transaction<T>(fn: (tx: JsonDatabase) => Promise<T>): Promise<T> {
    return await fn(this);
  }
}

export const prisma = new JsonDatabase() as any;
