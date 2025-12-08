/**
 * 파일 검증 유틸리티
 * File validation utility
 *
 * FR-2: 파일 타입 검증 (PNG, JPG, JPEG, TXT, LOG, JSON, MD, CSV, XML, YAML)
 * FR-3: 파일 크기 검증 (최대 5MB)
 */

import { getLogger } from './logger';

/**
 * 파일 검증 결과 인터페이스
 * File validation result interface
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 지원하는 이미지 MIME 타입
 * Supported image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg', // JPG와 JPEG 모두 커버
];

/**
 * 지원하는 텍스트 MIME 타입
 * Supported text MIME types
 */
export const ALLOWED_TEXT_TYPES = [
  'text/plain', // .txt, .log
  'application/json', // .json
  'text/markdown', // .md
  'text/csv', // .csv
  'text/xml', // .xml
  'application/xml', // .xml
  'text/yaml', // .yaml, .yml
  'application/x-yaml', // .yaml, .yml
];

/**
 * 모든 지원 MIME 타입
 * All supported MIME types
 */
export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_TEXT_TYPES];

/**
 * 최대 파일 크기 (5MB)
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * 파일 타입 검증
 * Validate file type
 *
 * @param mimeType - 파일의 MIME type
 * @param fileName - 파일명 (선택사항, 로깅용)
 * @returns FileValidationResult
 *
 * 지원 형식:
 * - 이미지: PNG, JPG, JPEG
 * - 텍스트: TXT, LOG, JSON, MD, CSV, XML, YAML, YML
 */
export function validateFileType(
  mimeType: string,
  fileName?: string
): FileValidationResult {
  const logger = getLogger();
  logger.debug(`Validating file type: ${mimeType} (${fileName || 'unknown'})`);

  // 빈 MIME type 체크
  // Check for empty MIME type
  if (!mimeType || mimeType.trim().length === 0) {
    const error = '지원하지 않는 파일 형식입니다. PNG, JPG, JPEG, TXT, LOG, JSON, MD, CSV, XML, YAML 파일만 업로드 가능합니다.';
    logger.warn(`File type validation failed: empty MIME type (${fileName || 'unknown'})`);
    return {
      valid: false,
      error,
    };
  }

  // MIME type을 소문자로 변환 (대소문자 구분 없음)
  // Convert MIME type to lowercase (case-insensitive)
  const normalizedMimeType = mimeType.toLowerCase().trim();

  // 지원하는 MIME type인지 확인
  // Check if MIME type is supported
  const isAllowed = ALLOWED_MIME_TYPES.includes(normalizedMimeType);

  if (isAllowed) {
    logger.debug(`File type validation passed: ${normalizedMimeType} (${fileName || 'unknown'})`);
    return {
      valid: true,
    };
  }

  // 지원하지 않는 파일 타입
  // Unsupported file type
  const error = '지원하지 않는 파일 형식입니다. PNG, JPG, JPEG, TXT, LOG, JSON, MD, CSV, XML, YAML 파일만 업로드 가능합니다.';
  logger.warn(`File type validation failed: ${normalizedMimeType} (${fileName || 'unknown'})`);

  return {
    valid: false,
    error,
  };
}

/**
 * 파일 크기 검증
 * Validate file size
 *
 * @param fileSize - 파일 크기 (bytes)
 * @returns FileValidationResult
 *
 * 최대 크기: 5MB
 */
export function validateFileSize(fileSize: number): FileValidationResult {
  const logger = getLogger();
  logger.debug(`Validating file size: ${fileSize} bytes`);

  // 음수 파일 크기 체크
  // Check for negative file size
  if (fileSize < 0) {
    const error = '유효하지 않은 파일 크기입니다.';
    logger.warn(`File size validation failed: negative size (${fileSize} bytes)`);
    return {
      valid: false,
      error,
    };
  }

  // 최대 파일 크기 체크 (5MB)
  // Check maximum file size (5MB)
  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    const error = `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다. (현재: ${sizeMB}MB)`;
    logger.warn(`File size validation failed: ${fileSize} bytes (max: ${MAX_FILE_SIZE} bytes)`);
    return {
      valid: false,
      error,
    };
  }

  // 파일 크기 검증 통과
  // File size validation passed
  logger.debug(`File size validation passed: ${fileSize} bytes`);
  return {
    valid: true,
  };
}
