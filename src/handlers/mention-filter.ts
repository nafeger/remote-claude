/**
 * Slack 멘션 필터링 로직
 * Slack mention filtering logic
 */

import { getLogger } from '../utils/logger';

/**
 * 멘션 필터링 결과 인터페이스
 * Mention filtering result interface
 */
export interface MentionFilterResult {
  filteredText: string;
  mentionsRemoved: number;
  mentions: string[];
  hasChanged: boolean;
}

/**
 * Slack 멘션 패턴
 * Slack mention patterns
 *
 * 패턴 설명 (Pattern explanation):
 * - <@U[A-Z0-9]+> : 사용자 멘션 (e.g., <@U12345678>)
 * - <!channel> : @channel 멘션
 * - <!here> : @here 멘션
 * - <!everyone> : @everyone 멘션
 */
export const SLACK_MENTION_PATTERN = /<@[A-Z0-9]+>|<!channel>|<!here>|<!everyone>/gi;

/**
 * Slack 멘션 필터링
 * Filter Slack mentions from text
 *
 * @param text - 입력 텍스트
 * @returns Mention filtering result
 *
 * 동작 (Behavior):
 * 1. Slack 멘션 패턴 감지 (<@U12345>, <!channel>, <!here>, <!everyone>)
 * 2. 감지된 멘션 제거
 * 3. 제거된 멘션 목록 및 개수 반환
 * 4. 앞뒤 공백 정리
 *
 * 예시 (Examples):
 * - "<@U12345> text" → "text", 1 mention removed
 * - "<!channel> <!here> text" → "text", 2 mentions removed
 * - "@file.ts text" → "@file.ts text", 0 mentions removed (파일 참조는 유지)
 */
export function filterSlackMentions(text: string): MentionFilterResult {
  const logger = getLogger();

  // 멘션 패턴 매칭
  // Match mention patterns
  const mentions: string[] = [];
  const matches = text.match(SLACK_MENTION_PATTERN);

  if (matches) {
    mentions.push(...matches);
    logger.debug(`Found ${mentions.length} Slack mentions: ${mentions.join(', ')}`);
  }

  // 멘션 제거
  // Remove mentions
  const filteredText = text.replace(SLACK_MENTION_PATTERN, '').trim();

  // 연속된 공백 정리
  // Clean up consecutive spaces
  const cleanedText = filteredText.replace(/\s+/g, ' ').trim();

  const hasChanged = text !== cleanedText;

  if (hasChanged) {
    logger.info(
      `Filtered ${mentions.length} mention(s) from input. Original length: ${text.length}, Filtered length: ${cleanedText.length}`
    );
  }

  return {
    filteredText: cleanedText,
    mentionsRemoved: mentions.length,
    mentions,
    hasChanged,
  };
}

/**
 * 파일 참조 패턴 검증
 * Validate file reference pattern
 *
 * @param text - 검증할 텍스트
 * @returns true if text contains file references
 *
 * 파일 참조 패턴 (File reference patterns):
 * - @file.ts
 * - @folder/file.js
 * - @src/components/Button.tsx
 *
 * 이러한 패턴은 Slack 멘션이 아니므로 유지되어야 함
 * These patterns are not Slack mentions and should be preserved
 */
export function hasFileReferences(text: string): boolean {
  // 파일 참조 패턴: @로 시작하고 확장자가 있는 경우
  // File reference pattern: starts with @ and has file extension
  const fileReferencePattern = /@[a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+/g;
  return fileReferencePattern.test(text);
}

/**
 * 멘션 필터링 알림 메시지 생성
 * Generate mention filtering notification message
 *
 * @param result - Mention filtering result
 * @returns Notification message or null
 *
 * 멘션이 제거된 경우 사용자에게 알림 메시지 생성
 * Generate notification message when mentions are removed
 */
export function generateMentionFilterNotification(
  result: MentionFilterResult
): string | null {
  if (!result.hasChanged || result.mentionsRemoved === 0) {
    return null;
  }

  const mentionList = result.mentions.join(', ');
  const message =
    `⚠️ Slack 멘션이 감지되어 제거되었습니다.\n\n` +
    `제거된 멘션 (${result.mentionsRemoved}개): ${mentionList}\n\n` +
    `필터링 후 입력: ${result.filteredText.slice(0, 100)}${result.filteredText.length > 100 ? '...' : ''}`;

  return message;
}

/**
 * 안전한 멘션 필터링 (에러 핸들링 포함)
 * Safe mention filtering with error handling
 *
 * @param text - 입력 텍스트
 * @returns Mention filtering result or error result
 */
export function safeFilterSlackMentions(text: string): MentionFilterResult {
  const logger = getLogger();

  try {
    return filterSlackMentions(text);
  } catch (error) {
    logger.error(`Mention filtering failed: ${error}`);

    // 에러 발생 시 원본 텍스트 반환
    // Return original text on error
    return {
      filteredText: text,
      mentionsRemoved: 0,
      mentions: [],
      hasChanged: false,
    };
  }
}
