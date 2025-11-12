/**
 * 인터랙티브 버튼 UI 핸들러
 * Interactive button UI handlers
 *
 * Slack 메시지에 버튼을 추가하여 빠른 작업 실행을 지원합니다.
 * Adds buttons to Slack messages for quick action execution.
 */

import { App, BlockAction, ButtonAction } from '@slack/bolt';
import { StateManager } from '../state/manager';
import { capturePane, sendEnter, sendArrowKey, sessionExists, createSession } from '../tmux/executor';
import { getLogger } from '../utils/logger';
import { ConfigStore } from '../config/store';
import { JobQueue } from '../queue/queue';
import { JobOrchestrator } from '../queue/orchestrator';
import { processCaptureResult } from '../tmux/parser';
import { handleFileDownload } from '../handlers/file-download';

/**
 * 빠른 작업 버튼 생성
 * Create quick action buttons
 *
 * 9개 버튼으로 구성:
 * - 첫 번째 행 (3개): 📊 상태 확인, 📥 파일 다운로드, 🚫 작업 취소
 * - 두 번째 행 (6개): ⏎ 엔터, ⏎⏎ 엔터*2, ↑, ↓, ←, →
 *
 * @returns Slack Block Kit 버튼 블록 배열
 */
export function createQuickActionButtons() {
  return [
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📊 상태 확인',
          },
          action_id: 'quick_state',
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📥 파일 다운로드',
          },
          action_id: 'quick_download',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🚫 작업 취소',
          },
          action_id: 'cancel_job',
          style: 'danger',
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⏎ 엔터',
          },
          action_id: 'send_enter',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⏎⏎ 엔터*2',
          },
          action_id: 'send_enter_twice',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '↑',
          },
          action_id: 'send_up',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '↓',
          },
          action_id: 'send_down',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '←',
          },
          action_id: 'send_left',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '→',
          },
          action_id: 'send_right',
        },
      ],
    },
  ];
}

/**
 * "📊 상태 확인" 버튼 핸들러
 * "📊 Check Status" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 * @param stateManager - StateManager 인스턴스
 * @param jobQueue - JobQueue 인스턴스
 */
export async function handleQuickState(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore,
  stateManager: StateManager,
  jobQueue: JobQueue
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ **설정되지 않은 채널**\n\n' +
          '이 채널은 아직 프로젝트에 연결되지 않았습니다.\n' +
          '먼저 `/setup <project-name> <project-path>` 명령어로 채널을 설정하세요.\n\n' +
          'ℹ️  도움말: `/help` 명령어로 사용 가능한 명령어를 확인하세요.',
      });
      return;
    }

    // 채널 정보 가져오기
    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 정보를 가져올 수 없습니다.',
      });
      return;
    }

    // 상태 메시지 생성
    let statusMessage = '📊 **채널 상태**\n\n';

    // 프로젝트 정보
    statusMessage += `**프로젝트**: ${channelConfig.projectName}\n`;
    statusMessage += `**경로**: \`${channelConfig.projectPath}\`\n`;
    statusMessage += `**tmux 세션**: \`${channelConfig.tmuxSession}\`\n`;
    statusMessage += `**생성 시간**: ${new Date(channelConfig.createdAt).toLocaleString('ko-KR')}\n`;
    statusMessage += `**마지막 사용**: ${new Date(channelConfig.lastUsed).toLocaleString('ko-KR')}\n`;

    // 작업 큐 상태
    const queueSummary = jobQueue.getQueueSummary(channelId);
    statusMessage += '\n📋 **작업 큐 상태**\n\n';
    statusMessage += `**대기 중**: ${queueSummary.pending}개\n`;
    statusMessage += `**실행 중**: ${queueSummary.running}개\n`;
    statusMessage += `**완료**: ${queueSummary.completed}개\n`;
    statusMessage += `**실패**: ${queueSummary.failed}개\n`;
    statusMessage += `**취소**: ${queueSummary.cancelled}개\n`;

    // 세션 상태
    const session = stateManager.getSession(channelId);
    if (session?.isWaitingForResponse) {
      statusMessage += '\n⚠️  **대화형 응답 대기 중**\n';
      statusMessage += `타임아웃: ${session.timeoutAt ? new Date(session.timeoutAt).toLocaleString('ko-KR') : 'N/A'}\n`;
    }

    // Claude Code 화면 캡처 (최근 80줄)
    statusMessage += '\n🖥️  **Claude Code 현재 화면**\n\n';
    try {
      const lineCount = 80;
      const scrollbackLines = Math.max(300, Math.min(lineCount * 10, 2000));

      // tmux 세션 존재 여부 확인
      const sessionExistsResult = await sessionExists(channelConfig.tmuxSession);

      if (!sessionExistsResult) {
        // tmux 세션이 없으면 자동 생성
        logger.info(`tmux session not found, creating: ${channelConfig.tmuxSession}`);
        const createResult = await createSession(channelConfig.tmuxSession, channelConfig.projectPath);

        if (!createResult.success) {
          statusMessage += `⚠️ tmux 세션이 존재하지 않아 생성을 시도했으나 실패했습니다.\n\n`;
          statusMessage += `\`${channelConfig.tmuxSession}\` 세션을 수동으로 생성하거나 \`/setup\` 명령어를 다시 실행하세요.`;
        } else {
          logger.info(`tmux session created: ${channelConfig.tmuxSession}`);
          statusMessage += `ℹ️ tmux 세션이 자동으로 생성되었습니다.\n\n`;
          statusMessage += '```\n(새로 생성된 세션 - 아직 출력 없음)\n```';
        }
      } else {
        // 최근 scrollback history 포함하여 캡처
        const captureResult = await capturePane(channelConfig.tmuxSession, -scrollbackLines);

        if (captureResult.success) {
          // 마지막 N줄만 출력
          const processedOutput = processCaptureResult(captureResult.output || '', 0, lineCount);

          // 백틱을 single quote로 대체하여 Slack에서 표시
          const displayOutput = processedOutput.summary.replace(/`/g, "'");

          statusMessage += '```\n' + displayOutput + '\n```';

          if (processedOutput.isTruncated) {
            statusMessage += `\n\n📄 전체 ${processedOutput.totalLines}줄 중 마지막 ${lineCount}줄만 표시되었습니다.`;
          }
        } else {
          statusMessage += `⚠️ 화면 캡처 실패: ${captureResult.error || '알 수 없는 오류'}`;
        }
      }
    } catch (captureError) {
      logger.error(`Screen capture failed: ${captureError}`);
      statusMessage += `⚠️ 화면 캡처 실패: ${captureError instanceof Error ? captureError.message : '알 수 없는 오류'}`;
    }

    // 메시지 전송
    await app.client.chat.postMessage({
      channel: channelId,
      text: statusMessage,
    });
  } catch (error) {
    logger.error(`Quick state button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **상태 조회 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "📥 파일 다운로드" 버튼 핸들러
 * "📥 File Download" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleQuickDownload(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;
  const triggerId = body.trigger_id;

  if (!channelId || !triggerId) {
    logger.error('Channel ID or Trigger ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ **설정되지 않은 채널**\n\n' +
          '이 채널은 아직 프로젝트에 연결되지 않았습니다.\n' +
          '먼저 `/setup <project-name> <project-path>` 명령어로 채널을 설정하세요.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 정보를 가져올 수 없습니다.',
      });
      return;
    }

    // 프로젝트 내 파일 검색 (*.md, *.json, *.txt 등)
    const { findFiles, filesToSlackOptions } = await import('../utils/file-finder');
    const files = await findFiles(channelConfig.projectPath, {
      extensions: ['.md', '.json', '.txt', '.log', '.yaml', '.yml', '.toml', '.ini', '.env', '.csv'],
      maxFiles: 300,
    });

    if (files.length === 0) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ **파일을 찾을 수 없습니다.**\n\n' +
          '프로젝트에서 `.md`, `.json`, `.txt` 등의 파일을 찾을 수 없습니다.',
      });
      return;
    }

    // Slack 옵션 형식으로 변환
    const options = filesToSlackOptions(files);

    // 모달 열기 - 파일 목록 선택
    await app.client.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'download_file_modal',
        title: {
          type: 'plain_text',
          text: '📥 파일 다운로드',
        },
        submit: {
          type: 'plain_text',
          text: '다운로드',
        },
        close: {
          type: 'plain_text',
          text: '취소',
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${channelConfig.projectName}* 프로젝트\n총 ${files.length}개 파일 (최근 순)`,
            },
          },
          {
            type: 'input',
            block_id: 'file_path_block',
            element: {
              type: 'static_select',
              action_id: 'file_path_select',
              placeholder: {
                type: 'plain_text',
                text: '파일을 선택하세요',
              },
              options: options.slice(0, 100), // Slack 제한: 최대 100개 옵션
            },
            label: {
              type: 'plain_text',
              text: '파일 선택',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 가장 최근에 수정된 파일이 먼저 표시됩니다.',
              },
            ],
          },
        ],
        private_metadata: channelId,
      },
    });

    logger.info(`File download modal opened with ${files.length} files`);
  } catch (error) {
    logger.error(`Quick download button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **파일 다운로드 모달 열기 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "📥 파일 다운로드" 모달 제출 핸들러
 * "📥 File Download" modal submission handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack view submission body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleDownloadFileModalSubmit(
  app: App,
  body: any,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.view.private_metadata;

  // file_path_select (static_select) 또는 file_path_input (plain_text_input) 확인
  const filePathBlock = body.view.state.values.file_path_block;
  const filePath = filePathBlock.file_path_select?.selected_option?.value ||
                   filePathBlock.file_path_input?.value;

  if (!channelId || !filePath) {
    logger.error('Channel ID or file path not found in modal submission');
    return;
  }

  try {
    // 채널 설정 가져오기
    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // 파일 다운로드 처리
    logger.info(`Quick download: ${filePath} (channel: ${channelId})`);
    await handleFileDownload(app, channelId, channelConfig, filePath);
  } catch (error) {
    logger.error(`Download file modal submit error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **파일 다운로드 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "▶️ 스니펫 실행" 버튼 핸들러
 * "▶️ Run Snippet" button handler
 *
 * @param actionId - Slack action ID
 */
export async function handleQuickRun(actionId: string): Promise<void> {
  // TODO: Task 4.5에서 구현 예정
  void actionId;
}

/**
 * "🚫 작업 취소" 버튼 핸들러
 * "🚫 Cancel Job" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 * @param orchestrator - JobOrchestrator 인스턴스
 */
export async function handleQuickCancel(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore,
  orchestrator: JobOrchestrator
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    // 작업 취소 실행
    const cancelled = await orchestrator.cancelJob(channelId);

    if (cancelled) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ **작업 취소 완료**\n\n현재 실행 중인 작업이 취소되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 취소할 작업이 없습니다.',
      });
    }
  } catch (error) {
    logger.error(`Quick cancel button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **작업 취소 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "⏎ 엔터" 버튼 핸들러
 * "⏎ Enter" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendEnter(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Enter 키 전송
    const result = await sendEnter(channelConfig.tmuxSession);

    if (result.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ Enter 키가 전송되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **Enter 키 전송 실패**\n\n${result.error || '알 수 없는 오류'}`,
      });
    }
  } catch (error) {
    logger.error(`Send Enter button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **Enter 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "⏎⏎ 엔터*2" 버튼 핸들러
 * "⏎⏎ Enter*2" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendEnterTwice(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Enter 키 2번 전송
    const result1 = await sendEnter(channelConfig.tmuxSession);
    if (!result1.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **Enter 키 전송 실패**\n\n${result1.error || '알 수 없는 오류'}`,
      });
      return;
    }

    const result2 = await sendEnter(channelConfig.tmuxSession);
    if (!result2.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **Enter 키 전송 실패 (2번째)**\n\n${result2.error || '알 수 없는 오류'}`,
      });
      return;
    }

    await app.client.chat.postMessage({
      channel: channelId,
      text: '✅ Enter 키가 2번 전송되었습니다.',
    });
  } catch (error) {
    logger.error(`Send Enter Twice button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **Enter 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "↑" 버튼 핸들러
 * "↑ Up Arrow" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendUp(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Up 키 전송
    const result = await sendArrowKey(channelConfig.tmuxSession, 'Up');

    if (result.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ ↑ 키가 전송되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **↑ 키 전송 실패**\n\n${result.error || '알 수 없는 오류'}`,
      });
    }
  } catch (error) {
    logger.error(`Send Up button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **↑ 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "↓" 버튼 핸들러
 * "↓ Down Arrow" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendDown(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Down 키 전송
    const result = await sendArrowKey(channelConfig.tmuxSession, 'Down');

    if (result.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ ↓ 키가 전송되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **↓ 키 전송 실패**\n\n${result.error || '알 수 없는 오류'}`,
      });
    }
  } catch (error) {
    logger.error(`Send Down button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **↓ 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "←" 버튼 핸들러
 * "← Left Arrow" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendLeft(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Left 키 전송
    const result = await sendArrowKey(channelConfig.tmuxSession, 'Left');

    if (result.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ ← 키가 전송되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **← 키 전송 실패**\n\n${result.error || '알 수 없는 오류'}`,
      });
    }
  } catch (error) {
    logger.error(`Send Left button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **← 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}

/**
 * "→" 버튼 핸들러
 * "→ Right Arrow" button handler
 *
 * @param app - Slack Bolt App 인스턴스
 * @param body - Slack 버튼 액션 body
 * @param configStore - ConfigStore 인스턴스
 */
export async function handleSendRight(
  app: App,
  body: BlockAction<ButtonAction>,
  configStore: ConfigStore
): Promise<void> {
  const logger = getLogger();
  const channelId = body.channel?.id;

  if (!channelId) {
    logger.error('Channel ID not found in button action');
    return;
  }

  try {
    // 채널 설정 확인
    if (!configStore.hasChannel(channelId)) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '⚠️ 설정되지 않은 채널입니다.',
      });
      return;
    }

    const channelConfig = configStore.getChannel(channelId);
    if (!channelConfig) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '❌ 채널 설정을 가져올 수 없습니다.',
      });
      return;
    }

    // Right 키 전송
    const result = await sendArrowKey(channelConfig.tmuxSession, 'Right');

    if (result.success) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: '✅ → 키가 전송되었습니다.',
      });
    } else {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `❌ **→ 키 전송 실패**\n\n${result.error || '알 수 없는 오류'}`,
      });
    }
  } catch (error) {
    logger.error(`Send Right button handler error: ${error}`);
    if (channelId) {
      try {
        await app.client.chat.postMessage({
          channel: channelId,
          text: `❌ **→ 키 전송 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        });
      } catch (slackError) {
        logger.error(`Failed to send error message to Slack: ${slackError}`);
      }
    }
  }
}
