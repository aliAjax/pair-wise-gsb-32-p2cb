import type { DayPlanItem, PendingMergeItem } from '../models/dayPlan';

export interface MergeDayResult {
  items: DayPlanItem[];
  pending: PendingMergeItem[];
  mergedCount: number;
  conflictCount: number;
}

// 整日合并规则：
// 1. 同一景点 -> 仅保留开始时间较早的一项，备注与交通方式不被覆盖；
// 2. 不同景点但开始时间相同 -> 来源项进入待处理区，并记录撞上的目标项；
// 3. 其余来源景点追加到当天列表，来源日数据由调用方保持原样。
export function mergeSourceDay(
  targetItems: DayPlanItem[],
  sourceItems: DayPlanItem[],
  sourceDayIndex: number,
): MergeDayResult {
  const items = [...targetItems];
  const pending: PendingMergeItem[] = [];
  let mergedCount = 0;
  let conflictCount = 0;

  sourceItems.forEach((source) => {
    const sameIndex = items.findIndex((item) => item.spot_id === source.spot_id);
    if (sameIndex >= 0) {
      const target = items[sameIndex];
      // 仅替换时间字段；开始时间相同时保留目标项（含原备注、交通方式）
      if (source.start_time < target.start_time) {
        items[sameIndex] = { ...target, start_time: source.start_time, end_time: source.end_time };
      }
      mergedCount += 1;
      return;
    }

    // 只与目标日原有项比较；本次追加的来源项不算“目标项”
    const conflict = targetItems.find((item) => item.start_time === source.start_time);
    if (conflict) {
      pending.push({
        id: crypto.randomUUID(),
        source_day_index: sourceDayIndex,
        spot_id: source.spot_id,
        item: { ...source },
        conflict_spot_id: conflict.spot_id,
        conflict_item: { ...conflict },
        created_at: new Date().toISOString(),
      });
      conflictCount += 1;
      return;
    }

    items.push({ ...source });
    mergedCount += 1;
  });

  return { items, pending, mergedCount, conflictCount };
}

// 待处理项人工解决：保留来源项则追加进当天列表（原备注与交通方式随来源项带入），丢弃则只移除待处理记录
export function resolvePendingItem(
  targetItems: DayPlanItem[],
  pending: PendingMergeItem[],
  pendingId: string,
  action: 'keep' | 'discard',
): { items: DayPlanItem[]; pending: PendingMergeItem[] } {
  const entry = pending.find((item) => item.id === pendingId);
  if (!entry) return { items: targetItems, pending };
  return {
    items: action === 'keep' ? [...targetItems, { ...entry.item }] : targetItems,
    pending: pending.filter((item) => item.id !== pendingId),
  };
}
