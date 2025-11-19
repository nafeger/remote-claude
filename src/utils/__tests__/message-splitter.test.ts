/**
 * Message Splitter 유닛 테스트
 * Unit tests for message splitting and backtick conversion utility
 */

import {
  convertBackticks,
  splitMessage,
  addSplitIndicators,
  wrapInCodeBlocks,
} from '../message-splitter';
import { initLogger, clearLoggerInstance } from '../logger';
import { LogLevel } from '../../types';

beforeAll(() => {
  initLogger(LogLevel.ERROR);
});

afterAll(() => {
  clearLoggerInstance();
});

describe('splitMessage()', () => {
  describe('정상 경로 (Happy Path)', () => {
    /**
     * Task 6.12: 2500자 이하 메시지 분할 안 함
     */
    test('should not split message under 2500 characters', () => {
      const shortMessage = 'a'.repeat(2000);

      const result = splitMessage(shortMessage);

      expect(result.totalParts).toBe(1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBe(shortMessage);
    });

    /**
     * Task 6.13: 2500자 초과 메시지 정확히 분할
     */
    test('should split message over 2500 characters', () => {
      // 6500자 메시지 (줄바꿈 포함)
      const longMessage = 'a'.repeat(2000) + '\n' + 'b'.repeat(2000) + '\n' + 'c'.repeat(2000) + '\n' + 'd'.repeat(500);

      const result = splitMessage(longMessage);

      expect(result.totalParts).toBeGreaterThan(1);
      expect(result.messages.length).toBeGreaterThan(1);

      // 분할된 메시지들을 합치면 원본과 동일
      const combined = result.messages.join('');
      expect(combined).toBe(longMessage);
    });

    /**
     * Task 6.14: 분할 표시 `[1/3]`, `[2/3]` 형태 확인
     */
    test('should add split indicators in [1/3], [2/3] format', () => {
      const messages = ['message 1', 'message 2', 'message 3'];

      const result = addSplitIndicators(messages);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('[1/3]\nmessage 1');
      expect(result[1]).toBe('[2/3]\nmessage 2');
      expect(result[2]).toBe('[3/3]\nmessage 3');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    /**
     * Task 6.15: 정확히 2500자 메시지 처리
     */
    test('should handle exactly 2500 characters', () => {
      const exactMessage = 'a'.repeat(2500);

      const result = splitMessage(exactMessage);

      expect(result.totalParts).toBe(1);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBe(exactMessage);
    });

    /**
     * Task 6.16: 2501자 메시지 (2개로 분할)
     */
    test('should split 2501 characters into 2 parts', () => {
      const message2501 = 'a'.repeat(2501);

      const result = splitMessage(message2501);

      expect(result.totalParts).toBe(2);
      expect(result.messages).toHaveLength(2);

      // 분할된 메시지들을 합치면 원본과 동일
      const combined = result.messages.join('');
      expect(combined).toBe(message2501);
    });

    /**
     * Task 6.17: 빈 문자열 입력 시 빈 배열 반환
     */
    test('should return empty array for empty string', () => {
      const result = splitMessage('');

      expect(result.totalParts).toBe(0);
      expect(result.messages).toHaveLength(0);
      expect(result.messages).toEqual([]);
    });

    test('should handle single message without split indicators', () => {
      const singleMessage = ['only one message'];

      const result = addSplitIndicators(singleMessage);

      // 메시지가 1개면 분할 표시 없음
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('only one message');
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    /**
     * Task 6.18: 백틱 3개(```) 포함 시 ''' 변환
     */
    test('should convert triple backticks to triple quotes', () => {
      const messageWithBackticks = '```\ncode block\n```';

      const result = convertBackticks(messageWithBackticks);

      expect(result).toBe("'''\ncode block\n'''");
      expect(result).not.toContain('```');
    });

    /**
     * Task 6.19: 여러 개의 백틱 패턴 모두 변환
     */
    test('should convert multiple backtick patterns', () => {
      const messageWithMultipleBackticks = '```\nfirst\n```\ntext\n```\nsecond\n```';

      const result = convertBackticks(messageWithMultipleBackticks);

      expect(result).toBe("'''\nfirst\n'''\ntext\n'''\nsecond\n'''");
      expect(result).not.toContain('```');

      // 백틱이 4개 변환되었는지 확인
      const quoteCount = (result.match(/'''/g) || []).length;
      expect(quoteCount).toBe(4);
    });

    /**
     * Task 6.20: 줄바꿈 없는 긴 메시지 처리
     */
    test('should handle long message without newlines', () => {
      const longMessageNoNewlines = 'a'.repeat(8000);

      const result = splitMessage(longMessageNoNewlines);

      expect(result.totalParts).toBeGreaterThan(1);
      expect(result.messages.length).toBeGreaterThan(1);

      // 각 메시지가 최대 길이 이하인지 확인
      result.messages.forEach((message) => {
        expect(message.length).toBeLessThanOrEqual(2500);
      });

      // 분할된 메시지들을 합치면 원본과 동일
      const combined = result.messages.join('');
      expect(combined).toBe(longMessageNoNewlines);
    });

    test('should wrap messages in code blocks', () => {
      const messages = ['message 1', 'message 2'];

      const result = wrapInCodeBlocks(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('```\nmessage 1\n```');
      expect(result[1]).toBe('```\nmessage 2\n```');
    });

    test('should not double-wrap messages already in code blocks', () => {
      const messages = ['```\nmessage 1\n```'];

      const result = wrapInCodeBlocks(messages);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('```\nmessage 1\n```');
    });
  });

  describe('부작용 검증 (Side Effects)', () => {
    /**
     * Task 6.21: 원본 메시지 불변성 확인
     */
    test('should not modify original message', () => {
      const originalMessage = 'a'.repeat(5000);
      const originalCopy = originalMessage;

      splitMessage(originalMessage);

      expect(originalMessage).toBe(originalCopy);
    });

    test('should not modify original messages array', () => {
      const originalMessages = ['message 1', 'message 2', 'message 3'];
      const originalCopy = [...originalMessages];

      addSplitIndicators(originalMessages);

      expect(originalMessages).toEqual(originalCopy);
    });

    /**
     * Task 6.22: 분할된 메시지 합치기 (백틱 제외 동일)
     */
    test('should preserve content when splitting and joining', () => {
      const originalMessage = 'a'.repeat(2000) + '\n' + 'b'.repeat(2000) + '\n' + 'c'.repeat(2000) + '\n' + 'd'.repeat(500);

      const { messages } = splitMessage(originalMessage);
      const combined = messages.join('');

      expect(combined).toBe(originalMessage);
    });

    test('should handle backtick conversion consistently', () => {
      const message1 = '```code```';
      const message2 = '```code```';

      const result1 = convertBackticks(message1);
      const result2 = convertBackticks(message2);

      expect(result1).toBe(result2);
      expect(result1).toBe("'''code'''");
    });
  });
});

describe('convertBackticks()', () => {
  test('should return empty string for empty input', () => {
    expect(convertBackticks('')).toBe('');
  });

  test('should preserve text without backticks', () => {
    const text = 'normal text without backticks';
    expect(convertBackticks(text)).toBe(text);
  });

  test('should handle single backtick (not triple)', () => {
    const text = 'text with ` single backtick';
    expect(convertBackticks(text)).toBe(text);
  });
});

describe('addSplitIndicators()', () => {
  test('should return empty array for empty input', () => {
    expect(addSplitIndicators([])).toEqual([]);
  });
});

describe('wrapInCodeBlocks()', () => {
  test('should return empty array for empty input', () => {
    expect(wrapInCodeBlocks([])).toEqual([]);
  });
});
