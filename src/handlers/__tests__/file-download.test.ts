/**
 * file-download.ts 유닛 테스트
 * Unit tests for file-download.ts
 *
 * 테스트 대상 (Test targets):
 * - handleFileDownload() - 파일 다운로드 핸들러
 */

import { handleFileDownload } from '../file-download';
import { initLogger, clearLoggerInstance } from '../../utils/logger';
import { LogLevel } from '../../types';
import { ChannelConfig } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * blocks 형식의 메시지에서 텍스트 내용을 확인하는 헬퍼 함수
 */
function expectBlocksContaining(text: string) {
  return expect.objectContaining({
    channel: expect.any(String),
    blocks: expect.arrayContaining([
      expect.objectContaining({
        type: 'section',
        text: expect.objectContaining({
          type: 'mrkdwn',
          text: expect.stringContaining(text),
        }),
      }),
    ]),
  });
}

// Slack App Mock 타입 정의
interface MockSlackApp {
  client: {
    chat: {
      postMessage: jest.Mock;
    };
    files: {
      uploadV2: jest.Mock;
    };
  };
}

// Logger 초기화
beforeAll(() => {
  initLogger(LogLevel.ERROR);
});

// Logger 정리
afterAll(() => {
  clearLoggerInstance();
});

describe('handleFileDownload()', () => {
  // 테스트 픽스처 변수
  let testDir: string;
  let projectDir: string;
  let mockApp: MockSlackApp;
  let channelConfig: ChannelConfig;
  const channelId = 'C12345TEST';

  /**
   * 테스트 환경 설정
   */
  beforeEach(() => {
    // 임시 테스트 디렉토리 생성
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-download-test-'));
    projectDir = path.join(testDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });

    // Mock Slack App 설정
    mockApp = {
      client: {
        chat: {
          postMessage: jest.fn().mockResolvedValue({ ok: true }),
        },
        files: {
          uploadV2: jest.fn().mockImplementation((options: any) => {
            // 파일 스트림을 즉시 소비하여 정리 문제 방지
            if (options.file && typeof options.file.read === 'function') {
              options.file.resume(); // 스트림 소비
            }
            return Promise.resolve({
              ok: true,
              file: { id: 'F12345' },
            });
          }),
        },
      },
    };

    // ChannelConfig 설정
    channelConfig = {
      channelId: channelId,
      projectName: 'test-project',
      projectPath: projectDir,
      tmuxSession: 'test-session',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  });

  /**
   * 테스트 후 정리
   */
  afterEach(async () => {
    // Mock 초기화
    jest.clearAllMocks();

    // 파일 스트림이 완료될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 100));

    // 테스트 디렉토리 삭제
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * 테스트 파일 생성 헬퍼
   */
  function createTestFile(relativePath: string, content: string = 'test content'): string {
    const fullPath = path.join(projectDir, relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);
    return fullPath;
  }

  describe('Happy Path Tests', () => {
    it('should successfully download a valid file', async () => {
      // Arrange: 테스트 파일 생성
      const testFile = 'test.txt';
      createTestFile(testFile, 'Hello, World!');

      // Act: handleFileDownload 호출
      await handleFileDownload(mockApp as any, channelId, channelConfig, testFile);

      // Assert: 작업 시작 메시지 전송 확인
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('⏳ 파일을 다운로드하는 중입니다')
      );

      // Assert: files.uploadV2 호출 확인
      expect(mockApp.client.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          channel_id: channelId,
          filename: 'test.txt',
          title: 'test-project: test.txt',
          initial_comment: expect.stringContaining('📎 요청하신 파일입니다'),
        })
      );

      // Assert: 완료 메시지 전송 확인
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('✅ 파일 다운로드 완료')
      );

      // Assert: 총 3번 호출 (시작 메시지 + 완료 메시지)
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle nested file paths correctly', async () => {
      // Arrange: 중첩된 경로에 파일 생성
      const testFile = 'src/utils/helper.js';
      createTestFile(testFile, 'module.exports = {};');

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, testFile);

      // Assert: files.uploadV2가 올바른 파일명으로 호출됨
      expect(mockApp.client.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'helper.js',
          title: 'test-project: src/utils/helper.js',
        })
      );
    });
  });

  describe('Exception Cases Tests', () => {
    it('should handle missing channel config', async () => {
      // Arrange: channelConfig를 null로 설정
      const invalidConfig = null as any;

      // Act
      await handleFileDownload(mockApp as any, channelId, invalidConfig, 'test.txt');

      // Assert: 에러 메시지 전송 확인
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('채널 설정을 찾을 수 없습니다')
      );

      // Assert: files.uploadV2는 호출되지 않음
      expect(mockApp.client.files.uploadV2).not.toHaveBeenCalled();
    });

    it('should handle validation failure (path traversal)', async () => {
      // Arrange: Path traversal 시도
      const maliciousPath = '../../etc/passwd';

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, maliciousPath);

      // Assert: 검증 실패 메시지 전송
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('프로젝트 디렉토리 외부 파일은 접근할 수 없습니다')
      );

      // Assert: files.uploadV2는 호출되지 않음
      expect(mockApp.client.files.uploadV2).not.toHaveBeenCalled();
    });

    it('should handle validation failure (sensitive file)', async () => {
      // Arrange: 민감한 파일 생성
      createTestFile('.env', 'SECRET_KEY=test');

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, '.env');

      // Assert: 보안 에러 메시지 전송
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('보안상 민감한 파일은 다운로드할 수 없습니다')
      );

      // Assert: files.uploadV2는 호출되지 않음
      expect(mockApp.client.files.uploadV2).not.toHaveBeenCalled();
    });

    it('should handle non-existent file', async () => {
      // Arrange: 존재하지 않는 파일 경로
      const nonExistentFile = 'does-not-exist.txt';

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, nonExistentFile);

      // Assert: 파일 없음 에러 메시지
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('파일을 찾을 수 없습니다')
      );

      // Assert: files.uploadV2는 호출되지 않음
      expect(mockApp.client.files.uploadV2).not.toHaveBeenCalled();
    });

    it('should handle Slack API upload failure', async () => {
      // Arrange: 파일 생성
      createTestFile('test.txt', 'content');

      // Arrange: files.uploadV2 실패 Mock
      mockApp.client.files.uploadV2.mockRejectedValueOnce(
        new Error('slack_api_error: upload failed')
      );

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, 'test.txt');

      // Assert: 업로드 실패 에러 메시지
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('파일 업로드에 실패했습니다')
      );
    });

    // Note: 파일 권한 테스트는 macOS/Linux 환경에서 일관성이 없어 제거
    // File permission errors are better tested through integration tests
  });

  describe('Edge Cases Tests', () => {
    it('should handle empty file path', async () => {
      // Act: 빈 경로 (실제로는 index.ts에서 처리되지만 방어적 테스트)
      await handleFileDownload(mockApp as any, channelId, channelConfig, '');

      // Assert: 검증 실패 메시지
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('파일 경로를 입력해주세요')
      );
    });

    it('should handle directory path', async () => {
      // Arrange: 디렉토리 생성
      const dirPath = 'src';
      fs.mkdirSync(path.join(projectDir, dirPath), { recursive: true });

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, dirPath);

      // Assert: 디렉토리 에러 메시지
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('디렉토리는 다운로드할 수 없습니다')
      );
    });

    it('should handle file size exceeding limit', async () => {
      // Arrange: 10MB + 1 byte 파일 생성
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const testFile = 'large-file.bin';
      const content = Buffer.alloc(MAX_FILE_SIZE + 1, 'a');

      const fullPath = path.join(projectDir, testFile);
      fs.writeFileSync(fullPath, content);

      // Act
      await handleFileDownload(mockApp as any, channelId, channelConfig, testFile);

      // Assert: 크기 초과 에러 메시지
      expect(mockApp.client.chat.postMessage).toHaveBeenCalledWith(
        expectBlocksContaining('파일 크기가 제한을 초과했습니다')
      );
    });
  });
});
