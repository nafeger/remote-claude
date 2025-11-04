/**
 * /ask 명령어 핸들러 (DEPRECATED)
 * /ask command handler - DEPRECATED
 *
 * ⚠️ DEPRECATED: /ask 명령은 더 이상 필요하지 않습니다.
 * FR10 구현: 기본 입력이 자동으로 Claude Code에 전송됩니다.
 *
 * @deprecated 이제 메시지를 바로 입력하면 자동으로 Claude Code에 전송됩니다.
 */

import { SlackCommandHandler } from '../../types';
import { getLogger } from '../../utils/logger';
import { formatBold, formatWarning } from '../formatters';

/**
 * /ask 명령어 핸들러 (DEPRECATED)
 * Handle /ask command - DEPRECATED
 */
export const askHandler: SlackCommandHandler = async ({ channelId, userId }) => {
  const logger = getLogger();
  logger.info(`[DEPRECATED] Ask command from user ${userId} in channel ${channelId}`);

  // Deprecated 안내 메시지
  // Deprecation notice
  return (
    formatWarning(formatBold('⚠️ /ask 명령은 더 이상 필요하지 않습니다')) +
    '\n\n' +
    '이제 메시지를 바로 입력하면 자동으로 Claude Code에 전송됩니다.\n\n' +
    formatBold('기존 방식 (더 이상 필요 없음):') +
    '\n' +
    '`/ask "Build the project"`\n\n' +
    formatBold('새로운 방식 (간단해진 방법):') +
    '\n' +
    '`Build the project` (그냥 입력하기만 하면 됩니다!)\n\n' +
    formatBold('4단계 입력 처리 파이프라인:') +
    '\n' +
    '1️⃣ Slack 네이티브 명령 (예: /remind) → 그대로 Slack에서 처리\n' +
    '2️⃣ 봇 메타 명령 (예: /setup, /status) → 봇 명령 처리\n' +
    '3️⃣ 백틱 명령 (예: `ddd`, `e`) → DSL 인터랙티브 명령 실행\n' +
    '4️⃣ 일반 메시지 → 자동으로 Claude Code에 전송\n\n' +
    '💡 ' +
    formatBold('TIP:') +
    ' Slack 멘션은 자동으로 필터링됩니다.\n' +
    '파일 참조 (예: @file.ts)는 그대로 유지됩니다.'
  );
};
