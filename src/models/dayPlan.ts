export type TransportMode = 'walk' | 'metro' | 'taxi' | 'train';

export interface DayPlanItem {
  spot_id: string;
  start_time: string;
  end_time: string;
  note: string;
  transport: TransportMode;
}

// 合并冲突时进入待处理区的条目；保留来源项原始内容和撞上的目标项快照
export interface PendingMergeItem {
  id: string;
  source_day_index: number;
  spot_id: string;
  item: DayPlanItem;
  conflict_spot_id: string;
  conflict_item: DayPlanItem;
  created_at: string;
}

export interface DayPlan {
  id: string;
  trip_id: string;
  day_index: number;
  date: string;
  items: DayPlanItem[];
  pending_items?: PendingMergeItem[];
}
