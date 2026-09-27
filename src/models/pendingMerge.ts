import type { DayPlanItem } from './dayPlan';

export interface PendingMergeConflictWith {
  spot_id: string;
  start_time: string;
}

export interface PendingMergeItem {
  id: string;
  trip_id: string;
  day_index: number;
  item: DayPlanItem;
  conflict_with: PendingMergeConflictWith;
  created_at: string;
}
