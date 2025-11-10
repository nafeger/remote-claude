/**
 * 대용량 메시지 분할 및 백틱 변환 유틸리티
 * Large message splitting and backtick conversion utility
 */

import { App } from '@slack/bolt';
import { getLogger } from './logger';

/**
 * 분할 메시지 결과
 * Result of message splitting
 *
 * @property messages - 분할된 메시지 배열
 * @property totalParts - 전체 메시지 개수
 */
export interface SplitMessageResult {
  messages: string[];
  totalParts: number;
}

/**
 * 메시지 전송 옵션
 * Message sending options
 *
 * @property channelId - Slack 채널 ID
 * @property messages - 전송할 메시지 배열
 * @property delayMs - 메시지 간 지연 시간 (밀리초, 기본값: 500ms)
 */
export interface SendMessageOptions {
  channelId: string;
  messages: string[];
  delayMs?: number;
}

/**
 * 백틱 충돌 방지 변환
 * Convert backticks to prevent conflicts with Slack code blocks
 *
 * @param content - 변환할 텍스트 내용
 * @returns string - 백틱이 작은따옴표로 변환된 텍스트
 * @description 코드 블록(```) → 작은따옴표(''')로 변환하여 Slack 코드 블록 구문 충돌 방지
 */
export function convertBackticks(content: string): string {
  if (!content) {
    return '';
  }

  const logger = getLogger();

  try {
    // 모든 백틱 3개(```) 패턴을 작은따옴표 3개(''')로 변환
    const converted = content.replace(/```/g, "'''");

    // 변환 횟수 로깅
    const backtickCount = (content.match(/```/g) || []).length;
    if (backtickCount > 0) {
      logger.debug(`Converted ${backtickCount} backtick patterns (\`\`\`) to (''')`);
    }

    return converted;
  } catch (error) {
    logger.error('Error converting backticks:', error);
    return content; // 에러 시 원본 반환
  }
}

/**
 * 메시지 분할
 * Split large message into smaller chunks
 *
 * @param content - 분할할 텍스트 내용
 * @param maxLength - 최대 메시지 길이 (기본값: 3500자)
 * @returns SplitMessageResult - 분할된 메시지 배열 및 전체 개수
 * @description 대용량 메시지를 3500자 기준으로 자연스럽게 분할 (줄바꿈 기준)
 */
export function splitMessage(content: string, maxLength: number = 3500): SplitMessageResult {
  const logger = getLogger();

  if (!content) {
    return {
      messages: [],
      totalParts: 0,
    };
  }

  // 메시지 길이가 최대 길이 이하면 분할 불필요
  if (content.length <= maxLength) {
    logger.debug(`Message length ${content.length} is within limit, no split needed`);
    return {
      messages: [content],
      totalParts: 1,
    };
  }

  try {
    const messages: string[] = [];
    let currentPos = 0;

    while (currentPos < content.length) {
      // 남은 내용 길이 계산
      const remaining = content.length - currentPos;

      // 분할할 길이 결정
      let splitLength = Math.min(maxLength, remaining);

      // 남은 내용이 최대 길이보다 작으면 전체 포함
      if (remaining <= maxLength) {
        messages.push(content.substring(currentPos));
        break;
      }

      // 줄바꿈(\n) 기준으로 자연스러운 분할 위치 찾기
      const chunk = content.substring(currentPos, currentPos + splitLength);
      const lastNewlineIndex = chunk.lastIndexOf('\n');

      // 줄바꿈이 있으면 그 위치에서 분할
      if (lastNewlineIndex > 0) {
        splitLength = lastNewlineIndex + 1; // \n 포함
      }
      // 줄바꿈이 없으면 최대 길이에서 분할 (단어 중간에서 잘릴 수 있음)

      messages.push(content.substring(currentPos, currentPos + splitLength));
      currentPos += splitLength;
    }

    logger.info(`Message split into ${messages.length} parts (original length: ${content.length})`);

    return {
      messages,
      totalParts: messages.length,
    };
  } catch (error) {
    logger.error('Error splitting message:', error);
    // 에러 시 원본을 단일 메시지로 반환
    return {
      messages: [content],
      totalParts: 1,
    };
  }
}

/**
 * 분할 표시 추가
 * Add split indicators to messages
 *
 * @param messages - 분할된 메시지 배열
 * @returns string[] - 분할 표시가 추가된 메시지 배열
 * @description 각 메시지 앞에 [1/3], [2/3] 형태의 분할 표시 추가
 */
export function addSplitIndicators(messages: string[]): string[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // 메시지가 1개면 분할 표시 불필요
  if (messages.length === 1) {
    return messages;
  }

  const logger = getLogger();

  try {
    const totalParts = messages.length;

    const messagesWithIndicators = messages.map((message, index) => {
      const partNumber = index + 1;
      const indicator = `[${partNumber}/${totalParts}]`;

      // 메시지 앞에 분할 표시 추가
      return `${indicator}\n${message}`;
    });

    logger.debug(`Added split indicators to ${totalParts} messages`);

    return messagesWithIndicators;
  } catch (error) {
    logger.error('Error adding split indicators:', error);
    return messages; // 에러 시 원본 반환
  }
}

/**
 * 코드 블록으로 감싸기
 * Wrap messages in code blocks
 *
 * @param messages - 메시지 배열
 * @returns string[] - 코드 블록으로 감싸진 메시지 배열
 * @description 각 메시지를 Slack 코드 블록(```)으로 자동 감싸기
 */
export function wrapInCodeBlocks(messages: string[]): string[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  const logger = getLogger();

  try {
    const wrappedMessages = messages.map((message) => {
      // 이미 코드 블록으로 감싸져 있는지 확인
      if (message.startsWith('```') && message.endsWith('```')) {
        return message; // 이미 감싸져 있으면 그대로 반환
      }

      // 코드 블록으로 감싸기
      return `\`\`\`\n${message}\n\`\`\``;
    });

    logger.debug(`Wrapped ${wrappedMessages.length} messages in code blocks`);

    return wrappedMessages;
  } catch (error) {
    logger.error('Error wrapping messages in code blocks:', error);
    return messages; // 에러 시 원본 반환
  }
}

/**
 * 분할 메시지 전송
 * Send split messages with delay
 *
 * @param app - Slack Bolt App 인스턴스
 * @param channelId - Slack 채널 ID
 * @param messages - 전송할 메시지 배열
 * @param delayMs - 메시지 간 지연 시간 (기본값: 500ms)
 * @returns Promise<void>
 * @description 분할된 메시지를 500ms 간격으로 전송 (첫 메시지는 즉시)
 */
export async function sendSplitMessages(
  app: App,
  channelId: string,
  messages: string[],
  delayMs: number = 500
): Promise<void> {
  const logger = getLogger();
  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF = 1000; // 1초

  if (!messages || messages.length === 0) {
    logger.warn('No messages to send');
    return;
  }

  logger.info(`Sending ${messages.length} messages to channel ${channelId}`);

  for (let i = 0; i < messages.length; i++) {
    const messageNumber = i + 1;
    const message = messages[i];

    // 첫 번째 메시지는 즉시 전송, 이후 메시지는 500ms 대기
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // 지수 백오프 재시도 로직
    let attempt = 0;
    let sent = false;

    while (attempt < MAX_RETRIES && !sent) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: message,
        });

        logger.debug(`Message ${messageNumber}/${messages.length} sent successfully`);
        sent = true;
      } catch (error: unknown) {
        attempt++;

        // Slack API rate limit 에러 처리
        if (error && typeof error === 'object' && 'data' in error) {
          const slackError = error as { data?: { error?: string } };

          if (slackError.data?.error === 'rate_limited') {
            const backoffTime = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
            logger.warn(`Rate limited on message ${messageNumber}, retrying in ${backoffTime}ms (attempt ${attempt}/${MAX_RETRIES})`);

            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            continue;
          }
        }

        // 네트워크 에러 처리
        if (error instanceof Error && (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT'))) {
          const backoffTime = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
          logger.warn(`Network error on message ${messageNumber}, retrying in ${backoffTime}ms (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

          await new Promise((resolve) => setTimeout(resolve, backoffTime));
          continue;
        }

        // 기타 에러
        logger.error(`Error sending message ${messageNumber}/${messages.length}:`, error);

        // 최대 재시도 횟수 도달
        if (attempt >= MAX_RETRIES) {
          logger.error(`Failed to send message ${messageNumber} after ${MAX_RETRIES} attempts`);

          // 사용자에게 전송 실패 알림
          try {
            await app.client.chat.postMessage({
              channel: channelId,
              text: `⚠️ 메시지 전송 실패: [${messageNumber}]번째 메시지`,
            });
          } catch (notifyError) {
            logger.error('Failed to send failure notification:', notifyError);
          }

          // 다음 메시지로 계속 진행
          break;
        }
      }
    }
  }

  logger.info(`All ${messages.length} messages sent successfully`);
}
