import type { PendingMergeItem } from '../models/pendingMerge';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';

export const pendingMergeApi = {
  list: () => loadLocal<PendingMergeItem[]>(STORAGE_KEYS.pendingMerges, []),
  save: (items: PendingMergeItem[]) => saveLocal(STORAGE_KEYS.pendingMerges, items),
};
