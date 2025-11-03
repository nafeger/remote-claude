/**
 * /cancel 명령어 핸들러
 * /cancel command handler - Cancel running job
 */

import { SlackCommandHandler } from '../../types';
import { getLogger } from '../../utils/logger';
import {
  formatBold,
  formatWarning,
} from '../formatters';

/**
 * /cancel 명령어 핸들러
 * Handle /cancel command - Cancel currently running job
 *
 * Usage: /cancel
 *
 * NOTE: 오케스트레이터 통합은 메인 애플리케이션 구현 시 완료됩니다.
 */
export const cancelHandler: SlackCommandHandler = async ({
  channelId,
  userId,
  args,
}) => {
  const logger = getLogger();

  // args는 사용하지 않지만 타입 검사를 위해 포함
  void args;

  logger.info(`Cancel command from user ${userId} in channel ${channelId}`);

  // TODO: 메인 애플리케이션에서 오케스트레이터와 통합 필요
  // 현재는 기본 메시지만 반환

  return (
    formatWarning(formatBold('구현 중')) +
    '\n\n' +
    '/cancel 명령어는 메인 애플리케이션 통합 시 활성화됩니다.\n\n' +
    formatBold('기능:') +
    '\n' +
    '• 현재 실행 중인 작업 취소\n' +
    '• 대화형 응답 대기 상태 종료\n' +
    '• 작업 큐에서 제거'
  );

  /* 완성된 구현 예시:
  try {
    const envConfig = getEnvConfig();

    // 채널 설정 확인
    const configStore = new ConfigStore(envConfig.configDir);
    if (!configStore.hasChannel(channelId)) {
      return formatWarning('설정되지 않은 채널입니다.');
    }

    // 오케스트레이터를 통해 작업 취소
    const orchestrator = getOrchestrator(); // 전역 오케스트레이터 인스턴스
    const cancelled = await orchestrator.cancelJob(channelId);

    if (cancelled) {
      return formatSuccess(formatBold('작업 취소 완료')) + '\n\n현재 실행 중인 작업이 취소되었습니다.';
    } else {
      return formatWarning('취소할 작업이 없습니다.');
    }
  } catch (error) {
    logger.error(`Cancel command failed: ${error}`);
    return formatError('작업 취소 실패') + '\n\n' + (error instanceof Error ? error.message : '알 수 없는 오류');
  }
  */
};
