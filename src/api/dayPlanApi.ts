import type { DayPlan } from '../models/dayPlan';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';
import { normalizeDayPlans } from '../utils/dayPlanData';

export const dayPlanApi = {
  list: (): DayPlan[] => normalizeDayPlans(loadLocal<unknown[]>(STORAGE_KEYS.dayPlans, [])),
  save: (items: DayPlan[]) => saveLocal(STORAGE_KEYS.dayPlans, items),
};
