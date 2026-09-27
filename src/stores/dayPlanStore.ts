import { defineStore } from 'pinia';
import type { DayPlan, DayPlanItem } from '../models/dayPlan';
import { dayPlanApi } from '../api/dayPlanApi';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import { mergeSourceDay, resolvePendingItem } from '../utils/dayMerge';
import { findDay } from '../utils/dayPlanData';

export const useDayPlanStore = defineStore('dayPlan', {
  state: () => ({ dayPlans: dayPlanApi.list() as DayPlan[] }),
  actions: {
    persist() {
      dayPlanApi.save(this.dayPlans);
    },
    ensureDay(tripId: string, dayIndex = 1, date = new Date().toISOString().slice(0, 10)) {
      let day = findDay(this.dayPlans, tripId, dayIndex);
      if (!day) {
        day = { id: crypto.randomUUID(), trip_id: tripId, day_index: dayIndex, date, items: [], pending_items: [] };
        this.dayPlans.push(day);
        this.persist();
      }
      if (!day.pending_items) day.pending_items = [];
      return day;
    },
    addSpot(tripId: string, spotId: string, dayIndex = 1) {
      const day = this.ensureDay(tripId, dayIndex);
      const item: DayPlanItem = { spot_id: spotId, start_time: '10:00', end_time: '12:00', note: '现场调整', transport: 'metro' };
      day.items.push(item);
      this.persist();
      toast.ok(messages.spotAdded);
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      this.persist();
    },
    // 整日合并复制：来源日保持不变，结果写入目标日并持久化（重开后待处理项仍在）
    mergeDay(tripId: string, targetDayIndex: number, sourceDayIndex: number) {
      if (targetDayIndex === sourceDayIndex) {
        toast.warn(messages.mergeSameDay);
        return { mergedCount: 0, conflictCount: 0 };
      }
      const target = this.ensureDay(tripId, targetDayIndex);
      const source = findDay(this.dayPlans, tripId, sourceDayIndex);
      if (!source || !source.items.length) {
        toast.warn(messages.mergeSourceMissing);
        return { mergedCount: 0, conflictCount: 0 };
      }
      const result = mergeSourceDay(target.items, source.items, sourceDayIndex);
      target.items = result.items;
      target.pending_items = [...(target.pending_items ?? []), ...result.pending];
      this.persist();
      toast.ok(messages.mergeDone.replace('{merged}', String(result.mergedCount)).replace('{conflict}', String(result.conflictCount)));
      return { mergedCount: result.mergedCount, conflictCount: result.conflictCount };
    },
    resolvePending(tripId: string, dayIndex: number, pendingId: string, action: 'keep' | 'discard') {
      const day = findDay(this.dayPlans, tripId, dayIndex);
      if (!day || !day.pending_items) return;
      const result = resolvePendingItem(day.items, day.pending_items, pendingId, action);
      day.items = result.items;
      day.pending_items = result.pending;
      this.persist();
      toast.ok(action === 'keep' ? messages.mergePendingKept : messages.mergePendingDiscarded);
    },
  },
});
