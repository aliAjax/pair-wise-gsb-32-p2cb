<template>
  <section class="band">
    <h3>待处理区</h3>
    <p v-if="!items.length" class="muted">{{ messages.emptyPending }}</p>
    <ul v-else class="pending-list">
      <li v-for="pending in items" :key="pending.id">
        <div class="pending-main">
          <strong>{{ spotName(pending.item.spot_id) }}</strong>
          <span class="muted">
            并入第 {{ pending.day_index }} 天 · {{ pending.item.start_time }}-{{ pending.item.end_time }} ·
            {{ transportText[pending.item.transport] }} · {{ pending.item.note }}
          </span>
          <span class="muted">撞上目标项：{{ spotName(pending.conflict_with.spot_id) }}（{{ pending.conflict_with.start_time }}），未覆盖原备注和交通方式。</span>
        </div>
        <div class="pending-actions">
          <el-button size="small" type="primary" @click="emit('resolve', pending.id)">仍加入目标日</el-button>
          <el-button size="small" @click="emit('dismiss', pending.id)">忽略</el-button>
        </div>
      </li>
    </ul>
  </section>
</template>
<script setup lang="ts">
import type { PendingMergeItem } from '../../models/pendingMerge';
import type { Spot } from '../../models/spot';
import { transportText } from '../../utils/formatters';
import { messages } from '../../constants/messages';
const props = defineProps<{ items: PendingMergeItem[]; spots: Spot[] }>();
const emit = defineEmits<{ resolve: [id: string]; dismiss: [id: string] }>();
const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
</script>
<style scoped>
.pending-list { list-style: none; padding: 0; margin: 0; }
.pending-list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #a8b8a1; }
.pending-main { display: flex; flex-direction: column; gap: 4px; }
.pending-actions { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
</style>
