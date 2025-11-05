/**
 * Remote Claude Code 제어 시스템 메인 엔트리포인트
 * Main entry point for Remote Claude Code Control System
 */

import { App, LogLevel } from '@slack/bolt';
import * as path from 'path';
import { getEnvConfig, loadEnv } from './utils/env';
import { getLogger, initLogger } from './utils/logger';
import { initConfigDirectory } from './config/init';
import { ConfigStore } from './config/store';
import { SnippetStoreManager } from './snippet/store';
import { JobQueue } from './queue/queue';
import { StateManager } from './state/manager';
import { TmuxManager } from './tmux/manager';
import { JobOrchestrator } from './queue/orchestrator';
import { recoverState, startPeriodicCleanup } from './state/recovery';
import { JobType, ChannelConfig } from './types';

// Command handlers
import { helpHandler } from './bot/commands/help';
import { unsetupHandler } from './bot/commands/unsetup';
import { snippetHandler } from './bot/commands/snippet';

/**
 * 메인 애플리케이션 클래스
 * Main application class
 */
class RemoteClaudeApp {
  private app: App;
  private configStore: ConfigStore;
  private snippetStore: SnippetStoreManager;
  private jobQueue: JobQueue;
  private stateManager: StateManager;
  private tmuxManager: TmuxManager;
  private orchestrator: JobOrchestrator;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // .env 파일 로드 (가장 먼저 호출)
    loadEnv();
    const envConfig = getEnvConfig();

    // 로거 초기화
    const logDir = path.join(envConfig.configDir, 'logs');
    initLogger(envConfig.logLevel, logDir);
    const logger = getLogger();

    logger.info('Initializing Remote Claude Code Control System...');

    // Slack App 초기화
    this.app = new App({
      token: envConfig.slackBotToken,
      appToken: envConfig.slackAppToken,
      socketMode: true,
      logLevel: envConfig.logLevel === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    });

    // 설정 디렉토리 초기화
    initConfigDirectory(envConfig.configDir);

    // 컴포넌트 초기화
    this.configStore = new ConfigStore(envConfig.configDir);
    this.snippetStore = new SnippetStoreManager(envConfig.configDir);
    this.jobQueue = new JobQueue();
    this.stateManager = new StateManager(envConfig.configDir);
    this.tmuxManager = new TmuxManager();
    this.orchestrator = new JobOrchestrator(
      this.jobQueue,
      this.stateManager,
      this.tmuxManager,
      this.app
    );

    logger.info('All components initialized successfully');
  }

  /**
   * 명령어 핸들러 등록
   * Register command handlers
   */
  private registerCommands(): void {
    const logger = getLogger();

    logger.info('Registering slash commands...');

    // /help 명령어
    this.app.command('/help', async ({ command, ack, say }) => {
      await ack();
      const response = await helpHandler({
        channelId: command.channel_id,
        userId: command.user_id,
        args: [],
      });
      await say(response);
    });

    // /setup 명령어
    this.app.command('/setup', async ({ command, ack, say }) => {
      await ack();
      await this.handleSetupCommand(command.channel_id, command.user_id, command.text, say);
    });

    // /unsetup 명령어
    this.app.command('/unsetup', async ({ command, ack, say }) => {
      await ack();
      const response = await unsetupHandler({
        channelId: command.channel_id,
        userId: command.user_id,
        args: [],
      });
      await say(response);
    });

    // /state 명령어 - 작업 큐 상태 통합
    this.app.command('/state', async ({ command, ack, say }) => {
      await ack();
      await this.handleStateCommand(command.channel_id, command.user_id, say);
    });

    // /snippet 명령어
    this.app.command('/snippet', async ({ command, ack, say }) => {
      await ack();
      const args = command.text.trim().split(/\s+/);
      const response = await snippetHandler({
        channelId: command.channel_id,
        userId: command.user_id,
        args,
      });
      await say(response);
    });

    // /run 명령어 - 오케스트레이터 통합
    this.app.command('/run', async ({ command, ack, say }) => {
      await ack();
      const args = command.text.trim().split(/\s+/);
      await this.handleRunCommand(command.channel_id, command.user_id, args, say);
    });

    // /ask 명령어 - 오케스트레이터 통합
    this.app.command('/ask', async ({ command, ack, say }) => {
      await ack();
      const args = [command.text.trim()];
      await this.handleAskCommand(command.channel_id, command.user_id, args, say);
    });

    // /cancel 명령어 - 오케스트레이터 통합
    this.app.command('/cancel', async ({ command, ack, say }) => {
      await ack();
      await this.handleCancelCommand(command.channel_id, command.user_id, say);
    });

    logger.info('All slash commands registered');
  }

  /**
   * 메시지 이벤트 리스너 등록
   * Register message event listeners
   */
  private registerMessageListeners(): void {
    const logger = getLogger();

    logger.info('Registering message listeners...');

    // 채널 메시지 수신 (4단계 입력 처리 파이프라인 통합)
    this.app.message(async ({ message, say }) => {
      // 메시지 타입 검증
      if (message.subtype || !('text' in message) || !('channel' in message)) {
        return;
      }

      const channelId = message.channel;
      const text = message.text?.trim() || '';

      // 채널 설정 확인
      const channelConfig = this.configStore.getChannel(channelId);
      if (!channelConfig) {
        logger.debug(`Message from unconfigured channel: ${channelId}`);
        return;
      }

      // 대화형 응답 대기 중인 경우 y/n 응답 처리
      if (this.stateManager.isWaitingForResponse(channelId)) {
        const lowerText = text.toLowerCase();
        if (lowerText === 'y' || lowerText === 'n') {
          logger.info(
            `Received interactive response '${lowerText}' from channel ${channelId}`
          );

          try {
            await this.orchestrator.handleInteractiveResponse(
              channelId,
              channelConfig,
              lowerText as 'y' | 'n'
            );
          } catch (error) {
            logger.error(`Failed to handle interactive response: ${error}`);
            await say(
              `❌ 응답 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
          }
          return;
        }
      }

      // 4단계 입력 처리 파이프라인
      const { processInput } = await import('./handlers/input-processor');
      const result = processInput(text);

      logger.debug(
        `Input processing result: stage=${result.stage}, action=${result.action}, shouldProcess=${result.shouldProcess}`
      );

      // 처리할 필요 없는 입력
      if (!result.shouldProcess) {
        return;
      }

      // Stage에 따라 처리
      switch (result.stage) {
        case 1: // Slack 네이티브 명령 - Slack이 처리
          logger.debug('Slack native command detected, passing through');
          return;

        case 2: // 봇 메타 명령 - slash command로 이미 처리됨
          logger.debug('Bot meta command detected, already handled by slash command');
          return;

        case 3: // DSL 명령 - DSL 처리기로 전달
          logger.info(`DSL command detected in channel ${channelId}`);
          try {
            await this.handleDslInput(channelId, channelConfig, text, say);
          } catch (error) {
            logger.error(`Failed to handle DSL command: ${error}`);
            await say(
              `❌ DSL 명령 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
          }
          break;

        case 4: // 기본 입력 - Claude Code로 전송 (FR10)
          logger.info(`Default input detected in channel ${channelId}: ${result.processedInput?.slice(0, 50)}...`);
          try {
            await this.handleDefaultInput(channelId, channelConfig, result.processedInput || '', say);
          } catch (error) {
            logger.error(`Failed to handle default input: ${error}`);
            await say(
              `❌ 입력 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
          }
          break;
      }
    });

    logger.info('Message listeners registered');
  }

  /**
   * DSL 입력 처리
   * Handle DSL input
   */
  private async handleDslInput(
    channelId: string,
    channelConfig: ChannelConfig,
    text: string,
    say: any
  ): Promise<void> {
    const logger = getLogger();

    // DSL 명령 파싱
    const { parseInteractiveCommand } = await import('./dsl/parser');
    const parseResult = parseInteractiveCommand(text);

    if (!parseResult.success) {
      // 파싱 실패 - 에러 메시지 전송
      logger.warn(`DSL parsing failed: ${parseResult.error?.message}`);
      const { formatError, formatBold, formatDslGuide } = await import('./bot/formatters');

      await say(
        formatError(formatBold('DSL 파싱 실패')) + '\n\n' +
        (parseResult.error?.message || '알 수 없는 오류') + '\n\n' +
        formatDslGuide()
      );
      return;
    }

    // 작업 큐에 추가
    const job = this.jobQueue.addJob(channelId, JobType.DSL_COMMAND, text);

    await say(
      `✅ **DSL 명령 추가됨**\n\n` +
      `**작업 ID**: ${job.id}\n` +
      `**명령**: ${text}\n` +
      `**세그먼트**: ${parseResult.segments.length}개\n\n` +
      '작업이 큐에 추가되었습니다. 곧 실행됩니다.'
    );

    // 오케스트레이터 시작 (백그라운드)
    this.orchestrator.startJob(channelId, channelConfig).catch((error) => {
      logger.error(`Failed to start DSL job ${job.id}: ${error}`);
    });
  }

  /**
   * 기본 입력 처리 (FR10: /ask 없이 자동 전송)
   * Handle default input (FR10: Auto-send without /ask)
   */
  private async handleDefaultInput(
    channelId: string,
    channelConfig: ChannelConfig,
    text: string,
    say: any
  ): Promise<void> {
    const logger = getLogger();

    // 프롬프트 길이 체크
    if (text.length > 10000) {
      await say(
        `⚠️ **프롬프트가 너무 김**\n\n` +
        `프롬프트 길이: ${text.length}자 (최대 10,000자)\n` +
        '프롬프트를 짧게 줄이거나 스니펫으로 등록하세요.'
      );
      return;
    }

    // 작업 큐에 추가
    const job = this.jobQueue.addJob(channelId, JobType.ASK_PROMPT, text);

    await say(
      `✅ **작업 추가됨**\n\n` +
      `**작업 ID**: ${job.id}\n` +
      `**프로젝트**: ${channelConfig.projectName}\n` +
      `**프롬프트**: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\n\n` +
      '작업이 큐에 추가되었습니다. 곧 실행됩니다.'
    );

    // 오케스트레이터 시작 (백그라운드)
    this.orchestrator.startJob(channelId, channelConfig).catch((error) => {
      logger.error(`Failed to start job ${job.id}: ${error}`);
    });
  }

  /**
   * /setup 명령어 처리
   * Handle /setup command
   */
  private async handleSetupCommand(
    channelId: string,
    userId: string,
    text: string,
    say: any
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Setup command from user ${userId} in channel ${channelId}`);

    const args = text.trim().split(/\s+/);

    // 인자 검증
    if (args.length < 2) {
      await say(
        '*사용법 오류*\n\n' +
        '사용법: `/setup <project-name> <project-path>`\n\n' +
        '*예시:*\n' +
        '• `/setup my-app /Users/username/projects/my-app`\n' +
        '• `/setup frontend ~/workspace/project/frontend`\n\n' +
        '*설명:*\n' +
        '• `<project-name>`: 프로젝트 이름 (알파벳, 숫자, -, _ 만 사용)\n' +
        '• `<project-path>`: 프로젝트 디렉토리 절대 경로'
      );
      return;
    }

    const projectName = args[0];
    const projectPath = args.slice(1).join(' '); // 경로에 공백이 있을 수 있음

    try {
      const {
        validateProjectName,
        validateProjectPath,
        validatePathConflicts,
        toAbsolutePath,
      } = await import('./utils/path');

      // 1. 프로젝트 이름 검증
      validateProjectName(projectName);

      // 2. 프로젝트 경로 검증
      validateProjectPath(projectPath);

      // 3. 경로 충돌 검증 (현재 채널의 경로는 제외)
      const existingChannel = this.configStore.getChannel(channelId);
      const allPaths = this.configStore.getAllProjectPaths();
      const otherPaths = existingChannel
        ? allPaths.filter((p) => p !== existingChannel.projectPath)
        : allPaths;
      validatePathConflicts(projectPath, otherPaths);

      // 4. tmux 세션 이름 생성
      const tmuxSession = `claude-${channelId}`;

      // 5. 채널 설정 저장
      const absolutePath = toAbsolutePath(projectPath);
      this.configStore.setChannel(channelId, projectName, absolutePath, tmuxSession);

      // 6. 성공 메시지 반환
      const isUpdate = existingChannel !== undefined;
      const action = isUpdate ? '업데이트' : '설정';

      await say(
        `✅ *채널 ${action} 완료*\n\n` +
        `*프로젝트:* ${projectName}\n` +
        `*경로:* \`${absolutePath}\`\n` +
        `*tmux 세션:* \`${tmuxSession}\`\n\n` +
        `이제 \`/run\` 또는 \`/ask\` 명령어로 Claude Code에 작업을 요청할 수 있습니다.\n` +
        `자주 사용하는 프롬프트는 \`/snippet add\` 로 등록하세요.`
      );
    } catch (error) {
      logger.error(`Setup failed: ${error}`);

      if (error instanceof Error) {
        await say(`❌ *설정 실패*\n\n${error.message}`);
      } else {
        await say('❌ *설정 실패*\n\n알 수 없는 오류가 발생했습니다.');
      }
    }
  }

  /**
   * /run 명령어 처리
   * Handle /run command with orchestrator integration
   */
  private async handleRunCommand(
    channelId: string,
    userId: string,
    args: string[],
    say: any
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Run command from user ${userId} in channel ${channelId}`);

    // 인자 검증
    if (args.length === 0) {
      await say(
        '⚠️ **사용법 오류**\n\n' +
        '사용법: `/run <snippet-name>`\n\n' +
        '**예시:**\n' +
        '`/run build-test`\n' +
        '`/run analyze-code`\n\n' +
        '등록된 스니펫 목록 보기: `/snippet list`'
      );
      return;
    }

    const snippetName = args[0];

    try {
      // 1. 채널 설정 확인
      if (!this.configStore.hasChannel(channelId)) {
        await say(
          '⚠️ **설정되지 않은 채널**\n\n' +
          '이 채널은 아직 프로젝트에 연결되지 않았습니다.\n' +
          '먼저 `/setup <project-name> <project-path>` 명령어로 채널을 설정하세요.'
        );
        return;
      }

      const channelConfig = this.configStore.getChannel(channelId);
      if (!channelConfig) {
        await say('❌ 채널 설정을 가져올 수 없습니다.');
        return;
      }

      // 2. 스니펫 확인
      if (!this.snippetStore.hasSnippet(snippetName)) {
        await say(
          `⚠️ **스니펫을 찾을 수 없음**\n\n` +
          `스니펫 \`${snippetName}\`을(를) 찾을 수 없습니다.\n` +
          '`/snippet list` 명령어로 등록된 스니펫 목록을 확인하세요.'
        );
        return;
      }

      const prompt = this.snippetStore.getSnippet(snippetName);
      if (!prompt) {
        await say('❌ 스니펫 내용을 가져올 수 없습니다.');
        return;
      }

      // 3. 작업 큐에 추가
      const job = this.jobQueue.addJob(channelId, JobType.RUN_SNIPPET, prompt);

      await say(
        `✅ **작업 추가됨**\n\n` +
        `**작업 ID**: ${job.id}\n` +
        `**스니펫**: ${snippetName}\n` +
        `**프로젝트**: ${channelConfig.projectName}\n\n` +
        '작업이 큐에 추가되었습니다. 곧 실행됩니다.'
      );

      // 4. 오케스트레이터 시작 (백그라운드)
      this.orchestrator.startJob(channelId, channelConfig).catch((error) => {
        logger.error(`Failed to start job ${job.id}: ${error}`);
      });
    } catch (error) {
      logger.error(`Run command failed: ${error}`);
      await say(
        `❌ **실행 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * /ask 명령어 처리
   * Handle /ask command with orchestrator integration
   */
  private async handleAskCommand(
    channelId: string,
    userId: string,
    args: string[],
    say: any
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Ask command from user ${userId} in channel ${channelId}`);

    // 인자 검증
    if (args.length === 0) {
      await say(
        '⚠️ **사용법 오류**\n\n' +
        '사용법: `/ask <prompt>`\n\n' +
        '**예시:**\n' +
        '`/ask "Build the project and run all tests."`\n' +
        '`/ask "Analyze the performance bottlenecks in src/server.ts"`\n' +
        '`/ask "Fix the bug in authentication flow"`'
      );
      return;
    }

    const prompt = args.join(' ');

    // 프롬프트 길이 체크
    if (prompt.length > 10000) {
      await say(
        `⚠️ **프롬프트가 너무 김**\n\n` +
        `프롬프트 길이: ${prompt.length}자 (최대 10,000자)\n` +
        '프롬프트를 짧게 줄이거나 스니펫으로 등록하세요.'
      );
      return;
    }

    try {
      // 1. 채널 설정 확인
      if (!this.configStore.hasChannel(channelId)) {
        await say(
          '⚠️ **설정되지 않은 채널**\n\n' +
          '이 채널은 아직 프로젝트에 연결되지 않았습니다.\n' +
          '먼저 `/setup <project-name> <project-path>` 명령어로 채널을 설정하세요.'
        );
        return;
      }

      const channelConfig = this.configStore.getChannel(channelId);
      if (!channelConfig) {
        await say('❌ 채널 설정을 가져올 수 없습니다.');
        return;
      }

      // 2. 작업 큐에 추가
      const job = this.jobQueue.addJob(channelId, JobType.ASK_PROMPT, prompt);

      await say(
        `✅ **작업 추가됨**\n\n` +
        `**작업 ID**: ${job.id}\n` +
        `**프로젝트**: ${channelConfig.projectName}\n` +
        `**프롬프트**: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}\n\n` +
        '작업이 큐에 추가되었습니다. 곧 실행됩니다.'
      );

      // 3. 오케스트레이터 시작 (백그라운드)
      this.orchestrator.startJob(channelId, channelConfig).catch((error) => {
        logger.error(`Failed to start job ${job.id}: ${error}`);
      });
    } catch (error) {
      logger.error(`Ask command failed: ${error}`);
      await say(
        `❌ **실행 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * /cancel 명령어 처리
   * Handle /cancel command with orchestrator integration
   */
  private async handleCancelCommand(
    channelId: string,
    userId: string,
    say: any
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Cancel command from user ${userId} in channel ${channelId}`);

    try {
      // 채널 설정 확인
      if (!this.configStore.hasChannel(channelId)) {
        await say('⚠️ 설정되지 않은 채널입니다.');
        return;
      }

      // 오케스트레이터를 통해 작업 취소
      const cancelled = await this.orchestrator.cancelJob(channelId);

      if (cancelled) {
        await say(
          '✅ **작업 취소 완료**\n\n현재 실행 중인 작업이 취소되었습니다.'
        );
      } else {
        await say('⚠️ 취소할 작업이 없습니다.');
      }
    } catch (error) {
      logger.error(`Cancel command failed: ${error}`);
      await say(
        `❌ **작업 취소 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * /state 명령어 처리
   * Handle /state command with queue status integration
   */
  private async handleStateCommand(
    channelId: string,
    userId: string,
    say: any
  ): Promise<void> {
    const logger = getLogger();
    logger.info(`Status command from user ${userId} in channel ${channelId}`);

    try {
      // 채널 설정 확인
      if (!this.configStore.hasChannel(channelId)) {
        await say(
          '⚠️ **설정되지 않은 채널**\n\n' +
          '이 채널은 아직 프로젝트에 연결되지 않았습니다.\n' +
          '먼저 `/setup <project-name> <project-path>` 명령어로 채널을 설정하세요.\n\n' +
          'ℹ️  도움말: `/help` 명령어로 사용 가능한 명령어를 확인하세요.'
        );
        return;
      }

      // 채널 정보 가져오기
      const channelConfig = this.configStore.getChannel(channelId);
      if (!channelConfig) {
        await say('❌ 채널 정보를 가져올 수 없습니다.');
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
      const queueSummary = this.jobQueue.getQueueSummary(channelId);
      statusMessage += '\n📋 **작업 큐 상태**\n\n';
      statusMessage += `**대기 중**: ${queueSummary.pending}개\n`;
      statusMessage += `**실행 중**: ${queueSummary.running}개\n`;
      statusMessage += `**완료**: ${queueSummary.completed}개\n`;
      statusMessage += `**실패**: ${queueSummary.failed}개\n`;
      statusMessage += `**취소**: ${queueSummary.cancelled}개\n`;

      // 실행 중인 작업 상세
      const runningJob = this.orchestrator.getRunningJob(channelId);
      if (runningJob) {
        statusMessage += '\n**현재 실행 중인 작업:**\n';
        statusMessage += `• ID: ${runningJob.id}\n`;
        statusMessage += `• 타입: ${runningJob.type}\n`;
        statusMessage += `• 시작 시간: ${runningJob.startedAt ? new Date(runningJob.startedAt).toLocaleString('ko-KR') : 'N/A'}\n`;
      }

      // 세션 상태
      const session = this.stateManager.getSession(channelId);
      if (session?.isWaitingForResponse) {
        statusMessage += '\n⚠️  **대화형 응답 대기 중**\n';
        statusMessage += `타임아웃: ${session.timeoutAt ? new Date(session.timeoutAt).toLocaleString('ko-KR') : 'N/A'}\n`;
      }

      // Claude Code 화면 캡처
      statusMessage += '\n🖥️  **Claude Code 현재 화면**\n\n';
      try {
        const { capturePane } = await import('./tmux/executor');
        const { processCaptureResult } = await import('./tmux/parser');

        // 최근 10000줄의 scrollback history 포함하여 캡처
        // Capture including recent 10000 lines of scrollback history
        const captureResult = await capturePane(channelConfig.tmuxSession, -10000);

        if (captureResult.success) {
          const processedOutput = processCaptureResult(captureResult.output || '');
          statusMessage += '```\n' + processedOutput.summary + '\n```';
        } else {
          statusMessage += `⚠️ 화면 캡처 실패: ${captureResult.error || '알 수 없는 오류'}`;
        }
      } catch (captureError) {
        logger.error(`Screen capture failed: ${captureError}`);
        statusMessage += `⚠️ 화면 캡처 실패: ${captureError instanceof Error ? captureError.message : '알 수 없는 오류'}`;
      }

      await say(statusMessage);
    } catch (error) {
      logger.error(`Status command failed: ${error}`);
      await say(
        `❌ **상태 조회 실패**\n\n${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`
      );
    }
  }

  /**
   * 상태 복구 실행
   * Execute state recovery
   */
  private async executeStateRecovery(): Promise<void> {
    const logger = getLogger();

    logger.info('Starting state recovery...');

    try {
      const result = await recoverState(
        this.stateManager,
        this.configStore,
        this.jobQueue
      );

      logger.info(
        `State recovery complete: ${result.recoveredSessions} recovered, ${result.timedOutSessions} timed out, ${result.cleanedUpSessions} cleaned up`
      );

      // 주기적 정리 시작 (5분 간격)
      this.cleanupTimer = startPeriodicCleanup(this.stateManager, 5);
    } catch (error) {
      logger.error(`State recovery failed: ${error}`);
      throw error;
    }
  }

  /**
   * 애플리케이션 시작
   * Start application
   */
  public async start(): Promise<void> {
    const logger = getLogger();

    try {
      // 명령어 핸들러 등록
      this.registerCommands();

      // 메시지 리스너 등록
      this.registerMessageListeners();

      // 상태 복구 실행
      await this.executeStateRecovery();

      // Slack App 시작
      await this.app.start();

      logger.info('🚀 Remote Claude Code Control System is running!');
    } catch (error) {
      logger.error(`Failed to start application: ${error}`);
      throw error;
    }
  }

  /**
   * 애플리케이션 종료
   * Stop application
   */
  public async stop(): Promise<void> {
    const logger = getLogger();

    logger.info('Stopping application...');

    try {
      // 주기적 정리 타이머 중지
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }

      // Slack App 중지
      await this.app.stop();

      logger.info('Application stopped successfully');
    } catch (error) {
      logger.error(`Error during shutdown: ${error}`);
      throw error;
    }
  }
}

/**
 * 메인 함수
 * Main function
 */
async function main(): Promise<void> {
  try {
    const app = new RemoteClaudeApp();
    const logger = getLogger();

    // 프로세스 종료 시그널 처리
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await app.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await app.stop();
      process.exit(0);
    });

    // 애플리케이션 시작
    await app.start();
  } catch (error) {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

// 애플리케이션 실행
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { RemoteClaudeApp };
