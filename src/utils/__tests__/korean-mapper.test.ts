/**
 * Korean Mapper 유닛 테스트
 * Unit tests for Korean command mapping utility
 */

import {
  mapKoreanCommand,
  convertKoreanToEnglish,
  decomposeKorean,
  KOREAN_COMMAND_MAP,
  KOREAN_TO_ENGLISH_MAP,
} from '../korean-mapper';
import { initLogger, clearLoggerInstance } from '../logger';
import { LogLevel } from '../../types';

beforeAll(() => {
  initLogger(LogLevel.ERROR);
});

afterAll(() => {
  clearLoggerInstance();
});

describe('mapKoreanCommand()', () => {
  describe('정상 경로 (Happy Path)', () => {
    /**
     * Task 6.2: `/ㄴㅅㅁ션` → `/state` 변환 검증
     */
    test('should map /ㄴㅅㅁ션 to /state', () => {
      const result = mapKoreanCommand('/ㄴㅅㅁ션');

      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('/state');
      expect(result.error).toBeUndefined();
    });

    /**
     * Task 6.3: `/애쥐ㅐㅁㅇ` → `/download` 변환 검증
     */
    test('should map /애쥐ㅐㅁㅇ to /download', () => {
      const result = mapKoreanCommand('/애쥐ㅐㅁㅇ');

      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('/download');
      expect(result.error).toBeUndefined();
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    /**
     * Task 6.4: 빈 문자열 입력
     */
    test('should return error for empty string', () => {
      const result = mapKoreanCommand('');

      expect(result.success).toBe(false);
      expect(result.mappedCommand).toBeUndefined();
      expect(result.error).toBe('명령어가 비어있습니다');
    });

    test('should return error for whitespace-only string', () => {
      const result = mapKoreanCommand('   ');

      expect(result.success).toBe(false);
      expect(result.mappedCommand).toBeUndefined();
      expect(result.error).toBe('명령어가 비어있습니다');
    });

    /**
     * Task 6.5: 슬래시 없는 한글만 입력
     */
    test('should handle Korean text without slash', () => {
      const result = mapKoreanCommand('상태');

      // '상태'를 영어 자판으로 변환하면 'tkdxo'가 됨
      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('tkdxo');
      expect(result.error).toBeUndefined();
    });

    /**
     * Task 6.6: 매핑되지 않은 한글 명령어
     */
    test('should return error for unmapped Korean jamo command', () => {
      const result = mapKoreanCommand('/ㅁㅁㅁ');

      // '/ㅁㅁㅁ'는 자모 문자이므로 변환되지 않음 → 실패
      expect(result.success).toBe(false);
      expect(result.error).toContain('매핑되지 않은 명령어입니다');
    });

    test('should return error for English command (no conversion needed)', () => {
      const result = mapKoreanCommand('/help');

      // 한글이 없으므로 변환 결과가 원본과 동일 → 실패
      expect(result.success).toBe(false);
      expect(result.error).toContain('매핑되지 않은 명령어입니다');
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    /**
     * Task 6.7: 특수문자 포함 입력
     */
    test('should handle special characters in Korean command', () => {
      const result = mapKoreanCommand('/상태!@#');

      // '상태' → 'tkdxo', 특수문자는 그대로 유지
      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('/tkdxo!@#');
    });

    /**
     * Task 6.8: 영어+한글 혼합 입력
     */
    test('should handle mixed Korean and English input', () => {
      const result = mapKoreanCommand('/상태state');

      // '상태' → 'tkdxo', 'state'는 그대로
      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('/tkdxostate');
    });

    test('should handle Korean with numbers', () => {
      const result = mapKoreanCommand('/상태123');

      expect(result.success).toBe(true);
      expect(result.mappedCommand).toBe('/tkdxo123');
    });
  });

  describe('부작용 검증 (Side Effects)', () => {
    /**
     * Task 6.9: 매핑 테이블 불변성 확인
     */
    test('should not modify the mapping table', () => {
      const originalMapSize = Object.keys(KOREAN_COMMAND_MAP).length;
      const originalMap = { ...KOREAN_COMMAND_MAP };

      // 여러 번 호출
      mapKoreanCommand('/ㄴㅅㅁ션');
      mapKoreanCommand('/애쥐ㅐㅁㅇ');

      // 매핑 테이블이 변경되지 않았는지 확인
      expect(Object.keys(KOREAN_COMMAND_MAP).length).toBe(originalMapSize);
      expect(KOREAN_COMMAND_MAP).toEqual(originalMap);
    });

    /**
     * Task 6.10: 여러 번 호출 시 동일 결과 반환
     */
    test('should return consistent results for same input', () => {
      const input = '/ㄴㅅㅁ션';

      const result1 = mapKoreanCommand(input);
      const result2 = mapKoreanCommand(input);
      const result3 = mapKoreanCommand(input);

      // 모든 결과가 동일해야 함
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result1.mappedCommand).toBe('/state');
    });

    test('should not modify input parameter', () => {
      const input = '/ㄴㅅㅁ션';
      const originalInput = input;

      mapKoreanCommand(input);

      expect(input).toBe(originalInput);
    });
  });
});

describe('convertKoreanToEnglish()', () => {
  describe('정상 경로 (Happy Path)', () => {
    test('should convert 상태 to tkdxo', () => {
      expect(convertKoreanToEnglish('상태')).toBe('tkdxo');
    });

    test('should convert 다운로드 to ekdnsfhem', () => {
      expect(convertKoreanToEnglish('다운로드')).toBe('ekdnsfhem');
    });

    test('should preserve slash in /상태', () => {
      expect(convertKoreanToEnglish('/상태')).toBe('/tkdxo');
    });
  });

  describe('경계 조건 (Boundary Conditions)', () => {
    test('should return empty string for empty input', () => {
      expect(convertKoreanToEnglish('')).toBe('');
    });

    test('should preserve non-Korean characters', () => {
      expect(convertKoreanToEnglish('abc123')).toBe('abc123');
    });

    test('should handle mixed Korean and English', () => {
      const result = convertKoreanToEnglish('상태state');
      expect(result).toBe('tkdxostate');
    });
  });
});

describe('decomposeKorean()', () => {
  describe('정상 경로 (Happy Path)', () => {
    test('should decompose 한 to ㅎ + ㅏ + ㄴ', () => {
      const result = decomposeKorean('한');

      expect(result.initial).toBe('ㅎ');
      expect(result.medial).toBe('ㅏ');
      expect(result.final).toBe('ㄴ');
    });

    test('should decompose 가 to ㄱ + ㅏ + (empty final)', () => {
      const result = decomposeKorean('가');

      expect(result.initial).toBe('ㄱ');
      expect(result.medial).toBe('ㅏ');
      expect(result.final).toBe('');
    });
  });

  describe('예외 케이스 (Exception Cases)', () => {
    test('should throw error for non-Korean character', () => {
      expect(() => decomposeKorean('a')).toThrow('한글이 아닙니다');
    });

    test('should throw error for empty string', () => {
      expect(() => decomposeKorean('')).toThrow('단일 문자만 입력 가능합니다');
    });

    test('should throw error for multiple characters', () => {
      expect(() => decomposeKorean('한글')).toThrow('단일 문자만 입력 가능합니다');
    });
  });
});

describe('KOREAN_COMMAND_MAP', () => {
  test('should have /ㄴㅅㅁ션 mapped to /state', () => {
    expect(KOREAN_COMMAND_MAP['/ㄴㅅㅁ션']).toBe('/state');
  });

  test('should have /애쥐ㅐㅁㅇ mapped to /download', () => {
    expect(KOREAN_COMMAND_MAP['/애쥐ㅐㅁㅇ']).toBe('/download');
  });

  test('should have exactly 2 mappings', () => {
    expect(Object.keys(KOREAN_COMMAND_MAP).length).toBe(2);
  });
});

describe('KOREAN_TO_ENGLISH_MAP', () => {
  test('should have correct consonant mappings', () => {
    expect(KOREAN_TO_ENGLISH_MAP['ㄱ']).toBe('r');
    expect(KOREAN_TO_ENGLISH_MAP['ㄴ']).toBe('s');
    expect(KOREAN_TO_ENGLISH_MAP['ㅅ']).toBe('t');
  });

  test('should have correct vowel mappings', () => {
    expect(KOREAN_TO_ENGLISH_MAP['ㅏ']).toBe('k');
    expect(KOREAN_TO_ENGLISH_MAP['ㅐ']).toBe('o');
    expect(KOREAN_TO_ENGLISH_MAP['ㅣ']).toBe('l');
  });
});
