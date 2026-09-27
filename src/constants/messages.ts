export const messages = {
  tripCreated: '旅行计划已创建',
  tripDeleted: '旅行计划已删除',
  spotAdded: '景点已加入当天行程',
  emptyTrips: '还没有旅行计划，先创建一次出发。',
  emptySpots: '没有符合条件的景点。',
  budgetExceeded: '预算可能超支，请调整景点或交通方式',
  storageRecovered: '本地数据已恢复',
  mergeSameDay: '来源日和目标日相同，未执行合并',
  mergeEmptySource: '来源日还没有景点，无法合并复制',
  mergeDone: (added: number, keptEarlier: number, pending: number) =>
    `整日合并完成：新并入 ${added} 项，同景点保留较早时间 ${keptEarlier} 项，${pending} 项进入待处理区`,
  pendingResolved: '待处理景点已加入目标日',
  pendingDismissed: '已忽略该待处理景点',
  emptyPending: '待处理区是空的，时间冲突的景点会出现在这里。',
};

