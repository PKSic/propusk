export interface DateRange {
  from: Date;
  to: Date;
  fromStr: string;
  toStr: string;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw new Error(`Некорректный формат даты: "${value}". Ожидается YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Несуществующая дата: "${value}".`);
  }
  return date;
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toUtcDateOnly(ref: Date = new Date()): Date {
  return new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0));
}

export function getTodayRange(ref: Date = new Date()): DateRange {
  const start = toUtcDateOnly(ref);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999));
  return {
    from: start,
    to: end,
    fromStr: formatDateOnly(start),
    toStr: formatDateOnly(end),
  };
}

/**
 * Неделя начинается в понедельник и заканчивается в воскресенье.
 */
export function getWeekRange(ref: Date = new Date()): DateRange {
  const dayStart = toUtcDateOnly(ref);
  const utcDay = dayStart.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;

  const monday = new Date(dayStart);
  monday.setUTCDate(dayStart.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    from: monday,
    to: sunday,
    fromStr: formatDateOnly(monday),
    toStr: formatDateOnly(sunday),
  };
}

/**
 * Текущий календарный месяц: с 1-го по последнее число месяца.
 */
export function getMonthRange(ref: Date = new Date()): DateRange {
  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return {
    from: firstDay,
    to: lastDay,
    fromStr: formatDateOnly(firstDay),
    toStr: formatDateOnly(lastDay),
  };
}

export function getCustomRange(fromStr: string, toStr: string): DateRange {
  const from = parseDateOnly(fromStr);
  const toDate = parseDateOnly(toStr);
  const to = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999));
  if (from.getTime() > to.getTime()) {
    throw new Error('Дата начала периода не может быть позже даты окончания.');
  }
  return { from, to, fromStr, toStr };
}
