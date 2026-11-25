import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  CheckSquare,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Menu,
  Calendar,
  Users,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Посещаемость', icon: CheckSquare },
  { to: '/schedule', label: 'Расписание', icon: Calendar },
  { to: '/students', label: 'Студенты', icon: Users },
  { to: '/certificates', label: 'Справки', icon: FileText },
  { to: '/subjects', label: 'Предметы', icon: BookOpen },
  { to: '/history', label: 'История занятий', icon: History },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-surface border-r border-borderSubtle">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-borderSubtle">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent-soft">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-100">
                Attendance Manager
              </div>
              <div className="text-xs text-slate-400">Учёт посещаемости</div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-elevated hover:text-slate-200"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent/15 text-accent-soft border border-accent/25'
                      : 'text-slate-400 hover:bg-elevated hover:text-slate-100 border border-transparent'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-borderSubtle">
        <div className="rounded-xl border border-borderSubtle bg-elevated px-3.5 py-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Учебная группа
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-100">ВЕБ-32К</span>
            <span className="inline-flex items-center rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
              Активна
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-borderSubtle/60 text-[11px] text-slate-400">
            Куратор: <span className="text-slate-200 font-medium">Гаврилова А. О.</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-borderSubtle bg-surface/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent-soft">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-100">Attendance Manager</span>
              <span className="ml-2 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-medium text-indigo-300">
                ВЕБ-32К
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-borderSubtle bg-elevated p-2 text-slate-300 hover:text-white"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
