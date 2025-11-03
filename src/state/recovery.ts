/**
 * 상태 복구 기능
 * State recovery functionality
 */

import { StateManager } from './manager';
import { ConfigStore } from '../config/store';
import { JobQueue } from '../queue/queue';
import { getLogger } from '../utils/logger';

/**
 * 시스템 재시작 시 상태 복구
 * Recover state on system restart
 *
 * @param stateManager - State Manager instance
 * @param configStore - Config Store instance
 * @param jobQueue - Job Queue instance
 * @returns Recovery summary
 */
export async function recoverState(
  stateManager: StateManager,
  configStore: ConfigStore,
  jobQueue: JobQueue
): Promise<{
  recoveredSessions: number;
  timedOutSessions: number;
  cleanedUpSessions: number;
}> {
  const logger = getLogger();

  logger.info('Starting state recovery...');

  let recoveredSessions = 0;
  let timedOutSessions = 0;
  let cleanedUpSessions = 0;

  try {
    // 모든 세션 가져오기
    const sessions = stateManager.getAllSessions();

    logger.info(`Found ${sessions.length} sessions in state file`);

    for (const session of sessions) {
      const { channelId } = session;

      // 채널 설정 확인
      const channelConfig = configStore.getChannel(channelId);
      if (!channelConfig) {
        logger.warn(
          `Channel ${channelId} not found in config, cleaning up session`
        );
        stateManager.deleteSession(channelId);
        cleanedUpSessions++;
        continue;
      }

      // 타임아웃 확인
      if (stateManager.hasTimedOut(channelId)) {
        logger.info(`Session ${channelId} has timed out, clearing state`);
        stateManager.clearSession(channelId);
        timedOutSessions++;
        continue;
      }

      // 대화형 응답 대기 중인 세션 복구
      if (session.isWaitingForResponse) {
        logger.info(
          `Session ${channelId} is waiting for response, recovered`
        );
        recoveredSessions++;
        // 상태는 그대로 유지 (사용자가 응답하면 계속 진행)
      }
    }

    // 완료된 작업 정리
    const cleanedJobs = jobQueue.cleanupCompletedJobs(24); // 24시간 이상 된 완료 작업 제거
    logger.info(`Cleaned up ${cleanedJobs} completed jobs`);

    logger.info(
      `State recovery complete: ${recoveredSessions} recovered, ${timedOutSessions} timed out, ${cleanedUpSessions} cleaned up`
    );

    return {
      recoveredSessions,
      timedOutSessions,
      cleanedUpSessions,
    };
  } catch (error) {
    logger.error(`State recovery failed: ${error}`);
    throw error;
  }
}

/**
 * 타임아웃된 세션 정리 (주기적 실행)
 * Clean up timed out sessions (periodic execution)
 *
 * @param stateManager - State Manager instance
 * @returns Number of cleaned up sessions
 */
export function cleanupTimedOutSessions(
  stateManager: StateManager
): number {
  const logger = getLogger();

  const timedOutSessions = stateManager.findTimedOutSessions();

  if (timedOutSessions.length === 0) {
    return 0;
  }

  logger.info(`Found ${timedOutSessions.length} timed out sessions`);

  for (const session of timedOutSessions) {
    logger.info(`Clearing timed out session: ${session.channelId}`);
    stateManager.clearSession(session.channelId);
  }

  return timedOutSessions.length;
}

/**
 * 상태 복구 타이머 시작 (주기적 정리)
 * Start state recovery timer (periodic cleanup)
 *
 * @param stateManager - State Manager instance
 * @param intervalMinutes - Cleanup interval in minutes (default: 5)
 * @returns Timer ID
 */
export function startPeriodicCleanup(
  stateManager: StateManager,
  intervalMinutes: number = 5
): NodeJS.Timeout {
  const logger = getLogger();

  logger.info(
    `Starting periodic cleanup (interval: ${intervalMinutes} minutes)`
  );

  return setInterval(() => {
    try {
      const cleanedUp = cleanupTimedOutSessions(stateManager);
      if (cleanedUp > 0) {
        logger.info(`Periodic cleanup: ${cleanedUp} sessions cleaned up`);
      }
    } catch (error) {
      logger.error(`Periodic cleanup failed: ${error}`);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * 상태 복구 타이머 중지
 * Stop state recovery timer
 */
export function stopPeriodicCleanup(timer: NodeJS.Timeout): void {
  const logger = getLogger();

  clearInterval(timer);
  logger.info('Periodic cleanup stopped');
}
