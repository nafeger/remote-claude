/**
 * 한글 명령어 매핑 유틸리티
 * Korean command mapping utility
 *
 * 한글 자판으로 입력된 명령어를 영어 명령어로 변환합니다.
 * 예: /ㄴㅅㅁ션 → /state, /애쥐ㅐㅁㅇ → /download
 */

import { getLogger } from './logger';

/**
 * 명령어 매핑 결과
 * Command mapping result
 */
export interface CommandMappingResult {
  /**
   * 매핑 성공 여부
   */
  success: boolean;

  /**
   * 매핑된 영어 명령어 (성공 시)
   */
  mappedCommand?: string;

  /**
   * 에러 메시지 (실패 시)
   */
  error?: string;
}

/**
 * 한글 → 영어 자판 변환 테이블
 * Korean to English keyboard mapping table
 *
 * 한글 자모를 영어 자판 위치로 매핑합니다.
 * 예: ㄱ → r, ㅏ → k, ㅅ → t
 */
export const KOREAN_TO_ENGLISH_MAP: Record<string, string> = {
  // 초성 (Consonants - Initial)
  ㄱ: 'r',
  ㄲ: 'R',
  ㄴ: 's',
  ㄷ: 'e',
  ㄸ: 'E',
  ㄹ: 'f',
  ㅁ: 'a',
  ㅂ: 'q',
  ㅃ: 'Q',
  ㅅ: 't',
  ㅆ: 'T',
  ㅇ: 'd',
  ㅈ: 'w',
  ㅉ: 'W',
  ㅊ: 'c',
  ㅋ: 'z',
  ㅌ: 'x',
  ㅍ: 'v',
  ㅎ: 'g',

  // 중성 (Vowels - Medial)
  ㅏ: 'k',
  ㅐ: 'o',
  ㅑ: 'i',
  ㅒ: 'O',
  ㅓ: 'j',
  ㅔ: 'p',
  ㅕ: 'u',
  ㅖ: 'P',
  ㅗ: 'h',
  ㅘ: 'hk',
  ㅙ: 'ho',
  ㅚ: 'hl',
  ㅛ: 'y',
  ㅜ: 'n',
  ㅝ: 'nj',
  ㅞ: 'np',
  ㅟ: 'nl',
  ㅠ: 'b',
  ㅡ: 'm',
  ㅢ: 'ml',
  ㅣ: 'l',

  // 종성 (Consonants - Final)
  // 종성은 초성과 동일한 매핑 사용
};

/**
 * 한글 자모 유니코드 범위
 * Korean character Unicode ranges
 */
export const KOREAN_UNICODE = {
  // 완성형 한글 범위: 가(0xAC00) ~ 힣(0xD7A3)
  COMPLETE_START: 0xac00,
  COMPLETE_END: 0xd7a3,

  // 초성 개수 (19개: ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ)
  INITIAL_COUNT: 19,

  // 중성 개수 (21개: ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ)
  MEDIAL_COUNT: 21,

  // 종성 개수 (28개: 없음 + 27개 종성)
  FINAL_COUNT: 28,
};

/**
 * 초성 자모 배열
 * Initial consonants array
 */
export const INITIAL_CONSONANTS = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

/**
 * 중성 자모 배열
 * Medial vowels array
 */
export const MEDIAL_VOWELS = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
];

/**
 * 종성 자모 배열
 * Final consonants array (including empty final)
 */
export const FINAL_CONSONANTS = [
  '', // 종성 없음
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

/**
 * 한글 자모 분해 결과
 * Korean character decomposition result
 */
export interface DecomposedKorean {
  /**
   * 초성 (Initial consonant)
   */
  initial: string;

  /**
   * 중성 (Medial vowel)
   */
  medial: string;

  /**
   * 종성 (Final consonant, empty string if none)
   */
  final: string;
}

/**
 * 완성형 한글을 초성/중성/종성으로 분해
 * Decompose complete Korean character into initial/medial/final
 *
 * @param char - 분해할 한글 문자 (단일 문자)
 * @returns DecomposedKorean - 분해된 초성/중성/종성
 * @throws {Error} - 한글이 아닌 문자가 입력된 경우
 *
 * @example
 * decomposeKorean('한') → { initial: 'ㅎ', medial: 'ㅏ', final: 'ㄴ' }
 * decomposeKorean('가') → { initial: 'ㄱ', medial: 'ㅏ', final: '' }
 */
export function decomposeKorean(char: string): DecomposedKorean {
  const logger = getLogger();

  if (!char || char.length !== 1) {
    const error = `단일 문자만 입력 가능합니다: "${char}"`;
    logger.error(error);
    throw new Error(error);
  }

  const charCode = char.charCodeAt(0);

  // 완성형 한글 범위 확인
  if (charCode < KOREAN_UNICODE.COMPLETE_START || charCode > KOREAN_UNICODE.COMPLETE_END) {
    const error = `한글이 아닙니다: "${char}" (U+${charCode.toString(16).toUpperCase()})`;
    logger.error(error);
    throw new Error(error);
  }

  // 유니코드 오프셋 계산
  const offset = charCode - KOREAN_UNICODE.COMPLETE_START;

  // 초성 인덱스 = offset / (21 × 28)
  const initialIndex = Math.floor(offset / (KOREAN_UNICODE.MEDIAL_COUNT * KOREAN_UNICODE.FINAL_COUNT));

  // 중성 인덱스 = (offset % (21 × 28)) / 28
  const medialIndex = Math.floor((offset % (KOREAN_UNICODE.MEDIAL_COUNT * KOREAN_UNICODE.FINAL_COUNT)) / KOREAN_UNICODE.FINAL_COUNT);

  // 종성 인덱스 = offset % 28
  const finalIndex = offset % KOREAN_UNICODE.FINAL_COUNT;

  const result: DecomposedKorean = {
    initial: INITIAL_CONSONANTS[initialIndex],
    medial: MEDIAL_VOWELS[medialIndex],
    final: FINAL_CONSONANTS[finalIndex], // 빈 문자열일 수 있음
  };

  logger.debug(`Decomposed "${char}": ${result.initial} + ${result.medial} + ${result.final || '(없음)'}`);

  return result;
}

/**
 * 문자열의 모든 한글 문자 분해
 * Decompose all Korean characters in a string
 *
 * @param text - 분해할 텍스트
 * @returns DecomposedKorean[] - 분해된 결과 배열
 * @description 한글 문자만 분해하고, 다른 문자는 무시합니다.
 *
 * @example
 * decomposeKoreanString('상태') → [
 *   { initial: 'ㅅ', medial: 'ㅏ', final: 'ㅇ' },
 *   { initial: 'ㅌ', medial: 'ㅐ', final: '' }
 * ]
 */
export function decomposeKoreanString(text: string): DecomposedKorean[] {
  const logger = getLogger();
  const results: DecomposedKorean[] = [];

  for (const char of text) {
    const charCode = char.charCodeAt(0);

    // 완성형 한글 범위인지 확인
    if (charCode >= KOREAN_UNICODE.COMPLETE_START && charCode <= KOREAN_UNICODE.COMPLETE_END) {
      try {
        results.push(decomposeKorean(char));
      } catch (error) {
        logger.warn(`Failed to decompose character "${char}":`, error);
      }
    }
  }

  logger.debug(`Decomposed ${results.length} Korean characters from "${text}"`);

  return results;
}

/**
 * 한글 자모를 영어 자판 문자열로 변환
 * Convert Korean jamo to English keyboard string
 *
 * @param decomposed - 분해된 한글 자모
 * @returns string - 변환된 영어 자판 문자열
 * @description 초성/중성/종성을 KOREAN_TO_ENGLISH_MAP을 사용하여 영어 자판 문자열로 변환
 *
 * @example
 * convertJamoToEnglish({ initial: 'ㅅ', medial: 'ㅏ', final: 'ㅇ' }) → 'tkd'
 * convertJamoToEnglish({ initial: 'ㄱ', medial: 'ㅏ', final: '' }) → 'rk'
 */
export function convertJamoToEnglish(decomposed: DecomposedKorean): string {
  const logger = getLogger();

  let result = '';

  // 초성 변환
  if (decomposed.initial) {
    const initial = KOREAN_TO_ENGLISH_MAP[decomposed.initial];
    if (!initial) {
      logger.warn(`Unknown initial consonant: "${decomposed.initial}"`);
    } else {
      result += initial;
    }
  }

  // 중성 변환
  if (decomposed.medial) {
    const medial = KOREAN_TO_ENGLISH_MAP[decomposed.medial];
    if (!medial) {
      logger.warn(`Unknown medial vowel: "${decomposed.medial}"`);
    } else {
      result += medial;
    }
  }

  // 종성 변환 (빈 문자열이 아닌 경우)
  if (decomposed.final) {
    const final = KOREAN_TO_ENGLISH_MAP[decomposed.final];
    if (!final) {
      logger.warn(`Unknown final consonant: "${decomposed.final}"`);
    } else {
      result += final;
    }
  }

  logger.debug(
    `Converted jamo to English: ${decomposed.initial}${decomposed.medial}${decomposed.final || '(없음)'} → "${result}"`
  );

  return result;
}

/**
 * 한글 문자열을 영어 자판 문자열로 변환
 * Convert Korean string to English keyboard string
 *
 * @param text - 변환할 한글 문자열
 * @returns string - 변환된 영어 자판 문자열
 * @description 한글 문자는 자모 분해 후 영어 자판으로 변환, 다른 문자는 그대로 유지
 *
 * @example
 * convertKoreanToEnglish('상태') → 'tkdeop'
 * convertKoreanToEnglish('/상태') → '/tkdeop'
 * convertKoreanToEnglish('다운로드') → 'eknssfhee'
 */
export function convertKoreanToEnglish(text: string): string {
  const logger = getLogger();

  if (!text) {
    return '';
  }

  let result = '';

  for (const char of text) {
    const charCode = char.charCodeAt(0);

    // 완성형 한글 범위인지 확인
    if (charCode >= KOREAN_UNICODE.COMPLETE_START && charCode <= KOREAN_UNICODE.COMPLETE_END) {
      try {
        const decomposed = decomposeKorean(char);
        const english = convertJamoToEnglish(decomposed);
        result += english;
      } catch (error) {
        logger.warn(`Failed to convert character "${char}":`, error);
        result += char; // 변환 실패 시 원본 유지
      }
    } else {
      // 한글이 아닌 문자는 그대로 유지
      result += char;
    }
  }

  logger.info(`Converted Korean to English: "${text}" → "${result}"`);

  return result;
}

/**
 * 한글 명령어 → 영어 명령어 매핑 테이블
 * Korean command to English command mapping table
 *
 * 한글 자판으로 잘못 입력된 명령어를 자동으로 영어 명령어로 변환합니다.
 * 사용자가 영어 명령어를 한글 자판 상태에서 입력했을 때 발생하는 오타를 수정합니다.
 *
 * @example
 * '/ㄴㅅㅁ션' → '/state'  (state를 한글 자판으로 입력)
 * '/애쥐ㅐㅁㅇ' → '/download'  (download를 한글 자판으로 입력)
 */
export const KOREAN_COMMAND_MAP: Record<string, string> = {
  '/ㄴㅅㅁ션': '/state',
  '/애쥐ㅐㅁㅇ': '/download',
};

/**
 * 한글 명령어를 영어 명령어로 변환
 * Convert Korean command to English command
 *
 * @param koreanCommand - 변환할 한글 명령어
 * @returns CommandMappingResult - 변환 결과 (성공 여부 및 변환된 명령어 또는 에러)
 * @description
 * 1. 직접 매핑 테이블(KOREAN_COMMAND_MAP)에서 명령어 찾기
 * 2. 직접 매핑이 없으면 자동 변환(convertKoreanToEnglish) 시도
 * 3. 변환 결과를 CommandMappingResult 형태로 반환
 *
 * @example
 * mapKoreanCommand('/ㄴㅅㅁ션')
 * → { success: true, mappedCommand: '/state' }
 *
 * mapKoreanCommand('/애쥐ㅐㅁㅇ')
 * → { success: true, mappedCommand: '/download' }
 *
 * mapKoreanCommand('')
 * → { success: false, error: '명령어가 비어있습니다' }
 */
export function mapKoreanCommand(koreanCommand: string): CommandMappingResult {
  const logger = getLogger();

  // 1. 빈 문자열 체크
  if (!koreanCommand || koreanCommand.trim().length === 0) {
    const error = '명령어가 비어있습니다';
    logger.error(error);
    return {
      success: false,
      error,
    };
  }

  // 2. 직접 매핑 테이블에서 찾기
  if (KOREAN_COMMAND_MAP[koreanCommand]) {
    const mappedCommand = KOREAN_COMMAND_MAP[koreanCommand];
    logger.info(`Direct mapping found: "${koreanCommand}" → "${mappedCommand}"`);
    return {
      success: true,
      mappedCommand,
    };
  }

  // 3. 자동 변환 시도
  try {
    const converted = convertKoreanToEnglish(koreanCommand);

    // 변환 결과가 원본과 동일하면 변환 실패로 간주
    if (converted === koreanCommand) {
      const error = `매핑되지 않은 명령어입니다: "${koreanCommand}"`;
      logger.warn(error);
      return {
        success: false,
        error,
      };
    }

    logger.info(`Auto-converted: "${koreanCommand}" → "${converted}"`);
    return {
      success: true,
      mappedCommand: converted,
    };
  } catch (error) {
    const errorMsg = `명령어 변환 실패: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
