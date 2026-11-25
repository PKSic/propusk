import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  Filter,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import type { LessonDetail, LessonSummary, Student, Subject } from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

function formatRuDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export function LessonsHistoryPage() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');

  const [detailLesson, setDetailLesson] = useState<LessonDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<LessonSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [subjRes, studRes] = await Promise.all([
          api.getSubjects(true),
          api.getStudents({ includeArchived: true, sort: 'name_asc' }),
        ]);
        setSubjects(subjRes.subjects);
        setStudents(studRes.students);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки фильтров');
      }
    })();
  }, [showToast]);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLessons({
        from: from || undefined,
        to: to || undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        studentId: studentId ? Number(studentId) : undefined,
      });
      setLessons(res.lessons);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки истории занятий');
    } finally {
      setLoading(false);
    }
  }, [from, to, subjectId, studentId, showToast]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleOpenDetail = async (lessonId: number) => {
    setLoadingDetail(true);
    try {
      const res = await api.getLesson(lessonId);
      setDetailLesson(res.lesson);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Не удалось загрузить детали занятия');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteLesson(confirmDelete.id);
      setConfirmDelete(null);
      showToast('success', 'Занятие удалено, статистика пересчитана');
      fetchLessons();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка удаления занятия');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setFrom('');
    setTo('');
    setSubjectId('');
    setStudentId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">История занятий</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Архив проведённых пар с фильтрацией по дате, предмету и студенту
          </p>
        </div>
        <Link
          to="/attendance"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Новое занятие
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-3">
          <Filter className="h-3.5 w-3.5" />
          <span>Фильтры</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
            title="Дата с"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
            title="Дата по"
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
          >
            <option value="">Все студенты</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Сбросить</span>
          </button>
        </div>
      </div>

      {/* Lessons Table */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            По заданным фильтрам занятий не найдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-borderSubtle bg-elevated/50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium">Предмет</th>
                  <th className="px-5 py-3 font-medium">Пара</th>
                  <th className="px-5 py-3 font-medium">Присут.</th>
                  <th className="px-5 py-3 font-medium">Отсут.</th>
                  <th className="px-5 py-3 font-medium">Половина</th>
                  <th className="px-5 py-3 font-medium">Пропущено ч.</th>
                  <th className="px-5 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle/60">
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-elevated/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      {formatRuDate(lesson.date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-100">
                      {lesson.subject.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      {lesson.lessonNumber} пара
                    </td>
                    <td className="px-5 py-3.5 text-emerald-400 font-medium">
                      {lesson.presentCount}
                    </td>
                    <td className="px-5 py-3.5 text-red-400 font-medium">{lesson.absentCount}</td>
                    <td className="px-5 py-3.5 text-amber-400 font-medium">
                      {lesson.halfAbsentCount}
                    </td>
                    <td className="px-5 py-3.5 text-slate-200 font-semibold">
                      <span>{lesson.missedHours} ч</span>
                      {lesson.excusedMissedHours > 0 && (
                        <span className="ml-1.5 text-[11px] font-normal text-sky-400">
                          ({lesson.excusedMissedHours} ч ув.)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(lesson.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200 transition-colors"
                          title="Подробности"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/attendance?lessonId=${lesson.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-accent-soft transition-colors"
                          title="Редактировать посещаемость"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(lesson)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title="Удалить занятие"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lesson Detail Modal */}
      {(detailLesson || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-borderSubtle bg-surface shadow-2xl overflow-hidden">
            {loadingDetail ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
              </div>
            ) : (
              detailLesson && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-borderSubtle">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {detailLesson.subject.name} — {detailLesson.lessonNumber} пара
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Дата: {formatRuDate(detailLesson.date)} • Пропущено часов:{' '}
                        {detailLesson.missedHours} ч
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailLesson(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto divide-y divide-borderSubtle/60 px-6 py-2">
                    {detailLesson.attendances.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        Записей посещаемости нет.
                      </div>
                    ) : (
                      detailLesson.attendances.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between py-2.5 text-sm"
                        >
                          <Link
                            to={`/students/${rec.studentId}`}
                            className="text-slate-200 hover:text-accent-soft"
                          >
                            {rec.student.fullName}
                          </Link>
                          <div className="flex items-center gap-2">
                            {rec.isExcused && (
                              <span
                                className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/25"
                                title={rec.certificate?.reason || 'Уважительная причина'}
                              >
                                {rec.certificate ? 'По справке' : 'Уваж.'}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium border ${
                                rec.status === 'PRESENT'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : rec.status === 'HALF_ABSENT'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : rec.status === 'ABSENT'
                                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                      : 'bg-slate-800 text-slate-400 border-borderSubtle'
                              }`}
                            >
                              {rec.status === 'PRESENT'
                                ? 'Присутствовал'
                                : rec.status === 'HALF_ABSENT'
                                  ? 'Половина пары (1 ч)'
                                  : rec.status === 'ABSENT'
                                    ? 'Отсутствовал (2 ч)'
                                    : 'Не отмечен'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-borderSubtle bg-elevated/40">
                    <Link
                      to={`/attendance?lessonId=${detailLesson.id}`}
                      className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                    >
                      Редактировать посещаемость
                    </Link>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        variant="danger"
        title="Удалить занятие?"
        description={`Занятие по предмету «${confirmDelete?.subject.name}» (${confirmDelete ? formatRuDate(confirmDelete.date) : ''}, ${confirmDelete?.lessonNumber} пара) и все связанные отметки посещаемости будут удалены, а статистика автоматически пересчитается.`}
        confirmLabel="Удалить занятие"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
