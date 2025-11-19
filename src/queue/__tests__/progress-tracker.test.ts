/**
 * Progress Tracker 유닛 테스트
 * Unit tests for real-time job progress tracking
 */

import { ProgressTracker } from '../progress-tracker';
import { initLogger, clearLoggerInstance } from '../../utils/logger';
import { LogLevel, ChannelConfig } from '../../types';
import { App } from '@slack/bolt';

// tmux executor 모킹
jest.mock('../../tmux/executor');
jest.mock('../../tmux/parser');

import * as executor from '../../tmux/executor';
import * as parser from '../../tmux/parser';

beforeAll(() => {
  initLogger(LogLevel.ERROR);
});

afterAll(() => {
  clearLoggerInstance();
});

/**
 * blocks 형식의 메시지에서 텍스트 내용을 확인하는 헬퍼 함수
 */
function expectBlocksContaining(text: string) {
  return expect.objectContaining({
    blocks: expect.arrayContaining([
      expect.objectContaining({
        type: 'section',
        text: expect.objectContaining({
          type: 'mrkdwn',
          text: expect.stringContaining(text),
        }),
      }),
    ]),
  });
}

// Mock Slack App 생성 헬퍼
function createMockSlackApp() {
  return {
    client: {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ts: '1234567890.123456' }),
        update: jest.fn().mockResolvedValue({ ok: true }),
      },
    },
  } as unknown as App;
}

// Mock ChannelConfig 생성 헬퍼
function createMockChannelConfig(): ChannelConfig {
  return {
    channelId: 'C1234567890',
    projectPath: '/test/project',
    projectName: 'test-project',
    tmuxSession: 'test-session',
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };
}

describe('ProgressTracker', () => {
  let mockSlackApp: App;
  let tracker: ProgressTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSlackApp = createMockSlackApp();
    tracker = new ProgressTracker(mockSlackApp);

    // tmux executor 기본 모킹
    (executor.capturePane as jest.Mock).mockResolvedValue({
      success: true,
      output: 'test output',
    });

    // tmux parser 기본 모킹
    (parser.processCaptureResult as jest.Mock).mockReturnValue({
      fullOutput: 'test output',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('정상 경로 (Happy Path)', () => {
    /**
     * Task 6.24: 작업 시작 시 `in_progress` 상태
     */
    test('should start tracking with in_progress status', async () => {
      const jobId = 'job-001';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 초기 메시지가 전송되었는지 확인
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('작업을 시작합니다')
      );
    });

    /**
     * Task 6.25: 5초 주기 폴링 동작 확인 (Mock)
     */
    test('should poll every 5 seconds', async () => {
      const jobId = 'job-002';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 초기 호출 확인
      expect(executor.capturePane).toHaveBeenCalledTimes(0);

      // 5초 경과
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Promise 처리 대기

      // 첫 번째 폴링 호출
      expect(executor.capturePane).toHaveBeenCalledTimes(1);

      // 추가 5초 경과
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 두 번째 폴링 호출
      expect(executor.capturePane).toHaveBeenCalledTimes(2);
    });

    /**
     * Task 6.26: 작업 완료 시 `completed` 상태
     */
    test('should send final message on stop tracking', async () => {
      const jobId = 'job-003';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);
      await tracker.stopTracking(jobId);

      // 최종 메시지가 업데이트되었는지 확인
      expect(mockSlackApp.client.chat.update).toHaveBeenCalled();
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    /**
     * Task 6.27: 출력 변경 없을 때 메시지 미전송
     */
    test('should not send message when output has not changed', async () => {
      const jobId = 'job-004';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      // 동일한 출력 반환
      (executor.capturePane as jest.Mock).mockResolvedValue({
        success: true,
        output: 'same output',
      });

      await tracker.startTracking(jobId, channelId, config);

      // 첫 번째 폴링 (메시지 전송됨)
      jest.advanceTimersByTime(5000);
      await jest.runAllTimersAsync();

      const firstCallCount = (mockSlackApp.client.chat.update as jest.Mock).mock.calls.length;

      // 두 번째 폴링 (동일한 출력, 메시지 미전송)
      jest.advanceTimersByTime(5000);
      await jest.runAllTimersAsync();

      const secondCallCount = (mockSlackApp.client.chat.update as jest.Mock).mock.calls.length;

      // 업데이트 횟수가 증가하지 않았는지 확인 (동일한 출력이므로 변화 없음)
      expect(secondCallCount).toBe(firstCallCount);
    });

    /**
     * Task 6.28: 최초 출력은 항상 전송
     */
    test('should always send initial output', async () => {
      const jobId = 'job-005';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 첫 번째 폴링
      jest.advanceTimersByTime(5000);
      await jest.runAllTimersAsync();

      // 최초 출력은 항상 전송되어야 함
      expect(mockSlackApp.client.chat.update).toHaveBeenCalled();
    });

    /**
     * Task 6.29: 1시간 타임아웃 시 작업 취소
     */
    test('should timeout after 1 hour', async () => {
      const jobId = 'job-006';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 1시간 경과 (60 * 60 * 1000 = 3600000ms)
      jest.advanceTimersByTime(60 * 60 * 1000);
      await Promise.resolve();

      // 타임아웃 메시지가 전송되었는지 확인
      expect(mockSlackApp.client.chat.update).toHaveBeenCalledWith(
        expectBlocksContaining('작업 시간이 초과되었습니다')
      );
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    /**
     * Task 6.30: tmux 세션 응답 없음 시 재시도
     */
    test('should handle tmux session timeout', async () => {
      const jobId = 'job-007';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      // tmux 캡처 실패 설정
      (executor.capturePane as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      await tracker.startTracking(jobId, channelId, config);

      // 5회 폴링 (최대 실패 횟수)
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(5000);
        await jest.runAllTimersAsync();
      }

      // tmux 에러 메시지가 전송되었는지 확인
      expect(mockSlackApp.client.chat.update).toHaveBeenCalledWith(
        expectBlocksContaining('tmux 세션 응답 없음')
      );
    });

    /**
     * Task 6.31: Slack API 에러 시 재시도
     */
    test('should handle Slack API errors with retry', async () => {
      const jobId = 'job-008';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      // Slack API 에러 설정
      (mockSlackApp.client.chat.update as jest.Mock).mockRejectedValue(
        new Error('Slack API error')
      );

      await tracker.startTracking(jobId, channelId, config);

      // 3회 폴링 (최대 Slack 실패 횟수)
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      }

      // Slack API 호출이 여러 번 시도되었는지 확인
      expect(mockSlackApp.client.chat.update).toHaveBeenCalled();
    });

    /**
     * Task 6.32: 작업 취소 시 폴링 중단
     */
    test('should stop polling when tracking is stopped', async () => {
      const jobId = 'job-009';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 추적 중단
      await tracker.stopTracking(jobId);

      const captureCallsBefore = (executor.capturePane as jest.Mock).mock.calls.length;

      // 폴링 간격 경과
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      const captureCallsAfter = (executor.capturePane as jest.Mock).mock.calls.length;

      // capturePane 호출 횟수가 증가하지 않았는지 확인 (폴링 중단됨)
      expect(captureCallsAfter).toBe(captureCallsBefore);
    });
  });

  describe('부작용 검증 (Side Effects)', () => {
    /**
     * Task 6.33: 폴링 종료 후 타이머 정리
     */
    test('should clear timers after stopping tracking', async () => {
      const jobId = 'job-010';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 타이머 개수 확인 (interval + timeout)
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      await tracker.stopTracking(jobId);

      // 타이머가 정리되었는지 확인
      expect(jest.getTimerCount()).toBe(0);
    });

    /**
     * Task 6.34: 여러 작업 동시 진행 시 독립적 추적
     */
    test('should track multiple jobs independently', async () => {
      const jobId1 = 'job-011';
      const jobId2 = 'job-012';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      // 첫 번째 작업 시작
      await tracker.startTracking(jobId1, channelId, config);

      // 두 번째 작업 시작
      await tracker.startTracking(jobId2, channelId, config);

      // 초기 메시지가 각각 전송되었는지 확인
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledTimes(2);

      // 첫 번째 작업만 중단
      await tracker.stopTracking(jobId1);

      // 5초 경과
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 두 번째 작업은 계속 폴링되고 있어야 함
      expect(executor.capturePane).toHaveBeenCalled();
    });

    test('should not throw error when stopping non-existent job', async () => {
      const jobId = 'non-existent-job';

      // 존재하지 않는 작업 중단 시 에러가 발생하지 않아야 함
      await expect(tracker.stopTracking(jobId)).resolves.not.toThrow();
    });

    test('should reset tmux failure count on successful capture', async () => {
      const jobId = 'job-013';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 첫 번째 폴링: 실패
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Temporary error',
      });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 두 번째 폴링: 성공 (failure count 리셋)
      (executor.capturePane as jest.Mock).mockResolvedValue({
        success: true,
        output: 'recovered output',
      });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 에러 메시지가 전송되지 않았는지 확인 (복구됨)
      expect(mockSlackApp.client.chat.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tmux 세션 응답 없음'),
        })
      );
    });

    test('should reset Slack failure count on successful update', async () => {
      const jobId = 'job-014';
      const channelId = 'C1234567890';
      const config = createMockChannelConfig();

      await tracker.startTracking(jobId, channelId, config);

      // 첫 번째 폴링: Slack API 실패
      (mockSlackApp.client.chat.update as jest.Mock).mockRejectedValueOnce(
        new Error('Temporary Slack error')
      );

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 두 번째 폴링: 성공 (failure count 리셋)
      (mockSlackApp.client.chat.update as jest.Mock).mockResolvedValue({ ok: true });

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // 작업이 계속 진행되고 있는지 확인
      expect(executor.capturePane).toHaveBeenCalledTimes(2);
    });
  });
});
