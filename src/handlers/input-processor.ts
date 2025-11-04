/**
 * 4단계 입력 처리 파이프라인
 * 4-stage input processing pipeline
 *
 * 처리 순서 (Processing order):
 * 1. Slack 네이티브 명령 감지 및 패스스루
 * 2. 봇 메타 명령 처리 (/setup, /status, /help, /stop)
 * 3. 백틱 명령 감지 및 DSL 파서 호출
 * 4. 기본 입력 처리 - Slack 멘션 필터링 후 Claude Code 전송
 */

import { getLogger } from '../utils/logger';
import { parseInteractiveCommand } from '../dsl/parser';
import { filterSlackMentions, MentionFilterResult } from './mention-filter';

/**
 * 입력 처리 결과 인터페이스
 * Input processing result interface
 */
export interface InputProcessingResult {
  stage: 1 | 2 | 3 | 4;
  action: 'passthrough' | 'bot-command' | 'dsl-command' | 'default-input';
  shouldProcess: boolean;
  processedInput?: string;
  metadata?: {
    commandType?: string;
    hasDslCommands?: boolean;
    mentionFilterResult?: MentionFilterResult;
    originalInput?: string;
  };
}

/**
 * 1단계: Slack 네이티브 명령 감지
 * Stage 1: Detect Slack native commands
 *
 * Slack 네이티브 명령은 그대로 패스스루
 * Pass through Slack native commands as-is
 *
 * @param input - 사용자 입력
 * @returns Processing result or null
 */
export function detectSlackNativeCommand(input: string): InputProcessingResult | null {
  const logger = getLogger();

  // Slack 네이티브 명령 패턴
  // Slack native command patterns
  // 예: /remind, /invite, /msg 등
  // Examples: /remind, /invite, /msg, etc.
  const slackNativeCommands = [
    '/remind',
    '/invite',
    '/msg',
    '/call',
    '/dm',
    '/leave',
    '/topic',
    '/mute',
    '/unmute',
  ];

  const trimmedInput = input.trim().toLowerCase();

  for (const cmd of slackNativeCommands) {
    if (trimmedInput.startsWith(cmd)) {
      logger.debug(`Slack native command detected: ${cmd}`);

      return {
        stage: 1,
        action: 'passthrough',
        shouldProcess: false,
        metadata: {
          commandType: cmd,
        },
      };
    }
  }

  return null;
}

/**
 * 2단계: 봇 메타 명령 처리
 * Stage 2: Process bot meta commands
 *
 * 봇 메타 명령: /setup, /status, /help, /stop
 * Bot meta commands: /setup, /status, /help, /stop
 *
 * @param input - 사용자 입력
 * @returns Processing result or null
 */
export function detectBotMetaCommand(input: string): InputProcessingResult | null {
  const logger = getLogger();

  // 봇 메타 명령 패턴
  // Bot meta command patterns
  const botMetaCommands = ['/setup', '/status', '/help', '/stop'];

  const trimmedInput = input.trim().toLowerCase();

  for (const cmd of botMetaCommands) {
    if (trimmedInput.startsWith(cmd)) {
      logger.debug(`Bot meta command detected: ${cmd}`);

      return {
        stage: 2,
        action: 'bot-command',
        shouldProcess: true,
        processedInput: trimmedInput,
        metadata: {
          commandType: cmd,
        },
      };
    }
  }

  return null;
}

/**
 * 3단계: 백틱 명령 감지
 * Stage 3: Detect backtick commands
 *
 * 백틱(`)으로 감싼 DSL 명령 감지
 * Detect DSL commands wrapped in backticks (`)
 *
 * @param input - 사용자 입력
 * @returns Processing result or null
 */
export function detectDslCommand(input: string): InputProcessingResult | null {
  const logger = getLogger();

  // 백틱 패턴 확인
  // Check for backtick pattern
  if (!input.includes('`')) {
    return null;
  }

  // DSL 명령 파싱 시도
  // Try to parse DSL commands
  const parseResult = parseInteractiveCommand(input);

  if (parseResult.success && parseResult.segments.length > 0) {
    logger.debug(`DSL command detected with ${parseResult.segments.length} segments`);

    return {
      stage: 3,
      action: 'dsl-command',
      shouldProcess: true,
      processedInput: input,
      metadata: {
        hasDslCommands: true,
      },
    };
  }

  return null;
}

/**
 * 4단계: 기본 입력 처리
 * Stage 4: Default input processing
 *
 * Slack 멘션 필터링 후 Claude Code로 전송
 * Filter Slack mentions and send to Claude Code
 *
 * @param input - 사용자 입력
 * @returns Processing result
 */
export function processDefaultInput(input: string): InputProcessingResult {
  const logger = getLogger();

  // 빈 입력 처리
  // Handle empty input
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    logger.debug('Empty input, skipping processing');
    return {
      stage: 4,
      action: 'default-input',
      shouldProcess: false,
      processedInput: '',
    };
  }

  // Slack 멘션 필터링
  // Filter Slack mentions
  const mentionFilterResult = filterSlackMentions(trimmedInput);

  logger.debug(
    `Default input processed. Mentions removed: ${mentionFilterResult.mentionsRemoved}`
  );

  // 멘션 필터링 후 빈 입력이 되면 처리하지 않음
  // Skip processing if input becomes empty after filtering
  if (mentionFilterResult.filteredText.length === 0) {
    logger.debug('Input empty after mention filtering, skipping processing');
    return {
      stage: 4,
      action: 'default-input',
      shouldProcess: false,
      processedInput: '',
      metadata: {
        originalInput: input,
        mentionFilterResult,
      },
    };
  }

  return {
    stage: 4,
    action: 'default-input',
    shouldProcess: true,
    processedInput: mentionFilterResult.filteredText,
    metadata: {
      originalInput: input,
      mentionFilterResult,
    },
  };
}

/**
 * 4단계 입력 처리 파이프라인 실행
 * Execute 4-stage input processing pipeline
 *
 * @param input - 사용자 입력
 * @returns Processing result
 *
 * 처리 흐름 (Processing flow):
 * 1. Slack 네이티브 명령 → 패스스루
 * 2. 봇 메타 명령 → 봇 명령 처리기로 전달
 * 3. 백틱 명령 → DSL 처리기로 전달
 * 4. 기본 입력 → Slack 멘션 필터링 후 Claude Code로 전송
 */
export function processInput(input: string): InputProcessingResult {
  const logger = getLogger();
  logger.debug(`Processing input: ${input.slice(0, 100)}...`);

  // Stage 1: Slack 네이티브 명령 감지
  // Stage 1: Detect Slack native commands
  const slackNativeResult = detectSlackNativeCommand(input);
  if (slackNativeResult) {
    logger.info(`Input processed at stage 1: Slack native command`);
    return slackNativeResult;
  }

  // Stage 2: 봇 메타 명령 감지
  // Stage 2: Detect bot meta commands
  const botMetaResult = detectBotMetaCommand(input);
  if (botMetaResult) {
    logger.info(`Input processed at stage 2: Bot meta command`);
    return botMetaResult;
  }

  // Stage 3: 백틱 명령 감지
  // Stage 3: Detect DSL commands
  const dslResult = detectDslCommand(input);
  if (dslResult) {
    logger.info(`Input processed at stage 3: DSL command`);
    return dslResult;
  }

  // Stage 4: 기본 입력 처리
  // Stage 4: Default input processing
  const defaultResult = processDefaultInput(input);
  logger.info(`Input processed at stage 4: Default input`);
  return defaultResult;
}
