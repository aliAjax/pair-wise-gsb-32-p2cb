import type { DayPlanItem } from '../models/dayPlan';

export interface MergeConflict {
  item: DayPlanItem;
  conflictWith: DayPlanItem;
}

export interface MergeResult {
  items: DayPlanItem[];
  conflicts: MergeConflict[];
  added: number;
  keptEarlier: number;
}

export function timeToMinutes(time: string) {
  const [hours = '0', minutes = '0'] = String(time || '').split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function sortDayItems(items: DayPlanItem[]) {
  return [...items].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

export function mergeDayItems(targetItems: DayPlanItem[], sourceItems: DayPlanItem[]): MergeResult {
  const items = targetItems.map((item) => ({ ...item }));
  const conflicts: MergeConflict[] = [];
  let added = 0;
  let keptEarlier = 0;
  for (const rawSource of sourceItems) {
    const source = { ...rawSource };
    const sameSpot = items.find((item) => item.spot_id === source.spot_id);
    if (sameSpot) {
      if (timeToMinutes(source.start_time) < timeToMinutes(sameSpot.start_time)) {
        items[items.indexOf(sameSpot)] = source;
      }
      keptEarlier += 1;
      continue;
    }
    const sameTime = items.find((item) => item.start_time === source.start_time);
    if (sameTime) {
      conflicts.push({ item: source, conflictWith: { ...sameTime } });
      continue;
    }
    items.push(source);
    added += 1;
  }
  return { items: sortDayItems(items), conflicts, added, keptEarlier };
}
