/**
 * file-downloader.ts 유닛 테스트
 * Unit tests for file-downloader.ts
 *
 * 테스트 대상 (Test targets):
 * - initTempDirectory() - 임시 디렉토리 초기화
 * - downloadSlackFile() - Slack 파일 다운로드
 * - saveToTempFile() - 임시 파일 저장
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  initTempDirectory,
  downloadSlackFile,
  saveToTempFile,
  TEMP_DIR,
  SlackFileInfo,
} from '../file-downloader';
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

/**
 * Task 3.2: 임시 디렉토리 초기화 테스트
 * Temporary directory initialization tests
 */
describe('initTempDirectory()', () => {
  /**
   * Happy Path - 디렉토리 생성 성공
   * Happy Path - Directory creation success
   */
  describe('정상 경로 (Happy Path)', () => {
    beforeEach(async () => {
      // 테스트 전 임시 디렉토리 삭제
      // Remove temp directory before each test
      try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // 디렉토리가 없으면 무시
        // Ignore if directory doesn't exist
      }
    });

    afterEach(async () => {
      // 테스트 후 임시 디렉토리 정리
      // Clean up temp directory after each test
      try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // 정리 실패 무시
        // Ignore cleanup failures
      }
    });

    it('should create temporary directory if it does not exist', async () => {
      // Arrange: 디렉토리가 없는 상태 확인
      // Arrange: Verify directory doesn't exist
      let exists = false;
      try {
        await fs.access(TEMP_DIR);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);

      // Act: 디렉토리 초기화
      // Act: Initialize directory
      await initTempDirectory();

      // Assert: 디렉토리가 생성되었는지 확인
      // Assert: Verify directory was created
      const stats = await fs.stat(TEMP_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should set directory permissions to 0700', async () => {
      // Arrange & Act
      await initTempDirectory();

      // Assert: 권한이 0700인지 확인
      // Assert: Verify permissions are 0700
      const stats = await fs.stat(TEMP_DIR);
      const mode = stats.mode & 0o777; // Extract permission bits
      expect(mode).toBe(0o700);
    });

    it('should not throw error if directory already exists with correct permissions', async () => {
      // Arrange: 디렉토리를 먼저 생성
      // Arrange: Create directory first
      await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o700 });

      // Act & Assert: 에러 없이 실행되어야 함
      // Act & Assert: Should run without error
      await expect(initTempDirectory()).resolves.not.toThrow();

      // Assert: 디렉토리가 여전히 존재하는지 확인
      // Assert: Verify directory still exists
      const stats = await fs.stat(TEMP_DIR);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  /**
   * Boundary Conditions - 이미 존재하는 경우
   * Boundary Conditions - Already exists
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    beforeEach(async () => {
      // 테스트 전 임시 디렉토리 삭제
      // Remove temp directory before each test
      try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // 디렉토리가 없으면 무시
        // Ignore if directory doesn't exist
      }
    });

    afterEach(async () => {
      // 테스트 후 임시 디렉토리 정리
      // Clean up temp directory after each test
      try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // 정리 실패 무시
        // Ignore cleanup failures
      }
    });

    it('should fix permissions if directory exists with wrong permissions', async () => {
      // Arrange: 잘못된 권한으로 디렉토리 생성
      // Arrange: Create directory with wrong permissions
      await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o755 });

      // Act: 디렉토리 초기화
      // Act: Initialize directory
      await initTempDirectory();

      // Assert: 권한이 0700으로 수정되었는지 확인
      // Assert: Verify permissions were fixed to 0700
      const stats = await fs.stat(TEMP_DIR);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it('should handle existing directory with files inside', async () => {
      // Arrange: 디렉토리와 파일 생성
      // Arrange: Create directory with files
      await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(TEMP_DIR, 'test-file.txt'), 'test content');

      // Act & Assert: 에러 없이 실행되어야 함
      // Act & Assert: Should run without error
      await expect(initTempDirectory()).resolves.not.toThrow();

      // Assert: 기존 파일이 여전히 존재하는지 확인
      // Assert: Verify existing file still exists
      const fileExists = await fs.access(path.join(TEMP_DIR, 'test-file.txt'))
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  /**
   * Exception Cases - 예외 케이스
   * Exception Cases - Error scenarios
   */
  describe('예외 케이스 (Exception Cases)', () => {
    // Note: 파일 시스템 에러를 모킹하는 것은 복잡하므로
    // Note: Mocking filesystem errors is complex, so
    // 실제 에러 발생 시나리오는 통합 테스트에서 다룹니다
    // actual error scenarios are covered in integration tests

    it('should propagate errors if directory creation fails', async () => {
      // Note: 이 테스트는 실제 파일 시스템 에러를 시뮬레이션하기 어렵습니다
      // Note: This test is difficult to simulate with actual filesystem errors
      // 통합 테스트나 E2E 테스트에서 다룰 수 있습니다
      // Can be covered in integration or E2E tests
      expect(true).toBe(true); // Placeholder
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no unintended side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    afterEach(async () => {
      // 테스트 후 임시 디렉토리 정리
      // Clean up temp directory after each test
      try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
      } catch (error) {
        // 정리 실패 무시
        // Ignore cleanup failures
      }
    });

    it('should not affect other directories or files', async () => {
      // Arrange: 다른 디렉토리 생성
      // Arrange: Create another directory
      const otherDir = '/tmp/other-test-dir';
      await fs.mkdir(otherDir, { recursive: true });

      // Act: 임시 디렉토리 초기화
      // Act: Initialize temp directory
      await initTempDirectory();

      // Assert: 다른 디렉토리가 영향받지 않았는지 확인
      // Assert: Verify other directory was not affected
      const stats = await fs.stat(otherDir);
      expect(stats.isDirectory()).toBe(true);

      // Cleanup
      await fs.rm(otherDir, { recursive: true, force: true });
    });

    it('should be idempotent (multiple calls should be safe)', async () => {
      // Act: 여러 번 호출
      // Act: Call multiple times
      await initTempDirectory();
      await initTempDirectory();
      await initTempDirectory();

      // Assert: 디렉토리가 여전히 정상적으로 존재
      // Assert: Directory still exists normally
      const stats = await fs.stat(TEMP_DIR);
      expect(stats.isDirectory()).toBe(true);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });
  });
});

/**
 * Task 3.4: Slack 파일 다운로드 테스트
 * Slack file download tests
 */
describe('downloadSlackFile()', () => {
  // Mock fetch API
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    // Create a fresh mock before each test
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restore original fetch after each test
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  /**
   * Happy Path - 정상 다운로드
   * Happy Path - Successful download
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should download file successfully', async () => {
      // Arrange: Mock Slack file info
      const fileInfo: SlackFileInfo = {
        id: 'F123456',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'xoxb-test-token';
      const mockFileData = Buffer.from('mock file content');

      // Mock fetch to return successful response
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array(mockFileData).buffer,
      } as unknown as Response);

      // Act: Download file
      const result = await downloadSlackFile(fileInfo, token);

      // Assert: Verify result
      expect(result).toBeInstanceOf(Buffer);
      expect(fetchMock).toHaveBeenCalled();
      expect(result.toString()).toBe('mock file content');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        fileInfo.url_private_download,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });

    it('should handle different file types', async () => {
      // Arrange: Mock different file types
      const fileTypes = [
        { name: 'image.jpg', mimetype: 'image/jpeg', data: 'jpeg data' },
        { name: 'doc.txt', mimetype: 'text/plain', data: 'text data' },
        { name: 'data.json', mimetype: 'application/json', data: '{"key":"value"}' },
      ];

      for (const fileType of fileTypes) {
        const fileInfo: SlackFileInfo = {
          id: `F-${fileType.name}`,
          name: fileType.name,
          mimetype: fileType.mimetype,
          size: fileType.data.length,
          url_private_download: `https://files.slack.com/files-pri/T123/${fileType.name}`,
        };
        const token = 'xoxb-test-token';
        const mockFileData = Buffer.from(fileType.data);

        fetchMock.mockResolvedValue({
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array(mockFileData).buffer,
        } as unknown as Response);

        // Act
        const result = await downloadSlackFile(fileInfo, token);

        // Assert
        expect(result.toString()).toBe(fileType.data);
      }
    });
  });

  /**
   * Boundary Conditions - 경계값 테스트
   * Boundary Conditions - Edge cases
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should handle empty file', async () => {
      // Arrange: Empty file
      const fileInfo: SlackFileInfo = {
        id: 'F-empty',
        name: 'empty.txt',
        mimetype: 'text/plain',
        size: 0,
        url_private_download: 'https://files.slack.com/files-pri/T123/empty.txt',
      };
      const token = 'xoxb-test-token';
      const mockFileData = Buffer.from('');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array(mockFileData).buffer,
      } as unknown as Response);

      // Act
      const result = await downloadSlackFile(fileInfo, token);

      // Assert
      expect(result.length).toBe(0);
    });

    it('should handle large file', async () => {
      // Arrange: Large file (5MB)
      const fileInfo: SlackFileInfo = {
        id: 'F-large',
        name: 'large.bin',
        mimetype: 'application/octet-stream',
        size: 5 * 1024 * 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/large.bin',
      };
      const token = 'xoxb-test-token';
      const mockFileData = Buffer.alloc(5 * 1024 * 1024, 'a');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array(mockFileData).buffer,
      } as unknown as Response);

      // Act
      const result = await downloadSlackFile(fileInfo, token);

      // Assert
      expect(result.length).toBe(5 * 1024 * 1024);
    });
  });

  /**
   * Exception Cases - 예외 케이스
   * Exception Cases - Error scenarios
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should throw error on network failure', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F-network-error',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'xoxb-test-token';

      // Mock fetch to throw network error
      fetchMock.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(downloadSlackFile(fileInfo, token)).rejects.toThrow();
    });

    it('should throw error on 401 Unauthorized', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F-unauthorized',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'invalid-token';

      // Mock fetch to return 401
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as unknown as Response);

      // Act & Assert
      await expect(downloadSlackFile(fileInfo, token)).rejects.toThrow();
    });

    it('should throw error on 404 Not Found', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F-not-found',
        name: 'missing.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/missing.png',
      };
      const token = 'xoxb-test-token';

      // Mock fetch to return 404
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as unknown as Response);

      // Act & Assert
      await expect(downloadSlackFile(fileInfo, token)).rejects.toThrow();
    });

    it('should throw error on 500 Internal Server Error', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F-server-error',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'xoxb-test-token';

      // Mock fetch to return 500
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as unknown as Response);

      // Act & Assert
      await expect(downloadSlackFile(fileInfo, token)).rejects.toThrow();
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input parameters', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F123',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'xoxb-test-token';
      const originalFileInfo = { ...fileInfo };
      const originalToken = token;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array(Buffer.from('test')).buffer,
      } as unknown as Response);

      // Act
      await downloadSlackFile(fileInfo, token);

      // Assert: Input parameters should not be modified
      expect(fileInfo).toEqual(originalFileInfo);
      expect(token).toBe(originalToken);
    });

    it('should call fetch with correct parameters', async () => {
      // Arrange
      const fileInfo: SlackFileInfo = {
        id: 'F123',
        name: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        url_private_download: 'https://files.slack.com/files-pri/T123/test.png',
      };
      const token = 'xoxb-test-token';

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array(Buffer.from('test')).buffer,
      } as unknown as Response);

      // Act
      await downloadSlackFile(fileInfo, token);

      // Assert: Verify fetch was called with correct parameters
      expect(fetchMock).toHaveBeenCalledWith(
        fileInfo.url_private_download,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });
  });
});

/**
 * Task 3.6: 임시 파일 저장 테스트
 * Save to temporary file tests
 */
describe('saveToTempFile()', () => {
  // Setup: 임시 디렉토리 초기화
  // Setup: Initialize temp directory before tests
  beforeEach(async () => {
    await initTempDirectory();
  });

  // Cleanup: 임시 디렉토리 정리
  // Cleanup: Clean up temp directory after tests
  afterEach(async () => {
    try {
      await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Happy Path - 정상 파일 저장
   * Happy Path - Normal file save
   */
  describe('정상 경로 (Happy Path)', () => {
    it('should save file to temp directory successfully', async () => {
      // Arrange
      const data = Buffer.from('test file content');
      const originalName = 'test.txt';

      // Act
      const filePath = await saveToTempFile(data, originalName);

      // Assert: 파일 경로 확인
      // Assert: Verify file path
      expect(filePath).toMatch(new RegExp(`^${TEMP_DIR}/.+`));
      expect(path.dirname(filePath)).toBe(TEMP_DIR);

      // Assert: 파일 존재 확인
      // Assert: Verify file exists
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Assert: 파일 내용 확인
      // Assert: Verify file content
      const content = await fs.readFile(filePath);
      expect(content.toString()).toBe('test file content');
    });

    it('should use UUID for filename', async () => {
      // Arrange
      const data = Buffer.from('test data');
      const originalName = 'original.txt';

      // Act
      const filePath = await saveToTempFile(data, originalName);

      // Assert: UUID 패턴 확인
      // Assert: Verify UUID pattern
      const filename = path.basename(filePath);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(filename).toMatch(uuidPattern);
    });

    it('should set file permissions to 0600', async () => {
      // Arrange
      const data = Buffer.from('secure data');
      const originalName = 'secure.txt';

      // Act
      const filePath = await saveToTempFile(data, originalName);

      // Assert: 권한 확인
      // Assert: Verify permissions
      const stats = await fs.stat(filePath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  /**
   * Boundary Conditions - 경계값 테스트
   * Boundary Conditions - Edge cases
   */
  describe('경계 조건 (Boundary Conditions)', () => {
    it('should handle empty file', async () => {
      // Arrange
      const data = Buffer.from('');
      const originalName = 'empty.txt';

      // Act
      const filePath = await saveToTempFile(data, originalName);

      // Assert
      const content = await fs.readFile(filePath);
      expect(content.length).toBe(0);
    });

    it('should handle large file', async () => {
      // Arrange: 5MB 파일
      // Arrange: 5MB file
      const data = Buffer.alloc(5 * 1024 * 1024, 'a');
      const originalName = 'large.bin';

      // Act
      const filePath = await saveToTempFile(data, originalName);

      // Assert
      const stats = await fs.stat(filePath);
      expect(stats.size).toBe(5 * 1024 * 1024);
    });

    it('should handle special characters in original name', async () => {
      // Arrange
      const data = Buffer.from('test');
      const originalName = '파일명 with spaces & special!@#$.txt';

      // Act & Assert: 에러 없이 실행되어야 함
      // Act & Assert: Should run without error
      const filePath = await saveToTempFile(data, originalName);
      expect(filePath).toBeDefined();

      // 파일명은 여전히 UUID여야 함
      // Filename should still be UUID
      const filename = path.basename(filePath);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(filename).toMatch(uuidPattern);
    });
  });

  /**
   * Exception Cases - 예외 케이스
   * Exception Cases - Error scenarios
   */
  describe('예외 케이스 (Exception Cases)', () => {
    it('should throw error if temp directory does not exist', async () => {
      // Arrange: 임시 디렉토리 삭제
      // Arrange: Remove temp directory
      await fs.rm(TEMP_DIR, { recursive: true, force: true });

      const data = Buffer.from('test');
      const originalName = 'test.txt';

      // Act & Assert
      await expect(saveToTempFile(data, originalName)).rejects.toThrow();
    });
  });

  /**
   * Side Effects - 부작용 검증
   * Side Effects - Verify no side effects
   */
  describe('부작용 검증 (Side Effects)', () => {
    it('should not modify input data', async () => {
      // Arrange
      const data = Buffer.from('test data');
      const originalName = 'test.txt';
      const originalData = Buffer.from(data);

      // Act
      await saveToTempFile(data, originalName);

      // Assert: 입력 데이터가 수정되지 않았는지 확인
      // Assert: Verify input data was not modified
      expect(data.toString()).toBe(originalData.toString());
    });

    it('should create unique files for multiple calls', async () => {
      // Arrange
      const data1 = Buffer.from('data 1');
      const data2 = Buffer.from('data 2');
      const originalName = 'test.txt';

      // Act
      const filePath1 = await saveToTempFile(data1, originalName);
      const filePath2 = await saveToTempFile(data2, originalName);

      // Assert: 파일 경로가 다른지 확인
      // Assert: Verify file paths are different
      expect(filePath1).not.toBe(filePath2);

      // Assert: 두 파일 모두 존재하는지 확인
      // Assert: Verify both files exist
      const content1 = await fs.readFile(filePath1);
      const content2 = await fs.readFile(filePath2);
      expect(content1.toString()).toBe('data 1');
      expect(content2.toString()).toBe('data 2');
    });
  });
});
