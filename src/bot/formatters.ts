/**
 * Slack 메시지 포맷팅 유틸리티
 * Slack message formatting utilities
 */

/**
 * 코드 블록 포맷팅
 * Format text as code block
 */
export function formatCodeBlock(code: string, language?: string): string {
  const lang = language || '';
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

/**
 * 인라인 코드 포맷팅
 * Format text as inline code
 */
export function formatInlineCode(text: string): string {
  return `\`${text}\``;
}

/**
 * 볼드 텍스트 포맷팅
 * Format text as bold
 */
export function formatBold(text: string): string {
  return `*${text}*`;
}

/**
 * 이탤릭 텍스트 포맷팅
 * Format text as italic
 */
export function formatItalic(text: string): string {
  return `_${text}_`;
}

/**
 * 취소선 텍스트 포맷팅
 * Format text as strikethrough
 */
export function formatStrikethrough(text: string): string {
  return `~${text}~`;
}

/**
 * 인용문 포맷팅
 * Format text as quote
 */
export function formatQuote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * 리스트 포맷팅
 * Format array as bulleted list
 */
export function formatList(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

/**
 * 번호 리스트 포맷팅
 * Format array as numbered list
 */
export function formatNumberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * 구분선
 * Divider
 */
export function formatDivider(): string {
  return '─'.repeat(40);
}

/**
 * 섹션 헤더
 * Format section header
 */
export function formatSectionHeader(title: string): string {
  return `\n${formatBold(title)}\n${formatDivider()}`;
}

/**
 * 성공 메시지 포맷팅
 * Format success message
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * 에러 메시지 포맷팅
 * Format error message
 */
export function formatError(message: string): string {
  return `❌ ${message}`;
}

/**
 * 경고 메시지 포맷팅
 * Format warning message
 */
export function formatWarning(message: string): string {
  return `⚠️ ${message}`;
}

/**
 * 정보 메시지 포맷팅
 * Format info message
 */
export function formatInfo(message: string): string {
  return `ℹ️ ${message}`;
}

/**
 * 진행 중 메시지 포맷팅
 * Format in-progress message
 */
export function formatInProgress(message: string): string {
  return `🔄 ${message}`;
}

/**
 * 대기 중 메시지 포맷팅
 * Format waiting message
 */
export function formatWaiting(message: string): string {
  return `⏳ ${message}`;
}

/**
 * 완료 메시지 포맷팅
 * Format completed message
 */
export function formatCompleted(message: string): string {
  return `✅ ${message}`;
}

/**
 * 작업 상태 포맷팅
 * Format job status with emoji
 */
export function formatJobStatus(status: string): string {
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    running: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
  };

  const emoji = statusEmoji[status] || '❓';
  return `${emoji} ${status}`;
}

/**
 * 타임스탬프 포맷팅
 * Format timestamp in human-readable format
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}초 전`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * 키-값 쌍 포맷팅
 * Format key-value pairs
 */
export function formatKeyValue(key: string, value: string): string {
  return `${formatBold(key)}: ${value}`;
}

/**
 * 테이블 포맷팅 (간단한 키-값 테이블)
 * Format simple key-value table
 */
export function formatTable(data: Record<string, string>): string {
  const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));

  return Object.entries(data)
    .map(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength, ' ');
      return `${paddedKey} : ${value}`;
    })
    .join('\n');
}

/**
 * 출력 요약 포맷팅 (긴 출력 처리)
 * Format output summary (for long output)
 *
 * 처음 N줄 + 마지막 M줄만 표시
 * Show first N lines + last M lines only
 */
export function formatOutputSummary(
  output: string,
  firstLines: number = 100,
  lastLines: number = 50
): { formatted: string; isTruncated: boolean } {
  const lines = output.split('\n');
  const totalLines = lines.length;

  if (totalLines <= firstLines + lastLines) {
    // 전체 출력이 충분히 짧으면 그대로 반환
    return {
      formatted: formatCodeBlock(output),
      isTruncated: false,
    };
  }

  // 처음 N줄 + 마지막 M줄만 표시
  const firstPart = lines.slice(0, firstLines).join('\n');
  const lastPart = lines.slice(-lastLines).join('\n');
  const omittedLines = totalLines - firstLines - lastLines;

  const summary =
    firstPart +
    `\n\n... (중간 ${omittedLines}줄 생략) ...\n\n` +
    lastPart;

  return {
    formatted: formatCodeBlock(summary),
    isTruncated: true,
  };
}

/**
 * 에러 스택 트레이스 포맷팅
 * Format error stack trace
 */
export function formatErrorStack(error: Error): string {
  return (
    formatError(formatBold('Error')) +
    '\n' +
    formatCodeBlock(error.stack || error.message)
  );
}

/**
 * DSL 명령 사용 가이드 포맷팅
 * Format DSL command usage guide
 *
 * 백틱 기반 DSL 명령 사용법을 안내하는 메시지
 */
export function formatDslGuide(): string {
  const guide = [
    formatBold('💡 DSL 명령 사용법'),
    '',
    '백틱(`)으로 감싸서 키 명령이나 텍스트를 전송할 수 있습니다:',
    '',
    formatBold('키 명령:'),
    `• ${formatInlineCode('ddd')} → Down 키 3번`,
    `• ${formatInlineCode('uuu')} → Up 키 3번`,
    `• ${formatInlineCode('e')} → Enter 키`,
    `• ${formatInlineCode('r')}, ${formatInlineCode('l')} → Right, Left 키`,
    '',
    formatBold('텍스트 입력:'),
    `• ${formatInlineCode('my-app')} → "my-app" 텍스트 입력`,
    `• ${formatInlineCode('console.log()')} → "console.log()" 텍스트 입력`,
    '',
    formatBold('혼합 사용:'),
    `• ${formatInlineCode('ddd')} my-app ${formatInlineCode('e')} → Down 3번 + "my-app" + Enter`,
    '',
    formatWarning('주의: 키 문자(r,l,u,d,e)와 일반 문자를 같은 백틱 안에 섞으면 에러가 발생합니다.'),
  ];

  return guide.join('\n');
}

/**
 * 인터랙티브 프롬프트 타입별 도움말 포맷팅
 * Format interactive prompt help by type
 *
 * @param type - 프롬프트 타입 (yesno, selection, numbered)
 * @returns Formatted help message
 */
export function formatInteractivePromptHelp(
  type: 'yesno' | 'selection' | 'numbered'
): string {
  const helpMessages = {
    yesno: [
      '💡 [y/n] 프롬프트가 감지되었습니다.',
      '',
      formatBold('응답 방법:'),
      `• ${formatInlineCode('y')} - Yes`,
      `• ${formatInlineCode('n')} - No`,
    ],
    selection: [
      '💡 선택 메뉴가 감지되었습니다.',
      '',
      formatBold('조작 방법:'),
      `• ${formatInlineCode('u')} / ${formatInlineCode('d')} - 위/아래로 이동`,
      `• ${formatInlineCode('l')} / ${formatInlineCode('r')} - 왼쪽/오른쪽으로 이동`,
      `• ${formatInlineCode('e')} - 선택 확인 (Enter)`,
      '',
      formatItalic('예시: ' + formatInlineCode('ddd') + ' (3번 아래로) + ' + formatInlineCode('e') + ' (선택)'),
    ],
    numbered: [
      '💡 번호 옵션이 감지되었습니다.',
      '',
      formatBold('응답 방법:'),
      `• 원하는 번호 입력 + ${formatInlineCode('e')} (Enter)`,
      '',
      formatItalic('예시: ' + formatInlineCode('2') + ' + ' + formatInlineCode('e') + ' (2번 옵션 선택)'),
    ],
  };

  return helpMessages[type].join('\n');
}

/**
 * DSL 혼합 문자 에러 포맷팅
 * Format DSL mixed character error
 *
 * @param keyChars - 감지된 키 문자 배열
 * @param nonKeyChars - 감지된 일반 문자 배열
 * @returns Formatted error message with guide
 */
export function formatDslMixedCharError(keyChars: string[], nonKeyChars: string[]): string {
  const errorMsg = [
    formatError(formatBold('혼합 문자 에러')),
    '',
    '백틱 내용에 키 문자와 일반 문자가 섞여있습니다:',
    '',
    formatKeyValue('키 문자', keyChars.map((c) => formatInlineCode(c)).join(', ')),
    formatKeyValue('일반 문자', nonKeyChars.map((c) => formatInlineCode(c)).join(', ')),
    '',
    formatBold('해결 방법:'),
    '• 키 명령과 텍스트를 각각 다른 백틱으로 감싸세요',
    '',
    formatBold('올바른 예시:'),
    `• ${formatInlineCode('ddd')} text ${formatInlineCode('e')} ✅`,
    '',
    formatBold('잘못된 예시:'),
    `• ${formatInlineCode('dddtext')} ❌ (키 문자와 일반 문자 혼합)`,
  ];

  return errorMsg.join('\n');
}

/**
 * DSL 명령 실행 결과 포맷팅
 * Format DSL command execution result
 *
 * @param output - tmux 캡처 출력
 * @param commandCount - 실행된 명령 개수
 * @returns Formatted result message
 */
export function formatDslExecutionResult(output: string, commandCount: number): string {
  const result = [
    formatSuccess(formatBold('명령 실행 완료')),
    '',
    formatKeyValue('실행된 명령', `${commandCount}개`),
    '',
    formatBold('화면 출력:'),
    formatCodeBlock(output),
  ];

  return result.join('\n');
}

/**
 * DSL 명령 실행 에러 포맷팅
 * Format DSL command execution error
 *
 * @param error - 에러 메시지
 * @param failedCommand - 실패한 명령 (optional)
 * @returns Formatted error message
 */
export function formatDslExecutionError(error: string, failedCommand?: string): string {
  const errorMsg = [
    formatError(formatBold('명령 실행 실패')),
    '',
    formatKeyValue('에러', error),
  ];

  if (failedCommand) {
    errorMsg.push('', formatKeyValue('실패한 명령', formatInlineCode(failedCommand)));
  }

  errorMsg.push('', formatInfo('tmux 세션 상태를 확인하고 다시 시도해주세요.'));

  return errorMsg.join('\n');
}
