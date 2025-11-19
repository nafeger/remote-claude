/**
 * Interactive Buttons 유닛 테스트
 * Unit tests for interactive button UI handlers
 */

import {
  createQuickActionButtons,
  handleQuickState,
  handleQuickDownload,
  handleSendEnter,
  handleSendEnterTwice,
  handleSendUp,
} from '../interactive-buttons';
import { initLogger, clearLoggerInstance } from '../../utils/logger';
import { LogLevel, ChannelConfig } from '../../types';
import { App, BlockAction, ButtonAction } from '@slack/bolt';
import { ConfigStore } from '../../config/store';
import { StateManager } from '../../state/manager';
import { JobQueue } from '../../queue/queue';

// tmux executor 모킹
jest.mock('../../tmux/executor');
jest.mock('../../tmux/parser');
jest.mock('../../handlers/file-download');

import * as executor from '../../tmux/executor';
import * as parser from '../../tmux/parser';

beforeAll(() => {
  initLogger(LogLevel.ERROR);
});

afterAll(() => {
  clearLoggerInstance();
});

// Mock Slack App 생성 헬퍼
function createMockSlackApp() {
  return {
    client: {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true }),
      },
      views: {
        open: jest.fn().mockResolvedValue({ ok: true }),
      },
    },
  } as unknown as App;
}

// Mock BlockAction Body 생성 헬퍼
function createMockBlockActionBody(channelId: string, triggerId?: string): BlockAction<ButtonAction> {
  return {
    type: 'block_actions',
    channel: { id: channelId, name: 'test-channel' },
    trigger_id: triggerId || 'test-trigger-id',
    user: { id: 'U123456', name: 'test-user', username: 'test-user' },
    actions: [
      {
        type: 'button',
        action_id: 'test_action',
        block_id: 'test_block',
        text: { type: 'plain_text', text: 'Test' },
        value: 'test_value',
        action_ts: '1234567890.123456',
      },
    ],
    team: { id: 'T123456', domain: 'test-team' },
    api_app_id: 'A123456',
    token: 'test-token',
    container: { type: 'message', message_ts: '1234567890.123456', channel_id: channelId },
    response_url: 'https://hooks.slack.com/actions/test',
  } as BlockAction<ButtonAction>;
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

describe('Interactive Buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuickActionButtons()', () => {
    test('should create 9 buttons in 2 rows', () => {
      const buttons = createQuickActionButtons();

      expect(buttons).toHaveLength(2);
      expect(buttons[0].elements).toHaveLength(3); // 첫 번째 행: 상태, 다운로드, 취소
      expect(buttons[1].elements).toHaveLength(6); // 두 번째 행: 엔터, 엔터*2, 화살표 4개
    });
  });

  describe('정상 경로 (Happy Path)', () => {
    /**
     * Task 6.36: "📊 상태 확인" 버튼 → 상태 정보 표시
     */
    test('should handle quick state button', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      const mockStateManager = {
        getSession: jest.fn().mockReturnValue({
          channelId: 'C1234567890',
          isWaitingForResponse: false,
        }),
      } as unknown as StateManager;

      const mockJobQueue = {
        getQueueSummary: jest.fn().mockReturnValue({
          pending: 0,
          running: 0,
          completed: 5,
          failed: 0,
          cancelled: 0,
        }),
      } as unknown as JobQueue;

      (executor.sessionExists as jest.Mock).mockResolvedValue(true);
      (executor.capturePane as jest.Mock).mockResolvedValue({
        success: true,
        output: 'test output',
      });
      (parser.processCaptureResult as jest.Mock).mockReturnValue({
        summary: 'test summary',
        fullOutput: 'test output',
        totalLines: 10,
        isTruncated: false,
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleQuickState(mockSlackApp, body, mockConfigStore, mockStateManager, mockJobQueue);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C1234567890',
          text: expect.stringContaining('채널 상태'),
        })
      );
    });

    /**
     * Task 6.37: "⏎ 엔터" 버튼 → Enter 키 전송
     */
    test('should send Enter key', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleSendEnter(mockSlackApp, body, mockConfigStore);

      expect(executor.sendEnter).toHaveBeenCalledWith('test-session');
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Enter 키가 전송되었습니다'),
        })
      );
    });

    /**
     * Task 6.38: "⏎⏎ 엔터*2" 버튼 → Enter 2번 전송
     */
    test('should send Enter key twice', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleSendEnterTwice(mockSlackApp, body, mockConfigStore);

      expect(executor.sendEnter).toHaveBeenCalledTimes(2);
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Enter 키가 2번 전송되었습니다'),
        })
      );
    });

    /**
     * Task 6.39: "↑" 버튼 → Up 화살표 키 전송
     */
    test('should send Up arrow key', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendArrowKey as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleSendUp(mockSlackApp, body, mockConfigStore);

      expect(executor.sendArrowKey).toHaveBeenCalledWith('test-session', 'Up');
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('↑ 키가 전송되었습니다'),
        })
      );
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    /**
     * Task 6.40: 채널 미설정 시 설정 안내
     */
    test('should show setup message for unconfigured channel', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(false),
        getChannel: jest.fn().mockReturnValue(null),
      } as unknown as ConfigStore;

      const mockStateManager = {} as StateManager;
      const mockJobQueue = {} as JobQueue;

      const body = createMockBlockActionBody('C1234567890');

      await handleQuickState(mockSlackApp, body, mockConfigStore, mockStateManager, mockJobQueue);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('설정되지 않은 채널'),
        })
      );
    });

    /**
     * Task 6.41: tmux 세션 없을 때 자동 생성 또는 에러 메시지
     */
    test('should handle missing tmux session', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      const mockStateManager = {
        getSession: jest.fn().mockReturnValue({
          channelId: 'C1234567890',
          isWaitingForResponse: false,
        }),
      } as unknown as StateManager;

      const mockJobQueue = {
        getQueueSummary: jest.fn().mockReturnValue({
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        }),
      } as unknown as JobQueue;

      (executor.sessionExists as jest.Mock).mockResolvedValue(false);
      (executor.createSession as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleQuickState(mockSlackApp, body, mockConfigStore, mockStateManager, mockJobQueue);

      expect(executor.sessionExists).toHaveBeenCalled();
      expect(executor.createSession).toHaveBeenCalled();
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('세션이 자동으로 생성되었습니다'),
        })
      );
    });

    /**
     * Task 6.42: "📥 파일 다운로드" 버튼 → 모달 표시
     * Note: handleQuickDownload now searches for files and shows dropdown modal
     */
    test('should open download modal', async () => {
      const mockSlackApp = createMockSlackApp();

      // Mock file system for file search
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      // Create temp directory for mock project
      const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'button-test-'));
      const projectDir = path.join(testDir, 'project');
      fs.mkdirSync(projectDir, { recursive: true });

      // Create some test files
      fs.writeFileSync(path.join(projectDir, 'README.md'), 'test content');
      fs.writeFileSync(path.join(projectDir, 'config.json'), '{}');

      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue({
          channelId: 'C1234567890',
          projectName: 'test-project',
          projectPath: projectDir,
          tmuxSession: 'test-session',
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        }),
      } as unknown as ConfigStore;

      const body = createMockBlockActionBody('C1234567890', 'trigger-123');

      await handleQuickDownload(mockSlackApp, body, mockConfigStore);

      expect(mockSlackApp.client.views.open).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger_id: 'trigger-123',
          view: expect.objectContaining({
            type: 'modal',
            callback_id: 'download_file_modal',
          }),
        })
      );

      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    /**
     * Task 6.43: tmux send-keys 실패 시 알림
     */
    test('should handle tmux send-keys failure', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      const body = createMockBlockActionBody('C1234567890');

      await handleSendEnter(mockSlackApp, body, mockConfigStore);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Enter 키 전송 실패'),
        })
      );
    });

    /**
     * Task 6.44: Slack API 에러 시 처리
     */
    test('should handle Slack API errors', async () => {
      const mockSlackApp = createMockSlackApp();
      (mockSlackApp.client.chat.postMessage as jest.Mock).mockRejectedValue(
        new Error('Slack API error')
      );

      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await expect(handleSendEnter(mockSlackApp, body, mockConfigStore)).resolves.not.toThrow();
    });

    /**
     * Task 6.45: 잘못된 action_id 처리 (channel ID 없음)
     */
    test('should handle missing channel ID', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {} as ConfigStore;

      const bodyWithoutChannel = {
        ...createMockBlockActionBody('C1234567890'),
        channel: undefined,
      } as BlockAction<ButtonAction>;

      await handleSendEnter(mockSlackApp, bodyWithoutChannel, mockConfigStore);

      // 에러 로그만 발생하고 Slack 메시지는 전송되지 않음
      expect(mockSlackApp.client.chat.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('부작용 검증 (Side Effects)', () => {
    /**
     * Task 6.46: 버튼 클릭 후 즉시 ack() 응답 (실제 Bolt 프레임워크 처리)
     * 이 테스트는 핸들러가 에러를 던지지 않고 정상적으로 완료되는지 확인
     */
    test('should complete without errors', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      await expect(handleSendEnter(mockSlackApp, body, mockConfigStore)).resolves.not.toThrow();
    });

    /**
     * Task 6.47: 동일 버튼 여러 번 클릭 독립 처리
     */
    test('should handle multiple button clicks independently', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn().mockReturnValue(createMockChannelConfig()),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body = createMockBlockActionBody('C1234567890');

      // 동일한 버튼 3번 클릭
      await handleSendEnter(mockSlackApp, body, mockConfigStore);
      await handleSendEnter(mockSlackApp, body, mockConfigStore);
      await handleSendEnter(mockSlackApp, body, mockConfigStore);

      expect(executor.sendEnter).toHaveBeenCalledTimes(3);
      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledTimes(3);
    });

    /**
     * Task 6.48: 다른 채널 세션 영향 없음
     */
    test('should handle different channels independently', async () => {
      const mockSlackApp = createMockSlackApp();
      const mockConfigStore = {
        hasChannel: jest.fn().mockReturnValue(true),
        getChannel: jest.fn((channelId: string) => ({
          ...createMockChannelConfig(),
          channelId,
          tmuxSession: `session-${channelId}`,
        })),
      } as unknown as ConfigStore;

      (executor.sendEnter as jest.Mock).mockResolvedValue({
        success: true,
        output: '',
      });

      const body1 = createMockBlockActionBody('C111111');
      const body2 = createMockBlockActionBody('C222222');

      await handleSendEnter(mockSlackApp, body1, mockConfigStore);
      await handleSendEnter(mockSlackApp, body2, mockConfigStore);

      // 각 채널의 세션에 독립적으로 전송
      expect(executor.sendEnter).toHaveBeenCalledWith('session-C111111');
      expect(executor.sendEnter).toHaveBeenCalledWith('session-C222222');
    });
  });
});
