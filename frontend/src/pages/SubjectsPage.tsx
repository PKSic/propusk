import React, { useCallback, useEffect, useState } from 'react';
import {
  ArchiveRestore,
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import type { Subject } from '../types';
import { useToast } from '../components/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.getSubjects(includeArchived);
      setSubjects(res.subjects);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка загрузки предметов');
    } finally {
      setLoading(false);
    }
  }, [includeArchived, showToast]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      showToast('warning', 'Название предмета должно содержать минимум 2 символа');
      return;
    }
    setAdding(true);
    try {
      await api.createSubject(trimmed);
      setNewName('');
      showToast('success', 'Предмет добавлен');
      fetchSubjects();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Не удалось добавить предмет');
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      showToast('warning', 'Название должно содержать минимум 2 символа');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateSubject(editing.id, { name: trimmed });
      setEditing(null);
      showToast('success', 'Название предмета обновлено');
      fetchSubjects();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка обновления предмета');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteSubject(confirmDelete.id);
      setConfirmDelete(null);
      if (res.archived) {
        showToast('success', 'Предмет перенесён в архив (история занятий сохранена)');
      } else {
        showToast('success', 'Предмет удалён');
      }
      fetchSubjects();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка удаления предмета');
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (subject: Subject) => {
    try {
      await api.updateSubject(subject.id, { isActive: true });
      showToast('success', `Предмет «${subject.name}» восстановлен`);
      fetchSubjects();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ошибка восстановления');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Предметы</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Учебные дисциплины группы ВЕБ-32К и количество проведённых занятий
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-borderSubtle bg-elevated text-accent focus:ring-0"
          />
          <span>Показать архивные</span>
        </label>
      </div>

      {/* Add Subject */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-borderSubtle bg-surface p-4"
      >
        <div className="relative flex-1">
          <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название учебного предмета..."
            className="w-full rounded-xl border border-borderSubtle bg-elevated pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>Добавить предмет</span>
        </button>
      </form>

      {/* Subjects Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-soft" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-borderSubtle bg-surface p-8 text-center text-sm text-slate-500">
          Предметы ещё не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-2xl border border-borderSubtle bg-surface p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium text-slate-100">{subject.name}</h3>
                  {!subject.isActive && (
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 border border-borderSubtle">
                      Архив
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Проведено занятий:{' '}
                  <span className="font-semibold text-slate-200">{subject.lessonsCount}</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-borderSubtle/60">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(subject);
                    setEditName(subject.name);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-elevated transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Изменить</span>
                </button>
                {subject.isActive ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(subject)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{subject.lessonsCount > 0 ? 'В архив' : 'Удалить'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRestore(subject)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    <span>Восстановить</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl border border-borderSubtle bg-surface p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-slate-100">Изменить название предмета</h3>
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
                onClick={() => setEditing(null)}
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
        open={Boolean(confirmDelete)}
        variant="danger"
        title={
          confirmDelete && confirmDelete.lessonsCount > 0
            ? 'Архивировать предмет?'
            : 'Удалить предмет?'
        }
        description={
          confirmDelete && confirmDelete.lessonsCount > 0
            ? `По предмету «${confirmDelete.name}» уже проведено ${confirmDelete.lessonsCount} занятий. Он будет скрыт из выбора для новых пар, но история сохранится.`
            : `Предмет «${confirmDelete?.name}» будет безвозвратно удалён.`
        }
        confirmLabel={confirmDelete && confirmDelete.lessonsCount > 0 ? 'Архивировать' : 'Удалить'}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
