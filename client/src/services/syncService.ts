import * as api from './api';
import * as cacheService from './cacheService';
import type { ReadingProgress } from '../types';

let lastCloudPush = 0;
const CLOUD_PUSH_THROTTLE_MS = 30000; // 30 seconds

/**
 * Pull progress from cloud and merge with local (latest lastRead wins).
 */
export async function pullAndMergeProgress(): Promise<void> {
  const cloudProgress = await api.getCloudProgress();
  const localProgress = cacheService.getAllReadingProgress();

  for (const cloud of cloudProgress) {
    const local = localProgress[cloud.bookId];
    if (!local || new Date(cloud.lastRead) > new Date(local.lastRead)) {
      cacheService.saveReadingProgress(cloud.bookId, cloud);
    }
  }
}

/**
 * Push all local progress to the cloud.
 */
export async function pushAllProgress(): Promise<void> {
  const localProgress = cacheService.getAllReadingProgress();
  const progressList = Object.values(localProgress);
  if (progressList.length > 0) {
    await api.syncProgress(progressList);
  }
  lastCloudPush = Date.now();
}

/**
 * Push a single book's progress to the cloud (throttled).
 * Returns true if actually pushed, false if throttled.
 */
export async function pushSingleProgress(progress: ReadingProgress): Promise<boolean> {
  const now = Date.now();
  if (now - lastCloudPush < CLOUD_PUSH_THROTTLE_MS) {
    return false;
  }
  lastCloudPush = now;
  await api.syncProgress([progress]);
  return true;
}
