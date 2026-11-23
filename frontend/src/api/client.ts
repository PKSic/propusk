import type {
  AttendanceStatus,
  DashboardData,
  LessonDetail,
  LessonSummary,
  Student,
  StudentDetailResponse,
  Subject,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error || `Ошибка запроса (${res.status})`,
      data.details,
    );
  }
  return data as T;
}

export const api = {
  // Dashboard & Statistics
  getDashboard: () => request<DashboardData>('/statistics/dashboard'),
  getStudentDetail: (id: number, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request<StudentDetailResponse>(`/statistics/students/${id}${qs ? `?${qs}` : ''}`);
  },

  // Students
  getStudents: (params?: { includeArchived?: boolean; search?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    if (params?.includeArchived) sp.set('includeArchived', 'true');
    if (params?.search) sp.set('search', params.search);
    if (params?.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return request<{ students: Student[] }>(`/students${qs ? `?${qs}` : ''}`);
  },
  createStudent: (fullName: string) =>
    request<{ student: Student }>('/students', {
      method: 'POST',
      body: JSON.stringify({ fullName }),
    }),
  updateStudent: (id: number, payload: { fullName?: string; isActive?: boolean }) =>
    request<{ student: Student }>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: number, permanent = false) =>
    request<{ deleted: boolean; archived: boolean }>(`/students/${id}${permanent ? '?permanent=true' : ''}`, {
      method: 'DELETE',
    }),

  // Subjects
  getSubjects: (includeArchived = false) =>
    request<{ subjects: Subject[] }>(`/subjects${includeArchived ? '?includeArchived=true' : ''}`),
  createSubject: (name: string) =>
    request<{ subject: Subject }>('/subjects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateSubject: (id: number, payload: { name?: string; isActive?: boolean }) =>
    request<{ subject: Subject }>(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteSubject: (id: number) =>
    request<{ deleted: boolean; archived: boolean }>(`/subjects/${id}`, {
      method: 'DELETE',
    }),

  // Lessons
  getLessons: (params?: {
    from?: string;
    to?: string;
    date?: string;
    subjectId?: number;
    studentId?: number;
    lessonNumber?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.date) sp.set('date', params.date);
    if (params?.subjectId) sp.set('subjectId', String(params.subjectId));
    if (params?.studentId) sp.set('studentId', String(params.studentId));
    if (params?.lessonNumber) sp.set('lessonNumber', String(params.lessonNumber));
    const qs = sp.toString();
    return request<{ lessons: LessonSummary[] }>(`/lessons${qs ? `?${qs}` : ''}`);
  },
  getLesson: (id: number) => request<{ lesson: LessonDetail }>(`/lessons/${id}`),
  createLesson: (payload: {
    date: string;
    subjectId: number;
    lessonNumber: number;
    records?: Array<{ studentId: number; status: AttendanceStatus }>;
  }) =>
    request<{ lesson: LessonDetail }>('/lessons', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLesson: (id: number, payload: { date?: string; subjectId?: number; lessonNumber?: number }) =>
    request<{ lesson: LessonSummary }>(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteLesson: (id: number) =>
    request<{ deleted: boolean }>(`/lessons/${id}`, {
      method: 'DELETE',
    }),

  // Attendance
  saveLessonAttendance: (
    lessonId: number,
    records: Array<{ studentId: number; status: AttendanceStatus }>,
  ) =>
    request<{
      lessonId: number;
      presentCount: number;
      absentCount: number;
      halfAbsentCount: number;
      unmarkedCount: number;
      missedHours: number;
    }>(`/attendance/lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify({ records }),
    }),
};
