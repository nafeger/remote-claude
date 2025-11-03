/**
 * State Manager 클래스
 * State manager for session state persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import { State, SessionState } from '../types';
import { getLogger } from '../utils/logger';

/**
 * State Manager 클래스
 * Manages session states and persists to state.json
 */
export class StateManager {
  private stateFilePath: string;
  private state: State;

  /**
   * StateManager 생성자
   * @param configDir - Configuration directory path
   */
  constructor(configDir: string) {
    this.stateFilePath = path.join(configDir, 'state.json');
    this.state = this.loadState();
  }

  /**
   * 상태 파일 로드
   * Load state from file
   */
  private loadState(): State {
    const logger = getLogger();

    if (!fs.existsSync(this.stateFilePath)) {
      logger.warn(`State file not found: ${this.stateFilePath}`);
      return {
        sessions: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      const data = fs.readFileSync(this.stateFilePath, 'utf-8');
      const state = JSON.parse(data) as State;
      logger.debug(`State loaded from ${this.stateFilePath}`);
      return state;
    } catch (error) {
      logger.error(`Failed to load state file: ${error}`);
      return {
        sessions: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * 상태 파일 저장
   * Save state to file
   */
  private saveState(): void {
    const logger = getLogger();

    try {
      this.state.lastUpdated = new Date().toISOString();
      const data = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(this.stateFilePath, data, 'utf-8');
      logger.debug(`State saved to ${this.stateFilePath}`);
    } catch (error) {
      logger.error(`Failed to save state file: ${error}`);
      throw error;
    }
  }

  /**
   * 세션 상태 가져오기
   * Get session state
   */
  public getSession(channelId: string): SessionState | undefined {
    return this.state.sessions[channelId];
  }

  /**
   * 세션 상태 설정
   * Set session state
   */
  public setSession(channelId: string, session: SessionState): void {
    const logger = getLogger();

    this.state.sessions[channelId] = session;
    this.saveState();

    logger.debug(`Session state updated for channel: ${channelId}`);
  }

  /**
   * 세션 상태 삭제
   * Delete session state
   */
  public deleteSession(channelId: string): boolean {
    const logger = getLogger();

    if (!this.state.sessions[channelId]) {
      logger.warn(`Session not found for deletion: ${channelId}`);
      return false;
    }

    delete this.state.sessions[channelId];
    this.saveState();

    logger.info(`Session state deleted for channel: ${channelId}`);
    return true;
  }

  /**
   * 대화형 응답 대기 상태 설정
   * Set waiting for response state
   */
  public setWaitingForResponse(
    channelId: string,
    isWaiting: boolean,
    timeoutMinutes?: number
  ): void {
    const session = this.getSession(channelId) || {
      channelId,
      isWaitingForResponse: false,
    };

    session.isWaitingForResponse = isWaiting;

    if (isWaiting && timeoutMinutes) {
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() + timeoutMinutes);
      session.timeoutAt = timeoutDate.toISOString();
    } else {
      session.timeoutAt = undefined;
    }

    this.setSession(channelId, session);
  }

  /**
   * 대화형 응답 대기 중인지 확인
   * Check if waiting for response
   */
  public isWaitingForResponse(channelId: string): boolean {
    const session = this.getSession(channelId);
    return session?.isWaitingForResponse || false;
  }

  /**
   * 타임아웃 확인
   * Check if session has timed out
   */
  public hasTimedOut(channelId: string): boolean {
    const session = this.getSession(channelId);

    if (!session || !session.timeoutAt) {
      return false;
    }

    const timeoutDate = new Date(session.timeoutAt);
    return Date.now() > timeoutDate.getTime();
  }

  /**
   * 마지막 프롬프트 저장
   * Save last prompt
   */
  public setLastPrompt(channelId: string, prompt: string): void {
    const session = this.getSession(channelId) || {
      channelId,
      isWaitingForResponse: false,
    };

    session.lastPrompt = prompt;
    this.setSession(channelId, session);
  }

  /**
   * 마지막 출력 저장
   * Save last output
   */
  public setLastOutput(channelId: string, output: string): void {
    const session = this.getSession(channelId) || {
      channelId,
      isWaitingForResponse: false,
    };

    session.lastOutput = output;
    this.setSession(channelId, session);
  }

  /**
   * 모든 세션 가져오기
   * Get all sessions
   */
  public getAllSessions(): SessionState[] {
    return Object.values(this.state.sessions);
  }

  /**
   * 타임아웃된 세션 찾기
   * Find timed out sessions
   */
  public findTimedOutSessions(): SessionState[] {
    const now = Date.now();

    return this.getAllSessions().filter((session) => {
      if (!session.timeoutAt) {
        return false;
      }

      const timeoutDate = new Date(session.timeoutAt);
      return now > timeoutDate.getTime();
    });
  }

  /**
   * 세션 정리
   * Clear session state
   */
  public clearSession(channelId: string): void {
    const logger = getLogger();

    const session: SessionState = {
      channelId,
      isWaitingForResponse: false,
      lastPrompt: undefined,
      lastOutput: undefined,
      timeoutAt: undefined,
    };

    this.setSession(channelId, session);
    logger.info(`Session cleared for channel: ${channelId}`);
  }

  /**
   * 모든 세션 초기화
   * Clear all sessions (for testing)
   */
  public clearAll(): void {
    const logger = getLogger();

    this.state.sessions = {};
    this.saveState();

    logger.warn('All sessions cleared');
  }

  /**
   * 상태 새로고침
   * Refresh state from file
   */
  public refresh(): void {
    this.state = this.loadState();
  }

  /**
   * 상태 요약
   * Get state summary
   */
  public getSummary(): {
    totalSessions: number;
    waitingForResponse: number;
    timedOut: number;
  } {
    const sessions = this.getAllSessions();

    return {
      totalSessions: sessions.length,
      waitingForResponse: sessions.filter((s) => s.isWaitingForResponse)
        .length,
      timedOut: this.findTimedOutSessions().length,
    };
  }
}
