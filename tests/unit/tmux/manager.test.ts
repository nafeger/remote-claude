/**
 * TmuxManager.startClaudeCode() 메서드 단위 테스트
 * Claude Code 시작 검증 로직 테스트
 */

import { TmuxManager } from '../../../src/tmux/manager';
import * as executor from '../../../src/tmux/executor';

// executor 모듈 모킹
jest.mock('../../../src/tmux/executor');

describe('TmuxManager.startClaudeCode()', () => {
  let tmuxManager: TmuxManager;
  const sessionName = 'test-session';
  const projectPath = '/tmp/test-project';

  beforeEach(() => {
    tmuxManager = new TmuxManager();
    jest.clearAllMocks();

    // 기본 mock 설정
    (executor.sessionExists as jest.Mock).mockResolvedValue(true);
    (executor.sendKeys as jest.Mock).mockResolvedValue({ success: true, output: '' });
    (executor.sendEnter as jest.Mock).mockResolvedValue({ success: true, output: '' });
    (executor.clearHistory as jest.Mock).mockResolvedValue({ success: true, output: '' });
  });

  describe('TC1: "claude --continue" 성공 시나리오', () => {
    it('기존 세션이 있을 때 정상 동작해야 함', async () => {
      // Mock: "claude --continue" 성공
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: true,
        output: 'Claude Code is running\nWhat would you like me to help you with?',
      });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 검증
      expect(result.success).toBe(true);
      expect(result.output).toBe('Claude Code started successfully');

      // "claude --continue" 명령 전송 확인
      expect(executor.sendKeys).toHaveBeenCalledWith(sessionName, 'claude --continue', true);
      expect(executor.sendEnter).toHaveBeenCalledTimes(1);

      // "claude" 명령은 실행되지 않아야 함
      expect(executor.sendKeys).not.toHaveBeenCalledWith(sessionName, 'claude', true);
    });

    it('이미 실행 중인 Claude Code를 인식해야 함', async () => {
      // Mock: 기존 Claude Code 출력
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: true,
        output: '어떤 작업을 도와드릴까요?\n예시:\n- 코드 분석 또는 개선',
      });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 검증
      expect(result.success).toBe(true);

      // "claude" 명령 실행하지 않음
      expect(executor.sendKeys).not.toHaveBeenCalledWith(sessionName, 'claude', true);
    });
  });

  describe('TC2: "No conversation found" 감지 및 폴백', () => {
    it('세션이 없을 때 자동으로 "claude" 명령으로 폴백해야 함', async () => {
      // Mock: 첫 번째 캡처 - "claude --continue" 실패
      (executor.capturePane as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          output: 'No conversation found to continue',
        })
        // Mock: 두 번째 캡처 - "claude" 성공
        .mockResolvedValueOnce({
          success: true,
          output: 'Welcome to Claude Code\nclaudev1.anthropic.com',
        });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 검증
      expect(result.success).toBe(true);
      expect(result.output).toBe('Claude Code started successfully');

      // "claude --continue" 먼저 실행
      expect(executor.sendKeys).toHaveBeenNthCalledWith(1, sessionName, 'claude --continue', true);

      // 실패 후 히스토리 지우기
      expect(executor.clearHistory).toHaveBeenCalledTimes(2);

      // "claude" 명령 실행
      expect(executor.sendKeys).toHaveBeenNthCalledWith(2, sessionName, 'claude', true);

      // Enter 키 2번 전송 (--continue 후 1번, claude 후 1번)
      expect(executor.sendEnter).toHaveBeenCalledTimes(2);
    });

    it('"No conversation found to continue" 메시지 변형도 감지해야 함', async () => {
      // Mock: 메시지 변형
      (executor.capturePane as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          output: 'Error: No conversation found to continue\nPlease start a new conversation',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'Claude Code v1.0.0',
        });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      expect(result.success).toBe(true);
      expect(executor.sendKeys).toHaveBeenCalledWith(sessionName, 'claude', true);
    });
  });

  describe('TC3: 양쪽 모두 실패', () => {
    it('Claude Code CLI가 없을 때 에러를 반환해야 함', async () => {
      // Mock: 양쪽 모두 실패
      (executor.capturePane as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          output: 'No conversation found to continue',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'command not found: claude',
        });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 검증
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start Claude Code');
    });

    it('타임아웃 발생 시 에러를 반환해야 함', async () => {
      // Mock: 양쪽 모두 타임아웃
      (executor.capturePane as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          output: 'No conversation found to continue',
        })
        .mockResolvedValueOnce({
          success: true,
          output: '', // 빈 출력
        });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      expect(result.success).toBe(false);
    });
  });

  describe('TC4: 에지 케이스', () => {
    it('capturePane 실패 시 적절히 처리해야 함', async () => {
      // Mock: capturePane 실패
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Failed to capture pane',
      });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // capturePane 실패는 "No conversation found"가 없으므로 성공으로 처리되지 않음
      // 하지만 output이 없으므로 실패
      expect(result.success).toBe(false);
    });

    it('세션이 없을 때 세션을 먼저 생성해야 함', async () => {
      // Mock: 세션이 없음
      (executor.sessionExists as jest.Mock).mockResolvedValue(false);
      (executor.createSession as jest.Mock).mockResolvedValue({
        success: true,
        output: 'Session created',
      });
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: true,
        output: 'Claude Code running',
      });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 세션 생성 확인
      expect(executor.createSession).toHaveBeenCalledWith(sessionName, projectPath);
      expect(result.success).toBe(true);
    });

    it('빈 출력도 올바르게 처리해야 함', async () => {
      // Mock: 빈 출력
      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: true,
        output: '',
      });

      const result = await tmuxManager.startClaudeCode(sessionName, projectPath);

      // 빈 출력은 실패로 처리
      expect(result.success).toBe(false);
    });
  });

  describe('TC5: 타이밍 검증', () => {
    it('"claude --continue" 후 2초 대기해야 함', async () => {
      const startTime = Date.now();

      (executor.capturePane as jest.Mock).mockResolvedValueOnce({
        success: true,
        output: 'Claude Code running',
      });

      await tmuxManager.startClaudeCode(sessionName, projectPath);

      const elapsed = Date.now() - startTime;

      // 최소 2초 대기 (약간의 여유 고려)
      expect(elapsed).toBeGreaterThanOrEqual(1900);
    });

    it('"claude" 명령 후 7초 대기해야 함', async () => {
      const startTime = Date.now();

      (executor.capturePane as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          output: 'No conversation found to continue',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'Claude Code running',
        });

      await tmuxManager.startClaudeCode(sessionName, projectPath);

      const elapsed = Date.now() - startTime;

      // 2초 + 7초 = 최소 9초 대기
      expect(elapsed).toBeGreaterThanOrEqual(8900);
    });
  });
});
