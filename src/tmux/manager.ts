/**
 * tmux Manager 클래스
 * tmux session manager
 */

import { TmuxSession, TmuxCommandResult, CaptureResult } from '../types';
import { getLogger } from '../utils/logger';
import * as executor from './executor';
import * as parser from './parser';

/**
 * tmux Manager 클래스
 * Manages tmux sessions for Claude Code integration
 */
export class TmuxManager {
  /**
   * 세션이 존재하는지 확인
   * Check if session exists
   */
  public async sessionExists(sessionName: string): Promise<boolean> {
    const logger = getLogger();
    logger.debug(`Checking if tmux session exists: ${sessionName}`);

    return executor.sessionExists(sessionName);
  }

  /**
   * 세션 생성
   * Create new tmux session
   *
   * @param sessionName - Session name
   * @param projectPath - Project path (working directory)
   * @returns TmuxCommandResult
   */
  public async createSession(
    sessionName: string,
    projectPath: string
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();

    // 이미 존재하는지 확인
    const exists = await this.sessionExists(sessionName);
    if (exists) {
      logger.info(`tmux session already exists: ${sessionName}`);
      return {
        success: true,
        output: `Session ${sessionName} already exists`,
      };
    }

    logger.info(`Creating tmux session: ${sessionName} at ${projectPath}`);

    return executor.createSession(sessionName, projectPath);
  }

  /**
   * 세션 종료
   * Kill tmux session
   *
   * @param sessionName - Session name
   * @returns TmuxCommandResult
   */
  public async killSession(sessionName: string): Promise<TmuxCommandResult> {
    const logger = getLogger();

    // 존재 여부 확인
    const exists = await this.sessionExists(sessionName);
    if (!exists) {
      logger.warn(`tmux session does not exist: ${sessionName}`);
      return {
        success: false,
        output: '',
        error: `Session ${sessionName} does not exist`,
      };
    }

    logger.info(`Killing tmux session: ${sessionName}`);

    return executor.killSession(sessionName);
  }

  /**
   * 세션 생성 또는 가져오기
   * Create session if it doesn't exist, or return existing session
   *
   * @param sessionName - Session name
   * @param projectPath - Project path
   * @returns TmuxCommandResult
   */
  public async ensureSession(
    sessionName: string,
    projectPath: string
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();

    const exists = await this.sessionExists(sessionName);

    if (exists) {
      logger.debug(`tmux session already exists: ${sessionName}`);
      return {
        success: true,
        output: `Session ${sessionName} already exists`,
      };
    }

    logger.info(`Creating new tmux session: ${sessionName}`);
    return this.createSession(sessionName, projectPath);
  }

  /**
   * 모든 세션 목록 가져오기
   * Get list of all tmux sessions
   */
  public async listSessions(): Promise<string[]> {
    return executor.listSessions();
  }

  /**
   * 세션 정보 가져오기
   * Get session information
   *
   * @param sessionName - Session name
   * @param projectPath - Project path (for TmuxSession object)
   * @returns TmuxSession or null if session doesn't exist
   */
  public async getSessionInfo(
    sessionName: string,
    projectPath: string
  ): Promise<TmuxSession | null> {
    const info = await executor.getSessionInfo(sessionName);

    if (!info) {
      return null;
    }

    return {
      name: info.name,
      projectPath,
      isActive: info.attached,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * 키 입력 전송
   * Send keys to tmux session
   *
   * @param sessionName - Session name
   * @param keys - Keys to send
   * @param literal - If true, send keys literally
   * @returns TmuxCommandResult
   */
  public async sendKeys(
    sessionName: string,
    keys: string,
    literal: boolean = true
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.debug(`Sending keys to tmux session ${sessionName}: ${keys.slice(0, 50)}...`);

    return executor.sendKeys(sessionName, keys, literal);
  }

  /**
   * Enter 키 전송
   * Send Enter key to tmux session
   */
  public async sendEnter(sessionName: string): Promise<TmuxCommandResult> {
    return executor.sendEnter(sessionName);
  }

  /**
   * 출력 캡처
   * Capture pane output
   *
   * @param sessionName - Session name
   * @param startLine - Start line (negative for last N lines)
   * @param endLine - End line (optional)
   * @returns TmuxCommandResult with captured output
   */
  public async capturePane(
    sessionName: string,
    startLine?: number,
    endLine?: number
  ): Promise<TmuxCommandResult> {
    return executor.capturePane(sessionName, startLine, endLine);
  }

  /**
   * 히스토리 지우기
   * Clear scrollback history
   */
  public async clearHistory(sessionName: string): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.debug(`Clearing history for tmux session: ${sessionName}`);

    return executor.clearHistory(sessionName);
  }

  /**
   * 세션 재시작
   * Restart tmux session
   *
   * @param sessionName - Session name
   * @param projectPath - Project path
   * @returns TmuxCommandResult
   */
  public async restartSession(
    sessionName: string,
    projectPath: string
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.info(`Restarting tmux session: ${sessionName}`);

    // 기존 세션 종료
    await this.killSession(sessionName);

    // 잠시 대기 (세션이 완전히 종료될 때까지)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 새 세션 생성
    return this.createSession(sessionName, projectPath);
  }

  /**
   * Claude Code 시작
   * Start Claude Code with "claude --continue" command
   *
   * @param sessionName - Session name
   * @param projectPath - Project path
   * @returns TmuxCommandResult
   */
  public async startClaudeCode(
    sessionName: string,
    projectPath: string
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.info(`Starting Claude Code in tmux session: ${sessionName}`);

    // 1. 세션이 존재하는지 확인하고 없으면 생성
    const ensureResult = await this.ensureSession(sessionName, projectPath);
    if (!ensureResult.success) {
      return ensureResult;
    }

    // 2. 히스토리 지우기 (깨끗한 상태로 시작)
    await this.clearHistory(sessionName);

    // 3. 먼저 "claude --continue" 시도
    logger.info('Trying "claude --continue"...');
    await this.sendKeys(sessionName, 'claude --continue', true);
    await this.sendEnter(sessionName);

    // 4. 2초 대기 후 결과 확인
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const continueResult = await this.capturePane(sessionName, -20);
    // "No conversation found to continue" 메시지가 없으면 성공
    const continueSuccess = continueResult.success &&
      continueResult.output &&
      !continueResult.output.includes('No conversation found to continue');

    if (!continueSuccess) {
      // 5. --continue 실패 시 일반 "claude" 명령 실행
      logger.info('"claude --continue" failed, trying "claude"...');
      await this.clearHistory(sessionName);
      await this.sendKeys(sessionName, 'claude', true);
      await this.sendEnter(sessionName);

      // 6. Claude Code 초기화 대기 (7초)
      await new Promise((resolve) => setTimeout(resolve, 7000));

      // 7. 결과 확인
      const claudeResult = await this.capturePane(sessionName, -20);
      const claudeSuccess = claudeResult.success &&
        claudeResult.output &&
        (claudeResult.output.includes('Claude Code') || claudeResult.output.includes('claude.com'));

      if (!claudeSuccess) {
        logger.error('Failed to start Claude Code with both "claude --continue" and "claude"');
        return {
          success: false,
          output: '',
          error: 'Failed to start Claude Code. Please check if Claude Code CLI is installed and accessible.',
        };
      }

      logger.info('Claude Code started with "claude" command');
    } else {
      logger.info('Claude Code started with "claude --continue"');
    }

    return {
      success: true,
      output: 'Claude Code started successfully',
    };
  }

  /**
   * 프롬프트 전송
   * Send prompt to Claude Code
   *
   * @param sessionName - Session name
   * @param prompt - Prompt text to send
   * @returns TmuxCommandResult
   */
  public async sendPrompt(
    sessionName: string,
    prompt: string
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.info(`Sending prompt to Claude Code in session ${sessionName}`);
    logger.info(`Prompt length: ${prompt.length} characters`);
    logger.debug(`Prompt (first 200 chars): ${prompt.slice(0, 200)}${prompt.length > 200 ? '...' : ''}`);

    // 1. 프롬프트 전송 (리터럴 모드)
    const sendResult = await this.sendKeys(sessionName, prompt, true);
    if (!sendResult.success) {
      return sendResult;
    }

    // 2. Enter 키 전송
    const enterResult = await this.sendEnter(sessionName);
    if (!enterResult.success) {
      return enterResult;
    }

    // 3. 잠시 대기 (프롬프트가 처리될 시간)
    await new Promise((resolve) => setTimeout(resolve, 500));

    logger.info('Prompt sent successfully');

    return {
      success: true,
      output: 'Prompt sent successfully',
    };
  }

  /**
   * 출력 캡처 및 파싱
   * Capture and parse output
   *
   * @param sessionName - Session name
   * @param firstLines - Number of first lines to include in summary
   * @param lastLines - Number of last lines to include in summary
   * @returns CaptureResult with full output and summary
   */
  public async captureAndParseOutput(
    sessionName: string,
    firstLines: number = 100,
    lastLines: number = 50
  ): Promise<CaptureResult | null> {
    const logger = getLogger();

    // 출력 캡처
    const captureResult = await this.capturePane(sessionName);

    if (!captureResult.success || !captureResult.output) {
      logger.error('Failed to capture output');
      return null;
    }

    // 출력 파싱 및 처리
    return parser.processCaptureResult(
      captureResult.output,
      firstLines,
      lastLines
    );
  }

  /**
   * 출력 폴링 및 완료 감지
   * Poll output until it's stable (no changes)
   *
   * @param sessionName - Session name
   * @param pollInterval - Polling interval in milliseconds (default: 5000ms = 5s)
   * @param maxPolls - Maximum number of polls (default: 120 = 10 minutes at 5s interval)
   * @param onProgress - Optional callback for progress updates
   * @returns CaptureResult when output is stable, or null on timeout
   */
  public async pollUntilStable(
    sessionName: string,
    pollInterval: number = 5000,
    maxPolls: number = 120,
    onProgress?: (currentOutput: string, pollCount: number) => void
  ): Promise<CaptureResult | null> {
    const logger = getLogger();
    logger.info(`Starting output polling for session ${sessionName}`);

    let previousOutput = '';
    let stableCount = 0;
    const requiredStablePolls = 2; // 2번 연속 안정적이어야 완료로 간주

    for (let i = 0; i < maxPolls; i++) {
      // 출력 캡처
      const result = await this.captureAndParseOutput(sessionName);

      if (!result) {
        logger.error('Failed to capture output during polling');
        return null;
      }

      // 진행 상황 콜백 호출
      if (onProgress) {
        onProgress(result.fullOutput, i + 1);
      }

      // 출력 안정성 확인
      if (parser.isOutputStable(previousOutput, result.fullOutput)) {
        stableCount++;
        logger.debug(`Output stable (${stableCount}/${requiredStablePolls})`);

        if (stableCount >= requiredStablePolls) {
          logger.info(`Output is stable after ${i + 1} polls`);
          return result;
        }
      } else {
        stableCount = 0;
        logger.debug(`Output changed, resetting stable count`);
      }

      previousOutput = result.fullOutput;

      // 다음 폴링까지 대기
      if (i < maxPolls - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    logger.warn(`Polling timeout after ${maxPolls} polls`);
    return null;
  }

  /**
   * 대화형 응답 감지
   * Detect if Claude Code is waiting for interactive response
   *
   * @param sessionName - Session name
   * @returns true if interactive prompt detected
   */
  public async detectInteractivePrompt(
    sessionName: string
  ): Promise<boolean> {
    const result = await this.captureAndParseOutput(sessionName);

    if (!result) {
      return false;
    }

    return parser.detectInteractivePrompt(result.fullOutput);
  }

  /**
   * 대화형 응답 전송 (y/n)
   * Send interactive response (y/n)
   *
   * @param sessionName - Session name
   * @param response - Response ('y' or 'n')
   * @returns TmuxCommandResult
   */
  public async sendInteractiveResponse(
    sessionName: string,
    response: 'y' | 'n'
  ): Promise<TmuxCommandResult> {
    const logger = getLogger();
    logger.info(`Sending interactive response: ${response}`);

    return this.sendKeys(sessionName, response, true).then((result) => {
      if (result.success) {
        return this.sendEnter(sessionName);
      }
      return result;
    });
  }
}
