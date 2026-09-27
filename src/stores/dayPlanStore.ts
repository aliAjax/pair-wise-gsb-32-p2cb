import { defineStore } from 'pinia';
import type { DayPlan, DayPlanItem } from '../models/dayPlan';
import type { PendingMergeItem } from '../models/pendingMerge';
import { dayPlanApi } from '../api/dayPlanApi';
import { pendingMergeApi } from '../api/pendingMergeApi';
import { mergeDayItems, sortDayItems } from '../utils/dayMerge';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';

export const useDayPlanStore = defineStore('dayPlan', {
  state: () => ({
    dayPlans: dayPlanApi.list() as DayPlan[],
    pendingMerges: pendingMergeApi.list() as PendingMergeItem[],
  }),
  actions: {
    ensureDay(tripId: string, dayIndex = 1, date = new Date().toISOString().slice(0, 10)) {
      let day = this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
      if (!day) {
        day = { id: crypto.randomUUID(), trip_id: tripId, day_index: dayIndex, date, items: [] };
        this.dayPlans.push(day);
      }
      return day;
    },
    addSpot(tripId: string, spotId: string, dayIndex = 1) {
      const day = this.ensureDay(tripId, dayIndex);
      const item: DayPlanItem = { spot_id: spotId, start_time: '10:00', end_time: '12:00', note: '现场调整', transport: 'metro' };
      day.items.push(item);
      dayPlanApi.save(this.dayPlans);
      toast.ok(messages.spotAdded);
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      dayPlanApi.save(this.dayPlans);
    },
    mergeDay(tripId: string, sourceDayIndex: number, targetDayIndex: number, targetDate?: string) {
      if (sourceDayIndex === targetDayIndex) {
        toast.warn(messages.mergeSameDay);
        return null;
      }
      const source = this.dayPlans.find((day) => day.trip_id === tripId && day.day_index === sourceDayIndex);
      const sourceItems = source ? source.items : [];
      if (!sourceItems.length) {
        toast.warn(messages.mergeEmptySource);
        return null;
      }
      const target = this.ensureDay(tripId, targetDayIndex, targetDate);
      const result = mergeDayItems(target.items, sourceItems);
      target.items = result.items;
      const createdAt = new Date().toISOString();
      const pending: PendingMergeItem[] = result.conflicts.map((conflict) => ({
        id: crypto.randomUUID(),
        trip_id: tripId,
        day_index: targetDayIndex,
        item: conflict.item,
        conflict_with: { spot_id: conflict.conflictWith.spot_id, start_time: conflict.conflictWith.start_time },
        created_at: createdAt,
      }));
      if (pending.length) this.pendingMerges = [...this.pendingMerges, ...pending];
      dayPlanApi.save(this.dayPlans);
      pendingMergeApi.save(this.pendingMerges);
      toast.ok(messages.mergeDone(result.added, result.keptEarlier, pending.length));
      return result;
    },
    resolvePending(id: string) {
      const pending = this.pendingMerges.find((item) => item.id === id);
      if (!pending) return;
      const day = this.ensureDay(pending.trip_id, pending.day_index);
      day.items = sortDayItems([...day.items, { ...pending.item }]);
      this.pendingMerges = this.pendingMerges.filter((item) => item.id !== id);
      dayPlanApi.save(this.dayPlans);
      pendingMergeApi.save(this.pendingMerges);
      toast.ok(messages.pendingResolved);
    },
    dismissPending(id: string) {
      this.pendingMerges = this.pendingMerges.filter((item) => item.id !== id);
      pendingMergeApi.save(this.pendingMerges);
      toast.ok(messages.pendingDismissed);
    },
  },
});
