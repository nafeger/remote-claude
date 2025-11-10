/**
 * 작업 진행 상황 실시간 추적
 * Real-time job progress tracking
 */

import { App } from '@slack/bolt';
import { ChannelConfig } from '../types';
import { getLogger } from '../utils/logger';
import { capturePane } from '../tmux/executor';
import { processCaptureResult } from '../tmux/parser';
import { createHash } from 'crypto';
import {
  formatWaiting,
  formatInProgress,
  formatCodeBlock,
  formatSuccess,
  formatError,
} from '../bot/formatters';

/**
 * 진행 상황 상태 타입
 * Progress status types
 */
export enum ProgressStatus {
  IN_PROGRESS = 'in_progress', // 🔄 진행 중
  COMPLETED = 'completed',     // ✅ 완료
  FAILED = 'failed',           // ❌ 실패
  WAITING = 'waiting',         // ⏸️ 사용자 입력 대기
}

/**
 * 진행 상황 상태
 * Progress state for tracking job execution
 *
 * @property jobId - 작업 고유 식별자
 * @property channelId - Slack 채널 ID
 * @property tmuxSession - tmux 세션 이름
 * @property status - 작업 상태 (진행 중, 완료, 실패, 대기)
 * @property startTime - 작업 시작 시각 (Unix timestamp)
 * @property lastUpdate - 마지막 업데이트 시각 (Unix timestamp)
 * @property outputHash - 출력 해시값 (변경 감지용)
 * @property messageTs - Slack 메시지 타임스탬프 (업데이트용)
 * @property elapsedTime - 경과 시간 (밀리초)
 * @property error - 에러 메시지
 * @property tmuxFailureCount - tmux 응답 실패 횟수 (연속 실패 추적)
 * @property slackFailureCount - Slack API 실패 횟수 (연속 실패 추적)
 */
export interface ProgressState {
  jobId: string;
  channelId: string;
  tmuxSession: string;
  status: ProgressStatus;
  startTime: number;
  lastUpdate: number;
  outputHash?: string;
  messageTs?: string;
  elapsedTime?: number;
  error?: string;
  tmuxFailureCount?: number;
  slackFailureCount?: number;
}

/**
 * 작업 진행 상황 추적 클래스
 * Tracks and reports real-time progress of job execution
 */
export class ProgressTracker {
  // 폴링 간격 (5초)
  private static readonly POLLING_INTERVAL = 5000;

  // 최대 타임아웃 (1시간)
  private static readonly MAX_TIMEOUT = 60 * 60 * 1000;

  // 기본 출력 라인 수
  private static readonly DEFAULT_OUTPUT_LINES = 50;

  // 최대 tmux 실패 횟수 (연속 5회 실패 시 중단)
  private static readonly MAX_TMUX_FAILURES = 5;

  // 최대 Slack API 실패 횟수 (연속 3회 실패 시 중단)
  private static readonly MAX_SLACK_FAILURES = 3;

  private slackApp: App;
  private activeTracking: Map<string, ProgressState>;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  private timeoutTimers: Map<string, NodeJS.Timeout>;

  /**
   * ProgressTracker 생성자
   * @param slackApp Slack Bolt App 인스턴스
   */
  constructor(slackApp: App) {
    this.slackApp = slackApp;
    this.activeTracking = new Map();
    this.pollingIntervals = new Map();
    this.timeoutTimers = new Map();

    getLogger().info('ProgressTracker initialized');
  }

  /**
   * 작업 추적 시작
   * Start tracking a job's progress
   *
   * @param jobId - 작업 고유 식별자
   * @param channelId - Slack 채널 ID
   * @param channelConfig - 채널 설정 (tmux 세션 정보 포함)
   * @returns Promise<void>
   * @throws {Error} Slack API 에러 시 예외 발생
   */
  async startTracking(
    jobId: string,
    channelId: string,
    channelConfig: ChannelConfig
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Starting progress tracking for job ${jobId}`);

    // 진행 상황 상태 초기화
    const progressState: ProgressState = {
      jobId,
      channelId,
      tmuxSession: channelConfig.tmuxSession,
      status: ProgressStatus.IN_PROGRESS,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    this.activeTracking.set(jobId, progressState);

    try {
      // 초기 메시지 전송
      const initialMessage = formatWaiting('작업을 시작합니다...');
      const result = await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: initialMessage,
      });

      // 메시지 타임스탬프 저장 (업데이트용)
      if (result.ts) {
        progressState.messageTs = result.ts;
        this.activeTracking.set(jobId, progressState);
      }

      logger.info(`Initial progress message sent for job ${jobId}`);

      // 폴링 시작 (Task 1.5에서 구현)
      this.startPolling(jobId, channelConfig);

      // 타임아웃 타이머 설정 (Task 1.11에서 구현)
      this.setTimeoutTimer(jobId);
    } catch (error: unknown) {
      logger.error(`Failed to start tracking for job ${jobId}:`, error);

      // Slack API 에러인 경우 상세 로깅
      if (error && typeof error === 'object' && 'data' in error) {
        logger.error('Slack API error details:', error);
      }

      // 실패한 작업 상태 정리
      this.activeTracking.delete(jobId);

      throw new Error(`진행 상황 추적 시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 작업 추적 중단
   * Stop tracking a job's progress
   *
   * @param jobId - 작업 고유 식별자
   * @returns Promise<void>
   * @throws {Error} 예상치 못한 에러 발생 시 예외 발생
   */
  async stopTracking(jobId: string): Promise<void> {
    const logger = getLogger();
    logger.info(`Stopping progress tracking for job ${jobId}`);

    const state = this.activeTracking.get(jobId);

    if (!state) {
      logger.warn(`Cannot stop tracking - job ${jobId} not found in active tracking`);
      return;
    }

    try {
      // 최종 메시지 전송
      const finalMessage = this.getStatusMessage(state);

      if (state.messageTs) {
        // 마지막 출력 캡처
        const output = await this.captureOutput(state.tmuxSession);
        const formattedOutput = output ? formatCodeBlock(output) : '';

        try {
          await this.slackApp.client.chat.update({
            channel: state.channelId,
            ts: state.messageTs,
            text: `${finalMessage}${formattedOutput ? '\n\n' + formattedOutput : ''}`,
          });

          logger.info(`Final progress message sent for job ${jobId}`);
        } catch (slackError: unknown) {
          // Slack API 에러는 로깅만 하고 계속 진행 (정리는 해야 함)
          logger.error(`Failed to send final message for job ${jobId}:`, slackError);

          if (slackError && typeof slackError === 'object' && 'data' in slackError) {
            logger.error('Slack API error details:', slackError);
          }
        }
      }

      // 폴링 중단
      this.clearPolling(jobId);

      // 타임아웃 타이머 정리
      this.clearTimeoutTimer(jobId);

      // 추적 상태 제거
      this.activeTracking.delete(jobId);

      logger.info(`Progress tracking stopped for job ${jobId}`);
    } catch (error: unknown) {
      logger.error(`Unexpected error stopping tracking for job ${jobId}:`, error);

      // 에러가 발생해도 정리는 시도
      try {
        this.clearPolling(jobId);
        this.clearTimeoutTimer(jobId);
        this.activeTracking.delete(jobId);
      } catch (cleanupError) {
        logger.error(`Failed to cleanup resources for job ${jobId}:`, cleanupError);
      }

      throw new Error(`진행 상황 추적 중단 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 진행 상황 업데이트
   * Update progress information
   *
   * @param jobId - 작업 고유 식별자
   * @returns Promise<void>
   * @description 5초마다 호출되어 tmux 출력을 캡처하고 변경 시 Slack 메시지 업데이트
   */
  private async updateProgress(jobId: string): Promise<void> {
    const logger = getLogger();
    const state = this.activeTracking.get(jobId);

    if (!state) {
      logger.warn(`Cannot update progress - job ${jobId} not found in active tracking`);
      return;
    }

    try {
      // tmux 출력 캡처
      const output = await this.captureOutput(state.tmuxSession);

      if (!output) {
        // tmux 응답 실패 처리
        const failureCount = (state.tmuxFailureCount || 0) + 1;
        state.tmuxFailureCount = failureCount;
        this.activeTracking.set(jobId, state);

        logger.warn(`No output captured for job ${jobId} (failure ${failureCount}/${ProgressTracker.MAX_TMUX_FAILURES})`);

        // 연속 실패 횟수 초과 시 작업 중단
        if (failureCount >= ProgressTracker.MAX_TMUX_FAILURES) {
          logger.error(`tmux capture failed ${failureCount} times for job ${jobId} - stopping tracking`);
          state.status = ProgressStatus.FAILED;
          state.error = 'tmux 세션 응답 없음 (연속 5회 실패)';
          this.activeTracking.set(jobId, state);

          // 사용자에게 에러 알림
          if (state.messageTs) {
            try {
              await this.slackApp.client.chat.update({
                channel: state.channelId,
                ts: state.messageTs,
                text: formatError('❌ tmux 세션 응답 없음 (연속 5회 실패)\n\n작업이 중단되었습니다.'),
              });
            } catch (slackError) {
              logger.error(`Failed to send tmux error message for job ${jobId}:`, slackError);
            }
          }

          this.clearPolling(jobId);
          this.clearTimeoutTimer(jobId);
        }

        return;
      }

      // tmux 성공 시 실패 카운터 리셋
      if (state.tmuxFailureCount && state.tmuxFailureCount > 0) {
        logger.info(`tmux capture recovered for job ${jobId}`);
        state.tmuxFailureCount = 0;
        this.activeTracking.set(jobId, state);
      }

      // 출력 해시 계산
      const currentHash = this.calculateHash(output);

      // 이전 해시와 비교 - 변경이 없으면 스킵
      if (state.outputHash && state.outputHash === currentHash) {
        logger.debug(`No output changes detected for job ${jobId}`);
        return;
      }

      // 경과 시간 계산
      const elapsedMs = Date.now() - state.startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const elapsedText = `${minutes}분 ${seconds}초`;

      // 메시지 포맷팅
      const message = formatInProgress(`작업 진행 중... (경과 시간: ${elapsedText})`);
      const formattedOutput = formatCodeBlock(output);

      // Slack 메시지 업데이트
      if (state.messageTs) {
        try {
          await this.slackApp.client.chat.update({
            channel: state.channelId,
            ts: state.messageTs,
            text: `${message}\n\n${formattedOutput}`,
          });

          // Slack API 성공 시 실패 카운터 리셋
          if (state.slackFailureCount && state.slackFailureCount > 0) {
            logger.info(`Slack API recovered for job ${jobId}`);
            state.slackFailureCount = 0;
          }

          logger.info(`Progress updated for job ${jobId} - elapsed: ${elapsedText}`);
        } catch (slackError: unknown) {
          // Slack API 에러 처리
          const failureCount = (state.slackFailureCount || 0) + 1;
          state.slackFailureCount = failureCount;
          this.activeTracking.set(jobId, state);

          logger.error(`Slack API error for job ${jobId} (failure ${failureCount}/${ProgressTracker.MAX_SLACK_FAILURES}):`, slackError);

          // 연속 실패 횟수 초과 시 작업 중단
          if (failureCount >= ProgressTracker.MAX_SLACK_FAILURES) {
            logger.error(`Slack API failed ${failureCount} times for job ${jobId} - stopping tracking`);
            state.status = ProgressStatus.FAILED;
            state.error = 'Slack API 연결 실패 (연속 3회 실패)';
            this.activeTracking.set(jobId, state);

            this.clearPolling(jobId);
            this.clearTimeoutTimer(jobId);
          }

          return;
        }
      }

      // 상태 업데이트
      state.outputHash = currentHash;
      state.lastUpdate = Date.now();
      state.elapsedTime = elapsedMs;
      this.activeTracking.set(jobId, state);
    } catch (error) {
      logger.error(`Unexpected error updating progress for job ${jobId}:`, error);
    }
  }

  /**
   * 출력 캡처
   * Capture tmux output
   *
   * @param sessionName - tmux 세션 이름
   * @returns Promise<string> - 캡처된 출력 (실패 시 빈 문자열)
   * @description tmux pane에서 최근 50라인을 캡처하여 반환
   */
  private async captureOutput(sessionName: string): Promise<string> {
    const logger = getLogger();

    try {
      // tmux pane에서 최근 50라인 캡처
      const captureResult = await capturePane(
        sessionName,
        -ProgressTracker.DEFAULT_OUTPUT_LINES
      );

      if (!captureResult.success) {
        logger.warn(`Failed to capture output from session ${sessionName}: ${captureResult.error}`);
        return '';
      }

      // 캡처된 출력 처리
      const processedOutput = processCaptureResult(
        captureResult.output || '',
        0,
        ProgressTracker.DEFAULT_OUTPUT_LINES
      );

      return processedOutput.fullOutput;
    } catch (error) {
      logger.error(`Error capturing output from session ${sessionName}:`, error);
      return '';
    }
  }

  /**
   * 출력 해시 계산
   * Calculate hash of output for change detection
   * @param content 해시를 계산할 내용
   * @returns SHA-256 해시 문자열
   */
  private calculateHash(content: string): string {
    if (!content) {
      return '';
    }

    try {
      // SHA-256 해시 계산
      const hash = createHash('sha256');
      hash.update(content);
      return hash.digest('hex');
    } catch (error) {
      getLogger().error('Error calculating hash:', error);
      return '';
    }
  }

  /**
   * 폴링 시작
   * Start polling for output changes
   *
   * @param jobId - 작업 고유 식별자
   * @param _channelConfig - 채널 설정 (사용되지 않음, 호환성 유지용)
   * @returns void
   * @description 5초 간격으로 진행 상황을 업데이트하는 폴링 시작
   */
  private startPolling(jobId: string, _channelConfig: ChannelConfig): void {
    const logger = getLogger();
    logger.info(`Starting polling for job ${jobId} (interval: ${ProgressTracker.POLLING_INTERVAL}ms)`);

    // 5초마다 진행 상황 업데이트
    const intervalId = setInterval(async () => {
      const state = this.activeTracking.get(jobId);

      // 추적이 중단되었거나 완료된 경우 폴링 중지
      if (!state || state.status !== ProgressStatus.IN_PROGRESS) {
        logger.info(`Stopping polling for job ${jobId} - tracking ended`);
        this.clearPolling(jobId);
        return;
      }

      try {
        await this.updateProgress(jobId);
      } catch (error) {
        logger.error(`Error during polling for job ${jobId}:`, error);
      }
    }, ProgressTracker.POLLING_INTERVAL);

    // 인터벌 저장 (나중에 정리용)
    this.pollingIntervals.set(jobId, intervalId);
  }

  /**
   * 폴링 중단
   * Stop polling for a job
   *
   * @param jobId - 작업 고유 식별자
   * @returns void
   * @description 진행 상황 폴링을 중단하고 타이머 정리
   */
  private clearPolling(jobId: string): void {
    const intervalId = this.pollingIntervals.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(jobId);
      getLogger().info(`Polling cleared for job ${jobId}`);
    }
  }

  /**
   * 타임아웃 타이머 설정
   * Set timeout timer for job
   *
   * @param jobId - 작업 고유 식별자
   * @returns void
   * @description 1시간 후 자동으로 작업을 중단하는 타임아웃 타이머 설정
   */
  private setTimeoutTimer(jobId: string): void {
    const logger = getLogger();
    logger.info(`Setting timeout timer for job ${jobId} (timeout: ${ProgressTracker.MAX_TIMEOUT}ms)`);

    // 1시간 후 자동 중단
    const timeoutId = setTimeout(async () => {
      const state = this.activeTracking.get(jobId);

      if (!state) {
        return;
      }

      logger.warn(`Job ${jobId} timed out after ${ProgressTracker.MAX_TIMEOUT}ms`);

      // 상태 업데이트
      state.status = ProgressStatus.FAILED;
      state.error = '작업 시간이 초과되었습니다 (최대 1시간)';
      this.activeTracking.set(jobId, state);

      // 타임아웃 메시지 전송
      try {
        const timeoutMessage = formatError('⏰ 작업 시간이 초과되었습니다 (최대 1시간)');

        if (state.messageTs) {
          await this.slackApp.client.chat.update({
            channel: state.channelId,
            ts: state.messageTs,
            text: timeoutMessage,
          });
        }
      } catch (error) {
        logger.error(`Failed to send timeout message for job ${jobId}:`, error);
      }

      // 폴링 중단
      this.clearPolling(jobId);

      // 타이머 정리
      this.timeoutTimers.delete(jobId);
    }, ProgressTracker.MAX_TIMEOUT);

    // 타이머 저장
    this.timeoutTimers.set(jobId, timeoutId);
  }

  /**
   * 타임아웃 타이머 해제
   * Clear timeout timer for a job
   *
   * @param jobId - 작업 고유 식별자
   * @returns void
   * @description 작업 완료 시 타임아웃 타이머를 해제하고 정리
   */
  private clearTimeoutTimer(jobId: string): void {
    const timeoutId = this.timeoutTimers.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutTimers.delete(jobId);
      getLogger().info(`Timeout timer cleared for job ${jobId}`);
    }
  }

  /**
   * 상태별 메시지 생성
   * Generate status message based on progress state
   *
   * @param state - 진행 상황 상태
   * @returns string - 상태에 맞는 포맷된 메시지
   * @description 작업 상태(진행 중, 완료, 실패, 대기)에 따라 적절한 메시지 생성
   */
  private getStatusMessage(state: ProgressState): string {
    const elapsedMs = state.elapsedTime || (Date.now() - state.startTime);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const elapsedText = `${minutes}분 ${seconds}초`;

    switch (state.status) {
      case ProgressStatus.IN_PROGRESS:
        return formatInProgress(`작업 진행 중... (경과 시간: ${elapsedText})`);

      case ProgressStatus.COMPLETED:
        return formatSuccess(`작업 완료 (총 소요 시간: ${elapsedText})`);

      case ProgressStatus.FAILED:
        const errorMsg = state.error || '알 수 없는 오류';
        return formatError(`작업 실패: ${errorMsg}`);

      case ProgressStatus.WAITING:
        return formatWaiting(`사용자 입력 대기 중...`);

      default:
        return formatInProgress('작업 진행 중...');
    }
  }
}
