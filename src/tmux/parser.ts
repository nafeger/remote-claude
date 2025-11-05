/**
 * tmux 출력 파싱 유틸리티
 * tmux output parsing utilities
 */

import { CaptureResult } from '../types';

/**
 * ANSI 이스케이프 코드 제거
 * Remove ANSI escape codes from text
 *
 * ANSI 코드 패턴:
 * - \x1b[ ... m (색상)
 * - \x1b[ ... H (커서 이동)
 * - \x1b[ ... J (화면 지우기)
 * - 기타 제어 문자들
 */
export function removeAnsiCodes(text: string): string {
  // ANSI escape sequences 제거
  // eslint-disable-next-line no-control-regex
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // CSI sequences
    .replace(/\x1b\][^\x07]*\x07/g, '') // OSC sequences
    .replace(/\x1b[=>]/g, '') // Mode changes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ''); // Other control characters (except \t, \n, \r)
}

/**
 * 출력 정리
 * Clean output text
 *
 * - ANSI 코드 제거
 * - 빈 줄 제거
 * - 앞뒤 공백 제거
 */
export function cleanOutput(text: string): string {
  const cleaned = removeAnsiCodes(text);

  // 줄 단위로 처리
  const lines = cleaned.split('\n').map((line) => line.trimEnd());

  // 앞뒤 빈 줄 제거
  let startIndex = 0;
  let endIndex = lines.length - 1;

  while (startIndex < lines.length && lines[startIndex].trim() === '') {
    startIndex++;
  }

  while (endIndex >= 0 && lines[endIndex].trim() === '') {
    endIndex--;
  }

  if (startIndex > endIndex) {
    return '';
  }

  return lines.slice(startIndex, endIndex + 1).join('\n');
}

/**
 * 출력 캡처 결과 처리
 * Process capture result
 *
 * - ANSI 코드 제거
 * - 긴 출력 처리 (처음 N줄 + 마지막 M줄)
 * - 전체 출력 및 요약 반환
 *
 * @param output - Raw output from tmux capture-pane
 * @param firstLines - Number of first lines to include (default: 30)
 * @param lastLines - Number of last lines to include (default: 20)
 * @returns CaptureResult with full output and summary
 */
export function processCaptureResult(
  output: string,
  firstLines: number = 30,
  lastLines: number = 20
): CaptureResult {
  // 1. ANSI 코드 제거 및 정리
  const fullOutput = cleanOutput(output);

  // 2. 줄 단위로 분리
  const lines = fullOutput.split('\n');
  const totalLines = lines.length;

  // 3. 마지막 줄만 출력 (firstLines=0인 경우)
  if (firstLines === 0) {
    const lastPart = lines.slice(-lastLines);
    return {
      fullOutput,
      summary: lastPart.join('\n'),
      isTruncated: totalLines > lastLines,
      totalLines,
    };
  }

  // 4. 긴 출력 여부 확인
  if (totalLines <= firstLines + lastLines) {
    // 전체 출력이 충분히 짧으면 그대로 반환
    return {
      fullOutput,
      summary: fullOutput,
      isTruncated: false,
      totalLines,
    };
  }

  // 5. 긴 출력 처리: 처음 N줄 + 마지막 M줄만 표시
  const firstPart = lines.slice(0, firstLines);
  const lastPart = lines.slice(-lastLines);
  const omittedLines = totalLines - firstLines - lastLines;

  const summary =
    firstPart.join('\n') +
    `\n\n... (중간 ${omittedLines}줄 생략) ...\n\n` +
    lastPart.join('\n');

  return {
    fullOutput,
    summary,
    isTruncated: true,
    totalLines,
  };
}

/**
 * 출력이 완료되었는지 감지
 * Detect if output is complete (no changes)
 *
 * @param previousOutput - Previous output
 * @param currentOutput - Current output
 * @returns true if output hasn't changed
 */
export function isOutputStable(
  previousOutput: string,
  currentOutput: string
): boolean {
  // ANSI 코드 제거 후 비교
  const cleanPrev = cleanOutput(previousOutput);
  const cleanCurr = cleanOutput(currentOutput);

  return cleanPrev === cleanCurr;
}

/**
 * Claude Code 프롬프트 감지
 * Detect if Claude Code is waiting for input (y/n prompt)
 *
 * Claude Code가 대화형 응답을 기다리는 패턴:
 * - "Continue?" 또는 유사한 프롬프트
 * - "[y/n]" 패턴
 */
export function detectInteractivePrompt(output: string): boolean {
  const cleaned = cleanOutput(output);
  const lastLines = cleaned.split('\n').slice(-5).join('\n').toLowerCase();

  // 대화형 프롬프트 패턴 감지
  const patterns = [
    /\[y\/n\]/i,
    /continue\?/i,
    /proceed\?/i,
    /do you want to/i,
    /would you like to/i,
  ];

  return patterns.some((pattern) => pattern.test(lastLines));
}

/**
 * 에러 메시지 감지
 * Detect error messages in output
 */
export function detectError(output: string): boolean {
  const cleaned = cleanOutput(output).toLowerCase();

  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /fatal:/i,
    /failed:/i,
    /cannot/i,
    /unable to/i,
  ];

  return errorPatterns.some((pattern) => pattern.test(cleaned));
}

/**
 * 작업 완료 감지
 * Detect if task is completed
 *
 * Claude Code가 작업을 완료했는지 판단하는 패턴:
 * - 명령 프롬프트 재출현
 * - 완료 메시지
 */
export function detectCompletion(output: string): boolean {
  const cleaned = cleanOutput(output);
  const lastLines = cleaned.split('\n').slice(-3).join('\n');

  // 완료 패턴 감지
  const completionPatterns = [
    /task completed/i,
    /done/i,
    /finished/i,
    /success/i,
  ];

  return completionPatterns.some((pattern) => pattern.test(lastLines));
}

/**
 * 선택 메뉴 감지 (❯ 마커)
 * Detect selection menu with ❯ marker
 *
 * 선택 가능한 메뉴가 있는지 감지:
 * - ❯ 마커가 있는 줄
 * - 여러 옵션이 나열된 경우
 *
 * @param output - tmux 캡처 출력
 * @returns true if selection menu detected
 *
 * 예시 (Examples):
 * ```
 * ❯ Option 1
 *   Option 2
 *   Option 3
 * ```
 */
export function detectSelectionMenu(output: string): boolean {
  const cleaned = cleanOutput(output);

  // ❯ 마커가 있는 줄 찾기
  // Look for lines with ❯ marker
  const hasMarker = /❯/.test(cleaned);

  // > 기호로 선택 표시하는 경우도 감지
  // Also detect > symbol for selection
  const hasArrow = /^\s*>\s+/m.test(cleaned);

  return hasMarker || hasArrow;
}

/**
 * 번호 옵션 메뉴 감지
 * Detect numbered option menu
 *
 * 번호로 선택 가능한 메뉴 감지:
 * - 1., 2., 3. 패턴
 * - 1), 2), 3) 패턴
 *
 * @param output - tmux 캡처 출력
 * @returns true if numbered menu detected
 *
 * 예시 (Examples):
 * ```
 * 1. First option
 * 2. Second option
 * 3. Third option
 * ```
 */
export function detectNumberedMenu(output: string): boolean {
  const cleaned = cleanOutput(output);
  const lines = cleaned.split('\n');

  // 최근 10줄만 확인
  // Check last 10 lines only
  const recentLines = lines.slice(-10);

  // 번호 패턴 매칭
  // Match numbered patterns
  const numberedPattern = /^\s*(\d+)[.)]\s+/;

  // 최소 2개 이상의 연속된 번호가 있는지 확인
  // Check if there are at least 2 consecutive numbers
  let consecutiveCount = 0;
  let lastNumber = 0;

  for (const line of recentLines) {
    const match = line.match(numberedPattern);
    if (match) {
      const currentNumber = parseInt(match[1], 10);

      // 연속된 번호인지 확인
      // Check if consecutive
      if (lastNumber === 0 || currentNumber === lastNumber + 1) {
        consecutiveCount++;
        lastNumber = currentNumber;

        if (consecutiveCount >= 2) {
          return true;
        }
      } else {
        // 연속이 끊어지면 리셋
        // Reset if not consecutive
        consecutiveCount = 1;
        lastNumber = currentNumber;
      }
    }
  }

  return false;
}

/**
 * 인터랙티브 프롬프트 종합 감지
 * Comprehensive interactive prompt detection
 *
 * 모든 종류의 인터랙티브 프롬프트 감지:
 * - [y/n] 프롬프트
 * - 선택 메뉴 (❯ 마커)
 * - 번호 옵션
 *
 * @param output - tmux 캡처 출력
 * @returns Detected prompt type or null
 */
export interface InteractivePromptInfo {
  type: 'yesno' | 'selection' | 'numbered';
  detected: boolean;
}

export function detectAnyInteractivePrompt(output: string): InteractivePromptInfo | null {
  // [y/n] 프롬프트 확인
  // Check [y/n] prompt
  if (detectInteractivePrompt(output)) {
    return {
      type: 'yesno',
      detected: true,
    };
  }

  // 선택 메뉴 확인
  // Check selection menu
  if (detectSelectionMenu(output)) {
    return {
      type: 'selection',
      detected: true,
    };
  }

  // 번호 옵션 확인
  // Check numbered menu
  if (detectNumberedMenu(output)) {
    return {
      type: 'numbered',
      detected: true,
    };
  }

  return null;
}

/**
 * DSL 응답 메시지 생성
 * Generate DSL response message for Slack
 *
 * 화면 캡처 결과를 Slack 메시지 형식으로 포맷:
 * - 코드 블록으로 감싸기
 * - 프롬프트 타입에 따른 가이드 추가
 *
 * @param captureResult - 화면 캡처 결과
 * @param promptInfo - 감지된 프롬프트 정보 (optional)
 * @returns Formatted Slack message
 */
export function formatDslResponse(
  captureResult: CaptureResult,
  promptInfo?: InteractivePromptInfo | null
): string {
  let message = '```\n' + captureResult.summary + '\n```';

  // 프롬프트 타입에 따른 가이드 추가
  // Add guide based on prompt type
  if (promptInfo) {
    message += '\n\n';

    switch (promptInfo.type) {
      case 'yesno':
        message += '💡 _[y/n] 프롬프트가 감지되었습니다. `y` 또는 `n`으로 응답하세요._';
        break;
      case 'selection':
        message +=
          '💡 _선택 메뉴가 감지되었습니다. 방향키(`u`, `d`)로 이동하고 `e`로 선택하세요._';
        break;
      case 'numbered':
        message += '💡 _번호 옵션이 감지되었습니다. 번호를 입력하고 `e`를 눌러 선택하세요._';
        break;
    }
  }

  // 출력이 잘린 경우 안내 메시지 추가
  // Add truncation notice if needed
  if (captureResult.isTruncated) {
    message += `\n\n_📄 전체 ${captureResult.totalLines}줄 중 일부만 표시되었습니다._`;
  }

  return message;
}
