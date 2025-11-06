# Remote Claude Code 제어 시스템

Slack을 통해 로컬 개발 머신의 Claude Code CLI를 원격으로 제어하는 시스템입니다.

## 개요

이 프로젝트는 Slack Bot을 통해 원격으로 Claude Code CLI를 실행하고 제어할 수 있게 해줍니다. tmux 세션을 활용하여 각 프로젝트를 독립적으로 관리하며, 작업 큐 시스템으로 순차적 실행을 보장합니다.

### 주요 기능

- **Slack 통합**: Slack 채널을 프로젝트에 매핑하여 원격 제어
- **tmux 세션 관리**: 각 프로젝트마다 독립적인 tmux 세션
- **작업 큐 시스템**: 채널별 FIFO 큐로 순차 실행
- **프롬프트 스니펫**: 자주 사용하는 프롬프트 저장 및 재사용
- **파일 다운로드**: 프로젝트 파일을 Slack으로 안전하게 다운로드 (보안 검증 포함)
- **대화형 워크플로우**: Claude Code의 y/n 응답 처리
- **상태 복구**: 시스템 재시작 시 자동 상태 복구

## 기술 스택

- Node.js + TypeScript
- @slack/bolt (Socket Mode)
- tmux (세션 관리)
- Winston (로깅)

## 설치

### 1. 의존성 설치

```bash
npm install
```

### 2. Slack App 설정

#### 옵션 A: 매니페스트 파일 사용 (권장)

1. https://api.slack.com/apps 에서 "Create New App" 클릭
2. **"From an app manifest"** 선택
3. Workspace 선택
4. `slack-app-manifest.yaml` 파일 내용을 복사하여 붙여넣기
5. "Next" → "Create" 클릭
6. "Socket Mode" 메뉴에서 App-Level Token 생성 (권한: `connections:write`)
7. "OAuth & Permissions" 메뉴에서 "Install to Workspace" 클릭
8. Bot User OAuth Token 저장 (SLACK_BOT_TOKEN)

#### 옵션 B: 수동 설정

#### 2.1. Slack App 생성

1. https://api.slack.com/apps 에서 "Create New App" 클릭
2. "From scratch" 선택
3. App 이름 입력 (예: "Remote Claude")
4. Workspace 선택

#### 2.2. Bot Token Scopes 설정

"OAuth & Permissions" 메뉴에서 다음 스코프 추가:

- `app_mentions:read`
- `channels:history`
- `channels:read`
- `chat:write`
- `commands`
- `files:write` (파일 다운로드 기능용)

#### 2.3. Socket Mode 활성화

1. "Socket Mode" 메뉴에서 Socket Mode 활성화
2. App-Level Token 생성 (권한: `connections:write`)
3. Token 저장 (SLACK_APP_TOKEN)

#### 2.4. Slash Commands 생성

"Slash Commands" 메뉴에서 다음 명령어 생성:

| Command | Description |
|---------|-------------|
| `/help` | 사용 가능한 명령어 목록 |
| `/setup` | 채널과 프로젝트 연결 |
| `/unsetup` | 채널 설정 해제 |
| `/state` | 채널 및 작업 큐 상태 |
| `/snippet` | 스니펫 관리 (list/add/edit/delete/show) |
| `/run` | 스니펫 실행 |
| `/ask` | 즉석 프롬프트 실행 |
| `/download` | 프로젝트 파일 다운로드 |
| `/cancel` | 실행 중인 작업 취소 |

**Request URL**: 모든 명령어에 대해 임시 URL 사용 (Socket Mode에서는 실제 사용되지 않음)

#### 2.5. Event Subscriptions 설정

"Event Subscriptions" 메뉴에서 활성화하고 다음 이벤트 추가:

- `message.channels` (채널 메시지 수신 - y/n 응답 처리용)

#### 2.6. Bot Token 발급

"OAuth & Permissions" 메뉴에서:

1. "Install to Workspace" 클릭
2. 권한 승인
3. Bot User OAuth Token 저장 (SLACK_BOT_TOKEN)

### 3. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Slack 설정
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token

# 설정 디렉토리 (기본값: ~/.remote-claude)
CONFIG_DIR=~/.remote-claude

# 로그 레벨 (debug, info, warn, error)
LOG_LEVEL=info
```

### 4. 빌드

```bash
npm run build
```

## 실행

### 개발 모드

```bash
npm run dev
```

### 프로덕션 모드

```bash
npm start
```

### 백그라운드 실행 (PM2 권장)

```bash
# PM2 설치 (전역)
npm install -g pm2

# 애플리케이션 시작
pm2 start dist/index.js --name remote-claude

# 상태 확인
pm2 status

# 로그 확인
pm2 logs remote-claude

# 재시작
pm2 restart remote-claude

# 중지
pm2 stop remote-claude
```

## 사용법

### 1. 채널 설정

Slack 채널에서 프로젝트와 연결:

```
/setup my-project /path/to/project
```

### 2. 스니펫 관리

자주 사용하는 프롬프트를 스니펫으로 저장:

```
# 스니펫 추가
/snippet add build-test "npm run build && npm test"

# 스니펫 목록
/snippet list

# 스니펫 실행
/run build-test

# 스니펫 수정
/snippet edit build-test "npm run build && npm test && npm run lint"

# 스니펫 삭제
/snippet delete build-test

# 스니펫 내용 보기
/snippet show build-test
```

### 3. 즉석 프롬프트 실행

```
/ask "Analyze the performance bottlenecks in src/server.ts"
```

### 4. 파일 다운로드

프로젝트 파일을 Slack으로 다운로드:

```
# 로그 파일 다운로드
/download logs/app.log

# 설정 파일 다운로드
/download config/database.json

# 문서 다운로드
/download docs/api.md

# 소스 파일 다운로드
/download src/server.ts
```

**제한사항:**
- 파일 크기: 10MB 이하
- 보안: `.env`, `*.key`, `*.pem`, `credentials` 등 민감한 파일은 차단됨
- 경로: 프로젝트 디렉토리 내부 파일만 접근 가능 (path traversal 방지)

### 5. 상태 확인

```
/state
```

출력 예시:
```
📊 채널 상태

프로젝트: my-project
경로: `/home/user/my-project`
tmux 세션: `claude-my-project`
생성 시간: 2024-01-15 10:30:00
마지막 사용: 2024-01-15 14:25:00

📋 작업 큐 상태

대기 중: 2개
실행 중: 1개
완료: 15개
실패: 0개
취소: 1개

현재 실행 중인 작업:
• ID: job-abc123
• 타입: run_snippet
• 시작 시간: 2024-01-15 14:20:00
```

### 6. 대화형 응답

Claude Code가 확인을 요청하면 Slack 채널에서 `y` 또는 `n`으로 응답:

```
Bot: ⚠️ 대화형 응답 필요

Claude Code가 사용자 입력을 기다리고 있습니다.
`y` 또는 `n` 으로 응답하세요.

출력:
```
Do you want to proceed? [y/n]
```

User: y
```

### 7. 작업 취소

```
/cancel
```

## 아키텍처

### 디렉토리 구조

```
src/
├── bot/              # Slack Bot 통합
│   ├── commands/     # 명령어 핸들러
│   ├── formatters.ts # 메시지 포맷팅
│   └── index.ts
├── config/           # 설정 관리
│   ├── init.ts       # 설정 디렉토리 초기화
│   └── store.ts      # Config Store
├── queue/            # 작업 큐
│   ├── queue.ts      # Job Queue
│   └── orchestrator.ts  # 작업 실행 오케스트레이터
├── snippet/          # 스니펫 관리
│   ├── store.ts      # Snippet Store
│   └── validator.ts  # 이름 검증
├── state/            # 상태 관리
│   ├── manager.ts    # State Manager
│   └── recovery.ts   # 상태 복구
├── tmux/             # tmux 통합
│   ├── executor.ts   # tmux 명령 실행
│   ├── manager.ts    # tmux Manager
│   └── parser.ts     # 출력 파싱
├── types/            # TypeScript 타입 정의
│   └── index.ts
├── utils/            # 유틸리티
│   ├── env.ts        # 환경 변수 로더
│   ├── logger.ts     # 로깅
│   └── path.ts       # 경로 검증
└── index.ts          # 메인 엔트리포인트
```

### 설정 디렉토리 (~/.remote-claude/)

```
~/.remote-claude/
├── config.json       # 채널-프로젝트 매핑
├── snippets.json     # 프롬프트 스니펫
├── state.json        # 세션 상태
└── logs/             # 로그 파일
    ├── combined.log  # 모든 로그
    └── error.log     # 에러 로그
```

### 작업 흐름

1. 사용자가 Slack에서 `/run` 또는 `/ask` 명령 실행
2. 작업이 채널별 FIFO 큐에 추가
3. 오케스트레이터가 작업 실행:
   - tmux 세션 시작 (또는 기존 세션 재사용)
   - Claude Code 시작 (`claude --continue`)
   - 프롬프트 전송
   - 출력 폴링 (5초 간격)
   - 대화형 프롬프트 감지 시 Slack에 알림
4. 사용자가 `y` 또는 `n`으로 응답
5. 응답이 Claude Code에 전달되고 작업 계속
6. 작업 완료 시 결과를 Slack에 전송
7. 다음 대기 중인 작업 실행

## 제한사항

- 한 번에 하나의 채널에서만 작업 실행 가능 (채널별 순차 실행)
- tmux가 로컬 시스템에 설치되어 있어야 함
- Claude Code CLI가 설치되어 있어야 함
- 대화형 응답 타임아웃: 30분

## 트러블슈팅

### Bot이 응답하지 않음

1. Slack App이 올바르게 설치되었는지 확인
2. Bot이 채널에 초대되었는지 확인 (`/invite @Remote Claude`)
3. Socket Mode가 활성화되었는지 확인
4. 환경 변수가 올바르게 설정되었는지 확인

### tmux 세션 오류

```bash
# tmux 세션 목록 확인
tmux ls

# 특정 세션 종료
tmux kill-session -t claude-project-name

# 모든 세션 종료
tmux kill-server
```

### 로그 확인

```bash
# combined.log (모든 로그)
tail -f ~/.remote-claude/logs/combined.log

# error.log (에러만)
tail -f ~/.remote-claude/logs/error.log
```

### 설정 초기화

```bash
# 설정 디렉토리 삭제
rm -rf ~/.remote-claude

# 애플리케이션 재시작 (자동으로 재생성됨)
npm start
```

## 개발

### 테스트

```bash
npm test
```

### 린트

```bash
npm run lint
```

### 빌드

```bash
npm run build
```

## 라이선스

MIT
