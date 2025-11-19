/**
 * executor.ts 유닛 테스트
 * Unit tests for executor.ts
 *
 * 테스트 대상 (Test targets):
 * - sendArrowKey() - 방향키 전송 함수
 * - executeCommandSequence() - 명령 시퀀스 실행
 * - sendKeys() - 키 입력 전송 함수
 */

import { sendArrowKey, executeCommandSequence, sendEnter, sendEnterMultiple, sendKeys } from '../executor';
import { initLogger, clearLoggerInstance } from '../../utils/logger';
import { LogLevel } from '../../types';
import { ParsedSegment } from '../../dsl/parser';
import { exec } from 'child_process';

// child_process.exec 모킹
// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const mockedExec = exec as jest.MockedFunction<typeof exec>;

// Logger 초기화
// Initialize logger before all tests
beforeAll(() => {
  initLogger(LogLevel.ERROR); // Use ERROR level to suppress logs during tests
});

// Logger 정리
// Clean up logger after all tests
afterAll(() => {
  clearLoggerInstance();
});

// 각 테스트 전에 모든 모킹 초기화
// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendArrowKey()', () => {
  /**
   * Task 6.3.1: 정상 경로 - Down 키 성공적으로 전송
   * Happy Path - Successfully send Down key
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should successfully send Down key', async () => {
      // Arrange
      const sessionName = 'test-session';
      const direction = 'Down';

      // exec 모킹 - 성공 시나리오
      // Mock exec for success scenario
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // Act
      const result = await sendArrowKey(sessionName, direction);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      // 올바른 tmux 명령이 호출되었는지 확인
      // Verify correct tmux command was called
      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('tmux send-keys');
      expect(callArgs).toContain('-t test-session');
      expect(callArgs).toContain('Down');
    });

    it('should successfully send Up key', async () => {
      const sessionName = 'test-session';
      const direction = 'Up';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendArrowKey(sessionName, direction);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('Up');
    });
  });

  /**
   * Task 6.3.2: 경계 조건 - 4가지 방향 모두 테스트
   * Boundary Conditions - Test all 4 directions
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it.each([
      ['Right', 'Right'],
      ['Left', 'Left'],
      ['Up', 'Up'],
      ['Down', 'Down'],
    ] as const)('should send %s key correctly', async (direction, expectedKey) => {
      // Arrange
      const sessionName = 'test-session';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // Act
      const result = await sendArrowKey(sessionName, direction);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain(`tmux send-keys -t ${sessionName} ${expectedKey}`);
    });

    it('should handle different session names', async () => {
      const sessionNames = ['my-session', 'test-123', 'session_name'];

      for (const sessionName of sessionNames) {
        jest.clearAllMocks();

        mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
          return {} as any;
        });

        const result = await sendArrowKey(sessionName, 'Down');

        expect(result.success).toBe(true);
        const callArgs = mockedExec.mock.calls[0][0];
        expect(callArgs).toContain(`-t ${sessionName}`);
      }
    });
  });

  /**
   * Task 6.3.3: 예외 케이스 - 잘못된 세션 이름 오류 처리
   * Exception Cases - Handle invalid session name errors
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should handle tmux command failure with invalid session', async () => {
      // Arrange
      const sessionName = 'non-existent-session';
      const direction = 'Down';

      // exec 모킹 - 실패 시나리오
      // Mock exec for failure scenario
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        const error = new Error("can't find session: non-existent-session");
        callback(error, { stdout: '', stderr: "can't find session" });
        return {} as any;
      });

      // Act
      const result = await sendArrowKey(sessionName, direction);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("can't find session");
    });

    it('should handle exec timeout error', async () => {
      const sessionName = 'test-session';
      const direction = 'Down';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        const error = new Error('Command timed out');
        (error as any).killed = true;
        callback(error, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendArrowKey(sessionName, direction);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timed out');
    });

    it('should handle unknown errors gracefully', async () => {
      const sessionName = 'test-session';
      const direction = 'Down';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(new Error('Unknown error'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendArrowKey(sessionName, direction);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * 추가 테스트 - 로깅 및 부작용 검증
   * Additional tests - Logging and side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameters', async () => {
      const sessionName = 'test-session';
      const direction = 'Down';
      const originalSessionName = sessionName;
      const originalDirection = direction;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await sendArrowKey(sessionName, direction);

      expect(sessionName).toBe(originalSessionName);
      expect(direction).toBe(originalDirection);
    });

    it('should call exec exactly once per invocation', async () => {
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await sendArrowKey('test-session', 'Down');

      expect(mockedExec).toHaveBeenCalledTimes(1);
    });
  });
});

describe('executeCommandSequence()', () => {
  /**
   * Task 6.4.1: 정상 경로 - [Down, Enter] 성공적으로 실행
   * Happy Path - Successfully execute [Down, Enter] sequence
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should execute [Down, Enter] sequence successfully', async () => {
      // Arrange
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [
        { type: 'key', key: 'Down' },
        { type: 'key', key: 'Enter' },
      ];

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // Act
      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(2); // Down + Enter

      // 첫 번째 호출: Down
      // First call: Down
      const firstCall = mockedExec.mock.calls[0][0];
      expect(firstCall).toContain('Down');

      // 두 번째 호출: Enter
      // Second call: Enter
      const secondCall = mockedExec.mock.calls[1][0];
      expect(secondCall).toContain('Enter');
    });

    it('should execute text and key commands in sequence', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [
        { type: 'text', content: 'hello' },
        { type: 'key', key: 'Enter' },
      ];

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(2);

      const firstCall = mockedExec.mock.calls[0][0];
      expect(firstCall).toContain('-l'); // literal flag for text
      expect(firstCall).toContain('hello');
    });
  });

  /**
   * Task 6.4.2: 경계 조건 - 단일 키 명령
   * Boundary Conditions - Single key command
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should handle single key command', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [{ type: 'key', key: 'Enter' }];

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);
    });

    it('should handle empty command sequence', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [];

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(0);
    });

    it('should handle long command sequence', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = Array(10).fill({ type: 'key', key: 'Down' });

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(10);
    });
  });

  /**
   * Task 6.4.3: 예외 케이스 - 시퀀스 중간에 tmux 실패
   * Exception Cases - tmux failure in middle of sequence
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should stop execution when command fails in middle of sequence', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [
        { type: 'key', key: 'Down' },
        { type: 'key', key: 'Down' },
        { type: 'key', key: 'Enter' },
      ];

      let callCount = 0;
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callCount++;
        if (callCount === 2) {
          // 두 번째 명령에서 실패
          // Fail on second command
          callback(new Error('Session error'), { stdout: '', stderr: 'error' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(false);
      expect(mockedExec).toHaveBeenCalledTimes(2); // Should stop after failure
      expect(result.error).toBeDefined();
    });

    it('should handle failure on first command', async () => {
      const sessionName = 'test-session';
      const commands: ParsedSegment[] = [
        { type: 'key', key: 'Down' },
        { type: 'key', key: 'Enter' },
      ];

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(new Error('Session not found'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await executeCommandSequence(sessionName, commands, 10, 10);

      expect(result.success).toBe(false);
      expect(mockedExec).toHaveBeenCalledTimes(1); // Should stop immediately
    });
  });
});

/**
 * Task 6.50-6.59: 특수 키 전송 메서드 테스트
 * Special key sending methods tests
 */
describe('sendEnter()', () => {
  /**
   * Task 6.50: sendEnter() 정상 전송 테스트
   * Happy Path - Successfully send Enter key
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should successfully send Enter key', async () => {
      // Arrange
      const sessionName = 'test-session';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // Act
      const result = await sendEnter(sessionName);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('tmux send-keys');
      expect(callArgs).toContain('-t test-session');
      expect(callArgs).toContain('Enter');
    });
  });

  /**
   * Task 6.53: 존재하지 않는 세션 에러
   * Exception Cases - Non-existent session error
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should handle non-existent session error', async () => {
      const sessionName = 'non-existent-session';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        const error = new Error("can't find session: non-existent-session");
        callback(error, { stdout: '', stderr: "can't find session" });
        return {} as any;
      });

      const result = await sendEnter(sessionName);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("can't find session");
    });

    it('should handle tmux command timeout', async () => {
      const sessionName = 'test-session';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        const error = new Error('Command timed out');
        (error as any).killed = true;
        callback(error, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendEnter(sessionName);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timed out');
    });
  });
});

describe('sendEnterMultiple()', () => {
  /**
   * Task 6.51: sendEnterMultiple() Enter 2번 전송 테스트
   * Happy Path - Send Enter key twice
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should send Enter key twice successfully', async () => {
      const sessionName = 'test-session';
      const count = 2;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(2);

      // 모든 호출이 Enter 키를 전송했는지 확인
      mockedExec.mock.calls.forEach((call) => {
        expect(call[0]).toContain('tmux send-keys');
        expect(call[0]).toContain('Enter');
      });
    });

    it('should send Enter key multiple times (5)', async () => {
      const sessionName = 'test-session';
      const count = 5;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(5);
    });
  });

  /**
   * Task 6.54: count=0일 때 sendEnterMultiple 처리
   * Boundary Conditions - Handle count=0
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should handle count=0 without sending any keys', async () => {
      const sessionName = 'test-session';
      const count = 0;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(0);
    });

    it('should handle count=1 (single Enter)', async () => {
      const sessionName = 'test-session';
      const count = 1;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);
    });

    it('should reject negative count', async () => {
      const sessionName = 'test-session';
      const count = -1;

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative');
      expect(mockedExec).toHaveBeenCalledTimes(0);
    });
  });

  /**
   * Task 6.56: tmux 명령어 실행 실패 시 에러
   * Exception Cases - Handle tmux command failure
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should stop on first failure when sending multiple Enter keys', async () => {
      const sessionName = 'test-session';
      const count = 3;

      let callCount = 0;
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callCount++;
        if (callCount === 2) {
          // 두 번째 호출에서 실패
          callback(new Error('Session error'), { stdout: '', stderr: 'error' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(false);
      expect(mockedExec).toHaveBeenCalledTimes(2); // Should stop after failure
      expect(result.error).toBeDefined();
    });

    it('should handle session not found error', async () => {
      const sessionName = 'non-existent-session';
      const count = 2;

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        const error = new Error("can't find session");
        callback(error, { stdout: '', stderr: "can't find session" });
        return {} as any;
      });

      const result = await sendEnterMultiple(sessionName, count);

      expect(result.success).toBe(false);
      expect(mockedExec).toHaveBeenCalledTimes(1); // Should fail on first attempt
    });
  });

  /**
   * Task 6.59: 여러 세션 독립성 테스트
   * Side Effects - Multiple sessions independence
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should handle different sessions independently', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // 첫 번째 세션에 2번 전송
      await sendEnterMultiple(session1, 2);
      const firstSessionCalls = mockedExec.mock.calls.length;
      expect(firstSessionCalls).toBe(2);

      jest.clearAllMocks();

      // 두 번째 세션에 3번 전송
      await sendEnterMultiple(session2, 3);
      const secondSessionCalls = mockedExec.mock.calls.length;
      expect(secondSessionCalls).toBe(3);

      // 두 번째 세션 호출이 올바른 세션 이름 사용했는지 확인
      mockedExec.mock.calls.forEach((call) => {
        expect(call[0]).toContain('session-2');
      });
    });

    it('should not affect other sessions on failure', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // session-1에서 실패
      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        if (_cmd.includes('session-1')) {
          callback(new Error('Session error'), { stdout: '', stderr: 'error' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result1 = await sendEnterMultiple(session1, 2);
      expect(result1.success).toBe(false);

      jest.clearAllMocks();

      // session-2는 정상 동작해야 함
      const result2 = await sendEnterMultiple(session2, 2);
      expect(result2.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Task: sendKeys() 테스트 - 하이픈으로 시작하는 텍스트 전송
 * Tests for sendKeys() - Send text starting with dash
 */
describe('sendKeys()', () => {
  /**
   * 정상 경로 - 일반 텍스트 전송
   * Happy Path - Send normal text
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should send normal text successfully', async () => {
      const sessionName = 'test-session';
      const text = 'hello world';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendKeys(sessionName, text, true);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('tmux send-keys');
      expect(callArgs).toContain('-l');
      expect(callArgs).toContain('hello world');
    });
  });

  /**
   * 경계 조건 - 하이픈으로 시작하는 텍스트
   * Boundary Conditions - Text starting with dash
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should send text starting with single dash successfully', async () => {
      const sessionName = 'test-session';
      const text = '-md 파일들이 여기저이 있고';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendKeys(sessionName, text, true);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('tmux send-keys');
      expect(callArgs).toContain('-t test-session');
      // -- 구분자가 있어야 플래그 파싱 문제 해결
      expect(callArgs).toContain('--');
    });

    it('should send text starting with double dash successfully', async () => {
      const sessionName = 'test-session';
      const text = '--help 명령어';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendKeys(sessionName, text, true);

      expect(result.success).toBe(true);
      expect(mockedExec).toHaveBeenCalledTimes(1);

      const callArgs = mockedExec.mock.calls[0][0];
      expect(callArgs).toContain('--');
    });

    it('should send multiline text with lines starting with dash', async () => {
      const sessionName = 'test-session';
      const text = '깃허브 공개를 하기 전에\n-md 파일들이 여기저이 있고\n-현재 쓰지 않는 것들도 있는거 같고';

      mockedExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await sendKeys(sessionName, text, true);

      expect(result.success).toBe(true);
      // 3줄 + 2개의 Enter = 5번 호출
      expect(mockedExec).toHaveBeenCalled();

      // 각 라인이 -- 구분자와 함께 전송되었는지 확인
      const calls = mockedExec.mock.calls;
      const dashLineCalls = calls.filter(call => call[0].includes('-md') || call[0].includes('-현재'));

      dashLineCalls.forEach(call => {
        expect(call[0]).toContain('--');
      });
    });
  });
});
