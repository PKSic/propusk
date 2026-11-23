import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, CheckSquare, Clock } from 'lucide-react';
import {
  SCHEDULE_WEEK_1,
  SCHEDULE_WEEK_2,
  type DaySchedule,
  getWeekNumberForDate,
  LESSON_TIME_SLOTS,
} from '../data/schedule';

export function SchedulePage() {
  const navigate = useNavigate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentWeek = getWeekNumberForDate(todayIso);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2>(currentWeek);

  const schedule: DaySchedule[] = selectedWeek === 1 ? SCHEDULE_WEEK_1 : SCHEDULE_WEEK_2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Расписание занятий
            </h1>
            <span className="rounded-lg bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/25">
              ВЕБ-32К
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            Двухнедельный цикл расписания • Куратор: Гаврилова Анна Олеговна
          </p>
        </div>

        {/* Week Switcher */}
        <div className="inline-flex rounded-xl border border-borderSubtle bg-surface p-1">
          <button
            type="button"
            onClick={() => setSelectedWeek(1)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedWeek === 1
                ? 'bg-accent text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1 неделя {currentWeek === 1 && '(Текущая)'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedWeek(2)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedWeek === 2
                ? 'bg-accent text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2 неделя {currentWeek === 2 && '(Текущая)'}
          </button>
        </div>
      </div>

      {/* Bell Schedule Strip */}
      <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-3">
          <Bell className="h-4 w-4 text-accent-soft" />
          <span>Расписание звонков:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LESSON_TIME_SLOTS.map((slot) => (
            <div
              key={slot.number}
              className="flex flex-col items-center justify-center rounded-xl border border-borderSubtle bg-elevated/50 p-2 text-center"
            >
              <span className="text-xs font-bold text-slate-200">{slot.number} пара</span>
              <span className="text-[11px] text-accent-soft mt-0.5 font-medium">{slot.timeRange}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {schedule.map((day) => (
          <div
            key={day.dayName}
            className="flex flex-col rounded-2xl border border-borderSubtle bg-surface overflow-hidden shadow-sm"
          >
            <div className="border-b border-borderSubtle bg-elevated/70 px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-slate-100">{day.dayName}</span>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-borderSubtle">
                {day.lessons.length} {day.lessons.length === 1 ? 'пара' : day.lessons.length >= 2 && day.lessons.length <= 4 ? 'пары' : 'пар'}
              </span>
            </div>

            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
              {day.lessons.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Нет пар (самоподготовка)
                </div>
              ) : (
                <div className="space-y-2">
                  {day.lessons.map((lesson, idx) => {
                    const slot = LESSON_TIME_SLOTS.find((s) => s.number === lesson.lessonNumber);
                    return (
                      <div
                        key={idx}
                        className="group flex items-start justify-between gap-2 rounded-xl border border-borderSubtle bg-elevated/40 p-2.5 hover:border-accent/50 hover:bg-elevated transition-colors"
                      >
                        <div className="min-w-0 flex items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent/15 border border-accent/25 text-xs font-semibold text-accent-soft">
                            {lesson.lessonNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-100 truncate">
                              {lesson.subjectName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <Clock className="h-3 w-3 opacity-70" />
                              <span>{slot?.timeRange || `Пара ${lesson.lessonNumber}`}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate('/attendance')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-slate-400 hover:text-accent-soft hover:bg-accent/10"
                          title="Отметить посещаемость"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Info Banner */}
      <div className="rounded-2xl border border-borderSubtle bg-gradient-to-r from-accent/10 via-surface to-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 border border-accent/30 text-accent-soft">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">
              Умная отметка посещаемости по расписанию и звонкам
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              В разделе «Посещаемость» пара и предмет выбираются автоматически в зависимости от текущего времени
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors shadow-md shadow-accent/25"
        >
          <CheckSquare className="h-4 w-4" />
          <span>Перейти к отметке</span>
        </button>
      </div>
    </div>
  );
}
