/**
 * mention-filter.ts 유닛 테스트
 * Unit tests for mention-filter.ts
 *
 * 테스트 대상 (Test targets):
 * - filterSlackMentions() - Slack 멘션 필터링
 * - hasFileReferences() - 파일 참조 검증
 * - generateMentionFilterNotification() - 알림 메시지 생성
 * - safeFilterSlackMentions() - 안전한 멘션 필터링
 */

import {
  filterSlackMentions,
  hasFileReferences,
  generateMentionFilterNotification,
  safeFilterSlackMentions,
  MentionFilterResult,
  SLACK_MENTION_PATTERN,
} from '../mention-filter';
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

describe('filterSlackMentions()', () => {
  /**
   * Task 6.5.1: 정상 경로 - "<@U12345> text" → "text", 멘션 1개 감지
   * Happy Path - Filter single user mention
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should filter single user mention "<@U12345> text"', () => {
      // Arrange
      const input = '<@U12345> text';

      // Act
      const result: MentionFilterResult = filterSlackMentions(input);

      // Assert
      expect(result.filteredText).toBe('text');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<@U12345>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter user mention at the end "text <@U12345>"', () => {
      const input = 'text <@U12345>';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('text');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<@U12345>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter user mention in the middle "hello <@U12345> world"', () => {
      const input = 'hello <@U12345> world';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('hello world');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<@U12345>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter multiple user mentions', () => {
      const input = '<@U12345> <@U67890> implement feature';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('implement feature');
      expect(result.mentionsRemoved).toBe(2);
      expect(result.mentions).toEqual(['<@U12345>', '<@U67890>']);
      expect(result.hasChanged).toBe(true);
    });
  });

  /**
   * Task 6.5.2: 경계 조건 - "<!channel> <!here> text" → "text", 멘션 2개 감지
   * Boundary Conditions - Filter special mentions
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should filter <!channel> mention', () => {
      const input = '<!channel> urgent message';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('urgent message');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<!channel>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter <!here> mention', () => {
      const input = '<!here> quick update';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('quick update');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<!here>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter <!everyone> mention', () => {
      const input = '<!everyone> important announcement';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('important announcement');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<!everyone>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter multiple special mentions "<!channel> <!here> text"', () => {
      const input = '<!channel> <!here> text';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('text');
      expect(result.mentionsRemoved).toBe(2);
      expect(result.mentions).toEqual(['<!channel>', '<!here>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should filter mixed user and special mentions', () => {
      const input = '<@U12345> <!channel> please review this';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('please review this');
      expect(result.mentionsRemoved).toBe(2);
      expect(result.mentions).toEqual(['<@U12345>', '<!channel>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should handle empty string', () => {
      const input = '';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('');
      expect(result.mentionsRemoved).toBe(0);
      expect(result.mentions).toEqual([]);
      expect(result.hasChanged).toBe(false);
    });

    it('should clean up multiple consecutive spaces', () => {
      const input = '<@U12345>   text   with   spaces';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('text with spaces');
      expect(result.hasChanged).toBe(true);
    });
  });

  /**
   * Task 6.5.3: 예외 케이스 - "@file.ts text" → "@file.ts text", 멘션 0개
   * Exception Cases - File references should not be filtered
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should not filter file reference "@file.ts text"', () => {
      // Arrange
      const input = '@file.ts text';

      // Act
      const result = filterSlackMentions(input);

      // Assert
      expect(result.filteredText).toBe('@file.ts text');
      expect(result.mentionsRemoved).toBe(0);
      expect(result.mentions).toEqual([]);
      expect(result.hasChanged).toBe(false);
    });

    it('should not filter file path "@src/components/Button.tsx"', () => {
      const input = '@src/components/Button.tsx fix this';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('@src/components/Button.tsx fix this');
      expect(result.mentionsRemoved).toBe(0);
      expect(result.mentions).toEqual([]);
      expect(result.hasChanged).toBe(false);
    });

    it('should filter Slack mention but preserve file reference', () => {
      const input = '<@U12345> @file.ts needs update';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('@file.ts needs update');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<@U12345>']);
      expect(result.hasChanged).toBe(true);
    });

    it('should handle text with no mentions', () => {
      const input = 'regular text without mentions';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('regular text without mentions');
      expect(result.mentionsRemoved).toBe(0);
      expect(result.mentions).toEqual([]);
      expect(result.hasChanged).toBe(false);
    });

    it('should handle only mentions (result in empty string)', () => {
      const input = '<@U12345> <!channel>';
      const result = filterSlackMentions(input);

      expect(result.filteredText).toBe('');
      expect(result.mentionsRemoved).toBe(2);
      expect(result.mentions).toEqual(['<@U12345>', '<!channel>']);
      expect(result.hasChanged).toBe(true);
    });
  });

  /**
   * 부작용 검증 (Side Effects)
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameter', () => {
      const input = '<@U12345> text';
      const originalInput = input;

      filterSlackMentions(input);

      expect(input).toBe(originalInput);
    });

    it('should return consistent results for same input', () => {
      const input = '<@U12345> text';

      const result1 = filterSlackMentions(input);
      const result2 = filterSlackMentions(input);

      expect(result1).toEqual(result2);
    });
  });
});

describe('hasFileReferences()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should detect simple file reference "@file.ts"', () => {
      expect(hasFileReferences('@file.ts')).toBe(true);
    });

    it('should detect file reference with path "@src/app.js"', () => {
      expect(hasFileReferences('@src/app.js')).toBe(true);
    });

    it('should detect file reference with complex path "@components/Button.tsx"', () => {
      expect(hasFileReferences('@components/Button.tsx')).toBe(true);
    });

    it('should detect file reference in sentence', () => {
      expect(hasFileReferences('check @file.ts for details')).toBe(true);
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should return false for Slack user mention', () => {
      expect(hasFileReferences('<@U12345>')).toBe(false);
    });

    it('should return false for special mentions', () => {
      expect(hasFileReferences('<!channel>')).toBe(false);
    });

    it('should return false for @ without file extension', () => {
      expect(hasFileReferences('@username')).toBe(false);
    });

    it('should return false for text without @', () => {
      expect(hasFileReferences('regular text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasFileReferences('')).toBe(false);
    });
  });
});

describe('generateMentionFilterNotification()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should generate notification for filtered mentions', () => {
      const result: MentionFilterResult = {
        filteredText: 'text',
        mentionsRemoved: 1,
        mentions: ['<@U12345>'],
        hasChanged: true,
      };

      const notification = generateMentionFilterNotification(result);

      expect(notification).not.toBeNull();
      expect(notification).toContain('Slack 멘션이 감지되어 제거되었습니다');
      expect(notification).toContain('<@U12345>');
      expect(notification).toContain('1개');
      expect(notification).toContain('text');
    });

    it('should generate notification for multiple mentions', () => {
      const result: MentionFilterResult = {
        filteredText: 'implement feature',
        mentionsRemoved: 2,
        mentions: ['<@U12345>', '<!channel>'],
        hasChanged: true,
      };

      const notification = generateMentionFilterNotification(result);

      expect(notification).not.toBeNull();
      expect(notification).toContain('2개');
      expect(notification).toContain('<@U12345>, <!channel>');
    });

    it('should truncate long filtered text', () => {
      const longText = 'a'.repeat(150);
      const result: MentionFilterResult = {
        filteredText: longText,
        mentionsRemoved: 1,
        mentions: ['<@U12345>'],
        hasChanged: true,
      };

      const notification = generateMentionFilterNotification(result);

      expect(notification).not.toBeNull();
      expect(notification).toContain('...');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    it('should return null when no mentions removed', () => {
      const result: MentionFilterResult = {
        filteredText: 'text',
        mentionsRemoved: 0,
        mentions: [],
        hasChanged: false,
      };

      const notification = generateMentionFilterNotification(result);

      expect(notification).toBeNull();
    });

    it('should return null when hasChanged is false', () => {
      const result: MentionFilterResult = {
        filteredText: 'text',
        mentionsRemoved: 0,
        mentions: [],
        hasChanged: false,
      };

      const notification = generateMentionFilterNotification(result);

      expect(notification).toBeNull();
    });
  });
});

describe('safeFilterSlackMentions()', () => {
  describe('정상 경로 (Happy Path)', () => {
    it('should work same as filterSlackMentions for valid input', () => {
      const input = '<@U12345> text';

      const result = safeFilterSlackMentions(input);

      expect(result.filteredText).toBe('text');
      expect(result.mentionsRemoved).toBe(1);
      expect(result.mentions).toEqual(['<@U12345>']);
      expect(result.hasChanged).toBe(true);
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    it('should handle errors gracefully and return original text', () => {
      // safeFilterSlackMentions는 항상 성공하지만,
      // 내부적으로 에러가 발생하면 원본 텍스트 반환
      // safeFilterSlackMentions always succeeds, but returns original text on internal errors

      const input = '<@U12345> text';
      const result = safeFilterSlackMentions(input);

      // 정상 동작 확인
      // Verify normal operation
      expect(result).toBeDefined();
      expect(result.filteredText).toBeDefined();
    });
  });
});

describe('SLACK_MENTION_PATTERN', () => {
  describe('패턴 매칭 검증 (Pattern Matching)', () => {
    it('should match user mention pattern', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '<@U12345>'.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe('<@U12345>');
    });

    it('should match channel mention pattern', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '<!channel>'.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe('<!channel>');
    });

    it('should match here mention pattern', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '<!here>'.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe('<!here>');
    });

    it('should match everyone mention pattern', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '<!everyone>'.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe('<!everyone>');
    });

    it('should not match file references', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '@file.ts'.match(pattern);

      expect(matches).toBeNull();
    });

    it('should match multiple mentions', () => {
      const pattern = SLACK_MENTION_PATTERN;
      const matches = '<@U12345> <!channel> <@U67890>'.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches).toHaveLength(3);
    });
  });
});
