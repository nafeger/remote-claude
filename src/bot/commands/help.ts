/**
 * /help 명령어 핸들러
 * /help command handler
 */

import { SlackCommandHandler } from '../../types';

/**
 * 도움말 텍스트 생성
 * Generate help text with all available commands
 */
function generateHelpText(): string {
  return `
*Remote Claude Code 제어 시스템 - 명령어 목록*

*채널 설정 (Channel Setup)*
• \`/setup <project-name> <project-path>\` - 현재 채널을 프로젝트에 연결
  예: \`/setup my-app /Users/username/projects/my-app\`

• \`/unsetup\` - 현재 채널의 프로젝트 연결 해제

• \`/status\` - 현재 채널 상태 및 작업 큐 확인

*프롬프트 스니펫 관리 (Prompt Snippets)*
• \`/snippet list\` - 등록된 스니펫 목록 보기

• \`/snippet add <name> <prompt>\` - 새 스니펫 추가
  예: \`/snippet add build-test "Build the project and run all tests."\`

• \`/snippet edit <name> <new-prompt>\` - 기존 스니펫 수정
  예: \`/snippet edit build-test "Build and run all unit tests with coverage."\`

• \`/snippet delete <name>\` - 스니펫 삭제
  예: \`/snippet delete build-test\`

• \`/snippet show <name>\` - 스니펫 내용 상세 보기
  예: \`/snippet show build-test\`

*작업 실행 (Job Execution)*
• \`/run <snippet-name>\` - 저장된 스니펫 실행
  예: \`/run build-test\`

• \`/ask <prompt>\` - 즉석 프롬프트 실행 (스니펫 없이)
  예: \`/ask "Analyze the performance bottlenecks in src/server.ts"\`

• \`/cancel\` - 현재 실행 중인 작업 취소

*한글 명령어 지원 (Korean Commands)*
• \`/ㄴㅅㅁ션\` - \`/state\`와 동일 (상태 확인)
• \`/애쥐ㅐㅁㅇ\` - \`/download\`와 동일 (파일 다운로드)

※ 한글 자판 상태에서 영어 명령어를 입력했을 때 자동으로 변환됩니다.

*작업 흐름 (Workflow)*
1. \`/setup\` 으로 채널을 프로젝트에 연결
2. \`/snippet add\` 로 자주 사용하는 프롬프트 등록 (선택사항)
3. \`/run\` 또는 \`/ask\` 로 Claude Code에 작업 요청
4. Claude Code가 대화형 응답을 요청하면 \`y\` 또는 \`n\` 으로 답변
5. \`/status\` 로 작업 큐 상태 확인

*주의사항 (Notes)*
• 각 채널은 하나의 프로젝트에만 연결 가능
• 작업은 프로젝트별로 순차 실행 (FIFO 큐)
• 대화형 응답 대기 시 30분 타임아웃
• 긴 출력은 처음 100줄 + 마지막 50줄만 표시

도움이 더 필요하시면 GitHub 저장소를 참고하세요.
`;
}

/**
 * /help 명령어 핸들러
 * Handle /help command
 */
export const helpHandler: SlackCommandHandler = async ({
  channelId,
  userId,
  args,
}) => {
  // args는 사용하지 않지만 타입 검사를 위해 포함
  void channelId;
  void userId;
  void args;

  return generateHelpText();
};
