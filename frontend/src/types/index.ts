export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_ABSENT' | 'UNMARKED';

export interface AttendanceStats {
  presentCount: number;
  halfAbsentCount: number;
  absentCount: number;
  unmarkedCount: number;
  markedLessonsCount: number;
  missedHours: number;
  attendanceRate: number | null;
}

export interface Student {
  id: number;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: AttendanceStats & {
    weekMissedHours: number;
    monthMissedHours: number;
  };
}

export interface Subject {
  id: number;
  name: string;
  isActive: boolean;
  lessonsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSummary {
  id: number;
  date: string;
  subjectId: number;
  lessonNumber: number;
  subject: {
    id: number;
    name: string;
    isActive?: boolean;
  };
  presentCount: number;
  absentCount: number;
  halfAbsentCount: number;
  unmarkedCount: number;
  missedHours: number;
}

export interface LessonAttendanceRecord {
  id: number;
  lessonId: number;
  studentId: number;
  status: AttendanceStatus;
  student: {
    id: number;
    fullName: string;
    isActive: boolean;
  };
}

export interface LessonDetail extends LessonSummary {
  attendances: LessonAttendanceRecord[];
}

export interface DashboardData {
  kpi: {
    totalStudents: number;
    lessonsThisMonth: number;
    missedHoursThisWeek: number;
    missedHoursThisMonth: number;
    weekRange: { from: string; to: string };
    monthRange: { from: string; to: string };
  };
  recentLessons: LessonSummary[];
  topAbsentees: Array<{
    id: number;
    fullName: string;
    missedHours: number;
    missedHoursThisMonth: number;
    absentCount: number;
    halfAbsentCount: number;
    attendanceRate: number | null;
  }>;
  dailyChart: Array<{
    date: string;
    missedHours: number;
    presentCount: number;
    absentCount: number;
    halfAbsentCount: number;
  }>;
}

export interface StudentDetailResponse {
  student: {
    id: number;
    fullName: string;
    isActive: boolean;
    createdAt: string;
  };
  periods: {
    today: AttendanceStats & { range: { from: string; to: string } };
    week: AttendanceStats & { range: { from: string; to: string } };
    month: AttendanceStats & { range: { from: string; to: string } };
    all: AttendanceStats;
    custom: (AttendanceStats & { range: { from: string; to: string } }) | null;
  };
  history: Array<{
    id: number;
    lessonId: number;
    date: string;
    lessonNumber: number;
    subject: { id: number; name: string };
    status: AttendanceStatus;
    missedHours: number;
  }>;
  absencesHistory: Array<{
    id: number;
    lessonId: number;
    date: string;
    lessonNumber: number;
    subject: { id: number; name: string };
    status: AttendanceStatus;
    missedHours: number;
  }>;
}
