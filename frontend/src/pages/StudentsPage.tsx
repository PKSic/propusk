import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArchiveRestore,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { api } from '../api/client';
import type { Student } from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [newFullName, setNewFullName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmArchive, setConfirmArchive] = useState<Student | null>(null);
  const [archiving, setArchiving] = useState(false);

  const { showToast } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.getStudents({ includeArchived, search, sort });
      setStudents(res.students);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки студентов');
    } finally {
      setLoading(false);
    }
  }, [includeArchived, search, sort, showToast]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 200);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFullName.trim();
    if (trimmed.length < 2) {
      showToast('warning', 'Введите ФИО студента (минимум 2 символа)');
      return;
    }
    setAdding(true);
    try {
      await api.createStudent(trimmed);
      setNewFullName('');
      showToast('success', 'Студент добавлен в группу ВЕБ-32К');
      fetchStudents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Не удалось добавить студента');
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      showToast('warning', 'ФИО должно содержать минимум 2 символа');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateStudent(editingStudent.id, { fullName: trimmed });
      setEditingStudent(null);
      showToast('success', 'ФИО студента обновлено');
      fetchStudents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!confirmArchive) return;
    setArchiving(true);
    try {
      await api.deleteStudent(confirmArchive.id, false);
      setConfirmArchive(null);
      showToast('success', 'Студент перенесён в архив. История посещаемости сохранена.');
      fetchStudents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка архивирования');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async (student: Student) => {
    try {
      await api.updateStudent(student.id, { isActive: true });
      showToast('success', `${student.fullName} восстановлен(а) в активный список`);
      fetchStudents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка восстановления');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Студенты</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Управление списком группы ВЕБ-32К и индивидуальная статистика
        </p>
      </div>

      {/* Add Student Form */}
      <form
        onSubmit={handleAddStudent}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-borderSubtle bg-surface p-4"
      >
        <div className="relative flex-1">
          <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            placeholder="Введите ФИО нового студента..."
            className="w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>Добавить студента</span>
        </button>
      </form>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ФИО..."
            className="w-full rounded-xl border border-borderSubtle bg-surface pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none"
            >
              <option value="name_asc">По ФИО (А–Я)</option>
              <option value="name_desc">По ФИО (Я–А)</option>
              <option value="missed_desc">Больше пропусков</option>
              <option value="missed_asc">Меньше пропусков</option>
              <option value="rate_asc">Ниже посещаемость</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-borderSubtle bg-elevated text-accent focus:ring-0"
            />
            <span>Показать архивных</span>
          </label>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-borderSubtle bg-surface overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Студенты не найдены.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-borderSubtle bg-elevated/50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">ФИО</th>
                  <th className="px-5 py-3 font-medium">За неделю</th>
                  <th className="px-5 py-3 font-medium">За месяц</th>
                  <th className="px-5 py-3 font-medium">Всего (уваж. / неуваж.)</th>
                  <th className="px-5 py-3 font-medium">Посещаемость</th>
                  <th className="px-5 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle/60">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-elevated/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/students/${student.id}`}
                        className="inline-flex items-center gap-2 font-medium text-slate-100 hover:text-accent-soft transition-colors"
                      >
                        <span>{student.fullName}</span>
                        {!student.isActive && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400 border border-borderSubtle">
                            Архив
                          </span>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{student.stats.weekMissedHours} ч</td>
                    <td className="px-5 py-3.5 text-slate-300">{student.stats.monthMissedHours} ч</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span
                          className={`font-semibold ${
                            student.stats.missedHours > 0 ? 'text-red-400' : 'text-slate-300'
                          }`}
                        >
                          {student.stats.missedHours} ч
                        </span>
                        {student.stats.missedHours > 0 && (
                          <span className="text-[11px] text-slate-400">
                            (<span className="text-sky-400">{student.stats.excusedMissedHours} ув.</span>
                            {' / '}
                            <span className="text-red-300">{student.stats.unexcusedMissedHours} неув.</span>)
                          </span>
                        )}
                        {(student.certificatesCount ?? 0) > 0 && (
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/20">
                            справок: {student.certificatesCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {student.stats.attendanceRate !== null
                        ? `${student.stats.attendanceRate}%`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent(student);
                            setEditName(student.fullName);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200 transition-colors"
                          title="Редактировать ФИО"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {student.isActive ? (
                          <button
                            type="button"
                            onClick={() => setConfirmArchive(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Архивировать студента"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                            title="Восстановить"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl border border-borderSubtle bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-slate-100">Редактирование ФИО</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-4 w-full rounded-xl border border-borderSubtle bg-elevated px-3.5 py-2.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-xl border border-borderSubtle bg-elevated px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {savingEdit ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmArchive)}
        variant="danger"
        title="Удалить (архивировать) студента?"
        description={`Студент «${confirmArchive?.fullName}» будет скрыт из списка ежедневной отметки, но вся история его посещаемости и пропусков сохранится в базе данных.`}
        confirmLabel="Архивировать"
        loading={archiving}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setConfirmArchive(null)}
      />
    </div>
  );
}
