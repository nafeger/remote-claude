/**
 * input-processor.ts 유닛 테스트
 * Unit tests for input-processor.ts
 *
 * 테스트 대상 (Test targets):
 * - processInput() - 4단계 입력 처리 파이프라인
 * - detectSlackNativeCommand() - Slack 네이티브 명령 감지
 * - detectBotMetaCommand() - 봇 메타 명령 처리
 * - detectDslCommand() - 백틱 명령 감지
 * - processDefaultInput() - 기본 입력 처리
 */

import {
  processInput,
  detectSlackNativeCommand,
  detectBotMetaCommand,
  detectDslCommand,
  processDefaultInput,
  InputProcessingResult,
} from '../input-processor';
import { initLogger, clearLoggerInstance } from '../../utils/logger';
import { LogLevel } from '../../types';

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

describe('processInput()', () => {
  /**
   * Task 6.6.1: 정상 경로 - "implement feature" → Claude Code 전송
   * Happy Path - Default input goes to Claude Code
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should process "implement feature" as default input', () => {
      // Arrange
      const input = 'implement feature';

      // Act
      const result: InputProcessingResult = processInput(input);

      // Assert
      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('implement feature');
    });

    it('should process regular text as default input', () => {
      const input = 'Build the project';
      const result = processInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('Build the project');
    });

    it('should filter mentions in default input', () => {
      const input = '<@U12345> implement feature';
      const result = processInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('implement feature');
      expect(result.metadata?.mentionFilterResult?.mentionsRemoved).toBe(1);
    });
  });

  /**
   * Task 6.6.2: 경계 조건 - "/status" → 봇 명령, "`ddd`" → 백틱 명령
   * Boundary Conditions - Different command types
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should detect "/status" as bot meta command (stage 2)', () => {
      // Arrange
      const input = '/status';

      // Act
      const result = processInput(input);

      // Assert
      expect(result.stage).toBe(2);
      expect(result.action).toBe('bot-command');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('/status');
      expect(result.metadata?.commandType).toBe('/status');
    });

    it('should detect "`ddd`" as DSL command (stage 3)', () => {
      // Arrange
      const input = '`ddd`';

      // Act
      const result = processInput(input);

      // Assert
      expect(result.stage).toBe(3);
      expect(result.action).toBe('dsl-command');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('`ddd`');
      expect(result.metadata?.hasDslCommands).toBe(true);
    });

    it('should detect "/remind" as Slack native command (stage 1)', () => {
      const input = '/remind me to check this';
      const result = processInput(input);

      expect(result.stage).toBe(1);
      expect(result.action).toBe('passthrough');
      expect(result.shouldProcess).toBe(false);
      expect(result.metadata?.commandType).toBe('/remind');
    });

    it('should prioritize stages correctly: Slack > Bot > DSL > Default', () => {
      // Stage 1: Slack native command
      const slackResult = processInput('/remind test');
      expect(slackResult.stage).toBe(1);

      // Stage 2: Bot meta command
      const botResult = processInput('/setup');
      expect(botResult.stage).toBe(2);

      // Stage 3: DSL command
      const dslResult = processInput('`e`');
      expect(dslResult.stage).toBe(3);

      // Stage 4: Default input
      const defaultResult = processInput('regular text');
      expect(defaultResult.stage).toBe(4);
    });

    it('should handle mixed content with backticks as DSL command', () => {
      const input = '`ddd` text `e`';
      const result = processInput(input);

      expect(result.stage).toBe(3);
      expect(result.action).toBe('dsl-command');
      expect(result.shouldProcess).toBe(true);
    });
  });

  /**
   * Task 6.6.3: 예외 케이스 - "" (빈 문자열) → 무시
   * Exception Cases - Empty string should be skipped
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should skip empty string ""', () => {
      // Arrange
      const input = '';

      // Act
      const result = processInput(input);

      // Assert
      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
    });

    it('should skip whitespace-only input', () => {
      const input = '   ';
      const result = processInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
    });

    it('should skip input that becomes empty after mention filtering', () => {
      const input = '<@U12345> <!channel>';
      const result = processInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
      expect(result.metadata?.mentionFilterResult?.mentionsRemoved).toBe(2);
    });

    it('should handle input with only tabs and newlines', () => {
      const input = '\t\n\t\n';
      const result = processInput(input);

      expect(result.stage).toBe(4);
      expect(result.shouldProcess).toBe(false);
    });
  });

  /**
   * 부작용 검증 (Side Effects)
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameter', () => {
      const input = 'test input';
      const originalInput = input;

      processInput(input);

      expect(input).toBe(originalInput);
    });

    it('should return consistent results for same input', () => {
      const input = 'implement feature';

      const result1 = processInput(input);
      const result2 = processInput(input);

      expect(result1).toEqual(result2);
    });
  });
});

describe('detectSlackNativeCommand()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should detect /remind command', () => {
      const input = '/remind me tomorrow';
      const result = detectSlackNativeCommand(input);

      expect(result).not.toBeNull();
      expect(result?.stage).toBe(1);
      expect(result?.action).toBe('passthrough');
      expect(result?.shouldProcess).toBe(false);
      expect(result?.metadata?.commandType).toBe('/remind');
    });

    it('should detect /invite command', () => {
      const input = '/invite @user';
      const result = detectSlackNativeCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/invite');
    });

    it('should be case insensitive', () => {
      const input = '/REMIND me';
      const result = detectSlackNativeCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/remind');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should return null for bot meta commands', () => {
      const input = '/status';
      const result = detectSlackNativeCommand(input);

      expect(result).toBeNull();
    });

    it('should return null for regular text', () => {
      const input = 'regular text';
      const result = detectSlackNativeCommand(input);

      expect(result).toBeNull();
    });

    it('should handle command with extra whitespace', () => {
      const input = '  /remind  ';
      const result = detectSlackNativeCommand(input);

      expect(result).not.toBeNull();
    });
  });
});

describe('detectBotMetaCommand()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should detect /setup command', () => {
      const input = '/setup';
      const result = detectBotMetaCommand(input);

      expect(result).not.toBeNull();
      expect(result?.stage).toBe(2);
      expect(result?.action).toBe('bot-command');
      expect(result?.shouldProcess).toBe(true);
      expect(result?.processedInput).toBe('/setup');
      expect(result?.metadata?.commandType).toBe('/setup');
    });

    it('should detect /status command', () => {
      const input = '/status';
      const result = detectBotMetaCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/status');
    });

    it('should detect /help command', () => {
      const input = '/help';
      const result = detectBotMetaCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/help');
    });

    it('should detect /stop command', () => {
      const input = '/stop';
      const result = detectBotMetaCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/stop');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should be case insensitive', () => {
      const input = '/STATUS';
      const result = detectBotMetaCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.commandType).toBe('/status');
    });

    it('should return null for Slack native commands', () => {
      const input = '/remind';
      const result = detectBotMetaCommand(input);

      expect(result).toBeNull();
    });

    it('should return null for regular text', () => {
      const input = 'regular text';
      const result = detectBotMetaCommand(input);

      expect(result).toBeNull();
    });
  });
});

describe('detectDslCommand()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should detect simple backtick command "`ddd`"', () => {
      const input = '`ddd`';
      const result = detectDslCommand(input);

      expect(result).not.toBeNull();
      expect(result?.stage).toBe(3);
      expect(result?.action).toBe('dsl-command');
      expect(result?.shouldProcess).toBe(true);
      expect(result?.processedInput).toBe('`ddd`');
      expect(result?.metadata?.hasDslCommands).toBe(true);
    });

    it('should detect mixed backtick commands', () => {
      const input = '`ddd` text `e`';
      const result = detectDslCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.hasDslCommands).toBe(true);
    });

    it('should detect text in backticks', () => {
      const input = '`npm init`';
      const result = detectDslCommand(input);

      expect(result).not.toBeNull();
      expect(result?.metadata?.hasDslCommands).toBe(true);
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should return null for text without backticks', () => {
      const input = 'regular text';
      const result = detectDslCommand(input);

      expect(result).toBeNull();
    });

    it('should return null for empty backticks', () => {
      const input = '``';
      const result = detectDslCommand(input);

      expect(result).toBeNull();
    });

    it('should return null for unclosed backtick', () => {
      const input = '`incomplete';
      const result = detectDslCommand(input);

      expect(result).toBeNull();
    });
  });
});

describe('processDefaultInput()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should process regular text', () => {
      const input = 'implement feature';
      const result = processDefaultInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('implement feature');
    });

    it('should filter Slack mentions', () => {
      const input = '<@U12345> check this';
      const result = processDefaultInput(input);

      expect(result.stage).toBe(4);
      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('check this');
      expect(result.metadata?.mentionFilterResult?.mentionsRemoved).toBe(1);
    });

    it('should preserve file references', () => {
      const input = '@file.ts needs update';
      const result = processDefaultInput(input);

      expect(result.shouldProcess).toBe(true);
      expect(result.processedInput).toBe('@file.ts needs update');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should skip empty input', () => {
      const input = '';
      const result = processDefaultInput(input);

      expect(result.stage).toBe(4);
      expect(result.action).toBe('default-input');
      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
    });

    it('should skip whitespace-only input', () => {
      const input = '   ';
      const result = processDefaultInput(input);

      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
    });

    it('should skip input that becomes empty after filtering', () => {
      const input = '<@U12345>';
      const result = processDefaultInput(input);

      expect(result.shouldProcess).toBe(false);
      expect(result.processedInput).toBe('');
      expect(result.metadata?.mentionFilterResult?.mentionsRemoved).toBe(1);
    });

    it('should include metadata for all cases', () => {
      const input = '<@U12345> text';
      const result = processDefaultInput(input);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalInput).toBe(input);
      expect(result.metadata?.mentionFilterResult).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  describe('4단계 파이프라인 통합 테스트', () => {
    it('should process inputs through correct stages', () => {
      // Stage 1: Slack native
      const stage1 = processInput('/remind me');
      expect(stage1.stage).toBe(1);
      expect(stage1.shouldProcess).toBe(false);

      // Stage 2: Bot meta
      const stage2 = processInput('/setup');
      expect(stage2.stage).toBe(2);
      expect(stage2.shouldProcess).toBe(true);

      // Stage 3: DSL
      const stage3 = processInput('`ddd`');
      expect(stage3.stage).toBe(3);
      expect(stage3.shouldProcess).toBe(true);

      // Stage 4: Default
      const stage4 = processInput('implement feature');
      expect(stage4.stage).toBe(4);
      expect(stage4.shouldProcess).toBe(true);
    });

    it('should handle complex real-world scenarios', () => {
      // Scenario 1: User mentions with file reference
      const result1 = processInput('<@U12345> @file.ts check this');
      expect(result1.stage).toBe(4);
      expect(result1.processedInput).toBe('@file.ts check this');

      // Scenario 2: Bot command with extra text
      const result2 = processInput('/status detailed');
      expect(result2.stage).toBe(2);

      // Scenario 3: Mixed DSL commands
      const result3 = processInput('`ddd` select option `e`');
      expect(result3.stage).toBe(3);

      // Scenario 4: Slack command takes precedence
      const result4 = processInput('/remind /status tomorrow');
      expect(result4.stage).toBe(1);
      expect(result4.metadata?.commandType).toBe('/remind');
    });
  });
});
