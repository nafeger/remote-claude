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
  formatWarning,
  formatBold,
  formatCodeBlock,
  formatOutputSummary,
} from '../bot/formatters';

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

    logger.info(`Starting job: ${job.id} (channel: ${channelId})`);

    try {
      // 작업 상태 업데이트
      this.jobQueue.updateJobStatus(job.id, JobStatus.RUNNING);
      this.runningJobs.set(channelId, job);

      // Slack에 시작 메시지 전송
      await this.sendJobStartMessage(channelId, job, channelConfig);

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
    const message =
      formatInProgress(formatBold('작업 시작')) +
      '\n\n' +
      `${formatBold('작업 ID')}: ${job.id}\n` +
      `${formatBold('프로젝트')}: ${channelConfig.projectName}\n` +
      `${formatBold('타입')}: ${job.type}\n` +
      `${formatBold('프롬프트')}:\n` +
      formatCodeBlock(job.prompt.slice(0, 200) + (job.prompt.length > 200 ? '...' : ''));

    try {
      await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: message,
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
    const logger = getLogger();

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

      // 대화형 프롬프트 감지
      const hasInteractivePrompt = await this.tmuxManager.detectInteractivePrompt(
        channelConfig.tmuxSession
      );

      if (hasInteractivePrompt) {
        // 대화형 응답 대기 상태로 전환
        this.stateManager.setWaitingForResponse(channelId, true, 30); // 30분 타임아웃
        this.stateManager.setLastOutput(channelId, result.fullOutput);

        await this.sendInteractivePromptMessage(channelId, result.summary);

        // 작업은 계속 RUNNING 상태 유지
        logger.info(`Job waiting for interactive response: ${job.id}`);
      } else {
        // 작업 완료
        this.jobQueue.updateJobStatus(job.id, JobStatus.COMPLETED);
        this.runningJobs.delete(channelId);
        this.stateManager.clearSession(channelId);

        await this.sendJobCompletionMessage(channelId, job, result);

        // 다음 작업 실행
        await this.startJob(channelId, channelConfig);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 대화형 프롬프트 메시지 전송
   * Send interactive prompt message
   */
  private async sendInteractivePromptMessage(
    channelId: string,
    output: string
  ): Promise<void> {
    const message =
      formatWarning(formatBold('대화형 응답 필요')) +
      '\n\n' +
      'Claude Code가 사용자 입력을 기다리고 있습니다.\n' +
      '`y` 또는 `n` 으로 응답하세요.\n\n' +
      formatBold('출력:') +
      '\n' +
      formatCodeBlock(output);

    try {
      await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: message,
      });
    } catch (error) {
      getLogger().error(`Failed to send interactive prompt message: ${error}`);
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
      await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: message,
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
      await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: message,
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
}
