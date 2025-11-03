/**
 * Remote Claude Code 제어 시스템 메인 엔트리포인트
 * Main entry point for Remote Claude Code Control System
 */

import { App, LogLevel } from '@slack/bolt';
import { getEnvConfig } from './utils/env';
import { getLogger, setLogLevel } from './utils/logger';
import { initConfigDirectory } from './config/init';
import { ConfigStore } from './config/store';
import { SnippetStoreManager } from './snippet/store';
import { JobQueue } from './queue/queue';
import { StateManager } from './state/manager';
import { TmuxManager } from './tmux/manager';
import { JobOrchestrator } from './queue/orchestrator';
import { recoverState, startPeriodicCleanup } from './state/recovery';
import { JobType } from './types';

// Command handlers
import { helpHandler } from './bot/commands/help';
import { setupHandler } from './bot/commands/setup';
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
    const logger = getLogger();
    const envConfig = getEnvConfig();

    // 로그 레벨 설정
    if (envConfig.logLevel) {
      setLogLevel(envConfig.logLevel);
    }

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
      const args = command.text.trim().split(/\s+/);
      const response = await setupHandler({
        channelId: command.channel_id,
        userId: command.user_id,
        args,
      });
      await say(response);
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

    // /status 명령어 - 작업 큐 상태 통합
    this.app.command('/status', async ({ command, ack, say }) => {
      await ack();
      await this.handleStatusCommand(command.channel_id, command.user_id, say);
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

    // 채널 메시지 수신 (y/n 대화형 응답 처리)
    this.app.message(async ({ message, say }) => {
      // 메시지 타입 검증
      if (message.subtype || !('text' in message) || !('channel' in message)) {
        return;
      }

      const channelId = message.channel;
      const text = message.text?.trim().toLowerCase();

      // y/n 응답 확인
      if (text !== 'y' && text !== 'n') {
        return;
      }

      // 대화형 응답 대기 중인지 확인
      if (!this.stateManager.isWaitingForResponse(channelId)) {
        return;
      }

      // 채널 설정 확인
      const channelConfig = this.configStore.getChannel(channelId);
      if (!channelConfig) {
        logger.warn(`Message from unconfigured channel: ${channelId}`);
        return;
      }

      logger.info(
        `Received interactive response '${text}' from channel ${channelId}`
      );

      try {
        // 오케스트레이터를 통해 응답 처리
        await this.orchestrator.handleInteractiveResponse(
          channelId,
          channelConfig,
          text as 'y' | 'n'
        );
      } catch (error) {
        logger.error(`Failed to handle interactive response: ${error}`);
        await say(
          `❌ 응답 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        );
      }
    });

    logger.info('Message listeners registered');
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
   * /status 명령어 처리
   * Handle /status command with queue status integration
   */
  private async handleStatusCommand(
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
  const logger = getLogger();

  try {
    const app = new RemoteClaudeApp();

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
    logger.error(`Fatal error: ${error}`);
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
