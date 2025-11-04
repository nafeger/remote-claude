/**
 * 인터랙티브 프롬프트 자동 감지 모듈
 * Interactive prompt auto-detection module
 */

import {
  detectInteractivePrompt,
  detectSelectionMenu,
  detectNumberedMenu,
  detectAnyInteractivePrompt,
  InteractivePromptInfo,
} from '../tmux/parser';
import { getLogger } from '../utils/logger';

/**
 * 감지 결과 인터페이스
 * Detection result interface
 */
export interface DetectionResult {
  detected: boolean;
  promptType?: 'yesno' | 'selection' | 'numbered';
  confidence: number;
  suggestedResponse?: string;
}

/**
 * 인터랙티브 프롬프트 감지 및 제안 생성
 * Detect interactive prompt and generate suggestion
 *
 * @param output - tmux 캡처 출력
 * @returns Detection result with suggestion
 *
 * 감지 우선순위 (Detection priority):
 * 1. [y/n] 프롬프트 (가장 명확한 패턴)
 * 2. 선택 메뉴 (❯ 마커)
 * 3. 번호 옵션
 */
export function detectAndSuggest(output: string): DetectionResult {
  const logger = getLogger();
  logger.debug('Running interactive prompt detection');

  // 종합 감지 실행
  // Run comprehensive detection
  const promptInfo = detectAnyInteractivePrompt(output);

  if (!promptInfo) {
    return {
      detected: false,
      confidence: 0,
    };
  }

  // 프롬프트 타입별 제안 생성
  // Generate suggestion based on prompt type
  const suggestedResponse = generateSuggestedResponse(promptInfo.type);

  logger.info(`Interactive prompt detected: ${promptInfo.type}`);

  return {
    detected: true,
    promptType: promptInfo.type,
    confidence: calculateConfidence(promptInfo.type, output),
    suggestedResponse,
  };
}

/**
 * 프롬프트 타입별 제안 응답 생성
 * Generate suggested response based on prompt type
 *
 * @param type - 프롬프트 타입
 * @returns Suggested response string
 */
function generateSuggestedResponse(type: 'yesno' | 'selection' | 'numbered'): string {
  switch (type) {
    case 'yesno':
      return '`y` 또는 `n`으로 응답하세요';
    case 'selection':
      return '`u` / `d`로 이동하고 `e`로 선택하세요';
    case 'numbered':
      return '번호를 입력하고 `e`를 눌러 선택하세요';
  }
}

/**
 * 감지 신뢰도 계산
 * Calculate detection confidence
 *
 * @param type - 프롬프트 타입
 * @param output - 출력 내용
 * @returns Confidence score (0.0 - 1.0)
 *
 * 신뢰도 기준 (Confidence criteria):
 * - yesno: [y/n] 패턴이 명확하면 0.9+
 * - selection: ❯ 마커가 있으면 0.85+
 * - numbered: 연속된 번호가 2개 이상이면 0.8+
 */
function calculateConfidence(
  type: 'yesno' | 'selection' | 'numbered',
  output: string
): number {
  const lastLines = output.split('\n').slice(-10).join('\n');

  switch (type) {
    case 'yesno': {
      // [y/n] 패턴이 마지막 5줄 안에 있으면 높은 신뢰도
      // High confidence if [y/n] pattern in last 5 lines
      const hasYesNo = /\[y\/n\]/i.test(lastLines);
      return hasYesNo ? 0.95 : 0.85;
    }

    case 'selection': {
      // ❯ 마커가 있으면 높은 신뢰도
      // High confidence if ❯ marker exists
      const hasMarker = /❯/.test(lastLines);
      return hasMarker ? 0.9 : 0.8;
    }

    case 'numbered': {
      // 연속된 번호가 많을수록 높은 신뢰도
      // Higher confidence with more consecutive numbers
      const numberMatches = lastLines.match(/^\s*\d+[.)]\s+/gm);
      const count = numberMatches ? numberMatches.length : 0;

      if (count >= 5) return 0.9;
      if (count >= 3) return 0.85;
      return 0.8;
    }
  }
}

/**
 * [y/n] 프롬프트 감지
 * Detect [y/n] prompt
 *
 * @param output - tmux 캡처 출력
 * @returns true if [y/n] prompt detected
 */
export function detectYesNoPrompt(output: string): boolean {
  return detectInteractivePrompt(output);
}

/**
 * 선택 메뉴 감지 (❯ 마커)
 * Detect selection menu with ❯ marker
 *
 * @param output - tmux 캡처 출력
 * @returns true if selection menu detected
 */
export function detectSelectionPrompt(output: string): boolean {
  return detectSelectionMenu(output);
}

/**
 * 번호 옵션 메뉴 감지
 * Detect numbered option menu
 *
 * @param output - tmux 캡처 출력
 * @returns true if numbered menu detected
 */
export function detectNumberedPrompt(output: string): boolean {
  return detectNumberedMenu(output);
}

/**
 * 모든 타입의 인터랙티브 프롬프트 감지
 * Detect all types of interactive prompts
 *
 * @param output - tmux 캡처 출력
 * @returns InteractivePromptInfo or null
 */
export function detectPrompt(output: string): InteractivePromptInfo | null {
  return detectAnyInteractivePrompt(output);
}

/**
 * 감지 통계 정보
 * Detection statistics
 */
export interface DetectionStats {
  totalDetections: number;
  yesnoCount: number;
  selectionCount: number;
  numberedCount: number;
  averageConfidence: number;
}

/**
 * 감지 통계 초기화
 * Initialize detection statistics
 */
let detectionStats: DetectionStats = {
  totalDetections: 0,
  yesnoCount: 0,
  selectionCount: 0,
  numberedCount: 0,
  averageConfidence: 0,
};

/**
 * 감지 결과 기록
 * Record detection result
 *
 * @param result - Detection result
 */
export function recordDetection(result: DetectionResult): void {
  if (!result.detected || !result.promptType) {
    return;
  }

  detectionStats.totalDetections++;

  switch (result.promptType) {
    case 'yesno':
      detectionStats.yesnoCount++;
      break;
    case 'selection':
      detectionStats.selectionCount++;
      break;
    case 'numbered':
      detectionStats.numberedCount++;
      break;
  }

  // 평균 신뢰도 업데이트
  // Update average confidence
  const totalConfidence =
    detectionStats.averageConfidence * (detectionStats.totalDetections - 1) +
    result.confidence;
  detectionStats.averageConfidence = totalConfidence / detectionStats.totalDetections;
}

/**
 * 감지 통계 가져오기
 * Get detection statistics
 *
 * @returns Detection statistics
 */
export function getDetectionStats(): DetectionStats {
  return { ...detectionStats };
}

/**
 * 감지 통계 초기화
 * Reset detection statistics
 */
export function resetDetectionStats(): void {
  detectionStats = {
    totalDetections: 0,
    yesnoCount: 0,
    selectionCount: 0,
    numberedCount: 0,
    averageConfidence: 0,
  };
}
