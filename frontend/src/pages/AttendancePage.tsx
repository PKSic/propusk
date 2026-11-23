import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  Clock,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { AttendanceStatus, Student, Subject } from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  getAutoSelectedLesson,
  getCurrentTimeSlot,
  getScheduleForDate,
  getWeekNumberForDate,
  LESSON_TIME_SLOTS,
} from '../data/schedule';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonIdParam = searchParams.get('lessonId');

  const [date, setDate] = useState(getTodayIso);
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [lessonNumber, setLessonNumber] = useState<number>(1);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkingLesson, setCheckingLesson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unmarkedConfirmOpen, setUnmarkedConfirmOpen] = useState(false);

  const { showToast } = useToast();
  const studentRowsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Real-time clock info (updated every 30s)
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeSlotInfo = useMemo(() => getCurrentTimeSlot(currentTime), [currentTime]);
  const daySchedule = useMemo(() => getScheduleForDate(date), [date]);
  const weekNum = useMemo(() => getWeekNumberForDate(date), [date]);
  const autoInfo = useMemo(() => getAutoSelectedLesson(date, currentTime), [date, currentTime]);

  // Synchronize or find existing lesson in backend
  const syncExistingLesson = useCallback(
    async (targetDate: string, targetSubjectId: number, targetLessonNum: number, currentStudents: Student[]) => {
      if (!targetDate || !targetSubjectId) return;
      setCheckingLesson(true);
      try {
        const res = await api.getLessons({
          date: targetDate,
          subjectId: targetSubjectId,
          lessonNumber: targetLessonNum,
        });
        const found = res.lessons[0];
        if (found) {
          const detail = await api.getLesson(found.id);
          setEditingLessonId(found.id);
          const map: Record<number, AttendanceStatus> = {};
          for (const s of currentStudents) map[s.id] = 'UNMARKED';
          for (const rec of detail.lesson.attendances) {
            map[rec.studentId] = rec.status;
          }
          setStatuses(map);
        } else {
          setEditingLessonId(null);
          const resetMap: Record<number, AttendanceStatus> = {};
          for (const s of currentStudents) resetMap[s.id] = 'UNMARKED';
          setStatuses(resetMap);
        }
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Ошибка проверки занятия');
      } finally {
        setCheckingLesson(false);
      }
    },
    [showToast],
  );

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [subjRes, studRes] = await Promise.all([
          api.getSubjects(false),
          api.getStudents({ includeArchived: false, sort: 'name_asc' }),
        ]);
        if (!active) return;

        setSubjects(subjRes.subjects);
        setStudents(studRes.students);

        if (lessonIdParam) {
          const idNum = Number(lessonIdParam);
          if (Number.isInteger(idNum) && idNum > 0) {
            const lessonRes = await api.getLesson(idNum);
            if (!active) return;
            const lesson = lessonRes.lesson;
            setEditingLessonId(lesson.id);
            setDate(lesson.date);
            setSubjectId(lesson.subjectId);
            setLessonNumber(lesson.lessonNumber);

            const map: Record<number, AttendanceStatus> = {};
            for (const s of studRes.students) map[s.id] = 'UNMARKED';
            for (const rec of lesson.attendances) {
              map[rec.studentId] = rec.status;
            }
            setStatuses(map);
          }
        } else {
          // Auto-select based on time & schedule for today
          const todayIso = getTodayIso();
          setDate(todayIso);

          const auto = getAutoSelectedLesson(todayIso, new Date());
          let pickedSubjectId: number | '' = '';

          if (auto.subjectName) {
            const matched = subjRes.subjects.find(
              (s) =>
                s.name.toLowerCase() === auto.subjectName?.toLowerCase() ||
                auto.subjectName?.toLowerCase().startsWith(s.name.toLowerCase()),
            );
            if (matched) pickedSubjectId = matched.id;
          }

          if (!pickedSubjectId && subjRes.subjects.length > 0) {
            pickedSubjectId = subjRes.subjects[0].id;
          }

          setLessonNumber(auto.lessonNumber);
          setSubjectId(pickedSubjectId);

          if (typeof pickedSubjectId === 'number') {
            await syncExistingLesson(todayIso, pickedSubjectId, auto.lessonNumber, studRes.students);
          } else {
            const initial: Record<number, AttendanceStatus> = {};
            for (const s of studRes.students) initial[s.id] = 'UNMARKED';
            setStatuses(initial);
          }
        }
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [lessonIdParam, showToast, syncExistingLesson]);

  const handleParamsChange = (nextDate: string, nextSubject: number | '', nextNum: number) => {
    setDate(nextDate);
    setSubjectId(nextSubject);
    setLessonNumber(nextNum);
    if (lessonIdParam) {
      setSearchParams({});
    }
    if (nextDate && typeof nextSubject === 'number') {
      syncExistingLesson(nextDate, nextSubject, nextNum, students);
    }
  };

  // Instant apply current live time slot & schedule
  const applyCurrentTimeLesson = () => {
    const todayIso = getTodayIso();
    const auto = getAutoSelectedLesson(todayIso, currentTime);
    let matchedId = subjectId;

    if (auto.subjectName) {
      const found = subjects.find(
        (s) =>
          s.name.toLowerCase() === auto.subjectName?.toLowerCase() ||
          auto.subjectName?.toLowerCase().startsWith(s.name.toLowerCase()),
      );
      if (found) matchedId = found.id;
    }

    handleParamsChange(todayIso, matchedId, auto.lessonNumber);
    showToast('info', `Выбрана текущая пара: ${auto.lessonNumber} (${auto.subjectName || 'по времени'})`);
  };

  const setStudentStatus = (studentId: number, nextStatus: AttendanceStatus) => {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === nextStatus ? 'UNMARKED' : nextStatus,
    }));
  };

  const markAllPresent = () => {
    const next: Record<number, AttendanceStatus> = {};
    for (const s of students) {
      next[s.id] = 'PRESENT';
    }
    setStatuses(next);
    showToast('success', 'Все студенты отмечены как «Присутствовал»');
  };

  const markRemainingPresent = () => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const s of students) {
        if (!next[s.id] || next[s.id] === 'UNMARKED') {
          next[s.id] = 'PRESENT';
        }
      }
      return next;
    });
    showToast('info', 'Оставшиеся студенты отмечены как «Присутствовал»');
  };

  const resetAllUnmarked = () => {
    const next: Record<number, AttendanceStatus> = {};
    for (const s of students) {
      next[s.id] = 'UNMARKED';
    }
    setStatuses(next);
    showToast('info', 'Все отметки сброшены');
  };

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let half = 0;
    let unmarked = 0;
    for (const s of students) {
      const st = statuses[s.id] ?? 'UNMARKED';
      if (st === 'PRESENT') present += 1;
      else if (st === 'ABSENT') absent += 1;
      else if (st === 'HALF_ABSENT') half += 1;
      else unmarked += 1;
    }
    const marked = present + absent + half;
    const missedHours = absent * 2 + half * 1;
    const total = students.length || 1;
    const percentMarked = Math.round((marked / total) * 100);

    return { present, absent, half, unmarked, marked, total: students.length, missedHours, percentMarked };
  }, [students, statuses]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [students, searchQuery]);

  // Keyboard navigation & quick status hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (focusedIndex !== null && filteredStudents[focusedIndex]) {
        const targetStudent = filteredStudents[focusedIndex];
        if (e.key === '1') {
          e.preventDefault();
          setStudentStatus(targetStudent.id, 'PRESENT');
        } else if (e.key === '2') {
          e.preventDefault();
          setStudentStatus(targetStudent.id, 'HALF_ABSENT');
        } else if (e.key === '3') {
          e.preventDefault();
          setStudentStatus(targetStudent.id, 'ABSENT');
        } else if (e.key === '0') {
          e.preventDefault();
          setStudentStatus(targetStudent.id, 'UNMARKED');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) => (prev !== null && prev < filteredStudents.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredStudents.length - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, filteredStudents]);

  const executeSave = async () => {
    if (typeof subjectId !== 'number') {
      showToast('warning', 'Выберите предмет перед сохранением');
      return;
    }
    if (students.length === 0) {
      showToast('warning', 'Нет активных студентов для отметки');
      return;
    }

    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? 'UNMARKED',
      }));

      if (editingLessonId) {
        await api.updateLesson(editingLessonId, {
          date,
          subjectId,
          lessonNumber,
        });
        await api.saveLessonAttendance(editingLessonId, records);
        showToast('success', 'Посещаемость занятия обновлена');
      } else {
        try {
          const created = await api.createLesson({
            date,
            subjectId,
            lessonNumber,
            records,
          });
          setEditingLessonId(created.lesson.id);
          showToast('success', 'Занятие и посещаемость сохранены');
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const existingId = (err.details as { existingLessonId?: number })?.existingLessonId;
            if (existingId) {
              await api.saveLessonAttendance(existingId, records);
              setEditingLessonId(existingId);
              showToast('success', 'Существующее занятие обновлено без дубликатов');
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
      setUnmarkedConfirmOpen(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка сохранения занятия');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (typeof subjectId !== 'number') {
      showToast('warning', 'Выберите предмет');
      return;
    }
    if (summary.unmarked > 0) {
      setUnmarkedConfirmOpen(true);
      return;
    }
    executeSave();
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-accent-soft" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Smart Live Time Banner */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  timeSlotInfo.isCurrentlyActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  timeSlotInfo.isCurrentlyActive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  {timeSlotInfo.statusLabel}
                </span>
                {autoInfo.subjectName && (
                  <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-soft border border-accent/30">
                    {autoInfo.subjectName}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Автоопределение: {weekNum} неделя расписания • {summary.marked} из {summary.total} студентов отмечено
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyCurrentTimeLesson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-soft hover:bg-accent/25 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Выбрать по текущему времени</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header & Main Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Отметка посещаемости
            </h1>
            {editingLessonId && (
              <span className="rounded-lg bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/25">
                Занятие #{editingLessonId}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            Группа ВЕБ-32К • Номер пары подбирается автоматически по расписанию звонков
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || subjects.length === 0 || students.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-md shadow-accent/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{editingLessonId ? 'Обновить занятие' : 'Сохранить занятие'}</span>
          </button>
        </div>
      </div>

      {/* Lesson Parameters & Bell Schedule */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Date Picker */}
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Дата занятия</span>
              <span className="text-[11px] text-indigo-400 font-medium">{weekNum}-я неделя</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleParamsChange(e.target.value, subjectId, lessonNumber)}
              className="w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            />
          </div>

          {/* Subject Selector */}
          <div className="md:col-span-8">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Предмет</label>
            <select
              value={subjectId}
              onChange={(e) =>
                handleParamsChange(
                  date,
                  e.target.value ? Number(e.target.value) : '',
                  lessonNumber,
                )
              }
              className="w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
            >
              {subjects.length === 0 && <option value="">Нет активных предметов</option>}
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pair Number with Exact Bell Times */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">
              Номер пары и расписание звонков:
            </label>
            <span className="text-[11px] text-slate-500">
              Звонки: 08:30 – 19:15
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {LESSON_TIME_SLOTS.map((slot) => {
              const isSelected = lessonNumber === slot.number;
              const isCurrentTime = timeSlotInfo.slot.number === slot.number;

              return (
                <button
                  key={slot.number}
                  type="button"
                  onClick={() => handleParamsChange(date, subjectId, slot.number)}
                  className={`relative flex flex-col items-center justify-center rounded-xl p-2.5 text-center border transition-all ${
                    isSelected
                      ? 'bg-accent/20 border-accent text-accent-soft shadow-sm'
                      : 'bg-elevated border-borderSubtle text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {isCurrentTime && (
                    <span className="absolute -top-1.5 right-2 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                      Сейчас
                    </span>
                  )}
                  <span className="text-sm font-semibold">{slot.number} пара</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 opacity-60" />
                    {slot.timeRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick schedule buttons for the chosen day */}
        {daySchedule.length > 0 ? (
          <div className="pt-3 border-t border-borderSubtle/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              В этот день по расписанию:
            </span>
            {daySchedule.map((item, idx) => {
              const matchedSubj = subjects.find(
                (s) =>
                  s.name.toLowerCase() === item.subjectName.toLowerCase() ||
                  item.subjectName.toLowerCase().startsWith(s.name.toLowerCase()),
              );
              const isSelected =
                lessonNumber === item.lessonNumber && subjectId === matchedSubj?.id;
              const slot = LESSON_TIME_SLOTS.find((s) => s.number === item.lessonNumber);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (matchedSubj) {
                      handleParamsChange(date, matchedSubj.id, item.lessonNumber);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-accent/25 border-accent text-accent-soft font-semibold shadow-sm'
                      : 'bg-elevated/70 border-borderSubtle text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span className="font-bold opacity-80">{item.lessonNumber} пара ({slot?.start || ''})</span>
                  <span>•</span>
                  <span>{item.subjectName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pt-2.5 border-t border-borderSubtle/60 text-xs text-slate-500">
            В этот день по расписанию пар нет (самоподготовка или выходной)
          </div>
        )}
      </div>

      {/* Progress & Live Counters Bar */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4 space-y-3">
        {/* Progress distribution bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Прогресс отметки группы</span>
            <span className="font-semibold text-slate-200">
              {summary.marked} из {summary.total} студентов ({summary.percentMarked}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${(summary.present / summary.total) * 100}%` }}
              className="bg-emerald-500 transition-all duration-300"
              title={`Присутствуют: ${summary.present}`}
            />
            <div
              style={{ width: `${(summary.half / summary.total) * 100}%` }}
              className="bg-amber-500 transition-all duration-300"
              title={`Половина: ${summary.half}`}
            />
            <div
              style={{ width: `${(summary.absent / summary.total) * 100}%` }}
              className="bg-red-500 transition-all duration-300"
              title={`Отсутствуют: ${summary.absent}`}
            />
          </div>
        </div>

        {/* Counter Badges and Quick Bulk Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400">
              Присутствуют: <span className="font-bold">{summary.present}</span>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400">
              Половина (1ч): <span className="font-bold">{summary.half}</span>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400">
              Отсутствуют (2ч): <span className="font-bold">{summary.absent}</span>
            </div>
            <div className="rounded-xl bg-slate-500/10 border border-slate-500/20 px-3 py-1.5 text-xs font-medium text-slate-300">
              Не отмечено: <span className="font-bold">{summary.unmarked}</span>
            </div>
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300">
              Пропущено часов: <span className="font-bold">{summary.missedHours} ч</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              title="Отметить всех студентов группы как присутствующих"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Все присутствуют</span>
            </button>

            {summary.unmarked > 0 && summary.marked > 0 && (
              <button
                type="button"
                onClick={markRemainingPresent}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                title="Отметить оставшихся неотмеченных студентов как присутствующих"
              >
                <UserCheck className="h-4 w-4" />
                <span>Оставшиеся присутствуют</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetAllUnmarked}
              className="inline-flex items-center gap-1.5 rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Сбросить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Input & Keyboard Hints */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Быстрый поиск студента по ФИО..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-borderSubtle bg-surface pl-10 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span>Горячие клавиши:</span>
          <kbd className="rounded bg-elevated px-1.5 py-0.5 border border-borderSubtle text-slate-300">1</kbd> Присутствовал
          <kbd className="rounded bg-elevated px-1.5 py-0.5 border border-borderSubtle text-slate-300">2</kbd> Половина
          <kbd className="rounded bg-elevated px-1.5 py-0.5 border border-borderSubtle text-slate-300">3</kbd> Отсутствовал
          <kbd className="rounded bg-elevated px-1.5 py-0.5 border border-borderSubtle text-slate-300">0</kbd> Сброс
        </div>
      </div>

      {/* Students Attendance List */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden shadow-sm">
        {checkingLesson ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {searchQuery ? 'Студенты по запросу не найдены' : 'Список активных студентов пуст'}
          </div>
        ) : (
          <div className="divide-y divide-borderSubtle/60">
            {filteredStudents.map((student, idx) => {
              const current = statuses[student.id] ?? 'UNMARKED';
              const isFocused = focusedIndex === idx;

              return (
                <div
                  key={student.id}
                  ref={(el) => (studentRowsRef.current[idx] = el)}
                  tabIndex={0}
                  onFocus={() => setFocusedIndex(idx)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 transition-colors outline-none ${
                    isFocused ? 'bg-elevated/80 ring-1 ring-accent/40' : 'hover:bg-elevated/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-semibold text-slate-500">
                      {idx + 1}.
                    </span>
                    <span className="text-sm font-medium text-slate-100 truncate">
                      {student.fullName}
                    </span>
                    {current === 'UNMARKED' ? (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 border border-borderSubtle">
                        Не отмечен
                      </span>
                    ) : current === 'PRESENT' ? (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/25">
                        Был
                      </span>
                    ) : current === 'HALF_ABSENT' ? (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/25">
                        1 час
                      </span>
                    ) : (
                      <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400 border border-red-500/25">
                        2 часа
                      </span>
                    )}
                  </div>

                  {/* 3 Large Touch-Friendly Status Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.id, 'PRESENT')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all ${
                        current === 'PRESENT'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-elevated border-borderSubtle text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Был</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.id, 'HALF_ABSENT')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all ${
                        current === 'HALF_ABSENT'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-elevated border-borderSubtle text-slate-400 hover:text-amber-300 hover:border-amber-500/40'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>0.5 пары</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.id, 'ABSENT')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all ${
                        current === 'ABSENT'
                          ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                          : 'bg-elevated border-borderSubtle text-slate-400 hover:text-red-300 hover:border-red-500/40'
                      }`}
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Не был</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Sticky Bar for fast saving when scrolling */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-borderSubtle bg-surface/95 backdrop-blur p-3 sm:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="text-xs">
            <span className="font-semibold text-slate-100">
              {summary.marked}/{summary.total} отмечено
            </span>
            <div className="text-[11px] text-slate-400">
              {summary.missedHours} ч пропусков
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving || subjects.length === 0 || students.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors shadow-md shadow-accent/25"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{editingLessonId ? 'Обновить' : 'Сохранить'}</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        open={unmarkedConfirmOpen}
        variant="warning"
        title="Остались неотмеченные студенты"
        description={`У ${summary.unmarked} студентов статус «Не отмечен». Они не будут засчитаны как отсутствующие и не повлияют на процент посещаемости. Сохранить занятие?`}
        confirmLabel="Сохранить как есть"
        loading={saving}
        onConfirm={executeSave}
        onCancel={() => setUnmarkedConfirmOpen(false)}
      />
    </div>
  );
}
