/**
 * parser.ts 유닛 테스트
 * Unit tests for parser.ts
 *
 * 테스트 대상 (Test targets):
 * - parseInteractiveCommand() - 백틱 명령 파싱
 * - isKeySequence() - 키 시퀀스 판별
 */

import {
  parseInteractiveCommand,
  isKeySequence,
  KeyCommand,
  TextCommand,
  ParseResult,
  ParsedSegment,
  KEY_MAPPING,
  KEY_CHARS,
  BACKTICK_PATTERN,
} from '../parser';
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

describe('parseInteractiveCommand()', () => {
  /**
   * Task 6.1.1: 정상 경로 - `ddd` → [Down, Down, Down]
   * Happy Path - `ddd` should parse to [Down, Down, Down]
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should parse `ddd` to three Down key commands', () => {
      // Arrange
      const input = '`ddd`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(3);
      expect(result.error).toBeUndefined();

      // 각 세그먼트가 KeyCommand이고 Down 키인지 확인
      // Verify each segment is a KeyCommand with Down key
      result.segments.forEach((segment: ParsedSegment) => {
        expect(segment.type).toBe('key');
        expect((segment as KeyCommand).key).toBe('Down');
      });
    });

    it('should parse `uuuu` to four Up key commands', () => {
      const input = '`uuuu`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(4);

      result.segments.forEach((segment: ParsedSegment) => {
        expect(segment.type).toBe('key');
        expect((segment as KeyCommand).key).toBe('Up');
      });
    });

    it('should parse `e` to single Enter key command', () => {
      const input = '`e`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].type).toBe('key');
      expect((result.segments[0] as KeyCommand).key).toBe('Enter');
    });

    it('should parse `rlud` to Right, Left, Up, Down sequence', () => {
      const input = '`rlud`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(4);

      const expectedKeys: Array<'Right' | 'Left' | 'Up' | 'Down'> = [
        'Right',
        'Left',
        'Up',
        'Down',
      ];

      result.segments.forEach((segment: ParsedSegment, index: number) => {
        expect(segment.type).toBe('key');
        expect((segment as KeyCommand).key).toBe(expectedKeys[index]);
      });
    });

    /**
     * Task 1.3: Space 키 매핑 테스트 (FR-15)
     * Space key mapping tests
     */
    it('should parse `s` to single Space key command', () => {
      // Arrange
      const input = '`s`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].type).toBe('key');
      expect((result.segments[0] as KeyCommand).key).toBe('Space');
    });

    it('should parse `dds` to Down, Down, Space sequence', () => {
      // Arrange
      const input = '`dds`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(3);

      const expectedKeys: Array<'Down' | 'Space'> = ['Down', 'Down', 'Space'];

      result.segments.forEach((segment: ParsedSegment, index: number) => {
        expect(segment.type).toBe('key');
        expect((segment as KeyCommand).key).toBe(expectedKeys[index]);
      });
    });
  });

  /**
   * Task 6.1.2: 경계 조건 - `ddd` text `e` → [Down×3, "text", Enter]
   * Boundary Conditions - mixed key and text commands
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should parse `ddd` text `e` to Down×3, text, Enter', () => {
      // Arrange
      const input = '`ddd` text `e`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(5); // 3 Down + 1 text + 1 Enter
      expect(result.error).toBeUndefined();

      // First 3 segments: Down keys
      for (let i = 0; i < 3; i++) {
        expect(result.segments[i].type).toBe('key');
        expect((result.segments[i] as KeyCommand).key).toBe('Down');
      }

      // 4th segment: text
      expect(result.segments[3].type).toBe('text');
      expect((result.segments[3] as TextCommand).content).toBe(' text ');

      // 5th segment: Enter key
      expect(result.segments[4].type).toBe('key');
      expect((result.segments[4] as KeyCommand).key).toBe('Enter');
    });

    it('should parse text only in backticks as text command', () => {
      const input = '`npm init`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].type).toBe('text');
      expect((result.segments[0] as TextCommand).content).toBe('npm init');
    });

    it('should handle multiple text segments', () => {
      const input = '`my-app` and `config`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(3); // text + text + text

      expect(result.segments[0].type).toBe('text');
      expect((result.segments[0] as TextCommand).content).toBe('my-app');

      expect(result.segments[1].type).toBe('text');
      expect((result.segments[1] as TextCommand).content).toBe(' and ');

      expect(result.segments[2].type).toBe('text');
      expect((result.segments[2] as TextCommand).content).toBe('config');
    });

    it('should handle empty message', () => {
      const input = '';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle message without backticks', () => {
      const input = 'plain text without backticks';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].type).toBe('text');
      expect((result.segments[0] as TextCommand).content).toBe(input);
    });

    it('should handle consecutive key commands', () => {
      const input = '`ddd``e``uuu`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(7); // 3 Down + 1 Enter + 3 Up

      // First 3: Down
      for (let i = 0; i < 3; i++) {
        expect((result.segments[i] as KeyCommand).key).toBe('Down');
      }

      // 4th: Enter
      expect((result.segments[3] as KeyCommand).key).toBe('Enter');

      // Last 3: Up
      for (let i = 4; i < 7; i++) {
        expect((result.segments[i] as KeyCommand).key).toBe('Up');
      }
    });
  });

  /**
   * Task 6.1.3: 예외 케이스 - `ddx` → 혼합 문자 에러 발생
   * Exception Cases - mixed character error
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should return error for mixed characters `ddx`', () => {
      // Arrange
      const input = '`ddx`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('백틱 내용이 애매합니다');
      expect(result.error?.message).toContain("'d', 'd'");
      expect(result.error?.message).toContain("'x'");
    });

    it('should return error for mixed characters `dtext`', () => {
      const input = '`dtext`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('백틱 내용이 애매합니다');
    });

    it('should return error for mixed characters `hello_e`', () => {
      const input = '`hello_e`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('백틱 내용이 애매합니다');
    });

    it('should return error for mixed characters `u1234`', () => {
      const input = '`u1234`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('백틱 내용이 애매합니다');
    });

    /**
     * Task 1.3: Space 키 혼합 문자 에러 테스트 (FR-15)
     * Space key mixed character error test
     */
    it('should return error for mixed characters `sx`', () => {
      // Arrange
      const input = '`sx`';

      // Act
      const result: ParseResult = parseInteractiveCommand(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('백틱 내용이 애매합니다');
      expect(result.error?.message).toContain("'s'");
      expect(result.error?.message).toContain("'x'");
    });

    it('should stop parsing at first error in sequence', () => {
      // 첫 번째 백틱이 에러면 전체 파싱 실패
      // If first backtick has error, entire parsing fails
      const input = '`ddx` `e`';
      const result: ParseResult = parseInteractiveCommand(input);

      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });
});

describe('isKeySequence()', () => {
  /**
   * Task 6.2.1: 정상 경로 - "ddd" → true
   * Happy Path - pure key sequences return true
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should return true for "ddd"', () => {
      expect(isKeySequence('ddd')).toBe(true);
    });

    it('should return true for single key character "e"', () => {
      expect(isKeySequence('e')).toBe(true);
    });

    it('should return true for all key types "rlude"', () => {
      expect(isKeySequence('rlude')).toBe(true);
    });

    it('should return true for repeated key "uuuuu"', () => {
      expect(isKeySequence('uuuuu')).toBe(true);
    });
  });

  /**
   * Task 6.2.2: 경계 조건 - "console" → false
   * Boundary Conditions - non-key sequences return false
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should return false for "npm"', () => {
      expect(isKeySequence('npm')).toBe(false);
    });

    it('should return false for text with numbers "abc123"', () => {
      expect(isKeySequence('abc123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isKeySequence('')).toBe(false);
    });

    it('should return false for special characters "!@#$"', () => {
      expect(isKeySequence('!@#$')).toBe(false);
    });

    it('should return false for whitespace', () => {
      expect(isKeySequence('   ')).toBe(false);
    });
  });

  /**
   * Task 6.2.3: 예외 케이스 - "ddx" → 혼합 감지 에러
   * Exception Cases - mixed characters throw error
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should throw error for mixed characters "ddx"', () => {
      expect(() => isKeySequence('ddx')).toThrow('백틱 내용이 애매합니다');
    });

    it('should throw error for "dtext"', () => {
      expect(() => isKeySequence('dtext')).toThrow('백틱 내용이 애매합니다');
    });

    it('should throw error for "hello_e"', () => {
      expect(() => isKeySequence('hello_e')).toThrow('백틱 내용이 애매합니다');
    });

    it('should throw error for "123u"', () => {
      expect(() => isKeySequence('123u')).toThrow('백틱 내용이 애매합니다');
    });

    it('should throw error for "d d" (key with space)', () => {
      expect(() => isKeySequence('d d')).toThrow('백틱 내용이 애매합니다');
    });
  });
});

describe('Parser Constants', () => {
  describe('KEY_MAPPING', () => {
    it('should map all 6 key characters correctly', () => {
      expect(KEY_MAPPING.r).toBe('Right');
      expect(KEY_MAPPING.l).toBe('Left');
      expect(KEY_MAPPING.u).toBe('Up');
      expect(KEY_MAPPING.d).toBe('Down');
      expect(KEY_MAPPING.e).toBe('Enter');
      expect(KEY_MAPPING.s).toBe('Space');
    });

    it('should have exactly 6 entries', () => {
      expect(Object.keys(KEY_MAPPING)).toHaveLength(6);
    });
  });

  describe('KEY_CHARS', () => {
    it('should contain all 6 key characters', () => {
      expect(KEY_CHARS.has('r')).toBe(true);
      expect(KEY_CHARS.has('l')).toBe(true);
      expect(KEY_CHARS.has('u')).toBe(true);
      expect(KEY_CHARS.has('d')).toBe(true);
      expect(KEY_CHARS.has('e')).toBe(true);
      expect(KEY_CHARS.has('s')).toBe(true);
    });

    it('should not contain non-key characters', () => {
      expect(KEY_CHARS.has('x')).toBe(false);
      expect(KEY_CHARS.has('a')).toBe(false);
      expect(KEY_CHARS.has('1')).toBe(false);
    });

    it('should have exactly 6 entries', () => {
      expect(KEY_CHARS.size).toBe(6);
    });
  });

  describe('BACKTICK_PATTERN', () => {
    it('should match single backtick pair', () => {
      const input = '`ddd`';
      const matches = Array.from(input.matchAll(BACKTICK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][1]).toBe('ddd');
    });

    it('should match multiple backtick pairs', () => {
      const input = '`ddd` text `e`';
      const matches = Array.from(input.matchAll(BACKTICK_PATTERN));

      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('ddd');
      expect(matches[1][1]).toBe('e');
    });

    it('should not match text without backticks', () => {
      const input = 'plain text';
      const matches = Array.from(input.matchAll(BACKTICK_PATTERN));

      expect(matches).toHaveLength(0);
    });
  });

  /**
   * Task 1.1: Space 키 타입 정의 테스트 (FR-15)
   * Test Space key type definition
   */
  describe('Space 키 타입 정의 (FR-15)', () => {
    /**
     * Happy Path: KEY_MAPPING에 's' → 'Space' 매핑이 존재하는지 확인
     */
    it('should have s mapped to Space in KEY_MAPPING', () => {
      // Assert
      expect(KEY_MAPPING['s']).toBe('Space');
    });

    /**
     * Happy Path: KEY_CHARS Set에 's'가 포함되는지 확인
     */
    it('should include s in KEY_CHARS', () => {
      // Assert
      expect(KEY_CHARS.has('s')).toBe(true);
    });

    /**
     * Side Effects: 기존 키 매핑에 영향을 주지 않는지 확인
     */
    it('should not affect existing key mappings', () => {
      // Assert - 기존 키 매핑이 유지되는지 확인
      expect(KEY_MAPPING['r']).toBe('Right');
      expect(KEY_MAPPING['l']).toBe('Left');
      expect(KEY_MAPPING['u']).toBe('Up');
      expect(KEY_MAPPING['d']).toBe('Down');
      expect(KEY_MAPPING['e']).toBe('Enter');
    });

    /**
     * Side Effects: 기존 KEY_CHARS에 영향을 주지 않는지 확인
     */
    it('should not affect existing KEY_CHARS', () => {
      // Assert - 기존 키 문자가 유지되는지 확인
      expect(KEY_CHARS.has('r')).toBe(true);
      expect(KEY_CHARS.has('l')).toBe(true);
      expect(KEY_CHARS.has('u')).toBe(true);
      expect(KEY_CHARS.has('d')).toBe(true);
      expect(KEY_CHARS.has('e')).toBe(true);
    });
  });
});
