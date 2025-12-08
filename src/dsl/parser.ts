/**
 * 백틱 명령 파싱 및 자동 분류 로직
 * Backtick command parsing and automatic classification logic
 */

import { getLogger } from '../utils/logger';

/**
 * 키 타입 정의
 * Key type definition
 */
export type KeyType = 'Right' | 'Left' | 'Up' | 'Down' | 'Enter' | 'Space';

/**
 * 키 명령 인터페이스
 * Key command interface
 */
export interface KeyCommand {
  type: 'key';
  key: KeyType;
}

/**
 * 텍스트 명령 인터페이스
 * Text command interface
 */
export interface TextCommand {
  type: 'text';
  content: string;
}

/**
 * 파싱된 세그먼트 타입 (키 또는 텍스트)
 * Parsed segment type (key or text)
 */
export type ParsedSegment = KeyCommand | TextCommand;

/**
 * 파싱 결과 인터페이스
 * Parse result interface
 */
export interface ParseResult {
  success: boolean;
  segments: ParsedSegment[];
  error?: Error;
}

/**
 * 키 매핑 상수 (r, l, u, d, e, s → Right, Left, Up, Down, Enter, Space)
 * Key mapping constant
 */
export const KEY_MAPPING: Record<string, KeyType> = {
  r: 'Right',
  l: 'Left',
  u: 'Up',
  d: 'Down',
  e: 'Enter',
  s: 'Space',
};

/**
 * 키 매핑 문자 집합
 * Key mapping character set
 */
export const KEY_CHARS = new Set<string>(['r', 'l', 'u', 'd', 'e', 's']);

/**
 * 백틱 세그먼트 추출 정규식 패턴
 * Backtick segment extraction regex pattern
 *
 * 패턴 설명 (Pattern explanation):
 * - ` : 시작 백틱 (Starting backtick)
 * - ([^`]+) : 백틱이 아닌 문자들 캡처 (Capture non-backtick characters)
 * - ` : 종료 백틱 (Ending backtick)
 * - g : 전역 매칭 (Global flag)
 *
 * 예시 (Examples):
 * - "`ddd`" → 매칭: ["ddd"]
 * - "`ddd` text `e`" → 매칭: ["ddd", "e"]
 */
export const BACKTICK_PATTERN = /`([^`]+)`/g;

/**
 * 메시지 세그먼트 인터페이스
 * Message segment interface
 */
interface MessageSegment {
  isBacktick: boolean; // true면 백틱 내용, false면 일반 텍스트
  content: string;
}

/**
 * 메시지를 백틱 기준으로 세그먼트로 분리
 * Split message into segments based on backticks
 *
 * @param message - 입력 메시지 (Input message)
 * @returns 세그먼트 배열 (Array of segments)
 *
 * 예시 (Examples):
 * - "`ddd`" → [{ isBacktick: true, content: "ddd" }]
 * - "`ddd` text `e`" → [
 *     { isBacktick: true, content: "ddd" },
 *     { isBacktick: false, content: " text " },
 *     { isBacktick: true, content: "e" }
 *   ]
 * - "no backticks" → [{ isBacktick: false, content: "no backticks" }]
 */
function splitIntoSegments(message: string): MessageSegment[] {
  const logger = getLogger();
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  // 정규식으로 백틱 세그먼트 찾기
  // Find backtick segments using regex
  const matches = message.matchAll(BACKTICK_PATTERN);

  for (const match of matches) {
    const matchIndex = match.index!;
    const backtickContent = match[1]; // 캡처 그룹 1: 백틱 내용

    // 백틱 이전의 일반 텍스트 추가
    // Add regular text before backtick
    if (matchIndex > lastIndex) {
      const textBefore = message.substring(lastIndex, matchIndex);
      segments.push({
        isBacktick: false,
        content: textBefore,
      });
    }

    // 백틱 내용 추가
    // Add backtick content
    segments.push({
      isBacktick: true,
      content: backtickContent,
    });

    // 다음 시작 위치 업데이트 (백틱 2개 + 내용 길이)
    // Update next start position (2 backticks + content length)
    lastIndex = matchIndex + backtickContent.length + 2;
  }

  // 마지막 백틱 이후의 일반 텍스트 추가
  // Add regular text after last backtick
  if (lastIndex < message.length) {
    const textAfter = message.substring(lastIndex);
    segments.push({
      isBacktick: false,
      content: textAfter,
    });
  }

  // 세그먼트가 없으면 전체를 일반 텍스트로 추가
  // If no segments, add entire message as regular text
  if (segments.length === 0) {
    segments.push({
      isBacktick: false,
      content: message,
    });
  }

  logger.debug(`Split message into ${segments.length} segments`);
  return segments;
}

/**
 * 백틱 내용이 순수 키 시퀀스인지 판별
 * Determine if backtick content is a pure key sequence
 *
 * @param content - 백틱 내용 (Backtick content)
 * @returns true if pure key sequence, false if pure text, throws error if mixed
 *
 * 규칙 (Rules):
 * 1. 모든 문자가 키 매핑 문자 (r,l,u,d,e) → true
 * 2. 키 매핑 문자가 하나도 없음 → false
 * 3. 키 매핑 문자와 일반 문자 혼합 → Error 발생
 */
export function isKeySequence(content: string): boolean {
  const logger = getLogger();
  logger.debug(`isKeySequence called with: ${content}`);

  // 빈 문자열은 텍스트로 처리
  // Empty string is treated as text
  if (content.length === 0) {
    return false;
  }

  const chars = content.split('');
  const hasKeyChar = chars.some((c) => KEY_CHARS.has(c));
  const hasNonKeyChar = chars.some((c) => !KEY_CHARS.has(c));

  // 혼합 문자 에러: 키 문자와 일반 문자가 동시에 존재
  // Mixed character error: both key characters and regular characters exist
  if (hasKeyChar && hasNonKeyChar) {
    const keyChars = chars.filter((c) => KEY_CHARS.has(c));
    const nonKeyChars = chars.filter((c) => !KEY_CHARS.has(c));

    const errorMessage = `백틱 내용이 애매합니다: '${keyChars.join("', '")}' 는 키 매핑 문자이지만 '${nonKeyChars.join("', '")}'는 아닙니다`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // 순수 키 시퀀스: 모든 문자가 키 매핑 문자
  // Pure key sequence: all characters are key mapping characters
  return hasKeyChar && !hasNonKeyChar;
}

/**
 * 백틱 명령 파싱 - 메시지에서 백틱 세그먼트 추출 및 분류
 * Parse backtick commands - extract and classify backtick segments from message
 *
 * @param message - 사용자 메시지 (User message)
 * @returns ParseResult with success status, segments array, and optional error
 *
 * 예시 (Examples):
 * - "`ddd`" → [{ type: 'key', key: 'Down' }, { type: 'key', key: 'Down' }, { type: 'key', key: 'Down' }]
 * - "`ddd` text `e`" → [키×3, { type: 'text', content: ' text ' }, { type: 'key', key: 'Enter' }]
 * - "`console.log()`" → [{ type: 'text', content: 'console.log()' }]
 * - "`ddx`" → Error: 혼합 문자 에러
 */
export function parseInteractiveCommand(message: string): ParseResult {
  const logger = getLogger();
  logger.debug(`parseInteractiveCommand called with: ${message}`);

  const segments: ParsedSegment[] = [];

  try {
    // 1. 메시지를 백틱 기준으로 세그먼트 분리
    // Split message into segments based on backticks
    const messageSegments = splitIntoSegments(message);

    // 2. 각 세그먼트 처리
    // Process each segment
    for (const segment of messageSegments) {
      if (segment.isBacktick) {
        // 백틱 세그먼트: 키 시퀀스인지 텍스트인지 판별
        // Backtick segment: determine if key sequence or text
        const isKey = isKeySequence(segment.content);

        if (isKey) {
          // 키 시퀀스: 각 문자를 KeyCommand로 변환
          // Key sequence: convert each character to KeyCommand
          const chars = segment.content.split('');
          for (const char of chars) {
            const keyType = KEY_MAPPING[char];
            if (keyType) {
              segments.push({
                type: 'key',
                key: keyType,
              });
            }
          }
        } else {
          // 텍스트: TextCommand로 추가
          // Text: add as TextCommand
          segments.push({
            type: 'text',
            content: segment.content,
          });
        }
      } else {
        // 일반 텍스트 세그먼트
        // Regular text segment
        if (segment.content.trim().length > 0) {
          segments.push({
            type: 'text',
            content: segment.content,
          });
        }
      }
    }

    logger.debug(`Successfully parsed ${segments.length} command segments`);

    return {
      success: true,
      segments,
    };
  } catch (error) {
    // 혼합 문자 에러 또는 기타 파싱 에러
    // Mixed character error or other parsing errors
    logger.error(`Parse error: ${error}`);

    return {
      success: false,
      segments: [],
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
