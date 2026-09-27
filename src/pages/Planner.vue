<template>
  <main class="page">
    <h1>行程编排</h1>
    <section class="band">
      <p class="muted">拖拽排序由 SortableJS 接管；预算计算会同步影响详情页。</p>
      <div ref="listEl">
        <SpotMiniCard v-for="spot in daySpots" :key="spot.id" :spot="spot" />
      </div>
    </section>
    <section class="band">
      <h3>整日合并复制</h3>
      <p class="muted">把第 {{ dayIndex }} 天（来源日）的景点并入目标日，来源日保持不变；开始时间撞车的景点会进入待处理区。</p>
      <div class="merge-bar">
        <el-select v-model="targetDayIndex" placeholder="选择目标日" style="width: 220px">
          <el-option v-for="option in targetOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" :disabled="!targetDayIndex" @click="runMerge">合并复制到目标日</el-button>
      </div>
    </section>
    <PendingMergePanel
      :items="tripPendingMerges"
      :spots="spotStore.spots"
      @resolve="dayPlanStore.resolvePending"
      @dismiss="dayPlanStore.dismissPending"
    />
    <DayTimeline v-if="day" :day="day" :spots="spotStore.spots" />
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Sortable, { type SortableEvent } from 'sortablejs';
import dayjs from 'dayjs';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import PendingMergePanel from '../components/common/PendingMergePanel.vue';
const route = useRoute();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const listEl = ref<HTMLElement>();
const tripId = String(route.params.tripId);
const dayIndex = Number(route.params.dayIndex || 1);
const targetDayIndex = ref<number>();
const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const day = computed(() => dayPlanStore.ensureDay(tripId, dayIndex));
const daySpots = computed(() => day.value.items.map((item) => spotStore.spots.find((spot) => spot.id === item.spot_id)).filter(Boolean) as any[]);
const dayCount = computed(() => {
  const fromTrip = trip.value ? dayjs(trip.value.end_date).diff(dayjs(trip.value.start_date), 'day') + 1 : 1;
  const fromPlans = dayPlanStore.dayPlans.filter((item) => item.trip_id === tripId).reduce((max, item) => Math.max(max, item.day_index), 1);
  return Math.max(fromTrip, fromPlans, dayIndex);
});
const dayDate = (index: number) => (trip.value ? dayjs(trip.value.start_date).add(index - 1, 'day').format('YYYY-MM-DD') : '');
const targetOptions = computed(() =>
  Array.from({ length: dayCount.value }, (_, offset) => offset + 1)
    .filter((index) => index !== dayIndex)
    .map((index) => ({ value: index, label: `第 ${index} 天${dayDate(index) ? ' · ' + dayDate(index) : ''}` })),
);
const tripPendingMerges = computed(() => dayPlanStore.pendingMerges.filter((item) => item.trip_id === tripId));
function runMerge() {
  if (!targetDayIndex.value) return;
  dayPlanStore.mergeDay(tripId, dayIndex, targetDayIndex.value, dayDate(targetDayIndex.value) || undefined);
}
onMounted(() => {
  if (listEl.value) {
    new Sortable(listEl.value, {
      animation: 150,
      onEnd: (evt: SortableEvent) => dayPlanStore.reorder(tripId, dayIndex, evt.oldIndex || 0, evt.newIndex || 0),
    });
  }
});
</script>
<style scoped>
.merge-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
</style>
