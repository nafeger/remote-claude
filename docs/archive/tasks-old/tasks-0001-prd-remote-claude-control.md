# Task List: 원격 Claude Code 제어 시스템 (Slack 통합)

Based on PRD: `0001-prd-remote-claude-control.md`

## Relevant Files

### 프로젝트 설정 및 구성
- `package.json` - Node.js 프로젝트 설정 및 의존성 관리
- `tsconfig.json` - TypeScript 컴파일러 설정
- `.env.example` - 환경 변수 템플릿 (Slack 토큰, 설정 경로 등)
- `.gitignore` - Git 무시 파일 목록

### 타입 정의
- `src/types/index.ts` - 공통 타입 정의 (Channel, Project, Snippet, Job, Session, Config 등)

### 유틸리티
- `src/utils/logger.ts` - 로깅 유틸리티 (Winston/Pino)
- `src/utils/env.ts` - 환경 변수 로더 및 검증
- `src/utils/path.ts` - 경로 검증 및 처리 유틸리티

### Slack Bot
- `src/bot/index.ts` - Slack Bot 초기화 및 메인 엔트리포인트
- `src/bot/commands/help.ts` - /help 명령어 핸들러
- `src/bot/commands/setup.ts` - /setup 명령어 핸들러
- `src/bot/commands/unsetup.ts` - /unsetup 명령어 핸들러
- `src/bot/commands/status.ts` - /status 명령어 핸들러
- `src/bot/commands/snippet.ts` - /snippet 관련 명령어 핸들러
- `src/bot/commands/run.ts` - /run 명령어 핸들러
- `src/bot/commands/ask.ts` - /ask 명령어 핸들러
- `src/bot/formatters.ts` - Slack 메시지 포맷팅 유틸리티 (Block Kit, 이모지)

### Config Store
- `src/config/store.ts` - Config Store 클래스 (config.json 관리)
- `src/config/init.ts` - 설정 디렉토리 초기화 (~/.remote-claude/)

### Snippet Store
- `src/snippet/store.ts` - Snippet Store 클래스 (snippets.json 관리)
- `src/snippet/validator.ts` - 스니펫 이름 검증 (kebab-case 등)

### tmux Manager
- `src/tmux/manager.ts` - tmux Manager 클래스 (세션 관리)
- `src/tmux/executor.ts` - tmux 명령 실행 유틸리티
- `src/tmux/parser.ts` - 출력 파싱 (ANSI 코드 제거, 긴 출력 처리)

### Job Queue & State (Task 5.0 완료)
- `src/queue/queue.ts` - Job Queue 클래스 (프로젝트별 FIFO)
- `src/queue/orchestrator.ts` - 작업 실행 오케스트레이터
- `src/state/manager.ts` - State Manager 클래스 (state.json 관리)
- `src/state/recovery.ts` - 상태 복구 기능

### Notes

- 아직 생성되지 않은 파일: src/index.ts (메인 엔트리포인트), README.md, jest.config.js
- 메인 애플리케이션은 모든 컴포넌트를 통합하여 실행 가능한 Bot을 만드는 작업

## Tasks

- [x] 1.0 프로젝트 설정 및 기본 구조 구축
  - [x] 1.1 package.json 초기화 (Node.js + TypeScript 프로젝트 설정)
  - [x] 1.2 TypeScript 설정 파일 작성 (tsconfig.json, strict mode, ES2020)
  - [x] 1.3 기본 디렉토리 구조 생성 (src/bot, src/tmux, src/queue, src/state, src/config, src/types, src/utils)
  - [x] 1.4 공통 타입 정의 (src/types/index.ts: Channel, Project, Snippet, Job, Session 등)
  - [x] 1.5 환경 변수 설정 (.env.example, 환경 변수 로더)
  - [x] 1.6 로깅 유틸리티 구현 (Winston 사용, 로그 레벨, 파일 저장)
  - [x] 1.7 설정 디렉토리 초기화 함수 (~/.remote-claude/ 생성, config.json, snippets.json, state.json 초기화)

- [x] 2.0 Slack Bot 통합 및 기본 통신 구현
  - [x] 2.1 @slack/bolt 설치 및 Bot 초기화 (Socket Mode, 환경 변수에서 토큰 로드)
  - [x] 2.2 기본 명령어 핸들러 구현 (/help - 사용 가능한 명령어 목록 표시)
  - [x] 2.3 /setup 명령어 구현 (대화형 채널 설정 프로세스)
  - [x] 2.4 /unsetup 명령어 구현 (채널 매핑 삭제)
  - [x] 2.5 Config Store 구현 (config.json 읽기/쓰기, 채널-프로젝트 매핑 CRUD)
  - [x] 2.6 경로 검증 로직 (중복 경로 체크, 하위 경로 허용 로직)
  - [x] 2.7 Slack 메시지 포맷팅 유틸리티 (Block Kit, 이모지, 코드 블록)
  - [x] 2.8 /status 명령어 기본 구현 (현재 설정 정보 표시)

- [ ] 3.0 tmux 세션 관리 및 Claude Code 통합
  - [x] 3.1 tmux Manager 클래스 구현 (세션 존재 확인, 생성, 종료)
  - [x] 3.2 tmux 명령 실행 유틸리티 (child_process.exec 래퍼, 에러 처리)
  - [x] 3.3 Claude Code 시작 기능 (tmux send-keys로 "claude --continue" 전송)
  - [x] 3.4 프롬프트 전송 기능 (tmux send-keys, 프롬프트 이스케이프 처리)
  - [x] 3.5 출력 캡처 기능 (tmux capture-pane, ANSI 색상 코드 제거)
  - [x] 3.6 출력 폴링 및 완료 감지 (5초 간격, 출력 변화 없음 감지)
  - [x] 3.7 긴 출력 처리 (처음 100줄 + 마지막 50줄, 중간 생략 메시지)
  - [ ] 3.8 결과 보고 기능 (Slack에 출력 전송, 성공/실패 이모지, 스레드 지원) - Task 5.0에서 통합
  - [ ] 3.9 tmux 세션 모니터링 (1분 주기, 크래시 감지 및 재시작) - Optional

- [x] 4.0 프롬프트 스니펫 관리 시스템 구현
  - [x] 4.1 Snippet Store 구현 (snippets.json 읽기/쓰기, CRUD 작업)
  - [x] 4.2 /snippet list 명령어 구현 (스니펫 목록 표시)
  - [x] 4.3 /snippet add 명령어 구현 (스니펫 추가, 이름 검증)
  - [x] 4.4 /snippet edit 명령어 구현 (스니펫 수정)
  - [x] 4.5 /snippet delete 명령어 구현 (스니펫 삭제)
  - [x] 4.6 /snippet show 명령어 구현 (스니펫 상세 내용 표시)
  - [x] 4.7 /run 명령어 구현 (스니펫 실행, 존재 여부 확인) - 기본 구현, Task 5.0에서 큐 통합
  - [x] 4.8 /ask 명령어 구현 (즉석 프롬프트 실행) - 기본 구현, Task 5.0에서 큐 통합

- [x] 5.0 대화형 워크플로우 및 작업 큐 처리 구현
  - [x] 5.1 Job Queue 클래스 구현 (프로젝트별 FIFO 큐, 작업 추가/제거/확인)
  - [x] 5.2 State Manager 구현 (세션 상태 저장/로드, state.json 관리)
  - [x] 5.3 작업 실행 오케스트레이터 (큐에서 작업 가져오기, tmux로 실행, 결과 처리)
  - [x] 5.4 대화형 응답 처리 (y/n 입력 감지, 다음 단계 또는 중단) - 오케스트레이터에 통합
  - [x] 5.5 타임아웃 관리 (30분 무응답 시 세션 종료, 알림) - 오케스트레이터에 통합
  - [x] 5.6 /cancel 명령어 구현 (현재 실행 중인 작업 취소)
  - [x] 5.7 /status 명령어 확장 (큐 상태, 실행 중인 작업, 대기 중인 작업 표시)
  - [x] 5.8 상태 복구 기능 (시스템 재시작 시 state.json에서 복구)

## Notes

- 기술 스택: Node.js + TypeScript + @slack/bolt
- 로컬 개발 머신에서 백그라운드 서비스로 실행
- tmux를 통한 Claude Code CLI 통신
- 모든 설정 및 상태는 `~/.remote-claude/` 디렉토리에 저장
