/**
 * 파일 첨부 핸들러
 * File attachment handler
 *
 * FR-1: Slack 메시지 이벤트에서 파일 첨부 감지
 * FR-4: 단일 파일만 처리 (여러 파일 중 첫 번째)
 * FR-5: 파일과 함께 프롬프트 필수
 * FR-8: 이미지 파일 처리 (PNG, JPG, JPEG)
 * FR-9: 텍스트 파일 처리 (TXT, LOG, JSON, MD, CSV, XML, YAML)
 * FR-11: 에러 메시지 (타입 불일치, 크기 초과, 다운로드 실패, 프롬프트 없음)
 */

import { getLogger } from '../utils/logger';
import {
  SlackFileInfo,
  downloadSlackFile,
  saveToTempFile,
  initTempDirectory,
} from '../utils/file-downloader';
import { validateFileType, validateFileSize } from '../utils/file-validator';

/**
 * 파일 첨부 처리 결과 인터페이스
 * File attachment processing result interface
 */
export interface FileAttachmentResult {
  success: boolean;
  prompt?: string;
  filePath?: string;
  error?: string;
}

/**
 * Slack 메시지 이벤트 인터페이스 (파일 관련)
 * Slack message event interface (file-related)
 */
export interface SlackMessageEvent {
  text: string;
  files?: SlackFileInfo[];
}

/**
 * 파일 첨부 핸들러
 * Handle file attachment
 *
 * @param event - Slack 메시지 이벤트
 * @param token - Slack Bot Token
 * @returns Promise<FileAttachmentResult>
 */
export async function handleFileAttachment(
  event: SlackMessageEvent,
  token: string
): Promise<FileAttachmentResult> {
  const logger = getLogger();
  logger.debug('Handling file attachment');

  try {
    // Step 1: 파일 첨부 감지 (FR-1)
    // Step 1: Detect file attachment (FR-1)
    if (!event.files || event.files.length === 0) {
      logger.debug('No files attached');
      return { success: false };
    }

    // Step 2: 프롬프트 필수 검증 (FR-5)
    // Step 2: Validate prompt requirement (FR-5)
    const prompt = event.text?.trim();
    if (!prompt) {
      logger.warn('파일이 첨부되었지만 프롬프트가 없습니다');
      return {
        success: false,
        error: '파일과 함께 프롬프트를 입력해주세요',
      };
    }

    // Step 3: 단일 파일 처리 - 첫 번째 파일만 (FR-4)
    // Step 3: Process single file - first one only (FR-4)
    const fileInfo = event.files[0];
    logger.info(`Processing file: ${fileInfo.name} (${fileInfo.id})`);

    // Step 4: 파일 타입 검증 (FR-2, FR-8, FR-9)
    // Step 4: Validate file type (FR-2, FR-8, FR-9)
    const typeValidation = validateFileType(fileInfo.mimetype, fileInfo.name);
    if (!typeValidation.valid) {
      logger.warn(`파일 타입 검증 실패: ${typeValidation.error}`);
      return {
        success: false,
        error: typeValidation.error,
      };
    }

    // Step 5: 파일 크기 검증 (FR-3)
    // Step 5: Validate file size (FR-3)
    const sizeValidation = validateFileSize(fileInfo.size);
    if (!sizeValidation.valid) {
      logger.warn(`파일 크기 검증 실패: ${sizeValidation.error}`);
      return {
        success: false,
        error: sizeValidation.error,
      };
    }

    // Step 6: 임시 디렉토리 초기화 (FR-7, FR-14)
    // Step 6: Initialize temporary directory (FR-7, FR-14)
    await initTempDirectory();

    // Step 7: 파일 다운로드 (FR-6)
    // Step 7: Download file (FR-6)
    logger.debug(`Downloading file from: ${fileInfo.url_private_download}`);
    const fileData = await downloadSlackFile(fileInfo, token);

    // Step 8: 임시 파일 저장 (FR-7, FR-14)
    // Step 8: Save to temporary file (FR-7, FR-14)
    const filePath = await saveToTempFile(fileData, fileInfo.name);
    logger.info(`File saved to: ${filePath}`);

    // Step 9: 프롬프트 생성 (FR-8, FR-9)
    // Step 9: Generate prompt (FR-8, FR-9)
    // 형식: @/path\n\nprompt
    // Format: @/path\n\nprompt
    const generatedPrompt = `@${filePath}\n\n${event.text}`;

    logger.info('File attachment processed successfully');
    return {
      success: true,
      prompt: generatedPrompt,
      filePath: filePath,
    };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`File attachment processing failed: ${err.message}`);
    return {
      success: false,
      error: `파일 처리 중 오류가 발생했습니다: ${err.message}`,
    };
  }
}
