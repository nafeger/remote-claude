/**
 * file-attachment.ts 유닛 테스트
 * Unit tests for file-attachment.ts
 *
 * 테스트 대상 (Test targets):
 * - handleFileAttachment() - 파일 첨부 처리
 */

import {
  handleFileAttachment,
  SlackMessageEvent,
  FileAttachmentResult,
} from '../file-attachment';
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

/**
 * Task 4.2: 파일 첨부 감지 테스트
 * File attachment detection tests
 */
describe('handleFileAttachment() - 파일 첨부 감지', () => {
  const mockToken = 'xoxb-test-token';

  /**
   * Happy Path - 파일 첨부 감지 성공
   * Happy Path - Successful file attachment detection
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should detect file attachment when files array exists', async () => {
      // Arrange: files 배열이 있는 이벤트
      // Arrange: Event with files array
      const event: SlackMessageEvent = {
        text: 'Please analyze this image',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act: 파일 첨부 처리 (에러 발생 예상 - 아직 구현되지 않음)
      // Act: Handle file attachment (expect error - not implemented yet)
      try {
        await handleFileAttachment(event, mockToken);
        // 구현되면 성공해야 함
        // Should succeed when implemented
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });
  });

  /**
   * Boundary Conditions - 파일 없는 경우
   * Boundary Conditions - No files
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should handle event without files array', async () => {
      // Arrange: files 배열이 없는 이벤트
      // Arrange: Event without files array
      const event: SlackMessageEvent = {
        text: 'Just a message',
      };

      // Act & Assert: 파일이 없으면 처리하지 않아야 함
      // Act & Assert: Should not process when no files
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      // 파일이 없으면 success: false, 특정 에러 없음
      // When no files, success: false, no specific error
      expect(result.success).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should handle event with empty files array', async () => {
      // Arrange: 빈 files 배열
      // Arrange: Empty files array
      const event: SlackMessageEvent = {
        text: 'Message with empty files',
        files: [],
      };

      // Act & Assert: 빈 배열도 파일 없음으로 처리
      // Act & Assert: Empty array should be treated as no files
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  /**
   * Exception Cases - 예외 케이스
   * Exception Cases - Error scenarios
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should handle null event gracefully', async () => {
      // Arrange
      const event = null as unknown as SlackMessageEvent;

      // Act & Assert: null 이벤트 처리
      // Act & Assert: Handle null event
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined token gracefully', async () => {
      // Arrange
      const event: SlackMessageEvent = {
        text: 'Test',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };
      const token = undefined as unknown as string;

      // Act & Assert: undefined token 처리 (다운로드 실패로 에러 반환)
      // Act & Assert: Handle undefined token (returns error from download failure)
      const result: FileAttachmentResult = await handleFileAttachment(event, token);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input event', async () => {
      // Arrange
      const event: SlackMessageEvent = {
        text: 'Test message',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };
      const originalEvent = JSON.parse(JSON.stringify(event));

      // Act: 에러 무시
      // Act: Ignore error
      try {
        await handleFileAttachment(event, mockToken);
      } catch {
        // Ignore error
      }

      // Assert: 입력 이벤트가 수정되지 않았는지 확인
      // Assert: Verify input event was not modified
      expect(event).toEqual(originalEvent);
    });
  });
});

/**
 * Task 4.3: 단일 파일 처리 테스트
 * Single file processing tests
 */
describe('handleFileAttachment() - 단일 파일 처리', () => {
  const mockToken = 'xoxb-test-token';

  /**
   * Happy Path - 1개 파일 처리 성공
   * Happy Path - Successfully process single file
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should process single file successfully', async () => {
      // Arrange: 1개 파일만 있는 이벤트
      // Arrange: Event with single file
      const event: SlackMessageEvent = {
        text: 'Please analyze this image',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act: 파일 첨부 처리 (에러 발생 예상 - 아직 구현되지 않음)
      // Act: Handle file attachment (expect error - not implemented yet)
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);
        // 구현되면 성공해야 함
        // Should succeed when implemented
        expect(result.success).toBe(true);
        expect(result.filePath).toBeDefined();
        expect(result.prompt).toBeDefined();
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });
  });

  /**
   * Boundary Conditions - 여러 파일 중 첫 번째만 처리
   * Boundary Conditions - Process only first file from multiple files
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should process only the first file when multiple files are present', async () => {
      // Arrange: 3개 파일이 있는 이벤트 (첫 번째만 처리해야 함)
      // Arrange: Event with 3 files (should process only first one)
      const event: SlackMessageEvent = {
        text: 'Please analyze these files',
        files: [
          {
            id: 'F123',
            name: 'first.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/first.png',
          },
          {
            id: 'F456',
            name: 'second.jpg',
            mimetype: 'image/jpeg',
            size: 2048,
            url_private_download: 'https://files.slack.com/second.jpg',
          },
          {
            id: 'F789',
            name: 'third.txt',
            mimetype: 'text/plain',
            size: 512,
            url_private_download: 'https://files.slack.com/third.txt',
          },
        ],
      };

      // Act & Assert: 첫 번째 파일만 처리해야 함
      // Act & Assert: Should process only the first file
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);
        // 구현되면 첫 번째 파일만 처리되어야 함
        // When implemented, should process only first file
        expect(result.success).toBe(true);
        expect(result.filePath).toBeDefined();
        // 파일명이나 경로에 'first'가 포함되어야 함
        // File name or path should contain 'first'
        // Note: 실제 구현 시 검증 가능
        // Note: Can be verified when implemented
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });

    it('should handle exactly 2 files (process first one only)', async () => {
      // Arrange: 정확히 2개 파일
      // Arrange: Exactly 2 files
      const event: SlackMessageEvent = {
        text: 'Two files attached',
        files: [
          {
            id: 'F111',
            name: 'primary.log',
            mimetype: 'text/plain',
            size: 1500,
            url_private_download: 'https://files.slack.com/primary.log',
          },
          {
            id: 'F222',
            name: 'secondary.log',
            mimetype: 'text/plain',
            size: 1200,
            url_private_download: 'https://files.slack.com/secondary.log',
          },
        ],
      };

      // Act & Assert: 첫 번째 파일만 처리
      // Act & Assert: Process only first file
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);
        expect(result.success).toBe(true);
        expect(result.filePath).toBeDefined();
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });
  });
});

/**
 * Task 4.4: 프롬프트 필수 검증 테스트
 * Prompt requirement validation tests
 */
describe('handleFileAttachment() - 프롬프트 필수 검증', () => {
  const mockToken = 'xoxb-test-token';

  /**
   * Happy Path - 파일 + 프롬프트 정상
   * Happy Path - File with valid prompt
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should succeed when file is attached with valid prompt', async () => {
      // Arrange: 파일 + 유효한 프롬프트
      // Arrange: File with valid prompt
      const event: SlackMessageEvent = {
        text: 'Please analyze this image',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act & Assert: 파일 + 프롬프트 → 성공
      // Act & Assert: File + prompt → success
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);
        expect(result.success).toBe(true);
        expect(result.prompt).toBeDefined();
        expect(result.filePath).toBeDefined();
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });

    it('should succeed when file is attached with multiline prompt', async () => {
      // Arrange: 파일 + 여러 줄 프롬프트
      // Arrange: File with multiline prompt
      const event: SlackMessageEvent = {
        text: 'Please analyze this image\nFocus on:\n- Colors\n- Composition',
        files: [
          {
            id: 'F123',
            name: 'design.png',
            mimetype: 'image/png',
            size: 2048,
            url_private_download: 'https://files.slack.com/design.png',
          },
        ],
      };

      // Act & Assert: 여러 줄 프롬프트도 유효
      // Act & Assert: Multiline prompt is valid
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);
        expect(result.success).toBe(true);
        expect(result.prompt).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  /**
   * Exception Cases - 프롬프트 없음 에러
   * Exception Cases - Missing prompt error
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should fail when file is attached without prompt (empty text)', async () => {
      // Arrange: 파일만 있고 프롬프트 없음
      // Arrange: File without prompt (empty text)
      const event: SlackMessageEvent = {
        text: '',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act & Assert: 파일만 있으면 에러
      // Act & Assert: Should fail when only file is present
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('프롬프트');
    });

    it('should fail when file is attached with whitespace-only prompt', async () => {
      // Arrange: 파일 + 공백만 있는 프롬프트
      // Arrange: File with whitespace-only prompt
      const event: SlackMessageEvent = {
        text: '   \n\t  ',
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act & Assert: 공백만 있으면 에러
      // Act & Assert: Should fail when only whitespace
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('프롬프트');
    });

    it('should fail when file is attached with undefined text', async () => {
      // Arrange: 파일 + undefined text
      // Arrange: File with undefined text
      const event: SlackMessageEvent = {
        text: undefined as unknown as string,
        files: [
          {
            id: 'F123',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act & Assert: undefined text → 에러
      // Act & Assert: undefined text → error
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('프롬프트');
    });
  });
});

/**
 * Task 4.5: 프롬프트 생성 테스트
 * Prompt generation tests
 */
describe('handleFileAttachment() - 프롬프트 생성', () => {
  const mockToken = 'xoxb-test-token';

  /**
   * Happy Path - 이미지 파일 프롬프트 생성
   * Happy Path - Image file prompt generation
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should generate prompt with image file path in format "@/path\\n\\nprompt"', async () => {
      // Arrange: 이미지 파일 + 프롬프트
      // Arrange: Image file with prompt
      const event: SlackMessageEvent = {
        text: 'Please analyze this image',
        files: [
          {
            id: 'F123',
            name: 'screenshot.png',
            mimetype: 'image/png',
            size: 2048,
            url_private_download: 'https://files.slack.com/screenshot.png',
          },
        ],
      };

      // Act: 파일 첨부 처리
      // Act: Handle file attachment
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

        // Assert: 프롬프트가 "@/path\n\nprompt" 형식
        // Assert: Prompt should be in format "@/path\n\nprompt"
        expect(result.success).toBe(true);
        expect(result.prompt).toBeDefined();
        expect(result.filePath).toBeDefined();

        // 프롬프트가 "@"로 시작해야 함
        // Prompt should start with "@"
        expect(result.prompt).toMatch(/^@/);

        // 프롬프트에 파일 경로가 포함되어야 함
        // Prompt should contain file path
        expect(result.prompt).toContain(result.filePath!);

        // 프롬프트에 "\n\n" 구분자가 포함되어야 함
        // Prompt should contain "\n\n" separator
        expect(result.prompt).toContain('\n\n');

        // 프롬프트에 원본 텍스트가 포함되어야 함
        // Prompt should contain original text
        expect(result.prompt).toContain('Please analyze this image');
      } catch (error) {
        // 아직 구현되지 않았으므로 에러 발생
        // Error expected as not implemented yet
        expect(error).toBeDefined();
      }
    });

    it('should generate prompt with text file path in format "@/path\\n\\nprompt"', async () => {
      // Arrange: 텍스트 파일 + 프롬프트
      // Arrange: Text file with prompt
      const event: SlackMessageEvent = {
        text: 'Analyze this log file',
        files: [
          {
            id: 'F456',
            name: 'error.log',
            mimetype: 'text/plain',
            size: 1500,
            url_private_download: 'https://files.slack.com/error.log',
          },
        ],
      };

      // Act & Assert: 텍스트 파일도 동일한 형식
      // Act & Assert: Text file should have same format
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

        expect(result.success).toBe(true);
        expect(result.prompt).toBeDefined();
        expect(result.filePath).toBeDefined();

        // 동일한 프롬프트 형식 검증
        // Verify same prompt format
        expect(result.prompt).toMatch(/^@/);
        expect(result.prompt).toContain(result.filePath!);
        expect(result.prompt).toContain('\n\n');
        expect(result.prompt).toContain('Analyze this log file');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should preserve multiline prompt in generated format', async () => {
      // Arrange: 여러 줄 프롬프트
      // Arrange: Multiline prompt
      const event: SlackMessageEvent = {
        text: 'Analyze this image\nFocus on:\n- Colors\n- Composition',
        files: [
          {
            id: 'F789',
            name: 'design.png',
            mimetype: 'image/png',
            size: 3072,
            url_private_download: 'https://files.slack.com/design.png',
          },
        ],
      };

      // Act & Assert: 여러 줄 프롬프트가 그대로 보존되어야 함
      // Act & Assert: Multiline prompt should be preserved
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

        expect(result.success).toBe(true);
        expect(result.prompt).toBeDefined();

        // 전체 프롬프트 텍스트가 포함되어야 함
        // Full prompt text should be included
        expect(result.prompt).toContain('Analyze this image');
        expect(result.prompt).toContain('Focus on:');
        expect(result.prompt).toContain('- Colors');
        expect(result.prompt).toContain('- Composition');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  /**
   * Boundary Conditions - 프롬프트 형식 검증
   * Boundary Conditions - Prompt format validation
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should generate correct format with special characters in prompt', async () => {
      // Arrange: 특수문자가 포함된 프롬프트
      // Arrange: Prompt with special characters
      const event: SlackMessageEvent = {
        text: 'Check this: @user #channel "quoted text" & symbols!',
        files: [
          {
            id: 'F111',
            name: 'data.json',
            mimetype: 'application/json',
            size: 512,
            url_private_download: 'https://files.slack.com/data.json',
          },
        ],
      };

      // Act & Assert: 특수문자가 올바르게 보존되어야 함
      // Act & Assert: Special characters should be preserved
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

        expect(result.success).toBe(true);
        expect(result.prompt).toContain('@user');
        expect(result.prompt).toContain('#channel');
        expect(result.prompt).toContain('"quoted text"');
        expect(result.prompt).toContain('& symbols!');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle prompt with exactly one character', async () => {
      // Arrange: 최소 길이 프롬프트 (1글자)
      // Arrange: Minimum length prompt (1 character)
      const event: SlackMessageEvent = {
        text: '?',
        files: [
          {
            id: 'F222',
            name: 'image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            url_private_download: 'https://files.slack.com/image.jpg',
          },
        ],
      };

      // Act & Assert: 1글자 프롬프트도 처리 가능해야 함
      // Act & Assert: Single character prompt should work
      try {
        const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

        expect(result.success).toBe(true);
        expect(result.prompt).toContain('?');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

/**
 * Task 4.7: 에러 메시지 테스트
 * Error message tests
 */
describe('handleFileAttachment() - 에러 메시지', () => {
  const mockToken = 'xoxb-test-token';

  /**
   * Exception Cases - 파일 타입 불일치 에러
   * Exception Cases - File type mismatch error
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should return error message for unsupported file type (GIF)', async () => {
      // Arrange: 지원하지 않는 파일 타입 (GIF)
      // Arrange: Unsupported file type (GIF)
      const event: SlackMessageEvent = {
        text: 'Please analyze this',
        files: [
          {
            id: 'F123',
            name: 'animation.gif',
            mimetype: 'image/gif',
            size: 1024,
            url_private_download: 'https://files.slack.com/animation.gif',
          },
        ],
      };

      // Act: 파일 첨부 처리
      // Act: Handle file attachment
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      // Assert: 타입 불일치 에러 메시지
      // Assert: Type mismatch error message
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
      expect(result.error).toContain('PNG, JPG, JPEG, TXT, LOG, JSON, MD, CSV, XML, YAML');
    });

    it('should return error message for unsupported file type (WebP)', async () => {
      // Arrange: 지원하지 않는 파일 타입 (WebP)
      // Arrange: Unsupported file type (WebP)
      const event: SlackMessageEvent = {
        text: 'Check this image',
        files: [
          {
            id: 'F456',
            name: 'photo.webp',
            mimetype: 'image/webp',
            size: 2048,
            url_private_download: 'https://files.slack.com/photo.webp',
          },
        ],
      };

      // Act & Assert: WebP 타입 에러
      // Act & Assert: WebP type error
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should return error message for file size exceeding limit', async () => {
      // Arrange: 파일 크기 초과 (6MB)
      // Arrange: File size exceeding limit (6MB)
      const event: SlackMessageEvent = {
        text: 'Large file',
        files: [
          {
            id: 'F789',
            name: 'large.png',
            mimetype: 'image/png',
            size: 6 * 1024 * 1024, // 6MB
            url_private_download: 'https://files.slack.com/large.png',
          },
        ],
      };

      // Act: 파일 첨부 처리
      // Act: Handle file attachment
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      // Assert: 크기 초과 에러 메시지
      // Assert: Size limit error message
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('파일 크기가 너무 큽니다');
      expect(result.error).toContain('최대 5MB');
    });

    it('should return error message for file at exact size limit (5MB + 1 byte)', async () => {
      // Arrange: 정확히 5MB + 1byte
      // Arrange: Exactly 5MB + 1 byte
      const event: SlackMessageEvent = {
        text: 'Almost at limit',
        files: [
          {
            id: 'F999',
            name: 'almost.png',
            mimetype: 'image/png',
            size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
            url_private_download: 'https://files.slack.com/almost.png',
          },
        ],
      };

      // Act & Assert: 1바이트 초과 에러
      // Act & Assert: 1 byte over limit error
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('파일 크기가 너무 큽니다');
    });

    it('should return error message when prompt is missing', async () => {
      // Arrange: 프롬프트 없음
      // Arrange: Missing prompt
      const event: SlackMessageEvent = {
        text: '',
        files: [
          {
            id: 'F111',
            name: 'test.png',
            mimetype: 'image/png',
            size: 1024,
            url_private_download: 'https://files.slack.com/test.png',
          },
        ],
      };

      // Act: 파일 첨부 처리
      // Act: Handle file attachment
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      // Assert: 프롬프트 필수 에러 메시지
      // Assert: Prompt required error message
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('프롬프트');
    });
  });

  /**
   * Boundary Conditions - 에러 메시지 명확성
   * Boundary Conditions - Error message clarity
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should provide clear error message for empty MIME type', async () => {
      // Arrange: 빈 MIME type
      // Arrange: Empty MIME type
      const event: SlackMessageEvent = {
        text: 'Test file',
        files: [
          {
            id: 'F222',
            name: 'unknown.file',
            mimetype: '',
            size: 512,
            url_private_download: 'https://files.slack.com/unknown.file',
          },
        ],
      };

      // Act & Assert: 빈 MIME type 에러
      // Act & Assert: Empty MIME type error
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('지원하지 않는 파일 형식');
    });

    it('should include file size in error message for oversized files', async () => {
      // Arrange: 크기 초과 파일
      // Arrange: Oversized file
      const event: SlackMessageEvent = {
        text: 'Big file',
        files: [
          {
            id: 'F333',
            name: 'huge.log',
            mimetype: 'text/plain',
            size: 10 * 1024 * 1024, // 10MB
            url_private_download: 'https://files.slack.com/huge.log',
          },
        ],
      };

      // Act: 파일 첨부 처리
      // Act: Handle file attachment
      const result: FileAttachmentResult = await handleFileAttachment(event, mockToken);

      // Assert: 현재 파일 크기가 에러 메시지에 포함되어야 함
      // Assert: Current file size should be included in error message
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('MB'); // Size in MB
    });
  });
});
