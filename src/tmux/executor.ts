/**
 * tmux 명령 실행 유틸리티
 * tmux command execution utility
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { TmuxCommandResult } from '../types';
import { getLogger } from '../utils/logger';
import { ParsedSegment } from '../dsl/parser';

const execAsync = promisify(exec);

/**
 * tmux 명령 실행
 * Execute tmux command
 *
 * @param command - tmux command to execute
 * @param timeout - Command timeout in milliseconds (default: 30000ms = 30s)
 * @returns TmuxCommandResult with success status, output, and error
 */
export async function executeTmuxCommand(
  command: string,
  timeout: number = 30000
): Promise<TmuxCommandResult> {
  const logger = getLogger();

  try {
    logger.debug(`Executing tmux command: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && stderr.trim().length > 0) {
      logger.warn(`tmux command stderr: ${stderr}`);
    }

    logger.debug(`tmux command output: ${stdout.slice(0, 200)}...`);

    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
    };
  } catch (error) {
    logger.error(`tmux command failed: ${error}`);

    if (error instanceof Error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }

    return {
      success: false,
      output: '',
      error: 'Unknown error occurred',
    };
  }
}

/**
 * tmux 세션이 존재하는지 확인
 * Check if tmux session exists
 *
 * @param sessionName - tmux session name
 * @returns true if session exists, false otherwise
 */
export async function sessionExists(sessionName: string): Promise<boolean> {
  const result = await executeTmuxCommand(`tmux has-session -t ${sessionName}`);
  return result.success;
}

/**
 * tmux 세션 목록 가져오기
 * Get list of tmux sessions
 *
 * @returns Array of session names
 */
export async function listSessions(): Promise<string[]> {
  const result = await executeTmuxCommand('tmux list-sessions -F "#{session_name}"');

  if (!result.success || !result.output) {
    return [];
  }

  return result.output
    .trim()
    .split('\n')
    .filter((name) => name.length > 0);
}

/**
 * tmux 세션 생성
 * Create new tmux session
 *
 * @param sessionName - Session name
 * @param workingDirectory - Working directory for the session
 * @returns TmuxCommandResult
 */
export async function createSession(
  sessionName: string,
  workingDirectory: string
): Promise<TmuxCommandResult> {
  const command = `tmux new-session -d -s ${sessionName} -c "${workingDirectory}"`;
  return executeTmuxCommand(command);
}

/**
 * tmux 세션 종료
 * Kill tmux session
 *
 * @param sessionName - Session name
 * @returns TmuxCommandResult
 */
export async function killSession(sessionName: string): Promise<TmuxCommandResult> {
  const command = `tmux kill-session -t ${sessionName}`;
  return executeTmuxCommand(command);
}

/**
 * tmux 세션에 키 입력 전송
 * Send keys to tmux session
 *
 * @param sessionName - Session name
 * @param keys - Keys to send
 * @param literal - If true, send keys literally without interpreting special characters
 * @returns TmuxCommandResult
 */
export async function sendKeys(
  sessionName: string,
  keys: string,
  literal: boolean = true
): Promise<TmuxCommandResult> {
  // 리터럴 모드인 경우 -l 플래그 사용
  const literalFlag = literal ? '-l' : '';

  // 줄바꿈이 있는 경우 여러 명령으로 분리하여 전송
  // Split into multiple commands if newlines exist
  if (keys.includes('\n')) {
    const lines = keys.split('\n');

    // 디버깅: 줄바꿈 처리 로그
    // Debug: Log newline processing
    const logger = getLogger();
    logger.debug(`[SENDKEYS DEBUG] Detected ${lines.length} lines (${lines.length - 1} newlines)`);
    logger.debug(`[SENDKEYS DEBUG] First line: ${JSON.stringify(lines[0].slice(0, 100))}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 빈 줄도 전송 (Enter만 전송)
      if (line.length > 0) {
        const escapedLine = line.replace(/"/g, '\\"');
        const command = `tmux send-keys -t ${sessionName} ${literalFlag} "${escapedLine}"`;
        const result = await executeTmuxCommand(command);

        if (!result.success) {
          return result;
        }
      }

      // 마지막 줄이 아니면 Enter 전송
      if (i < lines.length - 1) {
        const enterResult = await executeTmuxCommand(`tmux send-keys -t ${sessionName} Enter`);
        if (!enterResult.success) {
          return enterResult;
        }
      }
    }

    return {
      success: true,
      output: 'Multi-line keys sent successfully',
    };
  }

  // 단일 라인인 경우 기존 방식
  // Single line - use original method
  const escapedKeys = keys.replace(/"/g, '\\"');
  const command = `tmux send-keys -t ${sessionName} ${literalFlag} "${escapedKeys}"`;
  return executeTmuxCommand(command);
}

/**
 * tmux 세션에 Enter 키 전송
 * Send Enter key to tmux session
 *
 * @param sessionName - Session name
 * @returns TmuxCommandResult
 */
export async function sendEnter(sessionName: string): Promise<TmuxCommandResult> {
  const command = `tmux send-keys -t ${sessionName} Enter`;
  return executeTmuxCommand(command);
}

/**
 * tmux 세션에 방향키 전송
 * Send arrow key to tmux session
 *
 * @param sessionName - Session name
 * @param direction - Arrow key direction (Up, Down, Left, Right)
 * @returns TmuxCommandResult
 *
 * 사용 예시 (Usage examples):
 * - sendArrowKey('my-session', 'Down') → Down 키 전송
 * - sendArrowKey('my-session', 'Up') → Up 키 전송
 * - sendArrowKey('my-session', 'Left') → Left 키 전송
 * - sendArrowKey('my-session', 'Right') → Right 키 전송
 */
export async function sendArrowKey(
  sessionName: string,
  direction: 'Up' | 'Down' | 'Left' | 'Right'
): Promise<TmuxCommandResult> {
  const logger = getLogger();
  logger.debug(`Sending arrow key ${direction} to session ${sessionName}`);

  const command = `tmux send-keys -t ${sessionName} ${direction}`;
  return executeTmuxCommand(command);
}

/**
 * 파싱된 명령 시퀀스를 순차적으로 실행
 * Execute parsed command sequence sequentially
 *
 * @param sessionName - Session name
 * @param commands - Parsed command segments from parseInteractiveCommand()
 * @param keyDelay - Delay between key presses in milliseconds (default: 500ms)
 * @param finalDelay - Delay after final command in milliseconds (default: 500ms)
 * @returns TmuxCommandResult with last command result
 *
 * 타이밍 (Timing):
 * - 각 키 전송 사이: 500ms 지연 (기본값) - Claude Code UI 업데이트 대기
 * - 최종 명령 후: 500ms 대기 (화면 업데이트 시간)
 *
 * 사용 예시 (Usage examples):
 * - executeCommandSequence('my-session', [키 명령들])
 * - 명령 시퀀스: [Down, Down, Enter] → Down, 500ms, Down, 500ms, Enter, 500ms
 */
export async function executeCommandSequence(
  sessionName: string,
  commands: ParsedSegment[],
  keyDelay: number = 500,
  finalDelay: number = 500
): Promise<TmuxCommandResult> {
  const logger = getLogger();
  logger.debug(`Executing command sequence with ${commands.length} commands`);

  let lastResult: TmuxCommandResult = {
    success: true,
    output: '',
  };

  // 각 명령을 순차적으로 실행
  // Execute each command sequentially
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];

    if (command.type === 'key') {
      // 키 명령: 방향키 또는 Enter
      // Key command: arrow keys or Enter
      if (command.key === 'Enter') {
        lastResult = await sendEnter(sessionName);
      } else {
        lastResult = await sendArrowKey(sessionName, command.key);
      }
    } else {
      // 텍스트 명령: 리터럴 텍스트 전송
      // Text command: send literal text
      lastResult = await sendKeys(sessionName, command.content, true);
    }

    // 명령 실행 실패 시 즉시 반환
    // Return immediately if command fails
    if (!lastResult.success) {
      logger.error(`Command execution failed at index ${i}: ${lastResult.error}`);
      return lastResult;
    }

    // 마지막 명령이 아니면 키 전송 간 지연
    // Delay between key presses (except after last command)
    if (i < commands.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, keyDelay));
    }
  }

  // 최종 명령 후 대기 시간 (화면 업데이트 대기)
  // Final delay after last command (wait for screen update)
  logger.debug(`Waiting ${finalDelay}ms for screen update`);
  await new Promise((resolve) => setTimeout(resolve, finalDelay));

  logger.debug(`Command sequence execution completed successfully`);

  return lastResult;
}

/**
 * tmux 세션 출력 캡처
 * Capture pane output from tmux session
 *
 * @param sessionName - Session name
 * @param startLine - Start line (negative for last N lines)
 * @param endLine - End line (optional)
 * @returns TmuxCommandResult with captured output
 */
export async function capturePane(
  sessionName: string,
  startLine?: number,
  endLine?: number
): Promise<TmuxCommandResult> {
  let command = `tmux capture-pane -t ${sessionName} -p`;

  if (startLine !== undefined) {
    command += ` -S ${startLine}`;
  }

  if (endLine !== undefined) {
    command += ` -E ${endLine}`;
  }

  return executeTmuxCommand(command);
}

/**
 * tmux 세션의 스크롤백 버퍼 지우기
 * Clear scrollback buffer of tmux session
 *
 * @param sessionName - Session name
 * @returns TmuxCommandResult
 */
export async function clearHistory(sessionName: string): Promise<TmuxCommandResult> {
  const command = `tmux clear-history -t ${sessionName}`;
  return executeTmuxCommand(command);
}

/**
 * tmux 세션 정보 가져오기
 * Get tmux session info
 *
 * @param sessionName - Session name
 * @returns Session info or null if session doesn't exist
 */
export async function getSessionInfo(
  sessionName: string
): Promise<{ name: string; created: string; attached: boolean } | null> {
  const command = `tmux list-sessions -F "#{session_name}|#{session_created}|#{session_attached}" | grep "^${sessionName}|"`;
  const result = await executeTmuxCommand(command);

  if (!result.success || !result.output) {
    return null;
  }

  const [name, created, attached] = result.output.trim().split('|');

  return {
    name,
    created,
    attached: attached === '1',
  };
}
