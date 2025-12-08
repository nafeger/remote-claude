/**
 * 파일 다운로드 유틸리티
 * File download utility
 *
 * FR-6: Slack 파일 다운로드 (url_private_download)
 * FR-7: 임시 디렉토리 저장 (/tmp/remote-claude/)
 * FR-14: 파일 권한 관리 (디렉토리 0700, 파일 0600)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getLogger } from './logger';

/**
 * 임시 디렉토리 경로
 * Temporary directory path
 */
export const TEMP_DIR = '/tmp/remote-claude';

/**
 * 파일 다운로드 결과 인터페이스
 * File download result interface
 */
export interface FileDownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Slack 파일 정보 인터페이스
 * Slack file information interface
 */
export interface SlackFileInfo {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  url_private_download: string;
}

/**
 * 임시 디렉토리 초기화
 * Initialize temporary directory
 *
 * - 디렉토리 생성: /tmp/remote-claude/
 * - 권한 설정: 0700 (rwx------)
 * - 이미 존재하는 경우: 권한만 확인/수정
 *
 * @returns Promise<void>
 * @throws Error if directory creation or permission setting fails
 */
export async function initTempDirectory(): Promise<void> {
  const logger = getLogger();
  logger.debug(`Initializing temporary directory: ${TEMP_DIR}`);

  try {
    // 디렉토리가 존재하는지 확인
    // Check if directory exists
    try {
      const stats = await fs.stat(TEMP_DIR);
      if (stats.isDirectory()) {
        logger.debug(`Directory already exists: ${TEMP_DIR}`);
        // 디렉토리가 존재하면 권한만 확인/수정
        // If directory exists, check/fix permissions
        await fs.chmod(TEMP_DIR, 0o700);
        logger.debug(`Directory permissions set to 0700: ${TEMP_DIR}`);
        return;
      }
    } catch (error: unknown) {
      // 디렉토리가 없으면 생성 진행
      // If directory doesn't exist, proceed to create
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // ENOENT가 아닌 다른 에러는 재발생
        // Re-throw if error is not ENOENT
        throw error;
      }
    }

    // 디렉토리 생성
    // Create directory
    await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o700 });
    logger.info(`Temporary directory created: ${TEMP_DIR}`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to initialize temporary directory: ${err.message}`);
    throw error;
  }
}

/**
 * Slack 파일 다운로드
 * Download Slack file
 *
 * @param fileInfo - Slack 파일 정보
 * @param token - Slack Bot Token
 * @returns Promise<Buffer> - 다운로드된 파일 데이터
 * @throws Error if download fails
 */
export async function downloadSlackFile(
  fileInfo: SlackFileInfo,
  token: string
): Promise<Buffer> {
  const logger = getLogger();
  logger.debug(`Downloading Slack file: ${fileInfo.name} (${fileInfo.id})`);

  try {
    // Slack API 호출: url_private_download 사용
    // Call Slack API: use url_private_download
    const response = await fetch(fileInfo.url_private_download, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // HTTP 에러 체크
    // Check for HTTP errors
    if (!response.ok) {
      const error = `Failed to download file: ${response.status} ${response.statusText}`;
      logger.error(error);
      throw new Error(error);
    }

    // 파일 데이터 읽기
    // Read file data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info(`File downloaded successfully: ${fileInfo.name} (${buffer.length} bytes)`);
    return buffer;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to download Slack file ${fileInfo.name}: ${err.message}`);
    throw error;
  }
}

/**
 * 임시 파일 저장
 * Save to temporary file
 *
 * - 파일명: UUID 생성
 * - 권한: 0600 (rw-------)
 * - 위치: /tmp/remote-claude/
 *
 * @param data - 파일 데이터
 * @param originalName - 원본 파일명 (로깅용)
 * @returns Promise<string> - 저장된 파일 경로
 * @throws Error if save fails
 */
export async function saveToTempFile(
  data: Buffer,
  originalName: string
): Promise<string> {
  const logger = getLogger();
  logger.debug(`Saving temporary file: ${originalName}`);

  try {
    // UUID 파일명 생성
    // Generate UUID filename
    const filename = randomUUID();
    const filePath = path.join(TEMP_DIR, filename);

    // 파일 저장
    // Save file
    await fs.writeFile(filePath, data, { mode: 0o600 });

    logger.info(`Temporary file saved: ${filePath} (${data.length} bytes)`);
    return filePath;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to save temporary file ${originalName}: ${err.message}`);
    throw error;
  }
}
