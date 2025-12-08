/**
 * file-validator.ts 유닛 테스트
 * Unit tests for file-validator.ts
 *
 * 테스트 대상 (Test targets):
 * - validateFileType() - 파일 타입 검증
 * - validateFileSize() - 파일 크기 검증
 */

import {
  validateFileType,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TEXT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  FileValidationResult,
} from '../file-validator';
import { initLogger, clearLoggerInstance } from '../logger';
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

describe('validateFileType()', () => {
  /**
   * Task 2.2: 파일 타입 검증 테스트
   * File type validation tests
   */

  /**
   * Happy Path - 지원하는 이미지 파일 타입
   * Happy Path - Supported image file types
   */
  describe('정상 경로 - 이미지 (Happy Path - Images)', () => {
    it('should accept PNG files', () => {
      // Arrange
      const mimeType = 'image/png';
      const fileName = 'test.png';

      // Act
      const result: FileValidationResult = validateFileType(mimeType, fileName);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept JPEG files', () => {
      const mimeType = 'image/jpeg';
      const fileName = 'test.jpg';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept JPG files (image/jpeg)', () => {
      const mimeType = 'image/jpeg';
      const fileName = 'test.jpeg';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Happy Path - 지원하는 텍스트 파일 타입
   * Happy Path - Supported text file types
   */
  describe('정상 경로 - 텍스트 (Happy Path - Text)', () => {
    it('should accept plain text files', () => {
      const mimeType = 'text/plain';
      const fileName = 'test.txt';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept log files', () => {
      const mimeType = 'text/plain';
      const fileName = 'test.log';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept JSON files', () => {
      const mimeType = 'application/json';
      const fileName = 'test.json';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept Markdown files', () => {
      const mimeType = 'text/markdown';
      const fileName = 'test.md';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept CSV files', () => {
      const mimeType = 'text/csv';
      const fileName = 'test.csv';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept XML files (text/xml)', () => {
      const mimeType = 'text/xml';
      const fileName = 'test.xml';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept XML files (application/xml)', () => {
      const mimeType = 'application/xml';
      const fileName = 'test.xml';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept YAML files (text/yaml)', () => {
      const mimeType = 'text/yaml';
      const fileName = 'test.yaml';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept YAML files (application/x-yaml)', () => {
      const mimeType = 'application/x-yaml';
      const fileName = 'test.yml';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Boundary Conditions - 확장자 없는 경우, 대소문자
   * Boundary Conditions - No extension, case sensitivity
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should accept files without extension if MIME type is valid', () => {
      const mimeType = 'image/png';
      const fileName = 'file_without_extension';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should work without fileName parameter', () => {
      const mimeType = 'image/jpeg';

      const result = validateFileType(mimeType);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle MIME type case sensitivity correctly', () => {
      // MIME types는 대소문자 구분 없음
      // MIME types are case-insensitive
      const mimeType = 'IMAGE/PNG';
      const fileName = 'test.png';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Exception Cases - 지원하지 않는 파일 타입
   * Exception Cases - Unsupported file types
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should reject GIF files', () => {
      const mimeType = 'image/gif';
      const fileName = 'test.gif';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should reject WebP files', () => {
      const mimeType = 'image/webp';
      const fileName = 'test.webp';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should reject SVG files', () => {
      const mimeType = 'image/svg+xml';
      const fileName = 'test.svg';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should reject PDF files', () => {
      const mimeType = 'application/pdf';
      const fileName = 'test.pdf';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should reject video files', () => {
      const mimeType = 'video/mp4';
      const fileName = 'test.mp4';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should reject empty MIME type', () => {
      const mimeType = '';
      const fileName = 'test.txt';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject unknown MIME type', () => {
      const mimeType = 'application/octet-stream';
      const fileName = 'test.bin';

      const result = validateFileType(mimeType, fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameters', () => {
      const mimeType = 'image/png';
      const fileName = 'test.png';
      const originalMimeType = mimeType;
      const originalFileName = fileName;

      validateFileType(mimeType, fileName);

      expect(mimeType).toBe(originalMimeType);
      expect(fileName).toBe(originalFileName);
    });

    it('should return consistent results for same input', () => {
      const mimeType = 'image/jpeg';
      const fileName = 'test.jpg';

      const result1 = validateFileType(mimeType, fileName);
      const result2 = validateFileType(mimeType, fileName);

      expect(result1.valid).toBe(result2.valid);
      expect(result1.error).toBe(result2.error);
    });
  });
});

/**
 * Task 2.4: 파일 크기 검증 테스트
 * File size validation tests
 */
describe('validateFileSize()', () => {
  /**
   * Happy Path - 허용되는 파일 크기
   * Happy Path - Allowed file sizes
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should accept 1MB file', () => {
      // Arrange
      const fileSize = 1 * 1024 * 1024; // 1MB

      // Act
      const result: FileValidationResult = validateFileSize(fileSize);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept exactly 5MB file', () => {
      const fileSize = 5 * 1024 * 1024; // 5MB

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept small file (1KB)', () => {
      const fileSize = 1024; // 1KB

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Boundary Conditions - 경계값
   * Boundary Conditions - Edge cases
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should accept 0 byte file', () => {
      const fileSize = 0;

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject 5MB + 1 byte file', () => {
      const fileSize = 5 * 1024 * 1024 + 1; // 5MB + 1 byte

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('파일 크기가 너무 큽니다');
      expect(result.error).toContain('5MB');
    });

    it('should reject 10MB file', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('파일 크기가 너무 큽니다');
    });

    it('should accept file at exact boundary (MAX_FILE_SIZE)', () => {
      const fileSize = MAX_FILE_SIZE; // Exactly 5MB

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Exception Cases - 예외 케이스
   * Exception Cases - Invalid inputs
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should reject negative file size', () => {
      const fileSize = -1;

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('유효하지 않은');
    });

    it('should reject very large negative file size', () => {
      const fileSize = -1000000;

      const result = validateFileSize(fileSize);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameter', () => {
      const fileSize = 1024;
      const originalSize = fileSize;

      validateFileSize(fileSize);

      expect(fileSize).toBe(originalSize);
    });

    it('should return consistent results for same input', () => {
      const fileSize = 2 * 1024 * 1024; // 2MB

      const result1 = validateFileSize(fileSize);
      const result2 = validateFileSize(fileSize);

      expect(result1.valid).toBe(result2.valid);
      expect(result1.error).toBe(result2.error);
    });
  });
});

describe('Constants', () => {
  describe('ALLOWED_IMAGE_TYPES', () => {
    it('should contain exactly 2 image types', () => {
      expect(ALLOWED_IMAGE_TYPES).toHaveLength(2);
    });

    it('should include PNG and JPEG', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
    });
  });

  describe('ALLOWED_TEXT_TYPES', () => {
    it('should contain at least 8 text types', () => {
      expect(ALLOWED_TEXT_TYPES.length).toBeGreaterThanOrEqual(8);
    });

    it('should include common text formats', () => {
      expect(ALLOWED_TEXT_TYPES).toContain('text/plain');
      expect(ALLOWED_TEXT_TYPES).toContain('application/json');
      expect(ALLOWED_TEXT_TYPES).toContain('text/markdown');
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('should be combination of image and text types', () => {
      const expectedLength = ALLOWED_IMAGE_TYPES.length + ALLOWED_TEXT_TYPES.length;
      expect(ALLOWED_MIME_TYPES).toHaveLength(expectedLength);
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('should be exactly 5MB', () => {
      const fiveMB = 5 * 1024 * 1024;
      expect(MAX_FILE_SIZE).toBe(fiveMB);
    });
  });
});
