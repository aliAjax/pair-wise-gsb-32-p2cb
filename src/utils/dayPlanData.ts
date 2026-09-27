import type { DayPlan, DayPlanItem } from '../models/dayPlan';

// 持久化数据规整：旧版本数据可能没有 items / pending_items 字段
export function normalizeDayPlans(raw: unknown): DayPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((day): day is Partial<DayPlan> => !!day && typeof day === 'object')
    .map((day, index) => ({
      id: String(day.id ?? `day-${index}`),
      trip_id: String(day.trip_id ?? ''),
      day_index: Number(day.day_index ?? index + 1),
      date: String(day.date ?? new Date().toISOString().slice(0, 10)),
      items: Array.isArray(day.items) ? day.items.map(normalizeItem) : [],
      pending_items: Array.isArray(day.pending_items) ? day.pending_items.map((entry) => ({ ...entry })) : [],
    }));
}

export function normalizeItem(raw: Partial<DayPlanItem>): DayPlanItem {
  return {
    spot_id: String(raw.spot_id ?? ''),
    start_time: String(raw.start_time ?? '10:00'),
    end_time: String(raw.end_time ?? '12:00'),
    note: String(raw.note ?? ''),
    transport: (raw.transport as DayPlanItem['transport']) ?? 'metro',
  };
}

export function findDay(dayPlans: DayPlan[], tripId: string, dayIndex: number) {
  return dayPlans.find((day) => day.trip_id === tripId && day.day_index === dayIndex);
}
