/**
 * 파일 다운로드 핸들러
 * File download handler
 *
 * 이 모듈은 프로젝트 파일을 Slack으로 다운로드하는 기능을 제공합니다.
 * - 파일 경로 보안 검증
 * - Slack files.uploadV2 API를 통한 파일 업로드
 * - 에러 처리 및 사용자 피드백
 */

import { App } from '@slack/bolt';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '../utils/logger';
import { validateFilePath } from '../utils/file-security';
import { ChannelConfig } from '../types';
import { addInteractiveButtons } from '../bot/formatters';

/**
 * 파일 다운로드 핸들러
 * Handle file download request
 *
 * @param app - Slack Bolt App 인스턴스
 * @param channelId - Slack 채널 ID
 * @param channelConfig - 채널 설정 (프로젝트 경로 포함)
 * @param filePath - 다운로드할 파일 경로 (사용자 입력)
 * @returns Promise<void>
 *
 * 동작 순서:
 * 1. 채널 설정 존재 여부 확인
 * 2. validateFilePath()로 파일 경로 보안 검증
 * 3. 검증 실패 시 Slack 에러 메시지 전송 및 종료
 * 4. 작업 시작 메시지 전송 ("⏳ 파일을 다운로드하는 중입니다...")
 * 5. fs.createReadStream()으로 파일 스트림 생성
 * 6. Slack files.uploadV2() API 호출하여 파일 업로드
 * 7. 업로드 성공 시 완료 메시지 전송 ("✅ 파일 다운로드 완료")
 * 8. 에러 발생 시 적절한 에러 메시지 전송 및 로깅
 */
export async function handleFileDownload(
  app: App,
  channelId: string,
  channelConfig: ChannelConfig,
  filePath: string
): Promise<void> {
  const logger = getLogger();

  try {
    // 1. 채널 설정 존재 여부 확인
    // 방어적 프로그래밍: channelConfig와 projectPath 검증
    if (!channelConfig || !channelConfig.projectPath) {
      logger.error('Channel config or projectPath is missing');
      await app.client.chat.postMessage({
        channel: channelId,
        blocks: addInteractiveButtons('⚠️ 채널 설정을 찾을 수 없습니다. 먼저 `/setup` 명령으로 프로젝트를 설정해주세요.'),
      });
      return;
    }

    // 1.5. Bot이 채널에 참여했는지 확인하고, 없으면 자동 참여
    try {
      await app.client.conversations.join({
        channel: channelId,
      });
      logger.debug(`Bot joined channel: ${channelId}`);
    } catch (joinError: any) {
      // already_in_channel 에러는 무시 (이미 참여 중)
      if (joinError.data?.error !== 'already_in_channel') {
        logger.warn(`Failed to join channel ${channelId}: ${joinError.data?.error || joinError.message}`);
      }
    }

    logger.info(`File download requested: ${filePath} (Project: ${channelConfig.projectName})`);

    // 2. 파일 경로 보안 검증
    // validateFilePath()로 경로 유효성 검사
    const validation = validateFilePath(channelConfig.projectPath, filePath);

    // 3. 검증 실패 시 에러 메시지 전송 및 종료
    if (!validation.valid) {
      logger.warn(`File validation failed: ${validation.error}`);
      await app.client.chat.postMessage({
        channel: channelId,
        blocks: addInteractiveButtons(validation.error || '❌ 파일 경로 검증에 실패했습니다.'),
      });
      return;
    }

    // 검증된 절대 경로 사용
    const resolvedPath = validation.resolvedPath!;
    logger.info(`File path validated: ${resolvedPath}`);

    // 3.5. 파일 존재 여부 확인
    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`File does not exist: ${resolvedPath}`);
      await app.client.chat.postMessage({
        channel: channelId,
        blocks: addInteractiveButtons(`❌ 파일을 찾을 수 없습니다.\n파일: \`${filePath}\`\n\n경로를 확인해주세요.`),
      });
      return;
    }

    // 3.6. 파일인지 확인 (디렉토리가 아닌지)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      logger.warn(`Path is not a file: ${resolvedPath}`);
      await app.client.chat.postMessage({
        channel: channelId,
        blocks: addInteractiveButtons(`❌ 지정한 경로가 파일이 아닙니다.\n경로: \`${filePath}\`\n\n파일 경로를 입력해주세요.`),
      });
      return;
    }

    // 4. 작업 시작 메시지 전송
    await app.client.chat.postMessage({
      channel: channelId,
      blocks: addInteractiveButtons(`⏳ 파일을 다운로드하는 중입니다...\n파일: \`${filePath}\``),
    });

    // 5. 파일 스트림 생성
    const fileStream = fs.createReadStream(resolvedPath);
    const fileName = path.basename(resolvedPath);
    logger.debug(`File stream created: ${fileName}`);

    // 6. Slack files.uploadV2() API 호출
    const uploadResult = await app.client.files.uploadV2({
      channel_id: channelId,
      file: fileStream,
      filename: fileName,
      title: `${channelConfig.projectName}: ${filePath}`,
      initial_comment: `📎 요청하신 파일입니다: \`${filePath}\``,
    });

    logger.info(`File uploaded successfully: ${fileName} (upload_id: ${(uploadResult as any).file?.id || 'unknown'})`);

    // 7. 업로드 성공 메시지 전송
    await app.client.chat.postMessage({
      channel: channelId,
      blocks: addInteractiveButtons(`✅ 파일 다운로드 완료\n파일: \`${fileName}\``),
    });
  } catch (error) {
    // 8. 에러 타입별 처리 및 로깅
    logger.error(`File download error: ${error}`);

    let errorMessage = '❌ 파일 다운로드 중 오류가 발생했습니다.';

    if (error instanceof Error) {
      // 파일 없음 오류 (ENOENT)
      if ('code' in error && error.code === 'ENOENT') {
        logger.error(`File not found: ${error.message}`);
        errorMessage = `❌ 파일을 찾을 수 없습니다.\n파일: \`${filePath}\`\n\n경로를 확인해주세요.`;
      }
      // 파일 읽기 권한 오류 (EACCES, EPERM)
      else if ('code' in error && (error.code === 'EACCES' || error.code === 'EPERM')) {
        logger.error(`File permission error: ${error.message}`);
        errorMessage = `❌ 파일 읽기 권한이 없습니다.\n파일: \`${filePath}\``;
      }
      // Slack API 업로드 실패
      else if (error.message.includes('slack') || error.message.includes('upload')) {
        logger.error(`Slack upload error: ${error.message}`);
        errorMessage = `❌ 파일 업로드에 실패했습니다.\n오류: ${error.message}`;
      }
      // 기타 에러
      else {
        logger.error(`Unexpected error: ${error.message}`);
        errorMessage = `❌ 파일 다운로드 중 오류가 발생했습니다.\n오류: ${error.message}`;
      }
    } else {
      logger.error(`Unknown error type: ${String(error)}`);
      errorMessage = `❌ 파일 다운로드 중 알 수 없는 오류가 발생했습니다.`;
    }

    await app.client.chat.postMessage({
      channel: channelId,
      blocks: addInteractiveButtons(errorMessage),
    });
  }
}
