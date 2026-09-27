<template>
  <main class="page">
    <h1>行程编排</h1>
    <section v-if="trip" class="band">
      <div class="toolbar">
        <label>目标日
          <el-select v-model="targetDayIndex" style="width: 150px">
            <el-option v-for="option in dayOptions" :key="option.dayIndex" :label="`第 ${option.dayIndex} 天 · ${option.date}`" :value="option.dayIndex" />
          </el-select>
        </label>
        <label>来源日
          <el-select v-model="sourceDayIndex" style="width: 150px">
            <el-option v-for="option in dayOptions.filter((option) => option.dayIndex !== targetDayIndex)" :key="option.dayIndex" :label="`第 ${option.dayIndex} 天 · ${option.date}`" :value="option.dayIndex" />
          </el-select>
        </label>
        <el-button type="primary" :disabled="!sourceDayIndex" @click="mergeDays">并入来源日景点</el-button>
      </div>
      <p class="muted">来源日保持不变；同一景点保留开始时间较早的一项，开始时间撞车的景点进入待处理区。</p>
    </section>

    <section class="band" v-if="trip">
      <strong>预算统计</strong>
      <p>天数 {{ stats.days }} · 景点 {{ stats.spotCount }}</p>
      <p class="muted">已花费 {{ formatCurrency(stats.budget.spent, trip.currency) }} · 剩余 {{ formatCurrency(stats.budget.remaining, trip.currency) }} {{ stats.budget.warning }}</p>
    </section>

    <section class="band">
      <p class="muted">拖拽排序由 SortableJS 接管；预算计算会同步影响详情页。</p>
      <div ref="listEl">
        <SpotMiniCard v-for="spot in daySpots" :key="spot.id" :spot="spot" />
      </div>
    </section>
    <DayTimeline v-if="day.id" :day="day" :spots="spotStore.spots" />

    <section class="band">
      <h3>{{ messages.pendingTitle }}</h3>
      <p v-if="!pendingItems.length" class="muted">{{ messages.pendingEmpty }}</p>
      <div v-for="entry in pendingItems" :key="entry.id" class="pending-row">
        <div>
          <strong>{{ spotName(entry.spot_id) }}</strong>
          <span class="muted">
            来源第 {{ entry.source_day_index }} 天 · {{ entry.item.start_time }}-{{ entry.item.end_time }} ·
            {{ transportText[entry.item.transport] }} · {{ entry.item.note }}
          </span>
          <p class="muted">
            {{ messages.pendingConflictHint
              .replace('{day}', String(targetDayIndex))
              .replace('{spot}', spotName(entry.conflict_spot_id))
              .replace('{time}', entry.conflict_item.start_time) }}
          </p>
        </div>
        <div class="toolbar">
          <el-button size="small" type="primary" @click="resolve(entry.id, 'keep')">保留来源项</el-button>
          <el-button size="small" @click="resolve(entry.id, 'discard')">丢弃</el-button>
        </div>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import Sortable, { type SortableEvent } from 'sortablejs';
import { useSpotStore } from '../stores/spotStore';
import { useTripStore } from '../stores/tripStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useTripStats } from '../hooks/useTripStats';
import type { DayPlan } from '../models/dayPlan';
import { messages } from '../constants/messages';
import { formatCurrency, transportText } from '../utils/formatters';
import { findDay } from '../utils/dayPlanData';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';

const route = useRoute();
const spotStore = useSpotStore();
const tripStore = useTripStore();
const dayPlanStore = useDayPlanStore();
const listEl = ref<HTMLElement>();
const tripId = String(route.params.tripId);
const targetDayIndex = ref(Number(route.params.dayIndex || 1));
const sourceDayIndex = ref<number | undefined>(undefined);

const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const stats = computed(() =>
  trip.value
    ? useTripStats(trip.value, dayPlanStore.dayPlans, spotStore.spots).value
    : { days: 0, spotCount: 0, budget: { spent: 0, remaining: 0, warning: '' } },
);

// 目标天候选来自旅行起止日期，并并入已存在但超出区间的行程天
const dayOptions = computed(() => {
  const span = trip.value
    ? dayjs(trip.value.end_date).diff(dayjs(trip.value.start_date), 'day') + 1
    : 1;
  const maxExisting = dayPlanStore.dayPlans
    .filter((day) => day.trip_id === tripId)
    .reduce((max, day) => Math.max(max, day.day_index), 0);
  const total = Math.max(span, maxExisting, 1);
  return Array.from({ length: total }, (_, index) => {
    const dayIndex = index + 1;
    const existing = dayPlanStore.dayPlans.find((day) => day.trip_id === tripId && day.day_index === dayIndex);
    const date = existing?.date || (trip.value ? dayjs(trip.value.start_date).add(index, 'day').format('YYYY-MM-DD') : '');
    return { dayIndex, date };
  });
});

watch(targetDayIndex, (value) => {
  if (value === sourceDayIndex.value) sourceDayIndex.value = undefined;
});

const EMPTY_DAY: DayPlan = { id: '', trip_id: tripId, day_index: 0, date: '', items: [], pending_items: [] };

// 只读现有行程，避免切换下拉时副作用式创建空天（虚增旅行天数统计）
const day = computed<DayPlan>(() => findDay(dayPlanStore.dayPlans, tripId, targetDayIndex.value) ?? EMPTY_DAY);
const daySpots = computed(() => day.value.items.map((item) => spotStore.spots.find((spot) => spot.id === item.spot_id)).filter(Boolean) as any[]);
const pendingItems = computed(() => day.value.pending_items ?? []);
const spotName = (id: string) => spotStore.spots.find((spot) => spot.id === id)?.name || '未知景点';

function mergeDays() {
  if (!sourceDayIndex.value) return;
  dayPlanStore.mergeDay(tripId, targetDayIndex.value, sourceDayIndex.value);
}
function resolve(pendingId: string, action: 'keep' | 'discard') {
  dayPlanStore.resolvePending(tripId, targetDayIndex.value, pendingId, action);
}

onMounted(() => {
  if (listEl.value) {
    new Sortable(listEl.value, {
      animation: 150,
      onEnd: (evt: SortableEvent) => dayPlanStore.reorder(tripId, targetDayIndex.value, evt.oldIndex || 0, evt.newIndex || 0),
    });
  }
});
</script>
<style scoped>
.pending-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 10px 0; border-bottom: 1px dashed #dbe7cf; }
</style>
