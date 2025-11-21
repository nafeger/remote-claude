/**
 * 작업 실행 오케스트레이터
 * Job execution orchestrator
 */

import { App } from '@slack/bolt';
import { Job, JobStatus, ChannelConfig } from '../types';
import { JobQueue } from './queue';
import { StateManager } from '../state/manager';
import { TmuxManager } from '../tmux/manager';
import { getLogger } from '../utils/logger';
import {
  formatInProgress,
  formatSuccess,
  formatError,
  formatBold,
  formatCodeBlock,
  formatOutputSummary,
  formatDslGuide,
  formatInteractivePromptHelp,
  formatDslMixedCharError,
  formatDslExecutionError,
  addInteractiveButtons,
  formatAndSendLargeMessage,
} from '../bot/formatters';
import { sendSlackMessage } from '../utils/slack-messenger';
import {
  parseInteractiveCommand,
  ParseResult,
} from '../dsl/parser';
import {
  executeCommandSequence,
  capturePane,
} from '../tmux/executor';
import {
  processCaptureResult,
  detectAnyInteractivePrompt,
  formatDslResponse,
  InteractivePromptInfo,
} from '../tmux/parser';

/**
 * Job Orchestrator 클래스
 * Orchestrates job execution with tmux and Slack integration
 */
export class JobOrchestrator {
  private jobQueue: JobQueue;
  private stateManager: StateManager;
  private tmuxManager: TmuxManager;
  private slackApp: App;

  // 실행 중인 작업 추적 (channelId -> Job)
  private runningJobs: Map<string, Job>;

  constructor(
    jobQueue: JobQueue,
    stateManager: StateManager,
    tmuxManager: TmuxManager,
    slackApp: App
  ) {
    this.jobQueue = jobQueue;
    this.stateManager = stateManager;
    this.tmuxManager = tmuxManager;
    this.slackApp = slackApp;
    this.runningJobs = new Map();
  }

  /**
   * 작업 실행 시작
   * Start job execution for a channel
   */
  public async startJob(
    channelId: string,
    channelConfig: ChannelConfig
  ): Promise<void> {
    const logger = getLogger();

    // 이미 실행 중인 작업이 있는지 확인
    if (this.runningJobs.has(channelId)) {
      logger.warn(`Job already running for channel: ${channelId}`);
      return;
    }

    // 다음 대기 중인 작업 가져오기
    const job = this.jobQueue.getNextJob(channelId);
    if (!job) {
      logger.debug(`No pending jobs for channel: ${channelId}`);
      return;
    }

    logger.info(`Starting job: ${job.id} (channel: ${channelId}, type: ${job.type})`);

    try {
      // 작업 상태 업데이트
      this.jobQueue.updateJobStatus(job.id, JobStatus.RUNNING);
      this.runningJobs.set(channelId, job);

      // Slack에 시작 메시지 전송
      await this.sendJobStartMessage(channelId, job, channelConfig);

      // Job 타입에 따라 처리
      const { JobType } = await import('../types');

      if (job.type === JobType.DSL_COMMAND) {
        // DSL 명령 처리
        await this.executeDslCommand(channelId, channelConfig, job);
      } else {
        // 일반 프롬프트 처리 (RUN_SNIPPET, ASK_PROMPT)
        // Claude Code 시작
        const startResult = await this.tmuxManager.startClaudeCode(
          channelConfig.tmuxSession,
          channelConfig.projectPath
        );

        if (!startResult.success) {
          throw new Error(
            `Failed to start Claude Code: ${startResult.error}`
          );
        }

        // 프롬프트 전송
        await this.tmuxManager.sendPrompt(
          channelConfig.tmuxSession,
          job.prompt
        );

        // 상태 저장
        this.stateManager.setLastPrompt(channelId, job.prompt);

        // 출력 폴링 시작
        await this.pollAndReportOutput(channelId, channelConfig, job);
      }
    } catch (error) {
      logger.error(`Job execution failed: ${error}`);

      // 작업 실패 처리
      this.jobQueue.updateJobStatus(
        job.id,
        JobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.runningJobs.delete(channelId);

      // 실패 메시지 전송
      await this.sendJobFailureMessage(channelId, job, error);
    }
  }

  /**
   * 작업 시작 메시지 전송
   * Send job start message to Slack
   */
  private async sendJobStartMessage(
    channelId: string,
    job: Job,
    channelConfig: ChannelConfig
  ): Promise<void> {
    const promptPreview = job.prompt.length > 200
      ? job.prompt.slice(0, 200) + '...'
      : job.prompt;

    const lengthInfo = job.prompt.length > 200
      ? `\n(전체 ${job.prompt.length}자 중 200자만 표시)`
      : '';

    const message =
      formatInProgress(formatBold('작업 시작')) +
      '\n\n' +
      `${formatBold('작업 ID')}: ${job.id}\n` +
      `${formatBold('프로젝트')}: ${channelConfig.projectName}\n` +
      `${formatBold('타입')}: ${job.type}\n` +
      `${formatBold('프롬프트')}${lengthInfo}:\n` +
      formatCodeBlock(promptPreview);

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send start message: ${error}`);
    }
  }

  /**
   * 출력 폴링 및 결과 보고
   * Poll output and report results
   */
  private async pollAndReportOutput(
    channelId: string,
    channelConfig: ChannelConfig,
    job: Job
  ): Promise<void> {
    try {
      // 출력 폴링 (최대 10분)
      const result = await this.tmuxManager.pollUntilStable(
        channelConfig.tmuxSession,
        5000, // 5초 간격
        120 // 최대 120회 (10분)
      );

      if (!result) {
        throw new Error('Output polling timed out');
      }

      // 작업 완료
      this.jobQueue.updateJobStatus(job.id, JobStatus.COMPLETED);
      this.runningJobs.delete(channelId);
      this.stateManager.clearSession(channelId);

      await this.sendJobCompletionMessage(channelId, job, result);

      // 다음 작업 실행
      await this.startJob(channelId, channelConfig);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 작업 완료 메시지 전송
   * Send job completion message
   */
  private async sendJobCompletionMessage(
    channelId: string,
    job: Job,
    result: { summary: string; isTruncated: boolean; totalLines: number }
  ): Promise<void> {
    const { formatted: outputFormatted } = formatOutputSummary(result.summary);

    const message =
      formatSuccess(formatBold('작업 완료')) +
      '\n\n' +
      `${formatBold('작업 ID')}: ${job.id}\n` +
      `${formatBold('출력 라인 수')}: ${result.totalLines}줄` +
      (result.isTruncated ? ' (요약됨)' : '') +
      '\n\n' +
      formatBold('출력:') +
      '\n' +
      outputFormatted;

    try {
      // 대용량 메시지 분할 전송 (Slack 3000자 제한 대응)
      await formatAndSendLargeMessage(this.slackApp, channelId, message, {
        maxLength: 2500,
        wrapCodeBlock: true,
        addIndicators: true,
        delayMs: 500,
      });
    } catch (error) {
      getLogger().error(`Failed to send completion message: ${error}`);
    }
  }

  /**
   * 작업 실패 메시지 전송
   * Send job failure message
   */
  private async sendJobFailureMessage(
    channelId: string,
    job: Job,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const message =
      formatError(formatBold('작업 실패')) +
      '\n\n' +
      `${formatBold('작업 ID')}: ${job.id}\n` +
      `${formatBold('오류')}:\n` +
      formatCodeBlock(errorMessage);

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send failure message: ${error}`);
    }
  }

  /**
   * 대화형 응답 처리
   * Handle interactive response
   */
  public async handleInteractiveResponse(
    channelId: string,
    channelConfig: ChannelConfig,
    response: 'y' | 'n'
  ): Promise<void> {
    const logger = getLogger();

    if (!this.stateManager.isWaitingForResponse(channelId)) {
      logger.warn(`Not waiting for response from channel: ${channelId}`);
      return;
    }

    const job = this.runningJobs.get(channelId);
    if (!job) {
      logger.error(`No running job found for channel: ${channelId}`);
      return;
    }

    try {
      // 응답 전송
      await this.tmuxManager.sendInteractiveResponse(
        channelConfig.tmuxSession,
        response
      );

      // 대기 상태 해제
      this.stateManager.setWaitingForResponse(channelId, false);

      // 출력 폴링 재개
      await this.pollAndReportOutput(channelId, channelConfig, job);
    } catch (error) {
      logger.error(`Failed to handle interactive response: ${error}`);

      this.jobQueue.updateJobStatus(
        job.id,
        JobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.runningJobs.delete(channelId);
      this.stateManager.clearSession(channelId);

      await this.sendJobFailureMessage(channelId, job, error);
    }
  }

  /**
   * 작업 취소
   * Cancel job
   */
  public async cancelJob(channelId: string): Promise<boolean> {
    const logger = getLogger();

    const runningJob = this.runningJobs.get(channelId);
    if (!runningJob) {
      logger.warn(`No running job to cancel for channel: ${channelId}`);
      return false;
    }

    this.jobQueue.updateJobStatus(runningJob.id, JobStatus.CANCELLED);
    this.runningJobs.delete(channelId);
    this.stateManager.clearSession(channelId);

    logger.info(`Job cancelled: ${runningJob.id}`);
    return true;
  }

  /**
   * 실행 중인 작업 가져오기
   * Get running job
   */
  public getRunningJob(channelId: string): Job | undefined {
    return this.runningJobs.get(channelId);
  }

  /**
   * DSL 명령 처리
   * Handle DSL command (backtick-based commands)
   *
   * @param channelId - Slack channel ID
   * @param channelConfig - Channel configuration
   * @param message - User message with DSL commands
   * @returns Promise<void>
   *
   * 처리 흐름 (Processing flow):
   * 1. 백틱 명령 파싱 (Parse backtick commands)
   * 2. 명령 시퀀스 실행 (Execute command sequence)
   * 3. 화면 캡처 (Capture screen)
   * 4. 인터랙티브 프롬프트 감지 (Detect interactive prompt)
   * 5. Slack에 결과 전송 (Send result to Slack)
   */
  public async handleDslCommand(
    channelId: string,
    channelConfig: ChannelConfig,
    message: string
  ): Promise<void> {
    const logger = getLogger();

    try {
      // 1. 백틱 명령 파싱
      // Parse backtick commands
      const parseResult: ParseResult = parseInteractiveCommand(message);

      if (!parseResult.success) {
        // 파싱 에러 (혼합 문자 에러 등)
        // Parsing error (mixed character error, etc.)
        await this.sendDslParseError(channelId, parseResult.error!);
        return;
      }

      if (parseResult.segments.length === 0) {
        logger.debug('No DSL commands found in message');
        return;
      }

      // 2. 명령 시퀀스 실행
      // Execute command sequence
      const executeResult = await executeCommandSequence(
        channelConfig.tmuxSession,
        parseResult.segments
      );

      if (!executeResult.success) {
        // 실행 에러
        // Execution error
        await this.sendDslExecutionErrorMessage(
          channelId,
          executeResult.error || 'Unknown error'
        );
        return;
      }

      // 3. 화면 캡처 (최근 300줄 scrollback 포함, 마지막 30줄 표시)
      // Capture screen (include recent 300 lines scrollback, display last 30 lines)
      const captureResult = await capturePane(channelConfig.tmuxSession, -300);

      if (!captureResult.success) {
        await this.sendDslExecutionErrorMessage(
          channelId,
          captureResult.error || 'Screen capture failed'
        );
        return;
      }

      // 4. 화면 출력 처리 및 인터랙티브 프롬프트 감지
      // Process output and detect interactive prompt (last 30 lines only)
      const processedOutput = processCaptureResult(captureResult.output || '', 0, 30);
      const promptInfo = detectAnyInteractivePrompt(processedOutput.fullOutput);

      // 5. Slack에 결과 전송
      // Send result to Slack
      await this.sendDslResponseMessage(
        channelId,
        processedOutput,
        parseResult.segments.length,
        promptInfo
      );

      // 인터랙티브 프롬프트가 감지되면 대기 상태로 전환
      // If interactive prompt detected, enter waiting state
      if (promptInfo) {
        this.stateManager.setWaitingForResponse(channelId, true, 30); // 30분 타임아웃
        this.stateManager.setLastOutput(channelId, processedOutput.fullOutput);
      }
    } catch (error) {
      logger.error(`DSL command handling failed: ${error}`);
      await this.sendDslExecutionErrorMessage(
        channelId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * DSL 응답 메시지 전송
   * Send DSL response message with screen capture and guide
   *
   * @param channelId - Slack channel ID
   * @param captureResult - Processed capture result
   * @param commandCount - Number of commands executed
   * @param promptInfo - Interactive prompt info (if detected)
   */
  private async sendDslResponseMessage(
    channelId: string,
    captureResult: { fullOutput: string; summary: string; isTruncated: boolean; totalLines: number },
    commandCount: number,
    promptInfo: InteractivePromptInfo | null
  ): Promise<void> {
    // formatDslResponse from tmux/parser.ts
    const formattedOutput = formatDslResponse(captureResult, promptInfo);

    let message =
      formatSuccess(formatBold('DSL 명령 실행 완료')) +
      '\n\n' +
      `${formatBold('실행된 명령')}: ${commandCount}개\n` +
      `${formatBold('출력 라인 수')}: ${captureResult.totalLines}줄` +
      (captureResult.isTruncated ? ' (요약됨)' : '') +
      '\n\n' +
      formatBold('화면 출력:') +
      '\n' +
      formattedOutput;

    // 인터랙티브 프롬프트 타입별 도움말 추가
    // Add prompt-specific help if detected
    if (promptInfo) {
      message += '\n\n' + formatInteractivePromptHelp(promptInfo.type);
    }

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send DSL response message: ${error}`);
    }
  }

  /**
   * DSL 파싱 에러 메시지 전송
   * Send DSL parsing error message (e.g., mixed character error)
   *
   * @param channelId - Slack channel ID
   * @param error - Parse error
   */
  private async sendDslParseError(channelId: string, error: Error): Promise<void> {
    // 혼합 문자 에러인 경우 특별 처리
    // Special handling for mixed character error
    const errorMessage = error.message;
    const isMixedCharError = errorMessage.includes('백틱 내용이 애매합니다');

    let message: string;

    if (isMixedCharError) {
      // 에러 메시지에서 키 문자와 일반 문자 추출
      // Extract key chars and non-key chars from error message
      const keyCharsMatch = errorMessage.match(/'([^']+)' 는 키 매핑 문자/);
      const nonKeyCharsMatch = errorMessage.match(/'([^']+)'는 아닙니다/);

      if (keyCharsMatch && nonKeyCharsMatch) {
        const keyChars = keyCharsMatch[1].split("', '");
        const nonKeyChars = nonKeyCharsMatch[1].split("', '");
        message = formatDslMixedCharError(keyChars, nonKeyChars);
      } else {
        message = formatError(formatBold('DSL 파싱 에러')) + '\n\n' + errorMessage;
      }
    } else {
      message = formatError(formatBold('DSL 파싱 에러')) + '\n\n' + errorMessage;
    }

    // DSL 가이드 추가
    // Add DSL guide
    message += '\n\n' + formatDslGuide();

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send DSL parse error: ${error}`);
    }
  }

  /**
   * DSL 실행 에러 메시지 전송
   * Send DSL execution error message
   *
   * @param channelId - Slack channel ID
   * @param error - Execution error message
   */
  private async sendDslExecutionErrorMessage(
    channelId: string,
    error: string
  ): Promise<void> {
    const message = formatDslExecutionError(error);

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send DSL execution error: ${error}`);
    }
  }

  /**
   * DSL 명령 실행
   * Execute DSL command
   *
   * @param channelId - Slack channel ID
   * @param channelConfig - Channel configuration
   * @param job - Job to execute
   */
  private async executeDslCommand(
    channelId: string,
    channelConfig: ChannelConfig,
    job: Job
  ): Promise<void> {
    const logger = getLogger();

    try {
      logger.info(`Executing DSL command: ${job.prompt}`);

      // DSL 파싱
      const parseResult = parseInteractiveCommand(job.prompt);

      if (!parseResult.success) {
        // 파싱 실패
        logger.error(`DSL parsing failed: ${parseResult.error?.message}`);
        await this.sendDslParseError(
          channelId,
          parseResult.error || new Error('Unknown parse error')
        );

        // 작업 실패 처리
        this.jobQueue.updateJobStatus(
          job.id,
          JobStatus.FAILED,
          parseResult.error?.message || 'DSL parsing failed'
        );
        this.runningJobs.delete(channelId);

        // 다음 작업 실행
        await this.startJob(channelId, channelConfig);
        return;
      }

      logger.debug(`Parsed ${parseResult.segments.length} DSL segments`);

      // DSL 명령 시퀀스 실행
      await executeCommandSequence(
        channelConfig.tmuxSession,
        parseResult.segments
      );

      logger.info('DSL command sequence executed successfully');

      // 500ms 대기 후 화면 캡처
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 화면 캡처 (최근 300줄 scrollback 포함, 마지막 30줄 표시)
      // Capture screen (include recent 300 lines scrollback, display last 30 lines)
      const captureResult = await capturePane(channelConfig.tmuxSession, -300);

      if (!captureResult.success) {
        throw new Error(`Failed to capture screen: ${captureResult.error}`);
      }

      // 출력 처리 (마지막 30줄만)
      // Process output (last 30 lines only)
      const processedOutput = processCaptureResult(captureResult.output, 0, 30);

      // 완료 메시지 전송
      logger.info('DSL command completed successfully');
      await this.sendDslCompletionMessage(
        channelId,
        job,
        processedOutput.summary
      );

      // 작업 완료
      this.jobQueue.updateJobStatus(job.id, JobStatus.COMPLETED);
      this.runningJobs.delete(channelId);

      // 다음 작업 실행
      await this.startJob(channelId, channelConfig);
    } catch (error) {
      logger.error(`DSL command execution failed: ${error}`);

      // 에러 메시지 전송
      await this.sendDslExecutionErrorMessage(
        channelId,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // 작업 실패 처리
      this.jobQueue.updateJobStatus(
        job.id,
        JobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.runningJobs.delete(channelId);

      // 다음 작업 실행
      await this.startJob(channelId, channelConfig);
    }
  }

  /**
   * DSL 완료 메시지 전송
   * Send DSL completion message
   *
   * @param channelId - Slack channel ID
   * @param job - Completed job
   * @param output - Command output
   */
  private async sendDslCompletionMessage(
    channelId: string,
    job: Job,
    output: string
  ): Promise<void> {
    const message =
      formatSuccess(formatBold('DSL 명령 완료')) +
      '\n\n' +
      `${formatBold('작업 ID')}: ${job.id}\n` +
      `${formatBold('명령')}: ${formatCodeBlock(job.prompt)}\n\n` +
      `${formatBold('화면 출력')}:\n` +
      formatCodeBlock(output);

    try {
      // 대용량 메시지 분할 전송 (Slack 3000자 제한 대응)
      await formatAndSendLargeMessage(this.slackApp, channelId, message, {
        maxLength: 2500,
        wrapCodeBlock: true,
        addIndicators: true,
        delayMs: 500,
      });
    } catch (error) {
      getLogger().error(`Failed to send DSL completion message: ${error}`);
    }
  }

  /**
   * DSL 가이드 메시지 전송
   * Send DSL usage guide message
   *
   * @param channelId - Slack channel ID
   */
  public async sendDslGuideMessage(channelId: string): Promise<void> {
    const message = formatDslGuide();

    try {
      await sendSlackMessage(this.slackApp, channelId, message, {
        autoSplit: false,
        blocks: addInteractiveButtons(message),
      });
    } catch (error) {
      getLogger().error(`Failed to send DSL guide: ${error}`);
    }
  }
}
